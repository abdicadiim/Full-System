import express from "express";
import mongoose from "mongoose";
import { Location } from "../models/Location.js";

const pickString = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const pickBoolean = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const pickArray = (v: unknown) => (Array.isArray(v) ? v : []);

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
  const id = String(row?._id || "");
  return { ...row, id, _id: id };
};

export const listLocations = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const filter: any = { organizationId: orgId };
  const isActiveRaw = req.query.isActive;
  if (typeof isActiveRaw !== "undefined") {
    const val = String(isActiveRaw).toLowerCase();
    filter.isActive = val === "true" || val === "1";
  }

  const rows = await Location.find(filter).sort({ isDefault: -1, name: 1 }).lean();
  return res.json({ success: true, data: rows.map(normalizeRow) });
};

export const getLocationById = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid location id", data: null });
  const row = await Location.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Location not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createLocation = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const body: any = req.body || {};
  const name = pickString(body?.name).trim();
  const type = pickString(body?.type).trim() || "Business";
  if (!name) return res.status(400).json({ success: false, message: "Location name is required", data: null });

  const requestedId = pickString(body?._id || body?.id).trim();
  if (requestedId && requestedId.length > 120) {
    return res.status(400).json({ success: false, message: "Invalid location id", data: null });
  }

  const isDefault = Boolean(pickBoolean(body?.isDefault) ?? false);
  const isActive = Boolean(pickBoolean(body?.isActive) ?? true);

  const payload: any = {
    ...(requestedId ? { _id: requestedId } : {}),
    organizationId: orgId,
    name: name.slice(0, 120),
    type,
    isDefault,
    isActive,
    parentLocation: pickString(body?.parentLocation).trim() === "None" ? "" : pickString(body?.parentLocation).trim(),
    address: body?.address && typeof body.address === "object" ? body.address : {},
    website: pickString(body?.website).trim(),
    primaryContact: pickString(body?.primaryContact).trim(),
    contactPerson: body?.contactPerson && typeof body.contactPerson === "object" ? body.contactPerson : {},
    transactionNumberSeriesId: pickString(body?.transactionNumberSeriesId).trim(),
    defaultTransactionNumberSeriesId: pickString(body?.defaultTransactionNumberSeriesId).trim(),
    defaultTransactionSeries: pickString(body?.defaultTransactionSeries).trim(),
    locationAccess: pickArray(body?.locationAccess),
    notes: pickString(body?.notes).trim(),
    logo: pickString(body?.logo).trim(),
    status: pickString(body?.status).trim() || (isActive ? "Active" : "Inactive"),
  };

  try {
    const created = await Location.create(payload);
    if (isDefault) {
      await Location.updateMany({ organizationId: orgId, _id: { $ne: created._id } }, { $set: { isDefault: false } });
    } else {
      const defaultExists = await Location.exists({ organizationId: orgId, isDefault: true });
      if (!defaultExists) {
        await Location.updateOne({ _id: created._id }, { $set: { isDefault: true } });
      }
    }
    const row = await Location.findOne({ _id: created._id, organizationId: orgId }).lean();
    return res.status(201).json({ success: true, data: normalizeRow(row) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Location name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create location", data: null });
  }
};

export const updateLocation = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid location id", data: null });

  const body: any = req.body || {};
  const patch: Record<string, unknown> = {};

  if (typeof body?.name === "string") {
    const name = pickString(body.name).trim();
    if (!name) return res.status(400).json({ success: false, message: "Location name is required", data: null });
    patch.name = name.slice(0, 120);
  }
  if (typeof body?.type === "string") patch.type = pickString(body.type).trim() || "Business";

  const isDefault = pickBoolean(body?.isDefault);
  if (typeof isDefault === "boolean") patch.isDefault = isDefault;

  const isActive = pickBoolean(body?.isActive);
  if (typeof isActive === "boolean") patch.isActive = isActive;

  if (typeof body?.parentLocation !== "undefined") {
    const parent = pickString(body.parentLocation).trim();
    patch.parentLocation = parent === "None" ? "" : parent;
  }

  if (body?.address && typeof body.address === "object") patch.address = body.address;
  if (typeof body?.website === "string") patch.website = pickString(body.website).trim();
  if (typeof body?.primaryContact === "string") patch.primaryContact = pickString(body.primaryContact).trim();
  if (body?.contactPerson && typeof body.contactPerson === "object") patch.contactPerson = body.contactPerson;

  if (typeof body?.transactionNumberSeriesId === "string") patch.transactionNumberSeriesId = pickString(body.transactionNumberSeriesId).trim();
  if (typeof body?.defaultTransactionNumberSeriesId === "string")
    patch.defaultTransactionNumberSeriesId = pickString(body.defaultTransactionNumberSeriesId).trim();
  if (typeof body?.defaultTransactionSeries === "string") patch.defaultTransactionSeries = pickString(body.defaultTransactionSeries).trim();

  if (Array.isArray(body?.locationAccess)) patch.locationAccess = body.locationAccess;

  if (typeof body?.notes === "string") patch.notes = pickString(body.notes).trim();
  if (typeof body?.logo === "string") patch.logo = pickString(body.logo).trim();

  if (typeof body?.status === "string") patch.status = pickString(body.status).trim();

  try {
    const updated: any = await Location.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Location not found", data: null });

    if (patch.isDefault === true) {
      await Location.updateMany({ organizationId: orgId, _id: { $ne: id } }, { $set: { isDefault: false } });
    }

    const defaultExists = await Location.exists({ organizationId: orgId, isDefault: true });
    if (!defaultExists) {
      await Location.updateOne({ _id: id }, { $set: { isDefault: true } });
      updated.isDefault = true;
    }

    return res.json({ success: true, data: normalizeRow(updated) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Location name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to update location", data: null });
  }
};

export const deleteLocation = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid location id", data: null });

  const row: any = await Location.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Location not found", data: null });
  if (row.isDefault) {
    return res.status(400).json({ success: false, message: "Default location cannot be deleted", data: null });
  }

  await Location.deleteOne({ _id: id, organizationId: orgId });
  return res.json({ success: true, data: { id } });
};

