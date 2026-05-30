import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__badge">PWA Base</div>
        <h1>Be For Real</h1>
        <p>
          A ready-to-grow React frontend with a clean API layer, installable app setup,
          and a backend we can evolve feature by feature.
        </p>
        <nav className="hero__nav" aria-label="Primary">
          <NavLink className="hero__link" to="/">
            Dashboard
          </NavLink>
        </nav>
      </header>

      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
