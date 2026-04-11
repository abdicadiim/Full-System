export type SyncEnvelope<T> = {
  version_id: string;
  last_updated: string;
  pending_sync?: boolean;
  encrypted?: boolean;
  payload: T | string;
};

const TOKEN_KEYS = ["token", "auth_token", "accessToken"];
const COOKIE_KEYS = ["fs_session", "fs_session_bridge"];
const TEMP_SUFFIX = ".__tmp__";
const COMMIT_SUFFIX = ".__commit__";

export const hasLocalStorage = () => typeof localStorage !== "undefined";

const readCookie = (name: string) => {
  if (typeof document === "undefined") return "";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || "") : "";
};

export const readStoredAuthToken = () => {
  if (!hasLocalStorage()) return "";

  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  for (const key of COOKIE_KEYS) {
    const value = readCookie(key);
    if (value) return value;
  }

  return "";
};

export const isJwtExpired = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    const exp = Number(payload?.exp || 0);
    return !Number.isFinite(exp) || Date.now() >= exp * 1000;
  } catch {
    return true;
  }
};

export const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
};

export const deepEqual = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);

export const readSyncEnvelope = <T>(key: string): SyncEnvelope<T> | null => {
  if (!hasLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SyncEnvelope<T>;
  } catch {
    return null;
  }
};

const writeAtomicString = (key: string, value: string) => {
  const tempKey = `${key}${TEMP_SUFFIX}`;
  const commitKey = `${key}${COMMIT_SUFFIX}`;

  localStorage.setItem(tempKey, value);
  localStorage.setItem(commitKey, "1");
  localStorage.setItem(key, value);
  localStorage.removeItem(tempKey);
  localStorage.removeItem(commitKey);
};

export const writeSyncEnvelope = async <T>(
  key: string,
  envelope: SyncEnvelope<T>,
  encrypt?: (plainText: string) => string | Promise<string>
) => {
  if (!hasLocalStorage()) return false;

  const next: SyncEnvelope<T> = { ...envelope };
  if (encrypt) {
    next.payload = await Promise.resolve(encrypt(JSON.stringify(envelope.payload)));
    next.encrypted = true;
  }

  const serialized = JSON.stringify(next);
  try {
    writeAtomicString(key, serialized);
    return true;
  } catch {
    try {
      localStorage.removeItem(key);
      localStorage.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  }
};

export const resolveEnvelopePayload = async <T>(
  envelope: SyncEnvelope<T> | null,
  decrypt?: (cipherText: string) => string | Promise<string>
) => {
  if (!envelope) return null;
  if (!envelope.encrypted) return envelope.payload as T;
  if (typeof envelope.payload !== "string") return null;
  if (!decrypt) return null;

  const plainText = await Promise.resolve(decrypt(envelope.payload));
  return JSON.parse(plainText) as T;
};

export const createLocalVersionId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `v-${Date.now().toString(36)}`;
