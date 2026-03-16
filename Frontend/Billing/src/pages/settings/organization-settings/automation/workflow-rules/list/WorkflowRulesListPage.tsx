import React, { useEffect, useMemo, useState } from "react";
import { Plus, Info, FileText, Link2, Mail, Trash2, Pencil, Copy, ChevronUp, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import NewWorkflowRuleModal from "../../../../NewWorkflowRuleModal";
import WorkflowExecutionCondition from "../detail/WorkflowExecutionCondition";
import ConfigureFailurePreferencesModal from "../../../../ConfigureFailurePreferencesModal";
import { automationAPI } from "../../../../../../services/api";

type WorkflowRuleRow = {
  _id: string;
  name: string;
  module: string;
  description?: string;
  isActive: boolean;
  executionOrder?: number;
  workflowType?: string;
  actionType?: string;
  executeWhen?: string;
  recordEditType?: string;
  selectedFields?: string[];
  criteria?: any[];
  criteriaPattern?: string;
  trigger?: { event?: string; conditions?: any[] };
  actions?: any[];
  immediateActions?: any[];
  timeBasedActions?: any[];
};

type WorkflowModalData = {
  workflowName: string;
  module: string;
  description?: string;
};

const modulesConfig = [
  "All",
  { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
  { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
  { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
  { category: "CONTACTS", items: ["Customers", "Vendors"] },
  { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
  { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
  { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] },
];

const normalizeRules = (rules: WorkflowRuleRow[]): WorkflowRuleRow[] => {
  return [...rules].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a.executionOrder)) ? Number(a.executionOrder) : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(Number(b.executionOrder)) ? Number(b.executionOrder) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
};

export default function WorkflowRulesListPage() {
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [showFailurePrefsModal, setShowFailurePrefsModal] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentView, setCurrentView] = useState<"list" | "executionCondition">("list");
  const [pendingWorkflow, setPendingWorkflow] = useState<WorkflowModalData | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [initialExecutionData, setInitialExecutionData] = useState<any>(null);
  const [rules, setRules] = useState<WorkflowRuleRow[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);
  const [stats, setStats] = useState({
    customFunctions: { used: 0, limit: 1000 },
    webhooks: { used: 0, limit: 1000 },
    emailAlerts: { used: 0, limit: 500 },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const modules = useMemo(() => modulesConfig, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await automationAPI.rules.getAll({
        module: moduleFilter,
        status: statusFilter,
      });
      const loaded = Array.isArray(response?.data) ? response.data : [];
      setRules(normalizeRules(loaded));
    } catch (error) {
      console.error("Failed to load workflow rules:", error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await automationAPI.rules.getStats();
      if (response?.data) setStats(response.data);
    } catch (error) {
      console.error("Failed to load workflow stats:", error);
    }
  };

  const loadNotificationPrefs = async () => {
    try {
      const response = await automationAPI.rules.getNotificationPreferences();
      if (response?.data) setNotificationPrefs(response.data);
    } catch (error) {
      console.error("Failed to load workflow notification preferences:", error);
      setNotificationPrefs(null);
    }
  };

  useEffect(() => {
    loadRules();
  }, [moduleFilter, statusFilter]);

  useEffect(() => {
    loadStats();
    loadNotificationPrefs();
  }, []);

  const resetEditorState = () => {
    setCurrentView("list");
    setPendingWorkflow(null);
    setEditingRuleId(null);
    setInitialExecutionData(null);
  };

  const handleSaveRule = async (executionData: any) => {
    if (!pendingWorkflow?.workflowName || !pendingWorkflow?.module) return;

    try {
      setSaving(true);
      const payload = {
        name: pendingWorkflow.workflowName,
        description: pendingWorkflow.description || "",
        module: pendingWorkflow.module,
        ...executionData,
      };

      if (editingRuleId) {
        await automationAPI.rules.update(editingRuleId, payload);
      } else {
        await automationAPI.rules.create(payload);
      }

      resetEditorState();
      await Promise.all([loadRules(), loadStats()]);
    } catch (error: any) {
      console.error("Failed to save workflow rule:", error);
      alert(error?.message || "Failed to save workflow rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (rule: WorkflowRuleRow) => {
    try {
      await automationAPI.rules.update(rule._id, { isActive: !rule.isActive });
      await loadRules();
    } catch (error: any) {
      console.error("Failed to update workflow rule status:", error);
      alert(error?.message || "Failed to update workflow rule status.");
    }
  };

  const handleDeleteRule = async (rule: WorkflowRuleRow) => {
    const confirmed = window.confirm(`Delete workflow rule "${rule.name}"?`);
    if (!confirmed) return;
    try {
      await automationAPI.rules.delete(rule._id);
      await loadRules();
    } catch (error: any) {
      console.error("Failed to delete workflow rule:", error);
      alert(error?.message || "Failed to delete workflow rule.");
    }
  };

  const handleCloneRule = async (rule: WorkflowRuleRow) => {
    try {
      await automationAPI.rules.clone(rule._id);
      await loadRules();
    } catch (error: any) {
      console.error("Failed to clone workflow rule:", error);
      alert(error?.message || "Failed to clone workflow rule.");
    }
  };

  const handleEditRule = (rule: WorkflowRuleRow) => {
    setPendingWorkflow({
      workflowName: rule.name,
      description: rule.description || "",
      module: rule.module,
    });
    setEditingRuleId(rule._id);
    setInitialExecutionData({
      workflowType: rule.workflowType,
      actionType: rule.actionType,
      executeWhen: rule.executeWhen,
      recordEditType: rule.recordEditType,
      selectedFields: rule.selectedFields,
      criteria: rule.criteria || rule.trigger?.conditions || [],
      criteriaPattern: rule.criteriaPattern,
      trigger: rule.trigger,
      actions: rule.actions,
      immediateActions: rule.immediateActions,
      timeBasedActions: rule.timeBasedActions,
    });
    setCurrentView("executionCondition");
  };

  const reorderRules = async (orderedIds: string[]) => {
    try {
      await automationAPI.rules.reorder({ order: orderedIds });
      await loadRules();
    } catch (error: any) {
      console.error("Failed to reorder workflow rules:", error);
      alert(error?.message || "Failed to reorder workflow rules.");
    }
  };

  const handleMoveRule = async (ruleId: string, direction: "up" | "down") => {
    const currentIndex = rules.findIndex((rule) => rule._id === ruleId);
    if (currentIndex < 0) return;
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= rules.length) return;

    const next = [...rules];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(nextIndex, 0, moved);
    setRules(next);
    await reorderRules(next.map((rule) => rule._id));
  };

  const handleSaveFailurePreferences = async (data: any) => {
    try {
      await automationAPI.rules.updateNotificationPreferences(data);
      await loadNotificationPrefs();
      setShowFailurePrefsModal(false);
    } catch (error: any) {
      console.error("Failed to save workflow notification preferences:", error);
      alert(error?.message || "Failed to save workflow notification preferences.");
    }
  };

  if (currentView === "executionCondition" && pendingWorkflow) {
    return (
      <WorkflowExecutionCondition
        workflowData={pendingWorkflow}
        initialData={initialExecutionData}
        onSave={handleSaveRule}
        onCancel={resetEditorState}
        onEditDetails={() => {
          setCurrentView("list");
          setShowNewRuleModal(true);
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            Configure workflow rules to automate email alerts, updates, webhooks, and custom functions.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Workflow Rules</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFailurePrefsModal(true)}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            Configure Notification Preferences
          </button>
          <button
            onClick={() => {
              setEditingRuleId(null);
              setInitialExecutionData(null);
              setShowNewRuleModal(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Plus size={16} />
            New Workflow Rule
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Usage Stats (per day)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-gray-400" />
            <div>
              <div className="text-sm text-gray-600">Custom Functions</div>
              <div className="text-lg font-semibold text-gray-900">{stats.customFunctions.used} / {stats.customFunctions.limit}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link2 size={24} className="text-gray-400" />
            <div>
              <div className="text-sm text-gray-600">Webhooks</div>
              <div className="text-lg font-semibold text-gray-900">{stats.webhooks.used} / {stats.webhooks.limit}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={24} className="text-gray-400" />
            <div>
              <div className="text-sm text-gray-600">Email Alerts</div>
              <div className="text-lg font-semibold text-gray-900">{stats.emailAlerts.used} / {stats.emailAlerts.limit}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Module :</label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            {modules.filter((m) => typeof m === "object").map((group: any, idx) => (
              <optgroup key={idx} label={group.category}>
                {group.items.map((item: string) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Status :</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Module</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Trigger</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  Loading workflow rules...
                </td>
              </tr>
            )}

            {!loading && rules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  There are no workflow rules
                </td>
              </tr>
            )}

            {!loading &&
              rules.map((rule, index) => (
                <tr key={rule._id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{rule.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{rule.module}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {rule.workflowType === "date_based" ? "Date Based" : (rule.actionType || rule.trigger?.event || "-")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50 inline-flex items-center gap-1"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50 inline-flex items-center gap-1"
                        onClick={() => handleCloneRule(rule)}
                      >
                        <Copy size={12} />
                        Clone
                      </button>
                      <button
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                        onClick={() => handleToggleStatus(rule)}
                      >
                        {rule.isActive ? "Mark Inactive" : "Mark Active"}
                      </button>
                      <button
                        className="text-xs p-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => handleMoveRule(rule._id, "up")}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        className="text-xs p-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => handleMoveRule(rule._id, "down")}
                        disabled={index === rules.length - 1}
                        title="Move down"
                      >
                        <ChevronDown size={12} />
                      </button>
                      <button
                        className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                        onClick={() => handleDeleteRule(rule)}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {saving && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2 rounded-md shadow-lg z-[10001]">
          Saving workflow rule...
        </div>
      )}

      {showFailurePrefsModal &&
        createPortal(
          <ConfigureFailurePreferencesModal
            initialData={notificationPrefs}
            onClose={() => setShowFailurePrefsModal(false)}
            onSave={handleSaveFailurePreferences}
          />,
          document.body
        )}

      {showNewRuleModal &&
        createPortal(
          <NewWorkflowRuleModal
            onClose={() => setShowNewRuleModal(false)}
            onSave={(ruleData: WorkflowModalData) => {
              setPendingWorkflow(ruleData);
              setShowNewRuleModal(false);
              setCurrentView("executionCondition");
            }}
          />,
          document.body
        )}
    </div>
  );
}

