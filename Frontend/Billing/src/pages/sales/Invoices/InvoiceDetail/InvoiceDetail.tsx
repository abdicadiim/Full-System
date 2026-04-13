import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { senderEmailsAPI } from "../../../../services/api";
import { resolveVerifiedPrimarySender } from "../../../../utils/emailSenderDisplay";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getInvoiceById, getInvoices, updateInvoice, getPayments, getTaxes, getCreditNotesByInvoiceId, deletePayment, Tax, Invoice, AttachedFile, saveInvoice } from "../../salesModel";
import { currenciesAPI, invoicesAPI, debitNotesAPI, creditNotesAPI, paymentsReceivedAPI, bankAccountsAPI, refundsAPI } from "../../../../services/api";
import FieldCustomization from "../../../shared/FieldCustomization";
import InvoiceCommentsPanel from "./InvoiceCommentsPanel";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  X, Edit, Send, Share2, FileText, Clock, MoreVertical, MoreHorizontal,
  ChevronDown, ChevronUp, ChevronRight, Sparkles, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, Download, Mail, Calendar, AlertTriangle,
  Paperclip, MessageSquare, Link2, RotateCw, Repeat, Minus, Copy, BookOpen, Trash2, Settings,
  HelpCircle, FileUp, Bold, Italic, Underline, Check, Upload, Pencil, Banknote,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, Image as ImageIcon
} from "lucide-react";
import { getStatesByCountry } from "../../../../constants/locationData";

