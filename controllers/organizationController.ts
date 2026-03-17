import express from "express";
import { AUTH_BYPASS } from "../config/env.js";
import { Organization } from "../models/Organization.js";
import mongoose from "mongoose";

const pickString = (v: unknown) => (typeof v === "string" ? v : "");
const pickBoolean = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const MAX_BRANDING_LEN = 2_000_000; // ~2MB string

export const getMyOrganization = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    return res.json({
      success: true,
      data: {
        id: "dev_org",
        name: "Dev Org",
        primaryContactEmail: "dev@example.com",
      },
    });
  }

  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ success: false, message: "DB not connected", data: null });
  }

  const org = await Organization.findById(orgId).lean();
  if (!org) return res.status(404).json({ success: false, message: "Organization not found", data: null });

  return res.json({ success: true, data: { id: String(org._id), ...org } });
};

export const updateMyOrganization = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    return res.json({ success: true, data: { ok: true } });
  }

  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ success: false, message: "DB not connected", data: null });
  }

  const patch: Record<string, unknown> = {};

  const name = pickString(req.body?.name).trim();
  if (name) patch.name = name.slice(0, 100);

  const primaryContactEmail = pickString(req.body?.primaryContactEmail).trim().toLowerCase();
  if (primaryContactEmail) patch.primaryContactEmail = primaryContactEmail;

  const industry = pickString(req.body?.industry).trim();
  if (industry) patch.industry = industry.slice(0, 120);

  const businessType = pickString(req.body?.businessType).trim();
  if (businessType) patch.businessType = businessType.slice(0, 80);

  const countryIso = pickString(req.body?.countryIso).trim().toUpperCase();
  if (countryIso) patch.countryIso = countryIso.slice(0, 2);

  const state = pickString(req.body?.state).trim();
  if (state) patch.state = state.slice(0, 80);

  const baseCurrencyRaw = pickString(req.body?.baseCurrency).trim();
  const baseCurrency = baseCurrencyRaw.includes(" - ") ? baseCurrencyRaw.split(" - ")[0] : baseCurrencyRaw;
  if (baseCurrency) patch.baseCurrency = baseCurrency.slice(0, 80);

  const fiscalYear = pickString(req.body?.fiscalYear).trim();
  if (fiscalYear) patch.fiscalYear = fiscalYear.slice(0, 80);

  const language = pickString(req.body?.language ?? req.body?.orgLanguage).trim();
  if (language) patch.language = language.slice(0, 50);

  const timeZone = pickString(req.body?.timeZone).trim();
  if (timeZone) patch.timeZone = timeZone.slice(0, 80);

  const websiteUrl = pickString(req.body?.websiteUrl).trim();
  if (websiteUrl) patch.websiteUrl = websiteUrl.slice(0, 255);

  const phone = pickString(req.body?.phone).trim();
  if (phone) patch.phone = phone.slice(0, 40);

  const addressLine1 = pickString(req.body?.addressLine1).trim();
  if (addressLine1) patch.addressLine1 = addressLine1.slice(0, 255);
  const addressLine2 = pickString(req.body?.addressLine2).trim();
  if (addressLine2) patch.addressLine2 = addressLine2.slice(0, 255);
  const city = pickString(req.body?.city).trim();
  if (city) patch.city = city.slice(0, 80);
  const postalCode = pickString(req.body?.postalCode).trim();
  if (postalCode) patch.postalCode = postalCode.slice(0, 20);

  const billingProcess = pickString(req.body?.billingProcess).trim();
  if (billingProcess) patch.billingProcess = billingProcess.slice(0, 40);

  const invoicingTool = pickString(req.body?.invoicingTool).trim();
  if (invoicingTool) patch.invoicingTool = invoicingTool.slice(0, 80);

  const currentBillingTool = pickString(req.body?.currentBillingTool).trim();
  if (currentBillingTool) patch.currentBillingTool = currentBillingTool.slice(0, 80);

  const wantsImport = pickBoolean(req.body?.wantsImport);
  if (typeof wantsImport === "boolean") patch.wantsImport = wantsImport;

  const logoUrl = pickString(req.body?.logoUrl ?? req.body?.logo).trim();
  if (logoUrl) patch.logoUrl = logoUrl.slice(0, MAX_BRANDING_LEN);

  const updated = await Organization.findByIdAndUpdate(orgId, { $set: patch }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Organization not found", data: null });
  return res.json({ success: true, data: { id: String(updated._id), ...updated } });
};
