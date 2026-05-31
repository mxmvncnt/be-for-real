import { Link } from 'react-router-dom'

export function CameraHeader() {
  return (
    <header className="camera-screen__header rewinds-topbar">
      <h1 id="camera-title">BFRL CAM</h1>

      <div className="window-actions">
        <span className="window-actions__button" aria-hidden="true">
          -
        </span>
        <span className="window-actions__button" aria-hidden="true">
          □
        </span>
        <Link
          aria-label="Close camera and return to rewinds"
          className="window-actions__button window-actions__button--close"
          to="/rewinds"
        >
          ✖
        </Link>
      </div>
    </header>
  )
}
