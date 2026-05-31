import { useState } from 'react'
import addFriendsTab from '../../../assets/friends-tab-add.svg'
import friendsTab from '../../../assets/friends-tab-friends.svg'
import type { Friend } from '../../../lib/api'

type FriendsPanelProps = {
  friendQuery: string
  friendSearchLoading: boolean
  friendError: string | null
  friendsLoading: boolean
  friendRequestsLoading: boolean
  friends: Friend[]
  incomingRequests: Friend[]
  outgoingRequests: Friend[]
  friendResults: Friend[]
  friendActionLoadingId: string | null
  onFriendQueryChange: (value: string) => void
  onTabChange: (tab: 'friends' | 'add') => void
  onAddFriend: (friend: Friend) => void
  onAcceptFriend: (friend: Friend) => void
  onRemoveFriend: (friend: Friend) => void
  isAlreadyFriend: (friendId: string) => boolean
  isOutgoingRequest: (friendId: string) => boolean
  isIncomingRequest: (friendId: string) => boolean
}

export function FriendsPanel({
  friendQuery,
  friendSearchLoading,
  friendError,
  friendsLoading,
  friendRequestsLoading,
  friends,
  incomingRequests,
  outgoingRequests,
  friendResults,
  friendActionLoadingId,
  onFriendQueryChange,
  onTabChange,
  onAddFriend,
  onAcceptFriend,
  onRemoveFriend,
  isAlreadyFriend,
  isOutgoingRequest,
  isIncomingRequest,
}: FriendsPanelProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'add'>('friends')

  const switchTab = (tab: 'friends' | 'add') => {
    if (tab === activeTab) {
      return
    }
    setActiveTab(tab)
    onTabChange(tab)
  }

  const renderActionButtons = (friend: Friend) => {
    if (isIncomingRequest(friend.id)) {
      return (
        <div className="friends-panel__actions">
          <button
            className="icon-button"
            disabled={friendActionLoadingId === friend.id}
            type="button"
            onClick={() => onAcceptFriend(friend)}
            aria-label="Accept friend"
          >
            <img src="/button-yes.svg" alt="Accept friend" />
          </button>
          <button
            className="icon-button"
            disabled={friendActionLoadingId === friend.id}
            type="button"
            onClick={() => onRemoveFriend(friend)}
            aria-label="Refuse friend"
          >
            <img src="/button-no.svg" alt="Refuse friend" />
          </button>
        </div>
      )
    }

    if (isOutgoingRequest(friend.id)) {
      return (
        <button
          className="icon-button"
          disabled={friendActionLoadingId === friend.id}
          type="button"
          onClick={() => onRemoveFriend(friend)}
          aria-label="Cancel friend request"
        >
          <img src="/button-no.svg" alt="Cancel friend request" />
        </button>
      )
    }

    if (isAlreadyFriend(friend.id)) {
      return (
        <button className="icon-button" disabled type="button" aria-label="Friend">
          <img src="/button-yes.svg" alt="Friend" />
        </button>
      )
    }

    return (
      <button
        className="icon-button"
        disabled={friendActionLoadingId === friend.id}
        type="button"
        onClick={() => onAddFriend(friend)}
        aria-label="Add friend"
      >
        <img src="/button-plus.svg" alt="Add friend" />
      </button>
    )
  }

  return (
    <section className="friends-panel" aria-labelledby="friends-title">
      <div className="friends-panel__header">
        <h3 id="friends-title">Friends</h3>
        <span>Requests, friends, and invites</span>
      </div>

      <div className="friends-panel__tabs" role="tablist" aria-label="Friends tabs">
        <button
          className={`friends-panel__tab${activeTab === 'friends' ? ' is-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'friends'}
          onClick={() => switchTab('friends')}
        >
          <img src={friendsTab} alt="Friends" />
        </button>
        <button
          className={`friends-panel__tab${activeTab === 'add' ? ' is-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'add'}
          onClick={() => switchTab('add')}
        >
          <img src={addFriendsTab} alt="Add friends" />
        </button>
      </div>

      {friendError ? <p className="friends-panel__message">{friendError}</p> : null}

      {activeTab === 'friends' ? (
        <div className="friends-panel__sections">
          <div className="friends-panel__section">
            <h4>Requests received</h4>
            {friendRequestsLoading ? (
              <p className="friends-panel__message">Loading requests...</p>
            ) : incomingRequests.length === 0 ? (
              <p className="friends-panel__message">No incoming requests.</p>
            ) : (
              <div className="friend-list">
                {incomingRequests.map((friend) => (
                  <article key={friend.id} className="friend-card">
                    <div>
                      <strong>{friend.username}</strong>
                      <span>{friend.email}</span>
                    </div>
                    <div className="friends-panel__actions">
                      <button
                        className="icon-button"
                        disabled={friendActionLoadingId === friend.id}
                        type="button"
                        onClick={() => onAcceptFriend(friend)}
                        aria-label="Accept friend"
                      >
                        <img src="/button-yes.svg" alt="Accept friend" />
                      </button>
                      <button
                        className="icon-button"
                        disabled={friendActionLoadingId === friend.id}
                        type="button"
                        onClick={() => onRemoveFriend(friend)}
                        aria-label="Refuse friend"
                      >
                        <img src="/button-no.svg" alt="Refuse friend" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="friends-panel__section">
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
                      className="icon-button"
                      disabled={friendActionLoadingId === friend.id}
                      type="button"
                      onClick={() => onRemoveFriend(friend)}
                      aria-label="Remove friend"
                    >
                      <img src="/button-no.svg" alt="Remove friend" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="friends-panel__sections">
          <div className="friends-panel__section">
            <div className="friends-panel__search">
              <input
                placeholder="Search by username or email"
                type="text"
                value={friendQuery}
                onChange={(event) => onFriendQueryChange(event.target.value)}
              />
            </div>
            {friendSearchLoading ? (
              <p className="friends-panel__message">Searching...</p>
            ) : friendQuery.trim().length === 0 ? (
              <p className="friends-panel__message">Type to search people.</p>
            ) : friendResults.length === 0 ? (
              <p className="friends-panel__message">No matches yet.</p>
            ) : (
              <div className="friend-list">
                {friendResults.map((friend) => (
                  <article key={friend.id} className="friend-card">
                    <div>
                      <strong>{friend.username}</strong>
                      <span>{friend.email}</span>
                    </div>
                    {renderActionButtons(friend)}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
