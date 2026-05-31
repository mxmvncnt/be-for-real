import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Hono } from 'hono'
import { desc, eq, inArray, or } from 'drizzle-orm'
import { db } from '../db/client.js'
import { renderDailyRewind, renderMultiRewind } from '../lib/rewindRenderer.js'
import { friendsTable, sessionsTable, usersTable, videosTable } from '../db/schema.js'

const videos = new Hono()
const uploadsDir = path.resolve(process.cwd(), 'uploads')

type VideoFeedItem = {
  id: string
  userId: string
  username: string
  createdAt: string
  videoUrl: string
  type: string | null
  isYou: boolean
}

async function getCurrentUserId(token: string | undefined) {
  if (!token) {
    return null
  }

  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1)

  if (sessionRows.length === 0) {
    return null
  }

  return String(sessionRows[0].userId)
}

function getFileExtension(file: File) {
  const originalExtension = path.extname(file.name ?? '').toLowerCase()
  if (originalExtension) {
    return originalExtension
  }

  switch (file.type) {
    case 'video/mp4':
      return '.mp4'
    case 'video/webm':
      return '.webm'
    case 'video/quicktime':
      return '.mov'
    default:
      return '.webm'
  }
}

async function getVisibleUserIds(currentUserId: string) {
  const friendRows = await db
    .select()
    .from(friendsTable)
    .where(
      or(
        eq(friendsTable.userId1, currentUserId),
        eq(friendsTable.userId2, currentUserId),
      ),
    )

  const friendIds = friendRows.map((row) =>
    String(row.userId1) === currentUserId ? String(row.userId2) : String(row.userId1),
  )

  return [currentUserId, ...friendIds]
}

