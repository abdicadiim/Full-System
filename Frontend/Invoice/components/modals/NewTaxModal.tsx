import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";

type Props = {
  isOpen?: boolean;
  onClose?: () => void;
  onCreated?: (payload: any) => void;
};

export default function NewTaxModal({ isOpen = false, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [isCompoundTax, setIsCompoundTax] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setRate("");
    setIsCompoundTax(false);
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-start justify-center bg-black/40 px-4 pt-10">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">New Tax</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-gray-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="grid grid-cols-[160px_1fr] items-center gap-4">
            <label className="text-sm font-medium text-red-600">
              Tax Name<span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter tax name"
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[#156372]/20"
            />
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4">
            <label className="text-sm font-medium text-red-600">
              Rate (%)<span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="h-10 w-full rounded-l-lg border border-gray-300 px-3 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[#156372]/20"
              />
              <span className="flex h-10 items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">%</span>
            </div>
          </div>

          <div className="grid grid-cols-[160px_1fr] items-start gap-4">
            <div />
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="compoundTax"
                checked={isCompoundTax}
                onChange={(e) => setIsCompoundTax(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
              />
              <div>
                <label htmlFor="compoundTax" className="cursor-pointer text-sm text-gray-700">
                  This tax is a compound tax.
                </label>
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <Info size={14} />
                  <span>Compound tax is calculated on the amount including other taxes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-start gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              const tax = {
                id: `tax_${Date.now()}`,
                _id: `tax_${Date.now()}`,
                name: name || "New Tax",
                rate: Number(rate || 0),
                isCompound: isCompoundTax,
                active: true,
              };
              onCreated?.({ tax });
            }}
            className="rounded-lg bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f4f5a]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
