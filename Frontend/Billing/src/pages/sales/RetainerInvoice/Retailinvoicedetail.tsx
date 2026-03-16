import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { MoreHorizontal, MessageSquare, X, Edit, Mail, FileText, Banknote, ChevronDown, ChevronRight, Search, Star, Download, Printer, Trash2, ArrowUpDown, Upload, Settings, RefreshCw, RotateCcw, HelpCircle, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon, Copy, Ban, AlertTriangle } from "lucide-react";
import { deleteInvoice, getCustomers, getInvoiceById, getInvoicesPaginated, Invoice, updateInvoice, saveInvoice } from "../salesModel";
import { useOrganizationBranding } from "../../../hooks/useOrganizationBranding";
import { toast } from "react-hot-toast";

type RetainerListRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  status: string;
  amount: number;
};

type RetainerAttachment = {
  id: string;
  name: string;
  size: string;
  uploadedAt?: string;
};

type RetainerComment = {
  id: string;
  text: string;
  author?: string;
  timestamp?: string;
};

const VIEW_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "partially_drawn", label: "Partially Drawn" },
  { key: "drawn", label: "Drawn" },
  { key: "void", label: "Void" },
];
const RETAINER_SELECTED_VIEW_STORAGE_KEY = "taban_retainer_selected_view_v1";
const RETAINER_SORT_STORAGE_KEY = "taban_retainer_sort_v1";
const RETAINER_FLASH_SUCCESS_KEY = "taban_retainer_flash_success_v1";
const RETAINER_DRAFT_RECORD_PAYMENT_WARNING_KEY = "taban_retainer_draft_record_payment_warning_v1";

const toFiniteNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getInvoiceId = (invoice: any) => String(invoice?.id || invoice?._id || "");
const isRetainerInvoice = (invoice: any) => String(invoice?.invoiceNumber || "").toUpperCase().startsWith("RET-");
const toStatusLabel = (value: any) => String(value || "draft").replace(/_/g, " ").trim().toUpperCase();
const toStatusKey = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .trim();

const isLikelyCustomerId = (value: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  return /^(cus|cust)[-_]/i.test(normalized) || /^[a-f0-9]{24}$/i.test(normalized);
};

const deriveRetainerFinancialState = (invoice: any) => {
  const totalAmount = toFiniteNumber(invoice?.total ?? invoice?.amount, 0);
  const paidAmount = toFiniteNumber(invoice?.amountPaid ?? invoice?.paidAmount, 0);
  const explicitBalance = toFiniteNumber(invoice?.balance ?? invoice?.balanceDue, NaN);
  const balanceAmount = Number.isFinite(explicitBalance) ? explicitBalance : Math.max(0, totalAmount - paidAmount);
  const rawStatus = toStatusKey(invoice?.status || "draft");
  const rawDrawStatus = toStatusKey(invoice?.retainerDrawStatus || invoice?.drawStatus || "");

  const status = (() => {
    if (rawStatus === "void") return "void";
    if (["pending_approval", "approved", "drawn", "partially_drawn"].includes(rawStatus)) return rawStatus;
    if (paidAmount > 0 && balanceAmount <= 0) return "paid";
    if (paidAmount > 0 && balanceAmount > 0) return "partially_paid";
    if (rawStatus === "sent") return "sent";
    return "draft";
  })();

  const drawStatus = rawDrawStatus || (status === "paid" ? "ready_to_draw" : "awaiting_payment");
  return {
    status,
    drawStatus,
    totalAmount,
    paidAmount,
    balanceAmount,
  };
};

const getCustomerDisplayName = (invoice: any) => {
  const customerName = String(invoice?.customerName || "").trim();
  if (customerName && !isLikelyCustomerId(customerName)) return customerName;
  if (invoice?.customer && typeof invoice.customer === "object") {
    const nestedName = String(
      invoice.customer.displayName || invoice.customer.companyName || invoice.customer.name || ""
    ).trim();
    if (nestedName) return nestedName;
  }
  if (typeof invoice?.customer === "string") {
    const customerValue = String(invoice.customer).trim();
    if (customerValue && !isLikelyCustomerId(customerValue)) return customerValue;
  }
  if (customerName && !isLikelyCustomerId(customerName)) return customerName;
  return "Unknown Customer";
};

const getInvoiceCustomerId = (invoice: any) =>
  String(
    invoice?.customer?._id ||
      invoice?.customer?.id ||
      invoice?.customerId ||
      (typeof invoice?.customer === "string" && isLikelyCustomerId(String(invoice.customer)) ? invoice.customer : "") ||
      ""
  ).trim();

const getMoneyPrefix = (invoice: any) => String(invoice?.currency || "AMD");
const formatMoney = (value: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toFiniteNumber(value, 0));

