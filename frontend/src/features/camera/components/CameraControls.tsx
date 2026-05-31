import cameraConfirmIcon from '../../../assets/camera-confirm.svg'
import cameraFlipIcon from '../../../assets/camera-flip-alt.png'
import type { FilterId } from '../constants'
import { CameraFilterRow } from './CameraFilterRow'

type CameraControlsProps = {
  selectedFilter: FilterId
  onSelectFilter: (filterId: FilterId) => void
  recording: boolean
  processingClip: boolean
  flipFailed: boolean
  cameraReady: boolean
  saveError: string | null
  onFlipCamera: () => void
}

export function CameraControls({
  selectedFilter,
  onSelectFilter,
  recording,
  processingClip,
  flipFailed,
  cameraReady,
  saveError,
  onFlipCamera,
}: CameraControlsProps) {
  return (
    <div className="camera-toolbar">
      <CameraFilterRow selectedFilter={selectedFilter} onSelectFilter={onSelectFilter} />

      <div className="camera-actions">
        <button
          aria-label="Flip camera"
          className={`camera-icon-button${flipFailed ? ' is-failed' : ''}`}
          disabled={recording || processingClip}
          type="button"
          onClick={onFlipCamera}
        >
          <img className="camera-icon-button__image" src={cameraFlipIcon} alt="" />
        </button>
      </div>

      <div className="camera-footer-note">
        {saveError ? <span className="camera-save-error">{saveError}</span> : null}
        {processingClip ? (
          <button
            aria-label="Saving clip"
            className="camera-icon-button"
            disabled
            type="button"
          >
            <img className="camera-icon-button__image" src={cameraConfirmIcon} alt="" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
