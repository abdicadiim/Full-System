import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPaymentById, getPayments, updatePayment, deletePayment, Payment } from "../../../sales/salesModel";
import { settingsAPI, bankAccountsAPI, refundsAPI, chartOfAccountsAPI } from "../../../../services/api";
import { useCurrency } from "../../../../hooks/useCurrency";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  X, Edit, Send, FileText, MoreVertical,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, Link2, Mail,
  User, Calendar, ChevronDown as ChevronDownIcon, Paperclip, MessageCircle, RotateCcw,
  FileUp, Bold, Italic, Underline, Download, Upload, Layers, Monitor, RefreshCw
} from "lucide-react";

export default function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { baseCurrency, symbol } = useCurrency();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAllPaymentsDropdownOpen, setIsAllPaymentsDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const [isVoidReasonModalOpen, setIsVoidReasonModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isConvertDraftModalOpen, setIsConvertDraftModalOpen] = useState(false);
  const [convertDraftReason, setConvertDraftReason] = useState("");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: ""
  });
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
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [paymentAttachments, setPaymentAttachments] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentBold, setCommentBold] = useState(false);
  const [commentItalic, setCommentItalic] = useState(false);
  const [commentUnderline, setCommentUnderline] = useState(false);
  const [isSidebarMoreMenuOpen, setIsSidebarMoreMenuOpen] = useState(false);
  const [isSidebarSortBySubmenuOpen, setIsSidebarSortBySubmenuOpen] = useState(false);
  const [isSidebarImportMenuOpen, setIsSidebarImportMenuOpen] = useState(false);
  const [sidebarSelectedSortField, setSidebarSelectedSortField] = useState("Date");
  const [sidebarSortConfig, setSidebarSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "paymentDate",
    direction: "asc"
  });
  const [isSidebarRefreshing, setIsSidebarRefreshing] = useState(false);
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState({
    name: "TABAN ENTERPRISES",
    street1: "",
    street2: "",
    city: "",
    stateProvince: "",
    country: "Somalia",
    zipCode: "",
    phone: "",
    email: "",
    websiteUrl: ""
  });
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const sidebarMoreMenuRef = useRef<HTMLDivElement>(null);
  const sidebarSortMenuRef = useRef<HTMLDivElement>(null);
  const sidebarImportMenuRef = useRef<HTMLDivElement>(null);
  const allPaymentsDropdownRef = useRef<HTMLDivElement>(null);
  const pdfDropdownRef = useRef<HTMLDivElement>(null);
  const emailModalRef = useRef<HTMLDivElement>(null);
  const refundModalRef = useRef<HTMLDivElement>(null);
  const paymentModeDropdownRef = useRef<HTMLDivElement>(null);
  const fromAccountDropdownRef = useRef<HTMLDivElement>(null);
  const refundDatePickerRef = useRef<HTMLDivElement>(null);
  const attachmentsFileInputRef = useRef<HTMLInputElement>(null);
  const receiptPaperRef = useRef<HTMLDivElement>(null);

  const paymentModeOptions = ["Cash", "Check", "Credit Card", "Debit Card", "Bank Transfer", "PayPal", "Other"];
  const depositToOptions = ["[123231] mohamed", "[123232] Account 1", "[123233] Account 2"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const statusFilters = [
    "All Payments",
    "Draft",
    "Paid",
    "Void"
  ];

  const paymentFields = [
    "Created Time",
    "Last Modified Time",
    "Date",
    "Payment #",
    "Customer Name",
    "Mode",
    "Amount",
    "Unused Amount"
  ];

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        const paymentData = await getPaymentById(id || "");
        if (paymentData) {
          setPayment(paymentData);
          setPaymentAttachments(Array.isArray((paymentData as any).attachments) ? (paymentData as any).attachments : []);
          setComments(Array.isArray((paymentData as any).comments) ? (paymentData as any).comments : []);
        } else {
          navigate("/payments/payments-received");
        }

        const allPayments = await getPayments();
        setPayments(allPayments);
      } catch (error) {
        console.error("Error loading payment data:", error);
      }
    };

    loadPaymentData();

    const fetchOrganizationProfile = async () => {
      try {
        const response = await settingsAPI.getOrganizationProfile();
        if (response && response.success && response.data) {
          const org = response.data;
          setOrganizationProfile(org);
          if (org.logo) setLogoPreview(org.logo);
          if (org.address) {
            setOrganizationData(prev => ({
              ...prev,
              name: org.name || prev.name,
              street1: org.address.street1 || prev.street1,
              street2: org.address.street2 || prev.street2,
              city: org.address.city || prev.city,
              stateProvince: org.address.state || prev.stateProvince,
              country: org.address.country || prev.country,
              zipCode: org.address.zipCode || prev.zipCode,
              phone: org.phone || prev.phone,
              email: org.email || prev.email,
              websiteUrl: org.website || prev.websiteUrl
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching organization profile:", error);
      }
    };
    fetchOrganizationProfile();

    const fetchDropdownData = async () => {
      try {
        const accountsResponse = await chartOfAccountsAPI.getAccounts({ limit: 1000 });
        if (accountsResponse && accountsResponse.data) {
          const cashBankAccounts = accountsResponse.data
            .filter((acc: any) => {
              const accountType = (acc.account_type || acc.accountType || "").toLowerCase();
              const name = (acc.accountName || acc.name || "").toLowerCase();
              return accountType === 'cash' ||
                accountType === 'bank' ||
                accountType === 'asset' ||
                name.includes('cash') ||
                name.includes('bank') ||
                name.includes('petty') ||
                name.includes('undeposited');
            })
            .map((acc: any) => {
              const name = acc.accountName || acc.name || "Unnamed Account";
              const code = acc.accountCode || acc.code || "";
              // If code looks like a slug (has underscores or no numbers), only show name
              const showCode = code && !/^[a-z_]+$/.test(code);
              return {
                ...acc,
                id: acc.id || acc._id,
                displayName: showCode ? `[${code}] ${name}` : name,
                accountName: name,
                accountCode: code
              };
            });
          setBankAccounts(cashBankAccounts);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };
    fetchDropdownData();

    const fetchRefunds = async () => {
      if (!id) return;
      try {
        const response = await refundsAPI.getByPaymentId(id);
        if (response && response.success) {
          setRefunds(response.data);
        }
      } catch (error) {
        console.error("Error fetching refunds:", error);
      }
    };
    fetchRefunds();
  }, [id, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (sidebarMoreMenuRef.current && !sidebarMoreMenuRef.current.contains(event.target as Node)) {
        setIsSidebarMoreMenuOpen(false);
        setIsSidebarSortBySubmenuOpen(false);
        setIsSidebarImportMenuOpen(false);
      }
      if (allPaymentsDropdownRef.current && !allPaymentsDropdownRef.current.contains(event.target as Node)) {
        setIsAllPaymentsDropdownOpen(false);
      }
      if (pdfDropdownRef.current && !pdfDropdownRef.current.contains(event.target as Node)) {
        setIsPdfDropdownOpen(false);
      }
      if (emailModalRef.current && !emailModalRef.current.contains(event.target as Node) && isEmailModalOpen) {
        setIsEmailModalOpen(false);
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

    if (isMoreMenuOpen || isSidebarMoreMenuOpen || isAllPaymentsDropdownOpen || isPdfDropdownOpen || isEmailModalOpen ||
      isRefundModalOpen || isPaymentModeDropdownOpen || isFromAccountDropdownOpen || isRefundDatePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen, isSidebarMoreMenuOpen, isAllPaymentsDropdownOpen, isPdfDropdownOpen, isEmailModalOpen,
    isRefundModalOpen, isPaymentModeDropdownOpen, isFromAccountDropdownOpen, isRefundDatePickerOpen]);

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files as File[]);
    }
    e.target.value = ''; // Reset input
  };

  const formatCurrency = (amount: number | string, currency = symbol || baseCurrency?.code || "USD") => {
    return `${currency}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    // If already formatted, return as is
    if (dateString.includes(" ")) return dateString;
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleFilterSelect = (filter) => {
    setIsAllPaymentsDropdownOpen(false);
    if (filter === "All Payments") {
      navigate("/payments/payments-received");
    } else {
      navigate(`/payments/payments-received?status=${filter.toLowerCase()}`);
    }
  };

  const filteredStatusOptions = statusFilters.filter(filter =>
    filter.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const filteredPayments = Array.isArray(payments) ? payments.filter(p => {
    if (filterSearch) {
      return p.customerName?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        p.paymentNumber?.toString().includes(filterSearch);
    }
    return true;
  }) : [];

  const handleSidebarSort = (sortField: string) => {
    const sortKeyMap: Record<string, string> = {
      "Created Time": "createdTime",
      "Last Modified Time": "lastModifiedTime",
      "Date": "paymentDate",
      "Payment #": "paymentNumber",
      "Customer Name": "customerName",
      "Mode": "paymentMode",
      "Amount": "amountReceived",
      "Unused Amount": "unusedAmount",
    };

    const key = sortKeyMap[sortField] || sortField;
    const direction: "asc" | "desc" =
      sidebarSortConfig.key === key && sidebarSortConfig.direction === "asc" ? "desc" : "asc";

    const sorted = [...payments].sort((a: any, b: any) => {
      let aValue: any = a[key];
      let bValue: any = b[key];

      if (key === "paymentDate" || key === "createdTime" || key === "lastModifiedTime") {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      } else if (key === "amountReceived" || key === "unusedAmount") {
        aValue = Number(aValue || 0);
        bValue = Number(bValue || 0);
      } else {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setPayments(sorted);
    setSidebarSortConfig({ key, direction });
    setSidebarSelectedSortField(sortField);
    setIsSidebarSortBySubmenuOpen(false);
    setIsSidebarMoreMenuOpen(false);
  };

  const handleSidebarImportPayments = () => {
    setIsSidebarMoreMenuOpen(false);
    setIsSidebarImportMenuOpen(false);
    navigate("/payments/payments-received/import");
  };

  const handleSidebarImportAppliedExcessPayments = () => {
    setIsSidebarMoreMenuOpen(false);
    setIsSidebarImportMenuOpen(false);
    navigate("/payments/payments-received/import-applied-excess");
  };

  const handleSidebarExport = () => {
    setIsSidebarMoreMenuOpen(false);
    const csvContent = [
      ["Payment #", "Date", "Customer Name", "Payment Mode", "Amount", "Status", "Reference Number"],
      ...filteredPayments.map(p => [
        p.paymentNumber || p.id,
        p.paymentDate || "",
        p.customerName || "",
        p.paymentMode || "",
        p.amountReceived || 0,
        p.status || "",
        p.referenceNumber || ""
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payments-export-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSidebarManageCustomFields = () => {
    setIsSidebarMoreMenuOpen(false);
    navigate("/settings/payments-received");
  };

  const handleSidebarOnlinePayments = () => {
    setIsSidebarMoreMenuOpen(false);
    alert("Online Payments configuration will be implemented here");
  };

  const handleSidebarResetColumnWidth = () => {
    setIsSidebarMoreMenuOpen(false);
    localStorage.removeItem("payments_received_column_widths");
    alert("Column widths have been reset");
  };

  const handleSidebarRefreshList = async () => {
    setIsSidebarRefreshing(true);
    setIsSidebarMoreMenuOpen(false);
    try {
      const allPayments = await getPayments();
      setPayments(allPayments);
      if (payment) {
        const refreshedCurrent = allPayments.find((p: any) => String(p.id) === String(payment.id));
        if (refreshedCurrent) setPayment(refreshedCurrent);
      }
    } finally {
      setIsSidebarRefreshing(false);
    }
  };

  // Initialize email data when payment is loaded
  useEffect(() => {
    if (payment) {
      setEmailData({
        to: payment.customerEmail || payment.thankYouRecipients?.[0]?.email || "",
        subject: `Payment Receipt - ${payment.paymentNumber || payment.id}`,
        message: `Dear ${payment.customerName || "Customer"},\n\nThank you for your payment. Please find the payment receipt attached.\n\nPayment Details:\n- Payment Number: ${payment.paymentNumber || payment.id}\n- Amount: ${formatCurrency(payment.amountReceived || 0, payment.currency)}\n- Payment Date: ${formatDate(payment.paymentDate)}\n\nBest regards,\nTaban Books`
      });
    }
  }, [payment]);

  // Initialize refund data when refund modal opens
  useEffect(() => {
    if (isRefundModalOpen && payment) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = months[today.getMonth()];
      const year = today.getFullYear();
      const formattedDate = `${day} ${month} ${year}`;

      setRefundData({
        amount: (payment.amountReceived || 0).toString(),
        refundedOn: formattedDate,
        paymentMode: payment.paymentMode || "Cash",
        referenceNumber: "",
        fromAccount: payment.depositTo || (bankAccounts.length > 0 ? (bankAccounts[0].displayName || bankAccounts[0].accountName) : ""),
        fromAccountId: bankAccounts.find(a => (a.accountName === payment.depositTo || a.name === payment.depositTo || a.displayName === payment.depositTo))?._id || (bankAccounts.length > 0 ? (bankAccounts[0]._id || bankAccounts[0].id) : ""),
        description: ""
      });
    }
  }, [isRefundModalOpen, payment, bankAccounts]);

  const handleSendEmail = () => {
    // Navigate to the dedicated Send Email page for payment receipts
    navigate(`/payments/payments-received/${id}/send-email`, { state: { paymentData: payment } });
  };

  const handleEmailSend = () => {
    // Create mailto link
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.message);
    const mailtoLink = `mailto:${emailData.to}?subject=${subject}&body=${body}`;

    // Open default email client
    window.location.href = mailtoLink;

    // Close modal after a short delay
    setTimeout(() => {
      setIsEmailModalOpen(false);
      alert("Email client opened. Please send the email from your email application.");
    }, 100);
  };

  const handleDownloadPDF = async () => {
    setIsPdfDropdownOpen(false);
    if (!payment || !receiptPaperRef.current) return;

    try {
      const canvas = await html2canvas(receiptPaperRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
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

      const safePaymentNumber = String(payment.paymentNumber || payment.id || "payment-receipt").replace(/[^a-zA-Z0-9-_]/g, "-");
      pdf.save(`${safePaymentNumber}.pdf`);
    } catch (error) {
      console.error("Error downloading payment receipt PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  // handlePrint removed as requested

  const handleRefund = () => {
    setIsRefundModalOpen(true);
  };

  const handleRefundSave = async () => {
    // Validate required fields
    if (!refundData.amount || !refundData.refundedOn || !refundData.fromAccount) {
      alert("Please fill in all required fields: Amount, Refunded On, and From Account");
      return;
    }

    // Validate amount
    const refundAmount = parseFloat(refundData.amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      alert("Please enter a valid refund amount");
      return;
    }

    if (refundAmount > (payment?.amountReceived || 0)) {
      alert(`Refund amount cannot exceed the payment amount of ${payment?.amountReceived || 0}`);
      return;
    }

    try {

      // Create refund payload
      const refundPayload = {
        paymentId: payment?.id || payment?._id || id,
        amount: refundAmount,
        refundDate: refundData.refundedOn,
        paymentMethod: refundData.paymentMode || 'cash',
        referenceNumber: refundData.referenceNumber,
        fromAccount: refundData.fromAccountId || refundData.fromAccount,
        description: refundData.description
      };

      // Call API to create refund
      const response = await refundsAPI.create(refundPayload);

      if (response.success) {
        alert("Refund processed successfully!");
        setIsRefundModalOpen(false);

        // Reset refund form
        setRefundData({
          amount: "",
          refundedOn: "",
          paymentMode: "",
          referenceNumber: "",
          fromAccount: "",
          description: ""
        });

        // Refresh payment and refunds data
        const paymentData = await getPaymentById(id);
        if (paymentData) {
          setPayment(paymentData);
        }
        const refundsResponse = await refundsAPI.getByPaymentId(id);
        if (refundsResponse && refundsResponse.success) {
          setRefunds(refundsResponse.data);
        }
      } else {
        alert(`Failed to process refund: ${response.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error("Error processing refund:", error);
      alert(`Error processing refund: ${error.message || 'Please try again'}`);
    }
  };

  const handleRefundCancel = () => {
    setIsRefundModalOpen(false);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        month: "prev",
        fullDate: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: "current",
        fullDate: new Date(year, month, i)
      });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        month: "next",
        fullDate: new Date(year, month + 1, i)
      });
    }
    return days;
  };

  const handleRefundDateSelect = (date) => {
    const formatted = formatDate(date);
    setRefundData(prev => ({
      ...prev,
      refundedOn: formatted
    }));
    setIsRefundDatePickerOpen(false);
    setRefundDateCalendar(date);
  };

  const navigateRefundMonth = (direction) => {
    const newDate = new Date(refundDateCalendar);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setRefundDateCalendar(newDate);
  };

  const persistPaymentMeta = async (attachments: any[], paymentComments: any[]) => {
    if (!id) return;
    try {
      await updatePayment(id, {
        attachments,
        comments: paymentComments
      } as any);
      setPayment(prev => prev ? ({ ...prev, attachments, comments: paymentComments } as any) : prev);
    } catch (error) {
      console.error("Error saving payment comments/attachments:", error);
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
  const handleFileUpload = async (files: File[]) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (paymentAttachments.length + validFiles.length > 5) {
      alert("Maximum 5 files allowed. Please remove some files first.");
      return;
    }

    try {
      const newAttachments: any[] = [];

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

      const updated = [...paymentAttachments, ...newAttachments].slice(0, 5);
      setPaymentAttachments(updated);
      await persistPaymentMeta(updated, comments);
    } catch (error) {
      console.error("Error processing uploaded files:", error);
      alert("Failed to upload files. Please try again.");
    }
  };

  const handleFileClick = (attachment: any) => {
    if (attachment.type && attachment.type.startsWith('image/')) {
      setSelectedImage(attachment.preview || null);
      setShowImageViewer(true);
    } else {
      if (attachment.preview) {
        // For non-image files stored as base64, create a download link
        const a = document.createElement('a');
        a.href = attachment.preview;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  const handleRemoveAttachment = async (attachmentId: string | number) => {
    const updated = paymentAttachments.filter(att => String(att.id) !== String(attachmentId));
    setPaymentAttachments(updated);
    await persistPaymentMeta(updated, comments);
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
      text: newComment,
      author: "You",
      timestamp: new Date().toISOString(),
      bold: commentBold,
      italic: commentItalic,
      underline: commentUnderline
    };

    const updated = [...comments, comment];
    setComments(updated);
    await persistPaymentMeta(paymentAttachments, updated);
    setNewComment("");
    setCommentBold(false);
    setCommentItalic(false);
    setCommentUnderline(false);
  };

  // More Menu Handlers
  const handleVoid = () => {
    setIsMoreMenuOpen(false);
    setVoidReason("");
    setIsVoidReasonModalOpen(true);
  };

  const handleVoidConfirm = async () => {
    if (!payment) return;
    try {
      const updatedPayment = {
        ...payment,
        status: "void",
        voidReason: voidReason.trim(),
        voidedAt: new Date().toISOString()
      };
      await updatePayment(id, updatedPayment);
      setPayment(updatedPayment);
      setIsVoidReasonModalOpen(false);
      alert("Payment voided successfully");
    } catch (error) {
      console.error("Error voiding payment:", error);
      alert("Failed to void payment. Please try again.");
    }
  };

  const handleOpenConvertToDraft = () => {
    setConvertDraftReason("");
    setIsConvertDraftModalOpen(true);
  };

  const handleConvertToDraft = async () => {
    if (!payment) return;
    try {
      const updatedPayment = {
        ...payment,
        status: "draft",
        convertToDraftReason: convertDraftReason.trim(),
        convertedToDraftAt: new Date().toISOString()
      };
      await updatePayment(id, updatedPayment);
      setPayment(updatedPayment);
      setIsConvertDraftModalOpen(false);
      alert("Payment converted to draft");
    } catch (error) {
      console.error("Error converting payment to draft:", error);
      alert("Failed to convert to draft. Please try again.");
    }
  };

  const handleMarkAsPaid = async () => {
    if (!payment) return;
    try {
      const updatedPayment = {
        ...payment,
        status: "paid",
      };
      await updatePayment(id, updatedPayment);
      setPayment(updatedPayment);
      alert("Payment marked as paid");
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      alert("Failed to mark as paid. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!payment) return;

    if (window.confirm(`Are you sure you want to delete payment ${payment.paymentNumber || payment.id}? This action cannot be undone.`)) {
      try {
        await deletePayment(id);
        setIsMoreMenuOpen(false);
        navigate("/payments/payments-received");
      } catch (error) {
        console.error("Error deleting payment:", error);
        alert("Failed to delete payment. Please try again.");
      }
    }
  };

  if (!payment) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="p-10 text-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white h-full overflow-hidden flex flex-col">
        <div className="h-[74px] px-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="relative flex-1 min-w-0 mr-2" ref={allPaymentsDropdownRef}>
            <button
              onClick={() => setIsAllPaymentsDropdownOpen(!isAllPaymentsDropdownOpen)}
              className="flex items-center gap-2 w-full text-left"
            >
              <span className="text-xl font-semibold text-gray-900 leading-none truncate">All Received Payments</span>
              {isAllPaymentsDropdownOpen ? (
                <ChevronUp size={16} className="text-blue-600 flex-shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-blue-600 flex-shrink-0" />
              )}
            </button>

            {isAllPaymentsDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px] overflow-hidden">
                <div className="py-1">
                  {statusFilters.map((filter) => (
                    <div
                      key={filter}
                      onClick={() => handleFilterSelect(filter)}
                      className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">{filter}</span>
                      <Star size={16} className="text-gray-400" fill="none" strokeWidth={1.5} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="h-9 w-9 rounded-md bg-[#22c55e] hover:bg-[#16a34a] text-white transition-colors flex items-center justify-center"
              onClick={() => navigate("/payments/payments-received/new")}
              title="New Payment"
            >
              <Plus size={18} />
            </button>
            <div className="relative" ref={sidebarMoreMenuRef}>
              <button
                className="h-9 w-9 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center justify-center"
                onClick={() => setIsSidebarMoreMenuOpen(!isSidebarMoreMenuOpen)}
                title="More"
              >
                <MoreVertical size={16} />
              </button>
              {isSidebarMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[220px] z-[1000] overflow-visible">
                  <div
                    className={`relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm group ${isSidebarSortBySubmenuOpen ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-blue-500 hover:text-white"}`}
                    ref={sidebarSortMenuRef}
                    onClick={() => {
                      const next = !isSidebarSortBySubmenuOpen;
                      setIsSidebarSortBySubmenuOpen(next);
                      if (next) setIsSidebarImportMenuOpen(false);
                    }}
                  >
                    <ArrowUpDown size={16} className={`flex-shrink-0 ${isSidebarSortBySubmenuOpen ? "text-white" : "text-blue-600 group-hover:text-white"}`} />
                    <span className="flex-1">Sort by</span>
                    <ChevronRight size={16} className={`flex-shrink-0 ${isSidebarSortBySubmenuOpen ? "text-white" : "text-gray-400 group-hover:text-white"}`} />

                    {isSidebarSortBySubmenuOpen && (
                      <div
                        className="absolute top-0 right-full mr-1.5 w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {paymentFields.map((field) => (
                          <div
                            key={field}
                            className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sidebarSelectedSortField === field ? "!bg-blue-600 !text-white" : "hover:bg-gray-100"}`}
                            onClick={() => handleSidebarSort(field)}
                          >
                            {field}
                            {sidebarSelectedSortField === field && (
                              sidebarSortConfig.direction === "asc" ?
                                <ChevronUp size={14} className="text-white" /> :
                                <ChevronDown size={14} className="text-white" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className={`relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm group ${isSidebarImportMenuOpen ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-blue-500 hover:text-white"}`}
                    ref={sidebarImportMenuRef}
                    onClick={() => {
                      const next = !isSidebarImportMenuOpen;
                      setIsSidebarImportMenuOpen(next);
                      if (next) setIsSidebarSortBySubmenuOpen(false);
                    }}
                  >
                    <Download size={16} className={`flex-shrink-0 ${isSidebarImportMenuOpen ? "text-white" : "text-blue-600 group-hover:text-white"}`} />
                    <span className="flex-1">Import</span>
                    <ChevronRight size={16} className={`flex-shrink-0 ${isSidebarImportMenuOpen ? "text-white" : "text-gray-400 group-hover:text-white"}`} />

                    {isSidebarImportMenuOpen && (
                      <div
                        className="absolute top-0 right-full mr-1.5 min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-blue-500 hover:text-white"
                          onClick={handleSidebarImportPayments}
                        >
                          Import Payments
                        </div>
                        <div
                          className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-blue-500 hover:text-white"
                          onClick={handleSidebarImportAppliedExcessPayments}
                        >
                          Import Applied Excess Payments
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50"
                    onClick={handleSidebarExport}
                  >
                    <Upload size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="flex-1">Export Payments</span>
                  </div>

                  <div
                    className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50"
                    onClick={handleSidebarManageCustomFields}
                  >
                    <Layers size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="flex-1">Manage Custom Fields</span>
                  </div>

                  <div
                    className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50"
                    onClick={handleSidebarOnlinePayments}
                  >
                    <Monitor size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="flex-1">Online Payments</span>
                  </div>

                  <div
                    className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50"
                    onClick={handleSidebarResetColumnWidth}
                  >
                    <RefreshCw size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="flex-1">Reset Column Width</span>
                  </div>

                  <div
                    className={`flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50 ${isSidebarRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (!isSidebarRefreshing) {
                        handleSidebarRefreshList();
                      }
                    }}
                  >
                    <RefreshCw size={16} className={`text-blue-600 flex-shrink-0 ${isSidebarRefreshing ? "animate-spin" : ""}`} />
                    <span className="flex-1">Refresh List</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment List */}
        <div className="divide-y divide-gray-200 flex-1 overflow-hidden">
          {filteredPayments.length > 0 ? (
            filteredPayments.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/payments/payments-received/${p.id}`)}
                className={`p-4 cursor-pointer transition-colors ${p.id === id ? "bg-blue-50 border-l-4 border-blue-600" : "hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {p.id === id ? (
                      <CheckSquare size={16} className="text-gray-600" fill="#6b7280" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{p.customerName || "Unknown"}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{p.paymentNumber || p.id}</span>
                      <span>â€¢</span>
                      <span>{formatDate(p.paymentDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs font-semibold ${p.status === "paid"
                        ? "text-green-700"
                        : p.status === "void"
                          ? "text-red-700"
                          : "text-yellow-700"
                        }`}>
                        {(p.status || "DRAFT").toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{p.paymentMode || ""}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 mt-2">{formatCurrency(p.amountReceived || 0, p.currency || (payment?.currency))}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">No payments found</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 h-full overflow-hidden flex flex-col">
        {/* Top Header with Number and Icons */}
        <div className="bg-white border-b border-gray-200 px-5 py-2.5 z-10 print:hidden flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col leading-tight">
              <div className="text-sm text-gray-600">
                Location: <span className="text-[#1f3b82]">{payment.location || "Head Office"}</span>
              </div>
              <div className="text-[32px] font-semibold text-gray-900 mt-1">
                {payment.paymentNumber || payment.id || "1"}
              </div>
            </div>
            {/* Top Right Icons */}
            <div className="flex items-center gap-2">
              <button
                className={`relative h-9 w-9 rounded-md border border-gray-300 bg-gray-100 transition-colors flex items-center justify-center ${showAttachmentsModal
                  ? "bg-gray-200 text-gray-900"
                  : "hover:bg-gray-100 text-gray-600"
                  }`}
                title="Attachments"
                onClick={() => {
                  setShowAttachmentsModal(true);
                  setShowCommentsSidebar(false);
                }}
              >
                <Paperclip size={18} />
                {paymentAttachments.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {paymentAttachments.length}
                  </span>
                )}
              </button>
              <button
                className={`relative h-9 w-9 rounded-md border border-gray-300 bg-gray-100 transition-colors flex items-center justify-center ${showCommentsSidebar
                  ? "bg-gray-200 text-gray-900"
                  : "hover:bg-gray-100 text-gray-600"
                  }`}
                title="Comments"
                onClick={() => {
                  setShowCommentsSidebar(true);
                  setShowAttachmentsModal(false);
                }}
              >
                <MessageCircle size={18} />
                {comments.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-gray-700 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {comments.length}
                  </span>
                )}
              </button>
              <button
                className="h-9 w-9 rounded-md text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                onClick={() => navigate("/payments/payments-received")}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          {(payment.status || "").toLowerCase() === "void" ? (
            <div className="flex items-center gap-0 border-t border-gray-200 pt-3">
              <div className="relative" ref={pdfDropdownRef}>
                <button
                  className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                  onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                >
                  <FileText size={16} />
                  PDF Download
                  <ChevronDown size={14} />
                </button>
                {isPdfDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden">
                    <div
                      className="p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 transition-colors"
                      onClick={handleDownloadPDF}
                    >
                      <FileText size={16} />
                      Download PDF
                    </div>
                  </div>
                )}
              </div>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={handleOpenConvertToDraft}
              >
                Convert to Draft
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          ) : (payment.status || "").toLowerCase() === "draft" ? (
            <div className="flex items-center gap-0 border-t border-gray-200 pt-3">
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={() => navigate(`/payments/payments-received/${id}/edit`, { state: { paymentData: payment } })}
              >
                <Edit size={16} />
                Edit
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <div className="relative" ref={pdfDropdownRef}>
                <button
                  className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                  onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                >
                  <FileText size={16} />
                  PDF Download
                  <ChevronDown size={14} />
                </button>
                {isPdfDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden">
                    <div
                      className="p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 transition-colors"
                      onClick={handleDownloadPDF}
                    >
                      <FileText size={16} />
                      Download PDF
                    </div>
                  </div>
                )}
              </div>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={handleMarkAsPaid}
              >
                <CheckSquare size={16} />
                Mark as Paid
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0 border-t border-gray-200 pt-3">
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={() => navigate(`/payments/payments-received/${id}/edit`, { state: { paymentData: payment } })}
              >
                <Edit size={16} />
                Edit
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={() => {
                  try {
                    console.log('Send Email clicked, navigating to send-email page for', id);
                    navigate(`/payments/payments-received/${id}/send-email`, { state: { paymentData: payment } });
                    setTimeout(() => {
                      if (!window.location.pathname.includes(`/payments-received/${id}/send-email`)) {
                        window.location.href = `/payments/payments-received/${id}/send-email`;
                      }
                    }, 200);
                  } catch (e) {
                    console.error('Navigation to send-email failed, falling back to full load', e);
                    window.location.href = `/payments/payments-received/${id}/send-email`;
                  }
                }}
              >
                <Mail size={16} />
                Send Email
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <div className="relative" ref={pdfDropdownRef}>
                <button
                  className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                  onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                >
                  <FileText size={16} />
                  PDF Download
                  <ChevronDown size={14} />
                </button>
                {isPdfDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden">
                    <div
                      className="p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 transition-colors"
                      onClick={handleDownloadPDF}
                    >
                      <FileText size={16} />
                      Download PDF
                    </div>
                  </div>
                )}
              </div>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={handleRefund}
              >
                <RotateCcw size={16} />
                Refund
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <div className="relative" ref={moreMenuRef}>
                <button
                  className="flex items-center justify-center py-2 px-4 bg-transparent border-none cursor-pointer text-gray-700 transition-colors hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                >
                  <MoreVertical size={18} />
                </button>
                {isMoreMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden">
                    <div
                      className="px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                      onClick={handleVoid}
                    >
                      Void
                    </div>
                    <div
                      className="px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                      onClick={handleDelete}
                    >
                      Delete
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {(payment.status || "").toLowerCase() === "draft" && (
            <div className="mx-5 mt-5 mb-4 border border-gray-200 rounded-md bg-white p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-gray-700">
                <span className="font-semibold">WHAT'S NEXT?</span> Mark the payment as Paid to confirm that it has been received.
              </div>
              <button
                className="px-4 py-2 rounded-md bg-[#22c55e] text-white text-sm font-medium hover:bg-[#16a34a] transition-colors self-start md:self-auto"
                onClick={handleMarkAsPaid}
              >
                Mark as Paid
              </button>
            </div>
          )}

          {/* Receipt Card */}
          <div
            ref={receiptPaperRef}
            className="max-w-[820px] mx-auto bg-white border border-gray-200 shadow-sm relative mb-12 mt-8 print:shadow-none print:max-w-none print:m-0"
          >
          <div className="absolute left-0 top-0 w-0 h-0 border-l-[46px] border-l-[#22c55e] border-b-[46px] border-b-transparent" />
          <div className="absolute top-[8px] left-[3px] -rotate-45 text-[10px] font-bold tracking-wide text-white uppercase">
            Paid
          </div>

          <div className="px-7 py-8 sm:px-10 sm:py-9">
            <div className="mb-8">
              {logoPreview && (
                <img src={logoPreview} alt="Company Logo" className="h-14 object-contain mb-4" />
              )}
              <div className="text-lg font-semibold text-gray-900">{organizationData.name}</div>
              <div className="mt-2 text-xs text-gray-500 leading-6">
                <p>{organizationData.street1}</p>
                {organizationData.street2 && <p>{organizationData.street2}</p>}
                <p>{organizationData.city} {organizationData.zipCode}</p>
                <p>{organizationData.stateProvince}</p>
                <p>{organizationData.country}</p>
                <p>{organizationData.email}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-5">
              <div className="text-center text-[13px] tracking-wide text-gray-700 mb-7">
                PAYMENT RECEIPT
              </div>

              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="w-full md:max-w-[380px]">
                  <div className="grid grid-cols-[130px_1fr] border-b border-gray-200 py-2">
                    <span className="text-xs text-gray-500">Payment Date</span>
                    <span className="text-xs font-semibold text-gray-900">{formatDate(payment.paymentDate)}</span>
                  </div>
                  <div className="grid grid-cols-[130px_1fr] border-b border-gray-200 py-2">
                    <span className="text-xs text-gray-500">Reference Number</span>
                    <span className="text-xs font-semibold text-gray-900">{payment.referenceNumber || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[130px_1fr] border-b border-gray-200 py-2">
                    <span className="text-xs text-gray-500">Payment Mode</span>
                    <span className="text-xs font-semibold text-gray-900">{payment.paymentMode || "Cash"}</span>
                  </div>
                </div>

                <div className="bg-[#79a94a] text-white px-5 py-4 text-center min-w-[180px] self-start">
                  <div className="text-[11px] font-medium mb-1">Amount Received</div>
                  <div className="text-2xl font-bold leading-tight">
                    {(payment.currency || symbol || baseCurrency?.code || "USD").substring(0, 3)}{parseFloat(payment.amountReceived || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="text-xs text-gray-500 mb-2">Received From</div>
                <div className="text-sm font-semibold text-blue-600">{payment.customerName}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-7 py-7 sm:px-10">
            <div className="text-base font-semibold text-gray-900 mb-4">Payment for</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Invoice Number</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Invoice Date</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Invoice Amount</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Payment Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.allocations && payment.allocations.length > 0 ? (
                    payment.allocations.map((alloc, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="px-3 py-2">
                          <span
                            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-medium"
                            onClick={() => navigate(`/sales/invoices/${alloc.invoice?._id || alloc.invoice?.id || alloc.invoice}`)}
                          >
                            {alloc.invoice?.invoiceNumber || alloc.invoice?.id || alloc.invoice || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-800">{formatDate(alloc.invoice?.date || payment.paymentDate)}</td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {(payment.currency || "USD").substring(0, 3)}{parseFloat(alloc.invoice?.total || alloc.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {(payment.currency || "USD").substring(0, 3)}{parseFloat(alloc.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : payment.invoiceNumber ? (
                    <tr className="border-b border-gray-200">
                      <td className="px-3 py-2">
                        <span
                          className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-medium"
                          onClick={() => navigate(`/sales/invoices/${payment.invoiceNumber}`)}
                        >
                          {payment.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-800">{formatDate(payment.invoiceDate || payment.paymentDate)}</td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {(payment.currency || "USD").substring(0, 3)}{parseFloat(payment.invoiceAmount || payment.amountReceived || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800">
                        {(payment.currency || "USD").substring(0, 3)}{parseFloat(payment.amountReceived || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-3 py-4 text-center text-gray-500">No invoices linked</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-7 pb-6 sm:px-10 text-xs text-gray-400">
            PDF Template : Elite Template <span className="text-blue-600 cursor-pointer">Change</span>
          </div>

            {/* Refund History Section - Displayed inside the paper after table if refunds exist */}
            {refunds.length > 0 && (
              <div className="mt-12 border-t-2 border-gray-100 pt-8">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Refund History</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Refund Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Refund#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((refund, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{formatDate(refund.refundDate)}</td>
                        <td className="px-4 py-3 text-gray-900">{refund.refundNumber}</td>
                        <td className="px-4 py-3 text-gray-500 italic">{refund.description || "Refund for payment"}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-bold">
                          {(payment.currency || symbol || baseCurrency?.code || "USD").substring(0, 3)} {parseFloat(refund.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Convert To Draft Modal */}
      {isConvertDraftModalOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsConvertDraftModalOpen(false);
          }}
        >
          <div className="w-full max-w-[760px] bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-[34px] font-medium text-gray-800">Convert to Draft</h3>
              <button
                className="h-8 w-8 rounded border border-[#3b82f6] text-red-500 hover:bg-red-50 flex items-center justify-center"
                onClick={() => setIsConvertDraftModalOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="text-[28px] text-gray-700 mb-3">Enter the reason for converting this payment to Draft.</div>
              <textarea
                value={convertDraftReason}
                onChange={(e) => setConvertDraftReason(e.target.value)}
                className="w-full h-[120px] resize-y border border-[#3b82f6] rounded-md p-3 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
              <button
                className="px-4 py-2 rounded-md bg-[#22c55e] text-white text-sm font-medium hover:bg-[#16a34a] transition-colors"
                onClick={handleConvertToDraft}
              >
                Convert to Draft
              </button>
              <button
                className="px-4 py-2 rounded-md bg-gray-100 border border-gray-300 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                onClick={() => setIsConvertDraftModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Reason Modal */}
      {isVoidReasonModalOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsVoidReasonModalOpen(false);
          }}
        >
          <div className="w-full max-w-[760px] bg-white border border-gray-300 rounded-b-lg shadow-xl">
            <div className="p-5">
              <div className="text-[18px] text-gray-700 mb-3">Enter the reason for voiding the payment.</div>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full h-[120px] resize-y border border-[#3b82f6] rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleVoidConfirm();
                  }
                }}
              />
            </div>
            <div className="border-t border-gray-200 px-5 py-4 flex items-center gap-3">
              <button
                className="px-4 py-2 rounded-md bg-[#22c55e] text-white text-sm font-medium hover:bg-[#16a34a] transition-colors"
                onClick={handleVoidConfirm}
              >
                Void
              </button>
              <button
                className="px-4 py-2 rounded-md bg-gray-100 border border-gray-300 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                onClick={() => setIsVoidReasonModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEmailModalOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4" ref={emailModalRef} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Send Payment Receipt via Email</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                onClick={() => setIsEmailModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Email subject"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  placeholder="Email message"
                  rows={8}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={() => setIsEmailModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Refund Modal */}
      {isRefundModalOpen && payment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={(e) => {
          if (e.target === e.currentTarget) handleRefundCancel();
        }}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" ref={refundModalRef} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Refund</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                onClick={handleRefundCancel}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer Name</div>
                  <div className="text-base font-semibold text-gray-900">{payment.customerName || "-"}</div>
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">{(payment.currency || symbol || baseCurrency?.code || "USD").substring(0, 3)}</div>
                  <input
                    type="number"
                    value={refundData.amount}
                    onChange={(e) => setRefundData({ ...refundData, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={payment.amountReceived || 0}
                    className="w-full pl-16 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Balance : {formatCurrency(payment.amountReceived || 0)}
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10 cursor-pointer"
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10 cursor-pointer"
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
                          className="p-3 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10 cursor-pointer"
                  />
                  <ChevronDownIcon
                    size={18}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                    onClick={() => setIsFromAccountDropdownOpen(!isFromAccountDropdownOpen)}
                  />
                  {isFromAccountDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {bankAccounts.length > 0 ? bankAccounts.map((account) => {
                        const accountDisplay = account.displayName || account.accountName;
                        return (
                          <div
                            key={account._id || account.id}
                            className="p-3 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                            onClick={() => {
                              setRefundData({
                                ...refundData,
                                fromAccount: accountDisplay,
                                fromAccountId: account._id || account.id
                              });
                              setIsFromAccountDropdownOpen(false);
                            }}
                          >
                            {accountDisplay}
                          </div>
                        );
                      }) : (
                        <div className="p-4 text-center text-sm text-gray-500 italic">No accounts found</div>
                      )}
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                onClick={handleRefundSave}
              >
                Save
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
              <h2 className="text-xl font-semibold text-gray-900">Attachments ({paymentAttachments.length})</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                onClick={() => setShowAttachmentsModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {paymentAttachments.length === 0 ? (
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
                  {paymentAttachments.map((attachment) => {
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
                  {paymentAttachments.length < 5 && (
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
                onChange={handleFileSelect}
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
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {(comment.author || "U").charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{comment.author || "User"}</div>
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
    </div>
  );
}

