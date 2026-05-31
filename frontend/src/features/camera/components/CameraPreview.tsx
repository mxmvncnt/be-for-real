import type { ReactNode } from 'react'
import cameraFrameImage from '../../../assets/camera.png'

type CameraPreviewProps = {
  activeFilterClassName: string
  cameraFacingMode: 'user' | 'environment'
  clipUrl: string | null
  playbackVideoRef: { current: HTMLVideoElement | null }
  liveVideoRef: { current: HTMLVideoElement | null }
  statusMessage: string
  cameraError: string | null
  children?: ReactNode
}

export function CameraPreview({
  activeFilterClassName,
  cameraFacingMode,
  clipUrl,
  playbackVideoRef,
  liveVideoRef,
  statusMessage,
  cameraError,
  children,
}: CameraPreviewProps) {
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
        <img
          alt=""
          aria-hidden="true"
          className="camera-frame__chrome"
          src={cameraFrameImage}
        />
        {children}
      </div>
    </div>
  )
}
