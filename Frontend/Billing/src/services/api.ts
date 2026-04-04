/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../store/db";

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ||
  "/api";

const getStoredToken = () => {
  if (typeof localStorage === "undefined") return "";
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("accessToken") ||
    readCookie("fs_session_bridge") ||
    ""
  );
};

const readCookie = (name: string) => {
  if (typeof document === "undefined") return "";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || "") : "";
};

const toQuery = (params?: Record<string, any>) => {
  if (!params || typeof params !== "object") return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    usp.set(key, String(value));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
};

const withBase = (path: string) => {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${clean}`;
};

type RequestOptions = {
  method?: string;
  path: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
};

const request = async ({ method = "GET", path, params, data, headers = {} }: RequestOptions) => {
  const url = `${withBase(path)}${toQuery(params)}`;
  const token = getStoredToken();
  const mergedHeaders: Record<string, string> = { ...headers };

  if (!mergedHeaders["Content-Type"] && method !== "GET") {
    mergedHeaders["Content-Type"] = "application/json";
  }
  if (token && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: mergedHeaders,
      credentials: "include",
      body: method === "GET" ? undefined : data !== undefined ? JSON.stringify(data) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        message:
          (payload && typeof payload === "object" && (payload as any).message) ||
          response.statusText ||
          "Request failed",
        data: payload && typeof payload === "object" ? (payload as any).data ?? null : payload,
      };
    }

    if (payload && typeof payload === "object") {
      if ("success" in (payload as any)) return payload as any;
      return { success: true, data: payload };
    }

    return { success: true, data: payload };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Network error",
      data: null,
    };
  }
};

let customersDbInitPromise: Promise<any> | null = null;

const ensureCustomersDbReady = async () => {
  if (!customersDbInitPromise) {
    customersDbInitPromise = Promise.resolve(db.init?.());
  }
  await customersDbInitPromise;
};

const toCustomerId = (value: any) => String(value ?? "").trim();

const detectCustomerNumberPrefix = (value: any) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = text.match(/^(\D*?)(\d+)/);
  return match ? match[1] : "";
};

const parseCustomerNumberValue = (customerNumber: any, prefix: string) => {
  const text = String(customerNumber ?? "").trim();
  if (!text) return null;
  if (prefix && !text.startsWith(prefix)) return null;
  const rest = prefix ? text.slice(prefix.length) : text;
  const match = rest.match(/^(\d+)/);
  if (!match) return null;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;
  return {
    numeric,
    digits: match[1].length,
  };
};

const getNextCustomerNumberFromCustomers = (
  customers: any[],
  options?: { prefix?: string; start?: string | number }
) => {
  const cleanedCustomers = Array.isArray(customers) ? customers : [];

  const startDigits = String(options?.start ?? "").match(/\d+/)?.[0] || "";
  const startNumeric = Number(startDigits || 1);
  const parsedStart = Number.isFinite(startNumeric) && startNumeric > 0 ? startNumeric : 1;

  const existingNumbers = new Set(
    cleanedCustomers.map((c: any) => String(c?.customerNumber ?? "").trim()).filter(Boolean)
  );

  const inferredPrefix =
    String(options?.prefix ?? "").trim() ||
    detectCustomerNumberPrefix(cleanedCustomers.find((c: any) => c?.customerNumber)?.customerNumber) ||
    "CUS-";

  const parsed = cleanedCustomers
    .map((c: any) => parseCustomerNumberValue(c?.customerNumber, inferredPrefix))
    .filter(Boolean) as Array<{ numeric: number; digits: number }>;

  const maxExisting = parsed.reduce((max, entry) => Math.max(max, entry.numeric), parsedStart - 1);
  const width = Math.max(5, startDigits.length, parsed.reduce((max, entry) => Math.max(max, entry.digits), 0));

  let next = maxExisting + 1;
  let candidate = `${inferredPrefix}${String(next).padStart(width, "0")}`;
  while (existingNumbers.has(candidate)) {
    next += 1;
    candidate = `${inferredPrefix}${String(next).padStart(width, "0")}`;
  }
  return candidate;
};

const buildCustomerName = (customer: any) =>
  (
    customer?.displayName ||
    customer?.name ||
    customer?.companyName ||
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
    "Customer"
  )
    .toString()
    .trim();

const normalizeCustomer = (input: any, fallbackId?: string) => {
  const id = toCustomerId(input?._id || input?.id || fallbackId || db.utils.uid("cus"));
  const name = buildCustomerName(input);
  return {
    ...input,
    id,
    _id: id,
    name,
    displayName: input?.displayName || name,
    createdAt: input?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const readAllCustomersLocal = () =>
  (db.customers.list({}) || []).map((customer: any) => normalizeCustomer(customer, customer?.id));

const writeCustomerLocal = (customer: any) => {
  const normalized = normalizeCustomer(customer);
  db.customers.add(normalized);
  return normalized;
};

const updateCustomerLocal = (id: string, patch: any) => {
  const existing = db.customers.get(id);
  if (!existing) return null;

  const merged = normalizeCustomer(
    {
      ...existing,
      ...patch,
      id,
      _id: id,
      billingAddress: {
        ...(existing?.billingAddress || {}),
        ...(patch?.billingAddress || {}),
      },
      shippingAddress: {
        ...(existing?.shippingAddress || {}),
        ...(patch?.shippingAddress || {}),
      },
    },
    id
  );

  db.customers.update(id, merged);
  return merged;
};

const deleteCustomerLocal = (id: string) => {
  const normalizedId = toCustomerId(id);
  if (!normalizedId) return false;
  db.customers.remove(normalizedId);
  return true;
};

const shouldFallbackToLocalCustomers = (response: any) => {
  if (response?.success) return false;
  const status = Number(response?.status || 0);
  if (!status) return true;
  if (status >= 500) return true;
  const message = String(response?.message || "");
  return /database unavailable|db not connected|network error|server error/i.test(message);
};

const filterCustomersLocalRows = (rows: any[], params?: Record<string, any>) => {
  const search = String(params?.search || params?.q || "").trim().toLowerCase();
  const status = String(params?.status || "").trim().toLowerCase();

  return (Array.isArray(rows) ? rows : [])
    .filter((customer: any) => {
      if (status && String(customer?.status || "").trim().toLowerCase() !== status) {
        return false;
      }
      if (!search) return true;

      return [
        customer?.name,
        customer?.displayName,
        customer?.companyName,
        customer?.email,
        customer?.customerNumber,
      ].some((value) => String(value ?? "").toLowerCase().includes(search));
    })
    .sort(byNewest);
};

const getCustomersLocalResponse = async (params?: Record<string, any>) => {
  await ensureCustomersDbReady();
  const filtered = filterCustomersLocalRows(readAllCustomersLocal(), params);
  const { data, pagination } = paginateRows(filtered, params);
  return {
    success: true,
    data,
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: pagination.pages,
    pagination,
  };
};

const syncCustomerLocalCache = async (customer: any) => {
  await ensureCustomersDbReady();
  return writeCustomerLocal(customer);
};

const syncCustomersLocalCache = async (rows: any[]) => {
  await ensureCustomersDbReady();
  return (Array.isArray(rows) ? rows : []).map((row: any) => writeCustomerLocal(row));
};

const mergeCustomersLocal = async (targetCustomerId: string, sourceCustomerIds: string[]) => {
  await ensureCustomersDbReady();

  const normalizedTargetId = toCustomerId(targetCustomerId);
  const target = db.customers.get(normalizedTargetId);
  if (!target) {
    return { success: false, message: "Target customer not found", data: null };
  }

  const normalizedSourceIds = (Array.isArray(sourceCustomerIds) ? sourceCustomerIds : [])
    .map((value) => toCustomerId(value))
    .filter((value) => value && value !== normalizedTargetId);

  const sources = normalizedSourceIds
    .map((sourceId) => db.customers.get(sourceId))
    .filter(Boolean) as any[];

  if (!sources.length) {
    return { success: false, message: "No source customers found to merge", data: null };
  }

  const sumNumber = (key: string) =>
    sources.reduce((sum, row: any) => sum + (Number.parseFloat(String(row?.[key] ?? 0)) || 0), 0);

  const patch: any = {
    updatedAt: new Date().toISOString(),
  };
  if (target?.receivables !== undefined || sources.some((row: any) => row?.receivables !== undefined)) {
    patch.receivables = (Number(target?.receivables) || 0) + sumNumber("receivables");
  }
  if (target?.unusedCredits !== undefined || sources.some((row: any) => row?.unusedCredits !== undefined)) {
    patch.unusedCredits = (Number(target?.unusedCredits) || 0) + sumNumber("unusedCredits");
  }

  const updatedTarget = updateCustomerLocal(normalizedTargetId, patch) || normalizeCustomer({ ...target, ...patch }, normalizedTargetId);

  normalizedSourceIds.forEach((sourceId) => {
    updateCustomerLocal(sourceId, {
      status: "inactive",
      mergedInto: normalizedTargetId,
      updatedAt: new Date().toISOString(),
    });
  });

  return {
    success: true,
    data: updatedTarget,
  };
};

const asNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const customerMatchesQuery = (customer: any, query: string) =>
  Object.values(customer || {}).some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(query)
  );

const logCustomerMailAction = (customerId: string, type: string, payload: any) => {
  try {
    const key = "taban_customer_mail_log";
    const raw = localStorage.getItem(key);
    const current = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(current) ? current : [];
    next.unshift({
      id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      customerId,
      type,
      payload,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Ignore non-critical local log errors.
  }
};

const readLocalCollection = (key: string) => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalCollection = (key: string, rows: any[]) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(rows));
};

const normalizeId = (value: any, prefix = "id") =>
  String(value || `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

const ITEMS_STORAGE_KEY = "inv_items_v1";
const UNITS_STORAGE_KEY = "taban_units_v1";
const TAG_ASSIGNMENTS_STORAGE_KEY = "taban_item_tag_assignments_v1";
const LOCAL_QUOTES_KEY = "taban_books_quotes";
const LOCAL_INVOICES_KEY = "taban_books_invoices";
const LOCAL_RECURRING_INVOICES_KEY = "taban_books_recurring_invoices";
const LOCAL_PAYMENTS_RECEIVED_KEY = "taban_books_payments_received";
const LOCAL_SUBSCRIPTIONS_KEY = "taban_subscriptions_v1";
const LOCAL_CREDIT_NOTES_KEY = "taban_books_credit_notes";
const LOCAL_DEBIT_NOTES_KEY = "taban_books_debit_notes";
const LOCAL_SALES_RECEIPTS_KEY = "taban_books_sales_receipts";
const LOCAL_EXPENSES_KEY = "taban_books_expenses";
const LOCAL_RECURRING_EXPENSES_KEY = "taban_books_recurring_expenses";
const LOCAL_PROJECTS_KEY = "taban_books_projects";
const LOCAL_TIME_ENTRIES_KEY = "taban_books_time_entries";
const LOCAL_SALESPERSONS_KEY = "taban_books_salespersons";
const LOCAL_TAXES_KEY = "taban_books_taxes";
const LOCAL_CURRENCIES_KEY = "taban_books_currencies";
const LOCAL_CONTACT_PERSONS_KEY = "taban_books_contact_persons";
const LOCAL_BANK_ACCOUNTS_KEY = "taban_books_bank_accounts";
const LOCAL_PAYMENT_MODES_KEY = "taban_books_payment_modes";
  const LOCAL_CHART_ACCOUNTS_KEY = "taban_books_chart_accounts";
  const LOCAL_TX_SERIES_KEY = "taban_books_tx_series_v2";
  const LOCAL_QUOTES_SETTINGS_KEY = "taban_books_settings_quotes";
  const DEFAULT_QUOTE_SETTINGS = {
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
    customFields: [
      { name: "Sales person", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
      { name: "Description", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
    ],
    customButtons: [] as unknown[],
    relatedLists: [] as unknown[],
  };
  const LOCAL_RECURRING_SETTINGS_KEY = "taban_books_settings_recurring_invoices";
  const LOCAL_RETAINER_INVOICE_SETTINGS_KEY = "taban_books_settings_retainer_invoices";
  const LOCAL_VENDORS_KEY = "taban_books_vendors";
const LOCAL_DOCUMENTS_KEY = "taban_books_documents";
const LOCAL_REPORTING_TAGS_KEY = "taban_books_reporting_tags";
const LOCAL_GENERAL_SETTINGS_KEY = "taban_books_settings_general";
const LOCAL_LOCATIONS_KEY = "taban_locations_cache";
const PLANS_STORAGE_KEY = "inv_plans_v1";
const LOCAL_EVENTS_KEY = "taban_books_events";



const ensureSeedRows = (key: string, seed: any[]) => {
  const rows = readLocalCollection(key);
  if (rows.length > 0 || seed.length === 0) return rows;
  writeLocalCollection(key, seed);
  return seed;
};

const getEntityId = (row: any) => String(row?._id || row?.id || "").trim();

const filterRowsByParams = (rows: any[], params?: Record<string, any>) => {
  let next = [...rows];
  const search = String(params?.search || params?.q || "").trim().toLowerCase();
  const status = String(params?.status || "").trim().toLowerCase();

  if (search) {
    next = next.filter((row) =>
      Object.values(row || {}).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(search)
      )
    );
  }

  if (status && status !== "all") {
    next = next.filter((row) => String(row?.status || "").toLowerCase() === status);
  }

  return next;
};

const paginateRows = (rows: any[], params?: Record<string, any>) => {
  const page = Math.max(1, Number(params?.page || 1));
  const rawLimit = Number(params?.limit || 0);
  const limit = rawLimit > 0 ? rawLimit : rows.length || 50;
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = rows.slice(start, end);
  const pages = Math.max(1, Math.ceil((rows.length || 0) / limit));
  return {
    data,
    pagination: {
      total: rows.length,
      page,
      limit,
      pages,
    },
  };
};

const byNewest = (a: any, b: any) => {
  const at = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
  const bt = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
  return bt - at;
};

const localResource = (storageKey: string, idPrefix: string, seed: any[] = []) => ({
  getAll: async (params?: Record<string, any>) => {
    const seeded = ensureSeedRows(storageKey, seed);
    const filtered = filterRowsByParams(seeded, params).sort(byNewest);
    const { data, pagination } = paginateRows(filtered, params);
    return { success: true, data, pagination };
  },
  list: async (params?: Record<string, any>) => {
    const response = await localResource(storageKey, idPrefix, seed).getAll(params);
    return response;
  },
  getById: async (id: string) => {
    const rows = ensureSeedRows(storageKey, seed);
    const normalizedId = String(id || "").trim();
    const found = rows.find((row) => getEntityId(row) === normalizedId);
    if (!found) return { success: false, message: "Not found", data: null };
    return { success: true, data: found };
  },
  create: async (data: any) => {
    const rows = ensureSeedRows(storageKey, seed);
    const id = normalizeId(data?._id || data?.id, idPrefix);
    const now = new Date().toISOString();
    const created = {
      ...data,
      id,
      _id: id,
      createdAt: data?.createdAt || now,
      updatedAt: now,
    };
    rows.unshift(created);
    writeLocalCollection(storageKey, rows);
    return { success: true, data: created };
  },
  update: async (id: string, data: any) => {
    const rows = ensureSeedRows(storageKey, seed);
    const normalizedId = String(id || "").trim();
    const idx = rows.findIndex((row) => getEntityId(row) === normalizedId);
    if (idx < 0) return { success: false, message: "Not found", data: null };
    const updated = {
      ...rows[idx],
      ...data,
      id: normalizedId,
      _id: normalizedId,
      updatedAt: new Date().toISOString(),
    };
    rows[idx] = updated;
    writeLocalCollection(storageKey, rows);
    return { success: true, data: updated };
  },
  delete: async (id: string) => {
    const rows = ensureSeedRows(storageKey, seed);
    const normalizedId = String(id || "").trim();
    const filtered = rows.filter((row) => getEntityId(row) !== normalizedId);
    writeLocalCollection(storageKey, filtered);
    return { success: true, data: { id: normalizedId } };
  },
});

const defaultTaxes = [
  { id: "tax-vat-20", _id: "tax-vat-20", name: "VAT 20%", rate: 20, status: "Active", type: "tax" },
  { id: "tax-gst-10", _id: "tax-gst-10", name: "GST 10%", rate: 10, status: "Active", type: "tax" },
];

const defaultCurrencies = [
  {
    id: "cur-amd",
    _id: "cur-amd",
    code: "AMD",
    symbol: "AMD",
    name: "Armenian Dram",
    status: "Active",
    isBaseCurrency: true,
  },
];

const defaultSalespersons = [
  { id: "sp-001", _id: "sp-001", name: "Default Salesperson", email: "sales@local.app", status: "Active" },
];

const defaultProjects = [
  { id: "prj-001", _id: "prj-001", name: "General Project", status: "Active", customerName: "General Customer" },
];

const defaultPaymentModes = [
  { id: "pm-cash", _id: "pm-cash", name: "Cash", status: "Active" },
  { id: "pm-bank", _id: "pm-bank", name: "Bank Transfer", status: "Active" },
  { id: "pm-card", _id: "pm-card", name: "Card", status: "Active" },
];

const defaultBankAccounts = [
  { id: "ba-001", _id: "ba-001", accountName: "Main Bank", accountNumber: "****1234", status: "Active" },
];

const defaultChartAccounts = [
  { id: "coa-sales", _id: "coa-sales", name: "Sales", accountType: "income", status: "active" },
  { id: "coa-ar", _id: "coa-ar", name: "Accounts Receivable", accountType: "asset", status: "active" },
  { id: "coa-tax", _id: "coa-tax", name: "Tax Payable", accountType: "liability", status: "active" },
  { id: "coa-cash", _id: "coa-cash", name: "Cash", accountType: "asset", status: "active" },
];

const defaultTxSeries = [
  // Default Transaction Series
  { id: "s1-ri", _id: "s1-ri", seriesName: "Default Transaction Series", module: "Retainer Invoice", prefix: "RET-", startingNumber: "00003", locationIds: ["loc-1"], status: "Active" },
  { id: "s1-cn", _id: "s1-cn", seriesName: "Default Transaction Series", module: "Credit Note", prefix: "CN-", startingNumber: "00002", locationIds: ["loc-1"], status: "Active" },
  { id: "s1-cp", _id: "s1-cp", seriesName: "Default Transaction Series", module: "Customer Payment", prefix: "", startingNumber: "4", locationIds: ["loc-1"], status: "Active" },
  { id: "s1-sub", _id: "s1-sub", seriesName: "Default Transaction Series", module: "Subscriptions", prefix: "SUB-", startingNumber: "00010", locationIds: ["loc-1"], status: "Active" },
  { id: "s1-dn", _id: "s1-dn", seriesName: "Default Transaction Series", module: "Debit Note", prefix: "CDN-", startingNumber: "000002", locationIds: ["loc-1"], status: "Active" },
  { id: "s1-inv", _id: "s1-inv", seriesName: "Default Transaction Series", module: "Invoice", prefix: "INV-", startingNumber: "000025", locationIds: ["loc-1"], status: "Active" },
  { id: "s1-so", _id: "s1-so", seriesName: "Default Transaction Series", module: "Sales Order", prefix: "SO-", startingNumber: "00001", locationIds: ["loc-1"], status: "Active" },
  { id: "s1-qt", _id: "s1-qt", seriesName: "Default Transaction Series", module: "Quote", prefix: "QT-", startingNumber: "000004", locationIds: ["loc-1"], status: "Active" },
  { id: "s1-sr", _id: "s1-sr", seriesName: "Default Transaction Series", module: "Sales Receipt", prefix: "SR-", startingNumber: "00004", locationIds: ["loc-1"], status: "Active" },

  // MAXAMED Series
  { id: "s2-ri", _id: "s2-ri", seriesName: "MAXAMED", module: "Retainer Invoice", prefix: "RET-", startingNumber: "00001", locationIds: ["loc-1"], status: "Active" },
  { id: "s2-cn", _id: "s2-cn", seriesName: "MAXAMED", module: "Credit Note", prefix: "CN-", startingNumber: "00001", locationIds: ["loc-1"], status: "Active" },
  { id: "s2-cp", _id: "s2-cp", seriesName: "MAXAMED", module: "Customer Payment", prefix: "", startingNumber: "1", locationIds: ["loc-1"], status: "Active" },
  { id: "s2-sub", _id: "s2-sub", seriesName: "MAXAMED", module: "Subscriptions", prefix: "SUB-", startingNumber: "00001", locationIds: ["loc-1"], status: "Active" },
  { id: "s2-dn", _id: "s2-dn", seriesName: "MAXAMED", module: "Debit Note", prefix: "CDN-", startingNumber: "000001", locationIds: ["loc-1"], status: "Active" },
  { id: "s2-inv", _id: "s2-inv", seriesName: "MAXAMED", module: "Invoice", prefix: "INV-", startingNumber: "000001", locationIds: ["loc-1"], status: "Active" },
  { id: "s2-so", _id: "s2-so", seriesName: "MAXAMED", module: "Sales Order", prefix: "SO-", startingNumber: "00001", locationIds: ["loc-1"], status: "Active" },
  { id: "s2-qt", _id: "s2-qt", seriesName: "MAXAMED", module: "Quote", prefix: "QT-", startingNumber: "000001", locationIds: ["loc-1"], status: "Active" },
  { id: "s2-sr", _id: "s2-sr", seriesName: "MAXAMED", module: "Sales Receipt", prefix: "SR-", startingNumber: "00001", locationIds: ["loc-1"], status: "Active" },
];

export const recordEvent = async (type: string, data: any, source: string = "user") => {
  try {
    const events = readLocalCollection(LOCAL_EVENTS_KEY);
    const now = new Date();
    const eventId = `8628362000${Math.floor(Math.random() * 900000000) + 100000000}`;
    const newEvent = {
      id: `evt_${Date.now()}`,
      event_id: eventId,
      event_type: type,
      created_time: now.toISOString(),
      occurred_at: now.toISOString(), // For backward compatibility with previous mock
      event_time: now.toISOString().split('T')[0],
      event_time_formatted: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(now),
      event_source: source,
      source: source, // For backward compatibility
      data: data
    };
    events.unshift(newEvent);
    writeLocalCollection(LOCAL_EVENTS_KEY, events);
    return { success: true, data: newEvent };
  } catch (error) {
    console.error("Failed to record event", error);
    return { success: false };
  }
};

const defaultEvents = [
  {
    id: "evt_001",
    event_id: "8628362000000109578",
    event_type: "customer_updated",
    created_time: "2026-03-14T10:39:27+0100",
    occurred_at: "2026-03-14T10:39:27+0100",
    event_time: "2026-03-14",
    event_time_formatted: "14 Mar 2026",
    event_source: "user",
    source: "user",
    data: {
      customer: {
        updated_time: "2026-03-14T10:39:27+0100",
        display_name: "hgv ccc",
        company_name: "dd",
        email: "252forme@gmail.com",
        status: "active",
        currency_code: "USD",
        outstanding_receivable_amount: 2453.28,
        billing_address: {
          country: "Algeria",
          city: "Mogadishu",
          street: "Main Rd, Mogadishu"
        }
      }
    }
  }
];

const eventsLocal = localResource(LOCAL_EVENTS_KEY, "evt", defaultEvents);

export const eventsAPI = {
  ...eventsLocal,
};


const defaultVendors = [
  { id: "ven-001", _id: "ven-001", name: "Default Vendor", email: "vendor@local.app", status: "Active" },
];

export const apiRequest = async (
  path: string,
  options: { method?: string; data?: any; params?: Record<string, any>; headers?: Record<string, string> } = {}
) => {
  const [rawPath, rawQuery = ""] = String(path || "").split("?");
  const queryParams: Record<string, any> = {};
  if (rawQuery) {
    const sp = new URLSearchParams(rawQuery);
    sp.forEach((v, k) => {
      queryParams[k] = v;
    });
  }
  return request({
    method: options.method || "GET",
    path: rawPath.startsWith("/") ? rawPath : `/${rawPath}`,
    params: { ...queryParams, ...(options.params || {}) },
    data: options.data,
    headers: options.headers,
  });
};

const resource = (basePath: string) => ({
  getAll: (params?: Record<string, any>) => request({ path: basePath, params }),
  list: (params?: Record<string, any>) => request({ path: basePath, params }),
  getById: (id: string) => request({ path: `${basePath}/${id}` }),
  create: (data: any) => request({ method: "POST", path: basePath, data }),
  update: (id: string, data: any) => request({ method: "PUT", path: `${basePath}/${id}`, data }),
  delete: (id: string) => request({ method: "DELETE", path: `${basePath}/${id}` }),
});

const customersBase = resource("/customers");

export const customersAPI = {
  getAll: async (params?: Record<string, any>) => {
    const remote = (await customersBase.getAll(params)) as any;
    if (remote?.success) {
      if (Array.isArray(remote?.data) && remote.data.length > 0) {
        await syncCustomersLocalCache(remote.data);
      }
      return remote;
    }
    if (!shouldFallbackToLocalCustomers(remote)) {
      return remote;
    }
    return getCustomersLocalResponse(params);
  },
  list: async (params?: Record<string, any>) => customersAPI.getAll(params),
  getNextCustomerNumber: async (options?: { prefix?: string; start?: string | number }) => {
    const remote = await request({
      path: "/customers/next-number",
      params: {
        prefix: options?.prefix,
        start: options?.start,
      },
    });
    if (remote?.success) return (remote as any).data as string;
    if (!shouldFallbackToLocalCustomers(remote)) {
      throw new Error(remote?.message || "Failed to get next customer number");
    }

    await ensureCustomersDbReady();
    const rows = readAllCustomersLocal();
    return getNextCustomerNumberFromCustomers(rows, options);
  },
  getById: async (id: string) => {
    const normalizedId = String(id);
    const remote = (await customersBase.getById(normalizedId)) as any;
    if (remote?.success && remote?.data) {
      const synced = await syncCustomerLocalCache(remote.data);
      return { ...remote, data: synced };
    }
    if (!shouldFallbackToLocalCustomers(remote)) {
      return remote;
    }

    await ensureCustomersDbReady();
    const row = normalizeCustomer(db.customers.get(normalizedId), normalizedId);
    if (!row) {
      return { success: false, message: "Customer not found", data: null };
    }
    return { success: true, data: row };
  },
  create: async (data: any) => {
    const remote = (await customersBase.create(data)) as any;
    if (remote?.success && remote?.data) {
      const created = await syncCustomerLocalCache(remote.data);
      return { ...remote, data: created };
    }
    if (!shouldFallbackToLocalCustomers(remote)) {
      return remote;
    }

    await ensureCustomersDbReady();
    const rows = readAllCustomersLocal();
    const requestedCustomerNumber = String(data?.customerNumber || "").trim();
    const hasExistingCustomerNumbers = rows.some((row: any) => String(row?.customerNumber || "").trim());
    let customerNumber = requestedCustomerNumber;

    if (customerNumber) {
      const exists = rows.some((row: any) => String(row?.customerNumber || "").trim() === customerNumber);
      if (exists) {
        customerNumber = getNextCustomerNumberFromCustomers(rows, {
          prefix: detectCustomerNumberPrefix(customerNumber),
          start: customerNumber.match(/\d+/)?.[0] || "0001",
        });
      }
    } else if (hasExistingCustomerNumbers) {
      customerNumber = getNextCustomerNumberFromCustomers(rows);
    }

    const created = writeCustomerLocal({
      ...data,
      customerNumber,
    });
    return { success: true, data: created };
  },
  update: async (id: string, data: any) => {
    const normalizedId = String(id);
    const remote = (await customersBase.update(normalizedId, data)) as any;
    if (remote?.success && remote?.data) {
      const updated = await syncCustomerLocalCache(remote.data);
      return { ...remote, data: updated };
    }
    if (!shouldFallbackToLocalCustomers(remote)) {
      return remote;
    }

    await ensureCustomersDbReady();
    const updated = updateCustomerLocal(normalizedId, data);
    if (!updated) {
      return { success: false, message: "Customer not found", data: null };
    }
    return { success: true, data: updated };
  },
  delete: async (id: string) => {
    const normalizedId = String(id);
    const remote = (await customersBase.delete(normalizedId)) as any;
    if (remote?.success) {
      await ensureCustomersDbReady();
      deleteCustomerLocal(normalizedId);
      return remote;
    }
    if (!shouldFallbackToLocalCustomers(remote)) {
      return remote;
    }

    await ensureCustomersDbReady();
    deleteCustomerLocal(normalizedId);
    return { success: true, data: { id: normalizedId } };
  },
  bulkUpdate: async (ids: string[], data: any) => {
    const remote = (await request({ method: "POST", path: "/customers/bulk-update", data: { ids, data } })) as any;
    if (remote?.success) {
      await ensureCustomersDbReady();
      (Array.isArray(remote?.data) ? remote.data : []).forEach((row: any) => writeCustomerLocal(row));
      return remote;
    }
    if (!shouldFallbackToLocalCustomers(remote)) {
      return remote;
    }

    await ensureCustomersDbReady();
    const updated = (Array.isArray(ids) ? ids : [])
      .map((rowId) => updateCustomerLocal(String(rowId), data))
      .filter(Boolean);
    return { success: true, data: updated };
  },
  bulkDelete: async (ids: string[]) => {
    const remote = (await request({ method: "POST", path: "/customers/bulk-delete", data: { ids } })) as any;
    if (remote?.success) {
      await ensureCustomersDbReady();
      (Array.isArray(ids) ? ids : []).forEach((rowId) => deleteCustomerLocal(String(rowId)));
      return remote;
    }
    if (!shouldFallbackToLocalCustomers(remote)) {
      return remote;
    }

    await ensureCustomersDbReady();
    (Array.isArray(ids) ? ids : []).forEach((rowId) => deleteCustomerLocal(String(rowId)));
    return { success: true, data: { ids: (Array.isArray(ids) ? ids : []).map((value) => String(value)) } };
  },
  merge: async (targetCustomerId: string, sourceCustomerIds: string[]) => {
    const remote = (await request({
      method: "POST",
      path: `/customers/${encodeURIComponent(String(targetCustomerId))}/merge`,
      data: { sourceCustomerIds },
    })) as any;
    if (remote?.success && remote?.data) {
      await ensureCustomersDbReady();
      writeCustomerLocal(remote.data);
      (Array.isArray(sourceCustomerIds) ? sourceCustomerIds : []).forEach((sourceId) => {
        updateCustomerLocal(String(sourceId), {
          status: "inactive",
          mergedInto: String(targetCustomerId),
          updatedAt: new Date().toISOString(),
        });
      });
      return remote;
    }
    if (!shouldFallbackToLocalCustomers(remote)) {
      return remote;
    }
    return mergeCustomersLocal(String(targetCustomerId), sourceCustomerIds);
  },
  sendInvitation: async (id: string, data: any) => {
    return { success: false, message: "Not implemented for DB-backed customers yet", data: null };
  },
  sendReviewRequest: async (id: string, data: any) => {
    return { success: false, message: "Not implemented for DB-backed customers yet", data: null };
  },
  sendStatement: async (id: string, data: any) => {
    return { success: false, message: "Not implemented for DB-backed customers yet", data: null };
  },
};

const itemsBase = resource("/items");
export const itemsAPI = {
  getAll: async (params?: Record<string, any>) => itemsBase.getAll(params),
  list: async (params?: Record<string, any>) => itemsAPI.getAll(params),
  getById: async (id: string) => itemsBase.getById(String(id)),
  getDetailsByIds: async (ids: string[]) =>
    request({
      path: "/itemdetails",
      params: { item_ids: ids.map((id) => String(id || "").trim()).filter(Boolean).join(",") },
    }),
  create: async (data: any) => itemsBase.create(data),
  update: async (id: string, data: any) => itemsBase.update(String(id), data),
  delete: async (id: string) => itemsBase.delete(String(id)),
  markActive: async (id: string) =>
    request({ method: "POST", path: `/items/${encodeURIComponent(String(id))}/active` }),
  markInactive: async (id: string) =>
    request({ method: "POST", path: `/items/${encodeURIComponent(String(id))}/inactive` }),
};

const productsBase = resource("/products");
export const productsAPI = {
  getAll: async (params?: Record<string, any>) => productsBase.getAll(params),
  list: async (params?: Record<string, any>) => productsAPI.getAll(params),
  getById: async (id: string) => productsBase.getById(String(id)),
  create: async (data: any) => productsBase.create(data),
  bulkCreate: async (rows: any[]) => request({ method: "POST", path: "/products/bulk", data: rows }),
  update: async (id: string, data: any) => productsBase.update(String(id), data),
  delete: async (id: string) => productsBase.delete(String(id)),
  markActive: async (id: string) =>
    request({ method: "POST", path: `/products/${encodeURIComponent(String(id))}/markasactive` }),
  markInactive: async (id: string) =>
    request({ method: "POST", path: `/products/${encodeURIComponent(String(id))}/markasinactive` }),
};

const plansBase = resource("/plans");
export const plansAPI = {
  getAll: async (params?: Record<string, any>) => plansBase.getAll(params),
  list: async (params?: Record<string, any>) => plansAPI.getAll(params),
  getById: async (id: string) => plansBase.getById(String(id)),
  create: async (data: any) => plansBase.create(data),
  bulkCreate: async (rows: any[]) => request({ method: "POST", path: "/plans/bulk", data: rows }),
  update: async (id: string, data: any) => plansBase.update(String(id), data),
  delete: async (id: string) => plansBase.delete(String(id)),
};
const addonsBase = resource("/addons");
export const addonsAPI = {
  getAll: async (params?: Record<string, any>) => addonsBase.getAll(params),
  list: async (params?: Record<string, any>) => addonsAPI.getAll(params),
  getById: async (id: string) => addonsBase.getById(String(id)),
  create: async (data: any) => addonsBase.create(data),
  bulkCreate: async (rows: any[]) => request({ method: "POST", path: "/addons/bulk", data: rows }),
  update: async (id: string, data: any) => addonsBase.update(String(id), data),
  delete: async (id: string) => addonsBase.delete(String(id)),
};

const couponsBase = resource("/coupons");
export const couponsAPI = {
  getAll: async (params?: Record<string, any>) => couponsBase.getAll(params),
  list: async (params?: Record<string, any>) => couponsAPI.getAll(params),
  getById: async (id: string) => couponsBase.getById(String(id)),
  create: async (data: any) => couponsBase.create(data),
  bulkCreate: async (rows: any[]) => request({ method: "POST", path: "/coupons/bulk", data: rows }),
  update: async (id: string, data: any) => couponsBase.update(String(id), data),
  delete: async (id: string) => couponsBase.delete(String(id)),
};


export const unitsAPI = {
  getAll: async () => ({ success: true, data: readLocalCollection(UNITS_STORAGE_KEY) }),
  create: async (data: any) => {
    const rows = readLocalCollection(UNITS_STORAGE_KEY);
    const id = normalizeId(data?.id || data?._id, "unit");
    const created = { ...data, id, _id: id, name: data?.name || "Unit" };
    rows.unshift(created);
    writeLocalCollection(UNITS_STORAGE_KEY, rows);
    return { success: true, data: created };
  },
  delete: async (id: string) => {
    const unitId = normalizeId(id, "unit");
    const rows = readLocalCollection(UNITS_STORAGE_KEY).filter(
      (row: any) => String(row?.id || row?._id) !== unitId
    );
    writeLocalCollection(UNITS_STORAGE_KEY, rows);
    return { success: true, data: { id: unitId } };
  },
};

export const tagAssignmentsAPI = {
  assignTags: async (data: any) => {
    const rows = readLocalCollection(TAG_ASSIGNMENTS_STORAGE_KEY);
    const item = {
      ...data,
      id: normalizeId(data?.id, "tag-assign"),
      assignedAt: new Date().toISOString(),
    };
    rows.unshift(item);
    writeLocalCollection(TAG_ASSIGNMENTS_STORAGE_KEY, rows);
    return { success: true, data: item };
  },
};

export const inventoryAdjustmentsAPI = {
  ...resource("/inventory-adjustments"),
};

const vendorsLocal = localResource(LOCAL_VENDORS_KEY, "ven", defaultVendors);

export const vendorsAPI = {
  ...vendorsLocal,
  sendStatement: async (id: string, data: any) => ({
    success: true,
    data: { id, queued: true, ...data },
    message: "Vendor statement queued locally",
  }),
};

const taxesLocal = localResource(LOCAL_TAXES_KEY, "tax", defaultTaxes);
const currenciesLocal = localResource(LOCAL_CURRENCIES_KEY, "cur", defaultCurrencies);
const invoicesLocal = localResource(LOCAL_INVOICES_KEY, "inv");
const paymentsReceivedLocal = localResource(LOCAL_PAYMENTS_RECEIVED_KEY, "pay");
const subscriptionsLocal = localResource(LOCAL_SUBSCRIPTIONS_KEY, "sub");
const creditNotesLocal = localResource(LOCAL_CREDIT_NOTES_KEY, "cn");
const debitNotesLocal = localResource(LOCAL_DEBIT_NOTES_KEY, "dn");
const quotesLocal = localResource(LOCAL_QUOTES_KEY, "quote");
const recurringInvoicesLocal = localResource(LOCAL_RECURRING_INVOICES_KEY, "ri");
const expensesLocal = localResource(LOCAL_EXPENSES_KEY, "exp");
const recurringExpensesLocal = localResource(LOCAL_RECURRING_EXPENSES_KEY, "rexp");
const projectsLocal = localResource(LOCAL_PROJECTS_KEY, "prj", defaultProjects);
const timeEntriesLocal = localResource(LOCAL_TIME_ENTRIES_KEY, "te");
const salesReceiptsLocal = localResource(LOCAL_SALES_RECEIPTS_KEY, "sr");
const salespersonsLocal = localResource(LOCAL_SALESPERSONS_KEY, "sp", defaultSalespersons);
const salespersonsResource = resource("/salespersons");
const contactPersonsLocal = localResource(LOCAL_CONTACT_PERSONS_KEY, "cp");
const bankAccountsLocal = localResource(LOCAL_BANK_ACCOUNTS_KEY, "ba", defaultBankAccounts);
const paymentModesLocal = localResource(LOCAL_PAYMENT_MODES_KEY, "pm", defaultPaymentModes);
const chartAccountsLocal = localResource(LOCAL_CHART_ACCOUNTS_KEY, "coa", defaultChartAccounts);
const txSeriesLocal = localResource(LOCAL_TX_SERIES_KEY, "series");
const defaultReportingTags = [
  { id: "rt-xsed", _id: "rt-xsed", name: "xsed", options: ["Option A", "Option B"], status: "Active" },
  { id: "rt-x21", _id: "rt-x21", name: "x21", options: ["Value 1", "Value 2"], status: "Active" },
  { id: "rt-zxc", _id: "rt-zxc", name: "zxc", options: ["High", "Medium", "Low"], status: "Active" },
  { id: "rt-frf", _id: "rt-frf", name: "frf", options: ["Primary", "Secondary"], status: "Active" },
  { id: "rt-x22", _id: "rt-x22", name: "x22", options: ["Type X", "Type Y"], status: "Active" },
  { id: "rt-wwwwwe", _id: "rt-wwwwwe", name: "wwwwwe", options: ["N/A", "Complete"], status: "Active" },
  { id: "rt-rt1", _id: "rt-rt1", name: "rt1", options: ["Sample 1", "Sample 2"], status: "Active" },
  { id: "rt-asd", _id: "rt-asd", name: "asd", options: ["Active", "Inactive"], status: "Active" },
  { id: "rt-dd1", _id: "rt-dd1", name: "dd1", options: ["Group A", "Group B"], status: "Active" },
];

const reportingTagsLocal = localResource(LOCAL_REPORTING_TAGS_KEY, "rt", defaultReportingTags);
const reportingTagsResource = resource("/reporting-tags");
const currenciesResource = resource("/currencies");
const txSeriesResource = resource("/transaction-number-series");
const locationsResource = resource("/locations");
const locationsLocal = localResource(LOCAL_LOCATIONS_KEY, "loc");

type TransactionSeriesLookup = string | {
  seriesId?: string;
  id?: string;
  module?: string;
  moduleKey?: string;
  seriesName?: string;
  locationId?: string;
  locationName?: string;
  reserve?: boolean;
  allowFallbackToFirst?: boolean;
};

const toTxSeriesKey = (value: any) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const normalizeTxSeriesLookup = (lookup?: TransactionSeriesLookup) => {
  if (typeof lookup === "string") {
    return { seriesId: lookup.trim(), reserve: true, allowFallbackToFirst: false };
  }

  const hasExplicitLookup = Boolean(
    String(lookup?.seriesId || lookup?.id || "").trim() ||
    String(lookup?.module || "").trim() ||
    String(lookup?.moduleKey || "").trim() ||
    String(lookup?.seriesName || "").trim() ||
    String(lookup?.locationId || "").trim() ||
    String(lookup?.locationName || "").trim()
  );

  return {
    seriesId: String(lookup?.seriesId || lookup?.id || "").trim(),
    module: String(lookup?.module || "").trim(),
    moduleKey: String(lookup?.moduleKey || "").trim(),
    seriesName: String(lookup?.seriesName || "").trim(),
    locationId: String(lookup?.locationId || "").trim(),
    locationName: String(lookup?.locationName || "").trim(),
    reserve: lookup?.reserve !== false,
    allowFallbackToFirst: lookup?.allowFallbackToFirst === true || !hasExplicitLookup,
  };
};

const isActiveTxSeriesRow = (row: any) => String(row?.status || "active").toLowerCase() !== "inactive";

const resolveTxSeriesRow = (rows: any[], lookup: ReturnType<typeof normalizeTxSeriesLookup>) => {
  const activeRows = (rows || []).filter(isActiveTxSeriesRow);
  const targetSeriesId = String(lookup?.seriesId || "").trim();
  if (targetSeriesId) {
    return activeRows.find((row: any) => String(getEntityId(row)) === targetSeriesId) || rows.find((row: any) => String(getEntityId(row)) === targetSeriesId) || null;
  }

  const targetSeriesName = String(lookup?.seriesName || "").trim().toLowerCase();
  if (targetSeriesName) {
    const exactSeriesName = activeRows.find((row: any) => String(row?.seriesName || row?.name || "").trim().toLowerCase() === targetSeriesName);
    if (exactSeriesName) return exactSeriesName;
  }

  const targetKey = toTxSeriesKey(lookup?.moduleKey || lookup?.module || lookup?.seriesName);
  if (targetKey) {
    const matched = activeRows.filter((row: any) => {
      const rowKeys = [
        row?.module,
        row?.moduleKey,
        row?.name,
        row?.seriesName,
      ].map((value) => toTxSeriesKey(value));
      return rowKeys.some((key) => key === targetKey);
    });
    if (matched.length > 0) {
      const lookupLocationIds = resolveLocationIdsFromCache(lookup?.locationId, lookup?.locationName);
      const scoreRow = (row: any) => {
        const rowLocationIds = Array.isArray(row?.locationIds)
          ? row.locationIds.map((id: any) => String(id || "").trim()).filter(Boolean)
          : [];
        let score = 0;
        if (lookupLocationIds.length) {
          const matchesLocation = rowLocationIds.some((id) => lookupLocationIds.includes(id));
          if (matchesLocation) score += 100;
          else if (!rowLocationIds.length) score += 10;
        }
        if (Boolean(row?.isDefault)) score += 25;
        if (rowLocationIds.length) score += 5;
        return score;
      };
      return matched.slice().sort((a: any, b: any) => scoreRow(b) - scoreRow(a))[0] || null;
    }
  }

  if (lookup?.allowFallbackToFirst) {
    return activeRows.find((row: any) => Boolean(row?.isDefault)) || activeRows[0] || rows.find((row: any) => Boolean(row?.isDefault)) || rows[0] || null;
  }

  return null;
};

const resolveLocationIdsFromCache = (locationId?: string, locationName?: string) => {
  const ids = new Set<string>();
  const direct = String(locationId || "").trim();
  if (direct) ids.add(direct);
  const targetName = String(locationName || "").trim().toLowerCase();
  if (!targetName || typeof window === "undefined") return Array.from(ids);

  try {
    const raw = localStorage.getItem(LOCAL_LOCATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return Array.from(ids);
    parsed
      .filter((row: any) => String(row?.name || row?.locationName || "").trim().toLowerCase() === targetName)
      .forEach((row: any) => {
        const id = String(row?._id || row?.id || "").trim();
        if (id) ids.add(id);
      });
  } catch {
    // ignore
  }

  return Array.from(ids);
};

const readSettingsObject = (key: string, fallback: any = {}) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const writeSettingsObject = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
};

export const taxesAPI = {
  ...taxesLocal,
  getForTransactions: async () => {
    const response = await taxesLocal.getAll({ limit: 10000 });
    return { success: true, data: response.data };
  },
};

export const currenciesAPI = {
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await currenciesResource.getAll(params);
      if (res?.success) return res as any;
      // If the server responded (e.g. 401/403), surface it to the caller.
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return currenciesLocal.getAll(params);
  },
  list: async (params?: Record<string, any>) => currenciesAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res = await currenciesResource.getById(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return currenciesLocal.getById(id);
  },
  create: async (data: any) => {
    try {
      const res = await currenciesResource.create(data);
      if (res?.success) return res as any;
      // If the server responded (e.g. 401/403/409), do not fall back to local writes.
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return currenciesLocal.create(data);
  },
  update: async (id: string, data: any) => {
    try {
      const res = await currenciesResource.update(id, data);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return currenciesLocal.update(id, data);
  },
  delete: async (id: string) => {
    try {
      const res = await currenciesResource.delete(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return currenciesLocal.delete(id);
  },
  getBaseCurrency: async () => {
    const response = await currenciesAPI.getAll({ limit: 1000 });
    const list = Array.isArray(response.data) ? response.data : [];
    const base =
      list.find((currency: any) => Boolean(currency?.isBaseCurrency || currency?.is_base_currency || currency?.isBase)) ||
      list[0] ||
      defaultCurrencies[0];
    return { success: true, data: base };
  },
};

export const invoicesAPI = {
  ...invoicesLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await resource("/invoices").getAll(params);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return invoicesLocal.getAll(params);
  },
  list: (params?: Record<string, any>) => invoicesAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res = await resource("/invoices").getById(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return invoicesLocal.getById(id);
  },
  getByCustomer: async (customerId: string, params?: Record<string, any>) => {
    const res = await invoicesAPI.getAll({ ...(params || {}), customerId });
    if (res?.success) return res as any;

    const all = await invoicesLocal.getAll({ limit: 10000 });
    const filtered = (all.data || []).filter((invoice: any) => {
      const ref =
        invoice?.customerId ||
        invoice?.customer?._id ||
        invoice?.customer?.id ||
        invoice?.customer ||
        "";
      return String(ref) === String(customerId);
    });
    const { data, pagination } = paginateRows(filterRowsByParams(filtered, params), params);
    return { success: true, data, pagination };
  },
  getNextNumber: async (prefixOrLookup?: string | Record<string, any>) => {
    const prefix = typeof prefixOrLookup === "string" ? prefixOrLookup : String((prefixOrLookup as any)?.prefix || "");
    const txModule =
      typeof prefixOrLookup === "string" && prefixOrLookup.toUpperCase().startsWith("RET-")
        ? "Retainer Invoice"
        : "Invoice";
    try {
      const txRes: any = await transactionNumberSeriesAPI.getNextNumber({ module: txModule, reserve: false });
      const nextNumber =
        txRes?.data?.nextNumber ||
        txRes?.data?.next_number ||
        txRes?.data?.invoiceNumber ||
        txRes?.nextNumber;
      if (nextNumber) {
        const normalized = String(nextNumber).trim();
        return {
          success: true,
          data: {
            nextNumber: normalized,
            next_number: normalized,
            invoiceNumber: normalized,
            seriesId: txRes?.data?.seriesId || txRes?.seriesId || "",
          },
        };
      }
    } catch {
      // fall back
    }
    try {
      const res: any = await request({ path: "/invoices/next-number", params: { prefix: prefix || "INV-" } });
      if (res?.success) return res as any;
      if (typeof res?.status === "number") return res as any;
    } catch {
      // fall back
    }
    const all = await invoicesLocal.getAll({ limit: 100000 });
    const next = (all.pagination?.total || 0) + 1;
    const nextNumber = `${prefix || "INV-"}${String(next).padStart(6, "0")}`;
    return { success: true, data: { nextNumber } };
  },
  create: async (data: any) => {
    try {
      const res = await resource("/invoices").create(data);
      if (res?.success) {
        recordEvent("invoice_created", { invoice: (res as any).data });
        return res as any;
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const res = await invoicesLocal.create(data);
    if (res.success) recordEvent("invoice_created", { invoice: res.data });
    return res;
  },
  update: async (id: string, data: any) => {
    try {
      const res = await resource("/invoices").update(id, data);
      if (res?.success) {
        recordEvent("invoice_updated", { invoice: (res as any).data });
        return res as any;
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const res = await invoicesLocal.update(id, data);
    if (res.success) recordEvent("invoice_updated", { invoice: res.data });
    return res;
  },
  delete: async (id: string) => {
    try {
      const res = await resource("/invoices").delete(id);
      if (res?.success) {
        recordEvent("invoice_deleted", { invoice_id: id });
        return res as any;
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const res = await invoicesLocal.delete(id);
    if (res.success) recordEvent("invoice_deleted", { invoice_id: id });
    return res;
  },
  sendEmail: async (id: string, data: any) => {
    const res: any = await request({ method: "POST", path: `/invoices/${encodeURIComponent(id)}/send-email`, data });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to send email");
    }
    return res;
  },
  sendReminder: async (id: string, data: any) => ({
    success: true,
    data: { id, queued: true, type: "reminder", ...data },
    message: "Reminder queued locally",
  }),
  setRemindersStopped: async (id: string, stopped: boolean) =>
    invoicesLocal.update(id, {
      remindersStopped: Boolean(stopped),
      remindersStoppedAt: new Date().toISOString(),
    }),
};

const paymentsReceivedBase = resource("/payments-received");
export const paymentsReceivedAPI = {
  ...paymentsReceivedLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await paymentsReceivedBase.getAll(params);
      if (res?.success) return res as any;
    } catch {}
    return paymentsReceivedLocal.getAll(params);
  },
  list: (params?: Record<string, any>) => paymentsReceivedAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res = await paymentsReceivedBase.getById(id);
      if (res?.success) return res as any;
    } catch {}
    return paymentsReceivedLocal.getById(id);
  },
  getByCustomer: async (customerId: string, params?: Record<string, any>) => {
    const all = await paymentsReceivedAPI.getAll({ ...params, customerId, limit: 10000 });
    const filtered = (all.data || []).filter((payment: any) => {
      const ref =
        payment?.customerId ||
        payment?.customer?._id ||
        payment?.customer?.id ||
        payment?.customer ||
        "";
      return String(ref) === String(customerId);
    });
    const { data, pagination } = paginateRows(filterRowsByParams(filtered, params), params);
    return { success: true, data, pagination };
  },
  getByInvoice: async (invoiceId: string, params?: Record<string, any>) => {
    try {
      const res = await request({ path: "/payments-received/invoice/" + invoiceId, params }); // Wait, I didn't create this endpoint yet. Actually, let's stick to filtering if not.
      if (res?.success) return res as any;
    } catch {}
    const all = await paymentsReceivedAPI.getAll({ limit: 10000 });
    const filtered = (all.data || []).filter((payment: any) => {
      const ref = payment?.invoiceId || payment?.invoice?._id || payment?.invoice?.id || payment?.invoice || "";
      return String(ref) === String(invoiceId);
    });
    const { data, pagination } = paginateRows(filterRowsByParams(filtered, params), params);
    return { success: true, data, pagination };
  },
  create: async (data: any) => {
    try {
      const res = await paymentsReceivedBase.create(data);
      if (res?.success) {
        recordEvent("payment_received", { payment: (res as any).data });
        return res as any;
      }
    } catch {}
    const res = await paymentsReceivedLocal.create(data);
    if (res.success) recordEvent("payment_received", { payment: res.data });
    return res;
  },
  update: async (id: string, data: any) => {
    try {
      const res = await paymentsReceivedBase.update(id, data);
      if (res?.success) {
        recordEvent("payment_updated", { payment: (res as any).data });
        return res as any;
      }
    } catch {}
    const res = await paymentsReceivedLocal.update(id, data);
    if (res.success) recordEvent("payment_updated", { payment: res.data });
    return res;
  },
  delete: async (id: string) => {
    try {
      const res = await paymentsReceivedBase.delete(id);
      if (res?.success) {
        recordEvent("payment_deleted", { payment_id: id });
        return res as any;
      }
    } catch {}
    const res = await paymentsReceivedLocal.delete(id);
    if (res.success) recordEvent("payment_deleted", { payment_id: id });
    return res;
  },
  sendEmail: async (id: string, data: any) => {
    try {
      const res: any = await request({
        method: "POST",
        path: `/payments-received/${encodeURIComponent(id)}/send-email`,
        data,
      });
      if (res?.success) return res;
      if (res && (typeof res?.status === "number" || res?.success === false)) {
        throw new Error(res?.message || "Failed to send payment receipt email");
      }
    } catch (error: any) {
      const message = String(error?.message || "");
      const isNetworkLike =
        !message ||
        /network|failed to fetch|load failed|networkerror|timeout|offline/i.test(message);
      if (!isNetworkLike) throw error;
    }
    return {
      success: true,
      data: { id, queued: true, ...data },
      message: "Payment receipt email queued locally",
    } as any;
  },
};

const subscriptionsBase = resource("/subscriptions");
export const subscriptionsAPI = {
  ...subscriptionsLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await subscriptionsBase.getAll(params);
      if (res?.success) {
        const rows = Array.isArray((res as any).data) ? (res as any).data : [];
        writeLocalCollection(LOCAL_SUBSCRIPTIONS_KEY, rows);
        return res as any;
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return subscriptionsLocal.getAll(params);
  },
  list: (params?: Record<string, any>) => subscriptionsAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res = await subscriptionsBase.getById(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return subscriptionsLocal.getById(id);
  },
  create: async (data: any) => {
    try {
      const res = await subscriptionsBase.create(data);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return subscriptionsLocal.create(data);
  },
  update: async (id: string, data: any) => {
    try {
      const res = await subscriptionsBase.update(id, data);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return subscriptionsLocal.update(id, data);
  },
  delete: async (id: string) => {
    try {
      const res = await subscriptionsBase.delete(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return subscriptionsLocal.delete(id);
  },
};

const creditNotesBase = resource("/credit-notes");
export const creditNotesAPI = {
  ...creditNotesLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await creditNotesBase.getAll(params);
      if (res?.success) return res as any;
    } catch {}
    return creditNotesLocal.getAll(params);
  },
  list: (params?: Record<string, any>) => creditNotesAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res = await creditNotesBase.getById(id);
      if (res?.success) return res as any;
    } catch {}
    return creditNotesLocal.getById(id);
  },
  getByCustomer: async (customerId: string, params?: Record<string, any>) => {
    const all = await creditNotesAPI.getAll({ ...params, customerId, limit: 10000 });
    const filtered = (all.data || []).filter((creditNote: any) => {
      const ref =
        creditNote?.customerId ||
        creditNote?.customer?._id ||
        creditNote?.customer?.id ||
        creditNote?.customer ||
        "";
      return String(ref) === String(customerId);
    });
    const { data, pagination } = paginateRows(filterRowsByParams(filtered, params), params);
    return { success: true, data, pagination };
  },
  getByInvoice: async (invoiceId: string, params?: Record<string, any>) => {
    const all = await creditNotesAPI.getAll({ ...params, limit: 10000 });
    const filtered = (all.data || []).filter((creditNote: any) => {
      const ref = creditNote?.invoiceId || creditNote?.invoice?._id || creditNote?.invoice?.id || creditNote?.invoice || "";
      return String(ref) === String(invoiceId);
    });
    const { data, pagination } = paginateRows(filterRowsByParams(filtered, params), params);
    return { success: true, data, pagination };
  },
  getNextNumber: async () => {
    try {
      const txRes: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Credit Note", reserve: false });
      const nextNumber =
        txRes?.data?.nextNumber ||
        txRes?.data?.next_number ||
        txRes?.data?.creditNoteNumber ||
        txRes?.nextNumber;
      if (nextNumber) {
        const normalized = String(nextNumber).trim();
        return {
          success: true,
          data: {
            nextNumber: normalized,
            next_number: normalized,
            creditNoteNumber: normalized,
            seriesId: txRes?.data?.seriesId || txRes?.seriesId || "",
          },
        };
      }
    } catch {
      // fall back
    }
    try {
      const res = await request({ path: "/credit-notes/next-number" });
      if (res?.success) return res as any;
    } catch {}
    const all = await creditNotesLocal.getAll({ limit: 100000 });
    const next = (all.pagination?.total || 0) + 1;
    return { success: true, data: { nextNumber: `CN-${String(next).padStart(5, "0")}` } };
  },
  create: async (data: any) => {
    try {
      const res = await creditNotesBase.create(data);
      if (res?.success) return res as any;
    } catch {}
    return creditNotesLocal.create(data);
  },
  update: async (id: string, data: any) => {
    try {
      const res = await creditNotesBase.update(id, data);
      if (res?.success) return res as any;
    } catch {}
    return creditNotesLocal.update(id, data);
  },
  delete: async (id: string) => {
    try {
      const res = await creditNotesBase.delete(id);
      if (res?.success) return res as any;
    } catch {}
    return creditNotesLocal.delete(id);
  },
  sendEmail: async (id: string, data: any) => {
    const res: any = await request({ method: "POST", path: `/credit-notes/${encodeURIComponent(id)}/send-email`, data });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to send email");
    }
    return res;
  },
  applyToInvoices: async (creditNoteId: string, allocations: any) =>
    creditNotesAPI.update(creditNoteId, {
      allocations: Array.isArray(allocations) ? allocations : [],
      allocationUpdatedAt: new Date().toISOString(),
    }),
};

const debitNotesBase = resource("/debit-notes");
export const debitNotesAPI = {
  ...debitNotesLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await debitNotesBase.getAll(params);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {}
    return debitNotesLocal.getAll(params);
  },
  list: (params?: Record<string, any>) => debitNotesAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res = await debitNotesBase.getById(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {}
    return debitNotesLocal.getById(id);
  },
  getByCustomer: async (customerId: string, params?: Record<string, any>) => {
    const all = await debitNotesAPI.getAll({ ...params, customerId, limit: 10000 });
    const filtered = (all.data || []).filter((debitNote: any) => {
      const ref =
        debitNote?.customerId ||
        debitNote?.customer?._id ||
        debitNote?.customer?.id ||
        debitNote?.customer ||
        "";
      return String(ref) === String(customerId);
    });
    const { data, pagination } = paginateRows(filterRowsByParams(filtered, params), params);
    return { success: true, data, pagination };
  },
  getByInvoice: async (invoiceId: string, params?: Record<string, any>) => {
    const all = await debitNotesAPI.getAll({ ...params, limit: 10000 });
    const filtered = (all.data || []).filter((debitNote: any) => {
      const ref = debitNote?.invoiceId || debitNote?.invoice?._id || debitNote?.invoice?.id || debitNote?.invoice || "";
      return String(ref) === String(invoiceId);
    });
    const { data, pagination } = paginateRows(filterRowsByParams(filtered, params), params);
    return { success: true, data, pagination };
  },
  getNextNumber: async () => {
    try {
      const txRes: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Debit Note", reserve: false });
      const nextNumber =
        txRes?.data?.nextNumber ||
        txRes?.data?.next_number ||
        txRes?.data?.debitNoteNumber ||
        txRes?.data?.invoiceNumber ||
        txRes?.nextNumber;
      if (nextNumber) {
        const normalized = String(nextNumber).trim();
        return {
          success: true,
          data: {
            nextNumber: normalized,
            next_number: normalized,
            debitNoteNumber: normalized,
            invoiceNumber: normalized,
            seriesId: txRes?.data?.seriesId || txRes?.seriesId || "",
          },
        };
      }
    } catch {
      // fall back
    }
    try {
      const res = await request({ path: "/debit-notes/next-number" });
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {}
    const all = await debitNotesLocal.getAll({ limit: 100000 });
    const next = (all.pagination?.total || 0) + 1;
    return { success: true, data: { nextNumber: `DN-${String(next).padStart(5, "0")}` } };
  },
  create: async (data: any) => {
    try {
      const res = await debitNotesBase.create(data);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {}
    return debitNotesLocal.create(data);
  },
  update: async (id: string, data: any) => {
    try {
      const res = await debitNotesBase.update(id, data);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {}
    return debitNotesLocal.update(id, data);
  },
  delete: async (id: string) => {
    try {
      const res = await debitNotesBase.delete(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {}
    return debitNotesLocal.delete(id);
  },
  sendEmail: async (id: string, data: any) => {
    const res: any = await request({ method: "POST", path: `/debit-notes/${encodeURIComponent(id)}/send-email`, data });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to send email");
    }
    return res;
  },
};

const quotesBase = resource("/quotes");
export const quotesAPI = {
  getAll: (params?: any) => quotesBase.getAll(params),
  list: (params?: any) => quotesAPI.getAll(params),
  getById: (id: string) => quotesBase.getById(id),
  create: (data: any) => quotesBase.create(data),
  update: (id: string, data: any) => quotesBase.update(id, data),
  delete: (id: string) => quotesBase.delete(id),
  getNextNumber: async (prefixOrLookup?: string | Record<string, any>) => {
    try {
      const txRes: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Quote", reserve: false });
      const nextNumber =
        txRes?.data?.nextNumber ||
        txRes?.data?.next_number ||
        txRes?.data?.quoteNumber ||
        txRes?.nextNumber;
      if (nextNumber) {
        const normalized = String(nextNumber).trim();
        return {
          success: true,
          data: {
            nextNumber: normalized,
            next_number: normalized,
            quoteNumber: normalized,
            seriesId: txRes?.data?.seriesId || txRes?.seriesId || "",
          },
        };
      }
    } catch {
      // fall back
    }
    const prefix = typeof prefixOrLookup === "string" ? prefixOrLookup : String((prefixOrLookup as any)?.prefix || "");
    return request({ path: "/quotes/next-number", params: { prefix } });
  },
  bulkDelete: (ids: string[]) => request({ method: "POST", path: "/quotes/bulk-delete", data: { ids } }),
  sendEmail: async (id: string, data: any) => {
    const res: any = await request({ method: "POST", path: `/quotes/${encodeURIComponent(id)}/send-email`, data });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to send email");
    }
    return res;
  },
};

const recurringInvoicesBase = resource("/recurring-invoices");
export const recurringInvoicesAPI = {
  ...recurringInvoicesLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await recurringInvoicesBase.getAll(params);
      if (res?.success) return res as any;
    } catch {}
    return recurringInvoicesLocal.getAll(params);
  },
  list: (params?: Record<string, any>) => recurringInvoicesAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res = await recurringInvoicesBase.getById(id);
      if (res?.success) return res as any;
    } catch {}
    return recurringInvoicesLocal.getById(id);
  },
  create: async (data: any) => {
    try {
      return (await recurringInvoicesBase.create(data)) as any;
    } catch {}
    return recurringInvoicesLocal.create(data);
  },
  update: async (id: string, data: any) => {
    try {
      return (await recurringInvoicesBase.update(id, data)) as any;
    } catch {}
    return recurringInvoicesLocal.update(id, data);
  },
  delete: async (id: string) => {
    try {
      return (await recurringInvoicesBase.delete(id)) as any;
    } catch {}
    return recurringInvoicesLocal.delete(id);
  },
  generateInvoice: async (id: string) => {
    const source = await recurringInvoicesAPI.getById(id);
    if (!source.success || !source.data) {
      return { success: false, message: "Recurring invoice not found", data: null };
    }

    const base = source.data;
    const invId = normalizeId(undefined, "inv");
    const invoiceNumber = `INV-${String(Date.now()).slice(-6)}`;
    const now = new Date().toISOString();
    const createdInvoice = {
      ...base,
      id: invId,
      _id: invId,
      invoiceNumber: base?.invoiceNumber || invoiceNumber,
      recurringInvoiceId: id,
      generatedFromRecurring: true,
      date: now,
      invoiceDate: now,
      createdAt: now,
      updatedAt: now,
      status: base?.status || "draft",
    };

    const res = await invoicesAPI.create(createdInvoice);
    if (res.success) {
      await recurringInvoicesAPI.update(id, { lastGenerated: now, lastGeneratedInvoiceId: res.data?.id || res.data?._id || invId });
    } else {
      // Fallback if API fails
      const invoicesRows = readLocalCollection(LOCAL_INVOICES_KEY);
      invoicesRows.unshift(createdInvoice);
      writeLocalCollection(LOCAL_INVOICES_KEY, invoicesRows);
      await recurringInvoicesLocal.update(id, { lastGenerated: now, lastGeneratedInvoiceId: invId });
      return { success: true, data: createdInvoice };
    }

    return res;
  },
};

const expensesBase = resource("/expenses");
export const expensesAPI = {
  ...expensesLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res: any = await expensesBase.getAll(params);
      if (res?.success) return res;
    } catch {}
    const response = await expensesLocal.getAll(params);
    let rows = Array.isArray(response?.data) ? response.data : [];

    const recurringId = String(params?.recurring_expense_id || params?.recurringExpenseId || "").trim();
    if (recurringId) {
      rows = rows.filter((row: any) => {
        const ref = String(row?.recurring_expense_id || row?.recurringExpenseId || "").trim();
        return ref === recurringId;
      });
    }

    return {
      success: true,
      code: 0,
      data: rows,
      expenses: rows,
      pagination: response?.pagination,
    };
  },
  list: (params?: any) => expensesAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res: any = await expensesBase.getById(id);
      if (res?.success) return res;
    } catch {}
    const response = await expensesLocal.getById(id);
    return {
      ...response,
      code: response?.success ? 0 : 1,
      expense: response?.data || null,
    };
  },
  create: async (data: any) => {
    try {
      const res: any = await expensesBase.create(data);
      if (res?.success) {
        recordEvent("expense_created", { expense: res.data });
        return res;
      }
    } catch {}
    const payload = {
      ...data,
      expense_id: data?.expense_id || data?._id || data?.id,
    };
    const response = await expensesLocal.create(payload);
    if (response.success) recordEvent("expense_created", { expense: response.data });
    return {
      ...response,
      code: response?.success ? 0 : 1,
      expense: response?.data || null,
    };
  },
  update: async (id: string, data: any) => {
    try {
      const res: any = await expensesBase.update(id, data);
      if (res?.success) {
        recordEvent("expense_updated", { expense: res.data });
        return res;
      }
    } catch {}
    const response = await expensesLocal.update(id, data);
    if (response.success) recordEvent("expense_updated", { expense: response.data });
    return {
      ...response,
      code: response?.success ? 0 : 1,
      expense: response?.data || null,
    };
  },
  delete: async (id: string) => {
    try {
      const res: any = await expensesBase.delete(id);
      if (res?.success) {
        recordEvent("expense_deleted", { expense_id: id });
        return res;
      }
    } catch {}
    const response = await expensesLocal.delete(id);
    if (response.success) recordEvent("expense_deleted", { expense_id: id });
    return {
      ...response,
      code: response?.success ? 0 : 1,
    };
  },
};

