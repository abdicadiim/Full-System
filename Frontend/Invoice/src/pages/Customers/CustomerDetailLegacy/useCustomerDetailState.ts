import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { customersAPI, vendorsAPI, currenciesAPI, invoicesAPI, paymentsReceivedAPI, creditNotesAPI, quotesAPI, recurringInvoicesAPI, expensesAPI, recurringExpensesAPI, projectsAPI, billsAPI, salesReceiptsAPI, journalEntriesAPI, paymentsMadeAPI, purchaseOrdersAPI, vendorCreditsAPI, documentsAPI, reportingTagsAPI, senderEmailsAPI } from "../../../services/api";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import {
    X, Edit, Paperclip, ChevronDown, Plus, MoreVertical,
    Settings, User, Mail, Phone, MapPin, Globe,
    DollarSign, TrendingUp, Calendar, UserPlus,
    ChevronUp, ChevronRight, Sparkles, Bold, Italic, Underline, ChevronRight as ChevronRightIcon,
    Filter, ArrowUpDown, Search, ChevronLeft, Link2, FileText, Monitor, Check, Upload, Trash2, Loader2, Download, RefreshCw, AlertTriangle, Smartphone
} from "lucide-react";
import { Customer, Invoice, CreditNote, AttachedFile, Quote, RecurringInvoice, Expense, RecurringExpense, Project, Bill, SalesReceipt } from "../../salesModel";
import { resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import CustomerCommentsPanel from "../CustomerDetail/CustomerCommentsPanel";
import CustomerAttachmentsPopover from "../CustomerDetail/CustomerAttachmentsPopover";

import type { ExtendedCustomer, Transaction, Comment, Mail as CustomerMail } from "../CustomerDetail/CustomerDetail.shared";
import { formatCurrency, formatDateForDisplay, formatMailDateTime, formatStatusLabel, normalizeInvoiceStatus, normalizeComments } from "../CustomerDetail/CustomerDetail.shared";
import { phoneCodeOptions as sharedPhoneCodeOptions } from "../CustomerDetail/phoneCodeOptions";

export function useCustomerDetailState(detail: any) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const createEmptyCustomer = () => ({
        contactPersons: [],
        additionalAddresses: [],
        reportingTags: [],
        tags: [],
    } as ExtendedCustomer);
    const initialCustomer = (location.state as any)?.customer || createEmptyCustomer();

    const [customer, setCustomer] = useState<ExtendedCustomer | null>(initialCustomer);
    const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [selectedTransactionType, setSelectedTransactionType] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isInvoiceViewDropdownOpen, setIsInvoiceViewDropdownOpen] = useState(false);

    const invoiceViewDropdownRef = useRef<HTMLDivElement>(null);
    const [expandedSections, setExpandedSections] = useState({
        address: true,
        additionalAddresses: true,
        otherDetails: true,
        contactPersons: true,
        associateTags: true,
        recordInfo: false
    });
    const [expandedTransactions, setExpandedTransactions] = useState({
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
    const transactionSectionOptions = [
        { key: "invoices", label: "Invoices" },
        { key: "customerPayments", label: "Customer Payments" },
        { key: "paymentLinks", label: "Payment Links" },
        { key: "quotes", label: "Quotes" },
        { key: "recurringInvoices", label: "Retainer Invoices" },
        { key: "expenses", label: "Expenses" },
        { key: "recurringExpenses", label: "Recurring Expenses" },
        { key: "projects", label: "Projects" },
        { key: "creditNotes", label: "Credit Notes" },
        { key: "salesReceipts", label: "Sales Receipts" },
        { key: "refunds", label: "Refunds" }
    ] as const;
    const [invoiceSearchTerm, setInvoiceSearchTerm] = useState("");
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
    const [billStatusFilter, setBillStatusFilter] = useState("all");
    const [isBillStatusDropdownOpen, setIsBillStatusDropdownOpen] = useState(false);
    const billStatusDropdownRef = useRef<HTMLDivElement>(null);

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
    const [pdfTemplates, setPdfTemplates] = useState({
        customerStatement: "Standard Template",
        quotes: "Standard Template",
        invoices: "Standard Template",
        creditNotes: "Standard Template",
        paymentThankYou: "Elite Template"
    });
    const [emailNotifications, setEmailNotifications] = useState({
        quotes: "Default",
        invoices: "Default",
        creditNotes: "Default",
        paymentThankYou: "Default"
    });
    const [openTemplateDropdown, setOpenTemplateDropdown] = useState<string | null>(null);
    const [templateSearches, setTemplateSearches] = useState<Record<string, string>>({});

    const pdfTemplateOptions = ["Standard Template", "Elite Template", "Classic Template", "Modern Template"];
    const emailTemplateOptions = ["Default", "Professional", "Friendly", "Formal"];

    // Payments state
    const [payments, setPayments] = useState<any[]>([]);

    // Mails state - sample data for demonstration
    const [mails, setMails] = useState<CustomerMail[]>([]);
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
    const phoneCodeOptions = sharedPhoneCodeOptions;

    const filteredWorkPhoneCodeOptions = useMemo(() => {
        const term = workPhoneCodeSearch.trim().toLowerCase();
        if (!term) return phoneCodeOptions;
        return phoneCodeOptions.filter(option => (
            option.name.toLowerCase().includes(term) ||
            option.code.toLowerCase().includes(term)
        ));
    }, [workPhoneCodeSearch, phoneCodeOptions]);
    const filteredMobilePhoneCodeOptions = useMemo(() => {
        const term = mobilePhoneCodeSearch.trim().toLowerCase();
        if (!term) return phoneCodeOptions;
        return phoneCodeOptions.filter(option => (
            option.name.toLowerCase().includes(term) ||
            option.code.toLowerCase().includes(term)
        ));
    }, [mobilePhoneCodeSearch, phoneCodeOptions]);

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
        const handleClickOutside = (event: MouseEvent) => {
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
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Profile Image and Invite Card state

    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [isAvatarHovered, setIsAvatarHovered] = useState(false);
    const [showInviteCard, setShowInviteCard] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteMethod, setInviteMethod] = useState('email'); // 'email' or 'social'
    const [inviteEmail, setInviteEmail] = useState('');

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
    const organizationNameHtml = organizationName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Owner email data
    const [ownerEmail, setOwnerEmail] = useState<any>(null);

    const normalizeImageSrc = (value: string | ArrayBuffer | null | undefined): string | null => {
        if (!value) return null;
        return typeof value === "string" ? value : null;
    };

    Object.assign(detail, {
        accountingBasis,
        accountingBasisRef,
        activeTab,
        addressFormData,
        addressType,
        areRemindersStopped,
        associateTagsSeed,
        associateTagsValues,
        attachments,
        attachmentsDropdownRef,
        availableCurrencies,
        availableReportingTags,
        billStatusDropdownRef,
        billStatusFilter,
        bills,
        bulkActionsDropdownRef,
        bulkConsolidatedAction,
        cloneContactType,
        commentText,
        comments,
        contactPersonMobilePhoneCode,
        contactPersonProfileInputRef,
        contactPersonProfilePreview,
        contactPersonWorkPhoneCode,
        creditNoteStatusDropdownRef,
        creditNoteStatusFilter,
        creditNotes,
        currencyDropdownRef,
        currencyValue,
        customer,
        customerTypeValue,
        customers,
        id,
        editingContactPersonIndex,
        emailNotifications,
        emailTemplateOptions,
        endDateCalendarMonth,
        endDatePickerRef,
        expandedSections,
        expandedTransactions,
        expenseStatusDropdownRef,
        expenseStatusFilter,
        expenses,
        fileInputRef,
        filteredMobilePhoneCodeOptions,
        filteredWorkPhoneCodeOptions,
        goToTransactionsDropdownRef,
        incomeTimePeriod,
        incomeTimePeriodRef,
        initialCustomer,
        inviteEmail,
        inviteMethod,
        invoiceCurrentPage,
        invoiceSearchTerm,
        invoiceStatusFilter,
        invoiceViewDropdownRef,
        invoices,
        invoicesPerPage,
        isAccountingBasisDropdownOpen,
        isAddContactPersonModalOpen,
        isAssociateTagsModalOpen,
        isAssociateTemplatesModalOpen,
        isAttachmentsDropdownOpen,
        isAvatarHovered,
        isBillStatusDropdownOpen,
        isBulkActionsDropdownOpen,
        isBulkConsolidatedUpdating,
        isCloneModalOpen,
        isCloning,
        isConfigurePortalModalOpen,
        isCreditNoteStatusDropdownOpen,
        isCurrencyDropdownOpen,
        isCurrencyEditing,
        isCurrencyHovered,
        isCustomerTypeEditing,
        isCustomerTypeHovered,
        isDeleteContactPersonModalOpen,
        isDeleteModalOpen,
        isEndDatePickerOpen,
        isExpenseStatusDropdownOpen,
        isGoToTransactionsDropdownOpen,
        isIncomeTimePeriodDropdownOpen,
        isInviteModalOpen,
        isInvoiceViewDropdownOpen,
        isLanguageDropdownOpen,
        isLanguageEditing,
        isLanguageHovered,
        isLinkEmailDropdownOpen,
        isLinkToVendorModalOpen,
        isLinkedVendorPurchasesLoading,
        isMergeCustomerDropdownOpen,
        isMergeModalOpen,
        isMobilePhoneCodeDropdownOpen,
        isMoreDropdownOpen,
        isNewTransactionDropdownOpen,
        isOpeningBalanceModalOpen,
        isOutlookIntegrationModalOpen,
        isPortalStatusHovered,
        isPrintStatementsModalOpen,
        isProjectStatusDropdownOpen,
        isQuoteStatusDropdownOpen,
        isRecurringExpenseStatusDropdownOpen,
        isRecurringInvoiceStatusDropdownOpen,
        isRefreshing,
        isSalesReceiptStatusDropdownOpen,
        isSavingAssociateTags,
        isSavingContactPerson,
        isSettingsDropdownOpen,
        isSidebarMoreMenuOpen,
        isStartDatePickerOpen,
        isStatementDownloading,
        isStatementFilterDropdownOpen,
        isStatementPeriodDropdownOpen,
        isStatusDropdownOpen,
        isSubscriptionDropdownOpen,
        isUploadingAttachments,
        isVendorDropdownOpen,
        isWorkPhoneCodeDropdownOpen,
        isZohoMailIntegrationModalOpen,
        journals,
        languageDropdownRef,
        languageValue,
        linkEmailDropdownRef,
        linkedVendor,
        linkedVendorCredits,
        linkedVendorPaymentsMade,
        linkedVendorPurchaseOrders,
        linkedVendorPurchaseSections,
        linkedVendorPurchases,
        loading,
        location,
        mails,
        mapDocumentsToAttachments,
        mergeCustomerDropdownRef,
        mergeCustomerSearch,
        mergeTargetCustomer,
        mobilePhoneCodeDropdownRef,
        mobilePhoneCodeSearch,
        moreDropdownRef,
        navigate,
        newContactPerson,
        newTransactionDropdownRef,
        normalizeImageSrc,
        openContactPersonSettingsIndex,
        openTemplateDropdown,
        openingBalanceValue,
        organizationName,
        organizationNameHtml,
        organizationProfile,
        ownerEmail,
        payments,
        pdfTemplateOptions,
        pdfTemplates,
        pendingDeleteContactPersonIndex,
        phoneCodeOptions,
        portalAccessContacts,
        printStatementEndDate,
        printStatementStartDate,
        profileImage,
        profileImageInputRef,
        projectStatusDropdownRef,
        projectStatusFilter,
        projects,
        quoteStatusDropdownRef,
        quoteStatusFilter,
        quotes,
        recurringExpenseStatusDropdownRef,
        recurringExpenseStatusFilter,
        recurringExpenses,
        recurringInvoiceStatusDropdownRef,
        recurringInvoiceStatusFilter,
        recurringInvoices,
        salesReceiptStatusDropdownRef,
        salesReceiptStatusFilter,
        salesReceipts,
        selectedCustomers,
        selectedTransactionType,
        selectedVendor,
        setAccountingBasis,
        setActiveTab,
        setAddressFormData,
        setAddressType,
        setAreRemindersStopped,
        setAssociateTagsSeed,
        setAssociateTagsValues,
        setAttachments,
        setAvailableCurrencies,
        setAvailableReportingTags,
        setBillStatusFilter,
        setBills,
        setBulkConsolidatedAction,
        setCloneContactType,
        setCommentText,
        setComments,
        setContactPersonMobilePhoneCode,
        setContactPersonProfilePreview,
        setContactPersonWorkPhoneCode,
        setCreditNoteStatusFilter,
        setCreditNotes,
        setCurrencyValue,
        setCustomer,
        setCustomerTypeValue,
        setCustomers,
        setEditingContactPersonIndex,
        setEmailNotifications,
        setEndDateCalendarMonth,
        setExpandedSections,
        setExpandedTransactions,
        setExpenseStatusFilter,
        setExpenses,
        setIncomeTimePeriod,
        setInviteEmail,
        setInviteMethod,
        setInvoiceCurrentPage,
        setInvoiceSearchTerm,
        setInvoiceStatusFilter,
        setInvoices,
        setIsAccountingBasisDropdownOpen,
        setIsAddContactPersonModalOpen,
        setIsAssociateTagsModalOpen,
        setIsAssociateTemplatesModalOpen,
        setIsAttachmentsDropdownOpen,
        setIsAvatarHovered,
        setIsBillStatusDropdownOpen,
        setIsBulkActionsDropdownOpen,
        setIsBulkConsolidatedUpdating,
        setIsCloneModalOpen,
        setIsCloning,
        setIsConfigurePortalModalOpen,
        setIsCreditNoteStatusDropdownOpen,
        setIsCurrencyDropdownOpen,
        setIsCurrencyEditing,
        setIsCurrencyHovered,
        setIsCustomerTypeEditing,
        setIsCustomerTypeHovered,
        setIsDeleteContactPersonModalOpen,
        setIsDeleteModalOpen,
        setIsEndDatePickerOpen,
        setIsExpenseStatusDropdownOpen,
        setIsGoToTransactionsDropdownOpen,
        setIsIncomeTimePeriodDropdownOpen,
        setIsInviteModalOpen,
        setIsInvoiceViewDropdownOpen,
        setIsLanguageDropdownOpen,
        setIsLanguageEditing,
        setIsLanguageHovered,
        setIsLinkEmailDropdownOpen,
        setIsLinkToVendorModalOpen,
        setIsLinkedVendorPurchasesLoading,
        setIsMergeCustomerDropdownOpen,
        setIsMergeModalOpen,
        setIsMobilePhoneCodeDropdownOpen,
        setIsMoreDropdownOpen,
        setIsNewTransactionDropdownOpen,
        setIsOpeningBalanceModalOpen,
        setIsOutlookIntegrationModalOpen,
        setIsPortalStatusHovered,
        setIsPrintStatementsModalOpen,
        setIsProjectStatusDropdownOpen,
        setIsQuoteStatusDropdownOpen,
        setIsRecurringExpenseStatusDropdownOpen,
        setIsRecurringInvoiceStatusDropdownOpen,
        setIsRefreshing,
        setIsSalesReceiptStatusDropdownOpen,
        setIsSavingAssociateTags,
        setIsSavingContactPerson,
        setIsSettingsDropdownOpen,
        setIsSidebarMoreMenuOpen,
        setIsStartDatePickerOpen,
        setIsStatementDownloading,
        setIsStatementFilterDropdownOpen,
        setIsStatementPeriodDropdownOpen,
        setIsStatusDropdownOpen,
        setIsSubscriptionDropdownOpen,
        setIsUploadingAttachments,
        setIsVendorDropdownOpen,
        setIsWorkPhoneCodeDropdownOpen,
        setIsZohoMailIntegrationModalOpen,
        setJournals,
        setLanguageValue,
        setLinkedVendor,
        setLinkedVendorCredits,
        setLinkedVendorPaymentsMade,
        setLinkedVendorPurchaseOrders,
        setLinkedVendorPurchaseSections,
        setLinkedVendorPurchases,
        setLoading,
        setMails,
        setMergeCustomerSearch,
        setMergeTargetCustomer,
        setMobilePhoneCodeSearch,
        setNewContactPerson,
        setOpenContactPersonSettingsIndex,
        setOpenTemplateDropdown,
        setOpeningBalanceValue,
        setOrganizationProfile,
        setOwnerEmail,
        setPayments,
        setPdfTemplates,
        setPendingDeleteContactPersonIndex,
        setPortalAccessContacts,
        setPrintStatementEndDate,
        setPrintStatementStartDate,
        setProfileImage,
        setProjectStatusFilter,
        setProjects,
        setQuoteStatusFilter,
        setQuotes,
        setRecurringExpenseStatusFilter,
        setRecurringExpenses,
        setRecurringInvoiceStatusFilter,
        setRecurringInvoices,
        setSalesReceiptStatusFilter,
        setSalesReceipts,
        setSelectedCustomers,
        setSelectedTransactionType,
        setSelectedVendor,
        setShowActionHeader,
        setShowAddressModal,
        setShowInviteCard,
        setSidebarSort,
        setStartDateCalendarMonth,
        setStatementFilter,
        setStatementPeriod,
        setStatementTransactions,
        setTemplateSearches,
        setVendorSearch,
        setVendors,
        setWorkPhoneCodeSearch,
        settingsDropdownRef,
        showActionHeader,
        showAddressModal,
        showInviteCard,
        sidebarMoreMenuRef,
        sidebarSort,
        sidebarSortedCustomers,
        startDateCalendarMonth,
        startDatePickerRef,
        statementFilter,
        statementFilterDropdownRef,
        statementPeriod,
        statementPeriodDropdownRef,
        statementTransactions,
        statusDropdownRef,
        subscriptionDropdownRef,
        templateSearches,
        transactionSectionOptions,
        vendorDropdownRef,
        vendorSearch,
        vendors,
        workPhoneCodeDropdownRef,
        workPhoneCodeSearch,
    });
    return detail;
}
