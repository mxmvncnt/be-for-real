import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type FriendClip = {
  id: string
  label: string
  isYou?: boolean
}

type DayGroup = {
  id: string
  title: string
  clips: FriendClip[]
}

type MultiRewind = {
  id: string
  title: string
  participants: string[]
  createdBy: string
}

const RAW_REWINDS: DayGroup[] = [
  {
    id: 'yesterday',
    title: "Yesterday's Rewinds",
    clips: [
      { id: 'me-yesterday', label: 'Me', isYou: true },
      { id: 'coco-yesterday', label: 'Coco' },
      { id: 'will-yesterday', label: 'Will' },
      { id: 'ju-yesterday', label: 'Ju' },
      { id: 'sam-yesterday', label: 'Sam' },
    ],
  },
  {
    id: 'may-22',
    title: "May 22th's Rewinds",
    clips: [
      { id: 'me-may-22', label: 'Me', isYou: true },
      { id: 'ju-may-22', label: 'Ju' },
      { id: 'tina-may-22', label: 'Tina' },
    ],
  },
  {
    id: 'may-20',
    title: "May 20th's Rewinds",
    clips: [{ id: 'coco-may-20', label: 'Coco' }],
  },
]

const INITIAL_MULTI_REWINDS: MultiRewind[] = [
  {
    id: 'friend-crew-yesterday',
    title: "Yesterday's Rewinds",
    participants: ['Me', 'Coco', 'William', 'Layla'],
    createdBy: 'Coco',
  },
  {
    id: 'friend-ju-tina',
    title: "May 22th's Rewinds",
    participants: ['Ju', 'Tina'],
    createdBy: 'Ju',
  },
]

