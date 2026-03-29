const BRIDGE_COOKIE = "fs_session_bridge";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const cookieOptions = `Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;

export const setSessionBridgeToken = (token: string) => {
  if (typeof document === "undefined") return;
  const value = String(token || "").trim();
  if (!value) return;
  document.cookie = `${BRIDGE_COOKIE}=${encodeURIComponent(value)}; ${cookieOptions}`;
};

export const clearSessionBridgeToken = () => {
  if (typeof document === "undefined") return;
  document.cookie = `${BRIDGE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
};

