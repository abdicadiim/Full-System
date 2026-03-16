import React, { useState, useEffect } from "react";
import { X, ChevronDown, Search } from "lucide-react";

interface BulkUpdateModalProps {
    onClose: () => void;
    onUpdate: (field: string, value: any) => void;
    selectedCount: number;
}

const BulkUpdateModal = ({ onClose, onUpdate, selectedCount }: BulkUpdateModalProps) => {
    const [field, setField] = useState("");
    const [value, setValue] = useState("");
    const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
    const [fieldSearch, setFieldSearch] = useState("");

    const fields = [
        { label: "Sales Description", value: "salesDescription", type: "text" },
        { label: "Selling Price", value: "sellingPrice", type: "number" },
        { label: "Sales Account", value: "salesAccount", type: "text" },
    ];

    const selectedFieldConfig = fields.find(f => f.value === field);
    const filteredFields = fields.filter((f) =>
        f.label.toLowerCase().includes(fieldSearch.toLowerCase())
    );

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-bulk-field-dropdown]")) {
                setFieldDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const canSubmit = selectedFieldConfig
        ? selectedFieldConfig.type === "number"
            ? value !== "" && !Number.isNaN(Number(value))
            : value.trim() !== ""
        : false;

    const getNormalizedValue = () => {
        if (!selectedFieldConfig) return value;
        if (selectedFieldConfig.type === "number") return Number(value);
        return value;
    };

    const renderInput = () => {
        if (!selectedFieldConfig) return <input disabled className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50" />;

        switch (selectedFieldConfig.type) {
            case "number":
                return (
                    <input
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-4 py-2 border border-blue-400 rounded-md text-sm focus:ring-4 focus:ring-blue-100 outline-none shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all"
                        placeholder="0.00"
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-4 py-2 border border-blue-400 rounded-md text-sm focus:ring-4 focus:ring-blue-100 outline-none shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all"
                    />
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-start justify-center pt-4 px-6 pb-6 overflow-y-auto backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-slate-800">Bulk Update Items</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200 transition-colors">
                        <X size={20} className="text-red-500" />
                    </button>
                </div>

                <div className="p-8">
                    <p className="text-sm text-slate-600 mb-6 font-medium">
                        Choose a field from the dropdown and update with new information.
                    </p>

                    <div className="flex gap-4 items-start mb-6">
                        <div className="flex-1 relative" data-bulk-field-dropdown>
                            <button
                                type="button"
                                onClick={() => setFieldDropdownOpen((prev) => !prev)}
                                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md text-sm text-left text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"
                            >
                                <span>{selectedFieldConfig?.label || "Select a field"}</span>
                                <ChevronDown size={14} className={`transition-transform ${fieldDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {fieldDropdownOpen && (
                                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl p-2">
                                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md mb-2">
                                        <Search size={14} className="text-slate-400" />
                                        <input
                                            value={fieldSearch}
                                            onChange={(e) => setFieldSearch(e.target.value)}
                                            placeholder="Search"
                                            className="w-full border-none outline-none text-sm"
                                        />
                                    </div>

                                    <div className="max-h-44 overflow-auto">
                                        {filteredFields.map((f) => (
                                            <button
                                                key={f.value}
                                                type="button"
                                                onClick={() => {
                                                    setField(f.value);
                                                    setValue("");
                                                    setFieldSearch("");
                                                    setFieldDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                                    field === f.value
                                                        ? "bg-blue-500 text-white"
                                                        : "text-slate-600 hover:bg-slate-100"
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                        {filteredFields.length === 0 && (
                                            <p className="px-3 py-2 text-sm text-slate-400">No fields found</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            {renderInput()}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            <span className="font-bold text-slate-700">Note:</span> All the {selectedCount} selected items will be updated with the new information and you cannot undo this action.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={() => onUpdate(field, getNormalizedValue())}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        disabled={!field || !canSubmit}
                    >
                        Update
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 rounded-md text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkUpdateModal;

