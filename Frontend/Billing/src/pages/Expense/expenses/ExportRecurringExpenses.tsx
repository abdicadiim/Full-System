import React, { useState, useRef, useEffect } from "react";
import { X, Eye, EyeOff, Info, ChevronDown, Search, Check, ChevronUp } from "lucide-react";

const MODULE_CATEGORIES = [
  {
    name: "Sales",
    modules: [
      "Quotes",
      "Invoices",
      "Invoice Payments",
      "Recurring Invoices",
      "Credit Notes",
      "Credit Notes Applied to Invoices",
      "Refunds"
    ]
  },
  {
    name: "Purchase",
    modules: [
      "Expenses",
      "Recurring Expenses",
      "Purchase Orders",
      "Bills",
      "Bill Payments",
      "Recurring Bills",
      "Vendor Credits",
      "Applied Vendor Credits",
      "Vendor Credit Refunds"
    ]
  },
  {
    name: "Timesheet",
    modules: ["Projects", "Timesheet", "Project Tasks"]
  },
  {
    name: "Others",
    modules: [
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
  }
];

export default function ExportRecurringExpenses({ onClose, exportType = "recurring-expenses", data = [] }) {
  const [module, setModule] = useState(
    exportType === "current-view" ? "Recurring Expenses (Current View)" : "Recurring Expenses"
  );
  const [exportDataType, setExportDataType] = useState("recurring-expenses");
  const [dataRange, setDataRange] = useState("all");
  const [specificPeriod, setSpecificPeriod] = useState({ start: "", end: "" });
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [exportFileFormat, setExportFileFormat] = useState("csv");
  const [includePII, setIncludePII] = useState(false);
  const [filePassword, setFilePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDecimalFormatOpen, setIsDecimalFormatOpen] = useState(false);
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");
  const decimalFormatRef = useRef(null);
  const moduleRef = useRef(null);

  const isCurrentView = exportType === "current-view";

  const decimalFormats = [
    "1234567.89",
    "1,234,567.89",
    "1234567,89",
    "1.234.567,89",
    "1234567 89",
    "1 234 567 89"
  ];

  useEffect(() => {
    if (isCurrentView && exportFileFormat === "xlsx") {
      setExportFileFormat("csv");
    }
  }, [isCurrentView, exportFileFormat]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (decimalFormatRef.current && !decimalFormatRef.current.contains(event.target)) {
        setIsDecimalFormatOpen(false);
      }
      if (moduleRef.current && !moduleRef.current.contains(event.target)) {
        setIsModuleOpen(false);
      }
    };
    if (isDecimalFormatOpen || isModuleOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDecimalFormatOpen, isModuleOpen]);

  const normalizeValue = (value: any) => (value === undefined || value === null ? "" : value);

  const getAmountValue = (item: any) => {
    const amount = item?.amount ?? item?.total ?? item?.recurring_amount ?? 0;
    return Number.isFinite(Number(amount)) ? Number(amount) : 0;
  };

  const buildExportRows = () => {
    const exportData = Array.isArray(data) ? data.slice(0, 25000) : [];

    if (isCurrentView) {
      const headers = [
        "Profile Name",
        "Expense Account",
        "Vendor Name",
        "Frequency",
        "Last Expense Date",
        "Next Expense Date",
        "Amount",
        "Currency",
        "Status",
      ];

      const rows = exportData.map((item: any) => [
        normalizeValue(item?.profileName || item?.profile_name),
        normalizeValue(item?.expenseAccount || item?.account_name),
        normalizeValue(item?.vendor || item?.vendorName || item?.vendor_name),
        normalizeValue(item?.repeatEvery || item?.frequency || item?.repeat_every),
        normalizeValue(item?.startDate || item?.start_date),
        normalizeValue(item?.nextExpenseDate || item?.next_expense_date),
        getAmountValue(item),
        normalizeValue(item?.currency || item?.currency_code),
        normalizeValue(item?.status || "ACTIVE"),
      ]);

      return { headers, rows };
    }

    const headers = [
      "Profile Name",
      "Expense Account",
      "Vendor Name",
      "Frequency",
      "Last Expense Date",
      "Next Expense Date",
      "Amount",
      "Currency",
      "Status",
      "Created Time",
      "Description",
      "Customer Name",
      "Project Name",
    ];

    const rows = exportData.map((item: any) => [
      normalizeValue(item?.profileName || item?.profile_name),
      normalizeValue(item?.expenseAccount || item?.account_name),
      normalizeValue(item?.vendor || item?.vendorName || item?.vendor_name),
      normalizeValue(item?.repeatEvery || item?.frequency || item?.repeat_every),
      normalizeValue(item?.startDate || item?.start_date),
      normalizeValue(item?.nextExpenseDate || item?.next_expense_date),
      getAmountValue(item),
      normalizeValue(item?.currency || item?.currency_code),
      normalizeValue(item?.status || "ACTIVE"),
      normalizeValue(item?.createdTime || item?.created_time),
      normalizeValue(item?.description || item?.notes),
      normalizeValue(item?.customerName || item?.customer_name),
      normalizeValue(item?.projectName || item?.project_name),
    ]);

    return { headers, rows };
  };

  const handleExport = () => {
    // Password Validation
    if (filePassword) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
      if (!passwordRegex.test(filePassword)) {
        alert("Password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.");
        return;
      }
    }

    const { headers, rows } = buildExportRows();
    let content = "";
    let mimeType = "";

    if (exportFileFormat === "csv") {
      content = [headers, ...rows]
        .map((row) => row.map((cell) => `\"${normalizeValue(cell).toString().replace(/"/g, '""')}\"`).join(","))
        .join("\n");
      mimeType = "text/csv;charset=utf-8;";
    } else {
      content = [headers, ...rows]
        .map((row) => row.map((cell) => normalizeValue(cell).toString()).join("\t"))
        .join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${module.toLowerCase().replace(/\s+/g, "_")}_export_${new Date().toISOString().split('T')[0]}.${exportFileFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded shadow-xl w-full max-w-[600px] h-auto max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-[17px] font-bold text-gray-800 m-0 uppercase tracking-tight">
            {isCurrentView ? "Export Current View" : "Export Recurring Expenses"}
          </h2>
          <button
            onClick={onClose}
            className="group w-7 h-7 flex items-center justify-center rounded-md border border-[#156372] bg-white text-[#156372] transition-all hover:bg-[#156372] hover:text-white"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Information Banner */}
          <div className="bg-[#156372]/10 p-3.5 px-4 rounded-xl mb-6 flex items-start gap-3.5 border border-[#156372]/5">
            <div className="w-5 h-5 rounded-full bg-[#156372] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info size={14} className="text-white" />
            </div>
            <span className="text-sm text-[#156372] leading-relaxed font-medium">
              {isCurrentView
                ? "Only the current view with its visible columns will be exported from Zoho Books in CSV or XLS format."
                : "You can export your data from Zoho Books in CSV, XLS or XLSX format."
              }
            </span>
          </div>

          {/* Module - Only for Export Recurring Expenses */}
          {!isCurrentView && (
            <div className="mb-6">
              <label className="block text-[13px] font-bold text-[#156372] mb-2 uppercase tracking-widest">
                Module *
              </label>
              <div ref={moduleRef} className="relative">
                <div
                  onClick={() => setIsModuleOpen(!isModuleOpen)}
                  className={`w-full p-2.5 px-4 border rounded-lg text-sm bg-white cursor-pointer flex items-center justify-between text-gray-700 transition-all duration-200 ${isModuleOpen ? "border-[#156372] ring-2 ring-[#156372]/20 shadow-sm" : "border-gray-200 hover:border-[#156372]/50 hover:shadow-sm"}`}
                >
                  <span className="font-medium">{module}</span>
                  {isModuleOpen ? <ChevronUp size={18} className="text-[#156372]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>

                {isModuleOpen && (
                  <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-2xl z-[2000] flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-50 bg-gray-50/30">
                      <div className="relative group">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#156372] transition-colors" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search Module..."
                          value={moduleSearch}
                          onChange={(e) => setModuleSearch(e.target.value)}
                          className="w-full p-2.5 pl-10 border border-gray-100 rounded-lg text-sm outline-none transition-all focus:border-[#156372]/50 focus:ring-4 focus:ring-[#156372]/5 bg-white"
                        />
                      </div>
                    </div>

                    {/* Module List */}
                    <div className="overflow-y-auto max-h-[300px] py-1">
                      {Object.entries(
                        MODULE_CATEGORIES.reduce((acc, category) => {
                          const filtered = category.modules.filter(m =>
                            m.toLowerCase().includes(moduleSearch.toLowerCase())
                          );
                          if (filtered.length > 0) acc[category.name] = filtered;
                          return acc;
                        }, {} as any)
                      ).map(([categoryName, modules]: [string, string[]]) => (
                        <div key={categoryName}>
                          <div className="px-4 py-2 text-[11px] font-bold text-gray-400 bg-gray-50/50 uppercase tracking-[2px]">
                            {categoryName}
                          </div>
                          {modules.map((m) => (
                            <div
                              key={m}
                              onClick={() => {
                                setModule(m);
                                setIsModuleOpen(false);
                                setModuleSearch("");
                              }}
                              className={`px-6 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${module === m ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372]/5 active:bg-[#156372]/10"}`}
                            >
                              <span className={module === m ? "font-bold" : "font-medium"}>{m}</span>
                              {module === m && <Check size={16} className="text-white" />}
                            </div>
                          ))}
                        </div>
                      ))}
                      {MODULE_CATEGORIES.every(cat => !cat.modules.some(m => m.toLowerCase().includes(moduleSearch.toLowerCase()))) && (
                        <div className="p-8 text-center text-gray-400 italic text-sm">
                          No matching modules found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Data Type - Only for Export Recurring Expenses */}
          {!isCurrentView && (
            <div className="mb-6 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <input
                  type="radio"
                  name="exportDataType"
                  checked={exportDataType === "recurring-expenses"}
                  onChange={() => setExportDataType("recurring-expenses")}
                  className="w-4 h-4 accent-[#156372]"
                />
                <span className="text-sm text-gray-700 font-semibold group-hover:text-gray-900 transition-colors">Recurring Expenses</span>
              </label>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2"></div>
            </div>
          )}

          {/* Data Range - Only for Export Recurring Expenses */}
          {!isCurrentView && (
            <div className="mb-6 flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <input
                  type="radio"
                  name="dataRange"
                  checked={dataRange === "all"}
                  onChange={() => setDataRange("all")}
                  className="w-4 h-4 accent-[#156372]"
                />
                <span className="text-sm text-gray-700 font-semibold group-hover:text-gray-900">All Recurring Expenses</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <input
                  type="radio"
                  name="dataRange"
                  checked={dataRange === "specific"}
                  onChange={() => setDataRange("specific")}
                  className="w-4 h-4 accent-[#156372]"
                />
                <span className="text-sm text-gray-700 font-semibold group-hover:text-gray-900">Specific Period</span>
              </label>

              {dataRange === "specific" && (
                <div className="ml-8 mt-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex gap-4 items-center animate-in slide-in-from-left-4 duration-300">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={specificPeriod.start}
                      onChange={(e) => setSpecificPeriod({ ...specificPeriod, start: e.target.value })}
                      className="w-full p-2.5 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/5 transition-all shadow-sm"
                    />
                  </div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">TO</span>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={specificPeriod.end}
                      onChange={(e) => setSpecificPeriod({ ...specificPeriod, end: e.target.value })}
                      className="w-full p-2.5 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/5 transition-all shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Decimal Format */}
          <div className="mb-6">
            <label className="block text-[13px] font-bold text-[#156372] mb-2 uppercase tracking-widest">
              Decimal Format *
            </label>
            <div ref={decimalFormatRef} className="relative">
              <div
                onClick={() => setIsDecimalFormatOpen(!isDecimalFormatOpen)}
                className={`w-full p-2.5 px-4 border rounded-lg text-sm bg-white cursor-pointer flex items-center justify-between text-gray-700 transition-all duration-200 ${isDecimalFormatOpen ? "border-[#156372] ring-2 ring-[#156372]/20" : "border-gray-200 hover:border-[#156372]/50"}`}
              >
                <span className="font-semibold">{decimalFormat}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isDecimalFormatOpen ? "rotate-180" : ""}`} />
              </div>
              {isDecimalFormatOpen && (
                <div className="absolute bottom-[calc(100%+6px)] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-2xl z-[2000] py-1.5 animate-in slide-in-from-bottom-2 duration-200">
                  {decimalFormats.map((format) => (
                    <div
                      key={format}
                      onClick={() => { setDecimalFormat(format); setIsDecimalFormatOpen(false); }}
                      className={`px-4 py-2.5 cursor-pointer text-sm font-medium transition-colors ${decimalFormat === format ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372]/5"}`}
                    >
                      {format}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Export File Format */}
          <div className="mb-8">
            <label className="block text-[13px] font-bold text-[#156372] mb-3 uppercase tracking-widest">
              Export File Format *
            </label>
            <div className="space-y-3.5">
              <label className="flex items-center gap-3.5 cursor-pointer group p-2.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFileFormat === "csv"}
                  onChange={() => setExportFileFormat("csv")}
                  className="w-4 h-4 accent-[#156372]"
                />
                <div className="flex flex-col">
                  <span className="text-[14px] text-gray-700 font-bold group-hover:text-[#156372] transition-colors">CSV</span>
                  <span className="text-[11px] text-gray-400 font-medium">(Comma Separated Value)</span>
                </div>
              </label>

              <label className="flex items-center gap-3.5 cursor-pointer group p-2.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFileFormat === "xls"}
                  onChange={() => setExportFileFormat("xls")}
                  className="w-4 h-4 accent-[#156372]"
                />
                <div className="flex flex-col">
                  <span className="text-[14px] text-gray-700 font-bold group-hover:text-[#156372] transition-colors">XLS</span>
                  <span className="text-[11px] text-gray-400 font-medium">(Microsoft Excel 1997-2004 Compatible)</span>
                </div>
              </label>

              {!isCurrentView && (
                <label className="flex items-center gap-3.5 cursor-pointer group p-2.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                  <input
                    type="radio"
                    name="exportFormat"
                    checked={exportFileFormat === "xlsx"}
                    onChange={() => setExportFileFormat("xlsx")}
                    className="w-4 h-4 accent-[#156372]"
                  />
                  <div className="flex flex-col">
                    <span className="text-[14px] text-gray-700 font-bold group-hover:text-[#156372] transition-colors">XLSX</span>
                    <span className="text-[11px] text-gray-400 font-medium">(Microsoft Excel)</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* PII Inclusion */}
          {!isCurrentView && (
            <div className="mb-6 p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <label className="flex items-start gap-3.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includePII}
                  onChange={(e) => setIncludePII(e.target.checked)}
                  className="w-4 h-4 accent-[#156372] mt-0.5 shadow-sm"
                />
                <span className="text-sm text-gray-600 font-medium leading-relaxed group-hover:text-gray-900 transition-colors">
                  Include Sensitive Personally Identifiable Information (PII) while exporting.
                </span>
              </label>
            </div>
          )}

          {/* Password */}
          <div className="mb-6">
            <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-widest">
              File Protection Password
            </label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={filePassword}
                onChange={(e) => setFilePassword(e.target.value)}
                placeholder="Enter password to secure file"
                className="w-full p-2.5 px-4 pr-12 border border-gray-200 rounded-xl text-sm font-medium outline-none transition-all focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/5 shadow-sm placeholder:text-gray-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#156372] transition-colors p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg flex gap-2.5 items-start">
              <Info size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700/80 font-medium leading-normal italic">
                Password must be ≥ 12 characters and include uppercase, lowercase, number, and special character.
              </p>
            </div>
          </div>

          {/* Note */}
          <div className="text-[12px] text-gray-400 leading-relaxed p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="font-black text-gray-500 uppercase tracking-tighter">NOTE:</span> You can export only the first {isCurrentView ? "10,000" : "25,000"} rows. If data exceeds this, please initiate a full backup in your Zoho Books organization settings. <a href="#" className="text-[#156372] font-bold hover:underline ml-1">Backup Your Data</a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3.5 select-none">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-xl text-sm font-bold shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-8 py-2.5 bg-[#156372] text-white border border-[#156372] rounded-xl text-sm font-bold shadow-lg shadow-[#156372]/20 transition-all hover:bg-[#12505d] hover:shadow-[#156372]/30 active:scale-95 flex items-center gap-2"
          >
            Export Now
          </button>
        </div>
      </div>
    </div>
  );
}
