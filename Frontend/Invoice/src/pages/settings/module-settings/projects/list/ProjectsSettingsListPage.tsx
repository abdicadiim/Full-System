import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, ChevronDown, HelpCircle } from "lucide-react";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("field-customization");
  
  // Field Customization tab states
  const [customFields, setCustomFields] = useState([]);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 59;
  
  // Custom Buttons tab states
  const [customButtons, setCustomButtons] = useState([]);
  const [showNewButtonDropdown, setShowNewButtonDropdown] = useState(false);
  const [locationFilter, setLocationFilter] = useState("All");
  const newButtonDropdownRef = useRef(null);
  
  // Related Lists tab states
  const [relatedLists, setRelatedLists] = useState([]);
  const [showNewRelatedListDropdown, setShowNewRelatedListDropdown] = useState(false);
  const newRelatedListDropdownRef = useRef(null);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newButtonDropdownRef.current && !newButtonDropdownRef.current.contains(event.target)) {
        setShowNewButtonDropdown(false);
      }
      if (newRelatedListDropdownRef.current && !newRelatedListDropdownRef.current.contains(event.target)) {
        setShowNewRelatedListDropdown(false);
      }
    };
    if (showNewButtonDropdown || showNewRelatedListDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewButtonDropdown, showNewRelatedListDropdown]);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Projects</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
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

      {/* Field Customization Tab Content */}
      {activeTab === "field-customization" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/projects/new-field")}
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

      {/* Custom Buttons Tab Content */}
      {activeTab === "custom-buttons" && (
        <div>
          {/* Header with actions */}
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                What's this?
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                View Logs
              </button>
              {/* Split Button: New Button */}
              <div className="relative" ref={newButtonDropdownRef}>
                <div className="flex">
                  <button
                    onClick={() => {
                      // Handle new button creation
                      setShowNewButtonDropdown(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-l-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <span className="text-lg">+</span>
                    New
                  </button>
                  <button
                    onClick={() => setShowNewButtonDropdown(!showNewButtonDropdown)}
                    className="px-2 py-2 text-sm font-medium text-white bg-red-600 rounded-r-lg hover:bg-red-700 border-l border-red-500"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showNewButtonDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
                    <button
                      onClick={() => {
                        // Handle new button
                        setShowNewButtonDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    >
                      New Button
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
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
                  <option value="List Page">List Page</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    BUTTON NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ACCESS PERMISSION
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    LOCATION
                  </th>
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
          {/* Header with dropdown button */}
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={() => navigate("/settings/projects/new-related-list")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Related List
            </button>
          </div>

          {/* Empty State with Illustration */}
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center py-12">
              {/* Illustration */}
              <div className="relative mb-8 flex items-center justify-center" style={{ width: "200px", height: "200px" }}>
                {/* Window/Frame element (background) */}
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
                  {/* Window grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-2">
                    <div className="w-full h-px bg-gray-300 mb-2"></div>
                    <div className="w-full h-px bg-gray-300"></div>
                  </div>
                  <div className="absolute inset-0 flex justify-center items-center">
                    <div className="h-full w-px bg-gray-300"></div>
                  </div>
                </div>
                
                {/* Person figure */}
                <div className="relative z-10" style={{ left: "-20px", top: "10px" }}>
                  {/* Head */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: "#fbbf24", // Pink-ish for hair
                      top: "0px",
                      left: "15px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    {/* Face */}
                    <div 
                      className="absolute rounded-full bg-white"
                      style={{
                        width: "35px",
                        height: "35px",
                        top: "8px",
                        left: "7.5px"
                      }}
                    >
                      {/* Eyes */}
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      {/* Mouth */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-1 border-b-2 border-gray-700 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Body (red shirt) */}
                  <div 
                    className="absolute rounded-lg"
                    style={{
                      width: "60px",
                      height: "70px",
                      backgroundColor: "#ef4444", // Red
                      top: "45px",
                      left: "10px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  ></div>
                  
                  {/* Arms holding circle */}
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
                    {/* Plus sign */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-white"></div>
                      <div className="absolute w-0.5 h-6 bg-white"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Text */}
              <p className="text-sm text-gray-600 text-center mb-8 max-w-md">
                Create custom related lists to access relevant information available from inside or outside the application.
              </p>

              {/* New Related List Button */}
              <button
                onClick={() => navigate("/settings/projects/new-related-list")}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                New Related List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



