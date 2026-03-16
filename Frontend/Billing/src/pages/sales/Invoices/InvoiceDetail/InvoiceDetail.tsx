import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getInvoiceById, getInvoices, updateInvoice, getPayments, getTaxes, Tax, Invoice, AttachedFile, saveInvoice } from "../../salesModel";
import { currenciesAPI, invoicesAPI } from "../../../../services/api";
import FieldCustomization from "../../../shared/FieldCustomization";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  X, Edit, Send, Share2, FileText, Clock, MoreVertical,
  ChevronDown, ChevronUp, ChevronRight, Sparkles, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, Download, Mail, Calendar, AlertTriangle,
  Paperclip, MessageSquare, Link2, RotateCw, Repeat, Minus, Copy, BookOpen, Trash2, Settings,
  HelpCircle, FileUp, Bold, Italic, Underline, Check, Upload, Pencil, Banknote,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, Image as ImageIcon
} from "lucide-react";
import { getInvoiceStatusDisplay } from "../../../../utils/invoiceUtils";
import { getStatesByCountry } from "../../../../constants/locationData";

const normalizeInvoiceItems = (sourceInvoice: any) => {
  const coerceItems = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      if (Array.isArray((value as any).data)) return (value as any).data;
      if (Array.isArray((value as any).items)) return (value as any).items;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") {
          if (Array.isArray((parsed as any).data)) return (parsed as any).data;
          if (Array.isArray((parsed as any).items)) return (parsed as any).items;
          return Object.values(parsed);
        }
      } catch {
        return [];
      }
      return [];
    }
    if (typeof value === "object") return Object.values(value);
    return [];
  };

  const rawItems = [
    ...coerceItems(sourceInvoice?.items),
    ...coerceItems(sourceInvoice?.lineItems),
    ...coerceItems(sourceInvoice?.line_items),
    ...coerceItems(sourceInvoice?.itemDetails),
    ...coerceItems(sourceInvoice?.projectDetails),
    ...coerceItems(sourceInvoice?.invoiceItems),
    ...coerceItems(sourceInvoice?.itemsList)
  ];

  return rawItems.map((item: any) => {
    const quantity = Number(item?.quantity ?? item?.qty ?? item?.q ?? 0) || 0;
    const rate = Number(item?.unitPrice ?? item?.rate ?? item?.price ?? item?.unit_price ?? item?.unitRate ?? 0) || 0;
    const amountRaw = item?.amount ?? item?.total ?? item?.lineTotal ?? item?.line_total;
    const amount = Number(amountRaw ?? quantity * rate) || 0;
    const unit = String(item?.unit ?? item?.uom ?? item?.unitName ?? "pcs");
    const projectName =
      item?.projectName ||
      (typeof item?.project === "object" ? item?.project?.name || item?.project?.projectName : "") ||
      "";
    const displayName = String(
      item?.name ||
      item?.itemDetails ||
      item?.description ||
      projectName ||
      "Item"
    );
    const displayDescription = String(item?.description || item?.itemDescription || item?.itemDetails || "");

    return {
      ...item,
      displayName,
      displayDescription,
      displayQuantity: quantity,
      displayRate: rate,
      displayAmount: amount,
      displayUnit: unit,
      projectName
    };
  });
};



