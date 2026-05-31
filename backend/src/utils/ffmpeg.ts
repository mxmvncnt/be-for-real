import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'

ffmpeg.setFfmpegPath(ffmpegPath.path)

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
