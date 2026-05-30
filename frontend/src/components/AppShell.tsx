import { Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="auth-shell">
      <div className="auth-shell__sunburst" />
      <div className="auth-shell__rainbow" />
      <div className="auth-shell__waterline" />

      <div className="bubble bubble--one" />
      <div className="bubble bubble--two" />
      <div className="bubble bubble--three" />
      <div className="bubble bubble--four" />
      <div className="bubble bubble--five" />
      <div className="bubble bubble--six" />
      <div className="bubble bubble--seven" />

      <header className="brand-lockup" aria-label="BFR logo">
        <span className="brand-lockup__letter">B</span>
        <span className="brand-lockup__letter">F</span>
        <span className="brand-lockup__letter">R</span>
      </header>

      <main className="auth-stage">
        <Outlet />
      </main>
    </div>
  );
}
