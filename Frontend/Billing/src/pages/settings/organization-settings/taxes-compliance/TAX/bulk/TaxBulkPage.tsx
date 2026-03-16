import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Info, Check } from "lucide-react";
import { createTaxLocal } from "../storage";

export default function TaxBulkPage() {
    const navigate = useNavigate();
    const [taxEntries, setTaxEntries] = useState([
        { id: 1, name: "", rate: "", status: "idle" },
        { id: 2, name: "", rate: "", status: "idle" },
        { id: 3, name: "", rate: "", status: "idle" }
    ]);
    const [isCompoundTax, setIsCompoundTax] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddTax = () => {
        setTaxEntries([...taxEntries, { id: Date.now(), name: "", rate: "", status: "idle" }]);
    };

    const handleRemoveTax = (id: number) => {
        if (taxEntries.length > 1) {
            setTaxEntries(taxEntries.filter(entry => entry.id !== id));
        }
    };

    const handleTaxChange = (id: number, field: string, value: any) => {
        setTaxEntries(prev =>
            prev.map(entry =>
                entry.id === id ? { ...entry, [field]: value, status: "idle" } : entry
            )
        );
    };

    const handleSave = async () => {
        const validEntries = taxEntries.filter(entry => entry.name && entry.rate);
        const entriesToSave = validEntries.filter(entry => entry.status !== "saved");

        if (entriesToSave.length === 0) return;

        setIsSaving(true);

        for (const entry of entriesToSave) {
            handleTaxChange(entry.id, "status", "saving");

            try {
                createTaxLocal({
                    name: isCompoundTax ? `${entry.name} (Compound tax)` : entry.name,
                    rate: parseFloat(entry.rate),
                    type: "both",
                    isCompound: isCompoundTax,
                });

                handleTaxChange(entry.id, "status", "saved");
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (err) {
                console.error("Error saving tax:", err);
                handleTaxChange(entry.id, "status", "error");
            }
        }

        setIsSaving(false);

        const allSaved = taxEntries
            .filter(e => e.name && e.rate)
            .every(e => e.status === "saved");

        if (allSaved) {
            setTimeout(() => navigate("/settings/taxes"), 1000);
        }
    };

    const handleCancel = () => {
        navigate("/settings/taxes");
    };

    return (
        <div className="p-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCancel}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-semibold text-gray-900">Create Taxes in Bulk</h1>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 8a2 2 0 100-4 2 2 0 000 4z" fill="#6b7280" />
                        <path d="M8 10a6 6 0 100-12 6 6 0 000 12zM8 2a4 4 0 110 8 4 4 0 010-8z" stroke="#6b7280" strokeWidth="1.5" />
                    </svg>
                    Find Accountants
                </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-6">
                    {/* Tax Entries */}
                    {taxEntries.map((entry, index) => (
                        <div key={entry.id} className="grid grid-cols-12 gap-4 items-start">
                            {/* Tax Name */}
                            <div className="col-span-12 sm:col-span-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tax Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={entry.name}
                                    onChange={(e) => handleTaxChange(entry.id, "name", e.target.value)}
                                    disabled={entry.status === "saved" || entry.status === "saving"}
                                    className={`w-full h-10 px-3 rounded-lg border ${entry.status === "error" ? "border-red-300 ring-2 ring-red-100" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500`}
                                    placeholder="Enter tax name"
                                    autoFocus={index === 0}
                                />
                            </div>

                            {/* Rate */}
                            <div className="col-span-12 sm:col-span-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rate (%) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={entry.rate}
                                        onChange={(e) => handleTaxChange(entry.id, "rate", e.target.value)}
                                        disabled={entry.status === "saved" || entry.status === "saving"}
                                        className={`w-full h-10 px-3 pr-8 rounded-lg border ${entry.status === "error" ? "border-red-300 ring-2 ring-red-100" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500`}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="col-span-12 sm:col-span-2 pt-8 flex items-center gap-2">
                                {entry.status === "saving" && (
                                    <span className="text-xs text-blue-600 font-medium animate-pulse">Saving...</span>
                                )}
                                {entry.status === "saved" && (
                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                        <Check size={14} /> Saved
                                    </span>
                                )}
                                {entry.status === "error" && (
                                    <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                                        <Info size={14} /> Error
                                    </span>
                                )}

                                {entry.status !== "saved" && entry.status !== "saving" && taxEntries.length > 1 && (
                                    <button
                                        onClick={() => handleRemoveTax(entry.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg ml-auto"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add Tax Button */}
                    <button
                        onClick={handleAddTax}
                        className="px-4 py-2 text-sm font-medium text-[#156372] bg-[#f0f9fa] rounded-lg hover:bg-[#e1f5f7] flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Tax
                    </button>

                    {/* Compound Tax Checkbox */}
                    <div className="flex items-start gap-3 pt-4 border-t border-gray-200">
                        <input
                            type="checkbox"
                            id="compoundTaxBulk"
                            checked={isCompoundTax}
                            onChange={(e) => setIsCompoundTax(e.target.checked)}
                            className="mt-1 h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                        />
                        <div className="flex-1">
                            <label htmlFor="compoundTaxBulk" className="text-sm text-gray-700 cursor-pointer">
                                This tax is a compound tax.
                            </label>
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                <Info size={14} />
                                <span>Compound tax is calculated on the amount including other taxes</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#156372] rounded-lg hover:bg-[#0f4e5a] disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

