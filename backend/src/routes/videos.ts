import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path, { join } from 'node:path'
import { Hono } from 'hono'
import { and, desc, eq, gte, inArray, lt, or } from 'drizzle-orm'
import { db } from '../db/client.js'
import { friendsTable, usersTable, videosTable } from '../db/schema.js'
import { getUserIdFromRequest } from '../utils/auth.js'
import { concatVideos } from '../utils/ffmpeg.js'
import { tmpdir } from 'node:os'
import { existsSync } from 'node:fs'
import { songs } from '../data/songs.js'
import areUsersFriends from '../utils/friends.js'

const videos = new Hono()
const uploadsDir = path.resolve(process.cwd(), 'uploads')

type VideoType = 'clip' | 'mashup' | 'multi_rewind'

type VideoFeedItem = {
	id: string
	userId: string
	username: string
	createdAt: string
	filename: string
	type: VideoType
	isYou: boolean
}

videos.get('/songs', (c) => {
	return c.json(songs, 200)
})

function getFileExtension(file: File) {
	const originalExtension = path.extname(file.name).toLowerCase()
	if (originalExtension) {
		return originalExtension
	}
}

/**
 * Upload a clip
 */
videos.post('/clips', async (c) => {
	const currentUserId = await getUserIdFromRequest(c)
	if (!currentUserId) {
		return c.json({ error: 'Invalid or expired token' }, 401)
	}

	const formData = await c.req.formData()
	const file = formData.get('video')

	if (!file || !(file instanceof File)) {
		return c.json({ error: 'Missing video file' }, 400)
	}

	await mkdir(uploadsDir, { recursive: true })

	const uuid = randomUUID()
	const extension = getFileExtension(file)
	const filename = `${uuid}${extension}`
	const absoluteFilePath = path.join(uploadsDir, filename)
	const createdAt = new Date()

	const buffer = Buffer.from(await file.arrayBuffer())
	await writeFile(absoluteFilePath, buffer)

	const [video] = await db
		.insert(videosTable)
		.values({
			id: uuid,
			userId: currentUserId,
			createdAt,
			videoUrl: `/videos/${filename}`,
			filename,
			type: 'clip',
		})
		.returning({
			id: videosTable.id,
			userId: videosTable.userId,
			createdAt: videosTable.createdAt,
			filename: videosTable.filename,
			type: videosTable.type,
		})

	return c.json(video, 201)
})

/**
 * Home screen feed
 */
videos.get('/feed', async (c) => {
	const currentUserId = await getUserIdFromRequest(c)
	if (!currentUserId) {
		return c.json({ error: 'Invalid or expired token' }, 401)
	}

	const friendRows = await db
		.select()
		.from(friendsTable)
		.where(
			and(
				eq(friendsTable.confirmed, 1),
				or(eq(friendsTable.userId1, currentUserId), eq(friendsTable.userId2, currentUserId)),
			),
		)

	const friendIds = friendRows.map((row) =>
		String(row.userId1) === currentUserId ? String(row.userId2) : String(row.userId1),
	)

	const visibleUserIds = [currentUserId, ...friendIds]

	const feedVideos = await db
		.select({
			id: videosTable.id,
			userId: videosTable.userId,
			createdAt: videosTable.createdAt,
			filename: videosTable.filename,
			type: videosTable.type,
		})
		.from(videosTable)
		.where(inArray(videosTable.userId, visibleUserIds))
		.orderBy(desc(videosTable.createdAt))

	if (feedVideos.length === 0) {
		return c.json([] satisfies VideoFeedItem[], 200)
	}

	const users = await db
		.select({
			id: usersTable.id,
			username: usersTable.username,
		})
		.from(usersTable)
		.where(inArray(usersTable.id, visibleUserIds))

	const usernameById = new Map(users.map((user) => [String(user.id), user.username]))

	const feed: VideoFeedItem[] = feedVideos.map((video) => ({
		id: String(video.id),
		userId: String(video.userId),
		username: usernameById.get(String(video.userId)) ?? 'Unknown',
		createdAt: video.createdAt.toISOString(),
		filename: video.filename,
		type: video.type as VideoType,
		isYou: String(video.userId) === currentUserId,
	}))

	return c.json(feed, 200)
})

videos.post('/mashup/:date', async (c) => {
	const { userId, musicId, friendsIds } = await c.req.json<{
		userId: string
		musicId: string
		friendsIds: string[]
	}>()

	const currentUserId = await getUserIdFromRequest(c)
	if (!currentUserId) {
		return c.json({ error: 'Invalid or expired token' }, 401)
	}

	if (!(await areUsersFriends(currentUserId, userId))) {
		return c.json({ error: 'you are not friend with this user' }, 401)
	}

	const dateParam = String(c.req.param('date'))
	const date = new Date(dateParam)
	const next = new Date(date)
	next.setUTCDate(next.getUTCDate() + 1)

	const videos = await db
		.select()
		.from(videosTable)
		.where(
			and(
				eq(videosTable.userId, userId),
				gte(videosTable.createdAt, date),
				lt(videosTable.createdAt, next),
				eq(videosTable.type, 'clip'),
			),
		)

	if (videos.length <= 0) {
		return c.json('no videos for selected date', 404)
	}

	// Sort into a stable order so the same set of source videos always
	// hashes identically (and concatenates in the same order).
	const sorted = [...videos].sort((a, b) => {
		const t = a.createdAt.getTime() - b.createdAt.getTime()
		return t !== 0 ? t : a.id.localeCompare(b.id)
	})

	const hash = createHash('sha256')
		.update(sorted.map((video) => video.filename).join('\n'))
		.digest('hex')
	const filename = `mashup_${hash}.mp4`
	const outputFile = join(uploadsDir, filename)

	const [existing] = await db
		.select({
			id: videosTable.id,
			userId: videosTable.userId,
			createdAt: videosTable.createdAt,
			filename: videosTable.filename,
			type: videosTable.type,
		})
		.from(videosTable)
		.where(and(eq(videosTable.filename, filename), eq(videosTable.type, 'mashup')))
		.limit(1)

	if (existing) {
		return c.json(existing, 200)
	}

	// Only run the video edit if the output file isn't already on disk.
	if (!existsSync(outputFile)) {
		const filePaths = sorted.map((video) => `file ${join(uploadsDir, video.filename)}`)
		const listPath = join(tmpdir(), `${hash}.txt`)
		const manifest = filePaths.join('\n')
		await writeFile(listPath, manifest, 'utf8')
		await concatVideos(listPath, outputFile)
	}

	const [video] = await db
		.insert(videosTable)
		.values({
			id: randomUUID(),
			userId: userId,
			createdAt: new Date(),
			videoUrl: `/videos/${filename}`,
			filename,
			type: 'mashup',
		})
		.returning({
			id: videosTable.id,
			userId: videosTable.userId,
			createdAt: videosTable.createdAt,
			filename: videosTable.filename,
			type: videosTable.type,
		})

	return c.json(video, 201)
})

videos.get('/:filename', async (c) => {
	const filename = c.req.param('filename')
	const absolutePath = path.join(uploadsDir, filename)

	try {
		const fileBuffer = await readFile(absolutePath)
		return c.body(fileBuffer, 200, {
			'Cache-Control': 'no-store',
		})
	} catch {
		return c.json({ error: 'File not found' }, 404)
	}
})

export default videos
