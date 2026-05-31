import { resolveVideoUrl } from '../../../lib/api'
import type { DailyRewind } from '../types'

type DailyRewindsListProps = {
  rewinds: DailyRewind[]
  rewindsLoading: boolean
  rewindsError: string | null
  onOpenRewind: (rewind: DailyRewind) => void
}

export function DailyRewindsList({
  rewinds,
  rewindsLoading,
  rewindsError,
  onOpenRewind,
}: DailyRewindsListProps) {
  return (
    <div className="rewinds-groups">
      {rewindsError ? <p className="friends-panel__message">{rewindsError}</p> : null}
      {rewindsLoading ? <p className="friends-panel__message">Loading rewinds...</p> : null}
      {!rewindsLoading && rewinds.length === 0 ? (
        <p className="friends-panel__message">
          No rewinds yet. Record clips throughout the day first.
        </p>
      ) : null}
      {rewinds.map((rewind) => (
        <section key={rewind.id} className="rewinds-group">
          <div className="rewinds-group__heading">
            <h3>{rewind.title}</h3>
            <span />
          </div>

          <button
            className="rewinds-card rewinds-card--button"
            type="button"
            onClick={() => onOpenRewind(rewind)}
          >
            <div className="rewinds-card__summary">
              <video
                className="rewinds-card__preview"
                muted
                playsInline
                preload="metadata"
                src={rewind.clips[0] ? resolveVideoUrl(rewind.clips[0]) : undefined}
              />
              <div className="rewinds-card__copy">
                <strong>{rewind.isYou ? 'Your rewind' : `${rewind.ownerName}'s rewind`}</strong>
                <span>{rewind.clipCount} clips compiled in order</span>
                <span>
                  Times: {rewind.clips.map((clip) => clip.timeLabel).join(' · ')}
                </span>
              </div>
            </div>
          </button>
        </section>
      ))}
    </div>
  )
}
