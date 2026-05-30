import { MouseEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import wallpaper from "../assets/main_wallpaper.jpg";
import logo from "../assets/logo.png";

const TRANSITION_DURATION = 680;

export function SignupPage() {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const goToLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (transitioning) return;
    setTransitioning(true);
    timeoutRef.current = window.setTimeout(
      () => navigate("/"),
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

      <div className="profile-hero profile-hero--small">
        <img
          src={logo}
          alt="Be For Real"
          className="home-logo home-logo--small"
        />
      </div>

      <section
        className="auth-window auth-window--signup"
        aria-labelledby="signup-title"
      >
        <div className="auth-window__titlebar">
          <h1 id="signup-title">Sign Up</h1>
          <div className="window-actions" aria-hidden="true">
            <span className="window-actions__button">_</span>
            <span className="window-actions__button">□</span>
            <span className="window-actions__button window-actions__button--close">
              ×
            </span>
          </div>
        </div>

        <div className="auth-window__body">
          <form className="auth-form auth-form--signup">
            <label className="auth-field">
              <span>Username</span>
              <input type="text" placeholder="Your username" />
            </label>
            <label className="auth-field">
              <span>Email</span>
              <input type="text" placeholder="example@hotmail.com" />
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
            Already have an account?{" "}
            <Link to="/" onClick={goToLogin}>
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
