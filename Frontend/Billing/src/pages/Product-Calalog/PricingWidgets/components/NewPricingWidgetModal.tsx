import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

interface NewPricingWidgetModalProps {
  open: boolean;
  onClose: () => void;
}

const PRODUCTS_STORAGE_KEY = "inv_products_v1";

const isActiveProduct = (row: any) => {
  const status = String(row?.status || "").trim().toLowerCase();
  const active = row?.active;
  const isActive = row?.isActive;

  if (active === false || String(active).toLowerCase() === "false") return false;
  if (isActive === false || String(isActive).toLowerCase() === "false") return false;
  if (status && status !== "active") return false;
  return true;
};

const getProductName = (row: any) =>
  String(row?.name || row?.productName || row?.product || row?.title || "").trim();

export default function NewPricingWidgetModal({ open, onClose }: NewPricingWidgetModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");

  const activeProducts = useMemo(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.rows)
          ? parsed.rows
          : Array.isArray(parsed?.data)
            ? parsed.data
            : Array.isArray(parsed?.products)
              ? parsed.products
              : [];

      const seen = new Set<string>();
      return rows
        .filter(isActiveProduct)
        .map((row) => ({
          id: String(row?.id || row?._id || ""),
          name: getProductName(row),
        }))
        .filter((row) => {
          const key = row.name.toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    setName("");
    setProduct("");
    onClose();
  };

  const handleProceed = () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!product.trim()) {
      toast.error("Product is required.");
      return;
    }

    const nextName = name.trim();
    const nextProduct = product.trim();
    handleClose();
    navigate(
      `/products/pricing-widgets/new?name=${encodeURIComponent(nextName)}&product=${encodeURIComponent(nextProduct)}&template=Modern`
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-start justify-center pt-4 px-6 pb-6 overflow-y-auto">
      <div className="w-full max-w-[620px] overflow-hidden rounded-xl border border-[#d8deea] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <h2 className="text-[30px] font-medium leading-none text-[#111827]">New Pricing Widget</h2>
          <button
            type="button"
            onClick={() => handleClose()}
            className="rounded border border-[#2563eb] p-0.5 text-[#ef4444] hover:bg-[#f8fafc] disabled:opacity-60"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-7">
          <div className="grid grid-cols-[170px_1fr] items-center gap-x-4 gap-y-6">
            <label className="text-[14px] text-[#ef4444]">Name*</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded border border-[#cfd5e3] px-3 text-[14px] text-[#334155] outline-none focus:border-[#3b82f6]"
            />

            <label className="text-[14px] text-[#ef4444]">Product*</label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="h-10 rounded border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#334155] outline-none focus:border-[#3b82f6]"
            >
              <option value="">{activeProducts.length === 0 ? "No active products found" : "Select a product"}</option>
              {activeProducts.map((row) => (
                <option key={row.id || row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[#e5e7eb] px-5 py-4">
          <button
            type="button"
            onClick={handleProceed}
            className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-5 py-2 text-[14px] font-medium text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
          >
            Proceed
          </button>
          <button
            type="button"
            onClick={() => handleClose()}
            className="rounded border border-[#cfd5e3] bg-white px-5 py-2 text-[14px] text-[#334155] hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
