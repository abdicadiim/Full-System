import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Search, ChevronDown, Check, Star, GripVertical, Lock, Users, FileText, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import { saveCustomView } from "../../salesModel";

const customerFields = [
  "Name", "Company Name", "Email", "Work Phone", "Mobile Phone", "Phone",
  "Receivables", "Receivables (BCY)", "Unused Credits", "Unused Credits (BCY)",
  "Currency", "Status", "Payment Terms", "Customer Type", "Source", "Website",
  "Notes", "Billing Country", "Shipping Country", "Portal Status",
  "Portal Invitation Accepted Date", "Tax", "First Name", "Last Name"
];

const comparators = [
  "is", "is not", "starts with", "contains", "doesn't contain",
  "is in", "is not in", "is empty", "is not empty"
];

const recurringInvoiceFields = [
  "Profile Name", "Customer Name", "Repeat Every", "Amount", "Status",
  "Next Invoice Date", "Start On", "Ends On", "Payment Terms", "Order Number"
];

const paymentReceivedFields = [
  "Date", "Payment Number", "Customer Name", "Invoice Number",
  "Payment Method", "Amount", "Status", "Reference Number"
];

const creditNoteFields = [
  "Date", "Credit Note#", "Reference Number", "Customer Name",
  "Invoice#", "Status", "Amount", "Balance"
];

const quoteFields = [
  "Date", "Quote Number", "Reference Number", "Customer Name",
  "Status", "Expiry Date", "Amount", "Project Name", "Salesperson"
];

const salesReceiptFields = [
  "Date", "Sales Receipt#", "Reference Number", "Customer Name",
  "Status", "Payment Method", "Amount", "Deposit To"
];

