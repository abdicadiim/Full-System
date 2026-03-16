import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Trash2, HelpCircle, ChevronDown, Search, Edit2, PlusCircle, Loader2 } from "lucide-react";
import { approvalRulesAPI } from "../../services/api";
import toast from "react-hot-toast";

interface Criterion {
    id: number;
    field: string;
    comparator: string;
    value: string;
    isRelative?: boolean;
    relativeDays?: string;
    relativeType?: string;
    relativeBase?: string;
    operator?: 'AND' | 'OR';
}

interface ApproverStep {
    id: number;
    type: string;
    value: string;
}

export default function NewCustomApprovalPage() {
    const navigate = useNavigate();
    const [approvalName, setApprovalName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [criteria, setCriteria] = useState<Criterion[]>([
        { id: 1, field: "", comparator: "", value: "", operator: "AND" }
    ]);
    const [approvalMode, setApprovalMode] = useState("configure"); // "configure", "auto-approve", "auto-reject"
    const [approverSteps, setApproverSteps] = useState<ApproverStep[]>([
        { id: 1, type: "", value: "" }
    ]);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const [openStatusDropdownId, setOpenStatusDropdownId] = useState<number | null>(null);
    const [openRelativeDropdownId, setOpenRelativeDropdownId] = useState<number | null>(null);
    const [openCurrencyDropdownId, setOpenCurrencyDropdownId] = useState<number | null>(null);
    const [openUserDropdownId, setOpenUserDropdownId] = useState<number | null>(null);
    const [openApproverTypeStepId, setOpenApproverTypeStepId] = useState<number | null>(null);
    const [openApproverValueStepId, setOpenApproverValueStepId] = useState<number | null>(null);
    const [fieldSearch, setFieldSearch] = useState("");
    const [statusSearch, setStatusSearch] = useState("");
    const [relativeSearch, setRelativeSearch] = useState("");
    const [currencySearch, setCurrencySearch] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [approverTypeSearch, setApproverTypeSearch] = useState("");
    const [approverValueSearch, setApproverValueSearch] = useState("");
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const statusDropdownRef = React.useRef<HTMLDivElement>(null);
    const relativeDropdownRef = React.useRef<HTMLDivElement>(null);
    const currencyDropdownRef = React.useRef<HTMLDivElement>(null);
    const userDropdownRef = React.useRef<HTMLDivElement>(null);
    const approverTypeDropdownRef = React.useRef<HTMLDivElement>(null);
    const approverValueDropdownRef = React.useRef<HTMLDivElement>(null);

    const approverSourceOptions = [
        {
            label: "Choose an Approver manually",
            value: "manual",
            subtext: ""
        },
        {
            label: "Choose a Lookup Field",
            value: "lookup",
            subtext: "User selected from the field will be the approver."
        }
    ];

    const approverLookupOptions = [
        "Created By", "Sales person", "Modified By"
    ];

    const [criteriaPattern, setCriteriaPattern] = useState("1");
    const [isEditingPattern, setIsEditingPattern] = useState(false);
    const [tempPattern, setTempPattern] = useState("");

    const fieldOptions = [
        {
            group: "Quote",
            items: ["Quote Number", "Reference#", "Quote Status", "Quote Date", "Expiry Date", "Currency", "Total", "Created By", "Sales person"]
        },
        {
            group: "Contacts",
            items: ["Contact Name"]
        }
    ];

    const statusOptions = [
        "Draft", "Pending Approval", "Approved", "Sent", "Invoiced", "Accepted", "Declined", "Expired", "Rejected", "Partially Invoiced"
    ];

    const relativeDateOptions = [
        "Execution Date", "Tomorrow", "Yesterday",
        "Starting Date of Week", "Ending Date of Week",
        "Starting Date of Next Week", "Ending Date of Next Week",
        "Starting Date of Previous Week", "Ending Date of Previous Week",
        "Starting Date of Month", "Ending Date of Month",
        "Starting Date of Next Month", "Ending Date of Next Month",
        "Starting Date of Previous Month", "Ending Date of Previous Month",
        "Starting Date of Fiscal Year", "Ending Date of Fiscal Year"
    ];

    const currencyOptions = [
        "USD", "INR", "CAD", "GBP", "AUD", "ZAR", "EUR", "JPY", "CNY", "AED", "SAR", "BND"
    ];

    const userOptions = [
        "Modified By", "asc wcs", "Admin"
    ];

    const handleSave = async () => {
        if (!approvalName.trim()) {
            toast.error("Please enter an approval name");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: approvalName,
                description,
                module: "Quote", // Hardcoded for now as this is a Quote-specific page
                criteria,
                criteriaPattern,
                approvalMode,
                approverSteps,
                isActive: true
            };

            const response = await approvalRulesAPI.create(payload);
            if (response.success) {
                toast.success("Approval rule created successfully");
                navigate("/settings/quotes");
            } else {
                toast.error(response.message || "Failed to create approval rule");
            }
        } catch (error: any) {
            console.error("Error saving approval rule:", error);
            toast.error(error.message || "An error occurred while saving the approval rule");
        } finally {
            setSaving(false);
        }
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setOpenStatusDropdownId(null);
            }
            if (relativeDropdownRef.current && !relativeDropdownRef.current.contains(event.target as Node)) {
                setOpenRelativeDropdownId(null);
            }
            if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
                setOpenCurrencyDropdownId(null);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setOpenUserDropdownId(null);
            }
            if (approverTypeDropdownRef.current && !approverTypeDropdownRef.current.contains(event.target as Node)) {
                setOpenApproverTypeStepId(null);
            }
            if (approverValueDropdownRef.current && !approverValueDropdownRef.current.contains(event.target as Node)) {
                setOpenApproverValueStepId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredFields = fieldOptions.map(group => ({
        ...group,
        items: group.items.filter(item => item.toLowerCase().includes(fieldSearch.toLowerCase()))
    })).filter(group => group.items.length > 0);

    const getStringComparators = () => [
        "is", "isn't", "starts with", "ends with", "contains", "doesn't contain", "is empty", "is not empty"
    ];

    const getNumberComparators = () => [
        "=", "!=", "<", "<=", ">", ">=", "is empty", "is not empty"
    ];

    const getComparatorsForField = (field: string) => {
        if (!field) return [];
        if (["Quote Status", "Currency", "Created By", "Sales person"].includes(field)) {
            return ["is", "isn't", "is empty", "is not empty"];
        }
        if (["Quote Number", "Reference#", "Contact Name"].includes(field)) {
            return getStringComparators();
        }
        if (["Total"].includes(field)) {
            return getNumberComparators();
        }
        if (["Quote Date", "Expiry Date"].includes(field)) {
            return ["=", "!=", "<", "<=", ">", ">=", "is empty", "is not empty"];
        }
        return getStringComparators();
    };

    const addCriterion = () => {
        const nextId = criteria.length > 0 ? Math.max(...criteria.map(c => c.id)) + 1 : 1;
        setCriteria([...criteria, {
            id: nextId,
            field: "",
            comparator: "",
            value: "",
            isRelative: false,
            relativeDays: "",
            relativeType: "before",
            relativeBase: "Today",
            operator: "AND"
        }]);
    };

    const generatePattern = (crits: Criterion[]) => {
        if (crits.length === 0) return "";
        if (crits.length === 1) return "1";

        let pattern = "(";
        crits.forEach((c, index) => {
            if (index === 0) {
                pattern += `${index + 1}`;
            } else {
                pattern += ` ${c.operator || 'AND'} ${index + 1}`;
            }
        });
        pattern += ")";
        return pattern;
    };

    React.useEffect(() => {
        if (!isEditingPattern) {
            setCriteriaPattern(generatePattern(criteria));
        }
    }, [criteria, isEditingPattern]);

    const removeCriterion = (id: number) => {
        if (criteria.length > 1) {
            setCriteria(criteria.filter(c => c.id !== id));
        }
    };

    const addApproverStep = () => {
        const nextId = approverSteps.length > 0 ? Math.max(...approverSteps.map(s => s.id)) + 1 : 1;
        setApproverSteps([...approverSteps, { id: nextId, type: "", value: "" }]);
    };

    return (
        <div className="bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
                <h1 className="text-[18px] font-semibold text-gray-900">New Custom Approval - Quotes</h1>
                <button
                    onClick={() => navigate("/settings/quotes")}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X size={20} className="text-gray-400" />
                </button>
            </div>

            <div className="max-w-[1000px] px-8 py-8 space-y-10">
                {/* Basic Info */}
                <div className="grid grid-cols-[180px_1fr] gap-x-8 gap-y-6 items-start">
                    <label className="text-[13px] text-gray-600 font-medium pt-2">
                        Approval Name<span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={approvalName}
                        onChange={(e) => setApprovalName(e.target.value)}
                        className="w-full max-w-md h-9 px-3 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-[13px]"
                    />

                    <label className="text-[13px] text-gray-600 font-medium flex items-center gap-1 pt-2">
                        Description <HelpCircle size={14} className="text-gray-400" />
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Max. 500 characters"
                        className="w-full max-w-md h-24 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-[13px] resize-none"
                    />
                </div>

                <hr className="border-gray-100" />

                {/* Criteria Section */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Define the criteria ( if any )</h2>
                        <p className="text-[13px] text-gray-500">Trigger the Approval flow when the following conditions are satisfied.</p>
                    </div>

                    <div className="space-y-4">
                        {criteria.map((c, index) => (
                            <React.Fragment key={c.id}>
                                {index > 0 && (
                                    <div className="flex px-[52px]">
                                        <div className="relative">
                                            <select
                                                value={c.operator}
                                                onChange={(e) => setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, operator: e.target.value as 'AND' | 'OR' } : crit))}
                                                className="h-8 pl-3 pr-8 border border-blue-200 rounded bg-blue-50 text-blue-700 text-[12px] font-semibold outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer hover:bg-blue-100 transition-colors"
                                            >
                                                <option value="AND">AND</option>
                                                <option value="OR">OR</option>
                                            </select>
                                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded border border-gray-200 text-[13px] font-semibold text-gray-500 flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="relative w-48" ref={openDropdownId === c.id ? dropdownRef : null}>
                                        <div
                                            onClick={() => {
                                                setOpenDropdownId(openDropdownId === c.id ? null : c.id);
                                                setFieldSearch("");
                                            }}
                                            className="w-full h-9 px-3 border border-gray-300 rounded flex items-center justify-between cursor-pointer bg-white text-[13px] text-gray-700 hover:border-gray-400 focus:border-blue-500"
                                        >
                                            <span className={c.field ? "text-gray-900" : "text-gray-400 truncate"}>
                                                {c.field || "Select a field"}
                                            </span>
                                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${openDropdownId === c.id ? "rotate-180" : ""}`} />
                                        </div>

                                        {openDropdownId === c.id && (
                                            <div className="absolute top-full left-0 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                    <Search size={14} className="text-gray-400 ml-1" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Search"
                                                        value={fieldSearch}
                                                        onChange={(e) => setFieldSearch(e.target.value)}
                                                        className="w-full bg-transparent outline-none text-[13px] py-1"
                                                    />
                                                </div>
                                                <div className="max-height-[300px] overflow-y-auto pt-1 pb-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                    {filteredFields.map(group => (
                                                        <div key={group.group}>
                                                            <div className="px-3 py-1.5 text-[11px] font-bold text-gray-500 bg-gray-50/30 uppercase tracking-wider">
                                                                {group.group}
                                                            </div>
                                                            {group.items.map(item => (
                                                                <div
                                                                    key={item}
                                                                    onClick={() => {
                                                                        setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, field: item } : crit));
                                                                        setOpenDropdownId(null);
                                                                    }}
                                                                    className={`px-3 py-2 text-[13px] cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors ${c.field === item ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                                                                >
                                                                    {item}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                    {filteredFields.length === 0 && (
                                                        <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <select
                                        value={c.comparator}
                                        onChange={(e) => setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, comparator: e.target.value } : crit))}
                                        className="w-48 h-9 px-3 border border-gray-300 rounded focus:border-blue-500 outline-none text-[13px] bg-white text-gray-700"
                                    >
                                        <option value="">Select a comparator</option>
                                        {getComparatorsForField(c.field).map(comp => (
                                            <option key={comp} value={comp}>{comp}</option>
                                        ))}
                                    </select>

                                    {c.field === "Quote Status" && !["is empty", "is not empty"].includes(c.comparator) ? (
                                        <div className="relative flex-1 max-w-[300px]" ref={openStatusDropdownId === c.id ? statusDropdownRef : null}>
                                            <div
                                                onClick={() => {
                                                    setOpenStatusDropdownId(openStatusDropdownId === c.id ? null : c.id);
                                                    setStatusSearch("");
                                                }}
                                                className="w-full h-9 px-3 border border-gray-300 rounded flex items-center justify-between cursor-pointer bg-white text-[13px] text-gray-700 hover:border-gray-400 focus:border-blue-500"
                                            >
                                                <span className={c.value ? "text-gray-900" : "text-gray-400 truncate"}>
                                                    {c.value || "Select value"}
                                                </span>
                                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${openStatusDropdownId === c.id ? "rotate-180" : ""}`} />
                                            </div>

                                            {openStatusDropdownId === c.id && (
                                                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[101] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                        <Search size={14} className="text-gray-400 ml-1" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search"
                                                            value={statusSearch}
                                                            onChange={(e) => setStatusSearch(e.target.value)}
                                                            className="w-full bg-transparent outline-none text-[13px] py-1"
                                                        />
                                                    </div>
                                                    <div className="max-h-[250px] overflow-y-auto pt-1 pb-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                        {statusOptions.filter(opt => opt.toLowerCase().includes(statusSearch.toLowerCase())).map(opt => (
                                                            <div
                                                                key={opt}
                                                                onClick={() => {
                                                                    setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, value: opt } : crit));
                                                                    setOpenStatusDropdownId(null);
                                                                }}
                                                                className={`px-3 py-2 text-[13px] cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors ${c.value === opt ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                                                            >
                                                                {opt}
                                                            </div>
                                                        ))}
                                                        {statusOptions.filter(opt => opt.toLowerCase().includes(statusSearch.toLowerCase())).length === 0 && (
                                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : c.field === "Currency" && !["is empty", "is not empty"].includes(c.comparator) ? (
                                        <div className="relative flex-1 max-w-[300px]" ref={openCurrencyDropdownId === c.id ? currencyDropdownRef : null}>
                                            <div
                                                onClick={() => {
                                                    setOpenCurrencyDropdownId(openCurrencyDropdownId === c.id ? null : c.id);
                                                    setCurrencySearch("");
                                                }}
                                                className="w-full h-9 px-3 border border-gray-300 rounded flex items-center justify-between cursor-pointer bg-white text-[13px] text-gray-700 hover:border-gray-400 focus:border-blue-500"
                                            >
                                                <span className={c.value ? "text-gray-900" : "text-gray-400 truncate"}>
                                                    {c.value || "Select currency"}
                                                </span>
                                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${openCurrencyDropdownId === c.id ? "rotate-180" : ""}`} />
                                            </div>

                                            {openCurrencyDropdownId === c.id && (
                                                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[101] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                        <Search size={14} className="text-gray-400 ml-1" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search"
                                                            value={currencySearch}
                                                            onChange={(e) => setCurrencySearch(e.target.value)}
                                                            className="w-full bg-transparent outline-none text-[13px] py-1"
                                                        />
                                                    </div>
                                                    <div className="max-h-[250px] overflow-y-auto pt-1 pb-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                        {currencyOptions.filter((opt: string) => opt.toLowerCase().includes(currencySearch.toLowerCase())).map((opt: string) => (
                                                            <div
                                                                key={opt}
                                                                onClick={() => {
                                                                    setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, value: opt } : crit));
                                                                    setOpenCurrencyDropdownId(null);
                                                                }}
                                                                className={`px-3 py-2 text-[13px] cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors ${c.value === opt ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                                                            >
                                                                {opt}
                                                            </div>
                                                        ))}
                                                        {currencyOptions.filter((opt: string) => opt.toLowerCase().includes(currencySearch.toLowerCase())).length === 0 && (
                                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (["Created By", "Sales person"].includes(c.field)) && !["is empty", "is not empty"].includes(c.comparator) ? (
                                        <div className="relative flex-1 max-w-[300px]" ref={openUserDropdownId === c.id ? userDropdownRef : null}>
                                            <div
                                                onClick={() => {
                                                    setOpenUserDropdownId(openUserDropdownId === c.id ? null : c.id);
                                                    setUserSearch("");
                                                }}
                                                className="w-full h-9 px-3 border border-gray-300 rounded flex items-center justify-between cursor-pointer bg-white text-[13px] text-gray-700 hover:border-gray-400 focus:border-blue-500"
                                            >
                                                <span className={c.value ? "text-gray-900" : "text-gray-400 truncate"}>
                                                    {c.value || "Select user"}
                                                </span>
                                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${openUserDropdownId === c.id ? "rotate-180" : ""}`} />
                                            </div>

                                            {openUserDropdownId === c.id && (
                                                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[101] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                        <Search size={14} className="text-gray-400 ml-1" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search"
                                                            value={userSearch}
                                                            onChange={(e) => setUserSearch(e.target.value)}
                                                            className="w-full bg-transparent outline-none text-[13px] py-1"
                                                        />
                                                    </div>
                                                    <div className="max-h-[250px] overflow-y-auto pt-1 pb-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                        {userOptions.filter((opt: string) => opt.toLowerCase().includes(userSearch.toLowerCase())).map((opt: string) => (
                                                            <div
                                                                key={opt}
                                                                onClick={() => {
                                                                    setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, value: opt } : crit));
                                                                    setOpenUserDropdownId(null);
                                                                }}
                                                                className={`px-3 py-2 text-[13px] cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors ${c.value === opt ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                                                            >
                                                                {opt}
                                                            </div>
                                                        ))}
                                                        {userOptions.filter((opt: string) => opt.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-1 max-w-[450px] flex flex-col gap-1">
                                            {["Quote Date", "Expiry Date"].includes(c.field) && !["is empty", "is not empty"].includes(c.comparator) ? (
                                                <div className="flex items-center gap-2">
                                                    {c.isRelative ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center border border-gray-300 rounded overflow-hidden h-9">
                                                                <input
                                                                    type="text"
                                                                    value={c.relativeDays}
                                                                    onChange={(e) => setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, relativeDays: e.target.value } : crit))}
                                                                    className="w-16 h-full px-2 text-[13px] outline-none"
                                                                    placeholder="0"
                                                                />
                                                                <div className="bg-gray-50 border-l border-gray-300 px-2 h-full flex items-center text-[12px] text-gray-500 font-medium">
                                                                    Days
                                                                </div>
                                                            </div>
                                                            <select
                                                                value={c.relativeType}
                                                                onChange={(e) => setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, relativeType: e.target.value } : crit))}
                                                                className="h-9 px-2 border border-gray-300 rounded focus:border-blue-500 outline-none text-[13px] bg-white text-gray-700"
                                                            >
                                                                <option value="before">before</option>
                                                                <option value="after">after</option>
                                                            </select>

                                                            <div className="relative w-48" ref={openRelativeDropdownId === c.id ? relativeDropdownRef : null}>
                                                                <div
                                                                    onClick={() => {
                                                                        setOpenRelativeDropdownId(openRelativeDropdownId === c.id ? null : c.id);
                                                                        setRelativeSearch("");
                                                                    }}
                                                                    className="w-full h-9 px-3 border border-gray-300 rounded flex items-center justify-between cursor-pointer bg-white text-[13px] text-gray-700 hover:border-gray-400 focus:border-blue-500"
                                                                >
                                                                    <span className={c.relativeBase ? "text-gray-900" : "text-gray-400 truncate"}>
                                                                        {c.relativeBase || "Select base"}
                                                                    </span>
                                                                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${openRelativeDropdownId === c.id ? "rotate-180" : ""}`} />
                                                                </div>

                                                                {openRelativeDropdownId === c.id && (
                                                                    <div className="absolute top-full left-0 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[102] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                                        <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                                            <Search size={14} className="text-gray-400 ml-1" />
                                                                            <input
                                                                                autoFocus
                                                                                type="text"
                                                                                placeholder="Search"
                                                                                value={relativeSearch}
                                                                                onChange={(e) => setRelativeSearch(e.target.value)}
                                                                                className="w-full bg-transparent outline-none text-[13px] py-1"
                                                                            />
                                                                        </div>
                                                                        <div className="max-h-[250px] overflow-y-auto pt-1 pb-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                                            {relativeDateOptions.filter(opt => opt.toLowerCase().includes(relativeSearch.toLowerCase())).map(opt => (
                                                                                <div
                                                                                    key={opt}
                                                                                    onClick={() => {
                                                                                        setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, relativeBase: opt } : crit));
                                                                                        setOpenRelativeDropdownId(null);
                                                                                    }}
                                                                                    className={`px-3 py-2 text-[13px] cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors ${c.relativeBase === opt ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                                                                                >
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                            {relativeDateOptions.filter(opt => opt.toLowerCase().includes(relativeSearch.toLowerCase())).length === 0 && (
                                                                                <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="date"
                                                            value={c.value}
                                                            onChange={(e) => setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, value: e.target.value } : crit))}
                                                            className="flex-1 h-9 px-3 border border-gray-300 rounded focus:border-blue-500 outline-none text-[13px]"
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={c.value}
                                                    disabled={["is empty", "is not empty"].includes(c.comparator)}
                                                    onChange={(e) => setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, value: e.target.value } : crit))}
                                                    placeholder={["is empty", "is not empty"].includes(c.comparator) ? "" : "Enter value"}
                                                    className={`w-full h-9 px-3 border border-gray-300 rounded focus:border-blue-500 outline-none text-[13px] ${["is empty", "is not empty"].includes(c.comparator) ? "bg-gray-50 cursor-not-allowed" : ""}`}
                                                />
                                            )}
                                            {["Quote Date", "Expiry Date"].includes(c.field) && !["is empty", "is not empty"].includes(c.comparator) && (
                                                <div className="w-full flex justify-end px-1">
                                                    <button
                                                        onClick={() => setCriteria(criteria.map(crit => crit.id === c.id ? { ...crit, isRelative: !crit.isRelative } : crit))}
                                                        className="text-[11px] text-blue-600 hover:underline"
                                                    >
                                                        {c.isRelative ? "Select Custom Date" : "Select Relative Date"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1.5 pt-1.5 flex-shrink-0">
                                        <button
                                            onClick={addCriterion}
                                            className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500 transition-colors"
                                            title="Add criteria"
                                        >
                                            <Plus size={16} />
                                        </button>
                                        {criteria.length > 1 && (
                                            <button
                                                onClick={() => removeCriterion(c.id)}
                                                className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-colors"
                                                title="Remove criteria"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-6">
                        <button
                            onClick={addCriterion}
                            className="text-[13px] text-blue-600 font-medium flex items-center gap-1.5 hover:underline px-1"
                        >
                            <Plus size={14} /> Add Criterion
                        </button>

                        <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-5">
                            <div className="flex items-center gap-6 text-[13px]">
                                <span className="text-gray-400 font-semibold uppercase tracking-wider text-[11px]">CRITERIA PATTERN:</span>
                                {isEditingPattern ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={tempPattern}
                                            onChange={(e) => setTempPattern(e.target.value)}
                                            className="w-96 h-9 px-3 border border-blue-300 rounded focus:border-blue-500 shadow-sm outline-none bg-white font-mono"
                                        />
                                        <button
                                            onClick={() => {
                                                setCriteriaPattern(tempPattern);
                                                setIsEditingPattern(false);
                                            }}
                                            className="h-9 px-4 bg-blue-600 text-white rounded text-[12px] font-medium hover:bg-blue-700 shadow-sm"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsEditingPattern(false)}
                                            className="h-9 px-3 text-gray-500 hover:text-gray-700 text-[12px] font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-gray-900 bg-white px-4 py-2 border border-gray-200 rounded-md shadow-sm min-w-[120px]">
                                            {criteriaPattern}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setTempPattern(criteriaPattern);
                                                setIsEditingPattern(true);
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all group"
                                            title="Edit pattern"
                                        >
                                            <Edit2 size={14} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Approvals Section */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Approvals</h2>
                        <p className="text-[13px] text-gray-500">You can either configure approver levels or allow the system to auto approve / reject</p>
                    </div>

                    <div className="flex gap-8">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="approvalMode"
                                value="configure"
                                checked={approvalMode === "configure"}
                                onChange={(e) => setApprovalMode(e.target.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className={`text-[13px] ${approvalMode === "configure" ? "text-gray-900 font-medium" : "text-gray-600"}`}>Configure Approval Flow</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="approvalMode"
                                value="auto-approve"
                                checked={approvalMode === "auto-approve"}
                                onChange={(e) => setApprovalMode(e.target.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className={`text-[13px] ${approvalMode === "auto-approve" ? "text-gray-900 font-medium" : "text-gray-600"}`}>Auto Approve</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="approvalMode"
                                value="auto-reject"
                                checked={approvalMode === "auto-reject"}
                                onChange={(e) => setApprovalMode(e.target.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className={`text-[13px] ${approvalMode === "auto-reject" ? "text-gray-900 font-medium" : "text-gray-600"}`}>Auto Reject</span>
                        </label>
                    </div>

                    {approvalMode === "configure" && (
                        <div className="space-y-4">
                            {approverSteps.map((step, index) => (
                                <div key={step.id} className="flex items-center gap-0 group">
                                    <div className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 border-r-0 rounded-l text-[13px] font-medium text-gray-500 flex-shrink-0 group-hover:bg-gray-100 transition-colors">
                                        {index + 1}
                                    </div>

                                    {/* Source Dropdown */}
                                    <div className="relative" ref={openApproverTypeStepId === step.id ? approverTypeDropdownRef : null}>
                                        <div
                                            onClick={() => {
                                                setOpenApproverTypeStepId(openApproverTypeStepId === step.id ? null : step.id);
                                                setApproverTypeSearch("");
                                            }}
                                            className={`w-[320px] h-10 pl-4 pr-10 border border-gray-200 rounded-r focus:border-blue-500 hover:border-gray-300 outline-none text-[13px] bg-white text-gray-700 flex items-center justify-between shadow-sm transition-all cursor-pointer ${openApproverTypeStepId === step.id ? "ring-2 ring-blue-100 border-blue-400" : ""}`}
                                        >
                                            <span className={step.type ? "text-gray-900" : "text-gray-400"}>
                                                {approverSourceOptions.find(o => o.value === step.type)?.label || "Choose a Lookup Field"}
                                            </span>
                                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${openApproverTypeStepId === step.id ? "rotate-180" : ""}`} />
                                        </div>

                                        {openApproverTypeStepId === step.id && (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[101] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                    <Search size={14} className="text-gray-400 ml-1" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Search"
                                                        value={approverTypeSearch}
                                                        onChange={(e) => setApproverTypeSearch(e.target.value)}
                                                        className="w-full bg-transparent outline-none text-[13px] py-1"
                                                    />
                                                </div>
                                                <div className="max-h-[250px] overflow-y-auto pt-1 pb-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                    {approverSourceOptions.filter(o => o.label.toLowerCase().includes(approverTypeSearch.toLowerCase())).map((opt) => (
                                                        <div
                                                            key={opt.value}
                                                            onClick={() => {
                                                                setApproverSteps(approverSteps.map(s => s.id === step.id ? { ...s, type: opt.value, value: "" } : s));
                                                                setOpenApproverTypeStepId(null);
                                                            }}
                                                            className={`px-3 py-2 text-[13px] cursor-pointer hover:bg-blue-50 transition-colors flex flex-col gap-0.5 group ${step.type === opt.value ? "bg-[#2563eb] text-white" : "text-gray-700"}`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium text-[13px]">{opt.label}</span>
                                                                {step.type === opt.value && (
                                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            {opt.subtext && (
                                                                <span className={`text-[11px] ${step.type === opt.value ? "text-blue-100" : "text-gray-400"}`}>
                                                                    {opt.subtext}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Value Dropdown */}
                                    <div className="ml-10 relative" ref={openApproverValueStepId === step.id ? approverValueDropdownRef : null}>
                                        <div
                                            onClick={() => {
                                                if (!step.type) return;
                                                setOpenApproverValueStepId(openApproverValueStepId === step.id ? null : step.id);
                                                setApproverValueSearch("");
                                            }}
                                            className={`w-[320px] h-10 pl-4 pr-10 border border-gray-200 rounded focus:border-blue-500 hover:border-gray-300 outline-none text-[13px] bg-white text-gray-700 flex items-center justify-between shadow-sm transition-all cursor-pointer ${openApproverValueStepId === step.id ? "ring-2 ring-blue-100 border-blue-400" : ""} ${!step.type ? "bg-gray-50 cursor-not-allowed opacity-60" : ""}`}
                                        >
                                            <span className={step.value ? "text-gray-900" : "text-gray-400"}>
                                                {step.value || ""}
                                            </span>
                                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${openApproverValueStepId === step.id ? "rotate-180" : ""}`} />
                                        </div>

                                        {openApproverValueStepId === step.id && (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[101] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                    <Search size={14} className="text-gray-400 ml-1" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Search"
                                                        value={approverValueSearch}
                                                        onChange={(e) => setApproverValueSearch(e.target.value)}
                                                        className="w-full bg-transparent outline-none text-[13px] py-1"
                                                    />
                                                </div>
                                                <div className="max-h-[250px] overflow-y-auto pt-1 pb-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                    {(step.type === 'manual' ? userOptions : approverLookupOptions)
                                                        .filter(opt => opt.toLowerCase().includes(approverValueSearch.toLowerCase()))
                                                        .map((opt) => (
                                                            <div
                                                                key={opt}
                                                                onClick={() => {
                                                                    setApproverSteps(approverSteps.map(s => s.id === step.id ? { ...s, value: opt } : s));
                                                                    setOpenApproverValueStepId(null);
                                                                }}
                                                                className={`px-3 py-2 text-[13px] cursor-pointer hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${step.value === opt ? "bg-[#2563eb] text-white" : "text-gray-700"}`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-medium text-[13px]">{opt}</span>
                                                                    {step.value === opt && (
                                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                {step.type === 'manual' && opt === "asc wcs" && (
                                                                    <span className={`text-[11px] ${step.value === opt ? "text-blue-100" : "text-gray-400"}`}>
                                                                        [ascwcs685@gmail.com]
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {approverSteps.length > 1 && (
                                        <button
                                            onClick={() => setApproverSteps(approverSteps.filter(s => s.id !== step.id))}
                                            className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            title="Remove step"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <div className="pt-2">
                                <button
                                    onClick={addApproverStep}
                                    className="text-[13px] text-[#2563eb] font-medium flex items-center gap-2 hover:underline group"
                                >
                                    <PlusCircle size={20} className="text-[#2563eb] group-hover:scale-110 transition-transform" />
                                    <span>Add one more</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center gap-3 pt-8 border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-10 px-8 bg-blue-500 hover:bg-blue-600 text-white rounded text-[13px] font-semibold shadow-sm transition-all active:scale-95 focus:ring-2 focus:ring-blue-100 outline-none flex items-center gap-2"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        Save
                    </button>
                    <button
                        onClick={() => navigate("/settings/quotes")}
                        className="h-10 px-8 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded text-[13px] font-semibold transition-all active:scale-95 outline-none"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