videos.post('/clips', async (c) => {
  const currentUserId = await getCurrentUserId(c.req.header('authorization'))
  if (!currentUserId) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  const formData = await c.req.formData()
  const file = formData.get('video')

  if (!(file instanceof File)) {
    return c.json({ error: 'Missing video file' }, 400)
  }

  await mkdir(uploadsDir, { recursive: true })

  const extension = getFileExtension(file)
  const filename = `${randomUUID()}${extension}`
  const absoluteFilePath = path.join(uploadsDir, filename)
  const createdAtValue = String(formData.get('createdAt') ?? '')
  const createdAt = createdAtValue ? new Date(createdAtValue) : new Date()

  if (Number.isNaN(createdAt.getTime())) {
    return c.json({ error: 'Invalid createdAt value' }, 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(absoluteFilePath, buffer)

  const [video] = await db
    .insert(videosTable)
    .values({
      id: randomUUID(),
      userId: currentUserId,
      createdAt,
      videoUrl: `/uploads/${filename}`,
      filename,
      type: 'clip',
    })
    .returning({
      id: videosTable.id,
      userId: videosTable.userId,
      createdAt: videosTable.createdAt,
      videoUrl: videosTable.videoUrl,
      filename: videosTable.filename,
      type: videosTable.type,
    })

  return c.json(video, 201)
})

videos.get('/feed', async (c) => {
  const currentUserId = await getCurrentUserId(c.req.header('authorization'))
  if (!currentUserId) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  const visibleUserIds = await getVisibleUserIds(currentUserId)

  const feedVideos = await db
    .select({
      id: videosTable.id,
      userId: videosTable.userId,
      createdAt: videosTable.createdAt,
      videoUrl: videosTable.videoUrl,
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
    videoUrl: video.videoUrl,
    type: video.type,
    isYou: String(video.userId) === currentUserId,
  }))

  return c.json(feed, 200)
})

videos.post('/rewinds/render', async (c) => {
  const currentUserId = await getCurrentUserId(c.req.header('authorization'))
  if (!currentUserId) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  const body = await c.req.json<{ clipIds?: string[] }>()
  const clipIds = Array.isArray(body.clipIds) ? body.clipIds : []
  if (clipIds.length === 0) {
    return c.json({ error: 'clipIds are required' }, 400)
  }

  const visibleUserIds = await getVisibleUserIds(currentUserId)
  const clips = await db
    .select({
      id: videosTable.id,
      userId: videosTable.userId,
      filename: videosTable.filename,
      createdAt: videosTable.createdAt,
      type: videosTable.type,
    })
    .from(videosTable)
    .where(inArray(videosTable.id, clipIds))

  if (clips.length !== clipIds.length) {
    return c.json({ error: 'Some clips were not found' }, 404)
  }

  if (
    clips.some(
      (clip) =>
        clip.type !== 'clip' || !visibleUserIds.includes(String(clip.userId)),
    )
  ) {
    return c.json({ error: 'Some clips are not available to this user' }, 403)
  }

  const orderedClips = clipIds
    .map((clipId) => clips.find((clip) => String(clip.id) === clipId))
    .filter((clip): clip is NonNullable<typeof clip> => Boolean(clip))

  try {
    const videoUrl = await renderDailyRewind({
      uploadsDir,
      clipIds,
      clips: orderedClips.map((clip) => ({
        id: String(clip.id),
        filename: clip.filename,
      })),
    })

    return c.json({ videoUrl }, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Could not render rewind' }, 500)
  }
})

videos.post('/multi-rewinds/render', async (c) => {
  const currentUserId = await getCurrentUserId(c.req.header('authorization'))
  if (!currentUserId) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  const body = await c.req.json<{
    participants?: Array<{ ownerId: string; clipIds: string[] }>
  }>()
  const participants = Array.isArray(body.participants) ? body.participants : []

  if (participants.length < 2) {
    return c.json({ error: 'At least two participants are required' }, 400)
  }

  const allClipIds = participants.flatMap((participant) => participant.clipIds)
  if (allClipIds.length === 0) {
    return c.json({ error: 'Participant clipIds are required' }, 400)
  }

  const visibleUserIds = await getVisibleUserIds(currentUserId)
  const clips = await db
    .select({
      id: videosTable.id,
      userId: videosTable.userId,
      filename: videosTable.filename,
      type: videosTable.type,
    })
    .from(videosTable)
    .where(inArray(videosTable.id, allClipIds))

  if (clips.length !== allClipIds.length) {
    return c.json({ error: 'Some clips were not found' }, 404)
  }

  const clipById = new Map(clips.map((clip) => [String(clip.id), clip]))
  const normalizedParticipants = participants.map((participant) => {
    const participantClips = participant.clipIds
      .map((clipId) => clipById.get(clipId))
      .filter((clip): clip is NonNullable<typeof clip> => Boolean(clip))

    return {
      ownerId: participant.ownerId,
      clipIds: participant.clipIds,
      clips: participantClips.map((clip) => ({
        id: String(clip.id),
        filename: clip.filename,
        userId: String(clip.userId),
        type: clip.type,
      })),
    }
  })

  if (
    normalizedParticipants.some(
      (participant) =>
        participant.clips.length !== participant.clipIds.length ||
        participant.clips.some(
          (clip) =>
            clip.type !== 'clip' ||
            clip.userId !== participant.ownerId ||
            !visibleUserIds.includes(clip.userId),
        ),
    )
  ) {
    return c.json({ error: 'Some participant clips are invalid or unavailable' }, 403)
  }

  try {
    const videoUrl = await renderMultiRewind({
      uploadsDir,
      participants: normalizedParticipants.map((participant) => ({
        ownerId: participant.ownerId,
        clipIds: participant.clipIds,
        clips: participant.clips.map((clip) => ({
          id: clip.id,
          filename: clip.filename,
        })),
      })),
    })

    return c.json({ videoUrl }, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Could not render multi-rewind' }, 500)
  }
})

videos.post('/mashup/:date', async () => {
  return new Response(
    JSON.stringify({ message: 'Mashup functionality not implemented yet' }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})

export default videos
