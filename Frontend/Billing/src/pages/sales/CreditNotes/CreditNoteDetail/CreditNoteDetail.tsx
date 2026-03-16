import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCreditNoteById, getCreditNotes, deleteCreditNote, CreditNote, AttachedFile, updateCreditNote } from "../../salesModel";
import { currenciesAPI, bankAccountsAPI, chartOfAccountsAPI, refundsAPI, creditNotesAPI, settingsAPI } from "../../../../services/api";
import ApplyToInvoices from "./ApplyToInvoices";
import CreditNotePreview from "./CreditNotePreview";
import { downloadCreditNotesPdf } from "../creditNotePdf";
import {
  X, Edit, Send, FileText, MoreVertical,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, RotateCcw, Printer, Mail, MessageSquare, Calendar,
  HelpCircle, Bell, Monitor, MessageCircle, ArrowRight, Volume2, Paperclip, FileUp, Bold, Italic, Underline,
  Settings, Upload, User, ChevronDown as ChevronDownIcon, CheckCircle
} from "lucide-react";

const statusFilters = [
  "All",
  "Draft",
  "Locked",
  "Pending Approval",
  "Approved",
  "Open",
  "Closed",
  "Void"
];

interface CreditNoteItem {
  itemDetails: string;
  description: string;
  quantity: number | string;
  unit?: string;
  unitPrice?: number | string;
  rate?: number | string;
  amount: number | string;
  total?: number | string;
}

