import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_USER_UPDATED_EVENT } from "../../services/auth";
import { waitForBackendReady } from "../../services/backendReady";

type User =
  | {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      role?: string;
      roleName?: string;
      photoUrl?: string | null;
      unreadMessages?: number;
      unreadNotifications?: number;
      studentClass?: string | null;
      activeTimer?: any | null;
    }
  | null;

type UserContextValue = {
  user: User;
  loading: boolean;
  hasChecked: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (_module: string, _action?: string) => boolean;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);
    try {
      await waitForBackendReady();
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        signal: ac.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success && payload.data) {
        const nextToken = payload?.token;
        if (typeof nextToken === "string" && nextToken) {
          localStorage.setItem("auth_token", nextToken);
          localStorage.setItem("token", nextToken);
        }
        setUser(payload.data);
        try {
          localStorage.setItem("user", JSON.stringify(payload.data));
          // GLOBAL TIMER SYNC
          const serverTimer = payload.data.activeTimer;
          const localTimerStr = localStorage.getItem("timerState");
          const serverTimerStr = serverTimer ? JSON.stringify(serverTimer) : null;
          if (localTimerStr !== serverTimerStr) {
            if (serverTimerStr) localStorage.setItem("timerState", serverTimerStr);
            else localStorage.removeItem("timerState");
            window.dispatchEvent(new CustomEvent("timerStateUpdated"));
          }
        } catch {}
        return;
      }
      if (res.status === 401) {
        localStorage.removeItem("user");
        setUser(null);
      }
      localStorage.setItem("auth_bootstrap_ready", "1");
      setPollingEnabled(true);
    } catch (err) {
      if ((import.meta as any).env?.DEV) {
        console.error("Refresh failed", err);
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setHasChecked(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!pollingEnabled) return;
    const interval = window.setInterval(refresh, 30000);
    return () => window.clearInterval(interval);
  }, [refresh, pollingEnabled]);

  useEffect(() => {
    const syncFromStorage = () => {
      if (typeof localStorage === "undefined") return;
      for (const key of ["user", "current_user", "auth_user"]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          setUser(JSON.parse(raw));
          return;
        } catch {
          continue;
        }
      }
      setUser(null);
    };
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage as EventListener);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage as EventListener);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("timerState");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("auth_bootstrap_ready");
    }
  }, []);

  const hasPermission = (_module: string, _action = "view") => Boolean(user);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      loading,
      hasChecked,
      refresh,
      logout,
      hasPermission,
    }),
    [user, loading, hasChecked, refresh, logout]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}
