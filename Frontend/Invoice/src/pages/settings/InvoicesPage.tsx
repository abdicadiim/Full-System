import React, { useState } from "react";
import { X } from "lucide-react";

type CustomButton = {
  id: string;
  name: string;
  type: string;
};

type CustomField = {
  name: string;
  dataType: string;
  mandatory: "Yes" | "No";
  showInPdf: "Yes" | "No";
  status: "Active" | "Inactive";
};
export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("general");
  
  // Custom Buttons tab states
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [locationFilter, setLocationFilter] = useState("All");
  const [showNewButtonModal, setShowNewButtonModal] = useState(false);
  const [newButtonName, setNewButtonName] = useState("");
  const [newButtonType, setNewButtonType] = useState("");

  const [prefix, setPrefix] = useState("INV-");
  const [nextNumber, setNextNumber] = useState("000001");
  const [associateExpense, setAssociateExpense] = useState(false);
  const [earlyDiscount, setEarlyDiscount] = useState(false);
  const [earlyDiscountDays, setEarlyDiscountDays] = useState("");
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [invoiceQRCode, setInvoiceQRCode] = useState(false);
  const [zeroValue, setZeroValue] = useState(false);
  const [setupFeeLabel, setSetupFeeLabel] = useState("Setup Fee");
  const [termsText, setTermsText] = useState("");
  const [customerNotesText, setCustomerNotesText] = useState("Thanks for your business.");
  const [invoiceApprovalType, setInvoiceApprovalType] = useState("no-approval");
  const [customFields] = useState<CustomField[]>([
    { name: "Discount", dataType: "Percent", mandatory: "No", showInPdf: "Yes", status: "Active" },
    { name: "Terms & Conditions", dataType: "Text Box (Multi-line)", mandatory: "No", showInPdf: "Yes", status: "Active" },
    { name: "Sales person", dataType: "Text Box (Single Line)", mandatory: "No", showInPdf: "Yes", status: "Active" },
    { name: "Subject", dataType: "Text Box (Single Line)", mandatory: "No", showInPdf: "Yes", status: "Active" },
  ]);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Invoices</h1>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
        {["General","Approvals","Field Customization","Record Locking","Custom Buttons","Related Lists"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase().replace(/\s+/g,"-"))}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.toLowerCase().replace(/\s+/g,"-")
                ? "text-[#0f6e60] border-b-2 border-[#0f6e60]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Field Customization Tab Content */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-[#dfe3eb] bg-[#eaf5f1] p-4">
            <p className="text-sm text-gray-700">
              You can configure subscription-specific invoice settings from Billing Preferences under Settings → Subscriptions.
            </p>
            <button className="text-sm text-[#0f6e60] hover:underline font-medium mt-2">
              Access Billing Preferences →
            </button>
          </div>

          <div className="p-6 space-y-4 bg-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Number</h2>
            <p className="text-sm text-gray-600">
              An invoice name consists of a prefix followed by an invoice number. You can edit the prefix and invoice number below to suit your business needs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Next Number</label>
                <input
                  type="text"
                  value={nextNumber}
                  onChange={(e) => setNextNumber(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60]"
                />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={associateExpense}
                onChange={(e) => setAssociateExpense(e.target.checked)}
                className="h-4 w-4 accent-[#0f6e60] border-[#0f6e60]"
              />
              Associate and display expense receipts in Invoice PDF
            </label>
          </div>

          <div className="p-6 space-y-4 bg-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Early Payment Discount</h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={earlyDiscount}
                onChange={(e) => setEarlyDiscount(e.target.checked)}
                className="h-4 w-4 accent-[#0f6e60] border-[#0f6e60]"
              />
              <span>
                Provide a discount when a customer makes an offline payment before the number of days you specify from the invoice due date.
                <p className="text-xs text-gray-500 mt-1">Note: This discount will not be applied to online payments.</p>
              </span>
            </label>
            {earlyDiscount && (
              <input
                type="text"
                value={earlyDiscountDays}
                onChange={(e) => setEarlyDiscountDays(e.target.value)}
                placeholder="Number of days"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60]"
              />
            )}
          </div>

          <div className="p-6 space-y-4 bg-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyPayments}
                onChange={(e) => setNotifyPayments(e.target.checked)}
                className="h-4 w-4 accent-[#0f6e60] border-[#0f6e60]"
              />
              Get notified when customers pay online
            </label>
          </div>

          <div className="p-6 space-y-4 bg-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Invoice QR Code</h2>
            <p className="text-sm text-gray-600">
              Enable and configure the QR code you want to display on the PDF copy of an invoice. Your customers can scan the QR code using their device to access the URL or other information that you configure.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setInvoiceQRCode(!invoiceQRCode)}
                className={`px-4 py-2 rounded-full border ${invoiceQRCode ? "bg-[#0f6e60] text-white border-[#0f6e60]" : "bg-white border-gray-300 text-gray-600"}`}
              >
                {invoiceQRCode ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Zero-Value Line Items</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={zeroValue}
                onChange={(e) => setZeroValue(e.target.checked)}
                className="h-4 w-4 accent-[#0f6e60] border-[#0f6e60]"
              />
              Hide zero-value line items
            </label>
            <p className="text-xs text-gray-500">
              Choose whether you want to hide zero-value line items in an invoice's PDF and the Customer Portal. They will still be visible while editing an invoice. This setting will not apply to invoices whose total is zero.
            </p>
          </div>

          <div className="p-6 space-y-4 bg-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Setup Fee Label</h2>
            <input
              type="text"
              value={setupFeeLabel}
              onChange={(e) => setSetupFeeLabel(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60]"
            />
          </div>

          <div className="border border-gray-200 p-6 space-y-4 bg-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Terms & Conditions</h2>
            <textarea
              rows={4}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60]"
            />
          </div>

          <div className="border border-gray-200 p-6 space-y-4 bg-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Customer Notes</h2>
            <textarea
              rows={4}
              value={customerNotesText}
              onChange={(e) => setCustomerNotesText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60]"
            />
          </div>

          <div className="flex justify-end">
            <button className="px-6 py-2 rounded-lg bg-[#0f6e60] text-white font-semibold hover:bg-[#0f6e60]">
              Save
            </button>
          </div>
        </div>
      )}

      {activeTab === "approvals" && (
        <div>
          <div className="flex items-start gap-4 flex-wrap">
            {[
              {
                key: "no-approval",
                title: "No Approval",
                description: "Create Invoice and perform further actions without approval.",
              },
              {
                key: "simple",
                title: "Simple Approval",
                description: "Any user with approve permission can approve the Invoice.",
              },
              {
                key: "multi-level",
                title: "Multi-Level Approval",
                description:
                  "Set many levels of approval. The Invoice will be approved only when all the approvers approve.",
              },
              {
                key: "custom",
                title: "Custom Approval",
                description: "Create a customized approval flow by adding one or more criteria.",
              },
            ].map((option) => (
              <label
                key={option.key}
                className={`flex-1 min-w-[200px] rounded-lg border ${
                  invoiceApprovalType === option.key ? "border-[#0f6e60]" : "border-gray-200"
                } bg-[#f9fbfd] p-4 flex flex-col gap-2 cursor-pointer transition`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="invoiceApproval"
                    value={option.key}
                    checked={invoiceApprovalType === option.key}
                    onChange={() => setInvoiceApprovalType(option.key)}
                    className="accent-[#0f6e60] h-4 w-4"
                  />
                  <h3 className="text-sm font-semibold text-gray-900">{option.title}</h3>
                </div>
                <p className="text-xs text-gray-600">{option.description}</p>
              </label>
            ))}
          </div>
          <div className="mt-6">
            <button className="px-5 py-2 rounded-lg bg-[#0f6e60] text-white font-semibold hover:bg-[#0f6e60]">
              Save
            </button>
          </div>
        </div>
      )}

      {activeTab === "field-customization" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Field Customization</h2>
              <p className="text-sm text-gray-600">Add fields to capture extra invoice details.</p>
            </div>
            <span className="text-sm font-semibold text-[#0f6e60]">
              Custom Fields Usage: {customFields.length}/135
            </span>
          </div>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-gray-700">
              <thead className="bg-white text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Field Name</th>
                  <th className="px-4 py-3">Data Type</th>
                  <th className="px-4 py-3">Mandatory</th>
                  <th className="px-4 py-3">Show In All PDFs</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {customFields.map((field) => (
                  <tr key={field.name} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{field.name}</td>
                    <td className="px-4 py-3">{field.dataType}</td>
                    <td className="px-4 py-3">{field.mandatory}</td>
                    <td className="px-4 py-3">{field.showInPdf}</td>
                    <td className="px-4 py-3 text-[#0f6e60] font-semibold">{field.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button className="px-5 py-2 text-sm font-semibold text-white bg-[#0f6e60] rounded-lg">
              + New Custom Field
            </button>
          </div>
        </div>
      )}


      {/* Custom Buttons Tab Content */}
      {activeTab === "custom-buttons" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Custom Buttons</p>
              <p className="text-xs text-gray-500">
                Add workflow buttons that appear on invoices, so your teams can act faster.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-[#0f6e60] hover:text-[#0f6e60] hover:underline">
                What's this?
              </button>
              <button className="text-sm text-[#0f6e60] hover:text-[#0f6e60] hover:underline">
                View Logs
              </button>
              <button
                onClick={() => setShowNewButtonModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span>
                New
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span>Location:</span>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm"
            >
              {["All","Invoice Header","Invoice Footer","Customer Portal"].map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {customButtons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-center text-gray-500">
              Create buttons which perform actions set by you. What are you waiting for!
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-[#f5f7fb] text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Button Name</th>
                    <th className="px-4 py-3 text-left">Access Permission</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customButtons.map((button) => (
                    <tr key={button.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{button.name}</td>
                      <td className="px-4 py-3">Purchaser</td>
                      <td className="px-4 py-3">{locationFilter}</td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-[#0f6e60] hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "record-locking" && (
        <div className="flex flex-col items-center text-center space-y-4 py-20">
          <div className="bg-[#e6f4ff] h-24 w-24 rounded-full flex items-center justify-center shadow-sm">
            <div className="bg-white h-16 w-16 rounded-full flex items-center justify-center">
              <div className="h-10 w-10 rounded-lg bg-[#cfe5ff] flex items-center justify-center">
                <div className="h-5 w-5 bg-[#0f6e60] rounded" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Record Locking</h2>
          <p className="text-sm text-gray-600 max-w-xl">
            Record Locking helps you control updates to records. You can specify which actions and field updates to allow or restrict after records are locked, and choose who can perform these actions. This is useful for protecting important information and preventing accidental changes.
          </p>
          <button className="px-5 py-2 rounded-lg bg-[#0f6e60] text-white font-semibold shadow">
            + New Lock Configuration
          </button>
        </div>
      )}

      {activeTab === "related-lists" && (
        <div className="flex flex-col items-center text-center space-y-6 py-12">
          <div className="h-40 w-56 bg-gradient-to-br from-[#eef2ff] to-white rounded-3xl shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 bg-white rounded-full shadow-md flex items-center justify-center">
                <svg
                  className="h-12 w-12 text-[#0f6e60]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 5a7 7 0 100 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10z" />
                  <path d="M12 7a1 1 0 011 1v3h3a1 1 0 110 2h-4a1 1 0 01-1-1V8a1 1 0 011-1z" />
                </svg>
              </div>
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-900">Related Lists</p>
          <p className="text-sm text-gray-600 max-w-2xl px-6">
            Create custom related lists to access relevant information available from inside or outside the application.
          </p>
          <button className="px-6 py-2 rounded-lg bg-[#0f6e60] text-white font-semibold">
            + New Related List
          </button>
        </div>
      )}

      {/* New Custom Button Modal */}
      {showNewButtonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Custom Button - Invoices</h2>
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Button Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newButtonName}
                  onChange={(e) => setNewButtonName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter button name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Type
                </label>
                <select
                  value={newButtonType}
                  onChange={(e) => setNewButtonType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Select</option>
                  <option value="workflow">Workflow</option>
                  <option value="script">Script</option>
                  <option value="url">URL</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