const addRepeatInterval = (baseDate: Date, repeatEvery: string) => {
  const normalized = String(repeatEvery || "month")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const next = new Date(baseDate);
  if (normalized === "week" || normalized === "weekly") next.setDate(next.getDate() + 7);
  else if (normalized === "2weeks" || normalized === "2week") next.setDate(next.getDate() + 14);
  else if (normalized === "2months" || normalized === "2month") next.setMonth(next.getMonth() + 2);
  else if (normalized === "3months" || normalized === "3month") next.setMonth(next.getMonth() + 3);
  else if (normalized === "6months" || normalized === "6month") next.setMonth(next.getMonth() + 6);
  else if (normalized === "year" || normalized === "yearly") next.setFullYear(next.getFullYear() + 1);
  else if (normalized === "2years" || normalized === "2year") next.setFullYear(next.getFullYear() + 2);
  else if (normalized === "3years" || normalized === "3year") next.setFullYear(next.getFullYear() + 3);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

const recurringExpensesBase = resource("/expenses/recurring");

export const recurringExpensesAPI = {
  ...recurringExpensesLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res: any = await recurringExpensesBase.getAll(params);
      if (res?.success) {
        return {
          ...res,
          code: 0,
          recurring_expenses: res.data || [],
        };
      }
    } catch {}
    const response = await recurringExpensesLocal.getAll(params);
    const rows = Array.isArray(response?.data) ? response.data : [];
    return {
      success: true,
      code: 0,
      data: rows,
      recurring_expenses: rows,
      pagination: response?.pagination,
    };
  },
  getById: async (id: string) => {
    try {
      const res: any = await recurringExpensesBase.getById(id);
      if (res?.success) {
        return {
          ...res,
          code: 0,
          recurring_expense: res.data || null,
        };
      }
    } catch {}
    const response = await recurringExpensesLocal.getById(id);
    return {
      ...response,
      code: response?.success ? 0 : 1,
      recurring_expense: response?.data || null,
    };
  },
  create: async (data: any) => {
    const nowIso = new Date().toISOString();
    const payload = {
      ...data,
      recurring_expense_id: data?.recurring_expense_id || data?._id || data?.id,
      status: String(data?.status || "active").toLowerCase(),
      created_time: data?.created_time || nowIso,
      next_expense_date: data?.next_expense_date || data?.start_date || nowIso.slice(0, 10),
    };
    try {
      const res: any = await recurringExpensesBase.create(payload);
      if (res?.success) {
        return {
          ...res,
          code: 0,
          recurring_expense: res.data || null,
        };
      }
    } catch {}
    const created = await recurringExpensesLocal.create(payload);
    return {
      ...created,
      code: created?.success ? 0 : 1,
      recurring_expense: created?.data || null,
    };
  },
  update: async (id: string, data: any) => {
    try {
      const res: any = await recurringExpensesBase.update(id, data);
      if (res?.success) {
        return {
          ...res,
          code: 0,
          recurring_expense: res.data || null,
        };
      }
    } catch {}
    const response = await recurringExpensesLocal.update(id, data);
    return {
      ...response,
      code: response?.success ? 0 : 1,
      recurring_expense: response?.data || null,
    };
  },
  delete: async (id: string) => {
    try {
      const res: any = await recurringExpensesBase.delete(id);
      if (res?.success) {
        return {
          ...res,
          code: 0,
        };
      }
    } catch {}
    const response = await recurringExpensesLocal.delete(id);
    return {
      ...response,
      code: response?.success ? 0 : 1,
    };
  },
  updateStatus: async (id: string, status: string) => {
    const normalizedStatus = String(status || "").toLowerCase();
    try {
      const res: any = await recurringExpensesBase.update(id, { status: normalizedStatus });
      if (res?.success) {
        return {
          ...res,
          code: 0,
          recurring_expense: res.data || null,
        };
      }
    } catch {}
    const response = await recurringExpensesLocal.update(id, { status: normalizedStatus });
    return {
      ...response,
      code: response?.success ? 0 : 1,
      recurring_expense: response?.data || null,
    };
  },
  generateExpense: async (id: string) => {
    const source = await recurringExpensesLocal.getById(id);
    if (!source?.success || !source?.data) {
      return { success: false, code: 1, message: "Recurring expense not found", data: null };
    }

    const recurring = source.data as any;
    const now = new Date();
    const dateIso = now.toISOString().slice(0, 10);
    const amount = Number(recurring?.amount || recurring?.total || recurring?.sub_total || 0);

    const createdExpense = await expensesLocal.create({
      date: dateIso,
      account_id: recurring?.account_id || "",
      account_name: recurring?.account_name || "",
      amount,
      total: amount,
      sub_total: amount,
      paid_through_account_id: recurring?.paid_through_account_id || "",
      paid_through_account_name: recurring?.paid_through_account_name || "",
      vendor_id: recurring?.vendor_id || "",
      vendor_name: recurring?.vendor_name || "",
      customer_id: recurring?.customer_id || "",
      customer_name: recurring?.customer_name || "",
      description: recurring?.description || "",
      currency_code: recurring?.currency_code || "",
      status: "unbilled",
      recurring_expense_id: recurring?.recurring_expense_id || recurring?._id || recurring?.id,
      source: "recurring",
    });

    const nextFrom = recurring?.next_expense_date ? new Date(recurring.next_expense_date) : now;
    const nextDate = addRepeatInterval(nextFrom, recurring?.repeat_every || "month");
    const updatedRecurring = await recurringExpensesLocal.update(id, {
      last_expense_date: dateIso,
      next_expense_date: nextDate.toISOString().slice(0, 10),
    });

    return {
      success: Boolean(createdExpense?.success),
      code: createdExpense?.success ? 0 : 1,
      data: {
        expense: createdExpense?.data || null,
        recurring_expense: updatedRecurring?.data || recurring,
      },
      expense: createdExpense?.data || null,
      recurring_expense: updatedRecurring?.data || recurring,
    };
  },
};

