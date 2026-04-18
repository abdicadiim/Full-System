import express from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {
  AUTH_BYPASS,
  AUTH_SMTP_FROM,
  AUTH_SMTP_HOST,
  AUTH_SMTP_PASS,
  AUTH_SMTP_PORT,
  AUTH_SMTP_USER,
  JWT_SECRET,
  MONGO_URI,
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_USER,
  NODE_ENV,
} from "../config/env.js";
import { Organization } from "../models/Organization.js";
import { User } from "../models/User.js";
import { SenderEmail } from "../models/SenderEmail.js";
import { Role } from "../models/Role.js";
import { Location } from "../models/Location.js";
import { TransactionNumberSeries } from "../models/TransactionNumberSeries.js";
import { buildAuthUserData, clearSessionCookie, getAuthedUser, getDevAuthedUser, issueSessionToken, setSessionCookie } from "../midelwares/auth.js";
import mongoose from "mongoose";
import { sendSmtpMail } from "../services/smtpMailer.js";

const isConfiguredForRealAuth = () => Boolean(MONGO_URI) && Boolean(JWT_SECRET) && mongoose.connection.readyState === 1;
const normalizeEmail = (value: unknown) => String(typeof value === "string" ? value : "").trim().toLowerCase();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sha256 = (value: string) => crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const LOGIN_OTP_EXPIRES_IN_SECONDS = 90;
const PASSWORD_RESET_EXPIRES_IN_SECONDS = 90;
const EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 300;
const isUserEmailVerified = (user: any) => (user as any)?.emailVerified !== false;
const looksLikeBcryptHash = (value: unknown) => {
  const hash = String(value || "").trim();
  return /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
};

const matchesStoredPassword = async (user: any, password: string) => {
  const rawPassword = String(password ?? "");
  const trimmedPassword = rawPassword.trim();
  const hashCandidates = [
    user?.passwordHash,
    user?.password,
    user?.hashedPassword,
    user?.passHash,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const candidate of hashCandidates) {
    if (candidate === rawPassword || candidate === trimmedPassword) {
      return true;
    }
    if (looksLikeBcryptHash(candidate)) {
      const rawMatch = await bcrypt.compare(rawPassword, candidate).catch(() => false);
      if (rawMatch) return true;
      if (trimmedPassword !== rawPassword) {
        const trimmedMatch = await bcrypt.compare(trimmedPassword, candidate).catch(() => false);
        if (trimmedMatch) return true;
      }
      continue;
    }
    if (candidate && candidate === trimmedPassword) {
      return true;
    }
  }

  return false;
};

const getAppDisplayName = (app: unknown) => {
  const value = String(app || "").trim().toLowerCase();
  if (value === "billing") return "Billing";
  if (value === "invoice") return "Invoice";
  return "Full System";
};

const getAuthBrandName = (app: unknown) => `Taban ${getAppDisplayName(app)}`;

const buildAuthEmailHtml = ({
  brandName,
  title,
  headline,
  description,
  code,
}: {
  brandName: string;
  title: string;
  headline: string;
  description: string;
  code: string;
}) =>
  `<!doctype html>` +
  `<html><head><meta charset="utf-8" /></head>` +
  `<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">` +
  `<div style="max-width:640px;margin:0 auto;padding:32px 20px;">` +
  `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">` +
  `<div style="padding:28px 28px 12px;background:linear-gradient(135deg,#156372 0%,#0f4f5d 100%);color:#fff;">` +
  `<div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">${brandName}</div>` +
  `<h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${title}</h1>` +
  `</div>` +
  `<div style="padding:28px;">` +
  `<h2 style="margin:0 0 10px;font-size:22px;line-height:1.3;">${headline}</h2>` +
  `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#334155;">${description}</p>` +
  `<div style="display:inline-block;padding:14px 22px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;font-size:32px;font-weight:800;letter-spacing:0.32em;color:#1d4ed8;">${code}</div>` +
  `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#64748b;">If you did not request this email, you can safely ignore it.</p>` +
  `</div></div></div></body></html>`;

