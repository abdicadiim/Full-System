import React, { useState } from "react";

export default function NewCustomViewForm({ onClose }) {
  const [viewName, setViewName] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [criteria, setCriteria] = useState([
    { field: "", comparator: "", value: "" }
  ]);
  const [availableColumns, setAvailableColumns] = useState([
    "Customer Name",
    "Billing Method",
    "Rate",
    "Project Status"
  ]);
  const [selectedColumns, setSelectedColumns] = useState([
    "Project Name"
  ]);
  const [visibility, setVisibility] = useState("Only Me");

  const addCriterion = () => {
    setCriteria([...criteria, { field: "", comparator: "", value: "" }]);
  };

  const removeCriterion = (index) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const moveToSelected = (column) => {
    setSelectedColumns([...selectedColumns, column]);
    setAvailableColumns(availableColumns.filter(c => c !== column));
  };

  const moveToAvailable = (column) => {
    setAvailableColumns([...availableColumns, column]);
    setSelectedColumns(selectedColumns.filter(c => c !== column));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-5">
      <div className="bg-white rounded-lg w-full max-w-[900px] max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            New Custom View
          </h2>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-2xl cursor-pointer text-gray-600 hover:text-gray-900"
          >
            ×
          </button>
        </div>

        {/* Name Section */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <label className="text-sm font-medium text-gray-900">
              Name<span className="text-red-600">*</span>
            </label>
            <div
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5L8 2z" 
                  stroke={isFavorite ? "#ffa726" : "#666"} 
                  fill={isFavorite ? "#ffa726" : "none"}
                  strokeWidth="1.5"
                />
              </svg>
              <span className="text-sm text-gray-600">Mark as Favorite</span>
            </div>
          </div>
          <input
            type="text"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="Enter view name"
            className="w-full px-3 py-2.5 border border-blue-700 rounded text-sm outline-none focus:border-blue-600"
          />
        </div>

        {/* Define the criteria Section */}
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Define the criteria (if any)
          </h3>
          {criteria.map((criterion, index) => (
            <div key={index} className="flex gap-2 items-center mb-3">
              <span className="text-sm text-gray-600 min-w-[20px]">
                {index + 1}
              </span>
              <select
                value={criterion.field}
                onChange={(e) => {
                  const newCriteria = [...criteria];
                  newCriteria[index].field = e.target.value;
                  setCriteria(newCriteria);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Select a field</option>
                <option value="project">Project</option>
                <option value="status">Status</option>
                <option value="customer">Customer</option>
              </select>
              <select
                value={criterion.comparator}
                onChange={(e) => {
                  const newCriteria = [...criteria];
                  newCriteria[index].comparator = e.target.value;
                  setCriteria(newCriteria);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Select a comparator</option>
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="not_equals">Not Equals</option>
              </select>
              <input
                type="text"
                value={criterion.value}
                onChange={(e) => {
                  const newCriteria = [...criteria];
                  newCriteria[index].value = e.target.value;
                  setCriteria(newCriteria);
                }}
                placeholder="Value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => {
                  const newCriteria = [...criteria];
                  newCriteria[index] = { ...newCriteria[index] };
                  setCriteria(newCriteria);
                }}
                className="bg-transparent border-none cursor-pointer p-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3v10M3 8h10" stroke="#1976d2" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                onClick={() => removeCriterion(index)}
                className="bg-transparent border-none cursor-pointer p-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={addCriterion}
            className="bg-blue-700 text-white border-none px-4 py-2 rounded cursor-pointer text-sm font-medium hover:bg-blue-800"
          >
            + Add Criterion
          </button>
        </div>

        {/* Columns Preference Section */}
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Columns Preference
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Available Columns */}
            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">
                AVAILABLE COLUMNS
              </div>
              <div className="border border-gray-300 rounded p-3 min-h-[200px]">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-3 text-sm"
                />
                {availableColumns.map((column) => (
                  <div
                    key={column}
                    onClick={() => moveToSelected(column)}
                    className="p-2 cursor-pointer rounded mb-1 flex items-center gap-2 hover:bg-gray-100"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="3" cy="3" r="1" fill="#666"/>
                      <circle cx="3" cy="8" r="1" fill="#666"/>
                      <circle cx="3" cy="13" r="1" fill="#666"/>
                      <circle cx="8" cy="3" r="1" fill="#666"/>
                      <circle cx="8" cy="8" r="1" fill="#666"/>
                      <circle cx="8" cy="13" r="1" fill="#666"/>
                    </svg>
                    <span className="text-sm text-gray-900">{column}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Columns */}
            <div>
              <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 4L6 11L3 8" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                SELECTED COLUMNS
              </div>
              <div className="border border-gray-300 rounded p-3 min-h-[200px]">
                {selectedColumns.map((column) => (
                  <div
                    key={column}
                    onClick={() => moveToAvailable(column)}
                    className="p-2 cursor-pointer rounded mb-1 flex items-center gap-2 hover:bg-gray-100"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="3" cy="3" r="1" fill="#666"/>
                      <circle cx="3" cy="8" r="1" fill="#666"/>
                      <circle cx="3" cy="13" r="1" fill="#666"/>
                      <circle cx="8" cy="3" r="1" fill="#666"/>
                      <circle cx="8" cy="8" r="1" fill="#666"/>
                      <circle cx="8" cy="13" r="1" fill="#666"/>
                    </svg>
                    <span className="text-sm text-gray-900">
                      {column}
                      {column === "Project Name" && <span className="text-red-600">*</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Preference Section */}
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Visibility Preference
          </h3>
          <div className="text-sm font-medium text-gray-600 mb-3">
            Share With
          </div>
          <div className="flex flex-col gap-3">
            {[
              { id: "Only Me", label: "Only Me", icon: "🔒" },
              { id: "Only Selected Users & Roles", label: "Only Selected Users & Roles", icon: "👤🔒" },
              { id: "Everyone", label: "Everyone", icon: "📄🔒" }
            ].map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-100"
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.id}
                  checked={visibility === option.id}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="cursor-pointer"
                />
                <span className="text-sm text-gray-900">{option.icon} {option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-300">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded bg-white cursor-pointer text-sm text-gray-900 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Handle save logic here
              onClose();
            }}
            className="px-5 py-2.5 border-none rounded bg-blue-700 text-white cursor-pointer text-sm font-medium hover:bg-blue-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

