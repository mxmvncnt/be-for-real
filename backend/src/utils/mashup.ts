import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { and, eq, gte, lt } from 'drizzle-orm'
import { db } from '../db/client.js'
import { videosTable } from '../db/schema.js'
import { concatVideos } from './ffmpeg.js'

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

export function multiRewindFilename(hash: string) {
	return `multi_rewind_${hash}.mp4`
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

async function concatClipsToFile(
	sortedClips: SortableClip[],
	uploadsDir: string,
	hash: string,
	outputFile: string,
) {
	const listPath = join(tmpdir(), `${hash}.txt`)
	const manifest = sortedClips
		.map((clip) => `file ${join(uploadsDir, clip.filename)}`)
		.join('\n')
	await writeFile(listPath, manifest, 'utf8')
	await concatVideos(listPath, outputFile)
}

/**
 * Returns the on-disk mashup for a user's clips. Reuses a persisted mashup when one
 * already exists; otherwise concatenates to disk without creating a DB record.
 */
export async function resolveMashupFilePath(
	sortedClips: SortableClip[],
	uploadsDir: string,
): Promise<{ path: string; hash: string; persisted: boolean }> {
	const hash = hashFilenames(sortedClips.map((clip) => clip.filename))
	const filename = mashupFilename(hash)
	const outputFile = join(uploadsDir, filename)
	const existing = await findVideoByFilename(filename, 'mashup')

	if (existing) {
		return { path: outputFile, hash, persisted: true }
	}

	if (!existsSync(outputFile)) {
		await concatClipsToFile(sortedClips, uploadsDir, hash, outputFile)
	}

	return { path: outputFile, hash, persisted: false }
}

export function hashMultiRewind(participantIds: string[], mashupHashes: string[]) {
	return createHash('sha256')
		.update([...participantIds, ...mashupHashes].join('\n'))
		.digest('hex')
}
