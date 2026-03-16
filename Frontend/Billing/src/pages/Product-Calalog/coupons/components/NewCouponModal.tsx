import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { createCoupon } from "../storage";
import type { CouponDiscountType, CouponRedemptionType, CouponStatus } from "../types";

interface NewCouponModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialProduct?: string;
}

const PRODUCTS_STORAGE_KEY = "inv_products_v1";

export default function NewCouponModal({ open, onClose, onSaved, initialProduct = "" }: NewCouponModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    product: initialProduct,
    couponName: "",
    couponCode: "",
    discountType: "Percentage" as CouponDiscountType,
    discountValue: "",
    redemptionType: "One Time" as CouponRedemptionType,
    limitedCycles: "",
    maxRedemption: "",
    expirationDate: "",
    status: "Active" as CouponStatus,
    associatedPlans: "All Plans",
    associatedAddons: "None",
  });

  const products = useMemo(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(parsed) ? parsed : [];
      return Array.from(new Set(rows.map((row: any) => String(row?.name || "").trim()).filter(Boolean)));
    } catch {
      return [];
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!initialProduct) return;
    setForm((prev) => ({ ...prev, product: prev.product || initialProduct }));
  }, [open, initialProduct]);

  if (!open) return null;

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!form.product) return toast.error("Product is required.");
    if (!form.couponName.trim()) return toast.error("Coupon Name is required.");
    if (!form.couponCode.trim()) return toast.error("Coupon Code is required.");
    if (!form.discountValue || Number(form.discountValue) <= 0) return toast.error("Discount value must be greater than 0.");

    setIsSaving(true);
    try {
      createCoupon({
        product: form.product,
        couponName: form.couponName.trim(),
        couponCode: form.couponCode.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        redemptionType: form.redemptionType,
        limitedCycles: Number(form.limitedCycles || 0),
        maxRedemption: Number(form.maxRedemption || 0),
        expirationDate: form.expirationDate,
        status: form.status,
        associatedPlans: form.associatedPlans,
        associatedAddons: form.associatedAddons,
      });
      toast.success("Coupon created successfully");
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create coupon");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "h-10 w-full rounded border border-[#cfd5e3] bg-white px-3 text-sm text-[#1f2937] outline-none focus:border-[#3b82f6]";

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[760px] rounded-xl border border-[#d8deea] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
          <h2 className="text-xl font-semibold text-[#111827]">New Coupon</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#64748b] hover:bg-[#f1f5f9]">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-[#ef4444]">Product*</label>
            <select name="product" value={form.product} onChange={onChange} className={inputClass}>
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#ef4444]">Coupon Name*</label>
            <input name="couponName" value={form.couponName} onChange={onChange} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#ef4444]">Coupon Code*</label>
            <input name="couponCode" value={form.couponCode} onChange={onChange} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-[#111827]">Discount Type</label>
              <select name="discountType" value={form.discountType} onChange={onChange} className={inputClass}>
                <option>Percentage</option>
                <option>Flat</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#ef4444]">Discount Value*</label>
              <input type="number" name="discountValue" value={form.discountValue} onChange={onChange} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#111827]">Redemption Type</label>
            <select name="redemptionType" value={form.redemptionType} onChange={onChange} className={inputClass}>
              <option>One Time</option>
              <option>Unlimited</option>
              <option>Limited Cycles</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#111827]">Limited Cycles</label>
            <input
              type="number"
              name="limitedCycles"
              value={form.limitedCycles}
              onChange={onChange}
              className={inputClass}
              disabled={form.redemptionType !== "Limited Cycles"}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#111827]">Maximum Redemption</label>
            <input type="number" name="maxRedemption" value={form.maxRedemption} onChange={onChange} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#111827]">Expiration Date</label>
            <input type="date" name="expirationDate" value={form.expirationDate} onChange={onChange} className={inputClass} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#e5e7eb] bg-[#f8fafc] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded border border-[#cfd5e3] bg-white px-5 py-2 text-sm text-[#334155] hover:bg-[#f8fafc]">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-6 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-b-[4px] disabled:hover:brightness-100"
            style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
