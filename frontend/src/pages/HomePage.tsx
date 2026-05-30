import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import wallpaper from "../assets/main_wallpaper.jpg";
import logo from "../assets/logo.png";

const TRANSITION_DURATION = 680;

export function HomePage() {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate("/camera");
  };

  const goToSignup = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (transitioning) return;
    setTransitioning(true);
    timeoutRef.current = window.setTimeout(
      () => navigate("/signup"),
      TRANSITION_DURATION,
    );
  };

  return (
    <main
      className="home-background"
      style={{
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
      }}
    >
      <div
        className={`page-transition-overlay${transitioning ? " is-active" : ""}`}
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} className="bubble" />
        ))}
      </div>

      <div className="profile-hero">
        <img src={logo} alt="Be For Real" className="home-logo" />
      </div>

      <section
        className="auth-window auth-window--home"
        aria-labelledby="login-title"
      >
        <div className="auth-window__titlebar">
          <h1 id="login-title">Login</h1>
          <div className="window-actions" aria-hidden="true">
            <span className="window-actions__button">–</span>
            <span className="window-actions__button">□</span>
            <span className="window-actions__button window-actions__button--close">
              ×
            </span>
          </div>
        </div>

        <div className="auth-window__body">
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input type="text" placeholder="example@hotmail.com" />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input type="password" />
            </label>
            <button className="auth-submit" type="submit">
              Login
            </button>
          </form>
          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/signup" onClick={goToSignup}>
              Sign up
            </Link>
          </p>
        </div>
      </section>

      <footer className="auth-footer">Made by Team Potate</footer>
    </main>
  );
}