export function RewindsPage() {
  const [activeTab, setActiveTab] = useState<'rewinds' | 'multi'>('rewinds')
  const [searchTerm, setSearchTerm] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [multiRewinds, setMultiRewinds] = useState<MultiRewind[]>(INITIAL_MULTI_REWINDS)

  const eligibleDays = useMemo(
    () => RAW_REWINDS.filter((group) => group.clips.some((clip) => clip.isYou)),
    [],
  )

  const selectedDay =
    eligibleDays.find((group) => group.id === selectedDayId) ??
    (eligibleDays.length > 0 ? eligibleDays[0] : null)

  const filteredRawRewinds = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    if (!normalized) {
      return RAW_REWINDS
    }

    return RAW_REWINDS.map((group) => ({
      ...group,
      clips: group.clips.filter((clip) => clip.label.toLowerCase().includes(normalized)),
    })).filter((group) => group.clips.length > 0)
  }, [searchTerm])

  const groupedMultiRewinds = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    const filtered = !normalized
      ? multiRewinds
      : multiRewinds.filter((rewind) =>
          rewind.participants.join(', ').toLowerCase().includes(normalized),
        )

    return filtered.reduce<Record<string, MultiRewind[]>>((accumulator, rewind) => {
      accumulator[rewind.title] ??= []
      accumulator[rewind.title].push(rewind)
      return accumulator
    }, {})
  }, [multiRewinds, searchTerm])

  const openComposer = () => {
    const defaultDay = eligibleDays[0] ?? null
    setSelectedDayId(defaultDay?.id ?? null)
    setSelectedFriendIds([])
    setIsComposerOpen(true)
    setActiveTab('rewinds')
  }

  const closeComposer = () => {
    setIsComposerOpen(false)
    setSelectedFriendIds([])
  }

  const handleDayChange = (dayId: string) => {
    setSelectedDayId(dayId)
    setSelectedFriendIds([])
  }

  const toggleFriendSelection = (friendId: string, isYou?: boolean) => {
    if (isYou) {
      return
    }

    setSelectedFriendIds((previous) =>
      previous.includes(friendId)
        ? previous.filter((existingId) => existingId !== friendId)
        : [...previous, friendId],
    )
  }

  const handleCreateMultiRewind = () => {
    if (!selectedDay) {
      return
    }

    const participantLabels = selectedDay.clips
      .filter((clip) => clip.isYou || selectedFriendIds.includes(clip.id))
      .map((clip) => clip.label)

    if (participantLabels.length < 2) {
      return
    }

    const createdRewind: MultiRewind = {
      id: `created-${selectedDay.id}-${selectedFriendIds.join('-')}`,
      title: selectedDay.title,
      participants: participantLabels,
      createdBy: 'You',
    }

    setMultiRewinds((previous) => [createdRewind, ...previous])
    setActiveTab('multi')
    closeComposer()
  }

  const canCreateMultiRewind = selectedDay
    ? selectedDay.clips.filter((clip) => clip.isYou || selectedFriendIds.includes(clip.id)).length >= 2
    : false

  return (
    <>
      <section className="rewinds-screen">
        <header className="rewinds-topbar">
          <h1>My profile</h1>

          <div className="window-actions" aria-hidden="true">
            <span className="window-actions__button">_</span>
            <span className="window-actions__button">[]</span>
            <Link className="window-actions__button window-actions__button--close" to="/">
              X
            </Link>
          </div>
        </header>

        <section className="profile-banner">
          <div className="profile-banner__avatar">
            <div className="profile-banner__avatar-head" />
            <div className="profile-banner__avatar-body" />
          </div>

          <div className="profile-banner__meta">
            <h2>Alex_Phung</h2>
            <p>Eneko corp enthusiast and big gamer</p>
          </div>
        </section>

        <section className="rewinds-panel">
          <div className="rewinds-tabs">
            <button
              className={`rewinds-tab ${activeTab === 'rewinds' ? 'rewinds-tab--pink' : ''}`}
              type="button"
              onClick={() => setActiveTab('rewinds')}
            >
              Rewinds
            </button>
            <button
              className={`rewinds-tab ${activeTab === 'multi' ? 'rewinds-tab--green' : ''}`}
              type="button"
              onClick={() => setActiveTab('multi')}
            >
              Multi-Rewinds
            </button>
          </div>

          <label className="rewinds-search">
            <span>Search Friend :</span>
            <input
              placeholder="Search by friend name"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          {activeTab === 'rewinds' ? (
            <div className="rewinds-groups">
              {filteredRawRewinds.map((group) => (
                <section key={group.id} className="rewinds-group">
                  <div className="rewinds-group__heading">
                    <h3>{group.title}</h3>
                    <span />
                  </div>

                  <div className="rewinds-card">
                    <div className="rewinds-card__grid">
                      {group.clips.map((clip) => (
                        <article key={clip.id} className="rewind-tile">
                          <div className="rewind-tile__thumb" />
                          <p>{clip.label}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rewinds-groups">
              {Object.entries(groupedMultiRewinds).map(([title, rewinds]) => (
                <section key={title} className="rewinds-group">
                  <div className="rewinds-group__heading">
                    <h3>{title}</h3>
                    <span />
                  </div>

                  <div className="rewinds-card">
                    <div className="rewinds-card__grid">
                      {rewinds.map((rewind) => (
                        <article key={rewind.id} className="rewind-tile rewind-tile--multi">
                          <div className="rewind-tile__thumb rewind-tile__thumb--wide" />
                          <p>{rewind.participants.join(', ')}</p>
                          <span className="rewind-tile__meta">Created by {rewind.createdBy}</span>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className="rewinds-fab">
          <div className="rewinds-fab__bubble" />
          <Link className="rewinds-action rewinds-action--lime" to="/camera">
            <span className="rewinds-action__icon">REC</span>
            <span>Record today&apos;s rewind</span>
          </Link>
          <button className="rewinds-action rewinds-action--cyan" type="button" onClick={openComposer}>
            <span className="rewinds-action__icon">MIX</span>
            <span>Make Multi-Rewinds</span>
          </button>
        </aside>
      </section>

      {isComposerOpen && selectedDay ? (
        <div className="composer-overlay" role="dialog" aria-modal="true" aria-labelledby="composer-title">
          <div className="composer-modal">
            <div className="composer-modal__header">
              <h2 id="composer-title">Create a Multi-Rewind</h2>
              <button className="composer-close" type="button" onClick={closeComposer}>
                X
              </button>
            </div>

            <div className="composer-step">
              <h3>1. Choose a day</h3>
              <p>Only days where you recorded are available.</p>
              <div className="composer-day-list">
                {eligibleDays.map((group) => (
                  <button
                    key={group.id}
                    className={`composer-day ${selectedDay.id === group.id ? 'composer-day--active' : ''}`}
                    type="button"
                    onClick={() => handleDayChange(group.id)}
                  >
                    {group.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="composer-step">
              <h3>2. Select friends from that day</h3>
              <p>You are always included. Pick the friends you want in the mashup.</p>
              <div className="composer-friend-list">
                {selectedDay.clips.map((clip) => (
                  <label
                    key={clip.id}
                    className={`composer-friend ${clip.isYou ? 'composer-friend--locked' : ''}`}
                  >
                    <input
                      checked={clip.isYou || selectedFriendIds.includes(clip.id)}
                      disabled={clip.isYou}
                      type="checkbox"
                      onChange={() => toggleFriendSelection(clip.id, clip.isYou)}
                    />
                    <span>{clip.label}</span>
                    {clip.isYou ? <em>You must be included</em> : null}
                  </label>
                ))}
              </div>
            </div>

            <div className="composer-summary">
              <strong>Preview:</strong>
              <span>
                {selectedDay.clips
                  .filter((clip) => clip.isYou || selectedFriendIds.includes(clip.id))
                  .map((clip) => clip.label)
                  .join(', ')}
              </span>
            </div>

            <div className="composer-actions">
              <button className="composer-button composer-button--ghost" type="button" onClick={closeComposer}>
                Cancel
              </button>
              <button
                className="composer-button composer-button--primary"
                disabled={!canCreateMultiRewind}
                type="button"
                onClick={handleCreateMultiRewind}
              >
                Confirm Multi-Rewind
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
