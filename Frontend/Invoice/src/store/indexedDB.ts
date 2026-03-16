/* eslint-disable @typescript-eslint/no-explicit-any */

let opened = false;

const tableKey = (name: string) => `taban_indexed_${name}`;

const load = (name: string): any[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(tableKey(name));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const save = (name: string, rows: any[]) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(tableKey(name), JSON.stringify(rows));
};

const createCollection = (name: string) => ({
  async toArray() {
    return load(name);
  },
  async get(id: string) {
    return load(name).find((row) => String(row.id) === String(id)) || null;
  },
  async add(payload: any) {
    const rows = load(name);
    rows.push(payload);
    save(name, rows);
    return payload;
  },
  async put(payload: any) {
    const rows = load(name);
    const idx = rows.findIndex((row) => String(row.id) === String(payload?.id));
    if (idx >= 0) rows[idx] = payload;
    else rows.push(payload);
    save(name, rows);
    return payload;
  },
  async bulkPut(payloads: any[]) {
    const rows = load(name);
    const map = new Map(rows.map((row) => [String(row.id), row]));
    (payloads || []).forEach((payload) => {
      if (!payload?.id) return;
      map.set(String(payload.id), payload);
    });
    save(name, Array.from(map.values()));
  },
  async bulkDelete(ids: string[]) {
    const idSet = new Set((ids || []).map(String));
    save(
      name,
      load(name).filter((row) => !idSet.has(String(row.id)))
    );
  },
});

const dbIndexed = {
  async open() {
    opened = true;
    return true;
  },
  quotes: createCollection("quotes"),
};

export const isOpen = () => opened;

export default dbIndexed;