const pickAuthSender = async (organizationId?: any) => {
  if (AUTH_SMTP_HOST && AUTH_SMTP_PORT > 0 && AUTH_SMTP_USER && AUTH_SMTP_PASS) {
    return {
      email: String(AUTH_SMTP_FROM || AUTH_SMTP_USER || "").trim(),
      name: "Taban",
      smtpHost: AUTH_SMTP_HOST,
      smtpPort: AUTH_SMTP_PORT,
      smtpUser: AUTH_SMTP_USER,
      smtpPassword: AUTH_SMTP_PASS,
      smtpSecure: AUTH_SMTP_PORT === 465,
      isEnvFallback: true,
    };
  }

  if (organizationId) {
    const primary: any = await SenderEmail.findOne({
      organizationId,
      isPrimary: true,
      isVerified: true,
      smtpHost: { $ne: "" },
      smtpUser: { $ne: "" },
      smtpPassword: { $ne: "" },
      smtpPort: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .lean();
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
  }

  if (SMTP_HOST && SMTP_PORT > 0 && SMTP_USER && SMTP_PASS) {
    return {
      email: String(SMTP_FROM || SMTP_USER || "").trim(),
      name: "Taban",
      smtpHost: SMTP_HOST,
      smtpPort: SMTP_PORT,
      smtpUser: SMTP_USER,
      smtpPassword: SMTP_PASS,
      smtpSecure: SMTP_PORT === 465,
      isEnvFallback: true,
    };
  }

  return null;
};

const sendAuthCodeEmail = async ({
  organizationId,
  senderName,
  to,
  subject,
  text,
  html,
}: {
  organizationId?: any;
  senderName?: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
  const sender: any = await pickAuthSender(organizationId);
  if (!sender) {
    if (NODE_ENV !== "production") {
      return { ok: true as const, skipped: true as const };
    }
    return {
      ok: false as const,
      error:
        "SMTP sender is not configured. Set AUTH_SMTP_HOST/AUTH_SMTP_PORT/AUTH_SMTP_USER/AUTH_SMTP_PASS or add a verified sender in Settings > Emails.",
    };
  }

  const result = await sendSmtpMail(
    {
      host: String(sender.smtpHost || ""),
      port: Number(sender.smtpPort || 0),
      secure: Boolean(sender.smtpSecure),
      user: String(sender.smtpUser || ""),
      pass: String(sender.smtpPassword || ""),
    },
    {
      from: `${String(senderName || sender.name || "Taban")} <${String(sender.email || sender.smtpUser || "")}>`,
      replyTo: String(sender.email || sender.smtpUser || "") || undefined,
      to,
      subject,
      text,
      html,
    }
  );

  if (!result.ok) return { ok: false as const, error: result.error || "Failed to send email" };
  return { ok: true as const, debug: result.debug || null };
};

const findUserByEmail = async (email: string) =>
  (await User.findOne({ email }).lean()) ||
  (await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") } }).lean());

const hasRealAuthDatabase = () => Boolean(MONGO_URI) && mongoose.connection.readyState === 1;

const verifyEmailVerificationCodeForUser = (user: any, code: string) => {
  const verificationExpiresAt = user?.emailVerificationExpiresAt ? new Date(user.emailVerificationExpiresAt) : null;
  const verificationHash = String(user?.emailVerificationHash || "");
  if (!verificationExpiresAt || verificationExpiresAt.getTime() < Date.now()) {
    return { ok: false as const, message: "Verification code expired. Please request a new one." };
  }
  if (!verificationHash || sha256(code) !== verificationHash) {
    return { ok: false as const, message: "Invalid verification code" };
  }
  return { ok: true as const };
};

const verifyPasswordResetCodeForUser = (user: any, code: string) => {
  const resetExpiresAt = user?.passwordResetExpiresAt ? new Date(user.passwordResetExpiresAt) : null;
  const resetHash = String(user?.passwordResetHash || "");
  if (!resetExpiresAt || resetExpiresAt.getTime() < Date.now()) {
    return { ok: false as const, message: "Reset code expired. Please request a new one." };
  }
  if (!resetHash || sha256(code) !== resetHash) {
    return { ok: false as const, message: "Invalid reset code" };
  }
  return { ok: true as const };
};

const getEmailVerifiedPatch = () => ({
  emailVerified: true,
  emailVerifiedAt: new Date(),
  emailVerificationHash: "",
  emailVerificationExpiresAt: null,
  emailVerificationSentAt: null,
});

const sendEmailVerificationCode = async ({
  user,
  app,
}: {
  user: any;
  app?: unknown;
}) => {
  const verificationCode = generateOtp();
  const verificationHash = sha256(verificationCode);
  const expiresInSeconds = EMAIL_VERIFICATION_EXPIRES_IN_SECONDS;
  const verificationExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerificationHash: verificationHash,
        emailVerificationExpiresAt: verificationExpiresAt,
        emailVerificationSentAt: new Date(),
      },
    }
  );

  const appName = getAppDisplayName(app);
  const brandName = getAuthBrandName(app);
  const subject = `Verify your ${appName} email`;
  const text =
    `Use this code to verify your ${appName} email: ${verificationCode}\n\n` +
    `This code expires in 5 minutes.\n` +
    `If you did not request this email, you can ignore it.`;
  const html = buildAuthEmailHtml({
    brandName,
    title: "Email Verification",
    headline: `Verify your email for ${appName}`,
    description:
      `Hi ${String((user as any).name || user.email || "").trim() || "there"}, enter the code below to verify your email and continue to ${appName}.`,
    code: verificationCode,
  });

  const mail = await sendAuthCodeEmail({
    organizationId: user.organizationId,
    senderName: brandName,
    to: String(user.email || ""),
    subject,
    text,
    html,
  });
  if (!mail.ok) {
    return { ok: false as const, error: mail.error };
  }

  return {
    ok: true as const,
    data: {
      email: String(user.email || ""),
      expiresInSeconds,
      ...(NODE_ENV !== "production" ? { debugCode: verificationCode } : {}),
    },
  };
};

export const signup = async (req: express.Request, res: express.Response) => {
  const realAuthAvailable = hasRealAuthDatabase();

  if (AUTH_BYPASS && !realAuthAvailable) {
    const email = String(req.body?.email ?? "dev@example.com").trim().toLowerCase() || "dev@example.com";
    const devUser = await getDevAuthedUser();
    return res.status(201).json({ success: true, data: { id: devUser.id, name: devUser.name, email, organizationId: devUser.organizationId } });
  }
  if (!realAuthAvailable) {
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

  const exists = await findUserByEmail(email);
  if (exists) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists. Please log in.",
      data: { exists: true },
    });
  }

  let org: any = null;
  try {
    org = await Organization.create({ name, primaryContactEmail: email });
    let headLocationId: string | null = null;
    try {
      const createdLocation = await Location.create({
        organizationId: org._id,
        name: "Head Location",
        type: "Business",
        isDefault: true,
        status: "Active",
        primaryContact: name,
        website: "",
        logo: org.logoUrl || "",
      });
      headLocationId = String(createdLocation._id);
    } catch {
      // ignore location creation failures for now
    }

    if (headLocationId) {
      try {
        const modules = [
          { module: "invoice", prefix: "INV-", seriesName: "Default", startingNumber: "1000", nextNumber: 1000, isDefault: true },
          { module: "sales_receipt", prefix: "SR-", seriesName: "Default", startingNumber: "1000", nextNumber: 1000 },
        ];
        await TransactionNumberSeries.insertMany(
          modules.map((mod) => ({
            organizationId: org._id,
            seriesName: mod.seriesName,
            module: mod.module,
            name: mod.module,
            moduleKey: mod.module,
            prefix: mod.prefix,
            startingNumber: mod.startingNumber,
            nextNumber: mod.nextNumber || 1,
            restartNumbering: "none",
            isDefault: Boolean(mod.isDefault),
            locationIds: [headLocationId],
            status: "Active",
          })),
          { ordered: false }
        );
      } catch {
        // swallow duplicates or failures silently
      }
    }

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
    const created = await User.create({
      name,
      email,
      passwordHash,
      organizationId: org._id,
      role: "admin",
      sessionVersion: 0,
      emailVerified: false,
      emailVerifiedAt: null,
    });
    setSessionCookie(res, String(created._id));
    const token = issueSessionToken(String(created._id), Number((created as any).sessionVersion || 0));
    const authUser = await buildAuthUserData(created);
    return res.status(201).json({
      success: true,
      message: "Account created. Please verify your email to continue.",
      data: {
        ...authUser,
        requiresEmailVerification: true,
      },
      token,
    });
  } catch (error: any) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      if (org?._id) {
        await Organization.deleteOne({ _id: org._id }).catch(() => undefined);
      }
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in.",
        data: { exists: true },
      });
    }
    throw error;
  }
};

