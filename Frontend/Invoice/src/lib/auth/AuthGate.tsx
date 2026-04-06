import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "./UserContext";
import { isLogoutRequested } from "../../services/auth";

const AUTH_URL = (import.meta as any).env?.VITE_AUTH_URL || "http://localhost:5172";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, loading, hasChecked } = useUser() as any;
  const [redirecting, setRedirecting] = useState(false);
  const isEmailVerified = user?.emailVerified !== false;

  useEffect(() => {
    if (loading || !hasChecked) return;
    if (user && isEmailVerified) return;
    const returnTo = window.location.href;
    if (user && !isEmailVerified) {
      setRedirecting(true);
      const verifyUrl = new URL(`${AUTH_URL}/verify-email`);
      verifyUrl.searchParams.set("app", "invoice");
      verifyUrl.searchParams.set("intent", "login");
      verifyUrl.searchParams.set("email", String(user.email || ""));
      verifyUrl.searchParams.set("return", returnTo);
      window.location.replace(verifyUrl.toString());
      return;
    }
    setRedirecting(true);
    const loginUrl = new URL(`${AUTH_URL}/login`);
    loginUrl.searchParams.set("app", "invoice");
    loginUrl.searchParams.set("return", returnTo);
    if (isLogoutRequested()) loginUrl.searchParams.set("logout", "1");
    window.location.replace(loginUrl.toString());
  }, [hasChecked, isEmailVerified, loading, location, user]);

  if (loading || !hasChecked || redirecting || !user || !isEmailVerified) {
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
