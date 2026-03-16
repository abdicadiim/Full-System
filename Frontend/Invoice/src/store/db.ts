/* eslint-disable @typescript-eslint/no-explicit-any */

type AnyRecord = Record<string, any> & { id: string };

const hasLocalStorage = () => typeof localStorage !== "undefined";

const inMemory = new Map<string, AnyRecord[]>();

const loadTable = (key: string): AnyRecord[] => {
  if (hasLocalStorage()) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return inMemory.get(key) || [];
};

const saveTable = (key: string, rows: AnyRecord[]) => {
  if (hasLocalStorage()) {
    localStorage.setItem(key, JSON.stringify(rows));
    return;
  }
  inMemory.set(key, rows);
};

const uid = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

class Table {
  storageKey: string;
  prefix: string;

  constructor(storageKey: string, prefix = "id") {
    this.storageKey = storageKey;
    this.prefix = prefix;
  }

  uid(prefix = this.prefix) {
    return uid(prefix);
  }

  list(filter: Record<string, any> = {}) {
    const rows = loadTable(this.storageKey);
    const entries = Object.entries(filter || {});
    if (!entries.length) return rows;
    return rows.filter((row) =>
      entries.every(([k, v]) => {
        if (v === undefined || v === null || v === "") return true;
        return row?.[k] === v;
      })
    );
  }

  get(id: string) {
    return loadTable(this.storageKey).find((row) => String(row.id) === String(id)) || null;
  }

  add(record: AnyRecord) {
    const rows = loadTable(this.storageKey);
    const item = { ...record, id: record?.id || this.uid() };
    const idx = rows.findIndex((row) => String(row.id) === String(item.id));
    if (idx >= 0) rows[idx] = item;
    else rows.push(item);
    saveTable(this.storageKey, rows);
    return item;
  }

  update(id: string, patch: Record<string, any>) {
    const rows = loadTable(this.storageKey);
    const idx = rows.findIndex((row) => String(row.id) === String(id));
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch, id: rows[idx].id };
    saveTable(this.storageKey, rows);
    return rows[idx];
  }

  remove(id: string) {
    const rows = loadTable(this.storageKey).filter((row) => String(row.id) !== String(id));
    saveTable(this.storageKey, rows);
    return true;
  }
}

class InvoicesTable extends Table {
  calc(invoice: any) {
    const items = Array.isArray(invoice?.items) ? invoice.items : [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const qty = Number(item?.qty ?? item?.quantity ?? 0);
      const price = Number(item?.price ?? item?.rate ?? 0);
      return sum + qty * price;
    }, 0);
    const tax = Number(invoice?.tax || 0);
    const total = Number(invoice?.total ?? subtotal + tax);
    return { subtotal, tax, total };
  }
}

const seedIfEmpty = (key: string, data: AnyRecord[]) => {
  if (loadTable(key).length === 0) saveTable(key, data);
};

const tableKeys = {
  orgs: "taban_orgs",
  customers: "taban_customers",
  vendors: "taban_vendors",
  invoices: "taban_invoices",
  taxes: "taban_taxes",
  subscriptions: "taban_subscriptions",
  plans: "taban_plans",
  creditNotes: "taban_credit_notes",
};

export const db = {
  init: async () => {
    seedIfEmpty(tableKeys.orgs, [{ id: "org-1", name: "Taban Enterprise" } as AnyRecord]);
    seedIfEmpty(tableKeys.taxes, []);
    seedIfEmpty(tableKeys.customers, []);
    seedIfEmpty(tableKeys.vendors, []);
    seedIfEmpty(tableKeys.invoices, []);
    seedIfEmpty(tableKeys.subscriptions, []);
    seedIfEmpty(tableKeys.plans, []);
    seedIfEmpty(tableKeys.creditNotes, []);
    return true;
  },

  utils: {
    uid,
  },

  orgs: new Table(tableKeys.orgs, "org"),
  customers: new Table(tableKeys.customers, "cus"),
  vendors: new Table(tableKeys.vendors, "ven"),
  invoices: new InvoicesTable(tableKeys.invoices, "INV"),
  taxes: new Table(tableKeys.taxes, "tax"),
  subscriptions: new Table(tableKeys.subscriptions, "sub"),
  plans: new Table(tableKeys.plans, "plan"),
  creditNotes: new Table(tableKeys.creditNotes, "cn"),
};

export default db;
