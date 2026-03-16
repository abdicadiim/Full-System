import React, { useMemo, useState } from "react";
import { X, ChevronDown, Search } from "lucide-react";

type BulkFieldType = "text" | "number" | "date" | "select" | "boolean";

export interface BulkFieldOption {
    value: string;
    label: string;
    type?: BulkFieldType;
    options?: Array<{ label: string; value: string | number | boolean }>;
    placeholder?: string;
}

interface BulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (field: string, value: any, selectedField?: BulkFieldOption) => void;
    title: string;
    fieldOptions: Array<string | BulkFieldOption>;
    entityName: string;
}

export default function BulkUpdateModal({ isOpen, onClose, onUpdate, title, fieldOptions, entityName }: BulkUpdateModalProps) {
    const [field, setField] = useState("");
    const [value, setValue] = useState<any>("");
    const [isOpenDropdown, setIsOpenDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const normalizedFieldOptions = useMemo<BulkFieldOption[]>(
        () =>
            fieldOptions.map((opt) =>
                typeof opt === "string"
                    ? { value: opt, label: opt, type: "text" }
                    : { type: "text", ...opt }
            ),
        [fieldOptions]
    );

    const selectedField = normalizedFieldOptions.find((f) => f.value === field);
    const filteredFieldOptions = normalizedFieldOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const hasValue = () => {
        if (!selectedField) return false;
        if (selectedField.type === "boolean") return value === true || value === false || value === "true" || value === "false";
        return value !== "" && value !== null && value !== undefined;
    };

    const renderValueInput = () => {
        if (!selectedField) {
            return (
                <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter new value"
                />
            );
        }

        if (selectedField.type === "date") {
            return (
                <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
            );
        }

        if (selectedField.type === "number") {
            return (
                <input
                    type="number"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={selectedField.placeholder || "Enter amount"}
                />
            );
        }

        if (selectedField.type === "boolean") {
            return (
                <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    value={String(value)}
                    onChange={(e) => setValue(e.target.value === "true")}
                >
                    <option value="">Select</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
            );
        }

        if (selectedField.type === "select") {
            return (
                <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    value={String(value)}
                    onChange={(e) => setValue(e.target.value)}
                >
                    <option value="">{selectedField.placeholder || "Select"}</option>
                    {(selectedField.options || []).map((opt) => (
                        <option key={`${selectedField.value}-${String(opt.value)}`} value={String(opt.value)}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
        }

        return (
            <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={selectedField.placeholder || "Enter new value"}
            />
        );
    };

    const handleSubmit = () => {
        onUpdate(field, value, selectedField);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] backdrop-blur-[2px]">
            <div className="bg-white rounded-lg shadow-2xl max-w-[760px] w-full mx-4 overflow-hidden border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200 transition-colors">
                        <X size={20} className="text-gray-500 hover:text-red-500" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="mb-4 text-[24px] text-gray-600">
                        Choose a field from the dropdown and update with new information.
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                    <div className="mb-4 relative">
                        <div
                                className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer"
                            onClick={() => setIsOpenDropdown(!isOpenDropdown)}
                        >
                                <span className={`text-sm ${field ? "text-gray-900" : "text-gray-400"}`}>
                                    {(selectedField && selectedField.label) || "Select a field"}
                                </span>
                            <ChevronDown size={16} className="text-gray-500" />
                        </div>
                        {isOpenDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-72 overflow-y-auto">
                                    <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                                        <div className="relative">
                                            <Search size={15} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search"
                                                className="w-full rounded-md border border-gray-300 pl-8 pr-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                            />
                                        </div>
                                    </div>
                                    {filteredFieldOptions.map((opt) => (
                                    <div
                                            key={opt.value}
                                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${field === opt.value ? "bg-[#3b82f6] text-white hover:bg-[#3b82f6]" : "text-gray-800"}`}
                                            onClick={() => {
                                                setField(opt.value);
                                                setValue("");
                                                setIsOpenDropdown(false);
                                            }}
                                    >
                                            {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mb-4">
                            {renderValueInput()}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        Note: All selected {entityName} will be updated. This action cannot be undone.
                    </p>
                </div>
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!field || !hasValue()}
                        className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Update
                    </button>
                </div>
            </div>
        </div>
    );
}
