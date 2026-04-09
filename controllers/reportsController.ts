import type express from "express";
import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { CreditNote } from "../models/CreditNote.js";
import { Invoice } from "../models/Invoice.js";
import { Item } from "../models/Item.js";
import { Organization } from "../models/Organization.js";
import { PaymentReceived } from "../models/PaymentReceived.js";
import { Quote } from "../models/Quote.js";
import { Salesperson } from "../models/Salesperson.js";
import { ReportingTag } from "../models/ReportingTag.js";
import { SalesReceipt } from "../models/SalesReceipt.js";

type ReportEntity = "invoice" | "credit-note" | "sales-receipt";
type MoreFilterComparator =
  | "is-empty"
  | "is-not-empty"
  | "is-in"
  | "is-not-in"
  | "starts-with"
  | "ends-with"
  | "contains"
  | "does-not-contain";
type MoreFilterRow = {
  field?: string;
  comparator?: MoreFilterComparator | string;
  value?: string;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
const cloneDate = (date: Date) => new Date(date.getTime());

const requireOrgId = (req: express.Request, res: express.Response) => {
  const orgId = (req as any)?.user?.organizationId;
  if (!orgId) {
    res
      .status(401)
      .json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }
  if (!mongoose.isValidObjectId(orgId)) {
    res
      .status(400)
      .json({ success: false, message: "Invalid organization", data: null });
    return null;
  }
  if (mongoose.connection.readyState !== 1) {
    res
      .status(500)
      .json({ success: false, message: "Database not connected", data: null });
    return null;
  }
  return orgId;
};

const normalizeEntityToken = (value: unknown): ReportEntity | "" => {
  const token = normalizeText(value).replace(/[_\s]+/g, "-");
  if (token === "invoice") return "invoice";
  if (token === "credit-note" || token === "creditnote") return "credit-note";
  if (token === "sales-receipt" || token === "salesreceipt")
    return "sales-receipt";
  return "";
};

const parseEntities = (value: unknown): ReportEntity[] => {
  const raw = String(value ?? "").trim();
  if (!raw) return ["invoice"];
  const items = raw
    .split(",")
    .map((item) => normalizeEntityToken(item))
    .filter(Boolean) as ReportEntity[];
  return items.length > 0 ? Array.from(new Set(items)) : ["invoice"];
};

const parseMoreFilters = (value: unknown): MoreFilterRow[] => {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        field: String(row?.field || "").trim(),
        comparator: String(row?.comparator || "").trim(),
        value: String(row?.value || "").trim(),
      }))
      .filter((row) => row.field || row.comparator || row.value);
  } catch {
    return [];
  }
};

const getPaymentAllocationEntries = (payment: any) => {
  const entries: Array<{
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    invoice?: any;
    invoiceDate?: string;
    date?: string;
    appliedAt?: string;
  }> = [];
  const seen = new Set<string>();

  const pushEntry = (
    invoiceId: unknown,
    invoiceNumber: unknown,
    amount: unknown,
    extras: Partial<{
      invoice: any;
      invoiceDate: string;
      date: string;
      appliedAt: string;
    }> = {},
  ) => {
    const normalizedInvoiceId = String(invoiceId ?? "").trim();
    const normalizedInvoiceNumber = String(invoiceNumber ?? "").trim();
    const normalizedAmount = asNumber(amount, 0);
    const key = normalizedInvoiceId || normalizedInvoiceNumber;
    if (!key || normalizedAmount <= 0 || seen.has(key)) return;
    seen.add(key);
    entries.push({
      invoiceId: normalizedInvoiceId,
      invoiceNumber: normalizedInvoiceNumber,
      amount: normalizedAmount,
      ...extras,
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
      const invoiceId =
        allocation?.invoiceId ||
        allocation?.invoice?._id ||
        allocation?.invoice?.id ||
        allocation?.invoice;
      const invoiceNumber =
        allocation?.invoiceNumber || allocation?.invoice?.invoiceNumber || "";
      pushEntry(invoiceId, invoiceNumber, allocation?.amount ?? allocation?.appliedAmount ?? allocation?.amountReceived ?? payment?.amountReceived ?? payment?.amount ?? 0, {
        invoice: allocation?.invoice || null,
        invoiceDate: allocation?.invoiceDate || allocation?.invoice?.date || allocation?.invoice?.invoiceDate,
        date: allocation?.date || allocation?.appliedAt,
        appliedAt: allocation?.appliedAt,
      });
    });
    if (entries.length > 0) return entries;
  }

  const directInvoiceId = String(payment?.invoiceId || "").trim();
  const directInvoiceNumber = String(payment?.invoiceNumber || "").trim();
  const directAppliedAmount = asNumber(
    payment?.amountUsedForPayments ??
      payment?.appliedAmount ??
      payment?.amountApplied ??
      payment?.amount ??
      payment?.amountReceived ??
      0,
  );
  if (directInvoiceId || directInvoiceNumber) {
    pushEntry(directInvoiceId, directInvoiceNumber, directAppliedAmount);
  }

  return entries;
};

const getTimeToGetPaidBucketLabel = (days: number) => {
  if (days <= 15) return "0 - 15 Days";
  if (days <= 30) return "16 - 30 Days";
  if (days <= 45) return "31 - 45 Days";
  return "Above 45 Days";
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const compareValue = (left: string, comparator: string, right: string) => {
  const lhs = normalizeText(left);
  const rhs = normalizeText(right);
  const tokens = rhs
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  switch (comparator) {
    case "is-empty":
      return lhs.length === 0;
    case "is-not-empty":
      return lhs.length > 0;
    case "":
      return true;
    case "is-in":
      return tokens.length > 0 ? tokens.includes(lhs) : lhs === rhs;
    case "is-not-in":
      return tokens.length > 0 ? !tokens.includes(lhs) : lhs !== rhs;
    case "starts-with":
      return lhs.startsWith(rhs);
    case "ends-with":
      return lhs.endsWith(rhs);
    case "contains":
      return lhs.includes(rhs);
    case "does-not-contain":
      return !lhs.includes(rhs);
    default:
      return true;
  }
};

const getDateRangeFromQuery = (req: express.Request) => {
  const fromRaw = String(
    req.query.fromDate ?? req.query.from_date ?? "",
  ).trim();
  const toRaw = String(req.query.toDate ?? req.query.to_date ?? "").trim();
  if (fromRaw && toRaw) {
    const start = asDate(fromRaw);
    const end = asDate(toRaw);
    if (start && end) return { start: startOfDay(start), end: endOfDay(end) };
  }

  const filterBy = String(
    req.query.filter_by ?? req.query.dateRange ?? req.query.date_range ?? "",
  )
    .trim()
    .toLowerCase();
  const now = new Date();
  const startOfWeek = (date: Date) => {
    const start = startOfDay(date);
    start.setDate(start.getDate() - start.getDay());
    return start;
  };
  const endOfWeek = (date: Date) => {
    const end = startOfWeek(date);
    end.setDate(end.getDate() + 6);
    return endOfDay(end);
  };
  const quarterBounds = (year: number, quarterIndex: number) => {
    const startMonth = quarterIndex * 3;
    return {
      start: new Date(year, startMonth, 1),
      end: endOfDay(new Date(year, startMonth + 3, 0)),
    };
  };

  switch (filterBy) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "thisweek":
    case "this-week":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "thismonth":
    case "this-month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "thisquarter":
    case "this-quarter":
      return quarterBounds(now.getFullYear(), Math.floor(now.getMonth() / 3));
    case "thisyear":
    case "this-year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: endOfDay(new Date(now.getFullYear(), 11, 31)),
      };
    case "yesterday": {
      const date = startOfDay(now);
      date.setDate(date.getDate() - 1);
      return { start: date, end: endOfDay(date) };
    }
    case "previousweek":
    case "previous-week": {
      const currentWeekStart = startOfWeek(now);
      const previousWeekStart = cloneDate(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const previousWeekEnd = cloneDate(previousWeekStart);
      previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);
      return { start: previousWeekStart, end: endOfDay(previousWeekEnd) };
    }
    case "previousmonth":
    case "previous-month": {
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const previousMonthStart = new Date(
        previousMonthEnd.getFullYear(),
        previousMonthEnd.getMonth(),
        1,
      );
      return { start: previousMonthStart, end: endOfDay(previousMonthEnd) };
    }
    case "previousquarter":
    case "previous-quarter": {
      const currentQuarterIndex = Math.floor(now.getMonth() / 3);
      const previousQuarterIndex = (currentQuarterIndex + 3) % 4;
      const previousQuarterYear =
        currentQuarterIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return quarterBounds(previousQuarterYear, previousQuarterIndex);
    }
    case "previousyear":
    case "previous-year":
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: endOfDay(new Date(now.getFullYear() - 1, 11, 31)),
      };
    case "alltime":
    case "all-time":
      return {
        start: new Date(1970, 0, 1),
        end: endOfDay(now),
      };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
};

const shiftDateRange = (
  range: { start: Date; end: Date },
  compareWith: string,
  count: number,
) => {
  const normalizedCount = Math.max(1, Math.trunc(count || 1));
  if (compareWith === "previous-years") {
    return {
      start: new Date(
        range.start.getFullYear() - normalizedCount,
        range.start.getMonth(),
        range.start.getDate(),
      ),
      end: endOfDay(
        new Date(
          range.end.getFullYear() - normalizedCount,
          range.end.getMonth(),
          range.end.getDate(),
        ),
      ),
    };
  }
  if (compareWith === "previous-periods") {
    const spanDays = Math.max(
      1,
      Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1,
    );
    const shiftDays = spanDays * normalizedCount;
    const start = cloneDate(range.start);
    const end = cloneDate(range.end);
    start.setDate(start.getDate() - shiftDays);
    end.setDate(end.getDate() - shiftDays);
    return { start: startOfDay(start), end: endOfDay(end) };
  }
  return null;
};

const resolveCustomerName = (customer: any, fallback = "") => {
  const values = [
    customer?.displayName,
    customer?.name,
    customer?.companyName,
    customer?.firstName && customer?.lastName
      ? `${customer.firstName} ${customer.lastName}`
      : "",
    customer?.firstName,
    customer?.lastName,
    fallback,
  ];
  return (
    values.map((value) => String(value ?? "").trim()).find(Boolean) ||
    "Unassigned"
  );
};

const getCustomerAddresses = (customer: any) => {
  const billing = customer?.billingAddress || {};
  const shipping = customer?.shippingAddress || {};
  return { billing, shipping };
};

const buildCustomerContext = (customer: any, fallbackName = "") => {
  const displayName = resolveCustomerName(customer, fallbackName);
  const { billing, shipping } = getCustomerAddresses(customer);

  return {
    name: displayName,
    "customer-id": String(customer?._id || customer?.id || "").trim(),
    "company-name": String(
      customer?.companyName ||
        customer?.displayName ||
        customer?.name ||
        fallbackName ||
        "",
    ).trim(),
    "customer-number": String(customer?.customerNumber || "").trim(),
    "first-name": String(customer?.firstName || "").trim(),
    "last-name": String(customer?.lastName || "").trim(),
    website: String(customer?.website || "").trim(),
    "customer-email": String(customer?.email || "").trim(),
    "customer-type": String(customer?.type || "").trim(),
    "mobile-phone": String(
      customer?.mobilePhone || customer?.phone || billing?.phone || "",
    ).trim(),
    "work-phone": String(customer?.workPhone || "").trim(),
    department: String(customer?.department || "").trim(),
    designation: String(customer?.designation || "").trim(),
    facebook: String(customer?.facebook || "").trim(),
    twitter: String(customer?.twitter || "").trim(),
    skype: String(customer?.skype || "").trim(),
    status: String(customer?.status || "").trim(),
    "created-by": String(customer?.createdBy || "").trim(),
    "created-time": customer?.createdAt
      ? new Date(customer.createdAt).toISOString()
      : "",
    "last-modified-time": customer?.updatedAt
      ? new Date(customer.updatedAt).toISOString()
      : "",
    "credit-limit": asNumber(customer?.creditLimit, 0),
    "payment-terms": String(
      customer?.paymentTerms || customer?.paymentTermsLabel || "",
    ).trim(),
    remarks: String(customer?.remarks || "").trim(),
    receivables: asNumber(customer?.receivables || customer?.balance || 0, 0),
    "receivables-fcy": asNumber(
      customer?.receivablesFcy ||
        customer?.receivables ||
        customer?.balance ||
        0,
      0,
    ),
    "unused-credits": asNumber(customer?.unusedCredits || 0, 0),
    "unused-credits-fcy": asNumber(
      customer?.unusedCreditsFcy || customer?.unusedCredits || 0,
      0,
    ),
    "billing-name": String(billing?.attention || displayName).trim(),
    "billing-street-1": String(billing?.street1 || "").trim(),
    "billing-street-2": String(billing?.street2 || "").trim(),
    "billing-city": String(billing?.city || "").trim(),
    "billing-state": String(billing?.state || "").trim(),
    "billing-code": String(billing?.zipCode || "").trim(),
    "billing-country": String(billing?.country || "").trim(),
    "billing-phone": String(billing?.phone || "").trim(),
    "billing-fax": String(billing?.fax || "").trim(),
    "shipping-name": String(shipping?.attention || displayName).trim(),
    "shipping-street-1": String(shipping?.street1 || "").trim(),
    "shipping-street-2": String(shipping?.street2 || "").trim(),
    "shipping-city": String(shipping?.city || "").trim(),
    "shipping-state": String(shipping?.state || "").trim(),
    "shipping-code": String(shipping?.zipCode || "").trim(),
    "shipping-country": String(shipping?.country || "").trim(),
    "shipping-phone": String(shipping?.phone || "").trim(),
    "shipping-fax": String(shipping?.fax || "").trim(),
  };
};

