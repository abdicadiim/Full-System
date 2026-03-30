import React, { useEffect, useState } from "react";
import { ChevronDown, Lock, Loader2, Plus, X } from "lucide-react";
import { settingsAPI } from "../../services/api";
import toast from "react-hot-toast";

type RetainerInvoiceSettings = {
  termsConditions: string;
  customerNotes: string;
  approvalType: "no-approval" | "simple" | "multi-level" | "custom";
  notificationPreference: "all-submitters" | "approvers-only" | "submitter-only";
  sendNotifications: boolean;
  notifySubmitter: boolean;
};

type CustomField = {
  name: string;
  dataType: string;
  mandatory: string;
  showInAllPDFs: string;
  status: string;
  locked: boolean;
};

type CustomButton = {
  name: string;
  type: string;
  location: string;
};

type RelatedList = {
  name: string;
  module: string;
};

const DEFAULT_SETTINGS: RetainerInvoiceSettings = {
  termsConditions: "",
  customerNotes: "",
  approvalType: "no-approval",
  notificationPreference: "all-submitters",
  sendNotifications: true,
  notifySubmitter: true,
};

const DEFAULT_FIELDS: CustomField[] = [
  { name: "Sales Person", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
  { name: "Description", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
];

export default function RetainerInvoicesPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RetainerInvoiceSettings>(DEFAULT_SETTINGS);
  const [customFields, setCustomFields] = useState<CustomField[]>(DEFAULT_FIELDS);
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [relatedLists, setRelatedLists] = useState<RelatedList[]>([]);
  const [showNewButtonModal, setShowNewButtonModal] = useState(false);
  const [newButtonName, setNewButtonName] = useState("");
  const [newButtonType, setNewButtonType] = useState("");
  const [customFieldName, setCustomFieldName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await settingsAPI.getRetainerInvoiceSettings();
        if (response?.success && response.data) {
          const data = response.data as any;
          setSettings({
            termsConditions: String(data.termsConditions || ""),
            customerNotes: String(data.customerNotes || ""),
            approvalType: data.approvalType === "simple" || data.approvalType === "multi-level" || data.approvalType === "custom"
              ? data.approvalType
              : "no-approval",
            notificationPreference: data.notificationPreference === "approvers-only" || data.notificationPreference === "submitter-only"
              ? data.notificationPreference
              : "all-submitters",
            sendNotifications: data.sendNotifications !== undefined ? Boolean(data.sendNotifications) : true,
            notifySubmitter: data.notifySubmitter !== undefined ? Boolean(data.notifySubmitter) : true,
          });
          setCustomFields(Array.isArray(data.customFields) && data.customFields.length > 0 ? data.customFields : DEFAULT_FIELDS);
          setCustomButtons(Array.isArray(data.customButtons) ? data.customButtons : []);
          setRelatedLists(Array.isArray(data.relatedLists) ? data.relatedLists : []);
        }
      } catch (error) {
        console.error("Failed to load retainer invoice settings:", error);
        toast.error("Failed to load retainer invoice settings");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await settingsAPI.updateRetainerInvoiceSettings({
        ...settings,
        customFields,
        customButtons,
        relatedLists,
      });
      if (response?.success) {
        toast.success("Retainer invoice settings saved successfully");
      } else {
        toast.error(response?.message || "Failed to save retainer invoice settings");
      }
    } catch (error) {
      console.error("Failed to save retainer invoice settings:", error);
      toast.error("Failed to save retainer invoice settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-none p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Retainer Invoices</h1>

      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {[
          { key: "general", label: "General" },
          { key: "approvals", label: "Approvals" },
          { key: "field-customization", label: "Field Customization" },
          { key: "custom-buttons", label: "Custom Buttons" },
          { key: "related-lists", label: "Related Lists" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="max-w-3xl space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
            <textarea
              value={settings.termsConditions}
              onChange={(e) => setSettings((prev) => ({ ...prev, termsConditions: e.target.value }))}
              rows={8}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter terms and conditions"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Notes</h3>
            <textarea
              value={settings.customerNotes}
              onChange={(e) => setSettings((prev) => ({ ...prev, customerNotes: e.target.value }))}
              rows={8}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter customer notes"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {activeTab === "approvals" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Approval Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                {
                  key: "no-approval",
                  title: "No Approval",
                  desc: "Create retainer invoices and perform further actions without approval.",
                },
                {
                  key: "simple",
                  title: "Simple Approval",
                  desc: "Any user with approve permission can approve the retainer invoice.",
                },
                {
                  key: "multi-level",
                  title: "Multi-Level Approval",
                  desc: "Set many levels of approval. The retainer invoice will be approved only when all approvers approve.",
                },
                {
                  key: "custom",
                  title: "Custom Approval",
                  desc: "Create a customized approval flow by adding one or more criteria.",
                },
              ].map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, approvalType: card.key as RetainerInvoiceSettings["approvalType"] }))}
                  className={`text-left rounded-lg border p-4 transition ${
                    settings.approvalType === card.key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      readOnly
                      checked={settings.approvalType === card.key}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{card.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{card.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Notification Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sendNotifications}
                  onChange={(e) => setSettings((prev) => ({ ...prev, sendNotifications: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Send email and in-app notifications when transactions are submitted for approval</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifySubmitter}
                  onChange={(e) => setSettings((prev) => ({ ...prev, notifySubmitter: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Notify the submitter when a transaction is approved or rejected</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {activeTab === "field-customization" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {customFields.length}/59
            </div>
            <button
              onClick={() => {
                if (!customFieldName.trim()) {
                  const nextCount = customFields.length + 1;
                  setCustomFields((prev) => [
                    ...prev,
                    {
                      name: `Custom Field ${nextCount}`,
                      dataType: "Text Box (Single Line)",
                      mandatory: "No",
                      showInAllPDFs: "No",
                      status: "Active",
                      locked: false,
                    },
                  ]);
                  return;
                }
                setCustomFields((prev) => [
                  ...prev,
                  {
                    name: customFieldName.trim(),
                    dataType: "Text Box (Single Line)",
                    mandatory: "No",
                    showInAllPDFs: "No",
                    status: "Active",
                    locked: false,
                  },
                ]);
                setCustomFieldName("");
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} />
              New Custom Field
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customFields.map((field, index) => (
                  <tr key={`${field.name}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                      {field.name}
                      {field.locked && <Lock size={14} className="text-gray-400" />}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">{field.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {activeTab === "custom-buttons" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div />
            <button
              onClick={() => setShowNewButtonModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} />
              New
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">BUTTON NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">BUTTON TYPE</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">LOCATION</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customButtons.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                      Create buttons which perform actions set by you.
                    </td>
                  </tr>
                ) : (
                  customButtons.map((button, index) => (
                    <tr key={`${button.name}-${index}`}>
                      <td className="px-6 py-4 text-sm text-gray-900">{button.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>

          {showNewButtonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">New Custom Button</h2>
                  <button
                    onClick={() => {
                      setShowNewButtonModal(false);
                      setNewButtonName("");
                      setNewButtonType("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-4 p-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Custom Button Name</label>
                    <input
                      value={newButtonName}
                      onChange={(e) => setNewButtonName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter button name"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Button Type</label>
                    <div className="relative">
                      <select
                        value={newButtonType}
                        onChange={(e) => setNewButtonType(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="workflow">Workflow</option>
                        <option value="script">Script</option>
                        <option value="url">URL</option>
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                  <button
                    onClick={() => {
                      setShowNewButtonModal(false);
                      setNewButtonName("");
                      setNewButtonType("");
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCustomButtons((prev) => [
                        ...prev,
                        {
                          name: newButtonName.trim() || `Button ${prev.length + 1}`,
                          type: newButtonType || "workflow",
                          location: "Details Page Menu",
                        },
                      ]);
                      setShowNewButtonModal(false);
                      setNewButtonName("");
                      setNewButtonType("");
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "related-lists" && (
        <div>
          <div className="mb-6 flex items-center justify-end">
            <button
              onClick={() => {
                setRelatedLists((prev) => [
                  ...prev,
                  {
                    name: `Related List ${prev.length + 1}`,
                    module: "Invoices",
                  },
                ]);
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} />
              New
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MODULE</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {relatedLists.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-sm text-gray-500">
                      Add related lists that should appear for retainer invoices.
                    </td>
                  </tr>
                ) : (
                  relatedLists.map((row, index) => (
                    <tr key={`${row.name}-${index}`}>
                      <td className="px-6 py-4 text-sm text-gray-900">{row.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.module}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
