import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section className="auth-window" aria-labelledby="login-title">
      <div className="auth-window__titlebar">
        <h1 id="login-title">Login</h1>

        <div className="window-actions" aria-hidden="true">
          <span className="window-actions__button">_</span>
          <span className="window-actions__button">□</span>
          <span className="window-actions__button window-actions__button--close">×</span>
        </div>
      </div>

      <div className="auth-window__body">
        <div className="profile-hero">
          <div className="profile-hero__avatar">
            <div className="profile-hero__avatar-head" />
            <div className="profile-hero__avatar-body" />
          </div>
        </div>

        <form className="auth-form">
          <label className="auth-field">
            <span>Username</span>
            <input type="text" defaultValue="ALEXMARILYNMAXIMETIMO123" />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input type="password" defaultValue="passwordpassword" />
          </label>

          <button className="auth-submit" type="submit">
            Login
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account ? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </section>
  )
}
