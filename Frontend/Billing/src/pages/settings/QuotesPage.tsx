import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ChevronDown, Plus, GripVertical, X, Edit2, Loader2, Info, MinusCircle, MoreVertical, Settings } from "lucide-react";
import { settingsAPI, approvalRulesAPI, authAPI } from "../../services/api";
import toast from "react-hot-toast";

export default function QuotesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General tab states
  const [allowEditingAccepted, setAllowEditingAccepted] = useState(false);
  const [allowCustomerAcceptDecline, setAllowCustomerAcceptDecline] = useState(false);
  const [automationOption, setAutomationOption] = useState("dont-convert");
  const [allowProgressInvoice, setAllowProgressInvoice] = useState(false);
  const [hideZeroValueItems, setHideZeroValueItems] = useState(false);
  const [retainCustomerNotes, setRetainCustomerNotes] = useState(false);
  const [retainTermsConditions, setRetainTermsConditions] = useState(false);
  const [retainAddress, setRetainAddress] = useState(false);
  const [termsConditions, setTermsConditions] = useState("");
  const [customerNotes, setCustomerNotes] = useState("Looking forward for your business.");

  // Approvals tab states
  const [approvalType, setApprovalType] = useState("no-approval");
  const [notificationPreference, setNotificationPreference] = useState("all-submitters"); // radio option
  const [notificationEmail, setNotificationEmail] = useState("");
  const [sendNotifications, setSendNotifications] = useState(true);
  const [notifySubmitter, setNotifySubmitter] = useState(true);
  const [approvalLevels, setApprovalLevels] = useState([
    { id: 1, level: 1, approver: "asc wcs", email: "ascwcs685@gmail.com" },
    { id: 2, level: 2, approver: "", email: "" }
  ]);
  const [approvalRules, setApprovalRules] = useState<any[]>([]);
  const [activeApproverLevel, setActiveApproverLevel] = useState<number | null>(null);
  const [approverSearch, setApproverSearch] = useState("");
  const approverDropdownRef = useRef<HTMLDivElement>(null);

  const mockUsers = [
    { name: "asc wcs", email: "ascwcs685@gmail.com" },
    { name: "Admin", email: "admin@example.com" },
    { name: "John Doe", email: "john@example.com" },
  ];

  // Field Customization tab states
  const [customFields, setCustomFields] = useState([
    { name: "Sales person", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
    { name: "Description", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true }
  ]);
  const [draggedLevelId, setDraggedLevelId] = useState<number | null>(null);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 59;

  // Custom Buttons tab states
  const [customButtons, setCustomButtons] = useState([]);
  const [locationFilter, setLocationFilter] = useState("All");
  const [showNewButtonDropdown, setShowNewButtonDropdown] = useState(false);
  const newButtonDropdownRef = useRef(null);

  // Related Lists tab states
  const [relatedLists, setRelatedLists] = useState([]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newButtonDropdownRef.current && (newButtonDropdownRef.current as any).contains(event.target)) {
        setShowNewButtonDropdown(false);
      }
      if (approverDropdownRef.current && !approverDropdownRef.current.contains(event.target as Node)) {
        setActiveApproverLevel(null);
      }
    };
    if (showNewButtonDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewButtonDropdown]);

  const addApprovalLevel = () => {
    const nextId = approvalLevels.length > 0 ? Math.max(...approvalLevels.map(al => al.id)) + 1 : 1;
    setApprovalLevels([...approvalLevels, { id: nextId, level: approvalLevels.length + 1, approver: "" }]);
  };

  const removeApprovalLevel = (id: number) => {
    if (approvalLevels.length > 1) {
      const updatedLevels = approvalLevels.filter(al => al.id !== id).map((al, index) => ({
        ...al,
        level: index + 1
      }));
      setApprovalLevels(updatedLevels);
    }
  };

  // Load settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsAPI.getQuotesSettings();
        if (response.success && response.data) {
          const s = response.data;
          setAllowEditingAccepted(s.allowEditingAcceptedQuotes ?? false);
          setAllowCustomerAcceptDecline(s.allowCustomerAcceptDecline ?? false);
          setAutomationOption(s.automationOption ?? "dont-convert");
          setAllowProgressInvoice(s.allowProgressInvoice ?? false);
          setApprovalType(s.approvalType ?? "no-approval");
          setHideZeroValueItems(s.hideZeroValueItems ?? false);
          if (s.retainFields) {
            setRetainCustomerNotes(s.retainFields.customerNotes ?? false);
            setRetainTermsConditions(s.retainFields.termsConditions ?? false);
            setRetainAddress(s.retainFields.address ?? false);
          }
          setTermsConditions(s.termsConditions ?? "");
          setCustomerNotes(s.customerNotes ?? "Looking forward for your business.");

          setNotificationPreference(s.notificationPreference ?? "all-submitters");
          setNotificationEmail(s.notificationEmail ?? "");
          setSendNotifications(s.sendNotifications ?? true);
          setNotifySubmitter(s.notifySubmitter ?? true);

          // If no approval levels are saved in settings, try to fetch owner for level 1
          if (!s.approvalLevels || s.approvalLevels.length === 0) {
            try {
              const ownerResponse = await settingsAPI.getOwnerEmail();
              if (ownerResponse.success && ownerResponse.data) {
                setApprovalLevels([
                  { id: 1, level: 1, approver: ownerResponse.data.name, email: ownerResponse.data.email },
                  { id: 2, level: 2, approver: "", email: "" }
                ]);
              }
            } catch (err) {
              console.error("Error fetching owner email:", err);
            }
          } else {
            setApprovalLevels(s.approvalLevels);
          }
        }

        // Fetch custom approval rules
        const rulesResponse = await approvalRulesAPI.getAll();
        if (rulesResponse.success) {
          setApprovalRules(rulesResponse.data || []);
        }

        // Fetch current user details for the approvers list
        try {
          const meResponse = await authAPI.getMe();
          if (meResponse.success && meResponse.data) {
            // Can be used to highlight the current user or add to a list
            console.log("Logged in user:", meResponse.data.user.email);
          }
        } catch (err) {
          console.error("Error fetching current user:", err);
        }
      } catch (error) {
        console.error("Error fetching quote settings:", error);
        toast.error("Failed to load quote settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const payload = {
        allowEditingAcceptedQuotes: allowEditingAccepted,
        allowCustomerAcceptDecline: allowCustomerAcceptDecline,
        automationOption: automationOption,
        allowProgressInvoice: allowProgressInvoice,
        hideZeroValueItems: hideZeroValueItems,
        retainFields: {
          customerNotes: retainCustomerNotes,
          termsConditions: retainTermsConditions,
          address: retainAddress,
        },
        termsConditions: termsConditions,
        customerNotes: customerNotes,
      };
      const response = await settingsAPI.updateQuotesSettings(payload);
      if (response.success) {
        toast.success("Quote settings saved successfully");
      } else {
        toast.error(response.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving quote settings:", error);
      toast.error("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApprovals = async () => {
    setSaving(true);
    try {
      const payload = {
        approvalType: approvalType,
        notificationPreference,
        notificationEmail,
        sendNotifications,
        notifySubmitter,
        approvalLevels: approvalLevels.map(({ id, ...rest }) => rest) // Remove frontend-only IDs
      };
      const response = await settingsAPI.updateQuotesSettings(payload);
      if (response.success) {
        toast.success("Approval settings saved successfully");
      } else {
        toast.error(response.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving approval settings:", error);
      toast.error("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 w-full">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Quotes</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === "general"
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("approvals")}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === "approvals"
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Approvals
        </button>
        <button
          onClick={() => setActiveTab("field-customization")}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === "field-customization"
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Field Customization
        </button>
        <button
          onClick={() => setActiveTab("validation-rules")}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === "validation-rules"
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Validation Rules
        </button>
        <button
          onClick={() => setActiveTab("record-locking")}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === "record-locking"
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Record Locking
        </button>
        <button
          onClick={() => setActiveTab("custom-buttons")}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === "custom-buttons"
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Custom Buttons
        </button>
        <button
          onClick={() => setActiveTab("related-lists")}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === "related-lists"
            ? "text-blue-600 border-b-2 border-blue-600"
            : "text-gray-600 hover:text-gray-900"
            }`}
        >
          Related Lists
        </button>
      </div>

      {/* General Tab Content */}
      {activeTab === "general" && (
        <div className="bg-white rounded-lg p-6 space-y-6">
          {/* Allow editing of accepted quotes */}
          <div className="pb-6 border-b border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEditingAccepted}
                onChange={(e) => setAllowEditingAccepted(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Allow editing of accepted quotes</span>
            </label>
          </div>

          {/* Allow customers to accept or decline */}
          <div className="pb-6 border-b border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCustomerAcceptDecline}
                onChange={(e) => setAllowCustomerAcceptDecline(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Allow customers to accept or decline the quotes via platforms like Whatsapp, and public link</span>
            </label>
          </div>

          {/* Automate accepted quotes to invoices conversion */}
          <div className="pb-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Automate accepted quotes to invoices conversion</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="automation"
                  value="dont-convert"
                  checked={automationOption === "dont-convert"}
                  onChange={(e) => setAutomationOption(e.target.value)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-gray-700">Don't convert accepted quotes automatically</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="automation"
                  value="draft-invoice"
                  checked={automationOption === "draft-invoice"}
                  onChange={(e) => setAutomationOption(e.target.value)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <span className="text-sm text-gray-700">Convert accepted quotes to draft invoices</span>
                  <span className="text-xs text-gray-500 ml-1">(Invoice will be saved as a draft.)</span>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="automation"
                  value="send-invoice"
                  checked={automationOption === "send-invoice"}
                  onChange={(e) => setAutomationOption(e.target.value)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <span className="text-sm text-gray-700">Convert accepted quotes to invoices and email it to the customer</span>
                  <span className="text-xs text-gray-500 ml-1">(Invoice will be sent to your customer.)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Progress Invoice */}
          <div className="pb-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              Progress Invoice
              <a href="#" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-normal uppercase">
                <Info size={12} />
                Learn More
              </a>
            </h3>
            <label className="flex items-start gap-2 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={allowProgressInvoice}
                onChange={(e) => setAllowProgressInvoice(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm text-gray-700">Allow creation of progress invoice from an quote</span>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Enable this option if your business handles projects where you invoice your customers periodically based on the progress of a project. Once enabled, users can create progress invoices from an quote.
                </p>
              </div>
            </label>
          </div>

          {/* Zero-Value Line Items */}
          <div className="pb-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Zero-Value Line Items</h3>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideZeroValueItems}
                onChange={(e) => setHideZeroValueItems(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm text-gray-700">Hide zero-value line items</span>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Choose whether you want to hide zero-value line items in an quote's PDF and the Customer Portal. They will still be visible while editing an quote. This setting will not apply to quotes whose total is zero.
                </p>
              </div>
            </label>
          </div>

          {/* Retain fields */}
          <div className="pb-6 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800 mb-4">
              Select the fields in a quote that you'd like to retain when you convert it into a sales order or invoice.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retainCustomerNotes}
                  onChange={(e) => setRetainCustomerNotes(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Customer Notes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retainTermsConditions}
                  onChange={(e) => setRetainTermsConditions(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Terms & Conditions</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retainAddress}
                  onChange={(e) => setRetainAddress(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Address</span>
              </label>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
            <textarea
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
              placeholder="Enter terms and conditions"
            />
          </div>

          {/* Customer Notes */}
          <div className="pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Notes</h3>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
              placeholder="Enter customer notes"
            />
          </div>

          {/* Save Button */}
          <div className="pt-6">
            <button
              onClick={handleSaveGeneral}
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Approvals Tab Content */}
      {activeTab === "approvals" && (
        <div className="bg-white rounded-lg p-6">
          {/* Approval Type Section */}
          <div className="mb-10">
            <h3 className="text-sm font-semibold text-gray-900 mb-6 font-medium">Approval Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* No Approval Card */}
              <div
                onClick={() => setApprovalType("no-approval")}
                className={`p-5 border rounded-lg cursor-pointer transition-all relative ${approvalType === "no-approval"
                  ? "border-blue-500 bg-blue-50 bg-opacity-30"
                  : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="approvalType"
                    value="no-approval"
                    checked={approvalType === "no-approval"}
                    onChange={(e) => setApprovalType(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <div>
                    <h4 className="text-[13px] font-semibold text-gray-800 leading-tight">No Approval</h4>
                    <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
                      Create Quote and perform further actions without approval.
                    </p>
                  </div>
                </div>
                {approvalType === "no-approval" && (
                  <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-blue-500 rotate-45 transform translate-y-1/2 z-10" />
                )}
              </div>

              {/* Simple Approval Card */}
              <div
                onClick={() => setApprovalType("simple")}
                className={`p-5 border rounded-lg cursor-pointer transition-all relative ${approvalType === "simple"
                  ? "border-blue-500 bg-blue-50 bg-opacity-30"
                  : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="approvalType"
                    value="simple"
                    checked={approvalType === "simple"}
                    onChange={(e) => setApprovalType(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <div>
                    <h4 className="text-[13px] font-semibold text-gray-800 leading-tight">Simple Approval</h4>
                    <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
                      Any user with approve permission can approve the Quote.
                    </p>
                  </div>
                </div>
                {approvalType === "simple" && (
                  <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-blue-500 rotate-45 transform translate-y-1/2 z-10" />
                )}
              </div>

              {/* Multi-Level Approval Card */}
              <div
                onClick={() => setApprovalType("multi-level")}
                className={`p-5 border rounded-lg cursor-pointer transition-all relative ${approvalType === "multi-level"
                  ? "border-blue-500 bg-blue-50 bg-opacity-30"
                  : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="approvalType"
                    value="multi-level"
                    checked={approvalType === "multi-level"}
                    onChange={(e) => setApprovalType(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <div>
                    <h4 className="text-[13px] font-semibold text-gray-800 leading-tight">Multi-Level Approval</h4>
                    <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
                      Set many levels of approval. The Quote will be approved only when all the approvers approve.
                    </p>
                  </div>
                </div>
                {approvalType === "multi-level" && (
                  <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-blue-500 rotate-45 transform translate-y-1/2 z-10" />
                )}
              </div>

              {/* Custom Approval Card */}
              <div
                onClick={() => setApprovalType("custom")}
                className={`p-5 border rounded-lg cursor-pointer transition-all relative ${approvalType === "custom"
                  ? "border-blue-500 bg-blue-50 bg-opacity-30"
                  : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="approvalType"
                    value="custom"
                    checked={approvalType === "custom"}
                    onChange={(e) => setApprovalType(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <div>
                    <h4 className="text-[13px] font-semibold text-gray-800 leading-tight">Custom Approval</h4>
                    <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
                      Create a customized approval flow by adding one or more criteria.
                    </p>
                  </div>
                </div>
                {approvalType === "custom" && (
                  <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-blue-500 rotate-45 transform translate-y-1/2 z-10" />
                )}
              </div>
            </div>
          </div>

          {/* Approvers & Notification Sections - Hidden if No Approval */}
          {approvalType !== "no-approval" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Conditional Content based on Approval Type */}
              {approvalType === "simple" ? (
                /* Simple Approval - Approvers List */
                <div className="py-8 border-t border-gray-100">
                  <h3 className="text-[13px] font-semibold text-gray-900 mb-6 uppercase tracking-tight">Approvers</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#009688] flex items-center justify-center text-white text-[15px] font-medium shadow-sm">
                      a
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-gray-900">asc wcs</div>
                      <div className="text-[12px] text-gray-500">ascwcs685@gmail.com</div>
                    </div>
                  </div>
                </div>
              ) : approvalType === "multi-level" ? (
                /* Multi-Level Approval - Hierarchy Table */
                <div className="py-8 border-t border-gray-100">
                  <h3 className="text-[11px] font-semibold text-gray-500 mb-4 uppercase tracking-wider">SET THE APPROVAL HIERARCHY</h3>
                  <div className="border border-gray-200 rounded">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#F9FAFB] border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-1/3">PRIORITY</th>
                          <th className="px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">APPROVER NAME</th>
                          <th className="w-10 px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {approvalLevels.map((level, index) => (
                          <tr
                            key={level.id}
                            draggable
                            onDragStart={() => setDraggedLevelId(level.id)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              const draggingOverId = level.id;
                              if (draggedLevelId !== null && draggedLevelId !== draggingOverId) {
                                const newLevels = [...approvalLevels];
                                const draggedIndex = newLevels.findIndex(l => l.id === draggedLevelId);
                                const overIndex = newLevels.findIndex(l => l.id === draggingOverId);

                                const [draggedItem] = newLevels.splice(draggedIndex, 1);
                                newLevels.splice(overIndex, 0, draggedItem);

                                // Recalculate level numbers
                                const updatedLevels = newLevels.map((l, i) => ({
                                  ...l,
                                  level: i + 1
                                }));
                                setApprovalLevels(updatedLevels);
                              }
                            }}
                            onDragEnd={() => setDraggedLevelId(null)}
                            className={`group hover:bg-gray-50 transition-colors ${activeApproverLevel === level.id ? "relative z-50" : "relative z-0"} ${draggedLevelId === level.id ? "opacity-50 grayscale bg-blue-50" : ""}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <GripVertical size={14} className="text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-400 p-1 -m-1" />
                                <span className="text-[13px] text-gray-700">Level {level.level} : Approver</span>
                              </div>
                            </td>
                            <td className={`px-4 py-3 relative ${activeApproverLevel === level.id ? "z-[100]" : "z-0"}`} ref={activeApproverLevel === level.id ? approverDropdownRef : null}>
                              <div
                                onClick={() => {
                                  setActiveApproverLevel(level.id);
                                  setApproverSearch("");
                                }}
                                className="w-full flex items-center justify-between border border-gray-200 rounded px-3 py-1.5 text-[13px] bg-white cursor-pointer group hover:border-blue-400 transition-colors"
                              >
                                <span className={level.approver ? "text-gray-800" : "text-gray-400"}>
                                  {level.approver || "Select an approver"}
                                </span>
                                <ChevronDown size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                              </div>

                              {activeApproverLevel === level.id && (
                                <div className="absolute left-0 right-4 top-full mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg animate-in fade-in zoom-in-95 duration-150">
                                  <div className="p-2 border-b border-gray-100">
                                    <div className="relative">
                                      <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-45 transform" /> {/* Search icon dummy */}
                                      <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search..."
                                        value={approverSearch}
                                        onChange={(e) => setApproverSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-blue-500 rounded text-[13px] focus:outline-none"
                                      />
                                      <GripVertical size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hidden" />
                                      {/* Using lucide Search icon or similar */}
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                      >
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="max-h-60 overflow-auto p-1">
                                    {mockUsers.filter(u => u.name.toLowerCase().includes(approverSearch.toLowerCase())).map((user) => (
                                      <div
                                        key={user.email}
                                        onClick={() => {
                                          const newLevels = approvalLevels.map(al =>
                                            al.id === level.id ? { ...al, approver: user.name, email: user.email } : al
                                          );
                                          setApprovalLevels(newLevels);
                                          setActiveApproverLevel(null);
                                        }}
                                        className={`px-3 py-2 rounded text-[13px] cursor-pointer transition-colors ${level.approver === user.name
                                          ? "bg-blue-500 text-white"
                                          : "text-gray-700 hover:bg-blue-500 hover:text-white"
                                          }`}
                                      >
                                        <div className="font-medium">{user.name}</div>
                                        <div className={`text-[11px] ${level.approver === user.name ? "text-blue-100" : "text-gray-500"}`}>
                                          [{user.email}]
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => removeApprovalLevel(level.id)}
                                className="text-red-500 hover:text-red-600 transition-colors focus:outline-none"
                              >
                                <MinusCircle size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} className="px-4 py-3">
                            <button
                              onClick={addApprovalLevel}
                              className="text-[13px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                            >
                              Add New Level
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Note Section */}
                  <div className="mt-8 p-5 bg-[#F9FAFB] border border-gray-100 rounded-lg">
                    <h4 className="text-[12px] font-bold text-gray-800 mb-2">NOTE:</h4>
                    <p className="text-[12px] text-gray-600 leading-relaxed font-medium">
                      1.) Admins can bypass multiple levels of approval and approve transactions once and for all. They can do this by selecting the transaction &gt; More &gt; Final Approve.
                    </p>
                  </div>
                </div>
              ) : approvalType === "custom" ? (
                /* Custom Approval - Rules List or Empty State */
                <div className="py-8 border-t border-gray-100">
                  {approvalRules.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-tight">Custom Approval Rules</h3>
                        <button
                          onClick={() => navigate("/settings/quotes/new-custom-approval")}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded shadow-sm transition-all flex items-center gap-2"
                        >
                          <Plus size={14} />
                          New Custom Approval
                        </button>
                      </div>
                      <div className="border border-gray-200 rounded overflow-hidden shadow-sm bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#F9FAFB] border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">RULE NAME</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">APPLIED FOR</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">DESCRIPTION</th>
                              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">STATUS</th>
                              <th className="w-10 px-6 py-4"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {approvalRules.map((rule) => (
                              <tr key={rule._id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 text-[13px] font-semibold text-blue-600 hover:underline cursor-pointer">
                                  {rule.name}
                                </td>
                                <td className="px-6 py-4 text-[13px] text-gray-600">
                                  {rule.module}s
                                </td>
                                <td className="px-6 py-4 text-[13px] text-gray-500 italic max-w-xs truncate">
                                  {rule.description || "No description"}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                    {rule.isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button className="text-gray-400 hover:text-gray-600">
                                    <MoreVertical size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#F8F9FA]/50 rounded-lg p-12 flex flex-col items-center text-center">
                      <div className="w-64 h-48 mb-8 flex items-center justify-center text-blue-100">
                        <svg width="256" height="192" viewBox="0 0 256 192" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="20" y="80" width="40" height="50" rx="4" fill="currentColor" stroke="#3B82F6" strokeWidth="2" />
                          <line x1="60" y1="105" x2="90" y2="105" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />
                          <rect x="90" y="85" width="40" height="40" rx="4" transform="rotate(45 90 85)" fill="currentColor" stroke="#3B82F6" strokeWidth="2" />
                          <path d="M130 105C150 105 150 60 170 60" stroke="#94A3B8" strokeWidth="2" fill="none" />
                          <path d="M130 105C150 105 150 150 170 150" stroke="#94A3B8" strokeWidth="2" fill="none" />
                          <circle cx="190" cy="60" r="15" fill="currentColor" stroke="#3B82F6" strokeWidth="2" />
                          <circle cx="190" cy="150" r="15" fill="currentColor" stroke="#3B82F6" strokeWidth="2" />
                        </svg>
                      </div>

                      <h3 className="text-[18px] font-semibold text-gray-900 mb-2">Simplify your approval process with custom approval</h3>
                      <p className="text-[14px] text-gray-500 mb-8 max-w-md">
                        Customize your approval flow based on multiple conditions.
                      </p>
                      <button
                        onClick={() => navigate("/settings/quotes/new-custom-approval")}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded shadow-sm transition-all active:scale-95"
                      >
                        New Custom Approval
                      </button>
                    </div>
                  )}

                  {/* Note Section for Custom */}
                  <div className="mt-8 p-5 bg-[#F9FAFB] border border-gray-100 rounded-lg">
                    <h4 className="text-[12px] font-bold text-gray-800 mb-2">NOTE:</h4>
                    <p className="text-[12px] text-gray-600 leading-relaxed font-medium">
                      1.) Admins can bypass multiple levels of approval and approve transactions once and for all. They can do this by selecting the transaction &gt; More &gt; Final Approve.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Notification Preferences Section - Shared */}
              {approvalType !== "custom" && (
                <div className="py-8 border-t border-gray-100">
                  <h3 className="text-[13px] font-semibold text-gray-900 mb-6 uppercase tracking-tight">Notification Preferences</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input
                          type="checkbox"
                          checked={sendNotifications}
                          onChange={(e) => setSendNotifications(e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-[13px] text-gray-700 font-medium">Send email and in-app notifications when transactions are submitted for approval</span>
                      </label>

                      {sendNotifications && approvalType === "simple" && (
                        <div className="pl-7 space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="notificationDetail"
                              value="non-approver"
                              checked={notificationPreference === "non-approver"}
                              onChange={(e) => setNotificationPreference(e.target.value)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">Notify all approvers when a non-approver submits a transaction</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="notificationDetail"
                              value="all-submitters"
                              checked={notificationPreference === "all-submitters"}
                              onChange={(e) => setNotificationPreference(e.target.value)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">Notify all approvers when an approver/non-approver submits a transaction</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="notificationDetail"
                              value="specific-email"
                              checked={notificationPreference === "specific-email"}
                              onChange={(e) => setNotificationPreference(e.target.value)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">Notify a specific email address</span>
                          </label>
                          {notificationPreference === "specific-email" && (
                            <div className="pl-7 mt-2">
                              <input
                                type="email"
                                placeholder="abc@example.com"
                                value={notificationEmail}
                                onChange={(e) => setNotificationEmail(e.target.value)}
                                className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifySubmitter}
                          onChange={(e) => setNotifySubmitter(e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-[13px] text-gray-700 font-medium">Notify the submitter when a transaction is approved or rejected</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="pt-8 border-t border-gray-100">
            <button
              onClick={handleSaveApprovals}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )
      }


      {/* Field Customization Tab Content */}
      {
        activeTab === "field-customization" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-600">
                Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
              </div>
              <button
                onClick={() => navigate("/settings/quotes/new-field")}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                New Custom Field
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customFields.map((field, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                        {field.name}
                        {field.locked && <Lock size={14} className="text-gray-400" />}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${field.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                          }`}>
                          {field.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Validation Rules Tab Content */}
      {
        activeTab === "validation-rules" && (
          <div>
            <div className="flex items-center justify-end mb-6">
              <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2">
                <Plus size={16} />
                New Validation Rule
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-12">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Validation Rules</h3>
                <p className="text-sm text-gray-600 mb-8 max-w-2xl mx-auto">
                  Validation Rules helps you to validate the data entered while creating, editing, or converting transactions and to prevent users from performing specific actions.
                </p>

                <div className="max-w-2xl mx-auto">
                  <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                    <div className="text-left mb-4">
                      <span className="text-sm font-semibold text-gray-900">Validation Rule</span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-blue-200 border-2 border-blue-400 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-900">WHEN</span>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="w-0.5 h-8 bg-blue-300"></div>
                      </div>

                      <div className="flex items-center justify-center gap-4">
                        <div className="border-2 border-blue-300 rounded-lg p-4 bg-white min-w-[200px] flex items-center justify-between">
                          <span className="text-sm text-gray-500">---</span>
                          <span className="text-sm text-gray-700">!=</span>
                          <Edit2 size={16} className="text-gray-400" />
                        </div>

                        <button className="w-8 h-8 rounded-full bg-blue-200 border-2 border-blue-400 flex items-center justify-center text-blue-600 hover:bg-blue-300 transition">
                          <Plus size={16} />
                        </button>
                        <span className="text-xs text-blue-600">+ Add Subrule</span>

                        <div className="border-2 border-blue-300 rounded-lg p-4 bg-white min-w-[200px] flex items-center justify-between">
                          <span className="text-sm text-gray-500">---</span>
                          <Edit2 size={16} className="text-gray-400" />
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="w-0.5 h-8 bg-blue-300"></div>
                      </div>

                      <div className="flex justify-center">
                        <button className="w-8 h-8 rounded-full bg-blue-200 border-2 border-blue-400 flex items-center justify-center text-blue-600 hover:bg-blue-300 transition">
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-gray-500">+ Add another validation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Custom Buttons Tab Content */}
      {
        activeTab === "custom-buttons" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div></div>
              <div className="flex items-center gap-3">
                <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  What's this?
                </button>
                <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  View Logs
                </button>
                <div className="relative" ref={newButtonDropdownRef}>
                  <div className="flex">
                    <button
                      onClick={() => setShowNewButtonDropdown(false)}
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
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                        New Button
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

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

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">BUTTON NAME</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ACCESS PERMISSION</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">LOCATION</th>
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
        )
      }

      {/* Related Lists Tab Content */}
      {
        activeTab === "related-lists" && (
          <div>
            <div className="flex items-center justify-end mb-6">
              <button
                onClick={() => navigate("/settings/quotes/new-related-list")}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                New Related List
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-8 flex items-center justify-center" style={{ width: "200px", height: "200px" }}>
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
                    <div className="absolute inset-0 flex flex-col justify-center items-center p-2">
                      <div className="w-full h-px bg-gray-300 mb-2"></div>
                      <div className="w-full h-px bg-gray-300"></div>
                    </div>
                    <div className="absolute inset-0 flex justify-center items-center">
                      <div className="h-full w-px bg-gray-300"></div>
                    </div>
                  </div>

                  <div className="relative z-10" style={{ left: "-20px", top: "10px" }}>
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: "50px",
                        height: "50px",
                        backgroundColor: "#fbbf24",
                        top: "0px",
                        left: "15px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                      }}
                    >
                      <div
                        className="absolute rounded-full bg-white"
                        style={{
                          width: "35px",
                          height: "35px",
                          top: "8px",
                          left: "7.5px"
                        }}
                      >
                        <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-1 border-b-2 border-gray-700 rounded-full"></div>
                      </div>
                    </div>

                    <div
                      className="absolute rounded-lg"
                      style={{
                        width: "60px",
                        height: "70px",
                        backgroundColor: "#ef4444",
                        top: "45px",
                        left: "10px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                      }}
                    ></div>

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
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-0.5 bg-white"></div>
                        <div className="absolute w-0.5 h-6 bg-white"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center mb-8 max-w-md">
                  Create custom related lists to access relevant information available from inside or outside the application.
                </p>

                <button
                  onClick={() => navigate("/settings/quotes/new-related-list")}
                  className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                >
                  New Related List
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}



