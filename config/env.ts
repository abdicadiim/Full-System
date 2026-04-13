import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const stripOptionalQuotes = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
};

const readMongoUriFromDotEnvFile = (): string => {
  try {
    const dotenvPath = resolve(process.cwd(), ".env");
    if (!existsSync(dotenvPath)) return "";

    const contents = readFileSync(dotenvPath, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      if (line.startsWith("MONGO_URI=")) {
        return stripOptionalQuotes(line.slice("MONGO_URI=".length));
      }
      if (line.startsWith("MONGODB_URI=")) {
        return stripOptionalQuotes(line.slice("MONGODB_URI=".length));
      }

      if (/^mongodb(\+srv)?:\/\//i.test(line)) {
        // Support the common mistake of putting the URI in .env without a key.
        return line;
      }
    }
  } catch {
    // ignore
  }

  return "";
};

// Back-compat: if the user put ONLY a raw Mongo URI line in `.env`, pick it up.
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  const inferredMongoUri = readMongoUriFromDotEnvFile();
  if (inferredMongoUri) {
    process.env.MONGO_URI = inferredMongoUri;
    // eslint-disable-next-line no-console
    console.warn(
      "Loaded MongoDB connection string from `.env` without a key. Prefer `MONGO_URI=...` in `.env` for clarity."
    );
  }
}

// Dev ergonomics: generate an ephemeral JWT secret if missing (tokens won't survive restarts).
if (
  !process.env.JWT_SECRET &&
  process.env.AUTH_BYPASS !== "1" &&
  (process.env.NODE_ENV || "development") !== "production"
) {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  // eslint-disable-next-line no-console
  console.warn("JWT_SECRET not set; generated an ephemeral dev secret. Set JWT_SECRET in .env to persist sessions.");
}

export const PORT = Number(process.env.PORT || 5000);

// Support both names:
// - MONGO_URI (preferred)
// - MONGODB_URI (legacy)
export const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "";
export const MONGODB_URI = MONGO_URI;

export const NODE_ENV = process.env.NODE_ENV || "development";

export const JWT_SECRET = process.env.JWT_SECRET || "";
export const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";

export const FRONTEND_URL = process.env.FRONTEND_URL || "";
export const AUTH_SMTP_HOST = process.env.AUTH_SMTP_HOST || "";
export const AUTH_SMTP_PORT = Number(process.env.AUTH_SMTP_PORT || 0);
export const AUTH_SMTP_USER = process.env.AUTH_SMTP_USER || "";
export const AUTH_SMTP_PASS = process.env.AUTH_SMTP_PASS || "";
export const AUTH_SMTP_FROM = process.env.AUTH_SMTP_FROM || "";
export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const SMTP_FROM = process.env.SMTP_FROM || "";

// Auth bypass is opt-in.
// Set `AUTH_BYPASS=1` in `.env` to bypass auth (dev only).
export const AUTH_BYPASS = process.env.AUTH_BYPASS === "1";

export const SESSION_COOKIE_NAME = "fs_session";
