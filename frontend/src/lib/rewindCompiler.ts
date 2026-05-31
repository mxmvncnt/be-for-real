type ClipInput = {
  videoUrl: string
  timeLabel?: string
}

type MultiParticipantInput = {
  ownerName?: string
  clips: ClipInput[]
}

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 1280
const FRAME_RATE = 30

export async function compileDailyRewindVideo(clips: ClipInput[]) {
  if (clips.length === 0) {
    throw new Error('No clips available for this rewind.')
  }

  const videos = await Promise.all(clips.map((clip) => loadVideoElement(clip.videoUrl)))
  try {
    return await recordCanvasVideo({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      renderSegment: async (context) => {
        for (let index = 0; index < videos.length; index += 1) {
          await playSegment({
            context,
            videos: [videos[index]],
            draw: () => {
              const timeLabel = clips[index].timeLabel
              drawVideoCover(context, videos[index], 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
              if (timeLabel) {
                drawTimeBadge(context, timeLabel, CANVAS_WIDTH - 18, CANVAS_HEIGHT - 18)
              }
            },
          })
        }
      },
    })
  } finally {
    videos.forEach(disposeVideoElement)
  }
}

export async function compileMultiRewindVideo(participants: MultiParticipantInput[]) {
  if (participants.length < 2) {
    throw new Error('A Multi-Rewind needs at least two participants.')
  }

  const normalizedParticipants = participants.slice(0, 6)
  const segmentCount = Math.min(...normalizedParticipants.map((participant) => participant.clips.length))

  if (segmentCount === 0) {
    throw new Error('No overlapping clips available for this Multi-Rewind.')
  }

  const participantVideos = await Promise.all(
    normalizedParticipants.map(async (participant) => ({
      clips: participant.clips,
      videos: await Promise.all(participant.clips.map((clip) => loadVideoElement(clip.videoUrl))),
    })),
  )

  try {
    const layout = getMultiRewindLayout(normalizedParticipants.length, CANVAS_WIDTH, CANVAS_HEIGHT)

    return await recordCanvasVideo({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      renderSegment: async (context) => {
        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
          const activeVideos = participantVideos.map((participant) => participant.videos[segmentIndex])

          await playSegment({
            context,
            videos: activeVideos,
            draw: () => {
              participantVideos.forEach((participant, participantIndex) => {
                const panel = layout[participantIndex]
                const video = participant.videos[segmentIndex]
                const timeLabel = participant.clips[segmentIndex].timeLabel

                drawVideoCover(context, video, panel.x, panel.y, panel.width, panel.height)
                if (timeLabel) {
                  drawTimeBadge(
                    context,
                    timeLabel,
                    panel.x + panel.width - 18,
                    panel.y + panel.height - 18,
                  )
                }
              })
            },
          })
        }
      },
    })
  } finally {
    participantVideos.forEach((participant) => {
      participant.videos.forEach(disposeVideoElement)
    })
  }
}

async function recordCanvasVideo(options: {
  width: number
  height: number
  renderSegment: (context: CanvasRenderingContext2D) => Promise<void>
}) {
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available.')
  }

  const stream = canvas.captureStream(FRAME_RATE)
  const mimeType = getSupportedMimeType()
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  const chunks: BlobPart[] = []

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const stopPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }))
    }
  })

  recorder.start()

  try {
    await options.renderSegment(context)
  } finally {
    recorder.stop()
    stream.getTracks().forEach((track) => track.stop())
  }

  const blob = await stopPromise
  return URL.createObjectURL(blob)
}

async function playSegment(options: {
  context: CanvasRenderingContext2D
  videos: HTMLVideoElement[]
  draw: () => void
}) {
  const { context, videos, draw } = options
  const segmentDuration = Math.max(0.1, Math.min(...videos.map((video) => getFiniteDuration(video))))

  videos.forEach((video) => {
    video.currentTime = 0
    video.muted = true
  })

  await Promise.all(
    videos.map(async (video) => {
      try {
        await video.play()
      } catch {
        // Best-effort playback for canvas rendering.
      }
    }),
  )

  const startedAt = performance.now()

  await new Promise<void>((resolve) => {
    function renderFrame(now: number) {
      const elapsedSeconds = (now - startedAt) / 1000
      const done = elapsedSeconds >= segmentDuration

      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      draw()

      if (done) {
        videos.forEach((video) => video.pause())
        resolve()
        return
      }

      requestAnimationFrame(renderFrame)
    }

    requestAnimationFrame(renderFrame)
  })
}

function getFiniteDuration(video: HTMLVideoElement) {
  return Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1
}

function getMultiRewindLayout(count: number, width: number, height: number) {
  const normalizedCount = Math.max(1, Math.min(count, 6))

  if (normalizedCount === 1) {
    return [{ x: 0, y: 0, width, height }]
  }

  if (normalizedCount === 2) {
    return [
      { x: 0, y: 0, width, height: height / 2 },
      { x: 0, y: height / 2, width, height: height / 2 },
    ]
  }

  const columns = 2
  const rows = normalizedCount <= 4 ? 2 : 3
  const panelWidth = width / columns
  const panelHeight = height / rows

  return Array.from({ length: normalizedCount }, (_, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    return {
      x: column * panelWidth,
      y: row * panelHeight,
      width: panelWidth,
      height: panelHeight,
    }
  })
}

async function loadVideoElement(src: string) {
  const video = document.createElement('video')
  video.src = src
  video.crossOrigin = 'anonymous'
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error(`Could not load video: ${src}`))
  })

  return video
}

function disposeVideoElement(video: HTMLVideoElement) {
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.remove()
}

function drawVideoCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceAspectRatio = video.videoWidth / video.videoHeight
  const targetAspectRatio = width / height

  let drawWidth = width
  let drawHeight = height
  let drawX = x
  let drawY = y

  if (sourceAspectRatio > targetAspectRatio) {
    drawHeight = height
    drawWidth = height * sourceAspectRatio
    drawX = x - (drawWidth - width) / 2
  } else {
    drawWidth = width
    drawHeight = width / sourceAspectRatio
    drawY = y - (drawHeight - height) / 2
  }

  context.drawImage(video, drawX, drawY, drawWidth, drawHeight)
}

function drawTimeBadge(
  context: CanvasRenderingContext2D,
  label: string,
  right: number,
  bottom: number,
) {
  const paddingX = 12
  context.save()
  context.font = '700 24px Tahoma'
  const textWidth = context.measureText(label).width
  const badgeWidth = textWidth + paddingX * 2
  const badgeHeight = 38
  const x = right - badgeWidth
  const y = bottom - badgeHeight

  context.fillStyle = 'rgba(3, 19, 47, 0.78)'
  roundRect(context, x, y, badgeWidth, badgeHeight, 999)
  context.fill()

  context.fillStyle = '#ffffff'
  context.textBaseline = 'middle'
  context.fillText(label, x + paddingX, y + badgeHeight / 2)
  context.restore()
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const resolvedRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + resolvedRadius, y)
  context.arcTo(x + width, y, x + width, y + height, resolvedRadius)
  context.arcTo(x + width, y + height, x, y + height, resolvedRadius)
  context.arcTo(x, y + height, x, y, resolvedRadius)
  context.arcTo(x, y, x + width, y, resolvedRadius)
  context.closePath()
}

function getSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]

  return candidates.find(
    (candidate) =>
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate),
  )
}
