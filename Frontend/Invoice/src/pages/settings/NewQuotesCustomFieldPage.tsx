import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Search, HelpCircle, Mail, Globe, Phone, Calendar, Clock } from "lucide-react";

export default function NewQuotesCustomFieldPage() {
  const navigate = useNavigate();
  const [labelName, setLabelName] = useState("");
  const [dataType, setDataType] = useState("");
  const [isMandatory, setIsMandatory] = useState("No");
  const [showInAllPDFs, setShowInAllPDFs] = useState("No");
  const [dataTypeDropdownOpen, setDataTypeDropdownOpen] = useState(false);
  const [dataTypeSearch, setDataTypeSearch] = useState("");
  const dataTypeRef = useRef(null);
  const dataTypeDropdownRef = useRef(null);

  const dataTypeOptions = [
    "Text Box (Single Line)",
    "Email",
    "URL",
    "Phone",
    "Number",
    "Decimal",
    "Amount",
    "Percent",
    "Date",
    "Date and Time",
    "Check Box",
    "Auto-Generate Number",
    "Dropdown",
    "Multi-select",
    "Lookup",
    "Text Box (Multi-line)",
    "Attachment",
    "Formula",
    "Image"
  ];

  const filteredDataTypeOptions = useMemo(() => {
    const s = dataTypeSearch.trim().toLowerCase();
    return s ? dataTypeOptions.filter((o) => o.toLowerCase().includes(s)) : dataTypeOptions;
  }, [dataTypeSearch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dataTypeRef.current && !dataTypeRef.current.contains(event.target) && 
          dataTypeDropdownRef.current && !dataTypeDropdownRef.current.contains(event.target)) {
        setDataTypeDropdownOpen(false);
      }
    };
    if (dataTypeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dataTypeDropdownOpen]);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Custom Field - Quotes</h1>
        <button
          onClick={() => navigate("/settings/quotes")}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={24} className="text-gray-500" />
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter label name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Type <span className="text-red-500">*</span>
            </label>
            <div ref={dataTypeRef} className="relative">
              <button
                type="button"
                onClick={() => setDataTypeDropdownOpen(!dataTypeDropdownOpen)}
                className={`w-full h-10 px-3 rounded-lg border-2 bg-white text-left text-sm font-medium flex items-center justify-between transition ${
                  dataTypeDropdownOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <span className={dataType ? "text-gray-900" : "text-gray-500"}>
                  {dataType || "Select data type"}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className={`transition-transform ${dataTypeDropdownOpen ? "rotate-180" : ""}`}
                >
                  <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {dataTypeDropdownOpen && createPortal(
                <div
                  ref={dataTypeDropdownRef}
                  className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                  style={{
                    top: `${dataTypeRef.current?.getBoundingClientRect().bottom + 8}px`,
                    left: `${dataTypeRef.current?.getBoundingClientRect().left}px`,
                    width: `${dataTypeRef.current?.getBoundingClientRect().width}px`,
                    zIndex: 99999,
                    maxHeight: '320px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
                    <Search size={16} className="text-gray-400" />
                    <input
                      autoFocus
                      className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                      placeholder="Search"
                      value={dataTypeSearch}
                      onChange={(e) => setDataTypeSearch(e.target.value)}
                    />
                  </div>
                  <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                    {filteredDataTypeOptions.map((opt) => {
                      const isSelected = opt === dataType;
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium transition flex items-center justify-between
                            ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                          `}
                          onClick={() => {
                            setDataType(opt);
                            setDataTypeDropdownOpen(false);
                            setDataTypeSearch("");
                          }}
                        >
                          <span>{opt}</span>
                          {isSelected && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                    {filteredDataTypeOptions.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Is Mandatory</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isMandatory"
                  value="Yes"
                  checked={isMandatory === "Yes"}
                  onChange={(e) => setIsMandatory(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isMandatory"
                  value="No"
                  checked={isMandatory === "No"}
                  onChange={(e) => setIsMandatory(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Show in All PDFs</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="showInAllPDFs"
                  value="Yes"
                  checked={showInAllPDFs === "Yes"}
                  onChange={(e) => setShowInAllPDFs(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="showInAllPDFs"
                  value="No"
                  checked={showInAllPDFs === "No"}
                  onChange={(e) => setShowInAllPDFs(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate("/settings/quotes")}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => navigate("/settings/quotes")}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}



