import express from "express";
import mongoose from "mongoose";
import { Tax } from "../models/Tax.js";

const pickString = (v: unknown) => (typeof v === "string" ? v : "");
const pickBoolean = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const pickNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const pickStringArray = (v: unknown) =>
  Array.isArray(v) ? v.map((x) => String(x || "").trim()).filter(Boolean) : [];

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

const normalizeRow = (row: any) => {
  if (!row) return row;
  return { ...row, id: String(row._id) };
};

export const listTaxes = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const rows = await Tax.find({ organizationId: orgId }).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, data: rows.map(normalizeRow) });
};

export const getTaxById = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid tax id", data: null });
  const row = await Tax.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Tax not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createTax = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const name = pickString(req.body?.name).trim();
  if (!name) return res.status(400).json({ success: false, message: "Tax name required", data: null });

  const kindRaw = pickString(req.body?.kind).trim().toLowerCase();
  const kind = kindRaw === "group" ? "group" : "tax";

  const requestedId = pickString(req.body?._id).trim();
  if (requestedId && requestedId.length > 120) {
    return res.status(400).json({ success: false, message: "Invalid tax id", data: null });
  }

  const payload: any = {
    ...(requestedId ? { _id: requestedId } : {}),
    organizationId: orgId,
    kind,
    name: name.slice(0, 120),
    rate: pickNumber(req.body?.rate) ?? 0,
    type: pickString(req.body?.type).trim() || "both",
    description: pickString(req.body?.description).trim().slice(0, 500),
    isActive: Boolean(pickBoolean(req.body?.isActive) ?? true),
    isDefault: Boolean(pickBoolean(req.body?.isDefault) ?? false),
    isCompound: Boolean(pickBoolean(req.body?.isCompound) ?? false),
    isDigitalServiceTax: Boolean(pickBoolean(req.body?.isDigitalServiceTax) ?? false),
    digitalServiceCountry: pickString(req.body?.digitalServiceCountry).trim().slice(0, 80),
    trackTaxByCountryScheme: Boolean(pickBoolean(req.body?.trackTaxByCountryScheme) ?? false),
    accountToTrackSales: pickString(req.body?.accountToTrackSales).trim().slice(0, 120),
    accountToTrackPurchases: pickString(req.body?.accountToTrackPurchases).trim().slice(0, 120),
    isValueAddedTax: Boolean(pickBoolean(req.body?.isValueAddedTax) ?? false),
  };

  if (kind === "group") {
    payload.groupTaxes = pickStringArray(req.body?.groupTaxes);
    payload.isDefault = false;
  } else {
    payload.groupTaxes = [];
  }

  try {
    const created = await Tax.create(payload);
    if (payload.isDefault) {
      await Tax.updateMany({ organizationId: orgId, _id: { $ne: created._id } }, { $set: { isDefault: false } });
    }
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Tax name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create tax", data: null });
  }
};

export const updateTax = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid tax id", data: null });

  const patch: Record<string, unknown> = {};
  const name = pickString(req.body?.name).trim();
  if (name) patch.name = name.slice(0, 120);

  const kindRaw = pickString(req.body?.kind).trim().toLowerCase();
  if (kindRaw === "tax" || kindRaw === "group") patch.kind = kindRaw;

  const rate = pickNumber(req.body?.rate);
  if (typeof rate === "number") patch.rate = rate;

  const type = pickString(req.body?.type).trim();
  if (type) patch.type = type;

  const description = pickString(req.body?.description).trim();
  if (description) patch.description = description.slice(0, 500);

  const isActive = pickBoolean(req.body?.isActive);
  if (typeof isActive === "boolean") patch.isActive = isActive;

  const isCompound = pickBoolean(req.body?.isCompound);
  if (typeof isCompound === "boolean") patch.isCompound = isCompound;

  const isDigitalServiceTax = pickBoolean(req.body?.isDigitalServiceTax);
  if (typeof isDigitalServiceTax === "boolean") patch.isDigitalServiceTax = isDigitalServiceTax;

  const trackTaxByCountryScheme = pickBoolean(req.body?.trackTaxByCountryScheme);
  if (typeof trackTaxByCountryScheme === "boolean") patch.trackTaxByCountryScheme = trackTaxByCountryScheme;

  const isValueAddedTax = pickBoolean(req.body?.isValueAddedTax);
  if (typeof isValueAddedTax === "boolean") patch.isValueAddedTax = isValueAddedTax;

  if (typeof req.body?.digitalServiceCountry === "string") {
    patch.digitalServiceCountry = pickString(req.body.digitalServiceCountry).trim().slice(0, 80);
  }
  if (typeof req.body?.accountToTrackSales === "string") {
    patch.accountToTrackSales = pickString(req.body.accountToTrackSales).trim().slice(0, 120);
  }
  if (typeof req.body?.accountToTrackPurchases === "string") {
    patch.accountToTrackPurchases = pickString(req.body.accountToTrackPurchases).trim().slice(0, 120);
  }

  if (Array.isArray(req.body?.groupTaxes)) {
    patch.groupTaxes = pickStringArray(req.body.groupTaxes);
  }

  const isDefault = pickBoolean(req.body?.isDefault);
  if (typeof isDefault === "boolean") patch.isDefault = isDefault;

  try {
    const updated: any = await Tax.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Tax not found", data: null });

    if (updated.kind === "group") {
      // never allow default on groups
      if (updated.isDefault) {
        await Tax.updateOne({ _id: updated._id }, { $set: { isDefault: false } });
        updated.isDefault = false;
      }
    }

    if (patch.isDefault === true) {
      await Tax.updateMany({ organizationId: orgId, _id: { $ne: updated._id } }, { $set: { isDefault: false } });
    }

    return res.json({ success: true, data: normalizeRow(updated) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Tax name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to update tax", data: null });
  }
};

export const deleteTax = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid tax id", data: null });

  const toDelete: any = await Tax.findOne({ _id: id, organizationId: orgId }).lean();
  if (!toDelete) return res.status(404).json({ success: false, message: "Tax not found", data: null });

  await Tax.deleteOne({ _id: id, organizationId: orgId });

  // Remove deleted tax from any groups
  await Tax.updateMany({ organizationId: orgId, kind: "group" }, { $pull: { groupTaxes: id } });

  if (toDelete.isDefault) {
    const promote: any = await Tax.findOne({ organizationId: orgId, kind: "tax" }).sort({ createdAt: -1 }).lean();
    if (promote) await Tax.updateOne({ _id: promote._id }, { $set: { isDefault: true } });
  }

  return res.json({ success: true, data: { id } });
};
