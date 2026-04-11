import React, { useEffect, useState } from "react";
import { useUser } from "./UserContext";
import { isLogoutRequested } from "../../services/auth";
import StartupSplash from "../../components/layout/StartupSplash";

const AUTH_URL = (import.meta as any).env?.VITE_AUTH_URL || "http://localhost:5172";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, hasChecked } = useUser() as any;
  const [redirecting, setRedirecting] = useState(false);
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(false);
  const isEmailVerified = user?.emailVerified !== false;

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumSplashElapsed(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !hasChecked) return;
    if (user && isEmailVerified) return;
    const returnTo = window.location.href;
    if (user && !isEmailVerified) {
      setRedirecting(true);
      const verifyUrl = new URL(`${AUTH_URL}/verify-email`);
      verifyUrl.searchParams.set("app", "billing");
      verifyUrl.searchParams.set("intent", "login");
      verifyUrl.searchParams.set("email", String(user.email || ""));
      verifyUrl.searchParams.set("return", returnTo);
      window.location.replace(verifyUrl.toString());
      return;
    }
    setRedirecting(true);
    const loginUrl = new URL(`${AUTH_URL}/login`);
    loginUrl.searchParams.set("app", "billing");
    loginUrl.searchParams.set("return", returnTo);
    if (isLogoutRequested()) loginUrl.searchParams.set("logout", "1");
    window.location.replace(loginUrl.toString());
  }, [hasChecked, isEmailVerified, loading, user]);

  const showSplash = !minimumSplashElapsed || loading || !hasChecked || redirecting || !user || !isEmailVerified;
  const showChildrenBehindSplash = Boolean(user && isEmailVerified);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      {showChildrenBehindSplash ? children : null}
      <StartupSplash />
    </>
  );
}
