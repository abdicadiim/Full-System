const DATA_IMAGE_RE = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i;

export function normalizeImageSrc(value: unknown, fallback = "") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  if (raw.startsWith("data:image/")) {
    return DATA_IMAGE_RE.test(raw) ? raw : fallback;
  }

  if (raw.startsWith("blob:") || raw.startsWith("/")) {
    return raw;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  return fallback;
}

