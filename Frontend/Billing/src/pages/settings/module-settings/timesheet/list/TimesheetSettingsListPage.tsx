import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, ChevronDown } from "lucide-react";

export default function TimesheetPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  
  // General tab states
  const [roundOffTime, setRoundOffTime] = useState("dont-round-off");
  const [enableMaxHours, setEnableMaxHours] = useState(true);
  const [maxHours, setMaxHours] = useState("24:00");
  const [trackCosts, setTrackCosts] = useState(false);
  const [enableApprovals, setEnableApprovals] = useState(false);
  const [enableCustomerApprovals, setEnableCustomerApprovals] = useState(false);
  
  // Field Customization tab states
  const [customFields, setCustomFields] = useState([]);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 52;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Timesheet</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "general"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("field-customization")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "field-customization"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Field Customization
        </button>
      </div>

      {/* General Tab Content */}
      {activeTab === "general" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
          {/* Round Off Time */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Round Off Time
              </label>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              (Time entries will appear on your invoices and reports based on the selected round-off format.)
            </p>
            <div className="relative w-64">
              <select
                value={roundOffTime}
                onChange={(e) => setRoundOffTime(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="dont-round-off">Don't Round-off</option>
                <option value="round-to-nearest-15">Round to nearest 15 minutes</option>
                <option value="round-to-nearest-30">Round to nearest 30 minutes</option>
                <option value="round-to-nearest-hour">Round to nearest hour</option>
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Set maximum hours/day */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableMaxHours}
                onChange={(e) => setEnableMaxHours(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Set maximum hours/day for logging time
                </span>
                {enableMaxHours && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={maxHours}
                      onChange={(e) => setMaxHours(e.target.value)}
                      className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="24:00"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Track costs for time entries */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={trackCosts}
                onChange={(e) => setTrackCosts(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Track costs for time entries
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Enabling this option allows you to track the cost associated with paying your staff for their time entries.
                </p>
              </div>
            </label>
          </div>

          {/* Timesheet Approvals Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Timesheet Approvals</h3>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableApprovals}
                  onChange={(e) => setEnableApprovals(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Enable Approvals for time entries
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Enabling this option lets you submit time entries to the project manager for their approval before you invoice them.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCustomerApprovals}
                  onChange={(e) => setEnableCustomerApprovals(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Enable Customer Approvals for time entries
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Enabling this option allows you to submit time entries to your customers and get their approval before you invoice them.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 border-t border-gray-200">
            <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              Save
            </button>
          </div>
        </div>
      )}

      {/* Field Customization Tab Content */}
      {activeTab === "field-customization" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/timesheet/new-field")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Custom Field
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    FIELD NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DATA TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    MANDATORY
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customFields.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
                      </p>
                    </td>
                  </tr>
                ) : (
                  customFields.map((field, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{field.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory ? "Yes" : "No"}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          field.status === "Active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {field.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



