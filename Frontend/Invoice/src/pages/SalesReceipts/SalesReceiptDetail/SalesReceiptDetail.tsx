import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { formatSalesReceiptNumber, getSalesReceiptById, getSalesReceipts, deleteSalesReceipt, updateSalesReceipt, saveSalesReceipt, SalesReceipt } from "../../salesModel";
import { currenciesAPI, salesReceiptsAPI, senderEmailsAPI } from "../../../services/api";
import { getCurrentUser } from "../../../services/auth";
import { resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import SalesReceiptCommentsPanel from "./SalesReceiptCommentsPanel";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  X, Edit, Send, FileText, MoreVertical,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, Link2, Mail, Settings,
  User, Calendar, Paperclip, MessageSquare, Upload, Pencil, ExternalLink, Loader2, Trash2
} from "lucide-react";
import { getStatesByCountry } from "../../../constants/locationData";

interface DetailedSalesReceipt extends SalesReceipt {
  currency?: string;
  taxInclusive?: string;
  subTotal?: number;
  amount?: number;
  customerId?: string;
  receiptDate?: string;
  paymentMode?: string;
  paymentMethod?: string;
  paymentReference?: string;
  reference?: string;
  depositTo?: string;
  organizationProfile?: {
    name: string;
    email: string;
    country: string;
    phone?: string;
    address?: any;
  };
  createdBy?: {
    name: string;
    email: string;
  };
  termsAndConditions?: string;
  terms?: string;
  notes?: string;
  discount?: number;
  discountType?: string;
  shippingCharges?: number;
  adjustment?: number;
  roundOff?: number;
  [key: string]: any;
}

interface JournalEntry {
  account: string;
  debit: number;
  credit: number;
}

interface ReceiptAttachment {
  id: string;
  name: string;
  type?: string;
  size?: number;
  preview?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

interface ReceiptComment {
  id: string;
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  author?: string;
  timestamp?: string;
}

const normalizeSalesReceiptStatus = (value: any) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "void" ? "void" : "paid";
};

const getSalesReceiptStatusLabel = (value: any) =>
  normalizeSalesReceiptStatus(value) === "void" ? "VOID" : "PAID";

