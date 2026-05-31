import type { Friend, Song } from '../../../lib/api'
import type { DailyRewind } from '../types'

type ComposerFriendOption = {
  friend: Friend
  rewind: DailyRewind
}

type MultiRewindComposerModalProps = {
  ownRewinds: DailyRewind[]
  selectedComposerDay: DailyRewind | null
  composerFriendOptions: ComposerFriendOption[]
  friends: Friend[]
  songs: Song[]
  songsLoading: boolean
  songsError: string | null
  selectedMultiFriendIds: string[]
  selectedMusicId: string | null
  composerError: string | null
  onClose: () => void
  onComposerDayChange: (rewindId: string) => void
  onToggleFriend: (friendId: string) => void
  onCreate: () => void
  onSelectMusic: (musicId: string | null) => void
}

export function MultiRewindComposerModal({
  ownRewinds,
  selectedComposerDay,
  composerFriendOptions,
  friends,
  songs,
  songsLoading,
  songsError,
  selectedMultiFriendIds,
  selectedMusicId,
  composerError,
  onClose,
  onComposerDayChange,
  onToggleFriend,
  onCreate,
  onSelectMusic,
}: MultiRewindComposerModalProps) {
  return (
    <div className="composer-overlay" role="dialog" aria-modal="true" aria-labelledby="composer-title">
      <div className="composer-modal">
        <div className="composer-modal__header">
          <h2 id="composer-title">Create a Multi-Rewind</h2>
          <button className="composer-close" type="button" onClick={onClose}>
            X
          </button>
        </div>

        <div className="composer-step">
          <h3>Pick up to 4 friends</h3>
          <p>
            First choose one of your rewind days, then pick friends who also recorded that same day.
          </p>
          {ownRewinds.length > 0 ? (
            <div className="composer-day-list">
              {ownRewinds.map((rewind) => (
                <button
                  key={rewind.id}
                  className={`composer-day ${selectedComposerDay?.id === rewind.id ? 'composer-day--active' : ''}`}
                  type="button"
                  onClick={() => onComposerDayChange(rewind.id)}
                >
                  {rewind.title}
                </button>
              ))}
            </div>
          ) : (
            <p className="friends-panel__message">
              Record your own daily rewind first before creating a Multi-Rewind.
            </p>
          )}
        </div>

        <div className="composer-step">
          <h3>Pick up to 4 friends</h3>
          <p>The result uses equal-size panels for everyone, including you.</p>
          <div className="composer-friend-list">
            {selectedComposerDay && composerFriendOptions.length === 0 ? (
              <p className="friends-panel__message">None of your friends recorded on that day yet.</p>
            ) : friends.length === 0 ? (
              <p className="friends-panel__message">Add friends first to create a Multi-Rewind.</p>
            ) : (
              composerFriendOptions.map(({ friend, rewind }) => (
                <label key={friend.id} className="composer-friend">
                  <input
                    checked={selectedMultiFriendIds.includes(friend.id)}
                    disabled={
                      !selectedMultiFriendIds.includes(friend.id) &&
                      selectedMultiFriendIds.length >= 4
                    }
                    type="checkbox"
                    onChange={() => onToggleFriend(friend.id)}
                  />
                  <span>{friend.username}</span>
                  <em>{rewind.title}</em>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="composer-step">
          <h3>Pick a song</h3>
          <p>Choose which track will drive the mashup.</p>
          {songsLoading ? (
            <p className="friends-panel__message">Loading songs...</p>
          ) : songsError ? (
            <p className="friends-panel__message">{songsError}</p>
          ) : songs.length === 0 ? (
            <p className="friends-panel__message">No songs available yet.</p>
          ) : (
            <label className="composer-song">
              <span>Song</span>
              <select
                value={selectedMusicId ?? ''}
                onChange={(event) => onSelectMusic(event.target.value || null)}
              >
                {songs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {composerError ? <p className="friends-panel__message">{composerError}</p> : null}

        <div className="composer-summary">
          <strong>Preview:</strong>
          <span>
            {selectedMultiFriendIds.length > 0
              ? [
                  'You',
                  ...composerFriendOptions
                    .filter(({ friend }) => selectedMultiFriendIds.includes(friend.id))
                    .map(({ friend }) => friend.username),
                ].join(', ')
              : 'Choose a day and at least one friend to continue'}
          </span>
        </div>

        <div className="composer-actions">
          <button className="composer-button composer-button--ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="composer-button composer-button--primary"
            disabled={selectedMultiFriendIds.length === 0 || !selectedMusicId}
            type="button"
            onClick={onCreate}
          >
            Create Multi-Rewind
          </button>
        </div>
      </div>
    </div>
  )
}
