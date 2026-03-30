import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { RecurringInvoice as RecurringInvoiceModel, Invoice as InvoiceModel, Customer as CustomerModel } from "../../salesModel";
type RecurringInvoice = RecurringInvoiceModel & Record<string, any>;
type Invoice = InvoiceModel & Record<string, any>;
type Customer = CustomerModel & Record<string, any>;
import { getRecurringInvoiceById, getRecurringInvoices, getInvoices, getCustomerById, updateRecurringInvoice, deleteRecurringInvoice, generateInvoiceFromRecurring, saveRecurringInvoice } from "../../salesModel";
import {
  Edit, MoreVertical, X, ChevronDown, ChevronUp, Info, FileText, Plus, Square, Search, Star
} from "lucide-react";
import toast from "react-hot-toast";
import { settingsAPI } from "../../../../services/api";

export default function RecurringInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recurringInvoice, setRecurringInvoice] = useState<RecurringInvoice | null>(null);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [childInvoices, setChildInvoices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAllRecurringInvoicesDropdownOpen, setIsAllRecurringInvoicesDropdownOpen] = useState(false);
  const [isChildInvoicesExpanded, setIsChildInvoicesExpanded] = useState(true);
  const [filterSearch, setFilterSearch] = useState("");
  const [organizationProfile, setOrganizationProfile] = useState<any | null>(null);
  const [recurringInvoiceSettings, setRecurringInvoiceSettings] = useState<any | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState({
    name: "",
    street1: "",
    street2: "",
    city: "",
    stateProvince: "",
    country: "",
    zipCode: "",
    phone: "",
    email: "",
    websiteUrl: ""
  });
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const allRecurringInvoicesDropdownRef = useRef<HTMLDivElement | null>(null);

  const statusFilters = ["All", "Active", "Stopped", "Expired"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const recurringInvoiceData = await getRecurringInvoiceById(String(id));
        if (recurringInvoiceData) {
          setRecurringInvoice(recurringInvoiceData);

          // Load customer data
          const custId = recurringInvoiceData.customerId ||
            (typeof recurringInvoiceData.customer === 'object' ?
              (recurringInvoiceData.customer?.id || recurringInvoiceData.customer?._id) :
              recurringInvoiceData.customer);

          if (custId) {
            const customerData = await getCustomerById(String(custId));
            setCustomer(customerData);
          }

          // Load child invoices (invoices created from this recurring invoice)
          const allInvoices = await getInvoices();
          const relatedInvoices = Array.isArray(allInvoices) ? (allInvoices as any[]).filter(inv =>
            String(inv.recurringInvoiceId) === String(id) ||
            String(inv.recurringInvoiceProfile) === String((recurringInvoiceData as any)?.profileName)
          ) : [];
          setChildInvoices(relatedInvoices);
        } else {
          navigate("/sales/recurring-invoices");
        }

        const allRecurringInvoices = await getRecurringInvoices();
        setRecurringInvoices(Array.isArray(allRecurringInvoices) ? allRecurringInvoices : []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    if (id) {
      fetchData();
    }

    // Fetch organization profile for header
    const fetchOrg = async () => {
      try {
        const resp = await settingsAPI.getOrganizationProfile();
        if (resp && resp.success && resp.data) {
          setOrganizationProfile(resp.data);
          if (resp.data.logo) setLogoPreview(resp.data.logo);
          if (resp.data.address) {
            setOrganizationData(prev => ({
              ...prev,
              name: resp.data.name || prev.name,
              street1: resp.data.address.street1 || prev.street1,
              street2: resp.data.address.street2 || prev.street2,
              city: resp.data.address.city || prev.city,
              stateProvince: resp.data.address.state || prev.stateProvince,
              country: resp.data.address.country || prev.country,
              zipCode: resp.data.address.zipCode || prev.zipCode,
              phone: resp.data.phone || prev.phone,
              email: resp.data.email || prev.email,
              websiteUrl: resp.data.website || prev.websiteUrl
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching organization profile:', err);
      }
    };

    const fetchRecurringSettings = async () => {
      try {
        const resp = await settingsAPI.getRecurringInvoiceSettings();
        if (resp && resp.success && resp.data) {
          setRecurringInvoiceSettings(resp.data);
        }
      } catch (err) {
        console.error('Error fetching recurring invoice settings:', err);
      }
    };

    fetchOrg();
    fetchRecurringSettings();
  }, [id, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (moreMenuRef.current && target && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (allRecurringInvoicesDropdownRef.current && target && !allRecurringInvoicesDropdownRef.current.contains(target)) {
        setIsAllRecurringInvoicesDropdownOpen(false);
      }
    };

    if (isMoreMenuOpen || isAllRecurringInvoicesDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen, isAllRecurringInvoicesDropdownOpen]);

  const handleFilterSelect = (filter: string) => {
    setIsAllRecurringInvoicesDropdownOpen(false);
    if (filter === "All") {
      navigate("/sales/recurring-invoices");
    }
  };

  const filteredStatusOptions = statusFilters.filter(filter =>
    filter.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const formatCurrency = (amount: any, currency = "USD") => {
    const formattedAmount = parseFloat(String(amount || 0)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${currency}${formattedAmount}`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getNextInvoiceDate = () => {
    if (!recurringInvoice) return null;

    if (recurringInvoice.nextInvoiceDate) return String(recurringInvoice.nextInvoiceDate);

    const frequencyRaw = String(recurringInvoice.frequency || recurringInvoice.repeatEvery || "monthly").toLowerCase();
    const baseRaw =
      recurringInvoice.lastInvoiceDate ||
      recurringInvoice.startDate ||
      recurringInvoice.startOn ||
      recurringInvoice.createdAt;

    if (!baseRaw) return null;
    const baseDate = new Date(String(baseRaw));
    if (isNaN(baseDate.getTime())) return null;

    const nextDate = new Date(baseDate.getTime());

    switch (frequencyRaw) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "biweekly":
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case "monthly":
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return nextDate.toISOString();
  };

  const getManuallyCreatedCount = () => {
    return childInvoices.filter(inv => (inv as any).isManuallyAdded || (inv as any).manuallyAdded).length;
  };

  const getUnpaidAmount = () => {
    return childInvoices
      .filter(inv => String(inv.status || "").toLowerCase() !== "paid")
      .reduce((sum, inv) => sum + Number(inv.total ?? inv.amount ?? 0), 0);
  };

  if (!recurringInvoice) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const nextInvoiceDate = getNextInvoiceDate();
  const manuallyCreatedCount = getManuallyCreatedCount();
  const unpaidAmount = getUnpaidAmount();

  return (
    <div className="w-full h-screen flex bg-white overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-screen overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="relative flex-1" ref={allRecurringInvoicesDropdownRef}>
            <button
              onClick={() => setIsAllRecurringInvoicesDropdownOpen(!isAllRecurringInvoicesDropdownOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50"
            >
              {isAllRecurringInvoicesDropdownOpen ? (
                <ChevronUp size={16} className="text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-500" />
              )}
              <span className="text-sm font-medium text-gray-700">All Recurring Inv...</span>
            </button>

            {/* Filter Dropdown */}
            {isAllRecurringInvoicesDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                {/* Search Bar */}
                <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="flex-1 outline-none text-sm text-gray-700"
                    autoFocus
                  />
                </div>

                {/* Filter Options */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredStatusOptions.map((filter) => (
                    <div
                      key={filter}
                      onClick={() => handleFilterSelect(filter)}
                      className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                    >
                      <span>{filter}</span>
                      <Star size={16} className="text-gray-400 hover:text-yellow-500 cursor-pointer" />
                    </div>
                  ))}
                </div>

                {/* New Custom View */}
                <div
                  onClick={() => {
                    setIsAllRecurringInvoicesDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  <Plus size={16} />
                  New Custom View
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {recurringInvoices.map((ri) => {
            const riNextDate = ri.nextInvoiceDate
              ? String(ri.nextInvoiceDate)
              : ri.startDate || ri.startOn
                ? (() => {
                  const base = new Date(String(ri.startDate || ri.startOn));
                  if (isNaN(base.getTime())) return null;
                  const repeat = String(ri.frequency || ri.repeatEvery || "monthly").toLowerCase();
                  const date = new Date(base.getTime());
                  switch (repeat) {
                    case "daily":
                      date.setDate(date.getDate() + 1);
                      break;
                    case "weekly":
                      date.setDate(date.getDate() + 7);
                      break;
                    case "biweekly":
                      date.setDate(date.getDate() + 14);
                      break;
                    case "quarterly":
                      date.setMonth(date.getMonth() + 3);
                      break;
                    case "yearly":
                      date.setFullYear(date.getFullYear() + 1);
                      break;
                    case "monthly":
                    default:
                      date.setMonth(date.getMonth() + 1);
                      break;
                  }
                  return date.toISOString();
                })()
                : null;

            return (
              <div
                key={ri.id}
                onClick={() => navigate(`/sales/recurring-invoices/${ri.id}`)}
                className={`flex flex-col gap-2 p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${ri.id === id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                  }`}
              >
                <div className="flex items-start gap-3">
                  <Square size={16} className="text-gray-400 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate mb-1">
                      {ri.customerName || (typeof ri.customer === 'object' ? (ri.customer?.displayName || ri.customer?.name) : ri.customer) || "-"}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">D</div>
                    <div>
                      <span className={`text-xs font-medium ${(ri.status || "active").toLowerCase() === "active" ? "text-green-800" :
                        (ri.status || "active").toLowerCase() === "stopped" ? "text-red-800" :
                          (ri.status || "active").toLowerCase() === "expired" ? "text-gray-800" :
                            "text-green-800"
                        }`}>
                        {(ri.status || "ACTIVE").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(ri.total || 0, ri.currency || "USD")}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {ri.repeatEvery || "Monthly"}
                    </div>
                    {riNextDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        Next Invoice on {formatDate(riNextDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          {/* Detail Title */}
          <div className="min-w-0">
            <div className="text-sm text-gray-600 truncate">
              Recurring Invoice
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 truncate">
              {recurringInvoice.profileName || recurringInvoice.customerName || (typeof recurringInvoice.customer === 'object' ? (recurringInvoice.customer?.displayName || recurringInvoice.customer?.name) : recurringInvoice.customer) || "Recurring Invoice"}
            </h1>
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center gap-3">
            {/* Edit Button - Square with rounded corners, pencil icon */}
            <button
              onClick={() => navigate(`/sales/recurring-invoices/${id}/edit`)}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors"
              title="Edit"
            >
              <Edit size={18} className="text-black" strokeWidth={2} />
            </button>

            {/* Create Invoice Button - Rectangular with rounded corners, black text */}
            <button
              onClick={() => {
                navigate(`/sales/invoices/new`, {
                  state: {
                    clonedData: recurringInvoice,
                    customerId: recurringInvoice.customerId || (typeof recurringInvoice.customer === 'object' ? (recurringInvoice.customer?.id || recurringInvoice.customer?._id) : recurringInvoice.customer),
                    customerName: recurringInvoice.customerName || (typeof recurringInvoice.customer === 'object' ? (recurringInvoice.customer?.displayName || recurringInvoice.customer?.name) : ""),
                    fromRecurring: true
                  }
                });
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-md text-sm font-medium border border-gray-300 transition-colors"
            >
              Create Invoice
            </button>

            {/* More Button - Rectangular with rounded corners, black text, dropdown arrow */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-md text-sm font-medium border border-gray-300 transition-colors flex items-center gap-1"
                title="More"
              >
                More
                <ChevronDown size={14} className="text-black" />
              </button>
              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px] overflow-hidden">
                  <div
                    className={`px-4 py-2 text-sm cursor-pointer ${(recurringInvoice?.status || "active").toLowerCase() === "active"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-50"
                      }`}
                    onClick={async () => {
                      const status = (recurringInvoice?.status || "active").toLowerCase();
                      if (status === "active") {
                        // Stop the recurring invoice
                        if (window.confirm("Are you sure you want to stop this recurring invoice?")) {
                          try {
                            await updateRecurringInvoice(String(id), { status: "stopped" });
                            setRecurringInvoice({ ...recurringInvoice, status: "stopped" });
                            setIsMoreMenuOpen(false);
                            // Refresh the page data
                            const updated = await getRecurringInvoiceById(String(id));
                            if (updated) setRecurringInvoice(updated);
                          } catch (error) {
                            console.error("Error stopping recurring invoice:", error);
                            alert("Failed to stop recurring invoice. Please try again.");
                          }
                        }
                      } else {
                        // Restart if already stopped
                        if (window.confirm("Are you sure you want to restart this recurring invoice?")) {
                          try {
                            await updateRecurringInvoice(String(id), { status: "active" });
                            setRecurringInvoice({ ...recurringInvoice, status: "active" });
                            setIsMoreMenuOpen(false);
                            // Refresh the page data
                            const updated = await getRecurringInvoiceById(String(id));
                            if (updated) setRecurringInvoice(updated);
                          } catch (error) {
                            console.error("Error restarting recurring invoice:", error);
                            alert("Failed to restart recurring invoice. Please try again.");
                          }
                        }
                      }
                    }}
                  >
                    {(recurringInvoice?.status || "active").toLowerCase() === "active" ? "Stop" : "Resume"}
                  </div>
                  <div
                    className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={async () => {
                      setIsMoreMenuOpen(false);
                      if (recurringInvoice) {
                        if (window.confirm("Are you sure you want to clone this recurring invoice?")) {
                          try {
                            const { id, _id, createdAt, updatedAt, nextInvoiceDate, lastInvoiceDate, ...cloneData } = recurringInvoice;
                            // Clean up any other internal fields that shouldn't be cloned directly
                            const newProfileName = `${cloneData.profileName || "Clone"} - Copy`;

                            const saved = await saveRecurringInvoice({
                              ...cloneData,
                              profileName: newProfileName,
                              status: "active"
                            });

                            if (saved) {
                              toast.success("Recurring invoice cloned successfully");
                              navigate(`/sales/recurring-invoices/${saved.id || saved._id}`);
                            }
                          } catch (error) {
                            console.error("Error cloning recurring invoice:", error);
                            alert("Failed to clone recurring invoice. Please try again.");
                          }
                        }
                      }
                    }}
                  >
                    Clone
                  </div>
                  <div
                    className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to generate an invoice from this recurring profile now?")) {
                        try {
                          setIsMoreMenuOpen(false);
                          const generated = await generateInvoiceFromRecurring(String(id));
                          if (generated) {
                            alert(`Invoice ${generated.invoiceNumber || 'generated'} successfully.`);
                            // Refresh children
                            window.location.reload();
                          }
                        } catch (error) {
                          console.error("Error generating invoice:", error);
                          alert("Failed to generate invoice. Please try again.");
                        }
                      }
                    }}
                  >
                    Generate Invoice
                  </div>
                  <div
                    className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this recurring invoice? This action cannot be undone.")) {
                        try {
                          await deleteRecurringInvoice(String(id));
                          setIsMoreMenuOpen(false);
                          // Navigate back to recurring invoices list
                          navigate("/sales/recurring-invoices");
                        } catch (error) {
                          console.error("Error deleting recurring invoice:", error);
                          alert("Failed to delete recurring invoice. Please try again.");
                        }
                      }
                    }}
                  >
                    Delete
                  </div>
                </div>
              )}
            </div>

            {/* Close X Button */}
            <button
              onClick={() => navigate("/sales/recurring-invoices")}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors"
              title="Close"
            >
              <X size={18} className="text-black" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-gray-200 bg-white px-6">
          <button
            onClick={() => setActiveTab("Overview")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "Overview"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("Next Invoice")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "Next Invoice"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Next Invoice
          </button>
          <button
            onClick={() => setActiveTab("Recent Activities")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "Recent Activities"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Recent Activities
          </button>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === "Overview" && (
            <div className="grid grid-cols-2 gap-6 p-6">
              {/* Left Panel */}
              <div className="space-y-6">
                {/* Customer Section */}
                <div>
                  {recurringInvoice.profileName || recurringInvoice.customerName || (typeof recurringInvoice.customer === 'object' ? (recurringInvoice.customer?.displayName || recurringInvoice.customer?.name) : recurringInvoice.customer) || "KOWNI"}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium text-lg">
                        {(() => {
                          const name = recurringInvoice.customerName ||
                            (typeof recurringInvoice.customer === 'object' ?
                              (recurringInvoice.customer?.displayName || recurringInvoice.customer?.name) :
                              recurringInvoice.customer) ||
                            "K";
                          return String(name).charAt(0).toUpperCase();
                        })()}
                      </span>
                    </div>
                    {recurringInvoice.customerName || (typeof recurringInvoice.customer === 'object' ? (recurringInvoice.customer?.displayName || recurringInvoice.customer?.name) : recurringInvoice.customer) || "KOWNI"}
                  </div>
                </div>

                {/* DETAILS Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">DETAILS</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Profile Status:</span>
                      <span className={`text-xs font-medium ${(recurringInvoice.status || "active").toLowerCase() === "active"
                        ? "text-green-800"
                        : "text-gray-800"
                        }`}>
                        {(recurringInvoice.status || "Active").charAt(0).toUpperCase() + (recurringInvoice.status || "Active").slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Start Date:</span>
                      <span className="text-sm text-gray-900">{formatDate(recurringInvoice.startDate || recurringInvoice.startOn)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">End Date:</span>
                      <span className="text-sm text-gray-900">
                        {recurringInvoice.endDate || recurringInvoice.endsOn ? formatDate(recurringInvoice.endDate || recurringInvoice.endsOn) : "Never Expires"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Payment Terms:</span>
                      <span className="text-sm text-gray-900">
                        {recurringInvoice.paymentTerms || "Due on Receipt"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Manually Created Invoices:</span>
                      <span className="text-sm text-gray-900">{manuallyCreatedCount}</span>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
                    <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      Recurring invoice preference:{" "}
                      <span className="font-medium">
                        {recurringInvoiceSettings?.invoiceMode === "sent"
                          ? "Create and send invoices"
                          : "Create invoices as drafts"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* ADDRESS Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">ADDRESS</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Billing Address</span>
                      {customer && (customer.billingStreet1 || customer.billingCity) ? (
                        <div className="mt-1 text-sm text-gray-600">
                          {customer.billingStreet1 && <div>{customer.billingStreet1}</div>}
                          {customer.billingStreet2 && <div>{customer.billingStreet2}</div>}
                          {customer.billingCity && <div>{customer.billingCity}</div>}
                          {customer.billingState && <div>{customer.billingState}</div>}
                          {customer.billingZipCode && <div>{customer.billingZipCode}</div>}
                          {customer.billingCountry && <div>{customer.billingCountry}</div>}
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-gray-500 italic">No billing address</div>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Shipping Address</span>
                      {customer && (customer.shippingStreet1 || customer.shippingCity) ? (
                        <div className="mt-1 text-sm text-gray-600">
                          {customer.shippingStreet1 && <div>{customer.shippingStreet1}</div>}
                          {customer.shippingStreet2 && <div>{customer.shippingStreet2}</div>}
                          {customer.shippingCity && <div>{customer.shippingCity}</div>}
                          {customer.shippingState && <div>{customer.shippingState}</div>}
                          {customer.shippingZipCode && <div>{customer.shippingZipCode}</div>}
                          {customer.shippingCountry && <div>{customer.shippingCountry}</div>}
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-gray-500 italic">No shipping address</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CUSTOMER NOTES Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">CUSTOMER NOTES</h3>
                  <div className="text-sm text-gray-600">
                    {recurringInvoice.customerNotes || "No notes"}
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="space-y-6">
                {/* Summary Boxes */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">Invoice Amount</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(recurringInvoice.total || 0, recurringInvoice.currency || "USD")}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">Next Invoice Date</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {nextInvoiceDate ? formatDate(nextInvoiceDate) : "—"}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">Recurring Period</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {recurringInvoice.repeatEvery || "Monthly"}
                    </div>
                  </div>
                </div>

                {/* Unpaid Invoices */}
                <div className="text-sm text-gray-600">
                  Unpaid Invoices : {formatCurrency(unpaidAmount, recurringInvoice.currency || "USD")}
                </div>

                {/* All Child Invoices Section */}
                <div className="border border-gray-200 rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                    onClick={() => setIsChildInvoicesExpanded(!isChildInvoicesExpanded)}
                  >
                    <h3 className="text-sm font-semibold text-gray-900">All Child Invoices</h3>
                    {isChildInvoicesExpanded ? (
                      <ChevronUp size={16} className="text-gray-600" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-600" />
                    )}
                  </div>

                  {isChildInvoicesExpanded && (
                    <div className="p-4 space-y-3">
                      {childInvoices.length > 0 ? (
                        childInvoices.map((invoice) => (
                          <div
                            key={invoice.id}
                            className="flex items-start justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                          >
                            <div className="flex-1">
                              {invoice.customerName || (typeof invoice.customer === 'object' ? (invoice.customer?.displayName || invoice.customer?.name) : (invoice.customer || recurringInvoice.customerName || (typeof recurringInvoice.customer === 'object' ? (recurringInvoice.customer?.displayName || recurringInvoice.customer?.name) : recurringInvoice.customer))) || "KOWNI"}
                              <div className="text-sm text-blue-600 mb-1">
                                {invoice.invoiceNumber || invoice.id}
                              </div>
                              <div className="text-xs text-gray-600 mb-1">
                                {formatDate(invoice.date || invoice.createdAt)}
                              </div>
                              {(invoice.isManuallyAdded || invoice.manuallyAdded) && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                  <Info size={12} className="text-gray-400" />
                                  <span>Manually Added</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(invoice.total || invoice.amount || 0, invoice.currency || recurringInvoice.currency || "USD")}
                              </div>
                              <span className={`text-xs font-medium ${(invoice.status || "DRAFT").toUpperCase() === "DRAFT"
                                ? "text-gray-700"
                                : (invoice.status || "").toUpperCase() === "PAID"
                                  ? "text-green-800"
                                  : "text-yellow-800"
                                }`}>
                                {(invoice.status || "DRAFT").toUpperCase()}
                              </span>
                              {invoice.status !== "Paid" && invoice.status !== "paid" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/payments/payments-received/new", {
                                      state: {
                                        invoiceId: invoice.id || invoice._id,
                                        invoiceNumber: invoice.invoiceNumber || invoice.id || invoice._id,
                                        customerId: invoice.customerId || invoice.customer?._id || invoice.customer?.id || recurringInvoice.customerId || "",
                                        customerName: invoice.customerName || (typeof invoice.customer === "string"
                                          ? invoice.customer
                                          : invoice.customer?.displayName || invoice.customer?.name || recurringInvoice.customerName || ""),
                                        amount: invoice.balanceDue !== undefined
                                          ? invoice.balanceDue
                                          : (invoice.balance !== undefined ? invoice.balance : (invoice.total ?? invoice.amount ?? 0)),
                                        currency: invoice.currency || recurringInvoice.currency || "USD",
                                        invoice,
                                        showOnlyInvoice: true,
                                        returnInvoiceId: invoice.id || invoice._id || ""
                                      }
                                    });
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  Record Payment
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No child invoices created yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Next Invoice" && (
            <div className="p-6 bg-gray-50">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-5xl mx-auto" style={{ position: "relative", overflow: "hidden" }}>
                {/* Active Banner */}
                <div
                  className="absolute top-4 left-6 text-green-600 text-xs font-semibold uppercase"
                >
                  Active
                </div>

                {/* Header Section */}
                <div className="flex items-start justify-between mb-8 pt-6">
                  {/* Left Side - Organization header (read from DB) */}
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded">
                      {logoPreview ? (
                        <img src={logoPreview} alt="logo" className="max-h-16 object-contain" />
                      ) : (
                        <div className="text-2xl font-bold text-gray-400">{(organizationData.name || '').charAt(0) || 'D'}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900 mb-1">{organizationData.name || 'Company'}</div>
                      {organizationData.street1 && <div className="text-sm text-gray-600">{organizationData.street1}</div>}
                      {organizationData.street2 && <div className="text-sm text-gray-600">{organizationData.street2}</div>}
                      {(organizationData.city || organizationData.stateProvince || organizationData.zipCode) && (
                        <div className="text-sm text-gray-600">{[organizationData.city, organizationData.stateProvince, organizationData.zipCode].filter(Boolean).join(', ')}</div>
                      )}
                      {organizationData.country && <div className="text-sm text-gray-600">{organizationData.country}</div>}
                      {organizationData.email && <div className="text-sm text-gray-600">{organizationData.email}</div>}
                    </div>
                  </div>

                  {/* Right Side - Invoice Info */}
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900 mb-2">INVOICE</div>
                    <div className="text-sm text-gray-600 mb-2"># Will be generated automatically</div>
                    <div className="text-sm text-gray-600 mb-1">Balance Due</div>
                    <div className="text-2xl font-bold text-gray-900 mb-4">
                      {formatCurrency(recurringInvoice.total || 0, recurringInvoice.currency || "USD")}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Invoice Date : {nextInvoiceDate ? formatDate(nextInvoiceDate) : formatDate(recurringInvoice.startDate || recurringInvoice.startOn)}</div>
                      <div>Terms : {recurringInvoice.paymentTerms || "Due on Receipt"}</div>
                      <div>Due Date : {nextInvoiceDate ? formatDate(nextInvoiceDate) : formatDate(recurringInvoice.startDate || recurringInvoice.startOn)}</div>
                    </div>
                  </div>
                </div>

                {/* Bill To Section */}
                <div className="mb-6">
                  <div className="text-sm font-semibold text-gray-700 uppercase mb-2">Bill To</div>
                  <div className="text-base font-medium text-blue-600">{recurringInvoice.customerName || (typeof recurringInvoice.customer === 'object' ? (recurringInvoice.customer?.displayName || recurringInvoice.customer?.name) : recurringInvoice.customer) || "KOWNI"}</div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Item & Description</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Qty</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Rate</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recurringInvoice.items && recurringInvoice.items.length > 0 ? (
                        recurringInvoice.items.map((item, index) => {
                          const description = item.itemDetails || item.description || item.name || (item.item && item.item.name) || "-";
                          const quantity = parseFloat(item.quantity || item.qty || 0);
                          const rate = parseFloat(item.rate || item.unitPrice || item.price || 0);
                          const amount = parseFloat(item.amount || item.total || (rate * quantity) || 0);

                          return (
                            <tr key={item.id || index} className="border-b border-gray-200">
                              <td className="px-4 py-3 text-sm">{index + 1}</td>
                              <td className="px-4 py-3 text-sm">{description}</td>
                              <td className="px-4 py-3 text-sm text-right">{quantity.toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right">{rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-sm text-right">{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-sm text-center text-gray-500">No items</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Section */}
                <div className="flex justify-end mb-6">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sub Total</span>
                      <span className="text-gray-900">
                        {(recurringInvoice.subtotal || recurringInvoice.subTotal || recurringInvoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">
                        {formatCurrency(recurringInvoice.total || 0, recurringInvoice.currency || "USD")}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold bg-gray-100 px-3 py-2 rounded">
                      <span className="text-gray-900">Balance Due</span>
                      <span className="text-gray-900">
                        {formatCurrency(recurringInvoice.total || 0, recurringInvoice.currency || "USD")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {(recurringInvoice.customerNotes || recurringInvoice.termsAndConditions) && (
                  <div className="pt-6 border-t border-gray-200">
                    <div className="text-sm font-semibold text-gray-700 uppercase mb-2">Notes</div>
                    <div className="text-sm text-gray-600 whitespace-pre-line">
                      {recurringInvoice.customerNotes || recurringInvoice.termsAndConditions || "Thank you for the payment. You just made our day."}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "Recent Activities" && (
            <div className="p-6">
              <div className="relative max-w-4xl">
                {/* Timeline vertical line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-600"></div>

                <div className="space-y-6">
                  {/* Recurring Invoice Created Activity */}
                  <div className="relative flex items-start gap-6">
                    {/* Timeline circle */}
                    <div className="relative z-10 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>

                    {/* Activity Card */}
                    <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-xs text-gray-600">
                          {formatDate(recurringInvoice.createdAt || recurringInvoice.startOn)} • 01:10 PM
                        </div>
                      </div>
                      <div className="text-sm text-gray-900 mb-1">
                        Recurring Invoice created for {formatCurrency(recurringInvoice.total || 0, recurringInvoice.currency || "USD")}
                      </div>
                      <div className="text-xs text-gray-500">
                        by {recurringInvoice.createdBy || "JIRDE HUSSEIN KHALIF"}
                      </div>
                    </div>
                  </div>

                  {/* Child Invoice Activities */}
                  {childInvoices.length > 0 ? (
                    childInvoices
                      .sort((a, b) => new Date(String(b.date || b.createdAt || '')).getTime() - new Date(String(a.date || a.createdAt || '')).getTime())
                      .slice(0, 10)
                      .map((invoice) => {
                        const invoiceDate = new Date(String(invoice.date || invoice.createdAt || ''));
                        const formattedTime = invoiceDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                        return (
                          <div key={invoice.id} className="relative flex items-start gap-6">
                            {/* Timeline circle */}
                            <div className="relative z-10 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>

                            {/* Activity Card */}
                            <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-gray-600">
                                  {formatDate(invoice.date || invoice.createdAt)} • {formattedTime}
                                </div>
                              </div>
                              <div className="text-sm text-gray-900 mb-1">
                                Invoice created - {invoice.invoiceNumber || invoice.id}. Saved as draft
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                by {invoice.createdBy || "JIRDE HUSSEIN KHALIF"}
                              </div>
                              <button
                                onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                View the invoice
                              </button>
                            </div>
                          </div>
                        );
                      })
                  ) : null}

                  {childInvoices.length === 0 && (
                    <div className="relative flex items-start gap-6">
                      <div className="relative z-10 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                      <div className="flex-1 text-center py-8 text-gray-500 text-sm">
                        No recent activities
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