export const checkEmailExists = async (req: express.Request, res: express.Response) => {
  const realAuthAvailable = hasRealAuthDatabase();

  if (!realAuthAvailable) {
    // Avoid hard-failing the login UX when auth DB isn't configured in local/dev.
    return res.json({
      success: true,
      message: AUTH_BYPASS ? "Auth bypass enabled" : "Auth/DB not configured",
      data: { exists: false },
    });
  }

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required", data: null });
  }

  const existingUser = await findUserByEmail(email);
  return res.json({ success: true, data: { exists: Boolean(existingUser) } });
};

export const login = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = String(req.body?.email ?? "dev@example.com").trim().toLowerCase() || "dev@example.com";
    const devUser = await getDevAuthedUser();
    return res.json({ success: true, data: { id: devUser.id, name: devUser.name, email, organizationId: devUser.organizationId } });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? "");
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required", data: null });
  }

  const user =
    (await User.findOne({ email }).lean()) ||
    (await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") } }).lean());
  if (!user) {
    return res.status(200).json({
      success: false,
      message: "Email address not found.",
      data: null,
      code: 404,
    });
  }

  if ((user as any).status === "Inactive") {
    return res.status(200).json({ success: false, message: "User is inactive", data: null, code: 403 });
  }

  const ok = await matchesStoredPassword(user, password);
  if (!ok) {
    return res.status(200).json({
      success: false,
      message: "Incorrect password.",
      data: null,
      code: 401,
    });
  }

  if (!isUserEmailVerified(user)) {
    return res.status(200).json({
      success: false,
      message: "Please verify your email before signing in.",
      data: {
        requiresEmailVerification: true,
        email,
      },
      code: 403,
    });
  }

  // Treat first successful login as invitation acceptance.
  if ((user as any).status === "Invited") {
    await User.updateOne({ _id: user._id }, { $set: { status: "Active", inviteAcceptedAt: new Date() } });
  }

  const sessionVersion = Number((user as any).sessionVersion || 0);
  setSessionCookie(res, String(user._id), sessionVersion);
  const token = issueSessionToken(String(user._id), sessionVersion);
  const authUser = await buildAuthUserData(user);
  return res.json({
    success: true,
    data: authUser,
    token,
  });
};

