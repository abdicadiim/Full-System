import express from "express";
import mongoose from "mongoose";
import { SenderEmail } from "../models/SenderEmail.js";
import { EmailTemplate } from "../models/EmailTemplate.js";
import { EmailRelayServer } from "../models/EmailRelayServer.js";
import { EmailNotificationPreferences } from "../models/EmailNotificationPreferences.js";

const normalizeEmail = (value: unknown) => String(typeof value === "string" ? value : "").trim().toLowerCase();
const normalizeName = (value: unknown) => String(typeof value === "string" ? value : "").trim();
const normalizeString = (value: unknown) => String(typeof value === "string" ? value : "").trim();
const normalizeNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const sanitizeSender = (row: any) => {
  if (!row) return row;
  const { smtpPassword: _smtpPassword, password: _password, ...rest } = row;
  return rest;
};

const isSmtpConfigured = (row: any) => {
  const host = String(row?.smtpHost || "").trim();
  const port = Number(row?.smtpPort || 0);
  const user = String(row?.smtpUser || "").trim();
  const pass = String(row?.smtpPassword || "").trim();
  return Boolean(host) && Number.isFinite(port) && port > 0 && Boolean(user) && Boolean(pass);
};

const requireOrgId = (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }
  if (mongoose.connection.readyState !== 1) {
    res.status(500).json({ success: false, message: "DB not connected", data: null });
    return null;
  }
  return orgId;
};

export const listSenderEmails = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const rows = await SenderEmail.find({ organizationId: orgId })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();
  return res.json({ success: true, data: rows.map((r: any) => sanitizeSender({ ...r, id: String(r._id) })) });
};

export const getSenderEmailById = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Missing sender id", data: null });

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid sender id", data: null });
  }

  const row: any = await SenderEmail.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Sender not found", data: null });
  return res.json({ success: true, data: sanitizeSender({ ...row, id: String(row._id) }) });
};

export const createSenderEmail = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const email = normalizeEmail(req.body?.email);
  const name = normalizeName(req.body?.name);
  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, message: "Invalid email address", data: null });
  }

  const existingCount = await SenderEmail.countDocuments({ organizationId: orgId });
  const requestedPrimary = Boolean(req.body?.isPrimary) || existingCount === 0;

  const smtpHost = normalizeString(req.body?.smtpHost).slice(0, 255);
  const smtpPort = normalizeNumber(req.body?.smtpPort);
  const smtpUser = normalizeString(req.body?.smtpUser).slice(0, 255);
  const smtpPassword = normalizeString(req.body?.smtpPassword).slice(0, 1024);
  const smtpSecure = typeof req.body?.smtpSecure === "boolean" ? req.body.smtpSecure : false;

  const created = await SenderEmail.create({
    organizationId: orgId,
    email,
    name,
    isPrimary: requestedPrimary,
    isVerified: false,
    smtpHost,
    smtpPort: Number.isFinite(smtpPort) ? smtpPort : 0,
    smtpUser,
    smtpPassword,
    smtpSecure,
  });

  if (requestedPrimary) {
    await SenderEmail.updateMany(
      { organizationId: orgId, _id: { $ne: created._id } },
      { $set: { isPrimary: false } }
    );
  }

  let row: any = created.toObject();
  if (isSmtpConfigured(row)) {
    await SenderEmail.updateOne({ _id: row._id }, { $set: { isVerified: true } });
    row.isVerified = true;
  }

  return res.json({ success: true, data: sanitizeSender({ ...row, id: String(row._id) }) });
};

