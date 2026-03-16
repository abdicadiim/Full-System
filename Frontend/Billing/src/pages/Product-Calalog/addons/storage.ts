import type { AddonRecord, AddonStatus } from "./types";

export const ADDONS_STORAGE_KEY = "inv_addons_v1";

const toStatus = (value: string): AddonStatus => (String(value || "").trim().toLowerCase() === "inactive" ? "Inactive" : "Active");

const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const normalizeAddon = (row: any): AddonRecord => ({
  id: String(row?.id || row?._id || `addon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
  product: String(row?.product || "").trim(),
  addonName: String(row?.addonName || row?.name || "").trim(),
  addonCode: String(row?.addonCode || row?.code || "").trim(),
  description: String(row?.description || "").trim(),
  status: toStatus(row?.status || "Active"),
  pricingModel: String(row?.pricingModel || row?.pricingScheme || "Per Unit"),
  addonType: String(row?.addonType || row?.type || "Recurring"),
  unit: String(row?.unit || row?.unitName || ""),
  billingFrequency: String(row?.billingFrequency || row?.billingIntervalFormatted || ""),
  startingQuantity: row?.startingQuantity,
  endingQuantity: row?.endingQuantity,
  price: num(row?.price, 0),
  imageUrl: row?.imageUrl || "",
  account: String(row?.account || "Sales"),
  taxName: String(row?.taxName || row?.salesTax || ""),
  createdAt: String(row?.createdAt || new Date().toISOString()),
  updatedAt: String(row?.updatedAt || new Date().toISOString()),
});

export const readAddons = () => {
  try {
    const raw = localStorage.getItem(ADDONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const rows = Array.isArray(parsed) ? parsed : [];
    return rows.map(normalizeAddon).filter((row) => row.addonName);
  } catch {
    return [];
  }
};

export const writeAddons = (rows: AddonRecord[]) => {
  localStorage.setItem(ADDONS_STORAGE_KEY, JSON.stringify(rows));
};