export default function SalesReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<DetailedSalesReceipt | null>(null);
  const [receipts, setReceipts] = useState<SalesReceipt[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAllReceiptsDropdownOpen, setIsAllReceiptsDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [showAttachmentsPopover, setShowAttachmentsPopover] = useState(false);
  const [attachmentMenuIndex, setAttachmentMenuIndex] = useState<number | null>(null);
  const [attachmentDeleteConfirmIndex, setAttachmentDeleteConfirmIndex] = useState<number | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [receiptAttachments, setReceiptAttachments] = useState<ReceiptAttachment[]>([]);
  const [receiptComments, setReceiptComments] = useState<ReceiptComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: ""
  });
  const [isReceiptDocumentHovered, setIsReceiptDocumentHovered] = useState(false);
  const [isChooseTemplateModalOpen, setIsChooseTemplateModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Standard Template");
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isFieldCustomizationOpen, setIsFieldCustomizationOpen] = useState(false);
  const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = useState(false);
  const [termsData, setTermsData] = useState({
    notes: "Thanks for your business.",
    termsAndConditions: "",
    useNotesForAllReceipts: false,
    useTermsForAllReceipts: false
  });
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const allReceiptsDropdownRef = useRef<HTMLDivElement>(null);
  const pdfDropdownRef = useRef<HTMLDivElement>(null);
  const emailModalRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const organizationAddressFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsFileInputRef = useRef<HTMLInputElement>(null);
  const receiptDocumentRef = useRef<HTMLDivElement>(null);
  const stateOptions = getStatesByCountry(receipt?.organizationProfile?.country || "");

  console.log("SalesReceiptDetail component mounted/rendered with ID:", id);

  const periodOptions = ["All", "Today", "This Week", "This Month", "This Quarter", "This Year", "Custom"];

  useEffect(() => {
    const loadReceiptData = async () => {
      setIsLoading(true);
      try {
        const receiptData = await getSalesReceiptById(id!);
        console.log("SalesReceiptDetail - ID:", id);
        console.log("SalesReceiptDetail - Receipt Data:", receiptData);
        if (receiptData) {
          setReceipt(receiptData);
          setReceiptAttachments(Array.isArray((receiptData as any).attachments) ? (receiptData as any).attachments : []);
          setReceiptComments(Array.isArray((receiptData as any).comments) ? (receiptData as any).comments : []);
        } else {
          console.warn("SalesReceiptDetail - Receipt not found for ID:", id);
          navigate("/sales/sales-receipts");
          return;
        }
        const allReceipts = await getSalesReceipts();
        console.log("SalesReceiptDetail - All receipts:", allReceipts);
        setReceipts(allReceipts);
      } catch (error) {
        console.error("Error loading receipt details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReceiptData();

    // Fetch Base Currency
    const fetchBaseCurrency = async () => {
      try {
        const response = await currenciesAPI.getBaseCurrency();
        if (response && response.success && response.data) {
          setBaseCurrency(response.data.code || "USD");
        }
      } catch (error) {
        console.error("Error fetching base currency:", error);
      }
    };
    fetchBaseCurrency();

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
  }, [id, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (allReceiptsDropdownRef.current && !allReceiptsDropdownRef.current.contains(target)) {
        setIsAllReceiptsDropdownOpen(false);
      }
      if (pdfDropdownRef.current && !pdfDropdownRef.current.contains(target)) {
        setIsPdfDropdownOpen(false);
      }
      if (emailModalRef.current && !emailModalRef.current.contains(target) && isEmailModalOpen) {
        setIsEmailModalOpen(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(target)) {
        setShowAttachmentsPopover(false);
      }
    };

    if (isMoreMenuOpen || isAllReceiptsDropdownOpen || isPdfDropdownOpen || isEmailModalOpen || showAttachmentsPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen, isAllReceiptsDropdownOpen, isPdfDropdownOpen, isEmailModalOpen, showAttachmentsPopover]);
  // Keep browser scroll locked so only this detail view panels scroll (same behavior as Quote detail).
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const readJsonFromStorage = (key: string) => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const formatLocation = (...parts: Array<any>) => {
    const cleaned = parts
      .flatMap((part) => Array.isArray(part) ? part : [part])
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    return cleaned.join(", ");
  };

  const getCurrentUserLabel = () => {
    const user = getCurrentUser();
    if (!user) return "System";
    if (typeof user === "string") return String(user).trim() || "System";
    return String(user.name || user.displayName || user.fullName || user.email || user.username || user.userName || "System").trim() || "System";
  };

  // Default seller info (should come from settings/profile)
  const storedOrganizationProfile = readJsonFromStorage("organization_profile") || {};
  const storedOrganizationAddress = readJsonFromStorage("organization_address") || {};
  const receiptOrganizationProfile = receipt?.organizationProfile || {};
  const sellerInfo = {
    name: String(
      receiptOrganizationProfile.name ||
      receiptOrganizationProfile.organizationName ||
      storedOrganizationProfile?.name ||
      storedOrganizationProfile?.organizationName ||
      storedOrganizationProfile?.general?.companyDisplayName ||
      storedOrganizationProfile?.general?.schoolDisplayName ||
      "Team"
    ).trim() || "Team",
    location: formatLocation(
      receiptOrganizationProfile.location,
      receiptOrganizationProfile.city,
      receiptOrganizationProfile.stateProvince || receiptOrganizationProfile.state,
      receiptOrganizationProfile.country,
      storedOrganizationAddress.city,
      storedOrganizationAddress.stateProvince || storedOrganizationAddress.state,
      storedOrganizationAddress.country
    ) || receiptOrganizationProfile.country || storedOrganizationProfile?.address?.country || "Head Office",
    email: String(
      receiptOrganizationProfile.email ||
      storedOrganizationProfile?.email ||
      storedOrganizationProfile?.organizationEmail ||
      ""
    ).trim()
  };

  // Journal entries (should come from accounting system)
  // Based on payment details - deposit to account gets debit, sales account gets credit
  const depositAccount = receipt?.depositTo || "Petty Cash";
  const salesAccount = "Sales";

  const journalEntries = [
    { account: depositAccount, debit: receipt?.total || 0, credit: 0 },
    { account: salesAccount, debit: 0, credit: receipt?.subTotal || receipt?.total || 0 },
  ];

  // If items have cost, add Cost of Goods Sold entries
  if (receipt?.items && receipt.items.length > 0) {
    const totalCost = receipt.items.reduce((sum, item) => {
      return sum + (parseFloat(item.cost || 0) * parseFloat(item.quantity || 0));
    }, 0);

    if (totalCost > 0) {
      journalEntries.push(
        { account: "Cost of Goods Sold", debit: totalCost, credit: 0 },
        { account: "Inventory Asset", debit: 0, credit: totalCost }
      );
    }
  }

  const totalDebit = journalEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = journalEntries.reduce((sum, entry) => sum + entry.credit, 0);

  const formatCurrency = (amount: number | string, currency = baseCurrency) => {
    return `${currency}${parseFloat(String(amount || 0)).toFixed(2)}`;
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (error) {
      return dateString;
    }
  };

  // Initialize email data when receipt is loaded
  useEffect(() => {
    if (receipt) {
      setEmailData({
        to: receipt.customerEmail || "",
        subject: `Sales Receipt ${formatSalesReceiptNumber(receipt.receiptNumber || receipt.id)}`,
        message: `Dear ${receipt.customerName || (typeof receipt.customer === 'object' ? (receipt.customer?.displayName || receipt.customer?.name) : receipt.customer) || "Customer"},

Thank you for your purchase. Please find the sales receipt attached.

Receipt Details:
- Receipt Number: ${formatSalesReceiptNumber(receipt.receiptNumber || receipt.id)}
- Receipt Date: ${formatDate(receipt.date || receipt.receiptDate)}
- Total Amount: ${formatCurrency(receipt.total || receipt.amount || 0, receipt.currency)}
- Payment Mode: ${receipt.paymentMode || "—"}

Thank you for your business!

Best regards,
${sellerInfo.name}`
      });
    }
  }, [receipt]);

  const handleSendEmail = async () => {
    // Robustly find customer email
    let customerEmail = receipt?.customerEmail || "";
    if (!customerEmail && typeof receipt?.customer === 'object' && receipt?.customer) {
      customerEmail = receipt.customer.email || receipt.customer.contactEmail || "";
    }

    let senderName = sellerInfo.name || "System";
    let senderEmail = sellerInfo.email || "";

    try {
      const primarySenderRes = await senderEmailsAPI.getPrimary();
      const resolvedSender = resolveVerifiedPrimarySender(primarySenderRes, senderName, senderEmail);
      senderName = resolvedSender.name || senderName;
      senderEmail = resolvedSender.email || senderEmail;
    } catch (error) {
      console.error("Failed to resolve primary sender for sales receipt email:", error);
    }

    navigate(`/sales/sales-receipts/${id}/send-email`, {
      state: {
        receiptData: {
          ...receipt,
          customerEmail: customerEmail,
          senderName,
          senderEmail,
          receiptNumber: formatSalesReceiptNumber(receipt?.receiptNumber || receipt?.id),
          receiptDate: formatDate(receipt?.date || receipt?.receiptDate),
          total: formatCurrency(receipt?.total || receipt?.amount || 0, receipt?.currency),
          customerName: receipt?.customerName || (typeof receipt?.customer === 'object' ? (receipt?.customer?.displayName || receipt?.customer?.name) : receipt?.customer) || "Customer",
          notes: receipt?.notes || ""
        }
      }
    });
  };

  const handleEmailSend = () => {
    if (!emailData.to) {
      toast.error("Please enter a recipient email address");
      return;
    }

    // Create mailto link
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.message);
    const mailtoLink = `mailto:${emailData.to}?subject=${subject}&body=${body}`;

    // Open default email client
    window.location.href = mailtoLink;

    // Close modal after a short delay
    setTimeout(() => {
      setIsEmailModalOpen(false);
      toast.success("Email client opened. Please send the email from your email application.");
    }, 100);
  };

  const handleDownloadPDF = async () => {
    setIsPdfDropdownOpen(false);
    if (!receipt) return;

    if (!receiptDocumentRef.current) {
      toast.error("Receipt document is not ready yet. Please try again.");
      return;
    }

    try {
      const canvas = await html2canvas(receiptDocumentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
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

      pdf.save(`SalesReceipt${formatSalesReceiptNumber(receipt.receiptNumber || receipt.id)}.pdf`);
    } catch (error) {
      console.error("Error downloading sales receipt PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  // handlePrint removed as requested

  const persistReceiptMeta = async (attachments: ReceiptAttachment[], comments: ReceiptComment[]) => {
    if (!id) return;
    try {
      await updateSalesReceipt(id, {
        attachments,
        comments
      } as any);
      setReceipt((prev) => prev ? ({ ...prev, attachments, comments } as any) : prev);
    } catch (error) {
      console.error("Error saving sales receipt comments/attachments:", error);
      toast.error("Failed to save changes. Please try again.");
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(String(event.target?.result || ""));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleReceiptFileUpload = async (files: File[]) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (receiptAttachments.length + validFiles.length > 10) {
      toast.error("Maximum 10 files allowed. Please remove some files first.");
      return;
    }
    if (validFiles.length === 0) return;

    try {
      setIsUploadingAttachment(true);
      const newAttachments: ReceiptAttachment[] = [];
      for (const file of validFiles) {
        const preview = await fileToDataUrl(file);
        newAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          preview,
          uploadedAt: new Date().toISOString(),
          uploadedBy: "You"
        });
      }

      const updated = [...receiptAttachments, ...newAttachments].slice(0, 10);
      setReceiptAttachments(updated);
      await persistReceiptMeta(updated, receiptComments);
    } catch (error) {
      console.error("Error uploading receipt attachments:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string | number) => {
    const updated = receiptAttachments.filter(att => String(att.id) !== String(attachmentId));
    setReceiptAttachments(updated);
    await persistReceiptMeta(updated, receiptComments);
    toast.success("Attachment removed successfully.");
  };

  const attachments = Array.isArray(receiptAttachments) ? receiptAttachments : [];

  const formatFileSize = (bytes: number | string | undefined) => {
    const size = Number(bytes) || 0;
    if (!size) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  };

  const isPdfAttachment = (fileName: string) => /\.pdf$/i.test(fileName || "");

  const handleDownloadAttachment = (file: ReceiptAttachment) => {
    const url = file.preview || "";
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAttachmentInNewTab = (file: ReceiptAttachment) => {
    const url = file.preview || "";
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRequestRemoveAttachment = (index: number) => {
    setAttachmentMenuIndex(index);
    setAttachmentDeleteConfirmIndex(index);
  };

  const handleCancelRemoveAttachment = () => {
    setAttachmentMenuIndex(null);
    setAttachmentDeleteConfirmIndex(null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const comment: ReceiptComment = {
      id: `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: newComment.trim(),
      author: "You",
      timestamp: new Date().toISOString()
    };
    const updated = [...receiptComments, comment];
    setReceiptComments(updated);
    await persistReceiptMeta(receiptAttachments, updated);
    setNewComment("");
    toast.success("Comment added successfully.");
  };

  const toFiniteNumber = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toEntityId = (value: any) => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return String(value._id || value.id || "");
    return "";
  };

  const handleVoid = () => {
    setIsMoreMenuOpen(false);
    setIsVoidModalOpen(true);
  };

  const confirmVoid = async () => {
    if (!receipt) return;

    const receiptId = receipt.id || receipt._id;
    if (!receiptId) return;

    try {
      await updateSalesReceipt(String(receiptId), {
        status: "void",
        voidReason: voidReason.trim() || undefined
      } as any);
      setReceipt((prev) => (prev ? { ...prev, status: "void", voidReason: voidReason.trim() } : prev));
      setIsVoidModalOpen(false);
      setVoidReason("");
      toast.success("Sales receipt status updated to void.");
    } catch (error) {
      console.error("Error voiding sales receipt:", error);
      toast.error("Failed to void sales receipt. Please try again.");
    }
  };

  const handleClone = async () => {
    setIsMoreMenuOpen(false);
    if (!receipt) return;

    try {
      const numberResponse = await salesReceiptsAPI.getNextNumber();
      const nextReceiptNumber = numberResponse?.data?.nextNumber;

      const clonedItems = Array.isArray(receipt.items)
        ? receipt.items.map((line: any) => ({
          item: toEntityId(line?.item || line?.itemId) || undefined,
          name: line?.name || line?.itemDetails || line?.description || "Item",
          description: String(line?.description || ""),
          quantity: toFiniteNumber(line?.quantity, 1),
          unitPrice: toFiniteNumber(line?.unitPrice ?? line?.rate ?? line?.price, 0),
          discount: toFiniteNumber(line?.discount, 0),
          discountType: String(line?.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent",
          tax: line?.tax || line?.taxId || line?.tax_id || "",
          taxId: line?.taxId || line?.tax_id || line?.tax || "",
          taxRate: toFiniteNumber(line?.taxRate ?? line?.taxPercent ?? line?.tax_percentage, 0),
          taxAmount: toFiniteNumber(line?.taxAmount ?? line?.tax, 0),
          total: toFiniteNumber(line?.total ?? line?.amount, 0),
        }))
        : [];

      const clonedPayload = {
        receiptNumber: nextReceiptNumber,
        customer: toEntityId(receipt.customerId || receipt.customer) || undefined,
        customerName: receipt.customerName || (typeof receipt.customer === "object" ? receipt.customer?.displayName || receipt.customer?.name : ""),
        date: new Date().toISOString(),
        receiptDate: new Date().toISOString(),
        items: clonedItems,
        customerEmail: receipt.customerEmail || receipt.customer?.email || "",
        selectedLocation: receipt.selectedLocation || receipt.location || "Head Office",
        location: receipt.location || receipt.selectedLocation || "Head Office",
        reportingTags: Array.isArray(receipt.reportingTags) ? receipt.reportingTags : [],
        salesperson: typeof receipt.salesperson === "object"
          ? (receipt.salesperson?.name || receipt.salesperson?.displayName || "")
          : (receipt.salesperson || ""),
        taxInclusive: receipt.taxInclusive || "Tax Inclusive",
        subtotal: toFiniteNumber(receipt.subtotal ?? receipt.subTotal, 0),
        tax: toFiniteNumber(receipt.tax, 0),
        discount: toFiniteNumber(receipt.discount, 0),
        discountType: String(receipt.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent",
        shippingCharges: toFiniteNumber(receipt.shippingCharges, 0),
        shippingChargeTax: receipt.shippingChargeTax || receipt.shippingTax || "",
        adjustment: toFiniteNumber(receipt.adjustment, 0),
        total: toFiniteNumber(receipt.total ?? receipt.amount, 0),
        currency: receipt.currency || "USD",
        paymentMethod: String(receipt.paymentMethod || receipt.paymentMode || "cash").toLowerCase().replace(/\s+/g, "_"),
        paymentMode: receipt.paymentMode || receipt.paymentMethod || "Cash",
        paymentReference: receipt.paymentReference || receipt.reference || "",
        depositToAccount: toEntityId(receipt.depositToAccount || receipt.depositTo) || undefined,
        status: "paid",
        notes: receipt.notes || "",
        termsAndConditions: receipt.termsAndConditions || receipt.terms || "",
        createdBy: getCurrentUserLabel(),
      };

      const clonedReceipt = await saveSalesReceipt(clonedPayload as any);
      const clonedReceiptId = clonedReceipt?.id || clonedReceipt?._id;
      if (clonedReceiptId) {
        toast.success("Sales receipt cloned successfully.");
        navigate(`/sales/sales-receipts/${clonedReceiptId}`);
        return;
      }
      toast.success("Receipt cloned, but could not open it automatically.");
    } catch (error) {
      console.error("Error cloning sales receipt:", error);
      toast.error("Failed to clone sales receipt. Please try again.");
    }
  };

  const handleDelete = async () => {
    setIsMoreMenuOpen(false);

    if (!receipt) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteReceipt = async () => {
    if (!receipt) return;

    try {
      await deleteSalesReceipt((receipt?.id || receipt?._id)!);
      setIsDeleteModalOpen(false);
      navigate("/sales/sales-receipts");
      toast.success("Receipt deleted successfully!");
    } catch (error) {
      console.error("Error deleting receipt:", error);
      toast.error("Failed to delete receipt. Please try again.");
    }
  };

  const handleLogoUpload = (file: File) => {
    // Check file size (1MB max)
    if (file.size > 1024 * 1024) {
      toast.error("File size exceeds 1MB. Please choose a smaller file.");
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload jpg, jpeg, png, gif, or bmp files.");
      return;
    }

    // Create preview and save to localStorage
    const reader = new FileReader();
    reader.onloadend = () => {
      const logoDataUrl = reader.result as string;
      setLogoPreview(logoDataUrl);
      setLogoFile(file);
      // Save logo to localStorage
      localStorage.setItem('organization_logo', logoDataUrl);
      toast.success("Logo uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const filteredReceipts = Array.isArray(receipts) ? receipts.filter(r => {
    if (selectedPeriod !== "All") {
      // TODO: Implement period filtering
      return true;
    }
    return true;
  }) : [];

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="p-10 text-center">
          <div className="text-lg text-gray-600">Loading receipt details...</div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="p-10 text-center">
          <div className="text-lg text-gray-600">Receipt not found. Redirecting...</div>
        </div>
      </div>
    );
  }



  return (
    <div className="w-full h-[calc(100vh-4rem)] min-h-0 flex bg-[#f8fafc] overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[320px] lg:w-[320px] md:w-[270px] border-r border-gray-200 bg-white flex flex-col h-full min-h-0 overflow-hidden hidden md:flex">
        <div className="flex items-center justify-between px-4 h-[74px] border-b border-gray-200">
          <button className="text-[18px] font-semibold text-gray-900 flex items-center gap-2">
            All Sales Receipts
            <ChevronDown size={14} className="text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-md bg-[#156372] text-white flex items-center justify-center hover:bg-[#0D4A52] border border-[#0D4A52] shadow-sm"
              onClick={() => navigate("/sales/sales-receipts/new")}
              title="New Sales Receipt"
            >
              <Plus size={16} />
            </button>
            <button className="h-8 w-8 rounded-md border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-600 flex items-center gap-2">
          <span className="text-gray-500">Period:</span>
          <button className="flex items-center gap-1 text-gray-900">
            {selectedPeriod}
            <ChevronDown size={12} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {filteredReceipts.map((r: any) => {
            const receiptId = String(r.id || r._id || "");
            const isActive = String(id) === receiptId;
            return (
              <div
                key={receiptId}
                className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${isActive ? "bg-[#f3f4ff]" : ""}`}
                onClick={() => navigate(`/sales/sales-receipts/${receiptId}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[13px] font-semibold text-gray-900 truncate">
                    {r.customerName || "Walk-in Customer"}
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 whitespace-nowrap">
                    {formatCurrency(r.total || r.amount || 0, r.currency)}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {formatSalesReceiptNumber(r.receiptNumber || r.id)} - {formatDate(r.date || r.receiptDate)}
                </div>
                <div
                  className={`mt-1 text-[10px] font-bold uppercase ${normalizeSalesReceiptStatus(r.status) === "void"
                    ? "text-rose-600"
                    : "text-emerald-600"
                    }`}
                >
                  {getSalesReceiptStatusLabel(r.status)}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right Detail Panel */}
      <section className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 h-[74px] flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Location: {sellerInfo.location || "Head Office"}</div>
            <div className="flex items-center gap-2">
              <div className="text-[24px] leading-tight font-semibold text-gray-900">{formatSalesReceiptNumber(receipt.receiptNumber || receipt.id)}</div>
              {String(receipt.status || "").trim() ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50">
                  {getSalesReceiptStatusLabel(receipt.status)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={attachmentMenuRef}>
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
                                handleReceiptFileUpload(files as File[]);
                              }
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                      <p className="mt-2 text-[11px] text-slate-500">You can upload a maximum of 10 files, 10MB each</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              className="relative h-9 w-9 rounded-md border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50"
              onClick={() => {
                setShowCommentsSidebar(true);
                setShowAttachmentsPopover(false);
              }}
              title="Comments"
            >
              <MessageSquare size={18} />
              {receiptComments.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-gray-700 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {receiptComments.length}
                </span>
              )}
            </button>
            <button
              className="h-9 w-9 rounded-md border border-gray-200 text-red-500 flex items-center justify-center hover:bg-red-50"
              onClick={() => navigate("/sales/sales-receipts")}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-2 md:p-3 border-b border-gray-200 bg-[#f8fafc]">
          <div className="flex items-center gap-4 text-[12px] text-gray-700">
            {String(receipt.status || "").toLowerCase() !== "void" && (
              <>
                <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => navigate(`/sales/sales-receipts/${id}/edit`, { state: { receipt } })}>
                  <Edit size={14} />
                  Edit
                </button>
                <span className="h-4 w-px bg-gray-300" />
                <button className="flex items-center gap-1 hover:text-gray-900" onClick={handleSendEmail}>
                  <Mail size={14} />
                  Send Email
                </button>
                <span className="h-4 w-px bg-gray-300" />
              </>
            )}
            <button className="flex items-center gap-1 hover:text-gray-900" onClick={handleDownloadPDF}>
              <FileText size={14} />
              PDF
            </button>
            <span className="h-4 w-px bg-gray-300" />
            <div className="relative" ref={moreMenuRef}>
              <button
                className="h-7 w-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                title="More"
              >
                <MoreVertical size={14} />
              </button>
              {isMoreMenuOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px] p-2">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-800 rounded-md hover:bg-gray-50"
                    onClick={handleClone}
                  >
                    Clone
                  </button>
                  {String(receipt.status || "").toLowerCase() !== "void" && (
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-gray-800 rounded-md hover:bg-gray-50 mt-1"
                      onClick={handleVoid}
                    >
                      Void
                    </button>
                  )}
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                  <div className="my-1 h-px bg-gray-200" />
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => navigate("/settings/sales-receipts")}
                  >
                    <Settings size={14} />
                    Sales Receipt Preferences
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto py-4">
            {/* Receipt Section */}
            <div
              className="p-6"
              onMouseEnter={() => setIsReceiptDocumentHovered(true)}
              onMouseLeave={() => {
                setIsReceiptDocumentHovered(false);
              }}
            >
              <div
                ref={receiptDocumentRef}
                className="max-w-4xl mx-auto bg-white shadow-lg relative border border-gray-100"
                style={{ minHeight: "842px", padding: "40px" }}
              >
              {/* Seller Info */}
              <div className="mb-6">
                <div className="text-lg font-semibold text-gray-900">{sellerInfo.name}</div>
                <div className="text-sm text-gray-600">{sellerInfo.location}</div>
                <div className="text-sm text-gray-600">{sellerInfo.email}</div>
              </div>

              <hr className="mb-8 border-gray-200" />

              {/* Receipt Header */}
              <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SALES RECEIPT</h1>
                <div className="text-sm text-gray-600 mt-1">
                  Sales Receipt {formatSalesReceiptNumber(receipt.receiptNumber || receipt.id)}
                </div>
              </div>

              {/* Bill To and Date */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-2">Bill To</div>
                  <div
                    className="text-sm text-blue-600 font-medium cursor-pointer hover:underline"
                    onClick={() => navigate(`/sales/customers/${receipt.customerId || receipt.customer}`)}
                  >
                    {receipt.customerName ||
                      receipt.customer?.displayName ||
                      receipt.customer?.companyName ||
                      receipt.customer?.name ||
                      receipt.customer?.contactName ||
                      (typeof receipt.customer === "string" ? receipt.customer : "") ||
                      "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex justify-end gap-12 mb-2">
                    <span className="text-sm text-gray-600">Receipt Date</span>
                    <span className="text-sm text-gray-900 font-medium">{formatDate(receipt.date || receipt.receiptDate)}</span>
                  </div>
                  {(receipt.paymentReference || receipt.reference) && (
                    <div className="flex justify-end gap-12 mb-2">
                      <span className="text-sm text-gray-600">Reference#</span>
                      <span className="text-sm text-gray-900 font-medium">{receipt.paymentReference || receipt.reference}</span>
                    </div>
                  )}
                  {receipt.createdBy && (
                    <div className="flex justify-end gap-12">
                      <span className="text-sm text-gray-600">Created By</span>
                      <span className="text-sm text-gray-900 font-medium">{receipt.createdBy.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-200">
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase w-12">#</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase">Item & Description</th>
                      <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 uppercase">Qty</th>
                      <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 uppercase">Rate</th>
                      <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {receipt.items && receipt.items.length > 0 ? (
                      receipt.items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="py-4 px-4 text-sm text-gray-600 align-top">{index + 1}</td>
                          <td className="py-4 px-4 align-top">
                            <div className="text-sm font-medium text-gray-900">{item.name || item.itemDetails || "—"}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-900 text-right align-top">
                            {item.quantity || 0}
                            {item.unit && <div className="text-xs text-gray-500 mt-0.5">{item.unit}</div>}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-900 text-right align-top">{formatCurrency(item.unitPrice || item.rate || 0, receipt.currency)}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 text-right font-medium align-top">{formatCurrency(item.total || item.amount || 0, receipt.currency)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-gray-500 italic">No items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payment Details and Totals Row */}
              <div className="flex justify-between items-start pt-4">
                <div className="w-1/2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Payment Mode</span>
                    <span className="text-sm text-gray-900 font-bold ml-12">
                      {(receipt.paymentMethod || receipt.paymentMode || "—")
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                    <span className="text-sm text-gray-600">Payment Made</span>
                    <span className="text-sm text-green-700 font-bold ml-12">{formatCurrency(receipt.total || receipt.amount || 0, receipt.currency)}</span>
                  </div>
                </div>

                <div className="w-1/3">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sub Total</span>
                      <span className="text-sm text-gray-900 font-medium">{formatCurrency(receipt.subTotal || receipt.total || 0, receipt.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">vat (5%)</span>
                      <span className="text-sm text-gray-900 font-medium">{formatCurrency((receipt.total || 0) - (receipt.subTotal || 0), receipt.currency)}</span>
                    </div>
                    <div className="pt-3 border-t-2 border-gray-200 flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(receipt.total || receipt.amount || 0, receipt.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Template Info */}
              <div className="absolute bottom-10 right-10 flex items-center gap-2 text-xs text-gray-500">
                <span>PDF Template : 'Elegant'</span>
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => setIsChooseTemplateModalOpen(true)}
                >
                  Change
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      </section>
      <SalesReceiptCommentsPanel
        open={showCommentsSidebar}
        onClose={() => setShowCommentsSidebar(false)}
        receiptId={String(receipt?.id || id || "")}
        comments={receiptComments}
        onCommentsChange={(nextComments) => setReceiptComments(nextComments)}
        updateSalesReceipt={updateSalesReceipt}
      />
      {isVoidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setIsVoidModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="text-sm text-gray-700">
                Note down the reason as to why you're making this Sales Receipt void.
              </div>
              <textarea
                className="mt-3 w-full h-28 border border-blue-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Reason..."
              />
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <button
                className="px-4 py-2 bg-emerald-500 text-white rounded-md text-sm hover:bg-emerald-600"
                onClick={confirmVoid}
              >
                Void it
              </button>
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                onClick={() => setIsVoidModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                !
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                Delete receipt?
              </h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setIsDeleteModalOpen(false)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              Receipt {formatSalesReceiptNumber(receipt?.receiptNumber || receipt?.id || "")} will be deleted permanently.
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700"
                onClick={confirmDeleteReceipt}
              >
                Delete
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {isChooseTemplateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
          <div
            className="bg-white h-full w-[500px] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Choose Template</h2>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setIsChooseTemplateModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Template"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ borderColor: "#156372" }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedTemplate("Standard Template");
                    setIsChooseTemplateModalOpen(false);
                    toast.success("Template changed to Standard Template");
                  }}
                >
                  <div className="bg-gray-50 rounded border border-gray-200 p-4 mb-3" style={{ minHeight: "200px" }}>
                    <div className="text-xs">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        >
                          T
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">Standard Template</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">Standard Template</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organization Address Modal */}
      {isOrganizationAddressModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Organization Address</h2>
              <button
                className="p-2 text-white rounded transition-colors"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
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
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-colors"
                      style={{ "--hover-border": "#156372" } as React.CSSProperties}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
                      onClick={() => organizationAddressFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = "#156372";
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = "#d1d5db";
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
                              localStorage.removeItem('organization_logo');
                            }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 pr-8"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                      onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                    onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                    onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                      onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                      onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
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
                      list="receipt-organization-state-options"
                      value={organizationData.stateProvince}
                      onChange={(e) => setOrganizationData({ ...organizationData, stateProvince: e.target.value })}
                      placeholder="State/Province"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 bg-white pr-8"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                      onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
                    />
                    <datalist id="receipt-organization-state-options">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                      onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                    onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                    onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                    onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                    onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 appearance-none bg-white pr-8"
                    style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                    onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                    onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
                  >
                    <option value="">Select Industry</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="services">Services</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="finance">Finance</option>
                    <option value="real-estate">Real Estate</option>
                    <option value="hospitality">Hospitality</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                onClick={() => setIsOrganizationAddressModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-all"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                onClick={() => {
                  // Handle save action
                  localStorage.setItem('organization_address', JSON.stringify(organizationData));
                  // Logo is already saved in handleLogoUpload
                  toast.success("Organization address and logo updated successfully!");
                  setIsOrganizationAddressModalOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
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
                        void handleRemoveAttachment(attachment.id);
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

      {/* Terms & Conditions Modal */}
      {isTermsAndConditionsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Terms & Conditions</h2>
              <button
                className="p-2 text-white rounded transition-colors"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                onClick={() => setIsTermsAndConditionsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                  style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                  rows={4}
                  value={termsData.notes}
                  onChange={(e) => setTermsData({ ...termsData, notes: e.target.value })}
                  placeholder="Enter notes..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                  style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                  rows={6}
                  value={termsData.termsAndConditions}
                  onChange={(e) => setTermsData({ ...termsData, termsAndConditions: e.target.value })}
                  placeholder="Enter terms and conditions..."
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={termsData.useNotesForAllReceipts}
                  onChange={(e) => setTermsData({ ...termsData, useNotesForAllReceipts: e.target.checked })}
                  className="w-4 h-4"
                  style={{ accentColor: "#156372" } as React.CSSProperties}
                />
                <label className="text-sm text-gray-700">Use notes for all sales receipts</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={termsData.useTermsForAllReceipts}
                  onChange={(e) => setTermsData({ ...termsData, useTermsForAllReceipts: e.target.checked })}
                  className="w-4 h-4"
                  style={{ accentColor: "#156372" } as React.CSSProperties}
                />
                <label className="text-sm text-gray-700">Use terms for all sales receipts</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                onClick={() => setIsTermsAndConditionsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-all"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                onClick={() => {
                  toast.success("Terms & Conditions saved successfully!");
                  setIsTermsAndConditionsModalOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEmailModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" ref={emailModalRef}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Send Sales Receipt via Email</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900"
                onClick={() => setIsEmailModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                  onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                  onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                  onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                  onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                  style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                  onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#156372"}
                  onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"}
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  placeholder="Email message"
                  rows={8}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText size={16} />
                <span>Sales Receipt PDF will be attached</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <button
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                onClick={() => setIsEmailModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 text-white border-none rounded-md text-sm font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer transition-all"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e) => {
                  if (!emailData.to) (e.currentTarget as HTMLElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  if (!emailData.to) (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
                onClick={handleEmailSend}
                disabled={!emailData.to}
              >
                <Send size={16} />
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




