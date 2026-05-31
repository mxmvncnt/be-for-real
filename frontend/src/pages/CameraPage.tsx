import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

const MAX_DURATION_SECONDS = 2

const FILTERS = [
  { id: 'clear', label: 'A', className: '' },
  { id: 'aqua', label: 'A', className: 'camera-preview--aqua' },
  { id: 'sunset', label: 'A', className: 'camera-preview--sunset' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

export function CameraPage() {
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [availableDeviceIds, setAvailableDeviceIds] = useState<string[]>([])
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [clipBlob, setClipBlob] = useState<Blob | null>(null)
  const [clipCreatedAt, setClipCreatedAt] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION_SECONDS)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const [selectedFilter, setSelectedFilter] = useState<FilterId>('clear')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savingClip, setSavingClip] = useState(false)
  const [clipSaved, setClipSaved] = useState(false)

  const activeFilter = useMemo(
    () => FILTERS.find((filter) => filter.id === selectedFilter) ?? FILTERS[0],
    [selectedFilter],
  )

  const statusMessage = getCameraStatusMessage({
    cameraError,
    clipUrl,
    recording,
    secondsLeft,
    cameraReady,
  })

  const releaseCurrentStream = async () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    const currentStream = streamRef.current
    streamRef.current = null

    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop())
    }

    await releaseVideoElement(liveVideoRef.current)
    await new Promise((resolve) => window.setTimeout(resolve, isFirefoxBrowser() ? 400 : 120))
  }

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      setCameraError(null)
      setCameraReady(false)

      await releaseCurrentStream()

      const prefersSpecificDevice = Boolean(selectedDeviceId)
      const constraints: MediaStreamConstraints[] = prefersSpecificDevice
        ? [
            {
              audio: false,
              video: {
                deviceId: { exact: selectedDeviceId! },
                width: { ideal: 720 },
                height: { ideal: 1280 },
              },
            },
            {
              audio: false,
              video: {
                deviceId: { exact: selectedDeviceId! },
              },
            },
          ]
        : [
            {
              audio: false,
              video: {
                facingMode: { ideal: cameraFacingMode },
                width: { ideal: 720 },
                height: { ideal: 1280 },
              },
            },
            {
              audio: false,
              video: {
                width: { ideal: 720 },
                height: { ideal: 1280 },
              },
            },
          ]

      let stream: MediaStream | null = null
      let lastError: unknown = null

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break
        } catch (error) {
          lastError = error
        }
      }

      if (!stream) {
        console.error(lastError)
        if (!cancelled) {
          const message = isFirefoxBrowser()
            ? 'Firefox is having trouble reacquiring the camera. Tap Retry, or use Edge/Chrome for the demo.'
            : 'Camera was denied, busy, or unavailable. Close other camera apps and tap Retry.'
          setCameraError(message)
        }
        return
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDeviceIds = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device) => device.deviceId)
          .filter(Boolean)

        if (!cancelled) {
          setAvailableDeviceIds(videoDeviceIds)
          if (!selectedDeviceId && videoDeviceIds.length > 0) {
            const streamDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId
            setSelectedDeviceId(streamDeviceId ?? videoDeviceIds[0])
          }
        }
      } catch (error) {
        console.error(error)
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        try {
          await liveVideoRef.current.play()
        } catch (error) {
          console.error(error)
        }
      }

      if (!cancelled) {
        setCameraReady(true)
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      void releaseCurrentStream()
    }
  }, [cameraFacingMode, retryTick, selectedDeviceId])

  useEffect(() => {
    if (!playbackVideoRef.current || !clipUrl) {
      return
    }

    playbackVideoRef.current.load()
  }, [clipUrl])

  useEffect(() => {
    return () => {
      if (clipUrl) {
        URL.revokeObjectURL(clipUrl)
      }
    }
  }, [clipUrl])

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }

    setRecording(false)
    setSecondsLeft(MAX_DURATION_SECONDS)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleRecord = () => {
    if (!streamRef.current || recording) {
      return
    }

    const shouldMirrorRecordedClip = cameraFacingMode === 'user'
    const mimeType = getSupportedMimeType()
    chunksRef.current = []

    const recorder = mimeType
      ? new MediaRecorder(streamRef.current, { mimeType })
      : new MediaRecorder(streamRef.current)

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    recorder.onstop = async () => {
      const createdAt = new Date().toISOString()
      const rawBlob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'video/webm',
      })

      let finalBlob = rawBlob
      if (shouldMirrorRecordedClip) {
        try {
          finalBlob = await mirrorRecordedVideo(rawBlob)
        } catch (error) {
          console.error(error)
          finalBlob = rawBlob
        }
      }

      const nextUrl = URL.createObjectURL(finalBlob)
      setClipBlob(finalBlob)
      setClipCreatedAt(createdAt)
      setClipSaved(false)
      setSaveError(null)
      setClipUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl)
        }
        return nextUrl
      })
    }

    mediaRecorderRef.current = recorder
    recorder.start()
    setRecording(true)
    setSecondsLeft(MAX_DURATION_SECONDS)

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          stopRecording()
          return MAX_DURATION_SECONDS
        }

        return previous - 1
      })
    }, 1000)
  }

  const handleFlipCamera = () => {
    if (recording) {
      return
    }

    if (availableDeviceIds.length > 1) {
      setSelectedDeviceId((previous) => {
        const currentIndex = previous ? availableDeviceIds.indexOf(previous) : -1
        const nextIndex = currentIndex >= 0
          ? (currentIndex + 1) % availableDeviceIds.length
          : 0
        return availableDeviceIds[nextIndex]
      })
      return
    }

    setSelectedDeviceId(null)
    setCameraFacingMode((previous) => (previous === 'user' ? 'environment' : 'user'))
  }

  const handleDiscardClip = () => {
    setClipBlob(null)
    setClipCreatedAt(null)
    setClipSaved(false)
    setSaveError(null)
    setClipUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
      return null
    })
  }

  const handleSaveClip = async () => {
    if (!clipBlob || !clipCreatedAt || savingClip || clipSaved) {
      return
    }

    setSavingClip(true)
    setSaveError(null)

    try {
      await api.uploadClip(clipBlob, clipCreatedAt)
      setClipSaved(true)
    } catch (error) {
      console.error(error)
      setSaveError('Could not save your rewind. Try logging in again.')
    } finally {
      setSavingClip(false)
    }
  }

  const handleRetryCamera = () => {
    if (recording) {
      return
    }

    setRetryTick((previous) => previous + 1)
  }

  return (
    <section className="camera-screen" aria-labelledby="camera-title">
      <CameraHeader />
      <CameraPreview
        activeFilterClassName={activeFilter.className}
        cameraError={cameraError}
        cameraFacingMode={cameraFacingMode}
        clipUrl={clipUrl}
        liveVideoRef={liveVideoRef}
        playbackVideoRef={playbackVideoRef}
        statusMessage={statusMessage}
      />
      <CameraControls
        cameraError={cameraError}
        cameraReady={cameraReady}
        clipSaved={clipSaved}
        clipUrl={clipUrl}
        recording={recording}
        saveError={saveError}
        savingClip={savingClip}
        onDiscardClip={handleDiscardClip}
        onFlipCamera={handleFlipCamera}
        onSelectFilter={setSelectedFilter}
        onRetryCamera={handleRetryCamera}
        onSaveClip={handleSaveClip}
        onStartRecording={handleRecord}
        onStopRecording={stopRecording}
        selectedFilter={selectedFilter}
      />
    </section>
  )
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

