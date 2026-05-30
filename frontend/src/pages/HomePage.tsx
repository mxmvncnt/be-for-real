import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import wallpaper from '../assets/main_wallpaper.jpg'
import logo from '../assets/logo.png'

const TRANSITION_DURATION = 680

export function HomePage() {
  const navigate = useNavigate()
  const timeoutRef = useRef<number | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const goToSignup = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (transitioning) {
      return
    }

    setTransitioning(true)
    timeoutRef.current = window.setTimeout(() => navigate('/signup'), TRANSITION_DURATION)
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

      <div className="profile-hero">
        <img src={logo} alt="Be For Real" className="home-logo" />
      </div>

      <section className="auth-window auth-window--home" aria-labelledby="login-title">
        <div className="auth-window__titlebar">
          <h1 id="login-title">Login</h1>
          <div className="window-actions" aria-hidden="true">
            <span className="window-actions__button">-</span>
            <span className="window-actions__button">[]</span>
            <span className="window-actions__button window-actions__button--close">X</span>
          </div>
        </div>

        <div className="auth-window__body">
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
            Don&apos;t have an account?{' '}
            <Link to="/signup" onClick={goToSignup}>
              Sign up
            </Link>
          </p>
        </div>
      </section>

      <footer className="auth-footer">Made by Team Potate</footer>
    </main>
  )
}
