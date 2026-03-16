import React, { useEffect, useMemo, useState } from "react";
import { Plus, Play, Pause, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import NewScheduleModal from "../../../../NewScheduleModal";
import { automationAPI } from "../../../../../../services/api";

type WorkflowScheduleRow = {
  _id: string;
  name: string;
  module: string;
  frequency: string;
  time: string;
  days?: string[];
  dayOfMonth?: number;
  monthOfYear?: number;
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, any>;
  status: "active" | "inactive";
};

export default function SchedulesListPage() {
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("All");
  const [schedules, setSchedules] = useState<WorkflowScheduleRow[]>([]);
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

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await automationAPI.schedules.getAll({
        module: moduleFilter,
      });
      setSchedules(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load workflow schedules:", error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [moduleFilter]);

  const createSchedule = async (data: any): Promise<boolean> => {
    try {
      await automationAPI.schedules.create(data);
      await loadSchedules();
      return true;
    } catch (error: any) {
      console.error("Failed to create schedule:", error);
      alert(error?.message || "Failed to create schedule.");
      return false;
    }
  };

  const formatScheduleSummary = (row: WorkflowScheduleRow) => {
    if (row.frequency === "weekly") {
      return `Weekly at ${row.time}${row.days?.length ? ` (${row.days.join(", ")})` : ""}`;
    }
    if (row.frequency === "monthly") {
      const dayLabel = row.dayOfMonth ? ` on day ${row.dayOfMonth}` : "";
      return `Monthly at ${row.time}${dayLabel}`;
    }
    if (row.frequency === "yearly") {
      const monthLabel = row.monthOfYear ? ` in month ${row.monthOfYear}` : "";
      const dayLabel = row.dayOfMonth ? ` day ${row.dayOfMonth}` : "";
      return `Yearly at ${row.time}${monthLabel}${dayLabel}`;
    }
    return `Daily at ${row.time}`;
  };

  const toggleSchedule = async (row: WorkflowScheduleRow) => {
    try {
      await automationAPI.schedules.toggle(row._id);
      await loadSchedules();
    } catch (error: any) {
      console.error("Failed to toggle schedule:", error);
      alert(error?.message || "Failed to toggle schedule.");
    }
  };

  const deleteSchedule = async (row: WorkflowScheduleRow) => {
    const confirmed = window.confirm(`Delete schedule "${row.name}"?`);
    if (!confirmed) return;
    try {
      await automationAPI.schedules.delete(row._id);
      await loadSchedules();
    } catch (error: any) {
      console.error("Failed to delete schedule:", error);
      alert(error?.message || "Failed to delete schedule.");
    }
  };

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Schedules</h1>
        <button
          onClick={() => setShowNewScheduleModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <Plus size={16} />
          New Schedule
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Module :</label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            {modules
              .filter((m) => typeof m === "object")
              .map((moduleGroup: any, idx) => (
                <optgroup key={idx} label={moduleGroup.category}>
                  {moduleGroup.items.map((item: string) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Module</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  Loading schedules...
                </td>
              </tr>
            )}

            {!loading && schedules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  There are no schedules
                </td>
              </tr>
            )}

            {!loading &&
              schedules.map((row) => (
                <tr key={row._id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.module}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="capitalize">{formatScheduleSummary(row)}</div>
                    {row.startDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        Starts: {new Date(row.startDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {row.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50 inline-flex items-center gap-1"
                        onClick={() => toggleSchedule(row)}
                      >
                        {row.status === "active" ? <Pause size={12} /> : <Play size={12} />}
                        {row.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                        onClick={() => deleteSchedule(row)}
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

      {showNewScheduleModal &&
        createPortal(
          <NewScheduleModal
            onClose={() => setShowNewScheduleModal(false)}
            onSave={async (data: any) => {
              const created = await createSchedule(data);
              if (created) {
                setShowNewScheduleModal(false);
              }
            }}
          />,
          document.body
        )}
    </div>
  );
}
