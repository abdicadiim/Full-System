import express from "express";
import mongoose from "mongoose";
import { AUTH_BYPASS } from "../config/env.js";
import { Organization } from "../models/Organization.js";

const regionNameFromIso = (iso2: string) => {
  if (!iso2) return "";
  try {
    // Node 25 supports Intl.DisplayNames.
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return dn.of(iso2.toUpperCase()) || iso2;
  } catch {
    return iso2;
  }
};

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

const buildOrganizationProfilePayload = (org: any) => ({
  id: String(org._id),
  name: org.name || "",
  logoUrl: org.logoUrl || "",
  logo: org.logoUrl || "",
  businessType: org.businessType || "",
  industry: org.industry || "",
  email: org.primaryContactEmail || "",
  website: org.websiteUrl || "",
  baseCurrency: org.baseCurrency || "",
  fiscalYear: org.fiscalYear || "",
  orgLanguage: org.language || "",
  timeZone: org.timeZone || "",
  mileagePreferences: org.mileagePreferences ? normalizeMileagePreferences(org.mileagePreferences) : null,
  address: {
    country: regionNameFromIso(org.countryIso || ""),
    state: org.state || "",
    city: org.city || "",
    street1: org.addressLine1 || "",
    street2: org.addressLine2 || "",
    zipCode: org.postalCode || "",
    phone: org.phone || "",
  },
});

export const getOrganizationProfile = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    return res.json({
      success: true,
      data: {
        name: "Dev Org",
        logo: "",
        logoUrl: "",
        businessType: "",
        industry: "",
        email: "dev@example.com",
        website: "",
        baseCurrency: "USD",
        fiscalYear: "January - December",
        orgLanguage: "English",
        timeZone: "UTC",
        address: { country: "United States", state: "", city: "", street1: "", street2: "", zipCode: "", phone: "" },
      },
    });
  }

  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const org = await Organization.findById(orgId).lean();
  if (!org) return res.status(404).json({ success: false, message: "Organization not found", data: null });

  return res.json({
    success: true,
    data: buildOrganizationProfilePayload(org),
  });
};

export const updateOrganizationProfile = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) return res.json({ success: true, data: { ok: true } });

  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const body = req.body || {};
  const patch: Record<string, unknown> = {};
  const MAX_BRANDING_LEN = 2_000_000; // ~2MB string (supports data: URLs)

  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 100);
  if (typeof body.businessType === "string" && body.businessType.trim()) patch.businessType = body.businessType.trim().slice(0, 80);
  if (typeof body.industry === "string" && body.industry.trim()) patch.industry = body.industry.trim().slice(0, 120);

  // Logo can be provided as `logo` (legacy) or `logoUrl`.
  if (typeof body.logo === "string") patch.logoUrl = body.logo.trim().slice(0, MAX_BRANDING_LEN);
  if (typeof body.logoUrl === "string") patch.logoUrl = body.logoUrl.trim().slice(0, MAX_BRANDING_LEN);

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email) patch.primaryContactEmail = email;

  const website = typeof body.website === "string" ? body.website.trim() : "";
  if (website) patch.websiteUrl = website.slice(0, 255);

  const baseCurrencyRaw = typeof body.baseCurrency === "string" ? body.baseCurrency.trim() : "";
  const baseCurrency = baseCurrencyRaw.includes(" - ") ? baseCurrencyRaw.split(" - ")[0] : baseCurrencyRaw;
  if (baseCurrency) patch.baseCurrency = baseCurrency.slice(0, 80);

  if (typeof body.fiscalYear === "string" && body.fiscalYear.trim()) patch.fiscalYear = body.fiscalYear.trim().slice(0, 80);
  if (typeof body.orgLanguage === "string" && body.orgLanguage.trim()) patch.language = body.orgLanguage.trim().slice(0, 50);
  if (typeof body.timeZone === "string" && body.timeZone.trim()) patch.timeZone = body.timeZone.trim().slice(0, 80);

  const addr = body.address || {};
  if (typeof addr.state === "string" && addr.state.trim()) patch.state = addr.state.trim().slice(0, 80);
  if (typeof addr.city === "string" && addr.city.trim()) patch.city = addr.city.trim().slice(0, 80);
  if (typeof addr.street1 === "string" && addr.street1.trim()) patch.addressLine1 = addr.street1.trim().slice(0, 255);
  if (typeof addr.street2 === "string" && addr.street2.trim()) patch.addressLine2 = addr.street2.trim().slice(0, 255);
  if (typeof addr.zipCode === "string" && addr.zipCode.trim()) patch.postalCode = addr.zipCode.trim().slice(0, 20);
  if (typeof addr.phone === "string" && addr.phone.trim()) patch.phone = addr.phone.trim().slice(0, 40);

  if (body.mileagePreferences && typeof body.mileagePreferences === "object") {
    patch.mileagePreferences = normalizeMileagePreferences(body.mileagePreferences);
  }

  // Only update country if a 2-letter ISO code is provided explicitly.
  const countryIso = typeof body.countryIso === "string" ? body.countryIso.trim().toUpperCase() : "";
  if (countryIso && countryIso.length === 2) patch.countryIso = countryIso;

  const updated = await Organization.findByIdAndUpdate(orgId, { $set: patch }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Organization not found", data: null });

  return res.json({ success: true, data: buildOrganizationProfilePayload(updated) });
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
  if (AUTH_BYPASS) {
    return res.json({
      success: true,
      data: {
        appearance: "dark",
        accentColor: "#3b82f6",
        keepZohoBranding: false,
        logo: "",
        sidebarDarkFrom: "#156372",
        sidebarDarkTo: "#156372",
        sidebarLightFrom: "#f9fafb",
        sidebarLightTo: "#f3f4f6",
      },
    });
  }

  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const org = await Organization.findById(orgId).lean();
  if (!org) return res.status(404).json({ success: false, message: "Organization not found", data: null });

  return res.json({
    success: true,
    data: {
      appearance: (org as any).brandingAppearance || "dark",
      accentColor: (org as any).brandingAccentColor || "#3b82f6",
      keepZohoBranding: Boolean((org as any).brandingKeepZohoBranding),
      logo: (org as any).logoUrl || "",
      sidebarDarkFrom: (org as any).sidebarDarkFrom || "#156372",
      sidebarDarkTo: (org as any).sidebarDarkTo || "#156372",
      sidebarLightFrom: (org as any).sidebarLightFrom || "#f9fafb",
      sidebarLightTo: (org as any).sidebarLightTo || "#f3f4f6",
    },
  });
};

export const updateOrganizationBranding = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) return res.json({ success: true, data: { ok: true } });

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
  const logo = typeof body.logo === "string" ? body.logo.trim() : "";
  if (logo) patch.logoUrl = logo.slice(0, MAX_BRANDING_LEN);

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

  return res.json({ success: true, data: { ok: true } });
};