async function mirrorRecordedVideo(sourceBlob: Blob) {
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

function isFirefoxBrowser() {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)
}

async function releaseVideoElement(video: HTMLVideoElement | null) {
  if (!video) {
    return
  }

  video.pause()
  video.srcObject = null
  video.removeAttribute('src')
  video.load()
}

function getCameraStatusMessage({
  cameraError,
  clipUrl,
  recording,
  secondsLeft,
  cameraReady,
}: {
  cameraError: string | null
  clipUrl: string | null
  recording: boolean
  secondsLeft: number
  cameraReady: boolean
}) {
  if (cameraError) {
    return cameraError
  }

  if (clipUrl) {
    return 'Clip recorded. Replay it or shoot again.'
  }

  if (recording) {
    return `Recording... ${secondsLeft}s`
  }

  if (cameraReady) {
    return 'Camera Preview'
  }

  return 'Opening camera...'
}

function CameraHeader() {
  return (
    <div className="camera-screen__header">
      <h1 id="camera-title">BFR Cam</h1>

      <div className="window-actions" aria-hidden="true">
        <span className="window-actions__button">_</span>
        <span className="window-actions__button">[]</span>
        <Link className="window-actions__button window-actions__button--close" to="/">
          X
        </Link>
      </div>
    </div>
  )
}

