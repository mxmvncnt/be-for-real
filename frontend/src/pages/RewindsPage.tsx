import { useEffect, useMemo, useState } from 'react'
import { PageTransitionOverlay } from '../components/PageTransitionOverlay'
import wallpaper from '../assets/background_rewind.png'
import { api, resolveVideoUrl, type CurrentUser, type Friend, type RewindVideo, type Song } from '../lib/api'
import { DailyRewindsList } from '../features/rewinds/components/DailyRewindsList'
import { FriendsPanel } from '../features/rewinds/components/FriendsPanel'
import { MultiRewindComposerModal } from '../features/rewinds/components/MultiRewindComposerModal'
import { MultiRewindPlayerModal } from '../features/rewinds/components/MultiRewindPlayerModal'
import { MultiRewindsList } from '../features/rewinds/components/MultiRewindsList'
import { ProfileBanner } from '../features/rewinds/components/ProfileBanner'
import { RewindPlayerModal } from '../features/rewinds/components/RewindPlayerModal'
import { RewindsFab } from '../features/rewinds/components/RewindsFab'
import { RewindsFilterBar } from '../features/rewinds/components/RewindsFilterBar'
import { RewindsHeader } from '../features/rewinds/components/RewindsHeader'
import { buildDailyRewinds, filterDailyRewinds, filterMultiRewinds, getFriendWithRewindForDay } from '../features/rewinds/selectors'
import type { DailyRewind, MultiRewind } from '../features/rewinds/types'


