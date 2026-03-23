import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_USER_UPDATED_EVENT } from "../../services/auth";

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

  const refresh = useCallback(async () => {
    setLoading(true);
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
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
        } catch {}
        return;
      }
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      } catch {}
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setHasChecked(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const syncFromStorage = () => {
      const raw = localStorage.getItem("user") || localStorage.getItem("current_user") || localStorage.getItem("auth_user");
      if (!raw) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
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
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
      } catch {}
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
