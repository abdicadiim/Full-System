import type express from "express";
import { getAuthedUser } from "./auth.js";
import { recordActivity } from "../services/activityLogService.js";

const RESOURCE_LABELS: Record<string, string> = {
  users: "User",
  roles: "Role",
  invoices: "Invoice",
  quotes: "Quote",
  projects: "Project",
  expenses: "Expense",
  items: "Item",
  products: "Product",
  plans: "Plan",
  addons: "Addon",
  coupons: "Coupon",
  "price-lists": "Price List",
  customers: "Customer",
  salespersons: "Salesperson",
  locations: "Location",
  taxes: "Tax",
  "payment-received": "Payment Received",
  "payments-received": "Payment Received",
  "payments-made": "Payment Made",
  "credit-notes": "Credit Note",
  "debit-notes": "Debit Note",
  "recurring-invoices": "Recurring Invoice",
  "sales-receipts": "Sales Receipt",
  subscriptions: "Subscription",
  bills: "Bill",
  settings: "Settings",
  "reporting-tags": "Reporting Tag",
  "transaction-number-series": "Transaction Number Series",
};

const capitalizeWords = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const humanizeSegment = (segment: string) => {
  const normalized = String(segment || "").trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return "Activity";
  return RESOURCE_LABELS[normalized] || capitalizeWords(normalized.replace(/-/g, " "));
};

const getResourceSegment = (path: string) => {
  const segments = String(path || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  if (segments[0] === "api") {
    if (segments[1] === "settings" && segments[2]) return `${segments[1]}-${segments[2]}`;
    return segments[1] || "";
  }
  return segments[0] || "";
};

const getActionLabel = (method: string, path: string) => {
  const normalizedMethod = String(method || "").toUpperCase();
  const normalizedPath = String(path || "").toLowerCase();
  if (normalizedMethod === "POST" && normalizedPath.endsWith("/send-invitation")) return "Sent invitation";
  if (normalizedMethod === "POST" && normalizedPath.endsWith("/send-email")) return "Sent email";
  if (normalizedMethod === "POST" && normalizedPath.endsWith("/bulk-delete")) return "Bulk deleted";
  if (normalizedMethod === "POST" && normalizedPath.endsWith("/bulk-update")) return "Bulk updated";
  if (normalizedMethod === "POST") return "Created";
  if (normalizedMethod === "PUT" || normalizedMethod === "PATCH") return "Updated";
  if (normalizedMethod === "DELETE") return "Deleted";
  return "Changed";
};

const getEntityName = (body: Record<string, any> | undefined) => {
  if (!body || typeof body !== "object") return "";
  const keys = [
    "name",
    "displayName",
    "invoiceNumber",
    "quoteNumber",
    "paymentNumber",
    "receiptNumber",
    "expenseNumber",
    "billNumber",
    "creditNoteNumber",
    "debitNoteNumber",
    "customerName",
    "projectName",
    "planName",
    "addonName",
    "couponName",
    "role",
    "email",
  ];
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const getEntityId = (req: express.Request) =>
  String(req.params?.id || req.body?.id || req.body?._id || req.body?.entityId || "").trim();

export const activityLogger: express.RequestHandler = async (req, res, next) => {
  const path = String(req.originalUrl || req.url || "");
  const shouldTrack =
    req.method !== "GET" &&
    path.startsWith("/api/") &&
    !path.startsWith("/api/auth") &&
    !path.startsWith("/api/public");

  if (!shouldTrack) {
    next();
    return;
  }

  const actor = await getAuthedUser(req);
  if (!actor) {
    next();
    return;
  }

  const occurredAt = new Date();
  res.on("finish", () => {
    if (res.statusCode >= 400) return;

    const resource = getResourceSegment(path);
    const entityType = humanizeSegment(resource);
    const action = getActionLabel(req.method, path);
    const entityId = getEntityId(req);
    const entityName = getEntityName(req.body as Record<string, any> | undefined);
    const summary = `${action} ${entityType}${entityName ? ` ${entityName}` : ""}`.trim();

    void recordActivity({
      organizationId: actor.organizationId,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      resource,
      entityType,
      entityId,
      entityName,
      method: req.method,
      path,
      summary,
      details: {
        params: req.params,
      },
      statusCode: res.statusCode,
      occurredAt,
    });
  });

  next();
};