function CameraPreview({
  activeFilterClassName,
  cameraFacingMode,
  clipUrl,
  playbackVideoRef,
  liveVideoRef,
  statusMessage,
  cameraError,
}: {
  activeFilterClassName: string
  cameraFacingMode: 'user' | 'environment'
  clipUrl: string | null
  playbackVideoRef: { current: HTMLVideoElement | null }
  liveVideoRef: { current: HTMLVideoElement | null }
  statusMessage: string
  cameraError: string | null
}) {
  return (
    <div className="camera-frame">
      <div className="camera-frame__inner">
        <div className={`camera-preview ${activeFilterClassName}`.trim()}>
          {clipUrl ? (
            <video
              ref={playbackVideoRef}
              autoPlay
              className="camera-video"
              controls
              loop
              muted
              playsInline
              src={clipUrl}
            />
          ) : (
            <video
              ref={liveVideoRef}
              autoPlay
              className={`camera-video ${cameraFacingMode === 'user' ? 'camera-video--mirrored' : ''}`.trim()}
              muted
              playsInline
            />
          )}

          <div className="camera-preview__overlay">
            <p className={`camera-status ${cameraError ? 'camera-status--error' : ''}`.trim()}>
              {statusMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CameraFilterRow({
  selectedFilter,
  onSelectFilter,
}: {
  selectedFilter: FilterId
  onSelectFilter: (filterId: FilterId) => void
}) {
  return (
    <div className="camera-filter-row" aria-label="Filter shortcuts">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          className={`filter-pill ${selectedFilter === filter.id ? 'filter-pill--active' : ''}`}
          type="button"
          onClick={() => onSelectFilter(filter.id)}
        >
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
  )
}

function CameraControls({
  selectedFilter,
  onSelectFilter,
  recording,
  cameraReady,
  clipUrl,
  clipSaved,
  cameraError,
  saveError,
  savingClip,
  onFlipCamera,
  onStartRecording,
  onStopRecording,
  onDiscardClip,
  onRetryCamera,
  onSaveClip,
}: {
  selectedFilter: FilterId
  onSelectFilter: (filterId: FilterId) => void
  recording: boolean
  cameraReady: boolean
  clipUrl: string | null
  clipSaved: boolean
  cameraError: string | null
  saveError: string | null
  savingClip: boolean
  onFlipCamera: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onDiscardClip: () => void
  onRetryCamera: () => void
  onSaveClip: () => void
}) {
  return (
    <div className="camera-toolbar">
      <CameraFilterRow selectedFilter={selectedFilter} onSelectFilter={onSelectFilter} />

      <div className="camera-actions">
        <button
          className="camera-action"
          disabled={recording}
          type="button"
          onClick={onFlipCamera}
        >
          Flip
        </button>

        {recording ? (
          <button
            className="camera-capture camera-capture--recording"
            type="button"
            onClick={onStopRecording}
          >
            <span />
          </button>
        ) : (
          <button
            className="camera-capture"
            disabled={!cameraReady}
            type="button"
            onClick={onStartRecording}
          >
            <span className="camera-capture__icon">REC</span>
          </button>
        )}

        <button
          className="camera-action"
          disabled={!clipUrl || recording}
          type="button"
          onClick={onDiscardClip}
        >
          Retake
        </button>
      </div>

      <div className="camera-footer-note">
        <span>Short capture only: 2 seconds max</span>
        {saveError ? <span className="camera-save-error">{saveError}</span> : null}
        {cameraError ? (
          <button className="camera-retry" type="button" onClick={onRetryCamera}>
            Retry
          </button>
        ) : clipUrl ? (
          <>
            <button
              className="camera-save"
              disabled={savingClip || clipSaved}
              type="button"
              onClick={onSaveClip}
            >
              {clipSaved ? 'Saved to Rewinds' : savingClip ? 'Saving...' : 'Save rewind'}
            </button>
            <a className="camera-download" download="bfr-clip.webm" href={clipUrl}>
              Download clip
            </a>
            {clipSaved ? (
              <Link className="camera-download" to="/rewinds">
                View rewinds
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