export default function NewCustomView() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine context from URL
  const getContext = () => {
    if (location.pathname.includes("/recurring-invoices/custom-view/new")) {
      return {
        type: "recurring-invoices",
        basePath: "/sales/recurring-invoices",
        fields: recurringInvoiceFields,
        defaultAvailableColumns: ["Profile Name", "Customer Name", "Repeat Every", "Amount", "Status", "Next Invoice Date", "Start On", "Ends On"],
        defaultSelectedColumn: "Profile Name"
      };
    } else if (location.pathname.includes("/payments-received/custom-view/new")) {
      return {
        type: "payments-received",
        basePath: "/sales/payments-received",
        fields: paymentReceivedFields,
        defaultAvailableColumns: ["Date", "Payment Number", "Customer Name", "Invoice Number", "Payment Method", "Amount", "Status"],
        defaultSelectedColumn: "Payment Number"
      };
    } else if (location.pathname.includes("/invoices/custom-view/new")) {
      return {
        type: "invoices",
        basePath: "/sales/invoices",
        fields: ["Date", "Invoice Number", "Order Number", "Customer Name", "Status", "Due Date", "Amount", "Balance Due"],
        defaultAvailableColumns: ["Date", "Invoice Number", "Order Number", "Customer Name", "Status", "Due Date", "Amount", "Balance Due"],
        defaultSelectedColumn: "Invoice Number"
      };
    } else if (location.pathname.includes("/credit-notes/custom-view/new")) {
      return {
        type: "credit-notes",
        basePath: "/sales/credit-notes",
        fields: creditNoteFields,
        defaultAvailableColumns: ["Date", "Credit Note#", "Reference Number", "Customer Name", "Invoice#", "Status", "Amount", "Balance"],
        defaultSelectedColumn: "Credit Note#"
      };
    } else if (location.pathname.includes("/quotes/custom-view/new")) {
      return {
        type: "quotes",
        basePath: "/sales/quotes",
        fields: quoteFields,
        defaultAvailableColumns: ["Date", "Quote Number", "Reference Number", "Customer Name", "Status", "Expiry Date", "Amount", "Project Name", "Salesperson"],
        defaultSelectedColumn: "Quote Number"
      };
    } else if (location.pathname.includes("/sales-receipts/custom-view/new")) {
      return {
        type: "sales-receipts",
        basePath: "/sales/sales-receipts",
        fields: salesReceiptFields,
        defaultAvailableColumns: ["Date", "Sales Receipt#", "Reference Number", "Customer Name", "Status", "Payment Method", "Amount", "Deposit To"],
        defaultSelectedColumn: "Sales Receipt#"
      };
    }
    // Default to customers
    return {
      type: "customers",
      basePath: "/sales/customers",
      fields: customerFields,
      defaultAvailableColumns: ["Company Name", "Email", "Phone", "Receivables", "Receivables (BCY)", "Unused Credits", "Unused Credits (BCY)", "Source", "First Name", "Last Name", "Mobile Phone", "Payment Terms", "Status", "Website", "Notes", "Billing Country", "Shipping Country", "Portal Status", "Portal Invitation Accepted Date", "Tax", "Currency"],
      defaultSelectedColumn: "Name"
    };
  };

  const context = getContext();

  const [newViewName, setNewViewName] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [criteria, setCriteria] = useState([{ id: 1, field: "", comparator: "", value: "" }]);
  const [logicalOperators, setLogicalOperators] = useState({}); // Store AND/OR between criteria (index: operator)
  const [availableColumns, setAvailableColumns] = useState(context.defaultAvailableColumns);
  const [selectedColumns, setSelectedColumns] = useState([context.defaultSelectedColumn]);
  const [columnSearch, setColumnSearch] = useState("");
  const [selectedColumnSearch, setSelectedColumnSearch] = useState("");
  const [visibilityPreference, setVisibilityPreference] = useState("only-me");
  const [fieldSearch, setFieldSearch] = useState({});
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState({});
  const [comparatorSearch, setComparatorSearch] = useState({});
  const [isComparatorDropdownOpen, setIsComparatorDropdownOpen] = useState({});
  const [openOperatorDropdowns, setOpenOperatorDropdowns] = useState({});
  const [userRoleType, setUserRoleType] = useState("roles"); // "users" or "roles"
  const [isUserRoleDropdownOpen, setIsUserRoleDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([
    { name: "Mohamed Ali Hassan", email: "maxamed9885m@gmail.com", avatar: null }
  ]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [tempSelectedRoles, setTempSelectedRoles] = useState([]); // Temporary selection before adding
  const [tempSelectedUsers, setTempSelectedUsers] = useState([]); // Temporary selection before adding
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [hoveredField, setHoveredField] = useState({});
  const [hoveredComparator, setHoveredComparator] = useState({});

  // Mock data - replace with actual API calls
  const availableRoles = ["Admin", "Staff", "TimesheetStaff", "Staff (Assigned Customers Only)"];
  const availableUsers = [
    { name: "John Doe", email: "john.doe@example.com", avatar: null },
    { name: "Jane Smith", email: "jane.smith@example.com", avatar: null },
    { name: "Bob Johnson", email: "bob.johnson@example.com", avatar: null }
  ];

  const handleAddCriterion = () => {
    setCriteria([...criteria, { id: Date.now(), field: "", comparator: "", value: "" }]);
  };

  const handleRemoveCriterion = (id) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter(c => c.id !== id));
    }
  };

  const handleCriterionChange = (id, field, value) => {
    setCriteria(criteria.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleAddColumn = (column) => {
    if (!selectedColumns.includes(column)) {
      setSelectedColumns([...selectedColumns, column]);
      setAvailableColumns(availableColumns.filter(c => c !== column));
    }
  };

  const handleRemoveColumn = (column) => {
    const requiredColumn = context.defaultSelectedColumn;
    if (selectedColumns.length > 1 && column !== requiredColumn) {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
      setAvailableColumns([...availableColumns, column]);
    }
  };

  const toggleOperatorDropdown = (index) => {
    setOpenOperatorDropdowns(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const selectOperator = (index, operator) => {
    setLogicalOperators(prev => ({ ...prev, [index]: operator }));
    setOpenOperatorDropdowns(prev => ({ ...prev, [index]: false }));
  };

  const removeUser = (index) => {
    setSelectedUsers(selectedUsers.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (newViewName.trim()) {
      try {
        const customViewData = {
          name: newViewName.trim(),
          type: context.type,
          isFavorite,
          criteria: criteria.filter(c => c.field && c.comparator).map(c => ({
            id: c.id,
            field: c.field,
            comparator: c.comparator,
            value: c.value || "" // Save value even if empty
          })),
          logicalOperators: logicalOperators,
          columns: selectedColumns,
          visibility: visibilityPreference,
          selectedUsers: visibilityPreference === "selected-users" ? selectedUsers : [],
          selectedRoles: visibilityPreference === "selected-users" ? selectedRoles : []
        };

        saveCustomView(customViewData);

        // Trigger a storage event so components can refresh
        window.dispatchEvent(new Event('storage'));

        navigate(context.basePath);
      } catch (error) {
        console.error("Error saving custom view:", error);
        toast.error("Failed to save custom view. Please try again.");
      }
    }
  };

  const handleCancel = () => {
    // Navigate back based on context
    navigate(context.basePath);
  };

  // Refs for dropdowns
  const fieldDropdownRefs = useRef({});
  const comparatorDropdownRefs = useRef({});
  const operatorDropdownRefs = useRef({});
  const userRoleDropdownRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isFieldDropdown = Object.values(fieldDropdownRefs.current).some(ref =>
        ref && ref.contains(event.target)
      );
      const isComparatorDropdown = Object.values(comparatorDropdownRefs.current).some(ref =>
        ref && ref.contains(event.target)
      );
      const isOperatorDropdown = Object.values(operatorDropdownRefs.current).some(ref =>
        ref && ref.contains(event.target)
      );
      const isUserRoleDropdown = userRoleDropdownRef.current && userRoleDropdownRef.current.contains(event.target);
      const isSearchDropdown = searchDropdownRef.current && searchDropdownRef.current.contains(event.target);

      if (!isFieldDropdown && Object.keys(isFieldDropdownOpen).length > 0) {
        setIsFieldDropdownOpen({});
      }
      if (!isComparatorDropdown && Object.keys(isComparatorDropdownOpen).length > 0) {
        setIsComparatorDropdownOpen({});
      }
      if (!isOperatorDropdown && Object.keys(openOperatorDropdowns).length > 0) {
        setOpenOperatorDropdowns({});
      }
      if (!isUserRoleDropdown && isUserRoleDropdownOpen) {
        setIsUserRoleDropdownOpen(false);
      }
      if (!isSearchDropdown && isSearchDropdownOpen) {
        setIsSearchDropdownOpen(false);
      }
    };

    if (Object.keys(isFieldDropdownOpen).length > 0 || Object.keys(isComparatorDropdownOpen).length > 0 || Object.keys(openOperatorDropdowns).length > 0 || isUserRoleDropdownOpen || isSearchDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFieldDropdownOpen, isComparatorDropdownOpen, openOperatorDropdowns, isUserRoleDropdownOpen, isSearchDropdownOpen]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        {/* Page Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">New Custom View</h1>

        {/* Name Section */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Name<span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Enter view name"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${isFavorite
                ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
            >
              <Star size={16} fill={isFavorite ? "#fbbf24" : "none"} />
              <span>Mark as Favorite</span>
            </button>
          </div>
        </div>

        {/* Criteria Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Define the criteria (if any)</h3>
          {criteria.map((criterion, index) => (
            <div key={criterion.id}>
              {/* AND/OR Dropdown - Show between criteria rows */}
              {index > 0 && (
                <div className="flex items-center mb-3 ml-11">
                  <div
                    ref={el => operatorDropdownRefs.current[index] = el}
                    className="relative"
                    style={{ zIndex: openOperatorDropdowns[index] ? 2000 : "auto" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleOperatorDropdown(index)}
                      className={`px-3 py-1.5 border rounded-md text-sm bg-gray-50 hover:bg-gray-100 flex items-center gap-1.5 ${openOperatorDropdowns[index] ? "border-blue-500" : "border-gray-300"
                        }`}
                    >
                      <span className={logicalOperators[index] ? "text-gray-900" : "text-gray-500"}>
                        {logicalOperators[index] || "AND"}
                      </span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${openOperatorDropdowns[index] ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openOperatorDropdowns[index] && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[2000] min-w-[100px]">
                        <div
                          onClick={() => selectOperator(index, "AND")}
                          className={`px-3 py-2 text-sm cursor-pointer ${logicalOperators[index] === "AND"
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          AND
                        </div>
                        <div
                          onClick={() => selectOperator(index, "OR")}
                          className={`px-3 py-2 text-sm cursor-pointer ${logicalOperators[index] === "OR"
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          OR
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-semibold text-sm">
                  {index + 1}
                </span>
                <div className="relative flex-1 min-w-[200px]" ref={el => fieldDropdownRefs.current[criterion.id] = el}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsFieldDropdownOpen(prev => ({ ...prev, [criterion.id]: !prev[criterion.id] }))}
                      className={`flex-1 px-4 py-2 text-left border rounded-md bg-gray-50 hover:bg-gray-100 flex items-center justify-between ${isFieldDropdownOpen[criterion.id] ? "border-blue-500" : "border-gray-300"
                        }`}
                    >
                      <span className={criterion.field ? "text-gray-900" : "text-gray-500"}>
                        {criterion.field || "Select a field"}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${isFieldDropdownOpen[criterion.id] ? "rotate-180" : ""}`}
                      />
                    </button>
                    {criterion.field && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCriterionChange(criterion.id, "field", "");
                          handleCriterionChange(criterion.id, "comparator", "");
                          handleCriterionChange(criterion.id, "value", "");
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {isFieldDropdownOpen[criterion.id] && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50">
                        <Search size={16} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={fieldSearch[criterion.id] || ""}
                          onChange={(e) => setFieldSearch(prev => ({ ...prev, [criterion.id]: e.target.value }))}
                          className="flex-1 outline-none text-sm bg-white border border-gray-300 rounded px-3 py-1.5"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {context.fields
                          .filter(field => field.toLowerCase().includes((fieldSearch[criterion.id] || "").toLowerCase()))
                          .map(field => (
                            <div
                              key={field}
                              onClick={() => {
                                handleCriterionChange(criterion.id, "field", field);
                                setIsFieldDropdownOpen(prev => ({ ...prev, [criterion.id]: false }));
                                setFieldSearch(prev => ({ ...prev, [criterion.id]: "" }));
                              }}
                              onMouseEnter={() => setHoveredField(prev => ({ ...prev, [criterion.id]: field }))}
                              onMouseLeave={() => setHoveredField(prev => ({ ...prev, [criterion.id]: null }))}
                              className={`px-4 py-2 cursor-pointer flex items-center justify-between ${criterion.field === field || hoveredField[criterion.id] === field
                                ? "bg-blue-600 text-white"
                                : "text-gray-700 hover:bg-blue-50"
                                }`}
                            >
                              <span>{field}</span>
                              {criterion.field === field && (
                                <Check size={16} className="text-white" />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative flex-1 min-w-[200px]" ref={el => comparatorDropdownRefs.current[criterion.id] = el}>
                  <button
                    type="button"
                    onClick={() => setIsComparatorDropdownOpen(prev => ({ ...prev, [criterion.id]: !prev[criterion.id] }))}
                    className={`w-full px-4 py-2 text-left border rounded-md bg-gray-50 hover:bg-gray-100 flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed ${isComparatorDropdownOpen[criterion.id] ? "border-blue-500" : "border-gray-300"
                      }`}
                    disabled={!criterion.field}
                  >
                    <span className={criterion.comparator ? "text-gray-900" : "text-gray-500"}>
                      {criterion.comparator || "Select a comparator"}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isComparatorDropdownOpen[criterion.id] ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isComparatorDropdownOpen[criterion.id] && criterion.field && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50">
                        <Search size={16} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={comparatorSearch[criterion.id] || ""}
                          onChange={(e) => setComparatorSearch(prev => ({ ...prev, [criterion.id]: e.target.value }))}
                          className="flex-1 outline-none text-sm bg-white border border-gray-300 rounded px-3 py-1.5"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {comparators
                          .filter(comp => comp.toLowerCase().includes((comparatorSearch[criterion.id] || "").toLowerCase()))
                          .map(comp => (
                            <div
                              key={comp}
                              onClick={() => {
                                handleCriterionChange(criterion.id, "comparator", comp);
                                setIsComparatorDropdownOpen(prev => ({ ...prev, [criterion.id]: false }));
                                setComparatorSearch(prev => ({ ...prev, [criterion.id]: "" }));
                              }}
                              onMouseEnter={() => setHoveredComparator(prev => ({ ...prev, [criterion.id]: comp }))}
                              onMouseLeave={() => setHoveredComparator(prev => ({ ...prev, [criterion.id]: null }))}
                              className={`px-4 py-2 cursor-pointer flex items-center justify-between ${criterion.comparator === comp || hoveredComparator[criterion.id] === comp
                                ? "bg-blue-600 text-white"
                                : "text-gray-700 hover:bg-blue-50"
                                }`}
                            >
                              <span>{comp}</span>
                              {criterion.comparator === comp && (
                                <Check size={16} className="text-white" />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={criterion.value}
                  onChange={(e) => handleCriterionChange(criterion.id, "value", e.target.value)}
                  placeholder="Enter value"
                  className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!criterion.comparator}
                />
                <button
                  type="button"
                  onClick={() => handleAddCriterion()}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Plus size={16} />
                </button>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(criterion.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddCriterion}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Plus size={16} />
            Add Criterion
          </button>
        </div>

        {/* Columns Preference */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Columns Preference:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 rounded-md p-4 bg-white">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Available Columns</h4>
              <div className="flex items-center gap-2 mb-3 p-2 border border-gray-300 rounded-md bg-gray-50">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  className="flex-1 outline-none text-sm bg-white border border-gray-300 rounded px-3 py-1.5"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {availableColumns
                  .filter(col => !selectedColumns.includes(col))
                  .filter(col => col.toLowerCase().includes(columnSearch.toLowerCase()))
                  .map(column => (
                    <div
                      key={column}
                      className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                      onClick={() => handleAddColumn(column)}
                    >
                      <GripVertical size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{column}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="border border-gray-300 rounded-md p-4 bg-white">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-green-600 mb-3 uppercase">
                <Check size={16} className="text-green-600" />
                Selected Columns
              </h4>
              <div className="flex items-center gap-2 mb-3 p-2 border border-gray-300 rounded-md bg-gray-50">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={selectedColumnSearch}
                  onChange={(e) => setSelectedColumnSearch(e.target.value)}
                  className="flex-1 outline-none text-sm bg-white border border-gray-300 rounded px-3 py-1.5"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {selectedColumns
                  .filter(col => col.toLowerCase().includes(selectedColumnSearch.toLowerCase()))
                  .map(column => (
                    <div
                      key={column}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                      onClick={() => handleRemoveColumn(column)}
                    >
                      <GripVertical size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {column}{column === context.defaultSelectedColumn && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Preference */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility Preference</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Share With</label>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 border-2 rounded-md cursor-pointer transition-colors ${visibilityPreference === "only-me"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
                }`}>
                <input
                  type="radio"
                  name="visibility"
                  value="only-me"
                  checked={visibilityPreference === "only-me"}
                  onChange={(e) => setVisibilityPreference(e.target.value)}
                  className="text-blue-600"
                />
                <Lock size={16} className={visibilityPreference === "only-me" ? "text-blue-600" : "text-gray-400"} />
                <span className={visibilityPreference === "only-me" ? "text-blue-900 font-medium" : "text-gray-700"}>
                  Only Me
                </span>
              </label>
              <label className={`flex items-center gap-3 p-3 border-2 rounded-md cursor-pointer transition-colors ${visibilityPreference === "selected-users"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
                }`}>
                <input
                  type="radio"
                  name="visibility"
                  value="selected-users"
                  checked={visibilityPreference === "selected-users"}
                  onChange={(e) => setVisibilityPreference(e.target.value)}
                  className="text-blue-600"
                />
                <Users size={16} className={visibilityPreference === "selected-users" ? "text-blue-600" : "text-gray-400"} />
                <span className={visibilityPreference === "selected-users" ? "text-blue-900 font-medium" : "text-gray-700"}>
                  Only Selected Users & Roles
                </span>
              </label>
              <label className={`flex items-center gap-3 p-3 border-2 rounded-md cursor-pointer transition-colors ${visibilityPreference === "everyone"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
                }`}>
                <input
                  type="radio"
                  name="visibility"
                  value="everyone"
                  checked={visibilityPreference === "everyone"}
                  onChange={(e) => setVisibilityPreference(e.target.value)}
                  className="text-blue-600"
                />
                <FileText size={16} className={visibilityPreference === "everyone" ? "text-blue-600" : "text-gray-400"} />
                <span className={visibilityPreference === "everyone" ? "text-blue-900 font-medium" : "text-gray-700"}>
                  Everyone
                </span>
              </label>
            </div>

            {/* User/Role Selection - Only shown when "Only Selected Users & Roles" is selected */}
            {visibilityPreference === "selected-users" && (
              <div className="mt-4 space-y-4">
                {/* Step 1: Input field with Roles dropdown and Add button */}
                <div className="border border-gray-300 rounded-md p-4">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsUserRoleDropdownOpen(!isUserRoleDropdownOpen)}
                        className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
                        ref={userRoleDropdownRef}
                      >
                        <span>{userRoleType === "users" ? "Users" : "Roles"}</span>
                        <ChevronDown size={16} className={`transition-transform ${isUserRoleDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isUserRoleDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                          <div
                            className={`px-4 py-2 hover:bg-blue-50 cursor-pointer ${userRoleType === "users" ? "bg-blue-100 text-blue-900" : "text-gray-700"
                              }`}
                            onClick={() => {
                              setUserRoleType("users");
                              setIsUserRoleDropdownOpen(false);
                              setRoleSearch("");
                              setUserSearch("");
                              setTempSelectedRoles([]);
                              setTempSelectedUsers([]);
                            }}
                          >
                            Users
                          </div>
                          <div
                            className={`px-4 py-2 hover:bg-blue-50 cursor-pointer ${userRoleType === "roles" ? "bg-blue-100 text-blue-900" : "text-gray-700"
                              }`}
                            onClick={() => {
                              setUserRoleType("roles");
                              setIsUserRoleDropdownOpen(false);
                              setRoleSearch("");
                              setUserSearch("");
                              setTempSelectedRoles([]);
                              setTempSelectedUsers([]);
                            }}
                          >
                            Roles
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative flex-1" ref={searchDropdownRef}>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(userRoleType === "users" ? tempSelectedUsers : tempSelectedRoles).map((item, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {typeof item === "string" ? item : item.name}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (userRoleType === "users") {
                                  setTempSelectedUsers(tempSelectedUsers.filter((_, i) => i !== index));
                                } else {
                                  setTempSelectedRoles(tempSelectedRoles.filter((_, i) => i !== index));
                                }
                              }}
                              className="hover:text-blue-900"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={userRoleType === "users" ? userSearch : roleSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (userRoleType === "users") {
                            setUserSearch(value);
                          } else {
                            setRoleSearch(value);
                          }
                          setIsSearchDropdownOpen(true);
                        }}
                        onFocus={() => setIsSearchDropdownOpen(true)}
                        placeholder={userRoleType === "users" ? "Select Users" : "Select Roles"}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {isSearchDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                          <div className="p-3 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900">Add {userRoleType === "users" ? "Users" : "Roles"}</h4>
                          </div>
                          <div className="flex items-center gap-2 p-2 border-b border-gray-200">
                            <Search size={16} className="text-gray-400" />
                            <input
                              type="text"
                              value={userRoleType === "users" ? userSearch : roleSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (userRoleType === "users") {
                                  setUserSearch(value);
                                } else {
                                  setRoleSearch(value);
                                }
                              }}
                              placeholder="Search"
                              className="flex-1 outline-none text-sm"
                              autoFocus
                            />
                          </div>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                            {userRoleType === "users" ? "Users" : "Roles"}
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {(userRoleType === "users" ? availableUsers : availableRoles)
                              .filter(item => {
                                const search = userRoleType === "users" ? userSearch : roleSearch;
                                const tempSelected = userRoleType === "users" ? tempSelectedUsers : tempSelectedRoles;
                                const searchLower = search.toLowerCase();
                                const itemValue = typeof item === "string" ? item : item.name;
                                const isSelected = userRoleType === "users"
                                  ? tempSelected.some(u => (typeof u === "string" ? u : u.name) === itemValue)
                                  : tempSelected.includes(item);
                                return itemValue.toLowerCase().includes(searchLower) && !isSelected;
                              })
                              .map((item, index) => {
                                const itemValue = typeof item === "string" ? item : item.name;
                                return (
                                  <div
                                    key={index}
                                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700"
                                    onClick={() => {
                                      if (userRoleType === "users") {
                                        const isAlreadySelected = tempSelectedUsers.some(u =>
                                          (typeof u === "string" ? u : u.name) === itemValue
                                        );
                                        if (!isAlreadySelected) {
                                          setTempSelectedUsers([...tempSelectedUsers, item]);
                                        }
                                        setUserSearch("");
                                      } else {
                                        if (!tempSelectedRoles.includes(item)) {
                                          setTempSelectedRoles([...tempSelectedRoles, item]);
                                        }
                                        setRoleSearch("");
                                      }
                                      setIsSearchDropdownOpen(false);
                                    }}
                                  >
                                    {itemValue}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (userRoleType === "users") {
                          const newUsers = tempSelectedUsers.filter(u => {
                            const uName = typeof u === "string" ? u : u.name;
                            return !selectedUsers.some(su => (typeof su === "string" ? su : su.name) === uName);
                          });
                          setSelectedUsers([...selectedUsers, ...newUsers]);
                          setTempSelectedUsers([]);
                          setUserSearch("");
                        } else {
                          const newRoles = tempSelectedRoles.filter(r => !selectedRoles.includes(r));
                          setSelectedRoles([...selectedRoles, ...newRoles]);
                          setTempSelectedRoles([]);
                          setRoleSearch("");
                        }
                      }}
                      disabled={(userRoleType === "users" ? tempSelectedUsers : tempSelectedRoles).length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <UserPlus size={16} />
                      Add {userRoleType === "users" ? "Users" : "Roles"}
                    </button>
                  </div>
                </div>

                {/* Step 2: Access Details section with added roles/users */}
                {(selectedUsers.length > 0 || selectedRoles.length > 0) && (
                  <div className="border border-gray-300 rounded-md p-5 bg-white shadow-sm">
                    <h4 className="text-base font-semibold text-gray-900 mb-5">Access Details</h4>
                    {selectedRoles.length > 0 && (
                      <div className="mb-5">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Roles</div>
                        {selectedRoles.length === 0 ? (
                          <p className="text-sm text-gray-500">No roles selected</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedRoles.map((role, index) => (
                              <div key={index} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md">
                                <span className="text-sm text-gray-700">{role}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRoles(selectedRoles.filter((_, i) => i !== index))}
                                  className="text-gray-500 hover:text-red-600 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedRoles.length > 0 && selectedUsers.length > 0 && (
                      <div className="h-px bg-gray-200 mb-5"></div>
                    )}
                    {selectedUsers.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-3">Users</div>
                        {selectedUsers.length === 0 ? (
                          <p className="text-sm text-gray-500">No users selected</p>
                        ) : (
                          <div className="space-y-0">
                            {selectedUsers.map((user, index) => (
                              <div
                                key={index}
                                className={`flex items-center gap-3 py-3 ${index < selectedUsers.length - 1 ? "border-b border-gray-200" : ""
                                  }`}
                              >
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-base flex-shrink-0">
                                  {typeof user === "object" && user.avatar ? (
                                    <img src={user.avatar} alt={typeof user === "object" ? user.name : user} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    (typeof user === "object" ? user.name : user).charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{typeof user === "object" ? user.name : user}</div>
                                  {typeof user === "object" && user.email && (
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeUser(index)}
                                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Warning if no users selected */}
                {selectedUsers.length === 0 && selectedRoles.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <X size={16} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-600">Select at least one user or role</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!newViewName.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

