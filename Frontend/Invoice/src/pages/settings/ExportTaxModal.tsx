import React, { useState, useRef, useEffect } from "react";
import { X, Eye, EyeOff, Search, Check, Plus } from "lucide-react";
import { readTaxesLocal } from "./organization-settings/taxes-compliance/TAX/storage";

const TAX_GROUP_MARKER = "__taban_tax_group__";

export default function ExportTaxModal({ isOpen, onClose, type = "tax" }) {
  const [module, setModule] = useState(type === "tax-group" ? "Tax Group" : "Tax");
  const [exportTemplate, setExportTemplate] = useState("");
  const [fileFormat, setFileFormat] = useState("CSV");
  const [includePII, setIncludePII] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [fieldMappings, setFieldMappings] = useState([
    { zohoField: type === "tax-group" ? "Tax Group Name" : "Tax Name", exportField: type === "tax-group" ? "Tax Group Name" : "Tax Name" },
    { zohoField: "Tax Name", exportField: "Tax Name" },
    { zohoField: "Tax Percentage", exportField: "Tax Percentage" }
  ]);

  const templateDropdownRef = useRef(null);
  const moduleDropdownRef = useRef(null);

  const MODULES = [
    "Tax",
    "Tax Group"
  ];

  const TEMPLATES = []; // Empty for now

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target)) {
        setShowTemplateDropdown(false);
      }
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target)) {
        setShowModuleDropdown(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredModules = MODULES.filter(m =>
    m.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  const filteredTemplates = TEMPLATES.filter(t =>
    t.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const handleSaveTemplate = () => {
    if (templateName) {
      // Save template logic here
      setShowNewTemplateModal(false);
      setTemplateName("");
      setExportTemplate(templateName);
    }
  };

  const sanitizeFileFormat = (format) => {
    // Temporary: keep export CSV-only until XLS/XLSX dependency is added back.
    const selected = (format || "CSV").toUpperCase();
    if (selected === "XLS" || selected === "XLSX") return "CSV";
    return "CSV";
  };

  const toCsvValue = (value) => {
    const str = value == null ? "" : String(value);
    const escaped = str.replace(/"/g, "\"\"");
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const downloadCsv = (rows, filename) => {
    if (!Array.isArray(rows) || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const lines = [
      headers.map(toCsvValue).join(","),
      ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(",")),
    ];

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const buildExportRows = (rows, selectedModule) => {
    const taxMap = new Map(rows.map((tax) => [String(tax._id), tax.name]));

    const normalizedRows = rows.map((tax) => {
      const groupTaxIds = Array.isArray(tax.groupTaxes) ? tax.groupTaxes.map((id) => String(id)) : [];
      const isTaxGroup = tax.description === TAX_GROUP_MARKER || groupTaxIds.length > 0;
      const associatedTaxes = groupTaxIds.map((id) => taxMap.get(id)).filter(Boolean);

      return {
        id: String(tax._id),
        name: tax.name || "",
        rate: Number(tax.rate || 0),
        status: tax.isActive === false ? "Inactive" : "Active",
        isDefault: tax.isDefault ? "Yes" : "No",
        type: isTaxGroup ? "Tax Group" : "Tax",
        associatedTaxes: associatedTaxes.join(", "),
      };
    });

    const filtered = normalizedRows.filter((row) => {
      if (selectedModule === "Tax Group") return row.type === "Tax Group";
      // Export Tax should include all taxes in the organization.
      return true;
    });

    return filtered.map((row) => ({
      [selectedModule === "Tax Group" ? "Tax Group Name" : "Tax Name"]: row.name,
      "Tax Percentage": row.rate,
      "Type": row.type,
      "Status": row.status,
      "Default": row.isDefault,
      // Keep group composition visible even in full tax export.
      ...(row.type === "Tax Group" ? { "Associated Taxes": row.associatedTaxes } : {}),
    }));
  };

  const handleExport = async () => {
    setExportError("");
    const selectedFormat = sanitizeFileFormat(fileFormat);

    try {
      setExporting(true);
      const taxes = readTaxesLocal();
      const exportRows = buildExportRows(taxes, module);
      if (exportRows.length === 0) {
        setExportError(`No ${module.toLowerCase()} data found to export.`);
        return;
      }

      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      const baseName = module === "Tax Group" ? "taban_tax_group_export" : "taban_tax_export";
      const filename = `${baseName}_${stamp}.${selectedFormat.toLowerCase()}`;
      downloadCsv(exportRows, filename);

      onClose();
    } catch (error) {
      setExportError(error.message || "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Export {type === "tax-group" ? "Tax Group" : "Tax"}
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                You can export your data from Taban Books in CSV, XLS or XLSX format.
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Module */}
              <div className="relative" ref={moduleDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowModuleDropdown(!showModuleDropdown)}
                    className="w-full h-10 px-3 pr-8 text-left rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-900">{module}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {showModuleDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={moduleSearch}
                            onChange={(e) => setModuleSearch(e.target.value)}
                            placeholder="Search"
                            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredModules.map((mod) => (
                          <button
                            key={mod}
                            onClick={() => {
                              setModule(mod);
                              setShowModuleDropdown(false);
                              setModuleSearch("");
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${
                              module === mod ? "bg-blue-50 text-blue-600" : "text-gray-700"
                            }`}
                          >
                            <span>{mod}</span>
                            {module === mod && <Check size={16} className="text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Export Template */}
              <div className="relative" ref={templateDropdownRef}>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">Export Template</label>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                      <text x="8" y="11" textAnchor="middle" fontSize="10" fill="currentColor">i</text>
                    </svg>
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                    className="w-full h-10 px-3 pr-8 text-left rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-500">
                      {exportTemplate || "Select an Export Template"}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {showTemplateDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            placeholder="Search"
                            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredTemplates.length === 0 ? (
                          <div className="p-3 text-center">
                            <p className="text-sm text-gray-500 mb-2">NO RESULTS FOUND</p>
                            <button
                              onClick={() => {
                                setShowTemplateDropdown(false);
                                setShowNewTemplateModal(true);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
                            >
                              <Plus size={16} />
                              New Template
                            </button>
                          </div>
                        ) : (
                          filteredTemplates.map((template) => (
                            <button
                              key={template}
                              onClick={() => {
                                setExportTemplate(template);
                                setShowTemplateDropdown(false);
                                setTemplateSearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between text-gray-700"
                            >
                              <span>{template}</span>
                              {exportTemplate === template && <Check size={16} className="text-blue-600" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Export File Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export File Format <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileFormat"
                      value="CSV"
                      checked={fileFormat === "CSV"}
                      onChange={(e) => setFileFormat(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">CSV (Comma Separated Value)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileFormat"
                      value="XLS"
                      checked={fileFormat === "XLS"}
                      onChange={(e) => setFileFormat(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">XLS (Microsoft Excel 1997-2004 Compatible)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileFormat"
                      value="XLSX"
                      checked={fileFormat === "XLSX"}
                      onChange={(e) => setFileFormat(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">XLSX (Microsoft Excel)</span>
                  </label>
                </div>
              </div>

              {/* Include PII */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePII}
                  onChange={(e) => setIncludePII(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Include Sensitive Personally Identifiable Information (PII) while exporting.
                </span>
              </label>

              {/* File Protection Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Protection Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                </p>
              </div>
            </div>

            {exportError && (
              <div className="mt-4 text-sm text-red-600">{exportError}</div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {exporting ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">New Export Template</h3>
                <button
                  onClick={() => {
                    setShowNewTemplateModal(false);
                    setTemplateName("");
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter template name"
                    autoFocus
                  />
                </div>

                {/* Field Mapping */}
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-sm font-semibold text-gray-700">FIELD NAME IN ZOHO BOOKS</div>
                    <div className="text-sm font-semibold text-gray-700">FIELD NAME IN EXPORT FILE</div>
                  </div>
                  <div className="space-y-2">
                    {fieldMappings.map((mapping, index) => (
                      <div key={index} className="grid grid-cols-2 gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 cursor-move">
                            <path d="M2 6h12M2 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          <select
                            value={mapping.zohoField}
                            onChange={(e) => {
                              const newMappings = [...fieldMappings];
                              newMappings[index].zohoField = e.target.value;
                              setFieldMappings(newMappings);
                            }}
                            className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option>{type === "tax-group" ? "Tax Group Name" : "Tax Name"}</option>
                            <option>Tax Name</option>
                            <option>Tax Percentage</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={mapping.exportField}
                          onChange={(e) => {
                            const newMappings = [...fieldMappings];
                            newMappings[index].exportField = e.target.value;
                            setFieldMappings(newMappings);
                          }}
                          className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setFieldMappings([...fieldMappings, { zohoField: "", exportField: "" }]);
                    }}
                    className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add a New Field
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowNewTemplateModal(false);
                    setTemplateName("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={!templateName}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save and Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

