import express from "express";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { SenderEmail } from "../models/SenderEmail.js";
import { EmailTemplate } from "../models/EmailTemplate.js";
import { EmailRelayServer } from "../models/EmailRelayServer.js";
import { EmailNotificationPreferences } from "../models/EmailNotificationPreferences.js";
import { Organization } from "../models/Organization.js";
import { FRONTEND_URL, SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from "../config/env.js";
import { sendSmtpMail } from "../services/smtpMailer.js";

const normalizeEmail = (value: unknown) => String(typeof value === "string" ? value : "").trim().toLowerCase();
const normalizeName = (value: unknown) => String(typeof value === "string" ? value : "").trim();
const normalizeString = (value: unknown) => String(typeof value === "string" ? value : "").trim();
const normalizeNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const sanitizeSender = (row: any) => {
  if (!row) return row;
  const {
    smtpPassword: _smtpPassword,
    password: _password,
    verificationToken: _verificationToken,
    verificationTokenExpiresAt: _verificationTokenExpiresAt,
    verificationSentAt: _verificationSentAt,
    otpCodeHash: _otpCodeHash,
    otpExpiresAt: _otpExpiresAt,
    otpSentAt: _otpSentAt,
    invitationAcceptedAt: _invitationAcceptedAt,
    ...rest
  } = row;
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
  if (fallback) return fallback;

  if (SMTP_HOST && SMTP_PORT > 0 && SMTP_USER && SMTP_PASS) {
    return {
      smtpHost: SMTP_HOST,
      smtpPort: SMTP_PORT,
      smtpUser: SMTP_USER,
      smtpPassword: SMTP_PASS,
      smtpSecure: SMTP_PORT === 465,
      email: String(SMTP_FROM || SMTP_USER || "").trim(),
      name: "Organization",
      isEnvFallback: true,
    };
  }

  return null;
};

const sha256 = (value: string) => crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const getRequestOrigin = (req?: express.Request) => {
  const origin = String(req?.get("origin") || req?.headers.origin || "").trim().replace(/\/+$/, "");
  if (origin) return origin;
  return String(FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
};

const buildInvitationEmailHtml = ({
  senderName,
  senderEmail,
  orgName,
  invitationUrl,
}: {
  senderName: string;
  senderEmail: string;
  orgName: string;
  invitationUrl: string;
}) =>
  `<!doctype html><html><head><meta charset="utf-8" /></head>` +
  `<body style="margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111827;">` +
  `<div style="max-width:760px;margin:0 auto;padding:18px 18px 8px;">` +
  `<h2 style="margin:0 0 20px;font-size:28px;font-weight:700;">Hi ${senderName},</h2>` +
  `<p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#444;">` +
  `You have been invited by the admin of <b>${orgName}</b> to join their email sender list. ` +
  `Click below to either accept or reject the invitation.` +
  `</p>` +
  `<div style="margin:18px 0 6px;">` +
  `<a href="${invitationUrl}" style="display:inline-block;background:#156372;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:18px;font-weight:700;">View Invitation</a>` +
  `</div>` +
  `<div style="font-size:14px;color:#4b5563;font-style:italic;margin-bottom:22px;">This invitation will expire in 25 days.</div>` +
  `<p style="margin:0;font-size:15px;line-height:1.7;color:#444;">` +
  `If you have any trouble in accepting the invitation or if you think that you've received this email by mistake, please contact ` +
  `<a href="mailto:${senderEmail}" style="color:#1d4ed8;text-decoration:none;">${senderEmail}</a>.` +
  `</p>` +
  `</div></body></html>`;

const buildOtpEmailHtml = ({
  senderName,
  senderEmail,
  orgName,
  otp,
  invitationUrl,
  expiresSeconds,
}: {
  senderName: string;
  senderEmail: string;
  orgName: string;
  otp: string;
  invitationUrl: string;
  expiresSeconds: number;
}) =>
  `<!doctype html><html><head><meta charset="utf-8" /></head>` +
  `<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">` +
  `<div style="max-width:720px;margin:0 auto;padding:32px 24px;">` +
  `<h2 style="margin:0 0 12px;font-size:28px;font-weight:700;">Verify Sender Email</h2>` +
  `<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#374151;">` +
  `Hi ${senderName}, please verify <b>${senderEmail}</b> for <b>${orgName}</b>.` +
  `</p>` +
  `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin:18px 0;">` +
  `<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">OTP Code</div>` +
  `<div style="font-size:34px;font-weight:800;letter-spacing:0.18em;">${otp}</div>` +
  `</div>` +
  `<div style="margin:16px 0 8px;">` +
  `<a href="${invitationUrl}" style="display:inline-block;background:#156372;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:16px;font-weight:700;">View Invitation</a>` +
  `</div>` +
  `<p style="margin:0;font-size:12px;color:#6b7280;font-style:italic;">This code expires in ${expiresSeconds} seconds.</p>` +
  `</div></body></html>`;

const saveInvitationToken = async (senderId: any, organizationId: any, token: string) => {
  const tokenExpiresAt = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
  await SenderEmail.updateOne(
    { _id: senderId, organizationId },
    {
      $set: {
        verificationToken: token,
        verificationTokenExpiresAt: tokenExpiresAt,
        verificationSentAt: new Date(),
        verificationState: "invited",
      },
      $unset: {
        otpCodeHash: "",
        otpExpiresAt: "",
        otpSentAt: "",
        invitationAcceptedAt: "",
      },
    }
  );
  return tokenExpiresAt;
};

const sendSenderInvitationMail = async ({
  orgId,
  sender,
  req,
}: {
  orgId: any;
  sender: any;
  req: express.Request;
}) => {
  const smtpSender: any = await pickSmtpSender(orgId);
  if (!smtpSender) {
    return { ok: false as const, error: "SMTP sender is not configured. Go to Settings > Emails > New Sender and add SMTP Host/User/Password." };
  }

  const org: any = await Organization.findById(orgId).lean();
  const orgName = String(org?.name || "Organization");
  const senderName = String(sender.name || orgName || "Organization").trim() || orgName;
  const senderEmail = String(smtpSender.email || smtpSender.smtpUser || "").trim();
  const invitationToken = crypto.randomUUID().replace(/-/g, "");
  const tokenExpiresAt = await saveInvitationToken(sender._id, orgId, invitationToken);
  const invitationUrl = `${getRequestOrigin(req)}/sender-verification?senderId=${encodeURIComponent(String(sender._id))}&token=${encodeURIComponent(invitationToken)}`;

  const subject = `Verify sender email for ${orgName}`;
  const text =
    `Hi ${senderName},\n\n` +
    `You have been invited by the admin of ${orgName} to verify ${String(sender.email || "")}.\n` +
    `View Invitation: ${invitationUrl}\n` +
    `This invitation will expire in 25 days.\n\n` +
    `If you have any trouble in accepting the invitation or if you think that you've received this email by mistake, please contact ${senderEmail}.\n`;

  const html = buildInvitationEmailHtml({
    senderName,
    senderEmail,
    orgName,
    invitationUrl,
  });

  const result = await sendSmtpMail(
    {
      host: String(smtpSender.smtpHost || ""),
      port: Number(smtpSender.smtpPort || 0),
      secure: Boolean(smtpSender.smtpSecure),
      user: String(smtpSender.smtpUser || ""),
      pass: String(smtpSender.smtpPassword || ""),
    },
    {
      from: `${String(smtpSender.name || orgName || "Organization")} <${String(smtpSender.email || smtpSender.smtpUser || "")}>`,
      replyTo: String(smtpSender.email || smtpSender.smtpUser || "") || undefined,
      to: String(sender.email || ""),
      subject,
      text,
      html,
    }
  );

  if (!result.ok) return { ok: false as const, error: result.error || "Failed to send invitation email" };
  return { ok: true as const, tokenExpiresAt };
};

const sendOtpMail = async ({
  orgId,
  sender,
  req,
}: {
  orgId: any;
  sender: any;
  req?: express.Request;
}) => {
  const smtpSender: any = await pickSmtpSender(orgId);
  if (!smtpSender) {
    return { ok: false as const, error: "SMTP sender is not configured. Go to Settings > Emails > New Sender and add SMTP Host/User/Password." };
  }

  const org: any = await Organization.findById(orgId).lean();
  const orgName = String(org?.name || "Organization");
  const senderName = String(sender.name || orgName || "Organization").trim() || orgName;
  const invitationUrl = `${getRequestOrigin(req)}/sender-verification?senderId=${encodeURIComponent(String(sender._id))}&token=${encodeURIComponent(String(sender.verificationToken || ""))}`;
  const otp = generateOtp();
  const otpCodeHash = sha256(otp);
  const otpExpiresAt = new Date(Date.now() + 90 * 1000);
  await SenderEmail.updateOne(
    { _id: sender._id, organizationId: orgId },
    {
      $set: {
        otpCodeHash,
        otpExpiresAt,
        otpSentAt: new Date(),
        verificationState: "accepted",
      },
    }
  );

  const subject = `OTP code for ${orgName}`;
  const text =
    `Hi ${senderName},\n\n` +
    `Your verification OTP for ${orgName} is ${otp}.\n` +
    `This code expires in 90 seconds.\n`;
  const html = buildOtpEmailHtml({
    senderName,
    senderEmail: String(sender.email || ""),
    orgName,
    otp,
    invitationUrl,
    expiresSeconds: 90,
  });

  const result = await sendSmtpMail(
    {
      host: String(smtpSender.smtpHost || ""),
      port: Number(smtpSender.smtpPort || 0),
      secure: Boolean(smtpSender.smtpSecure),
      user: String(smtpSender.smtpUser || ""),
      pass: String(smtpSender.smtpPassword || ""),
    },
    {
      from: `${String(smtpSender.name || orgName || "Organization")} <${String(smtpSender.email || smtpSender.smtpUser || "")}>`,
      replyTo: String(smtpSender.email || smtpSender.smtpUser || "") || undefined,
      to: String(sender.email || ""),
      subject,
      text,
      html,
    }
  );

  if (!result.ok) return { ok: false as const, error: result.error || "Failed to send OTP email" };
  return { ok: true as const, otpExpiresAt };
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
  const requestedVerified = typeof req.body?.isVerified === "boolean" ? req.body.isVerified : false;

  const smtpHost = normalizeString(req.body?.smtpHost).slice(0, 255);
  const smtpPort = normalizeNumber(req.body?.smtpPort);
  const smtpUser = normalizeString(req.body?.smtpUser).slice(0, 255);
  const smtpPassword = normalizeString(req.body?.smtpPassword).slice(0, 1024);
  const smtpSecure = typeof req.body?.smtpSecure === "boolean" ? req.body.smtpSecure : false;
  const smtpConfigured = isSmtpConfigured({ smtpHost, smtpPort, smtpUser, smtpPassword });
  const willBeVerified = requestedVerified || smtpConfigured;
  const requestedPrimary = Boolean(req.body?.isPrimary) || (existingCount === 0 && willBeVerified);

  if (requestedPrimary && !willBeVerified) {
    return res.status(400).json({ success: false, message: "Verify the sender before making it primary.", data: null });
  }

  const created = await SenderEmail.create({
    organizationId: orgId,
    email,
    name,
    isPrimary: requestedPrimary,
    isVerified: willBeVerified,
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
  const current: any = await SenderEmail.findOne({ _id: id, organizationId: orgId }).lean();
  if (!current) return res.status(404).json({ success: false, message: "Sender not found", data: null });

  if (typeof req.body?.isVerified === "boolean") patch.isVerified = req.body.isVerified;
  if (typeof req.body?.isPrimary === "boolean") {
    const nextVerified = typeof patch.isVerified === "boolean" ? patch.isVerified : Boolean(current.isVerified);
    if (req.body.isPrimary && !nextVerified) {
      return res.status(400).json({ success: false, message: "Verify the sender before making it primary.", data: null });
    }
    patch.isPrimary = req.body.isPrimary;
  }

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
      const promote = await SenderEmail.findOne({ organizationId: orgId, isVerified: true }).sort({ createdAt: -1 });
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
    const promote = await SenderEmail.findOne({ organizationId: orgId, isVerified: true }).sort({ createdAt: -1 });
    if (promote) await SenderEmail.updateOne({ _id: promote._id }, { $set: { isPrimary: true } });
  }

  return res.json({ success: true, data: { id } });
};

export const getPrimarySenderEmail = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const primary: any = await SenderEmail.findOne({ organizationId: orgId, isPrimary: true, isVerified: true }).lean();
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

export const resendSenderVerificationEmail = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Missing sender id", data: null });

  const sender: any = await SenderEmail.findOne({ _id: id, organizationId: orgId }).lean();
  if (!sender) return res.status(404).json({ success: false, message: "Sender not found", data: null });
  if (!String(sender.email || "").trim()) {
    return res.status(400).json({ success: false, message: "Sender email is missing", data: null });
  }

  const result = await sendSenderInvitationMail({ orgId, sender, req });
  if (!result.ok) {
    return res.status(400).json({ success: false, message: result.error, data: null });
  }

  return res.json({
    success: true,
    message: "Invitation email sent.",
    data: {
      id,
      email: String(sender.email || ""),
      verificationSentAt: new Date().toISOString(),
    },
  });
};

export const getSenderInvitationPublic = async (req: express.Request, res: express.Response) => {
  const id = String(req.params.id || req.query?.senderId || "").trim();
  const token = String(req.query?.token || "").trim();
  if (!id || !token) return res.status(400).json({ success: false, message: "Missing invitation data", data: null });

  const sender: any = await SenderEmail.findOne({ _id: id, verificationToken: token }).lean();
  if (!sender) return res.status(404).json({ success: false, message: "Invitation link is invalid or expired.", data: null });

  const expiresAt = sender.verificationTokenExpiresAt ? new Date(sender.verificationTokenExpiresAt) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: "Invitation link has expired.", data: null });
  }

  const org: any = sender.organizationId ? await Organization.findById(sender.organizationId).lean() : null;
  return res.json({
    success: true,
    data: {
      id: String(sender._id),
      name: sender.name || "",
      email: sender.email || "",
      organizationName: String(org?.name || "Organization"),
      isVerified: Boolean(sender.isVerified),
      verificationState: String(sender.verificationState || "pending"),
      verificationSentAt: sender.verificationSentAt || null,
      otpExpiresAt: sender.otpExpiresAt || null,
      invitationAcceptedAt: sender.invitationAcceptedAt || null,
    },
  });
};

