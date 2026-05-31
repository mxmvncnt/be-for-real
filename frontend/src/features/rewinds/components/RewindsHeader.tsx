import { Link } from 'react-router-dom'

export function RewindsHeader() {
  return (
    <header className="rewinds-topbar">
      <h1>My profile</h1>

      <div className="window-actions">
        <span className="window-actions__button" aria-hidden="true">
          -
        </span>
        <span className="window-actions__button" aria-hidden="true">
          []
        </span>
        <Link
          aria-label="Disconnect and return to login"
          className="window-actions__button window-actions__button--close rewinds-logout"
          to="/"
          onClick={() => {
            window.localStorage.removeItem('bfr.token')
            window.localStorage.removeItem('bfr.email')
            window.localStorage.removeItem('bfr.username')
          }}
        >
          Off
        </Link>
      </div>
    </header>
  )
}
