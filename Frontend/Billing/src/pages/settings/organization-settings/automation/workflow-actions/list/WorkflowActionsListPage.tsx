import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronDown, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import NewEmailAlertModal from "../../../../NewEmailAlertModal";
import NewInAppNotificationModal from "../../../../NewInAppNotificationModal";
import NewFieldUpdateModal from "../../../../NewFieldUpdateModal";
import NewWebhookModal from "../../../../NewWebhookModal";
import NewCustomFunctionModal from "../../../../NewCustomFunctionModal";
import ConfigureFailurePreferencesModal from "../../../../ConfigureFailurePreferencesModal";
import { automationAPI } from "../../../../../../services/api";

type WorkflowActionRow = {
  _id: string;
  name: string;
  module: string;
  type: "email_alert" | "in_app_notification" | "field_update" | "webhook" | "custom_function";
  config?: Record<string, any>;
  isActive?: boolean;
};

const TAB_TO_TYPE: Record<string, WorkflowActionRow["type"]> = {
  "Email Alerts": "email_alert",
  "In-app Notifications": "in_app_notification",
  "Field Updates": "field_update",
  Webhooks: "webhook",
  "Custom Functions": "custom_function",
};

export default function WorkflowActionsListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Email Alerts");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [showNewEmailAlertModal, setShowNewEmailAlertModal] = useState(false);
  const [showNewInAppModal, setShowNewInAppModal] = useState(false);
  const [showNewFieldUpdateModal, setShowNewFieldUpdateModal] = useState(false);
  const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
  const [showNewCustomFunctionModal, setShowNewCustomFunctionModal] = useState(false);
  const [showFailurePrefsModal, setShowFailurePrefsModal] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
  const [actions, setActions] = useState<WorkflowActionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const modules = useMemo(
    () => [
      "All",
      { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
      { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
      { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
      { category: "CONTACTS", items: ["Customers", "Vendors"] },
      { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
      { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
      { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] },
    ],
    []
  );

  const tabs = ["Email Alerts", "In-app Notifications", "Field Updates", "Webhooks", "Custom Functions"];

  const getTableHeaders = () => {
    switch (activeTab) {
      case "Email Alerts":
        return ["Name", "Module", "Email Template", "Recipients", "Additional Recipients", "Actions"];
      case "In-app Notifications":
        return ["Name", "Module", "Recipients", "Message", "Actions"];
      case "Field Updates":
        return ["Name", "Module", "Field To Update", "Value", "Actions"];
      case "Webhooks":
        return ["Name", "Module", "Method", "URL To Notify", "Status", "Actions"];
      case "Custom Functions":
        return ["Name", "Module", "Language", "Description", "Status", "Actions"];
      default:
        return [];
    }
  };

  const loadActions = async () => {
    const type = TAB_TO_TYPE[activeTab];
    if (!type) return;
    try {
      setLoading(true);
      const response = await automationAPI.actions.getAll({
        type,
        module: moduleFilter,
      });
      setActions(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load workflow actions:", error);
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [activeTab, moduleFilter]);

  const loadNotificationPrefs = async () => {
    try {
      const response = await automationAPI.rules.getNotificationPreferences();
      if (response?.data) {
        setNotificationPrefs(response.data);
      }
    } catch (error) {
      console.error("Failed to load workflow notification preferences:", error);
      setNotificationPrefs(null);
    }
  };

  useEffect(() => {
    loadNotificationPrefs();
  }, []);

  const createAction = async (type: WorkflowActionRow["type"], data: any): Promise<boolean> => {
    try {
      await automationAPI.actions.create({
        name: data.name,
        module: data.module,
        type,
        config: data,
      });
      await loadActions();
      return true;
    } catch (error: any) {
      console.error("Failed to create workflow action:", error);
      alert(error?.message || "Failed to create workflow action.");
      return false;
    }
  };

  const deleteAction = async (action: WorkflowActionRow) => {
    const confirmed = window.confirm(`Delete workflow action "${action.name}"?`);
    if (!confirmed) return;
    try {
      await automationAPI.actions.delete(action._id);
      await loadActions();
    } catch (error: any) {
      console.error("Failed to delete workflow action:", error);
      alert(error?.message || "Failed to delete workflow action.");
    }
  };

  const saveFailurePreferences = async (data: any) => {
    try {
      await automationAPI.rules.updateNotificationPreferences(data);
      await loadNotificationPrefs();
      setShowFailurePrefsModal(false);
    } catch (error: any) {
      console.error("Failed to save workflow notification preferences:", error);
      alert(error?.message || "Failed to save workflow notification preferences.");
    }
  };

  const handleNewButton = () => {
    switch (activeTab) {
      case "Email Alerts":
        setShowNewEmailAlertModal(true);
        break;
      case "In-app Notifications":
        setShowNewInAppModal(true);
        break;
      case "Field Updates":
        setShowNewFieldUpdateModal(true);
        break;
      case "Webhooks":
        setShowNewWebhookModal(true);
        break;
      case "Custom Functions":
        setShowNewCustomFunctionModal(true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0 pt-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Automation</h2>
          <div className="space-y-1">
            <div onClick={() => navigate("/settings/workflow-rules")} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer">Workflow Rules</div>
            <div className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md cursor-pointer">Workflow Actions</div>
            <div className="pl-4 mt-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-3 py-1.5 text-sm transition rounded-md ${
                    activeTab === tab ? "text-blue-600 font-medium" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div onClick={() => navigate("/settings/workflow-logs")} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer mt-2">Workflow Logs</div>
            <div onClick={() => navigate("/settings/schedules")} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer">Schedules</div>
          </div>
        </div>

        <div className="flex-1 bg-white min-h-screen">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{activeTab}</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFailurePrefsModal(true)}
                className="text-sm text-blue-500 hover:text-blue-700 font-medium"
              >
                Configure Failure Preferences
              </button>
              <button
                onClick={handleNewButton}
                className="px-4 py-1.5 text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-1 transition"
              >
                <Plus size={16} strokeWidth={3} />
                New
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4">
            <label className="text-sm text-gray-700 font-medium">Module :</label>
            <div className="relative">
              <button
                onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                className="h-8 px-3 border border-gray-300 rounded hover:border-blue-400 text-sm bg-white flex items-center gap-2 min-w-[100px] justify-between"
              >
                {moduleFilter}
                <ChevronDown size={14} className="text-blue-500" />
              </button>

              {isModuleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsModuleDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
                    <div
                      className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                        moduleFilter === "All" ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700"
                      }`}
                      onClick={() => {
                        setModuleFilter("All");
                        setIsModuleDropdownOpen(false);
                      }}
                    >
                      All
                    </div>
                    {modules
                      .filter((m) => typeof m === "object")
                      .map((moduleGroup: any, idx) => (
                        <div key={idx} className="border-t border-gray-100">
                          <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase">{moduleGroup.category}</div>
                          {moduleGroup.items.map((item: string) => (
                            <div
                              key={item}
                              className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                                moduleFilter === item ? "bg-blue-50 text-blue-600" : "text-gray-700"
                              }`}
                              onClick={() => {
                                setModuleFilter(item);
                                setIsModuleDropdownOpen(false);
                              }}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                {getTableHeaders().map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={getTableHeaders().length} className="px-6 py-20 text-center text-sm text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && actions.length === 0 && (
                <tr>
                  <td colSpan={getTableHeaders().length} className="px-6 py-20 text-center text-sm text-gray-400">
                    There are no {activeTab.toLowerCase()}
                  </td>
                </tr>
              )}
              {!loading &&
                actions.map((action) => (
                  <tr key={action._id}>
                    <td className="px-6 py-3 text-sm text-gray-900">{action.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{action.module}</td>
                    {activeTab === "Email Alerts" && (
                      <>
                        <td className="px-6 py-3 text-sm text-gray-700">{action.config?.emailTemplate || "-"}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {Array.isArray(action.config?.emailRecipients)
                            ? action.config.emailRecipients.join(", ")
                            : action.config?.emailRecipients || "-"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {Array.isArray(action.config?.additionalRecipients)
                            ? action.config.additionalRecipients.join(", ")
                            : action.config?.additionalRecipients || "-"}
                        </td>
                      </>
                    )}
                    {activeTab === "In-app Notifications" && (
                      <>
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {Array.isArray(action.config?.recipients)
                            ? action.config.recipients.join(", ")
                            : action.config?.recipients || "-"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 truncate max-w-[280px]">{action.config?.message || "-"}</td>
                      </>
                    )}
                    {activeTab === "Field Updates" && (
                      <>
                        <td className="px-6 py-3 text-sm text-gray-700">{action.config?.fieldToUpdate || "-"}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {action.config?.updateWithEmptyValue ? "(empty)" : action.config?.newValue || "-"}
                        </td>
                      </>
                    )}
                    {activeTab === "Webhooks" && (
                      <>
                        <td className="px-6 py-3 text-sm text-gray-700">{action.config?.method || "POST"}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{action.config?.url || "-"}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">
                          <span className={`px-2 py-1 text-xs rounded-full ${action.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {action.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </>
                    )}
                    {activeTab === "Custom Functions" && (
                      <>
                        <td className="px-6 py-3 text-sm text-gray-700 uppercase">{action.config?.language || "deluge"}</td>
                        <td className="px-6 py-3 text-sm text-gray-700 truncate max-w-[280px]">{action.config?.description || action.config?.code?.slice?.(0, 80) || "-"}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">
                          <span className={`px-2 py-1 text-xs rounded-full ${action.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {action.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-3 text-sm text-right">
                      <button
                        onClick={() => deleteAction(action)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showFailurePrefsModal &&
        createPortal(
          <ConfigureFailurePreferencesModal
            initialData={notificationPrefs}
            onClose={() => setShowFailurePrefsModal(false)}
            onSave={saveFailurePreferences}
          />,
          document.body
        )}

      {showNewEmailAlertModal &&
        createPortal(
          <NewEmailAlertModal
            onClose={() => setShowNewEmailAlertModal(false)}
            onSave={async (data: any) => {
              const created = await createAction("email_alert", data);
              if (created) {
                setShowNewEmailAlertModal(false);
              }
            }}
          />,
          document.body
        )}

      {showNewInAppModal &&
        createPortal(
          <NewInAppNotificationModal
            onClose={() => setShowNewInAppModal(false)}
            onSave={async (data: any) => {
              const created = await createAction("in_app_notification", data);
              if (created) {
                setShowNewInAppModal(false);
              }
            }}
          />,
          document.body
        )}

      {showNewFieldUpdateModal &&
        createPortal(
          <NewFieldUpdateModal
            onClose={() => setShowNewFieldUpdateModal(false)}
            onSave={async (data: any) => {
              const created = await createAction("field_update", data);
              if (created) {
                setShowNewFieldUpdateModal(false);
              }
            }}
          />,
          document.body
        )}

      {showNewWebhookModal &&
        createPortal(
          <NewWebhookModal
            onClose={() => setShowNewWebhookModal(false)}
            onSave={async (data: any) => {
              const created = await createAction("webhook", data);
              if (created) {
                setShowNewWebhookModal(false);
              }
            }}
          />,
          document.body
        )}

      {showNewCustomFunctionModal &&
        createPortal(
          <NewCustomFunctionModal
            onClose={() => setShowNewCustomFunctionModal(false)}
            onSave={async (data: any) => {
              const created = await createAction("custom_function", data);
              if (created) {
                setShowNewCustomFunctionModal(false);
              }
            }}
          />,
          document.body
        )}
    </div>
  );
}