export default function CreditNoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const [isAllCreditNotesDropdownOpen, setIsAllCreditNotesDropdownOpen] = useState(false);
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
  const [filterSearch, setFilterSearch] = useState("");
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const allCreditNotesDropdownRef = useRef<HTMLDivElement>(null);
  const sendDropdownRef = useRef<HTMLDivElement>(null);
  const pdfDropdownRef = useRef<HTMLDivElement>(null);
  const sendEmailModalRef = useRef<HTMLDivElement>(null);
  const scheduleEmailModalRef = useRef<HTMLDivElement>(null);
  const refundModalRef = useRef<HTMLDivElement>(null);
  const paymentModeDropdownRef = useRef<HTMLDivElement>(null);
  const fromAccountDropdownRef = useRef<HTMLDivElement>(null);
  const refundDatePickerRef = useRef<HTMLDivElement>(null);

  // Attachments Modal States
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [creditNoteAttachments, setCreditNoteAttachments] = useState<AttachedFile[]>([]);
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

  // Customize Dropdown States
  const [isCreditNoteDocumentHovered, setIsCreditNoteDocumentHovered] = useState(false);
  const [isCustomizeDropdownOpen, setIsCustomizeDropdownOpen] = useState(false);
  const [isChooseTemplateModalOpen, setIsChooseTemplateModalOpen] = useState(false);
  const [isOrganizationAddressModalOpen, setIsOrganizationAddressModalOpen] = useState(false);
  const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Standard Template");
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
  const [logoPreview, setLogoPreview] = useState<string | ArrayBuffer | null>(null);
  const [termsData, setTermsData] = useState({
    notes: "Looking forward for your business.",
    termsAndConditions: "",
    useNotesForAllCreditNotes: false,
    useTermsForAllCreditNotes: false
  });

  // Refund Modal States
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundData, setRefundData] = useState({
    amount: "",
    refundedOn: "",
    paymentMode: "",
    referenceNumber: "",
    fromAccount: "",
    fromAccountId: "",
    description: ""
  });
  const [isPaymentModeDropdownOpen, setIsPaymentModeDropdownOpen] = useState(false);
  const [isFromAccountDropdownOpen, setIsFromAccountDropdownOpen] = useState(false);
  const [isRefundDatePickerOpen, setIsRefundDatePickerOpen] = useState(false);
  const [refundDateCalendar, setRefundDateCalendar] = useState(new Date());
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("statement"); // Added for separating Journal and Statement
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);

  const paymentModeOptions = ["Cash", "Check", "Credit Card", "Debit Card", "Bank Transfer", "PayPal", "Other"];
  const depositToOptions = ["Petty Cash", "Bank Account", "Cash Account", "Other"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const customizeDropdownRef = useRef<HTMLDivElement>(null);
  const organizationAddressFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCreditNoteData = async () => {
      try {
        if (!id) return;
        const creditNoteData = await getCreditNoteById(id);
        if (creditNoteData) {
          setCreditNote(creditNoteData);
          setCreditNoteAttachments(Array.isArray((creditNoteData as any).attachedFiles) ? (creditNoteData as any).attachedFiles : []);
          setComments(Array.isArray((creditNoteData as any).comments) ? (creditNoteData as any).comments : []);
        } else {
          navigate("/sales/credit-notes");
        }
        const notes = await getCreditNotes();
        setCreditNotes(notes);
      } catch (error) {
        console.error("Error loading credit note:", error);
      }
    };
    fetchCreditNoteData();

    // Fetch Bank Accounts and Refunds
    const fetchAdditionalData = async () => {
      try {
        const [bankAccRes, chartAccRes] = await Promise.all([
          bankAccountsAPI.getAll(),
          chartOfAccountsAPI.getAccounts({ type: 'Asset' })
        ]);

        let combinedAccounts: any[] = [];
        if (bankAccRes && Array.isArray(bankAccRes)) {
          combinedAccounts = [...bankAccRes];
        } else if (bankAccRes && bankAccRes.success && Array.isArray(bankAccRes.data)) {
          combinedAccounts = [...bankAccRes.data];
        }

        if (chartAccRes && chartAccRes.success && Array.isArray(chartAccRes.data)) {
          const relevantCoa = chartAccRes.data.filter((acc: any) =>
            acc.name.toLowerCase().includes('cash') ||
            acc.name.toLowerCase().includes('petty') ||
            acc.name.toLowerCase().includes('undeposited')
          );
          combinedAccounts = [...combinedAccounts, ...relevantCoa];
        }

        setBankAccounts(combinedAccounts);

        // Fetch Refunds for this Credit Note
        if (id) {
          const refundsRes = await refundsAPI.getByCreditNoteId(id);
          if (refundsRes && refundsRes.success && Array.isArray(refundsRes.data)) {
            setRefunds(refundsRes.data);
          }
        }

        // Fetch Organization Profile
        const orgRes = await settingsAPI.getOrganizationProfile();
        if (orgRes && orgRes.success && orgRes.data) {
          setOrganizationProfile(orgRes.data);
          setOrganizationData({
            street1: orgRes.data.addressLine1 || "",
            street2: orgRes.data.addressLine2 || "",
            city: orgRes.data.city || "",
            zipCode: orgRes.data.zipCode || "",
            stateProvince: orgRes.data.state || "",
            phone: orgRes.data.phone || "",
            faxNumber: orgRes.data.fax || "",
            websiteUrl: orgRes.data.website || "",
            industry: orgRes.data.industry || ""
          });
          if (orgRes.data.logo) {
            setLogoPreview(orgRes.data.logo);
          }
        }
      } catch (error) {
        console.error("Error loading additional details:", error);
      }
    };
    fetchAdditionalData();

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
  }, [id, navigate]);

  // Initialize refund data when modal opens
  useEffect(() => {
    if (isRefundModalOpen && creditNote) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const year = today.getFullYear();
      const initialBalance = creditNote.balance !== undefined ? creditNote.balance : (creditNote.total || 0);
      const defaultAcc = bankAccounts[0];
      const defaultAccountName = getAccountDisplayName(defaultAcc);
      const defaultAccountId = getAccountId(defaultAcc);

      setRefundData((prev) => ({
        ...prev,
        amount: initialBalance.toString(),
        refundedOn: `${day}/${month}/${year}`,
        paymentMode: "Cash",
        referenceNumber: "",
        fromAccount: defaultAccountName,
        fromAccountId: defaultAccountId,
        description: `Refund for Credit Note ${creditNote.creditNoteNumber}`
      }));
    }
  }, [isRefundModalOpen, creditNote, bankAccounts]);

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (allCreditNotesDropdownRef.current && !allCreditNotesDropdownRef.current.contains(event.target as Node)) {
        setIsAllCreditNotesDropdownOpen(false);
      }
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(event.target as Node)) {
        setIsSendDropdownOpen(false);
      }
      if (pdfDropdownRef.current && !pdfDropdownRef.current.contains(event.target as Node)) {
        setIsPdfDropdownOpen(false);
      }
      if (sendEmailModalRef.current && !sendEmailModalRef.current.contains(event.target as Node)) {
        // Don't close on overlay click for modals
      }
      if (scheduleEmailModalRef.current && !scheduleEmailModalRef.current.contains(event.target as Node)) {
        // Don't close on overlay click for modals
      }
      if (isCustomizeDropdownOpen && customizeDropdownRef.current && !customizeDropdownRef.current.contains(event.target as Node)) {
        setIsCustomizeDropdownOpen(false);
      }
      if (refundModalRef.current && !refundModalRef.current.contains(event.target as Node) && isRefundModalOpen) {
        setIsRefundModalOpen(false);
      }
      if (paymentModeDropdownRef.current && !paymentModeDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentModeDropdownOpen(false);
      }
      if (fromAccountDropdownRef.current && !fromAccountDropdownRef.current.contains(event.target as Node)) {
        setIsFromAccountDropdownOpen(false);
      }
      if (refundDatePickerRef.current && !refundDatePickerRef.current.contains(event.target as Node)) {
        setIsRefundDatePickerOpen(false);
      }
    };

    if (isMoreMenuOpen || isAllCreditNotesDropdownOpen || isSendDropdownOpen || isPdfDropdownOpen || isCustomizeDropdownOpen || isRefundModalOpen || isPaymentModeDropdownOpen || isFromAccountDropdownOpen || isRefundDatePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen, isAllCreditNotesDropdownOpen, isSendDropdownOpen, isPdfDropdownOpen, isCustomizeDropdownOpen, isRefundModalOpen, isPaymentModeDropdownOpen, isFromAccountDropdownOpen, isRefundDatePickerOpen]);

  const formatCurrency = (amount: any, currency = baseCurrency) => {
    return `${currency}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrencyNumber = (amount: any) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getAccountId = (account: any): string =>
    String(account?._id || account?.id || "").trim();

  const getAccountDisplayName = (account: any): string => {
    const display = String(account?.displayName || account?.accountName || account?.name || "").trim();
    return display || "Unnamed Account";
  };

  const parseRefundInputDate = (value: string): Date | null => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;

    const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const day = Number(slashMatch[1]);
      const month = Number(slashMatch[2]);
      const year = Number(slashMatch[3]);
      const parsed = new Date(year, month - 1, day);
      if (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      ) {
        return parsed;
      }
      return null;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const handleDownloadPDF = async () => {
    setIsPdfDropdownOpen(false);
    if (!creditNote) return;
    try {
      await downloadCreditNotesPdf({
        notes: [creditNote],
        organizationProfile,
        baseCurrency,
        fileName: `CreditNote-${creditNote.creditNoteNumber || creditNote.id}.pdf`
      });
    } catch (error) {
      console.error("Error downloading credit note PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handlePrint = () => {
    setIsPdfDropdownOpen(false);
    window.print();
  };

  const handleSendEmail = () => {
    setIsSendDropdownOpen(false);
    navigate(`/sales/credit-notes/${id}/email`);
  };

  const handleScheduleEmail = () => {
    setIsSendDropdownOpen(false);
    if (creditNote) {
      // Pre-fill schedule data with credit note info
      setScheduleData({
        to: creditNote.customerEmail || (typeof creditNote.customer === 'object' ? (creditNote.customer?.displayName || creditNote.customer?.name) : creditNote.customer) || "",
        cc: "",
        bcc: "",
        subject: `Credit Note ${creditNote.creditNoteNumber || creditNote.id} from ${creditNote.companyName || "Your Company"}`,
        message: `Dear ${creditNote.customerName || (typeof creditNote.customer === 'object' ? (creditNote.customer?.displayName || creditNote.customer?.name) : creditNote.customer) || "Customer"},

Please find attached credit note ${creditNote.creditNoteNumber || creditNote.id} for ${formatCurrency(creditNote.total || creditNote.amount || 0, creditNote.currency)}.

Credit Note Details:
- Credit Note Number: ${creditNote.creditNoteNumber || creditNote.id}
- Credit Date: ${formatDate(creditNote.creditNoteDate || creditNote.date)}
- Amount: ${formatCurrency(creditNote.total || creditNote.amount || 0, creditNote.currency)}
- Credits Remaining: ${formatCurrency(creditNote.balance || creditNote.total || creditNote.amount || 0, creditNote.currency)}

Thank you for your business!

Best regards`,
        date: "",
        time: ""
      });
      setIsScheduleEmailModalOpen(true);
    }
  };

  const handleSendEmailSubmit = () => {
    if (!emailData.to || !emailData.subject) {
      alert("Please fill in required fields (To and Subject)");
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

  const handleScheduleEmailSubmit = () => {
    if (!scheduleData.to || !scheduleData.subject || !scheduleData.date || !scheduleData.time) {
      alert("Please fill in required fields (To, Subject, Date, and Time)");
      return;
    }
    // TODO: Implement actual email scheduling
    console.log("Scheduling email:", scheduleData);
    setIsScheduleEmailModalOpen(false);
    alert("Email scheduled successfully!");
    setScheduleData({
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      message: "",
      date: "",
      time: ""
    });
  };

  const handleSendSMS = () => {
    setIsSendDropdownOpen(false);
    // TODO: Implement SMS sending functionality
    alert("SMS functionality will be implemented soon.");
  };

  const [isApplyToInvoicesOpen, setIsApplyToInvoicesOpen] = useState(false);

  const handleApplyToInvoices = () => {
    setIsApplyToInvoicesOpen(true);
  };

  const handleSaveAllocations = async (allocations: any[]) => {
    try {
      if (!creditNote || !creditNote.id) return;

      const response = await creditNotesAPI.applyToInvoices(creditNote.id, allocations);

      if (response && response.success) {
        alert(`Successfully applied credits to ${allocations.length} invoice(s).`);
        setIsApplyToInvoicesOpen(false);
        // Refresh data
        const updatedNote = await getCreditNoteById(creditNote.id);
        if (updatedNote) setCreditNote(updatedNote);
      } else {
        alert("Failed to apply credits: " + (response.message || "Unknown error"));
      }
    } catch (error: any) {
      console.error("Error applying credits:", error);
      alert("Failed to apply credits: " + (error.message || "Communication error"));
    }
  };

  const handleRefund = () => {
    setIsRefundModalOpen(true);
  };

  const handleRefundCancel = () => {
    setIsRefundModalOpen(false);
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
    try {
      if (!id || !creditNote) return;

      // Basic validation - aligned with Payments refund flow
      if (!refundData.amount || !refundData.refundedOn || !refundData.fromAccount) {
        alert("Please fill in all required fields: Amount, Refunded On, and From Account");
        return;
      }

      const amt = parseFloat(refundData.amount);
      if (isNaN(amt) || amt <= 0) {
        alert("Please enter a valid amount.");
        return;
      }

      const availableBalance = creditNote.balance !== undefined ? creditNote.balance : (creditNote.total || 0);
      if (amt > availableBalance) {
        alert("Refund amount cannot exceed available balance.");
        return;
      }

      if (!refundData.fromAccountId && !refundData.fromAccount) {
        alert("Please select an account.");
        return;
      }

      const parsedRefundDate = parseRefundInputDate(refundData.refundedOn);
      if (!parsedRefundDate) {
        alert("Please enter a valid refund date.");
        return;
      }
      const isoDate = parsedRefundDate.toISOString().split("T")[0];

      const payload = {
        creditNoteId: creditNote.id || creditNote._id || id,
        amount: amt,
        refundDate: isoDate,
        paymentMethod: refundData.paymentMode || "Cash",
        referenceNumber: refundData.referenceNumber,
        fromAccount: refundData.fromAccountId || refundData.fromAccount,
        description: refundData.description
      };

      const res = await refundsAPI.create(payload);

      if (res && res.success) {
        alert("Refund processed successfully!");
        handleRefundCancel();

        // Refresh only the refund-related data without reloading the page
        const noteId = String(creditNote.id || creditNote._id || id);
        const [updatedCreditNote, refundsRes] = await Promise.all([
          getCreditNoteById(noteId),
          refundsAPI.getByCreditNoteId(noteId)
        ]);

        if (updatedCreditNote) {
          setCreditNote(updatedCreditNote);
        }
        if (refundsRes && refundsRes.success && Array.isArray(refundsRes.data)) {
          setRefunds(refundsRes.data);
        }
      } else {
        alert("Failed to process refund: " + (res.message || "Unknown error"));
      }
    } catch (error: any) {
      console.error("[REFUND] Error saving refund:", error);
      alert("Error processing refund: " + (error.message || "Please try again."));
    }
  };

  const navigateRefundMonth = (direction: 'prev' | 'next') => {
    setRefundDateCalendar(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        month: "prev",
        fullDate: new Date(year, month - 1, prevMonthDays - i).toISOString().split('T')[0]
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: day,
        month: "current",
        fullDate: new Date(year, month, day).toISOString().split('T')[0]
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: day,
        month: "next",
        fullDate: new Date(year, month + 1, day).toISOString().split('T')[0]
      });
    }

    return days;
  };

  const handleRefundDateSelect = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    setRefundData({ ...refundData, refundedOn: `${day}/${month}/${year}` });
    setIsRefundDatePickerOpen(false);
  };

  const handleDelete = async () => {
    setIsMoreMenuOpen(false);
    if (window.confirm(`Are you sure you want to delete credit note ${creditNote?.creditNoteNumber || creditNote?.id}? This action cannot be undone.`)) {
      try {
        if (!id) {
          alert('Missing credit note id.');
          return;
        }
        await deleteCreditNote(id);
        navigate("/sales/credit-notes");
      } catch (error) {
        console.error("Error deleting credit note:", error);
        alert("Failed to delete credit note. Please try again.");
      }
    }
  };

  const handleClone = () => {
    setIsMoreMenuOpen(false);
    if (creditNote) {
      navigate("/sales/credit-notes/new", {
        state: { clonedData: creditNote }
      });
    }
  };

  const persistCreditNoteMeta = async (attachments: AttachedFile[], nextComments: any[]) => {
    if (!id) return;
    try {
      await updateCreditNote(id, {
        attachedFiles: attachments,
        comments: nextComments
      } as any);
      setCreditNote((prev) => prev ? ({ ...prev, attachedFiles: attachments, comments: nextComments } as any) : prev);
    } catch (error) {
      console.error("Error saving credit note comments/attachments:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(String(event.target?.result || ""));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  // Attachments Handlers
  const handleFileUpload = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (creditNoteAttachments.length + validFiles.length > 5) {
      alert("Maximum 5 files allowed. Please remove some files first.");
      return;
    }

    try {
      const newAttachments: AttachedFile[] = [];
      for (const file of validFiles) {
        const preview = await fileToDataUrl(file);
        newAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          preview,
          uploadedAt: new Date().toISOString()
        });
      }

      const updated = [...creditNoteAttachments, ...newAttachments].slice(0, 5);
      setCreditNoteAttachments(updated);
      await persistCreditNoteMeta(updated, comments);
    } catch (error) {
      console.error("Error uploading credit note attachments:", error);
      alert("Failed to upload files. Please try again.");
    }
  };

  const handleFileClick = (attachment: any) => {
    if (attachment.type && String(attachment.type).startsWith('image/')) {
      setSelectedImage(typeof attachment.preview === 'string' ? attachment.preview : null);
      setShowImageViewer(true);
      return;
    }

    if (attachment.preview) {
      const a = document.createElement('a');
      a.href = attachment.preview;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string | number) => {
    const updated = creditNoteAttachments.filter(att => String(att.id) !== String(attachmentId));
    setCreditNoteAttachments(updated);
    await persistCreditNoteMeta(updated, comments);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Comments Handlers
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const comment = {
      id: `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: newComment.trim(),
      author: "You",
      timestamp: new Date().toISOString(),
      bold: commentBold,
      italic: commentItalic,
      underline: commentUnderline
    };

    const updated = [...comments, comment];
    setComments(updated);
    await persistCreditNoteMeta(creditNoteAttachments, updated);
    setNewComment("");
    setCommentBold(false);
    setCommentItalic(false);
    setCommentUnderline(false);
  };

  const handleFilterSelect = (filter: string) => {
    setIsAllCreditNotesDropdownOpen(false);
    // Navigate to credit notes list with filter applied
    if (filter === "All") {
      navigate("/sales/credit-notes");
    } else {
      // Convert filter name to status format
      const statusMap: { [key: string]: string } = {
        "All": "all",
        "Draft": "draft",
        "Open": "open",
        "Closed": "closed",
        "Void": "void",
        "Locked": "locked",
        "Pending Approval": "pending_approval",
        "Approved": "approved"
      };
      navigate(`/sales/credit-notes?status=${statusMap[filter] || filter.toLowerCase()}`);
    }
  };

  const filteredStatusOptions = statusFilters.filter(filter =>
    filter.toLowerCase().includes(filterSearch.toLowerCase())
  );

  if (!creditNote) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="p-10 text-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-3" ref={allCreditNotesDropdownRef}>
            <button
              onClick={() => setIsAllCreditNotesDropdownOpen(!isAllCreditNotesDropdownOpen)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors w-full"
            >
              {isAllCreditNotesDropdownOpen ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
              <span className="text-sm font-semibold text-gray-900">All Credit Notes</span>
            </button>

            {/* Filter Dropdown */}
            {isAllCreditNotesDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[250px] overflow-hidden">
                {/* Search Bar */}
                <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="flex-1 text-sm bg-transparent focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* Filter Options */}
                <div>
                  {filteredStatusOptions.map((filter) => (
                    <div
                      key={filter}
                      onClick={() => handleFilterSelect(filter)}
                      className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors"
                      style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as any}
                      onMouseEnter={(e: React.MouseEvent) => ((e.target as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)")}
                      onMouseLeave={(e: React.MouseEvent) => ((e.target as HTMLElement).style.backgroundColor = "transparent")}
                    >
                      <span className="text-sm font-medium text-gray-900">{filter}</span>
                      <Star size={16} className="text-yellow-400" />
                    </div>
                  ))}
                </div>

                {/* New Custom View */}
                <div
                  onClick={() => {
                    setIsAllCreditNotesDropdownOpen(false);
                    navigate("/sales/credit-notes/custom-view/new");
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-200 text-sm font-semibold cursor-pointer transition-colors"
                  style={{ backgroundColor: "rgba(21, 99, 114, 0.1)", color: "#156372" }}
                  onMouseEnter={(e: React.MouseEvent) => ((e.target as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.15)")}
                  onMouseLeave={(e: React.MouseEvent) => ((e.target as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)")}
                >
                  <Plus size={16} />
                  New Custom View
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {creditNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => note.id && navigate(`/sales/credit-notes/${note.id}`)}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${note.id === id ? "" : ""
                }`}
              style={note.id === id ? { backgroundColor: "rgba(21, 99, 114, 0.1)", borderLeft: "4px solid #156372" } : {}}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Square size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{note.customerName || (typeof note.customer === 'object' ? (note.customer?.displayName || note.customer?.name) : note.customer) || "-"}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(note.total || note.amount, note.currency)}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{note.creditNoteNumber || note.id}</span>
                    <span>•</span>
                    <span>{formatDate(note.creditNoteDate || note.date)}</span>
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs font-semibold ${(note.status || "open").toLowerCase() === "open"
                      ? "text-green-700"
                      : (note.status || "open").toLowerCase() === "closed"
                        ? "text-gray-700"
                        : (note.status || "open").toLowerCase() === "draft"
                          ? "text-yellow-700"
                          : "text-red-700"
                      }`}>
                      {(note.status || "open").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{creditNote.creditNoteNumber || creditNote.id}</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAttachmentsModal(true);
                    setShowCommentsSidebar(false);
                  }}
                  className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-700 hover:bg-gray-300 transition-colors relative"
                >
                  <Paperclip size={18} />
                  {creditNoteAttachments.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center" style={{ backgroundColor: "#156372" }}>
                      {creditNoteAttachments.length}
                    </span>
                  )}
                </button>
              </div>
              <button
                onClick={() => {
                  setShowCommentsSidebar(true);
                  setShowAttachmentsModal(false);
                }}
                className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-700 hover:bg-gray-300 transition-colors relative"
              >
                <MessageSquare size={18} />
                {comments.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center bg-gray-700">
                    {comments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate("/sales/credit-notes")}
                className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                style={{ color: "#156372" }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = "#0D4A52";
                  (e.target as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = "#156372";
                  (e.target as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Action Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-2">
          <div className="flex items-center gap-0">
            <button
              onClick={() => navigate(`/sales/credit-notes/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-200 pr-4"
            >
              <Edit size={16} />
              Edit
            </button>
            <div className="relative" ref={sendDropdownRef}>
              <button
                onClick={() => setIsSendDropdownOpen(!isSendDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-200 pr-4"
              >
                <Mail size={16} />
                Email
              </button>
              {isSendDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[180px] overflow-hidden">
                  <div className="p-3 cursor-pointer flex items-center gap-2 text-sm text-gray-700 transition-colors" style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as any} onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"} onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "transparent"} onClick={handleSendEmail}>
                    <Mail size={16} />
                    Send Email
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={pdfDropdownRef}>
              <button
                onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-200 pr-4"
              >
                <FileText size={16} />
                PDF/Print
                <ChevronDown size={14} />
              </button>
              {isPdfDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[150px] overflow-hidden">
                  <div className="p-3 cursor-pointer flex items-center gap-2 text-sm text-gray-700 transition-colors" onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"} onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "transparent"} onClick={handleDownloadPDF}>
                    <FileText size={16} />
                    PDF
                  </div>
                  <div className="p-3 cursor-pointer flex items-center gap-2 text-sm text-gray-700 transition-colors" onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"} onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "transparent"} onClick={handlePrint}>
                    <Printer size={16} />
                    Print
                  </div>
                </div>
              )}
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-200 pr-4"
              onClick={handleApplyToInvoices}
            >
              <ArrowRight size={16} />
              Apply to Invoices
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-200 pr-4"
              onClick={handleRefund}
            >
              <RotateCcw size={16} />
              Refund
            </button>
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <MoreVertical size={18} />
              </button>
              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[150px] overflow-hidden">
                  <div className="p-3 cursor-pointer text-sm transition-colors" style={{ color: "#dc2626" }} onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "rgba(220, 38, 38, 0.1)"} onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "transparent"} onClick={handleDelete}>Delete</div>
                  <div className="p-3 cursor-pointer text-sm text-gray-700 transition-colors" style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as any} onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"} onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "transparent"} onClick={handleClone}>Clone</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Credit Note Document */}
        <div className="p-6 max-w-5xl mx-auto">
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 relative"
            onMouseEnter={() => setIsCreditNoteDocumentHovered(true)}
            onMouseLeave={() => {
              setIsCreditNoteDocumentHovered(false);
              setIsCustomizeDropdownOpen(false);
            }}
          >
            {/* Open Ribbon */}
            {(creditNote.status === "open" || creditNote.status === "draft") && (
              <div className={`absolute top-4 left-6 text-xs font-bold uppercase ${creditNote.status === "open" ? "" : "text-gray-500"}`}
                style={creditNote.status === "open" ? { color: "#156372" } : {}}
              >
                {creditNote.status === "open" ? "Open" : "Draft"}
              </div>
            )}

            {/* Document Header Removed - Replaced by CreditNotePreview */}

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 mb-8 space-x-8">
              <button
                className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === "statement" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("statement")}
              >
                Statement
                {activeTab === "statement" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
              <button
                className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === "journal" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("journal")}
              >
                Journal
                {activeTab === "journal" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            </div>

            {activeTab === "statement" && (
              <>
                <CreditNotePreview
                  creditNote={creditNote}
                  organizationProfile={organizationProfile}
                  baseCurrency={baseCurrency}
                  onCustomerClick={(customerId) => navigate(`/sales/customers/${customerId}`)}
                />
              </>
            )}

            {activeTab === "journal" && (
              <div className="animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-gray-500">Amount is displayed in your base currency</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                      {creditNote.currency || "USD"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Credit Note</h3>
                </div>

                <div className="mt-4">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 w-1/2">ACCOUNT</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">DEBIT</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">CREDIT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 border-t border-gray-100">
                      {(() => {
                        const totalAmount = creditNote.total || creditNote.amount || 0;
                        const subTotal = creditNote.subtotal || creditNote.subTotal || 0;
                        const shipping = creditNote.shipping || 0;
                        // Calculate correct subtotal (Sales) by subtracting shipping if it's included in total but not subtotal logic, 
                        // usually Subtotal = Sales. Shipping is separate.
                        const salesAmount = subTotal;

                        return (
                          <>
                            {/* Accounts Receivable - Credited (Asset decreases) */}
                            <tr>
                              <td className="py-4 text-sm text-gray-900">Accounts Receivable</td>
                              <td className="py-4 text-sm text-gray-900 text-right text-gray-400">0.00</td>
                              <td className="py-4 text-sm text-gray-900 text-right">{formatCurrencyNumber(totalAmount)}</td>
                            </tr>

                            {/* Shipping / Other Charges - Debited (Expense/Revenue reversal) */}
                            {shipping > 0 && (
                              <tr>
                                <td className="py-4 text-sm text-gray-900">Other Charges</td>
                                <td className="py-4 text-sm text-gray-900 text-right">{formatCurrencyNumber(shipping)}</td>
                                <td className="py-4 text-sm text-gray-900 text-right text-gray-400">0.00</td>
                              </tr>
                            )}

                            {/* Sales - Debited (Revenue decreases) */}
                            <tr>
                              <td className="py-4 text-sm text-gray-900">Sales</td>
                              <td className="py-4 text-sm text-gray-900 text-right">{formatCurrencyNumber(salesAmount)}</td>
                              <td className="py-4 text-sm text-gray-900 text-right text-gray-400">0.00</td>
                            </tr>

                            {/* Tax - Debited (Liability decreases) */}
                            {(creditNote.tax > 0 || (creditNote.taxes && creditNote.taxes.length > 0)) && (
                              <tr>
                                <td className="py-4 text-sm text-gray-900">Tax Payable</td>
                                <td className="py-4 text-sm text-gray-900 text-right">
                                  {formatCurrencyNumber(creditNote.tax || (creditNote.taxes ? creditNote.taxes.reduce((s: any, t: any) => s + (t.amount || 0), 0) : 0))}
                                </td>
                                <td className="py-4 text-sm text-gray-900 text-right text-gray-400">0.00</td>
                              </tr>
                            )}

                            {/* Cost of Goods Sold & Inventory Asset */}
                            {/* Note: These would typically require more data from the backend about linked items/inventory. 
                                Placeholder logic or omitted if data not available. 
                                Assuming standard service/simple item journal for now as per plan. 
                            */}

                            {/* Totals Row */}
                            <tr className="border-t border-gray-200">
                              <td className="py-4 text-sm font-bold text-gray-900"></td>
                              <td className="py-4 text-sm font-bold text-gray-900 text-right">{formatCurrencyNumber(totalAmount)}</td>
                              <td className="py-4 text-sm font-bold text-gray-900 text-right">{formatCurrencyNumber(totalAmount)}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4" ref={sendEmailModalRef} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Send Email</h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  onClick={() => setIsSendEmailModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                    value={emailData.to}
                    onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CC</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                    value={emailData.cc}
                    onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                    placeholder="Enter CC email addresses (comma separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">BCC</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                    value={emailData.bcc}
                    onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                    placeholder="Enter BCC email addresses (comma separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                    value={emailData.subject}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter email subject"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] resize-none transition-all"
                    value={emailData.message}
                    onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter email message"
                    rows={8}
                  />
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "rgba(21, 99, 114, 0.1)", color: "#156372" }}>
                  <FileText size={16} />
                  <span>Credit Note {creditNote.creditNoteNumber || creditNote.id} will be attached as PDF</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-6 py-2 text-white rounded-lg text-sm font-semibold transition-colors"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#0D4A52"}
                  onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#156372"}
                  onClick={handleSendEmailSubmit}
                >
                  Send
                </button>
                <button
                  className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
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
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4" ref={scheduleEmailModalRef} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Schedule Email</h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  onClick={() => setIsScheduleEmailModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                    value={scheduleData.to}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CC</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                    value={scheduleData.cc}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, cc: e.target.value }))}
                    placeholder="Enter CC email addresses (comma separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">BCC</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                    value={scheduleData.bcc}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, bcc: e.target.value }))}
                    placeholder="Enter BCC email addresses (comma separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                    value={scheduleData.subject}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter email subject"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] resize-none transition-all"
                    value={scheduleData.message}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter email message"
                    rows={8}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                      value={scheduleData.date}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                      value={scheduleData.time}
                      onChange={(e) => setScheduleData(prev => ({ ...prev, time: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "rgba(21, 99, 114, 0.1)", color: "#156372" }}>
                  <FileText size={16} />
                  <span>Credit Note {creditNote.creditNoteNumber || creditNote.id} will be attached as PDF</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-6 py-2 text-white rounded-lg text-sm font-semibold transition-colors"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#0D4A52"}
                  onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#156372"}
                  onClick={handleScheduleEmailSubmit}
                >
                  Schedule
                </button>
                <button
                  className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  onClick={() => setIsScheduleEmailModalOpen(false)}
                >
                  Cancel
                </button>
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
                  className="p-1 border rounded transition-colors"
                  style={{ borderColor: "#156372", color: "#dc2626" }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#0D4A52";
                    (e.target as HTMLElement).style.backgroundColor = "rgba(220, 38, 38, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#156372";
                    (e.target as HTMLElement).style.backgroundColor = "transparent";
                  }}
                  onClick={() => setShowAttachmentsModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {creditNoteAttachments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No Files Attached</p>
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${isDragging ? '' : 'border-gray-300'
                        }`}
                      style={isDragging ? { borderColor: "#156372", backgroundColor: "rgba(21, 99, 114, 0.1)" } : {}}
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
                          <span className="font-medium" style={{ color: "#156372" }}>Files</span>
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
                    {(creditNoteAttachments as any[]).map((attachment: any) => {
                      const isImage = attachment.type && attachment.type.startsWith('image/');
                      return (
                        <div
                          key={attachment.id}
                          className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleFileClick(attachment)}
                        >
                          {isImage && attachment.preview ? (
                            <img
                              src={typeof attachment.preview === 'string' ? attachment.preview : undefined}
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
                    {creditNoteAttachments.length < 5 && (
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isDragging ? '' : 'border-gray-300'
                          }`}
                        style={isDragging ? { borderColor: "#156372", backgroundColor: "rgba(21, 99, 114, 0.1)" } : {}}
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
                            <span className="font-medium" style={{ color: "#156372" }}>Files</span>
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
                  className="p-1 border rounded transition-colors"
                  style={{ borderColor: "#156372", color: "#dc2626" }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#0D4A52";
                    (e.target as HTMLElement).style.backgroundColor = "rgba(220, 38, 38, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#156372";
                    (e.target as HTMLElement).style.backgroundColor = "transparent";
                  }}
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
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: "#156372" }}>
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

        {/* Choose Template Modal */}
        {isChooseTemplateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Choose Template</h2>
                <button
                  className="p-2 text-white rounded transition-colors"
                  style={{ backgroundColor: "#dc2626" }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#b91c1c"}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "#dc2626"}
                  onClick={() => setIsChooseTemplateModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search templates..."
                    />
                  </div>
                </div>

                {/* Template Options */}
                <div className="space-y-3">
                  {[
                    "Standard Template",
                    "Professional Template",
                    "Modern Template",
                    "Classic Template",
                    "Minimal Template"
                  ]
                    .filter(template => template.toLowerCase().includes(templateSearch.toLowerCase()))
                    .map((template) => (
                      <div
                        key={template}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedTemplate === template
                          ? ""
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        style={selectedTemplate === template ? { borderColor: "#156372", backgroundColor: "rgba(21, 99, 114, 0.1)" } : {}}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{template}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {template === "Standard Template" && "Clean and professional layout"}
                              {template === "Professional Template" && "Detailed business layout"}
                              {template === "Modern Template" && "Contemporary design"}
                              {template === "Classic Template" && "Traditional business style"}
                              {template === "Minimal Template" && "Simple and clean"}
                            </div>
                          </div>
                          {selectedTemplate === template && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#156372" }}>
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e: React.MouseEvent) => ((e.target as HTMLElement).style.backgroundColor = "#0D4A52")}
                  onMouseLeave={(e: React.MouseEvent) => ((e.target as HTMLElement).style.backgroundColor = "#156372")}
                  onClick={() => {
                    console.log("Selected template:", selectedTemplate);
                    setIsChooseTemplateModalOpen(false);
                  }}
                >
                  Apply Template
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsChooseTemplateModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Organization Address Modal */}
        {isOrganizationAddressModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Organization Address</h2>
                <button
                  className="p-2 text-white rounded transition-colors"
                  style={{ backgroundColor: "#dc2626" }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#b91c1c"}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "#dc2626"}
                  onClick={() => setIsOrganizationAddressModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Logo Upload Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Logo</h3>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={typeof logoPreview === 'string' ? logoPreview : undefined}
                          alt="Logo Preview"
                          className="w-20 h-20 object-cover rounded border border-gray-300"
                        />
                        <button
                          className="absolute -top-2 -right-2 p-1 text-white rounded-full transition-colors"
                          style={{ backgroundColor: "#dc2626" }}
                          onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#b91c1c"}
                          onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#dc2626"}
                          onClick={() => {
                            setLogoPreview(null);
                            setLogoFile(null);
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                        <Upload size={24} className="text-gray-400" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        ref={organizationAddressFileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoPreview(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors"
                        style={{ backgroundColor: "#156372" }}
                        onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#0D4A52"}
                        onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#156372"}
                        onClick={() => organizationAddressFileInputRef.current?.click()}
                      >
                        Upload Logo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Address Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={organizationData.street1}
                      onChange={(e) => setOrganizationData({ ...organizationData, street1: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Laleex"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={organizationData.street2}
                      onChange={(e) => setOrganizationData({ ...organizationData, street2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Laleex"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={organizationData.city}
                      onChange={(e) => setOrganizationData({ ...organizationData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="mogadishu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                    <input
                      type="text"
                      value={organizationData.zipCode}
                      onChange={(e) => setOrganizationData({ ...organizationData, zipCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="22223"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                    <input
                      type="text"
                      value={organizationData.stateProvince}
                      onChange={(e) => setOrganizationData({ ...organizationData, stateProvince: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nairobi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={organizationData.phone}
                      onChange={(e) => setOrganizationData({ ...organizationData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fax Number</label>
                    <input
                      type="text"
                      value={organizationData.faxNumber}
                      onChange={(e) => setOrganizationData({ ...organizationData, faxNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={organizationData.websiteUrl}
                      onChange={(e) => setOrganizationData({ ...organizationData, websiteUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = "#0D4A52"}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = "#156372"}
                  onClick={async () => {
                    try {
                      const payload = {
                        addressLine1: organizationData.street1,
                        addressLine2: organizationData.street2,
                        city: organizationData.city,
                        zipCode: organizationData.zipCode,
                        state: organizationData.stateProvince,
                        phone: organizationData.phone,
                        fax: organizationData.faxNumber,
                        website: organizationData.websiteUrl,
                        industry: organizationData.industry,
                        logo: logoPreview // In a real app, you might upload the file first
                      };
                      const res = await settingsAPI.updateOrganizationProfile(payload);
                      if (res && res.success) {
                        setOrganizationProfile(res.data || { ...organizationProfile, ...payload });
                        alert("Organization profile updated successfully!");
                        setIsOrganizationAddressModalOpen(false);
                      } else {
                        alert("Failed to update organization profile: " + (res.message || "Unknown error"));
                      }
                    } catch (error: any) {
                      console.error("Error saving organization address:", error);
                      alert("Error saving organization address: " + error.message);
                    }
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

        {/* Terms & Conditions Modal */}
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
                  className="p-2 text-white rounded transition-colors"
                  style={{ backgroundColor: "#dc2626" }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#b91c1c"}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "#dc2626"}
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
                      checked={termsData.useNotesForAllCreditNotes}
                      onChange={(e) => setTermsData({ ...termsData, useNotesForAllCreditNotes: e.target.checked })}
                      className="w-4 h-4 border-gray-300 rounded focus:ring-[#156372]"
                      style={{ accentColor: "#156372" }}
                    />
                    <span className="text-sm text-gray-700">Use this in future for all credit notes of all customers.</span>
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
                      checked={termsData.useTermsForAllCreditNotes}
                      onChange={(e) => setTermsData({ ...termsData, useTermsForAllCreditNotes: e.target.checked })}
                      className="w-4 h-4 border-gray-300 rounded focus:ring-[#156372]"
                      style={{ accentColor: "#156372" }}
                    />
                    <span className="text-sm text-gray-700">Use this in future for all credit notes of all customers.</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#0D4A52"}
                  onMouseLeave={(e: React.MouseEvent) => (e.target as HTMLElement).style.backgroundColor = "#156372"}
                  onClick={() => {
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

        {/* Refund Modal */}
        {isRefundModalOpen && creditNote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={(e) => {
            if (e.target === e.currentTarget) handleRefundCancel();
          }}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" ref={refundModalRef} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
                <h2 className="text-xl font-semibold text-gray-900">Refund ({creditNote.creditNoteNumber || creditNote.id})</h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  onClick={handleRefundCancel}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Customer and Credit Note Information */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(21, 99, 114, 0.1)" }}
                    >
                      <User size={20} style={{ color: "#156372" }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer Name</div>
                      <div className="text-base font-semibold text-gray-900">{creditNote.customerName || creditNote.customer || "-"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(21, 99, 114, 0.1)" }}
                    >
                      <FileText size={20} style={{ color: "#156372" }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Credit Note Number</div>
                      <div className="text-base font-semibold text-gray-900">{creditNote.creditNoteNumber || creditNote.id}</div>
                    </div>
                  </div>
                </div>

                {/* Amount Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">{creditNote.currency || "USD"}</div>
                    <input
                      type="number"
                      value={refundData.amount}
                      onChange={(e) => setRefundData({ ...refundData, amount: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={creditNote.balance || creditNote.total || creditNote.amount || 0}
                      className="w-full pl-16 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 transition-all"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#156372"; }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#d1d5db"; }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Balance : {formatCurrency(creditNote.balance || creditNote.total || creditNote.amount || 0, creditNote.currency)}
                  </div>
                </div>

                {/* Refunded On */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Refunded On<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative" ref={refundDatePickerRef}>
                    <input
                      type="text"
                      value={refundData.refundedOn}
                      readOnly
                      onClick={() => setIsRefundDatePickerOpen(!isRefundDatePickerOpen)}
                      placeholder="Select date"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 transition-all pr-10 cursor-pointer"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#156372"; }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#d1d5db"; }}
                    />
                    <Calendar
                      size={18}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                      onClick={() => setIsRefundDatePickerOpen(!isRefundDatePickerOpen)}
                    />
                    {isRefundDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 w-72">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <button onClick={() => navigateRefundMonth("prev")} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                              <ChevronLeft size={16} />
                            </button>
                            <span className="font-semibold text-gray-900">{months[refundDateCalendar.getMonth()]} {refundDateCalendar.getFullYear()}</span>
                            <button onClick={() => navigateRefundMonth("next")} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                              <ChevronRight size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                              <div key={day} className={`text-xs font-semibold text-center py-2 ${day === "Sun" || day === "Fri" ? "text-gray-400" : "text-gray-600"
                                }`}>
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(refundDateCalendar).map((day, idx) => (
                              <button
                                key={idx}
                                className={`text-sm py-2 rounded hover:bg-gray-100 ${day.month !== "current" ? "text-gray-300" : "text-gray-900"
                                  }`}
                                onClick={() => handleRefundDateSelect(day.fullDate)}
                              >
                                {day.date}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Mode</label>
                  <div className="relative" ref={paymentModeDropdownRef}>
                    <input
                      type="text"
                      value={refundData.paymentMode}
                      readOnly
                      onClick={() => setIsPaymentModeDropdownOpen(!isPaymentModeDropdownOpen)}
                      placeholder="Select payment mode"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 transition-all pr-10 cursor-pointer"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#156372"; }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#d1d5db"; }}
                    />
                    <ChevronDownIcon
                      size={18}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                      onClick={() => setIsPaymentModeDropdownOpen(!isPaymentModeDropdownOpen)}
                    />
                    {isPaymentModeDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                        {paymentModeOptions.map((mode) => (
                          <div
                            key={mode}
                            className="p-3 cursor-pointer text-sm text-gray-700 transition-colors"
                            style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as React.CSSProperties}
                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                            onClick={() => {
                              setRefundData({ ...refundData, paymentMode: mode });
                              setIsPaymentModeDropdownOpen(false);
                            }}
                          >
                            {mode}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reference#</label>
                  <input
                    type="text"
                    value={refundData.referenceNumber}
                    onChange={(e) => setRefundData({ ...refundData, referenceNumber: e.target.value })}
                    placeholder="Enter reference number"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 transition-all"
                    style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#156372"; }}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#d1d5db"; }}
                  />
                </div>

                {/* From Account */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Account<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative" ref={fromAccountDropdownRef}>
                    <input
                      type="text"
                      value={refundData.fromAccount}
                      readOnly
                      onClick={() => setIsFromAccountDropdownOpen(!isFromAccountDropdownOpen)}
                      placeholder="Select account"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 transition-all pr-10 cursor-pointer"
                      style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                      onFocus={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#156372"; }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => { (e.target as HTMLElement).style.borderColor = "#d1d5db"; }}
                    />
                    <ChevronDownIcon
                      size={18}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                      onClick={() => setIsFromAccountDropdownOpen(!isFromAccountDropdownOpen)}
                    />
                    {isFromAccountDropdownOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-[70] max-h-60 overflow-y-auto">
                        {bankAccounts.map((account, index) => {
                          const accountId = getAccountId(account);
                          const accountName = getAccountDisplayName(account);
                          return (
                            <div
                              key={accountId || `refund-account-${index}`}
                              className="p-3 cursor-pointer text-sm text-gray-700 transition-colors"
                              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                              onClick={() => {
                                setRefundData({ ...refundData, fromAccount: accountName, fromAccountId: accountId });
                                setIsFromAccountDropdownOpen(false);
                              }}
                            >
                              {accountName}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={refundData.description}
                    onChange={(e) => setRefundData({ ...refundData, description: e.target.value })}
                    placeholder="Enter description"
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 transition-all resize-none"
                    style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
                    onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => { (e.target as HTMLElement).style.borderColor = "#156372"; }}
                    onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => { (e.target as HTMLElement).style.borderColor = "#d1d5db"; }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                <button
                  className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  onClick={handleRefundCancel}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2 text-white border-none rounded-lg text-sm font-semibold transition-all"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                  onClick={handleRefundSave}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Apply to Invoices Modal */}
        {isApplyToInvoicesOpen && (
          <ApplyToInvoices
            isOpen={isApplyToInvoicesOpen}
            onClose={() => setIsApplyToInvoicesOpen(false)}
            creditNote={creditNote}
            onSave={handleSaveAllocations}
          />
        )}
      </div>
    </div>
  );
}

