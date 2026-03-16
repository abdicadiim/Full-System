// src/features/items/NewCustomView.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Star, Search, Check, GripVertical, ChevronDown, ChevronUp, Lock, Users, Globe } from "lucide-react";

const Z = {
  primary: "#2663eb",
  line: "#e5e7eb",
  textMuted: "#6b7280",
};

export default function NewCustomView() {
  const navigate = useNavigate();
  interface User {
    name: string;
    email: string;
    initial: string;
  }

  interface Criterion {
    id: number;
    field: string;
    comparator: string;
    value: string;
  }

  interface CustomViewFormData {
    name: string;
    markAsFavorite: boolean;
    criteria: Criterion[];
    selectedColumns: string[];
    visibility: string;
    selectedType: string;
    selectedUsers: User[];
    selectedRoles: string[];
  }

  const [formData, setFormData] = useState<CustomViewFormData>({
    name: "",
    markAsFavorite: false,
    criteria: [{ id: 1, field: "", comparator: "", value: "" }],
    selectedColumns: ["Name"],
    visibility: "onlyMe",
    selectedType: "Users",
    selectedUsers: [],
    selectedRoles: [],
  });

  const [userRoleDropdownOpen, setUserRoleDropdownOpen] = useState<boolean>(false);
  const [rolesDropdownOpen, setRolesDropdownOpen] = useState<boolean>(false);
  const [usersDropdownOpen, setUsersDropdownOpen] = useState<boolean>(false);
  const [accessDetailSearch, setAccessDetailSearch] = useState("");
  const userRoleDropdownRef = useRef<HTMLDivElement>(null);
  const rolesDropdownRef = useRef<HTMLDivElement>(null);
  const usersDropdownRef = useRef<HTMLDivElement>(null);

  // Sample data for users and roles
  const sampleUsers = [
    { name: "JIRDE HUSSEIN KHALIF", email: "jirdehusseinkhalif@gmail.com", initial: "J" },
    { name: "Admin User", email: "admin@example.com", initial: "A" },
    { name: "Manager", email: "manager@example.com", initial: "M" },
    { name: "Accountant", email: "accountant@example.com", initial: "A" },
  ];
  const sampleRoles = [
    "Staff",
    "Staff (Assigned Customers Only)",
    "Admin",
    "TimesheetStaff",
    "Manager",
    "Accountant",
    "Viewer",
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userRoleDropdownRef.current && !userRoleDropdownRef.current.contains(target)) {
        setUserRoleDropdownOpen(false);
      }
      if (usersDropdownRef.current && !usersDropdownRef.current.contains(target)) {
        setUsersDropdownOpen(false);
      }
      if (rolesDropdownRef.current && !rolesDropdownRef.current.contains(target)) {
        setRolesDropdownOpen(false);
      }
    };
    if (userRoleDropdownOpen || usersDropdownOpen || rolesDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userRoleDropdownOpen, usersDropdownOpen, rolesDropdownOpen]);

  const [searchQuery, setSearchQuery] = useState("");

  // Available columns for items
  const allAvailableColumns = [
    "SKU",
    "Purchase Description",
    "Purchase Rate",
    "Description",
    "Rate",
    "Stock On Hand",
    "Usage Unit",
    "Account Name",
    "Purchase Account Name",
    "Reorder Level",
    "Type",
    "Unit",
    "Selling Price",
    "Cost Price",
    "Company Name",
    "Email",
    "Phone",
    "Payables",
    "Payables (BCY)",
    "Unused Credits",
    "Unused Credits (BCY)",
    "Source",
  ];

  const availableColumns = useMemo(() => {
    return allAvailableColumns.filter(
      (col) =>
        !formData.selectedColumns.includes(col) &&
        col.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [formData.selectedColumns, searchQuery]);

  const fieldOptions = [
    "Name",
    "Type",
    "SKU",
    "Unit",
    "Selling Price",
    "Cost Price",
    "Purchase Description",
    "Sales Description",
    "Status",
    "Category",
    "Usage Unit",
    "Account Name",
    "Purchase Account Name",
    "Stock In Hand",
    "Preferred Vendor",
    "Channel Product Name",
    "Channel Product SKU",
    "Channel Product ID",
    "Sales Channel",
    "Channel Product Type",
    "Is Composite Item",
    "Show In Store",
    "Stock Availability",
    "Brand",
    "Manufacturer",
    "Item Group ID",
  ];

  const comparatorOptions = [
    "is",
    "is not",
    "starts with",
    "contains",
    "doesn't contain",
    "is in",
    "is not in",
    "is empty",
    "is not empty",
  ];

  const [comparatorSearch, setComparatorSearch] = useState<Record<string, string>>({});
  const [comparatorDropdownOpen, setComparatorDropdownOpen] = useState<Record<string, boolean>>({});
  const comparatorDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [fieldSearch, setFieldSearch] = useState<Record<string, string>>({});
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState<Record<string, boolean>>({});
  const fieldDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getFilteredComparators = (criterionId: number) => {
    const search = comparatorSearch[criterionId.toString()] || "";
    return comparatorOptions.filter((comp) =>
      comp.toLowerCase().includes(search.toLowerCase())
    );
  };

  const getFilteredFields = (criterionId: number) => {
    const search = fieldSearch[criterionId.toString()] || "";
    return fieldOptions.filter((field) =>
      field.toLowerCase().includes(search.toLowerCase())
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      Object.keys(comparatorDropdownRefs.current).forEach((key) => {
        const ref = comparatorDropdownRefs.current[key];
        if (ref && !ref.contains(target)) {
          setComparatorDropdownOpen((prev) => ({ ...prev, [key]: false }));
        }
      });
      Object.keys(fieldDropdownRefs.current).forEach((key) => {
        const ref = fieldDropdownRefs.current[key];
        if (ref && !ref.contains(target)) {
          setFieldDropdownOpen((prev) => ({ ...prev, [key]: false }));
        }
      });
    };
    const hasOpen = Object.values(comparatorDropdownOpen).some((open) => open) ||
      Object.values(fieldDropdownOpen).some((open) => open);
    if (hasOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [comparatorDropdownOpen, fieldDropdownOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCriterionChange = (id: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addCriterion = () => {
    setFormData((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        { id: Date.now(), field: "", comparator: "", value: "" },
      ],
    }));
  };

  const removeCriterion = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== id),
    }));
  };

  const moveColumnToSelected = (column: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedColumns: [...prev.selectedColumns, column],
    }));
  };

  const moveColumnToAvailable = (column: string) => {
    // Don't allow removing "Name" column
    if (column === "Name") return;
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.filter((c) => c !== column),
    }));
  };

  const handleVisibilityChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      visibility: value,
    }));
  };

  const handleAddUser = (user: User) => {
    if (!formData.selectedUsers.find((u) => u.name === user.name)) {
      setFormData((prev) => ({
        ...prev,
        selectedUsers: [...prev.selectedUsers, user],
      }));
    }
    setUsersDropdownOpen(false);
  };

  const handleAddRole = (role: string) => {
    if (!formData.selectedRoles.includes(role)) {
      setFormData((prev) => ({
        ...prev,
        selectedRoles: [...prev.selectedRoles, role],
      }));
    }
    setRolesDropdownOpen(false);
  };

  const handleRemoveUser = (userName: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedUsers: prev.selectedUsers.filter((u) => u.name !== userName),
    }));
  };

  const handleRemoveRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedRoles: prev.selectedRoles.filter((r) => r !== role),
    }));
  };

  const filteredUsers = accessDetailSearch.trim()
    ? sampleUsers.filter((user) =>
      user.name.toLowerCase().includes(accessDetailSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(accessDetailSearch.toLowerCase())
    )
    : sampleUsers;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle save logic here
    console.log("Saving custom view:", formData);
    navigate("/products/items");
  };

  const handleClose = () => {
    navigate("/products/items");
  };

  return (
    <div className="min-h-screen bg-white" style={{ paddingTop: "56px" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            New Custom View
          </h2>
          <button
            onClick={handleClose}
            className="bg-none border-none cursor-pointer p-1 text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Name Section */}
          <div className="mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md w-full box-border"
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  name="markAsFavorite"
                  checked={formData.markAsFavorite}
                  onChange={handleChange}
                  id="favorite"
                  className="cursor-pointer"
                />
                <label
                  htmlFor="favorite"
                  className="cursor-pointer flex items-center gap-1 text-sm text-gray-700"
                >
                  <Star
                    size={16}
                    className={formData.markAsFavorite ? "text-amber-400" : "text-gray-400"}
                  />
                  Mark as Favorite
                </label>
              </div>
            </div>
          </div>

          {/* Define the criteria Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Define the criteria (if any)
            </h3>
            <div className="flex flex-col gap-3">
              {formData.criteria.map((criterion, index) => (
                <div
                  key={criterion.id}
                  className="flex gap-2 items-center"
                >
                  <span className="text-sm text-gray-500 min-w-5">
                    {index + 1}
                  </span>
                  <div className="relative flex-1" ref={(el) => { fieldDropdownRefs.current[criterion.id.toString()] = el }}>
                    <input
                      type="text"
                      value={criterion.field || ""}
                      readOnly
                      onClick={() => {
                        setFieldDropdownOpen((prev) => ({
                          ...prev,
                          [criterion.id]: !prev[criterion.id],
                        }));
                      }}
                      placeholder="Select a field"
                      className="px-2 py-1.5 text-sm border border-gray-200 rounded w-full cursor-pointer bg-white"
                    />
                    {fieldDropdownOpen[criterion.id] && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
                        {/* Search Bar */}
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search
                              size={16}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                            />
                            <input
                              type="text"
                              placeholder="Search"
                              value={fieldSearch[criterion.id] || ""}
                              onChange={(e) => {
                                setFieldSearch((prev) => ({
                                  ...prev,
                                  [criterion.id]: e.target.value,
                                }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                        </div>
                        {/* Options List */}
                        <div className="overflow-y-auto max-h-48">
                          {getFilteredFields(criterion.id).length > 0 ? (
                            getFilteredFields(criterion.id).map((field) => {
                              const isSelected = criterion.field === field;
                              return (
                                <div
                                  key={field}
                                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                    }`}
                                  onClick={() => {
                                    handleCriterionChange(criterion.id, "field", field);
                                    setFieldDropdownOpen((prev) => ({
                                      ...prev,
                                      [criterion.id]: false,
                                    }));
                                    setFieldSearch((prev) => ({
                                      ...prev,
                                      [criterion.id]: "",
                                    }));
                                  }}
                                >
                                  <span className={isSelected ? "text-blue-600 font-medium" : "text-gray-700"}>
                                    {field}
                                  </span>
                                  {isSelected && (
                                    <Check size={16} className="text-blue-600" strokeWidth={2.5} />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">No fields found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1" ref={(el) => { comparatorDropdownRefs.current[criterion.id.toString()] = el }}>
                    <input
                      type="text"
                      value={criterion.comparator || ""}
                      readOnly
                      onClick={() => {
                        if (criterion.field) {
                          setComparatorDropdownOpen((prev) => ({
                            ...prev,
                            [criterion.id]: !prev[criterion.id],
                          }));
                        }
                      }}
                      placeholder="Select a comparator"
                      className={`px-2 py-1.5 text-sm border border-gray-200 rounded w-full cursor-pointer ${!criterion.field ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                        }`}
                      disabled={!criterion.field}
                    />
                    {comparatorDropdownOpen[criterion.id] && criterion.field && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
                        {/* Search Bar */}
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search
                              size={16}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                            />
                            <input
                              type="text"
                              placeholder="Search"
                              value={comparatorSearch[criterion.id] || ""}
                              onChange={(e) => {
                                setComparatorSearch((prev) => ({
                                  ...prev,
                                  [criterion.id]: e.target.value,
                                }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                        </div>
                        {/* Options List */}
                        <div className="overflow-y-auto max-h-48">
                          {getFilteredComparators(criterion.id).length > 0 ? (
                            getFilteredComparators(criterion.id).map((comp) => {
                              const isSelected = criterion.comparator === comp;
                              return (
                                <div
                                  key={comp}
                                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                    }`}
                                  onClick={() => {
                                    handleCriterionChange(criterion.id, "comparator", comp);
                                    setComparatorDropdownOpen((prev) => ({
                                      ...prev,
                                      [criterion.id]: false,
                                    }));
                                    setComparatorSearch((prev) => ({
                                      ...prev,
                                      [criterion.id]: "",
                                    }));
                                  }}
                                >
                                  <span className={isSelected ? "text-blue-600 font-medium" : "text-gray-700"}>
                                    {comp}
                                  </span>
                                  {isSelected && (
                                    <Check size={16} className="text-blue-600" strokeWidth={2.5} />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">No comparators found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={criterion.value}
                    onChange={(e) =>
                      handleCriterionChange(criterion.id, "value", e.target.value)
                    }
                    className="px-2 py-1.5 text-sm border border-gray-200 rounded flex-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Value"
                    disabled={
                      !criterion.comparator ||
                      ["is empty", "is not empty"].includes(criterion.comparator)
                    }
                  />
                  {formData.criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(criterion.id)}
                      className="p-1.5 text-red-500 bg-none border-none cursor-pointer flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  )}
                  {index === formData.criteria.length - 1 && (
                    <button
                      type="button"
                      onClick={addCriterion}
                      className="p-1.5 text-blue-600 bg-none border-none cursor-pointer flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCriterion}
                className="p-0 text-sm text-blue-600 bg-none border-none cursor-pointer inline-flex items-center gap-1 mt-2 no-underline"
              >
                <Plus size={16} />
                Add Criterion
              </button>
            </div>
          </div>

          {/* Columns Preference Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Columns Preference
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Available Columns */}
              <div className="border border-gray-200 rounded-md p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Available Columns
                </div>
                <div className="relative mb-2">
                  <Search
                    size={16}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Q Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded w-full box-border"
                  />
                </div>
                <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                  {availableColumns.map((column) => (
                    <div
                      key={column}
                      onClick={() => moveColumnToSelected(column)}
                      className="p-2 text-sm text-gray-900 cursor-pointer rounded flex items-center gap-2 hover:bg-gray-50"
                    >
                      <GripVertical size={16} className="text-gray-500" />
                      {column}
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Columns */}
              <div className="border border-gray-200 rounded-md p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2 uppercase flex items-center gap-1.5">
                  <Check size={16} className="text-[#125562]" />
                  Selected Columns
                </div>
                <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                  {formData.selectedColumns.map((column) => (
                    <div
                      key={column}
                      onClick={() => moveColumnToAvailable(column)}
                      className={`p-2 text-sm text-gray-900 flex items-center gap-2 ${column === "Name" ? "cursor-default" : "cursor-pointer hover:bg-gray-50"
                        }`}
                    >
                      <GripVertical size={16} className="text-gray-500" />
                      {column}
                      {column === "Name" && (
                        <span className="text-gray-500">*</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Preference Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Visibility Preference
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Share With
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="onlyMe"
                      checked={formData.visibility === "onlyMe"}
                      onChange={(e) => handleVisibilityChange(e.target.value)}
                      className="cursor-pointer"
                    />
                    <Lock size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700">Only Me</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="selectedUsers"
                      checked={formData.visibility === "selectedUsers"}
                      onChange={(e) => handleVisibilityChange(e.target.value)}
                      className="cursor-pointer"
                    />
                    <Users size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700">Only Selected Users & Roles</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="everyone"
                      checked={formData.visibility === "everyone"}
                      onChange={(e) => handleVisibilityChange(e.target.value)}
                      className="cursor-pointer"
                    />
                    <Globe size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700">Everyone</span>
                  </label>
                </div>
              </div>

              {/* Show user/role selection only when "Only Selected Users & Roles" is selected */}
              {formData.visibility === "selectedUsers" && (
                <div className="mt-4 space-y-4">
                  {/* Combined Users/Roles Selection - Single Horizontal Box */}
                  <div>
                    <div className="flex gap-2 items-center">
                      {/* Type Dropdown (Users/Roles) */}
                      <div className="relative" ref={userRoleDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setUserRoleDropdownOpen(!userRoleDropdownOpen)}
                          className="px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-l-md bg-white flex items-center gap-1 hover:bg-gray-50"
                        >
                          {formData.selectedType || "Users"}
                          <ChevronDown size={16} className="text-gray-500" />
                        </button>
                        {userRoleDropdownOpen && (
                          <div className="absolute z-50 left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[120px]">
                            <div
                              className={`px-3 py-2 text-sm cursor-pointer ${(!formData.selectedType || formData.selectedType === "Users") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50 text-gray-700"
                                }`}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, selectedType: "Users" }));
                                setUserRoleDropdownOpen(false);
                              }}
                            >
                              Users
                            </div>
                            <div
                              className={`px-3 py-2 text-sm cursor-pointer ${formData.selectedType === "Roles" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50 text-gray-700"
                                }`}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, selectedType: "Roles" }));
                                setUserRoleDropdownOpen(false);
                              }}
                            >
                              Roles
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input Field */}
                      <div className="relative flex-1" ref={formData.selectedType === "Roles" ? rolesDropdownRef : usersDropdownRef}>
                        <input
                          type="text"
                          placeholder={formData.selectedType === "Roles" ? "Add Roles" : "Select Users"}
                          readOnly
                          onClick={() => {
                            if (formData.selectedType === "Roles") {
                              setRolesDropdownOpen(!rolesDropdownOpen);
                            } else {
                              setUsersDropdownOpen(!usersDropdownOpen);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border-y border-gray-200 bg-white cursor-pointer outline-none"
                        />
                        {/* Arrow icons */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                          <ChevronUp size={12} className="text-gray-400" />
                          <ChevronDown size={12} className="text-gray-400 -mt-1" />
                        </div>

                        {/* Users Dropdown */}
                        {usersDropdownOpen && formData.selectedType !== "Roles" && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredUsers.map((user) => {
                              const isSelected = formData.selectedUsers.find((u) => u.name === user.name);
                              return (
                                <div
                                  key={user.name}
                                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                    }`}
                                  onClick={() => {
                                    if (!isSelected) {
                                      handleAddUser(user);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-semibold">
                                      {user.initial}
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">{user.name}</div>
                                      <div className="text-xs text-gray-500">{user.email}</div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check size={16} className="text-blue-600" strokeWidth={2.5} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Roles Dropdown */}
                        {rolesDropdownOpen && formData.selectedType === "Roles" && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {sampleRoles.map((role) => {
                              const isSelected = formData.selectedRoles.includes(role);
                              return (
                                <div
                                  key={role}
                                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                    }`}
                                  onClick={() => {
                                    if (!isSelected) {
                                      handleAddRole(role);
                                    }
                                  }}
                                >
                                  <span className={isSelected ? "text-blue-600 font-medium" : "text-gray-700"}>
                                    {role}
                                  </span>
                                  {isSelected && (
                                    <Check size={16} className="text-blue-600" strokeWidth={2.5} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.selectedType === "Roles") {
                            setRolesDropdownOpen(!rolesDropdownOpen);
                          } else {
                            setUsersDropdownOpen(!usersDropdownOpen);
                          }
                        }}
                        className="px-3 py-2 text-sm text-white border rounded-r-md flex items-center gap-1.5"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)", borderColor: "#0D4A52" }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.opacity = "0.9"}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.opacity = "1"}
                      >
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                          <Plus size={14} />
                        </div>
                        {formData.selectedType === "Roles" ? "Add Roles" : "Add Users"}
                      </button>
                    </div>
                  </div>

                  {/* Access Detail Section */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Access Detail
                    </label>
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                      <input
                        type="text"
                        placeholder="Q Search"
                        value={accessDetailSearch}
                        onChange={(e) => setAccessDetailSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Selected Roles */}
                  {formData.selectedRoles.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Roles
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {formData.selectedRoles.map((role) => (
                          <div
                            key={role}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md"
                          >
                            <Users size={14} className="text-gray-500" />
                            <span className="text-sm text-gray-700">{role}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRole(role)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Users */}
                  {formData.selectedUsers.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Users
                      </label>
                      <div className="space-y-2">
                        {formData.selectedUsers.map((user) => (
                          <div
                            key={user.name}
                            className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-md"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-semibold">
                                {user.initial}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(user.name)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message when no users/roles selected */}
                  {formData.selectedUsers.length === 0 && formData.selectedRoles.length === 0 && (
                    <div className="p-3 bg-gray-100 rounded-md text-sm text-gray-600">
                      You haven't shared this Custom View with any users yet. Select the users or roles to share it with and provide their access permissions.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-5 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = "#f9fafb";
                (e.target as HTMLElement).style.borderColor = "#d1d5db";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = "white";
                (e.target as HTMLElement).style.borderColor = "#e5e7eb";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.opacity = "0.9"}
              onMouseLeave={(e) => (e.target as HTMLElement).style.opacity = "1"}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


