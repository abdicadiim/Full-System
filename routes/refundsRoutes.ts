import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../midelwares/requireAuth.js";
import { PaymentReceived } from "../models/PaymentReceived.js";
import { Invoice } from "../models/Invoice.js";
import { CreditNote } from "../models/CreditNote.js";
import { Refund } from "../models/Refund.js";

const router = express.Router();
router.use(requireAuth);

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);
const roundMoney = (value: any) => Math.round((Number(value) || 0) * 100) / 100;
const normalizeStatus = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .trim();

const toObjectIdLike = (value: any) => String(value || "").trim();

const getRefundNumber = async (organizationId: any) => {
  const rows = await Refund.find({ organizationId }, { refundNumber: 1 }).lean();
  const maxSerial = rows.reduce((max, row: any) => {
    const match = String(row?.refundNumber || "").match(/(\d+)$/);
    const serial = match ? Number(match[1]) : 0;
    return Number.isFinite(serial) ? Math.max(max, serial) : max;
  }, 0);
  return `RF-${String(maxSerial + 1).padStart(6, "0")}`;
};

const getPaymentAllocationEntries = (payment: any) => {
  const entries: Array<{ invoiceId: string; invoiceNumber: string; amount: number }> = [];
  const seen = new Set<string>();

  const pushEntry = (invoiceId: any, invoiceNumber: any, amount: any) => {
    const key = String(invoiceId || invoiceNumber || "").trim();
    const normalizedAmount = roundMoney(amount);
    if (!key || normalizedAmount <= 0 || seen.has(key)) return;
    seen.add(key);
    entries.push({
      invoiceId: String(invoiceId || "").trim(),
      invoiceNumber: String(invoiceNumber || "").trim(),
      amount: normalizedAmount,
    });
  };

  if (payment?.invoicePayments && typeof payment.invoicePayments === "object" && !Array.isArray(payment.invoicePayments)) {
    Object.entries(payment.invoicePayments).forEach(([invoiceId, amount]) => {
      pushEntry(invoiceId, "", amount);
    });
    if (entries.length > 0) return entries;
  }

  if (Array.isArray(payment?.allocations)) {
    payment.allocations.forEach((allocation: any) => {
      const invoiceId = allocation?.invoiceId || allocation?.invoice?._id || allocation?.invoice?.id || allocation?.invoice;
      const invoiceNumber = allocation?.invoiceNumber || allocation?.invoice?.invoiceNumber || "";
      const amount = allocation?.amount;
      pushEntry(invoiceId, invoiceNumber, amount);
    });
    if (entries.length > 0) return entries;
  }

  const directInvoiceId = String(payment?.invoiceId || "").trim();
  const directInvoiceNumber = String(payment?.invoiceNumber || "").trim();
  const directAppliedAmount = roundMoney(
    Number(
      payment?.amountUsedForPayments ??
        payment?.appliedAmount ??
        payment?.amountApplied ??
        payment?.amount ??
        payment?.amountReceived ??
        0
    )
  );
  if (directInvoiceId && directAppliedAmount > 0) {
    pushEntry(directInvoiceId, directInvoiceNumber, directAppliedAmount);
  }

  return entries;
};

const updateInvoiceAfterRefund = async (invoiceId: string, organizationId: any, amountToReverse: number) => {
  const normalizedInvoiceId = toObjectIdLike(invoiceId);
  if (!normalizedInvoiceId || amountToReverse <= 0 || !mongoose.isValidObjectId(normalizedInvoiceId)) {
    return null;
  }

  const current: any = await Invoice.findOne({ _id: normalizedInvoiceId, organizationId }).lean();
  if (!current) return null;

  const totalAmount = roundMoney(Number(current.total ?? current.amount ?? 0));
  const currentPaid = roundMoney(Number(current.amountPaid ?? current.paidAmount ?? 0));
  const nextPaid = Math.max(0, roundMoney(currentPaid - amountToReverse));
  const nextBalance = Math.max(0, roundMoney(totalAmount - nextPaid));
  const currentStatus = normalizeStatus(current.status || "sent");
  const nextStatus =
    currentStatus === "void"
      ? current.status
      : nextPaid > 0 && nextBalance <= 0
        ? "paid"
        : nextPaid > 0 && nextBalance > 0
          ? "partially_paid"
          : currentStatus === "draft"
            ? "draft"
            : "sent";

  const patch: Record<string, any> = {
    amountPaid: nextPaid,
    paidAmount: nextPaid,
    balanceDue: nextBalance,
    balance: nextBalance,
    amountDue: nextBalance,
    status: nextStatus,
  };

  const updated = await Invoice.findOneAndUpdate(
    { _id: normalizedInvoiceId, organizationId },
    { $set: patch },
    { new: true }
  ).lean();

  return normalizeRow(updated);
};

