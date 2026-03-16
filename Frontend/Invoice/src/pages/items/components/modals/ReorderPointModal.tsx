import React, { useState } from "react";
import { X } from "lucide-react";

interface ReorderPointModalProps {
    currentValue: number;
    onClose: () => void;
    onSave: (newValue: number) => Promise<void>;
}

export default function ReorderPointModal({ currentValue, onClose, onSave }: ReorderPointModalProps) {
    const [value, setValue] = useState(currentValue.toString());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(parseFloat(value) || 0);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-slate-800">Reorder Point</h2>
                        <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-slate-400">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <div className="mb-2">
                            <label className="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-2 block">
                                Enter Reorder Point
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full h-10 px-3 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