export const requestLoginOtp = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = normalizeEmail(req.body?.email || "dev@example.com") || "dev@example.com";
    return res.json({
      success: true,
      message: "Development OTP accepted.",
      data: { email, debugCode: "123456", expiresInSeconds: 90 },
    });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required", data: null });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ success: false, message: "User is not recognized.", data: null });
  }
  if ((user as any).status === "Inactive") {
    return res.status(403).json({ success: false, message: "User is inactive", data: null });
  }

  const otp = generateOtp();
  const otpHash = sha256(otp);
  const expiresInSeconds = LOGIN_OTP_EXPIRES_IN_SECONDS;
  const otpExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        loginOtpHash: otpHash,
        loginOtpExpiresAt: otpExpiresAt,
        loginOtpSentAt: new Date(),
      },
    }
  );

  const appName = getAppDisplayName(req.body?.app);
  const brandName = getAuthBrandName(req.body?.app);
  const subject = `Your ${appName} sign-in code`;
  const text =
    `Your ${appName} sign-in OTP is ${otp}.\n\n` +
    `This code expires in 90 seconds.\n` +
    `If you did not request this, ignore this email.`;
  const html = buildAuthEmailHtml({
    brandName,
    title: "Email OTP Sign-in",
    headline: `Use this code to sign in to ${appName}`,
    description:
      `Hi ${String((user as any).name || user.email || "").trim() || "there"}, enter the code below to continue signing in to ${appName}.`,
    code: otp,
  });

  const mail = await sendAuthCodeEmail({
    organizationId: user.organizationId,
    senderName: brandName,
    to: String(user.email || ""),
    subject,
    text,
    html,
  });
  if (!mail.ok) return res.status(400).json({ success: false, message: mail.error, data: null });

  return res.json({
    success: true,
    message: "If the email exists, an OTP has been sent.",
    data: {
      email,
      expiresInSeconds,
      ...(NODE_ENV !== "production" ? { debugCode: otp } : {}),
    },
  });
};

