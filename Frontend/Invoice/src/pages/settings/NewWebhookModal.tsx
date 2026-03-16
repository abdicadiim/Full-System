import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2 } from "lucide-react";

const MODULES = [
  { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
  { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
  { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
  { category: "CONTACTS", items: ["Customers", "Vendors"] },
  { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
  { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
  { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] },
];

const URL_REGEX = /^https?:\/\/.+/i;

export default function NewWebhookModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [module, setModule] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState("POST");
  const [url, setUrl] = useState("");
  const [parameters, setParameters] = useState([{ key: "", value: "" }]);
  const [headers, setHeaders] = useState([{ key: "", value: "" }]);
  const [secureWebhook, setSecureWebhook] = useState(false);
  const [secretToken, setSecretToken] = useState("");
  const [authorizationType, setAuthorizationType] = useState("self");
  const [bodyType, setBodyType] = useState("default_payload");
  const [body, setBody] = useState("");

  const addRow = (setter: any) => setter((prev: any[]) => [...prev, { key: "", value: "" }]);
  const removeRow = (setter: any, index: number) =>
    setter((prev: any[]) => prev.filter((_, currentIndex) => currentIndex !== index));
  const updateRow = (setter: any, index: number, field: "key" | "value", value: string) =>
    setter((prev: any[]) => prev.map((entry, currentIndex) => (currentIndex === index ? { ...entry, [field]: value } : entry)));

  const sanitizeKeyValue = (rows: Array<{ key: string; value: string }>) =>
    rows
      .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
      .filter((row) => row.key);

  const handleSave = () => {
    if (!name || !module || !url.trim()) {
      alert("Name, module and URL are required.");
      return;
    }
    if (!URL_REGEX.test(url.trim())) {
      alert("Please enter a valid HTTP or HTTPS URL.");
      return;
    }
    if (secureWebhook && !/^[a-zA-Z0-9]{12,50}$/.test(secretToken.trim())) {
      alert("Secret token must be alphanumeric and between 12 and 50 characters.");
      return;
    }

    onSave({
      name: name.trim(),
      module,
      description: description.trim(),
      method,
      url: url.trim(),
      parameters: sanitizeKeyValue(parameters),
      headers: sanitizeKeyValue(headers),
      secureWebhook,
      secretToken: secureWebhook ? secretToken.trim() : "",
      authorizationType,
      bodyType,
      body: bodyType === "raw" ? body : "",
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
          <h3 className="text-lg font-semibold text-gray-900">New Webhook</h3>
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
                placeholder="Enter webhook name"
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
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL & Parameters<span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/webhook"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Query Parameters</label>
              <button
                type="button"
                onClick={() => addRow(setParameters)}
                className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <Plus size={12} /> Add Parameter
              </button>
            </div>
            <div className="space-y-2">
              {parameters.map((parameter, index) => (
                <div key={`parameter-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    value={parameter.key}
                    onChange={(e) => updateRow(setParameters, index, "key", e.target.value)}
                    className="h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Key"
                  />
                  <input
                    type="text"
                    value={parameter.value}
                    onChange={(e) => updateRow(setParameters, index, "value", e.target.value)}
                    className="h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(setParameters, index)}
                    className="h-10 px-3 border border-gray-300 rounded-lg hover:bg-red-50 text-red-600"
                    disabled={parameters.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Headers</label>
              <button
                type="button"
                onClick={() => addRow(setHeaders)}
                className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <Plus size={12} /> Add Header
              </button>
            </div>
            <div className="space-y-2">
              {headers.map((header, index) => (
                <div key={`header-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => updateRow(setHeaders, index, "key", e.target.value)}
                    className="h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Header Key"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => updateRow(setHeaders, index, "value", e.target.value)}
                    className="h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Header Value"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(setHeaders, index)}
                    className="h-10 px-3 border border-gray-300 rounded-lg hover:bg-red-50 text-red-600"
                    disabled={headers.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Authorization Type</label>
              <select
                value={authorizationType}
                onChange={(e) => setAuthorizationType(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="self">Self-Authorization</option>
                <option value="connections">Connections</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Body Type</label>
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default_payload">Default Payload</option>
                <option value="form-data">form-data</option>
                <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
                <option value="raw">Raw (JSON)</option>
              </select>
            </div>
          </div>

          {bodyType === "raw" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Raw Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                placeholder='{"key":"value"}'
              />
            </div>
          )}

          <div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={secureWebhook}
                onChange={(e) => setSecureWebhook(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              I want to secure this webhook
            </label>
            {secureWebhook && (
              <input
                type="text"
                value={secretToken}
                onChange={(e) => setSecretToken(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Alphanumeric secret token (12-50 chars)"
              />
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

