type ProfileBannerProps = {
  profileName: string
  profileDescription: string
  friendCount: number
  ownRewindCount: number
}

export function ProfileBanner({
  profileName,
  profileDescription,
  friendCount,
  ownRewindCount,
}: ProfileBannerProps) {
  return (
    <section className="profile-banner">
      <div className="profile-banner__avatar">
        <div className="profile-banner__avatar-head" />
        <div className="profile-banner__avatar-body" />
      </div>

      <div className="profile-banner__meta">
        <h2>{profileName}</h2>
        <p>{profileDescription}</p>
        <p>
          {friendCount} friend{friendCount === 1 ? '' : 's'} connected
        </p>
        <p>{ownRewindCount} personal rewinds</p>
      </div>
    </section>
  )
}
