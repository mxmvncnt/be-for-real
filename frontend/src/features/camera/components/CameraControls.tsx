import { Link } from 'react-router-dom'
import type { FilterId } from '../constants'
import { CameraFilterRow } from './CameraFilterRow'

type CameraControlsProps = {
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
}

export function CameraControls({
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
}: CameraControlsProps) {
  return (
    <div className="camera-toolbar">
      <CameraFilterRow selectedFilter={selectedFilter} onSelectFilter={onSelectFilter} />

      <div className="camera-actions">
        <button className="camera-action" disabled={recording} type="button" onClick={onFlipCamera}>
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

        <button className="camera-action" disabled={!clipUrl || recording} type="button" onClick={onDiscardClip}>
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
            <button className="camera-save" disabled={savingClip || clipSaved} type="button" onClick={onSaveClip}>
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
