import { createHash } from 'node:crypto'
import { and, eq, gte, lt } from 'drizzle-orm'
import { db } from '../db/client.js'
import { videosTable } from '../db/schema.js'

type SortableClip = {
	id: string
	createdAt: Date
	filename: string
}

export function sortClipsStable<T extends SortableClip>(clips: T[]): T[] {
	return [...clips].sort((a, b) => {
		const t = a.createdAt.getTime() - b.createdAt.getTime()
		return t !== 0 ? t : a.id.localeCompare(b.id)
	})
}

export function hashFilenames(filenames: string[]): string {
	return createHash('sha256').update(filenames.join('\n')).digest('hex')
}

export function mashupFilename(hash: string) {
	return `mashup_${hash}.mp4`
}

export async function fetchClipsForUserOnDate(userId: string, date: Date, next: Date) {
	return db
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
}

export async function findVideoByFilename(filename: string, type: 'mashup' | 'multi_rewind') {
	const [existing] = await db
		.select({
			id: videosTable.id,
			userId: videosTable.userId,
			createdAt: videosTable.createdAt,
			filename: videosTable.filename,
			type: videosTable.type,
		})
		.from(videosTable)
		.where(and(eq(videosTable.filename, filename), eq(videosTable.type, type)))
		.limit(1)

	return existing ?? null
}
