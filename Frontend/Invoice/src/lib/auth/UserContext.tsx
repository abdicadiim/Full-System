import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_USER_UPDATED_EVENT,
  AUTH_USER_REFRESH_EVENT,
  clearLogoutRequested,
  getToken,
  isLogoutRequested,
  logout as serviceLogout,
  setToken,
} from "../../services/auth";
import { waitForBackendReady } from "../../services/backendReady";
import { createPermissionEvaluator, type PermissionTree } from "./permissionUtils";

type User =
  | {
      id: string;
      name: string;
      email: string;
      emailVerified?: boolean;
      phone?: string | null;
      role?: string;
      roleName?: string;
      photoUrl?: string | null;
      unreadMessages?: number;
      unreadNotifications?: number;
      studentClass?: string | null;
      activeTimer?: any | null;
      permissions?: PermissionTree | null;
    }
  | null;

type UserContextValue = {
  user: User;
  loading: boolean;
  hasChecked: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module?: string, submoduleOrAction?: string, action?: string) => boolean;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const refresh = useCallback(async () => {
    const url = new URL(window.location.href);
    const isAuthReturn = url.searchParams.get("auth_return") === "1";
    if (isAuthReturn) {
      clearLogoutRequested();
      url.searchParams.delete("auth_return");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const token = getToken();
    if (isLogoutRequested() && !token) {
      setUser(null);
      setLoading(false);
      setHasChecked(true);
      return;
    }
    if (isLogoutRequested() && token) {
      clearLogoutRequested();
    }

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
          setToken(nextToken);
        }
        clearLogoutRequested();
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
      const url = new URL(window.location.href);
      if (url.searchParams.get("auth_return") === "1") {
        clearLogoutRequested();
      }
      if (isLogoutRequested()) {
        setUser(null);
        return;
      }
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
    window.addEventListener(AUTH_USER_REFRESH_EVENT, refresh as EventListener);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage as EventListener);
      window.removeEventListener(AUTH_USER_REFRESH_EVENT, refresh as EventListener);
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    await serviceLogout();
    setUser(null);
  }, []);

  const permissionEvaluator = useMemo(
    () =>
      createPermissionEvaluator({
        role: user?.role,
        permissions: user?.permissions,
      }),
    [user?.role, user?.permissions]
  );

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      loading,
      hasChecked,
      refresh,
      logout,
      hasPermission: permissionEvaluator.hasPermission,
    }),
    [user, loading, hasChecked, refresh, logout, permissionEvaluator]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}
