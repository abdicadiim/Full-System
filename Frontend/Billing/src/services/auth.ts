/* eslint-disable @typescript-eslint/no-explicit-any */

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ||
  "/api";

const TOKEN_KEYS = ["token", "auth_token", "accessToken"];
const USER_KEYS = ["user", "current_user", "auth_user"];

export const getToken = () => {
  if (typeof localStorage === "undefined") return "";
  for (const key of TOKEN_KEYS) {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  return "";
};

export const setToken = (token: string) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("token", token);
};

export const clearToken = () => {
  if (typeof localStorage === "undefined") return;
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
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
  localStorage.setItem("user", JSON.stringify(user || null));
};

export const clearCurrentUser = () => {
  if (typeof localStorage === "undefined") return;
  USER_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const logout = () => {
  clearToken();
  clearCurrentUser();
};

export const getMe = async () => {
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

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
    if (user) setCurrentUser(user);
    return payload?.success !== undefined ? payload : { success: true, data: user };
  } catch (error: any) {
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