export const updateSenderEmail = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Missing sender id", data: null });

  const patch: Record<string, any> = {};
  if (typeof req.body?.name === "string") patch.name = normalizeName(req.body.name).slice(0, 120);
  if (typeof req.body?.email === "string") {
    const email = normalizeEmail(req.body.email);
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Invalid email address", data: null });
    }
    patch.email = email;
  }
  if (typeof req.body?.isVerified === "boolean") patch.isVerified = req.body.isVerified;
  if (typeof req.body?.isPrimary === "boolean") patch.isPrimary = req.body.isPrimary;

  if (typeof req.body?.smtpHost === "string") patch.smtpHost = normalizeString(req.body.smtpHost).slice(0, 255);
  if (typeof req.body?.smtpPort !== "undefined") {
    const n = normalizeNumber(req.body.smtpPort);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ success: false, message: "Invalid SMTP port", data: null });
    patch.smtpPort = n;
  }
  if (typeof req.body?.smtpUser === "string") patch.smtpUser = normalizeString(req.body.smtpUser).slice(0, 255);
  if (typeof req.body?.smtpSecure === "boolean") patch.smtpSecure = req.body.smtpSecure;
  if (typeof req.body?.smtpPassword === "string") patch.smtpPassword = normalizeString(req.body.smtpPassword).slice(0, 1024);

  const updated = await SenderEmail.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: patch },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ success: false, message: "Sender not found", data: null });

  if (patch.isPrimary === true) {
    await SenderEmail.updateMany({ organizationId: orgId, _id: { $ne: updated._id } }, { $set: { isPrimary: false } });
  } else if (patch.isPrimary === false) {
    const anyPrimary = await SenderEmail.exists({ organizationId: orgId, isPrimary: true });
    if (!anyPrimary) {
      const promote = await SenderEmail.findOne({ organizationId: orgId }).sort({ createdAt: -1 });
      if (promote) await SenderEmail.updateOne({ _id: promote._id }, { $set: { isPrimary: true } });
    }
  }

  let next: any = updated;
  const smtpChanged =
    patch.smtpHost !== undefined ||
    patch.smtpPort !== undefined ||
    patch.smtpUser !== undefined ||
    patch.smtpPassword !== undefined ||
    patch.smtpSecure !== undefined;

  if (smtpChanged && !next.isVerified && isSmtpConfigured(next)) {
    const set = await SenderEmail.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: { isVerified: true } },
      { new: true }
    ).lean();
    if (set) next = set;
  }

  return res.json({ success: true, data: sanitizeSender({ ...next, id: String(next._id) }) });
};

export const deleteSenderEmail = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const toDelete: any = await SenderEmail.findOne({ _id: id, organizationId: orgId }).lean();
  if (!toDelete) return res.status(404).json({ success: false, message: "Sender not found", data: null });

  await SenderEmail.deleteOne({ _id: id, organizationId: orgId });

  if (toDelete.isPrimary) {
    const promote = await SenderEmail.findOne({ organizationId: orgId }).sort({ createdAt: -1 });
    if (promote) await SenderEmail.updateOne({ _id: promote._id }, { $set: { isPrimary: true } });
  }

  return res.json({ success: true, data: { id } });
};

export const getPrimarySenderEmail = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const primary: any = await SenderEmail.findOne({ organizationId: orgId, isPrimary: true }).lean();
  if (primary) {
    return res.json({
      success: true,
      data: { id: String(primary._id), name: primary.name || "", email: primary.email || "", isVerified: !!primary.isVerified },
    });
  }

  const user = req.user;
  const name = (user as any)?.name || (user as any)?.fullName || "";
  const email = (user as any)?.email || "";
  return res.json({ success: true, data: { name, email } });
};

export const getEmailNotificationPreferences = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const existing: any = await EmailNotificationPreferences.findOne({ organizationId: orgId }).lean();
  if (existing) return res.json({ success: true, data: existing });

  const created: any = await EmailNotificationPreferences.create({ organizationId: orgId, emailInsightsEnabled: false, signature: "" });
  const row = created.toObject();
  return res.json({ success: true, data: row });
};

export const updateEmailNotificationPreferences = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const patch: Record<string, any> = {};
  if (typeof req.body?.emailInsightsEnabled === "boolean") patch.emailInsightsEnabled = req.body.emailInsightsEnabled;
  if (typeof req.body?.signature === "string") patch.signature = String(req.body.signature || "").slice(0, 20_000);

  const updated = await EmailNotificationPreferences.findOneAndUpdate(
    { organizationId: orgId },
    { $set: patch, $setOnInsert: { organizationId: orgId } },
    { new: true, upsert: true }
  ).lean();

  return res.json({ success: true, data: updated });
};

export const listEmailRelayServers = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const rows = await EmailRelayServer.find({ organizationId: orgId }).sort({ createdAt: -1 }).lean();
  const servers = rows.map((r: any) => ({
    ...r,
    id: String(r._id),
  }));
  return res.json({ success: true, data: { servers } });
};

export const getEmailRelayServerById = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const row: any = await EmailRelayServer.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Relay server not found", data: null });
  return res.json({ success: true, data: { ...row, id: String(row._id) } });
};

