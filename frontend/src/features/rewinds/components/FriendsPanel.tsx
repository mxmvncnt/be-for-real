import type { Friend } from '../../../lib/api'

type FriendsPanelProps = {
  friendQuery: string
  friendSearchLoading: boolean
  friendError: string | null
  friendsLoading: boolean
  friends: Friend[]
  friendResults: Friend[]
  friendActionLoadingId: string | null
  onFriendQueryChange: (value: string) => void
  onFriendSearch: () => void
  onAddFriend: (friend: Friend) => void
  onRemoveFriend: (friend: Friend) => void
  isAlreadyFriend: (friendId: string) => boolean
}

export function FriendsPanel({
  friendQuery,
  friendSearchLoading,
  friendError,
  friendsLoading,
  friends,
  friendResults,
  friendActionLoadingId,
  onFriendQueryChange,
  onFriendSearch,
  onAddFriend,
  onRemoveFriend,
  isAlreadyFriend,
}: FriendsPanelProps) {
  return (
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
          onChange={(event) => onFriendQueryChange(event.target.value)}
        />
        <button type="button" onClick={onFriendSearch}>
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
                    onClick={() => onRemoveFriend(friend)}
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
                    disabled={
                      friendActionLoadingId === friend.id || isAlreadyFriend(friend.id)
                    }
                    type="button"
                    onClick={() => onAddFriend(friend)}
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
  )
}
