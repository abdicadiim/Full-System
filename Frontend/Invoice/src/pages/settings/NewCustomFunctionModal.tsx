import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const MODULES = [
  { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
  { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
  { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
  { category: "CONTACTS", items: ["Customers", "Vendors"] },
  { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
  { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
  { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] },
];

const DELUGE_SAMPLE = `// Deluge sample
organizationID = organization.get("organization_id");
info organizationID;`;

export default function NewCustomFunctionModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [language, setLanguage] = useState("deluge");
  const [code, setCode] = useState(DELUGE_SAMPLE);

  const handleLanguageChange = (nextLanguage: string) => {
    setLanguage(nextLanguage);
    if (!code.trim()) {
      setCode(nextLanguage === "deluge" ? DELUGE_SAMPLE : "");
    }
  };

  const handleSave = () => {
    if (!name || !module || !code.trim()) {
      alert("Name, module and code are required.");
      return;
    }
    onSave({
      name: name.trim(),
      module,
      description: description.trim(),
      language,
      code: code.trim(),
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Custom Function</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition">
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Give a unique custom function name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Module<span className="text-red-500">*</span>
              </label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select module</option>
                {MODULES.map((group, idx) => (
                  <optgroup key={idx} label={group.category}>
                    {group.items.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what this function does"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Programming Language</label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="deluge">Deluge</option>
              <option value="javascript">JavaScript (CLI)</option>
              <option value="python">Python (CLI)</option>
              <option value="java">Java (CLI)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code<span className="text-red-500">*</span>
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-72 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
              placeholder="Write your custom function here..."
            />
            {language !== "deluge" && (
              <p className="text-xs text-gray-500 mt-2">
                Non-Deluge functions are expected to be executed through Zoho Finance CLI-compatible infrastructure.
              </p>
            )}
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
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

