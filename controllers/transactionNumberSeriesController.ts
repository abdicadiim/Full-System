import express from "express";
import mongoose from "mongoose";
import { TransactionNumberSeries } from "../models/TransactionNumberSeries.js";
import { TransactionNumberSeriesSettings } from "../models/TransactionNumberSeriesSettings.js";
import { Location } from "../models/Location.js";

const pickString = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const pickArray = (v: unknown) => (Array.isArray(v) ? v : []);

const toModuleKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toCompactKey = (value: string) => toModuleKey(value).replace(/_/g, "");

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

const normalizeLookupLocationIds = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];

const matchesSeriesLookup = (
  row: any,
  lookup: { seriesId?: string; module?: string; moduleKey?: string; seriesName?: string }
) => {
  if (!row) return false;

  if (lookup.seriesId && String(row?._id || "").trim() === lookup.seriesId) {
    return true;
  }

  const rowSeriesName = String(row?.seriesName || row?.name || "").trim().toLowerCase();
  if (lookup.seriesName && rowSeriesName === lookup.seriesName.trim().toLowerCase()) {
    return true;
  }

  const targetKey = toCompactKey(lookup.moduleKey || lookup.module || lookup.seriesName || "");
  if (!targetKey) return false;

  const rowKeys = [
    row?.module,
    row?.moduleKey,
    row?.name,
    row?.seriesName,
  ].map((value) => toCompactKey(String(value || "")));

  return rowKeys.some((key) => key === targetKey);
};

const pickPreferredSeriesRow = (rows: any[], lookupLocationIds: string[] = []) => {
  const activeRows = rows.filter((row) => String(row?.status || "active").toLowerCase() !== "inactive");
  const scoreRow = (row: any) => {
    const rowLocationIds = Array.isArray(row?.locationIds)
      ? row.locationIds.map((id: any) => String(id || "").trim()).filter(Boolean)
      : [];

    let score = 0;
    if (lookupLocationIds.length) {
      const matchesLocation = rowLocationIds.some((id) => lookupLocationIds.includes(id));
      if (matchesLocation) score += 100;
      else if (!rowLocationIds.length) score += 10;
    }
    if (Boolean(row?.isDefault)) score += 25;
    if (rowLocationIds.length) score += 5;
    return score;
  };

  return [...activeRows, ...rows.filter((row) => String(row?.status || "active").toLowerCase() !== "inactive")]
    .sort((a, b) => scoreRow(b) - scoreRow(a))[0] || null;
};

export const listTransactionNumberSeries = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const rows = await TransactionNumberSeries.find({ organizationId: orgId }).sort({ seriesName: 1, module: 1 }).lean();
  return res.json({ success: true, data: rows.map(normalizeRow) });
};

export const deleteTransactionNumberSeries = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid series id", data: null });
  await TransactionNumberSeries.deleteOne({ _id: id, organizationId: orgId });
  return res.json({ success: true, data: { id } });
};

export const createTransactionNumberSeriesBulk = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const seriesName = pickString(req.body?.seriesName).trim() || "Standard";
  const locationIds = pickArray(req.body?.locationIds).map((v) => String(v)).filter(Boolean);
  const modules = pickArray(req.body?.modules);

  if (!modules.length) return res.status(400).json({ success: false, message: "Modules are required", data: null });

  const docs = modules.map((mod: any) => {
    const module = pickString(mod?.module).trim();
    const prefix = pickString(mod?.prefix).trim();
    const startingNumber = pickString(mod?.startingNumber || mod?.nextNumber || "1").trim() || "1";
    const restartNumbering = pickString(mod?.restartNumbering).trim().toLowerCase() || "none";
    const isDefault = Boolean(mod?.isDefault);
    const parsed = parseInt(startingNumber, 10);
    const providedNext = Number(mod?.nextNumber);
    const nextNumber = Number.isFinite(providedNext) && providedNext > 0
      ? providedNext
      : Number.isFinite(parsed) && parsed > 0
        ? parsed
        : 1;

    return {
      organizationId: orgId,
      seriesName,
      module,
      name: module,
      moduleKey: toModuleKey(module),
      prefix,
      startingNumber,
      nextNumber,
      restartNumbering,
      isDefault,
      locationIds,
      status: pickString(mod?.status).trim() || "Active",
    };
  });

  try {
    const created = await TransactionNumberSeries.insertMany(docs, { ordered: false });
    return res.status(201).json({ success: true, data: created.map((d: any) => normalizeRow(d.toObject?.() || d)) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Series already exists for a module", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create series", data: null });
  }
};

