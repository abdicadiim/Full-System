import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown } from "lucide-react";

export default function NewWorkflowRuleModal({ onClose, onSave }) {
  const [workflowName, setWorkflowName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");

  const modules = [
    { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
    { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
    { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
    { category: "CONTACTS", items: ["Customers", "Vendors"] },
    { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
    { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
    { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] }
  ];

  const handleNext = () => {
    if (workflowName && module) {
      onSave({ workflowName, description, module });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Workflow Rule</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Workflow Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workflow Rule Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter workflow rule name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter description"
            />
          </div>

          {/* Module */}
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
              {modules.map((moduleGroup, idx) => (
                <optgroup key={idx} label={moduleGroup.category}>
                  {moduleGroup.items.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </optgroup>
              ))}
            </select>
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
            onClick={handleNext}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

