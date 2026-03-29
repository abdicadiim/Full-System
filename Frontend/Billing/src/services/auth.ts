/* eslint-disable @typescript-eslint/no-explicit-any */

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ||
  "/api";

const TOKEN_KEYS = ["token", "auth_token", "accessToken"];
const USER_KEYS = ["user", "current_user", "auth_user"];
const LOGOUT_KEYS = ["fs_logout_requested"];
const BRIDGE_TOKEN_COOKIE = "fs_session_bridge";
export const AUTH_USER_UPDATED_EVENT = "auth:user-updated";
export const AUTH_USER_REFRESH_EVENT = "auth:user-refresh";

const readCookie = (name: string) => {
  if (typeof document === "undefined") return "";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || "") : "";
};

const writeCookie = (name: string, value: string, maxAgeSeconds?: number) => {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(String(value || ""));
  const parts = [`${name}=${encoded}`, "Path=/", "SameSite=Lax"];
  if (typeof maxAgeSeconds === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }
  document.cookie = parts.join("; ");
};

const broadcastUserUpdate = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
};

export const getToken = () => {
  if (typeof localStorage === "undefined") return "";
  const bridgeToken = readCookie(BRIDGE_TOKEN_COOKIE);
  if (bridgeToken) return bridgeToken;
  for (const key of TOKEN_KEYS) {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  return "";
};

export const setToken = (token: string) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("token", token);
  writeCookie(BRIDGE_TOKEN_COOKIE, token, 7 * 24 * 60 * 60);
};

export const clearToken = () => {
  if (typeof localStorage === "undefined") return;
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  writeCookie(BRIDGE_TOKEN_COOKIE, "", 0);
};

export const isAuthenticated = () => Boolean(getToken());

export const getCurrentUser = () => {
  if (typeof localStorage === "undefined") return null;
  for (const key of USER_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
};

export const setCurrentUser = (user: any) => {
  if (typeof localStorage === "undefined") return;
  const serialized = JSON.stringify(user || null);
  USER_KEYS.forEach((key) => localStorage.setItem(key, serialized));
  broadcastUserUpdate();
};

export const clearCurrentUser = () => {
  if (typeof localStorage === "undefined") return;
  USER_KEYS.forEach((key) => localStorage.removeItem(key));
  broadcastUserUpdate();
};

export const setLogoutRequested = () => {
  if (typeof localStorage === "undefined") return;
  LOGOUT_KEYS.forEach((key) => localStorage.setItem(key, "1"));
  if (typeof sessionStorage !== "undefined") {
    LOGOUT_KEYS.forEach((key) => sessionStorage.setItem(key, "1"));
  }
};

export const clearLogoutRequested = () => {
  if (typeof localStorage === "undefined") return;
  LOGOUT_KEYS.forEach((key) => localStorage.removeItem(key));
  if (typeof sessionStorage !== "undefined") {
    LOGOUT_KEYS.forEach((key) => sessionStorage.removeItem(key));
  }
};

export const isLogoutRequested = () => {
  if (typeof localStorage === "undefined") return false;
  return LOGOUT_KEYS.some((key) => localStorage.getItem(key) === "1" || sessionStorage.getItem(key) === "1");
};

export const logout = async () => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Fall through and clear local state anyway.
  }
  clearToken();
  clearCurrentUser();
  setLogoutRequested();
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("timerState");
    localStorage.removeItem("auth_bootstrap_ready");
  }
};

export const getMe = async () => {
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers,
      credentials: "include",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        message: payload?.message || "Failed to fetch current user",
        data: null,
      };
    }
    const user = payload?.data ?? payload?.user ?? payload;
    if (payload?.token) setToken(payload.token);
    if (user) setCurrentUser(user);
    return payload?.success !== undefined ? payload : { success: true, data: user };
  } catch (error: any) {
    const cachedUser = getCurrentUser();
    if (cachedUser) {
      return { success: true, data: cachedUser };
    }
    return { success: false, message: error?.message || "Network error", data: null };
  }
};

export default {
  API_BASE_URL,
  getToken,
  setToken,
  clearToken,
  isAuthenticated,
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  logout,
  getMe,
};
