import express from "express";
import mongoose from "mongoose";
import { AUTH_BYPASS } from "../config/env.js";
import { Organization } from "../models/Organization.js";
import {
  buildZohoOrganizationListItem,
  buildZohoOrganizationPayload,
  normalizeCurrencyCode,
  parseOrganizationPayload,
} from "../services/organizationPayloads.js";

const buildDevOrganization = () => ({
  _id: "dev_org",
  name: "Dev Org",
  primaryContactEmail: "dev@example.com",
  currencyCode: "USD",
  baseCurrency: "USD",
  languageCode: "en",
  language: "English",
  timeZone: "UTC",
  dateFormat: "dd MMM yyyy",
  fieldSeparator: " ",
  fiscalYearStartMonth: "january",
  createdAt: new Date().toISOString(),
});

const buildMyOrganizationSummary = (org: any) => ({
  id: String(org?._id || ""),
  name: String(org?.name || "").trim(),
  primaryContactEmail: String(org?.primaryContactEmail || "").trim(),
  portalName: String(org?.portalName || "").trim(),
  currencyCode: normalizeCurrencyCode(org?.currencyCode || org?.baseCurrency),
});

const requireDbConnection = (res: express.Response) => {
  if (mongoose.connection.readyState === 1) return true;
  res.status(500).json({ success: false, message: "DB not connected", data: null });
  return false;
};

const getAuthedOrganizationId = (req: express.Request) => String(req.user?.organizationId || "").trim();

const loadAccessibleOrganization = async (
  req: express.Request,
  res: express.Response,
  organizationId?: string,
) => {
  if (AUTH_BYPASS) {
    return buildDevOrganization();
  }

  const authedOrgId = getAuthedOrganizationId(req);
  if (!authedOrgId) {
    res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }

  const targetOrgId = String(organizationId || authedOrgId).trim();
  if (!targetOrgId) {
    res.status(400).json({ success: false, message: "Organization id is required", data: null });
    return null;
  }

  if (!mongoose.isValidObjectId(targetOrgId)) {
    res.status(400).json({ success: false, message: "Invalid organization id", data: null });
    return null;
  }

  if (targetOrgId !== authedOrgId) {
    res.status(403).json({ success: false, message: "You do not have access to this organization", data: null });
    return null;
  }

  if (!requireDbConnection(res)) return null;

  const organization = await Organization.findById(targetOrgId).lean();
  if (!organization) {
    res.status(404).json({ success: false, message: "Organization not found", data: null });
    return null;
  }

  return organization;
};

const updateOrganizationDocument = async (
  req: express.Request,
  res: express.Response,
  organizationId: string,
) => {
  if (AUTH_BYPASS) {
    const devOrg = {
      ...buildDevOrganization(),
      ...(req.body && typeof req.body === "object" ? req.body : {}),
      _id: organizationId || "dev_org",
    };
    return res.json({
      code: 0,
      message: "success",
      organization: buildZohoOrganizationPayload(devOrg, req.user),
    });
  }

  const existing = await loadAccessibleOrganization(req, res, organizationId);
  if (!existing) return;

  const { patch, errors } = parseOrganizationPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({
      code: 1,
      message: errors[0],
      errors,
    });
  }

  const updated = await Organization.findByIdAndUpdate(organizationId, { $set: patch }, { new: true }).lean();
  if (!updated) {
    return res.status(404).json({
      code: 1,
      message: "Organization not found",
    });
  }

  return res.json({
    code: 0,
    message: "success",
    organization: buildZohoOrganizationPayload(updated, req.user),
  });
};

export const getMyOrganization = async (req: express.Request, res: express.Response) => {
  const organization = await loadAccessibleOrganization(req, res);
  if (!organization) return;

  return res.json({
    success: true,
    data: buildMyOrganizationSummary(organization),
  });
};

export const updateMyOrganization = async (req: express.Request, res: express.Response) => {
  if (AUTH_BYPASS) {
    return res.json({ success: true, data: { ok: true } });
  }

  const organizationId = getAuthedOrganizationId(req);
  if (!organizationId) {
    return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  }

  const { patch, errors } = parseOrganizationPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors, data: null });
  }

  if (!requireDbConnection(res)) return;

  const updated = await Organization.findByIdAndUpdate(organizationId, { $set: patch }, { new: true }).lean();
  if (!updated) {
    return res.status(404).json({ success: false, message: "Organization not found", data: null });
  }

  return res.json({ success: true, data: buildMyOrganizationSummary(updated) });
};

export const listOrganizations = async (req: express.Request, res: express.Response) => {
  const organization = await loadAccessibleOrganization(req, res);
  if (!organization) return;

  return res.json({
    code: 0,
    message: "success",
    organizations: [buildZohoOrganizationListItem(organization, req.user)],
  });
};

export const getOrganizationById = async (req: express.Request, res: express.Response) => {
  const organization = await loadAccessibleOrganization(req, res, req.params.organization_id);
  if (!organization) return;

  return res.json({
    code: 0,
    message: "success",
    organization: buildZohoOrganizationPayload(organization, req.user),
  });
};

export const updateOrganizationById = async (req: express.Request, res: express.Response) =>
  updateOrganizationDocument(req, res, String(req.params.organization_id || "").trim());
