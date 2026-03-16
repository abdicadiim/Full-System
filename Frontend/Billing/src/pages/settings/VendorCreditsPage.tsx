import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ChevronDown, Plus, GripVertical, X, Edit2, MoreVertical } from "lucide-react";

export default function VendorCreditsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("approvals");
  
  // Approvals tab states
  const [approvalType, setApprovalType] = useState("no-approval");
  const [approvers, setApprovers] = useState([]);
  const [approvalLevels, setApprovalLevels] = useState([{ level: 1, approver: "" }]);
  const [sendNotifications, setSendNotifications] = useState(false);
  const [notifySubmitter, setNotifySubmitter] = useState(false);
  
  // Field Customization tab states
  const [customFields, setCustomFields] = useState([
    { name: "Description", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true }
  ]);
  const customFieldsUsage = customFields.filter(f => !f.locked).length;
  const maxCustomFields = 59;
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
  
  // Custom Buttons tab states
  const [customButtons, setCustomButtons] = useState([]);
  const [locationFilter, setLocationFilter] = useState("All");
  const [showNewButtonModal, setShowNewButtonModal] = useState(false);
  const [newButtonName, setNewButtonName] = useState("");
  const [newButtonType, setNewButtonType] = useState("");
  
  // Related Lists tab states
  const [relatedLists, setRelatedLists] = useState([]);

  const addApprovalLevel = () => {
    setApprovalLevels([...approvalLevels, { level: approvalLevels.length + 1, approver: "" }]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdownIndex !== null && !event.target.closest('.dropdown-container')) {
        setOpenDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownIndex]);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Vendor Credits</h1>

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
        <button
          onClick={() => setActiveTab("custom-buttons")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "custom-buttons"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Custom Buttons
        </button>
        <button
          onClick={() => setActiveTab("related-lists")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "related-lists"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Related Lists
        </button>
      </div>

      {/* Approvals Tab Content */}
      {activeTab === "approvals" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-6">Approval Type</h3>
          
          <div className="space-y-4 mb-8">
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
                  Create Vendor Credits and perform further actions without approval.
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
                  Any user with approve permission can approve the Vendor Credits.
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
                  Set many levels of approval. The Vendor Credits will be approved only when all the approvers approve.
                </p>
              </div>
            </label>
          </div>

          {/* Multi-Level Approval - Hierarchy */}
          {approvalType === "multi-level-approval" && (
            <div className="mb-8 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">SET THE APPROVAL HIERARCHY</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">PRIORITY</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">APPROVER NAME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {approvalLevels.map((level, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <GripVertical size={16} className="text-gray-400 cursor-move" />
                            <span className="text-sm text-gray-900">Level {level.level}: Approver</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select className="w-full h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                            <option value="">Select approver</option>
                            <option value="user1">User 1</option>
                            <option value="user2">User 2</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={addApprovalLevel}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Add New Level
              </button>
            </div>
          )}

          {/* Notification Preferences */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Notification Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNotifications}
                  onChange={(e) => setSendNotifications(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Send email and in-app notifications when transactions are submitted for approval</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySubmitter}
                  onChange={(e) => setNotifySubmitter(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Notify the submitter when a transaction is approved or rejected</span>
              </label>
            </div>
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
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/vendor-credits/new-field")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Custom Field
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                      <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                        {field.locked && <Lock size={14} className="text-gray-400" />}
                        {field.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2 dropdown-container relative">
                          <span className={`px-2 py-1 rounded text-xs ${
                            field.status === "Active" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {field.status}
                          </span>
                          {field.status === "Active" && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <ChevronDown size={16} />
                              </button>
                              {openDropdownIndex === index && (
                                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                                    Mark as Inactive
                                  </button>
                                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                                    Hide in all PDF
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Buttons Tab Content */}
      {activeTab === "custom-buttons" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                What's this?
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                View Logs
              </button>
              <button
                onClick={() => setShowNewButtonModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                New
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Location :</label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="All">All</option>
                  <option value="Details Page Menu">Details Page Menu</option>
                  <option value="List Page - Action Menu">List Page - Action Menu</option>
                  <option value="List Page - Bulk Action Menu">List Page - Bulk Action Menu</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">BUTTON NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ACCESS PERMISSION</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">LOCATION</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customButtons.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Create buttons which perform actions set by you. What are you waiting for!
                      </p>
                    </td>
                  </tr>
                ) : (
                  customButtons.map((button, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{button.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.accessPermission}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Related Lists Tab Content */}
      {activeTab === "related-lists" && (
        <div>
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={() => navigate("/settings/vendor-credits/new-related-list")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Related List
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-8 flex items-center justify-center" style={{ width: "200px", height: "200px" }}>
                <div 
                  className="absolute rounded-lg border-2 border-gray-300 bg-gray-50"
                  style={{
                    width: "120px",
                    height: "100px",
                    transform: "rotate(-2deg)",
                    left: "60px",
                    top: "30px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                  }}
                >
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-2">
                    <div className="w-full h-px bg-gray-300 mb-2"></div>
                    <div className="w-full h-px bg-gray-300"></div>
                  </div>
                  <div className="absolute inset-0 flex justify-center items-center">
                    <div className="h-full w-px bg-gray-300"></div>
                  </div>
                </div>
                
                <div className="relative z-10" style={{ left: "-20px", top: "10px" }}>
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: "#fbbf24",
                      top: "0px",
                      left: "15px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    <div 
                      className="absolute rounded-full bg-white"
                      style={{
                        width: "35px",
                        height: "35px",
                        top: "8px",
                        left: "7.5px"
                      }}
                    >
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-1 border-b-2 border-gray-700 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div 
                    className="absolute rounded-lg"
                    style={{
                      width: "60px",
                      height: "70px",
                      backgroundColor: "#ef4444",
                      top: "45px",
                      left: "10px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  ></div>
                  
                  <div 
                    className="absolute rounded-full border-4 border-blue-500 bg-blue-100"
                    style={{
                      width: "50px",
                      height: "50px",
                      top: "60px",
                      left: "50px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-white"></div>
                      <div className="absolute w-0.5 h-6 bg-white"></div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center mb-8 max-w-md">
                Create custom related lists to access relevant information available from inside or outside the application.
              </p>

              <button
                onClick={() => navigate("/settings/vendor-credits/new-related-list")}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                New Related List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Custom Button Modal */}
      {showNewButtonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Custom Button - Vendor Credits</h2>
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Button Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newButtonName}
                  onChange={(e) => setNewButtonName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter button name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Type
                </label>
                <select
                  value={newButtonType}
                  onChange={(e) => setNewButtonType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Select</option>
                  <option value="workflow">Workflow</option>
                  <option value="script">Script</option>
                  <option value="url">URL</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

