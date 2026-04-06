import React from "react";
import { createPortal } from "react-dom";
import { Loader2, ShieldCheck, Users, X } from "lucide-react";
import { getContactPersonId, getContactPersonName } from "./CustomerDetail.shared";

type CustomerDetailPortalModalProps = {
    open: boolean;
    customerName: string;
    contactPersons: any[];
    selectedContactPersonId: string;
    isSaving: boolean;
    onClose: () => void;
    onSave: () => void | Promise<void>;
    onSelectedContactPersonIdChange: (value: string) => void;
};

export default function CustomerDetailPortalModal({
    open,
    customerName,
    contactPersons,
    selectedContactPersonId,
    isSaving,
    onClose,
    onSave,
    onSelectedContactPersonIdChange,
}: CustomerDetailPortalModalProps) {
    if (!open || typeof document === "undefined" || !document.body) return null;

    const resolvedSelectedId = String(
        selectedContactPersonId || getContactPersonId(contactPersons[0], 0) || ""
    ).trim();

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Enable Portal Access</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Choose the contact person who should receive portal access for {customerName}.
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

                <div className="px-6 py-5">
                    {contactPersons.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            There are no contact persons yet. Add one before enabling portal access.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {contactPersons.map((person, index) => {
                                const personId = getContactPersonId(person, index);
                                const checked = personId === resolvedSelectedId;
                                return (
                                    <button
                                        key={personId}
                                        type="button"
                                        onClick={() => onSelectedContactPersonIdChange(personId)}
                                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                                            checked
                                                ? "border-blue-200 bg-blue-50"
                                                : "border-gray-200 bg-white hover:bg-gray-50"
                                        }`}
                                    >
                                        <div
                                            className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
                                                checked ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            <Users size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {getContactPersonName(person)}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {[person?.email, person?.mobile || person?.workPhone].filter(Boolean).join(" · ") ||
                                                    "No email or phone on file"}
                                            </div>
                                        </div>
                                        <div
                                            className={`mt-1 h-4 w-4 rounded-full border ${
                                                checked ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                                            }`}
                                            aria-hidden="true"
                                        >
                                            {checked && <ShieldCheck size={14} className="text-white" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
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
                            isSaving || contactPersons.length === 0 ? "cursor-not-allowed opacity-70" : ""
                        }`}
                        onClick={onSave}
                        disabled={isSaving || contactPersons.length === 0}
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        Enable Portal
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
