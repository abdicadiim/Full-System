import React, { useEffect, useState } from "react";
import { useUser } from "./UserContext";
import { isLogoutRequested } from "../../services/auth";

const AUTH_URL = (import.meta as any).env?.VITE_AUTH_URL || "http://localhost:5172";

export default function AuthGate({ children }: { children: React.ReactNode }) {
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
  }, [hasChecked, isEmailVerified, loading, user]);

  return <>{children}</>;
}
