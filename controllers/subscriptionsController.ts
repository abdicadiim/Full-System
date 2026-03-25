import mongoose from "mongoose";
import { Subscription } from "../models/Subscription.js";
import { Invoice } from "../models/Invoice.js";

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);
const asNumber = (value: any, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asDate = (value: any) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const shouldGenerateBackdatedInvoice = (subscription: any) => {
  const startDate = String(subscription?.startDate || "").trim();
  if (!startDate) return true;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const isBackdated = startDate < todayKey;
  if (!isBackdated) return true;
  return Boolean(subscription?.backdatedGenerateInvoice ?? true);
};
const getNextInvoiceNumber = async (organizationId: any, prefix = "INV-") => {
  const last = await Invoice.findOne({
    organizationId,
    invoiceNumber: new RegExp(`^${prefix}`)
  })
    .sort({ invoiceNumber: -1 })
    .lean();

  let nextNo = 1;
  if (last) {
    const digits = String((last as any).invoiceNumber || "").match(/\d+$/);
    if (digits) nextNo = Number(digits[0]) + 1;
  }

  return `${prefix}${String(nextNo).padStart(6, "0")}`;
};
const buildInvoiceFromSubscription = async (organizationId: any, subscription: any) => {
  if (!subscription || !shouldGenerateBackdatedInvoice(subscription)) return null;

  const immediateCharges = asNumber(subscription?.immediateCharges ?? subscription?.total ?? subscription?.amount, 0);
  const paidAmount = asNumber(
    subscription?.amountReceived ??
      subscription?.amountPaid ??
      (subscription?.paymentReceived ? immediateCharges : 0),
    0
  );
  const balance = Math.max(0, immediateCharges - paidAmount);
  const status =
    immediateCharges <= 0 || balance <= 0 ? "paid" : paidAmount > 0 ? "partially paid" : "sent";
  const invoiceDate = asDate(subscription?.createdOn || subscription?.startDate || new Date()) || new Date();
  const dueDate = asDate(subscription?.nextBillingOn || invoiceDate) || invoiceDate;
  const subscriptionId = String(subscription?._id || subscription?.id || "").trim();
  const existing = await Invoice.findOne({
    organizationId,
    recurringProfileId: subscriptionId,
    isRecurringInvoice: true
  }).lean();
  if (existing) return existing;

  const invoiceNumber = await getNextInvoiceNumber(organizationId, "INV-");
  const sourceItems = Array.isArray(subscription?.items) ? subscription.items : [];
  const sourceAddons = Array.isArray(subscription?.addonLines) ? subscription.addonLines : [];
  const items = [
    ...sourceItems.map((item: any) => ({
      itemDetails: item?.itemDetails || item?.name || item?.label || "",
      description: item?.description || "",
      quantity: asNumber(item?.quantity, 1),
      rate: asNumber(item?.rate ?? item?.unitPrice ?? item?.price, 0),
      taxRate: asNumber(item?.taxRate, 0),
      amount: asNumber(item?.amount ?? item?.total, asNumber(item?.quantity, 1) * asNumber(item?.rate, 0))
    })),
    ...sourceAddons.map((item: any) => ({
      itemDetails: item?.addonName || item?.name || "Add-on",
      description: "",
      quantity: asNumber(item?.quantity, 1),
      rate: asNumber(item?.rate, 0),
      taxRate: asNumber(item?.taxRate, 0),
      amount: asNumber(item?.total, asNumber(item?.quantity, 1) * asNumber(item?.rate, 0))
    }))
  ];

  const invoicePayload = {
    organizationId,
    invoiceNumber,
    status,
    date: invoiceDate,
    invoiceDate,
    dueDate,
    customerId: String(subscription?.customerId || ""),
    customerName: String(subscription?.customerName || ""),
    customerEmail: String(subscription?.customerEmail || ""),
    billingAddress: subscription?.billingAddress || null,
    shippingAddress: subscription?.shippingAddress || null,
    salesperson: String(subscription?.salesperson || ""),
    currency: String(subscription?.currency || "USD"),
    items,
    subTotal: asNumber(subscription?.subTotal ?? subscription?.subtotal ?? subscription?.basePrice, immediateCharges),
    totalTax: asNumber(subscription?.taxAmount ?? subscription?.totalTax, 0),
    discountAmount: asNumber(subscription?.couponValue, 0),
    total: immediateCharges,
    amountPaid: paidAmount,
    balanceDue: balance,
    balance,
    isRecurringInvoice: true,
    recurringProfileId: subscriptionId,
    subscriptionId,
    subscriptionNumber: String(subscription?.subscriptionNumber || ""),
    referenceNumber: String(subscription?.referenceNumber || ""),
    source: "subscription"
  };

  return Invoice.create(invoicePayload);
};

export const listSubscriptions = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  const filter: any = { organizationId: orgId };
  if (req.query.customerId) filter.customerId = String(req.query.customerId);
  if (req.query.status) filter.status = String(req.query.status);

  const total = await Subscription.countDocuments(filter);
  const rows = await Subscription.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({
    success: true,
    data: rows.map(normalizeRow),
    pagination: { total, page: 1, limit: total, pages: 1 },
  });
};

export const createSubscription = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  if (!orgId || !mongoose.isValidObjectId(orgId)) {
    return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  }

  const payload: any = { ...(req.body || {}) };
  delete payload.id;
  delete payload._id;
  delete payload.organizationId;

  const created = await Subscription.create({ ...payload, organizationId: orgId });
  let generatedInvoice: any = null;

  if (Boolean(payload?.generateInvoices ?? true)) {
    try {
      generatedInvoice = await buildInvoiceFromSubscription(orgId, created.toObject());
    } catch (error) {
      console.error("Failed to auto-generate invoice from subscription:", error);
    }
  }

  if (generatedInvoice?._id) {
    await Subscription.updateOne(
      { _id: created._id, organizationId: orgId },
      {
        $set: {
          generatedInvoiceId: String(generatedInvoice._id),
          generatedInvoiceNumber: String(generatedInvoice.invoiceNumber || "")
        }
      }
    );
  }

  const finalRow = await Subscription.findById(created._id).lean();
  return res.status(201).json({
    success: true,
    data: {
      ...normalizeRow(finalRow || created.toObject()),
      generatedInvoice: generatedInvoice ? normalizeRow((generatedInvoice as any)?.toObject?.() || generatedInvoice) : null
    }
  });
};

export const getSubscriptionById = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  const row = await Subscription.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const updateSubscription = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  const updated = await Subscription.findOneAndUpdate(
    { _id: req.params.id, organizationId: orgId },
    { $set: req.body },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Not found", data: null });
  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteSubscription = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  await Subscription.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
  return res.json({ success: true, data: { id: req.params.id } });
};
