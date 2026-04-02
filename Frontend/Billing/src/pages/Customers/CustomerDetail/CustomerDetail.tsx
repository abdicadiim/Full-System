import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { customersAPI, vendorsAPI, currenciesAPI, invoicesAPI, paymentsReceivedAPI, creditNotesAPI, quotesAPI, recurringInvoicesAPI, expensesAPI, recurringExpensesAPI, projectsAPI, billsAPI, salesReceiptsAPI, journalEntriesAPI, paymentsMadeAPI, purchaseOrdersAPI, vendorCreditsAPI, documentsAPI, reportingTagsAPI } from "../../../services/api";
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


export default function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const initialCustomer = (location.state as any)?.customer || null;

    const [customer, setCustomer] = useState<ExtendedCustomer | null>(initialCustomer);
    const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
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
    const [pdfTemplates, setPdfTemplates] = useState<CustomerPdfTemplates>({
        customerStatement: "Standard Template",
        quotes: "Standard Template",
        invoices: "Standard Template",
        creditNotes: "Standard Template",
        paymentThankYou: "Elite Template"
    });

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
        initialCustomer,
        locationKey: location.key,
        navigate,
        activeTab,
        customer,
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

    // Close dropdowns when clicking outside
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
            if (linkEmailDropdownRef.current && !linkEmailDropdownRef.current.contains(event.target as Node)) {
                setIsLinkEmailDropdownOpen(false);
            }
            if (statementPeriodDropdownRef.current && !statementPeriodDropdownRef.current.contains(event.target as Node)) {
                setIsStatementPeriodDropdownOpen(false);
            }
            if (statementFilterDropdownRef.current && !statementFilterDropdownRef.current.contains(event.target as Node)) {
                setIsStatementFilterDropdownOpen(false);
            }
            if (bulkActionsDropdownRef.current && !bulkActionsDropdownRef.current.contains(event.target as Node)) {
                setIsBulkActionsDropdownOpen(false);
            }
            if (startDatePickerRef.current && !startDatePickerRef.current.contains(event.target as Node)) {
                setIsStartDatePickerOpen(false);
            }
            if (endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node)) {
                setIsEndDatePickerOpen(false);
            }
            if (mergeCustomerDropdownRef.current && !mergeCustomerDropdownRef.current.contains(event.target as Node)) {
                setIsMergeCustomerDropdownOpen(false);
            }
            if (newTransactionDropdownRef.current && !newTransactionDropdownRef.current.contains(event.target as Node)) {
                setIsNewTransactionDropdownOpen(false);
            }
            if (goToTransactionsDropdownRef.current && !goToTransactionsDropdownRef.current.contains(event.target as Node)) {
                setIsGoToTransactionsDropdownOpen(false);
            }
            if (attachmentsDropdownRef.current && !attachmentsDropdownRef.current.contains(event.target as Node)) {
                setIsAttachmentsDropdownOpen(false);
            }
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
                setIsMoreDropdownOpen(false);
            }
            if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
                setIsSettingsDropdownOpen(false);
            }
            if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
                setIsVendorDropdownOpen(false);
            }
            if (sidebarMoreMenuRef.current && !sidebarMoreMenuRef.current.contains(event.target as Node)) {
                setIsSidebarMoreMenuOpen(false);
            }
            if (quoteStatusDropdownRef.current && !quoteStatusDropdownRef.current.contains(event.target as Node)) {
                setIsQuoteStatusDropdownOpen(false);
            }
            if (recurringInvoiceStatusDropdownRef.current && !recurringInvoiceStatusDropdownRef.current.contains(event.target as Node)) {
                setIsRecurringInvoiceStatusDropdownOpen(false);
            }
            if (expenseStatusDropdownRef.current && !expenseStatusDropdownRef.current.contains(event.target as Node)) {
                setIsExpenseStatusDropdownOpen(false);
            }
            if (recurringExpenseStatusDropdownRef.current && !recurringExpenseStatusDropdownRef.current.contains(event.target as Node)) {
                setIsRecurringExpenseStatusDropdownOpen(false);
            }
            if (projectStatusDropdownRef.current && !projectStatusDropdownRef.current.contains(event.target as Node)) {
                setIsProjectStatusDropdownOpen(false);
            }
            if (creditNoteStatusDropdownRef.current && !creditNoteStatusDropdownRef.current.contains(event.target as Node)) {
                setIsCreditNoteStatusDropdownOpen(false);
            }
            if (salesReceiptStatusDropdownRef.current && !salesReceiptStatusDropdownRef.current.contains(event.target as Node)) {
                setIsSalesReceiptStatusDropdownOpen(false);
            }
            if (subscriptionDropdownRef.current && !subscriptionDropdownRef.current.contains(event.target as Node)) {
                setIsSubscriptionDropdownOpen(false);
            }
        };
        if (isStatusDropdownOpen || isLinkEmailDropdownOpen || isStatementPeriodDropdownOpen || isStatementFilterDropdownOpen || isBulkActionsDropdownOpen || isStartDatePickerOpen || isEndDatePickerOpen || isMergeCustomerDropdownOpen || isNewTransactionDropdownOpen || isGoToTransactionsDropdownOpen || isAttachmentsDropdownOpen || isMoreDropdownOpen || isVendorDropdownOpen || isSettingsDropdownOpen || isSidebarMoreMenuOpen ||
            isQuoteStatusDropdownOpen || isRecurringInvoiceStatusDropdownOpen || isExpenseStatusDropdownOpen || isRecurringExpenseStatusDropdownOpen || isProjectStatusDropdownOpen || isCreditNoteStatusDropdownOpen || isSalesReceiptStatusDropdownOpen || isSubscriptionDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isStatusDropdownOpen, isLinkEmailDropdownOpen, isStatementPeriodDropdownOpen, isStatementFilterDropdownOpen, isBulkActionsDropdownOpen, isStartDatePickerOpen, isEndDatePickerOpen, isMergeCustomerDropdownOpen, isNewTransactionDropdownOpen, isGoToTransactionsDropdownOpen, isAttachmentsDropdownOpen, isMoreDropdownOpen, isVendorDropdownOpen, isSettingsDropdownOpen, isSidebarMoreMenuOpen,
        isQuoteStatusDropdownOpen, isRecurringInvoiceStatusDropdownOpen, isExpenseStatusDropdownOpen, isRecurringExpenseStatusDropdownOpen, isProjectStatusDropdownOpen, isCreditNoteStatusDropdownOpen, isSalesReceiptStatusDropdownOpen, isSubscriptionDropdownOpen]);

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const openTransactionSection = (section: keyof typeof expandedTransactions) => {
        setExpandedTransactions(prev => {
            const next = { ...prev };
            (Object.keys(next) as Array<keyof typeof next>).forEach((key) => {
                next[key] = false;
            });
            next[section] = true;
            return next;
        });
        setSelectedTransactionType(section);
        setIsGoToTransactionsDropdownOpen(false);
    };

    const toggleTransactionSection = (section: keyof typeof expandedTransactions) => {
        setExpandedTransactions(prev => {
            const isOpen = prev[section];
            const next = { ...prev };
            (Object.keys(next) as Array<keyof typeof next>).forEach((key) => {
                next[key] = false;
            });
            next[section] = !isOpen;
            return next;
        });
        setSelectedTransactionType(section);
    };

    const toggleLinkedVendorPurchaseSection = (section: keyof typeof linkedVendorPurchaseSections) => {
        setLinkedVendorPurchaseSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Customer selection handlers
    const handleCustomerCheckboxChange = (customerId: string, e: React.MouseEvent | React.ChangeEvent) => {
        e.stopPropagation();
        setSelectedCustomers(prev => {
            if (prev.includes(customerId)) {
                return prev.filter(id => id !== customerId);
            } else {
                return [...prev, customerId];
            }
        });
    };

    const handleClearSelection = () => {
        setSelectedCustomers([]);
    };

    const handleSelectAllCustomers = () => {
        if (selectedCustomers.length === customers.length) {
            setSelectedCustomers([]);
        } else {
            setSelectedCustomers(customers.map((c: any) => c.id));
        }
    };

    const handlePrintCustomerStatements = () => {
        setIsBulkActionsDropdownOpen(false);
        setIsPrintStatementsModalOpen(true);
    };

    const handlePrintStatementsSubmit = () => {
        // TODO: Implement actual print functionality
        setIsPrintStatementsModalOpen(false);
        toast.info(`Printing statements for ${selectedCustomers.length} customer(s)`);
    };

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
            await refreshData();
            toast.success(editingContactPersonIndex !== null ? "Contact person updated." : "Contact person added.");
        } catch (error: any) {
            toast.error(error?.message || "Failed to update contact person.");
            return;
        } finally {
            setIsSavingContactPerson(false);
        }

        setIsAddContactPersonModalOpen(false);
        resetContactPersonModal();
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
            await refreshData();
            toast.success("Marked as primary contact.");
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
            await refreshData();
            toast.success("Contact person deleted.");
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
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target.closest?.('[data-contact-person-menu-root="true"]')) return;
            setOpenContactPersonSettingsIndex(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openContactPersonSettingsIndex]);

    const buildCustomerSystemMails = useCallback((customerRow: any) => {
        const customerId = String(id || customerRow?._id || customerRow?.id || "").trim();
        if (!customerId) return [];

        const emails = Array.from(new Set([
            String(customerRow?.email || "").trim(),
            ...(Array.isArray(customerRow?.contactPersons)
                ? customerRow.contactPersons.map((p: any) => String(p?.email || "").trim())
                : []),
        ].filter(Boolean))).filter(Boolean);

        const defaultTo = emails[0] || "";

        const rows: Array<Mail & { sortTime: number }> = [];

        // 1) Local mail log (created via customersAPI.sendInvitation/sendReviewRequest/sendStatement)
        try {
            const raw = localStorage.getItem("taban_customer_mail_log");
            const parsed = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(parsed) ? parsed : [];
            list
                .filter((entry: any) => String(entry?.customerId || "").trim() === customerId)
                .forEach((entry: any, idx: number) => {
                    const type = String(entry?.type || "system").trim();
                    const payload = entry?.payload || {};
                    const createdAt = entry?.createdAt || entry?.timestamp || entry?.date || "";
                    const to =
                        String(payload?.to || payload?.email || payload?.recipient || defaultTo || "").trim() ||
                        defaultTo ||
                        "";

                    const subjectAndDesc = (() => {
                        if (type === "send-invitation") {
                            return { subject: "Invite to Portal", description: "Sent" };
                        }
                        if (type === "request-review") {
                            return { subject: "Request Review", description: "Sent" };
                        }
                        if (type === "send-statement") {
                            return { subject: "Customer Statement", description: "Sent" };
                        }
                        return { subject: type.replace(/-/g, " "), description: "Sent" };
                    })();

                    rows.push({
                        id: String(entry?.id || `mail-log-${idx}`),
                        to,
                        subject: subjectAndDesc.subject,
                        description: subjectAndDesc.description,
                        date: formatMailDateTime(createdAt),
                        type,
                        initial: (to?.[0] || "M").toUpperCase(),
                        sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - idx,
                    });
                });
        } catch {
            // ignore local storage errors
        }

        // 2) Payments â†’ Payment Acknowledgment
        const paymentTo = defaultTo;
        if (paymentTo && Array.isArray(payments) && payments.length) {
            payments.forEach((payment: any, idx: number) => {
                const createdAt = payment?.date || payment?.paymentDate || payment?.createdAt || payment?.created_on || "";
                const amount = Number(payment?.amount ?? payment?.total ?? payment?.amountPaid ?? 0) || 0;
                const currency = String(payment?.currency || customerRow?.currency || "USD");
                rows.push({
                    id: String(payment?.id || payment?._id || `payment-mail-${idx}`),
                    to: paymentTo,
                    subject: "Payment Acknowledgment - Thank you, We have received your payment.",
                    description: amount ? `${formatCurrency(amount, currency)} - Sent` : "Sent",
                    date: formatMailDateTime(createdAt) || formatMailDateTime(new Date()),
                    type: "payment",
                    initial: (paymentTo?.[0] || "P").toUpperCase(),
                    sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - 1000 - idx,
                });
            });
        }

        // 3) Unpaid/Overdue invoices â†’ Payment Reminder
        const reminderTo = defaultTo;
        if (reminderTo && Array.isArray(invoices) && invoices.length) {
            invoices.forEach((inv: any, idx: number) => {
                const status = String(inv?.status || inv?.invoiceStatus || "").toLowerCase();
                if (!status.includes("overdue") && !status.includes("unpaid") && !status.includes("due")) return;
                const number = String(inv?.invoiceNumber || inv?.invoiceNo || inv?.invoice_number || inv?.number || "INV").trim();
                const createdAt = inv?.date || inv?.invoiceDate || inv?.createdAt || inv?.created_on || "";
                const total = Number(inv?.total ?? inv?.amount ?? inv?.balance ?? 0) || 0;
                const currency = String(inv?.currency || customerRow?.currency || "USD");
                rows.push({
                    id: String(inv?.id || inv?._id || `invoice-reminder-${idx}`),
                    to: reminderTo,
                    subject: `Payment Reminder - Payment of ${formatCurrency(total, currency)} is outstanding for ${number}`,
                    description: "",
                    date: formatMailDateTime(createdAt) || formatMailDateTime(new Date()),
                    type: "reminder",
                    initial: (reminderTo?.[0] || "R").toUpperCase(),
                    sortTime: Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getTime() : Date.now() - 2000 - idx,
                });
            });
        }

        // Sort newest first and limit (keep UI fast)
        return rows
            .filter((m) => Boolean(String(m.to || "").trim()))
            .sort((a, b) => b.sortTime - a.sortTime)
            .slice(0, 50)
            .map(({ sortTime, ...mail }) => mail);
    }, [id, payments, invoices]);

    useEffect(() => {
        if (!customer || !id) return;
        // keep mails always in sync with selected customer + latest local logs
        setMails(buildCustomerSystemMails(customer));
    }, [customer, id, buildCustomerSystemMails, activeTab]);

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
                const response: any = await reportingTagsAPI.getAll({ limit: 10000 });
                const list = Array.isArray(response?.data) ? response.data : [];
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

            // Refresh customer data
            await refreshData();
            setLinkedVendor(null);
            setLinkedVendorPurchases([]);

            toast.success(`Customer "${customer.name || customer.displayName}" has been unlinked from the vendor`);
        } catch (error: any) {
            toast.error('Failed to unlink vendor: ' + (error.message || 'Unknown error'));
        }
        setIsMoreDropdownOpen(false);
    };

    // Statement print, PDF, and Excel functions
    const getStatementDateRange = () => {
        const now = new Date();
        let startDate, endDate;

        switch (statementPeriod) {
            case "this-month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case "last-month":
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case "this-quarter":
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case "this-year":
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        return { startDate, endDate };
    };

    const handleDownloadPDF = async () => {
        if (!customer || isStatementDownloading) return;

        setIsStatementDownloading(true);

        const today = new Date();
        const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const receivables = parseFloat(String(customer.receivables || customer.openingBalance || 0));
        const currency = customer.currency || "USD";

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm';
        document.body.appendChild(container);

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            container.innerHTML = `
          <div style="padding: 15mm; background: white; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.6; min-height: 297mm; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
              <div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #156372; text-transform: uppercase; letter-spacing: -0.5px;">${organizationName}</h1>
                <div style="margin-top: 8px; font-size: 13px; color: #4a5568;">
                  <p style="margin: 2px 0;">${organizationProfile?.address?.country || "Aland Islands"}</p>
                  <p style="margin: 2px 0;">${ownerEmail?.email || organizationProfile?.email || ""}</p>
                </div>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 32px; font-weight: 900; color: #2d3748; text-transform: uppercase; line-height: 1;">Statement</h2>
                <div style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #718096; background: #f7fafc; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                  ${dateStr} - ${dateStr}
                </div>
              </div>
            </div>

            <div style="height: 1px; background: #e2e8f0; margin-bottom: 40px;"></div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;">
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a0aec0; font-weight: 700;">Statement Of Accounts To</h3>
                <div style="font-size: 16px; font-weight: 700; color: #1a202c;">${displayName || 'N/A'}</div>
                ${customer.companyName ? `<div style="font-size: 14px; color: #4a5568; margin-top: 4px;">${customer.companyName}</div>` : ''}
                <div style="font-size: 14px; color: #4a5568; margin-top: 2px;">${customer.email || ''}</div>
              </div>
              <div style="background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #edf2f7;">
                <h3 style="margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; color: #2d3748; font-weight: 700; border-bottom: 2px solid #156372; display: inline-block; padding-bottom: 4px;">Account Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Opening Balance</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${currency} 0.00</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Invoiced Amount</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Amount Received</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600; color: #48bb78;">${currency} 0.00</td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="padding: 12px 0 0 0; font-weight: 800; color: #1a202c; font-size: 16px;">Balance Due</td>
                    <td style="text-align: right; padding: 12px 0 0 0; font-weight: 800; color: #156372; font-size: 18px;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="margin-bottom: 60px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #156372; color: white;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700; border-radius: 8px 0 0 8px;">DATE</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">TRANSACTIONS</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">DETAILS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">AMOUNT</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">PAYMENTS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700; border-radius: 0 8px 8px 0;">BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600;">Opening Balance</td>
                    <td style="padding: 15px; color: #718096;">Initial balance</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; color: #48bb78;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">0.00</td>
                  </tr>
                  <tr style="background: #fcfcfc; border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600; color: #156372;">Invoice</td>
                    <td style="padding: 15px; color: #718096;">Account Balance Adjustment</td>
                    <td style="padding: 15px; text-align: right;">${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; border-top: 2px solid #156372;">
                    <td colspan="4" style="padding: 20px 15px; text-align: right; font-weight: 800; font-size: 14px; color: #2d3748;">NET BALANCE DUE</td>
                    <td style="padding: 20px 15px; text-align: right;"></td>
                    <td style="padding: 20px 15px; text-align: right; font-weight: 900; font-size: 15px; color: #156372;">${currency} ${receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style="position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; font-size: 10px;">
              <p style="margin: 0; font-weight: 600;">Generated professionally by ${organizationName}</p>
              <p style="margin: 4px 0 0 0;">Report Date: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        `;

            const canvas = await html2canvas(container, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            pdf.save(`Statements_${today.toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            toast.error("Error generating PDF. Please try again.");
        } finally {
            try {
                document.body.removeChild(container);
            } catch (e) {
                // no-op
            }
            setIsStatementDownloading(false);
        }
    };

    const handleMergeCustomers = () => {
        setIsBulkActionsDropdownOpen(false);
        setIsMoreDropdownOpen(false);
        setMergeTargetCustomer(null);
        setMergeCustomerSearch("");
        setIsMergeCustomerDropdownOpen(false);
        setIsMergeModalOpen(true);
    };

    const handleMergeSubmit = async () => {
        if (!mergeTargetCustomer) {
            toast.error("Please select a customer to merge with.");
            return;
        }
        if (!customer) {
            toast.error("Customer data not available.");
            return;
        }

        const sourceCustomer = customer;
        const sourceCustomerId = String(sourceCustomer.id || sourceCustomer._id || "").trim();
        const targetCustomer = mergeTargetCustomer;
        const targetCustomerId = String(targetCustomer.id || targetCustomer._id || "").trim();

        if (!sourceCustomerId || !targetCustomerId) {
            toast.error("Unable to determine customer IDs for merge.");
            return;
        }

        if (sourceCustomerId === targetCustomerId) {
            toast.error("Please select a different customer to merge with.");
            return;
        }

        try {
            await customersAPI.merge(targetCustomerId, [sourceCustomerId]);

            toast.success(`Successfully merged "${sourceCustomer.name || sourceCustomer.displayName}" into "${targetCustomer.name || targetCustomer.displayName}".`);
            setIsMergeModalOpen(false);
            setMergeTargetCustomer(null);
            setMergeCustomerSearch("");

            navigate(`/sales/customers/${targetCustomerId}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to merge customers");
        }
    };

    // Get customers available for merge (exclude current customer)
    const getMergeableCustomers = () => {
        return customers.filter(c => {
            const candidateId = String(c.id || c._id || "");
            if (candidateId === String(id)) return false;
            return true;
        });
    };

    const filteredMergeCustomers = getMergeableCustomers().filter(c =>
        c.name.toLowerCase().includes(mergeCustomerSearch.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(mergeCustomerSearch.toLowerCase()))
    );

    const handleAssociateTemplates = () => {
        setIsBulkActionsDropdownOpen(false);
        setIsMoreDropdownOpen(false);
        setIsAssociateTemplatesModalOpen(true);
    };

    const handleAssociateTemplatesSave = () => {
        // TODO: Implement actual save functionality
        setIsAssociateTemplatesModalOpen(false);
        toast.success("Templates associated successfully!");
    };

    const handleTemplateSelect = (category: "pdf", field: keyof CustomerPdfTemplates, value: string) => {
        if (category === "pdf") {
            setPdfTemplates(prev => ({ ...prev, [field]: value }));
        }
    };

    const getInviteEmailValue = () =>
        inviteEmail || customer?.email || customer?.contactPersons?.[0]?.email || "";

    const closeInviteModal = () => {
        setIsInviteModalOpen(false);
        setInviteEmail("");
        setInviteMethod("email");
        setIsSendingInvitation(false);
    };

    const getInviteCustomerName = () => customer?.name || customer?.displayName || "Customer";

    const handleInviteWhatsAppShare = () => {
        const inviteMessage = `Hello ${getInviteCustomerName()},\n\nYou have been invited to join our customer portal. Please click the link below to access your account:\n\n${window.location.href}\n\nThank you!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, "_blank");
        toast.success("Opening WhatsApp...");
    };

    const handleInviteFacebookShare = () => {
        const shareText = `Invite ${getInviteCustomerName()} to join our customer portal`;
        const shareUrl = window.location.href;
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const handleInviteTwitterShare = () => {
        const shareText = `Invite ${getInviteCustomerName()} to join our customer portal`;
        const shareUrl = window.location.href;
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const handleInviteLinkedInShare = () => {
        const shareUrl = window.location.href;
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const handleCopyInvitationLink = async () => {
        const shareText = `Invite ${getInviteCustomerName()} to join our customer portal: ${window.location.href}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Customer Portal Invitation",
                    text: shareText,
                });
                return;
            } catch {
                // Fall back to clipboard copy when native share is dismissed or unavailable.
            }
        }

        await navigator.clipboard.writeText(shareText);
        toast.success("Invitation link copied to clipboard!");
    };

    const handleSendInvitation = async () => {
        const emailToSend = getInviteEmailValue();
        if (!emailToSend || !emailToSend.trim()) {
            toast.error("Please enter an email address");
            return;
        }

        const normalizedEmail = emailToSend.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsSendingInvitation(true);
        try {
            const response = await customersAPI.sendInvitation(id, {
                email: normalizedEmail,
                method: "email"
            });

            if (response && response.success) {
                toast.success(`Invitation email sent successfully to ${normalizedEmail}`);
                closeInviteModal();
                setShowInviteCard(true);
                return;
            }

            throw new Error(response?.message || "Failed to send invitation");
        } catch (error: any) {
            const errorMessage =
                error?.data?.message ||
                error?.data?.error ||
                error?.message ||
                "Unknown error";

            toast.error(`Failed to send invitation: ${errorMessage}`, {
                autoClose: 5000
            });
        } finally {
            setIsSendingInvitation(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !customer || !id) return;

        setIsUploadingAttachments(true);
        try {
            const currentDocuments = Array.isArray(customer.documents) ? customer.documents : [];
            const filesArray = Array.from(files);

            if (currentDocuments.length + filesArray.length > 10) {
                toast.error("You can upload a maximum of 10 files.");
                return;
            }

            const oversizedFiles = filesArray.filter((file) => file.size > 10 * 1024 * 1024);
            if (oversizedFiles.length > 0) {
                toast.error("Each file must be 10MB or less.");
                return;
            }

            const uploadedDocuments: any[] = [];
            let persistedDocuments: any[] | null = null;
            for (const file of filesArray) {
                const uploadResponse = await documentsAPI.upload(file, {
                    name: file.name,
                    module: "Customers",
                    type: "other",
                    relatedToType: "customer",
                    relatedToId: String(id)
                });

                if (uploadResponse?.success && uploadResponse?.data) {
                    const document = uploadResponse.data as any;
                    uploadedDocuments.push({
                        id: String(document.documentId || document.id || document._id || file.name),
                        documentId: String(document.documentId || document.id || document._id || "").trim() || String(document.id || document._id || ""),
                        name: document.name || file.name,
                        size: Number(document.size || file.size || 0),
                        mimeType: document.mimeType || file.type || "application/octet-stream",
                        url: document.viewUrl || document.url || document.contentUrl || document.previewUrl || "",
                        viewUrl: document.viewUrl || document.url || document.contentUrl || document.previewUrl || "",
                        downloadUrl: document.downloadUrl || document.url || document.contentUrl || "",
                        uploadedAt: document.uploadedAt || new Date().toISOString()
                    });
                    if (Array.isArray(document.documents)) {
                        persistedDocuments = document.documents;
                    }
                }
            }

            if (uploadedDocuments.length === 0) {
                toast.error("Failed to upload files. Please try again.");
                return;
            }

            const nextDocuments = Array.isArray(persistedDocuments) && persistedDocuments.length > 0
                ? persistedDocuments
                : [...currentDocuments, ...uploadedDocuments];

            setCustomer(prev => prev ? ({ ...prev, documents: nextDocuments }) : prev);
            setAttachments(mapDocumentsToAttachments(nextDocuments));

            toast.success(`${uploadedDocuments.length} file(s) uploaded successfully`);
        } catch (error) {
            toast.error('Failed to upload files: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsUploadingAttachments(false);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveAttachment = async (attachmentId: string | number) => {
        if (!customer || !id) return;

        try {
            const targetId = String(attachmentId || "").trim();
            const currentDocuments = Array.isArray(customer.documents) ? customer.documents : [];
            const removedDocument = currentDocuments.find((doc: any, index: number) => {
                const docId = String(doc.documentId || doc.id || doc._id || index + 1).trim();
                return docId === targetId || String(index + 1) === targetId;
            });
            const removedDocumentId = String(removedDocument?.documentId || removedDocument?.id || removedDocument?._id || targetId).trim();
            const updatedDocuments = currentDocuments.filter((doc: any, index: number) => {
                const docId = String(doc.documentId || doc.id || doc._id || index + 1).trim();
                return docId !== targetId && String(index + 1) !== targetId;
            });

            if (!removedDocumentId) {
                throw new Error("Attachment not found.");
            }

            const deleteResponse = await documentsAPI.delete(String(removedDocumentId));
            const persistedDocuments = deleteResponse?.data?.documents || updatedDocuments;

            setCustomer(prev => prev ? ({ ...prev, documents: persistedDocuments }) : prev);
            setAttachments(mapDocumentsToAttachments(persistedDocuments));

            toast.success('Attachment removed successfully');
        } catch (error) {
            toast.error('Failed to remove attachment: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handleClone = () => {
        setIsMoreDropdownOpen(false);
        setCloneContactType("customer");
        handleCloneSubmit("customer");
    };

    const handleCloneSubmit = async (forcedType?: "customer" | "vendor") => {
        if (!customer) return;

        // Keep existing vendor behavior; auto-clone customer directly.
        const contactType = forcedType || cloneContactType;
        if (contactType === "vendor") {
            const clonedData = {
                ...customer,
                id: undefined,
                name: `${customer.name} (Clone)`,
                displayName: customer.displayName ? `${customer.displayName} (Clone)` : undefined
            };
            setIsCloneModalOpen(false);
            navigate("/purchases/vendors/new", { state: { clonedData } });
            return;
        }

        setIsCloning(true);
        try {
            const source: any = customer;
            const copySuffix = " (Clone)";

            const billingAddress = source.billingAddress || {
                attention: source.billingAttention || "",
                country: source.billingCountry || "",
                street1: source.billingStreet1 || "",
                street2: source.billingStreet2 || "",
                city: source.billingCity || "",
                state: source.billingState || "",
                zipCode: source.billingZipCode || "",
                phone: source.billingPhone || "",
                fax: source.billingFax || "",
            };

            const shippingAddress = source.shippingAddress || {
                attention: source.shippingAttention || "",
                country: source.shippingCountry || "",
                street1: source.shippingStreet1 || "",
                street2: source.shippingStreet2 || "",
                city: source.shippingCity || "",
                state: source.shippingState || "",
                zipCode: source.shippingZipCode || "",
                phone: source.shippingPhone || "",
                fax: source.shippingFax || "",
            };

            const clonedPayload = {
                displayName: `${source.displayName || source.name || "Customer"}${copySuffix}`,
                name: `${source.name || source.displayName || "Customer"}${copySuffix}`,
                status: "active",
                isActive: true,
                isInactive: false,
                customerType: source.customerType || "business",
                salutation: source.salutation || "",
                firstName: source.firstName || "",
                lastName: source.lastName || "",
                companyName: source.companyName || "",
                email: source.email || "",
                workPhone: source.workPhone || "",
                mobile: source.mobile || "",
                websiteUrl: source.websiteUrl || source.website || "",
                xHandle: source.xHandle || "",
                skypeName: source.skypeName || "",
                facebook: source.facebook || "",
                customerNumber: "",
                customerLanguage: source.customerLanguage || source.portalLanguage || "english",
                taxRate: source.taxRate || "",
                exchangeRate: parseFloat(String(source.exchangeRate || "1")) || 1,
                companyId: source.companyId || "",
                locationCode: source.locationCode || "",
                currency: source.currency || "USD",
                paymentTerms: source.paymentTerms || "due-on-receipt",
                department: source.department || "",
                designation: source.designation || "",
                accountsReceivable: source.accountsReceivable || "",
                openingBalance: String(source.openingBalance || source.receivables || "0"),
                receivables: parseFloat(String(source.receivables || source.openingBalance || "0")) || 0,
                enablePortal: !!source.enablePortal,
                customerOwner: source.customerOwner || "",
                remarks: source.remarks || source.notes || "",
                notes: source.notes || source.remarks || "",
                billingAddress,
                shippingAddress,
                contactPersons: Array.isArray(source.contactPersons)
                    ? source.contactPersons.map((cp: any) => {
                        const { id, _id, createdAt, updatedAt, ...rest } = cp || {};
                        return { ...rest };
                    })
                    : [],
                documents: Array.isArray(source.documents) ? [...source.documents] : [],
                customFields: source.customFields || {},
                reportingTags: source.reportingTags || []
            };

            const response: any = await customersAPI.create(clonedPayload);
            if (!response?.success) {
                throw new Error(response?.message || "Failed to clone customer");
            }

            const clonedCustomer = response?.data || {};

            window.dispatchEvent(new CustomEvent("customersUpdated", {
                detail: {
                    customer: clonedCustomer,
                    action: "created"
                }
            }));

            setIsCloneModalOpen(false);
            toast.success("Customer cloned successfully.");
            await reloadSidebarCustomerList();
            // Stay on the current customer after cloning.
        } catch (error: any) {
            toast.error(error?.message || "Failed to clone customer");
        } finally {
            setIsCloning(false);
        }
    };

    const formatDateForDisplay = (date: any) => {
        if (!date) return "";
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatMailDateTime = (date: any) => {
        if (!date) return "";
        const dateObj = typeof date === "string" ? new Date(date) : date;
        if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
        const datePart = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const timePart = dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
        return `${datePart} ${timePart}`;
    };

    const invoiceStatusOptions = ["all", "draft", "client viewed", "partially paid", "unpaid", "overdue", "paid", "void"];
    const formatStatusLabel = (value: string) => value.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    const normalizeInvoiceStatus = (invoice: any) => {
        const raw = String(invoice?.status || "draft").toLowerCase();
        if (raw === "void") return "void";
        if (raw === "paid") return "paid";
        if (raw === "overdue") return "overdue";
        if (raw === "partially paid" || raw === "partial" || raw === "partial paid") return "partially paid";
        if (raw === "open" || raw === "unpaid") return "unpaid";
        if (raw === "sent" || raw === "viewed" || invoice?.customerViewed) return "client viewed";
        return "draft";
    };

    // Filter and paginate invoices
    const getFilteredInvoices = () => {
        let filtered = invoices;
        if (invoiceStatusFilter !== "all") {
            filtered = filtered.filter(inv =>
                normalizeInvoiceStatus(inv) === invoiceStatusFilter.toLowerCase()
            );
        }

        return filtered;
    };

    const filteredInvoices = getFilteredInvoices();
    const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
    const startIndex = (invoiceCurrentPage - 1) * invoicesPerPage;
    const endIndex = startIndex + invoicesPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    const getFilteredQuotes = () => {
        let filtered = quotes;
        if (quoteStatusFilter !== "all") {
            filtered = filtered.filter(q => (q.status || "draft").toLowerCase() === quoteStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredRecurringInvoices = () => {
        let filtered = recurringInvoices;
        if (recurringInvoiceStatusFilter !== "all") {
            filtered = filtered.filter(ri => (ri.status || "active").toLowerCase() === recurringInvoiceStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredExpenses = () => {
        let filtered = expenses;
        if (expenseStatusFilter !== "all") {
            filtered = filtered.filter(e => (e.status || "unbilled").toLowerCase() === expenseStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredRecurringExpenses = () => {
        let filtered = recurringExpenses;
        if (recurringExpenseStatusFilter !== "all") {
            filtered = filtered.filter(re => (re.status || "active").toLowerCase() === recurringExpenseStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredProjects = () => {
        let filtered = projects;
        if (projectStatusFilter !== "all") {
            filtered = filtered.filter(p => (p.status || "active").toLowerCase() === projectStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredCreditNotes = () => {
        let filtered = creditNotes;
        if (creditNoteStatusFilter !== "all") {
            filtered = filtered.filter(cn => (cn.status || "draft").toLowerCase() === creditNoteStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const getFilteredSalesReceipts = () => {
        let filtered = salesReceipts;
        if (salesReceiptStatusFilter !== "all") {
            filtered = filtered.filter(sr => (sr.status || "draft").toLowerCase() === salesReceiptStatusFilter.toLowerCase());
        }
        return filtered;
    };

    const formatCurrency = (amount: any, currency = "AMD") => {
        return `${currency}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;
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

    const isCustomerActive = (c: any) => {
        const status = String(c?.status ?? "").toLowerCase().trim();
        if (status === "inactive" || c?.isInactive === true) return false;
        return status === "active" || c?.isActive === true || (!status && c?.isInactive !== true);
    };

    const setActiveStatus = async (makeActive: boolean) => {
        const targetId = String((customer as any)?._id || (customer as any)?.id || id || "").trim();
        if (!targetId || targetId.toLowerCase() === "undefined" || targetId.toLowerCase() === "null") {
            toast.error("Customer ID not found. Please refresh and try again.");
            return;
        }

        const status = makeActive ? "active" : "inactive";
        const statusLabel = makeActive ? "active" : "inactive";

        // Optimistic UI update for current customer and exact matching sidebar row only.
        setCustomer(prev => prev ? ({ ...prev, status, isActive: makeActive, isInactive: !makeActive }) : prev);
        setCustomers(prev => prev.map((c: any) => {
            const rowId = String(c?._id || c?.id || "").trim();
            if (!rowId || rowId.toLowerCase() === "undefined" || rowId.toLowerCase() === "null") return c;
            return rowId === targetId
                ? ({ ...c, status, isActive: makeActive, isInactive: !makeActive })
                : c;
        }));

        try {
            await customersAPI.update(targetId, { status });
            toast.success(`Customer marked as ${statusLabel} successfully`);

            // Pull canonical state from backend to avoid any accidental UI bleed.
            await refreshData();
        } catch (error: any) {
            toast.error("Failed to update customer: " + (error.message || "Unknown error"));
            // Best-effort refresh to revert any mismatch
            await refreshData();
        }
    };

    if (!customer && loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-50">
                <div className="text-lg text-gray-600">Loading...</div>
            </div>
        );
    }

    if (!customer) {
        return null;
    }

    const contactPersonsList = Array.isArray(customer.contactPersons) ? customer.contactPersons : [];
    const primaryContactIndex = contactPersonsList.findIndex((p: any) => Boolean(p?.isPrimary));
    const primaryContact =
        primaryContactIndex >= 0
            ? contactPersonsList[primaryContactIndex]
            : contactPersonsList[0] || null;
    const resolvedPrimaryContactIndex =
        primaryContact
            ? (primaryContactIndex >= 0 ? primaryContactIndex : 0)
            : -1;
    const displayName = customer.displayName || customer.name || `${customer.firstName} ${customer.lastName}`.trim() || customer.companyName;
    const associatedTagLabels = (() => {
        const normalizeText = (value: any) => String(value ?? "").trim();
        const toLabel = (entry: any) => {
            if (!entry) return "";
            if (typeof entry === "string") return normalizeText(entry);
            if (typeof entry !== "object") return "";

            const name = normalizeText(entry.name || entry.tagName || entry.label || entry.title);
            const value = normalizeText(
                entry.value ??
                entry.option ??
                entry.selectedValue ??
                entry.selected ??
                entry.tagValue
            );

            if (name && value) return `${name} ${value}`;
            return name || value;
        };

        const reportingTags = Array.isArray((customer as any)?.reportingTags)
            ? (customer as any).reportingTags
            : [];
        const legacyTags = Array.isArray((customer as any)?.tags)
            ? (customer as any).tags
            : [];

        const labels = [...reportingTags, ...legacyTags]
            .map((entry: any) => toLabel(entry))
            .filter((label: string) => Boolean(label));

        return Array.from(new Set(labels));
    })();

    const customerSubscriptions = (() => {
        const fromCustomer = Array.isArray((customer as any)?.subscriptions)
            ? (customer as any).subscriptions
            : [];
        if (fromCustomer.length) return fromCustomer;
        try {
            const readList = (key: string) => {
                try {
                    const raw = localStorage.getItem(key);
                    const parsed = raw ? JSON.parse(raw) : [];
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };

            const merged = [
                ...readList("taban_subscriptions_v1"),
                ...readList("taban_subscriptions"),
                ...readList("subscriptions"),
            ];
            if (!merged.length) return [];

            const unique = new Map<string, any>();
            merged.forEach((row: any, idx: number) => {
                const key = String(row?.id || row?._id || row?.subscriptionId || row?.subscriptionNumber || `row-${idx}`);
                if (!unique.has(key)) unique.set(key, row);
            });
            const parsed = Array.from(unique.values());

            const normalizeText = (value: any) => String(value ?? "").trim();
            const normalizeKey = (value: any) => normalizeText(value).toLowerCase();
            const getFirstValue = (...values: any[]) => values.find((v) => normalizeText(v));

            const customerIds = new Set(
                [
                    id,
                    (customer as any)?._id,
                    (customer as any)?.id,
                    (customer as any)?.customerId,
                    (customer as any)?.customer_id,
                    (customer as any)?.contactId,
                    (customer as any)?.contact_id,
                    (customer as any)?.booksCustomerId,
                    (customer as any)?.zohoCustomerId,
                ]
                    .map((v) => normalizeText(v))
                    .filter(Boolean)
            );
            if (!customerIds.size) return [];

            const customerName = normalizeKey(
                getFirstValue((customer as any)?.name, (customer as any)?.displayName, (customer as any)?.companyName, "")
            );
            const customerEmail = normalizeKey(
                getFirstValue(
                    (customer as any)?.email,
                    (customer as any)?.contactEmail,
                    (customer as any)?.contactPersons?.find?.((p: any) => p?.isPrimary)?.email,
                    ""
                )
            );

            return parsed.filter((sub: any) => {
                const subCustomerId = normalizeText(
                    getFirstValue(
                        sub?.customerId,
                        sub?.customer_id,
                        sub?.contactId,
                        sub?.contact_id,
                        sub?.customer?._id,
                        sub?.customer?.id,
                        typeof sub?.customer === "string" ? sub.customer : "",
                        ""
                    )
                );
                if (subCustomerId && customerIds.has(subCustomerId)) return true;

                const subEmail = normalizeKey(
                    getFirstValue(
                        sub?.customerEmail,
                        sub?.email,
                        sub?.customer?.email,
                        sub?.contactPersons?.[0]?.email,
                        ""
                    )
                );
                if (customerEmail && subEmail && subEmail === customerEmail) return true;

                const subName = normalizeKey(getFirstValue(sub?.customerName, sub?.customer?.name, sub?.customer?.displayName, ""));
                if (customerName && subName && subName === customerName) return true;

                return false;
            });
        } catch {
            return [];
        }
    })();

    return (
        <div className="w-full h-[calc(100vh-72px)] flex bg-white overflow-hidden" style={{ margin: 0, padding: 0, maxWidth: "100%" }}>
            <CustomerDetailSidebar
                selectedCustomers={selectedCustomers}
                customers={customers}
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

            <div className="flex-1 min-w-0 flex flex-col overflow-y-auto min-h-0 custom-scrollbar" style={{ marginRight: 0, paddingRight: 0 }}>
                <CustomerDetailHeader
                    customer={customer}
                    id={id}
                    attachments={attachments}
                    navigate={navigate}
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
                    setAreRemindersStopped={setAreRemindersStopped}
                    handleAssociateTemplates={handleAssociateTemplates}
                    setPortalAccessContacts={setPortalAccessContacts}
                    setIsConfigurePortalModalOpen={setIsConfigurePortalModalOpen}
                    handleClone={handleClone}
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