export const createEmailRelayServer = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const created = await EmailRelayServer.create({
    organizationId: orgId,
    serverName: String(req.body?.serverName || req.body?.server_name || "").trim(),
    port: Number(req.body?.port || 587),
    dailyMailLimit: Number(req.body?.dailyMailLimit || req.body?.daily_mail_limit || 300),
    useSecureConnection: String(req.body?.useSecureConnection || req.body?.use_secure_connection || "TLS"),
    mailDeliveryPreference: String(req.body?.mailDeliveryPreference || req.body?.mail_delivery_preference || "domain"),
    domainInServer: String(req.body?.domainInServer || req.body?.domain_in_server || "").trim(),
    authenticationRequired: Boolean(req.body?.authenticationRequired),
    username: String(req.body?.username || "").trim(),
    password: String(req.body?.password || "").trim(),
    isEnabled: typeof req.body?.isEnabled === "boolean" ? req.body.isEnabled : true,
  });

  const row: any = created.toObject();
  return res.json({ success: true, data: { ...row, id: String(row._id) } });
};

export const updateEmailRelayServer = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Missing relay id", data: null });

  const patch: Record<string, any> = {};
  const setString = (field: string, value: unknown, max = 255) => {
    if (typeof value === "string") patch[field] = value.trim().slice(0, max);
  };
  const setNumber = (field: string, value: unknown) => {
    const n = Number(value);
    if (Number.isFinite(n)) patch[field] = n;
  };
  if (typeof req.body?.isEnabled === "boolean") patch.isEnabled = req.body.isEnabled;
  if (typeof req.body?.authenticationRequired === "boolean") patch.authenticationRequired = req.body.authenticationRequired;
  setString("serverName", req.body?.serverName ?? req.body?.server_name);
  setNumber("port", req.body?.port);
  setNumber("dailyMailLimit", req.body?.dailyMailLimit ?? req.body?.daily_mail_limit);
  setString("useSecureConnection", req.body?.useSecureConnection ?? req.body?.use_secure_connection, 20);
  setString("mailDeliveryPreference", req.body?.mailDeliveryPreference ?? req.body?.mail_delivery_preference, 20);
  setString("domainInServer", req.body?.domainInServer ?? req.body?.domain_in_server);
  setString("username", req.body?.username, 255);
  setString("password", req.body?.password, 255);

  const updated = await EmailRelayServer.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: patch },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Relay server not found", data: null });

  return res.json({ success: true, data: { ...updated, id: String(updated._id) } });
};

export const deleteEmailRelayServer = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const deleted = await EmailRelayServer.deleteOne({ _id: id, organizationId: orgId });
  if (!deleted.deletedCount) return res.status(404).json({ success: false, message: "Relay server not found", data: null });
  return res.json({ success: true, data: { id } });
};

export const toggleEmailRelayServer = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const existing: any = await EmailRelayServer.findOne({ _id: id, organizationId: orgId });
  if (!existing) return res.status(404).json({ success: false, message: "Relay server not found", data: null });

  const enabled =
    typeof req.body?.enabled === "boolean"
      ? req.body.enabled
      : typeof req.body?.isEnabled === "boolean"
        ? req.body.isEnabled
        : !Boolean(existing.isEnabled);

  existing.isEnabled = enabled;
  await existing.save();
  const row: any = existing.toObject();
  return res.json({ success: true, data: { ...row, id: String(row._id) } });
};

export const listEmailTemplates = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const rows: any[] = await EmailTemplate.find({ organizationId: orgId }).lean();
  const out: Record<string, any> = {};
  for (const row of rows) {
    if (row?.key) out[String(row.key)] = row.data ?? {};
  }
  return res.json({ success: true, data: out });
};

export const getEmailTemplateByKey = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const key = String(req.params.key || "").trim();
  if (!key) return res.status(400).json({ success: false, message: "Missing template key", data: null });

  const row: any = await EmailTemplate.findOne({ organizationId: orgId, key }).lean();
  return res.json({ success: true, data: row?.data ?? null });
};

export const upsertEmailTemplateByKey = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const key = String(req.params.key || "").trim();
  if (!key) return res.status(400).json({ success: false, message: "Missing template key", data: null });

  const data = req.body ?? {};
  const updated: any = await EmailTemplate.findOneAndUpdate(
    { organizationId: orgId, key },
    { $set: { data }, $setOnInsert: { organizationId: orgId, key } },
    { new: true, upsert: true }
  ).lean();

  return res.json({ success: true, data: updated?.data ?? {} });
};