const projectsBase = resource("/projects");
export const projectsAPI = {
  getAll: async (params?: Record<string, any>) => {
    return (await projectsBase.getAll(params)) as any;
  },
  list: async (params?: Record<string, any>) => projectsAPI.getAll(params),
  getById: async (id: string) => {
    return (await projectsBase.getById(String(id))) as any;
  },
  create: async (data: any) => {
    return (await projectsBase.create(data)) as any;
  },
  update: async (id: string, data: any) => {
    return (await projectsBase.update(String(id), data)) as any;
  },
  delete: async (id: string) => {
    return (await projectsBase.delete(String(id))) as any;
  },
  bulkUpdate: async (ids: string[], data: any) => {
    return (await request({ method: "POST", path: "/projects/bulk-update", data: { ids, data } })) as any;
  },
  bulkDelete: async (ids: string[]) => {
    return (await request({ method: "POST", path: "/projects/bulk-delete", data: { ids } })) as any;
  },
  getByCustomer: async (customerId: string, params?: Record<string, any>) => {
    return await projectsAPI.getAll({ ...params, customerId });
  },
};

const timeEntriesBase = resource("/projects/time-entries");
export const timeEntriesAPI = {
  getAll: async (params?: Record<string, any>) => {
    return (await timeEntriesBase.getAll(params)) as any;
  },
  list: async (params?: Record<string, any>) => timeEntriesAPI.getAll(params),
  getById: async (id: string) => {
    return (await timeEntriesBase.getById(String(id))) as any;
  },
  create: async (data: any) => {
    return (await timeEntriesBase.create(data)) as any;
  },
  update: async (id: string, data: any) => {
    return (await timeEntriesBase.update(String(id), data)) as any;
  },
  delete: async (id: string) => {
    return (await timeEntriesBase.delete(String(id))) as any;
  },
  getByProject: async (projectId: string, params?: Record<string, any>) => {
    return await timeEntriesAPI.getAll({ ...params, projectId });
  },
};


