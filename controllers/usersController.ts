import express from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { ActivityLog } from "../models/ActivityLog.js";
import bcrypt from "bcryptjs";
import { Organization } from "../models/Organization.js";
import { SenderEmail } from "../models/SenderEmail.js";
import { sendSmtpMail } from "../services/smtpMailer.js";

const normalizeEmail = (value: unknown) => String(typeof value === "string" ? value : "").trim().toLowerCase();
const normalizeName = (value: unknown) => String(typeof value === "string" ? value : "").trim();
const isActiveStatus = (value: unknown) => String(value ?? "").trim().toLowerCase() === "active";
const isInactiveStatus = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "inactive" || normalized === "invited";
};
const isDuplicateEmailError = (error: any) =>
  error?.code === 11000 && String(error?.keyPattern?.email || error?.keyValue?.email || error?.message || "").toLowerCase().includes("email");

const pickSmtpSender = async (organizationId: any) => {
  const primary: any = await SenderEmail.findOne({
    organizationId,
    isPrimary: true,
    isVerified: true,
    smtpHost: { $ne: "" },
    smtpUser: { $ne: "" },
    smtpPassword: { $ne: "" },
    smtpPort: { $gt: 0 },
  }).lean();
  if (primary) return primary;

  const fallback: any = await SenderEmail.findOne({
    organizationId,
    isVerified: true,
    smtpHost: { $ne: "" },
    smtpUser: { $ne: "" },
    smtpPassword: { $ne: "" },
    smtpPort: { $gt: 0 },
  })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();
  return fallback || null;
};

export const listUsers = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const status = String(req.query?.status || "").toLowerCase();
  const filter: any = { organizationId: orgId };
  if (status === "active") filter.status = { $regex: /^active$/i };
  if (status === "inactive") filter.status = { $regex: /^(inactive|invited)$/i };

  const rows = await User.find(filter)
    .sort({ createdAt: -1 })
    .select({ passwordHash: 0 })
    .lean();

  const data = rows.map((u: any) => ({
    id: String(u._id),
    _id: String(u._id),
    name: u.name || "",
    email: u.email || "",
    role: u.role || "member",
    status: isActiveStatus(u.status) ? "Active" : isInactiveStatus(u.status) ? "Inactive" : (u.status || "Active"),
    photoUrl: u.photoUrl || "",
    inviteSentAt: u.inviteSentAt || null,
    inviteAcceptedAt: u.inviteAcceptedAt || null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return res.json({ success: true, data });
};

export const listUsersForSettings = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const status = String(req.query?.status || "").toLowerCase();
  const filter: any = { organizationId: orgId };
  if (status === "active") filter.status = { $regex: /^active$/i };
  if (status === "inactive") filter.status = { $regex: /^(inactive|invited)$/i };

  const rows = await User.find(filter).sort({ createdAt: -1 }).select({ name: 1, email: 1 }).lean();
  const data = rows.map((u: any) => ({ id: String(u._id), name: u.name || "", email: u.email || "" }));
  return res.json({ success: true, data });
};

export const getUserById = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  const row: any = await User.findOne({ _id: id, organizationId: orgId }).select({ passwordHash: 0 }).lean();
  if (!row) return res.status(404).json({ success: false, message: "User not found", data: null });
  return res.json({
    success: true,
    data: {
      id: String(row._id),
      _id: String(row._id),
      name: row.name || "",
      email: row.email || "",
      role: row.role || "member",
      status: row.status || "Active",
      photoUrl: row.photoUrl || "",
      accessibleLocations: row.accessibleLocations || [],
      defaultBusinessLocation: row.defaultBusinessLocation || "",
      defaultWarehouseLocation: row.defaultWarehouseLocation || "",
      inviteSentAt: row.inviteSentAt || null,
      inviteAcceptedAt: row.inviteAcceptedAt || null,
    },
  });
};

