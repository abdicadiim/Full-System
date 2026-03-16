/* eslint-disable @typescript-eslint/no-explicit-any */

const STORAGE_KEY = "taban_items";

const load = () => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const save = (rows: any[]) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

const uid = (prefix = "item") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const itemsStore = {
  async list() {
    return load();
  },
  async get(id: string) {
    return load().find((item) => String(item.id) === String(id)) || null;
  },
  async add(item: any) {
    const rows = load();
    const entry = { ...item, id: item?.id || uid() };
    rows.push(entry);
    save(rows);
    return entry;
  },
  async update(id: string, patch: any) {
    const rows = load();
    const idx = rows.findIndex((item) => String(item.id) === String(id));
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch, id: rows[idx].id };
    save(rows);
    return rows[idx];
  },
  async remove(id: string) {
    save(load().filter((item) => String(item.id) !== String(id)));
    return true;
  },
};

export default itemsStore;
