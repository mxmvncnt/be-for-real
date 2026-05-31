import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

ffmpeg.setFfmpegPath(ffmpegPath.path)

export default async function mergeConcatDemuxer(
	inputPaths: string[],
	outputPath: string,
): Promise<void> {
	const listPath = join(tmpdir(), `${randomUUID()}.txt`)
	const manifest = inputPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
	await writeFile(listPath, manifest, 'utf8')

	try {
		await new Promise<void>((resolve, reject) => {
			ffmpeg()
				.input(listPath)
				.inputOptions(['-f', 'concat', '-safe', '0'])
				.outputOptions(['-c', 'copy'])
				.on('end', () => resolve())
				.on('error', (err: Error) => reject(err))
				.save(outputPath)
		})
	} finally {
		await unlink(listPath).catch(() => {})
	}
}

export function concatVideos(listPath: string, outputPath: string): Promise<void> {
	return new Promise((resolve) => {
		ffmpeg()
			.input(listPath)
			.inputOptions(['-f concat', '-safe 0'])
			.outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
			.noAudio()
			.output(outputPath)
			.on('end', () => resolve())
			.run()
	})
}
