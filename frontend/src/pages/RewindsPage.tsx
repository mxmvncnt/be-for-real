import { useEffect, useMemo, useRef, useState } from 'react'
import { PageTransitionOverlay } from '../components/PageTransitionOverlay'
import wallpaper from '../assets/background_rewind.png'
import { api, type CurrentUser, type Friend, type RewindVideo } from '../lib/api'
import { compileDailyRewindVideo, compileMultiRewindVideo } from '../lib/rewindCompiler'
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
  const [friendResults, setFriendResults] = useState<Friend[]>([])
  const [rewindFeed, setRewindFeed] = useState<RewindVideo[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [rewindsLoading, setRewindsLoading] = useState(true)
  const [friendSearchLoading, setFriendSearchLoading] = useState(false)
  const [friendActionLoadingId, setFriendActionLoadingId] = useState<string | null>(null)
  const [friendError, setFriendError] = useState<string | null>(null)
  const [rewindsError, setRewindsError] = useState<string | null>(null)
  const [multiRewinds, setMultiRewinds] = useState<MultiRewind[]>([])
  const [activeRewind, setActiveRewind] = useState<DailyRewind | null>(null)
  const [compiledRewindUrls, setCompiledRewindUrls] = useState<Record<string, string>>({})
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [selectedComposerDayId, setSelectedComposerDayId] = useState<string | null>(null)
  const [selectedMultiFriendIds, setSelectedMultiFriendIds] = useState<string[]>([])
  const [composerError, setComposerError] = useState<string | null>(null)
  const [activeMultiRewindId, setActiveMultiRewindId] = useState<string | null>(null)
  const [rewindRenderError, setRewindRenderError] = useState<string | null>(null)
  const [renderingRewindId, setRenderingRewindId] = useState<string | null>(null)
  const [multiRenderError, setMultiRenderError] = useState<string | null>(null)
  const [renderingMultiId, setRenderingMultiId] = useState<string | null>(null)
  const [multiUploadError, setMultiUploadError] = useState<string | null>(null)
  const generatedUrlsRef = useRef<string[]>([])

  useEffect(() => {
    return () => {
      for (const url of generatedUrlsRef.current) {
        URL.revokeObjectURL(url)
      }
    }
  }, [])

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
  const isTransitionLoading = Boolean(renderingRewindId || renderingMultiId)
  const profileName = currentUser?.username ?? window.localStorage.getItem('bfr.username') ?? 'User'

  const openRewind = async (rewind: DailyRewind) => {
    setRewindRenderError(null)
    setActiveRewind(rewind)

    if (compiledRewindUrls[rewind.id] || renderingRewindId === rewind.id) {
      return
    }

    setRenderingRewindId(rewind.id)

    try {
      const videoUrl = await compileDailyRewindVideo(rewind.clips)
      generatedUrlsRef.current.push(videoUrl)
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
        return [...previous, friend].sort((left, right) =>
          left.username.localeCompare(right.username),
        )
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
          (rewind) =>
            !rewind.participants.some((participant) => participant.ownerId === friend.id),
        ),
      )
    } catch (error) {
      console.error(error)
      setFriendError(`Could not remove ${friend.username}.`)
    } finally {
      setFriendActionLoadingId(null)
    }
  }

  const isAlreadyFriend = (friendId: string) =>
    friends.some((friend) => friend.id === friendId)

  const openComposer = () => {
    setSelectedComposerDayId(ownRewinds[0]?.id ?? null)
    setSelectedMultiFriendIds([])
    setComposerError(null)
    setIsComposerOpen(true)
  }

  const closeComposer = () => {
    setIsComposerOpen(false)
    setSelectedComposerDayId(null)
    setSelectedMultiFriendIds([])
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

      if (previous.length >= 5) {
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
      videoUrl: null,
    }

    setMultiRewinds((previous) => [createdRewind, ...previous])
    setActiveTab('multi')
    closeComposer()
  }

  const openMultiRewind = async (rewind: MultiRewind) => {
    setMultiRenderError(null)
    setMultiUploadError(null)
    setActiveMultiRewindId(rewind.id)

    if (rewind.videoUrl || renderingMultiId === rewind.id) {
      return
    }

    setRenderingMultiId(rewind.id)

    try {
      const videoUrl = await compileMultiRewindVideo(rewind.participants)
      generatedUrlsRef.current.push(videoUrl)
      setMultiRewinds((previous) =>
        previous.map((existingRewind) =>
          existingRewind.id === rewind.id ? { ...existingRewind, videoUrl } : existingRewind,
        ),
      )

      try {
        const compiledBlob = await blobFromObjectUrl(videoUrl)
        await api.uploadMashup(compiledBlob, new Date().toISOString())
      } catch (uploadError) {
        console.error(uploadError)
        setMultiUploadError('Multi-Rewind rendered locally, but backend upload is not ready yet.')
      }
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
    setMultiUploadError(null)
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

        <RewindsFab onOpenComposer={openComposer} />
      </main>

      <PageTransitionOverlay active={isTransitionLoading} />

      {activeRewind ? (
        <RewindPlayerModal
          rewind={activeRewind}
          compiledVideoUrl={compiledRewindUrls[activeRewind.id]}
          isRendering={renderingRewindId === activeRewind.id}
          renderError={rewindRenderError}
          onClose={closeRewind}
        />
      ) : null}

      {activeMultiRewind ? (
        <MultiRewindPlayerModal
          rewind={activeMultiRewind}
          isRendering={renderingMultiId === activeMultiRewind.id}
          renderError={multiRenderError ?? multiUploadError}
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
                  -
                </span>
                <span className="window-actions__button" aria-hidden="true">
                  □
                </span>
                <button
                  aria-label="Close friends"
                  className="window-actions__button window-actions__button--close friends-modal__close"
                  type="button"
                  onClick={() => setIsFriendsModalOpen(false)}
                >
                  X
                </button>
              </div>
            </div>

            <FriendsPanel
              friendActionLoadingId={friendActionLoadingId}
              friendError={friendError}
              friendQuery={friendQuery}
              friendResults={friendResults}
              friendSearchLoading={friendSearchLoading}
              friends={friends}
              friendsLoading={friendsLoading}
              isAlreadyFriend={isAlreadyFriend}
              onAddFriend={handleAddFriend}
              onFriendQueryChange={setFriendQuery}
              onFriendSearch={() => void handleFriendSearch()}
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
          selectedComposerDay={selectedDay}
          selectedMultiFriendIds={selectedMultiFriendIds}
          onClose={closeComposer}
          onComposerDayChange={handleComposerDayChange}
          onCreate={handleCreateMultiRewind}
          onToggleFriend={toggleMultiFriend}
        />
      ) : null}
    </>
  )
}

async function blobFromObjectUrl(objectUrl: string) {
  const response = await fetch(objectUrl)
  return response.blob()
}
