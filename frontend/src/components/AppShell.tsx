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

      <main className="auth-stage">
        <Outlet />
      </main>
    </div>
  );
}
