import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path, { join } from 'node:path'
import { Hono } from 'hono'
import { and, desc, eq, gte, inArray, lt, or } from 'drizzle-orm'
import { db } from '../db/client.js'
import { friendsTable, usersTable, videosTable } from '../db/schema.js'
import { getUserIdFromRequest } from '../utils/auth.js'
import { addMusic, concatVideos, stackFour, stackThree, stackTwo } from '../utils/ffmpeg.js'
import {
	fetchClipsForUserOnDate,
	findVideoByFilename,
	hashFilenames,
	mashupFilename,
	sortClipsStable,
} from '../utils/mashup.js'
import { songs } from '../data/songs.js'
import areUsersFriends from '../utils/friends.js'

const videos = new Hono()
const uploadsDir = path.resolve(process.cwd(), 'uploads')
const musicDir = path.resolve(process.cwd(), 'music')

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

const videoReturning = {
	id: videosTable.id,
	userId: videosTable.userId,
	createdAt: videosTable.createdAt,
	filename: videosTable.filename,
	type: videosTable.type,
}

videos.get('/songs', (c) => {
	return c.json(songs, 200)
})

videos.get('/music', (c) => {
	return c.json(songs, 200)
})

function getFileExtension(file: File) {
	const originalExtension = path.extname(file.name).toLowerCase()
	if (originalExtension) {
		return originalExtension
	}
}

function parseDateRange(dateParam: string) {
	const date = new Date(dateParam)
	const next = new Date(date)
	next.setUTCDate(next.getUTCDate() + 1)
	return { date, next }
}

async function ensureMashupFile(
	sortedClips: { filename: string }[],
	uploadsDir: string,
): Promise<string> {
	const hash = hashFilenames(sortedClips.map((clip) => clip.filename))
	const outputFile = join(uploadsDir, mashupFilename(hash))

	if (!existsSync(outputFile)) {
		const listPath = join(tmpdir(), `${hash}.txt`)
		const manifest = sortedClips
			.map((clip) => `file ${join(uploadsDir, clip.filename)}`)
			.join('\n')
		await writeFile(listPath, manifest, 'utf8')
		await concatVideos(listPath, outputFile)
	}

	return outputFile
}

async function stackParticipantVideos(inputPaths: string[], outputFile: string) {
	switch (inputPaths.length) {
		case 2:
			await stackTwo(inputPaths as [string, string], outputFile)
			return
		case 3:
			await stackThree(inputPaths as [string, string, string], outputFile)
			return
		case 4:
			await stackFour(inputPaths as [string, string, string, string], outputFile)
			return
		default:
			throw new Error(`Unsupported participant count: ${inputPaths.length}`)
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
		.returning(videoReturning)

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
	const { userId } = await c.req.json<{ userId: string; musicId?: string; friendsIds?: string[] }>()

	const currentUserId = await getUserIdFromRequest(c)
	if (!currentUserId) {
		return c.json({ error: 'Invalid or expired token' }, 401)
	}

	if (!(await areUsersFriends(currentUserId, userId))) {
		return c.json({ error: 'you are not friend with this user' }, 401)
	}

	const { date, next } = parseDateRange(String(c.req.param('date')))
	const clips = await fetchClipsForUserOnDate(userId, date, next)

	if (clips.length <= 0) {
		return c.json('no videos for selected date', 404)
	}

	const sorted = sortClipsStable(clips)
	const hash = hashFilenames(sorted.map((clip) => clip.filename))
	const filename = mashupFilename(hash)
	const outputFile = join(uploadsDir, filename)

	const existing = await findVideoByFilename(filename, 'mashup')
	if (existing) {
		return c.json(existing, 200)
	}

	if (!existsSync(outputFile)) {
		const listPath = join(tmpdir(), `${hash}.txt`)
		const manifest = sorted.map((clip) => `file ${join(uploadsDir, clip.filename)}`).join('\n')
		await writeFile(listPath, manifest, 'utf8')
		await concatVideos(listPath, outputFile)
	}

	const [video] = await db
		.insert(videosTable)
		.values({
			id: randomUUID(),
			userId,
			createdAt: new Date(),
			videoUrl: `/videos/${filename}`,
			filename,
			type: 'mashup',
		})
		.returning(videoReturning)

	return c.json(video, 201)
})

videos.post('/multi-rewind/:date', async (c) => {
	const { friendsIds, musicId } = await c.req.json<{ friendsIds: string[]; musicId?: string }>()

	const currentUserId = await getUserIdFromRequest(c)
	if (!currentUserId) {
		return c.json({ error: 'Invalid or expired token' }, 401)
	}

	const uniqueFriendIds = [...new Set(friendsIds ?? [])].filter(
		(friendId) => friendId !== currentUserId,
	)
	if (uniqueFriendIds.length < 1 || uniqueFriendIds.length > 3) {
		return c.json({ error: 'Multi-Rewind requires 1 to 3 friends' }, 400)
	}

	const song = songs.find((entry) => entry.id === musicId)
	if (!song) {
		return c.json({ error: 'Invalid musicId' }, 400)
	}

	for (const friendId of uniqueFriendIds) {
		if (!(await areUsersFriends(currentUserId, friendId))) {
			return c.json({ error: 'you are not friend with this user' }, 401)
		}
	}

	const participantIds = [currentUserId, ...uniqueFriendIds].sort()
	const { date, next } = parseDateRange(String(c.req.param('date')))
	const mashupPaths: string[] = []
	const mashupHashes: string[] = []

	for (const participantId of participantIds) {
		const clips = await fetchClipsForUserOnDate(participantId, date, next)
		if (clips.length <= 0) {
			return c.json({ error: 'no videos for selected date' }, 404)
		}

		const sorted = sortClipsStable(clips)
		mashupHashes.push(hashFilenames(sorted.map((clip) => clip.filename)))
		mashupPaths.push(await ensureMashupFile(sorted, uploadsDir))
	}

	const hash = createHash('sha256')
		.update([...participantIds, ...mashupHashes, musicId].join('\n'))
		.digest('hex')
	const filename = `multi_rewind_${hash}.mp4`
	const outputFile = join(uploadsDir, filename)

	const existing = await findVideoByFilename(filename, 'multi_rewind')
	if (existing) {
		return c.json(existing, 200)
	}

	if (!existsSync(outputFile)) {
		const tmp = join(tmpdir(), `${hash}.mp4`)
		await stackParticipantVideos(mashupPaths, tmp)
		await addMusic(tmp, join(musicDir, song.fileName), song.startSeconds, outputFile)
	}

	const [video] = await db
		.insert(videosTable)
		.values({
			id: randomUUID(),
			userId: currentUserId,
			createdAt: new Date(),
			videoUrl: `/videos/${filename}`,
			filename,
			type: 'multi_rewind',
		})
		.returning(videoReturning)

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
