import { createHash, randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path, { join } from 'node:path'
import { Hono } from 'hono'
import { and, desc, eq, gte, inArray, lt, or } from 'drizzle-orm'
import { db } from '../db/client.js'
import { friendsTable, usersTable, videosTable } from '../db/schema.js'
import { getUserIdFromRequest } from '../utils/auth.js'
import { concatVideos, stackFour, stackThree, stackTwo } from '../utils/ffmpeg.js'
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
const MIN_VIDEO_BYTES = 1024
const mashupJobs = new Map<string, Promise<string>>()

function logVideoStep(step: string, details?: Record<string, unknown>) {
	const suffix = details ? ` ${JSON.stringify(details)}` : ''
	console.log(`[video] ${step}${suffix}`)
}

async function timedVideoStep<T>(step: string, fn: () => Promise<T>, details?: Record<string, unknown>) {
	const startedAt = Date.now()
	logVideoStep(`${step} started`, details)
	const result = await fn()
	logVideoStep(`${step} finished`, { ...details, durationMs: Date.now() - startedAt })
	return result
}

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

function getVideoFileSize(filePath: string) {
	try {
		return statSync(filePath).size
	} catch {
		return 0
	}
}

function isUsableVideoFile(filePath: string) {
	return existsSync(filePath) && getVideoFileSize(filePath) >= MIN_VIDEO_BYTES
}

async function concatMashupFile(
	sortedClips: { filename: string }[],
	uploadsDir: string,
	hash: string,
	outputFile: string,
	participantId?: string,
) {
	const listPath = join(tmpdir(), `${hash}.txt`)
	const manifest = sortedClips.map((clip) => `file ${join(uploadsDir, clip.filename)}`).join('\n')
	await writeFile(listPath, manifest, 'utf8')

	await timedVideoStep(
		'mashup concat',
		() => concatVideos(listPath, outputFile),
		{ participantId, filename: mashupFilename(hash), clipCount: sortedClips.length },
	)

	if (!isUsableVideoFile(outputFile)) {
		throw new Error(`Mashup file was not created: ${mashupFilename(hash)}`)
	}
}

async function ensureMashupFile(
	sortedClips: { filename: string }[],
	uploadsDir: string,
	participantId?: string,
): Promise<string> {
	const hash = hashFilenames(sortedClips.map((clip) => clip.filename))
	const outputFile = join(uploadsDir, mashupFilename(hash))
	const inFlight = mashupJobs.get(hash)
	if (inFlight) {
		logVideoStep('mashup waiting for in-flight concat', {
			participantId,
			filename: mashupFilename(hash),
		})
		return inFlight
	}

	const job = (async () => {
		if (isUsableVideoFile(outputFile)) {
			logVideoStep('mashup reused', {
				participantId,
				filename: mashupFilename(hash),
				clipCount: sortedClips.length,
				bytes: getVideoFileSize(outputFile),
			})
			return outputFile
		}

		logVideoStep('mashup concat started', {
			participantId,
			filename: mashupFilename(hash),
			clipCount: sortedClips.length,
			clips: sortedClips.map((clip) => clip.filename),
		})

		await concatMashupFile(sortedClips, uploadsDir, hash, outputFile, participantId)
		return outputFile
	})()

	mashupJobs.set(hash, job)

	try {
		return await job
	} finally {
		mashupJobs.delete(hash)
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

	const dateParam = String(c.req.param('date'))
	logVideoStep('mashup request started', { userId, date: dateParam, requestedBy: currentUserId })

	const { date, next } = parseDateRange(dateParam)
	const clips = await fetchClipsForUserOnDate(userId, date, next)

	if (clips.length <= 0) {
		logVideoStep('mashup request failed', { userId, date: dateParam, reason: 'no clips' })
		return c.json('no videos for selected date', 404)
	}

	const sorted = sortClipsStable(clips)
	const hash = hashFilenames(sorted.map((clip) => clip.filename))
	const filename = mashupFilename(hash)
	const outputFile = join(uploadsDir, filename)

	logVideoStep('mashup clips loaded', { userId, clipCount: sorted.length, filename })

	const existing = await findVideoByFilename(filename, 'mashup')
	if (existing) {
		logVideoStep('mashup cache hit', { userId, filename, videoId: existing.id })
		return c.json(existing, 200)
	}

	if (isUsableVideoFile(outputFile)) {
		logVideoStep('mashup file reused', { userId, filename, bytes: getVideoFileSize(outputFile) })
	} else {
		await concatMashupFile(sorted, uploadsDir, hash, outputFile, userId)
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

	logVideoStep('mashup request finished', { userId, filename, videoId: video.id })

	return c.json(video, 201)
})

videos.post('/multi-rewind/:date', async (c) => {
	const { friendsIds } = await c.req.json<{ friendsIds: string[] }>()

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

	for (const friendId of uniqueFriendIds) {
		if (!(await areUsersFriends(currentUserId, friendId))) {
			return c.json({ error: 'you are not friend with this user' }, 401)
		}
	}

	const participantIds = [currentUserId, ...uniqueFriendIds].sort()
	const dateParam = String(c.req.param('date'))
	logVideoStep('multi-rewind request started', {
		userId: currentUserId,
		date: dateParam,
		participantIds,
	})

	const { date, next } = parseDateRange(dateParam)
	const mashupPaths: string[] = []
	const mashupHashes: string[] = []

	for (const participantId of participantIds) {
		const clips = await fetchClipsForUserOnDate(participantId, date, next)
		if (clips.length <= 0) {
			logVideoStep('multi-rewind request failed', {
				participantId,
				date: dateParam,
				reason: 'no clips',
			})
			return c.json({ error: 'no videos for selected date' }, 404)
		}

		const sorted = sortClipsStable(clips)
		mashupHashes.push(hashFilenames(sorted.map((clip) => clip.filename)))
		mashupPaths.push(await ensureMashupFile(sorted, uploadsDir, participantId))
	}

	const hash = createHash('sha256')
		.update([...participantIds, ...mashupHashes].join('\n'))
		.digest('hex')
	const filename = `multi_rewind_${hash}.mp4`
	const outputFile = join(uploadsDir, filename)

	logVideoStep('multi-rewind mashups ready', {
		filename,
		participantCount: participantIds.length,
		inputs: mashupPaths.map((inputPath) => ({
			path: inputPath,
			bytes: getVideoFileSize(inputPath),
		})),
	})

	const existing = await findVideoByFilename(filename, 'multi_rewind')
	if (existing) {
		logVideoStep('multi-rewind cache hit', { filename, videoId: existing.id })
		return c.json(existing, 200)
	}

	try {
		if (isUsableVideoFile(outputFile)) {
			logVideoStep('multi-rewind file reused', {
				filename,
				bytes: getVideoFileSize(outputFile),
			})
		} else {
			const stackStep =
				mashupPaths.length === 2 ? 'stackTwo' : mashupPaths.length === 3 ? 'stackThree' : 'stackFour'

			await timedVideoStep(
				stackStep,
				async () => {
					if (mashupPaths.length === 2) {
						await stackTwo(mashupPaths as [string, string], outputFile)
						return
					}

					if (mashupPaths.length === 3) {
						await stackThree(mashupPaths as [string, string, string], outputFile)
						return
					}

					await stackFour(mashupPaths as [string, string, string, string], outputFile)
				},
				{ filename, inputs: mashupPaths },
			)

			if (!isUsableVideoFile(outputFile)) {
				throw new Error(`Multi-rewind file was not created: ${filename}`)
			}
		}
	} catch (error) {
		logVideoStep('multi-rewind stack failed', {
			filename,
			inputs: mashupPaths,
			error: error instanceof Error ? error.message : String(error),
		})
		return c.json({ error: 'Failed to generate multi-rewind' }, 500)
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

	logVideoStep('multi-rewind request finished', {
		filename,
		videoId: video.id,
		participantCount: participantIds.length,
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
