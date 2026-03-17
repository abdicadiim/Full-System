import express from "express";
import mongoose from "mongoose";
import { ReportingTag } from "../models/ReportingTag.js";

const pickString = (v: unknown) => (typeof v === "string" ? v : "");
const pickBoolean = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const pickStringArray = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

const MAX_TAGS_PER_ORG = 10;
const MAX_OPTIONS_PER_TAG = 500;

const pagination = (pageRaw: any, limitRaw: any) => {
  const page = Math.max(1, Number(pageRaw || 1));
  const limit = Math.min(200, Math.max(1, Number(limitRaw || 50)));
  return { page, limit, skip: (page - 1) * limit };
};

export const listReportingTags = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const { page, limit, skip } = pagination(req.query.page, req.query.limit);
  const query = { organizationId: orgId };

  const [rows, total] = await Promise.all([
    ReportingTag.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ReportingTag.countDocuments(query),
  ]);

  return res.json({
    success: true,
    data: rows,
    pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
  });
};

export const getReportingTag = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  const row = await ReportingTag.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Reporting tag not found", data: null });
  return res.json({ success: true, data: row });
};

export const createReportingTag = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const count = await ReportingTag.countDocuments({ organizationId: orgId });
  if (count >= MAX_TAGS_PER_ORG) {
    return res.status(400).json({ success: false, message: `Maximum ${MAX_TAGS_PER_ORG} reporting tags allowed`, data: null });
  }

  const name = pickString(req.body?.name).trim();
  if (!name) return res.status(400).json({ success: false, message: "Reporting tag name required", data: null });

  const description = pickString(req.body?.description).trim();
  const appliesTo = pickStringArray(req.body?.appliesTo).map((s) => String(s).trim()).filter(Boolean);
  const moduleLevel = req.body?.moduleLevel && typeof req.body.moduleLevel === "object" ? req.body.moduleLevel : {};
  const isMandatory = Boolean(pickBoolean(req.body?.isMandatory) ?? false);
  const isActive = Boolean(pickBoolean(req.body?.isActive) ?? true);
  const options = pickStringArray(req.body?.options).map((s) => String(s).trim()).filter(Boolean);

  if (options.length > MAX_OPTIONS_PER_TAG) {
    return res.status(400).json({ success: false, message: `Maximum ${MAX_OPTIONS_PER_TAG} options allowed`, data: null });
  }

  try {
    const created = await ReportingTag.create({
      organizationId: orgId,
      name: name.slice(0, 80),
      description: description.slice(0, 500),
      appliesTo,
      moduleLevel,
      isMandatory,
      options,
      isActive,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    const code = e?.code;
    if (code === 11000) {
      return res.status(409).json({ success: false, message: "Reporting tag name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create reporting tag", data: null });
  }
};

export const updateReportingTag = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  const patch: Record<string, unknown> = {};

  const name = pickString(req.body?.name).trim();
  if (name) patch.name = name.slice(0, 80);

  const description = pickString(req.body?.description).trim();
  if (description) patch.description = description.slice(0, 500);

  if (Array.isArray(req.body?.appliesTo)) {
    patch.appliesTo = pickStringArray(req.body.appliesTo).map((s) => String(s).trim()).filter(Boolean);
  }

  if (req.body?.moduleLevel && typeof req.body.moduleLevel === "object") {
    patch.moduleLevel = req.body.moduleLevel;
  }

  const isMandatory = pickBoolean(req.body?.isMandatory);
  if (typeof isMandatory === "boolean") patch.isMandatory = isMandatory;

  const isActive = pickBoolean(req.body?.isActive);
  if (typeof isActive === "boolean") patch.isActive = isActive;

  if (Array.isArray(req.body?.options)) {
    const options = pickStringArray(req.body.options).map((s) => String(s).trim()).filter(Boolean);
    if (options.length > MAX_OPTIONS_PER_TAG) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_OPTIONS_PER_TAG} options allowed`, data: null });
    }
    patch.options = options;
  }

  try {
    const updated = await ReportingTag.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: patch },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Reporting tag not found", data: null });
    return res.json({ success: true, data: updated });
  } catch (e: any) {
    const code = e?.code;
    if (code === 11000) {
      return res.status(409).json({ success: false, message: "Reporting tag name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to update reporting tag", data: null });
  }
};

export const deleteReportingTag = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  const deleted = await ReportingTag.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Reporting tag not found", data: null });
  return res.json({ success: true, data: { id } });
};