export const billsAPI = {
  ...resource("/bills"),
  getByVendor: (vendorId: string, params?: Record<string, any>) =>
    request({ path: `/bills/vendor/${vendorId}`, params }),
};

const salesReceiptsBase = resource("/sales-receipts");
export const salesReceiptsAPI = {
  ...salesReceiptsLocal,
  getAll: async (params?: any) => {
    try {
      const res = await salesReceiptsBase.getAll(params);
      if (res?.success) return res as any;
    } catch {}
    return salesReceiptsLocal.getAll(params);
  },
  getById: async (id: string) => {
    try {
      const res = await salesReceiptsBase.getById(id);
      if (res?.success) return res as any;
    } catch {}
    return salesReceiptsLocal.getById(id);
  },
  create: (data: any) => salesReceiptsBase.create(data),
  update: (id: string, data: any) => salesReceiptsBase.update(id, data),
  delete: (id: string) => salesReceiptsBase.delete(id),
  getNextNumber: async () => {
    try {
      const txRes: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Sales Receipt", reserve: false });
      const nextNumber =
        txRes?.data?.nextNumber ||
        txRes?.data?.next_number ||
        txRes?.data?.receiptNumber ||
        txRes?.nextNumber;
      if (nextNumber) {
        const normalized = String(nextNumber).trim();
        return {
          success: true,
          data: {
            nextNumber: normalized,
            next_number: normalized,
            receiptNumber: normalized,
            nextReceiptNumber: normalized,
            seriesId: txRes?.data?.seriesId || txRes?.seriesId || "",
          },
        };
      }
    } catch {
      // fall back
    }
    try {
      const res = await request({ path: "/sales-receipts/next-number" });
      if (res?.success) return res as any;
    } catch {}
    const all = await salesReceiptsLocal.getAll({ limit: 100000 });
    const next = (all.pagination?.total || 0) + 1;
    const nextNumber = `SR-${String(next).padStart(5, "0")}`;
    return { success: true, data: { nextNumber, next_number: nextNumber, receiptNumber: nextNumber, nextReceiptNumber: nextNumber } };
  },
  sendEmail: async (id: string, data: any) => {
    const res: any = await request({ method: "POST", path: `/sales-receipts/${encodeURIComponent(id)}/send-email`, data });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to send email");
    }
    return res;
  },
};

