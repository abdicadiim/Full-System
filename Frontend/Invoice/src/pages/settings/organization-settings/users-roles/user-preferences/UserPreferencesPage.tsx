import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function UserPreferencesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Field Customization");

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">User Preferences</h1>
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("Field Customization")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === "Field Customization"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Field Customization
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "Field Customization" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">Custom Fields Usage: 0/59</div>
            <button
              onClick={() => navigate("/settings/user-preferences/new-field")}
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
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-gray-500 text-sm">
                      Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