const getCustomerKey = (row: any) => {
  const id = String(
    row?.customerId || row?.customer?._id || row?.customer?.id || "",
  ).trim();
  const name = resolveCustomerName(
    row?.customer,
    String(row?.customerName || ""),
  );
  return id || normalizeText(name) || "unassigned";
};

const getTransactionAmount = (row: any, source: ReportEntity) => {
  const total = asNumber(row?.total, 0);
  const totalTax = asNumber(row?.totalTax, 0);
  const subTotal = asNumber(row?.subTotal, total - totalTax);

  if (source === "credit-note") {
    return {
      sales: -Math.abs(subTotal),
      salesWithTax: -Math.abs(total),
      invoiceAmount: 0,
      creditNoteAmount: Math.abs(total),
      creditNoteAmountFcy: Math.abs(total),
    };
  }

  return {
    sales: Math.abs(subTotal),
    salesWithTax: Math.abs(total),
    invoiceAmount: Math.abs(total),
    creditNoteAmount: 0,
    creditNoteAmountFcy: 0,
  };
};

const matchesMoreFilters = (
  values: Record<string, unknown>,
  filters: MoreFilterRow[],
) =>
  filters.every((row) => {
    const field = String(row.field || "").trim();
    const comparator = String(row.comparator || "").trim();
    const rawValue = String(row.value || "").trim();
    if (!field || !comparator) return true;
    if (!rawValue && !["is-empty", "is-not-empty"].includes(comparator))
      return true;

    const left =
      field === "salesperson-name"
        ? String(values.name || "")
        : field === "customer-name"
          ? String(values.name || "")
          : field === "invoice-number"
            ? String(
                values["invoice-number"] ||
                  values.invoiceNumber ||
                  values.transaction ||
                  "",
              )
            : field === "quote-number"
              ? String(values["quote-number"] || values.name || "")
              : field === "reference-number"
                ? String(
                    values["reference-number"] || values.referenceNumber || "",
                  )
                : field === "project-name"
                  ? String(values["project-name"] || values.projectName || "")
                  : field === "order-number"
                    ? String(values["order-number"] || values.orderNumber || "")
                    : field === "status"
                      ? String(values.status || "")
                      : field === "transaction"
                        ? String(
                            values.transaction ||
                              values["invoice-number"] ||
                              values["quote-number"] ||
                              "",
                          )
                        : field === "transaction-type"
                          ? String(
                              values["transaction-type"] ||
                                values.type ||
                                values.transactionType ||
                                "",
                            )
                          : field === "date"
                            ? String(
                                values.date ||
                                  values["report-date"] ||
                                  values["invoice-date"] ||
                                  values["quote-date"] ||
                                  "",
                              )
                          : field === "quote-date"
                          ? String(
                              values["quote-date"] ||
                                values.quoteDate ||
                                values.date ||
                                "",
                            )
                          : field === "expiry-date"
                            ? String(
                                values["expiry-date"] ||
                                  values.expiryDate ||
                                  "",
                              )
                            : field === "age"
                              ? String(values.age || "")
                              : field === "amount"
                                ? String(
                                    values.amount ||
                                      values["quote-amount"] ||
                                      "",
                                  )
                                : field === "quote-amount"
                                  ? String(
                                      values["quote-amount"] ||
                                        values.amount ||
                                        "",
                                    )
                                  : field === "balance-due"
                                    ? String(
                                        values["balance-due"] ||
                                          values.balance ||
                                          "",
                                      )
                                    : field === "balance"
                                      ? String(
                                          values.balance ||
                                            values["balance-due"] ||
                                            "",
                                        )
                                      : field === "invoice-date"
                                        ? String(
                                            values["invoice-date"] ||
                                              values.date ||
                                              "",
                                          )
                                        : field === "due-date"
                                          ? String(
                                              values["due-date"] ||
                                                values.dueDate ||
                                                "",
                                            )
                                          : field === "item-name"
                                            ? String(
                                                values["item-name"] ||
                                                  values.name ||
                                                  "",
                                              )
                                            : field === "sku"
                                              ? String(values.sku || "")
                                              : field === "usage-unit"
                                                ? String(
                                                    values["usage-unit"] || "",
                                                  )
                                                : field === "currency"
                                                  ? String(
                                                      values.currency || "",
                                                    )
                                                  : field === "location"
                                                    ? String(
                                                        values.location || "",
                                                      )
                                                    : String(
                                                        values[field] ?? "",
                                                      );
    return compareValue(left, comparator, rawValue);
  });

const getBalanceDueValue = (row: any) => {
  const total = asNumber(row?.total, 0);
  const paidAmount = asNumber(row?.amountPaid ?? row?.paidAmount, 0);
  const fallback = total - paidAmount;
  const balanceRaw =
    row?.balance !== undefined
      ? asNumber(row.balance, fallback)
      : row?.balanceDue !== undefined
        ? asNumber(row.balanceDue, fallback)
        : fallback;
  return Math.max(0, balanceRaw);
};

const getDocumentDate = (row: any) =>
  asDate(row?.date || row?.invoiceDate || row?.createdAt || row?.dueDate);

const getDocumentDueDate = (row: any) =>
  asDate(
    row?.dueDate ||
      row?.expectedPaymentDate ||
      row?.date ||
      row?.invoiceDate ||
      row?.createdAt,
  );

const getDocumentBalanceDue = (row: any) => {
  const total = asNumber(row?.total, 0);
  const paidAmount = asNumber(row?.amountPaid ?? row?.paidAmount, 0);
  const fallback = total - paidAmount;
  const balanceRaw =
    row?.balance !== undefined
      ? asNumber(row.balance, fallback)
      : row?.balanceDue !== undefined
        ? asNumber(row.balanceDue, fallback)
        : fallback;
  return Math.max(0, balanceRaw);
};

const getAgingBucketKey = (ageDays: number) => {
  if (ageDays <= 0) return "current";
  if (ageDays <= 15) return "1-15-days";
  if (ageDays <= 30) return "16-30-days";
  if (ageDays <= 45) return "31-45-days";
  return "gt-45-days";
};

const getAgingBucketLabel = (bucketKey: string) => {
  switch (bucketKey) {
    case "current":
      return "Current";
    case "1-15-days":
      return "1-15 Days";
    case "16-30-days":
      return "16-30 Days";
    case "31-45-days":
      return "31-45 Days";
    default:
      return "> 45 Days";
  }
};

const getAgingAgeDays = (asOf: Date, dueDate: Date | null) => {
  if (!dueDate) return 0;
  const milliseconds =
    startOfDay(asOf).getTime() - startOfDay(dueDate).getTime();
  return Math.floor(milliseconds / 86400000);
};

const getDocumentNumber = (row: any, source: ReportEntity) =>
  String(
    source === "credit-note"
      ? row?.creditNoteNumber ||
          row?.invoiceNumber ||
          row?.transactionNumber ||
          row?.number ||
          row?.receiptNumber ||
          ""
      : source === "sales-receipt"
        ? row?.receiptNumber ||
          row?.receiptNo ||
          row?.transactionNumber ||
          row?.number ||
          ""
      : row?.invoiceNumber || row?.transactionNumber || row?.number || "",
  ).trim();

const getDocumentTypeLabel = (source: ReportEntity) => {
  if (source === "credit-note") return "Credit Note";
  if (source === "sales-receipt") return "Sales Receipt";
  return "Invoice";
};

const getQuoteDate = (row: any) =>
  asDate(row?.quoteDate || row?.date || row?.createdAt);
const getQuoteExpiryDate = (row: any) => asDate(row?.expiryDate);

const getLinkedInvoiceNumberForQuote = (quote: any, invoices: any[]) => {
  const quoteIdValue = String(quote?._id || quote?.id || "").trim();
  const quoteNumber = String(quote?.quoteNumber || "").trim();
  const quoteInvoiceId = String(
    quote?.convertedToInvoiceId || quote?.invoiceId || "",
  ).trim();
  const quoteInvoiceNumber = String(
    quote?.convertedToInvoiceNumber || quote?.invoiceNumber || "",
  ).trim();

  const matches = (invoices || [])
    .filter((invoice) => {
      const invId = String(invoice?._id || invoice?.id || "").trim();
      if (quoteInvoiceId && invId && invId === quoteInvoiceId) return true;

      const refCandidates = [
        invoice?.convertedFromQuote,
        invoice?.convertedFromQuoteId,
        invoice?.sourceQuoteId,
        invoice?.quoteId,
        invoice?.createdFromQuote,
        invoice?.convertedFrom,
        invoice?.quote?._id,
        invoice?.quote?.id,
        invoice?.quote,
      ]
        .filter(Boolean)
        .map((value: any) => String(value).trim());
      if (quoteIdValue && refCandidates.some((value) => value === quoteIdValue))
        return true;

      const invoiceQuoteNumber = String(
        invoice?.sourceQuoteNumber ||
          invoice?.quoteNumber ||
          invoice?.convertedQuoteNumber ||
          invoice?.referenceNumber ||
          invoice?.orderNumber ||
          "",
      ).trim();
      if (
        quoteInvoiceNumber &&
        invoiceQuoteNumber &&
        invoiceQuoteNumber === quoteInvoiceNumber
      )
        return true;
      if (
        quoteNumber &&
        invoiceQuoteNumber &&
        invoiceQuoteNumber === quoteNumber
      )
        return true;

      return false;
    })
    .sort((left, right) => {
      const leftTime = new Date(
        left?.invoiceDate || left?.date || left?.createdAt || 0,
      ).getTime();
      const rightTime = new Date(
        right?.invoiceDate || right?.date || right?.createdAt || 0,
      ).getTime();
      return rightTime - leftTime;
    });

  const linked = matches[0];
  return String(
    linked?.invoiceNumber ||
      linked?.number ||
      linked?.invoiceNo ||
      quoteInvoiceNumber ||
      "",
  ).trim();
};

const buildAgingSummaryRows = (
  rows: Array<{ source: ReportEntity; row: any }>,
  customers: any[],
  asOf: Date,
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const groupMap = new Map<string, any>();
  let currency = "";
  const cutoffDate = startOfDay(asOf);

  for (const item of rows || []) {
    const source = item?.source || "invoice";
    if (source !== "invoice") continue;
    const row = item?.row || {};
    const date = getDocumentDate(row);
    const dueDate = getDocumentDueDate(row);
    if (!date || !dueDate) continue;
    if (date > cutoffDate) continue;

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;
    const customerContext = buildCustomerContext(customer, fallbackName);
    const rowCurrency =
      String(row?.currency || customer?.currency || "SOS").trim() || "SOS";
    const balance = getBalanceDueValue(row);
    if (balance <= 0) continue;

    const ageDays = Math.max(
      0,
      Math.floor((asOf.getTime() - startOfDay(dueDate).getTime()) / 86400000),
    );
    const bucketKey = getAgingBucketKey(ageDays);
    const baseValues = {
      ...customerContext,
      currency: rowCurrency,
      age: ageDays,
      bucket: bucketKey,
      balance,
      current: bucketKey === "current" ? balance : 0,
      "1-15-days": bucketKey === "1-15-days" ? balance : 0,
      "16-30-days": bucketKey === "16-30-days" ? balance : 0,
      "31-45-days": bucketKey === "31-45-days" ? balance : 0,
      "gt-45-days": bucketKey === "gt-45-days" ? balance : 0,
      total: balance,
      "total-fcy": balance,
    };

    if (!matchesMoreFilters(baseValues, moreFilters)) continue;

    const key = String(
      customerContext["customer-id"] || customerContext.name || "unassigned",
    )
      .trim()
      .toLowerCase();
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        values: {
          ...baseValues,
          current: 0,
          "1-15-days": 0,
          "16-30-days": 0,
          "31-45-days": 0,
          "gt-45-days": 0,
          total: 0,
          "total-fcy": 0,
        },
      });
      if (!currency) currency = rowCurrency;
    }

    const target = groupMap.get(key);
    target.values.current += baseValues.current;
    target.values["1-15-days"] += baseValues["1-15-days"];
    target.values["16-30-days"] += baseValues["16-30-days"];
    target.values["31-45-days"] += baseValues["31-45-days"];
    target.values["gt-45-days"] += baseValues["gt-45-days"];
    target.values.total += balance;
    target.values["total-fcy"] += balance;
    target.values.currency =
      rowCurrency || String(target.values.currency || "");
  }

  const groupedRows = [...groupMap.values()].sort((left, right) => {
    const totalDelta =
      asNumber(right.values.total, 0) - asNumber(left.values.total, 0);
    if (totalDelta !== 0) return totalDelta;
    return String(left.values.name || "").localeCompare(
      String(right.values.name || ""),
    );
  });

  return {
    rows: groupedRows,
    currency: currency || "SOS",
    totals: groupedRows.reduce(
      (acc, row) => {
        acc.current += asNumber(row.values.current, 0);
        acc["1-15-days"] += asNumber(row.values["1-15-days"], 0);
        acc["16-30-days"] += asNumber(row.values["16-30-days"], 0);
        acc["31-45-days"] += asNumber(row.values["31-45-days"], 0);
        acc["gt-45-days"] += asNumber(row.values["gt-45-days"], 0);
        acc.total += asNumber(row.values.total, 0);
        acc["total-fcy"] += asNumber(row.values["total-fcy"], 0);
        return acc;
      },
      {
        current: 0,
        "1-15-days": 0,
        "16-30-days": 0,
        "31-45-days": 0,
        "gt-45-days": 0,
        total: 0,
        "total-fcy": 0,
      } as Record<string, number>,
    ),
  };
};

