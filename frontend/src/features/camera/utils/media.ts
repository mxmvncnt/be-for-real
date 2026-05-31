export function getSupportedMimeType() {
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

export async function mirrorRecordedVideo(sourceBlob: Blob) {
  const sourceUrl = URL.createObjectURL(sourceBlob)
  const video = document.createElement('video')
  video.src = sourceUrl
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Could not load recorded clip for mirroring.'))
    })

    const width = Math.max(2, Math.floor(video.videoWidth || 720))
    const height = Math.max(2, Math.floor(video.videoHeight || 1280))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas is not available for mirroring.')
    }
    const ctx = context

    const stream = canvas.captureStream(30)
    const mimeType = getSupportedMimeType()
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    const chunks: BlobPart[] = []

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    const stopPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: recorder.mimeType || sourceBlob.type || 'video/webm' }))
      }
    })

    recorder.start()
    await video.play()

    await new Promise<void>((resolve) => {
      function drawFrame() {
        ctx.clearRect(0, 0, width, height)
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -width, 0, width, height)
        ctx.restore()

        if (video.ended) {
          resolve()
          return
        }

        requestAnimationFrame(drawFrame)
      }

      requestAnimationFrame(drawFrame)
    })

    recorder.stop()
    stream.getTracks().forEach((track) => track.stop())
    video.pause()
    video.remove()

    const mirroredBlob = await stopPromise
    return mirroredBlob.size > 0 ? mirroredBlob : sourceBlob
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export function isFirefoxBrowser() {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)
}

export async function releaseVideoElement(video: HTMLVideoElement | null) {
  if (!video) {
    return
  }

  video.pause()
  video.srcObject = null
  video.removeAttribute('src')
  video.load()
}
