import express from "express";
import mongoose from "mongoose";
import { Organization } from "../models/Organization.js";
import { buildOrganizationProfilePayload, parseOrganizationPayload } from "../services/organizationPayloads.js";

const normalizeMileagePreferences = (value: any) => {
  const source = value && typeof value === "object" ? value : {};
  const defaultMileageAccount =
    typeof source.defaultMileageAccount === "string" ? source.defaultMileageAccount.trim().slice(0, 120) : "";
  const defaultUnitRaw = typeof source.defaultUnit === "string" ? source.defaultUnit.trim() : "";
  const defaultUnit = defaultUnitRaw === "Mile" || defaultUnitRaw === "Mile(s)" ? "Mile(s)" : "Km";
  const mileageRates = Array.isArray(source.mileageRates)
    ? source.mileageRates
        .map((row: any) => ({
          startDate: typeof row?.startDate === "string" ? row.startDate.trim().slice(0, 40) : "",
          rate: typeof row?.rate === "string" ? row.rate.trim().slice(0, 40) : "",
        }))
        .filter((row: any) => row.startDate || row.rate)
    : [];

  return {
    defaultMileageAccount,
    defaultUnit,
    mileageRates,
  };
};

const buildOrganizationBrandingPayload = (org: any) => ({
  appearance: (org as any).brandingAppearance || "dark",
  accentColor: (org as any).brandingAccentColor || "#3b82f6",
  keepZohoBranding: Boolean((org as any).brandingKeepZohoBranding),
  logoUrl: (org as any).logoUrl || "",
  logo: (org as any).logoUrl || "",
  sidebarDarkFrom: (org as any).sidebarDarkFrom || "#156372",
  sidebarDarkTo: (org as any).sidebarDarkTo || "#156372",
  sidebarLightFrom: (org as any).sidebarLightFrom || "#f9fafb",
  sidebarLightTo: (org as any).sidebarLightTo || "#f3f4f6",
});

export const getOrganizationProfile = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const org = await Organization.findById(orgId).lean();
  if (!org) return res.status(404).json({ success: false, message: "Organization not found", data: null });

  return res.json({
    success: true,
    data: {
      ...buildOrganizationProfilePayload(org, req.user),
      mileagePreferences: org.mileagePreferences ? normalizeMileagePreferences(org.mileagePreferences) : null,
    },
  });
};

export const updateOrganizationProfile = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const body = req.body || {};
  const { patch, errors } = parseOrganizationPayload(body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
      data: null,
    });
  }

  if (body.mileagePreferences && typeof body.mileagePreferences === "object") {
    patch.mileagePreferences = normalizeMileagePreferences(body.mileagePreferences);
  }

  const updated = await Organization.findByIdAndUpdate(orgId, { $set: patch }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Organization not found", data: null });

  return res.json({
    success: true,
    data: {
      ...buildOrganizationProfilePayload(updated, req.user),
      mileagePreferences: updated.mileagePreferences ? normalizeMileagePreferences(updated.mileagePreferences) : null,
    },
  });
};

export const getOrganizationOwnerEmail = async (req: express.Request, res: express.Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  return res.json({ success: true, data: { email: user.email } });
};

export const getPrimarySender = async (req: express.Request, res: express.Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

  const name = (user as any).name || (user as any).fullName || "";
  const email = (user as any).email || "";
  return res.json({ success: true, data: { name, email } });
};

export const getOrganizationBranding = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const org = await Organization.findById(orgId).lean();
  if (!org) return res.status(404).json({ success: false, message: "Organization not found", data: null });

  return res.json({
    success: true,
    data: buildOrganizationBrandingPayload(org),
  });
};

export const updateOrganizationBranding = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const body = req.body || {};
  const patch: Record<string, unknown> = {};

  const appearance = typeof body.appearance === "string" ? body.appearance.trim().toLowerCase() : "";
  if (appearance === "dark" || appearance === "light") patch.brandingAppearance = appearance;

  const accentColor = typeof body.accentColor === "string" ? body.accentColor.trim() : "";
  if (accentColor) patch.brandingAccentColor = accentColor.slice(0, 40);

  const keepZohoBranding = typeof body.keepZohoBranding === "boolean" ? body.keepZohoBranding : undefined;
  if (typeof keepZohoBranding === "boolean") patch.brandingKeepZohoBranding = keepZohoBranding;

  const MAX_BRANDING_LEN = 2_000_000; // ~2MB string (supports data: URLs)
  if (Object.prototype.hasOwnProperty.call(body, "logo")) {
    const logo = typeof body.logo === "string" ? body.logo.trim() : "";
    patch.logoUrl = logo.slice(0, MAX_BRANDING_LEN);
  }

  const setColor = (key: string, field: string) => {
    const value = typeof (body as any)[key] === "string" ? String((body as any)[key]).trim() : "";
    if (value) patch[field] = value.slice(0, 60);
  };

  setColor("sidebarDarkFrom", "sidebarDarkFrom");
  setColor("sidebarDarkTo", "sidebarDarkTo");
  setColor("sidebarLightFrom", "sidebarLightFrom");
  setColor("sidebarLightTo", "sidebarLightTo");

  const updated = await Organization.findByIdAndUpdate(orgId, { $set: patch }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Organization not found", data: null });

  return res.json({ success: true, data: buildOrganizationBrandingPayload(updated) });
};
