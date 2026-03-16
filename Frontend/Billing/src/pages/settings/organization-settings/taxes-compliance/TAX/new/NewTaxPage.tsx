import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Info } from "lucide-react";
import { createTaxLocal, getTaxByIdLocal, isTaxGroupRecord, updateTaxLocal } from "../storage";

export default function NewTaxPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [taxName, setTaxName] = useState("");
    const [taxRate, setTaxRate] = useState("");
    const [isCompoundTax, setIsCompoundTax] = useState(false);
    const [isDigitalServiceTax, setIsDigitalServiceTax] = useState(false);
    const [digitalServiceCountry, setDigitalServiceCountry] = useState("");
    const [trackTaxByCountryScheme, setTrackTaxByCountryScheme] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);

    useEffect(() => {
        const loadTax = () => {
            if (!isEditMode || !id) {
                setIsLoading(false);
                return;
            }

            try {
                const tax = getTaxByIdLocal(id);
                if (!tax || isTaxGroupRecord(tax)) {
                    throw new Error("Tax not found");
                }

                setTaxName(tax.name || "");
                setTaxRate(tax.rate !== undefined && tax.rate !== null ? String(tax.rate) : "");
                setIsCompoundTax(Boolean(tax.isCompound));
                setIsDigitalServiceTax(Boolean(tax.isDigitalServiceTax));
                setDigitalServiceCountry(tax.digitalServiceCountry || "");
                setTrackTaxByCountryScheme(Boolean(tax.trackTaxByCountryScheme));
            } catch (err: any) {
                console.error("Error loading tax:", err);
                alert("Failed to load tax");
                navigate("/settings/taxes");
            } finally {
                setIsLoading(false);
            }
        };

        loadTax();
    }, [id, isEditMode, navigate]);

    const handleSave = () => {
        if (!taxName || !taxRate) {
            alert("Tax name and rate are required.");
            return;
        }

        try {
            const payload = {
                name: taxName.trim(),
                rate: parseFloat(taxRate),
                type: "both",
                isCompound: isCompoundTax,
                isDigitalServiceTax,
                digitalServiceCountry: isDigitalServiceTax ? digitalServiceCountry : "",
                trackTaxByCountryScheme,
            };

            if (isEditMode && id) {
                const updated = updateTaxLocal(id, payload);
                if (!updated) throw new Error("Failed to update tax");
            } else {
                createTaxLocal(payload);
            }

            navigate("/settings/taxes");
        } catch (err: any) {
            console.error("Error saving tax:", err);
            alert(err.message || (isEditMode ? "Failed to update tax" : "Failed to create tax"));
        }
    };

    const handleCancel = () => {
        navigate("/settings/taxes");
    };

    return (
        <div className="max-w-2xl">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">{isEditMode ? "Edit Tax" : "New Tax"}</h2>

                {isLoading && (
                    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                        Loading tax...
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tax Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={taxName}
                            onChange={(e) => setTaxName(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter tax name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rate (%) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                                step="0.01"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="compoundTax"
                            checked={isCompoundTax}
                            onChange={(e) => setIsCompoundTax(e.target.checked)}
                            className="mt-1 h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                        />
                        <div className="flex-1">
                            <label htmlFor="compoundTax" className="text-sm text-gray-700 cursor-pointer">
                                This tax is a compound tax.
                            </label>
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                <Info size={14} />
                                <span>Compound tax is calculated on the amount including other taxes</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="digitalServiceTax"
                                checked={isDigitalServiceTax}
                                onChange={(e) => setIsDigitalServiceTax(e.target.checked)}
                                className="mt-1 h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                            />
                            <label htmlFor="digitalServiceTax" className="text-sm text-gray-700 cursor-pointer">
                                This tax applies to digital services sold to overseas customers.
                            </label>
                        </div>

                        {isDigitalServiceTax && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        value={digitalServiceCountry}
                                        onChange={(e) => setDigitalServiceCountry(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Germany"
                                    />
                                </div>
                                <div className="flex items-center gap-3 mt-7">
                                    <input
                                        type="checkbox"
                                        id="trackTaxByCountryScheme"
                                        checked={trackTaxByCountryScheme}
                                        onChange={(e) => setTrackTaxByCountryScheme(e.target.checked)}
                                        className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                                    />
                                    <label htmlFor="trackTaxByCountryScheme" className="text-sm text-gray-700 cursor-pointer">
                                        Track country-wise for VAT MOSS/OSS/IOSS
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#156372] rounded-lg hover:bg-[#0f4e5a] disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isEditMode ? "Update" : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
