import type { CouponDiscountType, CouponRecord, CouponRedemptionType, CouponStatus } from "./types";

export const COUPONS_STORAGE_KEY = "inv_coupons_v1";

const toStatus = (value: string): CouponStatus => {
  const v = String(value || "").trim().toLowerCase();
  if (v === "inactive") return "Inactive";
  if (v === "expired") return "Expired";
  return "Active";
};

const toDiscountType = (value: string): CouponDiscountType => {
  const v = String(value || "").trim().toLowerCase();
  return v === "flat" ? "Flat" : "Percentage";
};

const toRedemptionType = (value: string): CouponRedemptionType => {
  const v = String(value || "").trim().toLowerCase();
  if (v.includes("unlimited")) return "Unlimited";
  if (v.includes("limited")) return "Limited Cycles";
  return "One Time";
};

const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const normalizeCoupon = (row: any): CouponRecord => ({
  id: String(row?.id || row?._id || `coupon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
  product: String(row?.product || "").trim(),
  couponName: String(row?.couponName || row?.name || "").trim(),
  couponCode: String(row?.couponCode || row?.code || "").trim(),
  discountType: toDiscountType(row?.discountType || row?.discount || "Percentage"),
  discountValue: num(row?.discountValue, 0),
  redemptionType: toRedemptionType(row?.redemptionType || "One Time"),
  limitedCycles: num(row?.limitedCycles, 0),
  maxRedemption: num(row?.maxRedemption, 0),
  associatedPlans: String(row?.associatedPlans || "All Plans"),
  associatedAddons: String(row?.associatedAddons || "None"),
  expirationDate: String(row?.expirationDate || ""),
  status: toStatus(row?.status || "Active"),
  createdAt: String(row?.createdAt || new Date().toISOString()),
  updatedAt: String(row?.updatedAt || new Date().toISOString()),
});

export const readCoupons = () => {
  try {
    const raw = localStorage.getItem(COUPONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const rows = Array.isArray(parsed) ? parsed : [];
    return rows.map(normalizeCoupon).filter((row) => row.couponName && row.couponCode);
  } catch {
    return [];
  }
};

export const writeCoupons = (rows: CouponRecord[]) => {
  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(rows));
};

export const createCoupon = (input: Partial<CouponRecord>) => {
  const rows = readCoupons();
  const now = new Date().toISOString();
  const record = normalizeCoupon({ ...input, createdAt: now, updatedAt: now });
  writeCoupons([record, ...rows]);
  return record;
};

export const updateCoupon = (id: string, patch: Partial<CouponRecord>) => {
  const rows = readCoupons();
  const updated = rows.map((row) => (row.id === id ? normalizeCoupon({ ...row, ...patch, updatedAt: new Date().toISOString() }) : row));
  writeCoupons(updated);
  return updated;
};

export const deleteCoupon = (id: string) => {
  const rows = readCoupons();
  const updated = rows.filter((row) => row.id !== id);
  writeCoupons(updated);
  return updated;
};

