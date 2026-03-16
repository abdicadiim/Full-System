import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Lock } from "lucide-react";

export default function FieldCustomization() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("field-customization");
  const [customFields, setCustomFields] = useState([]);
  const [isNewFieldModalOpen, setIsNewFieldModalOpen] = useState(false);
  const [newField, setNewField] = useState({
    name: "",
    dataType: "Text Box (Single Line)",
    mandatory: false,
    showInPDF: false
  });

  useEffect(() => {
    // Load custom fields from localStorage
    const savedFields = JSON.parse(localStorage.getItem("payments_received_custom_fields") || "[]");
    // Add default fields if none exist
    if (savedFields.length === 0) {
      const defaultFields = [
        { id: 1, name: "Sales person", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
        { id: 2, name: "Description", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true }
      ];
      setCustomFields(defaultFields);
      localStorage.setItem("payments_received_custom_fields", JSON.stringify(defaultFields));
    } else {
      setCustomFields(savedFields);
    }
  }, []);

  const handleAddField = () => {
    if (!newField.name.trim()) {
      alert("Please enter a field name");
      return;
    }

    const field = {
      id: Date.now(),
      name: newField.name.trim(),
      dataType: newField.dataType,
      mandatory: newField.mandatory,
      showInPDF: newField.showInPDF,
      status: "Active",
      isLocked: false
    };

    const updatedFields = [...customFields, field];
    setCustomFields(updatedFields);
    localStorage.setItem("payments_received_custom_fields", JSON.stringify(updatedFields));
    setNewField({
      name: "",
      dataType: "Text Box (Single Line)",
      mandatory: false,
      showInPDF: false
    });
    setIsNewFieldModalOpen(false);
  };

  const handleDeleteField = (fieldId) => {
    const field = customFields.find(f => f.id === fieldId);
    if (field?.isLocked) {
      alert("This field is locked and cannot be deleted");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this custom field?")) {
      const updatedFields = customFields.filter(f => f.id !== fieldId);
      setCustomFields(updatedFields);
      localStorage.setItem("payments_received_custom_fields", JSON.stringify(updatedFields));
    }
  };

  const handleToggleStatus = (fieldId) => {
    const updatedFields = customFields.map(field => 
      field.id === fieldId 
        ? { ...field, status: field.status === "Active" ? "Inactive" : "Active" }
        : field
    );
    setCustomFields(updatedFields);
    localStorage.setItem("payments_received_custom_fields", JSON.stringify(updatedFields));
  };

  const dataTypeOptions = [
    "Text Box (Single Line)",
    "Text Box (Multi Line)",
    "Number",
    "Date",
    "Dropdown",
    "Checkbox",
    "Phone",
    "Email",
    "URL"
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("preferences")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "preferences"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab("field-customization")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "field-customization"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Field Customization
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="text-sm text-blue-600 hover:text-blue-700"
              onClick={() => navigate("/payments/payments-received")}
            >
              All Preferences
            </button>
            <button
              onClick={() => navigate("/payments/payments-received")}
              className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Field Customization Tab Content */}
        {activeTab === "field-customization" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors"
                onClick={() => setIsNewFieldModalOpen(true)}
              >
                <Plus size={16} />
                New
              </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {customFields.map((field) => (
                    <tr key={field.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">
                        <div className="flex items-center gap-2">
                          {field.isLocked && <Lock size={14} className="text-gray-400" />}
                          <span>{field.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{field.dataType}</td>
                      <td className="px-4 py-3 text-gray-700">{field.mandatory ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-gray-700">{field.showInPDF ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            field.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {field.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(field.id)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            {field.status === "Active" ? "Deactivate" : "Activate"}
                          </button>
                          {!field.isLocked && (
                            <button
                              onClick={() => handleDeleteField(field.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Preferences Tab Content - Placeholder */}
        {activeTab === "preferences" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
            <p className="text-gray-600">Preferences settings will be available here.</p>
          </div>
        )}

        {/* New Field Modal */}
        {isNewFieldModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsNewFieldModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Add New Custom Field</h3>
                <button
                  onClick={() => setIsNewFieldModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Field Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter field name"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newField.dataType}
                    onChange={(e) => setNewField({ ...newField, dataType: e.target.value })}
                  >
                    {dataTypeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.mandatory}
                      onChange={(e) => setNewField({ ...newField, mandatory: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Mandatory</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.showInPDF}
                      onChange={(e) => setNewField({ ...newField, showInPDF: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show in All PDFs</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setIsNewFieldModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