export const getUserActivities = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const actorId = String(req.params.id || "").trim();
  if (!actorId) return res.status(400).json({ success: false, message: "Missing user id", data: null });

  const limitRaw = Number(req.query?.limit || 1000);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 1000)) : 1000;

  const rows: any[] = await ActivityLog.find({ organizationId: orgId, actorId })
    .sort({ occurredAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const data = rows.map((row: any) => ({
    id: String(row._id),
    actorId: row.actorId || "",
    actorName: row.actorName || "",
    actorEmail: row.actorEmail || "",
    actorRole: row.actorRole || "",
    action: row.action || "",
    resource: row.resource || "",
    entityType: row.entityType || "",
    entityId: row.entityId || "",
    entityName: row.entityName || "",
    method: row.method || "",
    path: row.path || "",
    summary: row.summary || "",
    occurredAt: row.occurredAt || row.createdAt || null,
  }));

  return res.json({ success: true, data });
};

export const createUser = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const name = normalizeName(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "member").trim() || "member";

  if (!name || !email || !email.includes("@") || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required", data: null });
  }

  const exists = await User.findOne({ email }).lean();
  if (exists) return res.status(409).json({ success: false, message: "Email already exists", data: null });

  const passwordHash = await bcrypt.hash(password, 10);
  const accessibleLocations = Array.isArray(req.body?.accessibleLocations) ? req.body.accessibleLocations.map(String) : [];

  try {
    const created: any = await User.create({
      name,
      email,
      passwordHash,
      organizationId: orgId,
      role,
      status: req.body?.skipEmail ? "Invited" : "Active",
      accessibleLocations,
      defaultBusinessLocation: String(req.body?.defaultBusinessLocation || ""),
      defaultWarehouseLocation: String(req.body?.defaultWarehouseLocation || ""),
    });

    return res.status(201).json({
      success: true,
      data: {
        id: String(created._id),
        _id: String(created._id),
        name: created.name,
        email: created.email,
        role: created.role,
        status: created.status || "Active",
        inviteSentAt: created.inviteSentAt || null,
        inviteAcceptedAt: created.inviteAcceptedAt || null,
      },
    });
  } catch (error: any) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({ success: false, message: "Email already exists", data: null });
    }
    return res.status(500).json({ success: false, message: String(error?.message || "Failed to create user"), data: null });
  }
};

export const updateUser = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Missing user id", data: null });

  const patch: Record<string, any> = {};
  if (typeof req.body?.name === "string") patch.name = normalizeName(req.body.name).slice(0, 120);
  if (typeof req.body?.email === "string") {
    const email = normalizeEmail(req.body.email);
    if (!email || !email.includes("@")) return res.status(400).json({ success: false, message: "Invalid email", data: null });
    patch.email = email;
  }
  if (typeof req.body?.role === "string") patch.role = String(req.body.role || "").trim().slice(0, 80);
  if (typeof req.body?.status === "string") {
    const s = String(req.body.status || "").trim();
    if (s === "Active" || s === "Inactive") patch.status = s;
  }
  if (Array.isArray(req.body?.accessibleLocations)) patch.accessibleLocations = req.body.accessibleLocations.map(String);
  if (typeof req.body?.defaultBusinessLocation === "string") patch.defaultBusinessLocation = String(req.body.defaultBusinessLocation || "");
  if (typeof req.body?.defaultWarehouseLocation === "string") patch.defaultWarehouseLocation = String(req.body.defaultWarehouseLocation || "");

  try {
    const updated: any = await User.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true })
      .select({ passwordHash: 0 })
      .lean();

    if (!updated) return res.status(404).json({ success: false, message: "User not found", data: null });
    return res.json({
      success: true,
      data: {
        id: String(updated._id),
        _id: String(updated._id),
        name: updated.name || "",
        email: updated.email || "",
        role: updated.role || "member",
        status: updated.status || "Active",
        accessibleLocations: updated.accessibleLocations || [],
        defaultBusinessLocation: updated.defaultBusinessLocation || "",
        defaultWarehouseLocation: updated.defaultWarehouseLocation || "",
        inviteSentAt: updated.inviteSentAt || null,
        inviteAcceptedAt: updated.inviteAcceptedAt || null,
      },
    });
  } catch (error: any) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({ success: false, message: "Email already exists", data: null });
    }
    return res.status(500).json({ success: false, message: String(error?.message || "Failed to update user"), data: null });
  }
};

export const deleteUser = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Missing user id", data: null });

  const deleted = await User.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "User not found", data: null });
  return res.json({ success: true, data: { id } });
};

