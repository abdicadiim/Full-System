import React, { useEffect, useState } from "react";
import { ChevronLeft, Edit2, Settings, ChevronDown, Save, X, Check, Search, Plus, Info, Edit, Play } from "lucide-react";

interface WorkflowExecutionConditionProps {
  workflowData: {
    workflowName: string;
    description: string;
    module: string;
  };
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  onEditDetails: () => void;
}

export default function WorkflowExecutionCondition({
  workflowData,
  initialData,
  onSave,
  onCancel,
  onEditDetails,
}: WorkflowExecutionConditionProps) {
  const [workflowType, setWorkflowType] = useState("Event Based");
  const [actionType, setActionType] = useState("Created");
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
  const [actionSearch, setActionSearch] = useState("");

  // Step navigation
  const [currentStep, setCurrentStep] = useState(1); // 1: Configure, 2: Summary

  // New States for "Edited" conditions
  const [executeWhen, setExecuteWhen] = useState("Any field is updated");
  const [recordEditType, setRecordEditType] = useState("Edited each time");

  // States for Field Multi-Select
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const [fieldSearch, setFieldSearch] = useState("");

  const actionOptions = ["Created", "Edited", "Created or Edited", "Deleted"];
  const filteredActions = actionOptions.filter(opt =>
    opt.toLowerCase().includes(actionSearch.toLowerCase())
  );

  const executeWhenOptions = [
    "Any field is updated",
    "Any selected field is updated",
    "All selected fields are updated",
    "Any selected field is not updated",
    "All selected fields are not updated"
  ];

  const moduleFields = [
    "Recurring Invoice Name",
    "Start Date",
    "End Date",
    "Next Invoice Date",
    "Total",
    "Sub Total",
    "Exchange Rate",
    "Notes",
    "Terms & Conditions",
    "Shipping Charge",
    "Discount (%)",
    "Discount Amount",
    "Sales person"
  ];

  const filteredFields = moduleFields.filter(f =>
    f.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  const showFieldSelector = executeWhen.includes("selected field");

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  // Criteria Sidebar States
  const [isCriteriaDrawerOpen, setIsCriteriaDrawerOpen] = useState(false);
  const [addCriteria, setAddCriteria] = useState("No"); // "Yes" or "No"
  const [isCriteriaFieldDropdownOpen, setIsCriteriaFieldDropdownOpen] = useState(false);
  const [criteriaSearch, setCriteriaSearch] = useState("");
  const [selectedCriteriaField, setSelectedCriteriaField] = useState("");
  const [useFormula, setUseFormula] = useState(false);



  // Formula Editor States
  const [formula, setFormula] = useState("");
  const [insertDropdown, setInsertDropdown] = useState<"functions" | "fields" | "operators" | null>(null);
  const [formulaSearch, setFormulaSearch] = useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const formulaFunctions = [
    "TRIM", "SQRT", "VALUE", "ADDMONTHS", "FLOOR", "PRODUCT", "REPLACE", "IF",
    "CONCATENATE", "LEFT", "SUBSTITUTE", "SEARCH", "FIXED", "MID", "SUM", "EXACT",
    "DATE", "AVG", "NOT", "MIN", "CEILING", "ISNUMBER", "LOWER", "DATECOMP",
    "AND", "NOW", "COUNT", "SUBDATE", "ISBLANK", "MAX", "ROUND", "CHAR", "REPT",
    "UPPER", "ABS", "T", "RIGHT", "DATEFORMAT", "OR", "SERIES", "TODAY",
    "PERCENTAGE", "CODE", "ADDDATE", "LEN", "CLEAN", "PROPER"
  ].sort();

  const formulaOperators = [
    { label: "== Equals", value: "==" },
    { label: "<= Less than or Equal", value: "<=" },
    { label: "() Paranthesis", value: "()" },
    { label: "!= Not Equals", value: "!=" },
    { label: ">= Greater than or Equal", value: ">=" },
    { label: "* Multiply", value: "*" },
    { label: "+ Add", value: "+" },
    { label: "< Less than", value: "<" },
    { label: "- Subtract", value: "-" },
    { label: "> Greater than", value: ">" },
    { label: "^ Power", value: "^" },
    { label: "/ Divide", value: "/" }
  ];

  const criteriaFields = {
    "Recurring Invoice": [
      "Recurring Invoice Name", "Start Date", "End Date", "Payment Terms",
      "Next Invoice Date", "Status", "Total", "Sub Total", "Currency",
      "Exchange Rate", "Notes", "Terms & Conditions", "Shipping Charge",
      "Discount (%)", "Discount Amount", "Adjustment", "Tax Amount",
      "Tax Percentage (%)", "Payment Gateway", "Allow Partial Payments",
      "Created By", "Modified By", "Sales person"
    ],
    "Contacts": [
      "Contact Name", "Company Name", "Customer Language", "Contact Website",
      "Contact Payment Due", "Contact Note"
    ]
  };

  const filteredCriteriaFields = Object.entries(criteriaFields).reduce((acc, [category, fields]) => {
    const query = (insertDropdown === "fields" ? formulaSearch : criteriaSearch).toLowerCase();
    const filtered = fields.filter(f => f.toLowerCase().includes(query));
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {} as Record<string, string[]>);

  const filteredFunctions = formulaFunctions.filter(f =>
    f.toLowerCase().includes(formulaSearch.toLowerCase())
  );

  const getFieldType = (fieldName: string) => {
    const lowerName = fieldName.toLowerCase();
    if (lowerName.includes("recurring invoice name") || fieldName === "Reference#") return "text";
    if (lowerName.includes("date") || lowerName.includes("time")) return "date";
    if (["status", "payment terms", "currency", "payment gateway", "customer language", "allow partial payments", "sales person"].some(k => lowerName.includes(k))) return "select";
    if (["total", "rate", "amount", "charge", "percentage"].some(k => lowerName.includes(k))) return "number";
    return "text";
  };

  const fieldOptions: Record<string, string[]> = {
    "Payment Terms": [
      "Due end of next month",
      "Due end of the month",
      "Due on Receipt",
      "Net 15",
      "Net 30",
      "Net 45",
      "Net 60"
    ]
  };

  const getConditionOptions = (fieldType: string) => {
    switch (fieldType) {
      case "date":
        return ["is", "is not", "before", "after", "between", "is empty", "is not empty"];
      case "number":
        return ["=", "!=", ">", "<", ">=", "<=", "is empty", "is not empty"];
      case "select":
        return ["is", "is not", "is empty", "is not empty"];
      default: // text
        return ["is", "isn't", "contains", "does not contain", "starts with", "ends with", "is empty", "is not empty"];
    }
  };

  const insertText = (text: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newFormula = formula.substring(0, start) + text + formula.substring(end);

    setFormula(newFormula);
    setInsertDropdown(null);
    setFormulaSearch("");

    // Reset focus and cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
      }
    }, 0);
  };

  // Date based states
  const [executionDays, setExecutionDays] = useState("0");
  const [executionRelative, setExecutionRelative] = useState("Select before or after");
  const [executionField, setExecutionField] = useState("Select a field");
  const [executionHour, setExecutionHour] = useState("Select hour");
  const [executionMinute, setExecutionMinute] = useState("Select minute");
  const [executionCycle, setExecutionCycle] = useState("Select frequency");

  // Date Input Mode State
  const [dateInputMode, setDateInputMode] = useState<"custom" | "placeholder" | "relative">("custom");
  const [inputTypeMenuOpen, setInputTypeMenuOpen] = useState(false);

  useEffect(() => {
    if (!initialData) return;

    const incomingWorkflowType = String(initialData.workflowType || "").toLowerCase();
    if (incomingWorkflowType === "date_based" || incomingWorkflowType === "date based") {
      setWorkflowType("Date Based");
    } else if (incomingWorkflowType) {
      setWorkflowType("Event Based");
    }

    if (initialData.actionType) {
      setActionType(String(initialData.actionType));
    } else if (initialData.trigger?.event) {
      const event = String(initialData.trigger.event).toLowerCase();
      if (event === "on_update") setActionType("Edited");
      else if (event === "on_create_or_update") setActionType("Created or Edited");
      else if (event === "on_delete") setActionType("Deleted");
      else setActionType("Created");
    }

    if (initialData.executeWhen) setExecuteWhen(String(initialData.executeWhen));
    if (initialData.recordEditType) setRecordEditType(String(initialData.recordEditType));
    if (Array.isArray(initialData.selectedFields)) setSelectedFields(initialData.selectedFields);

    const conditions = Array.isArray(initialData.criteria)
      ? initialData.criteria
      : Array.isArray(initialData.trigger?.conditions)
      ? initialData.trigger.conditions
      : [];

    if (conditions.length > 0) {
      setAddCriteria("Yes");
      const first = conditions[0];
      if (first?.field === "criteria_formula" && first?.value) {
        setUseFormula(true);
        setFormula(String(first.value));
      } else if (first?.field) {
        setSelectedCriteriaField(String(first.field));
      }
    }

    const dateCondition = conditions.find((entry: any) => {
      return entry?.value && typeof entry.value === "object" && (entry.value.days !== undefined || entry.value.mode);
    });

    if (dateCondition?.value) {
      const value = dateCondition.value;
      if (value.days !== undefined) setExecutionDays(String(value.days));
      if (value.hour) setExecutionHour(String(value.hour));
      if (value.minute) setExecutionMinute(String(value.minute));
      if (value.frequency) setExecutionCycle(String(value.frequency));
      if (value.mode && ["custom", "placeholder", "relative"].includes(String(value.mode))) {
        setDateInputMode(value.mode);
      }
      if (dateCondition.operator) setExecutionRelative(String(dateCondition.operator));
      if (dateCondition.field) setExecutionField(String(dateCondition.field));
    }
  }, [initialData]);

  const handleSave = () => {
    const actionTypeEventMap: Record<string, string> = {
      Created: "on_create",
      Edited: "on_update",
      "Created or Edited": "on_create_or_update",
      Deleted: "on_delete",
    };

    const trigger: any = {
      event: workflowType === "Date Based" ? "date_based" : actionTypeEventMap[actionType] || "on_create",
      conditions: [] as Array<{ field: string; operator: string; value: any }>,
    };

    if (addCriteria === "Yes") {
      if (useFormula && formula.trim()) {
        trigger.conditions.push({
          field: "criteria_formula",
          operator: "expression",
          value: formula.trim(),
        });
      } else if (selectedCriteriaField) {
        trigger.conditions.push({
          field: selectedCriteriaField,
          operator: "is",
          value: true,
        });
      }
    }

    if (workflowType === "Date Based") {
      trigger.conditions.push({
        field: executionField,
        operator: executionRelative || "on",
        value: {
          days: Number(executionDays || 0),
          hour: executionHour,
          minute: executionMinute,
          frequency: executionCycle,
          mode: dateInputMode,
        },
      });
    }

    onSave({
      workflowType,
      actionType,
      executeWhen: actionType === "Edited" || actionType === "Created or Edited" ? executeWhen : undefined,
      recordEditType: actionType === "Edited" || actionType === "Created or Edited" ? recordEditType : undefined,
      selectedFields: actionType === "Edited" || actionType === "Created or Edited" ? selectedFields : [],
      criteria: trigger.conditions,
      criteriaPattern: useFormula ? formula.trim() : "",
      trigger,
      actions: [],
    });
  };

  return (
    <>
      {currentStep === 1 ? (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Header Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition">
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{workflowData.workflowName}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>Module: <span className="font-semibold text-gray-700">{workflowData.module}</span></span>
                  {workflowData.description && (
                    <span>Description: <span className="text-gray-700">{workflowData.description}</span></span>
                  )}
                  <button
                    onClick={onEditDetails}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                  >
                    <Settings size={14} />
                    Edit Workflow Details
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Settings size={16} />
              <span className="hidden sm:inline">Get notified when workflow actions fail</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 flex-1 relative overflow-auto" style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 rounded-t-xl">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Workflow Rule Execution Condition</h3>
              </div>

              <div className="p-8 space-y-8">
                {/* Workflow Type */}
                <div className="grid grid-cols-1 md:grid-cols-4 items-center">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2 md:mb-0">
                    Workflow Type<span className="text-red-500">*</span>
                  </label>
                  <div className="col-span-3">
                    <div className="relative">
                      <select
                        value={workflowType}
                        onChange={(e) => setWorkflowType(e.target.value)}
                        className="w-full h-11 px-4 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white pr-10"
                      >
                        <option value="Event Based">Event Based</option>
                        <option value="Date Based">Date Based</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {workflowType === "Event Based" ? (
                  <div className="space-y-8">
                    {/* Action Type with Searchable Dropdown */}
                    <div className="grid grid-cols-1 md:grid-cols-4 items-center">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-2 md:mb-0">
                        Action Type<span className="text-red-500">*</span>
                      </label>
                      <div className="col-span-3">
                        <div className="relative">
                          <div
                            onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
                            className={`w-full h-11 px-4 border rounded-lg flex items-center justify-between bg-white cursor-pointer transition-all duration-200 ${isActionDropdownOpen ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                          >
                            <span className="text-gray-900">{actionType || "Select an action"}</span>
                            <ChevronDown size={18} className={`text-blue-500 transition-transform duration-200 ${isActionDropdownOpen ? 'rotate-180' : ''}`} />
                          </div>

                          {isActionDropdownOpen && (
                            <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden py-1">
                              <div className="p-2 border-b border-gray-100">
                                <div className="relative">
                                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="text"
                                    placeholder="Search"
                                    className="w-full h-10 pl-10 pr-4 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                    value={actionSearch}
                                    onChange={(e) => setActionSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="max-h-60 overflow-auto">
                                {filteredActions.length > 0 ? (
                                  filteredActions.map(opt => (
                                    <div
                                      key={opt}
                                      onClick={() => {
                                        setActionType(opt);
                                        setIsActionDropdownOpen(false);
                                        setActionSearch("");
                                      }}
                                      className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors ${actionType === opt ? 'bg-[#3c82f6] text-white font-medium' : 'text-gray-700'}`}
                                    >
                                      {opt}
                                      {actionType === opt && <Check size={16} className="text-white" />}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-sm text-gray-500 text-center italic">No actions found</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {(actionType === "Edited" || actionType === "Created or Edited") && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-4 items-start">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mt-3 mb-2 md:mb-0">
                            Execute the workflow when<span className="text-red-500">*</span>
                          </label>
                          <div className="col-span-3 flex flex-col md:flex-row items-start gap-4">
                            <div className="relative w-full md:w-1/2">
                              <div className="relative">
                                <select
                                  value={executeWhen}
                                  onChange={(e) => setExecuteWhen(e.target.value)}
                                  className="w-full h-11 px-4 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-10 text-sm"
                                >
                                  {executeWhenOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                              </div>
                            </div>

                            {showFieldSelector && (
                              <div className="relative w-full md:w-1/2">
                                <div
                                  onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
                                  className={`min-h-[44px] w-full px-2 py-1.5 border rounded-lg flex flex-wrap items-center gap-1.5 bg-white cursor-pointer transition-all duration-200 ${isFieldDropdownOpen ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                                >
                                  {selectedFields.length > 0 ? (
                                    <>
                                      {selectedFields.map(field => (
                                        <span
                                          key={field}
                                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-[#4b5563] text-xs font-medium rounded border border-gray-200"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleField(field);
                                          }}
                                        >
                                          {field}
                                          <X size={12} className="hover:text-red-500" />
                                        </span>
                                      ))}
                                    </>
                                  ) : (
                                    <span className="px-2 text-sm text-gray-500">Select {workflowData.module} fields</span>
                                  )}
                                  <ChevronDown size={18} className={`ml-auto mr-1 text-blue-500 transition-transform duration-200 ${isFieldDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isFieldDropdownOpen && (
                                  <div className="absolute z-[110] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden py-1">
                                    <div className="p-2 border-b border-gray-100">
                                      <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                          type="text"
                                          placeholder="Search"
                                          className="w-full h-10 pl-10 pr-4 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                          autoFocus
                                          value={fieldSearch}
                                          onChange={(e) => setFieldSearch(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    <div className="max-h-60 overflow-auto">
                                      {filteredFields.length > 0 ? (
                                        filteredFields.map(field => (
                                          <div
                                            key={field}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleField(field);
                                            }}
                                            className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors ${selectedFields.includes(field) ? 'bg-[#3c82f6] text-white font-medium' : 'text-gray-700'}`}
                                          >
                                            {field}
                                            {selectedFields.includes(field) && <Check size={16} className="text-white" />}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center italic">No fields found</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 items-start">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mt-1 mb-2 md:mb-0">
                            Execute when the record is<span className="text-red-500">*</span>
                          </label>
                          <div className="col-span-3 space-y-3 pt-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="radio"
                                name="recordEditType"
                                checked={recordEditType === "Edited for the first time"}
                                onChange={() => setRecordEditType("Edited for the first time")}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">Edited for the first time</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="radio"
                                name="recordEditType"
                                checked={recordEditType === "Edited each time"}
                                onChange={() => setRecordEditType("Edited each time")}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">Edited each time</span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-500 italic">
                      Note: Date based workflows will be executed only for records or transactions that are created/edited after setting up this workflow.
                    </p>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Date of Execution<span className="text-red-500">*</span>
                      </label>
                      <div className="col-span-3 flex items-center gap-3">
                        <input
                          type="number"
                          value={executionDays}
                          onChange={(e) => setExecutionDays(e.target.value)}
                          className="w-20 h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600 font-medium">Days</span>
                        <div className="relative flex-1">
                          <select
                            value={executionRelative}
                            onChange={(e) => setExecutionRelative(e.target.value)}
                            className="w-full h-11 px-4 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-10"
                          >
                            <option>Select before or after</option>
                            <option>Before</option>
                            <option>After</option>
                          </select>
                          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative flex-1">
                          <select
                            value={executionField}
                            onChange={(e) => setExecutionField(e.target.value)}
                            className="w-full h-11 px-4 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-10"
                          >
                            <option>Select a field</option>
                            <option>Due Date</option>
                            <option>Invoice Date</option>
                          </select>
                          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Execution Time<span className="text-red-500">*</span>
                      </label>
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="relative flex-1">
                          <select
                            value={executionHour}
                            onChange={(e) => setExecutionHour(e.target.value)}
                            className="w-full h-11 px-4 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-10"
                          >
                            <option>Select hour</option>
                            {Array.from({ length: 24 }).map((_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative flex-1">
                          <select
                            value={executionMinute}
                            onChange={(e) => setExecutionMinute(e.target.value)}
                            className="w-full h-11 px-4 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-10"
                          >
                            <option>Select minute</option>
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Execution Cycle<span className="text-red-500">*</span>
                      </label>
                      <div className="col-span-3">
                        <div className="relative w-full">
                          <select
                            value={executionCycle}
                            onChange={(e) => setExecutionCycle(e.target.value)}
                            className="w-full h-11 px-4 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-10"
                          >
                            <option>Select frequency</option>
                            <option>Once</option>
                            <option>Monthly</option>
                            <option>Yearly</option>
                          </select>
                          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                    onClick={() => setCurrentStep(2)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentStep(1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{workflowData.workflowName}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>Module: <span className="font-semibold text-gray-700">{workflowData.module}</span></span>
                  {workflowData.description && (
                    <span>Description: <span className="text-gray-700">{workflowData.description}</span></span>
                  )}
                  <button
                    onClick={onEditDetails}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                  >
                    <Settings size={14} />
                    Edit Workflow Details
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Settings size={16} />
              <span className="hidden sm:inline">Get notified when workflow actions fail</span>
            </div>
          </div>

          <div className="p-6 flex-1 relative overflow-auto" style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            <div className="max-w-4xl space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative group">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workflow Rule Execution Condition</h3>
                  <button onClick={() => setCurrentStep(1)} className="text-gray-400 hover:text-blue-600 transition opacity-0 group-hover:opacity-100">
                    <Edit size={14} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-2" />
                    <p className="text-sm text-gray-700 leading-relaxed">
                      This workflow rule will be executed when <span className="font-medium text-gray-900">{workflowData.module.toLowerCase()}</span> is <span className="text-gray-900">{actionType.toLowerCase()}</span>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-2" />
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Execute the workflow when <span className="font-medium text-gray-900">{executeWhen}</span>.
                      </p>
                      {selectedFields.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedFields.map(field => (
                            <span key={field} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded border border-gray-200">
                              {field}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="relative pl-5 py-2">
                <div className="absolute left-[21px] top-[-24px] bottom-0 w-px bg-gray-300" />
                <button
                  onClick={() => setIsCriteriaDrawerOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-md hover:bg-blue-100 transition border border-blue-100 relative z-10"
                >
                  <Plus size={14} />
                  New Criteria
                </button>
              </div>
            </div>
          </div>

          {isCriteriaDrawerOpen && (
            <div className="fixed inset-0 z-[200] flex justify-end">
              <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[1px]" onClick={() => setIsCriteriaDrawerOpen(false)} />
              <div className="relative w-[40%] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-800">Criterion 1</h3>
                  <button onClick={() => setIsCriteriaDrawerOpen(false)} className="p-1 border border-blue-200 text-blue-500 rounded hover:bg-blue-50 transition">
                    <X size={18} strokeWidth={3} />
                  </button>
                </div>

                <div className="p-6 flex-1 overflow-auto space-y-8">
                  <p className="text-xs text-gray-500 italic leading-relaxed">
                    Note: If you don't provide any criteria for Criterion 1, you will not be able to add any criteria for this workflow rule.
                  </p>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-800">Add criteria for this workflow rule?</h4>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="addCriteria"
                          checked={addCriteria === "Yes"}
                          onChange={() => setAddCriteria("Yes")}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="addCriteria"
                          checked={addCriteria === "No"}
                          onChange={() => setAddCriteria("No")}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">No</span>
                      </label>
                    </div>
                  </div>

                  {addCriteria === "Yes" && (
                    <div className="space-y-6 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                          Use formula
                          <div
                            className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${useFormula ? "bg-blue-500" : "bg-gray-200"}`}
                            onClick={() => setUseFormula(!useFormula)}
                          >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useFormula ? "left-6" : "left-1"}`} />
                          </div>
                        </div>
                      </div>

                      {useFormula ? (
                        <div className="space-y-4">
                          <div className="relative">
                            <textarea
                              ref={textareaRef}
                              value={formula}
                              onChange={(e) => setFormula(e.target.value)}
                              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                              placeholder="Enter the formula here or insert it using the options below"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">INSERT</span>

                              {/* Functions Dropdown */}
                              <div className="relative">
                                <button
                                  onClick={() => { setInsertDropdown(insertDropdown === "functions" ? null : "functions"); setFormulaSearch(""); }}
                                  className="h-9 px-3 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 bg-white transition-colors"
                                >
                                  <span className="italic font-serif text-blue-600 font-bold">fx</span> Functions <ChevronDown size={14} className={`transition-transform duration-200 ${insertDropdown === "functions" ? "rotate-180" : ""}`} />
                                </button>

                                {insertDropdown === "functions" && (
                                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                                      <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                          type="text"
                                          placeholder="Search functions..."
                                          className="w-full h-8 pl-9 pr-3 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500 bg-white"
                                          autoFocus
                                          value={formulaSearch}
                                          onChange={(e) => setFormulaSearch(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                      {filteredFunctions.map(func => (
                                        <button
                                          key={func}
                                          onClick={() => insertText(func + "()")}
                                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                                        >
                                          {func}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Fields Dropdown */}
                              <div className="relative">
                                <button
                                  onClick={() => { setInsertDropdown(insertDropdown === "fields" ? null : "fields"); setFormulaSearch(""); }}
                                  className="h-9 px-3 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 bg-white transition-colors"
                                >
                                  <div className="flex items-center text-blue-600 font-bold text-xs border border-blue-600 rounded px-1 h-5">[ ]</div> Fields <ChevronDown size={14} className={`transition-transform duration-200 ${insertDropdown === "fields" ? "rotate-180" : ""}`} />
                                </button>

                                {insertDropdown === "fields" && (
                                  <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                                      <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                          type="text"
                                          placeholder="Search fields..."
                                          className="w-full h-8 pl-9 pr-3 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500 bg-white"
                                          autoFocus
                                          value={formulaSearch}
                                          onChange={(e) => setFormulaSearch(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                      {Object.entries(filteredCriteriaFields).map(([category, fields]) => (
                                        <div key={category}>
                                          <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/30 sticky top-0 backdrop-blur-sm">
                                            {category}
                                          </div>
                                          <div className="p-1">
                                            {fields.map(field => (
                                              <button
                                                key={field}
                                                onClick={() => insertText("${" + field + "}")}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors truncate"
                                                title={field}
                                              >
                                                {field}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Operators Dropdown */}
                              <div className="relative">
                                <button
                                  onClick={() => { setInsertDropdown(insertDropdown === "operators" ? null : "operators"); setFormulaSearch(""); }}
                                  className="h-9 px-3 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 bg-white transition-colors"
                                >
                                  <Plus size={14} className="text-blue-600 stroke-[3px]" /> Operators <ChevronDown size={14} className={`transition-transform duration-200 ${insertDropdown === "operators" ? "rotate-180" : ""}`} />
                                </button>

                                {insertDropdown === "operators" && (
                                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden p-1">
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                      {formulaOperators.map(op => (
                                        <button
                                          key={op.value}
                                          onClick={() => insertText(" " + op.value + " ")}
                                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex justify-between items-center group"
                                        >
                                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 group-hover:border-blue-200 group-hover:bg-blue-100">{op.value}</span>
                                          <span className="text-gray-500 text-xs">{op.label.split(' ').slice(1).join(' ')}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button className="h-9 px-4 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 text-sm font-bold transition-all hover:shadow-sm">
                              Check Syntax
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-10 flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200">
                            1
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="relative">
                              <div
                                onClick={() => setIsCriteriaFieldDropdownOpen(!isCriteriaFieldDropdownOpen)}
                                className={`w-full h-10 px-4 border rounded-lg flex items-center justify-between text-sm bg-white cursor-pointer transition-all ${isCriteriaFieldDropdownOpen ? "border-blue-500 ring-4 ring-blue-50" : "border-gray-200"}`}
                              >
                                <span className={`${selectedCriteriaField ? "text-gray-900" : "text-gray-400"}`}>
                                  {selectedCriteriaField || "Select a field"}
                                </span>
                                <ChevronDown size={16} className={`text-blue-500 transition-transform ${isCriteriaFieldDropdownOpen ? "rotate-180" : ""}`} />
                              </div>

                              {isCriteriaFieldDropdownOpen && (
                                <div className="absolute z-[210] w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-2xl overflow-hidden py-1">
                                  <div className="p-2 border-b border-gray-50">
                                    <div className="relative">
                                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        className="w-full h-9 pl-9 pr-4 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                                        autoFocus
                                        value={criteriaSearch}
                                        onChange={(e) => setCriteriaSearch(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-72 overflow-auto custom-scrollbar">
                                    {Object.entries(filteredCriteriaFields).map(([category, fields]) => (
                                      <div key={category}>
                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                          {category}
                                        </div>
                                        {fields.map(field => (
                                          <div
                                            key={field}
                                            onClick={() => {
                                              setSelectedCriteriaField(field);
                                              setIsCriteriaFieldDropdownOpen(false);
                                              setCriteriaSearch("");
                                            }}
                                            className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${selectedCriteriaField === field ? "bg-[#3c82f6] text-white" : "text-gray-700"}`}
                                          >
                                            {field}
                                            {selectedCriteriaField === field && <Check size={14} />}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-4">
                              <div className="flex-1 relative">
                                <select className="w-full h-10 px-4 border border-gray-200 rounded-lg appearance-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                  {getConditionOptions(getFieldType(selectedCriteriaField)).map(option => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                              </div>

                              <div className="flex-[1.5]">
                                {getFieldType(selectedCriteriaField) === "date" ? (
                                  <div className="relative">
                                    {dateInputMode === "custom" && (
                                      <input
                                        type="text"
                                        placeholder="dd MMM yyyy"
                                        className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        onFocus={(e) => e.target.type = 'date'}
                                        onBlur={(e) => e.target.type = 'text'}
                                      />
                                    )}

                                    {dateInputMode === "placeholder" && (
                                      <div className="relative">
                                        <div className="w-full h-10 px-4 border border-blue-500 ring-4 ring-blue-50 rounded-lg flex items-center justify-between text-sm bg-white cursor-pointer"
                                          onClick={() => { /* Placeholder selection logic would go here */ }}>
                                          <span className="text-gray-400">Select a placeholder</span>
                                          <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {/* Simplified placeholder dropdown for visual fidelity */}
                                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                          <div className="p-2 border-b border-gray-50">
                                            <div className="relative">
                                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                              <input
                                                type="text"
                                                placeholder="Search"
                                                className="w-full h-8 pl-9 pr-3 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500 bg-white"
                                                autoFocus
                                              />
                                            </div>
                                          </div>
                                          <div className="max-h-40 overflow-y-auto">
                                            {["Start Date", "End Date", "Next Invoice Date"].map(d => (
                                              <div key={d} className={`px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer ${d === "Start Date" ? "bg-blue-500 text-white" : "text-gray-700"}`}>
                                                {d}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {dateInputMode === "relative" && (
                                      <div className="flex gap-2">
                                        <input type="number" className="w-16 h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="" />
                                        <select className="h-10 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                          <option>Days</option>
                                          <option>Weeks</option>
                                          <option>Months</option>
                                        </select>
                                        <select className="h-10 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                          <option>before</option>
                                          <option>after</option>
                                        </select>
                                        <div className="flex-1 relative">
                                          <select className="w-full h-10 px-2 border border-gray-200 rounded-lg appearance-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                            <option>Select a field...</option>
                                          </select>
                                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                      </div>
                                    )}

                                    <div className="absolute right-0 top-full mt-1 w-full text-right z-[100]">
                                      <div className="relative inline-block text-left">
                                        <button
                                          onClick={() => setInputTypeMenuOpen(!inputTypeMenuOpen)}
                                          className="text-xs text-blue-500 font-medium flex items-center justify-end gap-1 hover:underline ml-auto"
                                        >
                                          Change Input Type <ChevronDown size={12} className={`transition-transform ${inputTypeMenuOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        {inputTypeMenuOpen && (
                                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                            <div className="py-1">
                                              <button
                                                onClick={() => { setDateInputMode("custom"); setInputTypeMenuOpen(false); }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                              >
                                                Select Custom Date
                                              </button>
                                              <button
                                                onClick={() => { setDateInputMode("placeholder"); setInputTypeMenuOpen(false); }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                              >
                                                Select Placeholder
                                              </button>
                                              <button
                                                onClick={() => { setDateInputMode("relative"); setInputTypeMenuOpen(false); }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                              >
                                                Select Relative Date
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : getFieldType(selectedCriteriaField) === "select" ? (
                                  <div className="relative">
                                    <select className="w-full h-10 px-4 border border-gray-200 rounded-lg appearance-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                      <option value="">Select a value</option>
                                      {fieldOptions[selectedCriteriaField] ? (
                                        fieldOptions[selectedCriteriaField].map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))
                                      ) : (
                                        <>
                                          <option value="option1">Option 1</option>
                                          <option value="option2">Option 2</option>
                                        </>
                                      )}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <input
                                      type="text"
                                      placeholder="Enter a value"
                                      className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                    <div className="absolute right-0 top-full mt-1 w-full text-right">
                                      <button className="text-xs text-blue-500 font-medium flex items-center justify-end gap-1 hover:underline">
                                        Select Placeholder
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition mt-1">
                            <Plus size={18} />
                          </button>
                        </div>
                      )}

                      {!useFormula && (
                        <button className="flex items-center gap-1.5 text-blue-600 text-xs font-bold hover:underline py-2">
                          <Plus size={14} strokeWidth={3} className="p-0.5 bg-blue-600 text-white rounded-full" />
                          Add Criterion
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-100 flex items-center gap-3 bg-gray-50/30">
                  <button
                    onClick={() => setIsCriteriaDrawerOpen(false)}
                    className="px-6 h-10 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition text-sm flex items-center gap-1"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => setIsCriteriaDrawerOpen(false)}
                    className="px-6 h-10 bg-white text-gray-700 font-bold border border-gray-300 rounded-md hover:bg-gray-50 transition text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center gap-3 mt-auto relative z-10">
            <button
              onClick={handleSave}
              className="px-6 h-10 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition text-sm flex items-center gap-1"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-4 h-10 bg-white text-gray-700 font-bold border border-gray-300 rounded-md hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
