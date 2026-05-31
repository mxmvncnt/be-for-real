import { Link } from 'react-router-dom'

export function CameraHeader() {
  return (
    <div className="camera-screen__header">
      <h1 id="camera-title">BFR Cam</h1>

      <div className="window-actions" aria-hidden="true">
        <span className="window-actions__button">─</span>
        <span className="window-actions__button">□</span>
        <Link className="window-actions__button window-actions__button--close" to="/rewinds">
          Back
        </Link>
      </div>
    </div>
  )
}
