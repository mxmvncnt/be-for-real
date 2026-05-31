import type { DailyRewind } from '../types'

type RewindPlayerModalProps = {
  rewind: DailyRewind
  compiledVideoUrl: string | undefined
  isRendering: boolean
  renderError: string | null
  onClose: () => void
}

export function RewindPlayerModal({
  rewind,
  compiledVideoUrl,
  isRendering,
  renderError,
  onClose,
}: RewindPlayerModalProps) {
  return (
    <div className="composer-overlay" role="dialog" aria-modal="true" aria-labelledby="rewind-player-title">
      <div className="rewind-player">
        <div className="rewind-player__header">
          <div>
            <h2 id="rewind-player-title">{rewind.title}</h2>
            <p>{rewind.clips.length} clips merged into one rewind</p>
          </div>
          <button className="composer-close" type="button" onClick={onClose}>
            X
          </button>
        </div>

        {renderError ? <p className="friends-panel__message">{renderError}</p> : null}

        {compiledVideoUrl ? (
          <div className="rewind-player__stage">
            <video autoPlay className="rewind-player__video" controls playsInline src={compiledVideoUrl} />
          </div>
        ) : (
          <div className="rewind-player__loading">
            {isRendering ? 'Compiling your rewind...' : 'Preparing rewind...'}
          </div>
        )}

        <div className="composer-actions">
          <button className="composer-button composer-button--ghost" type="button" onClick={onClose}>
            Close
          </button>
          <div className="rewind-player__status">
            Merged in chronological order for one continuous playback
          </div>
        </div>
      </div>
    </div>
  )
}