const buildAgingDetailsRows = (
  rows: Array<{ source: ReportEntity; row: any }>,
  customers: any[],
  asOf: Date,
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const cutoffDate = startOfDay(asOf);
  const detailRows: Array<{ values: Record<string, any> }> = [];
  let currency = "";

  for (const item of rows || []) {
    const source = item?.source || "invoice";
    const row = item?.row || {};
    const date = getDocumentDate(row);
    const dueDate = getDocumentDueDate(row);
    if (!date || !dueDate) continue;
    if (date > cutoffDate) continue;

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;
    const customerContext = buildCustomerContext(customer, fallbackName);
    const rowCurrency =
      String(row?.currency || customer?.currency || "SOS").trim() || "SOS";
    const balance = getBalanceDueValue(row);
    if (balance <= 0) continue;

    const ageDays = Math.max(
      0,
      Math.floor((asOf.getTime() - startOfDay(dueDate).getTime()) / 86400000),
    );
    const bucketKey = getAgingBucketKey(ageDays);
    const transaction =
      source === "credit-note"
        ? String(
            row?.creditNoteNumber || row?.creditNoteNo || row?._id || "",
          ).trim()
        : String(row?.invoiceNumber || row?.invoiceNo || row?._id || "").trim();
    const type = source === "credit-note" ? "Credit Note" : "Invoice";
    const baseValues = {
      date: date.toISOString(),
      "due-date": dueDate.toISOString(),
      transaction,
      type,
      status: String(row?.status || "").trim(),
      "customer-name": customerContext.name,
      age: ageDays,
      amount: Math.abs(asNumber(row?.total, 0)),
      "balance-due": balance,
      bucket: bucketKey,
      currency: rowCurrency,
      location: String(
        row?.locationName ||
          row?.location ||
          customerContext["billing-city"] ||
          "",
      ).trim(),
    };

    if (!matchesMoreFilters(baseValues, moreFilters)) continue;

    detailRows.push({ values: baseValues });
    if (!currency) currency = rowCurrency;
  }

  detailRows.sort((left, right) => {
    const ageDelta =
      asNumber(right.values.age, 0) - asNumber(left.values.age, 0);
    if (ageDelta !== 0) return ageDelta;
    return String(right.values.date || "").localeCompare(
      String(left.values.date || ""),
    );
  });

  return {
    rows: detailRows,
    currency: currency || "SOS",
    totals: detailRows.reduce(
      (acc, row) => {
        acc.amount += asNumber(row.values.amount, 0);
        acc["balance-due"] += asNumber(row.values["balance-due"], 0);
        return acc;
      },
      { amount: 0, "balance-due": 0 } as Record<string, number>,
    ),
  };
};

const buildInvoiceDetailSummaryRows = (
  rows: Array<{ source: ReportEntity; row: any }>,
  customers: any[],
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const invoiceRows: Array<{ values: Record<string, any> }> = [];
  let currency = "";

  for (const item of rows || []) {
    const source = item?.source || "invoice";
    const row = item?.row || {};
    const date = getDocumentDate(row);
    if (!date) continue;

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;
    const customerContext = buildCustomerContext(customer, fallbackName);
    const rowCurrency =
      String(row?.currency || customer?.currency || "SOS").trim() || "SOS";
    const total = Math.abs(asNumber(row?.total, 0));
    const balance = getBalanceDueValue(row);
    const transaction =
      source === "credit-note"
        ? String(
            row?.creditNoteNumber || row?.creditNoteNo || row?._id || "",
          ).trim()
        : String(row?.invoiceNumber || row?.invoiceNo || row?._id || "").trim();
    const orderNumber = String(
      row?.orderNumber || row?.orderNo || row?.referenceNumber || "",
    ).trim();
    const type = source === "credit-note" ? "Credit Note" : "Invoice";
    const values = {
      status: String(row?.status || "").trim(),
      "invoice-date": date.toISOString(),
      "due-date": getDocumentDueDate(row)?.toISOString() || "",
      "invoice#": transaction,
      "order-number": orderNumber,
      "customer-name": customerContext.name,
      total,
      balance,
      type,
      currency: rowCurrency,
      location: String(
        row?.locationName ||
          row?.location ||
          customerContext["billing-city"] ||
          "",
      ).trim(),
    };

    if (!matchesMoreFilters(values, moreFilters)) continue;
    invoiceRows.push({ values });
    if (!currency) currency = rowCurrency;
  }

  invoiceRows.sort((left, right) =>
    String(right.values["invoice-date"] || "").localeCompare(
      String(left.values["invoice-date"] || ""),
    ),
  );

  return {
    rows: invoiceRows,
    currency: currency || "SOS",
    totals: invoiceRows.reduce(
      (acc, row) => {
        acc.total += asNumber(row.values.total, 0);
        acc.balance += asNumber(row.values.balance, 0);
        return acc;
      },
      { total: 0, balance: 0 } as Record<string, number>,
    ),
  };
};

const buildRows = (
  rows: Array<{ source: ReportEntity; row: any }>,
  customers: any[],
  range: { start: Date; end: Date },
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const groupMap = new Map<string, any>();
  let currency = "";

  const ensureCustomerRow = (customer: any, fallbackName = "") => {
    const customerContext = buildCustomerContext(customer, fallbackName);
    const key = String(
      customerContext["customer-id"] || customerContext.name || "unassigned",
    )
      .trim()
      .toLowerCase();

    if (!groupMap.has(key)) {
      const rowCurrency =
        String(customer?.currency || customer?.baseCurrency || "SOS").trim() ||
        "SOS";
      groupMap.set(key, {
        values: {
          ...customerContext,
          location: "",
          currency: rowCurrency,
          "invoice-count": 0,
          sales: 0,
          "sales-with-tax": 0,
          "sales-without-discount": 0,
          "sales-fcy": 0,
          "sales-with-tax-fcy": 0,
          "sales-without-discount-fcy": 0,
          "invoice-amount": 0,
          "invoice-amount-fcy": 0,
          "credit-note-amount": 0,
          "credit-note-amount-fcy": 0,
        },
      });
      if (!currency) currency = rowCurrency;
    }

    return groupMap.get(key);
  };

  for (const customer of customers || []) {
    ensureCustomerRow(customer);
  }

  for (const item of rows || []) {
    const source = item?.source || "invoice";
    const row = item?.row || {};
    const date = asDate(row?.date || row?.invoiceDate || row?.createdAt);
    if (!date || date < range.start || date > range.end) continue;

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;

    const customerContext = buildCustomerContext(customer, fallbackName);
    const location = String(
      row?.locationName ||
        row?.location ||
        customerContext["billing-city"] ||
        customerContext["shipping-city"] ||
        customerContext["billing-state"] ||
        "",
    ).trim();
    const rowCurrency =
      String(row?.currency || customer?.currency || "SOS").trim() || "SOS";
    const baseValues = {
      ...customerContext,
      location,
      currency: rowCurrency,
    };

    if (!matchesMoreFilters(baseValues, moreFilters)) continue;

    const target = ensureCustomerRow(customer, fallbackName);
    const amounts = getTransactionAmount(row, source);
    target.values.location =
      location || String(target.values.location || "").trim();
    target.values.name = baseValues.name || String(target.values.name || "");
    target.values["company-name"] =
      baseValues["company-name"] || String(target.values["company-name"] || "");
    target.values["customer-id"] =
      baseValues["customer-id"] || String(target.values["customer-id"] || "");
    target.values["customer-number"] =
      baseValues["customer-number"] ||
      String(target.values["customer-number"] || "");
    target.values["customer-email"] =
      baseValues["customer-email"] || String(target.values["customer-email"] || "");
    target.values["customer-type"] =
      baseValues["customer-type"] || String(target.values["customer-type"] || "");
    target.values["invoice-count"] =
      asNumber(target.values["invoice-count"], 0) + 1;
    target.values.sales = asNumber(target.values.sales, 0) + amounts.sales;
    target.values["sales-with-tax"] =
      asNumber(target.values["sales-with-tax"], 0) + amounts.salesWithTax;
    target.values["sales-without-discount"] =
      asNumber(target.values["sales-without-discount"], 0) + amounts.sales;
    target.values["sales-fcy"] =
      asNumber(target.values["sales-fcy"], 0) + amounts.sales;
    target.values["sales-with-tax-fcy"] =
      asNumber(target.values["sales-with-tax-fcy"], 0) + amounts.salesWithTax;
    target.values["sales-without-discount-fcy"] =
      asNumber(target.values["sales-without-discount-fcy"], 0) + amounts.sales;
    target.values["invoice-amount"] =
      asNumber(target.values["invoice-amount"], 0) + amounts.invoiceAmount;
    target.values["invoice-amount-fcy"] =
      asNumber(target.values["invoice-amount-fcy"], 0) + amounts.invoiceAmount;
    target.values["credit-note-amount"] =
      asNumber(target.values["credit-note-amount"], 0) +
      amounts.creditNoteAmount;
    target.values["credit-note-amount-fcy"] =
      asNumber(target.values["credit-note-amount-fcy"], 0) +
      amounts.creditNoteAmountFcy;
    target.values.currency =
      rowCurrency || String(target.values.currency || "");
  }

  const groupedRows = [...groupMap.values()]
    .filter((item) => matchesMoreFilters(item.values, moreFilters))
    .sort((left, right) => {
      const salesDelta =
        asNumber(right.values.sales, 0) - asNumber(left.values.sales, 0);
      if (salesDelta !== 0) return salesDelta;
      return String(left.values.name || "").localeCompare(
        String(right.values.name || ""),
      );
    });

  return {
    rows: groupedRows,
    currency: currency || "SOS",
    totals: groupedRows.reduce(
      (acc, row) => {
        acc["invoice-count"] += asNumber(row.values["invoice-count"], 0);
        acc.sales += asNumber(row.values.sales, 0);
        acc["sales-with-tax"] += asNumber(row.values["sales-with-tax"], 0);
        acc["sales-without-discount"] += asNumber(
          row.values["sales-without-discount"],
          0,
        );
        acc["invoice-amount"] += asNumber(row.values["invoice-amount"], 0);
        acc["credit-note-amount"] += asNumber(
          row.values["credit-note-amount"],
          0,
        );
        return acc;
      },
      {
        "invoice-count": 0,
        sales: 0,
        "sales-with-tax": 0,
        "sales-without-discount": 0,
        "invoice-amount": 0,
        "credit-note-amount": 0,
      } as Record<string, number>,
    ),
  };
};