export const sendUserInvitation = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Missing user id", data: null });

  const user: any = await User.findOne({ _id: id, organizationId: orgId }).lean();
  if (!user) return res.status(404).json({ success: false, message: "User not found", data: null });

  const tempPassword = String(req.body?.tempPassword || "").trim();
  if (tempPassword) {
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await User.updateOne({ _id: id, organizationId: orgId }, { $set: { passwordHash } });
  }

  const org: any = await Organization.findById(orgId).lean();
  const orgName = String(org?.name || "Organization");

  const sender: any = await pickSmtpSender(orgId);
  if (!sender) {
    return res.status(400).json({
      success: false,
      message: "SMTP sender is not configured. Go to Settings > Emails > New Sender and add SMTP Host/User/Password.",
      data: null,
    });
  }
  const senderName = String(sender?.name || orgName || "Organization").trim() || orgName;

  const baseUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  const viewInvitationUrl = `${baseUrl}/login?email=${encodeURIComponent(String(user.email || ""))}`;
  const expiresDays = 25;

  const subject = `Invitation to join the ${orgName} organization!`;
  const safeName = String(user.name || user.email || "").trim() || "there";

  const text =
    `Hi ${safeName},\n\n` +
    `You have been invited by the admin of ${orgName} to join their organization.\n` +
    `View Invitation: ${viewInvitationUrl}\n` +
    `This invitation will expire in ${expiresDays} days.\n\n` +
    (tempPassword ? `Temporary Password: ${tempPassword}\n\n` : "") +
    `Regards,\n` +
    `${orgName}\n`;

  const logoUrl = String(org?.logoUrl || "").trim();

  const attachments: Array<{
    cid: string;
    filename: string;
    contentType: string;
    contentBase64: string;
    disposition?: "inline" | "attachment";
  }> = [];

  const parseDataImage = (value: string) => {
    const v = String(value || "").trim();
    const m = v.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i);
    if (!m) return null;
    return { contentType: m[1].toLowerCase(), base64: m[2] };
  };

  const dataImg = parseDataImage(logoUrl);
  const logoCid = "org-logo";
  if (dataImg?.base64) {
    const ext = dataImg.contentType.includes("png")
      ? "png"
      : dataImg.contentType.includes("jpeg") || dataImg.contentType.includes("jpg")
        ? "jpg"
        : dataImg.contentType.includes("gif")
          ? "gif"
          : "img";
    attachments.push({
      cid: logoCid,
      filename: `logo.${ext}`,
      contentType: dataImg.contentType,
      contentBase64: dataImg.base64,
      disposition: "inline",
    });
  }

  const logoImgStyle =
    "width:72px; height:72px; border-radius:12px; object-fit:cover; display:block; border:1px solid #e5e7eb; background:#ffffff;";

  const htmlLogo = attachments.length
    ? `<img src="cid:${logoCid}" alt="${orgName}" style="${logoImgStyle}" />`
    : logoUrl && /^https?:\/\//i.test(logoUrl)
      ? `<img src="${logoUrl}" alt="${orgName}" style="${logoImgStyle}" />`
      : `<div style="font-weight:700; letter-spacing:0.12em; color:#156372;">${orgName}</div>`;

  const html =
    `<!doctype html>` +
    `<html><head><meta charset="utf-8" /></head>` +
    `<body style="margin:0; padding:0; background:#ffffff; font-family:Arial,Helvetica,sans-serif; color:#111827;">` +
    `<div style="max-width:720px; margin:0 auto; padding:32px 24px;">` +
    `<div style="margin-bottom:20px;">${htmlLogo}</div>` +
    `<h2 style="margin:0 0 12px; font-size:28px; font-weight:700;">Hi ${safeName},</h2>` +
    `<p style="margin:0 0 18px; font-size:14px; line-height:1.6; color:#374151;">` +
    `You have been invited by the admin of <b>${orgName}</b> to join their organization. Click below to view the invitation.` +
    `</p>` +
    `<div style="margin:20px 0 10px;">` +
    `<a href="${viewInvitationUrl}" style="display:inline-block; background:#156372; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:4px; font-weight:700; font-size:14px;">View Invitation</a>` +
    `</div>` +
    `<div style="font-size:12px; color:#6b7280; margin-bottom:18px;">This invitation will expire in ${expiresDays} days.</div>` +
    (tempPassword
      ? `<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:12px 14px; font-size:13px; color:#111827; margin:14px 0 18px;">` +
        `<div style="font-weight:700; margin-bottom:6px;">Temporary Password</div>` +
        `<div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${tempPassword}</div>` +
        `</div>`
      : ``) +
    `<p style="margin:0 0 6px; font-size:13px; color:#374151;">If you have any trouble, please contact your administrator.</p>` +
    `<p style="margin:18px 0 0; font-size:13px; color:#374151;">Regards,<br/>${orgName}</p>` +
    `<div style="margin-top:18px; border-top:2px solid #156372;"></div>` +
    `</div></body></html>`;

  const result = await sendSmtpMail(
    {
      host: String(sender.smtpHost || ""),
      port: Number(sender.smtpPort || 0),
      secure: Boolean(sender.smtpSecure),
      user: String(sender.smtpUser || ""),
      pass: String(sender.smtpPassword || ""),
    },
    {
      from: `${senderName} <${String(sender.email || sender.smtpUser || "")}>`,
      replyTo: String(sender.email || sender.smtpUser || "") || undefined,
      to: String(user.email || ""),
      subject,
      text,
      html,
      attachments,
    }
  );

  if (!result.ok) {
    return res.status(400).json({ success: false, message: result.error || "Failed to send invitation", data: null });
  }

  await User.updateOne({ _id: id, organizationId: orgId }, { $set: { inviteSentAt: new Date() } });

  return res.json({
    success: true,
    message: `Invitation email sent to ${String(user.email || "")}`,
      data: {
      ok: true,
      to: String(user.email || ""),
      from: `${senderName} <${String(sender.email || sender.smtpUser || "")}>`,
      senderId: String(sender._id || sender.id || ""),
      smtpHost: String(sender.smtpHost || ""),
      smtpPort: Number(sender.smtpPort || 0),
      smtpDebug: (result as any).debug || null,
    },
  });
};
