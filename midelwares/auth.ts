import express from "express";
import jwt from "jsonwebtoken";
import { AUTH_BYPASS, JWT_SECRET, SESSION_COOKIE_NAME } from "../config/env.js";
import { User } from "../models/User.js";

export type AuthedUser = {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  role: "admin" | "member";
  photoUrl?: string | null;
  activeTimer?: any | null;
};
type SessionClaims = { sub: string };

export const issueSessionToken = (userId: string) => {
  if (!JWT_SECRET) return "";
  return jwt.sign({ sub: userId } satisfies SessionClaims, JWT_SECRET, { expiresIn: "7d" });
};

export const setSessionCookie = (res: express.Response, userId: string) => {
  if (!JWT_SECRET) return;
  const token = issueSessionToken(userId);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearSessionCookie = (res: express.Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
};

export const getAuthedUser = async (req: express.Request): Promise<AuthedUser | null> => {
  if (AUTH_BYPASS) {
    return { id: "000000000000000000000001", name: "Dev User", email: "dev@example.com", organizationId: "00000000000000000000000a", role: "admin", photoUrl: "", activeTimer: null };
  }

  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME];
  // Prefer cookie auth for browser flows (avoids stale localStorage Bearer tokens overriding a fresh login cookie).
  const token = cookieToken || bearerToken;
  if (!token || !JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionClaims;
    const user = await User.findById(decoded.sub).lean();
    if (!user) return null;
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      organizationId: String(user.organizationId),
      role: (user.role === "admin" ? "admin" : "member") as "admin" | "member",
      photoUrl: (user as any).photoUrl || (user as any).avatar || (user as any).image || (user as any).photo || "",
      activeTimer: (user as any).activeTimer || null,
    };
  } catch {
    return null;
  }
};