const buildRefundApplication = async ({
  payment,
  organizationId,
  amount,
  targetInvoiceId,
}: {
  payment: any;
  organizationId: any;
  amount: number;
  targetInvoiceId: string;
}) => {
  const entries = getPaymentAllocationEntries(payment);
  const paymentAmount = roundMoney(Number(payment?.amountReceived ?? payment?.amount ?? 0));
  const refundedSoFarRows = await Refund.find({
    organizationId,
    paymentId: String(payment?._id || payment?.id || "").trim(),
  })
    .lean()
    .exec();
  const refundedSoFar = roundMoney(refundedSoFarRows.reduce((sum, row: any) => sum + Number(row?.amount || 0), 0));
  const remainingRefundable = Math.max(0, roundMoney(paymentAmount - refundedSoFar));
  if (amount > remainingRefundable) {
    const err: any = new Error("Refund amount cannot exceed the remaining refundable amount.");
    err.statusCode = 400;
    throw err;
  }

  const unappliedAmount = roundMoney(
    Number(
      payment?.unappliedAmount ??
        Math.max(0, paymentAmount - Number(payment?.amountUsedForPayments ?? 0))
    )
  );

  const invoiceAdjustments: Array<{
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
  }> = [];

  let remaining = roundMoney(amount);

  const targetKey = String(targetInvoiceId || "").trim();
  const targetNumber = String(payment?.invoiceNumber || "").trim().toLowerCase();
  const matchEntry = targetKey
    ? entries.find((entry) => {
        const entryId = String(entry.invoiceId || "").trim();
        const entryNumber = String(entry.invoiceNumber || "").trim().toLowerCase();
        return (entryId && entryId === targetKey) || (entryNumber && entryNumber === targetNumber);
      })
    : null;

  if (targetKey) {
    if (matchEntry) {
      const reverseAmount = Math.min(remaining, matchEntry.amount);
      const updatedInvoice = await updateInvoiceAfterRefund(matchEntry.invoiceId, organizationId, reverseAmount);
      if (updatedInvoice) {
        invoiceAdjustments.push({
          invoiceId: matchEntry.invoiceId,
          invoiceNumber: matchEntry.invoiceNumber || String(updatedInvoice.invoiceNumber || ""),
          amount: reverseAmount,
        });
      }
      remaining = roundMoney(remaining - reverseAmount);
    } else if (String(payment?.invoiceId || "").trim() === targetKey && remaining > 0) {
      const directAmount = roundMoney(
        Number(
          payment?.amountUsedForPayments ??
            payment?.amount ??
            payment?.amountReceived ??
            0
        )
      );
      const reverseAmount = Math.min(remaining, directAmount);
      const updatedInvoice = await updateInvoiceAfterRefund(targetKey, organizationId, reverseAmount);
      if (updatedInvoice) {
        invoiceAdjustments.push({
          invoiceId: targetKey,
          invoiceNumber: String(payment?.invoiceNumber || updatedInvoice.invoiceNumber || ""),
          amount: reverseAmount,
        });
      }
      remaining = roundMoney(remaining - reverseAmount);
    }

    const fromUnapplied = Math.min(remaining, unappliedAmount);
    remaining = roundMoney(remaining - fromUnapplied);

    if (remaining > 0) {
      const err: any = new Error("Refund amount exceeds the amount available for this invoice.");
      err.statusCode = 400;
      throw err;
    }

    return { invoiceAdjustments, refundedFromUnapplied: roundMoney(fromUnapplied) };
  }

  const fromUnapplied = Math.min(remaining, unappliedAmount);
  remaining = roundMoney(remaining - fromUnapplied);

  const reversedEntries = [...entries].reverse();
  for (const entry of reversedEntries) {
    if (remaining <= 0) break;
    const reverseAmount = Math.min(remaining, entry.amount);
    const updatedInvoice = await updateInvoiceAfterRefund(entry.invoiceId, organizationId, reverseAmount);
    if (updatedInvoice) {
      invoiceAdjustments.push({
        invoiceId: entry.invoiceId,
        invoiceNumber: entry.invoiceNumber || String(updatedInvoice.invoiceNumber || ""),
        amount: reverseAmount,
      });
    }
    remaining = roundMoney(remaining - reverseAmount);
  }

  if (remaining > 0) {
    const err: any = new Error("Refund amount exceeds the remaining payment balance.");
    err.statusCode = 400;
    throw err;
  }

  return { invoiceAdjustments, refundedFromUnapplied: roundMoney(fromUnapplied) };
};

router.get("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  const filter: Record<string, any> = { organizationId: orgId };

  if (req.query.paymentId) filter.paymentId = String(req.query.paymentId).trim();
  if (req.query.creditNoteId) filter.creditNoteId = String(req.query.creditNoteId).trim();
  if (req.query.invoiceId) filter.invoiceId = String(req.query.invoiceId).trim();
  if (req.query.customerId) filter.customerId = String(req.query.customerId).trim();

  const rows = await Refund.find(filter).sort({ refundDate: -1, createdAt: -1 }).lean();
  res.json({
    success: true,
    data: rows.map(normalizeRow),
    pagination: { total: rows.length, page: 1, limit: rows.length, pages: 1 },
  });
});

