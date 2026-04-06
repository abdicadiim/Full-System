import React from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, X } from "lucide-react";
import { type AddressFormState } from "./CustomerDetail.shared";

type CustomerDetailAdditionalAddressModalProps = {
    open: boolean;
    editingAddressId: string | null;
    formData: AddressFormState;
    isSaving: boolean;
    onClose: () => void;
    onSave: () => void | Promise<void>;
    onChange: (next: AddressFormState) => void;
};

export default function CustomerDetailAdditionalAddressModal({
    open,
    editingAddressId,
    formData,
    isSaving,
    onClose,
    onSave,
    onChange,
}: CustomerDetailAdditionalAddressModalProps) {
    if (!open || typeof document === "undefined" || !document.body) return null;

    const updateField = (key: keyof AddressFormState, value: string) => {
        onChange({
            ...formData,
            [key]: value,
        });
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
            onClick={onClose}
        >
            <div
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {editingAddressId ? "Edit Additional Address" : "Add Additional Address"}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Store a separate delivery, billing, or office address for this customer.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="grid gap-4 px-6 py-5">
                    <Field label="Attention" value={formData.attention} onChange={(value) => updateField("attention", value)} />
                    <Field label="Country / Region" value={formData.country} onChange={(value) => updateField("country", value)} />
                    <Field label="Address Line 1" value={formData.street1} onChange={(value) => updateField("street1", value)} />
                    <Field label="Address Line 2" value={formData.street2} onChange={(value) => updateField("street2", value)} />

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="City" value={formData.city} onChange={(value) => updateField("city", value)} />
                        <Field label="State" value={formData.state} onChange={(value) => updateField("state", value)} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="ZIP Code" value={formData.zipCode} onChange={(value) => updateField("zipCode", value)} />
                        <Field label="Phone" value={formData.phone} onChange={(value) => updateField("phone", value)} />
                    </div>

                    <Field label="Fax" value={formData.fax} onChange={(value) => updateField("fax", value)} />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <button
                        type="button"
                        className={`inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
                            isSaving ? "cursor-not-allowed opacity-70" : ""
                        }`}
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {editingAddressId ? "Update Address" : "Save Address"}
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={onClose}
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
        </label>
    );
}