const buildCustomerBalanceSummaryRows = (
  rows: Array<{ source: ReportEntity; row: any }>,
  customers: any[],
  range: { start: Date; end: Date },
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const periodStart = startOfDay(range.start);
  const periodEnd = endOfDay(range.end);
  const groupMap = new Map<string, any>();
  let currency = "";

  for (const item of rows || []) {
    const source = item?.source || "invoice";
    const row = item?.row || {};
    const activeDate = getDocumentDate(row);
    if (!activeDate || activeDate > periodEnd) continue;

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;
    const customerContext = buildCustomerContext(customer, fallbackName);
    const customerName = customerContext.name || fallbackName || "Unassigned";
    const location = String(
      row?.locationName ||
        row?.location ||
        customerContext["billing-city"] ||
        customerContext["shipping-city"] ||
        customerContext["billing-state"] ||
        "",
    ).trim();
    const rowCurrency =
      String(row?.currency || customer?.currency || "SOS").trim() || "SOS";
    const customerKey = getCustomerKey({
      customer,
      customerName,
      customerId,
    });
    const amount = Math.abs(asNumber(row?.total, 0));
    const inPeriod = activeDate >= periodStart && activeDate <= periodEnd;

    if (!groupMap.has(customerKey)) {
      groupMap.set(customerKey, {
        values: {
          ...customerContext,
          name: customerName,
          location,
          currency: rowCurrency,
          "invoice-amount": 0,
          "invoice-amount-fcy": 0,
          "amount-received": 0,
          "amount-received-fcy": 0,
          "closing-balance": 0,
          "closing-balance-fcy": 0,
        },
      });
      if (!currency) currency = rowCurrency;
    }

    const target = groupMap.get(customerKey);
    target.values.currency =
      rowCurrency || String(target.values.currency || "");
    target.values.location =
      location || String(target.values.location || "");

    if (source === "invoice") {
      if (inPeriod) {
        target.values["invoice-amount"] =
          asNumber(target.values["invoice-amount"], 0) + amount;
        target.values["invoice-amount-fcy"] =
          asNumber(target.values["invoice-amount-fcy"], 0) + amount;
      }
      target.values["closing-balance"] =
        asNumber(target.values["closing-balance"], 0) + amount;
      target.values["closing-balance-fcy"] =
        asNumber(target.values["closing-balance-fcy"], 0) + amount;
    } else if (source === "credit-note") {
      target.values["closing-balance"] =
        asNumber(target.values["closing-balance"], 0) - amount;
      target.values["closing-balance-fcy"] =
        asNumber(target.values["closing-balance-fcy"], 0) - amount;
    } else if (source === "sales-receipt") {
      if (inPeriod) {
        target.values["amount-received"] =
          asNumber(target.values["amount-received"], 0) + amount;
        target.values["amount-received-fcy"] =
          asNumber(target.values["amount-received-fcy"], 0) + amount;
      }
      target.values["closing-balance"] =
        asNumber(target.values["closing-balance"], 0) - amount;
      target.values["closing-balance-fcy"] =
        asNumber(target.values["closing-balance-fcy"], 0) - amount;
    }
  }

  const groupedRows = [...groupMap.values()].filter((item) =>
    [
      "invoice-amount",
      "amount-received",
      "closing-balance",
    ].some((key) => asNumber(item.values[key], 0) !== 0),
  );

  groupedRows.sort((left, right) => {
    const balanceDelta =
      Math.abs(asNumber(right.values["closing-balance"], 0)) -
      Math.abs(asNumber(left.values["closing-balance"], 0));
    if (balanceDelta !== 0) return balanceDelta;
    return String(left.values.name || "").localeCompare(
      String(right.values.name || ""),
    );
  });

  const filteredRows = groupedRows.filter((item) =>
    matchesMoreFilters(
      {
        name: item.values.name,
        currency: item.values.currency,
        location: item.values.location,
        "invoice-amount": item.values["invoice-amount"],
        "amount-received": item.values["amount-received"],
        "closing-balance": item.values["closing-balance"],
      },
      moreFilters,
    ),
  );

  return {
    rows: filteredRows,
    currency: currency || "SOS",
    totals: filteredRows.reduce(
      (acc, row) => {
        acc["invoice-amount"] += asNumber(row.values["invoice-amount"], 0);
        acc["amount-received"] += asNumber(row.values["amount-received"], 0);
        acc["closing-balance"] += asNumber(row.values["closing-balance"], 0);
        return acc;
      },
      {
        "invoice-amount": 0,
        "amount-received": 0,
        "closing-balance": 0,
      } as Record<string, number>,
    ),
  };
};

const getReceivableSummaryReferenceNumber = (
  row: any,
  source: ReportEntity,
) => {
  if (source === "credit-note") {
    return String(
      row?.invoiceNumber ||
        row?.referenceNumber ||
        row?.orderNumber ||
        row?.transactionNumber ||
        row?.number ||
        row?.receiptNumber ||
        "",
    ).trim();
  }

  return String(
    row?.referenceNumber ||
      row?.orderNumber ||
      row?.invoiceNumber ||
      row?.transactionNumber ||
      row?.number ||
      row?.receiptNumber ||
      "",
  ).trim();
};

const getReceivableSummaryBaseAmount = (
  row: any,
  amount: number,
  baseCurrency: string,
) => {
  const rowCurrency = String(row?.currency || baseCurrency || "").trim();
  if (!rowCurrency || rowCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
    return amount;
  }

  const exchangeRate = asNumber(
    row?.exchangeRate ?? row?.exchange_rate ?? row?.fxRate ?? row?.rate,
    0,
  );
  if (exchangeRate > 0) {
    return amount * exchangeRate;
  }
  return amount;
};

const buildReceivableSummaryRows = (
  rows: Array<{ source: ReportEntity; row: any }>,
  customers: any[],
  range: { start: Date; end: Date },
  moreFilters: MoreFilterRow[],
  groupBy: string,
  baseCurrency: string,
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const normalizedRangeStart = startOfDay(range.start);
  const normalizedRangeEnd = endOfDay(range.end);
  const normalizedGroupBy = normalizeText(groupBy || "none");
  const detailRows: Array<{ values: Record<string, any> }> = [];
  let currency = baseCurrency || "SOS";

  for (const item of rows || []) {
    const source = item?.source || "invoice";
    const row = item?.row || {};
    const documentDate = getDocumentDate(row);
    if (
      !documentDate ||
      documentDate < normalizedRangeStart ||
      documentDate > normalizedRangeEnd
    ) {
      continue;
    }

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;
    const customerContext = buildCustomerContext(customer, fallbackName);
    const customerName = customerContext.name || fallbackName || "Unassigned";
    const location = String(
      row?.locationName ||
        row?.location ||
        customerContext["billing-city"] ||
        customerContext["shipping-city"] ||
        customerContext["billing-state"] ||
        "",
    ).trim();
    const rowCurrency =
      String(row?.currency || customer?.currency || baseCurrency || "SOS")
        .trim() || baseCurrency || "SOS";
    const amount = Math.abs(asNumber(row?.total, 0));
    const balance =
      source === "sales-receipt" ? 0 : getDocumentBalanceDue(row);
    const transaction = getDocumentNumber(row, source);
    const referenceNumber = getReceivableSummaryReferenceNumber(row, source);
    const transactionType = getDocumentTypeLabel(source);
    const convertedAmount = getReceivableSummaryBaseAmount(
      row,
      amount,
      baseCurrency || rowCurrency || "SOS",
    );
    const convertedBalance = getReceivableSummaryBaseAmount(
      row,
      balance,
      baseCurrency || rowCurrency || "SOS",
    );

    const values = {
      name: customerName,
      "customer-name": customerName,
      date: documentDate.toISOString(),
      "report-date": documentDate.toISOString(),
      transaction,
      "reference-number": referenceNumber,
      status: String(row?.status || "").trim(),
      "transaction-type": transactionType,
      type: transactionType,
      "total-fcy": amount,
      "total-bcy": convertedAmount,
      "balance-fcy": balance,
      "balance-bcy": convertedBalance,
      currency: rowCurrency,
      location,
    };

    if (!matchesMoreFilters(values, moreFilters)) continue;
    detailRows.push({ values });
    if (!currency) currency = rowCurrency;
  }

  detailRows.sort((left, right) => {
    if (normalizedGroupBy !== "none") {
      const leftGroup = String(left.values[normalizedGroupBy] || "").trim();
      const rightGroup = String(right.values[normalizedGroupBy] || "").trim();
      const groupDelta = rightGroup.localeCompare(leftGroup);
      if (groupDelta !== 0) return groupDelta;
    }

    const dateDelta = String(right.values.date || "").localeCompare(
      String(left.values.date || ""),
    );
    if (dateDelta !== 0) return dateDelta;

    return String(right.values.transaction || "").localeCompare(
      String(left.values.transaction || ""),
    );
  });

  return {
    rows: detailRows,
    currency: currency || baseCurrency || "SOS",
    totals: detailRows.reduce(
      (acc, row) => {
        acc["total-bcy"] += asNumber(row.values["total-bcy"], 0);
        acc["total-fcy"] += asNumber(row.values["total-fcy"], 0);
        acc["balance-bcy"] += asNumber(row.values["balance-bcy"], 0);
        acc["balance-fcy"] += asNumber(row.values["balance-fcy"], 0);
        return acc;
      },
      {
        "total-bcy": 0,
        "total-fcy": 0,
        "balance-bcy": 0,
        "balance-fcy": 0,
      } as Record<string, number>,
    ),
  };
};

const getInvoiceWriteOffDate = (row: any) =>
  asDate(
    row?.writeOffDate ||
      row?.writtenOffDate ||
      row?.write_off_date ||
      row?.updatedAt ||
      row?.createdAt ||
      row?.date ||
      row?.invoiceDate,
  );

const getInvoiceIssueDate = (row: any) =>
  asDate(row?.date || row?.invoiceDate || row?.createdAt);

const getInvoiceWriteOffAmount = (row: any) => {
  const manualSource =
    row?.writeOffAmount ??
    row?.writtenOffAmount ??
    row?.writeOffBalance ??
    row?.badDebtAmount ??
    row?.badDebt;
  const manualAmount = Number(manualSource);
  if (Number.isFinite(manualAmount) && manualAmount > 0) {
    return manualAmount;
  }
  return getDocumentBalanceDue(row);
};

const getInvoiceWriteOffAmountBase = (
  row: any,
  amount: number,
  baseCurrency: string,
) => {
  const rowCurrency = String(row?.currency || baseCurrency || "").trim();
  if (!rowCurrency || rowCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
    return amount;
  }

  const exchangeRate = asNumber(
    row?.exchangeRate ?? row?.exchange_rate ?? row?.fxRate ?? row?.rate,
    0,
  );
  if (exchangeRate > 0) {
    return amount * exchangeRate;
  }
  return amount;
};

const getBadDebtReason = (row: any) =>
  String(
    row?.writeOffReason ||
      row?.writtenOffReason ||
      row?.badDebtReason ||
      row?.reason ||
      row?.notes ||
      "",
  ).trim();

const buildBadDebtRows = (
  rows: Array<{ row: any }>,
  customers: any[],
  range: { start: Date; end: Date },
  moreFilters: MoreFilterRow[],
  reportBy: string,
  baseCurrency: string,
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const groupMap = new Map<string, any>();
  let currency = baseCurrency || "SOS";
  const reportByKey = String(reportBy || "invoice-date").trim();

  for (const item of rows || []) {
    const row = item?.row || {};
    const status = normalizeText(row?.status);
    const isWriteOff =
      status === "write_off" ||
      status === "write off" ||
      Boolean(row?.writeOff) ||
      Boolean(row?.isWriteOff);

    if (!isWriteOff) continue;

    const issueDate = getInvoiceIssueDate(row);
    const writeOffDate = getInvoiceWriteOffDate(row);
    const activeDate =
      reportByKey === "invoice-date" ? issueDate : writeOffDate || issueDate;

    if (!activeDate || activeDate < range.start || activeDate > range.end) {
      continue;
    }

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;

    const customerContext = buildCustomerContext(customer, fallbackName);
    const location = String(
      row?.locationName ||
        row?.location ||
        customerContext["billing-city"] ||
        customerContext["shipping-city"] ||
        customerContext["billing-state"] ||
        "",
    ).trim();
    const rowCurrency =
      String(row?.currency || customer?.currency || baseCurrency || "SOS")
        .trim() || baseCurrency || "SOS";
    const writeOffAmount = getInvoiceWriteOffAmount(row);
    const writeOffAmountBase = getInvoiceWriteOffAmountBase(
      row,
      writeOffAmount,
      baseCurrency || rowCurrency || "SOS",
    );

    const baseValues = {
      ...customerContext,
      location,
      currency: rowCurrency,
      "invoice-number": String(
        row?.invoiceNumber || row?.number || row?.transactionNumber || "",
      ).trim(),
      "invoice-date": issueDate ? issueDate.toISOString() : "",
      "written-off-date": writeOffDate ? writeOffDate.toISOString() : "",
      reason: getBadDebtReason(row),
      sales: writeOffAmount,
      "sales-with-tax": writeOffAmountBase,
      "write-off-amount-fcy": writeOffAmount,
      "write-off-amount-bcy": writeOffAmountBase,
    };

    if (!matchesMoreFilters(baseValues, moreFilters)) continue;

    const key = String(
      baseValues["customer-id"] || baseValues.name || "unassigned",
    )
      .trim()
      .toLowerCase();

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        values: {
          ...baseValues,
          "invoice-count": 0,
          sales: 0,
          "sales-with-tax": 0,
          "write-off-amount-fcy": 0,
          "write-off-amount-bcy": 0,
        },
      });
      if (!currency) currency = rowCurrency;
    }

    const target = groupMap.get(key);
    target.values["invoice-count"] =
      asNumber(target.values["invoice-count"], 0) + 1;
    target.values.sales = asNumber(target.values.sales, 0) + writeOffAmount;
    target.values["sales-with-tax"] =
      asNumber(target.values["sales-with-tax"], 0) + writeOffAmountBase;
    target.values["write-off-amount-fcy"] =
      asNumber(target.values["write-off-amount-fcy"], 0) + writeOffAmount;
    target.values["write-off-amount-bcy"] =
      asNumber(target.values["write-off-amount-bcy"], 0) + writeOffAmountBase;
    target.values["invoice-number"] =
      target.values["invoice-number"] || baseValues["invoice-number"];
    target.values.reason = target.values.reason || baseValues.reason;
    target.values["written-off-date"] =
      !target.values["written-off-date"] ||
      String(baseValues["written-off-date"]) >
        String(target.values["written-off-date"])
        ? baseValues["written-off-date"]
        : target.values["written-off-date"];
    target.values.currency = rowCurrency || String(target.values.currency || "");
  }

  const groupedRows = [...groupMap.values()].sort((left, right) => {
    const amountDelta =
      asNumber(right.values["write-off-amount-fcy"], 0) -
      asNumber(left.values["write-off-amount-fcy"], 0);
    if (amountDelta !== 0) return amountDelta;
    return String(left.values.name || "").localeCompare(
      String(right.values.name || ""),
    );
  });

  return {
    rows: groupedRows,
    currency: currency || baseCurrency || "SOS",
    totals: groupedRows.reduce(
      (acc, row) => {
        acc["invoice-count"] += asNumber(row.values["invoice-count"], 0);
        acc.sales += asNumber(row.values.sales, 0);
        acc["sales-with-tax"] += asNumber(row.values["sales-with-tax"], 0);
        acc["write-off-amount-fcy"] += asNumber(
          row.values["write-off-amount-fcy"],
          0,
        );
        acc["write-off-amount-bcy"] += asNumber(
          row.values["write-off-amount-bcy"],
          0,
        );
        return acc;
      },
      {
        "invoice-count": 0,
        sales: 0,
        "sales-with-tax": 0,
        "write-off-amount-fcy": 0,
        "write-off-amount-bcy": 0,
      } as Record<string, number>,
    ),
  };
};