router.get("/payment/:paymentId", async (req, res) => {
  const orgId = req.user?.organizationId;
  const paymentId = String(req.params.paymentId || "").trim();
  const rows = await Refund.find({ organizationId: orgId, paymentId }).sort({ refundDate: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: rows.map(normalizeRow) });
});

router.get("/credit-note/:creditNoteId", async (req, res) => {
  const orgId = req.user?.organizationId;
  const creditNoteId = String(req.params.creditNoteId || "").trim();
  const rows = await Refund.find({ organizationId: orgId, creditNoteId }).sort({ refundDate: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: rows.map(normalizeRow) });
});

router.get("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  const id = String(req.params.id || "").trim();
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid refund id", data: null });
  }
  const row = await Refund.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Not found", data: null });
  res.json({ success: true, data: normalizeRow(row) });
});

router.post("/", async (req, res) => {
  try {
    const orgId = req.user?.organizationId;
    const paymentId = String(req.body?.paymentId || "").trim();
    const creditNoteId = String(req.body?.creditNoteId || "").trim();
    const invoiceId = String(req.body?.invoiceId || "").trim();
    const amount = roundMoney(Number(req.body?.amount || 0));

    if (!orgId) {
      return res.status(400).json({ success: false, message: "Invalid organization", data: null });
    }
    if (!paymentId && !creditNoteId) {
      return res.status(400).json({ success: false, message: "paymentId or creditNoteId is required", data: null });
    }
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Refund amount must be greater than zero", data: null });
    }

    let payment: any = null;
    if (paymentId) {
      if (!mongoose.isValidObjectId(paymentId)) {
        return res.status(400).json({ success: false, message: "Invalid payment id", data: null });
      }
      payment = await PaymentReceived.findOne({ _id: paymentId, organizationId: orgId }).lean();
      if (!payment) {
        return res.status(404).json({ success: false, message: "Payment not found", data: null });
      }
    }

    let creditNote: any = null;
    if (creditNoteId) {
      if (!mongoose.isValidObjectId(creditNoteId)) {
        return res.status(400).json({ success: false, message: "Invalid credit note id", data: null });
      }
      creditNote = await CreditNote.findOne({ _id: creditNoteId, organizationId: orgId }).lean();
      if (!creditNote) {
        return res.status(404).json({ success: false, message: "Credit note not found", data: null });
      }
    }

    let application: { invoiceAdjustments: Array<{ invoiceId: string; invoiceNumber: string; amount: number }>; refundedFromUnapplied: number } = {
      invoiceAdjustments: [],
      refundedFromUnapplied: 0,
    };

    if (payment) {
      application = await buildRefundApplication({ payment, organizationId: orgId, amount, targetInvoiceId: invoiceId });
    } else if (creditNote) {
      const available = roundMoney(Number(creditNote.balance ?? creditNote.total ?? creditNote.amount ?? 0));
      if (amount > available) {
        return res.status(400).json({ success: false, message: "Refund amount cannot exceed the available credit note balance", data: null });
      }
    }

    const refundNumber = await getRefundNumber(orgId);
    const refundDate = req.body?.refundDate ? new Date(req.body.refundDate) : new Date();
    const paymentMethod = String(req.body?.paymentMethod || req.body?.paymentMode || "").trim();
    const referenceNumber = String(req.body?.referenceNumber || "").trim();
    const fromAccount = String(req.body?.fromAccount || "").trim();
    const description = String(req.body?.description || "").trim();

    const created = await Refund.create({
      organizationId: orgId,
      refundNumber,
      paymentId,
      creditNoteId,
      invoiceId: invoiceId || String(payment?.invoiceId || creditNote?.invoiceId || "").trim(),
      invoiceNumber: String(req.body?.invoiceNumber || payment?.invoiceNumber || creditNote?.invoiceNumber || "").trim(),
      customerId: String(payment?.customerId || creditNote?.customerId || req.body?.customerId || "").trim(),
      customerName: String(payment?.customerName || creditNote?.customerName || req.body?.customerName || "").trim(),
      amount,
      refundDate,
      paymentMethod,
      referenceNumber,
      fromAccount,
      description,
      status: "processed",
      currency: String(payment?.currency || creditNote?.currency || req.body?.currency || "USD").trim() || "USD",
      invoiceAdjustments: application.invoiceAdjustments,
      refundedFromUnapplied: application.refundedFromUnapplied,
    });

    return res.status(201).json({
      success: true,
      data: normalizeRow(created.toObject()),
      meta: {
        invoiceAdjustments: application.invoiceAdjustments,
        refundedFromUnapplied: application.refundedFromUnapplied,
      },
    });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || 400);
    return res.status(statusCode).json({
      success: false,
      message: String(error?.message || "Failed to save refund"),
      data: null,
    });
  }
});

export default router;
