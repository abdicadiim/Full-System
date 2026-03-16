// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { X, Eye, EyeOff, Info, ChevronDown, Search, Check, ChevronUp, GripVertical, Plus, Trash2, FileText, UploadIcon, MessageCircle, RotateCw, Paperclip } from "lucide-react";

const MODULES_DATA = {
    "Sales": [
        "Quotes",
        "Invoices",
        "Invoice Payments",
        "Recurring Invoices",
        "Credit Notes",
        "Credit Notes Applied to Invoices",
        "Refunds"
    ],
    "Purchase": [
        "Expenses",
        "Recurring Expenses",
        "Purchase Orders",
        "Bills",
        "Bill Payments",
        "Recurring Bills",
        "Vendor Credits",
        "Applied Vendor Credits",
        "Vendor Credit Refunds"
    ],
    "Timesheet": [
        "Projects",
        "Timesheet",
        "Project Tasks"
    ],
    "Others": [
        "Customers",
        "Vendors",
        "Tasks",
        "Items",
        "Inventory Adjustments",
        "Exchange Rates",
        "Users",
        "Chart of Accounts",
        "Manual Journals",
        "Documents"
    ]
};

const ALL_EXPENSE_FIELDS = [
    "Expense Date",
    "Expense Account",
    "Expense Amount",
    "Reference#",
    "Vendor Name",
    "Customer Name",
    "Project Name",
    "Billable",
    "Tax Name",
    "Tax Amount",
    "Tax Percentage",
    "Currency Code",
    "Exchange Rate",
    "Description",
    "Paid Through",
    "Is Inclusive Tax"
];

