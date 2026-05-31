import { resolveVideoUrl } from '../../../lib/api'
import type { MultiRewind } from '../types'

type MultiRewindsListProps = {
  rewinds: MultiRewind[];
  onOpenMultiRewind: (rewind: MultiRewind) => void;
};

export function MultiRewindsList({
  rewinds,
  onOpenMultiRewind,
}: MultiRewindsListProps) {
  return (
    <div className="rewinds-groups">
      {rewinds.length === 0 ? (
        <p className="friends-panel__message">
          No Multi-Rewinds yet. Create one from the Make Multi-Rewind button.
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
            onClick={() => onOpenMultiRewind(rewind)}
          >
            <div className="rewinds-card__summary">
              <div
                className={`rewinds-card__stack rewinds-card__stack--${Math.min(rewind.participants.length, 6)}`}
              >
                {rewind.participants.map((participant) => (
                  <video
                    key={participant.ownerId}
                    className={`rewinds-card__stack-video rewinds-card__stack-video--${Math.min(rewind.participants.length, 6)}`}
                    muted
                    playsInline
                    preload="metadata"
                    src={
                      participant.clips[0]
                        ? resolveVideoUrl(participant.clips[0])
                        : undefined
                    }
                  />
                ))}
              </div>
              <div className="rewinds-card__copy">
                <strong>
                  {rewind.participants
                    .map((participant) => participant.ownerName)
                    .join(" + ")}
                </strong>
                <span>
                  {Math.min(
                    ...rewind.participants.map(
                      (participant) => participant.clips.length,
                    ),
                  )}{" "}
                  synchronized segments
                </span>
                <span>Rendered as one equal-panel Multi-Rewind</span>
              </div>
            </div>
          </button>
        </section>
      ))}
    </div>
  );
}
