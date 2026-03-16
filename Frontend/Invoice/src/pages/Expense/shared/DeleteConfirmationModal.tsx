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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] backdrop-blur-[2px]">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle size={20} />
                        <h2 className="text-lg font-semibold">Delete {entityName}</h2>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200 transition-colors">
                        <X size={20} className="text-gray-500 hover:text-red-500" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-700">
                        Are you sure you want to delete {count && count > 1 ? `these ${count} ${entityName}` : `this ${entityName}`}? This action cannot be undone.
                    </p>
                </div>
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
