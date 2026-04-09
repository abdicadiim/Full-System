import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { senderEmailsAPI } from "../../../services/api";
import { resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getInvoiceById, getInvoices, updateInvoice, getPayments, getTaxes, getCreditNotesByInvoiceId, deletePayment, Tax, Invoice, AttachedFile, saveInvoice } from "../../salesModel";
import { currenciesAPI, invoicesAPI, creditNotesAPI, paymentsReceivedAPI, bankAccountsAPI, refundsAPI } from "../../../services/api";
import FieldCustomization from "../../shared/FieldCustomization";
import InvoiceCommentsPanel from "./InvoiceCommentsPanel";
const InvoiceCommunicationModals = lazy(() => import("./modals/InvoiceCommunicationModals"));
const InvoicePaymentModals = lazy(() => import("./modals/InvoicePaymentModals"));
const InvoiceSupportModals = lazy(() => import("./modals/InvoiceSupportModals"));
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  X, Edit, Send, Share2, FileText, Clock, MoreVertical, MoreHorizontal,
  ChevronDown, ChevronUp, ChevronRight, Sparkles, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, Download, Mail, Calendar, AlertTriangle,
  Paperclip, MessageSquare, Link2, RotateCw, Repeat, Minus, Copy, BookOpen, Trash2, Settings,
  HelpCircle, FileUp, Bold, Italic, Underline, Check, Upload, Pencil, Banknote, ExternalLink, Loader2,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, Image as ImageIcon
} from "lucide-react";
import { getStatesByCountry } from "../../../constants/locationData";



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
  const [isCloningInvoice, setIsCloningInvoice] = useState(false);
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
  const [paymentInfoTab, setPaymentInfoTab] = useState<"payments" | "credits">("payments");
  const [isApplyAdjustmentsModalOpen, setIsApplyAdjustmentsModalOpen] = useState(false);
  const [isApplyingAdjustments, setIsApplyingAdjustments] = useState(false);
  const [isRemovingAppliedCreditId, setIsRemovingAppliedCreditId] = useState<string | null>(null);
  const [applyAdjustmentRows, setApplyAdjustmentRows] = useState<any[]>([]);
  const [applyAdjustmentValues, setApplyAdjustmentValues] = useState<Record<string, number>>({});
  const [applyOnDate, setApplyOnDate] = useState(new Date().toISOString().split("T")[0]);
  const [useApplyDate, setUseApplyDate] = useState(true);
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [showAttachmentsPopover, setShowAttachmentsPopover] = useState(false);
  const [attachmentMenuIndex, setAttachmentMenuIndex] = useState<number | null>(null);
  const [attachmentDeleteConfirmIndex, setAttachmentDeleteConfirmIndex] = useState<number | null>(null);
  const [invoiceAttachments, setInvoiceAttachments] = useState<AttachedFile[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
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
  const [customerRetainerAvailable, setCustomerRetainerAvailable] = useState<number>(0);
  const [customerCreditsAvailable, setCustomerCreditsAvailable] = useState<number>(0);
  const [associatedInvoiceRow, setAssociatedInvoiceRow] = useState<any>(null);
  const [termsData, setTermsData] = useState({
    notes: "Thanks for your business.",
    termsAndConditions: "",
    useNotesForAllInvoices: false,
    useTermsForAllInvoices: false
  });
  const customizeDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const remindersDropdownRef = useRef(null);
  const allInvoicesDropdownRef = useRef(null);
  const sidebarMoreRef = useRef(null);
  const sendDropdownRef = useRef(null);
  const pdfDropdownRef = useRef(null);
  const attachmentsFileInputRef = useRef<HTMLInputElement>(null);
  const organizationAddressFileInputRef = useRef<HTMLInputElement>(null);

  // Organization profile data
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const stateOptions = getStatesByCountry(organizationProfile?.address?.country || "");
  // Owner email data
  // Owner email data
  const [ownerEmail, setOwnerEmail] = useState<any>(null);

  const isRetainerInvoiceRecord = (row: any) => {
    const rawType = String(
      row?.invoiceType ||
      row?.type ||
      row?.documentType ||
      row?.module ||
      row?.source ||
      ""
    ).toLowerCase();
    const rawNumber = String(row?.invoiceNumber || row?.number || "").toUpperCase();
    return Boolean(
      row?.isRetainerInvoice ||
      row?.isRetainer ||
      row?.is_retainer ||
      row?.retainer ||
      rawType.includes("retainer") ||
      /^RET[-\d]/.test(rawNumber)
    );
  };

  const stripRetainerInvoices = (records: any[] = []) =>
    (Array.isArray(records) ? records : []).filter((row) => !isRetainerInvoiceRecord(row));

  const getCustomerKey = (row: any) =>
    String(row?.customer?._id || row?.customer?.id || row?.customerId || "").trim();

  const getCustomerName = (row: any) =>
    String(
      row?.customerName ||
      (typeof row?.customer === "string" ? row?.customer : row?.customer?.displayName || row?.customer?.companyName || row?.customer?.name) ||
      ""
    ).trim();

  const getSidebarStatusDisplay = (inv: any) => {
    const raw = String(inv?.status || "").toLowerCase().trim();
    const total = Number(inv?.total ?? inv?.amount ?? 0) || 0;
    const paid = Number(inv?.amountPaid ?? inv?.paidAmount ?? 0) || 0;
    const computedBalance = inv?.balance !== undefined
      ? Number(inv.balance)
      : inv?.balanceDue !== undefined
        ? Number(inv.balanceDue)
        : Math.max(0, total - paid);
    const balance = Number.isFinite(computedBalance) ? Math.max(0, computedBalance) : 0;
    const dueDate = inv?.dueDate ? new Date(inv.dueDate) : null;
    const isOverdueByDate = !!(dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now() && balance > 0);

    if (raw === "paid" || (total > 0 && balance <= 0)) {
      return { text: "Paid", color: "bg-[#0D4A52]/10 text-[#0D4A52]" };
    }
    if (raw.includes("partial") || (total > 0 && balance > 0 && balance < total)) {
      return { text: "Partially Paid", color: "bg-blue-100 text-blue-700" };
    }
    if (raw === "draft") {
      return { text: "Draft", color: "bg-gray-100 text-gray-600" };
    }
    if (raw === "void") {
      return { text: "Void", color: "bg-gray-200 text-gray-600" };
    }
    if (isOverdueByDate || raw === "overdue") {
      return { text: "Overdue", color: "bg-red-100 text-red-600" };
    }
    return { text: "Unpaid", color: "bg-blue-100 text-blue-700" };
  };

  const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
  const getAccountId = (account: any): string => String(account?._id || account?.id || "").trim();
  const getAccountDisplayName = (account: any): string =>
    String(account?.displayName || account?.accountName || account?.name || "").trim();
  const refundPaymentModeOptions = ["Cash", "Check", "Credit Card", "Debit Card", "Bank Transfer", "PayPal", "Other"];
  const toStatusKey = (value: any) =>
    String(value || "")
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .trim();

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

  const isPaymentLinkedToInvoice = (paymentRow: any, currentInvoice: any, routeInvoiceId: any) => {
    const targetIds = new Set(
      [routeInvoiceId, currentInvoice?.id, currentInvoice?._id]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    );
    const targetNumber = String(currentInvoice?.invoiceNumber || "").trim().toLowerCase();

    const directInvoiceId = String(paymentRow?.invoiceId || "").trim();
    const directInvoiceNumber = String(paymentRow?.invoiceNumber || "").trim().toLowerCase();
    if ((directInvoiceId && targetIds.has(directInvoiceId)) || (targetNumber && directInvoiceNumber === targetNumber)) {
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
          (targetNumber && allocationInvoiceNumber === targetNumber)
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

      const totalAmount = roundMoney(toNumber((current as any).total ?? (current as any).amount ?? 0));
      const currentPaid = roundMoney(toNumber((current as any).amountPaid ?? (current as any).paidAmount ?? 0));
      const nextPaid = Math.max(0, roundMoney(currentPaid + delta));
      const nextBalance = Math.max(0, roundMoney(totalAmount - nextPaid));

      const currentStatusKey = toStatusKey((current as any).status || "sent");
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
      const primarySenderRes = await senderEmailsAPI.getPrimary();
      const fallbackName = String(organizationProfile?.name || "Team").trim() || "Team";
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
      const paymentsPromise = getPayments();
      const invoicesPromise = getInvoices();
      const taxesPromise = getTaxes();
      const creditNotesPromise = id ? getCreditNotesByInvoiceId(id) : Promise.resolve([]);
      const bankAccountsPromise = bankAccountsAPI.getAll().catch(() => []);

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

      // Get payments for this invoice
      const allPayments = await paymentsPromise;
      // Filter payments that are directly associated or have allocations for this invoice
      const invoicePayments = Array.isArray(allPayments)
        ? allPayments.filter((p: any) => isPaymentLinkedToInvoice(p, currentInvoice, id))
        : [];
      setPayments(invoicePayments);

      const allInvoices = await invoicesPromise;
      setInvoices(stripRetainerInvoices(allInvoices as any[]));

      if (isDebitNoteView && currentInvoice) {
        const linkedId = String((currentInvoice as any)?.associatedInvoiceId || (currentInvoice as any)?.invoiceId || "").trim();
        const linkedNumber = String((currentInvoice as any)?.associatedInvoiceNumber || "").trim();
        const linked = (Array.isArray(allInvoices) ? allInvoices : []).find((row: any) => {
          const rowId = String(row?.id || row?._id || "").trim();
          const rowNumber = String(row?.invoiceNumber || "").trim();
          return (linkedId && rowId === linkedId) || (!!linkedNumber && rowNumber === linkedNumber);
        });
        setAssociatedInvoiceRow(linked || null);
      } else {
        setAssociatedInvoiceRow(null);
      }

      if (currentInvoice) {
        const currentCustomerId = getCustomerKey(currentInvoice);
        const currentCustomerName = getCustomerName(currentInvoice).toLowerCase();
        const normalize = (v: any) => String(v || "").toLowerCase().replace(/[\s-]+/g, "_");

        const matchingRetainers = (Array.isArray(allInvoices) ? allInvoices : []).filter((row: any) => {
          if (!isRetainerInvoiceRecord(row)) return false;
          const rowCustomerId = getCustomerKey(row);
          const rowCustomerName = getCustomerName(row).toLowerCase();
          const sameCustomer =
            (currentCustomerId && rowCustomerId && currentCustomerId === rowCustomerId) ||
            (!!currentCustomerName && rowCustomerName === currentCustomerName);
          if (!sameCustomer) return false;
          const status = normalize(row?.status);
          const draw = normalize(row?.retainerDrawStatus || row?.drawStatus);
          return status === "paid" || draw === "ready_to_draw" || draw === "partially_drawn";
        });

        const totalRetainer = matchingRetainers.reduce((sum: number, row: any) => {
          const explicit = toNumber(row?.retainerAvailableAmount ?? row?.availableAmount ?? row?.unusedAmount ?? row?.unusedBalance);
          if (explicit > 0) return sum + explicit;
          const fallback = toNumber(row?.balance ?? row?.balanceDue ?? row?.amountPaid ?? row?.paidAmount ?? row?.total ?? row?.amount);
          return sum + Math.max(0, fallback);
        }, 0);
        setCustomerRetainerAvailable(Math.max(0, totalRetainer));

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
          const status = normalize(row?.status);
          if (status === "void" || status === "closed") return sum;
          const available = toNumber(row?.balance ?? row?.unusedAmount ?? row?.availableAmount);
          return sum + (available > 0 ? available : 0);
        }, 0);
        setCustomerCreditsAvailable(Math.max(0, totalCredits));
      } else {
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

      const creditNotes = await creditNotesPromise;
      const creditRowsComputed = (Array.isArray(creditNotes) ? creditNotes : []).map((note: any) => {
        const targetInvoiceId = String(id || currentInvoice?.id || currentInvoice?._id || "");
        const allocationApplied = Array.isArray(note?.allocations)
          ? note.allocations.reduce((sum: number, allocation: any) => {
              const allocationInvoiceId = String(
                allocation?.invoiceId ||
                  allocation?.invoice?._id ||
                  allocation?.invoice?.id ||
                  allocation?.invoice ||
                  ""
              );
              const amount = toNumber(allocation?.amount);
              return allocationInvoiceId === targetInvoiceId ? sum + amount : sum;
            }, 0)
          : 0;
        const explicitApplied = toNumber(note?.appliedAmount ?? note?.amountApplied);
        const total = toNumber(note?.total ?? note?.amount);
        const balance = toNumber(note?.balance ?? note?.unusedAmount ?? note?.availableAmount);
        const inferredApplied = total > 0 ? Math.max(0, total - Math.max(0, balance)) : 0;
        const appliedAmount = allocationApplied > 0 ? allocationApplied : explicitApplied > 0 ? explicitApplied : inferredApplied;
        return {
          id: String(note?.id || note?._id || ""),
          date: note?.date || note?.creditNoteDate || note?.createdAt || "",
          transactionNumber: String(note?.creditNoteNumber || note?.creditNumber || note?.number || "-"),
          appliedAmount: toNumber(appliedAmount),
        };
      }).filter((row: any) => row.appliedAmount > 0);

      const invoiceLevelCreditsApplied = toNumber((currentInvoice as any)?.creditsApplied);
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

  useEffect(() => {
    setIsPaymentsSectionOpen(false);
    setOpenPaymentMenuId(null);
    setCreditsAppliedCount(0);
    setCreditsAppliedRows([]);
    setPaymentInfoTab("payments");
    setAssociatedInvoiceRow(null);
  }, [id]);

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
  }, [isMoreMenuOpen, isAllInvoicesDropdownOpen, isSendDropdownOpen, isRemindersDropdownOpen, isPdfDropdownOpen, isCustomizeDropdownOpen]);

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
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const normalized = raw.replace(/,/g, "").replace(/[^0-9.\-]/g, "");
    const parsed = parseFloat(normalized);
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
    const digitsLength = String(currentInvoiceNumber || "").match(/(\d+)$/)?.[1]?.length || 6;

    const nextSuffix = (Array.isArray(rows) ? rows : [])
      .map((row: any) => String(row?.invoiceNumber || row?.number || "").trim())
      .filter((number) => number.startsWith(normalizedPrefix))
      .map((number) => {
        const suffix = number.slice(normalizedPrefix.length);
        return Number.parseInt(suffix, 10);
      })
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0) + 1;

    return `${normalizedPrefix}${String(nextSuffix).padStart(digitsLength, "0")}`;
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
    const invoiceDate = sourceInvoice?.invoiceDate || sourceInvoice?.date || new Date().toISOString();
    const dueDate = sourceInvoice?.dueDate || sourceInvoice?.expectedPaymentDate || invoiceDate;

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
      date: invoiceDate,
      invoiceDate,
      dueDate,
      expectedPaymentDate: dueDate,
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
          toast("Invoice updated successfully.");
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
    navigate(`/sales/invoices/${id}/email`, {
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

  const handleLogoUpload = (file: File) => {
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
      if (typeof logoDataUrl !== "string") return;
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
    setShowShareModal(true);
  };

  // Generate HTML content for invoice (shared for print and download)
  const generateInvoiceHTML = () => {
    if (!invoice) return '';

    const itemsHTML = invoice.items && invoice.items.length > 0 ? invoice.items.map((item, index) => {
      const rate = parseFloat(item.rate || item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const amount = parseFloat(item.amount || (item.quantity || 0) * (item.rate || item.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const qty = parseFloat(item.quantity || 0).toFixed(2);
      const unit = item.unit || 'pcs';
      const itemName = item.itemDetails || item.name || item.description || 'N/A';
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

  const handleOpenApplyCredits = async (sourceFilter: "all" | "credit" | "retainer" = "all") => {
    if (!invoice) return;
    const customerId = getCustomerKey(invoice);
    const customerName = getCustomerName(invoice).toLowerCase();
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
          if (!isRetainerInvoiceRecord(row)) return false;
          const rowCustomerId = getCustomerKey(row);
          const rowCustomerName = getCustomerName(row).toLowerCase();
          const sameCustomer =
            (customerId && rowCustomerId && customerId === rowCustomerId) ||
            (!!customerName && rowCustomerName === customerName);
          if (!sameCustomer) return false;
          const rowId = String(row?.id || row?._id || "").trim();
          if (rowId && invoice && rowId === String((invoice as any)?.id || (invoice as any)?._id || "")) return false;
          const availableExplicit = toNumber(row?.retainerAvailableAmount ?? row?.availableAmount ?? row?.unusedAmount ?? row?.unusedBalance);
          const availableFallback = Math.max(
            0,
            toNumber(row?.balance ?? row?.balanceDue ?? row?.amountPaid ?? row?.paidAmount ?? row?.total ?? row?.amount)
          );
          const available = roundMoney(availableExplicit > 0 ? availableExplicit : availableFallback);
          // Show retainers in the modal whenever they still have available balance.
          return available > 0;
        });
      } catch {
        return [];
      }
    })();

    const [creditRowsRaw, retainerRowsRaw] = await Promise.all([creditsPromise, retainersPromise]);

    const creditRows = (Array.isArray(creditRowsRaw) ? creditRowsRaw : [])
      .map((row: any) => {
        const available = roundMoney(Math.max(0, toNumber(row?.balance ?? row?.unusedAmount ?? row?.availableAmount)));
        return {
          rowKey: `credit:${String(row?.id || row?._id || "")}`,
          sourceType: "credit" as const,
          id: String(row?.id || row?._id || ""),
          transactionNumber: String(row?.creditNoteNumber || row?.number || "Credit"),
          date: row?.creditNoteDate || row?.date || row?.createdAt || "",
          location: String(row?.locationName || row?.location || "Head Office"),
          creditAmount: roundMoney(toNumber(row?.total ?? row?.amount)),
          availableAmount: available,
          raw: row,
        };
      })
      .filter((row: any) => row.id && row.availableAmount > 0);

    const retainerRows = (Array.isArray(retainerRowsRaw) ? retainerRowsRaw : [])
      .map((row: any) => {
        const availableExplicit = toNumber(row?.retainerAvailableAmount ?? row?.availableAmount ?? row?.unusedAmount ?? row?.unusedBalance);
        const fallback = Math.max(
          0,
          toNumber(row?.balance ?? row?.balanceDue ?? row?.amountPaid ?? row?.paidAmount ?? row?.total ?? row?.amount)
        );
        const available = roundMoney(availableExplicit > 0 ? availableExplicit : fallback);
        return {
          rowKey: `retainer:${String(row?.id || row?._id || "")}`,
          sourceType: "retainer" as const,
          id: String(row?.id || row?._id || ""),
          transactionNumber: String(row?.invoiceNumber || row?.retainerNumber || "Retainer"),
          date: row?.invoiceDate || row?.date || row?.createdAt || "",
          location: String(row?.locationName || row?.location || "Head Office"),
          creditAmount: roundMoney(toNumber(row?.total ?? row?.amount)),
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

  const handleAdjustmentValueChange = (rowKey: string, rawValue: string, maxValue: number) => {
    const numeric = Math.max(0, Math.min(maxValue, toNumber(rawValue)));
    setApplyAdjustmentValues((prev) => ({ ...prev, [rowKey]: numeric }));
  };

  const handleApplyAdjustments = async () => {
    if (!invoice || isApplyingAdjustments) return;
    const invoiceId = String(invoice.id || invoice._id || id || "").trim();
    if (!invoiceId) {
      toast.error("Invoice id not found.");
      return;
    }

    const rowsToApply = applyAdjustmentRows
      .map((row: any) => ({ ...row, applied: roundMoney(toNumber(applyAdjustmentValues[row.rowKey])) }))
      .filter((row: any) => row.applied > 0);

    if (!rowsToApply.length) {
      toast.error("Enter amount to apply.");
      return;
    }

    const currentTotal = roundMoney(toNumber((invoice as any)?.total ?? (invoice as any)?.amount));
    const currentPaid = roundMoney(toNumber((invoice as any)?.paidAmount ?? (invoice as any)?.amountPaid));
    const currentCredits = roundMoney(toNumber((invoice as any)?.creditsApplied));
    const currentRetainers = roundMoney(
      toNumber((invoice as any)?.retainerAppliedAmount ?? (invoice as any)?.retainersApplied ?? (invoice as any)?.retainerAmountApplied ?? (invoice as any)?.retainerAppliedTotal)
    );
    const currentBalance = roundMoney(
      Math.max(
        0,
        toNumber((invoice as any)?.balance ?? (invoice as any)?.balanceDue ?? (currentTotal - currentPaid - currentCredits - currentRetainers))
      )
    );

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
          const nextBalance = roundMoney(Math.max(0, toNumber(row.availableAmount) - toNumber(row.applied)));
          const existingAllocations = Array.isArray(row.raw?.allocations) ? [...row.raw.allocations] : [];
          await creditNotesAPI.update(String(row.id), {
            balance: nextBalance,
            creditsUsed: roundMoney(toNumber(row.raw?.creditsUsed) + toNumber(row.applied)),
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
          creditTotal += toNumber(row.applied);
        } else {
          const nextAvailable = roundMoney(Math.max(0, toNumber(row.availableAmount) - toNumber(row.applied)));
          await updateInvoice(String(row.id), {
            retainerAvailableAmount: nextAvailable,
            retainerDrawStatus: nextAvailable <= 0 ? "drawn" : "partially_drawn",
          } as any);
          retainerTotal += toNumber(row.applied);
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
      const nextBalance = roundMoney(Math.max(0, currentTotal - currentPaid - nextCreditsApplied - nextRetainerApplied));
      const currentStatusKey = toStatusKey((invoice as any)?.status || "sent");
      const nextStatus =
        currentStatusKey === "void"
          ? (invoice as any)?.status
          : nextBalance <= 0
            ? "paid"
            : currentPaid > 0 || nextCreditsApplied > 0 || nextRetainerApplied > 0
              ? "partially_paid"
              : (currentStatusKey === "draft" ? "draft" : "sent");

      const existingRetainerApps = Array.isArray((invoice as any)?.retainerApplications)
        ? [...(invoice as any).retainerApplications]
        : [];

      const patchedInvoice = await updateInvoice(invoiceId, {
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
      } as any);

      if (patchedInvoice) {
        setInvoice(patchedInvoice as any);
        setInvoices((prev) => prev.map((row) => (String((row as any).id || (row as any)._id) === invoiceId ? (patchedInvoice as any) : row)));
      }

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
    const invoiceId = String(invoice.id || invoice._id || id || "").trim();
    if (!invoiceId) return;
    const creditNoteId = String(creditRow.id || "").trim();
    const amountToReverse = roundMoney(Math.max(0, toNumber(creditRow.appliedAmount)));
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
        const allocationInvoiceId = String(
          allocation?.invoiceId ||
            allocation?.invoice?._id ||
            allocation?.invoice?.id ||
            allocation?.invoice ||
            ""
        ).trim();
        const allocationAmount = roundMoney(toNumber(allocation?.amount));
        if (allocationInvoiceId !== invoiceId || allocationAmount <= 0 || remainingToRemove <= 0) {
          nextAllocations.push(allocation);
          return;
        }

        const removedNow = Math.min(allocationAmount, remainingToRemove);
        const leftover = roundMoney(allocationAmount - removedNow);
        remainingToRemove = roundMoney(remainingToRemove - removedNow);
        if (leftover > 0) {
          nextAllocations.push({ ...allocation, amount: leftover });
        }
      });

      const currentCreditBalance = roundMoney(toNumber(note?.balance ?? note?.unusedAmount ?? note?.availableAmount));
      const nextCreditBalance = roundMoney(currentCreditBalance + amountToReverse);
      const nextCreditsUsed = Math.max(0, roundMoney(toNumber(note?.creditsUsed) - amountToReverse));

      await creditNotesAPI.update(creditNoteId, {
        balance: nextCreditBalance,
        creditsUsed: nextCreditsUsed,
        allocations: nextAllocations,
        status: "open",
        allocationUpdatedAt: new Date().toISOString(),
      });

      const total = roundMoney(toNumber((invoice as any)?.total ?? (invoice as any)?.amount));
      const paid = roundMoney(toNumber((invoice as any)?.paidAmount ?? (invoice as any)?.amountPaid));
      const currentCredits = roundMoney(toNumber((invoice as any)?.creditsApplied));
      const currentRetainers = roundMoney(
        toNumber((invoice as any)?.retainerAppliedAmount ?? (invoice as any)?.retainersApplied ?? (invoice as any)?.retainerAmountApplied ?? (invoice as any)?.retainerAppliedTotal)
      );
      const nextCreditsApplied = Math.max(0, roundMoney(currentCredits - amountToReverse));
      const nextBalance = roundMoney(Math.max(0, total - paid - nextCreditsApplied - currentRetainers));
      const statusKey = toStatusKey((invoice as any)?.status || "sent");
      const nextStatus =
        statusKey === "void"
          ? (invoice as any)?.status
          : nextBalance <= 0
            ? "paid"
            : paid > 0 || nextCreditsApplied > 0 || currentRetainers > 0
              ? "partially_paid"
              : (statusKey === "draft" ? "draft" : "sent");

      const updatedInvoice = await updateInvoice(invoiceId, {
        creditsApplied: nextCreditsApplied,
        balance: nextBalance,
        balanceDue: nextBalance,
        amountDue: nextBalance,
        status: nextStatus,
      } as any);

      if (updatedInvoice) {
        setInvoice(updatedInvoice as any);
        setInvoices((prev) =>
          prev.map((row) => (String((row as any).id || (row as any)._id) === invoiceId ? (updatedInvoice as any) : row))
        );
      }

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
      const statusKey = toStatusKey(selectedPaymentForDelete.status || "paid");
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

      const allPayments = await getPayments();
      const currentInvoice = id ? await getInvoiceById(id) : null;
      const invoicePayments = Array.isArray(allPayments)
        ? allPayments.filter((p: any) => isPaymentLinkedToInvoice(p, currentInvoice, id))
        : [];
      setPayments(invoicePayments);

      if (currentInvoice) {
        setInvoice(currentInvoice);
        setInvoices((prev) => prev.map((row) => (row.id === currentInvoice.id ? currentInvoice : row)));
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

    const targetInvoiceId = String(invoice.id || invoice._id || id || "").trim();
    if (!targetInvoiceId) {
      toast.error("Invoice id not found.");
      return;
    }

    try {
      setIsDeletingPayment(true);

      const statusKey = toStatusKey(selectedPaymentForDelete.status || "paid");
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
      const currentInvoiceNumbers = new Set([String(invoice.invoiceNumber || "").trim()].filter(Boolean));

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

      const customerId = String(
        invoice.customerId ||
          (invoice as any).customer?._id ||
          (invoice as any).customer?.id ||
          ""
      ).trim();
      const customerName =
        String(invoice.customerName || "").trim() ||
        String(
          typeof (invoice as any).customer === "string"
            ? (invoice as any).customer
            : (invoice as any).customer?.displayName || (invoice as any).customer?.name || ""
        ).trim();

      await creditNotesAPI.create({
        creditNoteNumber: nextCreditNoteNumber,
        customerId,
        customerName,
        invoiceId: targetInvoiceId,
        invoiceNumber: String(invoice.invoiceNumber || "").trim(),
        date: new Date().toISOString(),
        creditNoteDate: new Date().toISOString(),
        total: dissociatedAmount,
        amount: dissociatedAmount,
        balance: dissociatedAmount,
        status: "open",
        currency: selectedPaymentForDelete.currency || invoice.currency || "USD",
        source: "payment_dissociation",
        sourcePaymentId: paymentId,
        sourceInvoiceId: targetInvoiceId,
        sourceInvoiceNumber: String(invoice.invoiceNumber || "").trim(),
        notes: `Created from dissociated payment ${selectedPaymentForDelete.paymentNumber || paymentId}.`,
      });

      const allPayments = await getPayments();
      const currentInvoice = id ? await getInvoiceById(id) : null;
      const invoicePayments = Array.isArray(allPayments)
        ? allPayments.filter((p: any) => isPaymentLinkedToInvoice(p, currentInvoice, id))
        : [];
      setPayments(invoicePayments);

      if (currentInvoice) {
        setInvoice(currentInvoice);
        setInvoices((prev) => prev.map((row) => (row.id === currentInvoice.id ? currentInvoice : row)));
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

      const [allPayments, refreshedInvoice] = await Promise.all([
        getPayments(),
        id ? getInvoiceById(id) : Promise.resolve(null)
      ]);

      const invoicePayments = Array.isArray(allPayments)
        ? allPayments.filter((p: any) => isPaymentLinkedToInvoice(p, refreshedInvoice, id))
        : [];
      setPayments(invoicePayments);

      if (refreshedInvoice) {
        setInvoice(refreshedInvoice);
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
    navigate("/payments/payments-received/new", {
      state: {
        invoiceId: invoice?.id || invoice?._id,
        invoiceNumber: invoice?.invoiceNumber || invoice?.id,
        customerId: invoice?.customerId || invoice?.customer?._id || invoice?.customer?.id,
        customerName: invoice?.customerName || (typeof invoice?.customer === 'string' ? invoice?.customer : invoice?.customer?.displayName || invoice?.customer?.name),
        amount: invoice?.balance !== undefined ? invoice.balance : (invoice?.balanceDue ?? getInvoiceDisplayTotal(invoice)),
        currency: invoice?.currency || "SOS",
        invoice: invoice, // Pass the full object as well
        showOnlyInvoice: true,
        returnInvoiceId: invoice?.id || invoice?._id || ""
      }
    });
  };

  const getPaymentStatusLabel = (payment: any) => {
    const raw = String(payment?.status || "").toLowerCase().trim();
    if (raw === "draft") return "Draft";
    if (raw === "void") return "Void";
    if (raw === "paid" || raw === "completed" || raw === "success") return "Paid";
    return "Paid";
  };

  const getPaymentStatusClass = (payment: any) => {
    const status = getPaymentStatusLabel(payment).toLowerCase();
    if (status === "paid") return "text-[#0D4A52]";
    if (status === "draft") return "text-amber-600";
    if (status === "void") return "text-gray-500";
    return "text-gray-700";
  };

  const handleRecordPaymentConfirm = (skipWarning = false) => {
    if (skipWarning) {
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
    if (e.target.checked && invoice.items) {
      setSelectedItems(new Set(invoice.items.map((item, index) => item.id || index)));
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
      const updatedItems = invoice.items.filter((item, index) => !selectedIds.includes(item.id || index));
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
    if (isCloningInvoice) return;

    const customerId = toEntityId(invoice.customerId || invoice.customer);
    if (!customerId) {
      toast("Cannot clone this invoice because it has no customer.");
      return;
    }

    setIsCloningInvoice(true);
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

      if (!nextInvoiceNumber) {
        const freshInvoices = await getInvoices();
        nextInvoiceNumber = getNextInvoiceNumberFromExistingInvoices(freshInvoices as any[], prefix, invoice?.invoiceNumber);
      }

      if (!nextInvoiceNumber) {
        throw new Error("Unable to generate the next invoice number.");
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
          const freshInvoices = await getInvoices();
          retryInvoiceNumber = getNextInvoiceNumberFromExistingInvoices(
            [...(freshInvoices as any[]), clonePayload],
            prefix,
            nextInvoiceNumber
          );
        }

        clonedInvoice = await saveInvoice({ ...clonePayload, invoiceNumber: retryInvoiceNumber } as any);
      }

      let clonedInvoiceId = clonedInvoice?.id || clonedInvoice?._id || clonedInvoice?.invoice?.id || clonedInvoice?.invoice?._id;
      if (!clonedInvoiceId) {
        const freshInvoices = await getInvoices();
        const matchedInvoice = (freshInvoices as any[]).find((row: any) => {
          const rowNumber = String(row?.invoiceNumber || row?.number || "").trim();
          const rowCustomerId = toEntityId(row?.customerId || row?.customer);
          return rowNumber === nextInvoiceNumber && rowCustomerId === customerId;
        });
        clonedInvoiceId = matchedInvoice?.id || matchedInvoice?._id || "";
      }

      if (clonedInvoiceId) {
        toast.success(`Invoice cloned successfully as ${nextInvoiceNumber}.`);
        navigate(`/sales/invoices/${clonedInvoiceId}`);
        return;
      }

      toast.success(`Invoice cloned successfully as ${nextInvoiceNumber}, but it could not be opened automatically.`);
    } catch (error: any) {
      console.error("Error cloning invoice:", error);
      toast(error?.message || "Failed to clone invoice. Please try again.");
    } finally {
      setIsCloningInvoice(false);
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
    const fileList: File[] = Array.isArray(files) ? files : Array.from(files);
    const validFiles = fileList.filter((file: File) => {
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
    if (validFiles.length === 0) return;

    const processFiles = async () => {
      setIsUploadingAttachment(true);
      const newAttachments: AttachedFile[] = [];

      for (const file of validFiles) {
        const attachment: AttachedFile = {
          id: Date.now() + Math.random() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          preview: null
        };

        if (file.type.startsWith('image/')) {
          attachment.preview = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result;
              resolve(typeof result === "string" ? result : null);
            };
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
        updateInvoice(id, { attachedFiles: attachmentsToStore } as any)
          .then(() => toast.success("Attachment uploaded successfully."))
          .catch(err => {
            console.error("Error saving attachments to backend:", err);
            toast.error("Failed to save attachment.");
          });
      }
      return updated;
    });
    };

    processFiles()
      .catch((error) => {
        console.error("Error uploading invoice attachments:", error);
        toast.error("Failed to upload attachment.");
      })
      .finally(() => {
        setIsUploadingAttachment(false);
      });
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
        updateInvoice(id, { attachedFiles: attachmentsToStore } as any)
          .then(() => toast.success("Attachment removed successfully."))
          .catch(err => {
            console.error("Error saving attachments to backend:", err);
            toast.error("Failed to remove attachment.");
          });
      }
      return updated;
    });
  };

  const handleFileClick = (attachment: AttachedFile) => {
    if (attachment.type && attachment.type.startsWith("image/")) {
      setSelectedImage(
        attachment.preview || (attachment.file ? URL.createObjectURL(attachment.file) : null)
      );
      setShowImageViewer(true);
      return;
    }

    if (attachment.file) {
      const url = URL.createObjectURL(attachment.file);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const attachments = Array.isArray(invoiceAttachments) ? invoiceAttachments : [];

  const formatFileSize = (bytes: number | string) => {
    const size = Number(bytes) || 0;
    if (!size) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  };

  const isPdfAttachment = (fileName: string) => /\.pdf$/i.test(fileName || "");

  const handleDownloadAttachment = (file: any) => {
    const url = file?.url || (file?.file ? URL.createObjectURL(file.file) : "");
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = file?.name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (!file?.url && file?.file) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenAttachmentInNewTab = (file: any) => {
    const url = file?.url || (file?.file ? URL.createObjectURL(file.file) : "");
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    if (!file?.url && file?.file) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleRequestRemoveAttachment = (index: number) => {
    setAttachmentMenuIndex(index);
    setAttachmentDeleteConfirmIndex(index);
  };

  const handleCancelRemoveAttachment = () => {
    setAttachmentMenuIndex(null);
    setAttachmentDeleteConfirmIndex(null);
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
        updateInvoice(id, { comments: updated } as any)
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
    return null;
  }

  const invoiceTotalsMeta = getInvoiceTotalsMeta(invoice);
  const invoiceStatus = String(invoice?.status || "").toLowerCase().trim();
  const isPaidStatus = ["paid", "paid in full", "fully paid", "closed"].includes(invoiceStatus);
  const isVoidStatus = invoiceStatus === "void";
  const hasBalanceDue = (Number(invoiceTotalsMeta.balance) || 0) > 0.000001;
  const canRecordPayment = !isVoidStatus && !isPaidStatus && hasBalanceDue;
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
  const shouldShowPaymentsAndCreditsSection =
    payments.length > 0 ||
    creditsAppliedRows.length > 0 ||
    creditsAppliedCount > 0 ||
    creditAppliedAmount > 0 ||
    retainerAppliedAmount > 0;
  const shouldRenderPaymentModals =
    isApplyAdjustmentsModalOpen ||
    (showDeletePaymentModal && Boolean(selectedPaymentForDelete)) ||
    (isRefundModalOpen && Boolean(selectedPaymentForRefund)) ||
    isDeleteInvoiceModalOpen ||
    isRecordPaymentModalOpen;
  const shouldRenderCommunicationModals =
    isSendEmailModalOpen ||
    isScheduleEmailModalOpen ||
    (showShareModal && Boolean(invoice));
  const shouldRenderSupportModals =
    showAttachmentsModal ||
    isChooseTemplateModalOpen ||
    isOrganizationAddressModalOpen ||
    isTermsAndConditionsModalOpen;

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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <div className="text-[14px] text-gray-500">
                  Location: <span className="text-[#1d4ed8]">{(invoice as any)?.location || "Head Office"}</span>
                </div>
                <h1 className="text-[32px] leading-none font-semibold text-gray-900">{invoice.invoiceNumber || invoice.id}</h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowAttachmentsPopover((prev) => !prev);
                      setShowCommentsSidebar(false);
                    }}
                    className="h-8 min-w-8 rounded border border-gray-200 bg-white px-2 cursor-pointer flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-50"
                    aria-label="Attachments"
                    title="Attachments"
                  >
                    <Paperclip size={14} strokeWidth={2} />
                    <span className="text-[12px] font-medium leading-none">{attachments.length}</span>
                  </button>
                  {showAttachmentsPopover && (
                    <div className="absolute right-0 top-full mt-2 w-[286px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg z-[220]">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <h3 className="text-[15px] font-semibold text-slate-900">Attachments</h3>
                        <button
                          type="button"
                          onClick={() => setShowAttachmentsPopover(false)}
                          className="h-6 w-6 rounded text-red-500 flex items-center justify-center hover:bg-red-50"
                          aria-label="Close attachments"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="px-4 py-4">
                        {attachments.length === 0 ? (
                          <div className="py-3 text-center text-[14px] text-slate-700">No Files Attached</div>
                        ) : (
                          <div className="space-y-2">
                            {attachments.map((file, index) => (
                              <div key={file.id || `${file.name}-${index}`}>
                                <div
                                  className={`group relative cursor-pointer rounded-md px-3 py-2 pr-16 text-[13px] transition-colors ${
                                    attachmentMenuIndex === index
                                      ? "w-full bg-[#eef2ff] hover:bg-[#e5e7eb]"
                                      : "w-full bg-white hover:bg-slate-100"
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm ${isPdfAttachment(file.name) ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"}`}>
                                      <FileText size={12} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-[13px] text-slate-700">{file.name}</div>
                                      <div className="text-[12px] text-slate-500">File Size: {formatFileSize(file.size)}</div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRequestRemoveAttachment(index)}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-1 text-red-500 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                                    aria-label="Remove attachment"
                                    title="Remove"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAttachmentMenuIndex((current) => (current === index ? null : index))}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100"
                                    aria-label="Attachment actions"
                                    title="More"
                                  >
                                    <MoreVertical size={14} />
                                  </button>
                                  {attachmentMenuIndex === index && (
                                    <div className="mt-2 flex items-center gap-5 px-8 text-[12px] font-medium text-blue-600">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleDownloadAttachment(file);
                                          setAttachmentMenuIndex(null);
                                        }}
                                        className="hover:text-blue-700"
                                      >
                                        Download
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRequestRemoveAttachment(index)}
                                        className="hover:text-blue-700"
                                      >
                                        Remove
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAttachmentInNewTab(file)}
                                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                        aria-label="Open attachment"
                                        title="Open"
                                      >
                                        <ExternalLink size={13} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 text-center">
                          {isUploadingAttachment ? (
                            <div className="flex h-[58px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-400">
                              <Loader2 size={16} className="animate-spin text-blue-400" />
                              <span>Uploading...</span>
                            </div>
                          ) : (
                            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#156372] px-4 py-3 text-[14px] font-semibold text-white shadow-sm hover:opacity-95">
                              <Upload size={16} />
                              <span>Upload your Files</span>
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
                                  e.currentTarget.value = "";
                                }}
                              />
                            </label>
                          )}
                          <p className="mt-2 text-[11px] text-slate-500">You can upload a maximum of 5 files, 10MB each</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="p-1.5 text-gray-600 border border-gray-300 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer"
                  title="Comments"
                  onClick={() => {
                    setShowCommentsSidebar(true);
                    setShowAttachmentsPopover(false);
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
                onClick={() => {
                  const editId = String((invoice as any)?.id || (invoice as any)?._id || id || "").trim();
                  if (!editId) return;
                  navigate(`/sales/invoices/${editId}/edit`, { state: { invoice } });
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                <Edit size={13} />
                Edit
              </button>

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

              <button
                onClick={isDownloadingPdf ? undefined : handleDownloadPDF}
                disabled={isDownloadingPdf}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer disabled:opacity-60"
              >
                <FileText size={13} className={isDownloadingPdf ? "animate-pulse" : ""} />
                {isDownloadingPdf ? "Downloading..." : "PDF"}
              </button>

              {invoice && canRecordPayment && (
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
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
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

          <div className="flex-1 overflow-y-auto">
          {isDebitNoteView && (
            <div className="mx-6 mt-4 rounded border border-gray-200 bg-white">
              <div className="px-5 py-4 space-y-3 text-[14px] text-gray-900">
                {customerRetainerAvailable > 0 && (
                  <div className="flex items-center gap-2">
                    <Repeat size={15} className="text-gray-700" />
                    <span>
                      Retainer Available: <span className="font-semibold">{formatCurrency(customerRetainerAvailable, invoice.currency)}</span>{" "}
                      <button type="button" className="text-[#3b82f6] hover:underline" onClick={() => void handleOpenApplyCredits("retainer")}>Apply Now</button>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-gray-700" />
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
                        ).trim();
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
              </div>
              <div className="px-5 py-3 bg-[#f8fafc] border-t border-gray-200 text-sm text-gray-700">
                Get paid faster by setting up online payment gateways.{" "}
                <button className="text-[#3b82f6] hover:underline">Set Up Now</button>
              </div>
            </div>
          )}

          {!isDebitNoteView && !isPaidStatus && (customerCreditsAvailable > 0 || customerRetainerAvailable > 0) && (
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
                      Retainer Available: <span className="font-semibold">{formatCurrency(customerRetainerAvailable, invoice.currency)}</span>{" "}
                      <button type="button" className="text-[#3b82f6] hover:underline" onClick={() => void handleOpenApplyCredits("retainer")}>Apply Now</button>
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
                    <span className="text-[12px] text-[#2563eb]">{payments.length}</span>
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
                  {(creditAppliedAmount > 0 || retainerAppliedAmount > 0) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {creditAppliedAmount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium">
                          Credit Note Applied: {formatCurrency(creditAppliedAmount, invoice.currency)}
                        </span>
                      )}
                      {retainerAppliedAmount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-[#0D4A52]/10 text-[#0D4A52] px-2 py-0.5 text-[11px] font-medium">
                          Retainer Applied: {formatCurrency(retainerAppliedAmount, invoice.currency)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPaymentsSectionOpen ? "rotate-0" : "-rotate-90"}`} />
              </div>
              {isPaymentsSectionOpen && (
                <div className="border-t border-gray-200 overflow-x-auto relative z-[20]">
                  {paymentInfoTab === "credits" ? (
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
                        {payments.map((payment: any, paymentIndex: number) => (
                        <tr key={String(payment.id || payment._id || payment.paymentNumber || paymentIndex)} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-[12px] text-gray-800">{formatDate(payment.paymentDate || payment.date)}</td>
                          <td className="px-4 py-3 text-[12px] text-[#2563eb]">{payment.paymentNumber || "-"}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-700">{payment.referenceNumber || payment.paymentReference || payment.reference || "-"}</td>
                          <td className={`px-4 py-3 text-[12px] ${getPaymentStatusClass(payment)}`}>{getPaymentStatusLabel(payment)}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-700">{payment.paymentMode || payment.paymentMethod || "-"}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-900">{formatCurrency(payment.amountReceived ?? payment.amount ?? 0, payment.currency || invoice.currency)}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-700">{formatCurrency(0, payment.currency || invoice.currency)}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-500 relative overflow-visible">
                            {(() => {
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
                            })()}
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
          <div className="p-3 bg-gray-50">
            <div
              className="w-full max-w-[920px] mx-auto bg-white border border-[#d1d5db] shadow-sm overflow-hidden relative print-content"
              data-print-content
              style={{ width: "210mm", minHeight: "297mm", padding: "20mm" }}
            >
              {/* Status Ribbon */}
              {invoice.status?.toLowerCase() === "paid" && (
                <div className="absolute top-0 left-0 w-[200px] h-[200px] overflow-hidden z-10">
                  <div className="absolute top-[40px] left-[-60px] w-[200px] h-[30px] transform -rotate-45 origin-center flex items-center justify-center shadow-sm bg-green-500">
                    <span className="text-white font-semibold text-[14px] uppercase tracking-wider">
                      PAID
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
                        <rect x="28" y="28" width="24" height="16" rx="2" fill="#0D4A52" />
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
                    {(invoice as any).customerAddress?.street1 && <div>{(invoice as any).customerAddress.street1}</div>}
                    {(invoice as any).customerAddress?.city && (invoice as any).customerAddress?.state && (
                      <div>{(invoice as any).customerAddress.city}, {(invoice as any).customerAddress.state}</div>
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
                    <div className="text-gray-900 font-medium text-right">{invoice.orderNumber || (invoice as any).poNumber || "22"}</div>
                  </div>
                </div>
              </div>

              {/* Items Table - Dark Header */}
              <div className="mb-8">
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
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-gray-200">
                          <td className="py-4 px-3 text-sm text-gray-700 text-center align-top">{index + 1}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 align-top">
                            <div className="font-medium">{item.name || item.itemDetails || item.description || "Item"}</div>
                            {item.description && item.description !== (item.name || item.itemDetails) && (
                              <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-sm text-gray-700 text-center align-top">
                            <div>{parseFloat(item.quantity || 0).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{item.unit || 'pcs'}</div>
                          </td>
                          <td className="py-4 px-3 text-sm text-gray-700 text-right align-top">{parseFloat(item.unitPrice || item.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 text-right font-medium align-top">{parseFloat(item.total || item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

        {shouldRenderPaymentModals && (
          <Suspense fallback={null}>
            <InvoicePaymentModals
              invoice={invoice}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              toNumber={toNumber}
              isApplyAdjustmentsModalOpen={isApplyAdjustmentsModalOpen}
              setIsApplyAdjustmentsModalOpen={setIsApplyAdjustmentsModalOpen}
              isApplyingAdjustments={isApplyingAdjustments}
              applyAdjustmentRows={applyAdjustmentRows}
              useApplyDate={useApplyDate}
              setUseApplyDate={setUseApplyDate}
              applyOnDate={applyOnDate}
              setApplyOnDate={setApplyOnDate}
              invoiceTotalsMeta={invoiceTotalsMeta}
              applyAdjustmentValues={applyAdjustmentValues}
              handleAdjustmentValueChange={handleAdjustmentValueChange}
              handleApplyAdjustments={handleApplyAdjustments}
              showDeletePaymentModal={showDeletePaymentModal}
              setShowDeletePaymentModal={setShowDeletePaymentModal}
              selectedPaymentForDelete={selectedPaymentForDelete}
              setSelectedPaymentForDelete={setSelectedPaymentForDelete}
              isDeletingPayment={isDeletingPayment}
              handleDissociateAndAddAsCredit={handleDissociateAndAddAsCredit}
              handleDeleteRecordedPayment={handleDeleteRecordedPayment}
              isRefundModalOpen={isRefundModalOpen}
              selectedPaymentForRefund={selectedPaymentForRefund}
              handleCloseRefundModal={handleCloseRefundModal}
              bankAccounts={bankAccounts}
              getAccountId={getAccountId}
              getAccountDisplayName={getAccountDisplayName}
              refundData={refundData}
              setRefundData={setRefundData}
              refundPaymentModeOptions={refundPaymentModeOptions}
              isSavingRefund={isSavingRefund}
              handleRefundSave={handleRefundSave}
              isDeleteInvoiceModalOpen={isDeleteInvoiceModalOpen}
              setIsDeleteInvoiceModalOpen={setIsDeleteInvoiceModalOpen}
              handleConfirmDeleteInvoice={handleConfirmDeleteInvoice}
              isRecordPaymentModalOpen={isRecordPaymentModalOpen}
              setIsRecordPaymentModalOpen={setIsRecordPaymentModalOpen}
              handleRecordPaymentConfirm={handleRecordPaymentConfirm}
            />
          </Suspense>
        )}

        {/* Send Email Modal */}

        {shouldRenderCommunicationModals && (
          <Suspense fallback={null}>
            <InvoiceCommunicationModals
              invoice={invoice}
              ownerEmail={ownerEmail}
              organizationProfile={organizationProfile}
              isSendEmailModalOpen={isSendEmailModalOpen}
              setIsSendEmailModalOpen={setIsSendEmailModalOpen}
              emailData={emailData}
              setEmailData={setEmailData}
              handleSendEmailSubmit={handleSendEmailSubmit}
              isScheduleEmailModalOpen={isScheduleEmailModalOpen}
              setIsScheduleEmailModalOpen={setIsScheduleEmailModalOpen}
              scheduleData={scheduleData}
              setScheduleData={setScheduleData}
              handleScheduleEmailSubmit={handleScheduleEmailSubmit}
              showShareModal={showShareModal}
              setShowShareModal={setShowShareModal}
            />
          </Suspense>
        )}

        {attachmentDeleteConfirmIndex !== null && (
          <div
            className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/40 px-4 pt-4"
            onClick={handleCancelRemoveAttachment}
          >
            <div
              className="w-full max-w-[520px] overflow-hidden rounded-lg bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 px-5 py-4">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertTriangle size={18} />
                </div>
                <p className="text-[14px] leading-6 text-slate-700">
                  This action will permanently delete the attachment. Are you sure you want to proceed?
                </p>
              </div>
              <div className="border-t border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (attachmentDeleteConfirmIndex !== null) {
                        const attachment = attachments[attachmentDeleteConfirmIndex];
                        if (attachment?.id) {
                          handleRemoveAttachment(attachment.id);
                        }
                      }
                      handleCancelRemoveAttachment();
                    }}
                    className="rounded-md bg-blue-500 px-4 py-2 text-[14px] font-medium text-white hover:bg-blue-600"
                  >
                    Proceed
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelRemoveAttachment}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
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
          <FieldCustomization />
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