const formatDate = (value: any) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString(undefined, { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const getNextRetainerNumber = (rows: RetainerListRow[], floor = 1) => {
  const maxUsed = rows.reduce((max, row) => {
    const match = String(row.invoiceNumber || "").toUpperCase().match(/^RET-(\d+)$/);
    if (!match) return max;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
  const next = Math.max(maxUsed + 1, floor);
  return `RET-${String(next).padStart(5, "0")}`;
};

const isDuplicateInvoiceNumberError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || 0);
  const hasInvoiceNumberText = message.includes("invoice number");
  const hasDuplicateText = message.includes("already exists") || message.includes("duplicate");
  return hasInvoiceNumberText && hasDuplicateText && (status === 0 || status === 400 || status === 409);
};

const mapRetainerListRow = (invoice: Invoice): RetainerListRow => {
  const derived = deriveRetainerFinancialState(invoice);
  return {
    id: getInvoiceId(invoice),
    invoiceNumber: String(invoice.invoiceNumber || "-"),
    customerName: getCustomerDisplayName(invoice),
    date: formatDate((invoice as any).invoiceDate || (invoice as any).date || (invoice as any).createdAt),
    status: toStatusLabel(derived.status),
    amount: toFiniteNumber(invoice.total ?? invoice.amount, 0),
  };
};

const AttachmentIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 215 468" className={className} fill="currentColor" aria-hidden="true">
    <path d="M107.84 468.1h-.97C47.94 468.1 0 420.16 0 361.23c0-11.6 9.4-21 21-21s21 9.4 21 21c0 35.77 29.1 64.87 64.87 64.87h.97c35.55 0 64.47-28.92 64.47-64.47V106.47c0-35.55-28.92-64.47-64.47-64.47h-.97C71.1 42 42 71.1 42 106.87v153.88c0 12.36 10.06 22.42 22.42 22.42s22.42-10.06 22.42-22.42v-97.98c0-11.6 9.4-21 21-21s21 9.4 21 21v97.98c0 35.52-28.9 64.42-64.42 64.42S0 296.27 0 260.75V106.87C0 47.94 47.94 0 106.87 0h.97c58.71 0 106.47 47.76 106.47 106.47v255.16c0 58.71-47.76 106.47-106.47 106.47z" />
  </svg>
);

export default function Retailinvoicedetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accentColor } = useOrganizationBranding();
  const ensureRetainerListAllView = () => {
    try {
      localStorage.setItem(RETAINER_SELECTED_VIEW_STORAGE_KEY, "all");
    } catch {
      // ignore local storage errors
    }
  };

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [retainers, setRetainers] = useState<RetainerListRow[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedView, setSelectedView] = useState(() => localStorage.getItem(RETAINER_SELECTED_VIEW_STORAGE_KEY) || "all");
  const [viewSearchTerm, setViewSearchTerm] = useState("");
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [selectedRetainerIds, setSelectedRetainerIds] = useState<Set<string>>(new Set());
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [isRecordPaymentMenuOpen, setIsRecordPaymentMenuOpen] = useState(false);
  const [isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen] = useState(false);
  const [isSortSubMenuOpen, setIsSortSubMenuOpen] = useState(false);
  const [isExportSubMenuOpen, setIsExportSubMenuOpen] = useState(false);
  const [isAssociatedTagsOpen, setIsAssociatedTagsOpen] = useState(true);
  const [isAttachmentsDropdownOpen, setIsAttachmentsDropdownOpen] = useState(false);
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);
  const [isDetailActionsMenuOpen, setIsDetailActionsMenuOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isDraftRecordPaymentModalOpen, setIsDraftRecordPaymentModalOpen] = useState(false);
  const [isPaymentsReceivedOpen, setIsPaymentsReceivedOpen] = useState(false);
  const [disableDraftRecordPaymentWarning, setDisableDraftRecordPaymentWarning] = useState(false);
  const [dontShowDraftRecordPaymentAgain, setDontShowDraftRecordPaymentAgain] = useState(false);
  const [draftRecordPaymentLoading, setDraftRecordPaymentLoading] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [detailActionLoading, setDetailActionLoading] = useState<"clone" | "void" | "delete" | "sent" | null>(null);
  const [attachments, setAttachments] = useState<RetainerAttachment[]>([]);
  const [comments, setComments] = useState<RetainerComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [fontSize, setFontSize] = useState("16");
  const [emailData, setEmailData] = useState({
    fromName: "Abdi Ladiif",
    fromEmail: "ladiiif520@gmail.com",
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    message: "",
    attachPdf: true,
  });
  const [sortKey, setSortKey] = useState<
    "created_desc" | "created_asc" | "retainer_asc" | "retainer_desc" | "customer_asc" | "customer_desc" | "amount_desc" | "amount_asc" | "balance_desc" | "balance_asc"
  >(() => (localStorage.getItem(RETAINER_SORT_STORAGE_KEY) as any) || "created_desc");
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);
  const invoicePaperRef = useRef<HTMLDivElement | null>(null);
  const paymentMenuRef = useRef<HTMLDivElement | null>(null);
  const headerMoreMenuRef = useRef<HTMLDivElement | null>(null);
  const attachmentsDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const detailActionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!cancelled) setLoading(true);
      try {
        const [rawCurrentInvoice, allInvoicesResp, customers] = await Promise.all([
          id ? getInvoiceById(id) : Promise.resolve(null),
          getInvoicesPaginated({ limit: 1000, sort: "createdAt", order: "desc" }),
          getCustomers({ limit: 1000 }),
        ]);

        const allInvoices: Invoice[] = Array.isArray(allInvoicesResp?.data) ? allInvoicesResp.data : [];
        const retainerRows = allInvoices
          .filter((row) => isRetainerInvoice(row))
          .map(mapRetainerListRow)
          .sort((a, b) => {
            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();
            if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
            return b.invoiceNumber.localeCompare(a.invoiceNumber);
          });

        if (cancelled) return;
        setRetainers(retainerRows);

        const requestedId = String(id || "");
        const currentId = getInvoiceId(rawCurrentInvoice);
        const currentIsRetainer = rawCurrentInvoice ? isRetainerInvoice(rawCurrentInvoice) : false;
        const fallbackRow = retainerRows.find((row) => row.id === requestedId) || retainerRows[0];

        if (rawCurrentInvoice && currentId && currentIsRetainer) {
          const customerId = getInvoiceCustomerId(rawCurrentInvoice);
          const matchedCustomer = customerId
            ? (Array.isArray(customers) ? customers : []).find(
                (c: any) => String(c?._id || c?.id || "").trim() === customerId
              )
            : null;
          const matchedCustomerName = String(
            matchedCustomer?.displayName ||
              matchedCustomer?.name ||
              matchedCustomer?.companyName ||
              ""
          ).trim();

          setInvoice({
            ...rawCurrentInvoice,
            customerName: matchedCustomerName || getCustomerDisplayName(rawCurrentInvoice),
          });
          return;
        }

        if (fallbackRow?.id && fallbackRow.id !== requestedId) {
          navigate(`/sales/retainer-invoices/${fallbackRow.id}`, { replace: true });
          return;
        }

        setInvoice(null);
      } catch (error) {
        console.error("Failed to load retainer detail page:", error);
        if (!cancelled) {
          setRetainers([]);
          setInvoice(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, reloadTick]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (viewMenuRef.current && !viewMenuRef.current.contains(target)) setIsViewMenuOpen(false);
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(target)) setIsBulkActionsOpen(false);
      if (paymentMenuRef.current && !paymentMenuRef.current.contains(target)) setIsRecordPaymentMenuOpen(false);
      if (attachmentsDropdownRef.current && !attachmentsDropdownRef.current.contains(target)) setIsAttachmentsDropdownOpen(false);
      if (detailActionsMenuRef.current && !detailActionsMenuRef.current.contains(target)) setIsDetailActionsMenuOpen(false);
      if (headerMoreMenuRef.current && !headerMoreMenuRef.current.contains(target)) {
        setIsHeaderMoreMenuOpen(false);
        setIsSortSubMenuOpen(false);
        setIsExportSubMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    localStorage.setItem(RETAINER_SELECTED_VIEW_STORAGE_KEY, selectedView);
  }, [selectedView]);

  useEffect(() => {
    localStorage.setItem(RETAINER_SORT_STORAGE_KEY, sortKey);
  }, [sortKey]);

  useEffect(() => {
    const flashMessage = sessionStorage.getItem(RETAINER_FLASH_SUCCESS_KEY);
    if (!flashMessage) return;
    sessionStorage.removeItem(RETAINER_FLASH_SUCCESS_KEY);
    toast.success(flashMessage);
  }, [id]);

  useEffect(() => {
    const raw = localStorage.getItem(RETAINER_DRAFT_RECORD_PAYMENT_WARNING_KEY);
    setDisableDraftRecordPaymentWarning(raw === "1");
  }, []);

  useEffect(() => {
    const docs = Array.isArray((invoice as any)?.attachedFiles)
      ? (invoice as any).attachedFiles
      : Array.isArray((invoice as any)?.documents)
      ? (invoice as any).documents
      : [];
    const nextAttachments: RetainerAttachment[] = docs.map((doc: any, index: number) => {
      const rawSize = Number(doc?.size ?? doc?.fileSize ?? 0);
      const size =
        rawSize > 1024 * 1024
          ? `${(rawSize / (1024 * 1024)).toFixed(1)} MB`
          : rawSize > 1024
          ? `${(rawSize / 1024).toFixed(1)} KB`
          : rawSize > 0
          ? `${rawSize} B`
          : String(doc?.sizeLabel || "Unknown");
      return {
        id: String(doc?.id || doc?._id || doc?.documentId || `att-${index}`),
        name: String(doc?.name || doc?.fileName || `Attachment ${index + 1}`),
        size,
        uploadedAt: doc?.uploadedAt || doc?.createdAt,
      };
    });
    setAttachments(nextAttachments);

    const rawComments = Array.isArray((invoice as any)?.comments) ? (invoice as any).comments : [];
    const nextComments: RetainerComment[] = rawComments.map((row: any, index: number) => ({
      id: String(row?.id || row?._id || `c-${index}`),
      text: String(row?.text || ""),
      author: String(row?.author || "User"),
      timestamp: String(row?.timestamp || row?.createdAt || new Date().toISOString()),
    }));
    setComments(nextComments);
  }, [invoice]);

  useEffect(() => {
    if (!invoice) return;
    const customerName = String(getCustomerDisplayName(invoice) || "Customer");
    const invoiceNo = String((invoice as any)?.invoiceNumber || "-");
    const recipient = String(
      (invoice as any)?.customerEmail ||
      (invoice as any)?.customer?.email ||
      ""
    );
    const invoiceDateText = formatDate((invoice as any)?.invoiceDate || (invoice as any)?.date || (invoice as any)?.createdAt);
    const amountValue = toFiniteNumber((invoice as any)?.total ?? (invoice as any)?.amount, 0);
    const currency = getMoneyPrefix(invoice);
    setEmailData((prev) => ({
      ...prev,
      to: recipient,
      subject: `Retainer Invoice from ${String((invoice as any)?.organizationName || "asddc")} (${invoiceNo})`,
      message: `<p>Dear ${customerName},</p>
<p>Thanks for your business.</p>
<p>The retainer invoice ${invoiceNo} is attached with this email.</p>
<p>Retainer Invoice Overview:<br/>
Invoice #: ${invoiceNo}<br/>
Date: ${invoiceDateText}<br/>
Amount: ${currency}${formatMoney(amountValue)}</p>
<p>Regards,<br/>${prev.fromName}</p>`,
    }));
  }, [invoice]);

  const persistInvoicePatch = async (patch: Record<string, any>) => {
    if (!invoice) return;
    const currentId = String((invoice as any).id || (invoice as any)._id || id || "");
    if (!currentId) return;
    const updated = await updateInvoice(currentId, patch as Partial<Invoice>);
    setInvoice((prev) =>
      prev
        ? ({
            ...prev,
            ...updated,
            customerName: getCustomerDisplayName(updated),
          } as Invoice)
        : updated
    );
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const current = Array.isArray((invoice as any)?.attachedFiles) ? (invoice as any).attachedFiles : [];
    const picked = Array.from(files);
    const allowed = picked.filter((file) => file.size <= 10 * 1024 * 1024);
    const remaining = Math.max(0, 10 - current.length);
    const accepted = allowed.slice(0, remaining);

    const newEntries = accepted.map((file, index) => ({
      id: `att-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));

    const updated = [...current, ...newEntries];
    setAttachments(
      updated.map((doc: any, index: number) => ({
        id: String(doc?.id || doc?._id || `att-${index}`),
        name: String(doc?.name || `Attachment ${index + 1}`),
        size:
          Number(doc?.size || 0) > 1024 * 1024
            ? `${(Number(doc.size) / (1024 * 1024)).toFixed(1)} MB`
            : Number(doc?.size || 0) > 1024
            ? `${(Number(doc.size) / 1024).toFixed(1)} KB`
            : `${Number(doc?.size || 0)} B`,
        uploadedAt: String(doc?.uploadedAt || ""),
      }))
    );
    try {
      await persistInvoicePatch({ attachedFiles: updated });
    } catch (error) {
      console.error("Failed to save retainer attachments:", error);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    const current = Array.isArray((invoice as any)?.attachedFiles) ? (invoice as any).attachedFiles : [];
    const updated = current.filter((doc: any, index: number) => {
      const idValue = String(doc?.id || doc?._id || `att-${index}`);
      return idValue !== attachmentId;
    });
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
    try {
      await persistInvoicePatch({ attachedFiles: updated });
    } catch (error) {
      console.error("Failed to remove retainer attachment:", error);
    }
  };

  const handleAddComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    const nextComment: RetainerComment = {
      id: `comment-${Date.now()}`,
      text: trimmed,
      author: "User",
      timestamp: new Date().toISOString(),
    };
    const next = [...comments, nextComment];
    setComments(next);
    setCommentText("");
    try {
      await persistInvoicePatch({ comments: next });
    } catch (error) {
      console.error("Failed to save retainer comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const next = comments.filter((comment) => comment.id !== commentId);
    setComments(next);
    try {
      await persistInvoicePatch({ comments: next });
    } catch (error) {
      console.error("Failed to delete retainer comment:", error);
    }
  };

  const applyCommentFormatting = (style: "bold" | "italic" | "underline") => {
    const textarea = commentTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = commentText.substring(start, end);
    const wrappers =
      style === "bold"
        ? { left: "**", right: "**" }
        : style === "italic"
        ? { left: "*", right: "*" }
        : { left: "__", right: "__" };

    const replacement = `${wrappers.left}${selected || "text"}${wrappers.right}`;
    const updated = commentText.substring(0, start) + replacement + commentText.substring(end);
    setCommentText(updated);

    window.setTimeout(() => {
      textarea.focus();
      const cursor = start + replacement.length;
      textarea.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const formatCommentTimestamp = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const formatted = date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return formatted.toUpperCase();
  };


  const items = useMemo(() => {
    const rows = Array.isArray((invoice as any)?.items) ? ((invoice as any).items as any[]) : [];
    return rows.map((row, index) => ({
      id: index + 1,
      description: String(row.description || row.name || "-"),
      amount: toFiniteNumber(
        row.total ??
          row.amount ??
          (toFiniteNumber(row.quantity, 0) * toFiniteNumber(row.rate ?? row.unitPrice, 0)) ??
          row.unitPrice ??
          row.rate,
        0
      ),
      tax: toFiniteNumber(row.taxAmount ?? row.tax, 0),
    }));
  }, [invoice]);

  const subtotal = useMemo(() => {
    const explicit = toFiniteNumber((invoice as any)?.subtotal ?? (invoice as any)?.subTotal, NaN);
    if (Number.isFinite(explicit)) return explicit;
    return items.reduce((sum, row) => sum + row.amount, 0);
  }, [invoice, items]);

  const tax = useMemo(() => {
    const explicit = toFiniteNumber((invoice as any)?.tax ?? (invoice as any)?.taxAmount, NaN);
    if (Number.isFinite(explicit)) return explicit;
    const itemTaxTotal = items.reduce((sum, row) => sum + toFiniteNumber((row as any).tax, 0), 0);
    if (itemTaxTotal > 0) return itemTaxTotal;
    const fromTotal = toFiniteNumber((invoice as any)?.total, NaN);
    if (Number.isFinite(fromTotal)) return Math.max(0, fromTotal - subtotal);
    return 0;
  }, [invoice, items, subtotal]);

  const total = useMemo(() => {
    const explicit = toFiniteNumber((invoice as any)?.total, NaN);
    if (Number.isFinite(explicit)) return explicit;
    return subtotal + tax;
  }, [invoice, subtotal, tax]);

  const balanceDue = useMemo(() => {
    const direct = toFiniteNumber((invoice as any)?.balance ?? (invoice as any)?.balanceDue, NaN);
    if (Number.isFinite(direct)) return direct;
    const paid = toFiniteNumber((invoice as any)?.amountPaid ?? (invoice as any)?.paidAmount, 0);
    return Math.max(0, total - paid);
  }, [invoice, total]);

  const currencyPrefix = getMoneyPrefix(invoice);
  const locationText = String((invoice as any)?.location || (invoice as any)?.selectedLocation || "Head Office");
  const projectName = String((invoice as any)?.projectName || (invoice as any)?.project || "-");
  const derivedState = deriveRetainerFinancialState(invoice);
  const drawStatus = toStatusLabel(derivedState.drawStatus);
  const statusLabel = toStatusLabel(derivedState.status);
  const isVoidStatus = statusLabel === "VOID";
  const isDraftStatus = statusLabel === "DRAFT";
  const totalPaidAmount = Math.max(0, toFiniteNumber(derivedState.paidAmount, NaN));
  const derivedPaidAmount = Math.max(0, total - balanceDue);
  const paymentMadeAmount = Number.isFinite(totalPaidAmount) && totalPaidAmount > 0 ? totalPaidAmount : derivedPaidAmount;
  const isFullyPaidStatus = statusLabel === "PAID" || (paymentMadeAmount > 0 && balanceDue <= 0);
  const isPartiallyPaidStatus = statusLabel === "PARTIALLY PAID" || (paymentMadeAmount > 0 && balanceDue > 0);
  const showPaymentsSummary = paymentMadeAmount > 0 || isFullyPaidStatus || isPartiallyPaidStatus;
  const invoiceDate = formatDate((invoice as any)?.invoiceDate || (invoice as any)?.date || (invoice as any)?.createdAt);
  const paymentRecords = Array.isArray((invoice as any)?.paymentsReceived)
    ? (invoice as any).paymentsReceived
    : Array.isArray((invoice as any)?.payments)
    ? (invoice as any).payments
    : [];
  const paymentsReceivedCount = paymentRecords.length > 0 ? paymentRecords.length : showPaymentsSummary ? 1 : 0;
  const paymentTableRows = useMemo(() => {
    const resolveField = (source: any, keys: string[]) => {
      for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") return value;
      }
      return "";
    };

    if (paymentRecords.length > 0) {
      return paymentRecords.map((record: any, index: number) => {
        const amountValue = toFiniteNumber(
          resolveField(record, ["amount", "paymentAmount", "paidAmount", "receivedAmount"]),
          0
        );
        const balanceValue = toFiniteNumber(resolveField(record, ["balance", "balanceAmount", "remainingBalance"]), balanceDue);
        const paymentMode = String(resolveField(record, ["paymentMode", "mode", "paymentMethod"]) || "-");
        const paymentNumberValue = resolveField(record, ["paymentNumber", "number", "id", "_id"]);
        const referenceValue = resolveField(record, ["referenceNumber", "reference", "ref", "transactionId"]);
        return {
          id: String(resolveField(record, ["id", "_id"]) || `payment-${index + 1}`),
          date: formatDate(resolveField(record, ["date", "paymentDate", "createdAt", "updatedAt"])),
          paymentNumber: paymentNumberValue ? String(paymentNumberValue) : "-",
          reference: referenceValue ? String(referenceValue) : "-",
          paymentMode,
          amount: amountValue,
          balance: balanceValue,
        };
      });
    }

    if (showPaymentsSummary && paymentMadeAmount > 0) {
      return [
        {
          id: "payment-fallback",
          date: invoiceDate,
          paymentNumber: "-",
          reference: "-",
          paymentMode: "Cash",
          amount: paymentMadeAmount,
          balance: balanceDue,
        },
      ];
    }

    return [];
  }, [balanceDue, invoiceDate, paymentMadeAmount, paymentRecords, showPaymentsSummary]);
  const ribbonLabel =
    isFullyPaidStatus ? "Paid" :
    isPartiallyPaidStatus ? "Partially Paid" :
    statusLabel === "SENT" ? "Sent" :
    statusLabel === "DRAFT" ? "Draft" :
    statusLabel === "VOID" ? "Void" :
    statusLabel;
  const ribbonBgClass =
    statusLabel === "VOID" ? "bg-[#3f4348]" :
    isFullyPaidStatus ? "bg-[#22c55e]" :
    isPartiallyPaidStatus ? "bg-[#f59e0b]" :
    "bg-[#2f8edb]";

  useEffect(() => {
    if (!invoice) return;
    const invoiceId = String((invoice as any)?.id || (invoice as any)?._id || id || "");
    if (!invoiceId) return;

    const currentStatus = toStatusKey(deriveRetainerFinancialState(invoice).status);
    const shouldBePaid = paymentMadeAmount > 0 && balanceDue <= 0;
    if (!shouldBePaid || currentStatus === "paid" || currentStatus === "void") return;

    let cancelled = false;
    const syncPaidStatus = async () => {
      try {
        await updateInvoice(invoiceId, { status: "paid" } as Partial<Invoice>);
        if (cancelled) return;
        setInvoice((prev) => (prev ? { ...prev, status: "paid" } : prev));
      } catch (error) {
        console.error("Failed to sync retainer invoice status to paid:", error);
      }
    };

    void syncPaidStatus();
    return () => {
      cancelled = true;
    };
  }, [balanceDue, id, invoice, paymentMadeAmount]);

  useEffect(() => {
    if (showPaymentsSummary) setIsPaymentsReceivedOpen(true);
  }, [showPaymentsSummary]);
  const emailRecipient = String(
    (invoice as any)?.customerEmail ||
      (invoice as any)?.customer?.email ||
      (invoice as any)?.organizationEmail ||
      "-"
  );
  const associatedTags = Array.isArray((invoice as any)?.reportingTags) ? (invoice as any).reportingTags : [];
  const normalizedAssociatedTags = useMemo(() => {
    return associatedTags
      .map((tag: any) => {
        const key = String(
          tag?.tagName ||
            tag?.name ||
            tag?.label ||
            tag?.displayName ||
            tag?.tag ||
            ""
        ).trim();
        const value = String(tag?.value || tag?.option || tag?.selectedOption || "").trim();
        return {
          key,
          value,
          text: [key, value].filter(Boolean).join(": "),
        };
      })
      .filter((row) => row.key || row.value || row.text);
  }, [associatedTags]);

  const escapeHtml = (value: any) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const toMoney = (value: any) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const buildCurrentInvoicePrintDocument = () => {
    const invoiceAny: any = invoice || {};
    const printRows =
      items.length > 0
        ? items.map((row) => ({
            id: row.id,
            description: row.description || "-",
            amount: row.amount || 0,
          }))
        : [{ id: 1, description: String((invoiceAny?.reference || invoiceAny?.orderNumber || "-")), amount: Number(total || 0) }];

    const itemRowsMarkup = printRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.id)}</td>
            <td>${escapeHtml(row.description)}</td>
            <td class="align-right">${escapeHtml(toMoney(row.amount))}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Retainer Invoice</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #334155; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-page { width: 100%; min-height: 273mm; border: 1px solid #d6d9e3; max-width: 910px; margin: 0 auto; padding: 32px 32px 40px; }
            .top-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 20px 0 32px; }
            .org-meta { padding-top: 32px; padding-left: 56px; line-height: 1.35; font-size: 13px; color: #475569; }
            .org-meta .org-name { font-size: 14px; font-weight: 600; color: #334155; }
            .doc-meta { text-align: right; color: #0f172a; }
            .doc-meta h1 { margin: 0; font-size: 20px; letter-spacing: 0.03em; font-weight: 500; line-height: 1.1; white-space: nowrap; }
            .retainer-number { margin-top: 8px; font-size: 14px; }
            .retainer-number strong { font-weight: 600; }
            .balance-label { margin-top: 16px; font-size: 14px; }
            .balance-amount { margin-top: 2px; font-size: 20px; font-weight: 600; line-height: 1.1; }
            .bill-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
            .bill-row .label { font-size: 13px; color: #475569; margin-bottom: 2px; }
            .bill-row .value { font-size: 13px; font-weight: 600; color: #2f66b3; line-height: 1.1; }
            .invoice-date { font-size: 13px; color: #334155; padding-top: 16px; }
            .line-table-wrap { border: 1px solid #d6d9e3; margin-top: 8px; }
            .line-table { width: 100%; border-collapse: collapse; font-size: 14px; }
            .line-table thead tr { background: #2f343a; color: #fff; }
            .line-table th { text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; }
            .line-table td { padding: 8px 12px; border-top: 1px solid #f3f4f6; color: #334155; vertical-align: top; }
            .line-table th:first-child, .line-table td:first-child { width: 60px; }
            .align-right { text-align: right; }
            .totals { width: 340px; margin-left: auto; margin-top: 24px; font-size: 14px; color: #1e293b; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
            .totals-row.total { font-weight: 600; }
            .totals-row.due { background: #f3f4f6; padding: 8px 8px; margin-top: 8px; font-weight: 600; }
            .payment-options { margin-top: 40px; font-size: 14px; color: #334155; display: inline-flex; align-items: center; gap: 10px; }
            .payment-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 18px; border: 1px solid #a3a3a3; font-size: 11px; color: #525252; }
          </style>
        </head>
        <body>
          <section class="invoice-page">
            <div class="top-row">
              <div class="org-meta">
                <div class="org-name">${escapeHtml(String((invoice as any)?.organizationName || "asddc"))}</div>
                <div>${escapeHtml(String((invoice as any)?.organizationCountry || "Algeria"))}</div>
                <div>${escapeHtml(String((invoice as any)?.organizationEmail || "ladiiif520@gmail.com"))}</div>
              </div>
              <div class="doc-meta">
                <h1>RETAINER INVOICE</h1>
                <div class="retainer-number">Retainer# <strong>${escapeHtml(String((invoice as any)?.invoiceNumber || "-"))}</strong></div>
                <div class="balance-label">Balance Due</div>
                <div class="balance-amount">${escapeHtml(currencyPrefix)}${escapeHtml(toMoney(balanceDue))}</div>
              </div>
            </div>

            <div class="bill-row">
              <div>
                <div class="label">Bill To</div>
                <div class="value">${escapeHtml(String(getCustomerDisplayName(invoice) || "-"))}</div>
              </div>
              <div class="invoice-date">Retainer Date : ${escapeHtml(invoiceDate)}</div>
            </div>

            <div class="line-table-wrap">
              <table class="line-table">
                <thead>
                  <tr><th>#</th><th>Description</th><th class="align-right">Amount</th></tr>
                </thead>
                <tbody>${itemRowsMarkup}</tbody>
              </table>
            </div>

            <div class="totals">
              <div class="totals-row"><span>Sub Total</span><span>${escapeHtml(toMoney(subtotal))}</span></div>
              <div class="totals-row"><span>Tax</span><span>${escapeHtml(toMoney(tax))}</span></div>
              <div class="totals-row total"><span>Total</span><span>${escapeHtml(currencyPrefix)}${escapeHtml(toMoney(total))}</span></div>
              <div class="totals-row due"><span>Balance Due</span><span>${escapeHtml(currencyPrefix)}${escapeHtml(toMoney(balanceDue))}</span></div>
            </div>

            <div class="payment-options">Payment Options <span class="payment-icon">[]</span></div>
          </section>
        </body>
      </html>
    `;
  };

  const downloadCurrentInvoicePdf = async () => {
    if (!invoice) return;
    const paper = invoicePaperRef.current;
    if (!paper) return;

    const canvas = await html2canvas(paper, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgRatio = canvas.width / canvas.height;
    const pageRatio = pageWidth / pageHeight;

    let renderWidth = pageWidth;
    let renderHeight = pageHeight;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > pageRatio) {
      renderHeight = pageWidth / imgRatio;
      offsetY = (pageHeight - renderHeight) / 2;
    } else {
      renderWidth = pageHeight * imgRatio;
      offsetX = (pageWidth - renderWidth) / 2;
    }

    pdf.addImage(imgData, "PNG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");
    pdf.save(`${String((invoice as any)?.invoiceNumber || "retainer-invoice")}.pdf`);
  };

  const handleCloneCurrentInvoice = async () => {
    if (!invoice || detailActionLoading) return;
    try {
      setDetailActionLoading("clone");
      const source: any = invoice;
      const sourceCustomerId = source.customer?._id || source.customer?.id || source.customerId || source.customer || "";
      if (!sourceCustomerId) {
        toast.error("Cannot clone this retainer invoice because it has no customer.");
        return;
      }
      const sourceItems = Array.isArray(source.items) ? source.items : [];
      const existingRetainerNumbers = new Set(
        retainers.map((row) => String(row.invoiceNumber || "").toUpperCase())
      );
      const initialNumber = getNextRetainerNumber(retainers);
      const clonePayload: any = {
        invoiceNumber: initialNumber,
        customer: sourceCustomerId,
        customerId: sourceCustomerId,
        customerName: String(source.customerName || source.customer?.displayName || source.customer?.name || ""),
        date: source.date || source.invoiceDate || new Date().toISOString().slice(0, 10),
        invoiceDate: source.invoiceDate || source.date || new Date().toISOString().slice(0, 10),
        dueDate: source.dueDate || source.invoiceDate || source.date || new Date().toISOString().slice(0, 10),
        status: "draft",
        items: sourceItems.map((item: any) => ({
          name: item?.name || item?.description || "Item",
          description: item?.description || item?.name || "",
          quantity: Number(item?.quantity ?? 1) || 1,
          unitPrice: Number(item?.unitPrice ?? item?.rate ?? item?.amount ?? 0) || 0,
          taxRate: Number(item?.taxRate ?? 0) || 0,
          taxAmount: Number(item?.taxAmount ?? item?.tax ?? 0) || 0,
          total: Number(item?.total ?? item?.amount ?? 0) || 0,
        })),
        subtotal: Number(source.subtotal ?? source.subTotal ?? 0) || 0,
        subTotal: Number(source.subTotal ?? source.subtotal ?? 0) || 0,
        tax: Number(source.tax ?? source.taxAmount ?? 0) || 0,
        taxAmount: Number(source.taxAmount ?? source.tax ?? 0) || 0,
        total: Number(source.total ?? source.amount ?? 0) || 0,
        amount: Number(source.amount ?? source.total ?? 0) || 0,
        balanceDue: Number(source.total ?? source.amount ?? 0) || 0,
        balance: Number(source.total ?? source.amount ?? 0) || 0,
        notes: source.notes || source.customerNotes || "",
        customerNotes: source.customerNotes || source.notes || "",
        terms: source.terms || source.termsAndConditions || "",
        termsAndConditions: source.termsAndConditions || source.terms || "",
        orderNumber: source.orderNumber || source.reference || "",
        paymentTerms: source.paymentTerms || "Due on Receipt",
        currency: source.currency || "USD",
        taxExclusive: source.taxExclusive || "Tax Exclusive",
        location: source.location || source.selectedLocation || "Head Office",
        selectedLocation: source.selectedLocation || source.location || "Head Office",
        reportingTags: Array.isArray(source.reportingTags) ? source.reportingTags : [],
        attachedFiles: [],
        documents: [],
        comments: [],
      };
      let created: any;
      try {
        created = await saveInvoice(clonePayload);
      } catch (error: any) {
        if (!isDuplicateInvoiceNumberError(error)) throw error;
        let retryFloor = 1;
        for (const code of existingRetainerNumbers) {
          const match = code.match(/^RET-(\d+)$/);
          if (!match) continue;
          const parsed = Number.parseInt(match[1], 10);
          if (Number.isFinite(parsed)) retryFloor = Math.max(retryFloor, parsed + 1);
        }
        const retryPayload = { ...clonePayload, invoiceNumber: getNextRetainerNumber(retainers, retryFloor) };
        created = await saveInvoice(retryPayload);
      }
      const nextId = String((created as any)?.id || (created as any)?._id || "");
      setIsDetailActionsMenuOpen(false);
      setReloadTick((v) => v + 1);
      sessionStorage.setItem(RETAINER_FLASH_SUCCESS_KEY, "Retainer invoice cloned successfully.");
      if (nextId) {
        navigate(`/sales/retainer-invoices/${nextId}`);
      } else {
        ensureRetainerListAllView();
        navigate("/sales/retainer-invoices");
      }
    } catch (error) {
      console.error("Failed to clone retainer invoice:", error);
      toast.error("Failed to clone retainer invoice");
    } finally {
      setDetailActionLoading(null);
    }
  };

  const handleVoidCurrentInvoice = async () => {
    if (!invoice || detailActionLoading) return;
    const status = String((invoice as any)?.status || "").toLowerCase();
    if (status === "void") {
      toast("Invoice is already void");
      return;
    }
    const reason = voidReason.trim();
    if (!reason) {
      toast.error("Please enter a reason for marking this transaction as void.");
      return;
    }
    try {
      setDetailActionLoading("void");
      const invoiceId = String((invoice as any).id || (invoice as any)._id || id || "");
      if (!invoiceId) return;
      await updateInvoice(invoiceId, { status: "void", voidReason: reason } as Partial<Invoice>);
      setInvoice((prev) => (prev ? { ...prev, status: "void" } : prev));
      setIsVoidModalOpen(false);
      setVoidReason("");
      setIsDetailActionsMenuOpen(false);
      setReloadTick((v) => v + 1);
      toast.success("Retainer invoice marked as void");
    } catch (error) {
      console.error("Failed to void retainer invoice:", error);
      toast.error("Failed to void retainer invoice");
    } finally {
      setDetailActionLoading(null);
    }
  };

  const openVoidModal = () => {
    if (!invoice || detailActionLoading) return;
    const status = String((invoice as any)?.status || "").toLowerCase();
    if (status === "void") {
      toast("Invoice is already void");
      return;
    }
    setIsDetailActionsMenuOpen(false);
    setVoidReason("");
    setIsVoidModalOpen(true);
  };

  const handleDeleteCurrentInvoice = async () => {
    if (!invoice || detailActionLoading) return;
    if (!window.confirm("Delete this retainer invoice? This cannot be undone.")) return;
    try {
      setDetailActionLoading("delete");
      const invoiceId = String((invoice as any).id || (invoice as any)._id || id || "");
      if (!invoiceId) return;
      await deleteInvoice(invoiceId);
      setIsDetailActionsMenuOpen(false);
      toast.success("Retainer invoice deleted");
      ensureRetainerListAllView();
      navigate("/sales/retainer-invoices");
    } catch (error) {
      console.error("Failed to delete retainer invoice:", error);
      toast.error("Failed to delete retainer invoice");
    } finally {
      setDetailActionLoading(null);
    }
  };

  const handleConvertToDraft = async () => {
    if (!invoice) return;
    const invoiceId = String((invoice as any).id || (invoice as any)._id || id || "");
    if (!invoiceId) return;
    try {
      await updateInvoice(invoiceId, { status: "draft" } as Partial<Invoice>);
      setInvoice((prev) => (prev ? { ...prev, status: "draft" } : prev));
      setReloadTick((v) => v + 1);
      toast.success("Retainer invoice converted to draft");
    } catch (error) {
      console.error("Failed to convert retainer invoice to draft:", error);
      toast.error("Failed to convert retainer invoice to draft");
    }
  };

  const handleMarkAsSent = async () => {
    if (!invoice || detailActionLoading) return;
    const invoiceId = String((invoice as any).id || (invoice as any)._id || id || "");
    if (!invoiceId) return;
    try {
      setDetailActionLoading("sent");
      await updateInvoice(invoiceId, { status: "sent" } as Partial<Invoice>);
      setInvoice((prev) => (prev ? { ...prev, status: "sent" } : prev));
      setIsDetailActionsMenuOpen(false);
      setReloadTick((v) => v + 1);
      toast.success("Retainer invoice marked as sent");
    } catch (error) {
      console.error("Failed to mark retainer invoice as sent:", error);
      toast.error("Failed to mark retainer invoice as sent");
    } finally {
      setDetailActionLoading(null);
    }
  };

  const handleSendEmailSubmit = async () => {
    if (!emailData.to.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    if (!emailData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    const sentComment: RetainerComment = {
      id: `comment-${Date.now()}`,
      text: `Retainer Invoice emailed to ${emailData.to.trim()}`,
      author: emailData.fromName || "User",
      timestamp: new Date().toISOString(),
    };
    const nextComments = [...comments, sentComment];
    setComments(nextComments);
    try {
      await persistInvoicePatch({ comments: nextComments });
      setIsSendEmailModalOpen(false);
      toast.success("Email sent successfully");
    } catch (error) {
      console.error("Failed to save sent-email activity:", error);
      toast.error("Email send logged failed");
    }
  };

  const printCurrentInvoice = () => {
    if (!invoice) return;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1200);
    };
    const html = buildCurrentInvoicePrintDocument();
    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }
      frameWindow.focus();
      window.setTimeout(() => {
        frameWindow.print();
        cleanup();
      }, 120);
    };
    iframe.srcdoc = html;
  };

  const navigateToRecordPaymentPage = () => {
    navigate("/payments/payments-received/new", {
      state: {
        source: "retainer-invoice",
        invoiceId: String((invoice as any)?.id || (invoice as any)?._id || id || ""),
        invoiceNumber: String((invoice as any)?.invoiceNumber || ""),
        customerId: String(
          (invoice as any)?.customer?._id ||
            (invoice as any)?.customer?.id ||
            (invoice as any)?.customerId ||
            ""
        ),
        customerName: String((invoice as any)?.customerName || ""),
        amountDue: Number((invoice as any)?.balance ?? (invoice as any)?.balanceDue ?? total ?? 0) || 0,
        totalAmount: Number((invoice as any)?.total ?? (invoice as any)?.amount ?? total ?? 0) || 0,
        currency: String((invoice as any)?.currency || "USD"),
        location: String((invoice as any)?.location || (invoice as any)?.selectedLocation || "Head Office"),
      },
    });
  };

  const handleRecordPaymentClick = () => {
    const currentStatus = toStatusKey(deriveRetainerFinancialState(invoice).status);
    if (currentStatus === "draft" && !disableDraftRecordPaymentWarning) {
      setDontShowDraftRecordPaymentAgain(false);
      setIsDraftRecordPaymentModalOpen(true);
      return;
    }
    navigateToRecordPaymentPage();
  };

  const confirmDraftRecordPayment = async () => {
    if (!invoice) return;
    try {
      setDraftRecordPaymentLoading(true);

      if (dontShowDraftRecordPaymentAgain) {
        localStorage.setItem(RETAINER_DRAFT_RECORD_PAYMENT_WARNING_KEY, "1");
        setDisableDraftRecordPaymentWarning(true);
      }

      setIsDraftRecordPaymentModalOpen(false);
      navigateToRecordPaymentPage();
    } catch (error) {
      console.error("Failed to update retainer invoice before recording payment:", error);
      toast.error("Failed to continue to record payment");
    } finally {
      setDraftRecordPaymentLoading(false);
    }
  };
  const normalizedSelectedView = selectedView.toLowerCase();
  const filteredRetainers = useMemo(() => {
    const byView =
      normalizedSelectedView === "all"
        ? retainers
        : retainers.filter((row) => row.status.toLowerCase().replace(/\s+/g, "_") === normalizedSelectedView);

    const list = [...byView];
    switch (sortKey) {
      case "created_asc":
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "retainer_asc":
        list.sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
        break;
      case "retainer_desc":
        list.sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
        break;
      case "customer_asc":
        list.sort((a, b) => a.customerName.localeCompare(b.customerName));
        break;
      case "customer_desc":
        list.sort((a, b) => b.customerName.localeCompare(a.customerName));
        break;
      case "amount_desc":
        list.sort((a, b) => b.amount - a.amount);
        break;
      case "amount_asc":
        list.sort((a, b) => a.amount - b.amount);
        break;
      case "balance_desc":
      case "balance_asc":
        list.sort((a, b) => (sortKey === "balance_desc" ? b.amount - a.amount : a.amount - b.amount));
        break;
      case "created_desc":
      default:
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }
    return list;
  }, [retainers, normalizedSelectedView, sortKey]);

  const viewOptionsFiltered = useMemo(() => {
    const term = viewSearchTerm.trim().toLowerCase();
    if (!term) return VIEW_OPTIONS;
    return VIEW_OPTIONS.filter((option) => option.label.toLowerCase().includes(term));
  }, [viewSearchTerm]);

  const selectedCount = selectedRetainerIds.size;
  const allVisibleSelected = filteredRetainers.length > 0 && filteredRetainers.every((row) => selectedRetainerIds.has(row.id));

  const toggleRowSelection = (rowId: string) => {
    setSelectedRetainerIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedRetainerIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredRetainers.forEach((row) => next.delete(row.id));
      } else {
        filteredRetainers.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRetainerIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((retainerId) => deleteInvoice(retainerId)));
      setSelectedRetainerIds(new Set());
      setIsBulkActionsOpen(false);
      setReloadTick((v) => v + 1);
      if (id && ids.includes(String(id))) {
        ensureRetainerListAllView();
        navigate("/sales/retainer-invoices");
      }
    } catch (error) {
      console.error("Failed to delete selected retainers:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-52px)] min-h-0 bg-[#f2f3f8] flex overflow-hidden">
      <div className="w-[320px] border-r border-[#d6d9e3] bg-white h-full flex flex-col">
        <div className="h-[58px] px-3 border-b border-[#d6d9e3] flex items-center justify-between shrink-0">
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => setIsViewMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[17px] font-semibold text-slate-900 min-w-0 max-w-[205px] leading-[1]"
            >
              <span className="truncate">
                {VIEW_OPTIONS.find((option) => option.key === selectedView)?.label || "All Retainer Invoices"}
              </span>
              <ChevronDown size={13} className="text-[#116275] shrink-0" />
            </button>
            {isViewMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-[262px] rounded-md border border-[#d6d9e3] bg-white shadow-xl z-50">
                <div className="p-2 border-b border-[#eceff5]">
                  <div className="h-9 rounded border border-[#d4d9e6] px-2 flex items-center gap-2">
                    <Search size={14} className="text-[#94a3b8]" />
                    <input
                      value={viewSearchTerm}
                      onChange={(e) => setViewSearchTerm(e.target.value)}
                      placeholder="Search"
                      className="w-full bg-transparent border-none outline-none text-[13px] text-slate-700"
                    />
                  </div>
                </div>
                <div className="max-h-[320px] overflow-auto py-1">
                  {viewOptionsFiltered.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSelectedView(option.key);
                        setIsViewMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-[14px] flex items-center justify-between ${
                        selectedView === option.key ? "text-[#0f5f73] font-semibold" : "text-slate-700"
                      } hover:bg-[#f6f8fc]`}
                    >
                      <span>{option.label}</span>
                      <Star size={13} className="text-[#b3bccd]" />
                    </button>
                  ))}
                </div>
                <button className="w-full border-t border-[#eceff5] text-left px-4 py-2.5 text-[14px] text-[#2563eb] hover:bg-[#f6f8fc]">
                  + New Custom View
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/sales/retainer-invoices/new")}
              className="text-white h-8 w-8 rounded-md text-lg inline-flex items-center justify-center"
              style={{ backgroundColor: accentColor }}
              aria-label="New retainer"
            >
              +
            </button>
            <div className="relative" ref={headerMoreMenuRef}>
              <button
                onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
                className="h-8 w-8 border border-gray-300 rounded-md text-slate-600 inline-flex items-center justify-center bg-[#f8fafc]"
              >
                <MoreHorizontal size={15} />
              </button>
              {isHeaderMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-[210px] rounded-md border border-[#d6d9e3] bg-white shadow-xl z-50 overflow-hidden">
                  <div className="relative">
                    <button
                      onMouseEnter={() => setIsSortSubMenuOpen(true)}
                      className="w-full text-left px-3 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center justify-between"
                    >
                      <span className="inline-flex items-center gap-2"><ArrowUpDown size={14} /> Sort by</span>
                      <ChevronRight size={14} />
                    </button>
                    {isSortSubMenuOpen && (
                      <div className="absolute left-[-185px] top-0 w-[185px] rounded-md border border-[#d6d9e3] bg-white shadow-xl z-[60] overflow-hidden">
                        <button onClick={() => { setSortKey("created_desc"); setIsHeaderMoreMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]">Created Time (Newest)</button>
                        <button onClick={() => { setSortKey("created_asc"); setIsHeaderMoreMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]">Created Time (Oldest)</button>
                        <button onClick={() => { setSortKey("retainer_asc"); setIsHeaderMoreMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]">Retainer # (A-Z)</button>
                        <button onClick={() => { setSortKey("retainer_desc"); setIsHeaderMoreMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]">Retainer # (Z-A)</button>
                        <button onClick={() => { setSortKey("customer_asc"); setIsHeaderMoreMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]">Customer Name (A-Z)</button>
                        <button onClick={() => { setSortKey("customer_desc"); setIsHeaderMoreMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]">Customer Name (Z-A)</button>
                        <button onClick={() => { setSortKey("amount_desc"); setIsHeaderMoreMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]">Amount (High-Low)</button>
                        <button onClick={() => { setSortKey("amount_asc"); setIsHeaderMoreMenuOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]">Amount (Low-High)</button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsHeaderMoreMenuOpen(false);
                      navigate("/sales/retainer-invoices/import");
                    }}
                    className="w-full text-left px-3 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2 border-t border-[#eef1f6]"
                  >
                    <Upload size={14} /> Import Retainer Invoices
                  </button>

                  <div className="relative border-t border-[#eef1f6]">
                    <button
                      onMouseEnter={() => setIsExportSubMenuOpen(true)}
                      className="w-full text-left px-3 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center justify-between"
                    >
                      <span className="inline-flex items-center gap-2"><Download size={14} /> Export</span>
                      <ChevronRight size={14} />
                    </button>
                    {isExportSubMenuOpen && (
                      <div className="absolute left-[-205px] top-0 w-[205px] rounded-md border border-[#d6d9e3] bg-white shadow-xl z-[60] overflow-hidden">
                        <button
                          onClick={() => {
                            setIsHeaderMoreMenuOpen(false);
                            const csv = ["Retainer #,Customer,Date,Amount,Status", ...filteredRetainers.map(r => `"${r.invoiceNumber}","${r.customerName}","${r.date}","${r.amount}","${r.status}"`)].join("\n");
                            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "retainer-invoices.csv";
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f8fc]"
                        >
                          Export Retainer Invoices
                        </button>
                      </div>
                    )}
                  </div>

                  <button className="w-full text-left px-3 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2 border-t border-[#eef1f6]">
                    <Settings size={14} /> Preferences
                  </button>
                  <button className="w-full text-left px-3 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] border-t border-[#eef1f6]">
                    Manage Custom Fields
                  </button>
                  <button
                    onClick={() => { setReloadTick((v) => v + 1); setIsHeaderMoreMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2 border-t border-[#eef1f6]"
                  >
                    <RefreshCw size={14} /> Refresh List
                  </button>
                  <button className="w-full text-left px-3 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2 border-t border-[#eef1f6]">
                    <RotateCcw size={14} /> Reset Column Width
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {selectedCount > 0 && (
            <div className="px-2 py-2 border-b border-[#e7eaf1] bg-white sticky top-0 z-20">
              <div className="h-10 rounded border border-[#d9deea] px-2 flex items-center gap-2">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} className="accent-[#3b82f6]" />
                <div className="relative" ref={bulkMenuRef}>
                  <button
                    onClick={() => setIsBulkActionsOpen((prev) => !prev)}
                    className="h-8 px-3 rounded border border-[#cfd5e2] bg-white text-[13px] inline-flex items-center gap-1"
                  >
                    Bulk Actions <ChevronDown size={12} />
                  </button>
                  {isBulkActionsOpen && (
                    <div className="absolute left-0 top-full mt-1 w-[188px] rounded-md border border-[#d6d9e3] bg-white shadow-xl z-30 overflow-hidden">
                      <button
                        className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2"
                        onClick={() => {
                          setIsBulkActionsOpen(false);
                          void downloadCurrentInvoicePdf();
                        }}
                      >
                        <Download size={14} /> Export as PDF
                      </button>
                      <button
                        className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2 border-t border-[#eef1f6]"
                        onClick={() => {
                          setIsBulkActionsOpen(false);
                          printCurrentInvoice();
                        }}
                      >
                        <Printer size={14} /> Print
                      </button>
                      <button
                        className="w-full text-left px-4 py-2.5 text-[14px] text-red-600 hover:bg-[#fff5f5] inline-flex items-center gap-2 border-t border-[#eef1f6]"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="h-5 w-px bg-[#d9dde7]" />
                <span className="h-7 min-w-7 px-2 rounded-full bg-[#e9f0ff] text-[#386ecf] text-[13px] inline-flex items-center justify-center">{selectedCount}</span>
                <span className="text-[13px] text-slate-700">Selected</span>
                <button
                  className="ml-auto text-red-500 text-[20px] leading-none"
                  onClick={() => setSelectedRetainerIds(new Set())}
                  aria-label="Clear selected"
                >
                  Ã—
                </button>
              </div>
            </div>
          )}

          {filteredRetainers.map((row) => {
            const active = String(row.id) === String(id || "");
            const checked = selectedRetainerIds.has(row.id);
            return (
              <button
                key={row.id}
                onClick={() => navigate(`/sales/retainer-invoices/${row.id}`)}
                className={`w-full text-left px-3 py-3 border-b border-[#e7eaf1] ${active ? "bg-[#eceef7]" : "bg-white hover:bg-gray-50"}`}
              >
                <div className="flex items-start gap-2">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRowSelection(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-[#3b82f6]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[15px] text-slate-900 truncate leading-[1.05]">{row.customerName}</div>
                      <div className="text-[16px] text-[#1a2d5f] whitespace-nowrap">{currencyPrefix}{formatMoney(row.amount)}</div>
                    </div>
                    <div className="mt-1 text-[13px] text-slate-600 leading-[1.1]">
                      {row.invoiceNumber} <span className="mx-1">.</span> {row.date}
                    </div>
                    <div className={`mt-1 text-[13px] uppercase tracking-wide inline-flex items-center gap-1 ${row.status === "SENT" ? "text-blue-600" : row.status === "DRAFT" ? "text-slate-500" : "text-slate-700"}`}>
                      <span>{row.status}</span>
                      {row.status === "SENT" && <Mail size={12} className="text-slate-500" />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {!loading && filteredRetainers.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-slate-500">No retainers found for this view.</div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 bg-[#f3f4f8]">
        <div className="sticky top-0 z-20">
          <div className="h-[50px] border-b border-[#d6d9e3] bg-white px-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] text-[#64748b] leading-tight">Location: {locationText}</div>
            <div className="text-[24px] leading-[1] text-[#0f172a] font-semibold">{String((invoice as any)?.invoiceNumber || "-")}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={attachmentsDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAttachmentsDropdownOpen((prev) => !prev)}
              className="h-8 min-w-8 px-2 rounded-[6px] border border-[#cfd5e2] bg-[#f8fafc] text-[12px] text-[#516174] inline-flex items-center justify-center gap-1 hover:bg-white"
              title="Attachments"
            >
              <AttachmentIcon />
              <span>{attachments.length}</span>
            </button>
              {isAttachmentsDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Attachments</span>
                    <button
                      className="p-1 text-gray-500 hover:text-gray-700"
                      onClick={() => setIsAttachmentsDropdownOpen(false)}
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {attachments.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-gray-500">No attachments</div>
                    ) : (
                      attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md group">
                          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-md text-gray-600">
                            <FileText size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-gray-900 truncate">{attachment.name}</span>
                            <span className="block text-xs text-gray-500">File Size: {attachment.size}</span>
                          </div>
                          <button
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              void handleRemoveAttachment(attachment.id);
                            }}
                            title="Remove attachment"
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleAttachmentUpload}
                      multiple
                      className="hidden"
                    />
                    <button
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium hover:opacity-90"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <Upload size={16} />
                      Upload your Files
                      <ChevronDown size={15} />
                    </button>
                  </div>
                  <p className="px-4 pb-4 text-xs text-gray-500">You can upload a maximum of 10 files, 10MB each</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsCommentsPanelOpen(true)}
              className="h-8 w-8 rounded-[6px] border border-[#cfd5e2] bg-[#f8fafc] text-[#516174] inline-flex items-center justify-center hover:bg-white"
              title="Comments"
            >
              <MessageSquare size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                ensureRetainerListAllView();
                navigate("/sales/retainer-invoices");
              }}
              className="h-8 w-8 rounded-[6px] border border-[#cfd5e2] bg-white text-[#ef4444] inline-flex items-center justify-center hover:bg-[#fff5f5]"
            >
              <X size={15} />
            </button>
          </div>
          </div>

          <div className="h-8 border-b border-[#d6d9e3] bg-[#f7f8fc] px-4 flex items-center gap-2 text-[12px] text-[#475569]">
          {!isVoidStatus && (
            <>
              <button
                onClick={() => navigate(`/sales/retainer-invoices/${id}/edit`)}
                className="inline-flex items-center gap-1 text-[#475569] hover:text-[#0f172a]"
              >
                <Edit size={14} /> Edit
              </button>
              <div className="h-5 w-px bg-[#d9dde7]" />
              <button
                onClick={() => navigate(`/sales/retainer-invoices/${id}/send-email`)}
                className="inline-flex items-center gap-1 text-[#475569] hover:text-[#0f172a]"
              >
                <Mail size={14} /> Send Email
              </button>
              <div className="h-5 w-px bg-[#d9dde7]" />
            </>
          )}
          <button
            onClick={() => {
              void downloadCurrentInvoicePdf();
            }}
            className="inline-flex items-center gap-1 text-[#475569] border border-[#cfd5e2] bg-white rounded px-2 py-0.5"
          >
            <FileText size={14} /> {isVoidStatus ? "PDF/Print" : "PDF"} {isVoidStatus && <ChevronDown size={12} />}
          </button>
          <div className="h-5 w-px bg-[#d9dde7]" />
          {isVoidStatus ? (
            <>
              <button
                onClick={() => {
                  void handleConvertToDraft();
                }}
                className="inline-flex items-center gap-1 text-[#475569] hover:text-[#0f172a]"
              >
                <RotateCcw size={14} /> Convert to Draft
              </button>
              <div className="h-5 w-px bg-[#d9dde7]" />
            </>
          ) : isFullyPaidStatus ? null : (
            <>
              <div className="relative" ref={paymentMenuRef}>
                <button
                  onClick={() => setIsRecordPaymentMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[#475569] border border-[#cfd5e2] bg-white rounded px-1.5 py-0.5"
                >
                  <Banknote size={14} /> Record Payment <ChevronDown size={12} />
                </button>
                {isRecordPaymentMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-[156px] rounded-md border border-[#d6d9e3] bg-white shadow-xl z-40 overflow-hidden">
                    <button
                      className="w-full text-left px-3 py-2 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2"
                      onClick={() => {
                        setIsRecordPaymentMenuOpen(false);
                        handleRecordPaymentClick();
                      }}
                    >
                      <Banknote size={14} /> Record Payment
                    </button>
                  </div>
                )}
              </div>
              <div className="h-5 w-px bg-[#d9dde7]" />
            </>
          )}
          <div className="relative" ref={detailActionsMenuRef}>
            <button
              type="button"
              onClick={() => setIsDetailActionsMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[#475569] hover:text-[#0f172a]"
            >
              <MoreHorizontal size={14} />
            </button>
            {isDetailActionsMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-[168px] rounded-md border border-[#d6d9e3] bg-white shadow-xl z-40 overflow-hidden">
                {isDraftStatus && (
                  <button
                    type="button"
                    disabled={detailActionLoading !== null}
                    onClick={() => {
                      void handleMarkAsSent();
                    }}
                    className="w-full text-left px-3 py-2 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Mail size={14} /> {detailActionLoading === "sent" ? "Marking..." : "Mark As Sent"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={detailActionLoading !== null}
                  onClick={() => {
                    void handleCloneCurrentInvoice();
                  }}
                  className={`w-full text-left px-3 py-2 text-[14px] text-slate-700 hover:bg-[#f6f8fc] inline-flex items-center gap-2 disabled:opacity-50 ${
                    isDraftStatus ? "border-t border-[#eef1f6]" : ""
                  }`}
                >
                  <Copy size={14} /> {detailActionLoading === "clone" ? "Cloning..." : "Clone"}
                </button>
                <button
                  type="button"
                  disabled={detailActionLoading !== null}
                  onClick={() => {
                    if (isVoidStatus) return;
                    openVoidModal();
                  }}
                  className={`w-full text-left px-3 py-2 text-[14px] text-slate-700 inline-flex items-center gap-2 border-t border-[#eef1f6] disabled:opacity-50 ${
                    isVoidStatus ? "hidden" : "hover:bg-[#f6f8fc]"
                  }`}
                >
                  <Ban size={14} /> {detailActionLoading === "void" ? "Voiding..." : "Void"}
                </button>
                <button
                  type="button"
                  disabled={detailActionLoading !== null}
                  onClick={() => {
                    void handleDeleteCurrentInvoice();
                  }}
                  className="w-full text-left px-3 py-2 text-[14px] text-slate-700 hover:bg-[#fff5f5] inline-flex items-center gap-2 border-t border-[#eef1f6] disabled:opacity-50"
                >
                  <Trash2 size={14} /> {detailActionLoading === "delete" ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {loading ? (
            <div className="text-slate-500">Loading...</div>
          ) : !invoice ? (
            <div className="text-slate-500">Retainer invoice not found.</div>
          ) : (
            <div>
              {showPaymentsSummary && (
                <div className="max-w-[1340px] mx-auto mb-4">
                  <div className="w-full rounded border border-[#d6d9e3] bg-white">
                    <button
                      type="button"
                      onClick={() => setIsPaymentsReceivedOpen((prev) => !prev)}
                      className="w-full px-4 py-3 inline-flex items-center justify-between text-left"
                    >
                      <div className="inline-flex items-center gap-1 text-[30px] text-[#1f2937]">
                        <span className="font-semibold">Payments Received</span>
                        <span className="text-[#3b82f6]">{paymentsReceivedCount}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-[#64748b] transition-transform ${isPaymentsReceivedOpen ? "rotate-0" : "-rotate-90"}`}
                      />
                    </button>
                    {isPaymentsReceivedOpen && (
                      <div className="px-4 pb-4">
                        <div className="overflow-x-auto rounded border border-[#e5e7eb]">
                          <table className="w-full text-[14px] text-[#334155]">
                            <thead>
                              <tr className="bg-white border-b border-[#e5e7eb] text-[#4b5563]">
                                <th className="text-left font-semibold px-3 py-2.5">Date</th>
                                <th className="text-left font-semibold px-3 py-2.5">Payment #</th>
                                <th className="text-left font-semibold px-3 py-2.5">Reference#</th>
                                <th className="text-left font-semibold px-3 py-2.5">Payment Mode</th>
                                <th className="text-left font-semibold px-3 py-2.5">Amount</th>
                                <th className="text-left font-semibold px-3 py-2.5">Balance</th>
                                <th className="text-right font-semibold px-3 py-2.5"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentTableRows.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-3 py-3 text-slate-500">No payment records found.</td>
                                </tr>
                              ) : (
                                paymentTableRows.map((row) => (
                                  <tr key={row.id} className="border-b border-[#eef2f7] last:border-b-0">
                                    <td className="px-3 py-2.5">{row.date}</td>
                                    <td className="px-3 py-2.5 text-[#2563eb]">{row.paymentNumber}</td>
                                    <td className="px-3 py-2.5">{row.reference}</td>
                                    <td className="px-3 py-2.5">{row.paymentMode}</td>
                                    <td className="px-3 py-2.5">{currencyPrefix}{formatMoney(row.amount)}</td>
                                    <td className="px-3 py-2.5">{currencyPrefix}{formatMoney(row.balance)}</td>
                                    <td className="px-3 py-2.5 text-right">
                                      <div className="inline-flex items-center gap-2">
                                        <button
                                          type="button"
                                          className="px-3 py-1.5 rounded border border-[#d1d5db] text-[13px] text-[#374151] hover:bg-[#f8fafc]"
                                        >
                                          Apply to Invoices
                                        </button>
                                        <button
                                          type="button"
                                          className="h-7 w-7 inline-flex items-center justify-center rounded border border-[#d1d5db] text-[#374151] hover:bg-[#f8fafc]"
                                        >
                                          <MoreHorizontal size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="mb-2 px-1 max-w-[860px] mx-auto flex justify-end">
                <div className="text-[13px] text-[#556070]">Project Name: {projectName}</div>
              </div>

              <div
                ref={invoicePaperRef}
                className="relative bg-white border border-[#d6d9e3] rounded-sm shadow-[0_2px_8px_rgba(15,23,42,0.06)] w-full max-w-[860px] min-h-[1123px] mx-auto px-14 pt-10 pb-12 text-black"
              >
                <div className="absolute left-0 top-0 w-[84px] h-[84px] overflow-hidden pointer-events-none">
                  <div className={`absolute left-[-34px] top-[14px] w-[120px] h-[36px] ${ribbonBgClass} -rotate-45 shadow-sm`} />
                  <div className="absolute left-[8px] top-[29px] -rotate-45 text-white text-[13px] leading-none tracking-wide font-semibold">
                    {ribbonLabel}
                  </div>
                </div>
                <div className="flex justify-between mb-12 mt-5">
                  <div className="pl-10 pt-8">
                    <div className="text-[14px] text-slate-700 font-semibold">{String((invoice as any)?.organizationName || "asddc")}</div>
                    <div className="text-[13px] text-slate-600 mt-1">{String((invoice as any)?.organizationCountry || "Algeria")}</div>
                    <div className="text-[13px] text-slate-600 mt-0.5">{String((invoice as any)?.organizationEmail || "ladiiif520@gmail.com")}</div>
                  </div>
                  <div className="text-right min-w-[360px]">
                    <div className="text-[44px] leading-[0.95] tracking-[0.02em] text-black">RETAINER INVOICE</div>
                    <div className="text-[24px] mt-4 text-black">Retainer# <span className="font-semibold">{String((invoice as any)?.invoiceNumber || "-")}</span></div>
                    <div className="text-[15px] mt-8 text-black">Balance Due</div>
                    <div className="text-[46px] leading-[1.02] font-semibold text-black mt-1">{currencyPrefix}{formatMoney(balanceDue)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 mb-5 mt-8 items-end">
                  <div>
                    <div className="text-[13px] text-slate-600">Bill To</div>
                    <div className="text-[14px] font-semibold text-black mt-1">{String(getCustomerDisplayName(invoice) || "-")}</div>
                  </div>
                  <div className="justify-self-end grid grid-cols-[auto_auto] gap-x-8 text-[13px] text-slate-700">
                    <span>Retainer Date :</span>
                    <span>{invoiceDate}</span>
                    <span>Reference :</span>
                    <span>{String((invoice as any)?.reference || "-")}</span>
                  </div>
                </div>

                <div className="border border-[#d6d9e3]">
                  <div className="grid grid-cols-[60px_1fr_180px] bg-[#383b3c] text-white text-[13px] font-medium">
                    <div className="px-4 py-3">#</div>
                    <div className="px-4 py-3">Description</div>
                    <div className="px-4 py-3 text-right">Amount</div>
                  </div>
                  {items.length === 0 ? (
                    <div className="px-4 py-4 text-[13px] text-slate-500">No line items</div>
                  ) : (
                    items.map((row) => (
                      <div key={row.id} className="grid grid-cols-[60px_1fr_180px] border-t border-gray-100 text-[13px]">
                        <div className="px-4 py-3">{row.id}</div>
                        <div className="px-4 py-3">{row.description}</div>
                        <div className="px-4 py-3 text-right">{formatMoney(row.amount)}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-10 flex justify-end">
                  <div className="w-[360px] text-[13px] text-black">
                    <div className="flex justify-between py-2"><span>Sub Total</span><span>{formatMoney(subtotal)}</span></div>
                    <div className="flex justify-between py-2"><span>Tax</span><span>{formatMoney(tax)}</span></div>
                    <div className="flex justify-between py-2.5 font-semibold border-t border-[#e5e7eb] mt-1"><span>Total</span><span>{currencyPrefix}{formatMoney(total)}</span></div>
                    {paymentMadeAmount > 0 && (
                      <div className="flex justify-between py-2">
                        <span>Payment Made</span>
                        <span className="text-red-600">(-) {formatMoney(paymentMadeAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2.5 mt-3 bg-[#f3f4f6] px-3 font-semibold"><span>Balance Due</span><span>{currencyPrefix}{formatMoney(balanceDue)}</span></div>
                  </div>
                </div>

                <div className="mt-12 text-[14px] text-slate-700">Payment Options</div>

                {String((invoice as any)?.notes || "").trim() && (
                  <div className="mt-6 rounded border border-[#e5e7eb] bg-[#fafbfc] px-3 py-2">
                    <div className="text-sm font-medium mb-1">Customer Notes</div>
                    <div className="text-sm text-slate-600">{String((invoice as any).notes)}</div>
                  </div>
                )}
                {String((invoice as any)?.terms || "").trim() && (
                  <div className="mt-4 rounded border border-[#e5e7eb] bg-[#fafbfc] px-3 py-2">
                    <div className="text-sm font-medium mb-1">Terms & Conditions</div>
                    <div className="text-sm text-slate-600">{String((invoice as any).terms)}</div>
                  </div>
                )}
              </div>

              <div className="max-w-[794px] mx-auto mt-7 text-[14px] text-slate-700 bg-white border border-[#d6d9e3] px-4 py-4">
                <div className="px-1">
                  <h3 className="text-[16px] font-normal text-slate-900 mb-5">More Information</h3>
                  <div className="grid grid-cols-[220px_1fr] gap-4 mb-10">
                    <div className="text-[#5f78a8] inline-flex items-center gap-1 text-[12px]">
                      <span>Email Recipients</span>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#94a3b8] text-[11px] text-[#64748b]">i</span>
                    </div>
                    <div className="text-slate-900 text-[12px]">{emailRecipient}</div>
                  </div>
                </div>

                <div className="border-t border-[#d6d9e3] py-4 px-2">
                  <div className={`rounded-[8px] border ${isAssociatedTagsOpen ? "border-[#2563eb]" : "border-[#d6d9e3]"} overflow-hidden`}>
                    <button
                      type="button"
                      onClick={() => setIsAssociatedTagsOpen((prev) => !prev)}
                      className="w-full px-3 py-2.5 text-left inline-flex items-center gap-2 text-slate-900 bg-white"
                    >
                      <ChevronDown
                        size={14}
                        className={`text-slate-900 transition-transform ${isAssociatedTagsOpen ? "rotate-0" : "-rotate-90"}`}
                      />
                      <span className="text-[17px] leading-none">Associated Tags</span>
                    </button>

                    {isAssociatedTagsOpen && (
                      <div className="px-3 pb-3 pt-0.5 bg-white">
                        <div className="text-[13px] text-[#64748b]">At Transaction Level</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {normalizedAssociatedTags.length > 0 ? (
                            normalizedAssociatedTags.map((tag, index) => (
                              <span
                                key={`${tag.text}-${index}`}
                                className="inline-flex items-center rounded-md border border-[#cbd5e1] bg-[#f8fafc] px-2 py-0.5 text-[13px] text-[#475569]"
                              >
                                {tag.text}
                              </span>
                            ))
                          ) : (
                            <span className="text-[13px] text-slate-400">No associated tags</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isVoidModalOpen && (
        <div
          className="fixed inset-0 z-[130] bg-black/35 flex items-start justify-center pt-20"
          onClick={(e) => {
            if (e.target === e.currentTarget && detailActionLoading !== "void") {
              setIsVoidModalOpen(false);
              setVoidReason("");
            }
          }}
        >
          <div className="w-[96%] max-w-[620px] rounded-md border border-[#d6d9e3] bg-white shadow-2xl">
            <div className="px-5 pt-5 text-[14px] text-slate-700">
              Enter a reason for marking this transaction as Void.
            </div>
            <div className="px-5 pt-2">
              <textarea
                rows={4}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full resize-none rounded-md border border-[#9ec2f8] px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-[#9ec2f8]"
              />
            </div>
            <div className="px-5 py-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleVoidCurrentInvoice();
                }}
                disabled={detailActionLoading === "void"}
                className="px-3 py-1.5 rounded bg-[#22b573] text-white text-[14px] font-medium hover:bg-[#1e9f65] disabled:opacity-60"
              >
                {detailActionLoading === "void" ? "Voiding..." : "Void it"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (detailActionLoading === "void") return;
                  setIsVoidModalOpen(false);
                  setVoidReason("");
                }}
                className="px-3 py-1.5 rounded border border-[#cbd5e1] bg-white text-[14px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isDraftRecordPaymentModalOpen && (
        <div
          className="fixed inset-0 z-[132] bg-black/35 flex items-start justify-center pt-24"
          onClick={(e) => {
            if (e.target === e.currentTarget && !draftRecordPaymentLoading) {
              setIsDraftRecordPaymentModalOpen(false);
              setDontShowDraftRecordPaymentAgain(false);
            }
          }}
        >
          <div className="w-[96%] max-w-[560px] rounded-md border border-[#d6d9e3] bg-white shadow-2xl overflow-hidden">
            <div className="px-5 py-5 border-b border-[#e5e7eb]">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-[#f59e0b] mt-0.5 shrink-0" />
                <p className="text-[15px] leading-6 text-[#334155]">
                  Retainer Invoice status will be changed to 'Sent' once payment is recorded
                </p>
              </div>
              <label className="mt-3 inline-flex items-center gap-2 text-[15px] text-[#475569]">
                <input
                  type="checkbox"
                  checked={dontShowDraftRecordPaymentAgain}
                  onChange={(e) => setDontShowDraftRecordPaymentAgain(e.target.checked)}
                  className="h-4 w-4 rounded border-[#cbd5e1] text-[#22b573] focus:ring-[#22b573]"
                />
                <span>Do not show this again</span>
              </label>
            </div>
            <div className="px-5 py-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void confirmDraftRecordPayment();
                }}
                disabled={draftRecordPaymentLoading}
                className="px-4 py-1.5 rounded bg-[#22b573] text-white text-[14px] font-medium hover:bg-[#1e9f65] disabled:opacity-60"
              >
                {draftRecordPaymentLoading ? "Please wait..." : "OK"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (draftRecordPaymentLoading) return;
                  setIsDraftRecordPaymentModalOpen(false);
                  setDontShowDraftRecordPaymentAgain(false);
                }}
                className="px-4 py-1.5 rounded border border-[#cbd5e1] bg-white text-[14px] text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isSendEmailModalOpen && (
        <div
          className="fixed inset-0 z-[130] bg-black/35 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSendEmailModalOpen(false);
            }
          }}
        >
          <div className="w-[960px] max-w-[95vw] h-[88vh] bg-[#f8fafc] rounded-lg border border-[#d6d9e3] shadow-2xl flex flex-col overflow-hidden">
            <div className="h-16 px-6 border-b border-[#d6d9e3] bg-white flex items-center justify-between">
              <h2 className="text-[34px] font-normal text-slate-900">
                Email To {String(getCustomerDisplayName(invoice) || "Customer")}
              </h2>
              <button
                type="button"
                className="h-8 w-8 rounded-md text-[#ef4444] hover:bg-red-50 inline-flex items-center justify-center"
                onClick={() => setIsSendEmailModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="rounded-md border border-[#d6d9e3] bg-white">
                <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center text-[13px]">
                  <div className="w-20 text-[#64748b] inline-flex items-center gap-1">
                    <span>From</span>
                    <HelpCircle size={12} />
                  </div>
                  <div className="text-[#0f172a]">
                    {emailData.fromName} &lt;{emailData.fromEmail}&gt;
                  </div>
                </div>

                <div className="px-4 py-2 border-b border-[#e5e7eb] flex items-center gap-2 text-[13px]">
                  <div className="w-20 text-[#64748b]">Send To</div>
                  <div className="flex-1 flex items-center gap-2 min-h-8">
                    {emailData.to.trim() && (
                      <span className="inline-flex items-center gap-1 rounded bg-[#eef2f7] text-[#334155] px-2 py-1">
                        <span className="inline-flex h-4 w-4 rounded bg-[#dbe2ea] items-center justify-center text-[10px] font-semibold">
                          {emailData.to.charAt(0).toUpperCase()}
                        </span>
                        <span>{emailData.to}</span>
                        <button
                          type="button"
                          className="text-[#94a3b8] hover:text-[#475569]"
                          onClick={() => setEmailData((prev) => ({ ...prev, to: "" }))}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )}
                    {!emailData.to.trim() && (
                      <input
                        type="email"
                        value={emailData.to}
                        onChange={(e) => setEmailData((prev) => ({ ...prev, to: e.target.value }))}
                        className="w-full bg-transparent outline-none text-[13px]"
                        placeholder="Enter recipient email"
                      />
                    )}
                  </div>
                  <button type="button" className="text-[#2563eb] text-[12px]" onClick={() => setShowCc((v) => !v)}>Cc</button>
                  <button type="button" className="text-[#2563eb] text-[12px]" onClick={() => setShowBcc((v) => !v)}>Bcc</button>
                </div>

                {showCc && (
                  <div className="px-4 py-2 border-b border-[#e5e7eb] flex items-center gap-2 text-[13px]">
                    <div className="w-20 text-[#64748b]">Cc</div>
                    <input
                      type="email"
                      value={emailData.cc}
                      onChange={(e) => setEmailData((prev) => ({ ...prev, cc: e.target.value }))}
                      className="flex-1 bg-transparent outline-none"
                      placeholder="Enter cc email"
                    />
                  </div>
                )}

                {showBcc && (
                  <div className="px-4 py-2 border-b border-[#e5e7eb] flex items-center gap-2 text-[13px]">
                    <div className="w-20 text-[#64748b]">Bcc</div>
                    <input
                      type="email"
                      value={emailData.bcc}
                      onChange={(e) => setEmailData((prev) => ({ ...prev, bcc: e.target.value }))}
                      className="flex-1 bg-transparent outline-none"
                      placeholder="Enter bcc email"
                    />
                  </div>
                )}

                <div className="px-4 py-2 border-b border-[#e5e7eb] flex items-center gap-2 text-[13px]">
                  <div className="w-20 text-[#64748b]">Subject</div>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData((prev) => ({ ...prev, subject: e.target.value }))}
                    className="flex-1 bg-transparent outline-none"
                  />
                </div>

                <div className="px-3 py-2 border-b border-[#e5e7eb] bg-[#f8fafc] flex items-center gap-1.5">
                  <button type="button" onClick={() => setIsBold((v) => !v)} className={`p-1 rounded border ${isBold ? "bg-slate-200" : "bg-white"}`}><Bold size={13} /></button>
                  <button type="button" onClick={() => setIsItalic((v) => !v)} className={`p-1 rounded border ${isItalic ? "bg-slate-200" : "bg-white"}`}><Italic size={13} /></button>
                  <button type="button" onClick={() => setIsUnderline((v) => !v)} className={`p-1 rounded border ${isUnderline ? "bg-slate-200" : "bg-white"}`}><Underline size={13} /></button>
                  <button type="button" onClick={() => setIsStrikethrough((v) => !v)} className={`p-1 rounded border ${isStrikethrough ? "bg-slate-200" : "bg-white"}`}><Strikethrough size={13} /></button>
                  <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="ml-2 h-7 border rounded text-[12px] px-2 bg-white">
                    <option value="14">14px</option>
                    <option value="16">16px</option>
                    <option value="18">18px</option>
                  </select>
                  <button type="button" className="p-1 rounded border bg-white"><AlignLeft size={13} /></button>
                  <button type="button" className="p-1 rounded border bg-white"><AlignCenter size={13} /></button>
                  <button type="button" className="p-1 rounded border bg-white"><AlignRight size={13} /></button>
                  <button type="button" className="p-1 rounded border bg-white"><ImageIcon size={13} /></button>
                  <button type="button" className="p-1 rounded border bg-white"><LinkIcon size={13} /></button>
                </div>

                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[320px] p-4 text-[16px] leading-7 outline-none"
                  style={{
                    fontWeight: isBold ? "bold" : "normal",
                    fontStyle: isItalic ? "italic" : "normal",
                    textDecoration: isUnderline ? "underline" : isStrikethrough ? "line-through" : "none",
                    fontSize: `${fontSize}px`,
                  }}
                  onInput={(e) => setEmailData((prev) => ({ ...prev, message: (e.target as HTMLElement).innerHTML }))}
                  dangerouslySetInnerHTML={{ __html: emailData.message }}
                />
              </div>

              <div className="mt-3 rounded-md border border-[#d6d9e3] bg-white p-2 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-[13px] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={emailData.attachPdf}
                    onChange={(e) => setEmailData((prev) => ({ ...prev, attachPdf: e.target.checked }))}
                  />
                  <span>Attach Retainer Invoice PDF</span>
                </label>
                <div className="inline-flex items-center gap-1 rounded border border-dashed border-[#d1d5db] px-3 py-1 text-[12px] text-[#475569]">
                  <FileText size={13} className="text-red-500" />
                  <span>{String((invoice as any)?.invoiceNumber || "RET-")}</span>
                </div>
              </div>
            </div>

            <div className="h-14 px-6 border-t border-[#d6d9e3] bg-white flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleSendEmailSubmit();
                }}
                className="px-4 py-2 rounded-md bg-[#22b573] text-white text-sm font-medium hover:bg-[#1e9f65]"
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => setIsSendEmailModalOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isCommentsPanelOpen && (
        <div className="fixed inset-0 z-[120] bg-black/20 flex justify-end">
          <div className="w-[430px] h-full bg-white border-l border-[#d6d9e3] shadow-2xl flex flex-col">
            <div className="h-14 px-5 border-b border-[#e5e7eb] bg-white flex items-center justify-between">
              <div className="text-[32px] font-normal text-slate-900 leading-none">Comments &amp; History</div>
              <button
                type="button"
                onClick={() => setIsCommentsPanelOpen(false)}
                className="h-8 w-8 rounded-md text-[#ef4444] hover:bg-red-50 inline-flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b border-[#e5e7eb] bg-white">
              <div className="rounded-md border border-[#d1d5db] overflow-hidden">
                <div className="h-10 border-b border-[#d1d5db] bg-[#f8fafc] px-3 flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => applyCommentFormatting("bold")}
                    className="text-[14px] text-slate-700 hover:text-slate-900"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCommentFormatting("italic")}
                    className="text-[14px] italic text-slate-700 hover:text-slate-900"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCommentFormatting("underline")}
                    className="text-[14px] underline text-slate-700 hover:text-slate-900"
                    title="Underline"
                  >
                    U
                  </button>
                </div>
              <textarea
                ref={commentTextareaRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={4}
                className="w-full border-0 px-3 py-2 text-sm text-gray-700 outline-none resize-none"
              />
              <div className="p-3 border-t border-[#d1d5db]">
                <button
                  type="button"
                  onClick={() => {
                    void handleAddComment();
                  }}
                  disabled={!commentText.trim()}
                  className="px-4 py-2 border border-[#d1d5db] text-[#94a3b8] bg-[#f8fafc] rounded-md text-sm font-medium disabled:opacity-100"
                >
                  Add Comment
                </button>
              </div>
            </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-[13px] font-semibold text-[#475569] uppercase tracking-wide inline-flex items-center gap-1">
                <span>All Comments</span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-[12px] text-white">
                  {comments.length}
                </span>
              </div>
              <div className="h-px bg-[#e5e7eb] mt-2 mb-4" />
              {comments.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-10">No comments yet.</div>
              ) : (
                comments
                  .slice()
                  .reverse()
                  .map((comment) => (
                    <div key={comment.id} className="mb-4">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-7 w-7 rounded-full border border-[#cbd5e1] bg-white text-[#f59e0b] items-center justify-center text-[14px]">
                          ?
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] text-[#111827]">
                            <span className="font-medium">{comment.author || "User"}</span>
                            <span className="mx-1 text-[#94a3b8]">•</span>
                            <span className="text-[12px] text-[#6b7280]">{formatCommentTimestamp(comment.timestamp)}</span>
                          </div>
                          <div className="mt-2 rounded-md bg-[#f3f4f6] px-3 py-2 text-[13px] text-[#111827] whitespace-pre-wrap">
                            {comment.text}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteComment(comment.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete comment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

