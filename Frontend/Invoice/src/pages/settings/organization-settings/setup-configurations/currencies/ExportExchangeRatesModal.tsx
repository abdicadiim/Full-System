import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Info, Eye, EyeOff } from "lucide-react";

export default function ExportExchangeRatesModal({ onClose, onExport }) {
  const [module, setModule] = useState("Exchange Rates");
  const [exportTemplate, setExportTemplate] = useState("");
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [fileFormat, setFileFormat] = useState("csv");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleExport = () => {
    onExport({
      module,
      exportTemplate,
      decimalFormat,
      fileFormat,
      password
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Export Exchange Rates
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-6 mt-6">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              You can export your data from Zoho Books in CSV, XLS or XLSX format.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Module */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Module<span className="text-red-500">*</span>
            </label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Exchange Rates</option>
            </select>
          </div>

          {/* Export Template */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Export Template
              </label>
              <Info size={14} className="text-gray-400" />
            </div>
            <select
              value={exportTemplate}
              onChange={(e) => setExportTemplate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an Export Template</option>
              <option value="template1">Template 1</option>
              <option value="template2">Template 2</option>
            </select>
          </div>

          {/* Decimal Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decimal Format<span className="text-red-500">*</span>
            </label>
            <select
              value={decimalFormat}
              onChange={(e) => setDecimalFormat(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1234567.89">1234567.89</option>
              <option value="1,234,567.89">1,234,567.89</option>
              <option value="1.234.567,89">1.234.567,89</option>
            </select>
          </div>

          {/* Export File Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export File Format<span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fileFormat"
                  value="csv"
                  checked={fileFormat === "csv"}
                  onChange={(e) => setFileFormat(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">CSV (Comma Separated Value)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fileFormat"
                  value="xls"
                  checked={fileFormat === "xls"}
                  onChange={(e) => setFileFormat(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">XLS (Microsoft Excel 1997-2004 Compatible)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fileFormat"
                  value="xlsx"
                  checked={fileFormat === "xlsx"}
                  onChange={(e) => setFileFormat(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">XLSX (Microsoft Excel)</span>
              </label>
            </div>
          </div>

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

          {/* Note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Note:</span> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{" "}
              <a href="#" className="text-blue-600 hover:underline">Backup Your Data</a>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Export
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

