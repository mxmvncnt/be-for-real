import type { DailyRewind } from '../types'

type RewindPlayerModalProps = {
  rewind: DailyRewind
  videoUrl: string | undefined
  isGenerating: boolean
  generateError: string | null
  onClose: () => void
}

export function RewindPlayerModal({
  rewind,
  videoUrl,
  isGenerating,
  generateError,
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

        {generateError ? <p className="friends-panel__message">{generateError}</p> : null}

        {videoUrl ? (
          <div className="rewind-player__stage">
            <video autoPlay className="rewind-player__video" controls playsInline src={videoUrl} />
          </div>
        ) : (
          <div className="rewind-player__loading">
            {isGenerating ? 'Generating your rewind...' : 'Preparing rewind...'}
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
