import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, Download } from "lucide-react";
import { createPortal } from "react-dom";
import ConfigureFailurePreferencesModal from "../../../../ConfigureFailurePreferencesModal";
import { automationAPI } from "../../../../../../services/api";

type WorkflowLogRow = {
  _id: string;
  executedAt?: string;
  status: "success" | "failed" | "pending";
  entityType?: string;
  actionsExecuted?: Array<{ actionType?: string; status?: string }>;
  workflowRule?: { name?: string; module?: string } | null;
};

const TAB_TO_ACTION_TYPE: Record<string, string | undefined> = {
  "Email Alerts": "email_alert",
  Webhooks: "webhook",
  "Custom Functions": "custom_function",
  Schedules: "schedule",
  "Custom Buttons": "custom_button",
};

const STATUS_TO_API: Record<string, string | undefined> = {
  All: undefined,
  Success: "success",
  Failure: "failed",
  Skipped: "pending",
};

const modules = [
  "All",
  { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
  { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
  { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
  { category: "CONTACTS", items: ["Customers", "Vendors"] },
  { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
  { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
  { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] },
];

const statuses = ["All", "Success", "Failure", "Skipped"];
const tabs = ["Email Alerts", "Webhooks", "Custom Functions", "Schedules", "Custom Buttons"];
const datePresets = ["Today", "This Week", "This Month", "Yesterday", "Previous Week", "Previous Month", "Last Three Months"];

const toISODate = (date: Date) => date.toISOString();

const resolveDateRange = (preset: string): { fromDate?: string; toDate?: string } => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  switch (preset) {
    case "Today":
      return { fromDate: toISODate(todayStart), toDate: toISODate(todayEnd) };
    case "Yesterday": {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 1);
      const end = new Date(todayEnd);
      end.setDate(end.getDate() - 1);
      return { fromDate: toISODate(start), toDate: toISODate(end) };
    }
    case "This Week": {
      const start = new Date(todayStart);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      return { fromDate: toISODate(start), toDate: toISODate(todayEnd) };
    }
    case "Previous Week": {
      const start = new Date(todayStart);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { fromDate: toISODate(start), toDate: toISODate(end) };
    }
    case "This Month": {
      const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
      return { fromDate: toISODate(start), toDate: toISODate(todayEnd) };
    }
    case "Previous Month": {
      const start = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
      const end = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { fromDate: toISODate(start), toDate: toISODate(end) };
    }
    case "Last Three Months": {
      const start = new Date(todayStart);
      start.setMonth(start.getMonth() - 3);
      return { fromDate: toISODate(start), toDate: toISODate(todayEnd) };
    }
    default:
      return {};
  }
};

export default function WorkflowLogsListPage() {
  const [activeTab, setActiveTab] = useState("Email Alerts");
  const [statusFilter, setStatusFilter] = useState("All");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [dateRange, setDateRange] = useState("Last Three Months");
  const [showFailurePrefs, setShowFailurePrefs] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);
  const [logs, setLogs] = useState<WorkflowLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const tableHeaders = useMemo(() => {
    if (activeTab === "Schedules") return ["Occurred At", "Schedule Name", "Log ID", "Status"];
    if (activeTab === "Custom Buttons") return ["Occurred At", "Button Name", "Log ID", "Entity Type", "Status"];
    return ["Occurred At", "Name", "Log ID", "Entity Type", "Status"];
  }, [activeTab]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { fromDate, toDate } = resolveDateRange(dateRange);
      const response = await automationAPI.logs.getAll({
        status: STATUS_TO_API[statusFilter],
        entityType: moduleFilter === "All" ? undefined : moduleFilter,
        actionType: TAB_TO_ACTION_TYPE[activeTab],
        fromDate,
        toDate,
        limit: 200,
      });
      setLogs(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load workflow logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [activeTab, statusFilter, moduleFilter, dateRange]);

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

  const saveFailurePreferences = async (data: any) => {
    try {
      await automationAPI.rules.updateNotificationPreferences(data);
      await loadNotificationPrefs();
      setShowFailurePrefs(false);
    } catch (error: any) {
      console.error("Failed to save workflow notification preferences:", error);
      alert(error?.message || "Failed to save workflow notification preferences.");
    }
  };

  const exportLogsCsv = () => {
    if (!logs.length) return;
    const rows = logs.map((log) => ({
      occurredAt: log.executedAt || "",
      name: log.workflowRule?.name || log.actionsExecuted?.[0]?.actionType || "-",
      logId: log._id,
      entityType: log.entityType || "-",
      status: log.status,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")]
      .concat(rows.map((row) => headers.map((h) => `"${String((row as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "workflow-logs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Workflow Logs</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowFailurePrefs(true)} className="text-sm font-medium text-gray-600 hover:text-blue-600">
            Configure Failure Preferences
          </button>
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen((v) => !v)}
              className="px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
            >
              <Download size={14} />
              Export
              <ChevronDown size={14} className={isExportDropdownOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {isExportDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-xl z-50 py-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-600 hover:text-white"
                  onClick={() => {
                    exportLogsCsv();
                    setIsExportDropdownOpen(false);
                  }}
                >
                  CSV (Comma Separated Value)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 bg-white border-b border-gray-100">
        <div className="flex items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-all px-1 ${activeTab === tab ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 flex items-center flex-wrap gap-4 bg-gray-50/50 border-b border-gray-100">
        <div className="flex items-center gap-2 text-gray-500 mr-2">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Status</span>
          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen((v) => !v)}
              className="h-9 px-3 min-w-[100px] border border-gray-300 rounded bg-white flex items-center justify-between text-sm"
            >
              {statusFilter}
              <ChevronDown size={14} className="text-blue-500 ml-2" />
            </button>
            {isStatusDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-xl z-40 py-1">
                {statuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${statusFilter === s ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab !== "Schedules" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Module</span>
            <div className="relative">
              <button
                onClick={() => setIsModuleDropdownOpen((v) => !v)}
                className="h-9 px-3 min-w-[100px] border border-gray-300 rounded bg-white flex items-center justify-between text-sm"
              >
                {moduleFilter}
                <ChevronDown size={14} className="text-blue-500 ml-2" />
              </button>
              {isModuleDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded shadow-xl z-40 max-h-96 overflow-y-auto">
                  <div
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${moduleFilter === "All" ? "bg-blue-600 text-white" : "text-gray-700"}`}
                    onClick={() => {
                      setModuleFilter("All");
                      setIsModuleDropdownOpen(false);
                    }}
                  >
                    All
                  </div>
                  {modules
                    .filter((m) => typeof m === "object")
                    .map((group: any, idx) => (
                      <div key={idx} className="border-t border-gray-100">
                        <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">{group.category}</div>
                        {group.items.map((item: string) => (
                          <div
                            key={item}
                            onClick={() => {
                              setModuleFilter(item);
                              setIsModuleDropdownOpen(false);
                            }}
                            className={`px-4 py-2 text-sm cursor-pointer ${moduleFilter === item ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"}`}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Date Range</span>
          <div className="relative">
            <button
              onClick={() => setIsDateDropdownOpen((v) => !v)}
              className="h-9 px-3 min-w-[170px] border border-gray-300 rounded bg-white flex items-center justify-between text-sm"
            >
              {dateRange}
              <ChevronDown size={14} className="text-blue-500 ml-2" />
            </button>
            {isDateDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-xl z-40 py-1">
                {datePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setDateRange(preset);
                      setIsDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${dateRange === preset ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              {tableHeaders.map((header) => (
                <th key={header} className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/30">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={tableHeaders.length} className="py-20 text-center text-sm text-gray-400">
                  Loading logs...
                </td>
              </tr>
            )}

            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={tableHeaders.length} className="py-20 text-center text-sm text-gray-400">
                  There are no logs
                </td>
              </tr>
            )}

            {!loading &&
              logs.map((log) => (
                <tr key={log._id} className="border-b border-gray-100">
                  <td className="px-6 py-3 text-sm text-gray-700">{log.executedAt ? new Date(log.executedAt).toLocaleString() : "-"}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{log.workflowRule?.name || log.actionsExecuted?.[0]?.actionType || "-"}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{log._id}</td>
                  {activeTab !== "Schedules" && (
                    <td className="px-6 py-3 text-sm text-gray-700">{log.entityType || log.workflowRule?.module || "-"}</td>
                  )}
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        log.status === "success"
                          ? "bg-green-100 text-green-700"
                          : log.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showFailurePrefs &&
        createPortal(
          <ConfigureFailurePreferencesModal
            initialData={notificationPrefs}
            onClose={() => setShowFailurePrefs(false)}
            onSave={saveFailurePreferences}
          />,
          document.body
        )}
    </div>
  );
}
