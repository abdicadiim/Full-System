import type express from "express";
import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { CustomersVendorsSettings } from "../models/CustomersVendorsSettings.js";
import { StoredDocument } from "../models/StoredDocument.js";
import { buildCustomerIdsFilter, buildCustomerLookupFilter, isMongoObjectIdString } from "./customerIdentity.js";
import { recordDeletion, recordDeletions } from "../services/syncTombstoneService.js";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getOrgId = (req: express.Request) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return null;
  if (!mongoose.isValidObjectId(orgId)) return null;
  return orgId;
};

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const detectPrefix = (value: unknown) => {
  const text = asString(value).trim();
  if (!text) return "";
  const match = text.match(/^(\D*?)(\d+)/);
  return match ? match[1] : "";
};

const findDuplicateCustomerDisplayName = async (
  orgId: string,
  displayName: string,
  excludeId?: string
) => {
  const normalized = displayName.trim();
  if (!normalized) return false;

  const filter: Record<string, unknown> = {
    organizationId: orgId,
    $or: [
      { displayName: new RegExp(`^${escapeRegExp(normalized)}$`, "i") },
      { name: new RegExp(`^${escapeRegExp(normalized)}$`, "i") },
    ],
  };

  if (excludeId) {
    const normalizedExcludeId = excludeId.trim();
    const exclusions: Record<string, unknown>[] = [{ id: normalizedExcludeId }];
    if (isMongoObjectIdString(normalizedExcludeId)) {
      exclusions.push({ _id: normalizedExcludeId });
    }
    filter.$nor = exclusions;
  }

  return Boolean(await Customer.exists(filter));
};

const computeNextNumber = (existing: string[], opts: { prefix: string; start: string }) => {
  const prefix = opts.prefix || "";
  const startRaw = opts.start || "0001";
  const startNum = Number.parseInt(String(startRaw).replace(/\D/g, ""), 10);
  const pad = String(startRaw).replace(/\D/g, "").length || 4;

  let max = Number.isFinite(startNum) ? startNum - 1 : 0;
  for (const raw of existing) {
    const v = String(raw || "").trim();
    if (!v) continue;
    if (prefix && !v.startsWith(prefix)) continue;
    const numericPart = v.slice(prefix.length).match(/\d+/)?.[0] || "";
    const num = Number.parseInt(numericPart, 10);
    if (Number.isFinite(num) && num > max) max = num;
  }
  const next = max + 1;
  const nextPadded = String(next).padStart(pad, "0");
  return `${prefix}${nextPadded}`;
};

const normalizeCustomerComment = (comment: any, index = 0) => {
  if (!comment || typeof comment !== "object") return null;
  const id = String(comment.id || comment._id || `cm-${index}-${Date.now()}`).trim();
  if (!id) return null;

  const rawContent = String(comment.content ?? "").trim();
  const legacyText = String(comment.text ?? "").trim();
  const authorName = String(comment.authorName || comment.author || "You").trim() || "You";
  const createdAt = String(comment.createdAt || comment.timestamp || new Date().toISOString()).trim() || new Date().toISOString();
  const content = rawContent || legacyText;

  return {
    id,
    text: legacyText || content.replace(/<[^>]*>/g, ""),
    content,
    authorName,
    authorInitial: String(comment.authorInitial || authorName.charAt(0).toUpperCase() || "Y").trim() || "Y",
    createdAt,
    bold: Boolean(comment.bold),
    italic: Boolean(comment.italic),
    underline: Boolean(comment.underline),
    author: String(comment.author || authorName).trim() || "You",
    timestamp: createdAt,
  };
};

const normalizeCustomerComments = (comments: any) =>
  Array.isArray(comments)
    ? comments.map((comment, index) => normalizeCustomerComment(comment, index)).filter(Boolean)
    : [];

