import React from "react";
import { X, Lock } from "lucide-react";
import { Z } from "../../itemsModel";

interface LockItemModalProps {
    onClose: () => void;
    onLock: (config: string, reason: string) => Promise<void>;
}

export default function LockItemModal({ onClose, onLock }: LockItemModalProps) {
    const [lockConfiguration, setLockConfiguration] = React.useState("");
    const [lockReason, setLockReason] = React.useState("");

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">Lock Transaction</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Configuration <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={lockConfiguration}
                            onChange={(e) => setLockConfiguration(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                        >
                            <option value="">Select Configuration</option>
                            <option value="all">Lock all transactions</option>
                            <option value="sales">Lock sales transactions only</option>
                            <option value="purchase">Lock purchase transactions only</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={lockReason}
                            onChange={(e) => setLockReason(e.target.value)}
                            rows={4}
                            placeholder="Enter reason for locking"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onLock(lockConfiguration, lockReason)}
                        disabled={!lockConfiguration || !lockReason}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Lock Item
                    </button>
                </div>
            </div>
        </div>
    );
}

