import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    entityName: string;
    count?: number;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, entityName, count }: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/40 pt-24 backdrop-blur-[2px]">
            <div className="mx-4 w-full max-w-[520px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3 text-red-600">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
                            <AlertTriangle size={18} />
                        </span>
                        <div>
                            <h2 className="text-[15px] font-semibold text-slate-800">Delete {entityName}?</h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                        <X size={18} className="text-gray-500 hover:text-red-500" />
                    </button>
                </div>
                <div className="px-6 py-5">
                    <p className="text-sm leading-6 text-slate-600">
                        Are you sure you want to delete {count && count > 1 ? `these ${count} ${entityName}` : `this ${entityName}`}? This action cannot be undone.
                    </p>
                </div>
                <div className="flex justify-end gap-3 border-t border-gray-100 bg-slate-50 px-6 py-4">
                    <button onClick={onClose} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onClick={() => { onConfirm(); onClose(); }} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
