import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ThreePhaseImportWizard, { ImportFieldDef, ImportMappedRecord } from "../../shared/ThreePhaseImportWizard";
import { readCoupons, writeCoupons } from "../storage";
import type { CouponDiscountType, CouponRedemptionType, CouponStatus } from "../types";

const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "productName", label: "Product Name", aliases: ["product name", "product", "applicable entity name"] },
  { key: "couponName", label: "Coupon Name", required: true, aliases: ["coupon name", "name"] },
  { key: "couponCode", label: "Coupon Code", required: true, aliases: ["coupon code", "code"] },
  { key: "status", label: "Status", aliases: ["status"] },
  { key: "couponType", label: "Coupon Type", required: true, aliases: ["coupon type", "type", "redemption type"] },
  { key: "duration", label: "Duration", aliases: ["duration", "limited cycles", "cycles"] },
  { key: "discountBy", label: "Discount By", required: true, aliases: ["discount by", "discount type", "discount"] },
  { key: "discountValue", label: "Discount Value", required: true, aliases: ["discount value", "value", "amount"] },
  { key: "validTill", label: "Valid Till", aliases: ["valid till", "validtill", "expiration date", "expiry date"] },
  { key: "maximumRedemption", label: "Maximum Redemption", aliases: ["maximum redemption", "max redemption"] },
  { key: "redeemedCount", label: "Redeemed Count", aliases: ["redeemed count"] },
  { key: "applicableToPlans", label: "Applicable to Plans", aliases: ["applicable to plans"] },
  { key: "appliedPlans", label: "Applied Plans", aliases: ["applied plans"] },
  { key: "applicableToAddons", label: "Applicable to Addons", aliases: ["applicable to addons"] },
  { key: "appliedAddons", label: "Applied Addons", aliases: ["applied addons", "applicable entity"] },
];

const SAMPLE_HEADERS = [
  "Coupon Name",
  "Coupon Code",
  "Status",
  "Coupon Type",
  "Duration",
  "Discount By",
  "Discount Value",
  "Valid Till",
  "Maximum Redemption",
  "Redeemed Count",
  "Applicable Entity Name",
  "Applicable Entity",
];

const SAMPLE_ROWS = [
  ["January Deals", "JAN-23", "Active", "Forever", "-1", "Percentage", "6", "1/31/2030", "70", "10", "Cloud Box", "zsproducts_all_plans"],
  ["New Year Spl", "NEWYEARSPL", "Active", "One Time", "-1", "Flat", "10", "1/5/2030", "0", "0", "ADDSTR007", "addons"],
  ["Christmas Sale", "CHRSTMAS16", "Active", "One Time", "-1", "Percentage", "4", "1/1/2030", "120", "20", "std013", "plans"],
];

const toNum = (value: string, fallback = 0) => {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

const toRedemptionType = (couponTypeRaw: string): CouponRedemptionType => {
  const v = String(couponTypeRaw || "").trim().toLowerCase();
  if (v.includes("forever") || v.includes("unlimited")) return "Unlimited";
  if (v.includes("duration") || v.includes("limited")) return "Limited Cycles";
  return "One Time";
};

const toDiscountType = (discountByRaw: string): CouponDiscountType =>
  String(discountByRaw || "").trim().toLowerCase().includes("flat") ? "Flat" : "Percentage";

const toStatus = (statusRaw: string): CouponStatus => {
  const v = String(statusRaw || "").trim().toLowerCase();
  if (v === "inactive") return "Inactive";
  if (v === "expired") return "Expired";
  return "Active";
};

const mapAssociations = (entityName: string, entityType: string) => {
  const name = String(entityName || "").trim();
  const type = String(entityType || "").trim().toLowerCase();
  if (type.includes("plan")) {
    return { associatedPlans: name || "Selected Plans", associatedAddons: "None" };
  }
  if (type.includes("addon")) {
    return { associatedPlans: "All Plans", associatedAddons: name || "Selected Addons" };
  }
  if (type.includes("all_plans")) {
    return { associatedPlans: "All Plans", associatedAddons: "None" };
  }
  if (type.includes("all_addons")) {
    return { associatedPlans: "All Plans", associatedAddons: "All Addons" };
  }
  return { associatedPlans: "All Plans", associatedAddons: "All Recurring Addons" };
};

export default function ImportCouponsPage() {
  const navigate = useNavigate();

  const handleImport = (rows: ImportMappedRecord[]) => {
    try {
      const existing = readCoupons();
      const prepared = rows.map((row) => {
        const associations = mapAssociations(row.productName, row.appliedAddons);
        const discountType = toDiscountType(row.discountBy);
        const redemptionType = toRedemptionType(row.couponType);
        const maxRedemption = toNum(row.maximumRedemption);
        const durationCycles = toNum(row.duration);

        return {
          id: `coupon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          product: row.productName || "",
          couponName: row.couponName || "",
          couponCode: String(row.couponCode || "").toUpperCase(),
          discountType,
          discountValue: toNum(row.discountValue),
          redemptionType,
          limitedCycles: redemptionType === "Limited Cycles" ? durationCycles : 0,
          maxRedemption,
          expirationDate: row.validTill || "",
          status: toStatus(row.status),
          associatedPlans: row.appliedPlans || associations.associatedPlans,
          associatedAddons: row.appliedAddons || associations.associatedAddons,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      writeCoupons([...prepared, ...existing]);
      toast.success(`${prepared.length} coupon(s) imported successfully.`);
      navigate("/products/coupons");
    } catch (error) {
      console.error(error);
      toast.error("Failed to import coupons.");
    }
  };

  return (
    <ThreePhaseImportWizard
      entityLabel="Coupon"
      entityPluralLabel="Coupons"
      fields={IMPORT_FIELDS}
      sampleHeaders={SAMPLE_HEADERS}
      sampleRows={SAMPLE_ROWS}
      sampleFileName="sample_coupons_advanced.csv"
      onCancel={() => navigate("/products/coupons")}
      onImport={handleImport}
    />
  );
}
