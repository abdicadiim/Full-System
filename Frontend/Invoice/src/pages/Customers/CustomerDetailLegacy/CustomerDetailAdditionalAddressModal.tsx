import React from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, X } from "lucide-react";

export default function CustomerDetailAdditionalAddressModal({ detail }: { detail: any }) {
  const {
    additionalAddressFormData,
    editingAdditionalAddressId,
    isSavingAdditionalAddress,
    resetAdditionalAddressModal,
    saveAdditionalAddress,
    setAdditionalAddressFormData,
    setShowAdditionalAddressModal,
    showAdditionalAddressModal,
  } = detail as any;

  if (!showAdditionalAddressModal || typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4"
      onClick={() => {
        setShowAdditionalAddressModal(false);
        resetAdditionalAddressModal();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingAdditionalAddressId ? "Edit Additional Address" : "Add Additional Address"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Store a separate delivery or office address for this customer.</p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            onClick={() => {
              setShowAdditionalAddressModal(false);
              resetAdditionalAddressModal();
            }}
            aria-label="Close"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-6 py-5">
          <Field
            label="Attention"
            value={additionalAddressFormData.attention}
            onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, attention: value }))}
          />
          <Field
            label="Country / Region"
            value={additionalAddressFormData.country}
            onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, country: value }))}
          />
          <Field
            label="Address Line 1"
            value={additionalAddressFormData.street1}
            onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, street1: value }))}
          />
          <Field
            label="Address Line 2"
            value={additionalAddressFormData.street2}
            onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, street2: value }))}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="City"
              value={additionalAddressFormData.city}
              onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, city: value }))}
            />
            <Field
              label="State"
              value={additionalAddressFormData.state}
              onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, state: value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="ZIP Code"
              value={additionalAddressFormData.zipCode}
              onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, zipCode: value }))}
            />
            <Field
              label="Phone"
              value={additionalAddressFormData.phone}
              onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, phone: value }))}
            />
          </div>
          <Field
            label="Fax"
            value={additionalAddressFormData.fax}
            onChange={(value) => setAdditionalAddressFormData((prev: any) => ({ ...prev, fax: value }))}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            className={`inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
              isSavingAdditionalAddress ? "cursor-not-allowed opacity-70" : ""
            }`}
            onClick={saveAdditionalAddress}
            disabled={isSavingAdditionalAddress}
          >
            {isSavingAdditionalAddress ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {editingAdditionalAddressId ? "Update" : "Save"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => {
              setShowAdditionalAddressModal(false);
              resetAdditionalAddressModal();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