function NewExportTemplateModal({ onClose, onSave }) {
    const [templateName, setTemplateName] = useState("");
    const [fields, setFields] = useState([
        { id: 1, zohoName: "Expense Date", exportName: "Expense Date" },
        { id: 2, zohoName: "Expense Account", exportName: "Expense Account" },
        { id: 3, zohoName: "Expense Amount", exportName: "Expense Amount" }
    ]);

    const handleAddField = () => {
        const newId = Math.max(...fields.map(f => f.id), 0) + 1;
        setFields([...fields, { id: newId, zohoName: "", exportName: "" }]);
    };

    const handleRemoveField = (id) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const handleFieldChange = (id, key, value) => {
        setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const handleSave = () => {
        if (!templateName.trim()) {
            alert("Please enter a template name");
            return;
        }
        onSave(templateName, fields);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10001]">
            <div className="bg-white rounded shadow-lg w-full max-w-[700px] h-auto max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900 m-0">
                        New Export Template
                    </h2>
                    <button onClick={onClose} className="border-none bg-none cursor-pointer text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6">
                        <label className="block text-[13px] font-medium text-[#156372] mb-2">
                            Template Name*
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="w-full p-2 px-3 border border-[#156372] rounded text-sm outline-none focus:ring-1 focus:ring-[#156372]"
                            autoFocus
                        />
                    </div>

                    <div className="border border-gray-200 rounded overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-[30px_1fr_1fr_30px] gap-3 p-2.5 px-4 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            <div></div>
                            <div>FIELD NAME IN ZOHO BOOKS</div>
                            <div>FIELD NAME IN EXPORT FILE</div>
                            <div></div>
                        </div>

                        {/* Table Body */}
                        <div className="p-4">
                            {fields.map((field) => (
                                <div key={field.id} className="grid grid-cols-[30px_1fr_1fr_30px] gap-3 items-center mb-3">
                                    <div className="cursor-move text-gray-400">
                                        <GripVertical size={16} />
                                    </div>
                                    <div>
                                        <div className="relative">
                                            <select
                                                value={field.zohoName}
                                                onChange={(e) => {
                                                    handleFieldChange(field.id, "zohoName", e.target.value);
                                                    if (!field.exportName) {
                                                        handleFieldChange(field.id, "exportName", e.target.value);
                                                    }
                                                }}
                                                className="w-full p-2 px-3 border border-gray-200 rounded text-sm appearance-none bg-white cursor-pointer text-gray-700 outline-none focus:border-[#156372]"
                                            >
                                                <option value="" disabled>Select Field</option>
                                                {ALL_EXPENSE_FIELDS.map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={field.exportName}
                                            onChange={(e) => handleFieldChange(field.id, "exportName", e.target.value)}
                                            className="w-full p-2 px-3 border border-gray-200 rounded text-sm outline-none text-gray-700 focus:border-[#156372]"
                                        />
                                    </div>
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => handleRemoveField(field.id)}
                                            className="border-none bg-none cursor-pointer text-[#156372] hover:text-[#12505d]"
                                            title="Remove Field"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleAddField}
                        className="flex items-center gap-1.5 border-none bg-none text-[#156372] text-[13px] font-medium cursor-pointer mt-4 p-0 hover:underline"
                    >
                        <Plus size={16} />
                        Add a New Field
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 px-6 bg-gray-50 border-t border-gray-200 flex gap-3">
                    <button
                        onClick={handleSave}
                        className="p-2 px-4 bg-[#156372] text-white border-none rounded text-sm font-medium cursor-pointer hover:bg-[#12505d]"
                    >
                        Save and Select
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 px-4 bg-white text-gray-700 border border-gray-200 rounded text-sm font-medium cursor-pointer hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ExportExpenses({ onClose, exportType = "expenses", data = [] }) {
    const [module, setModule] = useState("Expenses");
    const [dataRange, setDataRange] = useState("all");
    const [specificPeriod, setSpecificPeriod] = useState({ start: "", end: "" });
    const [exportTemplate, setExportTemplate] = useState("standard");
    const [decimalFormat, setDecimalFormat] = useState("1234567.89");
    const [exportFileFormat, setExportFileFormat] = useState("csv");
    const [includePII, setIncludePII] = useState(false);
    const [filePassword, setFilePassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Dropdown states
    const [isDecimalFormatOpen, setIsDecimalFormatOpen] = useState(false);

    // Module Dropdown States
    const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
    const [moduleSearchQuery, setModuleSearchQuery] = useState("");

    // Template Dropdown States
    const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
    const [templateSearchQuery, setTemplateSearchQuery] = useState("");
    const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
    const [customTemplates, setCustomTemplates] = useState([]);

    const decimalFormatRef = useRef(null);
    const moduleDropdownRef = useRef(null);
    const searchInputRef = useRef(null);
    const templateDropdownRef = useRef(null);
    const templateSearchInputRef = useRef(null);

    const isCurrentView = exportType === "current-view";

    const decimalFormats = [
        "1234567.89",
        "1,234,567.89",
        "1234567,89",
        "1.234.567,89",
        "1234567 89",
        "1 234 567 89"
    ];

    const templates = [
        { id: "standard", name: "Standard Template" },
        ...customTemplates
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (decimalFormatRef.current && !decimalFormatRef.current.contains(event.target)) {
                setIsDecimalFormatOpen(false);
            }
            if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target)) {
                setIsModuleDropdownOpen(false);
            }
            if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target)) {
                setIsTemplateDropdownOpen(false);
            }
        };
        if (isDecimalFormatOpen || isModuleDropdownOpen || isTemplateDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDecimalFormatOpen, isModuleDropdownOpen, isTemplateDropdownOpen]);

    useEffect(() => {
        if (isModuleDropdownOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isModuleDropdownOpen]);

    useEffect(() => {
        if (isTemplateDropdownOpen && templateSearchInputRef.current) {
            templateSearchInputRef.current.focus();
        }
    }, [isTemplateDropdownOpen]);

    const getFilteredModules = () => {
        if (!moduleSearchQuery.trim()) return MODULES_DATA;
        const query = moduleSearchQuery.toLowerCase();
        const filtered = {};
        Object.entries(MODULES_DATA).forEach(([category, items]) => {
            const matchedItems = items.filter(item => item.toLowerCase().includes(query));
            if (matchedItems.length > 0) {
                filtered[category] = matchedItems;
            }
        });
        return filtered;
    };

    const getFilteredTemplates = () => {
        if (!templateSearchQuery.trim()) return templates;
        const query = templateSearchQuery.toLowerCase();
        return templates.filter(t => t.name.toLowerCase().includes(query));
    };

    const handleExport = async () => {
        // Password Validation
        if (filePassword) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
            if (!passwordRegex.test(filePassword)) {
                alert("Password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.");
                return;
            }
        }

        const exportRows = Array.isArray(data) ? data : [];
        if (exportRows.length === 0) {
            alert("No expense data available to export.");
            return;
        }

        let headers = [];
        let rows = [];

        if (isCurrentView) {
            headers = ["Date", "Expense Account", "Reference#", "Vendor Name", "Paid Through", "Customer Name", "Status", "Amount"];
            rows = exportRows.map(exp => [
                exp.date || "",
                exp.expenseAccount || "",
                exp.reference || "",
                exp.vendor || "",
                exp.paidThrough || "",
                exp.customerName || "",
                exp.status || "",
                exp.amount || 0
            ]);
        } else {
            headers = [
                "Date", "Expense Account", "Reference#", "Vendor Name", "Paid Through",
                "Customer Name", "Status", "Amount", "Description", "Currency",
                "Tax Name", "Tax Amount"
            ];
            rows = exportRows.map(exp => [
                exp.date || "",
                exp.expenseAccount || "",
                exp.reference || "",
                exp.vendor || "",
                exp.paidThrough || "",
                exp.customerName || "",
                exp.status || "",
                exp.amount || 0,
                exp.notes || "",
                exp.currency || "",
                exp.tax_name || "",
                exp.tax_amount || 0
            ]);
        }

        if (exportFileFormat === "csv") {
            const content = [headers, ...rows]
                .map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
                .join("\n");
            const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${module.toLowerCase().replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } else {
            const XLSX = await import("xlsx");
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
            const bookType = exportFileFormat === "xls" ? "xls" : "xlsx";
            XLSX.writeFile(
                workbook,
                `${module.toLowerCase().replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.${bookType}`,
                { bookType }
            );
        }

        onClose();
    };

    const handleSaveNewTemplate = (name, fields) => {
        const newTemplate = {
            id: `custom-${Date.now()}`,
            name: name,
            fields: fields
        };
        setCustomTemplates([...customTemplates, newTemplate]);
        setExportTemplate(newTemplate.id);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000]">
            {showNewTemplateModal && (
                <NewExportTemplateModal
                    onClose={() => setShowNewTemplateModal(false)}
                    onSave={handleSaveNewTemplate}
                />
            )}

            <div className="bg-white rounded shadow-lg w-full max-w-[600px] h-auto max-h-[95vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 bg-gray-50 uppercase">
                    <h2 className="text-lg font-semibold text-gray-900 m-0">
                        {isCurrentView ? "Export Current View" : "Export Expenses"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-500 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Information Banner */}
                    <div className="bg-[#15637210] p-3 px-4 rounded-md mb-6 flex items-start gap-3">
                        <Info size={18} className="text-[#156372] mt-0.5" fill="#156372" color="white" />
                        <span className="text-sm text-[#156372] leading-relaxed">
                            {isCurrentView
                                ? "Only the current view with its visible columns will be exported from Zoho Books in CSV or XLS format."
                                : "You can export your data from Zoho Books in CSV, XLS or XLSX format."
                            }
                        </span>
                    </div>

                    {/* Module */}
                    {!isCurrentView && (
                        <div className="mb-5">
                            <label className="block text-[13px] font-medium text-[#156372] mb-2 uppercase tracking-wide">
                                Module*
                            </label>

                            <div ref={moduleDropdownRef} className="relative">
                                <div
                                    onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                                    className={`w-full p-2 px-3 border rounded text-sm bg-white text-gray-700 cursor-pointer flex items-center justify-between ${isModuleDropdownOpen ? "border-[#156372] ring-1 ring-[#156372]" : "border-gray-200"}`}
                                >
                                    <span>{module}</span>
                                    <ChevronDown size={14} className="text-gray-500" />
                                </div>

                                {isModuleDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded shadow-xl z-[2000] mt-1 max-h-[300px] overflow-y-auto flex flex-col">
                                        <div className="p-2 sticky top-0 bg-white border-b border-gray-100">
                                            <div className="relative flex items-center">
                                                <Search size={14} className="absolute left-2.5 text-gray-400" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    placeholder="Search"
                                                    value={moduleSearchQuery}
                                                    onChange={(e) => setModuleSearchQuery(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full p-1.5 pl-8 border border-gray-200 rounded text-[13px] outline-none focus:border-[#156372]"
                                                />
                                            </div>
                                        </div>

                                        <div className="py-1">
                                            {Object.entries(getFilteredModules()).map(([category, items]) => (
                                                <div key={category}>
                                                    <div className="p-2 px-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50">
                                                        {category}
                                                    </div>
                                                    {items.map((item) => (
                                                        <div
                                                            key={item}
                                                            onClick={() => {
                                                                setModule(item);
                                                                setIsModuleDropdownOpen(false);
                                                                setModuleSearchQuery("");
                                                            }}
                                                            className={`p-2 px-6 cursor-pointer text-sm flex items-center justify-between hover:bg-[#156372] hover:text-white ${item === module ? "text-[#156372] font-medium" : "text-gray-700"}`}
                                                        >
                                                            {item}
                                                            {item === module && <Check size={14} />}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                            {Object.keys(getFilteredModules()).length === 0 && (
                                                <div className="p-3 text-center text-gray-400 text-[13px]">
                                                    No results found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Data Range */}
                    {!isCurrentView && (
                        <div className="mb-5">
                            <div className="flex flex-col gap-2.5">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="dataRange"
                                        checked={dataRange === "all"}
                                        onChange={() => setDataRange("all")}
                                        className="w-4 h-4 accent-[#156372]"
                                    />
                                    <span className="text-sm text-gray-700 group-hover:text-gray-900">All Expenses</span>
                                </label>

                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="dataRange"
                                            checked={dataRange === "specific"}
                                            onChange={() => setDataRange("specific")}
                                            className="w-4 h-4 accent-[#156372]"
                                        />
                                        <span className="text-sm text-gray-700 group-hover:text-gray-900">Specific Period</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Export Template */}
                    {!isCurrentView && (
                        <div className="mb-6">
                            <label className="flex items-center gap-1 text-[13px] font-medium text-gray-500 mb-2 uppercase tracking-wide">
                                Export Template
                                <Info size={14} className="text-gray-400" />
                            </label>

                            <div ref={templateDropdownRef} className="relative">
                                <div
                                    onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                                    className={`w-full p-2 px-3 border rounded text-sm bg-white flex items-center justify-between cursor-pointer ${isTemplateDropdownOpen ? "border-[#156372] ring-1 ring-[#156372]" : "border-gray-200"} ${exportTemplate ? "text-gray-700" : "text-gray-400"}`}
                                >
                                    <span>
                                        {templates.find(t => t.id === exportTemplate)?.name || "Select an Export Template"}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform text-gray-500 ${isTemplateDropdownOpen ? "rotate-180" : ""}`} />
                                </div>

                                {isTemplateDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded shadow-xl z-[2000] mt-1 overflow-hidden">
                                        <div className="p-2 border-b border-gray-100">
                                            <div className="relative flex items-center">
                                                <Search size={14} className="absolute left-2.5 text-gray-400" />
                                                <input
                                                    ref={templateSearchInputRef}
                                                    type="text"
                                                    placeholder="Search"
                                                    value={templateSearchQuery}
                                                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full p-1.5 pl-8 border border-[#156372] rounded text-[13px] outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="max-h-[200px] overflow-y-auto py-1">
                                            {getFilteredTemplates().length === 0 ? (
                                                <div className="p-3 text-center text-gray-400 text-[11px] uppercase tracking-wider">
                                                    No results found
                                                </div>
                                            ) : (
                                                getFilteredTemplates().map((template) => (
                                                    <div
                                                        key={template.id}
                                                        onClick={() => {
                                                            setExportTemplate(template.id);
                                                            setIsTemplateDropdownOpen(false);
                                                            setTemplateSearchQuery("");
                                                        }}
                                                        className={`p-2 px-3 cursor-pointer text-sm flex items-center justify-between hover:bg-[#156372] hover:text-white ${template.id === exportTemplate ? "text-[#156372] font-medium" : "text-gray-700"}`}
                                                    >
                                                        {template.name}
                                                        {template.id === exportTemplate && <Check size={14} />}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div
                                            onClick={() => {
                                                setIsTemplateDropdownOpen(false);
                                                setShowNewTemplateModal(true);
                                            }}
                                            className="p-2.5 px-3 border-t border-gray-100 cursor-pointer flex items-center gap-2 text-[#156372] text-[13px] font-medium hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="w-4 h-4 rounded-full bg-[#156372] text-white flex items-center justify-center">
                                                <Plus size={10} strokeWidth={3} />
                                            </div>
                                            New Template
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Decimal Format */}
                    <div className="mb-6">
                        <label className="block text-[13px] font-medium text-[#156372] mb-2 uppercase tracking-wide">
                            Decimal Format*
                        </label>
                        <div ref={decimalFormatRef} className="relative">
                            <div
                                onClick={() => setIsDecimalFormatOpen(!isDecimalFormatOpen)}
                                className="w-full p-2 px-3 border border-gray-200 rounded text-sm bg-white cursor-pointer flex items-center justify-between text-gray-700 hover:border-gray-300"
                            >
                                <span>{decimalFormat}</span>
                                <ChevronDown size={14} className="text-gray-400" />
                            </div>
                            {isDecimalFormatOpen && (
                                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded shadow-xl z-[2000] mt-1 py-1">
                                    {decimalFormats.map((format) => (
                                        <div
                                            key={format}
                                            onClick={() => { setDecimalFormat(format); setIsDecimalFormatOpen(false); }}
                                            className="p-2 px-3 cursor-pointer text-sm text-gray-700 hover:bg-[#15637210] hover:text-[#156372] transition-colors"
                                        >
                                            {format}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Export File Format */}
                    <div className="mb-6">
                        <label className="block text-[13px] font-medium text-[#156372] mb-3 uppercase tracking-wide">
                            Export File Format*
                        </label>
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    checked={exportFileFormat === "csv"}
                                    onChange={() => setExportFileFormat("csv")}
                                    className="w-4 h-4 accent-[#156372]"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">CSV (Comma Separated Value)</span>
                            </label>

                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    checked={exportFileFormat === "xls"}
                                    onChange={() => setExportFileFormat("xls")}
                                    className="w-4 h-4 accent-[#156372]"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">XLS (Microsoft Excel 1997-2004 Compatible)</span>
                            </label>

                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    checked={exportFileFormat === "xlsx"}
                                    onChange={() => setExportFileFormat("xlsx")}
                                    className="w-4 h-4 accent-[#156372]"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">XLSX (Microsoft Excel)</span>
                            </label>
                        </div>
                    </div>

                    {/* PII Inclusion */}
                    {!isCurrentView && (
                        <div className="mb-5">
                            <label className="flex items-start gap-2.5 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includePII}
                                    onChange={(e) => setIncludePII(e.target.checked)}
                                    className="w-4 h-4 accent-[#156372] mt-0.5"
                                />
                                <span className="text-sm text-gray-600 leading-normal group-hover:text-gray-800 transition-colors">
                                    Include Sensitive Personally Identifiable Information (PII) while exporting.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Password */}
                    <div className="mb-6">
                        <label className="block text-[13px] font-medium text-gray-700 mb-2 uppercase tracking-wide">
                            File Protection Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={filePassword}
                                onChange={(e) => setFilePassword(e.target.value)}
                                className="w-full p-2 pr-10 border border-gray-200 rounded text-sm outline-none focus:border-[#156372] transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600 p-0"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-[12px] text-gray-400 mt-2 leading-tight">
                            Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                        </p>
                    </div>

                    {/* Note */}
                    <div className="text-[13px] text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
                        <span className="font-bold text-gray-500">Note:</span> You can export only the first {isCurrentView ? "10,000" : "25,000"} rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it. <a href="#" className="text-[#156372] no-underline hover:underline">Backup Your Data</a>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 px-6 bg-gray-50 border-t border-gray-200 flex gap-3">
                    <button
                        onClick={handleExport}
                        className="p-2 px-5 bg-[#156372] text-white border-none rounded text-sm font-semibold cursor-pointer hover:bg-[#12505d] transition-colors shadow-sm"
                    >
                        Export
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 px-5 bg-white text-gray-700 border border-gray-200 rounded text-sm font-semibold cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

