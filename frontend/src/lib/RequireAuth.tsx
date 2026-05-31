import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { api } from "./api";

export default function RequireAuth() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem("bfr.token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    let mounted = true;
    api
      .getCurrentUser()
      .then(() => {
        if (mounted) setChecking(false);
      })
      .catch(() => {
        window.localStorage.removeItem("bfr.token");
        navigate("/", { replace: true });
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checking) return null;
  return <Outlet />;
}
