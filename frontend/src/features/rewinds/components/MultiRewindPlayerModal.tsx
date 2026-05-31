import { resolveVideoUrl } from '../../../lib/api'
import type { MultiRewind } from '../types'

type MultiRewindPlayerModalProps = {
  rewind: MultiRewind
  isGenerating: boolean
  generateError: string | null
  onClose: () => void
}

export function MultiRewindPlayerModal({
  rewind,
  isGenerating,
  generateError,
  onClose,
}: MultiRewindPlayerModalProps) {
  return (
    <div className="composer-overlay" role="dialog" aria-modal="true" aria-labelledby="multi-rewind-title">
      <div className="rewind-player">
        <div className="rewind-player__header">
          <div>
            <h2 id="multi-rewind-title">{rewind.title}</h2>
            <p>{rewind.participants.length} equal panels, auto-advancing together</p>
          </div>
          <button className="composer-close" type="button" onClick={onClose}>
            X
          </button>
        </div>

        {generateError ? <p className="friends-panel__message">{generateError}</p> : null}

        {isGenerating ? (
          <div className="rewind-player__loading">Generating Multi-Rewind...</div>
        ) : rewind.videoFilename ? (
          <div className="rewind-player__stage">
            <video
              autoPlay
              className="rewind-player__video"
              controls
              playsInline
              src={resolveVideoUrl({ filename: rewind.videoFilename })}
            />
          </div>
        ) : (
          <div className="rewind-player__loading">Preparing Multi-Rewind...</div>
        )}

        <div className="composer-actions">
          <button className="composer-button composer-button--ghost" type="button" onClick={onClose}>
            Close
          </button>
          <div className="rewind-player__status">
            All panels advance together when the shortest current clip ends
          </div>
        </div>
      </div>
    </div>
  )
}
