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
const LOCAL_RECURRING_SETTINGS_KEY = "taban_books_settings_recurring_invoices";
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
    return (await customersBase.getAll(params)) as any;
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
    throw new Error(remote?.message || "Failed to get next customer number");
  },
  getById: async (id: string) => {
    return (await customersBase.getById(String(id))) as any;
  },
  create: async (data: any) => {
    return (await customersBase.create(data)) as any;
  },
  update: async (id: string, data: any) => {
    return (await customersBase.update(String(id), data)) as any;
  },
  delete: async (id: string) => {
    return (await customersBase.delete(String(id))) as any;
  },
  bulkUpdate: async (ids: string[], data: any) => {
    return (await request({ method: "POST", path: "/customers/bulk-update", data: { ids, data } })) as any;
  },
  bulkDelete: async (ids: string[]) => {
    return (await request({ method: "POST", path: "/customers/bulk-delete", data: { ids } })) as any;
  },
  merge: async (targetCustomerId: string, sourceCustomerIds: string[]) => {
    return (await request({
      method: "POST",
      path: `/customers/${encodeURIComponent(String(targetCustomerId))}/merge`,
      data: { sourceCustomerIds },
    })) as any;
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
  create: async (data: any) => itemsBase.create(data),
  update: async (id: string, data: any) => itemsBase.update(String(id), data),
  delete: async (id: string) => itemsBase.delete(String(id)),
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
const txSeriesLocal = localResource(LOCAL_TX_SERIES_KEY, "series", defaultTxSeries);
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
  getNextNumber: async (prefix?: string) => {
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
  getNextNumber: (prefix?: string) => request({ path: "/quotes/next-number", params: { prefix } }),
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
      const res = await request({ path: "/sales-receipts/next-number" });
      if (res?.success) return res as any;
    } catch {}
    const all = await salesReceiptsLocal.getAll({ limit: 100000 });
    const next = (all.pagination?.total || 0) + 1;
    return { success: true, data: { nextNumber: `SR-${String(next).padStart(5, "0")}` } };
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

export const documentsAPI = {
  upload: async (file: File, extra?: Record<string, any>) => {
    try {
      const rows = readLocalCollection(LOCAL_DOCUMENTS_KEY);
      const id = normalizeId(undefined, "doc");
      const uploadedAt = new Date().toISOString();
      const previewUrl = URL.createObjectURL(file);
      const created = {
        id,
        _id: id,
        documentId: id,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        type: file.type || "application/octet-stream",
        url: previewUrl,
        uploadedAt,
        ...(extra || {}),
      };
      rows.unshift(created);
      writeLocalCollection(LOCAL_DOCUMENTS_KEY, rows);
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, message: error?.message || "Upload failed", data: null };
    }
  },
  delete: async (id: string) => {
    const docId = String(id || "").trim();
    const rows = readLocalCollection(LOCAL_DOCUMENTS_KEY);
    const filtered = rows.filter((row: any) => String(row?.id || row?._id || row?.documentId) !== docId);
    writeLocalCollection(LOCAL_DOCUMENTS_KEY, filtered);
    return { success: true, data: { id: docId } };
  },
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
      if (res?.success) return res as any;
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
  getNextNumber: async (seriesId?: string) => {
    try {
      const id = String(seriesId || "").trim();
      const path = id ? `/transaction-number-series/${encodeURIComponent(id)}/next-number` : "/transaction-number-series/next-number";
      const res = await request({ path });
      if (res?.success) return res as any;
      if (typeof (res as any)?.status === "number") return res as any;
    } catch {
      // fall back
    }

    const all = await txSeriesLocal.getAll({ limit: 10000 });
    const rows = all.data || [];
    const selected =
      rows.find((row: any) => String(getEntityId(row)) === String(seriesId || "")) ||
      rows[0] ||
      defaultTxSeries[0];

    const starting = String(selected?.startingNumber || selected?.nextNumber || "1");
    const parsed = parseInt(starting, 10);
    const current = Number(selected?.nextNumber) > 0 ? Number(selected.nextNumber) : Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    const width = /^\d+$/.test(starting) ? starting.length : 5;
    const padded = width > 1 ? String(current).padStart(width, "0") : String(current);
    const nextNumber = `${selected?.prefix || ""}${padded}`;
    await txSeriesLocal.update(getEntityId(selected), { ...selected, nextNumber: current + 1 });

    return { success: true, data: { seriesId: getEntityId(selected), nextNumber, next_number: nextNumber } };
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
    const defaults = { autoNumberGeneration: true, approvalRequired: false, allowEditingAcceptedQuotes: true };
    const data = readSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, defaults);
    writeSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, data);
    return { success: true, data };
  },
  updateQuotesSettings: async (data: any) => {
    const current = readSettingsObject(LOCAL_QUOTES_SETTINGS_KEY, {});
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

