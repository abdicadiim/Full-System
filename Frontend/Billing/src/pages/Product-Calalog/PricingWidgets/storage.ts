import type { PricingWidgetRecord, PricingWidgetStatus } from "./types";

export const PRICING_WIDGETS_STORAGE_KEY = "inv_pricing_widgets_v1";

const toStatus = (value: string): PricingWidgetStatus => (String(value || "").trim().toLowerCase() === "inactive" ? "Inactive" : "Active");

export const normalizePricingWidget = (row: any): PricingWidgetRecord => ({
  id: String(row?.id || row?._id || `widget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
  name: String(row?.name || row?.widgetName || "").trim(),
  product: String(row?.product || "").trim(),
  createdBy: String(row?.createdBy || row?.createdByName || row?.created_by || row?.ownerName || "").trim(),
  template: String(row?.template || "Classic"),
  status: toStatus(row?.status || "Active"),
  selectedPlans: String(row?.selectedPlans || row?.plans || ""),
  caption: String(row?.caption || ""),
  buttonLabel: String(row?.buttonLabel || "Subscribe"),
  buttonColor: String(row?.buttonColor || "#1b5e6a"),
  createdAt: String(row?.createdAt || new Date().toISOString()),
  updatedAt: String(row?.updatedAt || new Date().toISOString()),
});

export const readPricingWidgets = () => {
  try {
    const raw = localStorage.getItem(PRICING_WIDGETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const rows = Array.isArray(parsed) ? parsed : [];
    return rows.map(normalizePricingWidget).filter((row) => row.name);
  } catch {
    return [];
  }
};

export const writePricingWidgets = (rows: PricingWidgetRecord[]) => {
  localStorage.setItem(PRICING_WIDGETS_STORAGE_KEY, JSON.stringify(rows));
};

export const createPricingWidget = (input: Partial<PricingWidgetRecord>) => {
  const rows = readPricingWidgets();
  const now = new Date().toISOString();
  const record = normalizePricingWidget({ ...input, createdAt: now, updatedAt: now });
  writePricingWidgets([record, ...rows]);
  return record;
};

export const updatePricingWidget = (id: string, patch: Partial<PricingWidgetRecord>) => {
  const rows = readPricingWidgets();
  const updated = rows.map((row) => (row.id === id ? normalizePricingWidget({ ...row, ...patch, updatedAt: new Date().toISOString() }) : row));
  writePricingWidgets(updated);
  return updated;
};

export const deletePricingWidget = (id: string) => {
  const rows = readPricingWidgets();
  const updated = rows.filter((row) => row.id !== id);
  writePricingWidgets(updated);
  return updated;
};
