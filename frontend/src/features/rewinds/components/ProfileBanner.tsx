import pfp from '../../../assets/pfp.png'

type ProfileBannerProps = {
  profileName: string
  friendCount: number
  ownRewindCount: number
  onOpenFriends: () => void
}

export function ProfileBanner({
  profileName,
  friendCount,
  ownRewindCount,
  onOpenFriends,
}: ProfileBannerProps) {
  return (
    <section className="profile-banner">
      <img src={pfp} alt="" className="profile-banner__avatar" aria-hidden="true" />

      <div className="profile-banner__meta">
        <h2>{profileName}</h2>
        <p>
          {friendCount} friend{friendCount === 1 ? '' : 's'} connected
        </p>
        <p>{ownRewindCount} personal rewinds</p>
      </div>

      <button className="profile-banner__friends-button" type="button" onClick={onOpenFriends}>
        Friends
      </button>
    </section>
  )
}
