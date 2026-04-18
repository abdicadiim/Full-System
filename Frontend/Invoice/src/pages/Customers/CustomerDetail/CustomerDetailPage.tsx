import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { customersAPI, vendorsAPI, currenciesAPI, invoicesAPI, paymentsReceivedAPI, creditNotesAPI, quotesAPI, recurringInvoicesAPI, expensesAPI, recurringExpensesAPI, projectsAPI, billsAPI, salesReceiptsAPI, journalEntriesAPI, paymentsMadeAPI, purchaseOrdersAPI, vendorCreditsAPI, documentsAPI } from "../../../services/api";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import {
    X, Edit, Paperclip, ChevronDown, Plus, MoreVertical,
    Settings, User, Phone, MapPin, Globe,
    DollarSign, TrendingUp, Calendar, UserPlus,
    ChevronUp, ChevronRight, Sparkles, Bold, Italic, Underline, ChevronRight as ChevronRightIcon,
    Filter, ArrowUpDown, Search, ChevronLeft, Link2, FileText, Monitor, Check, Upload, Trash2, Loader2, Download, RefreshCw, AlertTriangle, Smartphone
} from "lucide-react";
import { Customer, Invoice, CreditNote, AttachedFile, Quote, RecurringInvoice, Expense, RecurringExpense, Project, Bill, SalesReceipt } from "../../salesModel";
import CustomerCommentsPanel from "./CustomerCommentsPanel";
import CustomerAttachmentsPopover from "./CustomerAttachmentsPopover";
import CustomerDetailHeader from "./CustomerDetailHeader";
import CustomerDetailModalStack from "./CustomerDetailModalStack";
import CustomerDetailMoreMenu from "./CustomerDetailMoreMenu";
import CustomerDetailMailsTab from "./CustomerDetailMailsTab";
import CustomerDetailOverviewTab from "./CustomerDetailOverviewTab";
import CustomerDetailSidebar from "./CustomerDetailSidebar";
import CustomerDetailStatementTab from "./CustomerDetailStatementTab";
import CustomerDetailPurchasesTab from "./CustomerDetailPurchasesTab";
import { loadCustomerReportingTags } from "../customerReportingTags";
import CustomerDetailTransactionsTab from "./CustomerDetailTransactionsTab";
import useCustomerDetailData from "./useCustomerDetailData";
import CustomerPortalAccessModal from "./CustomerPortalAccessModal";
import CustomerLinkVendorModal from "./CustomerLinkVendorModal";
import CustomerConsolidatedBillingModal from "./CustomerConsolidatedBillingModal";
import CustomerContactPersonModal from "./CustomerContactPersonModal";
import CustomerReportingTagsModal from "./CustomerReportingTagsModal";
import CustomerAddressModal from "./CustomerAddressModal";
import { CustomerEmailIntegrationModal } from "./CustomerEmailIntegrationModals";
import {
    CustomerDeleteConfirmationModal,
    CustomerDeleteContactPersonModal,
} from "./CustomerDeleteModals";
import {
    PHONE_CODE_OPTIONS,
    TRANSACTION_SECTION_OPTIONS,
} from "./customerDetailConstants";
import {
    CustomerAssociateTemplatesModal,
    CustomerCloneModal,
    CustomerInviteModal,
    CustomerMergeModal,
    CustomerPrintStatementsModal,
} from "./CustomerDetailModals";
import type {
    CustomerDetailComment as Comment,
    CustomerDetailMail as Mail,
    CustomerPdfTemplates,
    ExtendedCustomer,
    Transaction,
} from "./customerDetailTypes";


import { useCustomerDetailPageViewModel } from "./useCustomerDetailPageViewModel";

const CUSTOMER_EDIT_PRELOAD_PREFIX = "invoice_customer_edit_preload:";
const LEGACY_CUSTOMER_EDIT_PRELOAD_PREFIX = "billing_customer_edit_preload:";
const CUSTOMER_DETAIL_SIDEBAR_CACHE_KEY = "invoice_customer_detail_sidebar_seed";
const LEGACY_CUSTOMER_DETAIL_SIDEBAR_CACHE_KEY = "billing_customer_detail_sidebar_seed";
const DEFAULT_CUSTOMER_PDF_TEMPLATES: CustomerPdfTemplates = {
    customerStatement: "Standard Template",
    quotes: "Standard Template",
    invoices: "Standard Template",
    creditNotes: "Standard Template",
    paymentThankYou: "Elite Template",
};

const resolveCustomerDisplayName = (row: any) =>
    String(
        row?.displayName ||
        row?.companyName ||
        row?.name ||
        `${row?.firstName || ""} ${row?.lastName || ""}`.trim() ||
        "Customer"
    ).trim() || "Customer";

const normalizeSidebarCustomer = (row: any): ExtendedCustomer => {
    const resolvedId = String(row?._id || row?.id || "").trim();
    const resolvedName = resolveCustomerDisplayName(row);

    return {
        ...row,
        id: resolvedId,
        _id: row?._id || row?.id || resolvedId,
        name: resolvedName,
        displayName: row?.displayName || resolvedName,
    };
};

const toSerializableCustomerState = (value: any) => {
    if (!value || typeof value !== "object") return value ?? null;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        const safeCopy: Record<string, any> = {};
        Object.entries(value).forEach(([key, entry]) => {
            if (typeof entry === "function") return;
            try {
                safeCopy[key] = JSON.parse(JSON.stringify(entry));
            } catch {
                if (entry === null || ["string", "number", "boolean"].includes(typeof entry)) {
                    safeCopy[key] = entry;
                }
            }
        });
        return safeCopy;
    }
};

