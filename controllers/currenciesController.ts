import express from "express";
import mongoose from "mongoose";
import { Currency } from "../models/Currency.js";

const pickString = (v: unknown) => (typeof v === "string" ? v : "");
const pickBoolean = (v: unknown) => (typeof v === "boolean" ? v : undefined);

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

const normalize = (row: any) => ({ ...row, id: String(row?._id || "") });

export const listCurrencies = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const isActiveRaw = req.query.isActive;
  const filter: any = { organizationId: orgId };
  if (typeof isActiveRaw !== "undefined") {
    const val = String(isActiveRaw).toLowerCase();
    filter.isActive = val === "true" || val === "1";
  }

  const rows = await Currency.find(filter).sort({ isBaseCurrency: -1, code: 1 }).lean();
  return res.json({ success: true, data: rows.map(normalize) });
};

export const getCurrencyById = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid currency id", data: null });
  const row = await Currency.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Currency not found", data: null });
  return res.json({ success: true, data: normalize(row) });
};

export const createCurrency = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const code = pickString(req.body?.code).trim().toUpperCase();
  const name = pickString(req.body?.name).trim();
  const symbol = pickString(req.body?.symbol).trim();

  if (!code || code.length > 10) return res.status(400).json({ success: false, message: "Invalid currency code", data: null });
  if (!name) return res.status(400).json({ success: false, message: "Currency name required", data: null });
  if (!symbol) return res.status(400).json({ success: false, message: "Currency symbol required", data: null });

  const requestedId = pickString(req.body?._id).trim();
  if (requestedId && requestedId.length > 120) {
    return res.status(400).json({ success: false, message: "Invalid currency id", data: null });
  }

  const payload: any = {
    ...(requestedId ? { _id: requestedId } : {}),
    organizationId: orgId,
    code,
    name: name.slice(0, 120),
    symbol: symbol.slice(0, 20),
    decimalPlaces: pickString(req.body?.decimalPlaces).trim() || "2",
    format: pickString(req.body?.format).trim() || "1,234,567.89",
    isBaseCurrency: Boolean(pickBoolean(req.body?.isBaseCurrency) ?? false),
    isActive: Boolean(pickBoolean(req.body?.isActive) ?? true),
    exchangeRates: Array.isArray(req.body?.exchangeRates) ? req.body.exchangeRates : [],
  };

  try {
    const created = await Currency.create(payload);
    if (payload.isBaseCurrency) {
      await Currency.updateMany({ organizationId: orgId, _id: { $ne: created._id } }, { $set: { isBaseCurrency: false } });
    } else {
      // Ensure at least one base currency exists per org
      const baseExists = await Currency.exists({ organizationId: orgId, isBaseCurrency: true });
      if (!baseExists) {
        await Currency.updateOne({ _id: created._id }, { $set: { isBaseCurrency: true } });
      }
    }
    const row = await Currency.findOne({ _id: created._id, organizationId: orgId }).lean();
    return res.status(201).json({ success: true, data: normalize(row) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Currency code already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create currency", data: null });
  }
};

export const updateCurrency = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid currency id", data: null });

  const patch: Record<string, unknown> = {};

  const code = pickString(req.body?.code).trim().toUpperCase();
  if (code) patch.code = code.slice(0, 10);

  const name = pickString(req.body?.name).trim();
  if (name) patch.name = name.slice(0, 120);

  const symbol = pickString(req.body?.symbol).trim();
  if (symbol) patch.symbol = symbol.slice(0, 20);

  if (typeof req.body?.decimalPlaces === "string") patch.decimalPlaces = pickString(req.body.decimalPlaces).trim() || "2";
  if (typeof req.body?.format === "string") patch.format = pickString(req.body.format).trim() || "1,234,567.89";

  const isBaseCurrency = pickBoolean(req.body?.isBaseCurrency);
  if (typeof isBaseCurrency === "boolean") patch.isBaseCurrency = isBaseCurrency;

  const isActive = pickBoolean(req.body?.isActive);
  if (typeof isActive === "boolean") patch.isActive = isActive;

  if (Array.isArray(req.body?.exchangeRates)) patch.exchangeRates = req.body.exchangeRates;

  try {
    const updated: any = await Currency.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Currency not found", data: null });

    if (patch.isBaseCurrency === true) {
      await Currency.updateMany({ organizationId: orgId, _id: { $ne: id } }, { $set: { isBaseCurrency: false } });
    }

    // Prevent having zero base currencies
    const baseExists = await Currency.exists({ organizationId: orgId, isBaseCurrency: true });
    if (!baseExists) {
      await Currency.updateOne({ _id: id }, { $set: { isBaseCurrency: true } });
      updated.isBaseCurrency = true;
    }

    return res.json({ success: true, data: normalize(updated) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Currency code already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to update currency", data: null });
  }
};

export const deleteCurrency = async (req: express.Request, res: express.Response) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid currency id", data: null });

  const row: any = await Currency.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Currency not found", data: null });
  if (row.isBaseCurrency) {
    return res.status(400).json({ success: false, message: "Base currency cannot be deleted", data: null });
  }

  await Currency.deleteOne({ _id: id, organizationId: orgId });
  return res.json({ success: true, data: { id } });
};