const normalizeCustomerRecord = (row: any) =>
  row
    ? {
        ...row,
        id: String(row._id || row.id || ""),
        _id: String(row._id || row.id || ""),
        comments: normalizeCustomerComments(row.comments),
        additionalAddresses: normalizeAdditionalAddresses(row.additionalAddresses),
        enablePortal: Boolean(row.enablePortal ?? row.portalEnabled ?? false),
        paymentReminderEnabled: Boolean(row.paymentReminderEnabled ?? row.payment_reminder_enabled ?? false),
        payment_reminder_enabled: Boolean(row.paymentReminderEnabled ?? row.payment_reminder_enabled ?? false),
      }
    : row;

const normalizeCustomerPatch = (payload: Record<string, unknown>) => {
  const patch = { ...payload };
  delete (patch as any)._id;
  delete (patch as any).id;
  if (Object.prototype.hasOwnProperty.call(payload, "comments") && (payload as any).comments !== undefined) {
    patch.comments = normalizeCustomerComments((payload as any).comments);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "additionalAddresses") && (payload as any).additionalAddresses !== undefined) {
    patch.additionalAddresses = normalizeAdditionalAddresses((payload as any).additionalAddresses);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "enablePortal") && (payload as any).enablePortal !== undefined) {
    patch.enablePortal = Boolean((payload as any).enablePortal);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "paymentReminderEnabled") && (payload as any).paymentReminderEnabled !== undefined) {
    patch.paymentReminderEnabled = Boolean((payload as any).paymentReminderEnabled);
  }
  return patch;
};

const normalizeCustomerAddress = (address: any, fallbackAddressId = "") => {
  if (!address || typeof address !== "object") return null;
  const now = new Date().toISOString();
  const addressId = asString(address.addressId || address.id || address._id || fallbackAddressId).trim() || new mongoose.Types.ObjectId().toString();
  return {
    addressId,
    attention: asString(address.attention).trim(),
    country: asString(address.country).trim(),
    street1: asString(address.street1 || address.addressLine1 || address.address).trim(),
    street2: asString(address.street2 || address.addressLine2).trim(),
    city: asString(address.city).trim(),
    state: asString(address.state).trim(),
    zipCode: asString(address.zipCode || address.zip || address.postalCode).trim(),
    phone: asString(address.phone).trim(),
    fax: asString(address.fax || address.faxNumber).trim(),
    createdAt: asString(address.createdAt).trim() || now,
    updatedAt: asString(address.updatedAt).trim() || now,
  };
};

const normalizeAdditionalAddresses = (addresses: unknown) =>
  Array.isArray(addresses)
    ? addresses.map((address, index) => normalizeCustomerAddress(address, `address-${index + 1}`)).filter(Boolean)
    : [];

const normalizeAddressContainer = (address: any, fallbackAddressId: string, addressType: string) => {
  const normalized = normalizeCustomerAddress(
    address && typeof address === "object"
      ? address
      : {
          street1: asString(address?.street1 || address?.addressLine1 || "").trim(),
          street2: asString(address?.street2 || address?.addressLine2 || "").trim(),
          city: asString(address?.city || "").trim(),
          state: asString(address?.state || "").trim(),
          zipCode: asString(address?.zipCode || address?.zip || "").trim(),
          country: asString(address?.country || "").trim(),
          attention: asString(address?.attention || "").trim(),
          phone: asString(address?.phone || "").trim(),
          fax: asString(address?.fax || "").trim(),
        },
    fallbackAddressId
  );

  if (!normalized) return null;
  return {
    ...normalized,
    addressId: fallbackAddressId,
    type: addressType,
  };
};

const normalizeCustomerAddressList = (customer: any) => {
  const billing = normalizeAddressContainer(
    customer?.billingAddress || {
      attention: customer?.billingAttention,
      country: customer?.billingCountry,
      street1: customer?.billingStreet1,
      street2: customer?.billingStreet2,
      city: customer?.billingCity,
      state: customer?.billingState,
      zipCode: customer?.billingZipCode,
      phone: customer?.billingPhone,
      fax: customer?.billingFax,
    },
    "billing",
    "billing"
  );
  const shipping = normalizeAddressContainer(
    customer?.shippingAddress || {
      attention: customer?.shippingAttention,
      country: customer?.shippingCountry,
      street1: customer?.shippingStreet1,
      street2: customer?.shippingStreet2,
      city: customer?.shippingCity,
      state: customer?.shippingState,
      zipCode: customer?.shippingZipCode,
      phone: customer?.shippingPhone,
      fax: customer?.shippingFax,
    },
    "shipping",
    "shipping"
  );
  const additional = normalizeAdditionalAddresses(customer?.additionalAddresses).map((address: any) => ({
    ...address,
    type: "additional",
  }));
  return [billing, shipping, ...additional].filter(Boolean);
};

