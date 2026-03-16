import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "./UserContext";

const AUTH_URL = (import.meta as any).env?.VITE_AUTH_URL || "http://localhost:5172";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, loading, hasChecked } = useUser() as any;

  useEffect(() => {
    if (loading || !hasChecked) return;
    if (user) return;
    const returnTo = window.location.href;
    window.location.href = `${AUTH_URL}/login?app=invoice&return=${encodeURIComponent(returnTo)}`;
  }, [loading, hasChecked, user, location]);

  if (loading || !hasChecked) return <div className="p-6">Checking login…</div>;
  if (!user) return <div className="p-6">Redirecting to login…</div>;
  return <>{children}</>;
}
