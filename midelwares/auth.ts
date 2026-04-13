import express from "express";
import jwt from "jsonwebtoken";
import { AUTH_BYPASS, JWT_SECRET, SESSION_COOKIE_NAME } from "../config/env.js";
import { Organization } from "../models/Organization.js";
import { Customer } from "../models/Customer.js";
import { Item } from "../models/Item.js";
import { Invoice } from "../models/Invoice.js";
import { Quote } from "../models/Quote.js";
import { SalesReceipt } from "../models/SalesReceipt.js";
import { CreditNote } from "../models/CreditNote.js";
import { Expense } from "../models/Expense.js";
import { User } from "../models/User.js";
import { Role } from "../models/Role.js";

export type AuthedUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  organizationId: string;
  role: string;
  sessionVersion: number;
  photoUrl?: string | null;
  permissions?: Record<string, any> | null;
  activeTimer?: any | null;
};
type SessionClaims = { sub: string; ver: number };

const normalizeRoleName = (value: unknown) => String(value || "").trim().toLowerCase();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STANDARD_ROLE_NAMES = new Set(["admin", "owner", "staff", "member", "staff assigned", "timesheet staff"]);
const isUserEmailVerified = (user: any) => (user as any)?.emailVerified !== false;
const DEV_SCOPE_MODELS = [Customer, Item, Invoice, Quote, SalesReceipt, CreditNote, Expense];

export const isStandardRoleName = (value: unknown) => STANDARD_ROLE_NAMES.has(normalizeRoleName(value));
export const isSuperRoleName = (value: unknown) => ["admin", "owner"].includes(normalizeRoleName(value));

export const resolveRolePermissions = async (organizationId: unknown, roleName: unknown) => {
  const normalizedRole = normalizeRoleName(roleName);
  if (!normalizedRole || isStandardRoleName(normalizedRole)) {
    return null;
  }
  if (!organizationId) return null;

  const rawRoleName = String(roleName || "").trim();
  if (!rawRoleName) return null;

  const role = await Role.findOne({
    organizationId,
    name: { $regex: new RegExp(`^${escapeRegex(rawRoleName)}$`, "i") },
  }).lean();

  if (!role || (role as any).isSystem) {
    return null;
  }

  return ((role as any).permissions && typeof (role as any).permissions === "object") ? (role as any).permissions : {};
};

const buildDevAuthedUser = async (): Promise<AuthedUser> => {
  const organizations = await Organization.find({}).sort({ createdAt: 1 }).lean();
  if (organizations.length === 0) {
    return {
      id: "000000000000000000000001",
      name: "Dev User",
      email: "dev@example.com",
      emailVerified: true,
      organizationId: "00000000000000000000000a",
      role: "admin",
      sessionVersion: 0,
      permissions: null,
      photoUrl: "",
      activeTimer: null,
    };
  }

  let bestOrg: any = organizations[0];
  let bestScore = -1;

  for (const organization of organizations) {
    const counts = await Promise.all(
      DEV_SCOPE_MODELS.map((Model) => Model.countDocuments({ organizationId: organization._id })),
    );
    const score = counts.reduce((sum, count) => sum + count, 0);
    if (score > bestScore) {
      bestScore = score;
      bestOrg = organization;
    }
  }

  const orgUsers = await User.find({ organizationId: bestOrg._id, status: { $ne: "Inactive" } })
    .sort({ createdAt: 1 })
    .lean();
  const scoreUser = (user: any) => {
    const role = normalizeRoleName(user?.role);
    const roleScore = isSuperRoleName(role) ? 3 : role === "staff" || role === "member" ? 2 : 1;
    const statusScore = String(user?.status || "").trim().toLowerCase() === "active" ? 2 : 1;
    const hasNameScore = String(user?.name || "").trim() ? 1 : 0;
    return roleScore * 100 + statusScore * 10 + hasNameScore;
  };
  const preferredUser = orgUsers
    .slice()
    .sort((a, b) => {
      const byScore = scoreUser(b) - scoreUser(a);
      if (byScore) return byScore;
      const at = new Date(a?.createdAt || 0).getTime();
      const bt = new Date(b?.createdAt || 0).getTime();
      return at - bt;
    })[0];

  if (preferredUser) {
    return buildAuthedUser(preferredUser);
  }

  return {
    id: "000000000000000000000001",
    name: "Dev User",
    email: "dev@example.com",
    emailVerified: true,
    organizationId: String(bestOrg._id),
    role: "admin",
    sessionVersion: 0,
    permissions: null,
    photoUrl: "",
    activeTimer: null,
  };
};

const buildAuthedUser = async (user: any): Promise<AuthedUser> => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  emailVerified: isUserEmailVerified(user),
  organizationId: String(user.organizationId),
  role: String(user.role || "member"),
  sessionVersion: Number((user as any).sessionVersion || 0),
  permissions: await resolveRolePermissions(user.organizationId, user.role),
  photoUrl: (user as any).photoUrl || (user as any).avatar || (user as any).image || (user as any).photo || "",
  activeTimer: (user as any).activeTimer || null,
});

export const issueSessionToken = (userId: string, sessionVersion = 0) => {
  if (!JWT_SECRET) return "";
  return jwt.sign({ sub: userId, ver: Number(sessionVersion) || 0 } satisfies SessionClaims, JWT_SECRET, { expiresIn: "7d" });
};

export const setSessionCookie = (res: express.Response, userId: string, sessionVersion = 0) => {
  if (!JWT_SECRET) return;
  const token = issueSessionToken(userId, sessionVersion);
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
    return buildDevAuthedUser();
  }

  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME];
  // Prefer bearer auth first so a freshly issued JWT can override any stale browser cookie.
  const token = bearerToken || cookieToken;
  if (!token || !JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionClaims;
    const user = await User.findById(decoded.sub).lean();
    if (!user) return null;
    const sessionVersion = Number((user as any).sessionVersion || 0);
    if (Number(decoded.ver || 0) !== sessionVersion) return null;
    return buildAuthedUser(user);
  } catch {
    return null;
  }
};

export const buildAuthUserData = async (user: any) => buildAuthedUser(user);

export const getDevAuthedUser = async () => buildDevAuthedUser();
