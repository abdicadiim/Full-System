import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import { useOrganizationBranding } from "../../../../hooks/useOrganizationBranding";

interface Option {
    id: string;
    label: string;
}

interface PlansBulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (field: string, value: string) => void;
    entityType: "plans" | "products";
}

const ACCOUNT_OPTIONS = [
    "Advance Tax",
    "Employee Advance",
    "Goods In Transit",
    "Prepaid Expenses",
    "Furniture and Equipment",
    "Employee Reimbursements",
    "Opening Balance Adjustments",
    "Sales",
];

export default function PlansBulkUpdateModal({
    isOpen,
    onClose,
    onUpdate,
    entityType,
}: PlansBulkUpdateModalProps) {
    const { accentColor } = useOrganizationBranding();
    const [selectedField, setSelectedField] = useState<Option | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [textValue, setTextValue] = useState("");
    const [booleanValue, setBooleanValue] = useState<"check" | "uncheck">("check");
    const [accountValue, setAccountValue] = useState("");
    const [accountSearch, setAccountSearch] = useState("");
    const [accountOpen, setAccountOpen] = useState(false);
    const [statusValue, setStatusValue] = useState("Active");
    const accountRef = useRef<HTMLDivElement>(null);

    const planOptions: Option[] = [
        { id: "description", label: "Plan Description" },
        { id: "salesAccount", label: "Sales Account" },
        { id: "showInWidget", label: "Show in Widget" },
        { id: "showInPortal", label: "Show in Portal" },
        { id: "price", label: "Price" },
    ];

    const productOptions: Option[] = [
        { id: "description", label: "Description" },
        { id: "status", label: "Status" },
    ];

    const options = entityType === "plans" ? planOptions : productOptions;
    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredAccounts = useMemo(
        () =>
            ACCOUNT_OPTIONS.filter((acc) =>
                acc.toLowerCase().includes(accountSearch.toLowerCase())
            ),
        [accountSearch]
    );

    useEffect(() => {
        setTextValue("");
        setBooleanValue("check");
        setAccountValue("");
        setAccountSearch("");
        setAccountOpen(false);
        setStatusValue("Active");
    }, [selectedField?.id]);

    useEffect(() => {
        const onOutside = (event: MouseEvent) => {
            if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
                setAccountOpen(false);
            }
        };
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    const isPriceField = selectedField?.id === "price";
    const isDescriptionField = selectedField?.id === "description";
    const isBooleanField = selectedField?.id === "showInWidget" || selectedField?.id === "showInPortal";
    const isAccountField = selectedField?.id === "salesAccount";
    const isStatusField = selectedField?.id === "status";

    const canUpdate = useMemo(() => {
        if (!selectedField) return false;
        if (isAccountField) return Boolean(accountValue);
        if (isPriceField) return textValue.trim() !== "" && Number.isFinite(Number(textValue));
        if (isStatusField) return Boolean(statusValue);
        return true;
    }, [selectedField, isAccountField, accountValue, isPriceField, textValue, isStatusField, statusValue]);

    if (!isOpen) return null;

    const submitUpdate = () => {
        if (!selectedField) return;
        let payload = textValue;
        if (isBooleanField) payload = booleanValue === "check" ? "true" : "false";
        if (isAccountField) payload = accountValue;
        if (isStatusField) payload = statusValue;
        onUpdate(selectedField.id, payload);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 p-4 pt-8">
            <div className="w-full max-w-[600px] animate-in zoom-in-95 rounded-xl bg-white shadow-2xl duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Bulk Update {entityType === "plans" ? "Plans" : "Products"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="mb-6 text-[15px] text-slate-600">
                        Choose a field from the dropdown and update with new information.
                    </p>

                    <div className="flex gap-4">
                        {/* Custom Dropdown */}
                        <div className="relative flex-1">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-[15px] text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            >
                                <span>{selectedField?.label || "Select a field"}</span>
                                <ChevronDown
                                    size={18}
                                    className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""
                                        }`}
                                />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="border-b border-gray-100 p-2">
                                        <div className="relative">
                                            <Search
                                                size={16}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="h-9 w-full rounded-md border-none bg-slate-50 pl-9 pr-4 text-sm focus:ring-0 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto py-1">
                                        {filteredOptions.length > 0 ? (
                                            filteredOptions.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => {
                                                        setSelectedField(opt);
                                                        setDropdownOpen(false);
                                                        setSearchQuery("");
                                                    }}
                                                    className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors ${selectedField?.id === opt.id
                                                        ? "bg-blue-500 text-white font-medium"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-8 text-center text-sm text-slate-400">
                                                No results found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Value Field */}
                        <div className="flex-[1.5]">
                            {!selectedField && (
                                <input
                                    type="text"
                                    disabled
                                    placeholder="Select a field"
                                    className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-[15px] text-gray-400 outline-none"
                                />
                            )}

                            {isDescriptionField && (
                                <textarea
                                    value={textValue}
                                    onChange={(e) => setTextValue(e.target.value)}
                                    className="h-[84px] w-full resize-none rounded-lg border border-gray-300 px-4 py-2 text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                />
                            )}

                            {isPriceField && (
                                <input
                                    type="number"
                                    value={textValue}
                                    onChange={(e) => setTextValue(e.target.value)}
                                    placeholder="Enter price"
                                    className="h-11 w-full rounded-lg border border-gray-300 px-4 text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                                />
                            )}

                            {isStatusField && (
                                <select
                                    value={statusValue}
                                    onChange={(e) => setStatusValue(e.target.value)}
                                    className="h-11 w-full rounded-lg border border-gray-300 px-4 text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            )}

                            {isBooleanField && (
                                <div className="pt-1">
                                    <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="radio"
                                            name="bulk-boolean"
                                            checked={booleanValue === "check"}
                                            onChange={() => setBooleanValue("check")}
                                            className="h-4 w-4"
                                            style={{ accentColor: "#3b82f6" }}
                                        />
                                        <span>Check this option</span>
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="radio"
                                            name="bulk-boolean"
                                            checked={booleanValue === "uncheck"}
                                            onChange={() => setBooleanValue("uncheck")}
                                            className="h-4 w-4"
                                            style={{ accentColor: "#3b82f6" }}
                                        />
                                        <span>Uncheck this option</span>
                                    </label>
                                </div>
                            )}

                            {isAccountField && (
                                <div ref={accountRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setAccountOpen((prev) => !prev)}
                                        className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-[15px] text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    >
                                        <span>{accountValue || "Select account"}</span>
                                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {accountOpen && (
                                        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                                            <div className="border-b border-gray-100 p-2">
                                                <div className="relative">
                                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search"
                                                        value={accountSearch}
                                                        onChange={(e) => setAccountSearch(e.target.value)}
                                                        className="h-9 w-full rounded-md border-none bg-slate-50 pl-9 pr-4 text-sm focus:ring-0 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-[210px] overflow-y-auto py-1">
                                                {filteredAccounts.length > 0 ? (
                                                    filteredAccounts.map((account) => (
                                                        <button
                                                            key={account}
                                                            type="button"
                                                            onClick={() => {
                                                                setAccountValue(account);
                                                                setAccountOpen(false);
                                                            }}
                                                            className={`mx-1 mb-1 block w-[calc(100%-8px)] rounded-md px-3 py-2 text-left text-sm ${accountValue === account
                                                                ? "bg-[#3b82f6] text-white"
                                                                : "text-slate-700 hover:bg-slate-50"
                                                                }`}
                                                        >
                                                            {account}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                                                        No accounts found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedField && !isDescriptionField && !isPriceField && !isStatusField && !isBooleanField && !isAccountField && (
                                <input
                                    type="text"
                                    value={textValue}
                                    onChange={(e) => setTextValue(e.target.value)}
                                    placeholder="Enter value"
                                    className="h-11 w-full rounded-lg border border-gray-300 px-4 text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                                />
                            )}
                        </div>
                    </div>

                    <p className="mt-4 text-sm text-slate-500 leading-relaxed italic">
                        <span className="font-bold">Note:</span> All the selected {entityType}{" "}
                        will be updated with the new information and you cannot undo this action.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 border-t border-gray-100 bg-slate-50/50 px-6 py-4 rounded-b-xl">
                    <button
                        onClick={submitUpdate}
                        disabled={!canUpdate}
                        className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: accentColor }}
                    >
                        Update
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