export const acceptSenderInvitationPublic = async (req: express.Request, res: express.Response) => {
  const id = String(req.params.id || "").trim();
  const token = String(req.body?.token || req.query?.token || "").trim();
  if (!id || !token) return res.status(400).json({ success: false, message: "Missing invitation data", data: null });

  const sender: any = await SenderEmail.findOne({ _id: id, verificationToken: token }).lean();
  if (!sender) return res.status(404).json({ success: false, message: "Invitation link is invalid or expired.", data: null });

  const expiresAt = sender.verificationTokenExpiresAt ? new Date(sender.verificationTokenExpiresAt) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: "Invitation link has expired.", data: null });
  }

  const otpResult = await sendOtpMail({ orgId: sender.organizationId, sender, req });
  if (!otpResult.ok) return res.status(400).json({ success: false, message: otpResult.error, data: null });

  await SenderEmail.updateOne(
    { _id: id },
    { $set: { invitationAcceptedAt: new Date(), verificationState: "accepted" } }
  );

  return res.json({
    success: true,
    message: "OTP sent to the sender email.",
    data: {
      id,
      otpExpiresAt: otpResult.otpExpiresAt,
      expiresInSeconds: 90,
    },
  });
};

export const rejectSenderInvitationPublic = async (req: express.Request, res: express.Response) => {
  const id = String(req.params.id || "").trim();
  const token = String(req.body?.token || req.query?.token || "").trim();
  if (!id || !token) return res.status(400).json({ success: false, message: "Missing invitation data", data: null });

  const sender: any = await SenderEmail.findOne({ _id: id, verificationToken: token }).lean();
  if (!sender) return res.status(404).json({ success: false, message: "Invitation link is invalid or expired.", data: null });

  await SenderEmail.updateOne(
    { _id: id },
    { $set: { verificationState: "rejected" } }
  );

  return res.json({ success: true, message: "Invitation rejected.", data: { id } });
};

