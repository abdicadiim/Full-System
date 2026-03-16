import React, { useState, useMemo } from "react";
import { saveExpenseCustomView } from "../shared/purchasesModel";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Search,
    Check,
    GripVertical,
    Trash2,
    Lock,
    Users,
    Globe,
    RotateCcw,
    ChevronDown,
    UserCircle2,
    PlusCircle,
    ChevronUp,
    X
} from "lucide-react";

/**
 * Z - Design tokens for Expenses New Custom View
 */
const Z = {
    primary: "#156372", // Teal (Save button)
    danger: "#156372",  // Red (Required asterisk, trash)
    line: "#e5e7eb",
    textHeader: "#111827",
    textMuted: "#6b7280",
    bgLight: "#f9fafb",
    bgMain: "#f3f4f6",
};

const MOCK_USERS = [
    { id: 1, name: "Jirde Hussein Khalif", email: "jirde@taban.com", role: "Admin" },
    { id: 2, name: "Ibrahim Ahmed", email: "ibrahim@taban.com", role: "Editor" },
    { id: 3, name: "Sarah Smith", email: "sarah@taban.com", role: "Viewer" },
    { id: 4, name: "Tech Support", email: "support@taban.com", role: "Support" },
];

const MOCK_ROLES = [
    { id: "admin", name: "Admin" },
    { id: "staff", name: "Staff" },
    { id: "timesheet", name: "TimesheetStaff" },
    { id: "assigned", name: "Staff (Assigned Customers Only)" },
];

