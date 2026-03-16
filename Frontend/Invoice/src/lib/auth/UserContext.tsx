import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

  const devUser: NonNullable<User> = {
    id: "dev",
    name: "Dev User",
    email: "dev@example.com",
    phone: "",
    role: "Admin",
    roleName: "Admin",
    photoUrl: null,
    unreadMessages: 0,
    unreadNotifications: 0,
    studentClass: null,
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 1200);
    try {
      const res = await fetch("/api/auth/me", { credentials: "include", signal: ac.signal });
      const payload = await res.json().catch(() => null);
      if (res.ok && payload?.success && payload.data) {
        setUser(payload.data);
        return;
      }
      // Dev-friendly: allow entering the app even when auth isn't implemented yet.
      setUser(devUser);
    } catch {
      setUser(devUser);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setHasChecked(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setUser(null);
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