const refreshCustomerRecord = async (orgId: string, customerId: string) => {
  const refreshed = await Customer.findOne({ _id: customerId, organizationId: orgId }).lean();
  return refreshed ? normalizeCustomerRecord(refreshed) : null;
};

const updateCustomerPortalAccess = async (
  orgId: string,
  customerId: string,
  enabled: boolean,
  providedContacts: any[] = []
) => {
  const customer = await Customer.findOne({ _id: customerId, organizationId: orgId }).lean();
  if (!customer) return null;

  const existingContacts = Array.isArray(customer.contactPersons) ? customer.contactPersons : [];
  const normalizedProvided = providedContacts
    .map((contact: any) => ({
      contactPersonId: asString(contact?.contact_person_id || contact?.id || contact?._id || contact?.contactPersonId).trim(),
      email: asString(contact?.email).trim(),
      hasAccess: Boolean(contact?.hasAccess ?? contact?.enablePortal ?? contact?.selected ?? enabled),
    }))
    .filter((contact: any) => contact.contactPersonId || contact.email);

  let nextContactPersons = existingContacts;
  if (existingContacts.length > 0) {
    nextContactPersons = existingContacts.map((contact: any, index: number) => {
      const contactId = asString(contact?.id || contact?._id || contact?.contact_person_id || contact?.contactPersonId || index + 1).trim();
      const provided = normalizedProvided.find((entry: any) => entry.contactPersonId === contactId);
      if (provided) {
        return {
          ...contact,
          email: provided.email || contact.email || "",
          hasPortalAccess: enabled ? provided.hasAccess : false,
          enablePortal: enabled ? provided.hasAccess : false,
        };
      }
      return {
        ...contact,
        hasPortalAccess: enabled ? Boolean(contact?.hasPortalAccess ?? contact?.enablePortal ?? false) : false,
        enablePortal: enabled ? Boolean(contact?.enablePortal ?? contact?.hasPortalAccess ?? false) : false,
      };
    });
  }

  const nextEnablePortal = enabled
    ? nextContactPersons.some((contact: any) => Boolean(contact?.hasPortalAccess || contact?.enablePortal)) || normalizedProvided.some((contact: any) => contact.hasAccess)
    : false;

  const primaryProvided = normalizedProvided.find((entry: any) => entry.hasAccess) || normalizedProvided[0] || null;
  const nextEmail = primaryProvided?.email || customer.email || "";

  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, organizationId: orgId },
    {
      $set: {
        enablePortal: nextEnablePortal,
        contactPersons: nextContactPersons,
        email: nextEmail,
      },
    },
    { new: true }
  ).lean();

  return updated ? normalizeCustomerRecord(updated) : null;
};

const updateCustomerPaymentReminder = async (orgId: string, customerId: string, enabled: boolean) => {
  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, organizationId: orgId },
    {
      $set: {
        paymentReminderEnabled: enabled,
        payment_reminder_enabled: enabled,
      },
    },
    { new: true }
  ).lean();

  return updated ? normalizeCustomerRecord(updated) : null;
};

const setCustomerStatus = async (orgId: string, customerId: string, status: "active" | "inactive") => {
  const enabled = status === "active";
  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, organizationId: orgId },
    {
      $set: {
        status,
        isActive: enabled,
        isInactive: !enabled,
      },
    },
    { new: true }
  ).lean();

  return updated ? normalizeCustomerRecord(updated) : null;
};

