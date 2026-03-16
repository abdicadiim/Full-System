import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Search, HelpCircle, Mail, Globe, Phone, Calendar, Clock } from "lucide-react";

export default function NewCustomFieldPage() {
  const navigate = useNavigate();
  const [labelName, setLabelName] = useState("");
  const [dataType, setDataType] = useState("");
  const [isMandatory, setIsMandatory] = useState("No");
  const [dataTypeDropdownOpen, setDataTypeDropdownOpen] = useState(false);
  const [dataTypeSearch, setDataTypeSearch] = useState("");
  const [helpText, setHelpText] = useState("");
  const [pii, setPii] = useState(false);
  const [ephi, setEphi] = useState(false);
  const [preventDuplicate, setPreventDuplicate] = useState("No");
  const [inputFormat, setInputFormat] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [defaultTimeValue, setDefaultTimeValue] = useState("");
  const [hyperlinkLabel, setHyperlinkLabel] = useState("");
  const [selectRelativeDate, setSelectRelativeDate] = useState(false);
  const [dataSensitivity, setDataSensitivity] = useState("not-sensitive");
  const [prefix, setPrefix] = useState("");
  const [startingNumber, setStartingNumber] = useState("");
  const [suffix, setSuffix] = useState("");
  const [addToExistingUsers, setAddToExistingUsers] = useState(false);
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

  // Click away handler
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

  // Calculate dropdown position
  useEffect(() => {
    if (dataTypeDropdownOpen && dataTypeRef.current) {
      const updatePosition = () => {
        if (dataTypeRef.current) {
          const rect = dataTypeRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const dropdownHeight = 320;
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
          
          // Position will be set in the portal
        }
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [dataTypeDropdownOpen]);

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Custom Field - Users</h1>
        <button
          onClick={() => navigate("/settings/user-preferences")}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={24} className="text-gray-500" />
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Label Name */}
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

          {/* Data Type */}
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

          {/* Help Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Help Text</label>
            <textarea
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter some text to help users understand the purpose of this custom field."
            />
          </div>

          {/* Data Privacy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Data Privacy
              <HelpCircle size={16} className="text-gray-400" />
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pii}
                  onChange={(e) => setPii(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">PII</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ephi}
                  onChange={(e) => setEphi(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">ePHI</span>
              </label>
              {(pii || ephi) ? (
                <div className="mt-3 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="dataSensitivity"
                      value="sensitive"
                      checked={dataSensitivity === "sensitive"}
                      onChange={(e) => setDataSensitivity(e.target.value)}
                      className="mt-1 h-4 w-4"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Sensitive data. Encrypt and store it.</span>
                      <p className="text-xs text-gray-500 mt-1">
                        Only users with access to protected data will be able to view the details, and this field cannot be used to perform an advanced search.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="dataSensitivity"
                      value="not-sensitive"
                      checked={dataSensitivity === "not-sensitive"}
                      onChange={(e) => setDataSensitivity(e.target.value)}
                      className="mt-1 h-4 w-4"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Not sensitive data. Store it without encryption.</span>
                    </div>
                  </label>
                  {dataSensitivity === "sensitive" && (
                    <p className="text-xs text-gray-600 mt-2">
                      Data is sensitive and will be stored with encryption. Only users with access to protected data will be able to view it.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-2">
                  Data will be stored without encryption and will be visible to all users.
                </p>
              )}
            </div>
          </div>

          {/* Prevent Duplicate Values */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Prevent Duplicate Values
              <HelpCircle size={16} className="text-gray-400" />
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="preventDuplicate"
                  value="Yes"
                  checked={preventDuplicate === "Yes"}
                  onChange={(e) => setPreventDuplicate(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="preventDuplicate"
                  value="No"
                  checked={preventDuplicate === "No"}
                  onChange={(e) => setPreventDuplicate(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          {/* URL-specific: Hyperlink Label */}
          {dataType === "URL" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Hyperlink Label
                <HelpCircle size={16} className="text-gray-400" />
              </label>
              <input
                type="text"
                value={hyperlinkLabel}
                onChange={(e) => setHyperlinkLabel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter hyperlink label"
              />
            </div>
          )}

          {/* Auto-Generate Number specific fields */}
          {dataType === "Auto-Generate Number" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter prefix"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={startingNumber}
                  onChange={(e) => setStartingNumber(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter starting number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Suffix</label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter suffix"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToExistingUsers}
                    onChange={(e) => setAddToExistingUsers(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Add this custom field to all the existing users and auto-generate the number in all of them.
                    </span>
                    <div className="flex items-start gap-2 mt-2">
                      <HelpCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600">
                        This is a one-time setup and you cannot edit this setting later.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Input Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Input Format
              <HelpCircle size={16} className="text-gray-400" />
            </label>
            <input
              type="text"
              value={inputFormat}
              onChange={(e) => setInputFormat(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter input format"
            />
          </div>

          {/* Default Value */}
          {dataType === "Date and Time" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Default Value
                <HelpCircle size={16} className="text-gray-400" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="dd/MM/yyyy"
                  />
                </div>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={defaultTimeValue}
                    onChange={(e) => setDefaultTimeValue(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="HH:MM"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Default Value
                <HelpCircle size={16} className="text-gray-400" />
              </label>
              <div className="relative">
                {dataType === "Email" && (
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
                {dataType === "URL" && (
                  <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
                {dataType === "Phone" && (
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
                {dataType === "Date" && (
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
                <input
                  type="text"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  className={`w-full h-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    (dataType === "Email" || dataType === "URL" || dataType === "Phone" || dataType === "Date") ? "pl-10" : "px-3"
                  }`}
                  placeholder={dataType === "Date" ? "dd/MM/yyyy" : "Enter default value"}
                />
              </div>
              {dataType === "Date" && (
                <button
                  type="button"
                  onClick={() => setSelectRelativeDate(!selectRelativeDate)}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Select Relative Date
                </button>
              )}
            </div>
          )}

          {/* Is Mandatory */}
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
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate("/settings/user-preferences")}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Handle save
              navigate("/settings/user-preferences");
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

