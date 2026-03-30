import type express from "express";
import mongoose from "mongoose";
import { AUTH_BYPASS } from "../config/env.js";
import { ItemSettings } from "../models/ItemSettings.js";

const pickString = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
const pickBoolean = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const pickArray = (value: unknown) => (Array.isArray(value) ? value : undefined);

const DEFAULTS = {
  decimalPlaces: "2",
  allowDuplicateNames: true,
  enableEnhancedSearch: true,
  enablePriceLists: true,
  enableInventoryTracking: true,
  inventoryStartDate: "",
  preventNegativeStock: true,
  showOutOfStockWarning: false,
  notifyReorderPoint: false,
  trackLandedCost: false,
  customFields: [] as unknown[],
  customButtons: [] as unknown[],
  relatedLists: [] as unknown[],
};

const normalizeItemSettings = (settings: any) => ({
  decimalPlaces: settings?.decimalPlaces || DEFAULTS.decimalPlaces,
  allowDuplicateNames: settings?.allowDuplicateNames !== undefined ? Boolean(settings.allowDuplicateNames) : DEFAULTS.allowDuplicateNames,
  enableEnhancedSearch: settings?.enableEnhancedSearch !== undefined ? Boolean(settings.enableEnhancedSearch) : DEFAULTS.enableEnhancedSearch,
  enablePriceLists: settings?.enablePriceLists !== undefined ? Boolean(settings.enablePriceLists) : DEFAULTS.enablePriceLists,
  enableInventoryTracking: settings?.enableInventoryTracking !== undefined ? Boolean(settings.enableInventoryTracking) : DEFAULTS.enableInventoryTracking,
  inventoryStartDate: settings?.inventoryStartDate || DEFAULTS.inventoryStartDate,
  preventNegativeStock: settings?.preventNegativeStock !== undefined ? Boolean(settings.preventNegativeStock) : DEFAULTS.preventNegativeStock,
  showOutOfStockWarning: settings?.showOutOfStockWarning !== undefined ? Boolean(settings.showOutOfStockWarning) : DEFAULTS.showOutOfStockWarning,
  notifyReorderPoint: settings?.notifyReorderPoint !== undefined ? Boolean(settings.notifyReorderPoint) : DEFAULTS.notifyReorderPoint,
  trackLandedCost: settings?.trackLandedCost !== undefined ? Boolean(settings.trackLandedCost) : DEFAULTS.trackLandedCost,
  customFields: Array.isArray(settings?.customFields) ? settings.customFields : DEFAULTS.customFields,
  customButtons: Array.isArray(settings?.customButtons) ? settings.customButtons : DEFAULTS.customButtons,
  relatedLists: Array.isArray(settings?.relatedLists) ? settings.relatedLists : DEFAULTS.relatedLists,
});

export const getItemSettings: express.RequestHandler = async (req, res, next) => {
  try {
    if (AUTH_BYPASS) {
      return res.json({ success: true, data: DEFAULTS });
    }

    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization", data: null });
    }

    const settings = await ItemSettings.findOneAndUpdate(
      { organizationId: orgId },
      { $setOnInsert: { organizationId: orgId, ...DEFAULTS } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, data: normalizeItemSettings(settings) });
  } catch (err) {
    next(err);
  }
};

export const upsertItemSettings: express.RequestHandler = async (req, res, next) => {
  try {
    if (AUTH_BYPASS) {
      return res.json({ success: true, data: DEFAULTS });
    }

    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization", data: null });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const current = await ItemSettings.findOne({ organizationId: orgId }).lean();
    const normalizedCurrent = normalizeItemSettings(current);

    const update = {
      decimalPlaces: pickString(body.decimalPlaces, normalizedCurrent.decimalPlaces || DEFAULTS.decimalPlaces).trim() || DEFAULTS.decimalPlaces,
      allowDuplicateNames: pickBoolean(body.allowDuplicateNames, normalizedCurrent.allowDuplicateNames),
      enableEnhancedSearch: pickBoolean(body.enableEnhancedSearch, normalizedCurrent.enableEnhancedSearch),
      enablePriceLists: pickBoolean(body.enablePriceLists, normalizedCurrent.enablePriceLists),
      enableInventoryTracking: pickBoolean(body.enableInventoryTracking, normalizedCurrent.enableInventoryTracking),
      inventoryStartDate: pickString(body.inventoryStartDate, normalizedCurrent.inventoryStartDate || DEFAULTS.inventoryStartDate),
      preventNegativeStock: pickBoolean(body.preventNegativeStock, normalizedCurrent.preventNegativeStock),
      showOutOfStockWarning: pickBoolean(body.showOutOfStockWarning, normalizedCurrent.showOutOfStockWarning),
      notifyReorderPoint: pickBoolean(body.notifyReorderPoint, normalizedCurrent.notifyReorderPoint),
      trackLandedCost: pickBoolean(body.trackLandedCost, normalizedCurrent.trackLandedCost),
      ...(pickArray(body.customFields) ? { customFields: body.customFields as unknown[] } : current?.customFields ? { customFields: current.customFields as unknown[] } : { customFields: DEFAULTS.customFields }),
      ...(pickArray(body.customButtons) ? { customButtons: body.customButtons as unknown[] } : current?.customButtons ? { customButtons: current.customButtons as unknown[] } : { customButtons: DEFAULTS.customButtons }),
      ...(pickArray(body.relatedLists) ? { relatedLists: body.relatedLists as unknown[] } : current?.relatedLists ? { relatedLists: current.relatedLists as unknown[] } : { relatedLists: DEFAULTS.relatedLists }),
    };

    const saved = await ItemSettings.findOneAndUpdate(
      { organizationId: orgId },
      { $set: update, $setOnInsert: { organizationId: orgId } },
      { new: true, upsert: true }
    ).lean();

    return res.json({ success: true, data: normalizeItemSettings(saved) });
  } catch (err) {
    next(err);
  }
};