const getDocumentIds = (documents: unknown) =>
  (Array.isArray(documents) ? documents : [])
    .map((doc: any) => String(doc?.documentId || doc?.id || doc?._id || "").trim())
    .filter(Boolean);

const linkCustomerDocuments = async (orgId: string, customerId: string, documents: unknown) => {
  const documentIds = getDocumentIds(documents);
  if (!documentIds.length) return;

  await StoredDocument.updateMany(
    { organizationId: orgId, _id: { $in: documentIds } },
    { $set: { relatedToType: "customer", relatedToId: customerId } }
  ).catch(() => null);
};

const parseCustomerStatementContacts = (customer: any) => {
  const contactPersons = Array.isArray(customer?.contactPersons) ? customer.contactPersons : [];
  if (contactPersons.length > 0) {
    return contactPersons
      .map((contact: any, index: number) => {
        const firstName = asString(contact?.firstName || contact?.givenName || "").trim();
        const lastName = asString(contact?.lastName || contact?.familyName || "").trim();
        const email = asString(contact?.email || "").trim();
        const contactPersonId = asString(contact?.id || contact?._id || contact?.contact_person_id || contact?.contactPersonId || index + 1).trim();
        if (!firstName && !lastName && !email) return null;
        return {
          first_name: firstName,
          last_name: lastName,
          selected: Boolean(contact?.isPrimary || contact?.hasPortalAccess || contact?.enablePortal),
          phone: asString(contact?.phone || contact?.workPhone || contact?.mobile || "").trim(),
          email,
          contact_person_id: contactPersonId,
          salutation: asString(contact?.salutation || "").trim(),
          mobile: asString(contact?.mobile || "").trim(),
        };
      })
      .filter(Boolean);
  }

  const fallbackEmail = asString(customer?.email || "").trim();
  if (!fallbackEmail) return [];
  return [
    {
      first_name: asString(customer?.firstName || "").trim(),
      last_name: asString(customer?.lastName || "").trim(),
      selected: true,
      phone: asString(customer?.workPhone || customer?.mobile || "").trim(),
      email: fallbackEmail,
      contact_person_id: "",
      salutation: asString(customer?.salutation || "").trim(),
      mobile: asString(customer?.mobile || "").trim(),
    },
  ];
};

export const listCustomers: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const q = asString(req.query.search ?? req.query.q).trim();
    const status = asString(req.query.status).trim().toLowerCase();
    const limit = Math.max(0, Number(req.query.limit || 0));
    const page = Math.max(1, Number(req.query.page || 1));

    const filter: any = { organizationId: orgId };
    if (status) filter.status = new RegExp(`^${escapeRegExp(status)}$`, "i");
    if (q) {
      const re = new RegExp(escapeRegExp(q), "i");
      filter.$or = [
        { name: re },
        { displayName: re },
        { companyName: re },
        { email: re },
        { customerNumber: re },
      ];
    }

    const total = await Customer.countDocuments(filter);

    let query = Customer.find(filter).sort({ createdAt: -1 });
    if (limit > 0) query = query.skip((page - 1) * limit).limit(limit);
    const rows = await query.lean();

    res.json({
      success: true,
      data: rows.map(normalizeCustomerRecord),
      total,
      page,
      limit: limit || total,
      totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerById: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const filter = buildCustomerLookupFilter(orgId, req.params.id);
    if (!filter) {
      return res.status(400).json({ success: false, message: "Invalid customer id", data: null });
    }

    const row = await Customer.findOne(filter).lean();
    if (!row) return res.status(404).json({ success: false, message: "Customer not found", data: null });
    res.json({ success: true, data: normalizeCustomerRecord(row) });
  } catch (err) {
    next(err);
  }
};

export const getCustomerAddresses: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const row = await Customer.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!row) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    const addresses = normalizeCustomerAddressList(row);
    res.json({ success: true, message: "success", data: addresses, addresses });
  } catch (err) {
    next(err);
  }
};

