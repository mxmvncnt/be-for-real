import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function SignupPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await api.register({ username, email, password })
      const token = await api.login({ email, password })
      window.localStorage.setItem('bfr.token', token)
      window.localStorage.setItem('bfr.email', email)
      window.localStorage.setItem('bfr.username', username)
      navigate('/camera')
    } catch (requestError) {
      console.error(requestError)
      setError('Signup failed. Try a different email or username.')
    } finally {
      setSubmitting(false)
    }
  }

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

        <form className="auth-form auth-form--signup" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Username</span>
            <input
              required
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

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

          <label className="auth-field">
            <span>Confirm Password</span>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          {error ? <p className="auth-message auth-message--error">{error}</p> : null}

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account ? <Link to="/">Login</Link>
        </p>
      </div>
    </section>
  )
}