const getPaymentBankChargeDate = (row: any) =>
  asDate(row?.date || row?.paymentDate || row?.createdAt);

const getPaymentBankChargeAmount = (row: any) => {
  const manualSource =
    row?.bankCharges ?? row?.bank_charges ?? row?.bankCharge ?? row?.chargeFee;
  const manualAmount = Number(manualSource);
  if (Number.isFinite(manualAmount) && manualAmount > 0) {
    return manualAmount;
  }
  return 0;
};

const getPaymentBankChargeAmountBase = (
  row: any,
  amount: number,
  baseCurrency: string,
) => {
  const rowCurrency = String(row?.currency || baseCurrency || "").trim();
  if (!rowCurrency || rowCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
    return amount;
  }

  const exchangeRate = asNumber(
    row?.exchangeRate ?? row?.exchange_rate ?? row?.fxRate ?? row?.rate,
    0,
  );
  if (exchangeRate > 0) {
    return amount * exchangeRate;
  }
  return amount;
};

const buildBankChargeRows = (
  rows: Array<{ row: any }>,
  customers: any[],
  range: { start: Date; end: Date },
  moreFilters: MoreFilterRow[],
  baseCurrency: string,
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const groupMap = new Map<string, any>();
  let currency = baseCurrency || "SOS";

  for (const item of rows || []) {
    const row = item?.row || {};
    const status = normalizeText(row?.status);
    if (status === "draft" || status === "void" || status === "cancelled" || status === "canceled") {
      continue;
    }

    const paymentDate = getPaymentBankChargeDate(row);
    if (!paymentDate || paymentDate < range.start || paymentDate > range.end) {
      continue;
    }

    const bankChargeAmount = getPaymentBankChargeAmount(row);
    if (bankChargeAmount <= 0) continue;

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;

    const customerContext = buildCustomerContext(customer, fallbackName);
    const location = String(
      row?.location ||
        row?.locationName ||
        customerContext["billing-city"] ||
        customerContext["shipping-city"] ||
        customerContext["billing-state"] ||
        "",
    ).trim();
    const rowCurrency =
      String(row?.currency || customer?.currency || baseCurrency || "SOS")
        .trim() || baseCurrency || "SOS";
    const bankChargeBase = getPaymentBankChargeAmountBase(
      row,
      bankChargeAmount,
      baseCurrency || rowCurrency || "SOS",
    );

    const baseValues = {
      ...customerContext,
      location,
      currency: rowCurrency,
      "payment-number": String(
        row?.paymentNumber || row?.number || row?.transactionNumber || "",
      ).trim(),
      "payment-date": paymentDate ? paymentDate.toISOString() : "",
      sales: bankChargeAmount,
      "sales-with-tax": bankChargeBase,
    };

    if (!matchesMoreFilters(baseValues, moreFilters)) continue;

    const key = String(
      baseValues["customer-id"] || baseValues.name || "unassigned",
    )
      .trim()
      .toLowerCase();

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        values: {
          ...baseValues,
          "invoice-count": 0,
          sales: 0,
          "sales-with-tax": 0,
        },
      });
      if (!currency) currency = rowCurrency;
    }

    const target = groupMap.get(key);
    target.values["invoice-count"] =
      asNumber(target.values["invoice-count"], 0) + 1;
    target.values.sales = asNumber(target.values.sales, 0) + bankChargeAmount;
    target.values["sales-with-tax"] =
      asNumber(target.values["sales-with-tax"], 0) + bankChargeBase;
    target.values["payment-number"] =
      target.values["payment-number"] || baseValues["payment-number"];
    target.values.currency = rowCurrency || String(target.values.currency || "");
  }

  const groupedRows = [...groupMap.values()].sort((left, right) => {
    const amountDelta =
      asNumber(right.values.sales, 0) - asNumber(left.values.sales, 0);
    if (amountDelta !== 0) return amountDelta;
    return String(left.values.name || "").localeCompare(
      String(right.values.name || ""),
    );
  });

  return {
    rows: groupedRows,
    currency: currency || baseCurrency || "SOS",
    totals: groupedRows.reduce(
      (acc, row) => {
        acc["invoice-count"] += asNumber(row.values["invoice-count"], 0);
        acc.sales += asNumber(row.values.sales, 0);
        acc["sales-with-tax"] += asNumber(row.values["sales-with-tax"], 0);
        return acc;
      },
      {
        "invoice-count": 0,
        sales: 0,
        "sales-with-tax": 0,
      } as Record<string, number>,
    ),
  };
};

const resolveItemName = (line: any, itemDoc: any, fallback = "") => {
  const values = [
    line?.itemDetails,
    line?.name,
    line?.itemName,
    line?.description,
    itemDoc?.name,
    fallback,
  ];
  return (
    values.map((value) => String(value ?? "").trim()).find(Boolean) ||
    "Unassigned"
  );
};

const resolveItemSku = (line: any, itemDoc: any) =>
  String(line?.sku || line?.itemSku || line?.code || itemDoc?.sku || "").trim();

const getTransactionSign = (source: ReportEntity) =>
  source === "credit-note" ? -1 : 1;

const extractReportingTagValue = (entry: any) => {
  const value = [
    entry?.value,
    entry?.selectedValue,
    entry?.tagValue,
    entry?.option,
    entry?.label,
    entry?.name,
  ]
    .map((item) => String(item ?? "").trim())
    .find(Boolean);
  return value || "";
};

const extractItemReportingTagSelections = (itemDoc: any) => {
  const selections = new Map<string, string>();
  const collections = [
    itemDoc?.tags,
    itemDoc?.reportingTags,
    itemDoc?.reporting_tags,
  ];

  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    for (const entry of collection) {
      const tagId = String(
        entry?.groupId ||
          entry?.tagId ||
          entry?.id ||
          entry?.reportingTagId ||
          "",
      ).trim();
      const tagName = String(
        entry?.groupName || entry?.tagName || entry?.group || entry?.name || "",
      ).trim();
      const value = extractReportingTagValue(entry);
      if (tagId && value) selections.set(normalizeText(tagId), value);
      if (tagName && value) selections.set(normalizeText(tagName), value);
    }
  }

  return selections;
};

const resolveSalespersonName = (
  row: any,
  salespersonsById: Map<string, any>,
  salespersonsByName: Map<string, any>,
) => {
  const rawCandidates = [
    row?.salespersonName,
    row?.salesperson?.name,
    row?.salesperson?.displayName,
    row?.salesperson?.fullName,
    row?.salesPersonName,
    row?.salesPerson?.name,
    row?.salesPerson?.displayName,
  ];

  const salespersonId = String(
    row?.salespersonId ||
      row?.salesperson?._id ||
      row?.salesperson?.id ||
      row?.salesPersonId ||
      row?.salesPerson?._id ||
      "",
  ).trim();
  if (salespersonId && salespersonsById.has(salespersonId)) {
    const salesperson = salespersonsById.get(salespersonId);
    return String(salesperson?.name || "").trim() || "Others";
  }

  const rawName =
    rawCandidates.map((value) => String(value ?? "").trim()).find(Boolean) ||
    String(
      typeof row?.salesperson === "string" ? row.salesperson : "",
    ).trim() ||
    String(typeof row?.salesPerson === "string" ? row.salesPerson : "").trim();

  if (rawName) {
    const matched = salespersonsByName.get(normalizeText(rawName));
    if (matched) return String(matched?.name || rawName).trim() || "Others";
    return rawName;
  }

  return "Others";
};

const buildItemRows = (
  rows: Array<{ source: ReportEntity; row: any }>,
  customers: any[],
  items: any[],
  reportingTags: any[],
  range: { start: Date; end: Date },
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const itemById = new Map<string, any>();
  const itemByName = new Map<string, any>();
  const itemBySku = new Map<string, any>();
  for (const item of items || []) {
    const id = String(item?._id || item?.id || "").trim();
    const name = String(item?.name || "").trim();
    const sku = String(item?.sku || "").trim();
    if (id) itemById.set(id, item);
    if (name) itemByName.set(normalizeText(name), item);
    if (sku) itemBySku.set(normalizeText(sku), item);
  }

  const groupMap = new Map<string, any>();
  let currency = "";

  for (const item of rows || []) {
    const source = item?.source || "invoice";
    const row = item?.row || {};
    const date = asDate(row?.date || row?.invoiceDate || row?.createdAt);
    if (!date || date < range.start || date > range.end) continue;

    const customerId = String(
      row?.customerId || row?.customer?._id || row?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      row?.customerName ||
        row?.customer?.displayName ||
        row?.customer?.name ||
        row?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      row?.customer ||
      null;

    const customerContext = buildCustomerContext(customer, fallbackName);
    const location = String(
      row?.locationName ||
        row?.location ||
        customerContext["billing-city"] ||
        customerContext["shipping-city"] ||
        customerContext["billing-state"] ||
        "",
    ).trim();
    const rowCurrency =
      String(row?.currency || customer?.currency || "SOS").trim() || "SOS";
    const baseTransactionValues = {
      ...customerContext,
      location,
      currency: rowCurrency,
    };

    const lineItems = Array.isArray(row?.items) ? row.items : [];
    for (const line of lineItems) {
      if (!line || line.itemType === "header") continue;

      const lineItemId = String(
        line?.itemId || line?.item?._id || line?.item?.id || line?.item || "",
      ).trim();
      const itemDoc =
        itemById.get(lineItemId) ||
        itemByName.get(normalizeText(resolveItemName(line, null, ""))) ||
        itemBySku.get(normalizeText(resolveItemSku(line, null))) ||
        null;
      const itemName = resolveItemName(line, itemDoc);
      const sku = resolveItemSku(line, itemDoc);
      const itemType = String(itemDoc?.type || line?.itemType || "").trim();
      const usageUnit = String(
        line?.unit || line?.usageUnit || itemDoc?.unit || "",
      ).trim();
      const salesDescription = String(
        line?.description || itemDoc?.description || "",
      ).trim();
      const salesPrice = asNumber(
        line?.rate ?? line?.unitPrice ?? line?.price ?? itemDoc?.rate,
        0,
      );
      const quantity =
        Math.abs(asNumber(line?.quantity, 0)) * getTransactionSign(source);
      const lineAmountRaw =
        line?.amount ??
        line?.total ??
        line?.lineTotal ??
        line?.subtotal ??
        quantity * asNumber(line?.rate ?? line?.unitPrice ?? line?.price, 0);
      const amount =
        Math.abs(asNumber(lineAmountRaw, 0)) * getTransactionSign(source);
      const averagePrice = quantity !== 0 ? amount / quantity : salesPrice;
      const itemReportingTagSelections =
        extractItemReportingTagSelections(itemDoc);
      const itemTagIds = new Set(
        Array.isArray(itemDoc?.tagIds)
          ? itemDoc.tagIds
              .map((value: any) => normalizeText(String(value ?? "").trim()))
              .filter(Boolean)
          : [],
      );
      const reportingTagValues: Record<string, string> = {};

      for (const tag of reportingTags || []) {
        const tagId = String(tag?._id || tag?.id || "").trim();
        const tagName = String(
          tag?.name || tag?.title || tag?.label || "",
        ).trim();
        const selectedValue =
          (tagId && itemReportingTagSelections.get(normalizeText(tagId))) ||
          (tagName && itemReportingTagSelections.get(normalizeText(tagName))) ||
          (tagId && itemTagIds.has(normalizeText(tagId))
            ? tagName || tagId
            : "") ||
          "";
        if (tagId) reportingTagValues[`reporting-tag:${tagId}`] = selectedValue;
      }

      const reportingTagsSummary = Object.values(reportingTagValues)
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(", ");

      const baseValues = {
        ...baseTransactionValues,
        "item-name": itemName,
        sku,
        "item-type": itemType,
        "product-type": itemType,
        status: String(itemDoc?.status || "").trim(),
        "usage-unit": usageUnit,
        "sales-description": salesDescription,
        "sales-price": salesPrice,
        "created-by": String(itemDoc?.createdBy || row?.createdBy || "").trim(),
        "created-time": itemDoc?.createdAt
          ? new Date(itemDoc.createdAt).toISOString()
          : "",
        "last-modified-time": itemDoc?.updatedAt
          ? new Date(itemDoc.updatedAt).toISOString()
          : "",
        "quantity-sold": quantity,
        amount,
        "average-price": averagePrice,
        "reporting-tags": reportingTagsSummary,
        ...reportingTagValues,
      };

      if (!matchesMoreFilters(baseValues, moreFilters)) continue;

      const key = String(lineItemId || sku || itemName || "unassigned")
        .trim()
        .toLowerCase();
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          values: {
            ...baseValues,
            "quantity-sold": 0,
            amount: 0,
            "average-price": 0,
          },
        });
        if (!currency) currency = rowCurrency;
      }

      const target = groupMap.get(key);
      target.values["item-name"] = itemName;
      target.values.sku = sku;
      target.values["item-type"] = itemType;
      target.values["product-type"] = itemType;
      target.values.status = String(
        target.values.status || itemDoc?.status || "",
      ).trim();
      target.values["usage-unit"] =
        usageUnit || String(target.values["usage-unit"] || "");
      target.values["sales-description"] =
        salesDescription || String(target.values["sales-description"] || "");
      target.values["sales-price"] = salesPrice;
      target.values["created-by"] = String(
        target.values["created-by"] ||
          itemDoc?.createdBy ||
          row?.createdBy ||
          "",
      ).trim();
      target.values["created-time"] = String(
        target.values["created-time"] ||
          (itemDoc?.createdAt ? new Date(itemDoc.createdAt).toISOString() : ""),
      );
      target.values["last-modified-time"] = String(
        target.values["last-modified-time"] ||
          (itemDoc?.updatedAt ? new Date(itemDoc.updatedAt).toISOString() : ""),
      );
      target.values["quantity-sold"] =
        asNumber(target.values["quantity-sold"], 0) + quantity;
      target.values.amount = asNumber(target.values.amount, 0) + amount;
      target.values.currency =
        rowCurrency || String(target.values.currency || "");
      target.values.location = target.values.location || location;
      target.values.name = target.values["item-name"];
      target.values["average-price"] =
        target.values["quantity-sold"] !== 0
          ? target.values.amount / target.values["quantity-sold"]
          : averagePrice;
      target.values["reporting-tags"] =
        target.values["reporting-tags"] || reportingTagsSummary;
      for (const [key, value] of Object.entries(reportingTagValues)) {
        if (!target.values[key]) target.values[key] = value;
      }
    }
  }

  const groupedRows = [...groupMap.values()].sort((left, right) => {
    const amountDelta =
      asNumber(right.values.amount, 0) - asNumber(left.values.amount, 0);
    if (amountDelta !== 0) return amountDelta;
    return String(left.values["item-name"] || "").localeCompare(
      String(right.values["item-name"] || ""),
    );
  });

  const totalQuantity = groupedRows.reduce(
    (sum, row) => sum + asNumber(row.values["quantity-sold"], 0),
    0,
  );
  const totalAmount = groupedRows.reduce(
    (sum, row) => sum + asNumber(row.values.amount, 0),
    0,
  );

  return {
    rows: groupedRows,
    currency: currency || "SOS",
    totals: groupedRows.reduce(
      (acc, row) => {
        acc["quantity-sold"] += asNumber(row.values["quantity-sold"], 0);
        acc.amount += asNumber(row.values.amount, 0);
        return acc;
      },
      {
        "quantity-sold": 0,
        amount: 0,
        "average-price": totalQuantity !== 0 ? totalAmount / totalQuantity : 0,
      } as Record<string, number>,
    ),
  };
};

