import React from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, ShieldCheck, Users, X } from "lucide-react";
import { type ContactPersonFormState } from "./CustomerDetail.shared";

type CustomerDetailContactPersonModalProps = {
    open: boolean;
    editingIndex: number | null;
    formData: ContactPersonFormState;
    isSaving: boolean;
    onClose: () => void;
    onSave: () => void | Promise<void>;
    onChange: (next: ContactPersonFormState) => void;
};

export default function CustomerDetailContactPersonModal({
    open,
    editingIndex,
    formData,
    isSaving,
    onClose,
    onSave,
    onChange,
}: CustomerDetailContactPersonModalProps) {
    if (!open || typeof document === "undefined" || !document.body) return null;

    const updateField = (key: keyof ContactPersonFormState, value: string | boolean) => {
        onChange({
            ...formData,
            [key]: value,
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {editingIndex !== null ? "Edit Contact Person" : "Add Contact Person"}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Add the person who represents this customer and choose whether they should have portal access.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="grid gap-4 px-6 py-5">
                    <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
                        <Field label="Salutation">
                            <select
                                value={formData.salutation}
                                onChange={(event) => updateField("salutation", event.target.value)}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="Mr">Mr</option>
                                <option value="Mrs">Mrs</option>
                                <option value="Ms">Ms</option>
                                <option value="Dr">Dr</option>
                                <option value="Prof">Prof</option>
                            </select>
                        </Field>
                        <Field label="First Name">
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(event) => updateField("firstName", event.target.value)}
                            />
                        </Field>
                        <Field label="Last Name">
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(event) => updateField("lastName", event.target.value)}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Email">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(event) => updateField("email", event.target.value)}
                            />
                        </Field>
                        <Field label="Designation">
                            <input
                                type="text"
                                value={formData.designation}
                                onChange={(event) => updateField("designation", event.target.value)}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Work Phone">
                            <input
                                type="text"
                                value={formData.workPhone}
                                onChange={(event) => updateField("workPhone", event.target.value)}
                            />
                        </Field>
                        <Field label="Mobile">
                            <input
                                type="text"
                                value={formData.mobile}
                                onChange={(event) => updateField("mobile", event.target.value)}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Skype">
                            <input
                                type="text"
                                value={formData.skypeName}
                                onChange={(event) => updateField("skypeName", event.target.value)}
                            />
                        </Field>
                        <Field label="Department">
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(event) => updateField("department", event.target.value)}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={formData.isPrimary}
                                onChange={(event) => updateField("isPrimary", event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>
                                <span className="block text-sm font-medium text-gray-900">Primary contact</span>
                                <span className="mt-1 block text-xs text-gray-500">
                                    This contact will be used as the main point of contact for the customer.
                                </span>
                            </span>
                        </label>

                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={formData.enablePortal}
                                onChange={(event) => updateField("enablePortal", event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>
                                <span className="block text-sm font-medium text-gray-900">Portal access</span>
                                <span className="mt-1 block text-xs text-gray-500">
                                    The contact can be enabled for the customer portal if they have an email address.
                                </span>
                            </span>
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
                            isSaving ? "cursor-not-allowed opacity-70" : ""
                        }`}
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Save Contact Person
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {React.isValidElement(children)
                ? React.cloneElement(children as React.ReactElement<any>, {
                      className:
                          "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 " +
                          String((children as any).props?.className || ""),
                  })
                : children}
        </label>
    );
}
