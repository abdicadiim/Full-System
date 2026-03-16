import React, { useState, useRef, useEffect } from "react";
import { Info, Search, ChevronDown, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { readTaxComplianceSettingsLocal, writeTaxComplianceSettingsLocal } from "../TAX/storage";

const TAX_REGISTRATION_LABELS = [
    "ABN", "BN", "CST", "ORG", "TAX", "VST", "BE", "PIN", "VAT", "GST",
    "TIN", "EIN", "SSN", "TRN", "PAN", "HST", "PST", "QST", "SST"
];

const TDS_OPTIONS = [
    "Customers",
    "Vendors",
    "Customers and Vendors"
];

export default function TaxSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [disablingSalesTax, setDisablingSalesTax] = useState(false);
    const [showDisableSalesTaxConfirm, setShowDisableSalesTaxConfirm] = useState(false);
    const [taxRegistrationLabel, setTaxRegistrationLabel] = useState("PIN");
    const [taxRegistrationNumber, setTaxRegistrationNumber] = useState("");
    const [enableUseTaxInPurchases, setEnableUseTaxInPurchases] = useState(false);
    const [enableTDS, setEnableTDS] = useState(false);
    const [tdsFor, setTdsFor] = useState("Customers");
    const [enableTDSOverride, setEnableTDSOverride] = useState(false);
    const [enableReverseChargeSales, setEnableReverseChargeSales] = useState(false);
    const [enableReverseChargePurchase, setEnableReverseChargePurchase] = useState(false);
    const [taxTrackingAccount, setTaxTrackingAccount] = useState("single");
    const [overrideTaxSales, setOverrideTaxSales] = useState(false);
    const [overrideTaxPurchases, setOverrideTaxPurchases] = useState(false);
    const [enableVATMOSS, setEnableVATMOSS] = useState(false);
    const [eoriNumber, setEoriNumber] = useState("");
    const [salesTaxDisabled, setSalesTaxDisabled] = useState(false);

    // Dropdown states
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);
    const [showTDSDropdown, setShowTDSDropdown] = useState(false);
    const [labelSearch, setLabelSearch] = useState("");
    const [tdsSearch, setTdsSearch] = useState("");

    const labelDropdownRef = useRef<HTMLDivElement>(null);
    const tdsDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadTaxSettings = () => {
            try {
                const tax = readTaxComplianceSettingsLocal();
                setTaxRegistrationLabel(tax.taxRegistrationLabel ?? "PIN");
                setTaxRegistrationNumber(tax.taxRegistrationNumber ?? "");
                setEnableUseTaxInPurchases(tax.enableUseTaxInPurchases ?? false);
                setEnableTDS(tax.enableTDS ?? false);
                setTdsFor(tax.tdsFor ?? "Customers");
                setEnableTDSOverride(tax.enableTDSOverride ?? false);
                setEnableReverseChargeSales(tax.enableReverseChargeSales ?? false);
                setEnableReverseChargePurchase(tax.enableReverseChargePurchase ?? false);
                setTaxTrackingAccount(tax.taxTrackingAccount ?? "single");
                setOverrideTaxSales(tax.overrideTaxSales ?? false);
                setOverrideTaxPurchases(tax.overrideTaxPurchases ?? false);
                setEnableVATMOSS(tax.enableVATMOSS ?? false);
                setEoriNumber(tax.eoriNumber ?? "");
                setSalesTaxDisabled(tax.salesTaxDisabled ?? false);
            } catch (error) {
                console.error("Error loading tax settings:", error);
                toast.error("Failed to load tax settings");
            } finally {
                setLoading(false);
            }
        };

        loadTaxSettings();
    }, []);

    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
                setShowLabelDropdown(false);
            }
            if (tdsDropdownRef.current && !tdsDropdownRef.current.contains(event.target as Node)) {
                setShowTDSDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredLabels = TAX_REGISTRATION_LABELS.filter(label =>
        label.toLowerCase().includes(labelSearch.toLowerCase())
    );

    const filteredTDSOptions = TDS_OPTIONS.filter(option =>
        option.toLowerCase().includes(tdsSearch.toLowerCase())
    );

    const handleLabelSelect = (label: string) => {
        setTaxRegistrationLabel(label);
        setShowLabelDropdown(false);
        setLabelSearch("");
    };

    const handleTDSSelect = (option: string) => {
        setTdsFor(option);
        setShowTDSDropdown(false);
        setTdsSearch("");
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            writeTaxComplianceSettingsLocal({
                taxRegistrationLabel,
                taxRegistrationNumber,
                enableUseTaxInPurchases,
                enableTDS,
                tdsFor,
                enableTDSOverride,
                enableReverseChargeSales,
                enableReverseChargePurchase,
                taxTrackingAccount: taxTrackingAccount === "separate" ? "separate" : "single",
                overrideTaxSales,
                overrideTaxPurchases,
                enableVATMOSS,
                eoriNumber,
                salesTaxDisabled,
            });
            toast.success("Tax settings saved successfully");
        } catch (error: any) {
            console.error("Error saving tax settings:", error);
            toast.error(error.message || "Failed to save tax settings");
        } finally {
            setSaving(false);
        }
    };

    const handleDisableSalesTax = async () => {
        try {
            setDisablingSalesTax(true);
            setSalesTaxDisabled(true);
            writeTaxComplianceSettingsLocal({ salesTaxDisabled: true });
            setShowDisableSalesTaxConfirm(false);
            toast.success("Sales tax disabled successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to disable sales tax");
        } finally {
            setDisablingSalesTax(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#156372]" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            {showDisableSalesTaxConfirm && (
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-lg bg-white border border-gray-200 shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Disable Sales Tax</h3>
                        <p className="text-sm text-gray-600 mt-3">
                            Sales tax should not be associated with any existing transaction. Do you want to disable sales tax for this organization?
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowDisableSalesTaxConfirm(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                disabled={disablingSalesTax}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDisableSalesTax}
                                disabled={disablingSalesTax}
                                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {disablingSalesTax && <Loader2 size={16} className="animate-spin" />}
                                {disablingSalesTax ? "Disabling..." : "Yes, Disable"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => setShowDisableSalesTaxConfirm(true)}
                        disabled={salesTaxDisabled}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
                    >
                        {salesTaxDisabled ? "Sales Tax Disabled" : "Disable Sales Tax"}
                    </button>
                </div>

                {/* Tax Registration Number */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Tax Registration Number</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative" ref={labelDropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Type or select a label
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={taxRegistrationLabel}
                                        onChange={(e) => {
                                            setTaxRegistrationLabel(e.target.value);
                                            setShowLabelDropdown(true);
                                        }}
                                        onFocus={() => setShowLabelDropdown(true)}
                                        className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Type or select a label"
                                    />
                                    <ChevronDown
                                        size={16}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                    />
                                </div>
                                {showLabelDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                                        <div className="p-2 border-b border-gray-200">
                                            <div className="relative">
                                                <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={labelSearch}
                                                    onChange={(e) => setLabelSearch(e.target.value)}
                                                    placeholder="Search"
                                                    className="w-full h-8 pl-8 pr-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {filteredLabels.length === 0 ? (
                                                <div className="p-3 text-sm text-gray-500 text-center">No results found</div>
                                            ) : (
                                                filteredLabels.map((label) => (
                                                    <button
                                                        key={label}
                                                        onClick={() => handleLabelSelect(label)}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${taxRegistrationLabel === label ? "bg-blue-50 text-blue-600" : "text-gray-700"
                                                            }`}
                                                    >
                                                        <span>{label}</span>
                                                        {taxRegistrationLabel === label && <Check size={16} className="text-blue-600" />}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter the registration number
                                </label>
                                <input
                                    type="text"
                                    value={taxRegistrationNumber}
                                    onChange={(e) => setTaxRegistrationNumber(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter registration number"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                            <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-800">
                                To include this number as part of your organization address in transaction PDFs, insert this number's placeholder in Organization Address Format under Settings &gt; Preferences &gt; General.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Use Tax */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Use Tax</h3>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Use tax applies to goods purchased outside your state but used within it. Enable this option to track and apply use tax in purchase transactions.
                        </p>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableUseTaxInPurchases}
                                onChange={(e) => setEnableUseTaxInPurchases(e.target.checked)}
                                className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Enable Use Tax in Purchase transactions</span>
                        </label>
                    </div>
                </div>

                {/* TDS */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">TDS</h3>
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">NEW</span>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableTDS}
                                onChange={(e) => setEnableTDS(e.target.checked)}
                                className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Enable TDS</span>
                        </label>
                        <p className="text-sm text-gray-600 ml-6">
                            TDS or the Tax Deducted at Source, can be associated with the customers, vendors or both customers and vendors in Zoho Books. You can enable TDS for a particular contact in the contact's create or edit page.
                        </p>
                        {enableTDS && (
                            <div className="ml-6 space-y-3">
                                <div className="relative" ref={tdsDropdownRef}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Enable TDS For:
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowTDSDropdown(!showTDSDropdown)}
                                            className="w-full h-10 px-3 pr-8 text-left rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-between"
                                        >
                                            <span className="text-sm text-gray-900">{tdsFor}</span>
                                            <ChevronDown
                                                size={16}
                                                className={`text-gray-400 transition-transform ${showTDSDropdown ? "rotate-180" : ""}`}
                                            />
                                        </button>
                                        {showTDSDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                                                <div className="p-2 border-b border-gray-200">
                                                    <div className="relative">
                                                        <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={tdsSearch}
                                                            onChange={(e) => setTdsSearch(e.target.value)}
                                                            placeholder="Search"
                                                            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {filteredTDSOptions.map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => handleTDSSelect(option)}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${tdsFor === option ? "bg-blue-50 text-blue-600" : "text-gray-700"
                                                                }`}
                                                        >
                                                            <span>{option}</span>
                                                            {tdsFor === option && <Check size={16} className="text-blue-600" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={enableTDSOverride}
                                        onChange={(e) => setEnableTDSOverride(e.target.checked)}
                                        className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-700">Enable TDS Override for sales transactions</span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reverse Charge */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Reverse Charge</h3>
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">NEW</span>
                    </div>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Reverse Charge allows you to pay taxes directly to the government for purchases and enables customers to do the same for sales transactions. Enable Reverse Charge to apply and track it to your sales and purchase transactions.
                        </p>
                        <div className="space-y-2 ml-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableReverseChargeSales}
                                    onChange={(e) => setEnableReverseChargeSales(e.target.checked)}
                                    className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Enable Reverse Charge in Sales transactions</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableReverseChargePurchase}
                                    onChange={(e) => setEnableReverseChargePurchase(e.target.checked)}
                                    className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Enable Reverse Charge in Purchase transactions</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Tax Tracking Account Preference */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Tax Tracking Account Preference</h3>
                    <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="taxTrackingAccount"
                                value="single"
                                checked={taxTrackingAccount === "single"}
                                onChange={(e) => setTaxTrackingAccount(e.target.value)}
                                className="mt-1 h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300"
                            />
                            <div>
                                <div className="text-sm font-medium text-gray-900">Track taxes under a single account</div>
                                <div className="text-xs text-gray-600 mt-1">
                                    The taxes applied on your sales and purchase transactions will be tracked under the Tax Payable account.
                                </div>
                            </div>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="taxTrackingAccount"
                                value="separate"
                                checked={taxTrackingAccount === "separate"}
                                onChange={(e) => setTaxTrackingAccount(e.target.value)}
                                className="mt-1 h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300"
                            />
                            <div>
                                <div className="text-sm font-medium text-gray-900">Track taxes under separate accounts</div>
                                <div className="text-xs text-gray-600 mt-1">
                                    The taxes applied on your sales and purchase transactions will be tracked under the Output Tax and Input Tax accounts respectively.
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Tax Override in Transactions */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Tax Override in Transactions</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Override your system-generated tax at line item-level or transaction-level in your sales and purchases transactions based on your business needs.
                    </p>
                    <div className="space-y-2 ml-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={overrideTaxSales}
                                onChange={(e) => setOverrideTaxSales(e.target.checked)}
                                className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Enable Tax Override for sales transactions</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={overrideTaxPurchases}
                                onChange={(e) => setOverrideTaxPurchases(e.target.checked)}
                                className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Enable Tax Override for purchase transactions</span>
                        </label>
                    </div>
                </div>

                {/* VAT MOSS, IOSS and Digital Services Export */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">VAT MOSS, IOSS and Digital Services Export</h3>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableVATMOSS}
                                onChange={(e) => setEnableVATMOSS(e.target.checked)}
                                className="h-4 w-4 text-[#156372] focus:ring-[#156372] border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                                Track VAT MOSS, OSS, IOSS, or the sale of digital services to overseas customers
                            </span>
                        </label>
                        <p className="text-sm text-gray-600 ml-6">
                            Enable this to track the sale of digital services to the EU member states using the VAT MOSS Report. Also, you can track the VAT collected on the sale of imported goods to buyers in the EU member states using IOSS Report, and track digital services export using the Overseas Digital Tax Summary report.
                        </p>
                        {enableVATMOSS && (
                            <div className="ml-6 mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    EORI Number
                                </label>
                                <input
                                    type="text"
                                    value={eoriNumber}
                                    onChange={(e) => setEoriNumber(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="EORI Number"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#156372] rounded-lg hover:bg-[#0f4e5a] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}


