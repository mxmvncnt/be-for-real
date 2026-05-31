import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const require = createRequire(import.meta.url)
const ffmpegPath = require('ffmpeg-static') as string | null

const OUTPUT_WIDTH = 720
const OUTPUT_HEIGHT = 1280
const OUTPUT_FPS = 30

type ClipSource = {
  id: string
  filename: string
}

type MultiParticipant = {
  ownerId: string
  clipIds: string[]
  clips: ClipSource[]
}

export async function renderDailyRewind(options: {
  uploadsDir: string
  clipIds: string[]
  clips: ClipSource[]
}) {
  const { uploadsDir, clipIds, clips } = options
  const hash = createStableHash(['daily', ...clipIds])
  const renderedDir = path.join(uploadsDir, 'rendered')
  const outputFilename = `rewind-${hash}.mp4`
  const outputPath = path.join(renderedDir, outputFilename)

  if (await fileExists(outputPath)) {
    return `/uploads/rendered/${outputFilename}`
  }

  await mkdir(renderedDir, { recursive: true })
  const tempDir = await mkdtemp(path.join(tmpdir(), 'bfr-rewind-'))

  try {
    const inputPaths = clips.map((clip) => path.join(uploadsDir, clip.filename))
    await assertFilesExist(inputPaths)

    const filterSteps = inputPaths
      .map(
        (_, index) =>
          `[${index}:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v${index}]`,
      )
      .join(';')
    const concatInputs = inputPaths.map((_, index) => `[v${index}]`).join('')
    const filterGraph = `${filterSteps};${concatInputs}concat=n=${inputPaths.length}:v=1:a=0[outv]`

    await runFfmpeg([
      ...inputPaths.flatMap((inputPath) => ['-i', inputPath]),
      '-filter_complex',
      filterGraph,
      '-map',
      '[outv]',
      '-r',
      String(OUTPUT_FPS),
      '-an',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ])

    return `/uploads/rendered/${outputFilename}`
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export async function renderMultiRewind(options: {
  uploadsDir: string
  participants: MultiParticipant[]
}) {
  const { uploadsDir, participants } = options
  const normalizedParticipants = participants.slice(0, 6)
  const signature = normalizedParticipants.flatMap((participant) => [
    participant.ownerId,
    ...participant.clipIds,
  ])
  const hash = createStableHash(['multi', ...signature])
  const renderedDir = path.join(uploadsDir, 'rendered')
  const outputFilename = `multi-${hash}.mp4`
  const outputPath = path.join(renderedDir, outputFilename)

  if (await fileExists(outputPath)) {
    return `/uploads/rendered/${outputFilename}`
  }

  await mkdir(renderedDir, { recursive: true })
  const tempDir = await mkdtemp(path.join(tmpdir(), 'bfr-multi-'))

  try {
    const segmentCount = Math.min(...normalizedParticipants.map((participant) => participant.clips.length))
    if (segmentCount === 0) {
      throw new Error('No overlapping clips available for this Multi-Rewind.')
    }

    const segmentPaths: string[] = []

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const segmentOutputPath = path.join(tempDir, `segment-${segmentIndex}.mp4`)
      const inputPaths = normalizedParticipants.map((participant) =>
        path.join(uploadsDir, participant.clips[segmentIndex].filename),
      )
      await assertFilesExist(inputPaths)

      const layout = getMultiRewindLayout(normalizedParticipants.length)
      const args = inputPaths.flatMap((inputPath) => ['-i', inputPath])

      if (layout.totalSlots > normalizedParticipants.length) {
        for (let index = normalizedParticipants.length; index < layout.totalSlots; index += 1) {
          args.push(
            '-f',
            'lavfi',
            '-i',
            `color=c=black:s=${layout.panelWidth}x${layout.panelHeight}:r=${OUTPUT_FPS}`,
          )
        }
      }

      const filterSteps = Array.from({ length: layout.totalSlots }, (_, index) =>
        `[${index}:v]scale=${layout.panelWidth}:${layout.panelHeight}:force_original_aspect_ratio=decrease,pad=${layout.panelWidth}:${layout.panelHeight}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v${index}]`,
      )

      const rowLabels = Array.from({ length: layout.rows }, (_, rowIndex) => {
        const leftIndex = rowIndex * 2
        const rightIndex = leftIndex + 1
        const rowLabel = `row${rowIndex}`
        filterSteps.push(`[v${leftIndex}][v${rightIndex}]hstack=inputs=2[${rowLabel}]`)
        return rowLabel
      })

      if (rowLabels.length === 1) {
        filterSteps.push(`[${rowLabels[0]}]copy[outv]`)
      } else if (rowLabels.length === 2) {
        filterSteps.push(`[${rowLabels[0]}][${rowLabels[1]}]vstack=inputs=2[outv]`)
      } else {
        filterSteps.push(`[${rowLabels[0]}][${rowLabels[1]}][${rowLabels[2]}]vstack=inputs=3[outv]`)
      }

      await runFfmpeg([
        ...args,
        '-filter_complex',
        filterSteps.join(';'),
        '-map',
        '[outv]',
        '-shortest',
        '-r',
        String(OUTPUT_FPS),
        '-an',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        segmentOutputPath,
      ])

      segmentPaths.push(segmentOutputPath)
    }

    const concatListPath = path.join(tempDir, 'segments.txt')
    await writeFile(
      concatListPath,
      segmentPaths.map((segmentPath) => `file '${segmentPath.replace(/'/g, "'\\''")}'`).join('\n'),
      'utf8',
    )

    await runFfmpeg([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c',
      'copy',
      outputPath,
    ])

    return `/uploads/rendered/${outputFilename}`
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function runFfmpeg(args: string[]) {
  if (!ffmpegPath) {
    throw new Error('ffmpeg binary is not available.')
  }

  try {
    await execFileAsync(ffmpegPath, ['-y', ...args])
  } catch (error) {
    console.error('ffmpeg command failed', { args, error })
    throw new Error('Failed to render video.')
  }
}

async function assertFilesExist(filePaths: string[]) {
  await Promise.all(
    filePaths.map(async (filePath) => {
      await access(filePath)
    }),
  )
}

async function fileExists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function createStableHash(parts: string[]) {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function getMultiRewindLayout(count: number) {
  if (count <= 2) {
    return {
      totalSlots: 2,
      rows: 2,
      panelWidth: OUTPUT_WIDTH,
      panelHeight: OUTPUT_HEIGHT / 2,
    }
  }

  if (count <= 4) {
    return {
      totalSlots: 4,
      rows: 2,
      panelWidth: OUTPUT_WIDTH / 2,
      panelHeight: OUTPUT_HEIGHT / 2,
    }
  }

  return {
    totalSlots: 6,
    rows: 3,
    panelWidth: OUTPUT_WIDTH / 2,
    panelHeight: Math.floor(OUTPUT_HEIGHT / 3),
  }
}