export const resendSenderOtpPublic = async (req: express.Request, res: express.Response) => {
  const id = String(req.params.id || "").trim();
  const token = String(req.body?.token || req.query?.token || "").trim();
  if (!id || !token) return res.status(400).json({ success: false, message: "Missing invitation data", data: null });

  const sender: any = await SenderEmail.findOne({ _id: id, verificationToken: token }).lean();
  if (!sender) return res.status(404).json({ success: false, message: "Invitation link is invalid or expired.", data: null });

  const otpResult = await sendOtpMail({ orgId: sender.organizationId, sender, req });
  if (!otpResult.ok) return res.status(400).json({ success: false, message: otpResult.error, data: null });

  return res.json({
    success: true,
    message: "OTP resent successfully.",
    data: {
      id,
      otpExpiresAt: otpResult.otpExpiresAt,
      expiresInSeconds: 90,
    },
  });
};

export const verifySenderOtpPublic = async (req: express.Request, res: express.Response) => {
  const id = String(req.params.id || "").trim();
  const token = String(req.body?.token || req.query?.token || "").trim();
  const otp = String(req.body?.otp || req.query?.otp || "").trim();
  if (!id || !token || !otp) {
    return res.status(400).json({ success: false, message: "Missing OTP data", data: null });
  }

  const sender: any = await SenderEmail.findOne({ _id: id, verificationToken: token }).lean();
  if (!sender) return res.status(404).json({ success: false, message: "Invitation link is invalid or expired.", data: null });

  const otpExpiresAt = sender.otpExpiresAt ? new Date(sender.otpExpiresAt) : null;
  if (!otpExpiresAt || otpExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: "OTP expired. Please resend a new code.", data: null });
  }

  if (sha256(otp) !== String(sender.otpCodeHash || "")) {
    return res.status(400).json({ success: false, message: "Invalid OTP.", data: null });
  }

  await SenderEmail.updateOne(
    { _id: id },
    {
      $set: { isVerified: true, verificationState: "verified" },
      $unset: {
        verificationToken: "",
        verificationTokenExpiresAt: "",
        verificationSentAt: "",
        otpCodeHash: "",
        otpExpiresAt: "",
        otpSentAt: "",
        invitationAcceptedAt: "",
      },
    }
  );

  return res.json({
    success: true,
    message: "Sender verified successfully.",
    data: { id, verified: true },
  });
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