export default function CustomerDetail() {

    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const initialSidebarCustomers: ExtendedCustomer[] = [];
    const initialRouteCustomer = (() => {
        if (location.state?.customer) {
            return normalizeSidebarCustomer(location.state.customer);
        }
        if (typeof window === "undefined") return null;
        try {
            const raw =
                sessionStorage.getItem(CUSTOMER_DETAIL_SIDEBAR_CACHE_KEY) ||
                sessionStorage.getItem(LEGACY_CUSTOMER_DETAIL_SIDEBAR_CACHE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const list = Array.isArray(parsed) ? parsed : [];
            const targetId = String(id || "").trim();
            if (!targetId) return null;
            const matched = list.find((row: any) => {
                const rowId = String(row?._id || row?.id || "").trim();
                return rowId === targetId;
            });
            return matched ? normalizeSidebarCustomer(matched) : null;
        } catch {
            return null;
        }
    })();

    const [customer, setCustomer] = useState<ExtendedCustomer | null>(() => initialRouteCustomer);
    const [customerStatusOverride, setCustomerStatusOverride] = useState<"active" | "inactive" | null>(() => {
        const status = String((initialRouteCustomer as any)?.status || "").toLowerCase().trim();
        if (status === "active" || status === "inactive") return status as "active" | "inactive";
        if ((initialRouteCustomer as any)?.isInactive === true) return "inactive";
        if ((initialRouteCustomer as any)?.isActive === true) return "active";
        return null;
    });
    const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(() => !initialRouteCustomer);
    const [isNavigatingToEdit, setIsNavigatingToEdit] = useState(false);
    const [customers, setCustomers] = useState<ExtendedCustomer[]>(initialSidebarCustomers);
    const [activeTab, setActiveTab] = useState("overview");
    const [comments, setComments] = useState<Comment[]>([]);
    const [selectedTransactionType, setSelectedTransactionType] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expandedSections, setExpandedSections] = useState({
        address: true,
        otherDetails: true,
        contactPersons: true,
        associateTags: true,
        recordInfo: false
    });
    const [expandedTransactions, setExpandedTransactions] = useState({
        subscriptions: false,
        invoices: false,
        customerPayments: false,
        paymentLinks: false,
        quotes: false,
        recurringInvoices: false,
        expenses: false,
        recurringExpenses: false,
        projects: false,
        creditNotes: false,
        salesReceipts: false,
        refunds: false,
        journals: false,
        bills: false
    });

    useEffect(() => {
        const seededCustomer = location.state?.customer ? normalizeSidebarCustomer(location.state.customer) : null;
        if (seededCustomer) {
            setCustomer(seededCustomer);
            setLoading(false);
            const seededStatus = String((seededCustomer as any)?.status || "").toLowerCase().trim();
            if (seededStatus === "active" || seededStatus === "inactive") {
                setCustomerStatusOverride(seededStatus as "active" | "inactive");
            } else if ((seededCustomer as any)?.isInactive === true) {
                setCustomerStatusOverride("inactive");
            } else if ((seededCustomer as any)?.isActive === true) {
                setCustomerStatusOverride("active");
            }
            return;
        }
        if (typeof window === "undefined") {
            return;
        }
        try {
            const raw =
                sessionStorage.getItem(CUSTOMER_DETAIL_SIDEBAR_CACHE_KEY) ||
                sessionStorage.getItem(LEGACY_CUSTOMER_DETAIL_SIDEBAR_CACHE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const list = Array.isArray(parsed) ? parsed : [];
            const targetId = String(id || "").trim();
            if (!targetId) return;
            const matched = list.find((row: any) => {
                const rowId = String(row?._id || row?.id || "").trim();
                return rowId === targetId;
            });
            if (matched) {
                const normalized = normalizeSidebarCustomer(matched);
                setCustomer(normalized);
                setLoading(false);
                const matchedStatus = String((normalized as any)?.status || "").toLowerCase().trim();
                if (matchedStatus === "active" || matchedStatus === "inactive") {
                    setCustomerStatusOverride(matchedStatus as "active" | "inactive");
                } else if ((normalized as any)?.isInactive === true) {
                    setCustomerStatusOverride("inactive");
                } else if ((normalized as any)?.isActive === true) {
                    setCustomerStatusOverride("active");
                }
            }
        } catch {
        }
    }, [id, location.key, location.state, setCustomer]);

    useEffect(() => {
        setCustomerStatusOverride(null);
    }, [id]);

    useEffect(() => {
        if (!isNavigatingToEdit || typeof window === "undefined") {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setIsNavigatingToEdit(false);
        }, 2500);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isNavigatingToEdit]);

    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
    const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);
    const invoicesPerPage = 10;
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // Quotes status filter
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [quoteStatusFilter, setQuoteStatusFilter] = useState("all");
    const [isQuoteStatusDropdownOpen, setIsQuoteStatusDropdownOpen] = useState(false);
    const quoteStatusDropdownRef = useRef<HTMLDivElement>(null);

    // Recurring Invoices status filter
    const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
    const [recurringInvoiceStatusFilter, setRecurringInvoiceStatusFilter] = useState("all");
    const [isRecurringInvoiceStatusDropdownOpen, setIsRecurringInvoiceStatusDropdownOpen] = useState(false);
    const recurringInvoiceStatusDropdownRef = useRef<HTMLDivElement>(null);

    // Expenses status filter
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
    const [isExpenseStatusDropdownOpen, setIsExpenseStatusDropdownOpen] = useState(false);
    const expenseStatusDropdownRef = useRef<HTMLDivElement>(null);

    // Recurring Expenses status filter
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [recurringExpenseStatusFilter, setRecurringExpenseStatusFilter] = useState("all");
    const [isRecurringExpenseStatusDropdownOpen, setIsRecurringExpenseStatusDropdownOpen] = useState(false);
    const recurringExpenseStatusDropdownRef = useRef<HTMLDivElement>(null);

    // Projects status filter
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectStatusFilter, setProjectStatusFilter] = useState("all");
    const [isProjectStatusDropdownOpen, setIsProjectStatusDropdownOpen] = useState(false);
    const projectStatusDropdownRef = useRef<HTMLDivElement>(null);

    // Bills status filter
    const [bills, setBills] = useState<Bill[]>([]);

    // Credit Notes status filter
    const [creditNoteStatusFilter, setCreditNoteStatusFilter] = useState("all");
    const [isCreditNoteStatusDropdownOpen, setIsCreditNoteStatusDropdownOpen] = useState(false);
    const creditNoteStatusDropdownRef = useRef<HTMLDivElement>(null);

    // Sales Receipts status filter
    const [salesReceipts, setSalesReceipts] = useState<SalesReceipt[]>([]);
    const [salesReceiptStatusFilter, setSalesReceiptStatusFilter] = useState("all");
    const [isSalesReceiptStatusDropdownOpen, setIsSalesReceiptStatusDropdownOpen] = useState(false);
    const salesReceiptStatusDropdownRef = useRef<HTMLDivElement>(null);

    // Journals state
    const [journals, setJournals] = useState<any[]>([]);

    // Sidebar selection state
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [isBulkActionsDropdownOpen, setIsBulkActionsDropdownOpen] = useState(false);
    const [bulkConsolidatedAction, setBulkConsolidatedAction] = useState<null | "enable" | "disable">(null);
    const [isBulkConsolidatedUpdating, setIsBulkConsolidatedUpdating] = useState(false);

    const bulkActionsDropdownRef = useRef<HTMLDivElement>(null);

    // Print Customer Statements Modal state
    const [isPrintStatementsModalOpen, setIsPrintStatementsModalOpen] = useState(false);
    const [printStatementStartDate, setPrintStatementStartDate] = useState(() => {
        const date = new Date();
        date.setDate(1);
        return date;
    });
    const [printStatementEndDate, setPrintStatementEndDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        return date;
    });
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
    const [startDateCalendarMonth, setStartDateCalendarMonth] = useState(new Date());
    const [endDateCalendarMonth, setEndDateCalendarMonth] = useState(new Date());
    const startDatePickerRef = useRef<HTMLDivElement>(null);
    const endDatePickerRef = useRef<HTMLDivElement>(null);

    // Merge Customers Modal state
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [mergeTargetCustomer, setMergeTargetCustomer] = useState<ExtendedCustomer | null>(null);
    const [isMergeCustomerDropdownOpen, setIsMergeCustomerDropdownOpen] = useState(false);
    const [mergeCustomerSearch, setMergeCustomerSearch] = useState("");

    const mergeCustomerDropdownRef = useRef<HTMLDivElement>(null);

    // Associate Templates Modal state
    const [isAssociateTemplatesModalOpen, setIsAssociateTemplatesModalOpen] = useState(false);
    const [pdfTemplates, setPdfTemplates] = useState<CustomerPdfTemplates>(DEFAULT_CUSTOMER_PDF_TEMPLATES);

    // Payments state
    const [payments, setPayments] = useState<any[]>([]);

    // Mails state - sample data for demonstration
    const [mails, setMails] = useState<Mail[]>([]);
    const [isLinkEmailDropdownOpen, setIsLinkEmailDropdownOpen] = useState(false);

    const linkEmailDropdownRef = useRef<HTMLDivElement>(null);
    const [isOutlookIntegrationModalOpen, setIsOutlookIntegrationModalOpen] = useState(false);
    const [isZohoMailIntegrationModalOpen, setIsZohoMailIntegrationModalOpen] = useState(false);

    // Statement state
    const [statementPeriod, setStatementPeriod] = useState("this-month");
    const [statementFilter, setStatementFilter] = useState("all");
    const [isStatementPeriodDropdownOpen, setIsStatementPeriodDropdownOpen] = useState(false);
    const [isStatementFilterDropdownOpen, setIsStatementFilterDropdownOpen] = useState(false);
    const [isStatementDownloading, setIsStatementDownloading] = useState(false);

    const statementPeriodDropdownRef = useRef<HTMLDivElement>(null);
    const statementFilterDropdownRef = useRef<HTMLDivElement>(null);
    const [statementTransactions, setStatementTransactions] = useState<Transaction[]>([]);
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);

    // Address Modal state
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [addressType, setAddressType] = useState("billing"); // "billing" or "shipping"
    const [addressFormData, setAddressFormData] = useState({
        attention: "",
        country: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
        faxNumber: "",
    });

    // New Transaction dropdown state
    const [isNewTransactionDropdownOpen, setIsNewTransactionDropdownOpen] = useState(false);
    const [isGoToTransactionsDropdownOpen, setIsGoToTransactionsDropdownOpen] = useState(false);

    const newTransactionDropdownRef = useRef<HTMLDivElement>(null);
    const goToTransactionsDropdownRef = useRef<HTMLDivElement>(null);

    // Attachments dropdown state
    const [isAttachmentsDropdownOpen, setIsAttachmentsDropdownOpen] = useState(false);
    const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

    const attachmentsDropdownRef = useRef<HTMLDivElement>(null);
    const [attachments, setAttachments] = useState<any[]>([

    ]);

    // Subscription dropdown state
    const [isSubscriptionDropdownOpen, setIsSubscriptionDropdownOpen] = useState(false);

    const subscriptionDropdownRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mapDocumentsToAttachments = (documents: any[] = []) => {
        if (!Array.isArray(documents)) return [];
        return documents.map((doc: any, index: number) => {
            const documentId = String(doc.documentId || doc.id || doc._id || index + 1).trim() || String(index + 1);
            const url = doc.viewUrl || doc.url || doc.contentUrl || doc.previewUrl || "";
            return {
                id: documentId,
                documentId,
                name: doc.name || "Unnamed Document",
                size: typeof doc.size === "number" ? doc.size : Number(doc.size) || doc.size || 0,
                mimeType: doc.mimeType || doc.type || "",
                url,
                viewUrl: doc.viewUrl || url,
                downloadUrl: doc.downloadUrl || doc.url || doc.contentUrl || "",
                uploadedAt: doc.uploadedAt
            };
        });
    };

    // More dropdown state
    const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);

    const moreDropdownRef = useRef<HTMLDivElement>(null);
    const [areRemindersStopped, setAreRemindersStopped] = useState(false);

    // Sidebar 3-dot menu state
    const [isSidebarMoreMenuOpen, setIsSidebarMoreMenuOpen] = useState(false);

    const sidebarMoreMenuRef = useRef<HTMLDivElement>(null);
    const [sidebarSort, setSidebarSort] = useState<"name_asc" | "name_desc" | "receivables_desc">("name_asc");

    const sidebarSortedCustomers = useMemo(() => {
        const list = Array.isArray(customers) ? [...customers] : [];
        const getName = (cust: any) => String(cust?.name || cust?.displayName || cust?.companyName || "").toLowerCase().trim();
        const getReceivables = (cust: any) => parseFloat(String(cust?.receivables ?? cust?.receivablesBaseCurrency ?? cust?.receivablesBCY ?? 0)) || 0;

        list.sort((a: any, b: any) => {
            switch (sidebarSort) {
                case "name_desc":
                    return getName(b).localeCompare(getName(a));
                case "receivables_desc":
                    return getReceivables(b) - getReceivables(a);
                case "name_asc":
                default:
                    return getName(a).localeCompare(getName(b));
            }
        });

        return list;
    }, [customers, sidebarSort]);

    // Settings dropdown state (for customer name settings icon)
    const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);

    const settingsDropdownRef = useRef<HTMLDivElement>(null);

    // Opening Balance modal state
    const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
    const [openingBalanceValue, setOpeningBalanceValue] = useState("");

    // Customer Type hover state
    const [isCustomerTypeHovered, setIsCustomerTypeHovered] = useState(false);
    const [isCustomerTypeEditing, setIsCustomerTypeEditing] = useState(false);
    const [customerTypeValue, setCustomerTypeValue] = useState("");

    // Default Currency hover and edit state
    const [isCurrencyHovered, setIsCurrencyHovered] = useState(false);
    const [isCurrencyEditing, setIsCurrencyEditing] = useState(false);
    const [currencyValue, setCurrencyValue] = useState("");
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

    const currencyDropdownRef = useRef<HTMLDivElement>(null);

    // Customer Language hover and edit state
    const [isLanguageHovered, setIsLanguageHovered] = useState(false);
    const [isLanguageEditing, setIsLanguageEditing] = useState(false);
    const [languageValue, setLanguageValue] = useState("");
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

    const languageDropdownRef = useRef<HTMLDivElement>(null);

    // Portal Status hover state
    const [isPortalStatusHovered, setIsPortalStatusHovered] = useState(false);

    // Add Contact Person modal state
    const [isAddContactPersonModalOpen, setIsAddContactPersonModalOpen] = useState(false);
    const [editingContactPersonIndex, setEditingContactPersonIndex] = useState<number | null>(null);
    const [openContactPersonSettingsIndex, setOpenContactPersonSettingsIndex] = useState<number | null>(null);
    const [newContactPerson, setNewContactPerson] = useState({
        salutation: "Mr",
        firstName: "",
        lastName: "",
        email: "",
        workPhone: "",
        mobile: "",
        skype: "",
        designation: "",
        department: "",
        enablePortalAccess: true
    });
    const [contactPersonProfilePreview, setContactPersonProfilePreview] = useState<string | null>(null);
    const contactPersonProfileInputRef = useRef<HTMLInputElement>(null);
    const [contactPersonWorkPhoneCode, setContactPersonWorkPhoneCode] = useState("+355");
    const [contactPersonMobilePhoneCode, setContactPersonMobilePhoneCode] = useState("+355");
    const [isSavingContactPerson, setIsSavingContactPerson] = useState(false);
    const [isWorkPhoneCodeDropdownOpen, setIsWorkPhoneCodeDropdownOpen] = useState(false);
    const [isMobilePhoneCodeDropdownOpen, setIsMobilePhoneCodeDropdownOpen] = useState(false);
    const [workPhoneCodeSearch, setWorkPhoneCodeSearch] = useState("");
    const [mobilePhoneCodeSearch, setMobilePhoneCodeSearch] = useState("");
    const workPhoneCodeDropdownRef = useRef<HTMLDivElement>(null);
    const mobilePhoneCodeDropdownRef = useRef<HTMLDivElement>(null);
    const filteredWorkPhoneCodeOptions = useMemo(() => {
        const term = workPhoneCodeSearch.trim().toLowerCase();
        if (!term) return PHONE_CODE_OPTIONS;
        return PHONE_CODE_OPTIONS.filter(option => (
            option.name.toLowerCase().includes(term) ||
            option.code.toLowerCase().includes(term)
        ));
    }, [workPhoneCodeSearch]);
    const filteredMobilePhoneCodeOptions = useMemo(() => {
        const term = mobilePhoneCodeSearch.trim().toLowerCase();
        if (!term) return PHONE_CODE_OPTIONS;
        return PHONE_CODE_OPTIONS.filter(option => (
            option.name.toLowerCase().includes(term) ||
            option.code.toLowerCase().includes(term)
        ));
    }, [mobilePhoneCodeSearch]);

    // Associate Tags modal state
    const [isAssociateTagsModalOpen, setIsAssociateTagsModalOpen] = useState(false);
    const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
    const [associateTagsSeed, setAssociateTagsSeed] = useState<any[]>([]);
    const [associateTagsValues, setAssociateTagsValues] = useState<Record<string, string>>({});
    const [isSavingAssociateTags, setIsSavingAssociateTags] = useState(false);

    // Clone modal state
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [cloneContactType, setCloneContactType] = useState("customer");
    const [isCloning, setIsCloning] = useState(false);

    // Configure Portal Access modal state
    const [isConfigurePortalModalOpen, setIsConfigurePortalModalOpen] = useState(false);
    const [portalAccessContacts, setPortalAccessContacts] = useState<any[]>([]);

    // Link to Vendor modal state
    const [isLinkToVendorModalOpen, setIsLinkToVendorModalOpen] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);
    const [linkedVendor, setLinkedVendor] = useState<any>(null);
    const [linkedVendorPurchases, setLinkedVendorPurchases] = useState<any[]>([]);
    const [linkedVendorPaymentsMade, setLinkedVendorPaymentsMade] = useState<any[]>([]);
    const [linkedVendorPurchaseOrders, setLinkedVendorPurchaseOrders] = useState<any[]>([]);
    const [linkedVendorCredits, setLinkedVendorCredits] = useState<any[]>([]);
    const [isLinkedVendorPurchasesLoading, setIsLinkedVendorPurchasesLoading] = useState(false);
    const [linkedVendorPurchaseSections, setLinkedVendorPurchaseSections] = useState({
        bills: false,
        paymentsMade: false,
        purchaseOrders: false,
        vendorCredits: false
    });
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
    const [vendorSearch, setVendorSearch] = useState("");

    const vendorDropdownRef = useRef<HTMLDivElement>(null);

    // Action header bar state
    const [showActionHeader, setShowActionHeader] = useState(false);

    // Income Section state
    const [incomeTimePeriod, setIncomeTimePeriod] = useState("Last 6 Months");
    const [isIncomeTimePeriodDropdownOpen, setIsIncomeTimePeriodDropdownOpen] = useState(false);
    const [accountingBasis, setAccountingBasis] = useState("Accrual");
    const [isAccountingBasisDropdownOpen, setIsAccountingBasisDropdownOpen] = useState(false);

    const incomeTimePeriodRef = useRef<HTMLDivElement>(null);
    const accountingBasisRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleClickOutside = (event: PointerEvent) => {
            if (incomeTimePeriodRef.current && !incomeTimePeriodRef.current.contains(event.target as Node)) {
                setIsIncomeTimePeriodDropdownOpen(false);
            }
            if (accountingBasisRef.current && !accountingBasisRef.current.contains(event.target as Node)) {
                setIsAccountingBasisDropdownOpen(false);
            }
            if (workPhoneCodeDropdownRef.current && !workPhoneCodeDropdownRef.current.contains(event.target as Node)) {
                setIsWorkPhoneCodeDropdownOpen(false);
            }
            if (mobilePhoneCodeDropdownRef.current && !mobilePhoneCodeDropdownRef.current.contains(event.target as Node)) {
                setIsMobilePhoneCodeDropdownOpen(false);
            }
        };
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, []);

    // Profile Image and Invite Card state

    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [isAvatarHovered, setIsAvatarHovered] = useState(false);
    const [showInviteCard, setShowInviteCard] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteMethod, setInviteMethod] = useState<"email" | "social">("email");
    const [inviteEmail, setInviteEmail] = useState('');
    const [isSendingInvitation, setIsSendingInvitation] = useState(false);

    const profileImageInputRef = useRef<HTMLInputElement>(null);

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteContactPersonModalOpen, setIsDeleteContactPersonModalOpen] = useState(false);
    const [pendingDeleteContactPersonIndex, setPendingDeleteContactPersonIndex] = useState<number | null>(null);

    // Refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Organization profile data
    const [organizationProfile, setOrganizationProfile] = useState<any>(null);
    const organizationName = String(
        organizationProfile?.organizationName ||
        organizationProfile?.name ||
        "Organization"
    ).trim() || "Organization";
    // Owner email data
    const [ownerEmail, setOwnerEmail] = useState<any>(null);

    const normalizeImageSrc = (value: string | ArrayBuffer | null | undefined): string | null => {
        if (!value) return null;
        return typeof value === "string" ? value : null;
    };

    useEffect(() => {
        // Set profile image when customer is loaded or updated
        if (customer?.profileImage) {
            setProfileImage(normalizeImageSrc(customer.profileImage));
        } else {
            // Reset to null if customer doesn't have a profile image
            setProfileImage(null);
        }
    }, [customer]);

    const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result;
            const normalized = typeof base64String === "string" ? base64String : null;
            if (!normalized) {
                toast.error('Error reading image file');
                return;
            }

            // Optimistically update UI
            setProfileImage(normalized);

            if (customer && id) {
                try {
                    // Only send profileImage field to avoid sending entire customer object
                    const updateData = {
                        profileImage: normalized
                    };

                    const response = await customersAPI.update(id, updateData);

                    // Update customer state with response data
                    if (response && response.data) {
                        setCustomer(response.data);
                        toast.success('Profile image updated successfully');
                    } else {
                        // Fallback: update local state
                        setCustomer({
                            ...customer,
                            profileImage: normalized
                        });
                        toast.success('Profile image updated successfully');
                    }
                } catch (error) {
                    // Revert UI change on error
                    setProfileImage(normalizeImageSrc(customer.profileImage));
                    toast.error('Failed to update profile image: ' + ((error as any).message || 'Unknown error'));
                }
            }
        };

        reader.onerror = () => {
            toast.error('Error reading image file');
    };

        reader.readAsDataURL(file);
    };

    const { refreshData } = useCustomerDetailData({
        id,
        locationKey: location.key,
        navigate,
        activeTab,
        customer,
        customerStatusOverride,
        linkedVendor,
        organizationProfile,
        normalizeComments,
        mapDocumentsToAttachments,
        invoices,
        payments,
        creditNotes,
        setOrganizationProfile,
        setOwnerEmail,
        setIsRefreshing,
        setCustomer,
        setComments,
        setAttachments,
        setInvoices,
        setPayments,
        setCreditNotes,
        setAvailableCurrencies,
        setCustomers,
        setCustomerStatusOverride,
        setQuotes,
        setRecurringInvoices,
        setExpenses,
        setRecurringExpenses,
        setProjects,
        setBills,
        setSalesReceipts,
        setJournals,
        setVendors,
        setLinkedVendor,
        setLoading,
        setLinkedVendorPurchases,
        setLinkedVendorPaymentsMade,
        setLinkedVendorPurchaseOrders,
        setLinkedVendorCredits,
        setIsLinkedVendorPurchasesLoading,
        setActiveTab,
        setStatementTransactions,
    });

    const resetContactPersonModal = () => {
        setNewContactPerson({
            salutation: "Mr",
            firstName: "",
            lastName: "",
            email: "",
            workPhone: "",
            mobile: "",
            skype: "",
            designation: "",
            department: "",
            enablePortalAccess: true
        });
        setContactPersonWorkPhoneCode("+355");
        setContactPersonMobilePhoneCode("+355");
        setContactPersonProfilePreview(null);
        setEditingContactPersonIndex(null);
    };

    const formatPhoneWithCode = (code: string, value: string) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("+")) return trimmed;
        const normalizedCode = String(code || "").trim();
        if (!normalizedCode) return trimmed;
        return `${normalizedCode} ${trimmed}`.trim();
    };

    const splitPhoneCode = (raw: any) => {
        const value = String(raw || "").trim();
        const fallback = { code: "+355", number: "" };
        if (!value) return fallback;
        const match = value.match(/^(\+\d+)\s*(.*)$/);
        if (!match) return { ...fallback, number: value };
        return { code: match[1], number: String(match[2] || "").trim() };
    };

    const openEditContactPerson = (contact: any, index: number) => {
        const work = splitPhoneCode(contact?.workPhone || contact?.phone || "");
        const mobile = splitPhoneCode(contact?.mobile || contact?.mobilePhone || "");

        setEditingContactPersonIndex(index);
        setNewContactPerson({
            salutation: String(contact?.salutation || "Mr"),
            firstName: String(contact?.firstName || ""),
            lastName: String(contact?.lastName || ""),
            email: String(contact?.email || ""),
            workPhone: work.number,
            mobile: mobile.number,
            skype: String(contact?.skype || ""),
            designation: String(contact?.designation || ""),
            department: String(contact?.department || ""),
            enablePortalAccess: Boolean(contact?.hasPortalAccess ?? contact?.enablePortal ?? true),
        });
        setContactPersonWorkPhoneCode(work.code || "+355");
        setContactPersonMobilePhoneCode(mobile.code || "+355");
        setContactPersonProfilePreview(String(contact?.profileImage || contact?.image || "") || null);
        setIsAddContactPersonModalOpen(true);
    };

    const saveContactPerson = async () => {
        if (!customer || !id) return;

        const existingContactPersons = Array.isArray(customer.contactPersons) ? [...customer.contactPersons] : [];
        const existing = editingContactPersonIndex !== null ? existingContactPersons[editingContactPersonIndex] : null;

        const contactPerson = {
            ...(existing && typeof existing === "object" ? existing : {}),
            id: (existing as any)?.id ?? Date.now(),
            salutation: newContactPerson.salutation,
            firstName: newContactPerson.firstName,
            lastName: newContactPerson.lastName,
            email: newContactPerson.email,
            workPhone: formatPhoneWithCode(contactPersonWorkPhoneCode, newContactPerson.workPhone),
            mobile: formatPhoneWithCode(contactPersonMobilePhoneCode, newContactPerson.mobile),
            skype: newContactPerson.skype,
            designation: newContactPerson.designation,
            department: newContactPerson.department,
            hasPortalAccess: newContactPerson.enablePortalAccess,
            enablePortal: newContactPerson.enablePortalAccess,
            profileImage: contactPersonProfilePreview,
        };

        const updatedContactPersons =
            editingContactPersonIndex !== null
                ? existingContactPersons.map((cp, idx) => (idx === editingContactPersonIndex ? contactPerson : cp))
                : [...existingContactPersons, { ...contactPerson, isPrimary: existingContactPersons.length === 0 }];

        const updatedCustomer = {
            ...customer,
            contactPersons: updatedContactPersons,
        };

        setIsSavingContactPerson(true);
        try {
            await customersAPI.update(id, updatedCustomer);
            setCustomer(updatedCustomer);
            setIsAddContactPersonModalOpen(false);
            resetContactPersonModal();
            toast.success(editingContactPersonIndex !== null ? "Contact person updated." : "Contact person added.");
            void refreshData();
        } catch (error: any) {
            toast.error(error?.message || "Failed to update contact person.");
            return;
        } finally {
            setIsSavingContactPerson(false);
        }
    };

    const markContactPersonAsPrimary = async (index: number) => {
        if (!customer || !id) return;
        const current = Array.isArray(customer.contactPersons) ? customer.contactPersons : [];
        if (!current.length) return;

        const updatedContactPersons = current.map((cp: any, idx: number) => ({
            ...(cp && typeof cp === "object" ? cp : {}),
            isPrimary: idx === index,
        }));

        const updatedCustomer = { ...customer, contactPersons: updatedContactPersons };
        try {
            await customersAPI.update(id, updatedCustomer);
            setCustomer(updatedCustomer);
            toast.success("Marked as primary contact.");
            void refreshData();
        } catch (error: any) {
            toast.error(error?.message || "Failed to mark as primary.");
        }
    };

    const deleteContactPerson = async (index: number) => {
        if (!customer || !id) return;
        const current = Array.isArray(customer.contactPersons) ? customer.contactPersons : [];
        if (!current.length) return;

        const remaining = current.filter((_: any, idx: number) => idx !== index);
        if (remaining.length > 0 && !remaining.some((cp: any) => Boolean(cp?.isPrimary))) {
            remaining[0] = { ...(remaining[0] || {}), isPrimary: true };
        }

        const updatedCustomer = { ...customer, contactPersons: remaining };
        try {
            await customersAPI.update(id, updatedCustomer);
            setCustomer(updatedCustomer);
            toast.success("Contact person deleted.");
            void refreshData();
        } catch (error: any) {
            toast.error(error?.message || "Failed to delete contact person.");
        }
    };

    const openDeleteContactPersonModal = (index: number) => {
        setPendingDeleteContactPersonIndex(index);
        setIsDeleteContactPersonModalOpen(true);
    };

    useEffect(() => {
        if (openContactPersonSettingsIndex === null) return;
        const handleClickOutside = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target.closest?.('[data-contact-person-menu-root="true"]')) return;
            setOpenContactPersonSettingsIndex(null);
        };
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, [openContactPersonSettingsIndex]);

    const handleContactPersonProfileFile = (file: File | null | undefined) => {
        if (!file) return;
        if (!file.type?.startsWith("image/")) {
            toast.error("Please select an image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Maximum file size is 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setContactPersonProfilePreview(String(reader.result || ""));
        };
        reader.onerror = () => {
            toast.error("Failed to read image. Please try again.");
        };
        reader.readAsDataURL(file);
    };

    const openAssociateTagsModal = () => {
        if (!customer) return;
        const reportingTags = Array.isArray((customer as any)?.reportingTags) ? (customer as any).reportingTags : [];
        const legacyTags = Array.isArray((customer as any)?.tags) ? (customer as any).tags : [];
        setAssociateTagsSeed([...(reportingTags || []), ...(legacyTags || [])]);
        setAssociateTagsValues({});
        setIsAssociateTagsModalOpen(true);
    };

    const closeAssociateTagsModal = () => {
        setIsAssociateTagsModalOpen(false);
        setAssociateTagsSeed([]);
        setAssociateTagsValues({});
        setIsSavingAssociateTags(false);
    };

    useEffect(() => {
        if (!isAssociateTagsModalOpen) return;

        const normalizeText = (value: any) => String(value ?? "").trim();
        const getEntryName = (entry: any) => normalizeText(entry?.name || entry?.tagName || entry?.label || entry?.title);
        const getEntryValue = (entry: any) =>
            normalizeText(entry?.value ?? entry?.option ?? entry?.selectedValue ?? entry?.selected ?? entry?.tagValue);

        const loadTags = async () => {
            try {
                const list = await loadCustomerReportingTags();
                setAvailableReportingTags(list);

                setAssociateTagsValues((prev) => {
                    if (prev && Object.keys(prev).length > 0) return prev;

                    const next: Record<string, string> = {};
                    list.forEach((tag: any) => {
                        const tagId = String(tag?._id || tag?.id || "").trim();
                        if (!tagId) return;
                        const tagName = normalizeText(tag?.name);
                        const match = (associateTagsSeed || []).find((entry: any) => {
                            if (!entry) return false;
                            if (typeof entry === "string") {
                                const raw = normalizeText(entry);
                                if (!raw || !tagName) return false;
                                return raw.toLowerCase().startsWith(tagName.toLowerCase());
                            }
                            if (typeof entry !== "object") return false;
                            const entryId = normalizeText(entry?.tagId || entry?.id || entry?._id);
                            if (entryId && entryId === tagId) return true;
                            const entryName = getEntryName(entry);
                            return Boolean(tagName && entryName && entryName.toLowerCase() === tagName.toLowerCase());
                        });

                        if (!match) return;
                        if (typeof match === "string") {
                            const raw = normalizeText(match);
                            const rest = tagName ? raw.slice(tagName.length).trim() : "";
                            if (rest) next[tagId] = rest;
                            return;
                        }
                        const val = getEntryValue(match);
                        if (val) next[tagId] = val;
                    });

                    return next;
                });
            } catch {
                toast.error("Failed to load reporting tags.");
            }
        };

        if (availableReportingTags.length === 0) {
            loadTags();
        } else if (Object.keys(associateTagsValues || {}).length === 0) {
            const list = availableReportingTags;
            const next: Record<string, string> = {};
            list.forEach((tag: any) => {
                const tagId = String(tag?._id || tag?.id || "").trim();
                if (!tagId) return;
                const tagName = normalizeText(tag?.name);
                const match = (associateTagsSeed || []).find((entry: any) => {
                    if (!entry) return false;
                    if (typeof entry === "string") {
                        const raw = normalizeText(entry);
                        if (!raw || !tagName) return false;
                        return raw.toLowerCase().startsWith(tagName.toLowerCase());
                    }
                    if (typeof entry !== "object") return false;
                    const entryId = normalizeText(entry?.tagId || entry?.id || entry?._id);
                    if (entryId && entryId === tagId) return true;
                    const entryName = getEntryName(entry);
                    return Boolean(tagName && entryName && entryName.toLowerCase() === tagName.toLowerCase());
                });

                if (!match) return;
                if (typeof match === "string") {
                    const raw = normalizeText(match);
                    const rest = tagName ? raw.slice(tagName.length).trim() : "";
                    if (rest) next[tagId] = rest;
                    return;
                }
                const val = getEntryValue(match);
                if (val) next[tagId] = val;
            });
            setAssociateTagsValues(next);
        }
    }, [isAssociateTagsModalOpen, availableReportingTags, associateTagsSeed, associateTagsValues]);

    const handleSaveAssociateTags = async () => {
        if (!customer || !id) return;
        if (!Array.isArray(availableReportingTags) || availableReportingTags.length === 0) {
            toast.error("No reporting tags found.");
            return;
        }

        const requiredMissing = availableReportingTags.find((tag: any) => {
            const isRequired = Boolean(tag?.isRequired || tag?.required);
            if (!isRequired) return false;
            const tagId = String(tag?._id || tag?.id || "").trim();
            if (!tagId) return false;
            const val = String(associateTagsValues?.[tagId] || "").trim();
            return !val;
        });
        if (requiredMissing) {
            toast.error("Please fill all required tags.");
            return;
        }

        const nextReportingTags = availableReportingTags
            .map((tag: any) => {
                const tagId = String(tag?._id || tag?.id || "").trim();
                if (!tagId) return null;
                const val = String(associateTagsValues?.[tagId] || "").trim();
                if (!val) return null;
                return {
                    tagId,
                    name: tag?.name || "Tag",
                    value: val,
                };
            })
            .filter(Boolean);

        setIsSavingAssociateTags(true);
        try {
            const updatedCustomer = {
                ...customer,
                reportingTags: nextReportingTags,
            };
            await customersAPI.update(id, updatedCustomer);
            setCustomer(updatedCustomer as any);
            setCustomers((prev: any) =>
                prev.map((c: any) => (String(c?.id || c?._id || "") === String(id) ? { ...c, reportingTags: nextReportingTags } : c))
            );
            toast.success("Tags updated successfully.");
            closeAssociateTagsModal();
        } catch (error: any) {
            toast.error("Failed to update tags: " + (error?.message || "Unknown error"));
        } finally {
            setIsSavingAssociateTags(false);
        }
    };

    const reloadSidebarCustomerList = async () => {
        try {
            const response = await customersAPI.getAll();
            if (response && response.data) {
                setCustomers(response.data);
            }
        } catch {
            // no-op
        }
    };

    const handleOpenSidebarCustomer = useCallback((customerRow: any) => {
        const safeCustomer = toSerializableCustomerState(customerRow);
        const previewCustomer = normalizeSidebarCustomer(safeCustomer);
        const nextCustomerId = String(previewCustomer?._id || previewCustomer?.id || "").trim();
        if (!nextCustomerId) return;

        const safeCustomerList = sidebarSortedCustomers.map((row: any) =>
            normalizeSidebarCustomer(toSerializableCustomerState(row))
        );

        setCustomers(safeCustomerList);

        navigate(`/sales/customers/${nextCustomerId}`, {
            state: {
                customer: safeCustomer,
                customerList: safeCustomerList,
            },
        });
    }, [navigate, sidebarSortedCustomers]);

    const handleSidebarBulkUpdate = () => {
        setIsBulkActionsDropdownOpen(false);
        navigate("/sales/customers", { state: { openBulkUpdateModal: true, preselectedCustomerIds: selectedCustomers } });
    };

    const handleSidebarBulkDelete = () => {
        setIsBulkActionsDropdownOpen(false);
        navigate("/sales/customers", { state: { openBulkDeleteModal: true, preselectedCustomerIds: selectedCustomers } });
    };

    const handleSidebarBulkMarkActive = async () => {
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            return;
        }
        setIsBulkActionsDropdownOpen(false);
        try {
            await customersAPI.bulkUpdate(selectedCustomers, { status: "active" });
            await reloadSidebarCustomerList();
            await refreshData();
            toast.success(`Marked ${selectedCustomers.length} customer(s) as active`);
            setSelectedCustomers([]);
        } catch {
            toast.error("Failed to mark customers as active. Please try again.");
        }
    };

    const handleSidebarBulkMarkInactive = async () => {
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            return;
        }
        setIsBulkActionsDropdownOpen(false);
        try {
            await customersAPI.bulkUpdate(selectedCustomers, { status: "inactive" });
            await reloadSidebarCustomerList();
            await refreshData();
            toast.success(`Marked ${selectedCustomers.length} customer(s) as inactive`);
            setSelectedCustomers([]);
        } catch {
            toast.error("Failed to mark customers as inactive. Please try again.");
        }
    };

    const handleSidebarBulkEnableConsolidatedBilling = async () => {
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            return;
        }
        setIsBulkActionsDropdownOpen(false);
        setBulkConsolidatedAction("enable");
    };

    const handleSidebarBulkDisableConsolidatedBilling = async () => {
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            return;
        }
        setIsBulkActionsDropdownOpen(false);
        setBulkConsolidatedAction("disable");
    };

    const confirmSidebarBulkConsolidatedBilling = async () => {
        if (!bulkConsolidatedAction) return;
        if (selectedCustomers.length === 0) {
            toast.error("Please select at least one customer.");
            setBulkConsolidatedAction(null);
            return;
        }

        const enabled = bulkConsolidatedAction === "enable";
        const ids = [...selectedCustomers];
        const count = ids.length;

        setIsBulkConsolidatedUpdating(true);
        try {
            await customersAPI.bulkUpdate(ids, {
                consolidatedBilling: enabled,
                enableConsolidatedBilling: enabled,
                isConsolidatedBillingEnabled: enabled,
            });
            await reloadSidebarCustomerList();
            await refreshData();
            toast.success(`${enabled ? "Enabled" : "Disabled"} consolidated billing for ${count} customer(s).`);
            setSelectedCustomers([]);
            setBulkConsolidatedAction(null);
        } catch {
            toast.error(`Failed to ${enabled ? "enable" : "disable"} consolidated billing. Please try again.`);
        } finally {
            setIsBulkConsolidatedUpdating(false);
        }
    };

    const handleUnlinkVendor = async () => {
        if (!customer) return;

        const confirmUnlink = window.confirm(`Are you sure you want to unlink "${customer.name || customer.displayName}" from its associated vendor?`);
        if (!confirmUnlink) return;

        try {
            const customerId = String(customer.id || customer._id || "");
            const linkedVendorId = String(customer.linkedVendorId || "").trim();

            await customersAPI.update(customerId, {
                ...customer,
                linkedVendorId: null,
                linkedVendorName: null
            });

            if (linkedVendorId) {
                await vendorsAPI.update(linkedVendorId, {
                    linkedCustomerId: null,
                    linkedCustomerName: null
                });
            }

            setCustomer((prev) => prev ? {
                ...prev,
                linkedVendorId: null,
                linkedVendorName: null,
            } : prev);
            setLinkedVendor(null);
            setLinkedVendorPurchases([]);
            setLinkedVendorPaymentsMade([]);
            setLinkedVendorPurchaseOrders([]);
            setLinkedVendorCredits([]);
            setActiveTab("overview");

            toast.success(`Customer "${customer.name || customer.displayName}" has been unlinked from the vendor`);
            void refreshData();
        } catch (error: any) {
            toast.error('Failed to unlink vendor: ' + (error.message || 'Unknown error'));
        }
        setIsMoreDropdownOpen(false);
    };

    function normalizeComments(rawComments: any): Comment[] {
        if (!Array.isArray(rawComments)) return [];
        return rawComments
            .filter((item: any) => item && typeof item.text === "string" && item.text.trim() !== "")
            .map((item: any, index: number) => ({
                id: item.id ?? item._id ?? `${Date.now()}-${index}`,
                text: item.text,
                author: item.author || "You",
                timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
                bold: Boolean(item.bold),
                italic: Boolean(item.italic),
                underline: Boolean(item.underline)
            }));
    }

    useEffect(() => {
        setAreRemindersStopped(Boolean((customer as any)?.remindersStopped));
    }, [customer?.id, (customer as any)?.remindersStopped]);

    useEffect(() => {
        const nextTemplates = (customer as any)?.pdfTemplates || {};
        setPdfTemplates({
            customerStatement: nextTemplates.customerStatement || DEFAULT_CUSTOMER_PDF_TEMPLATES.customerStatement,
            quotes: nextTemplates.quotes || DEFAULT_CUSTOMER_PDF_TEMPLATES.quotes,
            invoices: nextTemplates.invoices || DEFAULT_CUSTOMER_PDF_TEMPLATES.invoices,
            creditNotes: nextTemplates.creditNotes || DEFAULT_CUSTOMER_PDF_TEMPLATES.creditNotes,
            paymentThankYou: nextTemplates.paymentThankYou || DEFAULT_CUSTOMER_PDF_TEMPLATES.paymentThankYou,
        });
    }, [customer?.id, (customer as any)?.pdfTemplates]);

    const handleEditCustomer = useCallback(() => {
        if (isNavigatingToEdit) {
            return;
        }

        const customerId = String(customer?._id || customer?.id || id || "").trim();
        if (!customerId) {
            toast.error("Customer data is still loading. Please try again.");
            return;
        }

        const safeCustomer = toSerializableCustomerState(customer);
        if (typeof window !== "undefined") {
            try {
                sessionStorage.setItem(`${CUSTOMER_EDIT_PRELOAD_PREFIX}${customerId}`, JSON.stringify(safeCustomer));
                sessionStorage.removeItem(`${LEGACY_CUSTOMER_EDIT_PRELOAD_PREFIX}${customerId}`);
            } catch {
            }
        }

        setIsNavigatingToEdit(true);

        const openEditPage = () => {
            navigate(`/sales/customers/${customerId}/edit`, {
                state: {
                    customer: safeCustomer,
                    returnTo: `/sales/customers/${customerId}`,
                },
            });
        };

        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(openEditPage);
            return;
        }

        openEditPage();
    }, [customer, id, isNavigatingToEdit, navigate]);

    const {
        displayName,
        primaryContact,
        resolvedPrimaryContactIndex,
        associatedTagLabels,
        customerSubscriptions,
        toggleSection,
        openTransactionSection,
        toggleTransactionSection,
        toggleLinkedVendorPurchaseSection,
        handleCustomerCheckboxChange,
        handleClearSelection,
        handleSelectAllCustomers,
        handlePrintCustomerStatements,
        handlePrintStatementsSubmit,
        getStatementDateRange,
        handleDownloadPDF,
        handleMergeCustomers,
        handleMergeSubmit,
        filteredMergeCustomers,
        handleAssociateTemplates,
        handleAssociateTemplatesSave,
        handleTemplateSelect,
        getInviteEmailValue,
        closeInviteModal,
        handleInviteWhatsAppShare,
        handleInviteFacebookShare,
        handleInviteTwitterShare,
        handleInviteLinkedInShare,
        handleCopyInvitationLink,
        handleSendInvitation,
        handleFileUpload,
        handleRemoveAttachment,
        handleClone,
        handleCloneSubmit,
        formatDateForDisplay,
        invoiceStatusOptions,
        formatStatusLabel,
        normalizeInvoiceStatus,
        filteredInvoices,
        startIndex,
        endIndex,
        paginatedInvoices,
        totalPages,
        getFilteredQuotes,
        getFilteredRecurringInvoices,
        getFilteredExpenses,
        getFilteredRecurringExpenses,
        getFilteredProjects,
        getFilteredCreditNotes,
        getFilteredSalesReceipts,
        formatCurrency,
        isCustomerActive,
        setActiveStatus,
        handleToggleReminders,
    } = useCustomerDetailPageViewModel({
        id,
        customer,
        customers,
        customerStatusOverride,
        setCustomerStatusOverride,
        navigate,
        activeTab,
        invoices,
        payments,
        creditNotes,
        quotes,
        recurringInvoices,
        expenses,
        recurringExpenses,
        projects,
        salesReceipts,
        expandedSections,
        setExpandedSections,
        expandedTransactions,
        setExpandedTransactions,
        selectedCustomers,
        setSelectedCustomers,
        statusDropdownRef,
        isStatusDropdownOpen,
        setIsStatusDropdownOpen,
        linkEmailDropdownRef,
        isLinkEmailDropdownOpen,
        setIsLinkEmailDropdownOpen,
        statementPeriodDropdownRef,
        isStatementPeriodDropdownOpen,
        setIsStatementPeriodDropdownOpen,
        statementFilterDropdownRef,
        isStatementFilterDropdownOpen,
        setIsStatementFilterDropdownOpen,
        bulkActionsDropdownRef,
        isBulkActionsDropdownOpen,
        setIsBulkActionsDropdownOpen,
        startDatePickerRef,
        isStartDatePickerOpen,
        setIsStartDatePickerOpen,
        endDatePickerRef,
        isEndDatePickerOpen,
        setIsEndDatePickerOpen,
        mergeCustomerDropdownRef,
        isMergeCustomerDropdownOpen,
        setIsMergeCustomerDropdownOpen,
        newTransactionDropdownRef,
        isNewTransactionDropdownOpen,
        setIsNewTransactionDropdownOpen,
        goToTransactionsDropdownRef,
        isGoToTransactionsDropdownOpen,
        setIsGoToTransactionsDropdownOpen,
        attachmentsDropdownRef,
        isAttachmentsDropdownOpen,
        setIsAttachmentsDropdownOpen,
        moreDropdownRef,
        isMoreDropdownOpen,
        setIsMoreDropdownOpen,
        settingsDropdownRef,
        isSettingsDropdownOpen,
        setIsSettingsDropdownOpen,
        vendorDropdownRef,
        isVendorDropdownOpen,
        setIsVendorDropdownOpen,
        sidebarMoreMenuRef,
        isSidebarMoreMenuOpen,
        setIsSidebarMoreMenuOpen,
        quoteStatusDropdownRef,
        isQuoteStatusDropdownOpen,
        setIsQuoteStatusDropdownOpen,
        recurringInvoiceStatusDropdownRef,
        isRecurringInvoiceStatusDropdownOpen,
        setIsRecurringInvoiceStatusDropdownOpen,
        expenseStatusDropdownRef,
        isExpenseStatusDropdownOpen,
        setIsExpenseStatusDropdownOpen,
        recurringExpenseStatusDropdownRef,
        isRecurringExpenseStatusDropdownOpen,
        setIsRecurringExpenseStatusDropdownOpen,
        projectStatusDropdownRef,
        isProjectStatusDropdownOpen,
        setIsProjectStatusDropdownOpen,
        creditNoteStatusDropdownRef,
        isCreditNoteStatusDropdownOpen,
        setIsCreditNoteStatusDropdownOpen,
        salesReceiptStatusDropdownRef,
        isSalesReceiptStatusDropdownOpen,
        setIsSalesReceiptStatusDropdownOpen,
        subscriptionDropdownRef,
        isSubscriptionDropdownOpen,
        setIsSubscriptionDropdownOpen,
        setSelectedTransactionType,
        linkedVendorPurchaseSections,
        setLinkedVendorPurchaseSections,
        setIsPrintStatementsModalOpen,
        statementPeriod,
        setStatementPeriod,
        statementFilter,
        setStatementFilter,
        isStatementDownloading,
        setIsStatementDownloading,
        organizationProfile,
        ownerEmail,
        setMergeTargetCustomer,
        mergeTargetCustomer,
        setMergeCustomerSearch,
        mergeCustomerSearch,
        setIsMergeModalOpen,
        setIsAssociateTemplatesModalOpen,
        pdfTemplates,
        setPdfTemplates,
        inviteEmail,
        setInviteEmail,
        setInviteMethod,
        setIsInviteModalOpen,
        setIsSendingInvitation,
        setShowInviteCard,
        mapDocumentsToAttachments,
        setCustomer,
        setCustomers,
        setAttachments,
        fileInputRef,
        setIsUploadingAttachments,
        cloneContactType,
        setCloneContactType,
        setIsCloneModalOpen,
        setIsCloning,
        invoiceStatusFilter,
        setInvoiceStatusFilter,
        invoiceCurrentPage,
        setInvoiceCurrentPage,
        invoicesPerPage,
        quoteStatusFilter,
        setQuoteStatusFilter,
        recurringInvoiceStatusFilter,
        setRecurringInvoiceStatusFilter,
        expenseStatusFilter,
        setExpenseStatusFilter,
        recurringExpenseStatusFilter,
        setRecurringExpenseStatusFilter,
        projectStatusFilter,
        setProjectStatusFilter,
        creditNoteStatusFilter,
        setCreditNoteStatusFilter,
        salesReceiptStatusFilter,
        setSalesReceiptStatusFilter,
        setMails,
        areRemindersStopped,
        setAreRemindersStopped,
        refreshData,
        reloadSidebarCustomerList,
    });
    if (!customer && loading) {
        return null;
    }

    if (!customer) {
        return null;
    }

    return (
        <div className="w-full h-[calc(100vh-72px)] flex cursor-default bg-white overflow-hidden" style={{ margin: 0, padding: 0, maxWidth: "100%" }}>
            <CustomerDetailSidebar
                selectedCustomers={selectedCustomers}
                customers={customers}
                handleOpenSidebarCustomer={handleOpenSidebarCustomer}
                handleSelectAllCustomers={handleSelectAllCustomers}
                bulkActionsDropdownRef={bulkActionsDropdownRef}
                isBulkActionsDropdownOpen={isBulkActionsDropdownOpen}
                setIsBulkActionsDropdownOpen={setIsBulkActionsDropdownOpen}
                handleSidebarBulkUpdate={handleSidebarBulkUpdate}
                handlePrintCustomerStatements={handlePrintCustomerStatements}
                handleSidebarBulkMarkActive={handleSidebarBulkMarkActive}
                handleSidebarBulkMarkInactive={handleSidebarBulkMarkInactive}
                handleMergeCustomers={handleMergeCustomers}
                handleAssociateTemplates={handleAssociateTemplates}
                handleSidebarBulkEnableConsolidatedBilling={handleSidebarBulkEnableConsolidatedBilling}
                handleSidebarBulkDisableConsolidatedBilling={handleSidebarBulkDisableConsolidatedBilling}
                handleSidebarBulkDelete={handleSidebarBulkDelete}
                handleClearSelection={handleClearSelection}
                navigate={navigate}
                sidebarMoreMenuRef={sidebarMoreMenuRef}
                isSidebarMoreMenuOpen={isSidebarMoreMenuOpen}
                setIsSidebarMoreMenuOpen={setIsSidebarMoreMenuOpen}
                sidebarSort={sidebarSort}
                setSidebarSort={setSidebarSort}
                reloadSidebarCustomerList={reloadSidebarCustomerList}
                sidebarSortedCustomers={sidebarSortedCustomers}
                id={id}
                handleCustomerCheckboxChange={handleCustomerCheckboxChange}
                formatCurrency={formatCurrency}
            />

            <div className="flex-1 min-w-0 flex min-h-0 flex-col overflow-y-auto custom-scrollbar" style={{ marginRight: 0, paddingRight: 0 }}>
                <CustomerDetailHeader
                    customer={customer}
                    id={id}
                    attachments={attachments}
                    navigate={navigate}
                    handleEditCustomer={handleEditCustomer}
                    isNavigatingToEdit={isNavigatingToEdit}
                    setIsDeleteModalOpen={setIsDeleteModalOpen}
                    isAttachmentsDropdownOpen={isAttachmentsDropdownOpen}
                    setIsAttachmentsDropdownOpen={setIsAttachmentsDropdownOpen}
                    attachmentsDropdownRef={attachmentsDropdownRef}
                    isUploadingAttachments={isUploadingAttachments}
                    handleFileUpload={handleFileUpload}
                    handleRemoveAttachment={handleRemoveAttachment}
                    newTransactionDropdownRef={newTransactionDropdownRef}
                    isNewTransactionDropdownOpen={isNewTransactionDropdownOpen}
                    setIsNewTransactionDropdownOpen={setIsNewTransactionDropdownOpen}
                    moreDropdownRef={moreDropdownRef}
                    isMoreDropdownOpen={isMoreDropdownOpen}
                    setIsMoreDropdownOpen={setIsMoreDropdownOpen}
                    areRemindersStopped={areRemindersStopped}
                    handleToggleReminders={handleToggleReminders}
                    handleAssociateTemplates={handleAssociateTemplates}
                    setPortalAccessContacts={setPortalAccessContacts}
                    setIsConfigurePortalModalOpen={setIsConfigurePortalModalOpen}
                    handleClone={handleClone}
                    isCloning={isCloning}
                    handleMergeCustomers={handleMergeCustomers}
                    setActiveStatus={setActiveStatus}
                    setShowActionHeader={setShowActionHeader}
                    isCustomerActive={isCustomerActive}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    selectedTransactionType={selectedTransactionType}
                    openTransactionSection={openTransactionSection}
                    CustomerAttachmentsPopover={CustomerAttachmentsPopover}
                />

                {activeTab === "overview" && (
                    <CustomerDetailOverviewTab
                        customer={customer}
                        id={id}
                        displayName={displayName}
                        primaryContact={primaryContact}
                        resolvedPrimaryContactIndex={resolvedPrimaryContactIndex}
                        profileImage={profileImage}
                        isAvatarHovered={isAvatarHovered}
                        setIsAvatarHovered={setIsAvatarHovered}
                        profileImageInputRef={profileImageInputRef}
                        handleProfileImageUpload={handleProfileImageUpload}
                        settingsDropdownRef={settingsDropdownRef}
                        isSettingsDropdownOpen={isSettingsDropdownOpen}
                        setIsSettingsDropdownOpen={setIsSettingsDropdownOpen}
                        openEditContactPerson={openEditContactPerson}
                        navigate={navigate}
                        handleEditCustomer={handleEditCustomer}
                        openDeleteContactPersonModal={openDeleteContactPersonModal}
                        setIsDeleteModalOpen={setIsDeleteModalOpen}
                        setIsInviteModalOpen={setIsInviteModalOpen}
                        showInviteCard={showInviteCard}
                        setShowInviteCard={setShowInviteCard}
                        toggleSection={toggleSection}
                        expandedSections={expandedSections}
                        setAddressType={setAddressType}
                        setAddressFormData={setAddressFormData}
                        setShowAddressModal={setShowAddressModal}
                        setOpenContactPersonSettingsIndex={setOpenContactPersonSettingsIndex}
                        openContactPersonSettingsIndex={openContactPersonSettingsIndex}
                        resetContactPersonModal={resetContactPersonModal}
                        setIsAddContactPersonModalOpen={setIsAddContactPersonModalOpen}
                        markContactPersonAsPrimary={markContactPersonAsPrimary}
                        openAssociateTagsModal={openAssociateTagsModal}
                        associatedTagLabels={associatedTagLabels}
                        availableCurrencies={availableCurrencies}
                        formatCurrency={formatCurrency}
                        linkedVendor={linkedVendor}
                        customerSubscriptions={customerSubscriptions}
                        subscriptionDropdownRef={subscriptionDropdownRef}
                        isSubscriptionDropdownOpen={isSubscriptionDropdownOpen}
                        setIsSubscriptionDropdownOpen={setIsSubscriptionDropdownOpen}
                        formatDateForDisplay={formatDateForDisplay}
                        incomeTimePeriodRef={incomeTimePeriodRef}
                        incomeTimePeriod={incomeTimePeriod}
                        isIncomeTimePeriodDropdownOpen={isIncomeTimePeriodDropdownOpen}
                        setIsIncomeTimePeriodDropdownOpen={setIsIncomeTimePeriodDropdownOpen}
                        setIncomeTimePeriod={setIncomeTimePeriod}
                        invoices={invoices}
                        payments={payments}
                        accountingBasis={accountingBasis}
                        quotes={quotes}
                        creditNotes={creditNotes}
                        salesReceipts={salesReceipts}
                        recurringInvoices={recurringInvoices}
                    />
                )}
                {activeTab === "comments" && (
                    <CustomerCommentsPanel
                        customerId={String((customer as any)?._id || (customer as any)?.id || id || "")}
                        comments={comments}
                        onCommentsChange={(nextComments) => {
                            setComments(nextComments as any);
                            setCustomer((prev) => (prev ? { ...prev, comments: nextComments } : prev));
                        }}
                    />
                )}
                {
                    activeTab === "transactions" && (
                        <CustomerDetailTransactionsTab
                            goToTransactionsDropdownRef={goToTransactionsDropdownRef}
                            isGoToTransactionsDropdownOpen={isGoToTransactionsDropdownOpen}
                            setIsGoToTransactionsDropdownOpen={setIsGoToTransactionsDropdownOpen}
                            expandedTransactions={expandedTransactions}
                            openTransactionSection={openTransactionSection}
                            toggleTransactionSection={toggleTransactionSection}
                            navigate={navigate}
                            customer={customer}
                            statusDropdownRef={statusDropdownRef}
                            isStatusDropdownOpen={isStatusDropdownOpen}
                            setIsStatusDropdownOpen={setIsStatusDropdownOpen}
                            invoiceStatusFilter={invoiceStatusFilter}
                            invoiceStatusOptions={invoiceStatusOptions}
                            setInvoiceStatusFilter={setInvoiceStatusFilter}
                            setInvoiceCurrentPage={setInvoiceCurrentPage}
                            formatStatusLabel={formatStatusLabel}
                            filteredInvoices={filteredInvoices}
                            startIndex={startIndex}
                            endIndex={endIndex}
                            paginatedInvoices={paginatedInvoices}
                            normalizeInvoiceStatus={normalizeInvoiceStatus}
                            formatCurrency={formatCurrency}
                            invoiceCurrentPage={invoiceCurrentPage}
                            totalPages={totalPages}
                            payments={payments}
                            quoteStatusDropdownRef={quoteStatusDropdownRef}
                            isQuoteStatusDropdownOpen={isQuoteStatusDropdownOpen}
                            setIsQuoteStatusDropdownOpen={setIsQuoteStatusDropdownOpen}
                            quoteStatusFilter={quoteStatusFilter}
                            setQuoteStatusFilter={setQuoteStatusFilter}
                            getFilteredQuotes={getFilteredQuotes}
                            recurringInvoiceStatusDropdownRef={recurringInvoiceStatusDropdownRef}
                            isRecurringInvoiceStatusDropdownOpen={isRecurringInvoiceStatusDropdownOpen}
                            setIsRecurringInvoiceStatusDropdownOpen={setIsRecurringInvoiceStatusDropdownOpen}
                            recurringInvoiceStatusFilter={recurringInvoiceStatusFilter}
                            setRecurringInvoiceStatusFilter={setRecurringInvoiceStatusFilter}
                            getFilteredRecurringInvoices={getFilteredRecurringInvoices}
                            expenseStatusDropdownRef={expenseStatusDropdownRef}
                            isExpenseStatusDropdownOpen={isExpenseStatusDropdownOpen}
                            setIsExpenseStatusDropdownOpen={setIsExpenseStatusDropdownOpen}
                            expenseStatusFilter={expenseStatusFilter}
                            setExpenseStatusFilter={setExpenseStatusFilter}
                            getFilteredExpenses={getFilteredExpenses}
                            recurringExpenseStatusDropdownRef={recurringExpenseStatusDropdownRef}
                            isRecurringExpenseStatusDropdownOpen={isRecurringExpenseStatusDropdownOpen}
                            setIsRecurringExpenseStatusDropdownOpen={setIsRecurringExpenseStatusDropdownOpen}
                            recurringExpenseStatusFilter={recurringExpenseStatusFilter}
                            setRecurringExpenseStatusFilter={setRecurringExpenseStatusFilter}
                            getFilteredRecurringExpenses={getFilteredRecurringExpenses}
                            projectStatusDropdownRef={projectStatusDropdownRef}
                            isProjectStatusDropdownOpen={isProjectStatusDropdownOpen}
                            setIsProjectStatusDropdownOpen={setIsProjectStatusDropdownOpen}
                            projectStatusFilter={projectStatusFilter}
                            setProjectStatusFilter={setProjectStatusFilter}
                            getFilteredProjects={getFilteredProjects}
                            creditNoteStatusDropdownRef={creditNoteStatusDropdownRef}
                            isCreditNoteStatusDropdownOpen={isCreditNoteStatusDropdownOpen}
                            setIsCreditNoteStatusDropdownOpen={setIsCreditNoteStatusDropdownOpen}
                            creditNoteStatusFilter={creditNoteStatusFilter}
                            setCreditNoteStatusFilter={setCreditNoteStatusFilter}
                            getFilteredCreditNotes={getFilteredCreditNotes}
                            salesReceiptStatusDropdownRef={salesReceiptStatusDropdownRef}
                            isSalesReceiptStatusDropdownOpen={isSalesReceiptStatusDropdownOpen}
                            setIsSalesReceiptStatusDropdownOpen={setIsSalesReceiptStatusDropdownOpen}
                            salesReceiptStatusFilter={salesReceiptStatusFilter}
                            setSalesReceiptStatusFilter={setSalesReceiptStatusFilter}
                            getFilteredSalesReceipts={getFilteredSalesReceipts}
                        />
                    )
                }

                {activeTab === "purchases" && (
                    <CustomerDetailPurchasesTab
                        isLoading={isLinkedVendorPurchasesLoading}
                        customerCurrency={customer?.currency}
                        linkedVendorPurchaseSections={linkedVendorPurchaseSections}
                        sections={[
                            { key: "bills", label: "Bills", rows: linkedVendorPurchases, navigateTo: "/purchases/bills/" },
                            { key: "paymentsMade", label: "Bill Payments", rows: linkedVendorPaymentsMade, navigateTo: "/purchases/payments-made/" },
                            { key: "purchaseOrders", label: "Purchase Orders", rows: linkedVendorPurchaseOrders, navigateTo: "/purchases/purchase-orders/" },
                            { key: "vendorCredits", label: "Vendor Credits", rows: linkedVendorCredits, navigateTo: "/purchases/vendor-credits/" },
                        ]}
                        formatCurrency={formatCurrency}
                        onToggleSection={toggleLinkedVendorPurchaseSection}
                        onNavigate={navigate}
                    />
                )}

                {activeTab === "mails" && (
                        <CustomerDetailMailsTab
                            mails={mails}
                            linkEmailDropdownRef={linkEmailDropdownRef}
                            isLinkEmailDropdownOpen={isLinkEmailDropdownOpen}
                            onToggleLinkEmailDropdown={() => setIsLinkEmailDropdownOpen(!isLinkEmailDropdownOpen)}
                            onConnectZohoMail={() => {
                                setIsLinkEmailDropdownOpen(false);
                                setIsZohoMailIntegrationModalOpen(true);
                            }}
                            onConnectOutlook={() => {
                                setIsLinkEmailDropdownOpen(false);
                                setIsOutlookIntegrationModalOpen(true);
                            }}
                        />
                    )}

                {activeTab === "statement" && (
                    <CustomerDetailStatementTab
                        customer={customer}
                        displayName={displayName}
                        organizationProfile={organizationProfile}
                        ownerEmail={ownerEmail}
                        invoices={invoices}
                        payments={payments}
                        creditNotes={creditNotes}
                        statementTransactions={statementTransactions}
                        statementPeriod={statementPeriod}
                        statementFilter={statementFilter}
                        isStatementPeriodDropdownOpen={isStatementPeriodDropdownOpen}
                        isStatementFilterDropdownOpen={isStatementFilterDropdownOpen}
                        isStatementDownloading={isStatementDownloading}
                        statementPeriodDropdownRef={statementPeriodDropdownRef}
                        statementFilterDropdownRef={statementFilterDropdownRef}
                        onToggleStatementPeriodDropdown={() => setIsStatementPeriodDropdownOpen(!isStatementPeriodDropdownOpen)}
                        onToggleStatementFilterDropdown={() => setIsStatementFilterDropdownOpen(!isStatementFilterDropdownOpen)}
                        onSelectStatementPeriod={(value) => {
                            setStatementPeriod(value);
                            setIsStatementPeriodDropdownOpen(false);
                        }}
                        onSelectStatementFilter={(value) => {
                            setStatementFilter(value);
                            setIsStatementFilterDropdownOpen(false);
                        }}
                        onDownloadPdf={handleDownloadPDF}
                        onSendEmail={() => {
                            const { startDate, endDate } = getStatementDateRange();
                            navigate(`/sales/customers/${id}/send-email-statement`, {
                                state: {
                                    startDate,
                                    endDate,
                                    filterBy: statementFilter,
                                },
                            });
                        }}
                        getStatementDateRange={getStatementDateRange}
                    />
                )}
            </div>

            <CustomerDetailModalStack
                isPrintStatementsModalOpen={isPrintStatementsModalOpen}
                startDatePickerRef={startDatePickerRef}
                endDatePickerRef={endDatePickerRef}
                printStatementStartDate={printStatementStartDate}
                printStatementEndDate={printStatementEndDate}
                isStartDatePickerOpen={isStartDatePickerOpen}
                isEndDatePickerOpen={isEndDatePickerOpen}
                startDateCalendarMonth={startDateCalendarMonth}
                endDateCalendarMonth={endDateCalendarMonth}
                setIsPrintStatementsModalOpen={setIsPrintStatementsModalOpen}
                handlePrintStatementsSubmit={handlePrintStatementsSubmit}
                setIsStartDatePickerOpen={setIsStartDatePickerOpen}
                setIsEndDatePickerOpen={setIsEndDatePickerOpen}
                setPrintStatementStartDate={setPrintStatementStartDate}
                setPrintStatementEndDate={setPrintStatementEndDate}
                setStartDateCalendarMonth={setStartDateCalendarMonth}
                setEndDateCalendarMonth={setEndDateCalendarMonth}
                formatDateForDisplay={formatDateForDisplay}
                isMergeModalOpen={isMergeModalOpen}
                customer={customer}
                displayName={displayName}
                mergeTargetCustomer={mergeTargetCustomer}
                isMergeCustomerDropdownOpen={isMergeCustomerDropdownOpen}
                mergeCustomerSearch={mergeCustomerSearch}
                filteredMergeCustomers={filteredMergeCustomers}
                mergeCustomerDropdownRef={mergeCustomerDropdownRef}
                setIsMergeModalOpen={setIsMergeModalOpen}
                setMergeTargetCustomer={setMergeTargetCustomer}
                setMergeCustomerSearch={setMergeCustomerSearch}
                setIsMergeCustomerDropdownOpen={setIsMergeCustomerDropdownOpen}
                handleMergeSubmit={handleMergeSubmit}
                isAssociateTemplatesModalOpen={isAssociateTemplatesModalOpen}
                pdfTemplates={pdfTemplates}
                setIsAssociateTemplatesModalOpen={setIsAssociateTemplatesModalOpen}
                handleAssociateTemplatesSave={handleAssociateTemplatesSave}
                handleTemplateSelect={handleTemplateSelect}
                navigate={navigate}
                isCloneModalOpen={isCloneModalOpen}
                cloneContactType={cloneContactType}
                isCloning={isCloning}
                setIsCloneModalOpen={setIsCloneModalOpen}
                setCloneContactType={setCloneContactType}
                handleCloneSubmit={handleCloneSubmit}
                isConfigurePortalModalOpen={isConfigurePortalModalOpen}
                portalAccessContacts={portalAccessContacts}
                setPortalAccessContacts={setPortalAccessContacts}
                setIsConfigurePortalModalOpen={setIsConfigurePortalModalOpen}
                setCustomer={setCustomer}
                isLinkToVendorModalOpen={isLinkToVendorModalOpen}
                selectedVendor={selectedVendor}
                vendorSearch={vendorSearch}
                vendors={vendors}
                isVendorDropdownOpen={isVendorDropdownOpen}
                vendorDropdownRef={vendorDropdownRef}
                setIsLinkToVendorModalOpen={setIsLinkToVendorModalOpen}
                setSelectedVendor={setSelectedVendor}
                setVendorSearch={setVendorSearch}
                setIsVendorDropdownOpen={setIsVendorDropdownOpen}
                setLinkedVendor={setLinkedVendor}
                refreshData={refreshData}
                bulkConsolidatedAction={bulkConsolidatedAction}
                isBulkConsolidatedUpdating={isBulkConsolidatedUpdating}
                setBulkConsolidatedAction={setBulkConsolidatedAction}
                confirmSidebarBulkConsolidatedBilling={confirmSidebarBulkConsolidatedBilling}
                isAddContactPersonModalOpen={isAddContactPersonModalOpen}
                editingContactPersonIndex={editingContactPersonIndex}
                newContactPerson={newContactPerson}
                setNewContactPerson={setNewContactPerson}
                contactPersonWorkPhoneCode={contactPersonWorkPhoneCode}
                setContactPersonWorkPhoneCode={setContactPersonWorkPhoneCode}
                contactPersonMobilePhoneCode={contactPersonMobilePhoneCode}
                setContactPersonMobilePhoneCode={setContactPersonMobilePhoneCode}
                contactPersonProfilePreview={contactPersonProfilePreview}
                setContactPersonProfilePreview={setContactPersonProfilePreview}
                contactPersonProfileInputRef={contactPersonProfileInputRef}
                handleContactPersonProfileFile={handleContactPersonProfileFile}
                isSavingContactPerson={isSavingContactPerson}
                setIsAddContactPersonModalOpen={setIsAddContactPersonModalOpen}
                resetContactPersonModal={resetContactPersonModal}
                saveContactPerson={saveContactPerson}
                isAssociateTagsModalOpen={isAssociateTagsModalOpen}
                availableReportingTags={availableReportingTags}
                associateTagsValues={associateTagsValues}
                setAssociateTagsValues={setAssociateTagsValues}
                isSavingAssociateTags={isSavingAssociateTags}
                closeAssociateTagsModal={closeAssociateTagsModal}
                handleSaveAssociateTags={handleSaveAssociateTags}
                showAddressModal={showAddressModal}
                addressType={addressType}
                addressFormData={addressFormData}
                setAddressFormData={setAddressFormData}
                setShowAddressModal={setShowAddressModal}
                id={id}
                normalizeComments={normalizeComments}
                setComments={setComments}
                isOutlookIntegrationModalOpen={isOutlookIntegrationModalOpen}
                setIsOutlookIntegrationModalOpen={setIsOutlookIntegrationModalOpen}
                isZohoMailIntegrationModalOpen={isZohoMailIntegrationModalOpen}
                setIsZohoMailIntegrationModalOpen={setIsZohoMailIntegrationModalOpen}
                isDeleteModalOpen={isDeleteModalOpen}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                isDeleteContactPersonModalOpen={isDeleteContactPersonModalOpen}
                setIsDeleteContactPersonModalOpen={setIsDeleteContactPersonModalOpen}
                setPendingDeleteContactPersonIndex={setPendingDeleteContactPersonIndex}
                pendingDeleteContactPersonIndex={pendingDeleteContactPersonIndex}
                deleteContactPerson={deleteContactPerson}
                isInviteModalOpen={isInviteModalOpen}
                inviteMethod={inviteMethod}
                getInviteEmailValue={getInviteEmailValue}
                isSendingInvitation={isSendingInvitation}
                closeInviteModal={closeInviteModal}
                setInviteMethod={setInviteMethod}
                setInviteEmail={setInviteEmail}
                handleInviteWhatsAppShare={handleInviteWhatsAppShare}
                handleInviteFacebookShare={handleInviteFacebookShare}
                handleInviteTwitterShare={handleInviteTwitterShare}
                handleInviteLinkedInShare={handleInviteLinkedInShare}
                handleCopyInvitationLink={handleCopyInvitationLink}
                handleSendInvitation={handleSendInvitation}
            />
        </div>
    );
}