export const verifyLoginOtp = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = normalizeEmail(req.body?.email || "dev@example.com") || "dev@example.com";
    const devUser = await getDevAuthedUser();
    return res.json({
      success: true,
      data: { id: devUser.id, name: devUser.name, email, organizationId: devUser.organizationId },
      token: "dev-token",
    });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required", data: null });
  }

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ success: false, message: "Invalid OTP", data: null });
  if ((user as any).status === "Inactive") {
    return res.status(403).json({ success: false, message: "User is inactive", data: null });
  }

  const otpExpiresAt = (user as any).loginOtpExpiresAt ? new Date((user as any).loginOtpExpiresAt) : null;
  const otpHash = String((user as any).loginOtpHash || "");
  if (!otpExpiresAt || otpExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: "OTP expired. Please request a new code.", data: null });
  }
  if (!otpHash || sha256(otp) !== otpHash) {
    return res.status(400).json({ success: false, message: "Invalid OTP", data: null });
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        loginOtpHash: "",
        loginOtpExpiresAt: null,
        loginOtpSentAt: null,
        ...(isUserEmailVerified(user) ? {} : getEmailVerifiedPatch()),
        ...((user as any).status === "Invited" ? { status: "Active", inviteAcceptedAt: new Date() } : {}),
      },
    }
  );

  const updated = await User.findById(user._id).lean();
  const sessionVersion = Number((updated as any)?.sessionVersion || (user as any).sessionVersion || 0);
  setSessionCookie(res, String(user._id), sessionVersion);
  const token = issueSessionToken(String(user._id), sessionVersion);
  const authUser = await buildAuthUserData(updated || user);
  return res.json({
    success: true,
    data: authUser,
    token,
  });
};

export const requestEmailVerification = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = normalizeEmail(req.body?.email || "dev@example.com") || "dev@example.com";
    return res.json({
      success: true,
      message: "Development verification code ready.",
      data: { email, debugCode: "123456", expiresInSeconds: EMAIL_VERIFICATION_EXPIRES_IN_SECONDS },
    });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required", data: null });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ success: false, message: "User is not recognized.", data: null });
  }
  if ((user as any).status === "Inactive") {
    return res.status(403).json({ success: false, message: "User is inactive", data: null });
  }
  if (isUserEmailVerified(user)) {
    return res.json({
      success: true,
      message: "Email already verified.",
      data: { email, alreadyVerified: true },
    });
  }

  const verification = await sendEmailVerificationCode({ user, app: req.body?.app });
  if (!verification.ok) {
    return res.status(400).json({ success: false, message: verification.error, data: null });
  }

  return res.json({
    success: true,
    message: "Verification code sent.",
    data: verification.data,
  });
};

