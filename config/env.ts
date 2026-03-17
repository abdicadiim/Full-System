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
export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const SMTP_FROM = process.env.SMTP_FROM || "";

// Auth bypass is opt-in.
// Set `AUTH_BYPASS=1` in `.env` to bypass auth (dev only).
export const AUTH_BYPASS = process.env.AUTH_BYPASS === "1";

export const SESSION_COOKIE_NAME = "fs_session";
