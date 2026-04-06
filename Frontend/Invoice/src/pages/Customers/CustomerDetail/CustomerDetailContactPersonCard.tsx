import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { getContactPersonName } from "./CustomerDetail.shared";

type CustomerDetailContactPersonCardProps = {
    person: any;
    isPrimary?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onMakePrimary?: () => void;
};

export default function CustomerDetailContactPersonCard({
    person,
    isPrimary,
    onEdit,
    onDelete,
    onMakePrimary,
}: CustomerDetailContactPersonCardProps) {
    const displayName = getContactPersonName(person);
    const contactLine = [person?.email, person?.mobile || person?.workPhone].filter(Boolean).join(" · ");

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-900">{displayName}</div>
                        {isPrimary && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                                Primary
                            </span>
                        )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">{contactLine || "No email or phone on file"}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
                        {person?.hasPortalAccess || person?.enablePortal ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Portal access</span>
                        ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Portal disabled</span>
                        )}
                    </div>
                </div>

                {(onEdit || onDelete || onMakePrimary) && (
                    <div className="flex flex-col items-end gap-2">
                        {onMakePrimary && !isPrimary && (
                            <button
                                type="button"
                                className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-700 hover:bg-blue-100"
                                onClick={onMakePrimary}
                            >
                                Make Primary
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            {onEdit && (
                                <button
                                    type="button"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                                    onClick={onEdit}
                                    aria-label="Edit contact person"
                                >
                                    <Edit size={14} />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    type="button"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                                    onClick={onDelete}
                                    aria-label="Delete contact person"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
