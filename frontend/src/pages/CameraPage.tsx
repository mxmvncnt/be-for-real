import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransitionOverlay } from '../components/PageTransitionOverlay'
import { CameraControls } from '../features/camera/components/CameraControls'
import { CameraHeader } from '../features/camera/components/CameraHeader'
import { CameraPreview } from '../features/camera/components/CameraPreview'
import { FILTERS, MAX_DURATION_SECONDS, type FilterId } from '../features/camera/constants'
import {
  getSupportedMimeType,
  isFirefoxBrowser,
  mirrorRecordedVideo,
  releaseVideoElement,
} from '../features/camera/utils/media'
import { getCameraStatusMessage } from '../features/camera/utils/status'
import { api } from '../lib/api'

export function CameraPage() {
  const navigate = useNavigate()
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const flipResetTimerRef = useRef<number | null>(null)
  const pendingFlipRef = useRef<{
    previousDeviceId: string | null
    previousFacingMode: 'user' | 'environment'
  } | null>(null)

  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [availableDeviceIds, setAvailableDeviceIds] = useState<string[]>([])
  const [recording, setRecording] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION_SECONDS)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [flipFailed, setFlipFailed] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<FilterId>('clear')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [processingClip, setProcessingClip] = useState(false)

  const activeFilter = useMemo(
    () => FILTERS.find((filter) => filter.id === selectedFilter) ?? FILTERS[0],
    [selectedFilter],
  )

  const statusMessage = getCameraStatusMessage({
    cameraError,
    clipUrl: null,
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
    return () => {
      if (flipResetTimerRef.current) {
        window.clearTimeout(flipResetTimerRef.current)
      }
    }
  }, [])

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
          if (pendingFlipRef.current) {
            const { previousDeviceId, previousFacingMode } = pendingFlipRef.current
            pendingFlipRef.current = null
            setFlipFailed(true)
            if (flipResetTimerRef.current) {
              window.clearTimeout(flipResetTimerRef.current)
            }
            flipResetTimerRef.current = window.setTimeout(() => {
              setFlipFailed(false)
            }, 1400)

            if (selectedDeviceId !== previousDeviceId) {
              setSelectedDeviceId(previousDeviceId)
            }
            if (cameraFacingMode !== previousFacingMode) {
              setCameraFacingMode(previousFacingMode)
            }
            setCameraError(null)
          } else {
            const message = isFirefoxBrowser()
              ? 'Firefox is having trouble reacquiring the camera. Use Edge or Chrome for the demo.'
              : 'Camera was denied, busy, or unavailable. Close other camera apps.'
            setCameraError(message)
          }
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
      pendingFlipRef.current = null

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
  }, [cameraFacingMode, selectedDeviceId])

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
    if (!streamRef.current || recording || processingClip) {
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
      setProcessingClip(true)

      try {
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

        setSaveError(null)
        await api.uploadClip(finalBlob, createdAt)
        navigate('/rewinds')
        return
      } catch (error) {
        console.error(error)
        setSaveError('Could not save your rewind. Try logging in again.')
      } finally {
        setProcessingClip(false)
      }
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
    if (recording || processingClip) {
      return
    }

    setFlipFailed(false)
    pendingFlipRef.current = {
      previousDeviceId: selectedDeviceId,
      previousFacingMode: cameraFacingMode,
    }

    if (availableDeviceIds.length > 1) {
      setSelectedDeviceId((previous) => {
        const currentIndex = previous ? availableDeviceIds.indexOf(previous) : -1
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % availableDeviceIds.length : 0
        return availableDeviceIds[nextIndex]
      })
      return
    }

    setSelectedDeviceId(null)
    setCameraFacingMode((previous) => (previous === 'user' ? 'environment' : 'user'))
  }

  return (
    <section className="camera-screen" aria-labelledby="camera-title">
      <CameraHeader />
      <div className="camera-window">
        <CameraPreview
          activeFilterClassName={activeFilter.className}
          cameraError={cameraError}
          cameraFacingMode={cameraFacingMode}
          clipUrl={null}
          liveVideoRef={liveVideoRef}
          playbackVideoRef={playbackVideoRef}
          statusMessage={statusMessage}
        >
          {recording ? (
            <button
              className="camera-window__capture camera-capture camera-capture--recording"
              type="button"
              onClick={stopRecording}
            >
              <span />
            </button>
          ) : (
            <button
              className="camera-window__capture camera-capture"
              disabled={!cameraReady || processingClip}
              type="button"
              onClick={handleRecord}
              aria-label="Start recording"
            >
              <img className="camera-capture__icon" src="/button-cam.svg" alt="Record" />
            </button>
          )}
        </CameraPreview>
      </div>
      <CameraControls
        cameraError={cameraError}
        cameraReady={cameraReady}
        flipFailed={flipFailed}
        processingClip={processingClip}
        recording={recording}
        saveError={saveError}
        onFlipCamera={handleFlipCamera}
        onSelectFilter={setSelectedFilter}
        selectedFilter={selectedFilter}
      />
      <PageTransitionOverlay active={processingClip} />
    </section>
  )
}
