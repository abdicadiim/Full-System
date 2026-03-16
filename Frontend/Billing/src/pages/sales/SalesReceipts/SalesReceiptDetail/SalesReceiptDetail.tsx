import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSalesReceiptById, getSalesReceipts, deleteSalesReceipt, updateSalesReceipt, saveSalesReceipt, SalesReceipt } from "../../salesModel";
import { currenciesAPI, salesReceiptsAPI } from "../../../../services/api";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  X, Edit, Send, FileText, MoreVertical,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, Link2, Mail, Printer, Settings,
  User, Calendar, Paperclip, MessageSquare, Upload, Pencil
} from "lucide-react";
import { getStatesByCountry } from "../../../../constants/locationData";

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
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [receiptAttachments, setReceiptAttachments] = useState<ReceiptAttachment[]>([]);
  const [receiptComments, setReceiptComments] = useState<ReceiptComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: ""
  });
  const [isReceiptDocumentHovered, setIsReceiptDocumentHovered] = useState(false);
  const [isCustomizeDropdownOpen, setIsCustomizeDropdownOpen] = useState(false);
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
  const customizeDropdownRef = useRef<HTMLDivElement>(null);
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
        setIsAttachmentMenuOpen(false);
      }
      if (customizeDropdownRef.current && !customizeDropdownRef.current.contains(target)) {
        setIsCustomizeDropdownOpen(false);
      }
    };

    if (isMoreMenuOpen || isAllReceiptsDropdownOpen || isPdfDropdownOpen || isEmailModalOpen || isAttachmentMenuOpen || isCustomizeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen, isAllReceiptsDropdownOpen, isPdfDropdownOpen, isEmailModalOpen, isAttachmentMenuOpen, isCustomizeDropdownOpen]);

  // Default seller info (should come from settings/profile)
  const sellerInfo = receipt?.organizationProfile ? {
    name: receipt.organizationProfile.name || "taban",
    location: receipt.organizationProfile.country || "Somalia",
    email: receipt.organizationProfile.email || "maxamed9885m@gmail.com"
  } : {
    name: "taban",
    location: "Somalia",
    email: "maxamed9885m@gmail.com"
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
        subject: `Sales Receipt - ${receipt.receiptNumber || receipt.id}`,
        message: `Dear ${receipt.customerName || (typeof receipt.customer === 'object' ? (receipt.customer?.displayName || receipt.customer?.name) : receipt.customer) || "Customer"},

Thank you for your purchase. Please find the sales receipt attached.

Receipt Details:
- Receipt Number: ${receipt.receiptNumber || receipt.id}
- Receipt Date: ${formatDate(receipt.date || receipt.receiptDate)}
- Total Amount: ${formatCurrency(receipt.total || receipt.amount || 0, receipt.currency)}
- Payment Mode: ${receipt.paymentMode || "—"}

Thank you for your business!

Best regards,
${sellerInfo.name}`
      });
    }
  }, [receipt]);

  const handleSendEmail = () => {
    // Robustly find customer email
    let customerEmail = receipt?.customerEmail || "";
    if (!customerEmail && typeof receipt?.customer === 'object' && receipt?.customer) {
      customerEmail = receipt.customer.email || receipt.customer.contactEmail || "";
    }

    navigate(`/sales/sales-receipts/${id}/send-email`, {
      state: {
        receiptData: {
          ...receipt,
          customerEmail: customerEmail,
          senderEmail: sellerInfo.email || "maxamed9885m@gmail.com", // Pass system/sender email
          receiptNumber: receipt?.receiptNumber || receipt?.id,
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
      alert("Please enter a recipient email address");
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
      alert("Email client opened. Please send the email from your email application.");
    }, 100);
  };

  const handleDownloadPDF = async () => {
    setIsPdfDropdownOpen(false);
    if (!receipt) return;

    if (!receiptDocumentRef.current) {
      alert("Receipt document is not ready yet. Please try again.");
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

      pdf.save(`SalesReceipt-${receipt.receiptNumber || receipt.id}.pdf`);
    } catch (error) {
      console.error("Error downloading sales receipt PDF:", error);
      alert("Failed to generate PDF. Please try again.");
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

  const handleReceiptFileUpload = async (files: File[]) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (receiptAttachments.length + validFiles.length > 10) {
      alert("Maximum 10 files allowed. Please remove some files first.");
      return;
    }

    try {
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
      alert("Failed to upload files. Please try again.");
    }
  };

  const handleReceiptFileClick = (attachment: ReceiptAttachment) => {
    if (attachment.preview) {
      const a = document.createElement("a");
      a.href = attachment.preview;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string | number) => {
    const updated = receiptAttachments.filter(att => String(att.id) !== String(attachmentId));
    setReceiptAttachments(updated);
    await persistReceiptMeta(updated, receiptComments);
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
      alert("Sales receipt status updated to void.");
    } catch (error) {
      console.error("Error voiding sales receipt:", error);
      alert("Failed to void sales receipt. Please try again.");
    }
  };

  const handleClone = async () => {
    setIsMoreMenuOpen(false);
    if (!receipt) return;

    try {
      const numberResponse = await salesReceiptsAPI.getNextNumber();
      const nextReceiptNumber = numberResponse?.data?.nextReceiptNumber;

      const clonedItems = Array.isArray(receipt.items)
        ? receipt.items.map((line: any) => ({
          item: toEntityId(line?.item || line?.itemId) || undefined,
          name: line?.name || line?.itemDetails || line?.description || "Item",
          description: String(line?.description || ""),
          quantity: toFiniteNumber(line?.quantity, 1),
          unitPrice: toFiniteNumber(line?.unitPrice ?? line?.rate ?? line?.price, 0),
          discount: toFiniteNumber(line?.discount, 0),
          discountType: String(line?.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent",
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
        subtotal: toFiniteNumber(receipt.subtotal ?? receipt.subTotal, 0),
        tax: toFiniteNumber(receipt.tax, 0),
        discount: toFiniteNumber(receipt.discount, 0),
        discountType: String(receipt.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent",
        shippingCharges: toFiniteNumber(receipt.shippingCharges, 0),
        adjustment: toFiniteNumber(receipt.adjustment, 0),
        total: toFiniteNumber(receipt.total ?? receipt.amount, 0),
        currency: receipt.currency || "USD",
        paymentMethod: String(receipt.paymentMethod || receipt.paymentMode || "cash").toLowerCase().replace(/\s+/g, "_"),
        paymentReference: receipt.paymentReference || receipt.reference || "",
        depositToAccount: toEntityId(receipt.depositToAccount || receipt.depositTo) || undefined,
        status: "paid",
        notes: receipt.notes || "",
        termsAndConditions: receipt.termsAndConditions || receipt.terms || "",
      };

      const clonedReceipt = await saveSalesReceipt(clonedPayload as any);
      const clonedReceiptId = clonedReceipt?.id || clonedReceipt?._id;
      if (clonedReceiptId) {
        navigate(`/sales/sales-receipts/${clonedReceiptId}`);
        return;
      }
      alert("Receipt cloned, but could not open it automatically.");
    } catch (error) {
      console.error("Error cloning sales receipt:", error);
      alert("Failed to clone sales receipt. Please try again.");
    }
  };

  const handleDelete = async () => {
    setIsMoreMenuOpen(false);

    if (!receipt) return;

    // Confirm deletion
    const confirmDelete = window.confirm(
      `Are you sure you want to delete receipt ${receipt.receiptNumber || receipt.id}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      await deleteSalesReceipt((receipt?.id || receipt?._id)!);
      // Navigate back to sales receipts list
      navigate("/sales/sales-receipts");
      alert("Receipt deleted successfully!");
    } catch (error) {
      console.error("Error deleting receipt:", error);
      alert("Failed to delete receipt. Please try again.");
    }
  };

  const handleLogoUpload = (file: File) => {
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
      const logoDataUrl = reader.result as string;
      setLogoPreview(logoDataUrl);
      setLogoFile(file);
      // Save logo to localStorage
      localStorage.setItem('organization_logo', logoDataUrl);
      alert("Logo uploaded successfully!");
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
    <div className="w-full h-screen bg-[#f4f5fb] flex overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[320px] bg-white border-r border-gray-200 flex flex-col">
        <div className="h-[56px] px-4 border-b border-gray-200 flex items-center justify-between">
          <button className="text-[13px] font-semibold text-gray-900 flex items-center gap-2">
            All Sales Receipts
            <ChevronDown size={14} className="text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-md bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600"
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
        <div className="flex-1 overflow-y-auto">
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
                  {r.receiptNumber || r.id} - {formatDate(r.date || r.receiptDate)}
                </div>
                <div
                  className={`mt-1 text-[10px] font-bold uppercase ${String(r.status || "").toLowerCase() === "void"
                    ? "text-gray-400"
                    : "text-emerald-600"
                    }`}
                >
                  {String(r.status || "PAID")}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right Detail Panel */}
      <section className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-200 px-6 h-[56px] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500">Location: {sellerInfo.location || "Head Office"}</div>
            <div className="flex items-center gap-2">
              <div className="text-[16px] font-semibold text-gray-900">{receipt.receiptNumber || receipt.id}</div>
              {String(receipt.status || "").toLowerCase() !== "void" && String(receipt.status || "").trim() ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50">
                  {receipt.status}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={attachmentMenuRef}>
              <button
                className={`relative h-9 w-9 rounded-md border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 ${isAttachmentMenuOpen ? "bg-gray-50" : ""}`}
                onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                title="Attachments"
              >
                <Paperclip size={18} />
                {receiptAttachments.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {receiptAttachments.length}
                  </span>
                )}
              </button>
              {isAttachmentMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[360px]">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Attachments</span>
                    <button
                      className="h-6 w-6 rounded border border-blue-200 text-blue-500 flex items-center justify-center hover:bg-blue-50"
                      onClick={() => setIsAttachmentMenuOpen(false)}
                      title="Close"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="px-4 py-4">
                    {receiptAttachments.length === 0 ? (
                      <div className="text-center">
                        <div className="text-sm text-gray-600">No Files Attached</div>
                        <button
                          type="button"
                          className="mt-4 w-full border border-dashed border-blue-200 rounded-md px-3 py-3 text-sm text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
                          onClick={() => attachmentsFileInputRef.current?.click()}
                        >
                          <Upload size={16} />
                          Upload your Files
                          <ChevronDown size={14} className="text-gray-400" />
                        </button>
                        <div className="mt-2 text-[11px] text-gray-500">
                          You can upload a maximum of 10 files, 10MB each
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {receiptAttachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between gap-2 px-2 py-2 border-b border-gray-50 last:border-b-0">
                            <button
                              type="button"
                              className="text-left text-sm text-[#156372] hover:underline truncate flex-1"
                              onClick={() => handleReceiptFileClick(attachment)}
                              title={attachment.name}
                            >
                              {attachment.name}
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:text-red-700"
                              onClick={() => handleRemoveAttachment(attachment.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="mt-3 w-full border border-dashed border-blue-200 rounded-md px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
                          onClick={() => attachmentsFileInputRef.current?.click()}
                        >
                          <Upload size={16} />
                          Upload your Files
                          <ChevronDown size={14} className="text-gray-400" />
                        </button>
                        <div className="mt-2 text-[11px] text-gray-500 text-center">
                          You can upload a maximum of 10 files, 10MB each
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              className="relative h-9 w-9 rounded-md border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50"
              onClick={() => setShowCommentsSidebar(true)}
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
              e.target.value = "";
            }}
          />
        </div>

        <div className="bg-[#f7f7fb] border-b border-gray-200 px-6 h-[44px] flex items-center">
          <div className="flex items-center gap-4 text-[12px] text-gray-700">
            {String(receipt.status || "").toLowerCase() !== "void" && (
              <>
                <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => navigate(`/sales/sales-receipts/${id}/edit`)}>
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
            <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}>
              <Printer size={14} />
              PDF/Print
              <ChevronDown size={12} />
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
                    className="w-full text-left px-3 py-2 text-sm rounded-md bg-blue-500 text-white"
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
                    className="w-full text-left px-3 py-2 text-sm text-gray-800 rounded-md hover:bg-gray-50"
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
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto py-4">
            {/* Receipt Section */}
            <div
              className="p-6"
              onMouseEnter={() => setIsReceiptDocumentHovered(true)}
              onMouseLeave={() => {
                setIsReceiptDocumentHovered(false);
                setIsCustomizeDropdownOpen(false);
              }}
            >
              <div
                ref={receiptDocumentRef}
                className="max-w-4xl mx-auto bg-white shadow-lg relative border border-gray-100"
                style={{ minHeight: "842px", padding: "40px" }}
              >
              {/* Customize Button - appears on hover */}
              {isReceiptDocumentHovered && (
                <div className="absolute top-0 right-0 z-10" ref={customizeDropdownRef}>
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors shadow-md"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                    onClick={() => setIsCustomizeDropdownOpen(!isCustomizeDropdownOpen)}
                  >
                    <Settings size={16} />
                    Customize
                    <ChevronDown size={14} />
                  </button>
                  {isCustomizeDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px]">
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer transition-colors"
                        style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as React.CSSProperties}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          // Handle Standard Template action
                          console.log("Standard Template");
                        }}
                      >
                        Standard Template
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-white cursor-pointer transition-colors"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          setIsChooseTemplateModalOpen(true);
                        }}
                      >
                        Change Template
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer transition-colors"
                        style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as React.CSSProperties}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          // Handle Edit Template action
                          console.log("Edit Template");
                        }}
                      >
                        Edit Template
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer transition-colors"
                        style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as React.CSSProperties}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          setIsOrganizationAddressModalOpen(true);
                        }}
                      >
                        Update Logo & Address
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer transition-colors"
                        style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as React.CSSProperties}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                        onClick={() => {
                          setIsCustomizeDropdownOpen(false);
                          navigate("/settings/sales-receipts");
                        }}
                      >
                        Manage Custom Fields
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer transition-colors"
                        style={{ "--hover-bg": "rgba(21, 99, 114, 0.1)" } as React.CSSProperties}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
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
                  Sales Receipt# {receipt.receiptNumber || receipt.id}
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
      {showCommentsSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black bg-opacity-10"
            onClick={() => setShowCommentsSidebar(false)}
          />
          <div className="relative h-full w-[420px] bg-white shadow-2xl border-l border-gray-200 flex flex-col">
            <div className="h-14 px-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Comments &amp; History</h2>
              <button
                className="h-7 w-7 rounded border border-blue-200 text-blue-500 flex items-center justify-center hover:bg-blue-50"
                onClick={() => setShowCommentsSidebar(false)}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {receiptComments.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No comments yet.</div>
              ) : (
                receiptComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                      {comment.author?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] text-gray-600 mb-1">
                        <span className="font-semibold text-gray-900">{comment.author || "User"}</span>
                        <span className="mx-2 text-gray-300">•</span>
                        {formatDate(comment.timestamp)}
                      </div>
                      <div className="text-[13px] text-gray-700 bg-[#f6f7fb] border border-gray-100 rounded-md px-3 py-2">
                        {comment.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
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
                    alert("Template changed to Standard Template");
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
                  alert("Organization address and logo updated successfully!");
                  setIsOrganizationAddressModalOpen(false);
                }}
              >
                Save
              </button>
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
                  alert("Terms & Conditions saved successfully!");
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