const buildSalespersonRows = (
  rows: Array<{ source: ReportEntity; row: any }>,
  salespersons: any[],
  range: { start: Date; end: Date },
  moreFilters: MoreFilterRow[],
) => {
  const salespersonById = new Map<string, any>();
  const salespersonByName = new Map<string, any>();

  for (const salesperson of salespersons || []) {
    const id = String(salesperson?._id || salesperson?.id || "").trim();
    const name = String(salesperson?.name || "").trim();
    if (id) salespersonById.set(id, salesperson);
    if (name) salespersonByName.set(normalizeText(name), salesperson);
  }

  const groupMap = new Map<string, any>();
  let currency = "";

  for (const item of rows || []) {
    const source = item?.source || "invoice";
    const row = item?.row || {};
    const date = asDate(row?.date || row?.invoiceDate || row?.createdAt);
    if (!date || date < range.start || date > range.end) continue;

    const salespersonName = resolveSalespersonName(
      row,
      salespersonById,
      salespersonByName,
    );
    const salespersonId = String(
      row?.salespersonId ||
        row?.salesperson?._id ||
        row?.salesperson?.id ||
        row?.salesPersonId ||
        "",
    ).trim();
    const salesperson =
      (salespersonId && salespersonById.get(salespersonId)) ||
      salespersonByName.get(normalizeText(salespersonName)) ||
      null;
    const key = salespersonId || normalizeText(salespersonName) || "others";

    const rowCurrency = String(row?.currency || "SOS").trim() || "SOS";
    const total = asNumber(row?.total, 0);
    const totalTax = asNumber(row?.totalTax, 0);
    const subTotal = asNumber(row?.subTotal, total - totalTax);
    const invoiceSales = source === "invoice" ? Math.abs(subTotal) : 0;
    const invoiceSalesWithTax = source === "invoice" ? Math.abs(total) : 0;
    const creditNoteSales = source === "credit-note" ? Math.abs(subTotal) : 0;
    const creditNoteSalesWithTax =
      source === "credit-note" ? Math.abs(total) : 0;
    const totalSales = invoiceSales - creditNoteSales;
    const totalSalesWithTax = invoiceSalesWithTax - creditNoteSalesWithTax;

    const baseValues = {
      name: salespersonName,
      "salesperson-id": salespersonId,
      "balance-due": 0,
      credits: 0,
      email: String(salesperson?.email || salesperson?.mail || "").trim(),
      status: String(salesperson?.status || "").trim(),
      currency: rowCurrency,
    };

    if (!matchesMoreFilters(baseValues, moreFilters)) continue;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        values: {
          ...baseValues,
          "balance-due": 0,
          credits: 0,
          email: String(baseValues.email || ""),
          status: String(baseValues.status || ""),
          "invoice-count": 0,
          "invoice-sales": 0,
          "invoice-sales-with-tax": 0,
          "credit-note-count": 0,
          "credit-note-sales": 0,
          "credit-note-sales-with-tax": 0,
          "total-sales": 0,
          "total-sales-with-tax": 0,
        },
      });
      if (!currency) currency = rowCurrency;
    }

    const target = groupMap.get(key);
    target.values.name = salespersonName;
    target.values["salesperson-id"] = salespersonId;
    target.values.currency =
      rowCurrency || String(target.values.currency || "");
    target.values["invoice-count"] =
      asNumber(target.values["invoice-count"], 0) +
      (source === "invoice" ? 1 : 0);
    target.values["invoice-sales"] =
      asNumber(target.values["invoice-sales"], 0) + invoiceSales;
    target.values["invoice-sales-with-tax"] =
      asNumber(target.values["invoice-sales-with-tax"], 0) +
      invoiceSalesWithTax;
    target.values["credit-note-count"] =
      asNumber(target.values["credit-note-count"], 0) +
      (source === "credit-note" ? 1 : 0);
    target.values["credit-note-sales"] =
      asNumber(target.values["credit-note-sales"], 0) + creditNoteSales;
    target.values["credit-note-sales-with-tax"] =
      asNumber(target.values["credit-note-sales-with-tax"], 0) +
      creditNoteSalesWithTax;
    target.values["total-sales"] =
      asNumber(target.values["total-sales"], 0) + totalSales;
    target.values["total-sales-with-tax"] =
      asNumber(target.values["total-sales-with-tax"], 0) + totalSalesWithTax;
  }

  const groupedRows = [...groupMap.values()].sort((left, right) => {
    const salesDelta =
      asNumber(right.values["total-sales"], 0) -
      asNumber(left.values["total-sales"], 0);
    if (salesDelta !== 0) return salesDelta;
    return String(left.values.name || "").localeCompare(
      String(right.values.name || ""),
    );
  });

  return {
    rows: groupedRows,
    currency: currency || "SOS",
    totals: groupedRows.reduce(
      (acc, row) => {
        acc["invoice-count"] += asNumber(row.values["invoice-count"], 0);
        acc["invoice-sales"] += asNumber(row.values["invoice-sales"], 0);
        acc["invoice-sales-with-tax"] += asNumber(
          row.values["invoice-sales-with-tax"],
          0,
        );
        acc["credit-note-count"] += asNumber(
          row.values["credit-note-count"],
          0,
        );
        acc["credit-note-sales"] += asNumber(
          row.values["credit-note-sales"],
          0,
        );
        acc["credit-note-sales-with-tax"] += asNumber(
          row.values["credit-note-sales-with-tax"],
          0,
        );
        acc["total-sales"] += asNumber(row.values["total-sales"], 0);
        acc["total-sales-with-tax"] += asNumber(
          row.values["total-sales-with-tax"],
          0,
        );
        return acc;
      },
      {
        "invoice-count": 0,
        "invoice-sales": 0,
        "invoice-sales-with-tax": 0,
        "credit-note-count": 0,
        "credit-note-sales": 0,
        "credit-note-sales-with-tax": 0,
        "total-sales": 0,
        "total-sales-with-tax": 0,
      } as Record<string, number>,
    ),
  };
};

export const getSalesByCustomerReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const entitiesQuery = req.query.entities ?? req.query.entity_list;
  const entities = String(entitiesQuery ?? "").trim()
    ? parseEntities(entitiesQuery)
    : ["invoice", "credit-note", "sales-receipt"];
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [customers, invoices, creditNotes, salesReceipts] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
    CreditNote.find({ organizationId: orgId }).lean(),
    SalesReceipt.find({ organizationId: orgId }).lean(),
  ]);

  const transactions: Array<{ source: ReportEntity; row: any }> = [];

  if (entities.includes("invoice")) {
    for (const row of invoices || [])
      transactions.push({ source: "invoice", row });
  }
  if (entities.includes("credit-note")) {
    for (const row of creditNotes || [])
      transactions.push({ source: "credit-note", row });
  }
  if (entities.includes("sales-receipt")) {
    for (const row of salesReceipts || [])
      transactions.push({ source: "sales-receipt", row });
  }

  const normalizeRange = (value: { start: Date; end: Date } | null) =>
    value ? { start: startOfDay(value.start), end: endOfDay(value.end) } : null;

  const main = buildRows(
    transactions,
    customers,
    normalizeRange(range)!,
    moreFilters,
  );

  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildRows(
        transactions,
        customers,
        normalizeRange(compareRange)!,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        entities,
        moreFilters,
      },
    },
  });
};