export const verifyEmailVerification = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = normalizeEmail(req.body?.email || "dev@example.com") || "dev@example.com";
    return res.json({
      success: true,
      data: { id: "dev", name: "Dev User", email, organizationId: "dev_org", emailVerified: true },
      token: "dev-token",
    });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and verification code are required", data: null });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid verification code", data: null });
  }
  if ((user as any).status === "Inactive") {
    return res.status(403).json({ success: false, message: "User is inactive", data: null });
  }
  if (isUserEmailVerified(user)) {
    return res.status(200).json({
      success: false,
      message: "This email is already verified. Please sign in.",
      data: { alreadyVerified: true, email },
      code: 409,
    });
  }

  const validation = verifyEmailVerificationCodeForUser(user, code);
  if (!validation.ok) {
    return res.status(400).json({ success: false, message: validation.message, data: null });
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        ...getEmailVerifiedPatch(),
        ...((user as any).status === "Invited" ? { status: "Active", inviteAcceptedAt: new Date() } : {}),
      },
    }
  );

  const updated = await User.findById(user._id).lean();
  const sessionVersion = Number((updated as any)?.sessionVersion || (user as any).sessionVersion || 0);
  setSessionCookie(res, String(user._id), sessionVersion);
  const token = issueSessionToken(String(user._id), sessionVersion);
  const authUser = await buildAuthUserData(updated || user);
  return res.json({
    success: true,
    message: "Email verified successfully.",
    data: authUser,
    token,
  });
};

export const requestPasswordReset = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = normalizeEmail(req.body?.email || "dev@example.com") || "dev@example.com";
    return res.json({
      success: true,
      message: "Development reset code ready.",
      data: { email, debugCode: "123456", expiresInSeconds: 90 },
    });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required", data: null });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ success: false, message: "User is not recognized.", data: null });
  }
  if ((user as any).status === "Inactive") {
    return res.status(403).json({ success: false, message: "User is inactive", data: null });
  }

  const resetCode = generateOtp();
  const resetHash = sha256(resetCode);
  const expiresInSeconds = PASSWORD_RESET_EXPIRES_IN_SECONDS;
  const resetExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetHash: resetHash,
        passwordResetExpiresAt: resetExpiresAt,
        passwordResetSentAt: new Date(),
      },
    }
  );

  const appName = getAppDisplayName(req.body?.app);
  const brandName = getAuthBrandName(req.body?.app);
  const subject = `Reset your ${appName} password`;
  const text =
    `Use this code to reset your ${appName} password: ${resetCode}\n\n` +
    `This code expires in 90 seconds.`;
  const html = buildAuthEmailHtml({
    brandName,
    title: "Password Reset",
    headline: `Reset your ${appName} password`,
    description:
      `Hi ${String((user as any).name || user.email || "").trim() || "there"}, enter the code below to continue resetting your password.`,
    code: resetCode,
  });

  const mail = await sendAuthCodeEmail({
    organizationId: user.organizationId,
    senderName: brandName,
    to: String(user.email || ""),
    subject,
    text,
    html,
  });
  if (!mail.ok) return res.status(400).json({ success: false, message: mail.error, data: null });

  return res.json({
    success: true,
    message: "If the email exists, a reset code has been sent.",
    data: {
      email,
      expiresInSeconds,
      ...(NODE_ENV !== "production" ? { debugCode: resetCode } : {}),
    },
  });
};

