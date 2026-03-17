import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "./UserContext";

const AUTH_URL = (import.meta as any).env?.VITE_AUTH_URL || "http://localhost:5172";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, loading, hasChecked } = useUser() as any;
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading || !hasChecked) return;
    if (user) return;
    const returnTo = window.location.href;
    setRedirecting(true);
    window.location.href = `${AUTH_URL}/login?app=invoice&return=${encodeURIComponent(returnTo)}`;
  }, [loading, hasChecked, user, location]);

  if (loading || !hasChecked || redirecting || !user) {
    return (
      <div className="p-6 flex items-center gap-3 text-gray-700">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"
          aria-hidden="true"
        />
        <div aria-live="polite">Loading...</div>
      </div>
    );
  }
  return <>{children}</>;
}