export function RewindsPage() {
  const [activeTab, setActiveTab] = useState<'rewinds' | 'multi'>('rewinds')
  const [searchTerm, setSearchTerm] = useState('')
  const [friendQuery, setFriendQuery] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [incomingRequests, setIncomingRequests] = useState<Friend[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<Friend[]>([])
  const [friendResults, setFriendResults] = useState<Friend[]>([])
  const [rewindFeed, setRewindFeed] = useState<RewindVideo[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(true)
  const [rewindsLoading, setRewindsLoading] = useState(true)
  const [friendSearchLoading, setFriendSearchLoading] = useState(false)
  const [friendActionLoadingId, setFriendActionLoadingId] = useState<string | null>(null)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [rewindsError, setRewindsError] = useState<string | null>(null)
  const [multiRewinds, setMultiRewinds] = useState<MultiRewind[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [songsLoading, setSongsLoading] = useState(true)
  const [songsError, setSongsError] = useState<string | null>(null)
  const [activeRewind, setActiveRewind] = useState<DailyRewind | null>(null)
  const [generatedRewindUrls, setGeneratedRewindUrls] = useState<Record<string, string>>({})
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [selectedComposerDayId, setSelectedComposerDayId] = useState<string | null>(null)
  const [selectedMultiFriendIds, setSelectedMultiFriendIds] = useState<string[]>([])
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [activeMultiRewindId, setActiveMultiRewindId] = useState<string | null>(null)
  const [rewindGenerateError, setRewindGenerateError] = useState<string | null>(null)
  const [generatingRewindId, setGeneratingRewindId] = useState<string | null>(null)
  const [multiGenerateError, setMultiGenerateError] = useState<string | null>(null)
  const [generatingMultiId, setGeneratingMultiId] = useState<string | null>(null)

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
    async function loadCurrentUser() {
      try {
        const user = await api.getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error(error)
      }
    }

    void loadCurrentUser()
  }, [])

  useEffect(() => {
    async function loadSongs() {
      setSongsLoading(true)
      setSongsError(null)

      try {
        const availableSongs = await api.getSongs()
        setSongs(availableSongs)
        setSelectedMusicId((previous) => previous ?? availableSongs[0]?.id ?? null)
      } catch (error) {
        console.error(error)
        setSongsError('Could not load music list.')
      } finally {
        setSongsLoading(false)
      }
    }

    void loadSongs()
  }, [])

  const loadFriends = async () => {
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

  const loadFriendRequests = async () => {
    setFriendRequestsLoading(true)
    setFriendError(null)

    try {
      const [received, sent] = await Promise.all([
        api.getFriendRequestsReceived(),
        api.getFriendRequestsSent(),
      ])
      setIncomingRequests(received)
      setOutgoingRequests(sent)
    } catch (error) {
      console.error(error)
      setFriendError('Could not load friend requests.')
    } finally {
      setFriendRequestsLoading(false)
    }
  }

  useEffect(() => {
    void loadFriends()
    void loadFriendRequests()
  }, [])

  useEffect(() => {
    if (!isFriendsModalOpen) {
      return
    }

    void loadFriends()
    void loadFriendRequests()
  }, [isFriendsModalOpen])

  const dailyRewinds = useMemo(() => buildDailyRewinds(rewindFeed), [rewindFeed])
  const ownRewinds = useMemo(() => dailyRewinds.filter((rewind) => rewind.isYou), [dailyRewinds])
  const selectedDay =
    ownRewinds.find((rewind) => rewind.id === selectedComposerDayId) ?? ownRewinds[0] ?? null
  const composerFriendOptions = useMemo(
    () => getFriendWithRewindForDay(friends, dailyRewinds, selectedDay),
    [friends, dailyRewinds, selectedDay],
  )
  const filteredRewinds = useMemo(
    () => filterDailyRewinds(dailyRewinds, searchTerm),
    [dailyRewinds, searchTerm],
  )
  const filteredMultiRewinds = useMemo(
    () => filterMultiRewinds(multiRewinds, searchTerm),
    [multiRewinds, searchTerm],
  )
  const activeMultiRewind = useMemo(
    () => multiRewinds.find((rewind) => rewind.id === activeMultiRewindId) ?? null,
    [multiRewinds, activeMultiRewindId],
  )
  const isTransitionLoading = Boolean(generatingRewindId || generatingMultiId)
  const profileName = currentUser?.username ?? window.localStorage.getItem('bfr.username') ?? 'User'

  const openRewind = async (rewind: DailyRewind) => {
    setRewindGenerateError(null)
    setActiveRewind(rewind)

    if (generatedRewindUrls[rewind.id] || generatingRewindId === rewind.id) {
      return
    }

    setGeneratingRewindId(rewind.id)

    try {
      const video = await api.generateMashup(rewind.dateIsoString, {
        userId: rewind.ownerId,
      })
      const videoUrl = resolveVideoUrl(video)
      setGeneratedRewindUrls((previous) => ({
        ...previous,
        [rewind.id]: videoUrl,
      }))
    } catch (error) {
      console.error(error)
      setRewindGenerateError('Could not generate this rewind.')
    } finally {
      setGeneratingRewindId(null)
    }
  }

  const closeRewind = () => {
    setActiveRewind(null)
    setRewindGenerateError(null)
  }

  useEffect(() => {
    const query = friendQuery.trim()
    if (!query) {
      setFriendResults([])
      setFriendSearchLoading(false)
      return
    }

    let ignore = false
    const shouldShowSpinner = friendResults.length === 0
    if (shouldShowSpinner) {
      setFriendSearchLoading(true)
    }
    setFriendError(null)

    const timeoutId = window.setTimeout(() => {
      api
        .searchUsers(query)
        .then((results) => {
          if (ignore) {
            return
          }

          const friendIds = new Set(friends.map((friend) => friend.id))
          const filtered = results.filter((result) => !friendIds.has(result.id))
          setFriendResults(filtered.slice(0, 5))
        })
        .catch((error) => {
          if (ignore) {
            return
          }
          console.error(error)
          setFriendError('Could not search users right now.')
        })
        .finally(() => {
          if (!ignore) {
            setFriendSearchLoading(false)
          }
        })
    }, 300)

    return () => {
      ignore = true
      window.clearTimeout(timeoutId)
    }
  }, [friendQuery, friends])

  const handleAddFriend = async (friend: Friend) => {
    setFriendActionLoadingId(friend.id)
    setFriendError(null)

    try {
      await api.addFriend(friend.id)
      setOutgoingRequests((previous) => {
        if (previous.some((existing) => existing.id === friend.id)) {
          return previous
        }
        return [...previous, friend].sort((left, right) =>
          left.username.localeCompare(right.username),
        )
      })
      setFriendResults((previous) => previous.filter((result) => result.id !== friend.id))
      await Promise.all([loadFriends(), loadFriendRequests()])
    } catch (error) {
      console.error(error)
      setFriendError(`Could not add ${friend.username}.`)
    } finally {
      setFriendActionLoadingId(null)
    }
  }

  const handleAcceptFriend = async (friend: Friend) => {
    setFriendActionLoadingId(friend.id)
    setFriendError(null)

    try {
      await api.acceptFriendRequest(friend.id)
      setIncomingRequests((previous) => previous.filter((request) => request.id !== friend.id))
      setFriends((previous) => {
        if (previous.some((existing) => existing.id === friend.id)) {
          return previous
        }
        return [...previous, friend].sort((left, right) =>
          left.username.localeCompare(right.username),
        )
      })
      await Promise.all([loadFriends(), loadFriendRequests()])
    } catch (error) {
      console.error(error)
      setFriendError(`Could not accept ${friend.username}.`)
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
      setIncomingRequests((previous) => previous.filter((request) => request.id !== friend.id))
      setOutgoingRequests((previous) => previous.filter((request) => request.id !== friend.id))
      setRewindFeed((previous) => previous.filter((clip) => clip.userId !== friend.id))
      setMultiRewinds((previous) =>
        previous.filter(
          (rewind) =>
            !rewind.participants.some((participant) => participant.ownerId === friend.id),
        ),
      )
      await Promise.all([loadFriends(), loadFriendRequests()])
    } catch (error) {
      console.error(error)
      setFriendError(`Could not remove ${friend.username}.`)
    } finally {
      setFriendActionLoadingId(null)
    }
  }

  const isAlreadyFriend = (friendId: string) =>
    friends.some((friend) => friend.id === friendId)
  const isOutgoingRequest = (friendId: string) =>
    outgoingRequests.some((friend) => friend.id === friendId)
  const isIncomingRequest = (friendId: string) =>
    incomingRequests.some((friend) => friend.id === friendId)

  const openComposer = () => {
    setSelectedComposerDayId(ownRewinds[0]?.id ?? null)
    setSelectedMultiFriendIds([])
    setSelectedMusicId((previous) => previous ?? songs[0]?.id ?? null)
    setComposerError(null)
    setIsComposerOpen(true)
  }

  const closeComposer = () => {
    setIsComposerOpen(false)
    setSelectedComposerDayId(null)
    setSelectedMultiFriendIds([])
    setSelectedMusicId(null)
    setComposerError(null)
  }

  const handleComposerDayChange = (rewindId: string) => {
    setSelectedComposerDayId(rewindId)
    setSelectedMultiFriendIds([])
    setComposerError(null)
  }

  const toggleMultiFriend = (friendId: string) => {
    setSelectedMultiFriendIds((previous) => {
      if (previous.includes(friendId)) {
        return previous.filter((existingId) => existingId !== friendId)
      }

      if (previous.length >= 4) {
        return previous
      }

      return [...previous, friendId]
    })
  }

  const handleCreateMultiRewind = () => {
    if (!selectedDay) {
      setComposerError('You need at least one personal rewind day first.')
      return
    }

    if (selectedMultiFriendIds.length === 0) {
      setComposerError('Pick at least one friend to create a Multi-Rewind.')
      return
    }

    if (!selectedMusicId) {
      setComposerError('Pick a song for the Multi-Rewind.')
      return
    }

    const selectedFriends = composerFriendOptions.filter((entry) =>
      selectedMultiFriendIds.includes(entry.friend.id),
    )
    if (selectedFriends.length === 0) {
      setComposerError('Selected friends were not found.')
      return
    }

    const participantRewinds = [
      {
        ownerId: selectedDay.ownerId,
        ownerName: selectedDay.ownerName,
        clips: selectedDay.clips,
      },
      ...selectedFriends.map((entry) => ({
        ownerId: entry.rewind.ownerId,
        ownerName: entry.rewind.ownerName,
        clips: entry.rewind.clips,
      })),
    ]

    const createdRewind: MultiRewind = {
      id: `multi-${Date.now()}`,
      title: `${profileName}'s ${selectedDay.title
        .replace(`${selectedDay.ownerName}'s `, '')
        .replace('Rewind', 'Multi-Rewind')}`,
      dateIsoString: selectedDay.dateIsoString,
      participants: participantRewinds,
      createdBy: 'You',
      videoFilename: null,
      musicId: selectedMusicId,
    }

    setMultiRewinds((previous) => [createdRewind, ...previous])
    setActiveTab('multi')
    closeComposer()
  }

  const openMultiRewind = async (rewind: MultiRewind) => {
    setMultiGenerateError(null)
    setActiveMultiRewindId(rewind.id)

    if (rewind.videoFilename || generatingMultiId === rewind.id) {
      return
    }

    setGeneratingMultiId(rewind.id)

    try {
      const video = await api.generateMashup(rewind.dateIsoString, {
        userId: rewind.participants[0]?.ownerId ?? '',
        musicId: rewind.musicId ?? undefined,
        friendsIds: rewind.participants.slice(1).map((participant) => participant.ownerId),
      })
      setMultiRewinds((previous) =>
        previous.map((existingRewind) =>
          existingRewind.id === rewind.id ? { ...existingRewind, videoFilename: video.filename } : existingRewind,
        ),
      )
    } catch (error) {
      console.error(error)
      setMultiGenerateError('Could not generate this Multi-Rewind.')
    } finally {
      setGeneratingMultiId(null)
    }
  }

  const closeMultiRewind = () => {
    setActiveMultiRewindId(null)
    setMultiGenerateError(null)
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
        <section className="rewinds-screen">
          <section className="rewinds-profile-panel">
            <RewindsHeader />

            <ProfileBanner
              profileName={profileName}
              friendCount={friends.length}
              ownRewindCount={ownRewinds.length}
              onOpenFriends={() => setIsFriendsModalOpen(true)}
            />
          </section>

          <RewindsFab onOpenComposer={openComposer} />

          <section className="rewinds-panel">
            <RewindsFilterBar
              activeTab={activeTab}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onTabChange={setActiveTab}
            />

            {activeTab === 'rewinds' ? (
              <DailyRewindsList
                rewinds={filteredRewinds}
                rewindsError={rewindsError}
                rewindsLoading={rewindsLoading}
                onOpenRewind={(rewind) => void openRewind(rewind)}
              />
            ) : (
              <MultiRewindsList
                rewinds={filteredMultiRewinds}
                onOpenMultiRewind={(rewind) => void openMultiRewind(rewind)}
              />
            )}
          </section>
        </section>
      </main>

      <PageTransitionOverlay active={isTransitionLoading} />

      {activeRewind ? (
        <RewindPlayerModal
          rewind={activeRewind}
          videoUrl={generatedRewindUrls[activeRewind.id]}
          isGenerating={generatingRewindId === activeRewind.id}
          generateError={rewindGenerateError}
          onClose={closeRewind}
        />
      ) : null}

      {activeMultiRewind ? (
        <MultiRewindPlayerModal
          rewind={activeMultiRewind}
          isGenerating={generatingMultiId === activeMultiRewind.id}
          generateError={multiGenerateError}
          onClose={closeMultiRewind}
        />
      ) : null}

      {isFriendsModalOpen ? (
        <div
          className="composer-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="friends-modal-title"
        >
          <div className="friends-modal">
            <div className="friends-modal__titlebar">
              <h2 id="friends-modal-title">Friends</h2>
              <div className="window-actions">
                <span className="window-actions__button" aria-hidden="true">
                  {'\u2500'}
                </span>
                <span className="window-actions__button" aria-hidden="true">
                  {'\u25a1'}
                </span>
                <button
                  aria-label="Close friends"
                  className="window-actions__button window-actions__button--close friends-modal__close"
                  type="button"
                  onClick={() => setIsFriendsModalOpen(false)}
                >
                  {'\u2716'}
                </button>
              </div>
            </div>

            <FriendsPanel
              friendActionLoadingId={friendActionLoadingId}
              friendError={friendError}
              friendQuery={friendQuery}
              friendResults={friendResults}
              friendSearchLoading={friendSearchLoading}
              friendRequestsLoading={friendRequestsLoading}
              friends={friends}
              friendsLoading={friendsLoading}
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              isAlreadyFriend={isAlreadyFriend}
              isIncomingRequest={isIncomingRequest}
              isOutgoingRequest={isOutgoingRequest}
              onTabChange={() => {
                void loadFriends()
                void loadFriendRequests()
              }}
              onAddFriend={handleAddFriend}
              onAcceptFriend={handleAcceptFriend}
              onFriendQueryChange={setFriendQuery}
              onRemoveFriend={handleRemoveFriend}
            />
          </div>
        </div>
      ) : null}

      {isComposerOpen ? (
        <MultiRewindComposerModal
          composerError={composerError}
          composerFriendOptions={composerFriendOptions}
          friends={friends}
          ownRewinds={ownRewinds}
          songs={songs}
          songsError={songsError}
          songsLoading={songsLoading}
          selectedComposerDay={selectedDay}
          selectedMultiFriendIds={selectedMultiFriendIds}
          selectedMusicId={selectedMusicId}
          onClose={closeComposer}
          onComposerDayChange={handleComposerDayChange}
          onCreate={handleCreateMultiRewind}
          onSelectMusic={setSelectedMusicId}
          onToggleFriend={toggleMultiFriend}
        />
      ) : null}
    </>
  )
}
