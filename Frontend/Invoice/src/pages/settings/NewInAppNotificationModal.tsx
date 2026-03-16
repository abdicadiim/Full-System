import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown } from "lucide-react";

const MODULES = [
  { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
  { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
  { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
  { category: "CONTACTS", items: ["Customers", "Vendors"] },
  { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
  { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
  { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] },
];

const PLACEHOLDERS = [
  "${ORGANIZATION.NAME}",
  "${USER.NAME}",
  "${INVOICE.INVOICE_NUMBER}",
  "${INVOICE.TOTAL}",
  "${BILL.BILL_NUMBER}",
  "${CONTACT.CONTACT_NAME}",
];

const RECIPIENT_OPTIONS = [
  "Admins",
  "All Users",
  "Staff",
  "Sales Team",
  "Purchases Team",
];

export default function NewInAppNotificationModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [module, setModule] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [showPlaceholderDropdown, setShowPlaceholderDropdown] = useState(false);

  const toggleRecipient = (recipient: string) => {
    setRecipients((prev) =>
      prev.includes(recipient) ? prev.filter((entry) => entry !== recipient) : [...prev, recipient]
    );
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    setMessage((prev) => prev + placeholder);
    setShowPlaceholderDropdown(false);
  };

  const handleSave = () => {
    if (!name || !module || !recipients.length || !message.trim()) {
      alert("Name, module, recipients and message are required.");
      return;
    }
    onSave({ name: name.trim(), module, recipients, message: message.trim() });
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
          <h3 className="text-lg font-semibold text-gray-900">New In-app Notification</h3>
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
              placeholder="Give a unique notification name"
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
              Recipients<span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-300 rounded-lg p-3">
              {RECIPIENT_OPTIONS.map((recipient) => (
                <label key={recipient} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={recipients.includes(recipient)}
                    onChange={() => toggleRecipient(recipient)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  {recipient}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Message<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPlaceholderDropdown((prev) => !prev)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Insert Placeholders
                  <ChevronDown size={14} />
                </button>
                {showPlaceholderDropdown && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {PLACEHOLDERS.map((placeholder) => (
                        <button
                          key={placeholder}
                          onClick={() => handleInsertPlaceholder(placeholder)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                        >
                          {placeholder}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Type notification message"
            />
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

