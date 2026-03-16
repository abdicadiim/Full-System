import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChevronDown,
  Plus,
  MoreHorizontal,
  RefreshCw,
  Download,
  Settings,
  X,
  Edit,
  Info,
  User,
  FileText,
  Trash2,
} from "lucide-react";
import { salespersonsAPI, invoicesAPI } from "../../../services/api";
import { getCustomerById } from "../salesModel";
import { useUser } from "../../../lib/auth/UserContext";
import { runSubscriptionBillingSimulation } from "./subscriptionBilling";

const parseShortDate = (value?: string) => {
  if (!value) return "";
  const match = String(value).trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const month = monthMap[match[2]];
  if (!month) return "";
  return `${match[3]}-${month}-${day}`;
};

export default function SubscriptionDetailPage() {
  const navigate = useNavigate();
  const { subscriptionId } = useParams();
  const { user } = useUser();
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [detailMoreOpen, setDetailMoreOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState(() => {
    try {
      const raw = localStorage.getItem("taban_subscriptions_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [isUpdateSalespersonOpen, setIsUpdateSalespersonOpen] = useState(false);
  const [isManageContactsOpen, setIsManageContactsOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOtherReason, setCancelOtherReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [isChangeBillingOpen, setIsChangeBillingOpen] = useState(false);
  const [billingDateDraft, setBillingDateDraft] = useState("");
  const [billingReasonDraft, setBillingReasonDraft] = useState("");
  const [billingFormError, setBillingFormError] = useState("");
  const [selectedContactEmails, setSelectedContactEmails] = useState<string[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any | null>(null);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState("");
  const [coupons, setCoupons] = useState<
    Array<{
      id: string;
      couponName: string;
      couponCode: string;
      discountType: string;
      discountValue: number;
    }>
  >([]);
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "invoice" | "activity">("overview");
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const detailMoreRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => {
    if (!subscriptions.length) return null;
    if (subscriptionId) {
      return subscriptions.find((sub: any) => sub.id === subscriptionId) || subscriptions[0];
    }
    return subscriptions[0];
  }, [subscriptionId, subscriptions]);
  const selectedCount = selectedIds.length;
  const isAllSelected = selectedCount > 0 && selectedIds.length === subscriptions.length;
  const rawStatus = String(selected?.status || "LIVE").toUpperCase();
  const statusText = rawStatus === "UNPAID" ? "LIVE" : rawStatus;
  const statusClass =
    statusText === "UNPAID"
      ? "bg-red-100 text-red-600"
      : statusText === "CANCELLED" || statusText === "CANCELED"
      ? "bg-red-100 text-red-600"
      : "bg-[#e6f7f1] text-[#10a37f]";
  const listStatusClass = (status: string) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "UNPAID") return "text-red-500";
    if (normalized === "CANCELLED" || normalized === "CANCELED") return "text-red-500";
    if (normalized === "EXPIRED") return "text-gray-500";
    return "text-[#10a37f]";
  };
  const hasSelection = !!selected;
  const normalizeAddress = (addr: any) => {
    if (!addr || typeof addr !== "object") return null;
    const keys = [
      "attention",
      "country",
      "street1",
      "street2",
      "city",
      "state",
      "zipCode",
      "phone",
      "fax",
      "phoneNumber",
      "mobile",
      "mobilePhone",
    ];
    const hasValue = keys.some((key) => String(addr?.[key] || "").trim());
    return hasValue ? addr : null;
  };
  const billingAddress = normalizeAddress(selected?.billingAddress);
  const shippingAddress = normalizeAddress(selected?.shippingAddress);
  const customerEmail =
    String(
      customerProfile?.email ||
        customerProfile?.contactPersons?.find((p: any) => p?.isPrimary)?.email ||
        selected?.customerEmail ||
        selected?.contactPersons?.[0]?.email ||
        ""
    ).trim();
  const amountValue = Number(String(selected?.amount || "").replace(/[^\d.]/g, "")) || 0;
  const currencyCode = String(selected?.amount || "").match(/^[A-Za-z]+/)?.[0] || "AMD";
  const formatMoney = (value: number) => `${currencyCode}${Number(value || 0).toFixed(2)}`;
  type LineItem = {
    key: string;
    label: string;
    quantity: number;
    rate: number;
    tax: string;
    amount: number;
    description?: string;
    kind: "plan" | "addon";
    addonIndex?: number;
  };

  const lineItems: LineItem[] = useMemo(() => {
    if (!selected) return [];
    const rows: LineItem[] = [];
    if (selected.planName) {
      rows.push({
        key: "plan",
        label: selected.planName,
        quantity: Number(selected.quantity || 1) || 1,
        rate: Number(selected.price || 0) || 0,
        tax: String(selected.tax || "-"),
        amount: (Number(selected.quantity || 1) || 1) * (Number(selected.price || 0) || 0),
        description: String(selected.planDescription || ""),
        kind: "plan",
      });
    }
    const addons = Array.isArray(selected.addonLines) ? selected.addonLines : [];
    addons.forEach((addon: any, idx: number) => {
      if (!addon?.addonName) return;
      rows.push({
        key: `addon-${idx}`,
        label: String(addon.addonName),
        quantity: Number(addon.quantity || 0) || 0,
        rate: Number(addon.rate || 0) || 0,
        tax: String(addon.tax || "-"),
        amount: (Number(addon.quantity || 0) || 0) * (Number(addon.rate || 0) || 0),
        description: String(addon.description || ""),
        kind: "addon",
        addonIndex: idx,
      });
    });
    return rows;
  }, [selected]);
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = lineItems.reduce((sum, item) => {
    const rate = Number(String(item.tax || "").replace(/[^\d.]/g, "")) || 0;
    if (!rate) return sum;
    return sum + (item.amount * rate) / 100;
  }, 0);
  const parseCouponDiscount = (rawValue: string | undefined, baseAmount: number) => {
    const raw = String(rawValue || "").trim();
    if (!raw) return 0;
    const percentMatch = raw.match(/(-?\d+(\.\d+)?)\s*%/);
    if (percentMatch) {
      const pct = Number(percentMatch[1]) || 0;
      return (baseAmount * pct) / 100;
    }
    const numeric = Number(raw.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  };
  const couponDiscount = parseCouponDiscount(selected?.couponValue, subtotal);
  const total = Math.max(subtotal + taxAmount - couponDiscount, 0);
  const hasCouponApplied =
    couponDiscount > 0 ||
    Boolean(String(selected?.couponCode || "").trim()) ||
    Boolean(String(selected?.coupon || "").trim());

  const formatCouponValue = (coupon: { discountType: string; discountValue: number }) => {
    const normalized = String(coupon.discountType || "").toLowerCase();
    const isPercent = normalized.includes("percent") || normalized.includes("%");
    if (isPercent) return `${coupon.discountValue}%`;
    return `AMD${coupon.discountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const customerId = String(selected?.customerId || customerProfile?._id || customerProfile?.id || "").trim();
  const contactPersons = useMemo(() => {
    const list = Array.isArray(customerProfile?.contactPersons)
      ? customerProfile.contactPersons
      : Array.isArray(selected?.contactPersons)
      ? selected.contactPersons
      : [];
    const cleaned = list
      .map((row: any, idx: number) => ({
        id: String(row?.id || row?._id || row?.email || `cp-${idx}`),
        name: String(row?.name || row?.fullName || row?.displayName || "").trim(),
        email: String(row?.email || "").trim(),
      }))
      .filter((row: any) => row.email);
    if (cleaned.length) return cleaned;
    return customerEmail ? [{ id: "primary", name: selected?.customerName || "", email: customerEmail }] : [];
  }, [customerProfile?.contactPersons, selected?.contactPersons, selected?.customerName, customerEmail]);
  const salespersonName = useMemo(() => {
    const id = String(selected?.salesperson || selected?.salespersonId || "");
    if (!id) return "";
    const match = salespersons.find(
      (sp) => String(sp?._id || sp?.id || sp?.name) === id
    );
    return String(match?.name || match?.displayName || id).trim();
  }, [selected?.salesperson, selected?.salespersonId, salespersons]);

  const clearCouponForSelected = () => {
    if (!selected) return;
    const updated = subscriptions.map((sub: any) => {
      if (sub.id !== selected.id) return sub;
      return {
        ...sub,
        coupon: "",
        couponCode: "",
        couponValue: "0.00",
      };
    });
    setSubscriptions(updated);
    try {
      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const handleProceedCancel = () => {
    if (!selected) return;
    const reason =
      cancelReason === "Others" ? cancelOtherReason.trim() : cancelReason.trim();
    if (!reason) {
      setCancelError("Please select a reason for cancellation.");
      return;
    }
    const next = subscriptions.map((sub: any) => {
      if (sub.id !== selected.id) return sub;
      return {
        ...sub,
        status: "CANCELLED",
        cancellationReason: reason,
        scheduledCancellationDate: sub?.scheduledCancellationDate || new Date().toISOString(),
      };
    });
    setSubscriptions(next);
    try {
      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    setIsCancelModalOpen(false);
    setCancelReason("");
    setCancelOtherReason("");
    setCancelError("");
    toast.success("Subscription cancelled successfully.");
  };

  const applyCouponForSelected = () => {
    if (!selected) return;
    const chosen = coupons.find((row) => row.id === selectedCouponId);
    if (!chosen) {
      toast.error("Select a coupon to apply.");
      return;
    }
    const nextValue = formatCouponValue(chosen);
    const updated = subscriptions.map((sub: any) => {
      if (sub.id !== selected.id) return sub;
      return {
        ...sub,
        coupon: chosen.couponName,
        couponCode: chosen.couponCode,
        couponValue: nextValue,
      };
    });
    setSubscriptions(updated);
    try {
      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    setSelectedCouponId("");
    setIsAddCouponOpen(false);
    toast.success("Coupon applied successfully.");
  };

  const notes = Array.isArray(selected?.notes) ? selected.notes : [];
  const formatNoteDate = (value: string) =>
    new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatDisplayDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    if (activeTab !== "invoice" || !selected?.id) return;
    let mounted = true;
    const loadInvoices = async () => {
      setInvoiceLoading(true);
      try {
        const response = await invoicesAPI.getAll({ limit: 1000 });
        const rows = Array.isArray(response?.data) ? response.data : [];
        const normalized = rows.map((inv: any) => ({
          id: String(inv?._id || inv?.id || ""),
          invoiceNumber: String(inv?.invoiceNumber || inv?.number || inv?.invoiceNo || "").trim(),
          invoiceDate: String(inv?.invoiceDate || inv?.date || inv?.createdAt || "").trim(),
          total: Number(inv?.total ?? inv?.amount ?? inv?.balance ?? 0) || 0,
          status: String(inv?.status || "draft").toUpperCase(),
          recurringProfileId: String(inv?.recurringProfileId || inv?.subscriptionId || inv?.recurringId || ""),
          referenceNumber: String(inv?.referenceNumber || "").trim(),
          subscriptionNumber: String(inv?.subscriptionNumber || "").trim(),
          customerId: String(inv?.customerId || ""),
        }));
        const filtered = normalized.filter((inv: any) => {
          if (inv.recurringProfileId && String(inv.recurringProfileId) === String(selected?.id)) return true;
          if (inv.subscriptionNumber && inv.subscriptionNumber === String(selected?.subscriptionNumber || "")) return true;
          if (inv.referenceNumber && inv.referenceNumber === String(selected?.referenceNumber || "")) return true;
          return false;
        });
        if (mounted) setInvoiceHistory(filtered);
      } catch {
        try {
          const raw = localStorage.getItem("taban_books_invoices");
          const parsed = raw ? JSON.parse(raw) : [];
          const rows = Array.isArray(parsed) ? parsed : [];
          const normalized = rows.map((inv: any) => ({
            id: String(inv?._id || inv?.id || ""),
            invoiceNumber: String(inv?.invoiceNumber || inv?.number || inv?.invoiceNo || "").trim(),
            invoiceDate: String(inv?.invoiceDate || inv?.date || inv?.createdAt || "").trim(),
            total: Number(inv?.total ?? inv?.amount ?? inv?.balance ?? 0) || 0,
            status: String(inv?.status || "draft").toUpperCase(),
            recurringProfileId: String(inv?.recurringProfileId || inv?.subscriptionId || inv?.recurringId || ""),
            referenceNumber: String(inv?.referenceNumber || "").trim(),
            subscriptionNumber: String(inv?.subscriptionNumber || "").trim(),
          }));
          const filtered = normalized.filter((inv: any) => {
            if (inv.recurringProfileId && String(inv.recurringProfileId) === String(selected?.id)) return true;
            if (inv.subscriptionNumber && inv.subscriptionNumber === String(selected?.subscriptionNumber || "")) return true;
            if (inv.referenceNumber && inv.referenceNumber === String(selected?.referenceNumber || "")) return true;
            return false;
          });
          if (mounted) setInvoiceHistory(filtered);
        } catch {
          if (mounted) setInvoiceHistory([]);
        }
      } finally {
        if (mounted) setInvoiceLoading(false);
      }
    };
    loadInvoices();
    return () => {
      mounted = false;
    };
  }, [activeTab, selected?.id, selected?.subscriptionNumber, selected?.referenceNumber]);

  const saveNoteForSelected = () => {
    if (!selected) return;
    const text = noteDraft.trim();
    if (!text) {
      setIsAddNoteOpen(false);
      return;
    }
    const authorName = String(user?.name || user?.email || "You");
    const newNote = {
      id: `note-${Date.now()}`,
      text,
      author: authorName,
      createdAt: new Date().toISOString(),
    };
    const updated = subscriptions.map((sub: any) => {
      if (sub.id !== selected.id) return sub;
      const existingNotes = Array.isArray(sub.notes) ? sub.notes : [];
      return { ...sub, notes: [newNote, ...existingNotes] };
    });
    setSubscriptions(updated);
    try {
      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    setIsAddNoteOpen(false);
  };

  const deleteNoteForSelected = (noteId: string) => {
    if (!selected) return;
    const updated = subscriptions.map((sub: any) => {
      if (sub.id !== selected.id) return sub;
      const existingNotes = Array.isArray(sub.notes) ? sub.notes : [];
      return { ...sub, notes: existingNotes.filter((note: any) => String(note.id) !== String(noteId)) };
    });
    setSubscriptions(updated);
    try {
      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const saveBillingDateChange = () => {
    if (!selected) return;
    if (!billingDateDraft) {
      setBillingFormError("Please select a new billing date.");
      return;
    }
    if (!billingReasonDraft.trim()) {
      setBillingFormError("Please enter a reason.");
      return;
    }
    const formattedDate = formatDisplayDate(billingDateDraft);
    const updated = subscriptions.map((sub: any) => {
      if (sub.id !== selected.id) return sub;
      return {
        ...sub,
        nextBillingOn: formattedDate,
        nextBillingReason: billingReasonDraft.trim(),
      };
    });
    setSubscriptions(updated);
    try {
      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    setIsChangeBillingOpen(false);
  };

  const updateLineItemDescription = (item: LineItem, value: string) => {
    if (!selected) return;
    const updated = subscriptions.map((sub: any) => {
      if (sub.id !== selected.id) return sub;
      if (item.kind === "plan") {
        return { ...sub, planDescription: value };
      }
      const addonLines = Array.isArray(sub.addonLines) ? [...sub.addonLines] : [];
      if (item.addonIndex !== undefined && addonLines[item.addonIndex]) {
        addonLines[item.addonIndex] = { ...addonLines[item.addonIndex], description: value };
      }
      return { ...sub, addonLines };
    });
    setSubscriptions(updated);
    try {
      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const readRows = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    runSubscriptionBillingSimulation();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (detailMoreRef.current && !detailMoreRef.current.contains(e.target as Node)) {
        setDetailMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem("taban_subscriptions_v1");
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          setSubscriptions(parsed);
          return;
        }
      } catch {
        // ignore storage errors
      }
      setSubscriptions([]);
    };
    load();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "taban_subscriptions_v1") load();
    };
    const onFocus = () => load();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!isAddChargeOpen || !selected) return;
    const raw = String(selected.amount || "");
    const numeric = raw.replace(/[^\d.]/g, "");
    setChargeAmount(numeric || "");
  }, [isAddChargeOpen, selected]);

  useEffect(() => {
    const loadCoupons = () => {
      try {
        const rows = readRows("inv_coupons_v1");
        const mapped = rows
          .map((row: any, idx: number) => ({
            id: String(row?.id || row?._id || `coupon-${idx}`),
            couponName: String(row?.couponName || row?.name || "").trim(),
            couponCode: String(row?.couponCode || row?.code || "").trim(),
            discountType: String(row?.discountType || row?.type || "Flat"),
            discountValue: Number(row?.discountValue ?? row?.value ?? 0) || 0,
          }))
          .filter((row: any) => row.couponName && row.couponCode);
        setCoupons(mapped);
      } catch {
        setCoupons([]);
      }
    };
    loadCoupons();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "inv_coupons_v1") loadCoupons();
    };
    const onFocus = () => loadCoupons();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const loadSalespersons = async () => {
      try {
        const response = await salespersonsAPI.getAll({ limit: 10000 });
        const rows = Array.isArray(response?.data) ? response.data : [];
        setSalespersons(rows);
      } catch {
        setSalespersons([]);
      }
    };
    loadSalespersons();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "taban_books_salespersons") loadSalespersons();
    };
    const onFocus = () => loadSalespersons();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const loadCustomer = async () => {
      const customerId = String(selected?.customerId || "").trim();
      const customerName = String(selected?.customerName || "").trim().toLowerCase();
      const cachedKeys = ["taban_books_customers", "taban_customers", "customers"];
      let cached: any[] = [];
      for (const key of cachedKeys) {
        try {
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) cached = cached.concat(parsed);
        } catch {
          // ignore cache parse errors
        }
      }
      const normalizedId = customerId.toLowerCase();
      const match =
        cached.find((row: any) => String(row?._id || row?.id || "").toLowerCase() === normalizedId) ||
        cached.find((row: any) => String(row?.customerId || "").toLowerCase() === normalizedId) ||
        cached.find((row: any) => String(row?.displayName || row?.name || "").trim().toLowerCase() === customerName) ||
        null;
      if (match) {
        setCustomerProfile(match);
        return;
      }
      if (!customerId) {
        setCustomerProfile(null);
        return;
      }
      try {
        const apiCustomer = await getCustomerById(customerId);
        if (apiCustomer) {
          setCustomerProfile(apiCustomer);
        }
      } catch {
        // ignore API errors
      }
    };
    loadCustomer();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || ["taban_books_customers", "taban_customers", "customers"].includes(event.key)) {
        loadCustomer();
      }
    };
    const onFocus = () => loadCustomer();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [selected?.customerId, selected?.customerName]);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden bg-white font-sans text-gray-800 antialiased">
      <div className="w-[320px] border-r border-gray-200 flex flex-col h-full">
        {selectedCount === 0 && (
          <div className="flex items-center justify-between px-6 border-b border-gray-100 bg-white h-[60px] shrink-0">
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <h1 className="text-[17px] font-bold text-slate-900">All Subscriptions</h1>
              <ChevronDown
                size={16}
                className={`text-blue-500 transition-transform ${filterDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {filterDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] py-2">
                {["All Subscriptions", "Active", "Pending", "Cancelled", "Expired"].map((view) => (
                  <button
                    key={view}
                    onClick={() => setFilterDropdownOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    {view}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/sales/subscriptions/new")}
              className="flex items-center gap-1 bg-[#10a37f] hover:bg-[#0e8a6b] text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-all shadow-sm"
            >
              <Plus size={16} />
            </button>
            <div className="relative" ref={moreDropdownRef}>
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <MoreHorizontal size={16} className="text-gray-500" />
              </button>
              {moreDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <RefreshCw size={14} /> Refresh
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Download size={14} /> Export
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Settings size={14} /> Subscriptions Preferences
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {selectedCount > 0 && (
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(subscriptions.map((row: any) => row.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Bulk Actions
              </label>
              <button className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700">
                Bulk Actions
              </button>
              <div className="h-5 w-px bg-gray-200" />
              <span className="text-sm text-gray-700">
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                  {selectedCount}
                </span>{" "}
                Selected
              </span>
              <button
                className="ml-auto text-gray-400 hover:text-gray-600"
                onClick={() => setSelectedIds([])}
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="divide-y divide-gray-100">
          {subscriptions.map((sub: any) => (
            <button
              key={sub.id}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors ${
                sub.id === selected?.id ? "bg-[#f5f7fb]" : ""
              }`}
              onClick={() => navigate(`/sales/subscriptions/${sub.id}`)}
            >
              <div className="pt-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  checked={selectedIds.includes(sub.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => {
                    setSelectedIds((prev) =>
                      prev.includes(sub.id) ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                    );
                  }}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{sub.customerName}</span>
                  <span className="text-sm font-semibold text-slate-900">{sub.amount}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Next Renewal on {sub.nextBillingOn}</div>
                <span className={`inline-flex text-[11px] font-bold tracking-wide mt-2 ${listStatusClass(sub.status)}`}>
                  {String(sub.status || "").toUpperCase() || "LIVE"}
                </span>
              </div>
            </button>
          ))}
          </div>
        </div>
      </div>

      {hasSelection ? (
      <div className="flex-1 overflow-y-auto h-full bg-slate-50">
        <div className="sticky top-0 z-[30] bg-white">
          <div className="flex items-start justify-between px-8 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[18px] font-semibold text-slate-900">
              {selected.customerName} - {selected.planName} (DD)
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>#{selected.subscriptionNumber}</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusClass}`}>{statusText}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1"
              onClick={() => {
                const amountText = String(selected?.amount || "");
                const currencyMatch = amountText.match(/^[A-Za-z]+/);
                const currency = currencyMatch ? currencyMatch[0] : "USD";
                const price = Number(amountText.replace(/[^\d.]/g, "")) || 0;
                const draft = {
                  id: String(selected?.id || ""),
                  customerId: String(selected?.customerId || ""),
                  customerName: String(selected?.customerName || ""),
                  contactPersons: Array.isArray(selected?.contactPersons)
                    ? selected.contactPersons
                    : selected?.customerEmail
                    ? [{ email: selected.customerEmail }]
                    : [],
                  billingAddress: selected?.billingAddress ?? null,
                  shippingAddress: selected?.shippingAddress ?? null,
                  currency,
                  productId: String(selected?.productId || ""),
                  productName: String(selected?.productName || selected?.planName || ""),
                  planName: String(selected?.planName || ""),
                  planDescription: String(selected?.planDescription || ""),
                  quantity: Number(selected?.quantity || 1) || 1,
                  price,
                  basePrice: Number(selected?.basePrice || 0) || 0,
                  tax: String(selected?.tax || ""),
                  taxRate: Number(selected?.taxRate || 0) || 0,
                  taxPreference: String(selected?.taxPreference || "Tax Exclusive"),
                  contentType: String(selected?.contentType || "product"),
                  items: Array.isArray(selected?.items) ? selected.items : [],
                  customerNotes: String(selected?.customerNotes || ""),
                  expiresAfter: String(selected?.expiresAfter || ""),
                  neverExpires: Boolean(selected?.neverExpires ?? false),
                  tag: String(selected?.tag || ""),
                  reportingTags: Array.isArray(selected?.reportingTags) ? selected.reportingTags : [],
                  startDate: parseShortDate(selected?.activatedOn || ""),
                  coupon: String(selected?.coupon || ""),
                  couponCode: String(selected?.couponCode || ""),
                  couponValue: String(selected?.couponValue || ""),
                  addonLines: Array.isArray(selected?.addonLines) ? selected.addonLines : [],
                  priceListId: String(selected?.priceListId || ""),
                  priceListName: String(selected?.priceListName || ""),
                  location: String(selected?.location || ""),
                  subscriptionNumber: String(selected?.subscriptionNumber || ""),
                  referenceNumber: String(selected?.referenceNumber || ""),
                  salesperson: String(selected?.salesperson || selected?.salespersonId || ""),
                  salespersonName: String(selected?.salespersonName || ""),
                  meteredBilling: Boolean(selected?.meteredBilling ?? false),
                  paymentMode: String(selected?.paymentMode || "offline"),
                  paymentTerms: String(selected?.paymentTerms || "Due on Receipt"),
                  partialPayments: Boolean(selected?.partialPayments ?? false),
                  prorateCharges: Boolean(selected?.prorateCharges ?? true),
                  generateInvoices: Boolean(selected?.generateInvoices ?? true),
                  invoiceTemplate: String(selected?.invoiceTemplate || "Standard Template"),
                  roundOffPreference: String(selected?.roundOffPreference || "No Rounding"),
                  createdOn: String(selected?.createdOn || ""),
                  activatedOn: String(selected?.activatedOn || ""),
                  lastBilledOn: String(selected?.lastBilledOn || ""),
                  nextBillingOn: String(selected?.nextBillingOn || ""),
                  status: String(selected?.status || ""),
                };
                navigate(`/sales/subscriptions/${selected?.id || "unknown"}/edit`, { state: { draft } });
              }}
            >
              <Edit size={14} />
              Edit
            </button>
            <div className="relative" ref={detailMoreRef}>
              <button
                onClick={() => setDetailMoreOpen(!detailMoreOpen)}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1"
              >
                More <ChevronDown size={14} />
              </button>
              {detailMoreOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-xl z-[20] overflow-hidden">
                  {!hasCouponApplied && (
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setDetailMoreOpen(false);
                        setIsAddCouponOpen(true);
                      }}
                    >
                      Add Coupon
                    </button>
                  )}
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setDetailMoreOpen(false);
                      const productName =
                        String(selected?.productName || selected?.planName || "").trim();
                      const query = productName ? `?product=${encodeURIComponent(productName)}` : "";
                      navigate(`/products/addons/new${query}`);
                    }}
                  >
                    Add One Time Addon
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setDetailMoreOpen(false);
                      setIsAddChargeOpen(true);
                    }}
                  >
                    Add Charge
                  </button>
                  <div className="h-px bg-gray-100" />
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setDetailMoreOpen(false);
                    }}
                  >
                    Create Quote
                  </button>
                  <div className="h-px bg-gray-100" />
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setDetailMoreOpen(false);
                    }}
                  >
                    Update Custom Fields
                  </button>
                  <div className="h-px bg-gray-100" />
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setDetailMoreOpen(false);
                    }}
                  >
                    Disable Metered Billing
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setDetailMoreOpen(false);
                      setCancelReason("");
                      setCancelOtherReason("");
                      setCancelError("");
                      setIsCancelModalOpen(true);
                    }}
                  >
                    Cancel Subscription
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (!selected?.id) return;
                      setDetailMoreOpen(false);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete Subscription
                  </button>
                </div>
              )}
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600" onClick={() => navigate("/sales/subscriptions")}>
              <X size={18} />
            </button>
          </div>
          </div>
          <div className="px-8 border-b border-gray-200 bg-white">
            <div className="flex gap-6 text-sm">
              {[
                { key: "overview", label: "Overview" },
                { key: "invoice", label: "Invoice History" },
                { key: "activity", label: "Recent Activities" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`py-3 border-b-2 ${
                    activeTab === tab.key ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab(tab.key as "overview" | "invoice" | "activity")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="px-8 py-3">
            <div className="max-w-[1240px] w-full grid grid-cols-[360px_minmax(0,1fr)] gap-8">
              <div className="space-y-4 pr-10 border-r border-gray-200">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">Taban Enterprise</h3>
                  <div className="mt-3 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <User size={20} />
                    </div>
                    <div>
                      <button
                        type="button"
                        className="text-sm font-semibold text-blue-600 hover:underline"
                        onClick={() => {
                          if (customerId) {
                            navigate(`/sales/customers/${customerId}`);
                          }
                        }}
                      >
                        {selected.customerName}
                      </button>
                    <div className="text-xs text-gray-500">{customerEmail}</div>
                  </div>
                </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">Address</h3>
                  <div className="mt-3 text-sm text-gray-700 space-y-3">
                    <div>
                      <div className="text-xs text-gray-500">Billing Address</div>
                      {billingAddress ? (
                        <>
                          {billingAddress.attention && (
                            <div className="mt-1 font-semibold text-gray-900">{billingAddress.attention}</div>
                          )}
                          {billingAddress.street1 && <div>{billingAddress.street1}</div>}
                          {billingAddress.street2 && <div>{billingAddress.street2}</div>}
                          {(billingAddress.city || billingAddress.state) && (
                            <div>
                              {[billingAddress.city, billingAddress.state].filter(Boolean).join(", ")}
                            </div>
                          )}
                          {(billingAddress.zipCode || billingAddress.country) && (
                            <div>
                              {[billingAddress.zipCode, billingAddress.country].filter(Boolean).join(" ")}
                            </div>
                          )}
                          {(billingAddress.phone || billingAddress.phoneNumber || billingAddress.mobile || billingAddress.mobilePhone) && (
                            <div>
                              Phone:{" "}
                              {billingAddress.phone ||
                                billingAddress.phoneNumber ||
                                billingAddress.mobile ||
                                billingAddress.mobilePhone}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-400">No billing address saved.</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Shipping Address</div>
                      {shippingAddress ? (
                        <>
                          {shippingAddress.attention && (
                            <div className="mt-1 font-semibold text-gray-900">{shippingAddress.attention}</div>
                          )}
                          {shippingAddress.street1 && <div>{shippingAddress.street1}</div>}
                          {shippingAddress.street2 && <div>{shippingAddress.street2}</div>}
                          {(shippingAddress.city || shippingAddress.state) && (
                            <div>
                              {[shippingAddress.city, shippingAddress.state].filter(Boolean).join(", ")}
                            </div>
                          )}
                          {(shippingAddress.zipCode || shippingAddress.country) && (
                            <div>
                              {[shippingAddress.zipCode, shippingAddress.country].filter(Boolean).join(" ")}
                            </div>
                          )}
                          {(shippingAddress.phone || shippingAddress.phoneNumber || shippingAddress.mobile || shippingAddress.mobilePhone) && (
                            <div>
                              Phone:{" "}
                              {shippingAddress.phone ||
                                shippingAddress.phoneNumber ||
                                shippingAddress.mobile ||
                                shippingAddress.mobilePhone}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-400">No shipping address saved.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">Subscription Options</h3>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between"><span>Subscription ID</span><span className="text-gray-900">8340042000000108287</span></div>
                    <div className="flex justify-between"><span>Subscription Number</span><span className="text-gray-900">{selected.subscriptionNumber}</span></div>
                  <div className="flex justify-between"><span>Autocharge</span><span className="text-gray-900">Disabled</span></div>
                  <div className="flex justify-between"><span>Reference Number</span><span className="text-gray-900">{selected.referenceNumber || "sc"}</span></div>
                  <div className="flex justify-between items-start">
                    <span>Salesperson</span>
                    <div className="text-right">
                      <div className="text-gray-900">{salespersonName || "Not set"}</div>
                      <button
                        className="text-blue-600 text-xs"
                        onClick={() => {
                          setSelectedSalespersonId(String(selected?.salesperson || selected?.salespersonId || ""));
                          setIsUpdateSalespersonOpen(true);
                        }}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  </div>
                </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase">Associated Contacts</h3>
                <div className="mt-3 text-sm text-gray-700">
                  {customerEmail || "No contact email"}
                  <div>
                    <button
                      className="text-blue-600 text-xs mt-1"
                      onClick={() => {
                        const existingSelection = Array.isArray(selected?.contactPersons)
                          ? selected.contactPersons.map((c: any) => String(c?.email || "").trim()).filter(Boolean)
                          : [];
                        const fallback = contactPersons.map((c) => c.email);
                        setSelectedContactEmails(existingSelection.length ? existingSelection : fallback);
                        setIsManageContactsOpen(true);
                      }}
                    >
                      Manage Contact Persons
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase">Other Details</h3>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between"><span>Repeat Every</span><span className="text-gray-900">1 month(s)</span></div>
                  <div className="flex justify-between"><span>Activation Date</span><span className="text-gray-900">{selected.activatedOn}</span></div>
                  <div className="flex justify-between"><span>Current Cycle Start</span><span className="text-gray-900">{selected.lastBilledOn}</span></div>
                  <div className="flex justify-between"><span>Current Cycle End</span><span className="text-gray-900">{selected.nextBillingOn}</span></div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase">Customer Notes</h3>
                <div className="mt-3 text-sm text-gray-600">Looking forward for your business.</div>
              </div>
            </div>

              <div className="space-y-6">
              <div className="grid grid-cols-4 gap-6 text-sm">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Subscription Amount</div>
                  <div className="text-lg font-semibold text-slate-900">{selected.amount}</div>
                  <div className="text-xs text-gray-500">1 month(s)</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Next Billing Date</div>
                  <div className="text-lg font-semibold text-slate-900">{selected.nextBillingOn}</div>
                  <button
                    type="button"
                    className="text-blue-600 text-xs"
                    onClick={() => {
                      const pref = parseShortDate(selected?.nextBillingOn);
                      setBillingDateDraft(pref);
                      setBillingReasonDraft("");
                      setBillingFormError("");
                      setIsChangeBillingOpen(true);
                    }}
                  >
                    Change
                  </button>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Last Billing Date</div>
                  <div className="text-lg font-semibold text-slate-900">{selected.lastBilledOn}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-[#22c55e]">Renews Forever</div>
                  <div className="text-lg font-semibold text-slate-900">{"\u221e"}</div>
                </div>
              </div>

              {selected?.priceListName && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 flex items-center gap-2">
                  <Info size={14} className="text-gray-400" />
                  <span>The applied pricelist is</span>
                  <span className="text-gray-900 font-semibold">{selected.priceListName}</span>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Item Details</h3>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="grid grid-cols-6 bg-gray-50 text-[11px] font-semibold text-slate-500 px-3 py-2 uppercase">
                    <span className="col-span-2">Item Details</span>
                    <span className="text-right">Quantity</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Tax</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {lineItems.map((item) => (
                    <div key={item.key} className="group grid grid-cols-6 px-3 py-3 text-sm text-gray-700 border-t border-gray-100 first:border-t-0">
                      <div className="col-span-2">
                        <div className="uppercase">{item.label}</div>
                        {item.description && <div className="text-xs text-gray-400">{item.description}</div>}
                        <button
                          type="button"
                          className="mt-1 text-xs text-blue-600 no-underline hover:no-underline opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
                          onClick={() => {
                            setEditingItemKey(item.key);
                            setDescriptionDraft(item.description || "");
                          }}
                        >
                          {item.description ? "edit description" : "+ add description"}
                        </button>
                        {editingItemKey === item.key && (
                          <div className="mt-2 rounded border border-gray-200 bg-white p-2">
                            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                              <span>Item Description</span>
                              <button
                                type="button"
                                className="h-5 w-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
                                onClick={() => {
                                  setEditingItemKey(null);
                                  setDescriptionDraft("");
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <textarea
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
                              rows={3}
                              value={descriptionDraft}
                              onChange={(e) => setDescriptionDraft(e.target.value)}
                              placeholder="Add a description for your item"
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                className="px-3 py-1 text-xs font-semibold text-white rounded bg-[#10a37f] hover:bg-[#0e8a6b]"
                                onClick={() => {
                                  updateLineItemDescription(item, descriptionDraft.trim());
                                  setEditingItemKey(null);
                                  setDescriptionDraft("");
                                }}
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                                onClick={() => {
                                  setEditingItemKey(null);
                                  setDescriptionDraft("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-right">{item.quantity}</span>
                      <span className="text-right">{formatMoney(item.rate)}</span>
                      <span className="text-right">{item.tax || "-"}</span>
                      <span className="text-right">{formatMoney(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 px-3 py-3 text-sm text-gray-700 flex justify-end">
                    <div className="w-56 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Sub Total</span>
                        <span>{formatMoney(subtotal)}</span>
                      </div>
                      {taxAmount > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Tax</span>
                          <span>{formatMoney(taxAmount)}</span>
                        </div>
                      )}
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Coupon ({selected?.couponCode || selected?.coupon || "Discount"})</span>
                          <span>-{formatMoney(couponDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Round Off</span>
                        <span>{formatMoney(0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 px-3 py-3 text-sm text-gray-700 flex items-center justify-between">
                    <div className="min-w-0">
                      {(couponDiscount > 0 || selected?.couponCode || selected?.coupon) && (
                        <div className="flex flex-col text-xs text-gray-500">
                          <span>
                            Inclusive of {selected?.couponCode || selected?.coupon || "Coupon"}
                          </span>
                          <button
                            type="button"
                            className="text-blue-600 hover:underline"
                            onClick={clearCouponForSelected}
                          >
                            Remove Coupon
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-900 uppercase">Total</div>
                      <div className="font-semibold text-gray-900">{formatMoney(total || amountValue)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                  Notes <Info size={12} className="text-gray-400" />
                  <button
                    type="button"
                    className="text-blue-600 font-normal uppercase"
                    onClick={() => {
                      setNoteDraft("");
                      setIsAddNoteOpen(true);
                    }}
                  >
                    + Add
                  </button>
                </div>
                {notes.length === 0 ? (
                  <div className="mt-2 text-sm text-gray-600">
                    There are no notes added for this subscription.
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {notes.map((note: any) => (
                      <div key={note.id} className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <FileText size={16} className="text-gray-400 mt-0.5" />
                          <div className="text-sm text-gray-800">
                            <div>{note.text}</div>
                            <div className="text-xs text-gray-500">- {note.author || "You"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{note.createdAt ? formatNoteDate(note.createdAt) : ""}</span>
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-600"
                            onClick={() => deleteNoteForSelected(String(note.id))}
                            title="Delete note"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        )}

        {isAddNoteOpen && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40">
            <div className="mt-20 w-full max-w-[640px] bg-white rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                <h3 className="text-[15px] font-semibold text-gray-900">Note</h3>
                <button
                  type="button"
                  className="h-7 w-7 rounded border border-red-400 text-red-500 flex items-center justify-center hover:bg-red-50"
                  onClick={() => setIsAddNoteOpen(false)}
                >
                  {"\u00D7"}
                </button>
              </div>
              <div className="px-5 py-4">
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={4}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-[#10a37f] hover:bg-[#0e8a6b] text-white rounded-md text-sm font-semibold"
                  onClick={saveNoteForSelected}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-semibold"
                  onClick={() => setIsAddNoteOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isChangeBillingOpen && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40">
            <div className="mt-16 w-full max-w-[720px] bg-white rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                <h3 className="text-[15px] font-semibold text-gray-900">Change Next Billing Date</h3>
                <button
                  type="button"
                  className="h-7 w-7 rounded border border-red-400 text-red-500 flex items-center justify-center hover:bg-red-50"
                  onClick={() => setIsChangeBillingOpen(false)}
                >
                  {"\u00D7"}
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                  The next billing date is currently{" "}
                  <span className="font-semibold text-gray-800">{selected?.nextBillingOn || "-"}</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Billing Date</label>
                  <input
                    type="date"
                    value={billingDateDraft}
                    onChange={(e) => setBillingDateDraft(e.target.value)}
                    className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Reason<span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                    value={billingReasonDraft}
                    onChange={(e) => setBillingReasonDraft(e.target.value)}
                    placeholder="Enter a reason for making this change. It will be displayed in the Recent Activities section."
                  />
                  <div className="mt-1 text-[11px] text-gray-400">Max. 500 characters</div>
                </div>
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                  Note: Your customer will not be charged or credited for any changes that you make to the next billing date.
                </div>
                {billingFormError && <div className="text-xs text-red-600">{billingFormError}</div>}
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-[#10a37f] hover:bg-[#0e8a6b] text-white rounded-md text-sm font-semibold"
                  onClick={saveBillingDateChange}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-semibold"
                  onClick={() => setIsChangeBillingOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isAddCouponOpen && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40">
            <div className="mt-20 w-full max-w-[520px] bg-white rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-[16px] font-semibold text-gray-900">Add Coupon</h3>
                <button
                  className="h-7 w-7 rounded border border-blue-500 text-blue-500 flex items-center justify-center hover:bg-blue-50"
                  onClick={() => setIsAddCouponOpen(false)}
                >
                  {"\u00D7"}
                </button>
              </div>

              <div className="px-5 py-5">
                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-600 w-28">Select Coupon</label>
                  <div className="flex-1">
                    <select
                      value={selectedCouponId}
                      onChange={(e) => setSelectedCouponId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                    >
                      <option value="">Select Coupon</option>
                      {coupons.map((coupon) => (
                        <option key={coupon.id} value={coupon.id}>
                          {coupon.couponName} ({coupon.couponCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-2">
                <button
                  className="px-4 py-2 bg-[#10a37f] hover:bg-[#0e8a6b] text-white rounded-md text-sm font-semibold"
                  onClick={applyCouponForSelected}
                >
                  Apply
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm"
                  onClick={() => setIsAddCouponOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isAddChargeOpen && (
          <div className="fixed inset-0 z-[210] flex items-start justify-center bg-black/40">
            <div className="mt-14 w-full max-w-[760px] bg-white rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-[16px] font-semibold text-gray-900">Add Charge</h3>
                <button
                  className="h-7 w-7 rounded text-red-500 flex items-center justify-center hover:bg-red-50"
                  onClick={() => setIsAddChargeOpen(false)}
                >
                  {"\u00D7"}
                </button>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-[1fr_1.4fr] gap-6 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex gap-4 border-r border-gray-100 pr-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <User size={20} />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-gray-500">Customer Name</div>
                        <div className="text-sm font-medium text-gray-900">{selected.customerName}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Subscription#</div>
                        <div className="text-sm font-medium text-gray-900">{selected.subscriptionNumber}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-red-500">Amount*</label>
                    <div className="mt-2 flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                      <span className="text-gray-500">{currencyCode}</span>
                      <input
                        className="flex-1 outline-none"
                        placeholder="0.00"
                        value={chargeAmount}
                        onChange={(e) => setChargeAmount(e.target.value)}
                      />
                    </div>
                    <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
                      <input type="checkbox" />
                      Allow partial payments
                    </label>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-700">Account</label>
                    <select className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option>Sales</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Location</label>
                    <select className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option>Head Office</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-red-500">Reason*</label>
                    <textarea
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      rows={3}
                      placeholder="This will be displayed in the line item details of the invoice sent to your customer."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Description</label>
                    <textarea
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Mention why you are adding this charge."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 uppercase text-[11px] tracking-wide">Reporting Tags</label>
                    <select className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option>None</option>
                    </select>
                  </div>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  Note: An invoice will be generated for this amount and sent to your customer.
                </p>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-2">
                <button
                  className="px-4 py-2 bg-[#10a37f] hover:bg-[#0e8a6b] text-white rounded-md text-sm font-semibold"
                  onClick={() => {
                    setIsAddChargeOpen(false);
                    toast.success("Charge added successfully.");
                  }}
                >
                  Charge
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm"
                  onClick={() => setIsAddChargeOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isUpdateSalespersonOpen && (
          <div className="fixed inset-0 z-[220] flex items-start justify-center bg-black/40">
            <div className="mt-16 w-full max-w-[520px] bg-white rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-[16px] font-semibold text-gray-900">Update Sales Person</h3>
                <button
                  className="h-6 w-6 rounded text-red-500 flex items-center justify-center hover:bg-red-50"
                  onClick={() => setIsUpdateSalespersonOpen(false)}
                >
                  {"\u00D7"}
                </button>
              </div>
              <div className="px-5 py-5">
                <select
                  value={selectedSalespersonId}
                  onChange={(e) => setSelectedSalespersonId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                >
                  <option value="">Select a salesperson</option>
                  {salespersons.map((sp) => (
                    <option key={String(sp?._id || sp?.id || sp?.name)} value={String(sp?._id || sp?.id || sp?.name)}>
                      {String(sp?.name || sp?.displayName || sp?.email || sp?.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-2">
                <button
                  className="px-4 py-2 bg-[#10a37f] hover:bg-[#0e8a6b] text-white rounded-md text-sm font-semibold"
                  onClick={() => {
                    const nextId = String(selectedSalespersonId || "");
                    const salespersonName =
                      String(
                        salespersons.find((sp) =>
                          String(sp?._id || sp?.id || sp?.name) === nextId
                        )?.name || ""
                      ).trim();
                    const updated = subscriptions.map((row: any) =>
                      row.id === selected?.id
                        ? {
                            ...row,
                            salesperson: nextId,
                            salespersonId: nextId,
                            salespersonName: salespersonName || row.salespersonName,
                          }
                        : row
                    );
                    setSubscriptions(updated);
                    try {
                      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
                    } catch {
                      // ignore storage errors
                    }
                    setIsUpdateSalespersonOpen(false);
                  }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[220] flex items-start justify-center bg-black/50 pt-8 px-4 pb-8 overflow-y-auto">
            <div className="w-full max-w-[760px] rounded-xl bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#fbfbfd]">
                <div className="text-[16px] font-medium text-gray-800">Configure Cancel Subscription</div>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="h-8 w-8 rounded-md border border-blue-500 bg-white flex items-center justify-center hover:bg-blue-50"
                  aria-label="Close"
                >
                  <X size={16} className="text-red-500" />
                </button>
              </div>

              <div className="px-8 py-6">
                <div className="text-sm font-medium text-red-500 mb-3">Reason for Cancellation*</div>

                <div className="space-y-2">
                  {["Doesn't meet my needs", "Found a better alternative", "Very Expensive", "Others"].map((reason) => (
                    <label key={reason} className="flex items-center gap-3 text-sm text-gray-800 cursor-pointer">
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={() => {
                          setCancelReason(reason);
                          setCancelError("");
                        }}
                        className="h-4 w-4"
                        style={{ accentColor: "#14b8a6" }}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                {cancelReason === "Others" && (
                  <div className="mt-4">
                    <input
                      value={cancelOtherReason}
                      onChange={(e) => {
                        setCancelOtherReason(e.target.value);
                        setCancelError("");
                      }}
                      placeholder="Type reason..."
                      className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-teal-200"
                    />
                  </div>
                )}

                {cancelError && <div className="mt-3 text-sm text-red-600">{cancelError}</div>}
              </div>

              <div className="flex items-center gap-2 px-8 py-5 border-t border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={handleProceedCancel}
                  className="px-5 py-2 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:brightness-95"
                >
                  Proceed
                </button>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-5 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isManageContactsOpen && (
          <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/40">
            <div className="mt-20 w-full max-w-[720px] bg-white rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-[16px] font-semibold text-gray-900">Manage Contact Persons</h3>
                <button
                  className="h-7 w-7 rounded border border-blue-500 text-blue-500 flex items-center justify-center hover:bg-blue-50"
                  onClick={() => setIsManageContactsOpen(false)}
                >
                  {"\u00D7"}
                </button>
              </div>

              <div className="px-5 py-4 text-[13px] text-gray-600 border-b border-gray-100">
                The following contacts will be notified via email about important subscription-related events.
              </div>

              <div className="px-5 py-3">
                <div className="grid grid-cols-[24px_1fr_1.2fr] text-[11px] uppercase text-gray-400 font-semibold border-b border-gray-100 pb-2">
                  <span />
                  <span>Name</span>
                  <span>Email Address</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {contactPersons.map((person) => {
                    const checked = selectedContactEmails.includes(person.email);
                    return (
                      <label
                        key={person.id}
                        className="grid grid-cols-[24px_1fr_1.2fr] items-center gap-2 py-3 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selectedContactEmails, person.email]
                              : selectedContactEmails.filter((email) => email !== person.email);
                            setSelectedContactEmails(next);
                          }}
                        />
                        <span>{person.name || "-"}</span>
                        <span className="text-gray-600">{person.email}</span>
                      </label>
                    );
                  })}
                  {contactPersons.length === 0 && (
                    <div className="py-6 text-center text-sm text-gray-500">No contact persons found.</div>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-2">
                <button
                  className="px-4 py-2 bg-[#10a37f] hover:bg-[#0e8a6b] text-white rounded-md text-sm font-semibold"
                  onClick={() => {
                    const updated = subscriptions.map((row: any) => {
                      if (row.id !== selected?.id) return row;
                      const nextContacts = contactPersons.filter((c) => selectedContactEmails.includes(c.email));
                      return {
                        ...row,
                        contactPersons: nextContacts,
                        customerEmail: nextContacts[0]?.email || row.customerEmail || "",
                      };
                    });
                    setSubscriptions(updated);
                    try {
                      localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
                    } catch {
                      // ignore storage errors
                    }
                    setIsManageContactsOpen(false);
                  }}
                >
                  Update
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm"
                  onClick={() => setIsManageContactsOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          No subscriptions found. Create or update a subscription to see details.
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 pt-16">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                !
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 flex-1">Delete subscription?</h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setShowDeleteModal(false)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              You cannot retrieve this subscription once it has been deleted.
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700"
                onClick={() => {
                  if (!selected?.id) return;
                  const updated = subscriptions.filter((row: any) => row.id !== selected.id);
                  setSubscriptions(updated);
                  setSelectedIds((prev) => prev.filter((id) => id !== selected.id));
                  try {
                    localStorage.setItem("taban_subscriptions_v1", JSON.stringify(updated));
                  } catch {
                    // ignore storage errors
                  }
                  toast.success("Subscription deleted successfully.");
                  setShowDeleteModal(false);
                  navigate("/sales/subscriptions");
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

