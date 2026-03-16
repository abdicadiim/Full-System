import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function AddExchangeRateModal({ currencyCode, baseCurrencyCode, onClose, onSave }) {
    const [date, setDate] = useState("");
    const [rate, setRate] = useState("");

    const handleSave = () => {
        if (!date || !rate) {
            alert("Please fill in all required fields");
            return;
        }
        onSave({ date, rate });
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Add Exchange Rate - {currencyCode}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded transition"
                    >
                        <X size={20} className="text-blue-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-red-600 mb-2">
                            Date*
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                            placeholder="dd MMM yyyy"
                        />
                    </div>

                    {/* Exchange Rate */}
                    <div>
                        <label className="block text-sm font-medium text-red-600 mb-2">
                            Exchange Rate (in {baseCurrencyCode})*
                        </label>
                        <input
                            type="number"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-start gap-3 p-6 pt-0">
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Save
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