export const salespersonsAPI = {
  ...salespersonsResource,
  local: salespersonsLocal,
};

export const contactPersonsAPI = {
  ...contactPersonsLocal,
  getAll: async (customerIdOrParams?: string | Record<string, any>) => {
    if (typeof customerIdOrParams === "string" && customerIdOrParams.trim()) {
      const all = await contactPersonsLocal.getAll({ limit: 10000 });
      const customerId = customerIdOrParams.trim();
      const data = (all.data || []).filter((contact: any) => {
        const ref =
          contact?.customerId ||
          contact?.customer?._id ||
          contact?.customer?.id ||
          contact?.customer ||
          "";
        return String(ref) === customerId;
      });
      return { success: true, data };
    }
    return contactPersonsLocal.getAll(customerIdOrParams as Record<string, any> | undefined);
  },
  list: (customerIdOrParams?: string | Record<string, any>) => contactPersonsAPI.getAll(customerIdOrParams),
};

export const bankAccountsAPI = {
  ...bankAccountsLocal,
};

export const refundsAPI = {
  ...resource("/refunds"),
  getByPaymentId: (paymentId: string, params?: Record<string, any>) =>
    request({ path: `/refunds/payment/${paymentId}`, params }),
  getByCreditNoteId: (creditNoteId: string, params?: Record<string, any>) =>
    request({ path: `/refunds/credit-note/${creditNoteId}`, params }),
};

