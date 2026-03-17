import express from "express";
import bcrypt from "bcryptjs";
import { AUTH_BYPASS, JWT_SECRET, MONGO_URI } from "../config/env.js";
import { Organization } from "../models/Organization.js";
import { User } from "../models/User.js";
import { Role } from "../models/Role.js";
import { clearSessionCookie, getAuthedUser, issueSessionToken, setSessionCookie } from "../midelwares/auth.js";
import mongoose from "mongoose";

const isConfiguredForRealAuth = () => Boolean(MONGO_URI) && Boolean(JWT_SECRET) && mongoose.connection.readyState === 1;

export const signup = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = String(req.body?.email ?? "dev@example.com").trim().toLowerCase() || "dev@example.com";
    return res.status(201).json({ success: true, data: { id: "dev", name: "Dev User", email, organizationId: "dev_org" } });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required", data: null });
  }
  if (!name) {
    return res.status(400).json({ success: false, message: "Organization name required", data: null });
  }

  const exists = await User.findOne({ email }).lean();
  if (exists) return res.status(409).json({ success: false, message: "Email already exists", data: null });

  const org = await Organization.create({ name, primaryContactEmail: email });
  // Ensure default roles exist for this organization.
  try {
    await Role.updateOne(
      { organizationId: org._id, name: "Admin" },
      { $setOnInsert: { organizationId: org._id, name: "Admin", description: "System administrator", isSystem: true } },
      { upsert: true }
    );
    await Role.updateOne(
      { organizationId: org._id, name: "Member" },
      { $setOnInsert: { organizationId: org._id, name: "Member", description: "Standard member", isSystem: true } },
      { upsert: true }
    );
  } catch {
    // no-op
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await User.create({ name, email, passwordHash, organizationId: org._id, role: "admin" });
  setSessionCookie(res, String(created._id));
  const token = issueSessionToken(String(created._id));
  return res.status(201).json({
    success: true,
    data: { id: String(created._id), name: created.name, email, organizationId: String(org._id) },
    token,
  });
};

export const login = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = String(req.body?.email ?? "dev@example.com").trim().toLowerCase() || "dev@example.com";
    return res.json({ success: true, data: { id: "dev", name: "Dev User", email, organizationId: "dev_org" } });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required", data: null });
  }

  const user = await User.findOne({ email }).lean();
  if (!user) return res.status(401).json({ success: false, message: "Invalid Username or Password", data: null });

  if ((user as any).status === "Inactive") {
    return res.status(403).json({ success: false, message: "User is inactive", data: null });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: "Invalid Username or Password", data: null });

  // Treat first successful login as invitation acceptance.
  if ((user as any).status === "Invited") {
    await User.updateOne({ _id: user._id }, { $set: { status: "Active", inviteAcceptedAt: new Date() } });
  }

  setSessionCookie(res, String(user._id));
  const token = issueSessionToken(String(user._id));
  return res.json({
    success: true,
    data: { id: String(user._id), name: user.name, email: user.email, organizationId: String(user.organizationId) },
    token,
  });
};

export const logout = async (_req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) return res.json({ success: true, data: { ok: true } });
  clearSessionCookie(res);
  return res.json({ success: true, data: { ok: true } });
};

export const me = async (req: express.Request, res: express.Response) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  const token = issueSessionToken(user.id);
  return res.json({ success: true, data: user, token });
};

export const updateMe = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const photoUrl = typeof req.body?.photoUrl === "string" ? req.body.photoUrl.trim() : "";
    return res.json({
      success: true,
      data: { id: "dev", name: "Dev User", email: "dev@example.com", organizationId: "dev_org", role: "admin", photoUrl },
    });
  }

  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const MAX_PHOTO_LEN = 2_000_000; // ~2MB string
  const patch: Record<string, unknown> = {};

  if (typeof req.body?.photoUrl === "string") {
    patch.photoUrl = req.body.photoUrl.trim().slice(0, MAX_PHOTO_LEN);
  }

  const updated = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "User not found", data: null });

  return res.json({
    success: true,
    data: {
      id: String(updated._id),
      name: updated.name,
      email: updated.email,
      organizationId: String((updated as any).organizationId),
      role: (updated as any).role === "admin" ? "admin" : "member",
      photoUrl: (updated as any).photoUrl || "",
    },
  });
};
