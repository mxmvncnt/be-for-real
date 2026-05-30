import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function HomePage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const token = await api.login({ email, password })
      window.localStorage.setItem('bfr.token', token)
      window.localStorage.setItem('bfr.email', email)
      navigate('/camera')
    } catch (requestError) {
      console.error(requestError)
      setError('Login failed. Double-check your email and password.')
    } finally {
      setSubmitting(false)
    }
  }

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

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="auth-message auth-message--error">{error}</p> : null}

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-helper-link">
          Ready to test the main feature? <Link to="/camera">Open Camera</Link>
        </p>

        <p className="auth-switch">
          Don&apos;t have an account ? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </section>
  )
}