export const verifyPasswordResetCode = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    return res.json({ success: true, data: { verified: true } });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and reset code are required", data: null });
  }

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ success: false, message: "Invalid reset code", data: null });
  if ((user as any).status === "Inactive") {
    return res.status(403).json({ success: false, message: "User is inactive", data: null });
  }

  const validation = verifyPasswordResetCodeForUser(user, code);
  if (!validation.ok) {
    return res.status(400).json({ success: false, message: validation.message, data: null });
  }

  return res.json({ success: true, message: "Reset code verified.", data: { verified: true, email } });
};

export const resetPasswordWithCode = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const email = normalizeEmail(req.body?.email || "dev@example.com") || "dev@example.com";
    const devUser = await getDevAuthedUser();
    return res.json({
      success: true,
      data: { id: devUser.id, name: devUser.name, email, organizationId: devUser.organizationId },
      token: "dev-token",
    });
  }
  if (!isConfiguredForRealAuth()) {
    return res.status(500).json({ success: false, message: "Auth/DB not configured", data: null });
  }

  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  const newPassword = String(req.body?.newPassword || "");
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: "Email, code and new password are required", data: null });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters", data: null });
  }

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ success: false, message: "Invalid reset code", data: null });

  const validation = verifyPasswordResetCodeForUser(user, code);
  if (!validation.ok) {
    return res.status(400).json({ success: false, message: validation.message, data: null });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const nextName = typeof req.body?.name === "string" ? String(req.body.name).trim().slice(0, 120) : "";
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash,
        passwordResetHash: "",
        passwordResetExpiresAt: null,
        passwordResetSentAt: null,
        ...(isUserEmailVerified(user) ? {} : getEmailVerifiedPatch()),
        ...(nextName ? { name: nextName } : {}),
        ...(String((user as any).status || "").toLowerCase() === "invited" || (user as any).inviteAcceptedAt
          ? {
              status: "Active",
              inviteAcceptedAt: (user as any).inviteAcceptedAt || new Date(),
              inviteRejectedAt: null,
              inviteTokenHash: "",
              inviteTokenExpiresAt: null,
              inviteTokenSentAt: null,
            }
          : {}),
      },
    }
  );

  const sessionVersion = Number((user as any).sessionVersion || 0);
  setSessionCookie(res, String(user._id), sessionVersion);
  const token = issueSessionToken(String(user._id), sessionVersion);
  const updated = await User.findById(user._id).lean();
  const authUser = await buildAuthUserData(updated || user);
  return res.json({
    success: true,
    message: "Password updated successfully.",
    data: authUser,
    token,
  });
};

export const logout = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) return res.json({ success: true, data: { ok: true } });
  const authedUser = await getAuthedUser(req).catch(() => null);
  if (authedUser?.id && isConfiguredForRealAuth()) {
    await User.updateOne({ _id: authedUser.id }, { $inc: { sessionVersion: 1 } }).catch(() => null);
  }
  clearSessionCookie(res);
  return res.json({ success: true, data: { ok: true } });
};

export const me = async (req: express.Request, res: express.Response) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  const token = issueSessionToken(user.id, user.sessionVersion || 0);
  return res.json({ success: true, data: user, token });
};

export const updateMe = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    const photoUrl = typeof req.body?.photoUrl === "string" ? req.body.photoUrl.trim() : "";
    const devUser = await getDevAuthedUser();
    return res.json({
      success: true,
      data: { id: devUser.id, name: devUser.name, email: devUser.email, organizationId: devUser.organizationId, role: devUser.role, photoUrl },
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
  if (req.body?.activeTimer !== undefined) {
    if (req.body.activeTimer === null) {
      patch.activeTimer = null;
    } else {
      patch.activeTimer = req.body.activeTimer;
    }
  }

  const updated = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "User not found", data: null });
  const authUser = await buildAuthUserData(updated);

  return res.json({
    success: true,
    data: {
      ...authUser,
      activeTimer: (updated as any).activeTimer || null,
    },
  });
};
