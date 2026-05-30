import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const MAX_DURATION_SECONDS = 5

const FILTERS = [
  { id: 'clear', label: 'A', className: '' },
  { id: 'aqua', label: 'A', className: 'camera-preview--aqua' },
  { id: 'sunset', label: 'A', className: 'camera-preview--sunset' },
] as const

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
  const [recording, setRecording] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION_SECONDS)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const [selectedFilter, setSelectedFilter] =
    useState<(typeof FILTERS)[number]['id']>('clear')

  const activeFilter = useMemo(
    () => FILTERS.find((filter) => filter.id === selectedFilter) ?? FILTERS[0],
    [selectedFilter],
  )

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

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'video/webm',
      })
      const nextUrl = URL.createObjectURL(blob)
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
    setClipUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
      return null
    })
  }

  const handleRetryCamera = () => {
    if (recording) {
      return
    }

    setRetryTick((previous) => previous + 1)
  }

  return (
    <section className="camera-screen" aria-labelledby="camera-title">
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

      <div className="camera-frame">
        <div className="camera-frame__inner">
          <div className={`camera-preview ${activeFilter.className}`.trim()}>
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
                className="camera-video"
                muted
                playsInline
              />
            )}

            <div className="camera-preview__overlay">
              {cameraError ? (
                <p className="camera-status camera-status--error">{cameraError}</p>
              ) : clipUrl ? (
                <p className="camera-status">Clip recorded. Replay it or shoot again.</p>
              ) : recording ? (
                <p className="camera-status">Recording... {secondsLeft}s</p>
              ) : cameraReady ? (
                <p className="camera-status">Camera Preview</p>
              ) : (
                <p className="camera-status">Opening camera...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="camera-toolbar">
        <div className="camera-filter-row" aria-label="Filter shortcuts">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              className={`filter-pill ${selectedFilter === filter.id ? 'filter-pill--active' : ''}`}
              type="button"
              onClick={() => setSelectedFilter(filter.id)}
            >
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        <div className="camera-actions">
          <button
            className="camera-action"
            disabled={recording}
            type="button"
            onClick={handleFlipCamera}
          >
            Flip
          </button>

          {recording ? (
            <button
              className="camera-capture camera-capture--recording"
              type="button"
              onClick={stopRecording}
            >
              <span />
            </button>
          ) : (
            <button
              className="camera-capture"
              disabled={!cameraReady}
              type="button"
              onClick={handleRecord}
            >
              <span className="camera-capture__icon">REC</span>
            </button>
          )}

          <button
            className="camera-action"
            disabled={!clipUrl || recording}
            type="button"
            onClick={handleDiscardClip}
          >
            Retake
          </button>
        </div>

        <div className="camera-footer-note">
          <span>Short capture only: 2-5 seconds</span>
          {cameraError ? (
            <button className="camera-retry" type="button" onClick={handleRetryCamera}>
              Retry
            </button>
          ) : clipUrl ? (
            <a className="camera-download" download="bfr-clip.webm" href={clipUrl}>
              Download clip
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}
