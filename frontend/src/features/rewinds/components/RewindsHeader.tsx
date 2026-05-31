import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

export function RewindsHeader() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error(error);
    } finally {
      window.localStorage.removeItem("bfr.token");
      window.localStorage.removeItem("bfr.email");
      window.localStorage.removeItem("bfr.username");
      navigate("/");
    }
  };
  return (
    <header className="rewinds-topbar">
      <h1>My profile</h1>

      <div className="window-actions">
        <span className="window-actions__button" aria-hidden="true">
          -
        </span>
        <span className="window-actions__button" aria-hidden="true">
          □
        </span>
        <button
          type="button"
          aria-label="Disconnect and return to login"
          className="window-actions__button window-actions__button--close rewinds-logout"
          onClick={handleLogout}
        >
          Off
        </button>
      </div>
    </header>
  );
}