export const addCustomerAddress: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const customer = await Customer.findOne({ _id: customerId, organizationId: orgId }).lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    const created = normalizeCustomerAddress(req.body, "") || null;
    if (!created) {
      return res.status(400).json({ success: false, message: "Invalid address payload", data: null });
    }

    const nextAddress = {
      ...created,
      addressId: created.addressId || new mongoose.Types.ObjectId().toString(),
      createdAt: created.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const additionalAddresses = normalizeAdditionalAddresses(customer.additionalAddresses);
    additionalAddresses.push(nextAddress);

    const updated = await Customer.findOneAndUpdate(
      { _id: customerId, organizationId: orgId },
      { $set: { additionalAddresses } },
      { new: true }
    ).lean();

    const refreshed = updated ? normalizeCustomerRecord(updated) : null;
    return res.status(201).json({
      success: true,
      message: "The address has been created.",
      data: { address_info: nextAddress },
      address_info: nextAddress,
      customer: refreshed,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCustomerAddress: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const addressId = asString(req.params.addressId).trim();
    if (!addressId || addressId === "billing" || addressId === "shipping") {
      return res.status(400).json({ success: false, message: "Invalid address id", data: null });
    }

    const customer = await Customer.findOne({ _id: customerId, organizationId: orgId }).lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    const addresses = normalizeAdditionalAddresses(customer.additionalAddresses);
    const index = addresses.findIndex((entry: any) => String(entry.addressId || "").trim() === addressId);
    if (index < 0) {
      return res.status(404).json({ success: false, message: "Address not found", data: null });
    }

    const currentAddress = addresses[index] as any;
    if (!currentAddress) {
      return res.status(404).json({ success: false, message: "Address not found", data: null });
    }

    const normalizedAddress = normalizeCustomerAddress({ ...currentAddress, ...req.body, addressId }, addressId);
    if (!normalizedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address payload", data: null });
    }

    const nextAddress = {
      ...normalizedAddress,
      addressId,
      createdAt: currentAddress.createdAt || normalizedAddress.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addresses[index] = nextAddress;

    const updated = await Customer.findOneAndUpdate(
      { _id: customerId, organizationId: orgId },
      { $set: { additionalAddresses: addresses } },
      { new: true }
    ).lean();

    return res.json({
      success: true,
      message: "The address has been updated.",
      data: { address_info: nextAddress },
      address_info: nextAddress,
      customer: updated ? normalizeCustomerRecord(updated) : null,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomerAddress: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const addressId = asString(req.params.addressId).trim();
    if (!addressId || addressId === "billing" || addressId === "shipping") {
      return res.status(400).json({ success: false, message: "Invalid address id", data: null });
    }

    const customer = await Customer.findOne({ _id: customerId, organizationId: orgId }).lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    const addresses = normalizeAdditionalAddresses(customer.additionalAddresses);
    const filtered = addresses.filter((entry: any) => String(entry.addressId || "").trim() !== addressId);
    if (filtered.length === addresses.length) {
      return res.status(404).json({ success: false, message: "Address not found", data: null });
    }

    const updated = await Customer.findOneAndUpdate(
      { _id: customerId, organizationId: orgId },
      { $set: { additionalAddresses: filtered } },
      { new: true }
    ).lean();

    return res.json({
      success: true,
      message: "The address has been deleted.",
      data: updated ? normalizeCustomerRecord(updated) : null,
      customer: updated ? normalizeCustomerRecord(updated) : null,
    });
  } catch (err) {
    next(err);
  }
};

export const enableCustomerPortal: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const providedContacts = Array.isArray(req.body?.contact_persons) ? (req.body.contact_persons as any[]) : [];
    const updated = await updateCustomerPortalAccess(orgId, customerId, true, providedContacts);
    if (!updated) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    return res.json({
      success: true,
      message: "Client Portal preferences have been updated",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const disableCustomerPortal: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const providedContacts = Array.isArray(req.body?.contact_persons) ? (req.body.contact_persons as any[]) : [];
    const updated = await updateCustomerPortalAccess(orgId, customerId, false, providedContacts);
    if (!updated) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    return res.json({
      success: true,
      message: "Client Portal preferences have been updated",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const enableCustomerPaymentReminders: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const updated = await updateCustomerPaymentReminder(orgId, customerId, true);
    if (!updated) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    return res.json({
      success: true,
      message: "All reminders associated with this contact have been enabled.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const disableCustomerPaymentReminders: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const updated = await updateCustomerPaymentReminder(orgId, customerId, false);
    if (!updated) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    return res.json({
      success: true,
      message: "All reminders associated with this contact have been stopped.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const markCustomerActive: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const updated = await setCustomerStatus(orgId, customerId, "active");
    if (!updated) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    return res.json({ success: true, message: "The contact has been marked as active.", data: updated });
  } catch (err) {
    next(err);
  }
};

export const markCustomerInactive: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const updated = await setCustomerStatus(orgId, customerId, "inactive");
    if (!updated) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    return res.json({ success: true, message: "The contact has been marked as inactive.", data: updated });
  } catch (err) {
    next(err);
  }
};

export const getCustomerStatementEmail: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const row = await Customer.findOne({ _id: customerId, organizationId: orgId }).lean();
    if (!row) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    const customerName = asString(row.displayName || row.name || row.companyName || "Customer").trim() || "Customer";
    const startDate = asString(req.query.start_date).trim();
    const endDate = asString(req.query.end_date).trim();
    const body = startDate && endDate
      ? `Dear Customer,<br/>We have attached your statement for the period ${startDate} to ${endDate}.`
      : `Dear Customer,<br/>We have attached your statement for the current month.`;

    return res.json({
      success: true,
      message: "success",
      data: {
        body,
        subject: `Statement of transactions with ${customerName}`,
        to_contacts: parseCustomerStatementContacts(row),
        from_emails: [],
        file_name: `statement_${customerName.replace(/\s+/g, "") || "Customer"}.pdf`,
        contact_id: customerId,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const sendCustomerStatementEmail: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const customerId = asString(req.params.id).trim();
    const row = await Customer.findOne({ _id: customerId, organizationId: orgId }).lean();
    if (!row) return res.status(404).json({ success: false, message: "Customer not found", data: null });

    const updated = await Customer.findOneAndUpdate(
      { _id: customerId, organizationId: orgId },
      {
        $set: {
          statementEmailLastSentAt: new Date().toISOString(),
          statementEmailPayload: {
            subject: asString(req.body?.subject).trim(),
            body: asString(req.body?.body).trim(),
            to_mail_ids: Array.isArray(req.body?.to_mail_ids) ? req.body.to_mail_ids : [],
            cc_mail_ids: Array.isArray(req.body?.cc_mail_ids) ? req.body.cc_mail_ids : [],
          },
        },
      },
      { new: true }
    ).lean();

    return res.json({
      success: true,
      message: "Statement has been sent to the Customer.",
      data: updated ? normalizeCustomerRecord(updated) : null,
    });
  } catch (err) {
    next(err);
  }
};

export const createCustomer: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const payload = (req.body || {}) as Record<string, unknown>;
    const settings = await CustomersVendorsSettings.findOne({ organizationId: orgId }).lean();
    const allowDuplicates = settings?.allowDuplicates !== undefined ? settings.allowDuplicates : true;
    const enableCustomerNumbers = settings?.enableCustomerNumbers ?? false;
    const desiredCustomerNumber = asString(payload.customerNumber).trim();
    const displayName = asString(payload.displayName).trim() || asString(payload.name).trim();

    if (!allowDuplicates && displayName) {
      const duplicateDisplayName = await findDuplicateCustomerDisplayName(orgId, displayName);
      if (duplicateDisplayName) {
        return res.status(400).json({
          success: false,
          message: "Duplicate customer display name is not allowed.",
          data: null,
        });
      }
    }

    let customerNumber = desiredCustomerNumber;
    if (!customerNumber && enableCustomerNumbers) {
      const prefix = settings?.customerNumberPrefix || "CUS-";
      const existingNumbers = await Customer.find(
        { organizationId: orgId, customerNumber: new RegExp(`^${escapeRegExp(prefix)}`) },
        { customerNumber: 1 }
      )
        .lean()
        .then((rows) => rows.map((r: any) => String(r.customerNumber || "")));
      customerNumber = computeNextNumber(existingNumbers, {
        prefix,
        start: settings?.customerNumberStart || "0001",
      });
    } else {
      const exists = await Customer.exists({ organizationId: orgId, customerNumber });
      if (exists) {
        const prefix = detectPrefix(customerNumber) || "CUS-";
        const existingNumbers = await Customer.find(
          { organizationId: orgId, customerNumber: new RegExp(`^${escapeRegExp(prefix)}`) },
          { customerNumber: 1 }
        )
          .lean()
          .then((rows) => rows.map((r: any) => String(r.customerNumber || "")));
        customerNumber = computeNextNumber(existingNumbers, {
          prefix,
          start: settings?.customerNumberStart || "0001",
        });
      }
    }

    const created = await Customer.create({ ...normalizeCustomerPatch(payload), customerNumber, organizationId: orgId });
    await linkCustomerDocuments(orgId, String(created._id), (payload as Record<string, unknown>).documents);
    const refreshed = await Customer.findById(created._id).lean();
    res.status(201).json({ success: true, data: normalizeCustomerRecord(refreshed || created.toObject()) });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const payload = (req.body || {}) as Record<string, unknown>;
    const settings = await CustomersVendorsSettings.findOne({ organizationId: orgId }).lean();
    const allowDuplicates = settings?.allowDuplicates !== undefined ? settings.allowDuplicates : true;
    const displayName = asString(payload.displayName).trim() || asString(payload.name).trim();
    const normalizedPayload = normalizeCustomerPatch(payload);

    if (!allowDuplicates && displayName) {
      const duplicateDisplayName = await findDuplicateCustomerDisplayName(orgId, displayName, String(req.params.id));
      if (duplicateDisplayName) {
        return res.status(400).json({
          success: false,
          message: "Duplicate customer display name is not allowed.",
          data: null,
        });
      }
    }

    const filter = buildCustomerLookupFilter(orgId, req.params.id);
    if (!filter) {
      return res.status(400).json({ success: false, message: "Invalid customer id", data: null });
    }

    const updated = await Customer.findOneAndUpdate(
      filter,
      { $set: { ...normalizedPayload } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Customer not found", data: null });
    const persistedCustomerId = String(updated._id || (updated as any)?.id || req.params.id).trim();
    await linkCustomerDocuments(orgId, persistedCustomerId, (payload as Record<string, unknown>).documents);
    const refreshed = await Customer.findOne({ _id: persistedCustomerId, organizationId: orgId }).lean();
    res.json({ success: true, data: normalizeCustomerRecord(refreshed || updated) });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const filter = buildCustomerLookupFilter(orgId, req.params.id);
    if (!filter) {
      return res.status(400).json({ success: false, message: "Invalid customer id", data: null });
    }

    const deleted = await Customer.findOneAndDelete(filter).lean();
    if (!deleted) return res.status(404).json({ success: false, message: "Customer not found", data: null });
    await recordDeletion({
      organizationId: orgId,
      resourceId: "customers.list",
      documentId: String(deleted._id || ""),
    });
    await StoredDocument.deleteMany({
      organizationId: orgId,
      relatedToType: "customer",
      relatedToId: String(deleted._id),
    }).catch(() => null);
    res.json({ success: true, data: { id: String(deleted._id) } });
  } catch (err) {
    next(err);
  }
};

export const bulkUpdateCustomers: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
    const data = normalizeCustomerPatch((req.body?.data || {}) as Record<string, unknown>);
    const filter = buildCustomerIdsFilter(orgId, ids);
    if (!filter) return res.json({ success: true, data: [] });

    await Customer.updateMany(filter, { $set: data });
    const rows = await Customer.find(filter).lean();
    res.json({ success: true, data: rows.map(normalizeCustomerRecord) });
  } catch (err) {
    next(err);
  }
};

export const bulkDeleteCustomers: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
    const filter = buildCustomerIdsFilter(orgId, ids);
    if (!filter) return res.json({ success: true, data: { ids: [] } });

    const rows = await Customer.find(filter, { _id: 1 }).lean();
    const deletedIds = rows.map((row: any) => String(row?._id || "")).filter(Boolean);
    if (!deletedIds.length) {
      return res.json({ success: true, data: { ids: [] } });
    }

    await Customer.deleteMany({ organizationId: orgId, _id: { $in: deletedIds } });
    await recordDeletions({
      organizationId: orgId,
      resourceId: "customers.list",
      documentIds: deletedIds,
    });
    await StoredDocument.deleteMany({
      organizationId: orgId,
      relatedToType: "customer",
      relatedToId: { $in: deletedIds },
    }).catch(() => null);
    res.json({ success: true, data: { ids: deletedIds } });
  } catch (err) {
    next(err);
  }
};

export const mergeCustomers: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const targetId = req.params.id;
    const targetFilter = buildCustomerLookupFilter(orgId, targetId);
    if (!targetFilter) {
      return res.status(400).json({ success: false, message: "Invalid target id", data: null });
    }
    const target = await Customer.findOne(targetFilter);
    if (!target) return res.status(404).json({ success: false, message: "Target customer not found", data: null });
    const persistedTargetId = String(target._id || (target as any)?.id || targetId).trim();

    const sourceIds = Array.isArray(req.body?.sourceCustomerIds) ? (req.body.sourceCustomerIds as unknown[]) : [];
    const sourceFilter = buildCustomerIdsFilter(orgId, sourceIds);
    if (!sourceFilter) {
      return res.status(400).json({ success: false, message: "No source customers found to merge", data: null });
    }

    const sources = (await Customer.find(sourceFilter).lean()).filter(
      (row: any) => String(row?._id || "") !== persistedTargetId
    );
    const sourceObjectIds = sources.map((row: any) => String(row?._id || "")).filter(Boolean);

    if (!sourceObjectIds.length) {
      return res.status(400).json({ success: false, message: "No source customers found to merge", data: null });
    }

    // Mark sources inactive and point to target.
    await Customer.updateMany(
      { organizationId: orgId, _id: { $in: sourceObjectIds } },
      { $set: { status: "inactive", mergedInto: persistedTargetId, updatedAt: new Date().toISOString() } }
    );

    // Optionally aggregate some numeric fields if present.
    const sumNumber = (key: string) =>
      sources.reduce((sum, s: any) => sum + (Number.parseFloat(String((s as any)?.[key] ?? 0)) || 0), 0);

    const patch: any = {};
    if ((target as any).receivables !== undefined) patch.receivables = (Number((target as any).receivables) || 0) + sumNumber("receivables");
    if ((target as any).unusedCredits !== undefined)
      patch.unusedCredits = (Number((target as any).unusedCredits) || 0) + sumNumber("unusedCredits");

    const updated = await Customer.findOneAndUpdate(
      { _id: persistedTargetId, organizationId: orgId },
      { $set: patch },
      { new: true }
    ).lean();
    res.json({ success: true, data: normalizeCustomerRecord(updated) });
  } catch (err) {
    next(err);
  }
};

export const getNextCustomerNumber: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const settings = await CustomersVendorsSettings.findOne({ organizationId: orgId }).lean();
    const prefix = asString(req.query.prefix).trim() || settings?.customerNumberPrefix || "CUS-";
    const start = asString(req.query.start).trim() || settings?.customerNumberStart || "0001";

    const re = new RegExp(`^${escapeRegExp(prefix)}`);
    const rows = await Customer.find({ organizationId: orgId, customerNumber: re }, { customerNumber: 1 }).lean();
    const existing = rows.map((r: any) => String(r.customerNumber || ""));
    const nextNumber = computeNextNumber(existing, { prefix, start });

    res.json({ success: true, data: nextNumber });
  } catch (err) {
    next(err);
  }
};
