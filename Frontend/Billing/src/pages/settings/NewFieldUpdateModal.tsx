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

const FIELD_OPTIONS = [
  "Reference #",
  "Expiry Date",
  "Sales Person",
  "Notes",
  "Terms & Conditions",
  "Adjustment Description",
];

export default function NewFieldUpdateModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [module, setModule] = useState("");
  const [fieldToUpdate, setFieldToUpdate] = useState("");
  const [newValue, setNewValue] = useState("");
  const [updateWithEmptyValue, setUpdateWithEmptyValue] = useState(false);

  const handleSave = () => {
    if (!name || !module || !fieldToUpdate) {
      alert("Name, module and field to update are required.");
      return;
    }
    if (!updateWithEmptyValue && !newValue.trim()) {
      alert("Enter a new value or enable 'Update with empty value'.");
      return;
    }
    onSave({
      name: name.trim(),
      module,
      fieldToUpdate,
      newValue: updateWithEmptyValue ? "" : newValue,
      updateWithEmptyValue,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Field Update</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition">
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Give a unique field update name"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update<span className="text-red-500">*</span>
            </label>
            <select
              value={fieldToUpdate}
              onChange={(e) => setFieldToUpdate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select field</option>
              {FIELD_OPTIONS.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              disabled={updateWithEmptyValue}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter value to update"
            />
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={updateWithEmptyValue}
                onChange={(e) => setUpdateWithEmptyValue(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              Update with empty value
            </label>
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