export const getTimeToGetPaidReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);

  const [customers, invoices, payments] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
    PaymentReceived.find({ organizationId: orgId }).lean(),
  ]);

  const invoiceById = new Map<string, any>();
  const invoiceByNumber = new Map<string, any>();
  const rows = new Map<
    string,
    {
      name: string;
      total: number;
      bucket0to15: number;
      bucket16to30: number;
      bucket31to45: number;
      bucketAbove45: number;
    }
  >();

  const ensureRow = (key: string, name: string) => {
    const normalizedKey = String(key || "").trim();
    const normalizedName = String(name || "Unknown Customer").trim() || "Unknown Customer";
    if (!rows.has(normalizedKey)) {
      rows.set(normalizedKey, {
        name: normalizedName,
        total: 0,
        bucket0to15: 0,
        bucket16to30: 0,
        bucket31to45: 0,
        bucketAbove45: 0,
      });
    } else {
      const current = rows.get(normalizedKey)!;
      if (!current.name && normalizedName) current.name = normalizedName;
    }
    return rows.get(normalizedKey)!;
  };

  (customers || []).forEach((customer: any) => {
    const customerId = String(customer?._id || customer?.id || customer?.customerId || "").trim();
    const customerName =
      String(
        customer?.displayName ||
          customer?.companyName ||
          customer?.name ||
          customer?.customerName ||
          "",
      ).trim() || "Unknown Customer";
    const key = customerId || normalizeText(customerName) || customerName;
    ensureRow(key, customerName);
  });

  (invoices || []).forEach((invoice: any) => {
    const invoiceId = String(invoice?._id || invoice?.id || "").trim();
    const invoiceNumber = String(invoice?.invoiceNumber || "").trim().toLowerCase();
    if (invoiceId) invoiceById.set(invoiceId, invoice);
    if (invoiceNumber) invoiceByNumber.set(invoiceNumber, invoice);
  });

  for (const payment of payments || []) {
    const paymentDate = asDate(
      (payment as any)?.date || (payment as any)?.paymentDate || (payment as any)?.createdAt,
    );
    if (!paymentDate || paymentDate < range.start || paymentDate > range.end) continue;

    const allocations = getPaymentAllocationEntries(payment);
    if (allocations.length === 0) continue;

    for (const allocation of allocations) {
      const invoice =
        invoiceById.get(String(allocation.invoiceId || "").trim()) ||
        invoiceByNumber.get(String(allocation.invoiceNumber || "").trim().toLowerCase()) ||
        allocation.invoice ||
        null;

      const invoiceDate = asDate(
        allocation.invoiceDate ||
          allocation.date ||
          allocation.appliedAt ||
          invoice?.invoiceDate ||
          invoice?.date ||
          invoice?.createdAt ||
          invoice?.dueDate,
      );
      if (!invoiceDate) continue;

      const amount = asNumber(allocation.amount, 0);
      if (amount <= 0) continue;

      const customerId = String(
        invoice?.customerId ||
          invoice?.customer?._id ||
          invoice?.customer?.id ||
          invoice?.customer ||
          payment?.customerId ||
          "",
      ).trim();
      const customerName =
        String(
          invoice?.customerName ||
            invoice?.customer?.displayName ||
            invoice?.customer?.companyName ||
            invoice?.customer?.name ||
            payment?.customerName ||
            "",
        ).trim() || "Unknown Customer";
      const key = customerId || normalizeText(customerName) || customerName;
      const row = ensureRow(key, customerName);

      const days = Math.max(
        0,
        Math.round((paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const bucket = getTimeToGetPaidBucketLabel(days);

      row.total += amount;
      if (bucket === "0 - 15 Days") row.bucket0to15 += amount;
      else if (bucket === "16 - 30 Days") row.bucket16to30 += amount;
      else if (bucket === "31 - 45 Days") row.bucket31to45 += amount;
      else row.bucketAbove45 += amount;
    }
  }

  const sortedRows = [...rows.values()]
    .filter((row) => row.total > 0)
    .sort(
    (left, right) => right.total - left.total || left.name.localeCompare(right.name),
    );
  const grandTotal = sortedRows.reduce((sum, row) => sum + row.total, 0);
  const total0to15 = sortedRows.reduce((sum, row) => sum + row.bucket0to15, 0);
  const total16to30 = sortedRows.reduce((sum, row) => sum + row.bucket16to30, 0);
  const total31to45 = sortedRows.reduce((sum, row) => sum + row.bucket31to45, 0);
  const totalAbove45 = sortedRows.reduce((sum, row) => sum + row.bucketAbove45, 0);

  return res.json({
    success: true,
    data: {
      title: "Time to Get Paid",
      subtitle: `As of ${range.end.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      columns: [
        "Customer Name",
        "0 - 15 Days",
        "16 - 30 Days",
        "31 - 45 Days",
        "Above 45 Days",
      ],
      rows: sortedRows.map((row) => [
        row.name,
        formatPercent(row.total > 0 ? (row.bucket0to15 / row.total) * 100 : 0),
        formatPercent(row.total > 0 ? (row.bucket16to30 / row.total) * 100 : 0),
        formatPercent(row.total > 0 ? (row.bucket31to45 / row.total) * 100 : 0),
        formatPercent(row.total > 0 ? (row.bucketAbove45 / row.total) * 100 : 0),
      ]),
      totals: [
        "Total",
        formatPercent(grandTotal > 0 ? (total0to15 / grandTotal) * 100 : 0),
        formatPercent(grandTotal > 0 ? (total16to30 / grandTotal) * 100 : 0),
        formatPercent(grandTotal > 0 ? (total31to45 / grandTotal) * 100 : 0),
        formatPercent(grandTotal > 0 ? (totalAbove45 / grandTotal) * 100 : 0),
      ],
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
      },
    },
  });
};

export const getCustomerBalanceSummaryReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const entities = parseEntities(req.query.entities ?? req.query.entity_list);
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [customers, invoices, creditNotes, salesReceipts] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
    CreditNote.find({ organizationId: orgId }).lean(),
    SalesReceipt.find({ organizationId: orgId }).lean(),
  ]);

  const transactions: Array<{ source: ReportEntity; row: any }> = [];
  if (entities.includes("invoice")) {
    for (const row of invoices || [])
      transactions.push({ source: "invoice", row });
  }
  if (entities.includes("credit-note")) {
    for (const row of creditNotes || [])
      transactions.push({ source: "credit-note", row });
  }
  if (entities.includes("sales-receipt")) {
    for (const row of salesReceipts || [])
      transactions.push({ source: "sales-receipt", row });
  }

  const main = buildCustomerBalanceSummaryRows(
    transactions,
    customers || [],
    range,
    moreFilters,
  );

  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildCustomerBalanceSummaryRows(
        transactions,
        customers || [],
        compareRange,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        entities,
        moreFilters,
      },
    },
  });
};

export const getReceivableSummaryReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const groupBy =
    String(req.query.groupBy ?? req.query.group_by ?? "none").trim() || "none";
  const entities = parseEntities(req.query.entities ?? req.query.entity_list);
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [customers, invoices, creditNotes, salesReceipts, organization] =
    await Promise.all([
      Customer.find({ organizationId: orgId }).lean(),
      Invoice.find({ organizationId: orgId }).lean(),
      CreditNote.find({ organizationId: orgId }).lean(),
      SalesReceipt.find({ organizationId: orgId }).lean(),
      Organization.findOne({ _id: orgId }).lean(),
    ]);

  const baseCurrency = String(
    (organization as any)?.baseCurrency || "SOS",
  ).trim();
  const transactions: Array<{ source: ReportEntity; row: any }> = [];
  if (entities.includes("invoice")) {
    for (const row of invoices || [])
      transactions.push({ source: "invoice", row });
  }
  if (entities.includes("credit-note")) {
    for (const row of creditNotes || [])
      transactions.push({ source: "credit-note", row });
  }
  if (entities.includes("sales-receipt")) {
    for (const row of salesReceipts || [])
      transactions.push({ source: "sales-receipt", row });
  }

  const main = buildReceivableSummaryRows(
    transactions,
    customers || [],
    range,
    moreFilters,
    groupBy,
    baseCurrency,
  );

  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildReceivableSummaryRows(
        transactions,
        customers || [],
        compareRange,
        moreFilters,
        groupBy,
        baseCurrency,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        groupBy,
        entities,
        moreFilters,
      },
    },
  });
};

export const getSalesByItemReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const entities = parseEntities(req.query.entities ?? req.query.entity_list);
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [
    customers,
    items,
    reportingTags,
    invoices,
    creditNotes,
    salesReceipts,
  ] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Item.find({ organizationId: orgId }).lean(),
    ReportingTag.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
    CreditNote.find({ organizationId: orgId }).lean(),
    SalesReceipt.find({ organizationId: orgId }).lean(),
  ]);

  const transactions: Array<{ source: ReportEntity; row: any }> = [];
  if (entities.includes("invoice")) {
    for (const row of invoices || [])
      transactions.push({ source: "invoice", row });
  }
  if (entities.includes("credit-note")) {
    for (const row of creditNotes || [])
      transactions.push({ source: "credit-note", row });
  }
  if (entities.includes("sales-receipt")) {
    for (const row of salesReceipts || [])
      transactions.push({ source: "sales-receipt", row });
  }

  const normalizeRange = (value: { start: Date; end: Date } | null) =>
    value ? { start: startOfDay(value.start), end: endOfDay(value.end) } : null;

  const main = buildItemRows(
    transactions,
    customers,
    items,
    reportingTags,
    normalizeRange(range)!,
    moreFilters,
  );

  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildItemRows(
        transactions,
        customers,
        items,
        reportingTags,
        normalizeRange(compareRange)!,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        entities,
        moreFilters,
      },
    },
  });
};

export const getSalesBySalesPersonReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const entities = parseEntities(req.query.entities ?? req.query.entity_list);
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [salespersons, invoices, creditNotes] = await Promise.all([
    Salesperson.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
    CreditNote.find({ organizationId: orgId }).lean(),
  ]);

  const transactions: Array<{ source: ReportEntity; row: any }> = [];
  if (entities.includes("invoice")) {
    for (const row of invoices || [])
      transactions.push({ source: "invoice", row });
  }
  if (entities.includes("credit-note")) {
    for (const row of creditNotes || [])
      transactions.push({ source: "credit-note", row });
  }

  const normalizeRange = (value: { start: Date; end: Date } | null) =>
    value ? { start: startOfDay(value.start), end: endOfDay(value.end) } : null;

  const main = buildSalespersonRows(
    transactions,
    salespersons,
    normalizeRange(range)!,
    moreFilters,
  );

  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildSalespersonRows(
        transactions,
        salespersons,
        normalizeRange(compareRange)!,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        entities,
        moreFilters,
      },
    },
  });
};

const buildARAgingSummaryRows = (
  invoices: any[],
  customers: any[],
  asOf: Date,
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const groupMap = new Map<string, any>();
  let currency = "";

  for (const row of invoices || []) {
    const balance = getDocumentBalanceDue(row);
    if (balance <= 0) continue;
    const customer =
      customerById.get(String(row?.customerId || "").trim()) ||
      customerByName.get(normalizeText(row?.customerName || ""));
    const customerName = resolveCustomerName(
      customer,
      String(row?.customerName || ""),
    );
    const customerKey = getCustomerKey({
      customer,
      customerName,
      customerId: row?.customerId,
    });
    const dueDate = getDocumentDueDate(row);
    const ageDays = getAgingAgeDays(asOf, dueDate);
    const bucketKey = getAgingBucketKey(ageDays);
    const rowCurrency = String(row?.currency || currency || "SOS");
    if (!groupMap.has(customerKey)) {
      groupMap.set(customerKey, {
        values: {
          name: customerName,
          "customer-id": String(
            row?.customerId || customer?.id || customer?._id || "",
          ).trim(),
          currency: rowCurrency,
          current: 0,
          "1-15-days": 0,
          "16-30-days": 0,
          "31-45-days": 0,
          "gt-45-days": 0,
          total: 0,
          "total-fcy": 0,
        },
      });
      if (!currency) currency = rowCurrency;
    }

    const target = groupMap.get(customerKey);
    target.values.currency =
      rowCurrency || String(target.values.currency || "");
    target.values[bucketKey] = asNumber(target.values[bucketKey], 0) + balance;
    target.values.total = asNumber(target.values.total, 0) + balance;
    target.values["total-fcy"] =
      asNumber(target.values["total-fcy"], 0) + balance;
  }

  const groupedRows = [...groupMap.values()].sort((left, right) => {
    const delta =
      asNumber(right.values.total, 0) - asNumber(left.values.total, 0);
    if (delta !== 0) return delta;
    return String(left.values.name || "").localeCompare(
      String(right.values.name || ""),
    );
  });

  const filteredRows = groupedRows.filter((item) =>
    matchesMoreFilters(
      {
        name: item.values.name,
        currency: item.values.currency,
        total: item.values.total,
        balance: item.values.total,
      },
      moreFilters,
    ),
  );

  return {
    rows: filteredRows,
    currency: currency || "SOS",
    totals: filteredRows.reduce(
      (acc, row) => {
        acc.current += asNumber(row.values.current, 0);
        acc["1-15-days"] += asNumber(row.values["1-15-days"], 0);
        acc["16-30-days"] += asNumber(row.values["16-30-days"], 0);
        acc["31-45-days"] += asNumber(row.values["31-45-days"], 0);
        acc["gt-45-days"] += asNumber(row.values["gt-45-days"], 0);
        acc.total += asNumber(row.values.total, 0);
        acc["total-fcy"] += asNumber(row.values["total-fcy"], 0);
        return acc;
      },
      {
        current: 0,
        "1-15-days": 0,
        "16-30-days": 0,
        "31-45-days": 0,
        "gt-45-days": 0,
        total: 0,
        "total-fcy": 0,
      } as Record<string, number>,
    ),
  };
};

export const getBadDebtsReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const reportBy = String(
    req.query.reportBy ?? req.query.report_by ?? "invoice-date",
  ).trim();
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [customers, invoices, organization] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
    Organization.findOne({ _id: orgId }).lean(),
  ]);

  const baseCurrency = String(
    (organization as any)?.baseCurrency || "SOS",
  ).trim();
  const writeOffInvoices = (invoices || []).filter((row: any) => {
    const status = normalizeText(row?.status);
    return (
      status === "write_off" ||
      status === "write off" ||
      Boolean(row?.writeOff) ||
      Boolean(row?.isWriteOff)
    );
  });
  const entities = parseEntities(req.query.entities);
  const eligibleInvoices = entities.includes("invoice") ? writeOffInvoices : [];

  const main = buildBadDebtRows(
    eligibleInvoices.map((row: any) => ({ row })),
    customers,
    range,
    moreFilters,
    reportBy,
    baseCurrency,
  );

  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildBadDebtRows(
        eligibleInvoices.map((row: any) => ({ row })),
        customers,
        compareRange,
        moreFilters,
        reportBy,
        baseCurrency,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        reportBy,
        moreFilters,
      },
    },
  });
};

export const getBankChargesReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const reportBy = String(
    req.query.reportBy ?? req.query.report_by ?? "payment-date",
  ).trim();
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [customers, payments, organization] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    PaymentReceived.find({ organizationId: orgId, bankCharges: { $gt: 0 } }).lean(),
    Organization.findOne({ _id: orgId }).lean(),
  ]);

  const baseCurrency = String(
    (organization as any)?.baseCurrency || "SOS",
  ).trim();
  const postedPayments = (payments || []).filter((row: any) => {
    const status = normalizeText(row?.status);
    return (
      status !== "draft" &&
      status !== "void" &&
      status !== "cancelled" &&
      status !== "canceled"
    );
  });

  const main = buildBankChargeRows(
    postedPayments.map((row: any) => ({ row })),
    customers,
    range,
    moreFilters,
    baseCurrency,
  );

  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildBankChargeRows(
        postedPayments.map((row: any) => ({ row })),
        customers,
        compareRange,
        moreFilters,
        baseCurrency,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        reportBy,
        moreFilters,
      },
    },
  });
};

const buildARAgingDetailsRows = (
  invoices: any[],
  customers: any[],
  asOf: Date,
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const rows = (invoices || [])
    .map((row) => {
      const balance = getDocumentBalanceDue(row);
      if (balance <= 0) return null;
      const customer =
        customerById.get(String(row?.customerId || "").trim()) ||
        customerByName.get(normalizeText(row?.customerName || ""));
      const customerName = resolveCustomerName(
        customer,
        String(row?.customerName || ""),
      );
      const dueDate = getDocumentDueDate(row);
      const invoiceDate = getDocumentDate(row);
      const ageDays = getAgingAgeDays(asOf, dueDate);
      const rowCurrency = String(row?.currency || "SOS");
      return {
        source: "invoice" as const,
        values: {
          name: customerName,
          status: String(row?.status || "Open").trim(),
          "invoice-date": invoiceDate ? invoiceDate.toISOString() : "",
          "due-date": dueDate ? dueDate.toISOString() : "",
          transaction: String(
            row?.invoiceNumber || row?.orderNumber || "",
          ).trim(),
          type: "Invoice",
          age: ageDays <= 0 ? "Current" : `${ageDays} Days`,
          amount: Math.abs(asNumber(row?.total, 0)),
          balance: balance,
          "balance-due": balance,
          currency: rowCurrency,
        },
      };
    })
    .filter(Boolean) as Array<{
    source: ReportEntity;
    values: Record<string, unknown>;
  }>;

  const filteredRows = rows.filter((item) =>
    matchesMoreFilters(
      {
        name: item.values.name,
        status: item.values.status,
        "invoice-number": item.values.transaction,
        transaction: item.values.transaction,
        "invoice-date": item.values["invoice-date"],
        "due-date": item.values["due-date"],
        age: item.values.age,
        amount: item.values.amount,
        balance: item.values.balance,
        "balance-due": item.values["balance-due"],
        currency: item.values.currency,
      },
      moreFilters,
    ),
  );

  const currency = String(filteredRows[0]?.values.currency || "SOS");
  return {
    rows: filteredRows.sort((left, right) =>
      String(right.values["due-date"] || "").localeCompare(
        String(left.values["due-date"] || ""),
      ),
    ),
    currency,
    totals: filteredRows.reduce(
      (acc, row) => {
        acc.amount += asNumber(row.values.amount, 0);
        acc.balance += asNumber(row.values.balance, 0);
        return acc;
      },
      { amount: 0, balance: 0 } as Record<string, number>,
    ),
  };
};

const buildInvoiceDetailsRows = (
  invoices: any[],
  creditNotes: any[],
  customers: any[],
  range: { start: Date; end: Date },
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const transactionRows = [
    ...(invoices || []).map((row) => ({ source: "invoice" as const, row })),
    ...(creditNotes || []).map((row) => ({
      source: "credit-note" as const,
      row,
    })),
  ];

  const rows = transactionRows
    .map(({ source, row }) => {
      const documentDate = getDocumentDate(row);
      if (
        !documentDate ||
        documentDate < startOfDay(range.start) ||
        documentDate > endOfDay(range.end)
      )
        return null;
      const customer =
        customerById.get(String(row?.customerId || "").trim()) ||
        customerByName.get(normalizeText(row?.customerName || ""));
      const customerName = resolveCustomerName(
        customer,
        String(row?.customerName || ""),
      );
      const dueDate = getDocumentDueDate(row);
      const rowCurrency = String(row?.currency || "SOS");
      const amount =
        source === "credit-note"
          ? Math.abs(asNumber(row?.total, 0))
          : Math.abs(asNumber(row?.total, 0));
      const balance =
        source === "credit-note"
          ? Math.abs(asNumber(row?.balance, amount))
          : getDocumentBalanceDue(row);
      return {
        source,
        values: {
          name: customerName,
          status: String(row?.status || "Open").trim(),
          "invoice-date": documentDate ? documentDate.toISOString() : "",
          "due-date": dueDate ? dueDate.toISOString() : "",
          "invoice-number": getDocumentNumber(row, source),
          "order-number": String(
            row?.orderNumber || row?.salesOrderNumber || "",
          ).trim(),
          type: getDocumentTypeLabel(source),
          total: amount,
          balance,
          currency: rowCurrency,
        },
      };
    })
    .filter(Boolean) as Array<{
    source: ReportEntity;
    values: Record<string, unknown>;
  }>;

  const filteredRows = rows.filter((item) =>
    matchesMoreFilters(
      {
        name: item.values.name,
        status: item.values.status,
        "invoice-number": item.values["invoice-number"],
        transaction: item.values["invoice-number"],
        "order-number": item.values["order-number"],
        "invoice-date": item.values["invoice-date"],
        "due-date": item.values["due-date"],
        amount: item.values.total,
        balance: item.values.balance,
        "balance-due": item.values.balance,
        currency: item.values.currency,
      },
      moreFilters,
    ),
  );

  const currency = String(filteredRows[0]?.values.currency || "SOS");
  return {
    rows: filteredRows.sort((left, right) =>
      String(right.values["invoice-date"] || "").localeCompare(
        String(left.values["invoice-date"] || ""),
      ),
    ),
    currency,
    totals: filteredRows.reduce(
      (acc, row) => {
        acc.total += asNumber(row.values.total, 0);
        acc.balance += asNumber(row.values.balance, 0);
        return acc;
      },
      { total: 0, balance: 0 } as Record<string, number>,
    ),
  };
};

const buildQuoteDetailsRows = (
  quotes: any[],
  invoices: any[],
  customers: any[],
  range: { start: Date; end: Date },
  reportBy: string,
  groupBy: string,
  moreFilters: MoreFilterRow[],
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();
  for (const customer of customers || []) {
    const id = String(customer?._id || customer?.id || "").trim();
    const name = resolveCustomerName(customer);
    if (id) customerById.set(id, customer);
    if (name) customerByName.set(normalizeText(name), customer);
    const number = String(customer?.customerNumber || "").trim();
    if (number) customerByName.set(normalizeText(number), customer);
  }

  const normalizedRangeStart = startOfDay(range.start);
  const normalizedRangeEnd = endOfDay(range.end);
  const normalizedReportBy = normalizeText(reportBy || "quote-date");
  const normalizedGroupBy = normalizeText(groupBy || "none");
  const detailRows: Array<{ values: Record<string, any> }> = [];
  let currency = "";

  for (const quote of quotes || []) {
    const quoteDate = getQuoteDate(quote);
    const expiryDate = getQuoteExpiryDate(quote);
    const selectedDate =
      normalizedReportBy === "expiry-date"
        ? expiryDate || quoteDate
        : quoteDate;
    if (
      !selectedDate ||
      selectedDate < normalizedRangeStart ||
      selectedDate > normalizedRangeEnd
    )
      continue;

    const customerId = String(
      quote?.customerId || quote?.customer?._id || quote?.customer?.id || "",
    ).trim();
    const fallbackName = String(
      quote?.customerName ||
        quote?.customer?.displayName ||
        quote?.customer?.name ||
        quote?.customer?.companyName ||
        "",
    ).trim();
    const customer =
      customerById.get(customerId) ||
      customerByName.get(normalizeText(fallbackName)) ||
      quote?.customer ||
      null;
    const customerName = resolveCustomerName(customer, fallbackName);
    const rowCurrency =
      String(quote?.currency || customer?.currency || "SOS").trim() || "SOS";
    const quoteNumber = String(
      quote?.quoteNumber || quote?.quoteNo || quote?.number || quote?._id || "",
    ).trim();
    const linkedInvoiceNumber = getLinkedInvoiceNumberForQuote(quote, invoices);
    const amount = Math.abs(asNumber(quote?.total, 0));

    const values = {
      name: quoteNumber || String(quote?._id || "").trim(),
      status: String(quote?.status || "").trim(),
      "quote-date": quoteDate ? quoteDate.toISOString() : "",
      "expiry-date": expiryDate ? expiryDate.toISOString() : "",
      "report-date": selectedDate.toISOString(),
      "quote-number": quoteNumber,
      "reference-number": String(quote?.referenceNumber || "").trim(),
      "customer-name": customerName,
      "invoice-number": linkedInvoiceNumber,
      "project-name": String(quote?.projectName || "").trim(),
      "quote-amount": amount,
      amount,
      currency: rowCurrency,
      location: String(
        quote?.location ||
          customer?.location ||
          customer?.city ||
          customer?.billingAddress?.city ||
          customer?.shippingAddress?.city ||
          "",
      ).trim(),
    };

    if (!matchesMoreFilters(values, moreFilters)) continue;

    detailRows.push({ values });
    if (!currency) currency = rowCurrency;
  }

  detailRows.sort((left, right) => {
    if (normalizedGroupBy !== "none") {
      const leftGroup = String(left.values[normalizedGroupBy] || "").trim();
      const rightGroup = String(right.values[normalizedGroupBy] || "").trim();
      const groupDelta = rightGroup.localeCompare(leftGroup);
      if (groupDelta !== 0) return groupDelta;
    }

    return String(right.values["report-date"] || "").localeCompare(
      String(left.values["report-date"] || ""),
    );
  });

  return {
    rows: detailRows,
    currency: currency || "SOS",
    totals: detailRows.reduce(
      (acc, row) => {
        acc["quote-amount"] += asNumber(row.values["quote-amount"], 0);
        return acc;
      },
      { "quote-amount": 0 } as Record<string, number>,
    ),
  };
};

export const getARAgingSummaryReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );
  const [customers, invoices] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
  ]);
  const asOf = range.end;
  const main = buildARAgingSummaryRows(
    invoices || [],
    customers || [],
    asOf,
    moreFilters,
  );
  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildARAgingSummaryRows(
        invoices || [],
        customers || [],
        compareRange.end,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        moreFilters,
      },
    },
  });
};

export const getARAgingDetailsReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );
  const [customers, invoices] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
  ]);
  const asOf = range.end;
  const main = buildARAgingDetailsRows(
    invoices || [],
    customers || [],
    asOf,
    moreFilters,
  );
  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildARAgingDetailsRows(
        invoices || [],
        customers || [],
        compareRange.end,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        moreFilters,
      },
    },
  });
};

export const getInvoiceDetailsReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const entities = parseEntities(req.query.entities ?? req.query.entity_list);
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [customers, invoices, creditNotes] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
    CreditNote.find({ organizationId: orgId }).lean(),
  ]);

  const filteredInvoices = entities.includes("invoice") ? invoices || [] : [];
  const filteredCreditNotes = entities.includes("credit-note")
    ? creditNotes || []
    : [];
  const main = buildInvoiceDetailsRows(
    filteredInvoices,
    filteredCreditNotes,
    customers || [],
    range,
    moreFilters,
  );
  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildInvoiceDetailsRows(
        filteredInvoices,
        filteredCreditNotes,
        customers || [],
        compareRange,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        entities,
        moreFilters,
      },
    },
  });
};

export const getCreditNoteDetailsReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [customers, creditNotes] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    CreditNote.find({ organizationId: orgId }).lean(),
  ]);

  const main = buildInvoiceDetailsRows(
    [],
    creditNotes || [],
    customers || [],
    range,
    moreFilters,
  );
  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildInvoiceDetailsRows(
        [],
        creditNotes || [],
        customers || [],
        compareRange,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        moreFilters,
      },
    },
  });
};

export const getQuoteDetailsReport: express.RequestHandler = async (
  req,
  res,
) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const range = getDateRangeFromQuery(req);
  const compareWith = String(
    req.query.compareWith ?? req.query.compare_with ?? "none",
  ).trim();
  const compareCount = Math.max(
    1,
    Number(req.query.compareCount ?? req.query.compare_count ?? 1) || 1,
  );
  const reportBy =
    String(req.query.reportBy ?? req.query.report_by ?? "quote-date").trim() ||
    "quote-date";
  const groupBy =
    String(req.query.groupBy ?? req.query.group_by ?? "none").trim() || "none";
  const moreFilters = parseMoreFilters(
    req.query.moreFilters ?? req.query.more_filters ?? req.query.filter_rows,
  );

  const [customers, quotes, invoices] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Quote.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
  ]);

  const main = buildQuoteDetailsRows(
    quotes || [],
    invoices || [],
    customers || [],
    range,
    reportBy,
    groupBy,
    moreFilters,
  );
  const compareRange =
    compareWith && compareWith !== "none"
      ? shiftDateRange(range, compareWith, compareCount)
      : null;
  const comparison = compareRange
    ? buildQuoteDetailsRows(
        quotes || [],
        invoices || [],
        customers || [],
        compareRange,
        reportBy,
        groupBy,
        moreFilters,
      )
    : null;

  return res.json({
    success: true,
    data: {
      rows: main.rows,
      currency: main.currency,
      totals: main.totals,
      comparison,
      appliedFilters: {
        fromDate: range.start.toISOString(),
        toDate: range.end.toISOString(),
        compareWith,
        compareCount,
        reportBy,
        groupBy,
        moreFilters,
      },
    },
  });
};
