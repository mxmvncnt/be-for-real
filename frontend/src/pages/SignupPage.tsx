import { Link } from 'react-router-dom'

export function SignupPage() {
  return (
    <section className="auth-window" aria-labelledby="signup-title">
      <div className="auth-window__titlebar">
        <h1 id="signup-title">Sign Up</h1>

        <div className="window-actions" aria-hidden="true">
          <span className="window-actions__button">_</span>
          <span className="window-actions__button">□</span>
          <span className="window-actions__button window-actions__button--close">×</span>
        </div>
      </div>

      <div className="auth-window__body">
        <div className="profile-hero profile-hero--small">
          <div className="profile-hero__avatar">
            <div className="profile-hero__avatar-head" />
            <div className="profile-hero__avatar-body" />
          </div>
        </div>

        <form className="auth-form auth-form--signup">
          <label className="auth-field">
            <span>Username</span>
            <input type="text" />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input type="password" />
          </label>

          <label className="auth-field">
            <span>Confirm Password</span>
            <input type="password" />
          </label>

          <button className="auth-submit" type="submit">
            Sign up
          </button>
        </form>

        <p className="auth-switch">
          Already have an account ? <Link to="/">Login</Link>
        </p>
      </div>
    </section>
  )
}
