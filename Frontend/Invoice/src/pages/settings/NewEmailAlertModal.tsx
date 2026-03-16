import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { emailTemplatesAPI, senderEmailsAPI } from "../../services/api";

type SenderEmail = { _id: string; name?: string; email: string };
type EmailTemplate = { _id?: string; name?: string; key?: string; module?: string };

const MODULES = [
  { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
  { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
  { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
  { category: "CONTACTS", items: ["Customers", "Vendors"] },
  { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
  { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
  { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] },
];

const RECIPIENT_OPTIONS = [
  "Primary Contact",
  "All Contact Persons",
  "Customer",
  "Vendor",
  "Owner",
  "Assigned Users",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseEmails = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function NewEmailAlertModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [additionalRecipients, setAdditionalRecipients] = useState("");
  const [attachPDF, setAttachPDF] = useState(false);
  const [senders, setSenders] = useState<SenderEmail[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        setLoadingMeta(true);
        const [sendersRes, templatesRes] = await Promise.all([
          senderEmailsAPI.getAll(),
          emailTemplatesAPI.getAll(),
        ]);

        const senderList = Array.isArray(sendersRes?.data) ? sendersRes.data : [];
        const templateList = Array.isArray(templatesRes?.data)
          ? templatesRes.data
          : templatesRes?.data && typeof templatesRes.data === "object"
          ? Object.entries(templatesRes.data).map(([key, value]: any) => ({
              key,
              ...(value || {}),
            }))
          : [];

        setSenders(senderList);
        setTemplates(templateList);
      } catch (error) {
        console.error("Failed to load email alert metadata:", error);
      } finally {
        setLoadingMeta(false);
      }
    };

    loadMeta();
  }, []);

  const templateOptions = useMemo(() => {
    if (!module) return templates;
    return templates.filter((template) => !template.module || template.module === module);
  }, [templates, module]);

  const handleRecipientsChange = (value: string) => {
    const exists = emailRecipients.includes(value);
    if (exists) {
      setEmailRecipients((prev) => prev.filter((item) => item !== value));
    } else {
      setEmailRecipients((prev) => [...prev, value]);
    }
  };

  const handleSave = () => {
    const parsedAdditionalRecipients = parseEmails(additionalRecipients);
    if (!name || !module || !emailTemplate || !emailRecipients.length) {
      alert("Name, module, email template and recipients are required.");
      return;
    }
    if (parsedAdditionalRecipients.length > 10) {
      alert("You can add a maximum of 10 additional recipients.");
      return;
    }
    if (parsedAdditionalRecipients.some((email) => !EMAIL_REGEX.test(email))) {
      alert("Please enter valid additional recipient email addresses separated by commas.");
      return;
    }

    onSave({
      name: name.trim(),
      module,
      from,
      emailTemplate,
      emailRecipients,
      additionalRecipients: parsedAdditionalRecipients,
      attachPDF,
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
          <h3 className="text-lg font-semibold text-gray-900">New Email Alert</h3>
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
              placeholder="Give a unique email alert name"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select sender email</option>
              {senders.map((sender) => (
                <option key={sender._id} value={sender.email}>
                  {sender.name ? `${sender.name} <${sender.email}>` : sender.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Email Template<span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-700"
                onClick={() => alert("Create a new template from Settings > Email Notifications > Templates.")}
              >
                + Add New Email Template
              </button>
            </div>
            <select
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingMeta}
            >
              <option value="">{loadingMeta ? "Loading templates..." : "Select email template"}</option>
              {templateOptions.map((template, index) => {
                const templateName = template.name || template.key || `Template ${index + 1}`;
                return (
                  <option key={template._id || template.key || `${templateName}-${index}`} value={templateName}>
                    {templateName}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Recipients<span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-300 rounded-lg p-3">
              {RECIPIENT_OPTIONS.map((recipient) => (
                <label key={recipient} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={emailRecipients.includes(recipient)}
                    onChange={() => handleRecipientsChange(recipient)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  {recipient}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Recipients</label>
            <input
              type="text"
              value={additionalRecipients}
              onChange={(e) => setAdditionalRecipients(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="name@example.com, another@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum 10 emails, separated by commas.</p>
          </div>

          {module && (
            <div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={attachPDF}
                  onChange={(e) => setAttachPDF(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Attach {module} PDF</span>
              </label>
            </div>
          )}
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