function UserRoleSelector() {
    const [selectorMode, setSelectorMode] = useState("Users"); // "Users" | "Roles"
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const inputRef = React.useRef(null);

    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
    const selectMode = (mode) => {
        setSelectorMode(mode);
        setIsDropdownOpen(false);
        setInputValue("");
    };

    const handleSelect = (item) => {
        if (!selectedItems.find(i => i.id === item.id)) {
            setSelectedItems([...selectedItems, { ...item, type: selectorMode }]);
        }
        setInputValue("");
        setIsInputFocused(false);
    };

    const handleRemove = (id) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const handleAddClick = () => {
        setIsInputFocused(true);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const filteredItems = (selectorMode === "Users" ? MOCK_USERS : MOCK_ROLES)
        .filter(item =>
            !selectedItems.find(i => i.id === item.id) &&
            item.name.toLowerCase().includes(inputValue.toLowerCase())
        );

    const highlightBorder = (focused) => focused ? `1px solid ${Z.primary}` : `1px solid ${Z.line}`;

    return (
        <div style={{
            marginTop: "24px", padding: "32px", border: `1px solid ${Z.line}`,
            borderRadius: "8px", backgroundColor: "#ffffff"
        }}>
            <div style={{ position: "relative", display: "flex", gap: "0", borderRadius: "6px", border: highlightBorder(isInputFocused), overflow: "visible", maxWidth: "800px", flexWrap: "wrap", alignItems: "stretch" }}>

                {/* Dropdown Trigger */}
                <div
                    onClick={toggleDropdown}
                    style={{
                        padding: "10px 16px", backgroundColor: "#ffffff", borderRight: `1px solid ${Z.line}`,
                        display: "flex", alignItems: "center", gap: "8px", minWidth: "120px", cursor: "pointer",
                        position: "relative", height: "auto"
                    }}
                >
                    <span style={{ fontSize: "14px", color: "#374151" }}>{selectorMode}</span>
                    <ChevronDown size={14} color="#6b7280" />

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div style={{
                            position: "absolute", top: "100%", left: 0, marginTop: "4px", width: "200px",
                            backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "6px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", zIndex: 20
                        }}>
                            {["Users", "Roles"].map(mode => (
                                <div
                                    key={mode}
                                    onClick={(e) => { e.stopPropagation(); selectMode(mode); }}
                                    style={{
                                        padding: "8px 12px", fontSize: "14px", cursor: "pointer",
                                        backgroundColor: selectorMode === mode ? Z.primary : "transparent",
                                        color: selectorMode === mode ? "#ffffff" : "#374151"
                                    }}
                                    onMouseEnter={(e) => { if (selectorMode !== mode) e.currentTarget.style.backgroundColor = Z.bgLight; }}
                                    onMouseLeave={(e) => { if (selectorMode !== mode) e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                    {mode}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input Area + Chips */}
                <div style={{ flex: 1, position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", padding: "4px", gap: "4px" }}>
                    {selectedItems.map(item => (
                        <div key={item.id} style={{
                            display: "flex", alignItems: "center", gap: "6px", padding: "2px 8px",
                            backgroundColor: "#e0f2fe", borderRadius: "12px", fontSize: "12px", color: "#0369a1", border: "1px solid #7dd3fc"
                        }}>
                            {item.name}
                            <X size={12} style={{ cursor: "pointer" }} onClick={() => handleRemove(item.id)} />
                        </div>
                    ))}

                    <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                        placeholder={selectedItems.length === 0 ? (selectorMode === "Users" ? "Select Users" : "Add Roles") : ""}
                        style={{
                            flex: 1, minWidth: "100px", border: "none", padding: "6px 12px",
                            fontSize: "14px", outline: "none", height: "30px"
                        }}
                    />

                    {/* Search Results Dropdown */}
                    {isInputFocused && (
                        <div style={{
                            position: "absolute", top: "100%", left: 0, right: 0, marginTop: "8px",
                            backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "6px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", zIndex: 20, maxHeight: "250px", overflowY: "auto"
                        }}>
                            <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: "4px" }}>
                                    <Search size={14} color="#9ca3af" />
                                    <input readOnly value={inputValue} placeholder="Search" style={{ border: "none", outline: "none", fontSize: "13px", width: "100%" }} />
                                </div>
                            </div>
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    style={{
                                        padding: "8px 12px", cursor: "pointer", margin: "4px", borderRadius: "4px",
                                        display: "flex", flexDirection: "column"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = Z.primary;
                                        e.currentTarget.style.color = "#ffffff";
                                        const emailDiv = e.currentTarget.querySelector('.email-sub');
                                        if (emailDiv) emailDiv.style.opacity = "0.9";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.color = "#374151";
                                        const emailDiv = e.currentTarget.querySelector('.email-sub');
                                        if (emailDiv) emailDiv.style.opacity = "1";
                                    }}
                                >
                                    <div style={{ fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>{item.name}</div>
                                    {item.email && <div className="email-sub" style={{ fontSize: "12px", color: "inherit", opacity: 1 }}>{item.email}</div>}
                                </div>
                            ))}
                            {filteredItems.length === 0 && <div style={{ padding: "12px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>No results found</div>}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <button
                    type="button"
                    onClick={handleAddClick}
                    style={{
                        padding: "10px 20px", backgroundColor: "#f3f4f6", borderLeft: `1px solid ${Z.line}`,
                        display: "flex", alignItems: "center", gap: "8px", fontWeight: "500", fontSize: "14px",
                        cursor: "pointer", border: "none", color: Z.primary, alignSelf: "stretch"
                    }}
                >
                    <PlusCircle size={16} color={Z.primary} /> Add {selectorMode}
                </button>
            </div>

            <div style={{ marginTop: "40px", textAlign: "center" }}>
                <p style={{ fontSize: "14px", color: Z.textMuted, maxWidth: "500px", margin: "0 auto", lineHeight: "1.5" }}>
                    You haven't shared this Custom View with any {selectedItems.length > 0 ? "users/roles" : selectorMode.toLowerCase()} yet. Select the {selectorMode.toLowerCase()} to share it with and provide their access permissions.
                </p>
            </div>
        </div>
    );
}

export default function NewExpenseCustomView() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        markAsFavorite: false,
        criteria: [{ id: 1, field: "", comparator: "", value: "" }],
        selectedColumns: ["Date", "Expense Account", "Vendor Name", "Amount"],
        visibility: "Only Me",
    });

    const [searchQuery, setSearchQuery] = useState("");

    const allAvailableColumns = [
        "Reference#",
        "Paid Through",
        "Report Name",
        "Report Number",
        "Customer Name",
        "Status",
        "Submitter",
        "Currency",
        "Notes",
        "Created Time",
        "Last Modified Time"
    ];

    const requiredColumns = ["Date", "Expense Account", "Vendor Name", "Amount"];

    const availableColumns = useMemo(() => {
        return allAvailableColumns.filter(
            (col) =>
                !formData.selectedColumns.includes(col) &&
                col.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [formData.selectedColumns, searchQuery]);

    const fieldOptions = [
        "Date",
        "Expense Account",
        "Vendor Name",
        "Amount",
        "Reference#",
        "Status",
        "Customer Name",
        "Paid Through"
    ];

    const comparatorOptions = [
        "is", "is not", "starts with", "contains", "doesn't contain",
        "is in", "is not in", "is empty", "is not empty"
    ];

    const handleCriterionChange = (id, field, value) => {
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

    const removeCriterion = (id) => {
        setFormData((prev) => ({
            ...prev,
            criteria: prev.criteria.filter((c) => c.id !== id),
        }));
    };

    const moveColumnToSelected = (column) => {
        setFormData((prev) => ({
            ...prev,
            selectedColumns: [...prev.selectedColumns, column],
        }));
    };

    const moveColumnToAvailable = (column) => {
        if (requiredColumns.includes(column)) return;
        setFormData((prev) => ({
            ...prev,
            selectedColumns: prev.selectedColumns.filter((c) => c !== column),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Saving expense custom view:", formData);

        const success = saveExpenseCustomView(formData);
        if (success) {
            navigate("/expenses");
        } else {
            alert("Failed to save custom view.");
        }
    };

    const handleClose = () => {
        navigate("/expenses");
    };

    return (
        <div style={{ backgroundColor: Z.bgMain, minHeight: "100vh", padding: "20px" }}>
            {/* Search Header Bar */}
            <div style={{
                display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px",
                backgroundColor: "#ffffff", padding: "8px 16px", borderRadius: "4px", border: "1px solid #e5e7eb"
            }}>
                <RotateCcw size={16} color={Z.textMuted} />
                <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
                    <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: Z.textMuted }} />
                    <input
                        type="text"
                        placeholder="Search in Customers ( / )"
                        style={{
                            width: "100%", padding: "6px 8px 6px 30px", fontSize: "13px",
                            border: "1px solid #d1d5db", borderRadius: "4px", backgroundColor: "#f9fafb"
                        }}
                    />
                </div>
            </div>

            <div style={{
                backgroundColor: "#ffffff", borderRadius: "8px", width: "100%", maxWidth: "1000px",
                margin: "0 auto", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden"
            }}>
                {/* Header */}
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${Z.line}` }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "600", color: Z.textHeader, margin: 0 }}>
                        New Custom View
                    </h2>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
                    {/* Section: Name */}
                    <div style={{ marginBottom: "32px", maxWidth: "600px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "8px" }}>
                            Name <span style={{ color: Z.danger }}>*</span>
                        </label>
                        <input
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            style={{
                                padding: "8px 12px", fontSize: "14px", border: `1px solid ${Z.line}`,
                                borderRadius: "6px", width: "100%", boxSizing: "border-box"
                            }}
                        />
                    </div>

                    {/* Section: Criteria */}
                    <div style={{ marginBottom: "40px" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: "600", color: Z.textHeader, marginBottom: "16px" }}>
                            Define the criteria (if any)
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {formData.criteria.map((c, idx) => (
                                <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <div style={{
                                        fontSize: "13px", fontWeight: "500", color: "#374151", minWidth: "32px", height: "32px",
                                        display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: Z.bgLight,
                                        border: `1px solid ${Z.line}`, borderRadius: "4px"
                                    }}>
                                        {idx + 1}
                                    </div>
                                    <select
                                        value={c.field}
                                        onChange={(e) => handleCriterionChange(c.id, "field", e.target.value)}
                                        style={{ padding: "6px 12px", fontSize: "14px", border: `1px solid ${Z.line}`, borderRadius: "4px", flex: 1.5 }}
                                    >
                                        <option value="">Select a field</option>
                                        {fieldOptions.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                    <select
                                        value={c.comparator}
                                        onChange={(e) => handleCriterionChange(c.id, "comparator", e.target.value)}
                                        style={{ padding: "6px 12px", fontSize: "14px", border: `1px solid ${Z.line}`, borderRadius: "4px", flex: 1.5 }}
                                    >
                                        <option value="">Select a comparator</option>
                                        {comparatorOptions.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                    <input
                                        placeholder="Value"
                                        value={c.value}
                                        onChange={(e) => handleCriterionChange(c.id, "value", e.target.value)}
                                        style={{ padding: "6px 12px", fontSize: "14px", border: `1px solid ${Z.line}`, borderRadius: "4px", flex: 2 }}
                                    />
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <Plus size={18} color={Z.primary} style={{ cursor: "pointer" }} onClick={addCriterion} />
                                        <Trash2 size={18} color={Z.textMuted} style={{ cursor: "pointer" }} onClick={() => removeCriterion(c.id)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section: Columns Preference (Dual Pane) */}
                    <div style={{ marginBottom: "40px" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: "600", color: Z.textHeader, marginBottom: "16px" }}>
                            Columns Preference:
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                            {/* Available Columns */}
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: Z.textMuted, marginBottom: "12px", textTransform: "uppercase" }}>
                                    AVAILABLE COLUMNS
                                </div>
                                <div style={{ border: `1px solid ${Z.line}`, borderRadius: "8px", height: "400px", display: "flex", flexDirection: "column" }}>
                                    <div style={{ padding: "12px", position: "relative", borderBottom: `1px solid ${Z.line}` }}>
                                        <Search size={14} style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", color: Z.textMuted }} />
                                        <input
                                            placeholder="Search"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ width: "100%", padding: "6px 12px 6px 30px", fontSize: "13px", border: "none", outline: "none" }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, overflowY: "auto", padding: "4px" }}>
                                        {availableColumns.map(col => (
                                            <div
                                                key={col}
                                                onClick={() => moveColumnToSelected(col)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", fontSize: "14px",
                                                    cursor: "pointer", borderRadius: "4px"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = Z.bgLight}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                            >
                                                <GripVertical size={16} color={Z.textMuted} />
                                                {col}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Selected Columns */}
                            <div>
                                <div style={{
                                    fontSize: "12px", fontWeight: "600", color: "#10b981", marginBottom: "12px",
                                    textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px"
                                }}>
                                    <Check size={16} /> SELECTED COLUMNS
                                </div>
                                <div style={{ border: `1px solid ${Z.line}`, borderRadius: "8px", height: "400px", overflowY: "auto", padding: "8px" }}>
                                    {formData.selectedColumns.map(col => (
                                        <div
                                            key={col}
                                            onClick={() => moveColumnToAvailable(col)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", fontSize: "14px",
                                                cursor: requiredColumns.includes(col) ? "default" : "pointer"
                                            }}
                                        >
                                            <GripVertical size={16} color={Z.textMuted} />
                                            {col}
                                            {requiredColumns.includes(col) && <span style={{ color: Z.danger }}>*</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Visibility Preference (Cards) */}
                    <div style={{ marginBottom: "40px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: Z.textHeader, marginBottom: "20px" }}>
                            Visibility Preference
                        </h3>
                        <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                            {[
                                { id: "Only Me", label: "Only Me", icon: <Lock size={16} /> },
                                { id: "Only Selected Users & Roles", label: "Only Selected Users & Roles", icon: <Users size={16} /> },
                                { id: "Everyone", label: "Everyone", icon: <Globe size={16} /> }
                            ].map((opt) => {
                                const isSelected = formData.visibility === opt.id;
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => setFormData(p => ({ ...p, visibility: opt.id }))}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
                                            border: isSelected ? `1px solid ${Z.primary}` : `1px solid ${Z.line}`,
                                            borderRadius: "6px", cursor: "pointer", backgroundColor: isSelected ? "#15637210" : "#ffffff",
                                            minWidth: "150px"
                                        }}
                                    >
                                        <div style={{
                                            width: "16px", height: "16px", borderRadius: "50%", border: isSelected ? `5px solid ${Z.primary}` : `1px solid #d1d5db`,
                                            display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box"
                                        }} />
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: isSelected ? Z.primary : "#374151" }}>
                                            {opt.label}
                                            <span style={{ color: "#9ca3af" }}>{opt.icon}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* User/Role Selector Component */}
                        {formData.visibility === "Only Selected Users & Roles" && <UserRoleSelector />}
                    </div>

                    <div style={{ borderTop: `1px solid ${Z.line}`, paddingTop: "24px", marginTop: "20px", display: "flex", gap: "12px" }}>
                        <button
                            onClick={handleClose}
                            type="button"
                            style={{
                                padding: "8px 24px", fontSize: "14px", fontWeight: "500", color: "#374151",
                                backgroundColor: "#ffffff", border: `1px solid ${Z.line}`, borderRadius: "4px", cursor: "pointer"
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: "8px 32px", fontSize: "14px", fontWeight: "500", color: "#ffffff",
                                backgroundColor: Z.primary, border: "none", borderRadius: "4px", cursor: "pointer"
                            }}
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
