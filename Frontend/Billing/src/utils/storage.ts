const DEFAULT_STRIP_KEYS = new Set(["logo", "logoUrl", "logoFile", "photoUrl", "avatar"]);
const EMBEDDED_IMAGE_LIMIT = 10000;

function shouldStripValue(key: string, value: unknown, stripKeys: Set<string>) {
  return stripKeys.has(key) && typeof value === "string" && (value.startsWith("data:") || value.length > EMBEDDED_IMAGE_LIMIT);
}

function sanitizeValue(value: any, stripKeys: Set<string>): any {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, stripKeys));
  }

  if (value && typeof value === "object") {
    const next: Record<string, any> = {};
    Object.entries(value).forEach(([key, childValue]) => {
      if (shouldStripValue(key, childValue, stripKeys)) return;
      next[key] = sanitizeValue(childValue, stripKeys);
    });
    return next;
  }

  return value;
}

export function safeSetStorageItem(key: string, value: string) {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeSetJsonStorage(key: string, value: any, stripKeys: string[] = []) {
  if (typeof localStorage === "undefined") return false;

  const sanitized = sanitizeValue(value, new Set([...DEFAULT_STRIP_KEYS, ...stripKeys]));
  const serialized = JSON.stringify(sanitized);

  try {
    localStorage.setItem(key, serialized);
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
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