export default function InvoiceDetail() { // Start of component
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<any>>(new Set());
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false);
  const [isRemindersDropdownOpen, setIsRemindersDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const [isAllInvoicesDropdownOpen, setIsAllInvoicesDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [isScheduleEmailModalOpen, setIsScheduleEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    message: ""
  });
  const [scheduleData, setScheduleData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    message: "",
    date: "",
    time: ""
  });
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  // Share Modal States
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareVisibility, setShareVisibility] = useState("Public");
  const [isVisibilityDropdownOpen, setIsVisibilityDropdownOpen] = useState(false);
  const [linkExpirationDate, setLinkExpirationDate] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLinkGenerated, setIsLinkGenerated] = useState(false);
  // Attachments Modal States
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [invoiceAttachments, setInvoiceAttachments] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const attachmentsFileInputRef = useRef<HTMLInputElement>(null);
  // Comments Sidebar States
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentBold, setCommentBold] = useState(false);
  const [commentItalic, setCommentItalic] = useState(false);
  const [commentUnderline, setCommentUnderline] = useState(false);
  const [isInvoiceDocumentHovered, setIsInvoiceDocumentHovered] = useState(false);
  const [isCustomizeDropdownOpen, setIsCustomizeDropdownOpen] = useState(false);
  const [isChooseTemplateModalOpen, setIsChooseTemplateModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Standard Template");
  const [taxOptions, setTaxOptions] = useState<Tax[]>([]);
  const [isOrganizationAddressModalOpen, setIsOrganizationAddressModalOpen] = useState(false);
  const [organizationData, setOrganizationData] = useState({
    street1: "",
    street2: "",
    city: "",
    zipCode: "",
    stateProvince: "",
    phone: "",
    faxNumber: "",
    websiteUrl: "",
    industry: ""
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isFieldCustomizationOpen, setIsFieldCustomizationOpen] = useState(false);
  const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = useState(false);
  const [termsData, setTermsData] = useState({
    notes: "Thanks for your business.",
    termsAndConditions: "",
    useNotesForAllInvoices: false,
    useTermsForAllInvoices: false
  });
  const shareModalRef = useRef(null);
  const organizationAddressFileInputRef = useRef(null);
  const customizeDropdownRef = useRef(null);
  const visibilityDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const remindersDropdownRef = useRef(null);
  const allInvoicesDropdownRef = useRef(null);
  const sendDropdownRef = useRef(null);
  const pdfDropdownRef = useRef(null);

  // Organization profile data
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const stateOptions = getStatesByCountry(organizationProfile?.address?.country || "");
  // Owner email data
  // Owner email data
  const [ownerEmail, setOwnerEmail] = useState<any>(null);

  // Rich Text Editor State
  const [fontSize, setFontSize] = useState("16");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const location = useLocation();

  // Fetch organization profile data
  const fetchOrganizationProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found');
        // Set fallback data from localStorage if available
        const fallbackProfile = localStorage.getItem('organization_profile');
        if (fallbackProfile) {
          setOrganizationProfile(JSON.parse(fallbackProfile));
        }
        return;
      }

      const response = await fetch('/api/settings/organization/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOrganizationProfile(data.data);
          // Store in localStorage as fallback
          localStorage.setItem('organization_profile', JSON.stringify(data.data));
        }
      } else {
        console.error('Failed to fetch organization profile:', response.status, response.statusText);
        // Try fallback
        const fallbackProfile = localStorage.getItem('organization_profile');
        if (fallbackProfile) {
          setOrganizationProfile(JSON.parse(fallbackProfile));
        }
      }
    } catch (error) {
      console.error('Error fetching organization profile:', error);
      // Set fallback data from localStorage if available
      const fallbackProfile = localStorage.getItem('organization_profile');
      if (fallbackProfile) {
        setOrganizationProfile(JSON.parse(fallbackProfile));
      }
    }
  };

  // Fetch owner email data
  const fetchOwnerEmail = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/settings/organization/owner-email', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOwnerEmail(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching owner email:', error);
    }
  };

  // Update organization profile data
  const updateOrganizationProfile = async (profileData: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/settings/organization/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOrganizationProfile(data.data);
          // Update localStorage
          localStorage.setItem('organization_profile', JSON.stringify(data.data));
        }
      }
    } catch (error) {
      console.error('Error updating organization profile:', error);
    }
  };

  const statusFilters = [
    "All",
    "Draft",
    "Locked",
    "Pending Approval",
    "Approved",
    "Customer Viewed",
    "Partially Paid",
    "Unpaid",
    "Overdue"
  ];

  useEffect(() => {
    if (organizationProfile) {
      if (organizationProfile.logo) {
        setLogoPreview(organizationProfile.logo);
      }
      if (organizationProfile.address) {
        // Map profile address to organizationData format
        setOrganizationData(prev => ({
          ...prev,
          street1: organizationProfile.address.street1 || prev.street1 || "",
          street2: organizationProfile.address.street2 || prev.street2 || "",
          city: organizationProfile.address.city || prev.city || "",
          stateProvince: organizationProfile.address.state || prev.stateProvince || "",
          zipCode: organizationProfile.address.zipCode || prev.zipCode || "",
          phone: organizationProfile.phone || prev.phone || "",
          websiteUrl: organizationProfile.website || prev.websiteUrl || ""
        }));
      }
    }
  }, [organizationProfile]);

  useEffect(() => {
    const init = async () => {
      // Fetch invoice data
      let currentInvoice = null;
      if (id) {
        currentInvoice = await getInvoiceById(id);
        if (currentInvoice) {
          setInvoice(currentInvoice);
          // Initialize comments and attachments from backend data
          if (currentInvoice.comments) {
            setComments(currentInvoice.comments);
          }
          if (currentInvoice.attachments) {
            setInvoiceAttachments(currentInvoice.attachments);
          }
        } else {
          navigate("/sales/invoices");
          return;
        }
      }

      const allInvoices = await getInvoices();
      setInvoices(allInvoices);

      const allTaxes = await getTaxes();
      setTaxOptions(allTaxes);

      // Get payments for this invoice
      const allPayments = await getPayments();
      // Filter payments that are directly associated or have allocations for this invoice
      const invoicePayments = Array.isArray(allPayments) ? allPayments.filter(p => {
        // Direct association
        if (p.invoiceId === id || p.invoiceNumber === currentInvoice?.invoiceNumber) return true;
        // Check allocations
        if (p.allocations && Array.isArray(p.allocations)) {
          return p.allocations.some(a => {
            const invId = a.invoice?._id || a.invoice?.id || a.invoice;
            return invId === id || invId === currentInvoice?._id || invId === currentInvoice?.id;
          });
        }
        return false;
      }) : [];
      setPayments(invoicePayments);

      // Fetch organization profile data
      fetchOrganizationProfile();
      // Fetch owner email data
      fetchOwnerEmail();

      // Load organization logo from localStorage
      const savedLogo = localStorage.getItem('organization_logo');
      if (savedLogo) {
        setLogoPreview(savedLogo);
      }

      // Load organization address data from localStorage
      const savedAddress = localStorage.getItem('organization_address');
      if (savedAddress) {
        try {
          setOrganizationData(JSON.parse(savedAddress));
        } catch (e) {
          console.error("Error loading organization address:", e);
        }
      }

      // Fetch Base Currency
      try {
        const response = await currenciesAPI.getBaseCurrency();
        if (response && response.success && response.data) {
          setBaseCurrency(response.data.code || "USD");
        }
      } catch (error) {
        console.error("Error fetching base currency:", error);
      }
    };

    init();
  }, [id, navigate]);

  // Handle openEmailModal state from navigation
  useEffect(() => {
    if (location.state?.openEmailModal && id) {
      navigate(`/sales/invoices/${id}/email`);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, id, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (allInvoicesDropdownRef.current && !allInvoicesDropdownRef.current.contains(event.target as Node)) {
        setIsAllInvoicesDropdownOpen(false);
      }
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(event.target as Node)) {
        setIsSendDropdownOpen(false);
      }
      if (remindersDropdownRef.current && !remindersDropdownRef.current.contains(event.target as Node)) {
        setIsRemindersDropdownOpen(false);
      }
      if (pdfDropdownRef.current && !pdfDropdownRef.current.contains(event.target as Node)) {
        setIsPdfDropdownOpen(false);
      }
      if (visibilityDropdownRef.current && !visibilityDropdownRef.current.contains(event.target as Node)) {
        setIsVisibilityDropdownOpen(false);
      }
      if (customizeDropdownRef.current && !customizeDropdownRef.current.contains(event.target as Node)) {
        setIsCustomizeDropdownOpen(false);
      }
    };

    if (isMoreMenuOpen || isAllInvoicesDropdownOpen || isSendDropdownOpen || isRemindersDropdownOpen || isPdfDropdownOpen || isCustomizeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen, isAllInvoicesDropdownOpen, isSendDropdownOpen, isRemindersDropdownOpen, isPdfDropdownOpen, isVisibilityDropdownOpen, isCustomizeDropdownOpen]);

  const handleSendReminderNow = async () => {
    try {
      setIsRemindersDropdownOpen(false);
      if (!invoice || !id) return;

      const due = new Date((invoice as any).dueDate);
      const now = new Date();
      const kind = due.getTime() < now.getTime() ? "overdue" : "sent";

      await invoicesAPI.sendReminder(id, { kind });
      alert("Reminder sent successfully!");
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      alert(error?.message || "Failed to send reminder. Please try again.");
    }
  };

  const handleToggleStopReminders = async () => {
    try {
      setIsRemindersDropdownOpen(false);
      if (!invoice || !id) return;

      const nextStopped = !(invoice as any).remindersStopped;
      const result = await invoicesAPI.setRemindersStopped(id, nextStopped);

      if (result?.success && result.data) {
        setInvoice((prev: any) => ({ ...(prev || {}), ...result.data }));
        alert(nextStopped ? "Reminders stopped for this invoice" : "Reminders enabled for this invoice");
      } else {
        throw new Error(result?.message || "Failed to update reminder status");
      }
    } catch (error: any) {
      console.error("Error updating reminders stopped:", error);
      alert(error?.message || "Failed to update reminder status. Please try again.");
    }
  };

  const handleSetExpectedPaymentDate = async () => {
    try {
      setIsRemindersDropdownOpen(false);
      if (!invoice || !id) return;

      const current = (invoice as any).expectedPaymentDate
        ? new Date((invoice as any).expectedPaymentDate).toISOString().slice(0, 10)
        : "";

      const value = window.prompt("Expected payment date (YYYY-MM-DD)", current);
      if (!value) return;

      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        alert("Invalid date. Please use YYYY-MM-DD.");
        return;
      }

      const result = await invoicesAPI.update(id, { expectedPaymentDate: date.toISOString() });
      if (result?.success && result.data) {
        setInvoice((prev: any) => ({ ...(prev || {}), ...result.data }));
        alert("Expected payment date saved");
      } else {
        throw new Error(result?.message || "Failed to save expected payment date");
      }
    } catch (error: any) {
      console.error("Error saving expected payment date:", error);
      alert(error?.message || "Failed to save expected payment date. Please try again.");
    }
  };

  const formatCurrency = (amount, currencyStr = baseCurrency) => {
    const code = currencyStr?.split(' - ')[0] || baseCurrency;
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AMD': '֏',
      'INR': '₹',
      'JPY': '¥',
      'KES': 'KSh',
      'AUD': '$',
      'CAD': '$',
      'ZAR': 'R',
      'NGN': '₦'
    };
    const symbol = symbols[code] || code;
    const formattedAmount = parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formattedAmount}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrencyNumber = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const toNumber = (value: any) => {
    const parsed = parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const toEntityId = (value: any) => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return String(value._id || value.id || "");
    return "";
  };

  const getInvoiceNumberPrefix = (invoiceNumber: any) => {
    const raw = String(invoiceNumber || "").trim();
    if (!raw) return "INV-";

    const match = raw.match(/^(.*?)(\d+)$/);
    const derivedPrefix = (match?.[1] || raw.replace(/[0-9]+$/g, "")).trim();
    return derivedPrefix || "INV-";
  };

  const extractNextInvoiceNumber = (response: any, prefix: string) => {
    const fromPayload = String(response?.data?.invoiceNumber || response?.invoiceNumber || "").trim();
    if (fromPayload) return fromPayload;

    const nextRaw = response?.data?.nextNumber ?? response?.nextNumber;
    const nextNumeric = Number(nextRaw);
    if (Number.isFinite(nextNumeric) && nextNumeric > 0) {
      return `${prefix}${String(Math.trunc(nextNumeric)).padStart(6, "0")}`;
    }

    return "";
  };

  const isDuplicateInvoiceNumberError = (error: any) => {
    const message = String(error?.message || "").toLowerCase();
    const status = Number(error?.status || 0);
    const hasInvoiceNumberText = message.includes("invoice number");
    const hasDuplicateText = message.includes("already exists") || message.includes("duplicate");
    return hasInvoiceNumberText && hasDuplicateText && (status === 0 || status === 400 || status === 409);
  };

  const buildClonedInvoicePayload = (sourceInvoice: any, nextInvoiceNumber: string) => {
    const customerId = toEntityId(sourceInvoice?.customerId || sourceInvoice?.customer);
    const salespersonId = toEntityId(sourceInvoice?.salespersonId || sourceInvoice?.salesperson);

    const clonedItems = Array.isArray(sourceInvoice?.items)
      ? sourceInvoice.items.map((line: any) => {
        const quantity = Math.max(0, toNumber(line?.quantity));
        const unitPrice = toNumber(line?.unitPrice ?? line?.rate ?? line?.price);
        const lineTotal = toNumber(line?.amount ?? line?.total ?? (quantity * unitPrice));
        const lineItemId = toEntityId(line?.item || line?.itemId);

        return {
          item: lineItemId || undefined,
          itemId: lineItemId || undefined,
          name: line?.name || line?.itemDetails || line?.description || "Item",
          description: String(line?.description || line?.itemDetails || ""),
          quantity: quantity > 0 ? quantity : 1,
          unitPrice,
          rate: unitPrice,
          tax: String(line?.tax || line?.taxId || ""),
          taxRate: toNumber(line?.taxRate ?? line?.taxPercent ?? line?.tax_percentage),
          taxAmount: toNumber(line?.taxAmount ?? line?.tax),
          total: lineTotal,
          amount: lineTotal
        };
      })
      : [];

    const subTotal = toNumber(sourceInvoice?.subTotal ?? sourceInvoice?.subtotal);
    const taxAmount = toNumber(sourceInvoice?.taxAmount ?? sourceInvoice?.tax);
    const discountAmount = toNumber(sourceInvoice?.discountAmount);
    const discountValue = toNumber(sourceInvoice?.discount);
    const discount = discountAmount > 0 ? discountAmount : discountValue;
    const shippingCharges = toNumber(sourceInvoice?.shippingCharges ?? sourceInvoice?.shipping);
    const adjustment = toNumber(sourceInvoice?.adjustment);
    const roundOff = toNumber(sourceInvoice?.roundOff);
    const computedTotal = subTotal + taxAmount - discount + shippingCharges + adjustment + roundOff;
    const total = toNumber(sourceInvoice?.total ?? sourceInvoice?.amount ?? computedTotal);

    return {
      invoiceNumber: nextInvoiceNumber,
      customer: customerId || undefined,
      customerId: customerId || undefined,
      customerName:
        sourceInvoice?.customerName
        || (typeof sourceInvoice?.customer === "object"
          ? sourceInvoice?.customer?.displayName || sourceInvoice?.customer?.companyName || sourceInvoice?.customer?.name
          : sourceInvoice?.customer)
        || "",
      date: sourceInvoice?.invoiceDate || sourceInvoice?.date || new Date().toISOString(),
      dueDate: sourceInvoice?.dueDate || sourceInvoice?.invoiceDate || sourceInvoice?.date || new Date().toISOString(),
      orderNumber: sourceInvoice?.orderNumber || "",
      receipt: sourceInvoice?.receipt || sourceInvoice?.paymentTerms || "Due on Receipt",
      paymentTerms: sourceInvoice?.paymentTerms || sourceInvoice?.receipt || "Due on Receipt",
      accountsReceivable: sourceInvoice?.accountsReceivable || "",
      salesperson: sourceInvoice?.salesperson || "",
      salespersonId: salespersonId || undefined,
      subject: sourceInvoice?.subject || "",
      taxExclusive: sourceInvoice?.taxExclusive || "Tax Exclusive",
      items: clonedItems,
      subtotal: subTotal,
      subTotal,
      tax: taxAmount,
      taxAmount,
      discount,
      discountType: String(sourceInvoice?.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent",
      shippingCharges,
      shippingChargeTax: String(sourceInvoice?.shippingChargeTax || sourceInvoice?.shippingTax || sourceInvoice?.shippingTaxId || ""),
      adjustment,
      roundOff,
      total,
      amount: total,
      balanceDue: total,
      balance: total,
      currency: sourceInvoice?.currency || baseCurrency || "USD",
      notes: sourceInvoice?.customerNotes || sourceInvoice?.notes || "",
      customerNotes: sourceInvoice?.customerNotes || sourceInvoice?.notes || "",
      termsAndConditions: sourceInvoice?.termsAndConditions || sourceInvoice?.terms || "",
      terms: sourceInvoice?.terms || sourceInvoice?.termsAndConditions || "",
      attachedFiles: [],
      comments: [],
      attachments: [],
      status: "draft"
    };
  };

  const getInvoiceDisplayTotal = (invoiceData: any) => {
    if (invoiceData?.total !== undefined && invoiceData?.total !== null) {
      return toNumber(invoiceData.total);
    }
    if (invoiceData?.amount !== undefined && invoiceData?.amount !== null) {
      return toNumber(invoiceData.amount);
    }
    const subTotal = toNumber(invoiceData?.subTotal ?? invoiceData?.subtotal);
    const tax = toNumber(invoiceData?.taxAmount ?? invoiceData?.tax);
    const discount = toNumber(invoiceData?.discountAmount ?? invoiceData?.discount);
    const shipping = toNumber(invoiceData?.shippingCharges ?? invoiceData?.shipping);
    const adjustment = toNumber(invoiceData?.adjustment);
    const roundOff = toNumber(invoiceData?.roundOff);
    return subTotal + tax - discount + shipping + adjustment + roundOff;
  };

  const getInvoiceTotalsMeta = (invoiceData: any) => {
    const subTotal = toNumber(invoiceData?.subTotal ?? invoiceData?.subtotal ?? getInvoiceDisplayTotal(invoiceData));
    const isTaxInclusive = String(invoiceData?.taxExclusive || "").toLowerCase() === "tax inclusive";
    let taxAmount = toNumber(invoiceData?.taxAmount ?? invoiceData?.tax);
    if (taxAmount <= 0 && Array.isArray(invoiceData?.items)) {
      taxAmount = invoiceData.items.reduce((sum: number, item: any) => {
        const lineTax = toNumber(item?.taxAmount);
        if (lineTax > 0) return sum + lineTax;
        const qty = toNumber(item?.quantity);
        const rate = toNumber(item?.unitPrice ?? item?.rate ?? item?.price);
        const lineBase = qty * rate;
        const taxRate = toNumber(item?.taxRate);
        if (taxRate <= 0 || lineBase <= 0) return sum;
        if (isTaxInclusive) {
          return sum + (lineBase - lineBase / (1 + taxRate / 100));
        }
        return sum + (lineBase * taxRate / 100);
      }, 0);
    }

    const discountBase = Math.max(0, isTaxInclusive ? (subTotal - taxAmount) : subTotal);
    let discountAmount = toNumber(invoiceData?.discountAmount);
    const discountValue = toNumber(invoiceData?.discount);
    if (discountAmount <= 0 && discountValue > 0) {
      discountAmount = String(invoiceData?.discountType || "").toLowerCase() === "percent"
        ? (discountBase * discountValue) / 100
        : discountValue;
    }

    const shippingCharges = toNumber(invoiceData?.shippingCharges ?? invoiceData?.shipping);
    const adjustment = toNumber(invoiceData?.adjustment);
    const roundOff = toNumber(invoiceData?.roundOff);
    const total = getInvoiceDisplayTotal(invoiceData);
    const paidAmount = toNumber(invoiceData?.paidAmount ?? invoiceData?.amountPaid);
    const creditsApplied = toNumber(invoiceData?.creditsApplied);
    const computedBalance = Math.max(0, total - paidAmount - creditsApplied);
    const balance = invoiceData?.balanceDue !== undefined
      ? toNumber(invoiceData.balanceDue)
      : (invoiceData?.balance !== undefined ? toNumber(invoiceData.balance) : computedBalance);

    const discountRate = discountAmount > 0 && discountBase > 0 ? (discountAmount / discountBase) * 100 : 0;
    const discountLabel = discountAmount > 0 ? `Discount(${discountRate.toFixed(2)}%)` : "Discount";
    const taxLabel = String(invoiceData?.taxName || "").trim() || (taxAmount > 0 ? (isTaxInclusive ? "Tax (Included)" : "Tax") : "");

    return {
      subTotal,
      taxAmount,
      discountAmount,
      discountBase,
      discountLabel,
      taxLabel,
      taxExclusive: invoiceData?.taxExclusive || "Tax Exclusive",
      shippingCharges,
      adjustment,
      roundOff,
      total,
      paidAmount,
      creditsApplied,
      balance
    };
  };

  const handleMarkAsSent = async () => {
    if (invoice) {
      try {
        const resolvePostSendStatus = (dueDateValue: any) => {
          if (!dueDateValue) return "unpaid";
          const dueDate = new Date(dueDateValue);
          if (Number.isNaN(dueDate.getTime())) return "unpaid";
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() < today.getTime() ? "overdue" : "unpaid";
        };

        const nextStatus = resolvePostSendStatus(invoice.dueDate);
        const updatedInvoice = await updateInvoice(id, { ...invoice, status: nextStatus });
        if (updatedInvoice) {
          setInvoice(updatedInvoice);
          // Update in list
          const updatedInvoices = invoices.map(inv => inv.id === id ? updatedInvoice : inv);
          setInvoices(updatedInvoices);
          alert("Invoice updated successfully.");
        }
      } catch (error: any) {
        console.error("Error marking invoice as sent:", error);
        alert("Failed to mark invoice as sent: " + error.message);
      }
    }
  };

  const handleSendInvoice = () => {
    handleSendEmail();
  };

  const handleSendEmail = () => {
    setIsSendDropdownOpen(false);
    if (!id) return;
    navigate(`/sales/invoices/${id}/email`);
  };

  const handleSendEmailSubmit = async () => {
    if (!emailData.to || !emailData.subject) {
      alert("Please fill in required fields (To and Subject)");
      return;
    }

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      if (typeof invoicesAPI.sendEmail !== 'function') {
        // Fallback if API method is not yet available in hot reload context (should rarely happen)
        console.warn("invoicesAPI.sendEmail is not defined yet");
        alert("System update in progress. Please refresh the page and try again.");
        return;
      }

      await invoicesAPI.sendEmail(id, {
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        body: emailData.message
        // attachments will be handled later if needed
      });

      console.log("Sending email:", emailData);
      setIsSendEmailModalOpen(false);
      alert("Email sent successfully!");

      const resolvePostSendStatus = (dueDateValue: any) => {
        if (!dueDateValue) return "unpaid";
        const dueDate = new Date(dueDateValue);
        if (Number.isNaN(dueDate.getTime())) return "unpaid";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() < today.getTime() ? "overdue" : "unpaid";
      };

      // Update local invoice status if it was draft
      if (invoice.status === 'draft') {
        const nextStatus = resolvePostSendStatus(invoice.dueDate);
        setInvoice(prev => ({ ...prev, status: nextStatus }));
        // Also update the list if needed
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: nextStatus } : inv));
      }

      setEmailData({
        to: "",
        cc: "",
        bcc: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email. Please try again.");
    }
  };

  const handleLogoUpload = (file) => {
    // Check file size (1MB max)
    if (file.size > 1024 * 1024) {
      alert("File size exceeds 1MB. Please choose a smaller file.");
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      alert("Invalid file type. Please upload jpg, jpeg, png, gif, or bmp files.");
      return;
    }

    // Create preview and save to localStorage
    const reader = new FileReader();
    reader.onloadend = () => {
      const logoDataUrl = reader.result;
      setLogoPreview(logoDataUrl);
      setLogoFile(file);
      // Save logo to localStorage
      localStorage.setItem('organization_logo', logoDataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleScheduleEmail = () => {
    setIsSendDropdownOpen(false);
    if (invoice) {
      const orgName = organizationProfile?.name || "Your Company";
      // Pre-fill schedule data with invoice info
      setScheduleData({
        to: invoice.customerEmail || invoice.customer || "",
        cc: "",
        bcc: "",
        subject: `Invoice ${invoice.invoiceNumber || invoice.id} from ${orgName}`,
        message: `Dear ${invoice.customer || "Customer"},\n\nPlease find attached invoice ${invoice.invoiceNumber || invoice.id} for ${formatCurrency(getInvoiceDisplayTotal(invoice), invoice.currency)}.\n\nInvoice Details:\n- Invoice Number: ${invoice.invoiceNumber || invoice.id}\n- Invoice Date: ${formatDate(invoice.invoiceDate || invoice.date)}\n- Due Date: ${formatDate(invoice.dueDate)}\n- Amount: ${formatCurrency(getInvoiceDisplayTotal(invoice), invoice.currency)}.\n\nPlease review and let us know your decision.\n\nBest regards,\n${orgName}`,
        date: "",
        time: ""
      });
    }
  };

  const handleScheduleEmailSubmit = () => {
    if (!scheduleData.to || !scheduleData.subject || !scheduleData.date || !scheduleData.time) {
      alert("Please fill in required fields (To, Subject, Date, and Time)");
      return;
    }
    // TODO: Implement actual email sending
    console.log("Sending email:", emailData);
    setIsSendEmailModalOpen(false);
    alert("Email sent successfully!");
    setEmailData({
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      message: ""
    });
  };

  /*
    return;
    // }
    // TODO: Implement actual email scheduling
    console.log("Scheduling email:", scheduleData);
    setIsScheduleEmailModalOpen(false);
    alert(`Email scheduled for ${scheduleData.date} at ${scheduleData.time}`);
    setScheduleData({
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      message: "",
      date: "",
      time: ""
    });
  */
  // };

  const handleShare = () => {
    if (!invoice) return;

    // Calculate default expiration date (90 days from invoice due date or 90 days from today)
    let defaultExpiryDate;
    if (invoice.dueDate) {
      defaultExpiryDate = new Date(invoice.dueDate);
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    } else {
      defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    }

    // Format as DD/MM/YYYY
    const day = String(defaultExpiryDate.getDate()).padStart(2, '0');
    const month = String(defaultExpiryDate.getMonth() + 1).padStart(2, '0');
    const year = defaultExpiryDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    setLinkExpirationDate(formattedDate);
    setGeneratedLink("");
    setIsLinkGenerated(false);
    setShowShareModal(true);
  };

  const handleGenerateLink = () => {
    if (!linkExpirationDate) {
      alert("Please select an expiration date");
      return;
    }

    // Generate a secure link similar to the example
    const baseUrl = "https://zohosecurepay.com/books/tabanenterprises/secure";
    const invoiceId = invoice.id || invoice.invoiceNumber || Date.now();
    // Generate a long secure token (128 characters like in the example)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Format: CInvoiceID=invoiceId-token (matching the example format)
    const secureLink = `${baseUrl}?CInvoiceID=${invoiceId}-${token}`;
    setGeneratedLink(secureLink);
    setIsLinkGenerated(true);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink).then(() => {
        alert("Link copied to clipboard!");
      }).catch(() => {
        alert("Unable to copy link. Please copy manually: " + generatedLink);
      });
    }
  };

  const handleDisableAllActiveLinks = () => {
    if (window.confirm("Are you sure you want to disable all active links for this invoice?")) {
      setGeneratedLink("");
      setIsLinkGenerated(false);
      alert("All active links have been disabled.");
    }
  };

  // Generate HTML content for invoice (shared for print and download)
  const generateInvoiceHTML = () => {
    if (!invoice) return '';

    const displayItemsForHtml = normalizeInvoiceItems(invoice);
    const itemsHTML = displayItemsForHtml.length > 0 ? displayItemsForHtml.map((item, index) => {
      const rate = Number(item.displayRate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const amount = Number(item.displayAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const qty = Number(item.displayQuantity || 0).toFixed(2);
      const unit = item.displayUnit || 'pcs';
      const itemName = item.displayName || 'N/A';
      return `
        <tr>
          <td class="col-number">${index + 1}</td>
          <td class="col-item">${itemName}</td>
          <td class="col-qty">${qty} ${unit}</td>
          <td class="col-rate">${rate}</td>
          <td class="col-amount">${amount}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="5" style="text-align: center; color: #666;">No items</td></tr>';

    const invoiceDate = invoice.invoiceDate || invoice.date || new Date().toISOString();
    const formattedDate = formatDateShort(invoiceDate);
    const dueDate = invoice.dueDate ? formatDateShort(invoice.dueDate) : formattedDate;
    const customerName = invoice.customerName || (typeof invoice.customer === 'object' ? (invoice.customer?.displayName || invoice.customer?.companyName || invoice.customer?.name) : invoice.customer) || 'N/A';
    const totalsMeta = getInvoiceTotalsMeta(invoice);
    const subTotal = formatCurrencyNumber(totalsMeta.subTotal);
    const total = formatCurrency(totalsMeta.total, invoice.currency || 'KES');
    const balanceDue = formatCurrency(totalsMeta.balance, invoice.currency || 'KES');
    const notes = invoice.customerNotes || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber || invoice.id}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page {
            size: A4;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
          }
          .company-info h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #111;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-info h2 {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #111;
          }
          .invoice-number {
            font-size: 18px;
            color: #666;
            margin-bottom: 10px;
          }
          .balance-due {
            font-size: 20px;
            font-weight: bold;
            color: #111;
          }
          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .bill-to h3 {
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 10px;
          }
          .bill-to p {
            font-size: 14px;
            color: #333;
            margin-bottom: 5px;
          }
          .invoice-details {
            text-align: right;
          }
          .invoice-details p {
            font-size: 14px;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          thead {
            background-color: #374151;
            color: white;
          }
          th {
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          tbody tr {
            border-bottom: 1px solid #eee;
          }
          td {
            padding: 12px;
            font-size: 14px;
          }
          .col-number { width: 5%; }
          .col-item { width: 45%; }
          .col-qty { width: 15%; }
          .col-rate { width: 15%; }
          .col-amount { width: 20%; text-align: right; }
          .summary {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
          }
          .summary-table {
            width: 300px;
          }
          .summary-table tr {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }
          .summary-table .total {
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #eee;
            padding-top: 10px;
            margin-top: 10px;
          }
          .notes {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .notes h3 {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .notes p {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>${organizationProfile?.name || 'TABAN ENTERPRISES'}</h1>
              <p>${organizationProfile?.address?.street1 || 'taleex'}</p>
              <p>${organizationProfile?.address?.street2 || 'taleex'}</p>
              <p>${organizationProfile?.address?.city ?
        `${organizationProfile.address.city}${organizationProfile.address.zipCode ? ' ' + organizationProfile.address.zipCode : ''}${organizationProfile.address.state ? ', ' + organizationProfile.address.state : ''}` :
        'mogadishu Nairobi 22223'
      }</p>
              <p>${organizationProfile?.address?.country || 'Somalia'}</p>
              <p>${ownerEmail?.email || organizationProfile?.email || 'nasram172@gmail.com'}</p>
            </div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <div class="invoice-number"># ${invoice.invoiceNumber || invoice.id}</div>
              <div class="balance-due">Balance Due: ${balanceDue}</div>
            </div>
          </div>
          
          <div class="details">
            <div class="bill-to">
              <h3>Bill To</h3>
              <p><strong>${customerName}</strong></p>
            </div>
            <div class="invoice-details">
              <p><span>Invoice Date :</span> <strong>${formattedDate}</strong></p>
              <p><span>Terms :</span> <strong>Due on Receipt</strong></p>
              <p><span>Due Date :</span> <strong>${dueDate}</strong></p>
              ${invoice.orderNumber ? `<p><span>P.O.# :</span> <strong>${invoice.orderNumber}</strong></p>` : ''}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="col-number">#</th>
                <th class="col-item">Item & Description</th>
                <th class="col-qty">Qty</th>
                <th class="col-rate">Rate</th>
                <th class="col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="summary">
            <table class="summary-table">
              <tr>
                <td>Sub Total</td>
                <td>${subTotal}</td>
              </tr>
              <tr>
                <td colspan="2" style="font-size:12px;color:#6b7280;padding-top:0;padding-bottom:4px;">(${totalsMeta.taxExclusive})</td>
              </tr>
              ${totalsMeta.discountAmount > 0 ? `
              <tr>
                <td>${totalsMeta.discountLabel}</td>
                <td>(-) ${formatCurrencyNumber(totalsMeta.discountAmount)}</td>
              </tr>
              <tr>
                <td colspan="2" style="font-size:12px;color:#6b7280;padding-top:0;padding-bottom:4px;">(Applied on ${formatCurrencyNumber(totalsMeta.discountBase)})</td>
              </tr>
              ` : ''}
              ${totalsMeta.taxAmount > 0 ? `
              <tr>
                <td>${totalsMeta.taxLabel}</td>
                <td>${formatCurrencyNumber(totalsMeta.taxAmount)}</td>
              </tr>
              ` : ''}
              ${totalsMeta.shippingCharges !== 0 ? `
              <tr>
                <td>Shipping charge</td>
                <td>${formatCurrencyNumber(totalsMeta.shippingCharges)}</td>
              </tr>
              ` : ''}
              ${totalsMeta.adjustment !== 0 ? `
              <tr>
                <td>Adjustment</td>
                <td>${formatCurrencyNumber(totalsMeta.adjustment)}</td>
              </tr>
              ` : ''}
              ${totalsMeta.roundOff !== 0 ? `
              <tr>
                <td>Round Off</td>
                <td>${formatCurrencyNumber(totalsMeta.roundOff)}</td>
              </tr>
              ` : ''}
              <tr class="total">
                <td>Total</td>
                <td>${total}</td>
              </tr>
              ${totalsMeta.paidAmount > 0 ? `
              <tr>
                <td>Payment Made</td>
                <td>(-) ${formatCurrency(totalsMeta.paidAmount, invoice.currency || 'KES')}</td>
              </tr>
              ` : ''}
              ${totalsMeta.creditsApplied > 0 ? `
              <tr>
                <td>Credits Applied</td>
                <td>(-) ${formatCurrency(totalsMeta.creditsApplied, invoice.currency || 'KES')}</td>
              </tr>
              ` : ''}
              <tr class="total">
                <td>Balance Due</td>
                <td>${formatCurrency(totalsMeta.balance, invoice.currency || 'KES')}</td>
              </tr>
            </table>
          </div>
          
          ${notes ? `
          <div class="notes">
            <h3>Notes</h3>
            <p>${notes}</p>
          </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = async () => {
    setIsPdfDropdownOpen(false);
    if (!invoice) return;

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.width = "794px";
    wrapper.style.background = "#ffffff";
    wrapper.style.zIndex = "-1";
    wrapper.innerHTML = generateInvoiceHTML();
    document.body.appendChild(wrapper);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pageWidth - (margin * 2);
      const printableHeight = pageHeight - (margin * 2);
      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0.01) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= printableHeight;
      }

      pdf.save(`Invoice-${invoice.invoiceNumber || invoice.id}.pdf`);
    } catch (error) {
      console.error("Error downloading invoice PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  const handleViewInvoiceInNewPage = () => {
    setIsPdfDropdownOpen(false);
    if (!invoice) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateInvoiceHTML());
    printWindow.document.close();
  };

  const handleRecordPayment = () => {
    // Check if user has chosen to not show this warning again
    const hideWarning = localStorage.getItem('hideRecordPaymentWarning');
    if (hideWarning === 'true') {
      // Navigate directly to payment form
      navigateToPaymentForm();
    } else {
      // Show confirmation modal
      setIsRecordPaymentModalOpen(true);
    }
  };

  const navigateToPaymentForm = () => {
    // Navigate to record payment form with invoice pre-filled
    navigate("/sales/payments-received/new", {
      state: {
        invoiceId: invoice?.id || invoice?._id,
        invoiceNumber: invoice?.invoiceNumber || invoice?.id,
        customerId: invoice?.customerId || invoice?.customer?._id || invoice?.customer?.id,
        customerName: invoice?.customerName || (typeof invoice?.customer === 'string' ? invoice?.customer : invoice?.customer?.displayName || invoice?.customer?.name),
        amount: invoice?.balance !== undefined ? invoice.balance : (invoice?.balanceDue ?? getInvoiceDisplayTotal(invoice)),
        currency: invoice?.currency || "SOS",
        invoice: invoice // Pass the full object as well
      }
    });
  };

  const handleRecordPaymentConfirm = () => {
    // Save preference if checkbox is checked
    if (doNotShowAgain) {
      localStorage.setItem('hideRecordPaymentWarning', 'true');
    }
    setIsRecordPaymentModalOpen(false);
    navigateToPaymentForm();
  };

  const handleFilterSelect = (filter) => {
    setIsAllInvoicesDropdownOpen(false);
    // Navigate to invoices list with filter applied
    if (filter === "All") {
      navigate("/sales/invoices");
    } else {
      // Convert filter name to status format
      const statusMap = {
        "All": "all",
        "Draft": "draft",
        "Unpaid": "unpaid",
        "Overdue": "overdue",
        "Partially Paid": "partially_paid",
        "Customer Viewed": "customer_viewed",
        "Approved": "approved",
        "Pending Approval": "pending_approval",
        "Locked": "locked"
      };
      navigate(`/sales/invoices?status=${statusMap[filter] || filter.toLowerCase()}`);
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(displayItems.map((item, index) => item.id || index)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) {
      const selectedIds = Array.from(selectedItems);
      const updatedItems = displayItems.filter((item, index) => !selectedIds.includes(item.id || index));
      const updatedInvoice = { ...invoice, items: updatedItems };
      updateInvoice(id, updatedInvoice);
      setInvoice(updatedInvoice);
      setSelectedItems(new Set());
    }
  };

  const handleMakeRecurring = () => {
    setIsMoreMenuOpen(false);
    // TODO: Implement make recurring functionality
    navigate(`/sales/recurring-invoices/new?invoiceId=${id}`);
  };

  const handleCreateCreditNote = () => {
    setIsMoreMenuOpen(false);
    // TODO: Implement create credit note functionality
    navigate(`/sales/credit-notes/new?invoiceId=${id}`);
  };

  const handleCreateDebitNote = () => {
    setIsMoreMenuOpen(false);
    navigate(`/sales/debit-notes/new${id ? `?invoiceId=${id}` : ''}`);
  };

  const handleCreateRetailInvoice = () => {
    setIsMoreMenuOpen(false);
    // Navigate to retail invoice page as a new page
    navigate("/sales/invoices/new", { state: { isRetail: true, invoiceId: id } });
  };

  const handleClone = async () => {
    setIsMoreMenuOpen(false);
    if (!invoice) return;

    const customerId = toEntityId(invoice.customerId || invoice.customer);
    if (!customerId) {
      alert("Cannot clone this invoice because it has no customer.");
      return;
    }

    try {
      const prefix = getInvoiceNumberPrefix(invoice?.invoiceNumber);
      const numberResponse = await invoicesAPI.getNextNumber(prefix);
      const nextInvoiceNumber = extractNextInvoiceNumber(numberResponse, prefix);
      if (!nextInvoiceNumber) {
        throw new Error("Unable to generate invoice number for clone.");
      }

      const clonePayload = buildClonedInvoicePayload(invoice, nextInvoiceNumber);
      let clonedInvoice: any;

      try {
        clonedInvoice = await saveInvoice(clonePayload as any);
      } catch (error: any) {
        if (!isDuplicateInvoiceNumberError(error)) {
          throw error;
        }

        const retryNumberResponse = await invoicesAPI.getNextNumber(prefix);
        const retryInvoiceNumber = extractNextInvoiceNumber(retryNumberResponse, prefix);
        if (!retryInvoiceNumber) {
          throw error;
        }

        clonedInvoice = await saveInvoice({ ...clonePayload, invoiceNumber: retryInvoiceNumber } as any);
      }

      const clonedInvoiceId = clonedInvoice?.id || clonedInvoice?._id;
      if (clonedInvoiceId) {
        navigate(`/sales/invoices/${clonedInvoiceId}`);
        return;
      }

      alert("Invoice cloned successfully, but it could not be opened automatically.");
    } catch (error: any) {
      console.error("Error cloning invoice:", error);
      alert(error?.message || "Failed to clone invoice. Please try again.");
    }
  };

  const handleImportInvoices = () => {
    setIsMoreMenuOpen(false);
    navigate("/sales/invoices/import");
  };

  const handleViewJournal = () => {
    setIsMoreMenuOpen(false);
    // Scroll to journal entries section
    setTimeout(() => {
      const journalSection = document.querySelector('[data-journal-section]');
      if (journalSection) {
        journalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDeleteInvoice = () => {
    setIsMoreMenuOpen(false);
    if (window.confirm(`Are you sure you want to delete invoice ${invoice?.invoiceNumber || invoice?.id}?`)) {
      // TODO: Implement actual deletion logic
      const updatedInvoices = invoices.filter(inv => inv.id !== invoice.id);
      setInvoices(updatedInvoices);
      alert("Invoice deleted successfully.");
      navigate("/sales/invoices");
    }
  };

  const handleInvoicePreferences = () => {
    setIsMoreMenuOpen(false);
    // TODO: Implement invoice preferences functionality
    // This could open a preferences modal or navigate to preferences page
    alert("Invoice Preferences - Feature coming soon");
  };

  const handleVoidInvoice = async () => {
    if (!invoice) return;
    setIsMoreMenuOpen(false);
    try {
      const updatedInvoice = await updateInvoice(id, { ...invoice, status: "void" });
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        setInvoices((prev) => prev.map((inv) => String(inv.id) === String(id) ? updatedInvoice : inv));
        alert("Invoice voided successfully.");
      }
    } catch (error: any) {
      console.error("Error voiding invoice:", error);
      alert("Failed to void invoice: " + (error?.message || "Unknown error"));
    }
  };

  // Attachments Handlers
  const handleFileUpload = (files) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (invoiceAttachments.length + validFiles.length > 5) {
      alert("Maximum 5 files allowed. Please remove some files first.");
      return;
    }

    const processFiles = async () => {
      const newAttachments = [];

      for (const file of validFiles) {
        const attachment = {
          id: Date.now() + Math.random() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          preview: null
        };

        if (file.type.startsWith('image/')) {
          attachment.preview = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }

        newAttachments.push(attachment);
      }

      setInvoiceAttachments(prev => {
        const updated = [...prev, ...newAttachments];
        // Save to backend
        if (id) {
          const attachmentsToStore = updated.map(att => ({
            id: att.id,
            name: att.name,
            size: att.size,
            type: att.type,
            preview: att.preview
          }));
          // updateInvoice is async but we don't await it inside setState callback
          updateInvoice(id, { attachments: attachmentsToStore })
            .catch(err => console.error("Error saving attachments to backend:", err));
        }
        return updated;
      });
    };

    processFiles();
  };

  const handleFileClick = (attachment) => {
    if (attachment.type && attachment.type.startsWith('image/')) {
      setSelectedImage(attachment.preview || (attachment.file ? URL.createObjectURL(attachment.file) : null));
      setShowImageViewer(true);
    } else {
      if (attachment.file) {
        const url = URL.createObjectURL(attachment.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleRemoveAttachment = (attachmentId) => {
    setInvoiceAttachments(prev => {
      const updated = prev.filter(att => att.id !== attachmentId);
      // Save to backend
      if (id) {
        const attachmentsToStore = updated.map(att => ({
          id: att.id,
          name: att.name,
          size: att.size,
          type: att.type,
          preview: att.preview
        }));
        updateInvoice(id, { attachments: attachmentsToStore })
          .catch(err => console.error("Error saving attachments to backend:", err));
      }
      return updated;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Comments Handlers
  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      text: newComment,
      author: "You",
      timestamp: new Date().toISOString(),
      bold: commentBold,
      italic: commentItalic,
      underline: commentUnderline
    };

    setComments(prev => {
      const updated = [...prev, comment];
      // Save to backend
      if (id) {
        // updateInvoice is async
        updateInvoice(id, { comments: updated })
          .catch(err => console.error("Error saving comments to backend:", err));
      }
      return updated;
    });
    setNewComment("");
    setCommentBold(false);
    setCommentItalic(false);
    setCommentUnderline(false);
  };

  const filteredStatusOptions = statusFilters.filter(filter =>
    filter.toLowerCase().includes(filterSearch.toLowerCase())
  );

  if (!invoice) {
    return <div>Loading...</div>;
  }

  const invoiceTotalsMeta = getInvoiceTotalsMeta(invoice);
  const displayItems = normalizeInvoiceItems(invoice);
  const hasProjectItems = displayItems.some((item) => Boolean(item.projectName || item.projectId || item.project));
  const itemsTableTitle = hasProjectItems ? "Project Details" : "Item Table";

  return (
    <>
      <style>{`
        @media print {
          /* Hide all UI elements except the document */
          body > *:not(.print-content),
          .print-content ~ *,
          header,
          nav,
          aside,
          button:not(.print-content button),
          .sidebar,
          [class*="sidebar"],
          [class*="header"],
          [class*="Header"],
          [class*="action"],
          [class*="Action"],
          [class*="dropdown"],
          [class*="Dropdown"],
          [class*="menu"],
          [class*="Menu"] {
            display: none !important;
          }
          
          /* Show only the print content */
          .print-content {
            display: block !important;
            position: relative !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            max-width: 100% !important;
            page-break-inside: avoid;
          }
          
          /* Ensure document is visible */
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Hide hover elements */
          .print-content:hover * {
            display: none !important;
          }
          
          /* Show customize button content but hide the button itself */
          .print-content button {
            display: none !important;
          }
        }
      `}</style>
      <div className="w-full h-screen flex bg-white overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-screen overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="relative flex-1" ref={allInvoicesDropdownRef}>
              <button
                onClick={() => setIsAllInvoicesDropdownOpen(!isAllInvoicesDropdownOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50"
              >
                {isAllInvoicesDropdownOpen ? (
                  <ChevronUp size={16} className="text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700">All Invoices</span>
              </button>

              {/* Filter Dropdown */}
              {isAllInvoicesDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                    <Search size={16} className="text-gray-500" />
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
                      setIsAllInvoicesDropdownOpen(false);
                      navigate("/sales/invoices/custom-view/new");
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
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => navigate(`/sales/invoices/${inv.id}`)}
                className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${inv.id === id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                  }`}
              >
                <Square size={14} className="text-gray-400 cursor-pointer" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate mb-1">{inv.customerName || (typeof inv.customer === 'string' ? inv.customer : inv.customer?.displayName || inv.customer?.name || "-")}</div>
                  <div className="text-sm font-medium text-gray-900 mb-1">{formatCurrency(getInvoiceDisplayTotal(inv), inv.currency)}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <span>{inv.invoiceNumber || inv.id}</span>
                    <span>{formatDate(inv.invoiceDate || inv.date)}</span>
                    {inv.orderNumber && <span>{inv.orderNumber}</span>}
                  </div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${getInvoiceStatusDisplay(inv).color}`}>
                    {getInvoiceStatusDisplay(inv).text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h1 className="text-[30px] leading-none font-semibold text-gray-900">{invoice.invoiceNumber || invoice.id}</h1>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 text-gray-600 border border-gray-300 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer"
                  title="Attachments"
                  onClick={() => {
                    setShowAttachmentsModal(true);
                    setShowCommentsSidebar(false);
                  }}
                >
                  <Paperclip size={16} />
                </button>
                <button
                  className="p-1.5 text-gray-600 border border-gray-300 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer"
                  title="Comments"
                  onClick={() => {
                    setShowCommentsSidebar(true);
                    setShowAttachmentsModal(false);
                  }}
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                  onClick={() => navigate("/sales/invoices")}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 px-6 py-2 text-[13px] text-gray-700">
              <button
                onClick={() => navigate(`/sales/invoices/${id}/edit`)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                <Edit size={13} />
                Edit
              </button>

              <div className="relative" ref={sendDropdownRef}>
                <button
                  onClick={() => setIsSendDropdownOpen(!isSendDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Mail size={13} />
                  Send
                  <ChevronDown size={12} />
                </button>
                {isSendDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px]">
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={handleSendEmail}
                    >
                      <Mail size={14} />
                      Send Email
                    </div>
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={handleScheduleEmail}
                    >
                      <Clock size={14} />
                      Schedule Email
                    </div>
                    <div className="h-px bg-gray-200 my-1"></div>
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={handleSendReminderNow}
                    >
                      <Send size={14} />
                      Send Reminder Now
                    </div>
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={handleSetExpectedPaymentDate}
                    >
                      <Calendar size={14} />
                      Expected Payment Date
                    </div>
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={handleToggleStopReminders}
                    >
                      <AlertTriangle size={14} className="text-orange-500" />
                      {(invoice as any)?.remindersStopped ? "Enable Reminders" : "Stop Reminders"}
                    </div>
                  </div>
                )}
              </div>

              <button
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                onClick={handleShare}
              >
                <Share2 size={13} />
                Share
              </button>

              <div className="relative" ref={pdfDropdownRef}>
                <button
                  onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <FileText size={13} />
                  PDF
                  <ChevronDown size={12} />
                </button>
                {isPdfDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={handleDownloadPDF}
                    >
                      <Download size={14} />
                      Download PDF
                    </div>
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={handleViewInvoiceInNewPage}
                    >
                      <FileText size={14} />
                      Display as New Page
                    </div>
                  </div>
                )}
              </div>

              {invoice && (invoice.status?.toLowerCase() === 'unpaid' || invoice.status?.toLowerCase() === 'sent' || invoice.status?.toLowerCase() === 'draft' || invoice.status?.toLowerCase() === 'partially paid' || invoice.status?.toLowerCase() === 'overdue') && (
                <button
                  onClick={handleRecordPayment}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Banknote size={13} />
                  Record Payment
                </button>
              )}

              <div className="relative ml-1" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>
                {isMoreMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 min-w-[220px] rounded-md border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
                    {invoice?.status?.toLowerCase() === "draft" ? (
                      <>
                        <div
                          className="mx-1 mt-1 flex items-center gap-2 rounded-md bg-[#4a89e8] px-4 py-2 text-sm text-white cursor-pointer transition-colors"
                          onClick={handleMarkAsSent}
                        >
                          <Send size={14} />
                          Mark As Sent
                        </div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleCreateCreditNote}
                        >
                          <div className="w-4 h-4 border border-blue-400 rounded flex items-center justify-center">
                            <Minus size={10} className="text-blue-400" />
                          </div>
                          Create Credit Note
                        </div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleClone}
                        >
                          <Copy size={14} />
                          Clone
                        </div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleVoidInvoice}
                        >
                          <X size={14} />
                          Void
                        </div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleDeleteInvoice}
                        >
                          <Trash2 size={14} />
                          Delete
                        </div>
                        <div className="h-px bg-gray-200 my-1"></div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleInvoicePreferences}
                        >
                          <Settings size={14} />
                          Invoice Preferences
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-white cursor-pointer transition-colors"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                          onClick={handleMakeRecurring}
                        >
                          <Repeat size={14} />
                          Make Recurring
                        </div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleCreateCreditNote}
                        >
                          <div className="w-4 h-4 border border-blue-400 rounded flex items-center justify-center">
                            <Minus size={10} className="text-blue-400" />
                          </div>
                          Create Credit Note
                        </div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleClone}
                        >
                          <Copy size={14} />
                          Clone
                        </div>
                        <div className="h-px bg-gray-200 my-1"></div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleViewJournal}
                        >
                          <BookOpen size={14} />
                          View Journal
                        </div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleDeleteInvoice}
                        >
                          <Trash2 size={14} />
                          Delete
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payments Received Section */}
          {payments.length > 0 && (
            <div className="px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>Payments Received {payments.length}</span>
                <ChevronDown size={14} className="text-gray-500" />
              </div>
            </div>
          )}

          {/* What's Next Section */}
          {(invoice.status === "draft" || invoice.status?.toLowerCase() === "sent" || invoice.status?.toLowerCase() === "unpaid" || invoice.status?.toLowerCase() === "partially paid" || invoice.status?.toLowerCase() === "overdue") && (
            <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg mx-6 mt-4 flex-shrink-0">
              <Sparkles size={20} className="text-blue-600 flex-shrink-0" />
              <span>WHAT'S NEXT? {invoice.status === "draft" ? "Send this Invoice to your customer or record a payment." : "Record a payment for this invoice."}</span>
              <div className="flex items-center gap-2 ml-auto">
                {invoice.status === "draft" && (
                  <>
                    <button
                      onClick={handleSendInvoice}
                      className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                    >
                      Send Invoice
                    </button>
                    <button
                      onClick={handleMarkAsSent}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                    >
                      Mark As Sent
                    </button>
                  </>
                )}
                <button
                  onClick={handleRecordPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 flex items-center gap-2"
                >
                  <Banknote size={16} />
                  Record Payment
                </button>
              </div>
            </div>
          )}

          {/* Invoice Document */}
          <div className="p-8 bg-gray-100 flex justify-center">
            <div
              className="bg-white shadow-lg relative print-content"
              data-print-content
              style={{ width: "210mm", minHeight: "297mm", padding: "20mm" }}
              onMouseEnter={() => setIsInvoiceDocumentHovered(true)}
              onMouseLeave={() => {
                setIsInvoiceDocumentHovered(false);
                setIsCustomizeDropdownOpen(false);
              }}
            >
              {/* Status Ribbon */}
              {(invoice.status === "draft" || invoice.status?.toLowerCase() === "paid" || invoice.status?.toLowerCase() === "sent" || invoice.status?.toLowerCase() === "unpaid") && (
                <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden">
                  <div className={`absolute top-8 left-8 w-40 h-8 transform -rotate-45 origin-center flex items-center justify-center shadow-sm ${invoice.status?.toLowerCase() === "paid" ? "bg-green-500" :
                    (invoice.status?.toLowerCase() === "sent" || invoice.status?.toLowerCase() === "unpaid") ? "bg-blue-500" :
                      "bg-yellow-500"
                    }`}>
                    <span className="text-white font-bold text-sm uppercase tracking-wider">
                      {invoice.status?.toLowerCase() === "sent" ? "UNPAID" : invoice.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Customize Button - appears on hover */}
              {isInvoiceDocumentHovered && (
                <div className="absolute top-0 right-0 z-10" ref={customizeDropdownRef}>
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity shadow-md"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                    onClick={() => setIsCustomizeDropdownOpen(!isCustomizeDropdownOpen)}
                  >
                    <Settings size={16} />
                    Customize
                    <ChevronDown size={14} />
                  </button>
                  {isCustomizeDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px]">
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          // Handle Standard Template action
                          console.log("Standard Template");
                        }}
                      >
                        Standard Template
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-white cursor-pointer transition-opacity"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          setIsChooseTemplateModalOpen(true);
                        }}
                      >
                        Change Template
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          // Handle Edit Template action
                          console.log("Edit Template");
                        }}
                      >
                        Edit Template
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          setIsOrganizationAddressModalOpen(true);
                        }}
                      >
                        Update Logo & Address
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          navigate("/settings/invoices");
                        }}
                      >
                        Manage Custom Fields
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          setIsTermsAndConditionsModalOpen(true);
                        }}
                      >
                        Terms & Conditions
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Document Header */}
              <div className="flex justify-between items-start mb-12 mt-8">
                {/* Left Column: Logo & Company Info */}
                <div className="flex flex-col items-start gap-4">
                  {/* Logo */}
                  <div className="relative w-24 h-24">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Organization Logo"
                        className="w-full h-full object-contain object-left"
                      />
                    ) : (
                      <svg width="96" height="96" viewBox="0 0 80 80" className="w-full h-full">
                        {/* Sun with rays */}
                        <circle cx="40" cy="15" r="12" fill="#f97316" />
                        <circle cx="40" cy="15" r="8" fill="#fb923c" />
                        {/* Sun rays */}
                        {[...Array(8)].map((_, i) => {
                          const angle = (i * 45) * (Math.PI / 180);
                          const x1 = 40 + Math.cos(angle) * 12;
                          const y1 = 15 + Math.sin(angle) * 12;
                          const x2 = 40 + Math.cos(angle) * 18;
                          const y2 = 15 + Math.sin(angle) * 18;
                          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f97316" strokeWidth="2" />;
                        })}
                        {/* Book - green covers */}
                        <rect x="28" y="28" width="24" height="16" rx="2" fill="#16a34a" />
                        <rect x="30" y="30" width="20" height="12" rx="1" fill="#15803d" />
                        {/* Book pages - blue */}
                        <rect x="30" y="30" width="18" height="12" rx="1" fill="#3b82f6" />
                        <rect x="32" y="32" width="16" height="8" rx="1" fill="#2563eb" />
                        {/* Pen - blue vertical */}
                        <rect x="38" y="48" width="4" height="20" rx="2" fill="#1e3a8a" />
                      </svg>
                    )}
                  </div>

                  {/* Company Name & Address */}
                  <div>
                    <div className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
                      {organizationProfile?.name || 'TABAN ENTERPRISES'}
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed max-w-[250px]">
                      <p>{organizationProfile?.address?.street1 || 'taleex'}</p>
                      <p>{organizationProfile?.address?.street2 || 'taleex'}</p>
                      <p>
                        {organizationProfile?.address?.city ?
                          `${organizationProfile.address.city}${organizationProfile.address.zipCode ? ' ' + organizationProfile.address.zipCode : ''}` :
                          'mogadishu Nairobi 22223'
                        }
                      </p>
                      <p>{organizationProfile?.address?.country || 'Somalia'}</p>
                      <p className="mt-1">{ownerEmail?.email || organizationProfile?.email || 'nasram172@gmail.com'}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Invoice Details & Balance */}
                <div className="text-right">
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <div className="text-4xl font-normal text-gray-800">INVOICE</div>
                  </div>
                  <div className="text-sm font-medium text-gray-600 mb-8"># {invoice.invoiceNumber || invoice.id}</div>

                  <div className="flex flex-col items-end">
                    <div className="text-xs text-gray-600 mb-1">Balance Due</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(invoiceTotalsMeta.balance, invoice.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To & Details Section */}
              <div className="flex justify-between items-start mb-12">
                {/* Bill To */}
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-2">Bill To</div>
                  <div className="text-sm font-bold text-blue-600 mb-1 uppercase">
                    {invoice.customerName || (typeof invoice.customer === 'object' ? (invoice.customer?.displayName || invoice.customer?.companyName || invoice.customer?.name) : invoice.customer) || "CUSTOMER"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {invoice.customerAddress?.street1 && <div>{invoice.customerAddress.street1}</div>}
                    {invoice.customerAddress?.city && invoice.customerAddress?.state && (
                      <div>{invoice.customerAddress.city}, {invoice.customerAddress.state}</div>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="text-right">
                  <div className="grid grid-cols-[auto_auto] gap-x-12 gap-y-2 text-sm">
                    <div className="text-gray-600 text-right">Invoice Date :</div>
                    <div className="text-gray-900 font-medium text-right">{formatDateShort(invoice.invoiceDate || invoice.date)}</div>

                    <div className="text-gray-600 text-right">Terms :</div>
                    <div className="text-gray-900 font-medium text-right">Due on Receipt</div>

                    <div className="text-gray-600 text-right">Due Date :</div>
                    <div className="text-gray-900 font-medium text-right">{formatDateShort(invoice.dueDate)}</div>

                    <div className="text-gray-600 text-right">P.O.# :</div>
                    <div className="text-gray-900 font-medium text-right">{invoice.orderNumber || invoice.poNumber || "22"}</div>
                  </div>
                </div>
              </div>

              {/* Items Table - Dark Header */}
              <div className="mb-8">
                <div className="text-sm font-semibold text-gray-700 mb-2">{itemsTableTitle}</div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#333333] text-white">
                      <th className="py-2 px-3 text-sm font-medium text-center w-12 border-r border-gray-600">#</th>
                      <th className="py-2 px-4 text-sm font-medium text-left">Item & Description</th>
                      <th className="py-2 px-3 text-sm font-medium text-center w-20">Qty</th>
                      <th className="py-2 px-3 text-sm font-medium text-right w-24">Rate</th>
                      <th className="py-2 px-4 text-sm font-medium text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.length > 0 ? (
                      displayItems.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-gray-200">
                          <td className="py-4 px-3 text-sm text-gray-700 text-center align-top">{index + 1}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 align-top">
                            <div className="font-medium">{item.displayName || "Item"}</div>
                            {item.displayDescription && item.displayDescription !== item.displayName && (
                              <div className="text-xs text-gray-500 mt-1">{item.displayDescription}</div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-sm text-gray-700 text-center align-top">
                            <div>{Number(item.displayQuantity || 0).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{item.displayUnit || 'pcs'}</div>
                          </td>
                          <td className="py-4 px-3 text-sm text-gray-700 text-right align-top">{Number(item.displayRate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 text-right font-medium align-top">{Number(item.displayAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-gray-500">No items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Section */}
              <div className="flex justify-end mb-12">
                <div className="w-80">
                  <div className="flex justify-between py-2 text-sm border-b border-gray-200">
                    <div className="text-gray-600">Sub Total</div>
                    <div className="text-gray-900 font-medium">{invoiceTotalsMeta.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="text-xs text-gray-500 -mt-1 mb-1">({invoiceTotalsMeta.taxExclusive})</div>

                  {invoiceTotalsMeta.discountAmount > 0 && (
                    <>
                      <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                        <div className="text-gray-600">{invoiceTotalsMeta.discountLabel}</div>
                        <div className="text-gray-900 font-medium">
                          (-) {invoiceTotalsMeta.discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 -mt-1 mb-1">
                        (Applied on {invoiceTotalsMeta.discountBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </div>
                    </>
                  )}

                  {invoiceTotalsMeta.taxAmount > 0 && (
                    <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                      <div className="text-gray-600">{invoiceTotalsMeta.taxLabel}</div>
                      <div className="text-gray-900 font-medium">
                        {invoiceTotalsMeta.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  {invoiceTotalsMeta.shippingCharges !== 0 && (
                    <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                      <div className="text-gray-600">Shipping charge</div>
                      <div className="text-gray-900 font-medium">
                        {invoiceTotalsMeta.shippingCharges.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  {invoiceTotalsMeta.adjustment !== 0 && (
                    <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                      <div className="text-gray-600">Adjustment</div>
                      <div className="text-gray-900 font-medium">
                        {invoiceTotalsMeta.adjustment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  {invoiceTotalsMeta.roundOff !== 0 && (
                    <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                      <div className="text-gray-600">Round Off</div>
                      <div className="text-gray-900 font-medium">
                        {invoiceTotalsMeta.roundOff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between py-2 text-sm font-bold border-b border-gray-200">
                    <div className="text-gray-900">Total</div>
                    <div className="text-gray-900">{formatCurrency(invoiceTotalsMeta.total, invoice.currency)}</div>
                  </div>

                  {invoiceTotalsMeta.paidAmount > 0 && (
                    <div className="flex justify-between py-2 text-sm text-gray-600">
                      <div>Payment Made</div>
                      <div className="font-medium">
                        (-) {invoiceTotalsMeta.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  {invoiceTotalsMeta.creditsApplied > 0 && (
                    <div className="flex justify-between py-2 text-sm text-red-500">
                      <div>Credits Applied</div>
                      <div className="font-medium">
                        (-) {invoiceTotalsMeta.creditsApplied.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between py-2 px-3 bg-gray-100 font-bold text-sm mt-2 border border-gray-200 rounded">
                    <div className="text-gray-900 uppercase">Balance Due</div>
                    <div className="text-gray-900">
                      {formatCurrency(invoiceTotalsMeta.balance, invoice.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mt-auto">
                <div className="text-sm text-gray-900 mb-4">Notes</div>
                <div className="text-sm text-gray-500 mb-8">
                  {invoice.customerNotes || "Thank you for the payment. You just made our day."}
                </div>
              </div>

              {/* PDF Template Footer */}
              <div className="mt-8 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400">
                  PDF Template: 'Standard Template' <button className="text-blue-600 hover:text-blue-700 underline ml-1">Change</button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Send Email Modal */}
        {isSendEmailModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsSendEmailModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {/* Send Email Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Email To {invoice.customerName || invoice.customer || "Customer"}</h2>
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setIsSendEmailModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* From Field */}
                <div className="flex mb-4">
                  <div className="w-24 pt-2 text-right pr-4">
                    <label className="text-sm text-gray-500 font-medium flex items-center justify-end gap-1">
                      From <HelpCircle size={14} className="text-gray-400" />
                    </label>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 py-2">
                      {ownerEmail?.name || "JIRDE HUSSEIN KHALIF"} &lt;{ownerEmail?.email || "jirdehusseinkhalif@gmail.com"}&gt;
                    </div>
                  </div>
                </div>

                {/* Send To Field */}
                <div className="flex mb-4">
                  <div className="w-24 pt-2 text-right pr-4">
                    <label className="text-sm text-gray-500 font-medium">Send To</label>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 p-1.5 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400">
                      {emailData.to && (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                          <span className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded text-xs font-bold text-gray-600 uppercase">
                            {emailData.to.charAt(0)}
                          </span>
                          <span>{emailData.to}</span>
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-600 ml-1"
                            onClick={() => setEmailData(prev => ({ ...prev, to: "" }))}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      <input
                        type="email"
                        className="flex-1 min-w-[150px] outline-none text-sm text-gray-700 py-1"
                        value={emailData.to ? "" : emailData.to} // Hide raw value if chip is shown? Or allow editing? Simplified for now: if empty allow type
                        onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                        placeholder={emailData.to ? "" : "Enter email address"}
                      />
                      <div className="ml-auto flex items-center gap-3 pr-2">
                        {!emailData.cc && <button className="text-blue-500 text-sm hover:underline cursor-pointer" onClick={() => setEmailData(prev => ({ ...prev, cc: " " }))}>Cc</button>}
                        {!emailData.bcc && <button className="text-blue-500 text-sm hover:underline cursor-pointer" onClick={() => setEmailData(prev => ({ ...prev, bcc: " " }))}>Bcc</button>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CC Field - Conditionally Shown */}
                {emailData.cc !== undefined && (
                  <div className="flex mb-4">
                    <div className="w-24 pt-2 text-right pr-4">
                      <label className="text-sm text-gray-500 font-medium">Cc</label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="email"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={emailData.cc.trim()}
                        onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setEmailData(prev => ({ ...prev, cc: undefined }))}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* BCC Field - Conditionally Shown */}
                {emailData.bcc !== undefined && (
                  <div className="flex mb-4">
                    <div className="w-24 pt-2 text-right pr-4">
                      <label className="text-sm text-gray-500 font-medium">Bcc</label>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="email"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={emailData.bcc.trim()}
                        onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setEmailData(prev => ({ ...prev, bcc: undefined }))}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}


                {/* Subject Field */}
                <div className="flex mb-6">
                  <div className="w-24 pt-2 text-right pr-4">
                    <label className="text-sm text-gray-500 font-medium">Subject</label>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 px-0 py-2 text-sm text-gray-800 font-medium"
                      value={emailData.subject}
                      onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  {/* Rich Text Toolbar */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-t-md border-b-0 flex-wrap">
                    <button
                      type="button"
                      className={`p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isBold ? 'bg-gray-200' : ''}`}
                      onClick={() => setIsBold(!isBold)}
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      className={`p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isItalic ? 'bg-gray-200' : ''}`}
                      onClick={() => setIsItalic(!isItalic)}
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type="button"
                      className={`p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isUnderline ? 'bg-gray-200' : ''}`}
                      onClick={() => setIsUnderline(!isUnderline)}
                    >
                      <Underline size={14} />
                    </button>
                    <button
                      type="button"
                      className={`p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isStrikethrough ? 'bg-gray-200' : ''}`}
                      onClick={() => setIsStrikethrough(!isStrikethrough)}
                    >
                      <Strikethrough size={14} />
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded bg-white text-xs cursor-pointer focus:outline-none"
                    >
                      <option value="12">12 px</option>
                      <option value="14">14 px</option>
                      <option value="16">16 px</option>
                      <option value="18">18 px</option>
                    </select>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button type="button" className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                      <AlignLeft size={14} />
                    </button>
                    <button type="button" className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                      <AlignCenter size={14} />
                    </button>
                    <button type="button" className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                      <AlignRight size={14} />
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button type="button" className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                      <LinkIcon size={14} />
                    </button>
                    <button type="button" className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                      <ImageIcon size={14} />
                    </button>
                  </div>

                  {/* Rich Text Editor Content */}
                  <div
                    contentEditable
                    className="min-h-[300px] p-4 border border-gray-300 rounded-b-md text-sm outline-none bg-white overflow-y-auto"
                    style={{
                      fontWeight: isBold ? "bold" : "normal",
                      fontStyle: isItalic ? "italic" : "normal",
                      textDecoration: isUnderline ? "underline" : isStrikethrough ? "line-through" : "none",
                      fontSize: `${fontSize}px`,
                    }}
                    onInput={(e) => setEmailData(prev => ({ ...prev, message: (e.target as HTMLElement).innerHTML }))}
                    suppressContentEditableWarning={true}
                    dangerouslySetInnerHTML={{ __html: emailData.message }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText size={16} />
                  <span>Invoice PDF will be attached</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  onClick={handleSendEmailSubmit}
                >
                  Send
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => setIsSendEmailModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Email Modal */}
        {isScheduleEmailModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsScheduleEmailModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Schedule Email</h2>
                <button
                  className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={() => setIsScheduleEmailModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={scheduleData.to}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={scheduleData.cc}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, cc: e.target.value }))}
                    placeholder="Enter CC email addresses (comma separated)"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={scheduleData.bcc}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, bcc: e.target.value }))}
                    placeholder="Enter BCC email addresses (comma separated)"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={scheduleData.subject}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter email subject"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={scheduleData.message}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter email message"
                    rows={8}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={scheduleData.date}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="time"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={scheduleData.time}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, time: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <FileText size={16} />
                  <span>Invoice PDF will be attached</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  onClick={handleScheduleEmailSubmit}
                >
                  Schedule
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => setIsScheduleEmailModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Confirmation Modal */}
        {isRecordPaymentModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsRecordPaymentModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    Invoice status will be changed to 'Sent' once the payment is recorded.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={doNotShowAgain}
                    onChange={(e) => setDoNotShowAgain(e.target.checked)}
                  />
                  <span>Do not show this again</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  onClick={handleRecordPaymentConfirm}
                >
                  OK
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => setIsRecordPaymentModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && invoice && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowShareModal(false);
              }
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
              ref={shareModalRef}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Share Invoice Link
                </h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                  onClick={() => setShowShareModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Visibility Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility:
                  </label>
                  <div className="relative" ref={visibilityDropdownRef}>
                    <button
                      className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-red-600 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setIsVisibilityDropdownOpen(!isVisibilityDropdownOpen)}
                    >
                      <span className="font-medium">{shareVisibility}</span>
                      <ChevronDown size={16} className="text-red-600" />
                    </button>
                    {isVisibilityDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <div
                          className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setShareVisibility("Public");
                            setIsVisibilityDropdownOpen(false);
                          }}
                        >
                          Public
                        </div>
                        <div
                          className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setShareVisibility("Private");
                            setIsVisibilityDropdownOpen(false);
                          }}
                        >
                          Private
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Text */}
                <p className="text-sm text-gray-600 mb-6">
                  Select an expiration date and generate the link to share it with your customer. Remember that anyone who has access to this link can view, print or download it.
                </p>

                {/* Link Expiration Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-red-600 mb-2">
                    Link Expiration Date<span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={linkExpirationDate}
                    onChange={(e) => setLinkExpirationDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <HelpCircle size={14} className="text-gray-500" />
                    <span>By default, the link is set to expire 90 days from the invoice due date.</span>
                  </div>
                </div>

                {/* Generated Link Display */}
                {isLinkGenerated && generatedLink && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Generated Link:
                    </label>
                    <textarea
                      readOnly
                      value={generatedLink}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm bg-gray-50 font-mono resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <div>
                  {isLinkGenerated && (
                    <button
                      className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                      onClick={handleCopyLink}
                    >
                      Copy Link
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!isLinkGenerated ? (
                    <button
                      className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-opacity"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                      onClick={handleGenerateLink}
                    >
                      Generate Link
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                      onClick={handleDisableAllActiveLinks}
                    >
                      Disable All Active Links
                    </button>
                  )}
                  <button
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => setShowShareModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attachments Modal */}
        {showAttachmentsModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAttachmentsModal(false);
              }
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Attachments</h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                  onClick={() => setShowAttachmentsModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {invoiceAttachments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No Files Attached</p>
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => attachmentsFileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileUp size={24} className="text-gray-400" />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <span>Upload your</span>
                          <span className="text-blue-600 font-medium">Files</span>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      You can upload a maximum of 5 files, 10MB each.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoiceAttachments.map((attachment) => {
                      const isImage = attachment.type && attachment.type.startsWith('image/');
                      return (
                        <div
                          key={attachment.id}
                          className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleFileClick(attachment)}
                        >
                          {isImage && attachment.preview ? (
                            <img
                              src={attachment.preview}
                              alt={attachment.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <FileText size={20} className="text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 font-medium truncate">
                              {attachment.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(attachment.size / 1024).toFixed(2)} KB
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAttachment(attachment.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                    {invoiceAttachments.length < 5 && (
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                          }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => attachmentsFileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FileUp size={20} className="text-gray-400" />
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <span>Upload your</span>
                            <span className="text-blue-600 font-medium">Files</span>
                            <ChevronDown size={12} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={attachmentsFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handleFileUpload(files);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Modal */}
        {showImageViewer && selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center"
            onClick={() => {
              setShowImageViewer(false);
              setSelectedImage(null);
            }}
          >
            <div className="max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
              <button
                className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 text-gray-900"
                onClick={() => {
                  setShowImageViewer(false);
                  setSelectedImage(null);
                }}
              >
                <X size={24} />
              </button>
              <img
                src={selectedImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Comments Sidebar */}
        {showCommentsSidebar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div
              className="bg-white w-full max-w-md h-full shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
                <button
                  className="p-1 border border-blue-600 rounded text-red-600 hover:bg-red-50"
                  onClick={() => setShowCommentsSidebar(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Comment Input */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex gap-1 mb-2">
                  <button
                    className={`p-1.5 rounded ${commentBold ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    onClick={() => setCommentBold(!commentBold)}
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    className={`p-1.5 rounded ${commentItalic ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    onClick={() => setCommentItalic(!commentItalic)}
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    className={`p-1.5 rounded ${commentUnderline ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    onClick={() => setCommentUnderline(!commentUnderline)}
                  >
                    <Underline size={14} />
                  </button>
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  style={{
                    fontWeight: commentBold ? 'bold' : 'normal',
                    fontStyle: commentItalic ? 'italic' : 'normal',
                    textDecoration: commentUnderline ? 'underline' : 'none'
                  }}
                />
                <button
                  className="mt-2 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                  onClick={handleAddComment}
                >
                  Add Comment
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">All Comments</h3>
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No comments yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-0">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
                            {comment.author.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{comment.author}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(comment.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div
                          className="text-sm text-gray-700 ml-10"
                          style={{
                            fontWeight: comment.bold ? 'bold' : 'normal',
                            fontStyle: comment.italic ? 'italic' : 'normal',
                            textDecoration: comment.underline ? 'underline' : 'none'
                          }}
                        >
                          {comment.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Choose Template Modal - Right Side */}
        {isChooseTemplateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
            <div
              className="bg-white h-full w-[500px] flex flex-col shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Choose Template</h2>
                <button
                  className="p-1 text-red-500 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                  onClick={() => setIsChooseTemplateModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Template"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-blue-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Template List */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Template Preview Card */}
                <div className="mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    {/* Invoice Preview */}
                    <div className="bg-gray-50 rounded border border-gray-200 p-4 mb-3" style={{ minHeight: "200px" }}>
                      {/* Preview Content */}
                      <div className="text-xs">
                        {/* Logo and Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
                            Z
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">INVOICE</div>
                          </div>
                        </div>
                        {/* Invoice Details Preview */}
                        <div className="space-y-1 text-gray-600">
                          <div className="flex justify-between">
                            <span>Invoice #:</span>
                            <span>INV-001</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Date:</span>
                            <span>01/01/2024</span>
                          </div>
                          <div className="border-t border-gray-300 my-2"></div>
                          <div className="flex justify-between">
                            <span>Item 1</span>
                            <span>$100.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Item 2</span>
                            <span>$200.00</span>
                          </div>
                          <div className="border-t border-gray-300 my-2"></div>
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>$300.00</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selected Button */}
                    {selectedTemplate === "Standard Template" && (
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium transition-opacity" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                        <Star size={16} fill="white" />
                        SELECTED
                      </button>
                    )}
                    {selectedTemplate !== "Standard Template" && (
                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                        onClick={() => setSelectedTemplate("Standard Template")}
                      >
                        Select
                      </button>
                    )}
                  </div>

                  {/* Template Name */}
                  <div className="text-center mt-2">
                    <span className="text-sm font-medium text-gray-900">Standard Template</span>
                  </div>
                </div>

                {/* Scroll Indicator */}
                <div className="flex justify-center mt-4">
                  <ChevronUp size={16} className="text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Field Customization Modal */}
        {isFieldCustomizationOpen && (
          <FieldCustomization
            featureType="invoices"
            onClose={() => setIsFieldCustomizationOpen(false)}
          />
        )}

        {/* Organization Address Modal */}
        {isOrganizationAddressModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Organization Address</h2>
                <button
                  className="p-2 text-white rounded transition-opacity"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  onClick={() => setIsOrganizationAddressModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Logo Upload Section */}
                <div className="mb-6">
                  <div className="flex gap-6">
                    {/* Logo Upload Area */}
                    <div className="flex-shrink-0">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={() => organizationAddressFileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-blue-500');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('border-blue-500');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-500');
                          const files = e.dataTransfer.files;
                          if (files.length > 0) {
                            handleLogoUpload(files[0]);
                          }
                        }}
                      >
                        {logoPreview ? (
                          <div className="relative">
                            <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-32 mx-auto mb-2" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogoFile(null);
                                setLogoPreview(null);
                              }}
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-700 font-medium">Upload Your Organization Logo</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={organizationAddressFileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </div>

                    {/* Logo Description */}
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">
                        This logo will be displayed in transaction PDFs and email notifications.
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        Preferred Image Dimensions: 240 x 240 pixels @ 72 DPI
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        Supported Files: jpg, jpeg, png, gif, bmp
                      </p>
                      <p className="text-sm text-gray-600">
                        Maximum File Size: 1MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address Fields */}
                <div className="space-y-4">
                  {/* Street 1 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street 1
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={organizationData.street1}
                        onChange={(e) => setOrganizationData({ ...organizationData, street1: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                      />
                      <Pencil size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Street 2 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street 2
                    </label>
                    <input
                      type="text"
                      value={organizationData.street2}
                      onChange={(e) => setOrganizationData({ ...organizationData, street2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* City and ZIP/Postal Code */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={organizationData.city}
                        onChange={(e) => setOrganizationData({ ...organizationData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP/Postal Code
                      </label>
                      <input
                        type="text"
                        value={organizationData.zipCode}
                        onChange={(e) => setOrganizationData({ ...organizationData, zipCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* State/Province and Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province <span className="text-red-600">*</span>
                      </label>
                      <input
                        list="invoice-organization-state-options"
                        value={organizationData.stateProvince}
                        onChange={(e) => setOrganizationData({ ...organizationData, stateProvince: e.target.value })}
                        placeholder="State/Province"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                      />
                      <datalist id="invoice-organization-state-options">
                        {stateOptions.map((state) => (
                          <option key={state} value={state} />
                        ))}
                      </datalist>
                      <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={organizationData.phone}
                        onChange={(e) => setOrganizationData({ ...organizationData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Fax Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fax Number
                    </label>
                    <input
                      type="text"
                      value={organizationData.faxNumber}
                      onChange={(e) => setOrganizationData({ ...organizationData, faxNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Website URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website URL
                    </label>
                    <input
                      type="text"
                      placeholder="Website URL"
                      value={organizationData.websiteUrl}
                      onChange={(e) => setOrganizationData({ ...organizationData, websiteUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Industry Selection */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Industry
                    </label>
                    <select
                      value={organizationData.industry}
                      onChange={(e) => setOrganizationData({ ...organizationData, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
                    >
                      <option value="">Select Industry</option>
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="services">Services</option>
                      <option value="technology">Technology</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="education">Education</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-opacity"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  onClick={() => {
                    // Handle save action
                    console.log("Saving organization data:", organizationData, logoFile);
                    // Save organization data to localStorage
                    localStorage.setItem('organization_address', JSON.stringify(organizationData));
                    // Logo is already saved in handleLogoUpload
                    setIsOrganizationAddressModalOpen(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsOrganizationAddressModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Terms & Conditions Modal */}
        {isTermsAndConditionsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Update Terms & Conditions</h2>
                <button
                  className="p-2 text-white rounded transition-opacity"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                  onClick={() => setIsTermsAndConditionsModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Notes Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                  <textarea
                    value={termsData.notes}
                    onChange={(e) => setTermsData({ ...termsData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                    placeholder="Enter notes..."
                  />
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsData.useNotesForAllInvoices}
                      onChange={(e) => setTermsData({ ...termsData, useNotesForAllInvoices: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Use this in future for all invoices of all customers.</span>
                  </label>
                </div>

                {/* Terms & Conditions Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                  <textarea
                    value={termsData.termsAndConditions}
                    onChange={(e) => setTermsData({ ...termsData, termsAndConditions: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[200px]"
                    placeholder="Enter terms and conditions..."
                  />
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsData.useTermsForAllInvoices}
                      onChange={(e) => setTermsData({ ...termsData, useTermsForAllInvoices: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Use this in future for all invoices of all customers.</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-opacity"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  onClick={() => {
                    // Handle save action
                    console.log("Saving terms and conditions:", termsData);
                    setIsTermsAndConditionsModalOpen(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsTermsAndConditionsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

