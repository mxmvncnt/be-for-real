import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Hono } from 'hono'
import { desc, eq, inArray, or } from 'drizzle-orm'
import { db } from '../db/client.js'
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

  if (!sessionRows || sessionRows.length === 0) {
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

videos.post('/clips', async (c) => {
  const token = c.req.header('authorization')
  const currentUserId = await getCurrentUserId(token)
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
  const videoUrl = `/uploads/${filename}`
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
      videoUrl,
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
  const token = c.req.header('authorization')
  const currentUserId = await getCurrentUserId(token)
  if (!currentUserId) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

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

  const visibleUserIds = [currentUserId, ...friendIds]

  const videos = await db
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

  if (videos.length === 0) {
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

  const feed: VideoFeedItem[] = videos.map((video) => ({
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

videos.post('/mashup/:date', async (c) => {
  return c.json({ message: 'Mashup functionality not implemented yet' }, 501)
})

export default videos
