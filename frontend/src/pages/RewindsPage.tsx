import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Friend, type RewindVideo } from '../lib/api'
import wallpaper from '../assets/main_wallpaper.jpg'
import logo from '/logo.png'

type RewindClip = {
  id: string
  createdAt: string
  videoUrl: string
  timeLabel: string
}

type DailyRewind = {
  id: string
  dayKey: string
  title: string
  ownerId: string
  ownerName: string
  isYou: boolean
  clipCount: number
  clips: RewindClip[]
}

type MultiRewind = {
  id: string
  title: string
  dayKey: string
  participants: Array<{
    ownerId: string
    ownerName: string
    clips: RewindClip[]
  }>
  createdBy: string
  videoUrl: string | null
}

export function RewindsPage() {
  const [activeTab, setActiveTab] = useState<'rewinds' | 'multi'>('rewinds')
  const [searchTerm, setSearchTerm] = useState('')
  const [friendQuery, setFriendQuery] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendResults, setFriendResults] = useState<Friend[]>([])
  const [rewindFeed, setRewindFeed] = useState<RewindVideo[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [rewindsLoading, setRewindsLoading] = useState(true)
  const [friendSearchLoading, setFriendSearchLoading] = useState(false)
  const [friendActionLoadingId, setFriendActionLoadingId] = useState<string | null>(null)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [rewindsError, setRewindsError] = useState<string | null>(null)
  const [multiRewinds, setMultiRewinds] = useState<MultiRewind[]>([])
  const [activeRewind, setActiveRewind] = useState<DailyRewind | null>(null)
  const [compiledRewindUrls, setCompiledRewindUrls] = useState<Record<string, string>>({})
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [selectedMultiFriendIds, setSelectedMultiFriendIds] = useState<string[]>([])
  const [composerError, setComposerError] = useState<string | null>(null)
  const [activeMultiRewindId, setActiveMultiRewindId] = useState<string | null>(null)
  const [rewindRenderError, setRewindRenderError] = useState<string | null>(null)
  const [renderingRewindId, setRenderingRewindId] = useState<string | null>(null)
  const [multiRenderError, setMultiRenderError] = useState<string | null>(null)
  const [renderingMultiId, setRenderingMultiId] = useState<string | null>(null)

  useEffect(() => {
    async function loadRewindFeed() {
      setRewindsLoading(true)
      setRewindsError(null)

      try {
        const feed = await api.getRewindFeed()
        setRewindFeed(feed)
      } catch (error) {
        console.error(error)
        setRewindsError('Could not load rewinds yet.')
      } finally {
        setRewindsLoading(false)
      }
    }

    void loadRewindFeed()
  }, [])

  useEffect(() => {
    async function loadFriends() {
      setFriendsLoading(true)
      setFriendError(null)

      try {
        const nextFriends = await api.getFriends()
        setFriends(nextFriends)
      } catch (error) {
        console.error(error)
        setFriendError('Could not load your friends.')
      } finally {
        setFriendsLoading(false)
      }
    }

    void loadFriends()
  }, [])

  const dailyRewinds = useMemo<DailyRewind[]>(() => {
    const groups = new Map<string, DailyRewind>()

    for (const clip of rewindFeed) {
      const createdAt = new Date(clip.createdAt)
      const dayKey = createdAt.toISOString().slice(0, 10)
      const rewindKey = `${clip.userId}:${dayKey}`
      const dayTitle = createdAt.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      })

      if (!groups.has(rewindKey)) {
        groups.set(rewindKey, {
          id: rewindKey,
          dayKey,
          title: `${clip.username}'s ${dayTitle} Rewind`,
          ownerId: clip.userId,
          ownerName: clip.isYou ? 'You' : clip.username,
          isYou: clip.isYou,
          clipCount: 0,
          clips: [],
        })
      }

      const rewind = groups.get(rewindKey)!
      rewind.clips.push({
        id: clip.id,
        createdAt: clip.createdAt,
        videoUrl: clip.videoUrl,
        timeLabel: createdAt.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
      })
    }

    return Array.from(groups.values())
      .map((rewind) => ({
        ...rewind,
        clipCount: rewind.clips.length,
        clips: [...rewind.clips].sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
      }))
      .sort(
        (left, right) =>
          new Date(right.clips[right.clips.length - 1]?.createdAt ?? 0).getTime() -
          new Date(left.clips[left.clips.length - 1]?.createdAt ?? 0).getTime(),
      )
  }, [rewindFeed])

  const ownRewinds = useMemo(
    () => dailyRewinds.filter((rewind) => rewind.isYou),
    [dailyRewinds],
  )

  const filteredRewinds = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) {
      return dailyRewinds
    }

    return dailyRewinds.filter((rewind) => rewind.ownerName.toLowerCase().includes(normalized))
  }, [dailyRewinds, searchTerm])

  const filteredMultiRewinds = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) {
      return multiRewinds
    }

    return multiRewinds.filter((rewind) =>
      `${rewind.participants.map((participant) => participant.ownerName).join(' ')} ${rewind.title}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [multiRewinds, searchTerm])

  const activeMultiRewind = useMemo(
    () => multiRewinds.find((rewind) => rewind.id === activeMultiRewindId) ?? null,
    [multiRewinds, activeMultiRewindId],
  )
  const isTransitionLoading = Boolean(renderingRewindId || renderingMultiId)

  const openRewind = async (rewind: DailyRewind) => {
    setRewindRenderError(null)
    setActiveRewind(rewind)

    if (compiledRewindUrls[rewind.id] || renderingRewindId === rewind.id) {
      return
    }

    setRenderingRewindId(rewind.id)

    try {
      const { videoUrl } = await api.renderRewind(rewind.clips.map((clip) => clip.id))
      setCompiledRewindUrls((previous) => ({
        ...previous,
        [rewind.id]: videoUrl,
      }))
    } catch (error) {
      console.error(error)
      setRewindRenderError('Could not compile this rewind on this device.')
    } finally {
      setRenderingRewindId(null)
    }
  }

  const closeRewind = () => {
    setActiveRewind(null)
    setRewindRenderError(null)
  }

  const handleFriendSearch = async () => {
    const query = friendQuery.trim()
    if (!query) {
      setFriendResults([])
      return
    }

    setFriendSearchLoading(true)
    setFriendError(null)

    try {
      const results = await api.searchUsers(query)
      setFriendResults(results)
    } catch (error) {
      console.error(error)
      setFriendError('Could not search users right now.')
    } finally {
      setFriendSearchLoading(false)
    }
  }

  const handleAddFriend = async (friend: Friend) => {
    setFriendActionLoadingId(friend.id)
    setFriendError(null)

    try {
      await api.addFriend(friend.id)
      setFriends((previous) => {
        if (previous.some((existingFriend) => existingFriend.id === friend.id)) {
          return previous
        }
        return [...previous, friend].sort((left, right) => left.username.localeCompare(right.username))
      })
      setFriendResults((previous) => previous.filter((result) => result.id !== friend.id))
    } catch (error) {
      console.error(error)
      setFriendError(`Could not add ${friend.username}.`)
    } finally {
      setFriendActionLoadingId(null)
    }
  }

  const handleRemoveFriend = async (friend: Friend) => {
    setFriendActionLoadingId(friend.id)
    setFriendError(null)

    try {
      await api.removeFriend(friend.id)
      setFriends((previous) => previous.filter((existingFriend) => existingFriend.id !== friend.id))
      setRewindFeed((previous) => previous.filter((clip) => clip.userId !== friend.id))
      setMultiRewinds((previous) =>
        previous.filter(
          (rewind) => !rewind.participants.some((participant) => participant.ownerId === friend.id),
        ),
      )
    } catch (error) {
      console.error(error)
      setFriendError(`Could not remove ${friend.username}.`)
    } finally {
      setFriendActionLoadingId(null)
    }
  }

  const isAlreadyFriend = (friendId: string) => friends.some((friend) => friend.id === friendId)

  const openComposer = () => {
    setSelectedMultiFriendIds([])
    setComposerError(null)
    setIsComposerOpen(true)
  }

  const closeComposer = () => {
    setIsComposerOpen(false)
    setSelectedMultiFriendIds([])
    setComposerError(null)
  }

  const toggleMultiFriend = (friendId: string) => {
    setSelectedMultiFriendIds((previous) => {
      if (previous.includes(friendId)) {
        return previous.filter((existingId) => existingId !== friendId)
      }

      if (previous.length >= 5) {
        return previous
      }

      return [...previous, friendId]
    })
  }

  const handleCreateMultiRewind = () => {
    if (selectedMultiFriendIds.length === 0) {
      setComposerError('Pick at least one friend to create a Multi-Rewind.')
      return
    }

    const selectedFriends = friends.filter((friend) => selectedMultiFriendIds.includes(friend.id))
    if (selectedFriends.length === 0) {
      setComposerError('Selected friends were not found.')
      return
    }

    const selectedRewinds = selectedFriends
      .map((friend) => ({
        friend,
        rewinds: dailyRewinds.filter((rewind) => rewind.ownerId === friend.id),
      }))
      .filter((entry) => entry.rewinds.length > 0)

    if (selectedRewinds.length !== selectedFriends.length) {
      setComposerError('One or more selected friends do not have any rewinds yet.')
      return
    }

    const latestSharedDay = ownRewinds.find((ownRewind) =>
      selectedRewinds.every((entry) =>
        entry.rewinds.some((friendRewind) => friendRewind.dayKey === ownRewind.dayKey),
      ),
    )

    if (!latestSharedDay) {
      setComposerError('You and the selected friends do not share a rewind day yet.')
      return
    }

    const participantRewinds = [
      {
        ownerId: latestSharedDay.ownerId,
        ownerName: latestSharedDay.ownerName,
        clips: latestSharedDay.clips,
      },
      ...selectedRewinds.map((entry) => {
        const matchingRewind = entry.rewinds.find(
          (friendRewind) => friendRewind.dayKey === latestSharedDay.dayKey,
        )

        return {
          ownerId: entry.friend.id,
          ownerName: entry.friend.username,
          clips: matchingRewind?.clips ?? [],
        }
      }),
    ]

    const createdRewind: MultiRewind = {
      id: `multi-${Date.now()}`,
      title: latestSharedDay.title.replace('Rewind', 'Multi-Rewind'),
      dayKey: latestSharedDay.dayKey,
      participants: participantRewinds,
      createdBy: 'You',
      videoUrl: null,
    }

    setMultiRewinds((previous) => [createdRewind, ...previous])
    setActiveTab('multi')
    closeComposer()
  }

  const openMultiRewind = async (rewind: MultiRewind) => {
    setMultiRenderError(null)
    setActiveMultiRewindId(rewind.id)

    if (rewind.videoUrl || renderingMultiId === rewind.id) {
      return
    }

    setRenderingMultiId(rewind.id)

    try {
      const { videoUrl } = await api.renderMultiRewind(
        rewind.participants.map((participant) => ({
          ownerId: participant.ownerId,
          clipIds: participant.clips.map((clip) => clip.id),
        })),
      )
      setMultiRewinds((previous) =>
        previous.map((existingRewind) =>
          existingRewind.id === rewind.id ? { ...existingRewind, videoUrl } : existingRewind,
        ),
      )
    } catch (error) {
      console.error(error)
      setMultiRenderError('Could not compile the Multi-Rewind on this device.')
    } finally {
      setRenderingMultiId(null)
    }
  }

  const closeMultiRewind = () => {
    setActiveMultiRewindId(null)
    setMultiRenderError(null)
  }

  return (
    <>
      <main
        className="rewinds-shell"
        style={{
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="profile-hero profile-hero--small">
          <img src={logo} alt="Be For Real" className="home-logo home-logo--small" />
        </div>

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
            <p>{friends.length} friend{friends.length === 1 ? '' : 's'} connected</p>
            <p>{ownRewinds.length} personal rewinds</p>
          </div>
        </section>

        <section className="rewinds-panel">
          <section className="friends-panel" aria-labelledby="friends-title">
            <div className="friends-panel__header">
              <h3 id="friends-title">Friends</h3>
              <span>Search and manage your list</span>
            </div>

            <div className="friends-panel__search">
              <input
                placeholder="Search by username or email"
                type="text"
                value={friendQuery}
                onChange={(event) => setFriendQuery(event.target.value)}
              />
              <button type="button" onClick={handleFriendSearch}>
                {friendSearchLoading ? 'Searching...' : 'Find'}
              </button>
            </div>

            {friendError ? <p className="friends-panel__message">{friendError}</p> : null}

            <div className="friends-panel__columns">
              <div className="friends-panel__column">
                <h4>Your friends</h4>
                {friendsLoading ? (
                  <p className="friends-panel__message">Loading friends...</p>
                ) : friends.length === 0 ? (
                  <p className="friends-panel__message">No friends yet.</p>
                ) : (
                  <div className="friend-list">
                    {friends.map((friend) => (
                      <article key={friend.id} className="friend-card">
                        <div>
                          <strong>{friend.username}</strong>
                          <span>{friend.email}</span>
                        </div>
                        <button
                          disabled={friendActionLoadingId === friend.id}
                          type="button"
                          onClick={() => handleRemoveFriend(friend)}
                        >
                          {friendActionLoadingId === friend.id ? 'Removing...' : 'Remove'}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="friends-panel__column">
                <h4>Search results</h4>
                {friendResults.length === 0 ? (
                  <p className="friends-panel__message">Search to add friends.</p>
                ) : (
                  <div className="friend-list">
                    {friendResults.map((friend) => (
                      <article key={friend.id} className="friend-card">
                        <div>
                          <strong>{friend.username}</strong>
                          <span>{friend.email}</span>
                        </div>
                        <button
                          disabled={friendActionLoadingId === friend.id || isAlreadyFriend(friend.id)}
                          type="button"
                          onClick={() => handleAddFriend(friend)}
                        >
                          {isAlreadyFriend(friend.id)
                            ? 'Added'
                            : friendActionLoadingId === friend.id
                              ? 'Adding...'
                              : 'Add'}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

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
              placeholder={activeTab === 'rewinds' ? 'Search by rewind owner' : 'Search by participant'}
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          {activeTab === 'rewinds' ? (
            <div className="rewinds-groups">
              {rewindsError ? <p className="friends-panel__message">{rewindsError}</p> : null}
              {rewindsLoading ? <p className="friends-panel__message">Loading rewinds...</p> : null}
              {!rewindsLoading && filteredRewinds.length === 0 ? (
                <p className="friends-panel__message">No rewinds yet. Record clips throughout the day first.</p>
              ) : null}
              {filteredRewinds.map((rewind) => (
                <section key={rewind.id} className="rewinds-group">
                  <div className="rewinds-group__heading">
                    <h3>{rewind.title}</h3>
                    <span />
                  </div>

                  <button className="rewinds-card rewinds-card--button" type="button" onClick={() => void openRewind(rewind)}>
                    <div className="rewinds-card__summary">
                      <video
                        className="rewinds-card__preview"
                        muted
                        playsInline
                        preload="metadata"
                        src={rewind.clips[0]?.videoUrl}
                      />
                      <div className="rewinds-card__copy">
                        <strong>{rewind.isYou ? 'Your rewind' : `${rewind.ownerName}'s rewind`}</strong>
                        <span>{rewind.clipCount} clips compiled in order</span>
                        <span>Times: {rewind.clips.map((clip) => clip.timeLabel).join(' · ')}</span>
                      </div>
                    </div>
                  </button>
                </section>
              ))}
            </div>
          ) : (
            <div className="rewinds-groups">
              {filteredMultiRewinds.length === 0 ? (
                <p className="friends-panel__message">No Multi-Rewinds yet. Create one from the MIX button.</p>
              ) : null}
              {filteredMultiRewinds.map((rewind) => (
                <section key={rewind.id} className="rewinds-group">
                  <div className="rewinds-group__heading">
                    <h3>{rewind.title}</h3>
                    <span />
                  </div>

                  <button className="rewinds-card rewinds-card--button" type="button" onClick={() => void openMultiRewind(rewind)}>
                    <div className="rewinds-card__summary">
                      <div
                        className={`rewinds-card__stack rewinds-card__stack--${Math.min(rewind.participants.length, 6)}`}
                      >
                        {rewind.participants.map((participant) => (
                          <video
                            key={participant.ownerId}
                            className="rewinds-card__stack-video"
                            muted
                            playsInline
                            preload="metadata"
                            src={participant.clips[0]?.videoUrl}
                          />
                        ))}
                      </div>
                      <div className="rewinds-card__copy">
                        <strong>{rewind.participants.map((participant) => participant.ownerName).join(' + ')}</strong>
                        <span>
                          {Math.min(...rewind.participants.map((participant) => participant.clips.length))} synchronized segments
                        </span>
                        <span>Rendered as one equal-panel Multi-Rewind</span>
                      </div>
                    </div>
                  </button>
                </section>
              ))}
            </div>
          )}
        </section>

        </section>

        <aside className="rewinds-fab">
          <div className="rewinds-fab__bubble" />
          <Link className="rewinds-action rewinds-action--lime" to="/camera">
            <span className="rewinds-action__icon">REC</span>
            <span>Record today&apos;s clip</span>
          </Link>
          <button className="rewinds-action rewinds-action--cyan" type="button" onClick={openComposer}>
            <span className="rewinds-action__icon">MIX</span>
            <span>Make Multi-Rewind</span>
          </button>
        </aside>
      </main>
      <div className={`page-transition-overlay${isTransitionLoading ? ' is-active' : ''}`}>
        <span className="transition-loading">
          Loading<span className="transition-loading__dots" />
        </span>
        {Array.from({ length: 14 }).map((_, index) => (
          <span key={`sparkle-${index}`} className="transition-sparkle" />
        ))}
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={`bubble-${index}`} className="bubble" />
        ))}
      </div>
      {activeRewind ? (
        <div className="composer-overlay" role="dialog" aria-modal="true" aria-labelledby="rewind-player-title">
          <div className="rewind-player">
            <div className="rewind-player__header">
              <div>
                <h2 id="rewind-player-title">{activeRewind.title}</h2>
                <p>{activeRewind.clips.length} clips merged into one rewind</p>
              </div>
              <button className="composer-close" type="button" onClick={closeRewind}>
                X
              </button>
            </div>

            {rewindRenderError ? <p className="friends-panel__message">{rewindRenderError}</p> : null}

            {compiledRewindUrls[activeRewind.id] ? (
              <div className="rewind-player__stage">
                <video
                  autoPlay
                  className="rewind-player__video"
                  controls
                  playsInline
                  src={compiledRewindUrls[activeRewind.id]}
                />
              </div>
            ) : (
              <div className="rewind-player__loading">
                {renderingRewindId === activeRewind.id
                  ? 'Compiling your rewind...'
                  : 'Preparing rewind...'}
              </div>
            )}

            <div className="composer-actions">
              <button className="composer-button composer-button--ghost" type="button" onClick={closeRewind}>
                Close
              </button>
              <div className="rewind-player__status">
                Merged in chronological order for one continuous playback
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeMultiRewind ? (
        <div className="composer-overlay" role="dialog" aria-modal="true" aria-labelledby="multi-rewind-title">
          <div className="rewind-player">
            <div className="rewind-player__header">
              <div>
                <h2 id="multi-rewind-title">{activeMultiRewind.title}</h2>
                <p>
                  {activeMultiRewind.participants.length} equal panels, auto-advancing together
                </p>
              </div>
              <button className="composer-close" type="button" onClick={closeMultiRewind}>
                X
              </button>
            </div>

            {multiRenderError ? <p className="friends-panel__message">{multiRenderError}</p> : null}

            {activeMultiRewind.videoUrl ? (
              <div className="rewind-player__stage">
                <video
                  autoPlay
                  className="rewind-player__video"
                  controls
                  playsInline
                  src={activeMultiRewind.videoUrl}
                />
              </div>
            ) : (
              <div className="rewind-player__loading">
                {renderingMultiId === activeMultiRewind.id
                  ? 'Compiling split-screen rewind...'
                  : 'Preparing Multi-Rewind...'}
              </div>
            )}

            <div className="composer-actions">
              <button className="composer-button composer-button--ghost" type="button" onClick={closeMultiRewind}>
                Close
              </button>
              <div className="rewind-player__status">
                All panels advance together when the shortest current clip ends
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isComposerOpen ? (
        <div className="composer-overlay" role="dialog" aria-modal="true" aria-labelledby="composer-title">
          <div className="composer-modal">
            <div className="composer-modal__header">
              <h2 id="composer-title">Create a Multi-Rewind</h2>
              <button className="composer-close" type="button" onClick={closeComposer}>
                X
              </button>
            </div>

            <div className="composer-step">
              <h3>Pick up to 5 friends</h3>
              <p>The result is a Multi-Rewind with equal-size panels for everyone, including you.</p>
              <div className="composer-friend-list">
                {friends.length === 0 ? (
                  <p className="friends-panel__message">Add friends first to create a Multi-Rewind.</p>
                ) : (
                  friends.map((friend) => (
                    <label key={friend.id} className="composer-friend">
                      <input
                        checked={selectedMultiFriendIds.includes(friend.id)}
                        disabled={
                          !selectedMultiFriendIds.includes(friend.id) &&
                          selectedMultiFriendIds.length >= 5
                        }
                        type="checkbox"
                        onChange={() => toggleMultiFriend(friend.id)}
                      />
                      <span>{friend.username}</span>
                      <em>{friend.email}</em>
                    </label>
                  ))
                )}
              </div>
            </div>

            {composerError ? <p className="friends-panel__message">{composerError}</p> : null}

            <div className="composer-summary">
              <strong>Preview:</strong>
              <span>
                {selectedMultiFriendIds.length > 0
                  ? ['You', ...friends
                      .filter((friend) => selectedMultiFriendIds.includes(friend.id))
                      .map((friend) => friend.username)].join(', ')
                  : 'Choose up to 5 friends to continue'}
              </span>
            </div>

            <div className="composer-actions">
              <button className="composer-button composer-button--ghost" type="button" onClick={closeComposer}>
                Cancel
              </button>
              <button
                className="composer-button composer-button--primary"
                disabled={selectedMultiFriendIds.length === 0}
                type="button"
                onClick={handleCreateMultiRewind}
              >
                Create Multi-Rewind
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
