import { useEffect, useState } from 'react'
import { api, type HealthResponse } from '../lib/api'

export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    api
      .health()
      .then((response) => {
        if (!cancelled) {
          setHealth(response)
        }
      })
      .catch((requestError: Error) => {
        if (!cancelled) {
          setError(requestError.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="grid">
      <article className="panel panel--accent">
        <span className="eyebrow">Foundation</span>
        <h2>Ready for frontend features and API integrations</h2>
        <p>
          This base includes routing, an API client, environment config, and PWA install support.
          Feed me the next feature and we can layer it in.
        </p>
      </article>

      <article className="panel">
        <span className="eyebrow">Backend check</span>
        <h2>API health</h2>
        {health ? (
          <dl className="status-list">
            <div>
              <dt>Status</dt>
              <dd>Connected</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{health.service}</dd>
            </div>
            <div>
              <dt>Timestamp</dt>
              <dd>{new Date(health.timestamp).toLocaleString()}</dd>
            </div>
          </dl>
        ) : error ? (
          <p className="error">Backend unreachable: {error}</p>
        ) : (
          <p>Checking backend status...</p>
        )}
      </article>

      <article className="panel">
        <span className="eyebrow">Next</span>
        <h2>Good starting points</h2>
        <ul className="feature-list">
          <li>Auth flow and guarded routes</li>
          <li>Feature pages with real API calls</li>
          <li>External API integrations</li>
          <li>Offline caching and sync strategy</li>
        </ul>
      </article>
    </section>
  )
}
