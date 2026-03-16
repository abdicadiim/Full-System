import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const MODULES = [
  { category: "SALES", items: ["Quote", "Invoice", "Recurring Invoice", "Credit Note", "Customer Payment", "Sales Receipt"] },
  { category: "PURCHASES", items: ["Bill", "Recurring Bill", "Expense", "Recurring Expense", "Vendor Credits", "Vendor Payment"] },
  { category: "TIME TRACKING", items: ["Projects", "Timesheet"] },
  { category: "CONTACTS", items: ["Customers", "Vendors"] },
  { category: "BANK TRANSACTIONS", items: ["Transfer Fund", "Card Payment", "Owners Drawings", "Deposit", "Owners Contribution", "Expense Refund", "Other Income", "Interest Income", "Refund/Credit"] },
  { category: "ACCOUNTANT", items: ["Journal", "Chart of Accounts", "Budget"] },
  { category: "OTHERS", items: ["Item", "Inventory Adjustment", "Payment batch", "Purchases", "Vendor Batch Payment", "Others", "Modifiers"] },
];

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function NewScheduleModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [module, setModule] = useState("");
  const [scheduleType, setScheduleType] = useState("daily");
  const [time, setTime] = useState("09:00");
  const [days, setDays] = useState<string[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [monthOfYear, setMonthOfYear] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [expiryType, setExpiryType] = useState("none");
  const [endDate, setEndDate] = useState("");
  const [maxExecutions, setMaxExecutions] = useState("1");
  const [functionCode, setFunctionCode] = useState("// Write Deluge function here");

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((entry) => entry !== day) : [...prev, day]));
  };

  const handleSave = () => {
    if (!name || !module || !time) {
      alert("Name, module and time are required.");
      return;
    }
    if (scheduleType === "weekly" && days.length === 0) {
      alert("Please select at least one day for weekly schedules.");
      return;
    }
    if (startDate) {
      const start = new Date(startDate);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (start > maxDate) {
        alert("Start date cannot be more than one year from today.");
        return;
      }
    }
    if (expiryType === "on_date" && !endDate) {
      alert("Please select an expiry date.");
      return;
    }
    if (expiryType === "after_executions" && (!maxExecutions || Number(maxExecutions) <= 0)) {
      alert("Please enter a valid number of executions.");
      return;
    }

    onSave({
      name: name.trim(),
      module,
      scheduleType,
      frequency: scheduleType,
      time,
      days,
      dayOfMonth: scheduleType === "monthly" || scheduleType === "yearly" ? Number(dayOfMonth) : undefined,
      monthOfYear: scheduleType === "yearly" ? Number(monthOfYear) : undefined,
      startDate: startDate || undefined,
      endDate: expiryType === "on_date" ? endDate : undefined,
      functionCode,
      metadata: {
        expiryType,
        maxExecutions: expiryType === "after_executions" ? Number(maxExecutions) : undefined,
      },
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
          <h3 className="text-lg font-semibold text-gray-900">New Schedule</h3>
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
                placeholder="Schedule name"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time<span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {scheduleType === "weekly" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Week Days</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      days.includes(day)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(scheduleType === "monthly" || scheduleType === "yearly") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {scheduleType === "yearly" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={monthOfYear}
                    onChange={(e) => setMonthOfYear(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={month} value={String(index + 1)}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label>
              <select
                value={expiryType}
                onChange={(e) => setExpiryType(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Never Expire</option>
                <option value="on_date">Expire On Date</option>
                <option value="after_executions">After Number of Executions</option>
              </select>
            </div>

            {expiryType === "on_date" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {expiryType === "after_executions" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Executions</label>
                <input
                  type="number"
                  min={1}
                  value={maxExecutions}
                  onChange={(e) => setMaxExecutions(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deluge Function</label>
            <textarea
              value={functionCode}
              onChange={(e) => setFunctionCode(e.target.value)}
              className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
              placeholder="Write custom schedule function..."
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

