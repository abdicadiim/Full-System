import React from "react";

interface TaxDetailPageProps {
    tax: {
        id: string;
        name: string;
        rate: string | number;
        active: boolean;
        isDefault?: boolean;
        type?: string;
    };
    onClose: () => void;
}

export default function TaxDetailPage({ tax, onClose }: TaxDetailPageProps) {
    return (
        <div className="max-w-4xl">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">View Tax</h2>
                    <button
                        onClick={onClose}
                        className="text-sm text-blue-600 hover:text-blue-700"
                    >
                        Close
                    </button>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Tax Name
                        </label>
                        <div className="text-sm text-gray-900">
                            {tax.name}
                            {tax.isDefault && (
                                <span className="ml-2 text-xs text-gray-500 italic">
                                    - Default Tax
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Rate (%)
                        </label>
                        <div className="text-sm text-gray-900">{tax.rate}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Status
                        </label>
                        <div className="text-sm text-gray-900">
                            {tax.active ? "Active" : "Inactive"}
                        </div>
                    </div>
                    {tax.type === "tax-group" && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <span className="text-xs text-blue-800 font-medium">This is a Tax Group</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
