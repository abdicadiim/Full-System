import type express from "express";
import mongoose from "mongoose";
import { AUTH_BYPASS } from "../config/env.js";
import { QuoteSettings } from "../models/QuoteSettings.js";

const pickString = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
const pickBoolean = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const pickArray = (value: unknown) => (Array.isArray(value) ? value : undefined);

const DEFAULT_CUSTOM_FIELDS = [
  { name: "Sales person", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
  { name: "Description", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
];

const DEFAULTS = {
  allowEditingAcceptedQuotes: false,
  allowCustomerAcceptDecline: false,
  automationOption: "dont-convert",
  allowProgressInvoice: false,
  hideZeroValueItems: false,
  retainFields: {
    customerNotes: false,
    termsConditions: false,
    address: false,
  },
  termsConditions: "",
  customerNotes: "Looking forward for your business.",
  approvalType: "no-approval",
  notificationPreference: "all-submitters",
  notificationEmail: "",
  sendNotifications: true,
  notifySubmitter: true,
  approvalLevels: [] as unknown[],
  customFields: DEFAULT_CUSTOM_FIELDS as unknown[],
  customButtons: [] as unknown[],
  relatedLists: [] as unknown[],
};

const normalizeRetainFields = (value: any) => ({
  customerNotes: value?.customerNotes !== undefined ? Boolean(value.customerNotes) : DEFAULTS.retainFields.customerNotes,
  termsConditions: value?.termsConditions !== undefined ? Boolean(value.termsConditions) : DEFAULTS.retainFields.termsConditions,
  address: value?.address !== undefined ? Boolean(value.address) : DEFAULTS.retainFields.address,
});

const normalizeQuoteSettings = (settings: any) => ({
  allowEditingAcceptedQuotes: settings?.allowEditingAcceptedQuotes !== undefined ? Boolean(settings.allowEditingAcceptedQuotes) : DEFAULTS.allowEditingAcceptedQuotes,
  allowCustomerAcceptDecline: settings?.allowCustomerAcceptDecline !== undefined ? Boolean(settings.allowCustomerAcceptDecline) : DEFAULTS.allowCustomerAcceptDecline,
  automationOption: settings?.automationOption || DEFAULTS.automationOption,
  allowProgressInvoice: settings?.allowProgressInvoice !== undefined ? Boolean(settings.allowProgressInvoice) : DEFAULTS.allowProgressInvoice,
  hideZeroValueItems: settings?.hideZeroValueItems !== undefined ? Boolean(settings.hideZeroValueItems) : DEFAULTS.hideZeroValueItems,
  retainFields: normalizeRetainFields(settings?.retainFields),
  termsConditions: settings?.termsConditions || DEFAULTS.termsConditions,
  customerNotes: settings?.customerNotes || DEFAULTS.customerNotes,
  approvalType: settings?.approvalType || DEFAULTS.approvalType,
  notificationPreference: settings?.notificationPreference || DEFAULTS.notificationPreference,
  notificationEmail: settings?.notificationEmail || DEFAULTS.notificationEmail,
  sendNotifications: settings?.sendNotifications !== undefined ? Boolean(settings.sendNotifications) : DEFAULTS.sendNotifications,
  notifySubmitter: settings?.notifySubmitter !== undefined ? Boolean(settings.notifySubmitter) : DEFAULTS.notifySubmitter,
  approvalLevels: Array.isArray(settings?.approvalLevels) ? settings.approvalLevels : DEFAULTS.approvalLevels,
  customFields: Array.isArray(settings?.customFields) ? settings.customFields : DEFAULTS.customFields,
  customButtons: Array.isArray(settings?.customButtons) ? settings.customButtons : DEFAULTS.customButtons,
  relatedLists: Array.isArray(settings?.relatedLists) ? settings.relatedLists : DEFAULTS.relatedLists,
});

export const getQuotesSettings: express.RequestHandler = async (req, res, next) => {
  try {
    if (AUTH_BYPASS) {
      return res.json({ success: true, data: DEFAULTS });
    }

    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization", data: null });
    }

    const settings = await QuoteSettings.findOneAndUpdate(
      { organizationId: orgId },
      { $setOnInsert: { organizationId: orgId, ...DEFAULTS } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, data: normalizeQuoteSettings(settings) });
  } catch (err) {
    next(err);
  }
};

export const upsertQuotesSettings: express.RequestHandler = async (req, res, next) => {
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
    const current = await QuoteSettings.findOne({ organizationId: orgId }).lean();
    const normalizedCurrent = normalizeQuoteSettings(current);
    const bodyRetainFields = typeof body.retainFields === "object" && body.retainFields ? (body.retainFields as Record<string, unknown>) : {};

    const update = {
      allowEditingAcceptedQuotes: pickBoolean(body.allowEditingAcceptedQuotes, normalizedCurrent.allowEditingAcceptedQuotes),
      allowCustomerAcceptDecline: pickBoolean(body.allowCustomerAcceptDecline, normalizedCurrent.allowCustomerAcceptDecline),
      automationOption: pickString(body.automationOption, normalizedCurrent.automationOption || DEFAULTS.automationOption),
      allowProgressInvoice: pickBoolean(body.allowProgressInvoice, normalizedCurrent.allowProgressInvoice),
      hideZeroValueItems: pickBoolean(body.hideZeroValueItems, normalizedCurrent.hideZeroValueItems),
      retainFields: {
        customerNotes: pickBoolean(bodyRetainFields.customerNotes, normalizedCurrent.retainFields.customerNotes),
        termsConditions: pickBoolean(bodyRetainFields.termsConditions, normalizedCurrent.retainFields.termsConditions),
        address: pickBoolean(bodyRetainFields.address, normalizedCurrent.retainFields.address),
      },
      termsConditions: pickString(body.termsConditions, normalizedCurrent.termsConditions || DEFAULTS.termsConditions),
      customerNotes: pickString(body.customerNotes, normalizedCurrent.customerNotes || DEFAULTS.customerNotes),
      approvalType: pickString(body.approvalType, normalizedCurrent.approvalType || DEFAULTS.approvalType),
      notificationPreference: pickString(body.notificationPreference, normalizedCurrent.notificationPreference || DEFAULTS.notificationPreference),
      notificationEmail: pickString(body.notificationEmail, normalizedCurrent.notificationEmail || DEFAULTS.notificationEmail),
      sendNotifications: pickBoolean(body.sendNotifications, normalizedCurrent.sendNotifications),
      notifySubmitter: pickBoolean(body.notifySubmitter, normalizedCurrent.notifySubmitter),
      ...(pickArray(body.approvalLevels) ? { approvalLevels: body.approvalLevels as unknown[] } : current?.approvalLevels ? { approvalLevels: current.approvalLevels as unknown[] } : { approvalLevels: DEFAULTS.approvalLevels }),
      ...(pickArray(body.customFields) ? { customFields: body.customFields as unknown[] } : current?.customFields ? { customFields: current.customFields as unknown[] } : { customFields: DEFAULTS.customFields }),
      ...(pickArray(body.customButtons) ? { customButtons: body.customButtons as unknown[] } : current?.customButtons ? { customButtons: current.customButtons as unknown[] } : { customButtons: DEFAULTS.customButtons }),
      ...(pickArray(body.relatedLists) ? { relatedLists: body.relatedLists as unknown[] } : current?.relatedLists ? { relatedLists: current.relatedLists as unknown[] } : { relatedLists: DEFAULTS.relatedLists }),
    };

    const saved = await QuoteSettings.findOneAndUpdate(
      { organizationId: orgId },
      { $set: update, $setOnInsert: { organizationId: orgId } },
      { new: true, upsert: true }
    ).lean();

    return res.json({ success: true, data: normalizeQuoteSettings(saved) });
  } catch (err) {
    next(err);
  }
};