export const updateTransactionNumberSeriesBulk = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const seriesName = pickString(req.body?.seriesName).trim() || "Standard";
  const originalName = pickString(req.body?.originalName).trim() || seriesName;
  const locationIds = pickArray(req.body?.locationIds).map((v) => String(v)).filter(Boolean);
  const modules = pickArray(req.body?.modules);

  if (!modules.length) return res.status(400).json({ success: false, message: "Modules are required", data: null });

  await TransactionNumberSeries.deleteMany({
    organizationId: orgId,
    seriesName: new RegExp(`^${originalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });

  req.body = { ...req.body, seriesName, locationIds, modules };
  return createTransactionNumberSeriesBulk(req, res);
};

export const getNextTransactionNumber = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const seriesId = String(req.params.id || req.query.seriesId || req.query.id || "").trim();
  const module = String(req.query.module || "").trim();
  const moduleKey = String(req.query.moduleKey || "").trim();
  const seriesName = String(req.query.seriesName || "").trim();
  const locationId = String(req.query.locationId || "").trim();
  const locationName = String(req.query.locationName || "").trim();
  const reserve = String(req.query.reserve || "").trim().toLowerCase() !== "false";
  const hasExplicitLookup = Boolean(seriesId || module || moduleKey || seriesName);
  const lookupLocationIds: string[] = [];

  const rows: any[] = await TransactionNumberSeries.find({ organizationId: orgId }).lean();
  if (locationId) {
    lookupLocationIds.push(locationId);
  }
  if (locationName) {
    const locations = await Location.find({ organizationId: orgId }).lean();
    const normalizedLocationName = locationName.toLowerCase();
    locations
      .filter((loc: any) => String(loc?.name || "").trim().toLowerCase() === normalizedLocationName)
      .forEach((loc: any) => {
        const id = String(loc?._id || "").trim();
        if (id) lookupLocationIds.push(id);
      });
  }

  const matchedRows = rows.filter((item) => matchesSeriesLookup(item, { seriesId, module, moduleKey, seriesName }));
  const row =
    (seriesId ? rows.find((item) => String(item?._id || "").trim() === seriesId) : null) ||
    (module || moduleKey || seriesName
      ? pickPreferredSeriesRow(matchedRows, normalizeLookupLocationIds(lookupLocationIds))
      : null) ||
    (!hasExplicitLookup ? pickPreferredSeriesRow(rows, normalizeLookupLocationIds(lookupLocationIds)) : null);

  if (!row) return res.status(404).json({ success: false, message: "Series not found", data: null });

  const starting = pickString(row?.startingNumber || "1").trim() || "1";
  const startParsed = parseInt(starting, 10);
  const fallbackNext = Number.isFinite(startParsed) && startParsed > 0 ? startParsed : 1;
  const nextValue = Number(row?.nextNumber) > 0 ? Number(row.nextNumber) : fallbackNext;

  const width = /^\d+$/.test(starting) ? starting.length : 5;
  const padded = width > 1 ? String(nextValue).padStart(width, "0") : String(nextValue);
  const nextNumber = `${pickString(row?.prefix || "")}${padded}`;

  if (reserve) {
    await TransactionNumberSeries.updateOne({ _id: row._id, organizationId: orgId }, { $set: { nextNumber: nextValue + 1 } });
  }

  return res.json({
    success: true,
    data: {
      seriesId: String(row._id),
      nextNumber,
      next_number: nextNumber, // compatibility
      reserved: reserve,
    },
  });
};

export const getTransactionNumberSettings = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const existing: any = await TransactionNumberSeriesSettings.findOne({ organizationId: orgId }).lean();
  if (existing) return res.json({ success: true, data: { preventDuplicates: existing.preventDuplicates || "all_fiscal_years" } });

  const created = await TransactionNumberSeriesSettings.create({ organizationId: orgId, preventDuplicates: "all_fiscal_years" });
  return res.json({ success: true, data: { preventDuplicates: created.preventDuplicates } });
};

export const updateTransactionNumberSettings = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const preventDuplicates = pickString(req.body?.preventDuplicates).trim() || "all_fiscal_years";
  const updated = await TransactionNumberSeriesSettings.findOneAndUpdate(
    { organizationId: orgId },
    { $set: { preventDuplicates } },
    { new: true, upsert: true }
  ).lean();

  return res.json({ success: true, data: { preventDuplicates: updated?.preventDuplicates || preventDuplicates } });
};

