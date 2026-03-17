import type express from "express";
import mongoose from "mongoose";
import { CustomersVendorsSettings } from "../models/CustomersVendorsSettings.js";

const pickString = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
const pickBoolean = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const pickArray = (value: unknown) => (Array.isArray(value) ? value : undefined);

const DEFAULTS = {
  allowDuplicates: true,
  enableCustomerNumbers: false,
  customerNumberPrefix: "CUS-",
  customerNumberStart: "0001",
  enableVendorNumbers: false,
  vendorNumberPrefix: "VEN-",
  vendorNumberStart: "0001",
  defaultCustomerType: "business" as const,
  enableCreditLimit: false,
  creditLimitAction: "warn" as const,
  includeSalesOrders: false,
  billingAddressFormat:
    "${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}",
  shippingAddressFormat:
    "${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}",
};

export const getCustomersVendorsSettings: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization", data: null });
    }

    const settings =
      (await CustomersVendorsSettings.findOne({ organizationId: orgId }).lean()) ||
      (await CustomersVendorsSettings.create({ organizationId: orgId }));

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

export const upsertCustomersVendorsSettings: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization", data: null });
    }

    const body = (req.body || {}) as Record<string, unknown>;

    const defaultCustomerTypeRaw = pickString(body.defaultCustomerType, DEFAULTS.defaultCustomerType);
    const defaultCustomerType = defaultCustomerTypeRaw === "individual" ? "individual" : "business";

    const creditLimitActionRaw = pickString(body.creditLimitAction, DEFAULTS.creditLimitAction);
    const creditLimitAction = creditLimitActionRaw === "restrict" ? "restrict" : "warn";

    const update = {
      allowDuplicates: pickBoolean(body.allowDuplicates, DEFAULTS.allowDuplicates),
      enableCustomerNumbers: pickBoolean(body.enableCustomerNumbers, DEFAULTS.enableCustomerNumbers),
      customerNumberPrefix: pickString(body.customerNumberPrefix, DEFAULTS.customerNumberPrefix),
      customerNumberStart: pickString(body.customerNumberStart, DEFAULTS.customerNumberStart),
      enableVendorNumbers: pickBoolean(body.enableVendorNumbers, DEFAULTS.enableVendorNumbers),
      vendorNumberPrefix: pickString(body.vendorNumberPrefix, DEFAULTS.vendorNumberPrefix),
      vendorNumberStart: pickString(body.vendorNumberStart, DEFAULTS.vendorNumberStart),
      defaultCustomerType,
      enableCreditLimit: pickBoolean(body.enableCreditLimit, DEFAULTS.enableCreditLimit),
      creditLimitAction,
      includeSalesOrders: pickBoolean(body.includeSalesOrders, DEFAULTS.includeSalesOrders),
      billingAddressFormat: pickString(body.billingAddressFormat, DEFAULTS.billingAddressFormat),
      shippingAddressFormat: pickString(body.shippingAddressFormat, DEFAULTS.shippingAddressFormat),
      ...(pickArray(body.customFields) ? { customFields: body.customFields as unknown[] } : {}),
      ...(pickArray(body.customButtons) ? { customButtons: body.customButtons as unknown[] } : {}),
      ...(pickArray(body.relatedLists) ? { relatedLists: body.relatedLists as unknown[] } : {}),
    };

    const saved = await CustomersVendorsSettings.findOneAndUpdate(
      { organizationId: orgId },
      { $set: update, $setOnInsert: { organizationId: orgId } },
      { new: true, upsert: true }
    ).lean();

    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

