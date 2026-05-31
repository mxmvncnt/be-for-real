type CameraPreviewProps = {
  activeFilterClassName: string
  cameraFacingMode: 'user' | 'environment'
  clipUrl: string | null
  playbackVideoRef: { current: HTMLVideoElement | null }
  liveVideoRef: { current: HTMLVideoElement | null }
  statusMessage: string
  cameraError: string | null
}

export function CameraPreview({
  activeFilterClassName,
  cameraFacingMode,
  clipUrl,
  playbackVideoRef,
  liveVideoRef,
  statusMessage,
  cameraError,
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
      </div>
    </div>
  )
}
