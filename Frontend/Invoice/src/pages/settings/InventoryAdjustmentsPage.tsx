import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function InventoryAdjustmentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("approvals");
  
  // Approvals tab states
  const [approvalType, setApprovalType] = useState("no-approval");
  
  // Field Customization tab states
  const [customFields, setCustomFields] = useState([]);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 59;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Inventory Adjustments</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("approvals")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "approvals"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Approvals
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

      {/* Approvals Tab Content */}
      {activeTab === "approvals" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-6">Approval Type</h3>
          
          <div className="space-y-4">
            <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
              approvalType === "no-approval" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="approvalType"
                value="no-approval"
                checked={approvalType === "no-approval"}
                onChange={(e) => setApprovalType(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">No Approval</span>
                <p className="text-sm text-gray-600 mt-1">
                  Create Inventory Adjustment and perform further actions without approval.
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
              approvalType === "simple-approval" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="approvalType"
                value="simple-approval"
                checked={approvalType === "simple-approval"}
                onChange={(e) => setApprovalType(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Simple Approval</span>
                <p className="text-sm text-gray-600 mt-1">
                  Any user with approve permission can approve the Inventory Adjustment.
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
              approvalType === "multi-level-approval" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="approvalType"
                value="multi-level-approval"
                checked={approvalType === "multi-level-approval"}
                onChange={(e) => setApprovalType(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Multi-Level Approval</span>
                <p className="text-sm text-gray-600 mt-1">
                  Set many levels of approval. The Inventory Adjustment will be approved only when all the approvers approve.
                </p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 mt-6 border-t border-gray-200">
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
              onClick={() => navigate("/settings/inventory-adjustments/new-field")}
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
                    SHOW IN ALL PDFS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customFields.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
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
                      <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs ? "Yes" : "No"}</td>
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



