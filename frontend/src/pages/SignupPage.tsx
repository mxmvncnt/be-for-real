import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import wallpaper from '../assets/main_wallpaper.jpg'
import logo from '../assets/logo.png'

const TRANSITION_DURATION = 680

export function SignupPage() {
  const navigate = useNavigate()
  const timeoutRef = useRef<number | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

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

  const goToLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (transitioning) {
      return
    }

    setTransitioning(true)
    timeoutRef.current = window.setTimeout(() => navigate('/'), TRANSITION_DURATION)
  }

  return (
    <main
      className="home-background"
      style={{
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
      }}
    >
      <div className={`page-transition-overlay${transitioning ? ' is-active' : ''}`}>
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} className="bubble" />
        ))}
      </div>

      <div className="profile-hero profile-hero--small">
        <img src={logo} alt="Be For Real" className="home-logo home-logo--small" />
      </div>

      <section className="auth-window auth-window--signup" aria-labelledby="signup-title">
        <div className="auth-window__titlebar">
          <h1 id="signup-title">Sign Up</h1>
          <div className="window-actions" aria-hidden="true">
            <span className="window-actions__button">_</span>
            <span className="window-actions__button">[]</span>
            <span className="window-actions__button window-actions__button--close">X</span>
          </div>
        </div>

        <div className="auth-window__body">
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
            Already have an account?{' '}
            <Link to="/" onClick={goToLogin}>
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
