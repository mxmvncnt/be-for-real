import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'

ffmpeg.setFfmpegPath(ffmpegPath.path)

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
	return new Promise((resolve, reject) => {
		command
			.on('start', (commandLine) => {
				console.log('[ffmpeg] start', commandLine)
			})
			.on('stderr', (line) => {
				console.log('[ffmpeg]', line)
			})
			.on('error', (error, _stdout, stderr) => {
				console.error('[ffmpeg] error', error.message, stderr)
				reject(error)
			})
			.on('end', () => resolve())
			.run()
	})
}

export function concatVideos(listPath: string, outputPath: string): Promise<void> {
	return runFfmpeg(
		ffmpeg()
			.input(listPath)
			.inputOptions(['-f concat', '-safe 0'])
			.outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-r', '30', '-vsync', 'cfr'])
			.noAudio()
			.output(outputPath),
	)
}

export function stackTwo(inputs: [string, string], outputPath: string): Promise<void> {
	return stackVideos(inputs, outputPath, 960)
}

export function stackThree(inputs: [string, string, string], outputPath: string): Promise<void> {
	return stackVideos(inputs, outputPath, 640)
}

export function stackFour(
	inputs: [string, string, string, string],
	outputPath: string,
): Promise<void> {
	return stackVideos(inputs, outputPath, 480)
}

function stackVideos(inputs: string[], outputPath: string, rowHeight: number): Promise<void> {
	const filter = [
		...inputs.map(
			(_, i) =>
				`[${i}:v]fps=30,scale=1080:${rowHeight}:force_original_aspect_ratio=increase,` +
				`crop=1080:${rowHeight}[r${i}]`,
		),
		`${inputs.map((_, i) => `[r${i}]`).join('')}vstack=inputs=${inputs.length}[v]`,
	]

	return runFfmpeg(
		inputs
			.reduce((cmd, input) => cmd.input(input), ffmpeg())
			.complexFilter(filter, 'v')
			.outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-r', '30', '-vsync', 'cfr', '-shortest'])
			.noAudio()
			.output(outputPath),
	)
}
