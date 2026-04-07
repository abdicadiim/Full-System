import React, { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";

type CustomField = {
  name: string;
  dataType: string;
  mandatory: string;
  showInAllPDFs: string;
  status: "Active" | "Inactive";
};

const defaultCustomFields: CustomField[] = [
  {
    name: "Terms & Conditions",
    dataType: "Text Box (Multi-line)",
    mandatory: "No",
    showInAllPDFs: "Yes",
    status: "Active",
  },
  {
    name: "Sales person",
    dataType: "Text Box (Single Line)",
    mandatory: "No",
    showInAllPDFs: "Yes",
    status: "Active",
  },
];

export default function SalesReceiptsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [depositAccount, setDepositAccount] = useState("");
  const [termsText, setTermsText] = useState("");
  const [notesText, setNotesText] = useState("");

  const [customFields, setCustomFields] = useState<CustomField[]>(defaultCustomFields);
  const customFieldsUsage = 0;
  const maxCustomFields = 135;

  const depositOptions = [
    "Select an account",
    "Operating Account",
    "Savings Account",
    "Petty Cash",
  ];

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Sales Receipts</h1>

      <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
        {[
          { label: "General", key: "general" },
          { label: "Field Customization", key: "field-customization" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "text-[#0f6e60] border-b-2 border-[#0f6e60]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Deposit To</p>
            <p className="text-xs text-gray-500">Select a default account to deposit your payments</p>
            <div className="relative">
              <select
                value={depositAccount}
                onChange={(e) => setDepositAccount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60] bg-white text-sm"
              >
                {depositOptions.map((option) => (
                  <option key={option} value={option === "Select an account" ? "" : option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Terms & Conditions</p>
            <textarea
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60] text-sm"
              placeholder="Enter your terms & conditions"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">Notes</p>
              <span className="text-xs text-gray-500">(optional)</span>
            </div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f6e60] text-sm"
              placeholder="Enter any notes to be displayed in your transaction"
            />
          </div>

          <div className="flex justify-end">
            <button className="px-6 py-2 rounded-lg bg-[#0f6e60] text-white font-semibold shadow">
              Save
            </button>
          </div>
        </div>
      )}

      {activeTab === "field-customization" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#1665c1]">Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}</p>
            <button
              onClick={() =>
                setCustomFields([
                  { name: "Sample Field", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active" },
                  ...customFields,
                ])
              }
              className="px-5 py-2 bg-[#0f6e60] text-white text-sm font-medium rounded-lg hover:bg-[#0c5a4d] flex items-center gap-2 shadow"
            >
              <span className="text-lg leading-none">+</span>
              New Custom Field
            </button>
          </div>

          <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden shadow-[0_8px_24px_rgba(15,110,96,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f5fbfb] border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase text-xs">Field Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase text-xs">Data Type</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase text-xs">Mandatory</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase text-xs">Show In All PDFs</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {customFields.map((field, index) => (
                    <tr key={field.name + index}>
                      <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                        <Lock size={14} className="text-gray-400" />
                        {field.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs bg-[#d9f1ea] text-[#0f6e60] font-semibold">
                          {field.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