const DEFAULT_INVOICE_BRAND_NAME = "Taban Enterprise";
const DEFAULT_INVOICE_BRAND_NAME_UPPER = DEFAULT_INVOICE_BRAND_NAME.toUpperCase();

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
  const location = useLocation();
  const isDebitNoteView = location.pathname.includes("/sales/debit-notes/");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<any>>(new Set());
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDeleteInvoiceModalOpen, setIsDeleteInvoiceModalOpen] = useState(false);
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false);
  const [isRemindersDropdownOpen, setIsRemindersDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isAllInvoicesDropdownOpen, setIsAllInvoicesDropdownOpen] = useState(false);
  const [showSidebarMoreDropdown, setShowSidebarMoreDropdown] = useState(false);
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
  const [isPaymentsSectionOpen, setIsPaymentsSectionOpen] = useState(false);
  const [openPaymentMenuId, setOpenPaymentMenuId] = useState<string | null>(null);
  const [creditsAppliedCount, setCreditsAppliedCount] = useState(0);
  const [creditsAppliedRows, setCreditsAppliedRows] = useState<any[]>([]);
  const [paymentInfoTab, setPaymentInfoTab] = useState<"payments" | "credits" | "associated">("payments");
  const [associatedInvoiceRow, setAssociatedInvoiceRow] = useState<any>(null);
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false);
  const [selectedPaymentForDelete, setSelectedPaymentForDelete] = useState<any>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<any>(null);
  const [isSavingRefund, setIsSavingRefund] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [refundData, setRefundData] = useState({
    amount: "",
    refundedOn: "",
    paymentMode: "",
    referenceNumber: "",
    fromAccount: "",
    fromAccountId: "",
    description: ""
  });
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
  const [debitNote, setDebitNote] = useState<any>(null);
  const [customerRetainerAvailable, setCustomerRetainerAvailable] = useState<number>(0);
  const [customerRetainerInvoices, setCustomerRetainerInvoices] = useState<any[]>([]);
  const [customerCreditsAvailable, setCustomerCreditsAvailable] = useState<number>(0);
  const [isApplyRetainerOpen, setIsApplyRetainerOpen] = useState(false);
  const [retainerApplyValues, setRetainerApplyValues] = useState<Record<string, number>>({});
  const [isApplyingRetainer, setIsApplyingRetainer] = useState(false);
  const [isApplyAdjustmentsModalOpen, setIsApplyAdjustmentsModalOpen] = useState(false);
  const [isApplyingAdjustments, setIsApplyingAdjustments] = useState(false);
  const [isRemovingAppliedCreditId, setIsRemovingAppliedCreditId] = useState<string | null>(null);
  const [applyAdjustmentRows, setApplyAdjustmentRows] = useState<any[]>([]);
  const [applyAdjustmentValues, setApplyAdjustmentValues] = useState<Record<string, number>>({});
  const [applyOnDate, setApplyOnDate] = useState(new Date().toISOString().split("T")[0]);
  const [useApplyDate, setUseApplyDate] = useState(true);
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
  const sidebarMoreRef = useRef(null);
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

  const toNumSafe = (value: any, fallback = 0) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    const normalized = raw.replace(/,/g, "").replace(/[^0-9.\-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizeKey = (value: any) =>
    String(value || "")
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .trim();

  const isRetainerInvoice = (row: any) => {
    const typeValue = normalizeKey(row?.invoiceType || row?.type || row?.documentType || "");
    const number = String(row?.invoiceNumber || row?.retainerNumber || "").toUpperCase();
    return typeValue.includes("retainer") || number.startsWith("RET-");
  };

  const stripRetainerInvoices = (records: any[] = []) =>
    (Array.isArray(records) ? records : []).filter((row) => !isRetainerInvoice(row));

  const getSidebarStatusDisplay = (inv: any) => {
    const raw = normalizeKey(inv?.status || "");
    const total = toNumSafe(inv?.total ?? inv?.amount, 0);
    const paid = toNumSafe(inv?.amountPaid ?? inv?.paidAmount, 0);
    const computedBalance = inv?.balance !== undefined
      ? toNumSafe(inv.balance, 0)
      : inv?.balanceDue !== undefined
        ? toNumSafe(inv.balanceDue, 0)
        : Math.max(0, total - paid);
    const balance = Math.max(0, computedBalance);
    const dueDate = inv?.dueDate ? new Date(inv.dueDate) : null;
    const isOverdueByDate = !!(dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now() && balance > 0);

    if (raw === "paid" || (total > 0 && balance <= 0)) return { text: "Paid", color: "bg-green-100 text-green-700" };
    if (raw.includes("partial") || (total > 0 && balance > 0 && balance < total)) return { text: "Partially Paid", color: "bg-blue-100 text-blue-700" };
    if (raw === "draft") return { text: "Draft", color: "bg-gray-100 text-gray-600" };
    if (raw === "void") return { text: "Void", color: "bg-gray-200 text-gray-600" };
    if (isOverdueByDate || raw === "overdue") return { text: "Overdue", color: "bg-red-100 text-red-600" };
    return { text: "Unpaid", color: "bg-blue-100 text-blue-700" };
  };

  const getCustomerKey = (row: any) =>
    String(
      row?.customer?._id ||
      row?.customer?.id ||
      row?.customerId ||
      ""
    ).trim();

  const getCustomerName = (row: any) =>
    String(
      row?.customerName ||
      (typeof row?.customer === "string" ? row?.customer : row?.customer?.displayName || row?.customer?.companyName || row?.customer?.name) ||
      ""
    ).trim();

  const getRetainerAvailableAmount = (row: any) => {
    const explicitAvailable = toNumSafe(
      row?.retainerAvailableAmount ??
      row?.availableAmount ??
      row?.unusedAmount ??
      row?.unusedBalance,
      NaN
    );
    if (Number.isFinite(explicitAvailable) && explicitAvailable > 0) return explicitAvailable;

    const totalAmount = toNumSafe(row?.total ?? row?.amount, 0);
    const paidAmount = toNumSafe(row?.amountPaid ?? row?.paidAmount, 0);
    const balanceAmount = toNumSafe(row?.balance ?? row?.balanceDue, NaN);

    const status = normalizeKey(row?.status || "");
    const drawStatus = normalizeKey(row?.retainerDrawStatus || row?.drawStatus || "");
    if (status === "paid" || drawStatus === "ready_to_draw" || drawStatus === "partially_drawn") {
      if (Number.isFinite(balanceAmount) && balanceAmount > 0) return balanceAmount;
      if (paidAmount > 0) return paidAmount;
      if (totalAmount > 0) return totalAmount;
    }
    return 0;
  };

  const formatAmountWithCurrency = (amount: number) => `${String(invoice?.currency || baseCurrency)}${Number(amount || 0).toFixed(2)}`;

  const getPaymentStatusLabel = (payment: any) => {
    const raw = normalizeKey(payment?.status || "");
    if (raw === "draft") return "Draft";
    if (raw === "void") return "Void";
    if (raw === "paid" || raw === "completed" || raw === "success") return "Paid";
    return "Paid";
  };

  const getPaymentStatusClass = (payment: any) => {
    const status = getPaymentStatusLabel(payment).toLowerCase();
    if (status === "paid") return "text-green-600";
    if (status === "draft") return "text-amber-600";
    if (status === "void") return "text-gray-500";
    return "text-gray-700";
  };

  const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
  const getAccountId = (account: any): string => String(account?._id || account?.id || "").trim();
  const getAccountDisplayName = (account: any): string =>
    String(account?.displayName || account?.accountName || account?.name || "").trim();
  const refundPaymentModeOptions = ["Cash", "Check", "Credit Card", "Debit Card", "Bank Transfer", "PayPal", "Other"];

  const getAppliedAmountsByInvoice = (paymentRow: any): Record<string, number> => {
    const map: Record<string, number> = {};
    if (!paymentRow || typeof paymentRow !== "object") return map;

    if (paymentRow.invoicePayments && typeof paymentRow.invoicePayments === "object") {
      Object.entries(paymentRow.invoicePayments).forEach(([invoiceId, amount]) => {
        const key = String(invoiceId || "").trim();
        const val = Number(amount || 0);
        if (key && val > 0) map[key] = roundMoney(val);
      });
      if (Object.keys(map).length > 0) return map;
    }

    if (Array.isArray(paymentRow.allocations)) {
      paymentRow.allocations.forEach((allocation: any) => {
        const invoiceId = String(allocation?.invoice?._id || allocation?.invoice?.id || allocation?.invoice || "").trim();
        const amount = Number(allocation?.amount || 0);
        if (!invoiceId || amount <= 0) return;
        map[invoiceId] = roundMoney((map[invoiceId] || 0) + amount);
      });
      if (Object.keys(map).length > 0) return map;
    }

    const fallbackInvoiceId = String(paymentRow.invoiceId || "").trim();
    const fallbackAmount = Number(paymentRow.amount || paymentRow.amountReceived || 0);
    if (fallbackInvoiceId && fallbackAmount > 0) map[fallbackInvoiceId] = roundMoney(fallbackAmount);
    return map;
  };

  const isPaymentLinkedToInvoice = (paymentRow: any, currentInvoice: any, routeInvoiceId: any, extraIds: string[] = [], extraNumbers: string[] = []) => {
    const targetIds = new Set(
      [routeInvoiceId, currentInvoice?.id, currentInvoice?._id, ...extraIds]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    );
    const targetNumbers = new Set(
      [currentInvoice?.invoiceNumber, ...extraNumbers]
        .map((v) => String(v || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const directInvoiceId = String(paymentRow?.invoiceId || "").trim();
    const directInvoiceNumber = String(paymentRow?.invoiceNumber || "").trim().toLowerCase();
    if ((directInvoiceId && targetIds.has(directInvoiceId)) || (directInvoiceNumber && targetNumbers.has(directInvoiceNumber))) {
      return true;
    }

    const byMap = getAppliedAmountsByInvoice(paymentRow);
    if (Object.keys(byMap).some((invoiceId) => targetIds.has(String(invoiceId || "").trim()))) {
      return true;
    }

    if (Array.isArray(paymentRow?.allocations)) {
      return paymentRow.allocations.some((allocation: any) => {
        const allocationInvoiceId = String(
          allocation?.invoiceId ||
          allocation?.invoice?._id ||
          allocation?.invoice?.id ||
          allocation?.invoice ||
          ""
        ).trim();
        const allocationInvoiceNumber = String(
          allocation?.invoiceNumber ||
          allocation?.invoice?.invoiceNumber ||
          ""
        ).trim().toLowerCase();
        return (
          (allocationInvoiceId && targetIds.has(allocationInvoiceId)) ||
          (allocationInvoiceNumber && targetNumbers.has(allocationInvoiceNumber))
        );
      });
    }

    return false;
  };

  const applyInvoicePaymentDeltas = async (invoiceDeltas: Record<string, number>, paymentId: string) => {
    for (const [invoiceId, deltaRaw] of Object.entries(invoiceDeltas)) {
      const delta = Number(deltaRaw || 0);
      if (!invoiceId || !Number.isFinite(delta) || delta === 0) continue;
      const current = await getInvoiceById(String(invoiceId));
      if (!current) continue;

      const totalAmount = roundMoney(toNumSafe((current as any).total ?? (current as any).amount, 0));
      const currentPaid = roundMoney(toNumSafe((current as any).amountPaid ?? (current as any).paidAmount, 0));
      const nextPaid = Math.max(0, roundMoney(currentPaid + delta));
      const nextBalance = Math.max(0, roundMoney(totalAmount - nextPaid));

      const currentStatusKey = normalizeKey((current as any).status || "sent");
      let nextStatus: string = (current as any).status || "sent";
      if (currentStatusKey !== "void") {
        if (nextPaid > 0 && nextBalance <= 0) nextStatus = "paid";
        else if (nextPaid > 0 && nextBalance > 0) nextStatus = "partially_paid";
        else nextStatus = currentStatusKey === "draft" ? "draft" : "sent";
      }

      const existingPayments = Array.isArray((current as any).paymentsReceived)
        ? [...(current as any).paymentsReceived]
        : Array.isArray((current as any).payments)
        ? [...(current as any).payments]
        : [];

      const nextPaymentsReceived = existingPayments.filter((row: any) => {
        const rowPaymentId = String(row?.paymentId || row?.id || row?._id || "").trim();
        return !(paymentId && rowPaymentId && paymentId === rowPaymentId);
      });

      await updateInvoice(String(invoiceId), {
        amountPaid: nextPaid,
        paidAmount: nextPaid,
        balanceDue: nextBalance,
        balance: nextBalance,
        status: nextStatus,
        paymentsReceived: nextPaymentsReceived,
      } as any);
    }
  };

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
          localStorage.setItem('organization_profile', JSON.stringify(sanitizeProfileForCache(data.data)));
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
    const primarySenderRes = await senderEmailsAPI.getPrimary();
    const fallbackName = DEFAULT_INVOICE_BRAND_NAME;
      const fallbackEmail = String(organizationProfile?.email || "").trim();
      const sender = resolveVerifiedPrimarySender(primarySenderRes, fallbackName, fallbackEmail);
      setOwnerEmail(sender);
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
          localStorage.setItem('organization_profile', JSON.stringify(sanitizeProfileForCache(data.data)));
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
      const paymentsPromise = getPayments();
      const invoicesPromise = getInvoices();
      const taxesPromise = getTaxes();
      const bankAccountsPromise = bankAccountsAPI.getAll().catch(() => []);

      // Fetch invoice data
      let currentInvoice = null;
      if (id) {
        if (isDebitNoteView) {
          const dnResponse: any = await debitNotesAPI.getById(id);
          const dn = dnResponse?.success ? dnResponse.data : null;
          if (dn) {
            currentInvoice = {
              ...dn,
              id: String(dn.id || dn._id || id),
              invoiceNumber: dn.debitNoteNumber || dn.invoiceNumber || String(dn.id || dn._id || id),
              invoiceDate: dn.date || dn.debitNoteDate || dn.createdAt,
              date: dn.date || dn.debitNoteDate || dn.createdAt,
              dueDate: dn.date || dn.debitNoteDate || dn.createdAt,
              total: Number(dn.total || dn.amount || 0) || 0,
              balance: Number(dn.balance ?? dn.total ?? 0) || 0,
              subTotal: Number(dn.subTotal ?? dn.total ?? 0) || 0,
              status: String(dn.status || "sent"),
              debitNote: true,
              associatedInvoiceId: String(dn.invoiceId || ""),
              associatedInvoiceNumber: String(dn.invoiceNumber || ""),
            } as any;
            setInvoice(currentInvoice);
          } else {
            navigate("/sales/invoices");
            return;
          }
        } else {
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
      }

      // Get payments for this invoice quickly
      const paymentsRaw = await paymentsPromise;
      const associatedInvoiceId = String((currentInvoice as any)?.associatedInvoiceId || (currentInvoice as any)?.invoiceId || "");
      const associatedInvoiceNumber = String((currentInvoice as any)?.associatedInvoiceNumber || "");
      const allPayments = Array.isArray(paymentsRaw)
        ? paymentsRaw.filter((p: any) =>
            isPaymentLinkedToInvoice(
              p,
              currentInvoice,
              id,
              associatedInvoiceId ? [associatedInvoiceId] : [],
              associatedInvoiceNumber ? [associatedInvoiceNumber] : []
            )
          )
        : [];
      setPayments(allPayments);

      const allInvoices = await invoicesPromise;
      setInvoices(stripRetainerInvoices(allInvoices as any[]));

      if (isDebitNoteView && currentInvoice) {
        const linkedId = String((currentInvoice as any)?.associatedInvoiceId || (currentInvoice as any)?.invoiceId || "");
        const linkedNumber = String((currentInvoice as any)?.associatedInvoiceNumber || "");
        const linked = (Array.isArray(allInvoices) ? allInvoices : []).find((row: any) => {
          const rowId = String(row?.id || row?._id || "");
          const rowNumber = String(row?.invoiceNumber || "");
          return (linkedId && rowId === linkedId) || (!!linkedNumber && rowNumber === linkedNumber);
        });
        setAssociatedInvoiceRow(linked || null);
      } else {
        setAssociatedInvoiceRow(null);
      }

      // Compute available retainer amount for the same customer
      if (currentInvoice) {
        const currentCustomerId = getCustomerKey(currentInvoice);
        const currentCustomerName = getCustomerName(currentInvoice).toLowerCase();
        const matchingRetainers = (allInvoices || []).filter((row: any) => {
          if (!isRetainerInvoice(row)) return false;
          const rowCustomerId = getCustomerKey(row);
          const rowCustomerName = getCustomerName(row).toLowerCase();
          const sameCustomer =
            (currentCustomerId && rowCustomerId && currentCustomerId === rowCustomerId) ||
            (!!currentCustomerName && rowCustomerName === currentCustomerName);
          if (!sameCustomer) return false;
          const status = normalizeKey(row?.status || "");
          const drawStatus = normalizeKey(row?.retainerDrawStatus || row?.drawStatus || "");
          return status === "paid" || drawStatus === "ready_to_draw" || drawStatus === "partially_drawn";
        });
        const totalAvailable = matchingRetainers.reduce((sum: number, row: any) => sum + getRetainerAvailableAmount(row), 0);
        setCustomerRetainerInvoices(matchingRetainers);
        setCustomerRetainerAvailable(Math.max(0, totalAvailable));

        let creditRows: any[] = [];
        try {
          if (currentCustomerId) {
            const byCustomer = await creditNotesAPI.getByCustomer(currentCustomerId, { limit: 10000 });
            creditRows = Array.isArray((byCustomer as any)?.data) ? (byCustomer as any).data : [];
          }
          if (!creditRows.length) {
            const allCredits = await creditNotesAPI.getAll({ limit: 10000 });
            const allRows = Array.isArray((allCredits as any)?.data) ? (allCredits as any).data : [];
            creditRows = allRows.filter((row: any) => {
              const rowCustomerId = getCustomerKey(row);
              const rowCustomerName = getCustomerName(row).toLowerCase();
              return (
                (currentCustomerId && rowCustomerId && currentCustomerId === rowCustomerId) ||
                (!!currentCustomerName && rowCustomerName === currentCustomerName)
              );
            });
          }
        } catch {
          creditRows = [];
        }
        const totalCredits = creditRows.reduce((sum: number, row: any) => {
          const status = normalizeKey(row?.status || "");
          if (status === "void" || status === "closed") return sum;
          const available = toNumSafe(row?.balance ?? row?.unusedAmount ?? row?.availableAmount, 0);
          return sum + (available > 0 ? available : 0);
        }, 0);
        setCustomerCreditsAvailable(Math.max(0, totalCredits));
      } else {
        setCustomerRetainerInvoices([]);
        setCustomerRetainerAvailable(0);
        setCustomerCreditsAvailable(0);
      }

      const allTaxes = await taxesPromise;
      setTaxOptions(allTaxes);

      const bankAccountsRes: any = await bankAccountsPromise;
      if (Array.isArray(bankAccountsRes)) {
        setBankAccounts(bankAccountsRes);
      } else if (bankAccountsRes?.success && Array.isArray(bankAccountsRes.data)) {
        setBankAccounts(bankAccountsRes.data);
      } else {
        setBankAccounts([]);
      }

      const creditTargetId = isDebitNoteView
        ? String((currentInvoice as any)?.associatedInvoiceId || (currentInvoice as any)?.invoiceId || "")
        : String(id || "");
      const creditNotes = creditTargetId ? await getCreditNotesByInvoiceId(creditTargetId) : [];
      const creditRowsComputed = (Array.isArray(creditNotes) ? creditNotes : []).map((note: any) => {
        const allocationApplied = Array.isArray(note?.allocations)
          ? note.allocations.reduce((sum: number, allocation: any) => {
              const allocationInvoiceId = String(
                allocation?.invoiceId ||
                  allocation?.invoice?._id ||
                  allocation?.invoice?.id ||
                  allocation?.invoice ||
                  ""
              );
              const amount = toNumSafe(allocation?.amount, 0);
              return allocationInvoiceId === creditTargetId ? sum + amount : sum;
            }, 0)
          : 0;
        const explicitApplied = toNumSafe(note?.appliedAmount ?? note?.amountApplied, 0);
        const total = toNumSafe(note?.total ?? note?.amount, 0);
        const balance = toNumSafe(note?.balance ?? note?.unusedAmount ?? note?.availableAmount, 0);
        const inferredApplied = total > 0 ? Math.max(0, total - Math.max(0, balance)) : 0;
        const appliedAmount = allocationApplied > 0 ? allocationApplied : explicitApplied > 0 ? explicitApplied : inferredApplied;
        return {
          id: String(note?.id || note?._id || ""),
          date: note?.date || note?.creditNoteDate || note?.createdAt || "",
          transactionNumber: String(note?.creditNoteNumber || note?.creditNumber || note?.number || "-"),
          appliedAmount: toNumSafe(appliedAmount, 0),
        };
      }).filter((row: any) => row.appliedAmount > 0);

      const invoiceLevelCreditsApplied = toNumSafe((currentInvoice as any)?.creditsApplied, 0);
      const normalizedCreditRows =
        creditRowsComputed.length > 0
          ? creditRowsComputed
          : invoiceLevelCreditsApplied > 0
            ? [{
                id: `credit-summary-${String((currentInvoice as any)?.id || (currentInvoice as any)?._id || "current")}`,
                date: (currentInvoice as any)?.invoiceDate || (currentInvoice as any)?.date || new Date().toISOString(),
                transactionNumber: "Applied Credit",
                appliedAmount: invoiceLevelCreditsApplied,
              }]
            : [];

      const appliedCount = normalizedCreditRows.length;
      setCreditsAppliedCount(appliedCount);
      setCreditsAppliedRows(normalizedCreditRows);

      // Fetch organization profile data
      fetchOrganizationProfile();
      // Fetch owner email data
      fetchOwnerEmail();

      // Load organization logo from localStorage
      const savedLogo = localStorage.getItem('organization_logo');
      if (savedLogo && !savedLogo.startsWith("data:")) {
        setLogoPreview(savedLogo);
      } else if (savedLogo) {
        localStorage.removeItem('organization_logo');
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

      // Fetch Debit Note linked to invoice (skip when already in debit-note page)
      try {
        if (id && !isDebitNoteView) {
          const linkedResponse = await debitNotesAPI.getByInvoice(id);
          if (linkedResponse && linkedResponse.success && linkedResponse.data && linkedResponse.data.length > 0) {
            setDebitNote(linkedResponse.data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching debit note:", error);
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
  }, [id, navigate, isDebitNoteView]);

  useEffect(() => {
    setIsPaymentsSectionOpen(false);
    setOpenPaymentMenuId(null);
    setCreditsAppliedCount(0);
    setCreditsAppliedRows([]);
    setPaymentInfoTab("payments");
    setAssociatedInvoiceRow(null);
  }, [id, isDebitNoteView]);

  useEffect(() => {
    if (!isRefundModalOpen || !selectedPaymentForRefund) return;

    const today = new Date().toISOString().split("T")[0];
    const defaultAccount = bankAccounts[0];
    const defaultAccountName = getAccountDisplayName(defaultAccount);
    const defaultAccountId = getAccountId(defaultAccount);
    const paymentAmount = Number(selectedPaymentForRefund.amountReceived ?? selectedPaymentForRefund.amount ?? 0) || 0;

    setRefundData({
      amount: paymentAmount > 0 ? String(roundMoney(paymentAmount)) : "",
      refundedOn: today,
      paymentMode: String(selectedPaymentForRefund.paymentMode || selectedPaymentForRefund.paymentMethod || "Cash"),
      referenceNumber: "",
      fromAccount: String(selectedPaymentForRefund.depositTo || defaultAccountName || ""),
      fromAccountId: String(
        bankAccounts.find((account: any) =>
          getAccountDisplayName(account) === String(selectedPaymentForRefund.depositTo || "").trim()
        )?._id ||
          bankAccounts.find((account: any) =>
            getAccountDisplayName(account) === String(selectedPaymentForRefund.depositTo || "").trim()
          )?.id ||
          defaultAccountId
      ),
      description: `Refund for payment ${selectedPaymentForRefund.paymentNumber || selectedPaymentForRefund.id || ""}`.trim()
    });
  }, [isRefundModalOpen, selectedPaymentForRefund, bankAccounts]);

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
      if (sidebarMoreRef.current && !sidebarMoreRef.current.contains(event.target as Node)) {
        setShowSidebarMoreDropdown(false);
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
      toast("Reminder sent successfully!");
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      toast(error?.message || "Failed to send reminder. Please try again.");
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
        toast(nextStopped ? "Reminders stopped for this invoice" : "Reminders enabled for this invoice");
      } else {
        throw new Error(result?.message || "Failed to update reminder status");
      }
    } catch (error: any) {
      console.error("Error updating reminders stopped:", error);
      toast(error?.message || "Failed to update reminder status. Please try again.");
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
        toast("Invalid date. Please use YYYY-MM-DD.");
        return;
      }

      const result = await invoicesAPI.update(id, { expectedPaymentDate: date.toISOString() });
      if (result?.success && result.data) {
        setInvoice((prev: any) => ({ ...(prev || {}), ...result.data }));
        toast("Expected payment date saved");
      } else {
        throw new Error(result?.message || "Failed to save expected payment date");
      }
    } catch (error: any) {
      console.error("Error saving expected payment date:", error);
      toast(error?.message || "Failed to save expected payment date. Please try again.");
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

  const getNextInvoiceNumberFromExistingInvoices = (rows: any[], prefix: string, currentInvoiceNumber?: string) => {
    const normalizedPrefix = String(prefix || "INV-").trim() || "INV-";
    const trailingDigitsLength = String(currentInvoiceNumber || "").match(/(\d+)$/)?.[1]?.length || 6;

    const nextSuffix = (Array.isArray(rows) ? rows : [])
      .map((row: any) => String(row?.invoiceNumber || row?.number || "").trim())
      .filter((number) => number.startsWith(normalizedPrefix))
      .map((number) => {
        const suffix = number.slice(normalizedPrefix.length);
        return Number.parseInt(suffix, 10);
      })
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0) + 1;

    return `${normalizedPrefix}${String(nextSuffix).padStart(trailingDigitsLength, "0")}`;
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
        const resolveDebitNotePostSendStatus = (dueDateValue: any) => {
          if (!dueDateValue) return "due";
          const dueDate = new Date(dueDateValue);
          if (Number.isNaN(dueDate.getTime())) return "due";
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() < today.getTime() ? "overdue" : "due";
        };
        const resolvePostSendStatus = (dueDateValue: any) => {
          if (!dueDateValue) return "unpaid";
          const dueDate = new Date(dueDateValue);
          if (Number.isNaN(dueDate.getTime())) return "unpaid";
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() < today.getTime() ? "overdue" : "unpaid";
        };

        if (isDebitNoteView) {
          const nextStatus = resolveDebitNotePostSendStatus(invoice.dueDate);
          const updatedDebitNote = await debitNotesAPI.update(id, { ...invoice, status: nextStatus } as any);
          const nextInvoice = (updatedDebitNote as any)?.data || updatedDebitNote;
          if (nextInvoice) {
            setInvoice(nextInvoice);
            const updatedInvoices = invoices.map(inv => inv.id === id ? nextInvoice : inv);
            setInvoices(updatedInvoices);
            toast("Debit note updated successfully.");
          }
        } else {
          const nextStatus = resolvePostSendStatus(invoice.dueDate);
          const updatedInvoice = await updateInvoice(id, { ...invoice, status: nextStatus });
          if (updatedInvoice) {
            setInvoice(updatedInvoice);
            // Update in list
            const updatedInvoices = invoices.map(inv => inv.id === id ? updatedInvoice : inv);
            setInvoices(updatedInvoices);
            toast("Invoice updated successfully.");
          }
        }
      } catch (error: any) {
        console.error("Error marking invoice as sent:", error);
        toast("Failed to mark invoice as sent: " + error.message);
      }
    }
  };

  const handleSendInvoice = () => {
    handleSendEmail();
  };

  const handleSendDebitNote = async () => {
    if (!id) return;
    try {
      const customerEmail = String(
        (invoice as any)?.customerEmail ||
        (typeof invoice?.customer === "object" ? invoice?.customer?.email || "" : "") ||
        ""
      ).trim();
      if (!customerEmail) {
        toast("Customer email not found.");
        return;
      }

      await debitNotesAPI.sendEmail(id, {
        to: customerEmail,
        subject: `Debit Note ${(invoice as any)?.debitNoteNumber || invoice?.invoiceNumber || ""}`.trim(),
        body: `Please find attached Debit Note ${(invoice as any)?.debitNoteNumber || invoice?.invoiceNumber || ""}.`,
      });

      const dueDateValue = (invoice as any)?.dueDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = dueDateValue ? new Date(dueDateValue) : null;
      if (dueDate && !Number.isNaN(dueDate.getTime())) {
        dueDate.setHours(0, 0, 0, 0);
      }
      const nextStatus = dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < today.getTime() ? "overdue" : "due";
      const updatedDebitNote = await debitNotesAPI.update(id, { ...invoice, status: nextStatus } as any);
      const nextInvoice = (updatedDebitNote as any)?.data || updatedDebitNote;
      if (nextInvoice) {
        setInvoice(nextInvoice);
        const updatedInvoices = invoices.map(inv => inv.id === id ? nextInvoice : inv);
        setInvoices(updatedInvoices);
      }
      toast("Debit note sent successfully!");
    } catch (error: any) {
      console.error("Error sending debit note:", error);
      toast("Failed to send debit note: " + error.message);
    }
  };

  const handleSendEmail = () => {
    if (!id) return;
    const customerEmail = String(
      (invoice as any)?.customerEmail ||
      (typeof invoice?.customer === "object" ? invoice?.customer?.email || "" : "") ||
      ""
    ).trim();
    const customerName = String(
      invoice?.customerName ||
      (typeof invoice?.customer === "object"
        ? invoice?.customer?.displayName || invoice?.customer?.companyName || invoice?.customer?.name || ""
        : "") ||
      ""
    ).trim();
    navigate(isDebitNoteDocument ? `/sales/debit-notes/${id}/email` : `/sales/invoices/${id}/email`, {
      state: {
        customerEmail,
        sendTo: customerEmail,
        customerName,
      },
    });
  };

  const handleSendEmailSubmit = async () => {
    if (!emailData.to || !emailData.subject) {
      toast("Please fill in required fields (To and Subject)");
      return;
    }

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      toast("Please enter a valid email address");
      return;
    }

    try {
      if (typeof invoicesAPI.sendEmail !== 'function') {
        // Fallback if API method is not yet available in hot reload context (should rarely happen)
        console.warn("invoicesAPI.sendEmail is not defined yet");
        toast("System update in progress. Please refresh the page and try again.");
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
      toast("Email sent successfully!");

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
      toast("Failed to send email. Please try again.");
    }
  };

  const handleLogoUpload = (file) => {
    // Check file size (1MB max)
    if (file.size > 1024 * 1024) {
      toast("File size exceeds 1MB. Please choose a smaller file.");
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      toast("Invalid file type. Please upload jpg, jpeg, png, gif, or bmp files.");
      return;
    }

    // Create preview and save to localStorage
    const reader = new FileReader();
    reader.onloadend = () => {
      const logoDataUrl = reader.result;
      setLogoPreview(logoDataUrl);
      setLogoFile(file);
      // Save logo to localStorage
      const persistedLogo = typeof logoDataUrl === "string" && logoDataUrl.startsWith("data:") ? "" : String(logoDataUrl || "");
      if (persistedLogo) {
        localStorage.setItem('organization_logo', persistedLogo);
      } else {
        localStorage.removeItem('organization_logo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScheduleEmail = () => {
    setIsSendDropdownOpen(false);
    if (invoice) {
      const orgName = DEFAULT_INVOICE_BRAND_NAME;
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
      toast("Please fill in required fields (To, Subject, Date, and Time)");
      return;
    }
    // TODO: Implement actual email sending
    console.log("Sending email:", emailData);
    setIsSendEmailModalOpen(false);
    toast("Email sent successfully!");
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
    toast(`Email scheduled for ${scheduleData.date} at ${scheduleData.time}`);
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
      toast("Please select an expiration date");
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
        toast("Link copied to clipboard!");
      }).catch(() => {
        toast("Unable to copy link. Please copy manually: " + generatedLink);
      });
    }
  };

  const handleDisableAllActiveLinks = () => {
    if (window.confirm("Are you sure you want to disable all active links for this invoice?")) {
      setGeneratedLink("");
      setIsLinkGenerated(false);
      toast("All active links have been disabled.");
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
              <h1>${DEFAULT_INVOICE_BRAND_NAME_UPPER}</h1>
              <p>${organizationProfile?.address?.street1 || 'taleex'}</p>
              <p>${organizationProfile?.address?.street2 || 'taleex'}</p>
              <p>${organizationProfile?.address?.city ?
        `${organizationProfile.address.city}${organizationProfile.address.zipCode ? ' ' + organizationProfile.address.zipCode : ''}${organizationProfile.address.state ? ', ' + organizationProfile.address.state : ''}` :
        'mogadishu Nairobi 22223'
      }</p>
              <p>${organizationProfile?.address?.country || 'Somalia'}</p>
              <p>${ownerEmail?.email || organizationProfile?.email || ""}</p>
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
    setIsDownloadingPdf(true);

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
      toast("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
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
      void navigateToPaymentForm();
    } else {
      // Show confirmation modal
      setIsRecordPaymentModalOpen(true);
    }
  };

  const navigateToPaymentForm = async () => {
    const fallbackInvoice: any = invoice || {};
    const linkedInvoiceId = String(
      (invoice as any)?.associatedInvoiceId ||
      (invoice as any)?.invoiceId ||
      ""
    ).trim();

    let sourceInvoice: any = fallbackInvoice;
    if (isDebitNoteView && linkedInvoiceId) {
      try {
        const linked = await getInvoiceById(linkedInvoiceId);
        if (linked) sourceInvoice = linked;
      } catch {
        // keep fallback
      }
    }

    const sourceInvoiceId = isDebitNoteView
      ? linkedInvoiceId
      : (sourceInvoice?.id || sourceInvoice?._id || "");
    const sourceInvoiceObjectId = String(sourceInvoice?.id || sourceInvoice?._id || "").trim();
    const canPassInvoiceObject = Boolean(sourceInvoiceId && sourceInvoiceObjectId && sourceInvoiceObjectId === String(sourceInvoiceId));

    // Navigate to record payment form with one target invoice pre-filled
    navigate("/sales/payments-received/new", {
      state: {
        invoiceId: sourceInvoiceId,
        invoiceNumber: sourceInvoice?.invoiceNumber || sourceInvoice?.id || sourceInvoiceId,
        customerId: sourceInvoice?.customerId || sourceInvoice?.customer?._id || sourceInvoice?.customer?.id || fallbackInvoice?.customerId,
        customerName:
          sourceInvoice?.customerName ||
          (typeof sourceInvoice?.customer === 'string'
            ? sourceInvoice?.customer
            : sourceInvoice?.customer?.displayName || sourceInvoice?.customer?.name) ||
          fallbackInvoice?.customerName,
        amount:
          sourceInvoice?.balance !== undefined
            ? sourceInvoice.balance
            : (sourceInvoice?.balanceDue ?? getInvoiceDisplayTotal(sourceInvoice)),
        currency: sourceInvoice?.currency || fallbackInvoice?.currency || "SOS",
        invoice: canPassInvoiceObject ? sourceInvoice : undefined,
        debitNoteId: isDebitNoteView ? String((invoice as any)?.id || (invoice as any)?._id || "") : "",
        debitNoteNumber: isDebitNoteView ? String((invoice as any)?.debitNoteNumber || (invoice as any)?.invoiceNumber || "") : "",
        showOnlyInvoice: true,
        returnInvoiceId: sourceInvoiceId
      }
    });
  };

  const handleRecordPaymentConfirm = () => {
    // Save preference if checkbox is checked
    if (doNotShowAgain) {
      localStorage.setItem('hideRecordPaymentWarning', 'true');
    }
    setIsRecordPaymentModalOpen(false);
    void navigateToPaymentForm();
  };

  const getCurrentDocumentBalance = () => {
    const docTotal = toNumSafe((invoice as any)?.total ?? (invoice as any)?.amount, 0);
    const explicitBalance = toNumSafe((invoice as any)?.balance ?? (invoice as any)?.balanceDue, NaN);
    if (Number.isFinite(explicitBalance)) return Math.max(0, explicitBalance);
    return Math.max(0, docTotal);
  };

  const handleOpenApplyRetainer = () => {
    void handleOpenApplyCredits("retainer");
  };

  const handleOpenApplyCredits = async (sourceFilter: "all" | "credit" | "retainer" = "all") => {
    if (!invoice) return;
    const targetInvoiceId = String(
      isDebitNoteView
        ? (invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId || ""
        : (invoice as any)?.id || (invoice as any)?._id || id || ""
    ).trim();
    if (!targetInvoiceId) {
      toast.error("Invoice id not found.");
      return;
    }

    const customerId = String(
      isDebitNoteView
        ? (invoice as any)?.customerId || ""
        : getCustomerKey(invoice)
    ).trim();
    const customerName = String(
      isDebitNoteView
        ? (invoice as any)?.customerName || ""
        : getCustomerName(invoice)
    ).toLowerCase();
    const toStatus = (value: any) => String(value || "").toLowerCase().replace(/[\s-]+/g, "_");

    const creditsPromise = (async () => {
      try {
        if (customerId) {
          const byCustomer = await creditNotesAPI.getByCustomer(customerId, { limit: 10000 });
          const rows = Array.isArray((byCustomer as any)?.data) ? (byCustomer as any).data : [];
          if (rows.length) return rows;
        }
        const allRes = await creditNotesAPI.getAll({ limit: 10000 });
        const allRows = Array.isArray((allRes as any)?.data) ? (allRes as any).data : [];
        return allRows.filter((row: any) => {
          const rowCustomerId = getCustomerKey(row);
          const rowCustomerName = getCustomerName(row).toLowerCase();
          return (
            (customerId && rowCustomerId && customerId === rowCustomerId) ||
            (!!customerName && rowCustomerName === customerName)
          );
        });
      } catch {
        return [];
      }
    })();

    const retainersPromise = (async () => {
      try {
        const allRows = await getInvoices();
        return (Array.isArray(allRows) ? allRows : []).filter((row: any) => {
          if (!isRetainerInvoice(row)) return false;
          const rowCustomerId = getCustomerKey(row);
          const rowCustomerName = getCustomerName(row).toLowerCase();
          const sameCustomer =
            (customerId && rowCustomerId && customerId === rowCustomerId) ||
            (!!customerName && rowCustomerName === customerName);
          if (!sameCustomer) return false;
          const rowId = String(row?.id || row?._id || "").trim();
          if (rowId && invoice && rowId === String((invoice as any)?.id || (invoice as any)?._id || "")) return false;
          const availableExplicit = toNumSafe(row?.retainerAvailableAmount ?? row?.availableAmount ?? row?.unusedAmount ?? row?.unusedBalance, 0);
          const availableFallback = Math.max(
            0,
            toNumSafe(row?.balance ?? row?.balanceDue ?? row?.amountPaid ?? row?.paidAmount ?? row?.total ?? row?.amount, 0)
          );
          const available = roundMoney(availableExplicit > 0 ? availableExplicit : availableFallback);
          // Show retainers in the same modal when they still have available balance.
          return available > 0;
        });
      } catch {
        return [];
      }
    })();

    const [creditRowsRaw, retainerRowsRaw] = await Promise.all([creditsPromise, retainersPromise]);

    const creditRows = (Array.isArray(creditRowsRaw) ? creditRowsRaw : [])
      .map((row: any) => {
        const available = roundMoney(Math.max(0, toNumSafe(row?.balance ?? row?.unusedAmount ?? row?.availableAmount, 0)));
        return {
          rowKey: `credit:${String(row?.id || row?._id || "")}`,
          sourceType: "credit" as const,
          id: String(row?.id || row?._id || ""),
          transactionNumber: String(row?.creditNoteNumber || row?.creditNumber || row?.number || "Credit"),
          date: row?.creditNoteDate || row?.date || row?.createdAt || "",
          location: String(row?.locationName || row?.location || "Head Office"),
          creditAmount: roundMoney(toNumSafe(row?.total ?? row?.amount, 0)),
          availableAmount: available,
          raw: row,
        };
      })
      .filter((row: any) => row.id && row.availableAmount > 0);

    const retainerRows = (Array.isArray(retainerRowsRaw) ? retainerRowsRaw : [])
      .map((row: any) => {
        const availableExplicit = toNumSafe(row?.retainerAvailableAmount ?? row?.availableAmount ?? row?.unusedAmount ?? row?.unusedBalance, 0);
        const fallback = Math.max(0, toNumSafe(row?.balance ?? row?.balanceDue ?? row?.amountPaid ?? row?.paidAmount ?? row?.total ?? row?.amount, 0));
        const available = roundMoney(availableExplicit > 0 ? availableExplicit : fallback);
        return {
          rowKey: `retainer:${String(row?.id || row?._id || "")}`,
          sourceType: "retainer" as const,
          id: String(row?.id || row?._id || ""),
          transactionNumber: String(row?.invoiceNumber || row?.retainerNumber || "Retainer"),
          date: row?.invoiceDate || row?.date || row?.createdAt || "",
          location: String(row?.locationName || row?.location || "Head Office"),
          creditAmount: roundMoney(toNumSafe(row?.total ?? row?.amount, 0)),
          availableAmount: available,
          raw: row,
        };
      })
      .filter((row: any) => row.id && row.availableAmount > 0);

    const combinedRows =
      sourceFilter === "credit"
        ? creditRows
        : sourceFilter === "retainer"
          ? retainerRows
          : [...creditRows, ...retainerRows];

    if (!combinedRows.length) {
      if (sourceFilter === "retainer") {
        toast.info("No retainers available for this customer.");
      } else if (sourceFilter === "credit") {
        toast.info("No credits available for this customer.");
      } else {
        toast.info("No credits or retainers available for this customer.");
      }
      return;
    }

    const initialValues = combinedRows.reduce((acc: Record<string, number>, row: any) => {
      acc[row.rowKey] = 0;
      return acc;
    }, {});

    setApplyAdjustmentRows(combinedRows);
    setApplyAdjustmentValues(initialValues);
    setApplyOnDate(new Date().toISOString().split("T")[0]);
    setUseApplyDate(true);
    setIsApplyAdjustmentsModalOpen(true);
  };

  const handleDeleteRecordedPayment = async () => {
    if (!selectedPaymentForDelete) return;
    const paymentId = String(
      selectedPaymentForDelete.id ||
      selectedPaymentForDelete._id ||
      ""
    ).trim();
    if (!paymentId) {
      toast.error("Payment id not found.");
      return;
    }

    try {
      setIsDeletingPayment(true);
      const statusKey = normalizeKey(selectedPaymentForDelete.status || "paid");
      const shouldReverse = ["paid", "completed", "success"].includes(statusKey);
      if (shouldReverse) {
        const applied = getAppliedAmountsByInvoice(selectedPaymentForDelete);
        const reverseDeltas: Record<string, number> = {};
        Object.entries(applied).forEach(([invId, amount]) => {
          const value = Number(amount || 0);
          if (invId && value > 0) reverseDeltas[invId] = -value;
        });
        if (Object.keys(reverseDeltas).length > 0) {
          await applyInvoicePaymentDeltas(reverseDeltas, paymentId);
        }
      }

      await deletePayment(paymentId);

      const paymentsRaw = await getPayments();
      const allPayments = Array.isArray(paymentsRaw)
        ? paymentsRaw.filter((p: any) => {
            const associatedInvoiceId = String((invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId || "");
            const associatedInvoiceNumber = String((invoice as any)?.associatedInvoiceNumber || "");
            return isPaymentLinkedToInvoice(
              p,
              invoice,
              id,
              associatedInvoiceId ? [associatedInvoiceId] : [],
              associatedInvoiceNumber ? [associatedInvoiceNumber] : []
            );
          })
        : [];
      setPayments(allPayments);

      if (id && !isDebitNoteView) {
        const refreshedInvoice = await getInvoiceById(id);
        if (refreshedInvoice) {
          setInvoice(refreshedInvoice);
          setInvoices((prev) => prev.map((row) => (row.id === refreshedInvoice.id ? refreshedInvoice : row)));
        }
      }

      setShowDeletePaymentModal(false);
      setSelectedPaymentForDelete(null);
      setOpenPaymentMenuId(null);
      toast.success("Payment deleted and invoice updated.");
    } catch (error: any) {
      console.error("Failed to delete payment from invoice detail:", error);
      toast.error(error?.message || "Failed to delete payment.");
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const handleDissociateAndAddAsCredit = async () => {
    if (!selectedPaymentForDelete || !invoice) return;
    const paymentId = String(
      selectedPaymentForDelete.id ||
      selectedPaymentForDelete._id ||
      ""
    ).trim();
    if (!paymentId) {
      toast.error("Payment id not found.");
      return;
    }

    const targetInvoiceId = String(
      isDebitNoteView
        ? (invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId || ""
        : invoice.id || invoice._id || id || ""
    ).trim();
    if (!targetInvoiceId) {
      toast.error("Invoice id not found.");
      return;
    }

    const targetInvoiceNumber = String(
      isDebitNoteView
        ? (invoice as any)?.associatedInvoiceNumber || ""
        : invoice.invoiceNumber || ""
    ).trim();

    try {
      setIsDeletingPayment(true);

      const statusKey = normalizeKey(selectedPaymentForDelete.status || "paid");
      const shouldReverse = ["paid", "completed", "success"].includes(statusKey);

      const appliedByInvoice = getAppliedAmountsByInvoice(selectedPaymentForDelete);
      const candidateIds = [targetInvoiceId, String(id || "").trim(), String(invoice.id || "").trim(), String(invoice._id || "").trim()].filter(Boolean);
      let dissociatedAmount = 0;
      for (const invId of candidateIds) {
        if (appliedByInvoice[invId] > 0) {
          dissociatedAmount = Number(appliedByInvoice[invId] || 0);
          break;
        }
      }
      if (dissociatedAmount <= 0) {
        const paymentInvoiceId = String(selectedPaymentForDelete.invoiceId || "").trim();
        if (candidateIds.includes(paymentInvoiceId)) {
          dissociatedAmount = Number(selectedPaymentForDelete.amountReceived ?? selectedPaymentForDelete.amount ?? 0);
        }
      }
      dissociatedAmount = roundMoney(Math.max(0, dissociatedAmount));
      if (dissociatedAmount <= 0) {
        toast.error("No allocated amount found for this invoice.");
        return;
      }

      if (shouldReverse) {
        await applyInvoicePaymentDeltas({ [targetInvoiceId]: -dissociatedAmount }, paymentId);
      }

      const currentInvoiceIds = new Set(candidateIds);
      const currentInvoiceNumbers = new Set([targetInvoiceNumber, String(invoice.invoiceNumber || "").trim()].filter(Boolean));

      const nextAllocations = Array.isArray(selectedPaymentForDelete.allocations)
        ? selectedPaymentForDelete.allocations.filter((allocation: any) => {
            const allocationInvoiceId = String(allocation?.invoice?._id || allocation?.invoice?.id || allocation?.invoice || allocation?.invoiceId || "").trim();
            const allocationInvoiceNumber = String(allocation?.invoiceNumber || allocation?.invoice?.invoiceNumber || "").trim();
            return !currentInvoiceIds.has(allocationInvoiceId) && !currentInvoiceNumbers.has(allocationInvoiceNumber);
          })
        : [];

      const nextInvoicePayments =
        selectedPaymentForDelete.invoicePayments && typeof selectedPaymentForDelete.invoicePayments === "object"
          ? Object.entries(selectedPaymentForDelete.invoicePayments).reduce((acc: Record<string, number>, [invId, amount]) => {
              const key = String(invId || "").trim();
              if (!key || currentInvoiceIds.has(key)) return acc;
              const numericAmount = Number(amount || 0);
              if (numericAmount > 0) acc[key] = roundMoney(numericAmount);
              return acc;
            }, {})
          : undefined;

      const paymentInvoiceId = String(selectedPaymentForDelete.invoiceId || selectedPaymentForDelete.invoice?._id || selectedPaymentForDelete.invoice?.id || selectedPaymentForDelete.invoice || "").trim();
      const paymentInvoiceNumber = String(selectedPaymentForDelete.invoiceNumber || "").trim();
      const shouldClearDirectInvoiceLink = currentInvoiceIds.has(paymentInvoiceId) || currentInvoiceNumbers.has(paymentInvoiceNumber);

      const paymentPatch: any = {
        allocations: nextAllocations,
        invoicePayments: nextInvoicePayments || {},
        amountUsedForPayments: Object.values(nextInvoicePayments || {}).reduce((sum, value) => sum + Number(value || 0), 0),
        unappliedAmount: roundMoney(
          Number(selectedPaymentForDelete.amountReceived ?? selectedPaymentForDelete.amount ?? 0) -
          Object.values(nextInvoicePayments || {}).reduce((sum, value) => sum + Number(value || 0), 0)
        ),
      };
      if (shouldClearDirectInvoiceLink) {
        paymentPatch.invoiceId = "";
        paymentPatch.invoiceNumber = "";
      }
      await paymentsReceivedAPI.update(paymentId, paymentPatch);

      const creditNotesRes = await creditNotesAPI.getAll({ limit: 10000 });
      const creditRows = Array.isArray((creditNotesRes as any)?.data) ? (creditNotesRes as any).data : [];
      const maxSerial = creditRows.reduce((max: number, row: any) => {
        const match = String(row?.creditNoteNumber || "").match(/(\d+)$/);
        const value = match ? Number(match[1]) : 0;
        return Number.isFinite(value) ? Math.max(max, value) : max;
      }, 0);
      const nextCreditNoteNumber = `CN-${String(maxSerial + 1).padStart(6, "0")}`;

      const sourceCustomerId = isDebitNoteView ? String((invoice as any)?.customerId || "") : getCustomerKey(invoice);
      const sourceCustomerName = isDebitNoteView ? String((invoice as any)?.customerName || "") : getCustomerName(invoice);

      await creditNotesAPI.create({
        creditNoteNumber: nextCreditNoteNumber,
        customerId: sourceCustomerId,
        customerName: sourceCustomerName,
        invoiceId: targetInvoiceId,
        invoiceNumber: targetInvoiceNumber,
        date: new Date().toISOString(),
        creditNoteDate: new Date().toISOString(),
        total: dissociatedAmount,
        amount: dissociatedAmount,
        balance: dissociatedAmount,
        status: "open",
        currency: selectedPaymentForDelete.currency || invoice.currency || baseCurrency || "USD",
        source: "payment_dissociation",
        sourcePaymentId: paymentId,
        sourceInvoiceId: targetInvoiceId,
        sourceInvoiceNumber: targetInvoiceNumber,
        notes: `Created from dissociated payment ${selectedPaymentForDelete.paymentNumber || paymentId}.`,
      });

      const paymentsRaw = await getPayments();
      const allPayments = Array.isArray(paymentsRaw)
        ? paymentsRaw.filter((p: any) => {
            const associatedInvoiceId = String((invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId || "");
            const associatedInvoiceNumber = String((invoice as any)?.associatedInvoiceNumber || "");
            return isPaymentLinkedToInvoice(
              p,
              invoice,
              id,
              associatedInvoiceId ? [associatedInvoiceId] : [],
              associatedInvoiceNumber ? [associatedInvoiceNumber] : []
            );
          })
        : [];
      setPayments(allPayments);

      if (id && !isDebitNoteView) {
        const refreshedInvoice = await getInvoiceById(id);
        if (refreshedInvoice) {
          setInvoice(refreshedInvoice);
          setInvoices((prev) => prev.map((row) => (row.id === refreshedInvoice.id ? refreshedInvoice : row)));
        }
      }

      setShowDeletePaymentModal(false);
      setSelectedPaymentForDelete(null);
      setOpenPaymentMenuId(null);
      toast.success("Payment dissociated and moved to customer credit.");
    } catch (error: any) {
      console.error("Failed to dissociate payment and create credit:", error);
      toast.error(error?.message || "Failed to dissociate payment.");
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const handleOpenRefundModal = (paymentRow: any) => {
    setSelectedPaymentForRefund(paymentRow);
    setIsRefundModalOpen(true);
  };

  const handleCloseRefundModal = () => {
    if (isSavingRefund) return;
    setIsRefundModalOpen(false);
    setSelectedPaymentForRefund(null);
    setRefundData({
      amount: "",
      refundedOn: "",
      paymentMode: "",
      referenceNumber: "",
      fromAccount: "",
      fromAccountId: "",
      description: ""
    });
  };

  const handleRefundSave = async () => {
    if (!selectedPaymentForRefund) return;

    const paymentId = String(selectedPaymentForRefund.id || selectedPaymentForRefund._id || "").trim();
    if (!paymentId) {
      toast.error("Payment id not found.");
      return;
    }

    const refundAmount = Number(refundData.amount || 0);
    const maxAmount = Number(selectedPaymentForRefund.amountReceived ?? selectedPaymentForRefund.amount ?? 0) || 0;

    if (!refundAmount || refundAmount <= 0) {
      toast.error("Please enter a valid refund amount.");
      return;
    }
    if (refundAmount > maxAmount) {
      toast.error("Refund amount cannot exceed the payment amount.");
      return;
    }
    if (!refundData.refundedOn) {
      toast.error("Please choose the refund date.");
      return;
    }
    if (!refundData.fromAccount && !refundData.fromAccountId) {
      toast.error("Please choose the refund account.");
      return;
    }

    try {
      setIsSavingRefund(true);

      const payload = {
        paymentId,
        invoiceId: String(invoice?.id || invoice?._id || id || "").trim(),
        amount: roundMoney(refundAmount),
        refundDate: refundData.refundedOn,
        paymentMethod: refundData.paymentMode || "Cash",
        referenceNumber: refundData.referenceNumber,
        fromAccount: refundData.fromAccountId || refundData.fromAccount,
        description: refundData.description
      };

      const response: any = await refundsAPI.create(payload);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to process refund.");
      }

      const [paymentsRaw, refreshedInvoice] = await Promise.all([
        getPayments(),
        id && !isDebitNoteView ? getInvoiceById(id) : Promise.resolve(invoice)
      ]);

      const associatedInvoiceId = String((invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId || "");
      const associatedInvoiceNumber = String((invoice as any)?.associatedInvoiceNumber || "");
      const allPayments = Array.isArray(paymentsRaw)
        ? paymentsRaw.filter((p: any) =>
            isPaymentLinkedToInvoice(
              p,
              refreshedInvoice || invoice,
              id,
              associatedInvoiceId ? [associatedInvoiceId] : [],
              associatedInvoiceNumber ? [associatedInvoiceNumber] : []
            )
          )
        : [];
      setPayments(allPayments);

      if (refreshedInvoice) {
        setInvoice(refreshedInvoice as any);
        setInvoices((prev) =>
          prev.map((row: any) => {
            const rowId = String(row?.id || row?._id || "").trim();
            const refreshedId = String((refreshedInvoice as any)?.id || (refreshedInvoice as any)?._id || "").trim();
            return rowId && rowId === refreshedId ? (refreshedInvoice as any) : row;
          })
        );
      }

      toast.success("Refund saved successfully.");
      handleCloseRefundModal();
    } catch (error: any) {
      console.error("Failed to process refund:", error);
      toast.error(error?.message || "Failed to process refund.");
    } finally {
      setIsSavingRefund(false);
    }
  };

  const getTotalRetainerApplied = () =>
    Object.values(retainerApplyValues).reduce((sum, value) => sum + (Number(value) || 0), 0);

  const handleApplyRetainersSubmit = async () => {
    if (!invoice || isApplyingRetainer) return;
    const invoiceBalance = getCurrentDocumentBalance();
    const totalApplied = getTotalRetainerApplied();
    if (totalApplied <= 0) {
      toast.error("Enter retainer amount to apply.");
      return;
    }
    if (totalApplied > invoiceBalance) {
      toast.error("Total applied cannot exceed invoice balance.");
      return;
    }

    const rowsToApply = customerRetainerInvoices
      .map((row: any) => {
        const rowId = String(row?.id || row?._id || "");
        const applied = Number(retainerApplyValues[rowId] || 0);
        const available = getRetainerAvailableAmount(row);
        return { row, rowId, applied, available };
      })
      .filter((entry) => entry.rowId && entry.applied > 0);

    if (!rowsToApply.length) {
      toast.error("Select at least one retainer amount.");
      return;
    }

    const invalidRow = rowsToApply.find((entry) => entry.applied > entry.available);
    if (invalidRow) {
      toast.error(`Applied amount is greater than available for ${invalidRow.row?.invoiceNumber || invalidRow.rowId}.`);
      return;
    }

    try {
      setIsApplyingRetainer(true);

      // 1) Update each retainer invoice available balance
      for (const entry of rowsToApply) {
        const nextAvailable = Math.max(0, Number(entry.available) - Number(entry.applied));
        const nextDrawStatus = nextAvailable <= 0 ? "drawn" : "partially_drawn";
        await updateInvoice(entry.rowId, {
          balance: nextAvailable,
          balanceDue: nextAvailable,
          availableAmount: nextAvailable,
          unusedAmount: nextAvailable,
          retainerAvailableAmount: nextAvailable,
          retainerDrawStatus: nextDrawStatus,
          drawStatus: nextDrawStatus,
          status: String(entry.row?.status || "paid"),
        } as any);
      }

      // 2) Update current invoice / debit note
      const nextBalance = Math.max(0, invoiceBalance - totalApplied);
      const nextStatus = nextBalance <= 0 ? "paid" : ((invoice as any)?.status || "sent");
      const existingApplications = Array.isArray((invoice as any)?.retainerApplications)
        ? [...(invoice as any)?.retainerApplications]
        : [];
      const newApplications = rowsToApply.map((entry) => ({
        retainerId: entry.rowId,
        retainerNumber: String(entry.row?.invoiceNumber || ""),
        amount: Number(entry.applied),
        appliedAt: new Date().toISOString(),
      }));
      const patchPayload: any = {
        balance: nextBalance,
        balanceDue: nextBalance,
        status: nextStatus,
        retainerApplications: [...existingApplications, ...newApplications],
        totalRetainersApplied: toNumSafe((invoice as any)?.totalRetainersApplied, 0) + totalApplied,
      };

      if (isDebitNoteView) {
        await debitNotesAPI.update(String((invoice as any)?.id || (invoice as any)?._id || id || ""), patchPayload);
      } else {
        await updateInvoice(String((invoice as any)?.id || (invoice as any)?._id || id || ""), patchPayload);
      }

      setInvoice((prev: any) => (prev ? { ...prev, ...patchPayload } : prev));
      setCustomerRetainerAvailable((prev) => Math.max(0, prev - totalApplied));
      setCustomerRetainerInvoices((prev) =>
        prev.map((row: any) => {
          const rowId = String(row?.id || row?._id || "");
          const appliedRow = rowsToApply.find((entry) => entry.rowId === rowId);
          if (!appliedRow) return row;
          const available = getRetainerAvailableAmount(row);
          const nextAvailable = Math.max(0, available - appliedRow.applied);
          return {
            ...row,
            balance: nextAvailable,
            balanceDue: nextAvailable,
            availableAmount: nextAvailable,
            unusedAmount: nextAvailable,
            retainerAvailableAmount: nextAvailable,
            retainerDrawStatus: nextAvailable <= 0 ? "drawn" : "partially_drawn",
          };
        })
      );

      setIsApplyRetainerOpen(false);
      toast.success("Retainers applied successfully.");
    } catch (error: any) {
      console.error("Failed to apply retainers:", error);
      toast.error(error?.message || "Failed to apply retainers.");
    } finally {
      setIsApplyingRetainer(false);
    }
  };

  const handleAdjustmentValueChange = (rowKey: string, rawValue: string, maxValue: number) => {
    const numeric = Math.max(0, Math.min(maxValue, toNumSafe(rawValue, 0)));
    setApplyAdjustmentValues((prev) => ({ ...prev, [rowKey]: numeric }));
  };

  const handleApplyAdjustments = async () => {
    if (!invoice || isApplyingAdjustments) return;
    const invoiceId = String(
      isDebitNoteView
        ? (invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId || ""
        : (invoice as any)?.id || (invoice as any)?._id || id || ""
    ).trim();
    if (!invoiceId) {
      toast.error("Invoice id not found.");
      return;
    }

    const rowsToApply = applyAdjustmentRows
      .map((row: any) => ({ ...row, applied: roundMoney(toNumSafe(applyAdjustmentValues[row.rowKey], 0)) }))
      .filter((row: any) => row.applied > 0);
    if (!rowsToApply.length) {
      toast.error("Enter amount to apply.");
      return;
    }

    const total = roundMoney(toNumSafe((invoice as any)?.total ?? (invoice as any)?.amount, 0));
    const paid = roundMoney(toNumSafe((invoice as any)?.paidAmount ?? (invoice as any)?.amountPaid, 0));
    const currentCredits = roundMoney(toNumSafe((invoice as any)?.creditsApplied, 0));
    const currentRetainers = roundMoney(toNumSafe((invoice as any)?.retainerAppliedAmount ?? (invoice as any)?.retainersApplied ?? (invoice as any)?.retainerAmountApplied ?? (invoice as any)?.retainerAppliedTotal, 0));
    const currentBalance = roundMoney(Math.max(0, toNumSafe((invoice as any)?.balance ?? (invoice as any)?.balanceDue, total - paid - currentCredits - currentRetainers)));
    const totalToApply = roundMoney(rowsToApply.reduce((sum: number, row: any) => sum + row.applied, 0));
    if (totalToApply > currentBalance) {
      toast.error("Applied amount cannot exceed invoice balance.");
      return;
    }

    try {
      setIsApplyingAdjustments(true);
      let creditTotal = 0;
      let retainerTotal = 0;
      const retainerApplications: any[] = [];

      for (const row of rowsToApply) {
        if (row.sourceType === "credit") {
          const nextBalance = roundMoney(Math.max(0, toNumSafe(row.availableAmount, 0) - toNumSafe(row.applied, 0)));
          const existingAllocations = Array.isArray(row.raw?.allocations) ? [...row.raw.allocations] : [];
          await creditNotesAPI.update(String(row.id), {
            balance: nextBalance,
            creditsUsed: roundMoney(toNumSafe(row.raw?.creditsUsed, 0) + toNumSafe(row.applied, 0)),
            status: nextBalance <= 0 ? "closed" : (row.raw?.status || "open"),
            allocations: [
              ...existingAllocations,
              {
                invoiceId,
                amount: row.applied,
                date: useApplyDate ? applyOnDate : new Date().toISOString().split("T")[0],
              },
            ],
            allocationUpdatedAt: new Date().toISOString(),
          });
          creditTotal += toNumSafe(row.applied, 0);
        } else {
          const nextAvailable = roundMoney(Math.max(0, toNumSafe(row.availableAmount, 0) - toNumSafe(row.applied, 0)));
          await updateInvoice(String(row.id), {
            retainerAvailableAmount: nextAvailable,
            retainerDrawStatus: nextAvailable <= 0 ? "drawn" : "partially_drawn",
          } as any);
          retainerTotal += toNumSafe(row.applied, 0);
          retainerApplications.push({
            retainerId: String(row.id),
            retainerNumber: String(row.transactionNumber || ""),
            amount: row.applied,
            appliedOn: useApplyDate ? applyOnDate : new Date().toISOString().split("T")[0],
          });
        }
      }

      const nextCreditsApplied = roundMoney(currentCredits + creditTotal);
      const nextRetainerApplied = roundMoney(currentRetainers + retainerTotal);
      const nextBalance = roundMoney(Math.max(0, total - paid - nextCreditsApplied - nextRetainerApplied));
      const statusKey = normalizeKey((invoice as any)?.status || "sent");
      const nextStatus =
        statusKey === "void"
          ? (invoice as any)?.status
          : nextBalance <= 0
            ? "paid"
            : paid > 0 || nextCreditsApplied > 0 || nextRetainerApplied > 0
              ? "partially_paid"
              : (statusKey === "draft" ? "draft" : "sent");

      const existingRetainerApps = Array.isArray((invoice as any)?.retainerApplications)
        ? [...(invoice as any).retainerApplications]
        : [];

      const patchPayload: any = {
        creditsApplied: nextCreditsApplied,
        retainerAppliedAmount: nextRetainerApplied,
        retainersApplied: nextRetainerApplied,
        retainerAmountApplied: nextRetainerApplied,
        retainerAppliedTotal: nextRetainerApplied,
        retainerApplications: [...existingRetainerApps, ...retainerApplications],
        balance: nextBalance,
        balanceDue: nextBalance,
        amountDue: nextBalance,
        status: nextStatus,
      };
      if (isDebitNoteView) {
        await debitNotesAPI.update(String((invoice as any)?.id || (invoice as any)?._id || id || ""), patchPayload);
      } else {
        await updateInvoice(invoiceId, patchPayload);
      }

      setInvoice((prev: any) => (prev ? { ...prev, ...patchPayload } : prev));
      setCustomerCreditsAvailable((prev) => Math.max(0, roundMoney(prev - creditTotal)));
      setCustomerRetainerAvailable((prev) => Math.max(0, roundMoney(prev - retainerTotal)));

      if (creditTotal > 0) {
        const appendedCreditRows = rowsToApply
          .filter((row: any) => row.sourceType === "credit")
          .map((row: any) => ({
            id: row.id,
            date: useApplyDate ? applyOnDate : new Date().toISOString(),
            transactionNumber: row.transactionNumber,
            appliedAmount: row.applied,
          }));
        setCreditsAppliedRows((prev) => [...appendedCreditRows, ...prev]);
        setCreditsAppliedCount((prev) => prev + appendedCreditRows.length);
      }

      setIsApplyAdjustmentsModalOpen(false);
      setIsApplyRetainerOpen(false);
      toast.success("Credits/retainers applied successfully.");
    } catch (error: any) {
      console.error("Failed to apply credits/retainers:", error);
      toast.error(error?.message || "Failed to apply credits/retainers.");
    } finally {
      setIsApplyingAdjustments(false);
    }
  };

  const handleRemoveAppliedCredit = async (creditRow: any) => {
    if (!invoice || !creditRow?.id) return;
    const invoiceId = String(
      isDebitNoteView
        ? (invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId || ""
        : (invoice as any)?.id || (invoice as any)?._id || id || ""
    ).trim();
    if (!invoiceId) return;
    const creditNoteId = String(creditRow.id || "").trim();
    const amountToReverse = roundMoney(Math.max(0, toNumSafe(creditRow.appliedAmount, 0)));
    if (!creditNoteId || amountToReverse <= 0) return;

    try {
      setIsRemovingAppliedCreditId(creditNoteId);
      const noteRes = await creditNotesAPI.getById(creditNoteId);
      const note = (noteRes as any)?.data || noteRes;
      if (!note) {
        toast.error("Credit note not found.");
        return;
      }

      let remainingToRemove = amountToReverse;
      const existingAllocations = Array.isArray(note?.allocations) ? note.allocations : [];
      const nextAllocations: any[] = [];
      existingAllocations.forEach((allocation: any) => {
        const allocationInvoiceId = String(allocation?.invoiceId || allocation?.invoice?._id || allocation?.invoice?.id || allocation?.invoice || "").trim();
        const allocationAmount = roundMoney(toNumSafe(allocation?.amount, 0));
        if (allocationInvoiceId !== invoiceId || allocationAmount <= 0 || remainingToRemove <= 0) {
          nextAllocations.push(allocation);
          return;
        }
        const removedNow = Math.min(allocationAmount, remainingToRemove);
        const leftover = roundMoney(allocationAmount - removedNow);
        remainingToRemove = roundMoney(remainingToRemove - removedNow);
        if (leftover > 0) nextAllocations.push({ ...allocation, amount: leftover });
      });

      const nextCreditBalance = roundMoney(toNumSafe(note?.balance ?? note?.unusedAmount ?? note?.availableAmount, 0) + amountToReverse);
      const nextCreditsUsed = Math.max(0, roundMoney(toNumSafe(note?.creditsUsed, 0) - amountToReverse));
      await creditNotesAPI.update(creditNoteId, {
        balance: nextCreditBalance,
        creditsUsed: nextCreditsUsed,
        allocations: nextAllocations,
        status: "open",
        allocationUpdatedAt: new Date().toISOString(),
      });

      const total = roundMoney(toNumSafe((invoice as any)?.total ?? (invoice as any)?.amount, 0));
      const paid = roundMoney(toNumSafe((invoice as any)?.paidAmount ?? (invoice as any)?.amountPaid, 0));
      const currentCredits = roundMoney(toNumSafe((invoice as any)?.creditsApplied, 0));
      const currentRetainers = roundMoney(toNumSafe((invoice as any)?.retainerAppliedAmount ?? (invoice as any)?.retainersApplied ?? (invoice as any)?.retainerAmountApplied ?? (invoice as any)?.retainerAppliedTotal, 0));
      const nextCreditsApplied = Math.max(0, roundMoney(currentCredits - amountToReverse));
      const nextBalance = roundMoney(Math.max(0, total - paid - nextCreditsApplied - currentRetainers));
      const statusKey = normalizeKey((invoice as any)?.status || "sent");
      const nextStatus =
        statusKey === "void"
          ? (invoice as any)?.status
          : nextBalance <= 0
            ? "paid"
            : paid > 0 || nextCreditsApplied > 0 || currentRetainers > 0
              ? "partially_paid"
              : (statusKey === "draft" ? "draft" : "sent");

      const patchPayload: any = {
        creditsApplied: nextCreditsApplied,
        balance: nextBalance,
        balanceDue: nextBalance,
        amountDue: nextBalance,
        status: nextStatus,
      };
      if (isDebitNoteView) {
        await debitNotesAPI.update(String((invoice as any)?.id || (invoice as any)?._id || id || ""), patchPayload);
      } else {
        await updateInvoice(invoiceId, patchPayload);
      }
      setInvoice((prev: any) => (prev ? { ...prev, ...patchPayload } : prev));

      setCreditsAppliedRows((prev) => prev.filter((row: any) => String(row.id) !== creditNoteId));
      setCreditsAppliedCount((prev) => Math.max(0, prev - 1));
      setCustomerCreditsAvailable((prev) => roundMoney(prev + amountToReverse));
      toast.success("Applied credit removed and returned to credit note.");
    } catch (error: any) {
      console.error("Failed to remove applied credit:", error);
      toast.error(error?.message || "Failed to remove applied credit.");
    } finally {
      setIsRemovingAppliedCreditId(null);
    }
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

  const handleCreateCreditNote = () => {
    setIsMoreMenuOpen(false);
    // TODO: Implement create credit note functionality
    navigate(`/sales/credit-notes/new?invoiceId=${id}`, {
      state: { clonedData: invoice },
    });
  };

  const handleCreateDebitNote = () => {
    setIsMoreMenuOpen(false);
    navigate(`/sales/debit-notes/new${id ? `?invoiceId=${id}` : ''}`, {
      state: { clonedData: invoice },
    });
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
      toast("Cannot clone this invoice because it has no customer.");
      return;
    }

    try {
      const prefix = getInvoiceNumberPrefix(invoice?.invoiceNumber);
      let nextInvoiceNumber = "";

      try {
        const numberResponse = await invoicesAPI.getNextNumber(prefix);
        nextInvoiceNumber = extractNextInvoiceNumber(numberResponse, prefix);
      } catch (error) {
        console.warn("Failed to fetch next invoice number from API, falling back to local sequence:", error);
      }

      if (!nextInvoiceNumber) {
        nextInvoiceNumber = getNextInvoiceNumberFromExistingInvoices(invoices, prefix, invoice?.invoiceNumber);
      }

      const clonePayload = buildClonedInvoicePayload(invoice, nextInvoiceNumber);
      let clonedInvoice: any;

      try {
        clonedInvoice = await saveInvoice(clonePayload as any);
      } catch (error: any) {
        if (!isDuplicateInvoiceNumberError(error)) {
          throw error;
        }

        let retryInvoiceNumber = "";
        try {
          const retryNumberResponse = await invoicesAPI.getNextNumber(prefix);
          retryInvoiceNumber = extractNextInvoiceNumber(retryNumberResponse, prefix);
        } catch (retryError) {
          console.warn("Retry number fetch failed, using local fallback:", retryError);
        }

        if (!retryInvoiceNumber) {
          retryInvoiceNumber = getNextInvoiceNumberFromExistingInvoices(
            [...invoices, clonePayload],
            prefix,
            nextInvoiceNumber
          );
        }

        clonedInvoice = await saveInvoice({ ...clonePayload, invoiceNumber: retryInvoiceNumber } as any);
      }

      const clonedInvoiceId = clonedInvoice?.id || clonedInvoice?._id;
      if (clonedInvoiceId) {
        toast.success("Invoice cloned successfully.");
        navigate(`/sales/invoices/${clonedInvoiceId}`);
        return;
      }

      toast.success("Invoice cloned successfully, but it could not be opened automatically.");
    } catch (error: any) {
      console.error("Error cloning invoice:", error);
      toast(error?.message || "Failed to clone invoice. Please try again.");
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
    if (!invoice) return;
    setIsDeleteInvoiceModalOpen(true);
  };

  const handleConfirmDeleteInvoice = () => {
    if (!invoice) return;
    // TODO: Implement actual deletion logic
    const updatedInvoices = invoices.filter(inv => inv.id !== invoice.id);
    setInvoices(updatedInvoices);
    toast.success("Invoice deleted successfully.");
    setIsDeleteInvoiceModalOpen(false);
    navigate("/sales/invoices");
  };

  const handleInvoicePreferences = () => {
    setIsMoreMenuOpen(false);
    // TODO: Implement invoice preferences functionality
    // This could open a preferences modal or navigate to preferences page
    toast("Invoice Preferences - Feature coming soon");
  };

  const handleVoidInvoice = async () => {
    if (!invoice) return;
    setIsMoreMenuOpen(false);
    try {
      const updatedInvoice = await updateInvoice(id, { ...invoice, status: "void" });
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        setInvoices((prev) => prev.map((inv) => String(inv.id) === String(id) ? updatedInvoice : inv));
        toast("Invoice voided successfully.");
      }
    } catch (error: any) {
      console.error("Error voiding invoice:", error);
      toast("Failed to void invoice: " + (error?.message || "Unknown error"));
    }
  };

  // Attachments Handlers
  const handleFileUpload = (files: FileList | File[]) => {
    const validFiles = Array.from(files as ArrayLike<File>).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (invoiceAttachments.length + validFiles.length > 5) {
      toast("Maximum 5 files allowed. Please remove some files first.");
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
          .then(() => toast.success("Attachment uploaded successfully."))
          .catch(err => {
            console.error("Error saving attachments to backend:", err);
            toast.error("Failed to save attachment.");
          });
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
          .then(() => toast.success("Attachment removed successfully."))
          .catch(err => {
            console.error("Error saving attachments to backend:", err);
            toast.error("Failed to remove attachment.");
          });
      }
      return updated;
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []) as File[];
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
          .then(() => toast.success("Comment added successfully."))
          .catch(err => {
            console.error("Error saving comments to backend:", err);
            toast.error("Failed to save comment.");
          });
      }
      return updated;
    });
    setNewComment("");
    setCommentBold(false);
    setCommentItalic(false);
    setCommentUnderline(false);
  };

  const handleRefreshSidebarInvoices = async () => {
    try {
      const allInvoices = await getInvoices();
      setInvoices(stripRetainerInvoices(allInvoices as any[]));
    } catch (error) {
      console.error("Failed to refresh invoices:", error);
    }
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
  const invoiceStatusKey = String(invoice?.status || "").toLowerCase().replace(/[\s-]+/g, "_").trim();
  const isDebitNoteDocument = isDebitNoteView || Boolean((invoice as any)?.debitNote || (invoice as any)?.debitNoteNumber);
  const canRecordPayment = !["paid", "void"].includes(invoiceStatusKey);
  const showWhatsNext = !isDebitNoteView && canRecordPayment;
  const creditAppliedAmount = Number(invoiceTotalsMeta.creditsApplied) || 0;
  const retainerAppliedAmount = (() => {
    const direct =
      toNumber((invoice as any)?.retainerAppliedAmount) ||
      toNumber((invoice as any)?.retainersApplied) ||
      toNumber((invoice as any)?.retainerAmountApplied) ||
      toNumber((invoice as any)?.retainerAppliedTotal);
    if (direct > 0) return direct;
    const apps = Array.isArray((invoice as any)?.retainerApplications)
      ? (invoice as any).retainerApplications
      : [];
    return apps.reduce((sum: number, row: any) => {
      const value =
        toNumber(row?.appliedAmount) ||
        toNumber(row?.amountApplied) ||
        toNumber(row?.amount) ||
        toNumber(row?.applied);
      return sum + (value > 0 ? value : 0);
    }, 0);
  })();
  const paymentDisplayRows = (() => {
    const normalizedPayments = (Array.isArray(payments) ? payments : []).map((payment: any, index: number) => {
      const rowId = String(payment?.id || payment?._id || payment?.paymentNumber || `payment-${index + 1}`).trim();
      return {
        ...payment,
        id: rowId,
        paymentId: rowId,
        date: payment?.paymentDate || payment?.date || payment?.createdAt || payment?.updatedAt || "",
        paymentNumber: payment?.paymentNumber || payment?.number || rowId || "-",
        referenceNumber: payment?.referenceNumber || payment?.paymentReference || payment?.reference || "-",
        paymentMode: payment?.paymentMode || payment?.paymentMethod || "-",
        amountReceived: payment?.amountReceived ?? payment?.amount ?? 0,
        amount: payment?.amountReceived ?? payment?.amount ?? 0,
        earlyPaymentDiscount: payment?.earlyPaymentDiscount ?? payment?.discountAmount ?? 0,
        isSyntheticRetainer: false,
      };
    });

    const retainerRows = Array.isArray((invoice as any)?.retainerApplications)
      ? (invoice as any).retainerApplications
          .map((application: any, index: number) => {
            const appliedAmount =
              toNumber(application?.amount) ||
              toNumber(application?.amountApplied) ||
              toNumber(application?.appliedAmount) ||
              toNumber(application?.applied);
            if (appliedAmount <= 0) return null;

            const rowId = String(
              application?.paymentId ||
                application?.retainerId ||
                application?.retainerNumber ||
                `retainer-${index + 1}`
            ).trim();

            return {
              id: rowId,
              paymentId: String(application?.paymentId || rowId).trim(),
              paymentDate: application?.appliedAt || application?.date || "",
              date: application?.appliedAt || application?.date || (invoice as any)?.invoiceDate || (invoice as any)?.date || (invoice as any)?.createdAt || "",
              paymentNumber: application?.retainerNumber || application?.paymentNumber || application?.paymentId || rowId || "Retainer",
              referenceNumber: application?.paymentNumber || application?.paymentId || application?.retainerId || "-",
              paymentMode: "Retainer",
              amountReceived: appliedAmount,
              amount: appliedAmount,
              earlyPaymentDiscount: 0,
              status: "paid",
              isSyntheticRetainer: true,
              raw: application,
            };
          })
          .filter(Boolean)
      : [];

    const fallbackRetainerRow =
      retainerRows.length === 0 && retainerAppliedAmount > 0
        ? [{
            id: `retainer-summary-${String((invoice as any)?.id || (invoice as any)?._id || "current")}`,
            paymentId: `retainer-summary-${String((invoice as any)?.id || (invoice as any)?._id || "current")}`,
            paymentDate: (invoice as any)?.invoiceDate || (invoice as any)?.date || (invoice as any)?.createdAt || "",
            date: (invoice as any)?.invoiceDate || (invoice as any)?.date || (invoice as any)?.createdAt || "",
            paymentNumber: (invoice as any)?.invoiceNumber || "Retainer",
            referenceNumber: "-",
            paymentMode: "Retainer",
            amountReceived: retainerAppliedAmount,
            amount: retainerAppliedAmount,
            earlyPaymentDiscount: 0,
            status: "paid",
            isSyntheticRetainer: true,
            raw: null,
          }]
        : [];

    const mergedRows = [...normalizedPayments];
    [...retainerRows, ...fallbackRetainerRow].forEach((row: any) => {
      const rowKey = normalizeKey(
        [
          row?.id,
          row?.paymentId,
          row?.paymentNumber,
          row?.referenceNumber,
          row?.raw?.paymentId,
          row?.raw?.retainerId,
        ]
          .filter(Boolean)
          .join("|")
      );

      const alreadyExists = mergedRows.some((existing: any) => {
        const existingKey = normalizeKey(
          [
            existing?.id,
            existing?.paymentId,
            existing?.paymentNumber,
            existing?.referenceNumber,
            existing?.raw?.paymentId,
            existing?.raw?.retainerId,
          ]
            .filter(Boolean)
            .join("|")
        );
        return rowKey && existingKey && rowKey === existingKey;
      });

      if (!alreadyExists) mergedRows.push(row);
    });

    return mergedRows;
  })();
  const shouldShowPaymentsAndCreditsSection =
    paymentDisplayRows.length > 0 ||
    creditsAppliedRows.length > 0 ||
    creditsAppliedCount > 0 ||
    creditAppliedAmount > 0 ||
    (isDebitNoteView && ((invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId));

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
      <div className="w-full h-[calc(100vh-4rem)] min-h-0 flex bg-[#f8fafc] overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[320px] lg:w-[320px] md:w-[270px] border-r border-gray-200 bg-white flex flex-col h-full min-h-0 overflow-hidden hidden md:flex">
          <div className="relative z-20 flex items-center justify-between px-4 h-[74px] border-b border-gray-200">
            <div className="relative flex-1" ref={allInvoicesDropdownRef}>
              <button
                onClick={() => setIsAllInvoicesDropdownOpen(!isAllInvoicesDropdownOpen)}
                className="inline-flex items-center gap-1 text-[18px] font-semibold text-gray-900 cursor-pointer"
              >
                {isAllInvoicesDropdownOpen ? (
                  <ChevronUp size={16} className="text-[#156372]" />
                ) : (
                  <ChevronDown size={16} className="text-[#156372]" />
                )}
                <span>All Invoices</span>
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
            <div className="relative flex items-center gap-2 ml-2" ref={sidebarMoreRef}>
              <button
                className="p-2 rounded-md cursor-pointer text-white border border-[#0D4A52] shadow-sm bg-[#156372] hover:bg-[#0D4A52]"
                onClick={() => navigate("/sales/invoices/new")}
                title="New Invoice"
              >
                <Plus size={16} />
              </button>
              <button
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer border border-gray-200"
                onClick={() => setShowSidebarMoreDropdown((prev) => !prev)}
                title="More"
              >
                <MoreHorizontal size={16} />
              </button>
              {showSidebarMoreDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[120] min-w-[220px]">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowSidebarMoreDropdown(false);
                      navigate("/sales/invoices?sort=created_time");
                    }}
                  >
                    Sort by
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowSidebarMoreDropdown(false);
                      navigate("/sales/invoices/import");
                    }}
                  >
                    Import Invoices
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowSidebarMoreDropdown(false);
                      navigate("/settings/invoices");
                    }}
                  >
                    Preferences
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={async () => {
                      setShowSidebarMoreDropdown(false);
                      await handleRefreshSidebarInvoices();
                    }}
                  >
                    Refresh List
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowSidebarMoreDropdown(false);
                      navigate("/sales/invoices");
                    }}
                  >
                    Go To List
                  </button>
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
                  {(() => {
                    const statusDisplay = getSidebarStatusDisplay(inv);
                    return (
                      <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${statusDisplay.color}`}>
                        {statusDisplay.text}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <div>
                <div className="text-[14px] text-gray-500 mb-0.5">
                  Location: <span className="text-[#1d4ed8]">{String((invoice as any)?.location || "Head Office")}</span>
                </div>
                <h1 className="text-[32px] leading-none font-semibold text-gray-900">{invoice.invoiceNumber || invoice.id}</h1>
              </div>
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

            <div className="flex items-center gap-1 px-6 py-2 text-[13px] text-gray-700 border-b border-gray-200">
              <button
                onClick={() => {
                  const editId = String((invoice as any)?.id || (invoice as any)?._id || id || "").trim();
                  if (!editId) return;
                  navigate(`/sales/debit-notes/${editId}/edit`, { state: { debitNote: invoice } });
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                <Edit size={13} />
                Edit
              </button>
              <div className="h-5 w-px bg-gray-300 mx-1" />

              <button
                onClick={handleSendEmail}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                <Mail size={13} />
                Send
              </button>

              <button
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                onClick={handleShare}
              >
                <Share2 size={13} />
                Share
              </button>
              <div className="h-5 w-px bg-gray-300 mx-1" />

              <button
                onClick={isDownloadingPdf ? undefined : handleDownloadPDF}
                disabled={isDownloadingPdf}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer disabled:opacity-60"
              >
                <FileText size={13} className={isDownloadingPdf ? "animate-pulse" : ""} />
                {isDownloadingPdf ? "Downloading..." : "PDF"}
              </button>

              {debitNote && (
                <button
                  onClick={() => navigate(`/sales/debit-notes/${debitNote.id || debitNote._id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#fff7ed] border border-[#ffedd5] text-[#9a3412] hover:bg-[#ffedd5] font-medium text-[13px] transition-colors shadow-sm"
                  title={`View Debit Note: ${debitNote.debitNoteNumber || debitNote.invoiceNumber || ""}`}
                >
                  <FileText size={13} className="text-[#c2410c]" />
                  <span>Debit Note: {debitNote.debitNoteNumber || debitNote.invoiceNumber || "View"}</span>
                </button>
              )}
              {debitNote && <div className="h-5 w-px bg-gray-300 mx-1" />}

              {invoice && canRecordPayment && (
                <button
                  onClick={handleRecordPayment}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Banknote size={13} />
                  Record Payment
                </button>
              )}
              <div className="h-5 w-px bg-gray-300 mx-1" />

              <div className="relative ml-1" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  aria-expanded={isMoreMenuOpen}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-transparent hover:bg-gray-100 focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>
                {isMoreMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 min-w-[220px] rounded-md border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
                    {invoice?.status?.toLowerCase() === "draft" ? (
                      <>
                        <div
                          className="mx-1 mt-1 flex items-center gap-2 rounded-md px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
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
                        <div className="h-px bg-gray-200 my-1"></div>
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={() => navigate(`/sales/debit-notes/new?invoiceId=${id}`, { state: { clonedData: invoice } })}
                        >
                          <Plus size={14} className="text-blue-500" />
                          Create Debit Note
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {debitNote && (
                <button
                  onClick={() => navigate(`/sales/debit-notes/${debitNote.id || debitNote._id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#fff7ed] border border-[#ffedd5] text-[#9a3412] hover:bg-[#ffedd5] font-medium text-sm transition-colors"
                >
                  <FileText size={14} />
                  View Debit Note
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
          {/* Payments / Credits Applied Section */}
          {shouldShowPaymentsAndCreditsSection && (
            <div className="mx-6 mt-4 rounded border border-gray-200 bg-white">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsPaymentsSectionOpen((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsPaymentsSectionOpen((prev) => !prev);
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentInfoTab("payments");
                    }}
                    className={`flex items-center gap-2 pb-1 border-b-2 ${paymentInfoTab === "payments" ? "border-[#2563eb]" : "border-transparent"}`}
                  >
                    <span className="text-[12px] font-medium text-gray-800">Payments Received</span>
                    <span className="text-[12px] text-[#2563eb]">{paymentDisplayRows.length}</span>
                  </button>
                  <div className="h-4 w-px bg-gray-300" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentInfoTab("credits");
                    }}
                    className={`flex items-center gap-2 pb-1 border-b-2 ${paymentInfoTab === "credits" ? "border-[#2563eb]" : "border-transparent"}`}
                  >
                    <span className="text-[12px] font-medium text-gray-800">Credits Applied</span>
                    <span className="text-[12px] text-[#2563eb]">{creditsAppliedCount}</span>
                  </button>
                  {isDebitNoteView && ((invoice as any)?.associatedInvoiceId || (invoice as any)?.invoiceId) && (
                    <>
                      <div className="h-4 w-px bg-gray-300" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentInfoTab("associated");
                        }}
                        className={`text-[12px] font-medium pb-1 border-b-2 ${paymentInfoTab === "associated" ? "border-[#2563eb] text-[#2563eb]" : "border-transparent text-gray-800 hover:text-[#2563eb]"}`}
                      >
                        Associated Invoices
                      </button>
                    </>
                  )}
                  {creditAppliedAmount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium">
                        Credit Note Applied: {formatCurrency(creditAppliedAmount, invoice.currency)}
                      </span>
                    </div>
                  )}
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPaymentsSectionOpen ? "rotate-0" : "-rotate-90"}`} />
              </div>
              {isPaymentsSectionOpen && (
                <div className="border-t border-gray-200 overflow-x-auto relative z-[20]">
                  {paymentInfoTab === "associated" && isDebitNoteView ? (
                    <div>
                      <div className="px-4 py-2 text-[14px] text-gray-900">Invoice</div>
                      <table className="w-full text-left">
                        <thead className="bg-[#f6f7fb]">
                          <tr className="text-[12px] text-[#6b7280]">
                            <th className="px-4 py-2 font-medium">Date</th>
                            <th className="px-4 py-2 font-medium">Invoice Number</th>
                            <th className="px-4 py-2 font-medium text-right">Invoice Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-gray-100">
                            <td className="px-4 py-3 text-[12px] text-gray-800">
                              {formatDate((associatedInvoiceRow as any)?.invoiceDate || (associatedInvoiceRow as any)?.date || (invoice as any)?.date)}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-[#2563eb]">
                              {(associatedInvoiceRow as any)?.invoiceNumber || (invoice as any)?.associatedInvoiceNumber || "-"}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-gray-900 text-right">
                              {formatCurrency(
                                toNumSafe((associatedInvoiceRow as any)?.total ?? (associatedInvoiceRow as any)?.amount ?? (associatedInvoiceRow as any)?.balance ?? (invoice as any)?.total ?? 0, 0),
                                (associatedInvoiceRow as any)?.currency || invoice.currency
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : paymentInfoTab === "credits" ? (
                    <table className="w-full text-left">
                      <thead className="bg-[#f6f7fb]">
                        <tr className="text-[12px] text-[#6b7280] uppercase">
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 font-medium">Transaction#</th>
                          <th className="px-4 py-2 font-medium">Credits Applied</th>
                          <th className="px-4 py-2 font-medium w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditsAppliedRows.length > 0 ? creditsAppliedRows.map((row: any, rowIndex: number) => (
                          <tr key={row.id || row.transactionNumber || rowIndex} className="border-t border-gray-100">
                            <td className="px-4 py-3 text-[12px] text-gray-800">{formatDate(row.date)}</td>
                            <td className="px-4 py-3 text-[12px] text-[#2563eb]">{row.transactionNumber}</td>
                            <td className="px-4 py-3 text-[12px] text-gray-900">{formatCurrency(row.appliedAmount, invoice.currency)}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                disabled={isRemovingAppliedCreditId === String(row.id)}
                                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                onClick={() => {
                                  void handleRemoveAppliedCredit(row);
                                }}
                              >
                                {isRemovingAppliedCreditId === String(row.id) ? <RotateCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-[12px] text-gray-500 text-center">No applied credits</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-[#f6f7fb]">
                        <tr className="text-[12px] text-[#6b7280] uppercase">
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 font-medium">Payment #</th>
                          <th className="px-4 py-2 font-medium">Reference#</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium">Payment Mode</th>
                          <th className="px-4 py-2 font-medium">Amount</th>
                          <th className="px-4 py-2 font-medium">Early Payment Discount</th>
                          <th className="px-4 py-2 font-medium">...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentDisplayRows.map((payment: any, paymentIndex: number) => (
                          <tr key={String(payment.id || payment._id || payment.paymentNumber || paymentIndex)} className="border-t border-gray-100">
                            <td className="px-4 py-3 text-[12px] text-gray-800">{formatDate(payment.paymentDate || payment.date)}</td>
                            <td className="px-4 py-3 text-[12px] text-[#2563eb]">{payment.paymentNumber || "-"}</td>
                            <td className="px-4 py-3 text-[12px] text-gray-700">{payment.referenceNumber || payment.paymentReference || payment.reference || "-"}</td>
                            <td className={`px-4 py-3 text-[12px] ${getPaymentStatusClass(payment)}`}>{getPaymentStatusLabel(payment)}</td>
                            <td className="px-4 py-3 text-[12px] text-gray-700">{payment.paymentMode || payment.paymentMethod || "-"}</td>
                            <td className="px-4 py-3 text-[12px] text-gray-900">{formatCurrency(payment.amountReceived ?? payment.amount ?? 0, payment.currency || invoice.currency)}</td>
                            <td className="px-4 py-3 text-[12px] text-gray-700">{formatCurrency(0, payment.currency || invoice.currency)}</td>
                            <td className="px-4 py-3 text-[12px] text-gray-500 relative overflow-visible">
                              {payment.isSyntheticRetainer ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                (() => {
                                  const rowMenuId = String(payment.id || payment._id || payment.paymentNumber || paymentIndex);
                                  const paymentId = String(payment.id || payment._id || "");
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        className="px-1 py-0.5 rounded hover:bg-gray-100 text-gray-600"
                                        onClick={() => setOpenPaymentMenuId((prev) => (prev === rowMenuId ? null : rowMenuId))}
                                      >
                                        <MoreHorizontal size={14} />
                                      </button>
                                      {openPaymentMenuId === rowMenuId && (
                                        <div className="absolute right-0 bottom-8 w-[140px] bg-white border border-gray-200 rounded-lg shadow-xl z-[999] py-1">
                                          <button
                                            className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                            onClick={() => {
                                              setOpenPaymentMenuId(null);
                                              if (paymentId) navigate(`/payments/payments-received/${paymentId}`);
                                            }}
                                          >
                                            <Pencil size={13} />
                                            Edit
                                          </button>
                                        <button
                                          className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                          onClick={() => {
                                            setOpenPaymentMenuId(null);
                                            handleOpenRefundModal(payment);
                                          }}
                                        >
                                            <Banknote size={13} />
                                            Refund
                                          </button>
                                          <button
                                            className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                            onClick={() => {
                                              setOpenPaymentMenuId(null);
                                              setSelectedPaymentForDelete(payment);
                                              setShowDeletePaymentModal(true);
                                            }}
                                          >
                                            <Trash2 size={13} />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Debit Note Header Card */}
          {isDebitNoteView && (
            <div className="mx-6 mt-4 rounded border border-gray-200 bg-white">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="space-y-3 text-[14px] text-gray-900">
                  {customerCreditsAvailable > 0 && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-700" />
                      <span>
                        Credits Available:{" "}
                        <span className="font-semibold">
                          {formatCurrency(customerCreditsAvailable, invoice.currency)}
                        </span>{" "}
                        <button
                          type="button"
                          className="text-[#3b82f6] hover:underline"
                          onClick={() => void handleOpenApplyCredits("credit")}
                        >
                          Apply Now
                        </button>
                      </span>
                    </div>
                  )}
                  {customerRetainerAvailable > 0 && (
                    <div className="flex items-center gap-2">
                      <Repeat size={16} className="text-gray-700" />
                      <span>
                        Retainer Available:{" "}
                        <span className="font-semibold">
                          {formatAmountWithCurrency(customerRetainerAvailable)}
                        </span>{" "}
                        <button
                          type="button"
                          className="text-[#3b82f6] hover:underline"
                          onClick={handleOpenApplyRetainer}
                        >
                          Apply Now
                        </button>
                      </span>
                    </div>
                  )}
                  {(associatedInvoiceRow as any) && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-700" />
                      <span>
                        Associated Invoice:{" "}
                        <button
                          type="button"
                          className="text-[#3b82f6] hover:underline"
                          onClick={() => {
                            const invId = String(
                              (associatedInvoiceRow as any)?.id ||
                              (associatedInvoiceRow as any)?._id ||
                              (invoice as any)?.associatedInvoiceId ||
                              (invoice as any)?.invoiceId ||
                              ""
                            );
                            if (invId) navigate(`/sales/invoices/${invId}`);
                          }}
                        >
                          {String(
                            (associatedInvoiceRow as any)?.invoiceNumber ||
                            (invoice as any)?.associatedInvoiceNumber ||
                            (invoice as any)?.invoiceNumber ||
                            "-"
                          )}
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 flex items-center gap-3">
                <Sparkles size={16} className="text-[#7c72ff]" />
                <span className="text-sm text-gray-800">
                  <span className="font-semibold">WHAT&apos;S NEXT?</span> Send this Debit Note to your customer or mark it as Sent.
                </span>
                <button
                  onClick={handleSendInvoice}
                  className="px-3 py-1.5 rounded-md text-sm text-white"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                >
                  Send Debit Note
                </button>
                <button
                  onClick={handleMarkAsSent}
                  className="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                >
                  Mark As Sent
                </button>
              </div>
            </div>
          )}

          {!isDebitNoteView && invoiceStatusKey !== "paid" && (customerCreditsAvailable > 0 || customerRetainerAvailable > 0) && (
            <div className="mx-6 mt-4 rounded border border-gray-200 bg-white">
              <div className="px-5 py-4 space-y-3 text-[14px] text-gray-900">
                {customerCreditsAvailable > 0 && (
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-gray-700" />
                    <span>
                      Credits Available: <span className="font-semibold">{formatCurrency(customerCreditsAvailable, invoice.currency)}</span>{" "}
                      <button type="button" className="text-[#3b82f6] hover:underline" onClick={() => void handleOpenApplyCredits("credit")}>Apply Now</button>
                    </span>
                  </div>
                )}
                {customerRetainerAvailable > 0 && (
                  <div className="flex items-center gap-2">
                    <Repeat size={15} className="text-gray-700" />
                    <span>
                      Retainer Available: <span className="font-semibold">{formatAmountWithCurrency(customerRetainerAvailable)}</span>{" "}
                      <button type="button" className="text-[#3b82f6] hover:underline" onClick={handleOpenApplyRetainer}>Apply Now</button>
                    </span>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 bg-[#f8fafc] border-t border-gray-200 text-sm text-gray-700">
                Get paid faster by setting up online payment gateways.{" "}
                <button className="text-[#3b82f6] hover:underline">Set Up Now</button>
              </div>
            </div>
          )}

          {/* What's Next Section */}
          {showWhatsNext && (
            <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg mx-6 mt-4 flex-shrink-0">
              <Sparkles size={20} className="text-blue-600 flex-shrink-0" />
              <span>
                WHAT'S NEXT?{" "}
                {isDebitNoteDocument
                  ? "Send this Debit Note to your customer or mark it as Sent."
                  : invoice.status === "draft"
                    ? "Send this Invoice to your customer or record a payment."
                    : "Record a payment for this invoice."}
              </span>
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
                      {isDebitNoteDocument ? "Send Debit Note" : "Send Invoice"}
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
          <div className="p-3 bg-gray-50">
            <div
              className="w-full max-w-[920px] mx-auto bg-white border border-[#d1d5db] shadow-sm overflow-hidden relative print-content"
              data-print-content
              style={{ width: "210mm", minHeight: "297mm", padding: "20mm" }}
            >
              {/* Status Ribbon */}
              {(invoice.status === "draft" || invoice.status?.toLowerCase() === "paid" || invoice.status?.toLowerCase() === "sent" || invoice.status?.toLowerCase() === "unpaid") && (
                <div className="absolute top-0 left-0 w-36 h-36 overflow-hidden">
                  <div className={`absolute top-6 -left-8 w-48 h-9 transform -rotate-45 origin-center flex items-center justify-center shadow-sm ${invoice.status?.toLowerCase() === "paid" ? "bg-green-500" :
                    (invoice.status?.toLowerCase() === "sent" || invoice.status?.toLowerCase() === "unpaid") ? "bg-blue-500" :
                      "bg-yellow-500"
                    }`}>
                    <span className="text-white font-bold text-[13px] uppercase tracking-wider">
                      {invoice.status?.toLowerCase() === "sent" ? "UNPAID" : invoice.status}
                    </span>
                  </div>
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
                      {DEFAULT_INVOICE_BRAND_NAME_UPPER}
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
                      <p className="mt-1">{ownerEmail?.email || organizationProfile?.email || ""}</p>
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
                        <td colSpan={5} className="py-8 text-center text-gray-500">No items</td>
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

        </div>

        {showDeletePaymentModal && selectedPaymentForDelete && (
          <div className="fixed inset-0 z-[120] bg-black/40 flex items-start justify-center pt-12">
            <div className="w-full max-w-[560px] bg-white rounded-lg shadow-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-[22px] font-medium text-gray-900 leading-none">Delete Recorded Payment?</h3>
                <button
                  className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                  onClick={() => {
                    if (isDeletingPayment) return;
                    setShowDeletePaymentModal(false);
                    setSelectedPaymentForDelete(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full border-2 border-amber-400 text-amber-500 flex items-center justify-center mt-1">
                    <AlertTriangle size={20} />
                  </div>
                  <p className="text-[12px] text-gray-700 leading-6">
                    You&apos;re deleting a payment of{" "}
                    {formatCurrency(
                      selectedPaymentForDelete.amountReceived ?? selectedPaymentForDelete.amount ?? 0,
                      selectedPaymentForDelete.currency || invoice?.currency
                    )}
                    . You can either dissociate this payment from this invoice and add it as a credit to the customer, or delete this payment entirely.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    disabled={isDeletingPayment}
                    className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] disabled:opacity-60 disabled:cursor-not-allowed text-left px-4 py-2.5 rounded-lg text-[14px] text-gray-700 flex items-center justify-between"
                    onClick={() => {
                      void handleDissociateAndAddAsCredit();
                    }}
                  >
                    <span>Dissociate & Add As Credit</span>
                    <ChevronRight size={16} />
                  </button>
                  <button
                    disabled={isDeletingPayment}
                    className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] disabled:opacity-60 disabled:cursor-not-allowed text-left px-4 py-2.5 rounded-lg text-[14px] text-gray-700 flex items-center justify-between"
                    onClick={() => {
                      void handleDeleteRecordedPayment();
                    }}
                  >
                    <span>{isDeletingPayment ? "Deleting Payment..." : "Delete Payment"}</span>
                    {isDeletingPayment ? <RotateCw size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isRefundModalOpen && selectedPaymentForRefund && (
          <div className="fixed inset-0 z-[120] bg-black/40 flex items-start justify-center pt-8 px-4" onClick={handleCloseRefundModal}>
            <div className="w-full max-w-[1100px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-[22px] font-medium text-gray-900 leading-none">Refund</h3>
                <button
                  className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                  onClick={handleCloseRefundModal}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                    <Banknote size={18} />
                  </div>
                  <div>
                    <div className="text-[13px] text-gray-500">Customer Name</div>
                    <div className="text-[18px] font-medium text-gray-900">
                      {selectedPaymentForRefund.customerName || invoice?.customerName || invoice?.customer || "-"}
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 rounded-lg p-5">
                  <label className="block text-[14px] font-medium text-gray-700 mb-2">Total Refund Amount</label>
                  <div className="max-w-[320px] flex border border-gray-300 rounded-md overflow-hidden bg-white">
                    <div className="px-3 flex items-center text-[14px] text-gray-600 border-r border-gray-300 bg-gray-50">
                      {String(selectedPaymentForRefund.currency || invoice?.currency || baseCurrency || "USD").slice(0, 3)}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={Number(selectedPaymentForRefund.amountReceived ?? selectedPaymentForRefund.amount ?? 0) || 0}
                      value={refundData.amount}
                      onChange={(e) => setRefundData((prev) => ({ ...prev, amount: e.target.value }))}
                      className="flex-1 px-3 py-2.5 text-[14px] text-gray-800 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                  <div>
                    <label className="block text-[14px] text-gray-700 mb-2">
                      Refunded On<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      value={refundData.refundedOn}
                      onChange={(e) => setRefundData((prev) => ({ ...prev, refundedOn: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372]"
                    />
                  </div>

                  <div>
                    <label className="block text-[14px] text-gray-700 mb-2">Payment Mode</label>
                    <select
                      value={refundData.paymentMode}
                      onChange={(e) => setRefundData((prev) => ({ ...prev, paymentMode: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372] bg-white"
                    >
                      {refundPaymentModeOptions.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[14px] text-gray-700 mb-2">Reference#</label>
                    <input
                      type="text"
                      value={refundData.referenceNumber}
                      onChange={(e) => setRefundData((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372]"
                    />
                  </div>

                  <div>
                    <label className="block text-[14px] text-gray-700 mb-2">
                      From Account<span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={refundData.fromAccountId || refundData.fromAccount}
                      onChange={(e) => {
                        const selected = bankAccounts.find((account: any) => {
                          const accountId = getAccountId(account);
                          const accountName = getAccountDisplayName(account);
                          return accountId === e.target.value || accountName === e.target.value;
                        });
                        setRefundData((prev) => ({
                          ...prev,
                          fromAccount: selected ? getAccountDisplayName(selected) : e.target.value,
                          fromAccountId: selected ? getAccountId(selected) : ""
                        }));
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372] bg-white"
                    >
                      <option value="">Select account</option>
                      {bankAccounts.map((account: any, index: number) => {
                        const accountId = getAccountId(account) || `account-${index}`;
                        const accountName = getAccountDisplayName(account) || `Account ${index + 1}`;
                        return (
                          <option key={accountId} value={accountId}>
                            {accountName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="md:col-span-2 max-w-[420px]">
                    <label className="block text-[14px] text-gray-700 mb-2">Description</label>
                    <textarea
                      rows={3}
                      value={refundData.description}
                      onChange={(e) => setRefundData((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-[14px] text-gray-800 outline-none focus:border-[#156372] resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 text-[13px] text-gray-500">
                  Note: Once you save this refund, the payment received will be dissociated from the related invoice(s), changing the invoice status to Unpaid.
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSavingRefund}
                  onClick={handleRefundSave}
                  className="px-5 py-2 bg-[#3b82f6] text-white rounded-md text-[14px] font-medium hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingRefund ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  disabled={isSavingRefund}
                  onClick={handleCloseRefundModal}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-md text-[14px] font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isDeleteInvoiceModalOpen && (
          <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16" onClick={() => setIsDeleteInvoiceModalOpen(false)}>
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                  !
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                  Delete invoice?
                </h3>
                <button
                  type="button"
                  className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setIsDeleteInvoiceModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="px-5 py-3 text-[13px] text-slate-600">
                You cannot retrieve this invoice once it has been deleted.
              </div>
              <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-md bg-red-600 text-white text-[12px] hover:bg-red-700"
                  onClick={handleConfirmDeleteInvoice}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsDeleteInvoiceModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
                      {ownerEmail?.name || organizationProfile?.name || "Team"} &lt;{ownerEmail?.email || organizationProfile?.email || ""}&gt;
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

        {isApplyAdjustmentsModalOpen && invoice && (
          <div className="fixed inset-0 z-[130] bg-black/40 flex items-start justify-center pt-8 px-4">
            <div className="w-full max-w-[900px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-[16px] font-semibold text-gray-900">
                  Apply credits to {String((invoice as any)?.invoiceNumber || "")}
                </h3>
                <button
                  className="text-red-500 hover:text-red-600"
                  onClick={() => {
                    if (isApplyingAdjustments) return;
                    setIsApplyAdjustmentsModalOpen(false);
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[15px] font-medium text-gray-800">Credits to Apply</h4>
                  <div className="flex items-center gap-3 text-[13px] text-gray-700">
                    <span>Set Applied on Date</span>
                    <button
                      type="button"
                      onClick={() => setUseApplyDate((prev) => !prev)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${useApplyDate ? "bg-[#1f6f84]" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${useApplyDate ? "left-5" : "left-0.5"}`} />
                    </button>
                    {useApplyDate && (
                      <input
                        type="date"
                        value={applyOnDate}
                        onChange={(e) => setApplyOnDate(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-[14px]"
                      />
                    )}
                    <span>
                      Invoice Balance:{" "}
                      <span className="font-semibold">
                        {formatCurrency(getCurrentDocumentBalance(), invoice.currency)}
                        {` (${formatDate((invoice as any)?.invoiceDate || new Date().toISOString())})`}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#f6f7fb]">
                      <tr className="text-[12px] uppercase text-[#6b7280]">
                        <th className="px-3 py-2 font-medium">Transaction#</th>
                        <th className="px-3 py-2 font-medium">Transaction Date</th>
                        <th className="px-3 py-2 font-medium">Location</th>
                        <th className="px-3 py-2 font-medium text-right">Credit Amount</th>
                        <th className="px-3 py-2 font-medium text-right">Credits Available</th>
                        <th className="px-3 py-2 font-medium">Credits Applied Date</th>
                        <th className="px-3 py-2 font-medium text-right">Early Payment Discount</th>
                        <th className="px-3 py-2 font-medium text-right">Credits to Apply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applyAdjustmentRows.map((row: any, index: number) => (
                        <tr key={row.rowKey || index} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-[12px] text-gray-800">{row.transactionNumber}</td>
                          <td className="px-3 py-2 text-[12px] text-gray-800">{formatDate(row.date)}</td>
                          <td className="px-3 py-2 text-[12px] text-gray-800">{row.location || "Head Office"}</td>
                          <td className="px-3 py-2 text-[12px] text-right text-gray-900">{formatCurrency(row.creditAmount, invoice.currency)}</td>
                          <td className="px-3 py-2 text-[12px] text-right text-gray-900">{formatCurrency(row.availableAmount, invoice.currency)}</td>
                          <td className="px-3 py-2 text-[12px] text-gray-800">{formatDate(useApplyDate ? applyOnDate : new Date().toISOString())}</td>
                          <td className="px-3 py-2 text-[12px] text-right text-gray-900">{formatCurrency(0, invoice.currency)}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={applyAdjustmentValues[row.rowKey] ?? 0}
                              onChange={(e) => handleAdjustmentValueChange(row.rowKey, e.target.value, Number(row.availableAmount || 0))}
                              placeholder="Enter amount"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-right text-[12px]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="w-[290px] bg-[#f8fafc] border border-gray-200 rounded p-3 text-[13px] space-y-2">
                    <div className="flex justify-between"><span>Amount to Credit:</span><span className="font-semibold">{formatCurrency(Object.values(applyAdjustmentValues).reduce((s, v) => s + toNumSafe(v, 0), 0), invoice.currency)}</span></div>
                    <div className="flex justify-between"><span>Total Discount:</span><span>{formatCurrency(0, invoice.currency)}</span></div>
                    <div className="flex justify-between"><span>Invoice Balance Due:</span><span className="font-semibold">{formatCurrency(Math.max(0, getCurrentDocumentBalance() - Object.values(applyAdjustmentValues).reduce((s, v) => s + toNumSafe(v, 0)),), invoice.currency)}</span></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  disabled={isApplyingAdjustments}
                  onClick={() => void handleApplyAdjustments()}
                  className="px-4 py-2 rounded text-white text-[14px] font-medium bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60"
                >
                  {isApplyingAdjustments ? "Applying..." : "Apply Credits"}
                </button>
                <button
                  type="button"
                  disabled={isApplyingAdjustments}
                  onClick={() => setIsApplyAdjustmentsModalOpen(false)}
                  className="px-4 py-2 rounded border border-gray-300 text-[14px] text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isApplyRetainerOpen && invoice && (
          <div className="absolute inset-0 z-30 bg-white flex flex-col">
            <div className="px-5 py-3 border-b border-gray-200">
              <button
                type="button"
                className="text-[#2563eb] text-sm mb-1"
                onClick={() => setIsApplyRetainerOpen(false)}
              >
                &#8592;
              </button>
              <div className="text-[36px] leading-none font-semibold text-[#111827] mb-1">
                Apply Retainers ({String((invoice as any)?.invoiceNumber || "")})
              </div>
              <div className="text-[26px] text-[#475569]">
                Retainer Available: {formatAmountWithCurrency(customerRetainerAvailable)}
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#64748b] text-[14px]">
                    <th className="text-left px-4 py-3">DATE</th>
                    <th className="text-left px-4 py-3">PAYMENT#</th>
                    <th className="text-left px-4 py-3">LOCATION</th>
                    <th className="text-left px-4 py-3">AVAILABLE RETAINER</th>
                    <th className="text-left px-4 py-3">RETAINERS APPLIED</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRetainerInvoices.map((row: any) => {
                    const rowId = String(row?.id || row?._id || "");
                    const available = getRetainerAvailableAmount(row);
                    const applied = toNumSafe(retainerApplyValues[rowId], 0);
                    return (
                      <tr key={rowId} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-[36px] text-[#111827]">
                          {formatDate(row?.date || row?.invoiceDate || row?.createdAt || "")}
                        </td>
                        <td className="px-4 py-3 text-[36px] text-[#111827]">
                          {String(row?.invoiceNumber || "-")}
                        </td>
                        <td className="px-4 py-3 text-[36px] text-[#111827]">
                          {String(row?.location || row?.selectedLocation || "Head Office")}
                        </td>
                        <td className="px-4 py-3 text-[36px] text-[#111827] font-medium">
                          {formatAmountWithCurrency(available)}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={available}
                            step="0.01"
                            value={applied || ""}
                            onChange={(e) => {
                              const next = Math.max(0, toNumSafe(e.target.value, 0));
                              const clamped = Math.min(next, available);
                              setRetainerApplyValues((prev) => ({ ...prev, [rowId]: clamped }));
                            }}
                            className="w-[220px] h-[44px] border border-[#93c5fd] rounded px-3 text-[32px] text-[#0f172a] outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[20px] text-[#64748b]">
                  Note: If there is any tax applied to the retainer invoice, the tax will be reversed.
                </div>
                <div className="text-right">
                  <div className="text-[36px] text-[#111827]">
                    {formatAmountWithCurrency(getCurrentDocumentBalance())} - {formatAmountWithCurrency(getTotalRetainerApplied())} = {formatAmountWithCurrency(Math.max(0, getCurrentDocumentBalance() - getTotalRetainerApplied()))}
                  </div>
                  <div className="text-[20px] text-[#64748b]">
                    Invoice Amount - Total Retainers Applied = Invoice Balance
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isApplyingRetainer}
                  onClick={handleApplyRetainersSubmit}
                  className="px-5 py-2 rounded text-white text-[22px] font-medium disabled:opacity-60"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                >
                  {isApplyingRetainer ? "Applying..." : "Apply Retainers"}
                </button>
                <button
                  type="button"
                  disabled={isApplyingRetainer}
                  onClick={() => setIsApplyRetainerOpen(false)}
                  className="px-5 py-2 rounded border border-gray-300 text-[22px] text-[#334155] bg-white disabled:opacity-60"
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
                              {(Number(attachment.size || 0) / 1024).toFixed(2)} KB
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
                    const files = Array.from(e.target.files || []) as File[];
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

        <InvoiceCommentsPanel
          open={showCommentsSidebar}
          onClose={() => setShowCommentsSidebar(false)}
          invoiceId={String(invoice?.id || id || "")}
          comments={comments}
          onCommentsChange={(nextComments) => setComments(nextComments)}
          updateInvoice={updateInvoice}
        />

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
          <FieldCustomization onClose={() => setIsFieldCustomizationOpen(false)} />
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


const sanitizeProfileForCache = (profile: any) => {
  if (!profile || typeof profile !== "object") return {};
  const rawLogo = String(profile.logo || profile.logoUrl || "").trim();
  const nextLogo = rawLogo.startsWith("data:") ? "" : rawLogo;
  return {
    ...profile,
    logo: nextLogo,
    logoUrl: nextLogo,
  };
};