export const paymentModesAPI = {
  ...paymentModesLocal,
};

export const journalEntriesAPI = {
  ...resource("/journal-entries"),
};

export const paymentsMadeAPI = {
  ...resource("/payments-made"),
};

export const purchaseOrdersAPI = {
  ...resource("/purchase-orders"),
};

export const vendorCreditsAPI = {
  ...resource("/vendor-credits"),
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

export const documentsAPI = {
  upload: async (file: File, extra?: Record<string, any>) => {
    try {
      const contentUrl = await readFileAsDataUrl(file);
      return await request({
        method: "POST",
        path: "/documents",
        data: {
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          contentUrl,
          ...(extra || {}),
        },
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Upload failed", data: null };
    }
  },
  delete: async (id: string) => {
    const docId = String(id || "").trim();
    if (!docId) {
      return { success: false, message: "Document id is required", data: null };
    }
    return (await request({ method: "DELETE", path: `/documents/${encodeURIComponent(docId)}` })) as any;
  },
  getById: async (id: string) => {
    const docId = String(id || "").trim();
    if (!docId) {
      return { success: false, message: "Document id is required", data: null };
    }
    return (await request({ path: `/documents/${encodeURIComponent(docId)}` })) as any;
  },
  list: async (params?: Record<string, any>) => request({ path: "/documents", params }),
};

export const emailTemplatesAPI = {
  ...resource("/settings/email-templates"),
  getByKey: (key: string) => request({ path: `/settings/email-templates/${encodeURIComponent(key)}` }),
  upsert: (key: string, data: any) =>
    request({ method: "PUT", path: `/settings/email-templates/${encodeURIComponent(key)}`, data }),
};

export const senderEmailsAPI = {
  ...resource("/settings/sender-emails"),
  getPrimary: () => request({ path: "/settings/sender-emails/primary" }),
  resendVerification: (id: string) => request({ method: "POST", path: `/settings/sender-emails/${encodeURIComponent(id)}/resend-verification` }),
  getInvitation: (senderId: string, token: string) =>
    request({ path: `/public/sender-emails/invitations/${encodeURIComponent(senderId)}`, params: { token } }),
  acceptInvitation: (senderId: string, token: string) =>
    request({ method: "POST", path: `/public/sender-emails/invitations/${encodeURIComponent(senderId)}/accept`, data: { token } }),
  rejectInvitation: (senderId: string, token: string) =>
    request({ method: "POST", path: `/public/sender-emails/invitations/${encodeURIComponent(senderId)}/reject`, data: { token } }),
  resendInvitationOtp: (senderId: string, token: string) =>
    request({ method: "POST", path: `/public/sender-emails/invitations/${encodeURIComponent(senderId)}/resend-otp`, data: { token } }),
  verifyInvitationOtp: (senderId: string, token: string, otp: string) =>
    request({ method: "POST", path: `/public/sender-emails/invitations/${encodeURIComponent(senderId)}/verify-otp`, data: { token, otp } }),
};

export const emailNotificationPreferencesAPI = {
  get: () => request({ path: "/settings/email-notification-preferences" }),
  update: (data: any) =>
    request({ method: "PUT", path: "/settings/email-notification-preferences", data }),
};

export const emailRelayAPI = {
  ...resource("/settings/email-relay"),
  toggle: (id: string) => request({ method: "POST", path: `/settings/email-relay/${id}/toggle` }),
};

export const approvalRulesAPI = {
  ...resource("/settings/approval-rules"),
};

export const transactionNumberSeriesAPI = {
  ...txSeriesLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await txSeriesResource.getAll(params);
      if (res?.success) {
        const rows = Array.isArray((res as any).data)
          ? (res as any).data
          : Array.isArray((res as any).data?.data)
            ? (res as any).data.data
            : [];
        if (rows.length > 0) writeLocalCollection(LOCAL_TX_SERIES_KEY, rows);
        return res as any;
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return txSeriesLocal.getAll(params);
  },
  getById: async (id: string) => {
    try {
      const res = await txSeriesResource.getById(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return txSeriesLocal.getById(id);
  },
  delete: async (id: string) => {
    try {
      const res = await txSeriesResource.delete(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return txSeriesLocal.delete(id);
  },
  createMultiple: async (data: any) => {
    try {
      const res = await request({ method: "POST", path: "/transaction-number-series/bulk", data });
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const seriesName = data?.seriesName || "Standard";
    const locationIds = data?.locationIds || [];
    const modules = data?.modules || (Array.isArray(data) ? data : data?.series || data?.rows || []);
    
    const created: any[] = [];
    for (const mod of modules) {
      const row = {
        ...mod,
        seriesName,
        locationIds,
        status: "Active"
      };
      const response = await txSeriesLocal.create(row);
      if (response.success && response.data) created.push(response.data);
    }
    return { success: true, data: created };
  },
  updateMultiple: async (data: any) => {
    try {
      const res = await request({ method: "PUT", path: "/transaction-number-series/bulk", data });
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const seriesName = data?.seriesName || "Standard";
    const locationIds = data?.locationIds || [];
    const modules = data?.modules || [];
    const originalName = data?.originalName || seriesName;

    // Get all existing rows for this series
    const all = await txSeriesLocal.getAll({ limit: 10000 });
    const existingRows = (all.data || []).filter((row: any) => 
      String(row.seriesName || "").toLowerCase() === originalName.toLowerCase()
    );

    // Delete existing rows
    for (const row of existingRows) {
      await txSeriesLocal.delete(getEntityId(row));
    }

    // Create new rows
    const created: any[] = [];
    for (const mod of modules) {
      const row = {
        ...mod,
        seriesName,
        locationIds,
        status: "Active"
      };
      const response = await txSeriesLocal.create(row);
      if (response.success && response.data) created.push(response.data);
    }
    return { success: true, data: created };
  },
  getNextNumber: async (lookup?: TransactionSeriesLookup) => {
    const normalized = normalizeTxSeriesLookup(lookup);
    try {
      const params: Record<string, any> = {};
      if (!normalized.seriesId && normalized.module) params.module = normalized.module;
      if (!normalized.seriesId && normalized.moduleKey) params.moduleKey = normalized.moduleKey;
      if (!normalized.seriesId && normalized.seriesName) params.seriesName = normalized.seriesName;
      if (!normalized.seriesId && normalized.locationId) params.locationId = normalized.locationId;
      if (!normalized.seriesId && normalized.locationName) params.locationName = normalized.locationName;
      if (normalized.reserve === false) params.reserve = "false";

      const path = normalized.seriesId
        ? `/transaction-number-series/${encodeURIComponent(normalized.seriesId)}/next-number`
        : "/transaction-number-series/next-number";
      const res = await request({ path, params: Object.keys(params).length ? params : undefined });
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const all = await txSeriesLocal.getAll({ limit: 10000 });
    const rows = all.data || [];
    const selected = resolveTxSeriesRow(rows, normalized) || (!normalized.seriesId && !normalized.module && !normalized.moduleKey && !normalized.seriesName ? rows[0] : null);
    if (!selected) {
      return { success: false, message: "Transaction series not found", data: null };
    }

    const starting = String(selected?.startingNumber || selected?.nextNumber || "1");
    const parsed = parseInt(starting, 10);
    const current = Number(selected?.nextNumber) > 0 ? Number(selected.nextNumber) : Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    const width = /^\d+$/.test(starting) ? starting.length : 5;
    const padded = width > 1 ? String(current).padStart(width, "0") : String(current);
    const nextNumber = `${selected?.prefix || ""}${padded}`;
    if (normalized.reserve !== false) {
      await txSeriesLocal.update(getEntityId(selected), { ...selected, nextNumber: current + 1 });
    }

    return { success: true, data: { seriesId: getEntityId(selected), nextNumber, next_number: nextNumber, reserved: normalized.reserve !== false } };
  },
  getCachedNextNumber: (lookup?: TransactionSeriesLookup) => {
    const normalized = normalizeTxSeriesLookup(lookup);
    const cachedRows = readLocalCollection(LOCAL_TX_SERIES_KEY);
    const rows = cachedRows;
    const selected = resolveTxSeriesRow(rows, normalized) || (!normalized.seriesId && !normalized.module && !normalized.moduleKey && !normalized.seriesName ? rows[0] : null);
    if (!selected) return "";

    const starting = String(selected?.startingNumber || selected?.nextNumber || "1");
    const parsed = parseInt(starting, 10);
    const current = Number(selected?.nextNumber) > 0 ? Number(selected.nextNumber) : Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    const width = /^\d+$/.test(starting) ? starting.length : 5;
    const padded = width > 1 ? String(current).padStart(width, "0") : String(current);
    return `${selected?.prefix || ""}${padded}`;
  },
  getSettings: async () => {
    try {
      const res = await request({ path: "/transaction-number-series/settings" });
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const defaults = { preventDuplicates: "all_fiscal_years" };
    const data = readSettingsObject("taban_books_tx_number_settings", defaults);
    return { success: true, data };
  },
  updateSettings: async (data: any) => {
    try {
      const res = await request({ method: "PUT", path: "/transaction-number-series/settings", data });
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const current = readSettingsObject("taban_books_tx_number_settings", {});
    const updated = { ...current, ...data };
    writeSettingsObject("taban_books_tx_number_settings", updated);
    return { success: true, data: updated };
  },
};

export const locationsAPI = {
  ...locationsLocal,
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await locationsResource.getAll(params);
      if (res?.success) {
        const rows = Array.isArray((res as any).data) ? (res as any).data : [];
        writeLocalCollection(LOCAL_LOCATIONS_KEY, rows);
        return res as any;
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return locationsLocal.getAll(params);
  },
  getById: async (id: string) => {
    try {
      const res = await locationsResource.getById(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return locationsLocal.getById(id);
  },
  create: async (data: any) => {
    try {
      const res = await locationsResource.create(data);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return locationsLocal.create(data);
  },
  update: async (id: string, data: any) => {
    try {
      const res = await locationsResource.update(id, data);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return locationsLocal.update(id, data);
  },
  delete: async (id: string) => {
    try {
      const res = await locationsResource.delete(id);
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }
    return locationsLocal.delete(id);
  },
};

export const settingsAPI = {
  getOwnerEmail: async () => {
    const profile = readSettingsObject("organization_profile", {});
    const ownerEmail = profile?.email || profile?.ownerEmail || "owner@local.app";
    return { success: true, data: { ownerEmail } };
  },
  getOrganizationProfile: async () => {
    try {
      const res = await request({ path: "/settings/organization/profile" });
      if (res?.success) {
        const normalized = res.data && typeof res.data === "object" ? res.data : {};
        writeSettingsObject("organization_profile", normalized);
        return { success: true, data: normalized };
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const existing = readSettingsObject("organization_profile", {});
    const normalized = {
      baseCurrency: existing?.baseCurrency || "AMD",
      email: existing?.email || "owner@local.app",
      organizationName: existing?.organizationName || "Taban Billing",
      mileagePreferences: existing?.mileagePreferences || null,
      ...existing,
    };
    writeSettingsObject("organization_profile", normalized);
    return { success: true, data: normalized };
  },
  updateOrganizationProfile: async (data: any) => {
    try {
      const res = await request({ method: "PUT", path: "/settings/organization/profile", data });
      if (res?.success) {
        const responseData = res.data && typeof res.data === "object" ? res.data : {};
        const responseKeys = Object.keys(responseData).filter((key) => key !== "ok");
        const updated = responseKeys.length > 0 ? { ...readSettingsObject("organization_profile", {}), ...(data || {}), ...responseData } : { ...readSettingsObject("organization_profile", {}), ...(data || {}) };
        writeSettingsObject("organization_profile", updated);
        return { success: true, data: updated };
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const existing = readSettingsObject("organization_profile", {});
    const updated = { ...existing, ...(data || {}) };
    writeSettingsObject("organization_profile", updated);
    return { success: true, data: updated };
  },
  getQuotesSettings: async () => {
    try {
      const res = await request({ path: "/settings/quotes" });
      if (res?.success) {
        const data = res.data && typeof res.data === "object"
          ? { ...DEFAULT_QUOTE_SETTINGS, ...(res.data as any) }
          : DEFAULT_QUOTE_SETTINGS;
        writeSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, data);
        return { success: true, data };
      }
    } catch {
      // fall back to local cache
    }

    const data = readSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, DEFAULT_QUOTE_SETTINGS);
    writeSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, data);
    return { success: true, data };
  },
  updateQuotesSettings: async (data: any) => {
    try {
      const res = await request({ method: "PUT", path: "/settings/quotes", data });
      if (res?.success) {
        const current = readSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, DEFAULT_QUOTE_SETTINGS);
        const updated = {
          ...current,
          ...(data || {}),
          ...(res.data && typeof res.data === "object" ? (res.data as any) : {}),
        };
        writeSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, updated);
        return { success: true, data: updated };
      }
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back to local cache
    }

    const current = readSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, DEFAULT_QUOTE_SETTINGS);
    const updated = { ...current, ...(data || {}) };
    writeSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, updated);
    return { success: true, data: updated };
  },
  getGeneralSettings: async () => {
    const defaults = {
      discountSettings: { discountType: "transaction", discountBeforeTax: true },
      taxSettings: { taxBasis: "exclusive" },
      roundingSettings: { roundingType: "none", precision: 2 }
    };
    const data = readSettingsObject(LOCAL_GENERAL_SETTINGS_KEY, defaults);
    return { success: true, data };
  },
  updateGeneralSettings: async (data: any) => {
    const current = readSettingsObject(LOCAL_GENERAL_SETTINGS_KEY, {});
    const updated = { ...current, ...(data || {}) };
    writeSettingsObject(LOCAL_GENERAL_SETTINGS_KEY, updated);
    return { success: true, data: updated };
  },
  getRecurringInvoiceSettings: async () => {
    const defaults = { autoSend: false, retries: 0, generateInAdvanceDays: 0 };
    const data = readSettingsObject(LOCAL_RECURRING_SETTINGS_KEY, defaults);
    writeSettingsObject(LOCAL_RECURRING_SETTINGS_KEY, data);
    return { success: true, data };
  },
  updateRecurringInvoiceSettings: async (data: any) => {
    const current = readSettingsObject(LOCAL_RECURRING_SETTINGS_KEY, {});
    const updated = { ...current, ...(data || {}) };
    writeSettingsObject(LOCAL_RECURRING_SETTINGS_KEY, updated);
    return { success: true, data: updated };
  },
  getRetainerInvoiceSettings: async () => {
    const defaults = {
      termsConditions: "",
      customerNotes: "",
      approvalType: "no-approval",
      notificationPreference: "all-submitters",
      sendNotifications: true,
      notifySubmitter: true,
      customFields: [
        { name: "Sales Person", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
        { name: "Description", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
      ],
      customButtons: [] as unknown[],
      relatedLists: [] as unknown[],
    };

    try {
      const res = await request({ path: "/settings/retainer-invoices" });
      if (res?.success) {
        const data = res.data && typeof res.data === "object" ? { ...defaults, ...(res.data as any) } : defaults;
        writeSettingsObject(LOCAL_RETAINER_INVOICE_SETTINGS_KEY, data);
        return { success: true, data };
      }
    } catch {
      // fall back
    }

    const data = readSettingsObject(LOCAL_RETAINER_INVOICE_SETTINGS_KEY, defaults);
    writeSettingsObject(LOCAL_RETAINER_INVOICE_SETTINGS_KEY, data);
    return { success: true, data };
  },
  updateRetainerInvoiceSettings: async (data: any) => {
    try {
      const res = await request({ method: "PUT", path: "/settings/retainer-invoices", data });
      if (res?.success) {
        const current = readSettingsObject(LOCAL_RETAINER_INVOICE_SETTINGS_KEY, {});
        const updated = { ...current, ...(data || {}), ...(res.data && typeof res.data === "object" ? (res.data as any) : {}) };
        writeSettingsObject(LOCAL_RETAINER_INVOICE_SETTINGS_KEY, updated);
        return { success: true, data: updated };
      }
    } catch {
      // fall back
    }

    const current = readSettingsObject(LOCAL_RETAINER_INVOICE_SETTINGS_KEY, {});
    const updated = { ...current, ...(data || {}) };
    writeSettingsObject(LOCAL_RETAINER_INVOICE_SETTINGS_KEY, updated);
    return { success: true, data: updated };
  },
};

export const authAPI = {
  getMe: () => request({ path: "/auth/me" }),
};

const usersResource = resource("/users");
export const usersAPI = {
  ...usersResource,
  sendInvitation: (id: string, data?: any) =>
    request({ method: "POST", path: `/users/${encodeURIComponent(String(id || ""))}/send-invitation`, data }),
  getActivityLogs: (id: string, params?: Record<string, any>) =>
    request({ path: `/users/${encodeURIComponent(String(id || ""))}/activities`, params }),
};

const rolesResource = resource("/roles");
export const rolesAPI = {
  ...rolesResource,
};

export const accountantAPI = {
  getAccounts: async (params?: Record<string, any>) => {
    const all = await chartAccountsLocal.getAll({ limit: 10000 });
    const filtered = filterRowsByParams(all.data || [], params);
    const { data, pagination } = paginateRows(filtered, params);
    return { success: true, data, pagination };
  },
};

export const reportingTagsAPI = {
  getAll: async (params?: Record<string, any>) => {
    try {
      const res = await reportingTagsResource.getAll(params);
      if (res?.success) return res as any;
    } catch {
      // fall back
    }
    return reportingTagsLocal.getAll(params);
  },
  list: async (params?: Record<string, any>) => reportingTagsAPI.getAll(params),
  getById: async (id: string) => {
    try {
      const res = await reportingTagsResource.getById(id);
      if (res?.success) return res as any;
    } catch {
      // fall back
    }
    return reportingTagsLocal.getById(id);
  },
  create: async (data: any) => {
    try {
      const res = await reportingTagsResource.create(data);
      if (res?.success) return res as any;
    } catch {
      // fall back
    }
    return reportingTagsLocal.create(data);
  },
  update: async (id: string, data: any) => {
    try {
      const res = await reportingTagsResource.update(id, data);
      if (res?.success) return res as any;
    } catch {
      // fall back
    }
    return reportingTagsLocal.update(id, data);
  },
  delete: async (id: string) => {
    try {
      const res = await reportingTagsResource.delete(id);
      if (res?.success) return res as any;
    } catch {
      // fall back
    }
    return reportingTagsLocal.delete(id);
  },
};

export const chartOfAccountsAPI = {
  getAccounts: async (params?: Record<string, any>) => {
    const all = await chartAccountsLocal.getAll(params);
    return { success: true, data: all.data, pagination: all.pagination };
  },
  createAccount: async (data: any) => chartAccountsLocal.create(data),
};

export const openingBalancesAPI = {
  get: () => request({ path: "/settings/opening-balances" }),
  save: (data: any) => request({ method: "POST", path: "/settings/opening-balances", data }),
};

const automationResource = (segment: string) => ({
  ...resource(`/settings/automation/${segment}`),
  getStats: () => request({ path: `/settings/automation/${segment}/stats` }),
  clone: (id: string) => request({ method: "POST", path: `/settings/automation/${segment}/${id}/clone` }),
  reorder: (data: any) => request({ method: "POST", path: `/settings/automation/${segment}/reorder`, data }),
  toggle: (id: string) => request({ method: "POST", path: `/settings/automation/${segment}/${id}/toggle` }),
});

export const automationAPI = {
  rules: {
    ...automationResource("rules"),
    getNotificationPreferences: () =>
      request({ path: "/settings/automation/rules/notification-preferences" }),
    updateNotificationPreferences: (data: any) =>
      request({ method: "PUT", path: "/settings/automation/rules/notification-preferences", data }),
  },
  actions: automationResource("actions"),
  logs: automationResource("logs"),
  schedules: automationResource("schedules"),
};

export const priceListsAPI = {
  list: (params?: any) => request({ path: "/price-lists", params }),
  getById: (id: string) => request({ path: `/price-lists/${id}` }),
  create: (data: any) => request({ method: "POST", path: "/price-lists", data }),
  update: (id: string, data: any) => request({ method: "PUT", path: `/price-lists/${id}`, data }),
  delete: (id: string) => request({ method: "DELETE", path: `/price-lists/${id}` }),
};

export const dashboardAPI = {
  getSummary: () => request({ path: "/dashboard/summary" }),
};

export default {
  API_BASE_URL,
  apiRequest,
  customersAPI,
  itemsAPI,
  unitsAPI,
  tagAssignmentsAPI,
  inventoryAdjustmentsAPI,
  vendorsAPI,
  taxesAPI,
  currenciesAPI,
  invoicesAPI,
  paymentsReceivedAPI,
  subscriptionsAPI,
  creditNotesAPI,
  debitNotesAPI,
  quotesAPI,
  recurringInvoicesAPI,
  expensesAPI,
  recurringExpensesAPI,
  projectsAPI,
  timeEntriesAPI,
  billsAPI,
  salesReceiptsAPI,
  salespersonsAPI,
  contactPersonsAPI,
  bankAccountsAPI,
  refundsAPI,
  paymentModesAPI,
  journalEntriesAPI,
  paymentsMadeAPI,
  purchaseOrdersAPI,
  vendorCreditsAPI,
  documentsAPI,
  plansAPI,
  addonsAPI,
  priceListsAPI,
  dashboardAPI,
  emailTemplatesAPI,

  senderEmailsAPI,
  emailNotificationPreferencesAPI,
  emailRelayAPI,
  approvalRulesAPI,
  transactionNumberSeriesAPI,
  locationsAPI,
  settingsAPI,
  authAPI,
  usersAPI,
  rolesAPI,
  accountantAPI,
  reportingTagsAPI,
  chartOfAccountsAPI,
  openingBalancesAPI,
  automationAPI,
  eventsAPI,
};

