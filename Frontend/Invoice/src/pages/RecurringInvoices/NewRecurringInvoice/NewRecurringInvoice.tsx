import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Info,
  ShoppingBag,
  Upload,
  Image as ImageIcon,
  MoreVertical,
  Check,
  Trash2,
  Settings,
  RefreshCw,
  Pencil,
  Grid3x3,
  Zap,
  Link as LinkIcon,
  FileText,
  Cloud,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { saveRecurringInvoice, getRecurringInvoiceById, updateRecurringInvoice, getTaxesFromAPI, saveTax, deleteTax, getCustomersFromAPI, getItemsFromAPI, getSalespersonsFromAPI, getInvoiceById, generateInvoiceFromRecurring } from "../../salesModel";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { API_BASE_URL, getToken } from "../../../../services/auth";
import { projectsAPI, documentsAPI, salespersonsAPI } from "../../../../services/api";
import { usePaymentTermsDropdown, defaultPaymentTerms, PaymentTerm } from "../../../../hooks/usePaymentTermsDropdown";
import { useCurrency } from "../../../hooks/useCurrency";
import { buildTaxOptionGroups, taxLabel } from "../../../hooks/Taxdropdownstyle";
import SalespersonDropdown from "../../../components/SalespersonDropdown";
import { ConfigurePaymentTermsModal } from "../../../../components/ConfigurePaymentTermsModal";

// Initial state setup is handled in component

const normalizePaymentTerm = (term?: string) => {
  const normalized = String(term || "").trim().toLowerCase();
  switch (normalized) {
    case "":
    case "due_on_receipt":
    case "due on receipt":
      return "Due on Receipt";
    case "net_15":
    case "net 15":
      return "Net 15";
    case "net_30":
    case "net 30":
      return "Net 30";
    case "net_45":
    case "net 45":
      return "Net 45";
    case "net_60":
    case "net 60":
      return "Net 60";
    case "due_end_of_the_month":
    case "due end of the month":
      return "Due end of the month";
    case "due_end_of_next_month":
    case "due end of next month":
      return "Due end of next month";
    default:
      return term || "Due on Receipt";
  }
};

export default function NewRecurringInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { baseCurrencyCode } = useCurrency();
  const isEditMode = !!id;
  const clonedDataFromState = location.state?.clonedData || null;
  const invoiceIdFromQuery = React.useMemo(() => new URLSearchParams(location.search).get("invoiceId"), [location.search]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [enabledSettings, setEnabledSettings] = useState<any>(null);
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";
  const showShippingCharges = enabledSettings?.chargeSettings?.shippingCharges !== false;
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "inclusive";
  // Types
  type Customer = {
    id?: string;
    _id?: string;
    name?: string;
    displayName?: string;
    email?: string;
    companyName?: string;
    workPhone?: string;
    mobile?: string;
  };

  type Salesperson = { id?: string; name?: string; email?: string };
  type Project = {
    id?: string;
    _id?: string;
    projectName?: string;
    name?: string;
    status?: string;
    customer?: any;
    customerId?: string;
    billingMethod?: string;
    invoiceMethod?: string;
    description?: string;
  };

  type Item = {
    id?: string | number;
    name?: string;
    sku?: string;
    sellingPrice?: number;
    costPrice?: number;
    rate?: number;
    stockQuantity?: number;
    stockOnHand?: number;
    quantity?: number;
    unit?: string;
  };

  type TaxOption = {
    id: string;
    name: string;
    rate: number;
    isCompound?: boolean;
    raw?: any;
  };

  type DocumentItem = {
    id: number | string;
    name: string;
    size?: number | string;
    file?: File | null;
    isCloud?: boolean;
    provider?: string;
    uploadedBy?: string;
    uploadedOn?: string;
    type?: string;
    documentId?: string | number;
    modified?: string;
    folder?: string;
    module?: string;
  };

  type FormItem = {
    id: number;
    itemId?: string | number | null;
    itemDetails?: string;
    itemSku?: string;
    quantity: number;
    rate: number;
    tax?: string;
    amount: number;
    itemType?: string;
    stockOnHand?: number;
  };

  type FormDataType = {
    customerName: string;
    profileName: string;
    orderNumber: string;
    repeatEvery: string;
    startOn: string;
    endsOn: string;
    neverExpires: boolean;
    paymentTerms: string;
    accountsReceivable: string;
    salesperson: string;
    salespersonId: string;
    projectIds: string[];
    taxExclusive: string;
    items: FormItem[];
    subTotal: number;
    discount: number | string;
    discountType: string;
    discountAccount: string;
    shippingCharges: number | string;
    adjustment: number | string;
    roundOff: number;
    total: number;
    currency: string;
    customerNotes: string;
    termsAndConditions: string;
    documents: DocumentItem[];
    attachedFiles?: any[];
    subject?: string;
  };

  const [formData, setFormData] = useState<FormDataType>({
    customerName: "",
    profileName: "",
    orderNumber: "",
    repeatEvery: "weekly",
    startOn: new Date().toISOString().split('T')[0],
    endsOn: "",
    neverExpires: true,
    paymentTerms: "Due on Receipt",
    accountsReceivable: "Accounts Receivable",
    salesperson: "",
    salespersonId: "",
    projectIds: [],
    taxExclusive: "Tax Exclusive",
    items: [
      { id: 1, itemDetails: "", itemSku: "", quantity: 1, rate: 0, tax: "", amount: 0 }
    ],
    subTotal: 0,
    discount: 0,
    discountType: "percent",
    discountAccount: "General Income",
    shippingCharges: 0,
    adjustment: 0,
    roundOff: 0,
    total: 0,
    currency: String(baseCurrencyCode || "USD").split(" - ")[0].trim().toUpperCase(),
    customerNotes: "Thank you for the payment. You just made our day.",
    termsAndConditions: "",
    documents: []
  });
  const hasAppliedCloneRef = useRef(false);
  const hasAppliedInvoicePrefillRef = useRef(false);

  useEffect(() => {
    hasAppliedInvoicePrefillRef.current = false;
  }, [invoiceIdFromQuery]);

  useEffect(() => {
    const nextBaseCurrency = String(baseCurrencyCode || "USD").split(" - ")[0].trim().toUpperCase();
    if (!nextBaseCurrency) return;
    if (isEditMode || clonedDataFromState || invoiceIdFromQuery) return;

    setFormData(prev => {
      const currentCurrency = String(prev.currency || "").trim().toUpperCase();
      if (currentCurrency === nextBaseCurrency) return prev;
      return { ...prev, currency: nextBaseCurrency };
    });
  }, [baseCurrencyCode, isEditMode, clonedDataFromState, invoiceIdFromQuery]);

  useEffect(() => {
    if (isEditMode || !clonedDataFromState || hasAppliedCloneRef.current) return;
    hasAppliedCloneRef.current = true;

    const cloned = clonedDataFromState as any;
    const toInputDate = (value: any, fallback: string) => {
      if (!value) return fallback;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return fallback;
      return d.toISOString().split("T")[0];
    };

    const mappedItems = Array.isArray(cloned.items) && cloned.items.length > 0
      ? cloned.items.map((item: any, index: number) => ({
        id: index + 1,
        itemId: item.itemId || item.id || item._id || null,
        itemDetails: item.itemDetails || item.name || item.description || "",
        itemSku: item.itemSku || item.sku || "",
        quantity: Number(item.quantity ?? 1) || 1,
        rate: Number(item.rate ?? item.price ?? 0) || 0,
        tax: String(item.tax || item.taxId || ""),
        amount: Number(item.amount ?? 0) || 0,
        itemType: item.itemType || "item",
        stockOnHand: Number(item.stockOnHand ?? item.stockQuantity ?? 0) || 0
      }))
      : undefined;

    setFormData(prev => ({
      ...prev,
      customerName: cloned.customerName || cloned.customer?.displayName || cloned.customer?.name || prev.customerName,
      profileName: cloned.profileName ? `${cloned.profileName} (Copy)` : prev.profileName,
      orderNumber: cloned.orderNumber || prev.orderNumber,
      repeatEvery: cloned.repeatEvery || cloned.frequency || prev.repeatEvery,
      startOn: toInputDate(cloned.startOn || cloned.startDate, prev.startOn),
      endsOn: toInputDate(cloned.endsOn || cloned.endDate, prev.endsOn),
      neverExpires: typeof cloned.neverExpires === "boolean" ? cloned.neverExpires : !cloned.endDate,
      paymentTerms: cloned.paymentTerms || prev.paymentTerms,
      accountsReceivable: cloned.accountsReceivable || prev.accountsReceivable,
      salesperson: cloned.salesperson || prev.salesperson,
      salespersonId: cloned.salespersonId || cloned.salesperson?._id || cloned.salesperson?.id || prev.salespersonId,
      projectIds: Array.isArray(cloned.projectIds)
        ? cloned.projectIds.map((projectId: any) => resolveEntityId(projectId)).filter(Boolean)
        : prev.projectIds,
      taxExclusive: cloned.taxExclusive || prev.taxExclusive,
      items: mappedItems || prev.items,
      discount: Number(cloned.discount ?? prev.discount) || 0,
      discountType: cloned.discountType || prev.discountType,
      discountAccount: cloned.discountAccount || prev.discountAccount,
      shippingCharges: Number(cloned.shippingCharges ?? prev.shippingCharges) || 0,
      adjustment: Number(cloned.adjustment ?? prev.adjustment) || 0,
      roundOff: Number(cloned.roundOff ?? prev.roundOff) || 0,
      currency: cloned.currency || prev.currency,
      customerNotes: cloned.customerNotes || cloned.notes || prev.customerNotes,
      termsAndConditions: cloned.termsAndConditions || cloned.terms || prev.termsAndConditions,
      documents: []
    }));
  }, [clonedDataFromState, isEditMode]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen] = useState(false);
  const [customerQuickActionBaseIds, setCustomerQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingCustomersQuickAction, setIsRefreshingCustomersQuickAction] = useState(false);
  const [isAutoSelectingCustomerFromQuickAction, setIsAutoSelectingCustomerFromQuickAction] = useState(false);
  const [customerQuickActionFrameKey, setCustomerQuickActionFrameKey] = useState(0);
  const [isReloadingCustomerFrame, setIsReloadingCustomerFrame] = useState(false);

  // Customer search modal state
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState<boolean>(false);
  const [customerSearchCriteria, setCustomerSearchCriteria] = useState<string>("Display Name");
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>("");
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchPage, setCustomerSearchPage] = useState<number>(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState<boolean>(false);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState<boolean>(false);
  const [salespersonSearch, setSalespersonSearch] = useState<string>("");
  const [selectedSalesperson, setSelectedSalesperson] = useState<Salesperson | null>(null);
  const [isNewSalespersonQuickActionOpen, setIsNewSalespersonQuickActionOpen] = useState(false);
  const [salespersonQuickActionBaseIds, setSalespersonQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingSalespersonsQuickAction, setIsRefreshingSalespersonsQuickAction] = useState(false);
  const [isAutoSelectingSalespersonFromQuickAction, setIsAutoSelectingSalespersonFromQuickAction] = useState(false);
  const [salespersonQuickActionFrameKey, setSalespersonQuickActionFrameKey] = useState(0);
  const [isReloadingSalespersonFrame, setIsReloadingSalespersonFrame] = useState(false);
  const [newSalespersonData, setNewSalespersonData] = useState({ name: "", email: "" });
  const [isSavingNewSalesperson, setIsSavingNewSalesperson] = useState(false);
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState<boolean>(false);
  const [manageSalespersonSearch, setManageSalespersonSearch] = useState<string>("");
  const [openItemDropdowns, setOpenItemDropdowns] = useState<Record<string, boolean>>({});
  const [itemSearches, setItemSearches] = useState<Record<string, string>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, string | number>>({});
  const itemDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<string, boolean>>({});
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const taxDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState<boolean>(false);
  const [newTaxData, setNewTaxData] = useState<{ name: string; rate: string; isCompound: boolean }>({
    name: "",
    rate: "",
    isCompound: false
  });
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState<boolean>(false);
  const [bulkAddSearch, setBulkAddSearch] = useState<string>("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState<Item[]>([]);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState<boolean>(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState<boolean>(false);
  const [startDateCalendar, setStartDateCalendar] = useState<Date>(new Date());
  const [endDateCalendar, setEndDateCalendar] = useState<Date>(new Date());
  const [isRepeatEveryDropdownOpen, setIsRepeatEveryDropdownOpen] = useState<boolean>(false);
  const [repeatEverySearch, setRepeatEverySearch] = useState<string>("");
  const repeatEveryDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isTaxExclusiveDropdownOpen, setIsTaxExclusiveDropdownOpen] = useState<boolean>(false);
  const [taxExclusiveSearch, setTaxExclusiveSearch] = useState<string>("");
  const [isDiscountAccountDropdownOpen, setIsDiscountAccountDropdownOpen] = useState<boolean>(false);
  const [discountAccountSearch, setDiscountAccountSearch] = useState<string>("");
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement | null>(null);
  const startDatePickerRef = useRef<HTMLDivElement | null>(null);
  const endDatePickerRef = useRef<HTMLDivElement | null>(null);
  const taxExclusiveDropdownRef = useRef<HTMLDivElement | null>(null);
  const discountAccountDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDropdownRef = useRef<HTMLDivElement | null>(null);

  // New States for Upload/Documents Modal
  // New States for Upload/Documents Modal
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState<boolean>(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState<boolean>(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState<boolean>(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<string>("zoho");
  const [documentSearch, setDocumentSearch] = useState<string>("");
  const [availableDocuments, setAvailableDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Array<string | number>>([]);
  const [selectedInbox, setSelectedInbox] = useState<string>("files");
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<string>("files");
  const [cloudSearchQuery, setCloudSearchQuery] = useState<string>("");
  const [selectedCloudFiles, setSelectedCloudFiles] = useState<DocumentItem[]>([]);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState<boolean>(false);

  // States for New Design Item Table
  const [openItemMenuId, setOpenItemMenuId] = useState<number | null>(null);
  const [showAdditionalInformation, setShowAdditionalInformation] = useState<boolean>(false);
  const itemMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bulkActionsRef = useRef<HTMLDivElement | null>(null);

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [customerProjects, setCustomerProjects] = useState<Project[]>([]);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [pendingProjectIds, setPendingProjectIds] = useState<string[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>(defaultPaymentTerms);
  const [isConfigureTermsOpen, setIsConfigureTermsOpen] = useState(false);
  const {
    selectedTerm: selectedPaymentTerm,
    isOpen: isPaymentTermsDropdownOpen,
    searchQuery: paymentTermsSearchQuery,
    filteredTerms: filteredPaymentTerms,
    dropdownRef: paymentTermsDropdownRef,
    setSearchQuery: setPaymentTermsSearchQuery,
    handleSelect: handlePaymentTermSelect,
    handleToggle: togglePaymentTermsDropdown
  } = usePaymentTermsDropdown({
    initialValue: normalizePaymentTerm(formData.paymentTerms),
    terms: paymentTerms,
    onSelect: (term) => {
      setFormData(prev => ({
        ...prev,
        paymentTerms: term.value
      }));
    }
  });

  const getTaxIdentifier = (tax: any): string => {
    return String(
      tax?.id ||
      tax?._id ||
      tax?.taxId ||
      tax?.tax_id ||
      tax?.name ||
      tax?.taxName ||
      ""
    ).trim();
  };

  const getCustomerTaxCandidate = (customer: any): string => {
    return String(
      customer?.taxRate ||
      customer?.taxId ||
      customer?.defaultTaxId ||
      customer?.tax ||
      customer?.taxInfo?.taxId ||
      customer?.taxInfo?.taxName ||
      ""
    ).trim();
  };

  const getCustomerDisplayLabel = (customer: any): string => {
    if (!customer) return "";
    return String(
      customer.displayName ||
      customer.companyName ||
      customer.name ||
      `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
    ).trim();
  };

  const resolveCustomerNameForForm = (data: any, customerId: string): string => {
    const normalizedCustomerId = String(customerId || "").trim();
    const matchedCustomer = normalizedCustomerId
      ? customers.find((customer) => String(customer.id || customer._id || "") === normalizedCustomerId)
      : null;

    const matchedCustomerName = getCustomerDisplayLabel(matchedCustomer);
    if (matchedCustomerName) {
      return matchedCustomerName;
    }

    const directCandidates = [
      data?.customerDisplayName,
      data?.customerName,
      data?.customer?.displayName,
      data?.customer?.companyName,
      data?.customer?.name
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const directName = directCandidates.find((value) => value !== normalizedCustomerId) || "";
    if (directName) {
      return directName;
    }

    if (typeof data?.customer === "object") {
      return getCustomerDisplayLabel(data.customer);
    }

    return "";
  };

  const getItemTaxCandidate = (item: any): string => {
    return String(
      item?.taxId ||
      item?.salesTaxId ||
      item?.tax ||
      item?.salesTax ||
      item?.taxInfo?.taxId ||
      item?.taxInfo?.taxName ||
      item?.taxRate ||
      item?.salesTaxRate ||
      ""
    ).trim();
  };

  const defaultTaxId = React.useMemo(() => {
    const activeTaxes = (taxOptions || []).filter((tax) => {
      if (!tax) return false;
      const status = String((tax as any)?.status || "").toLowerCase();
      if (status === "inactive") return false;
      if ((tax as any)?.active === false || (tax as any)?.isActive === false) return false;
      return Boolean(getTaxIdentifier(tax));
    });

    const preferred =
      activeTaxes.find((tax: any) => tax?.isDefault || tax?.default) ||
      activeTaxes[0] ||
      taxOptions[0] ||
      null;

    return preferred ? getTaxIdentifier(preferred) : "";
  }, [taxOptions]);

  const resolvePreferredTaxId = (customer: any, item: any = null): string => {
    const customerCandidate = getCustomerTaxCandidate(customer);
    const customerTax = customerCandidate ? findTaxOptionById(customerCandidate) : null;
    if (customerTax) {
      return getTaxIdentifier(customerTax);
    }

    const itemCandidate = getItemTaxCandidate(item);
    const itemTax = itemCandidate ? findTaxOptionById(itemCandidate) : null;
    if (itemTax) {
      return getTaxIdentifier(itemTax);
    }

    return defaultTaxId || "";
  };

  const handleCustomerSearch = () => {
    const searchTerm = customerSearchTerm.toLowerCase();
    let results: Customer[] = [];

    if (customerSearchCriteria === "Display Name") {
      results = customers.filter(customer => {
        const displayName = customer.name || "";
        return displayName.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Email") {
      results = customers.filter(customer => {
        const email = customer.email || "";
        return email.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Company Name") {
      results = customers.filter(customer => {
        const companyName = customer.companyName || "";
        return companyName.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Phone") {
      results = customers.filter(customer => {
        const phone = customer.workPhone || customer.mobile || "";
        return phone.includes(searchTerm);
      });
    }

    setCustomerSearchResults(results);
    setCustomerSearchPage(1);
  };

  // Pagination calculations
  const customerResultsPerPage = 10;
  const customerStartIndex = (customerSearchPage - 1) * customerResultsPerPage;
  const customerEndIndex = customerStartIndex + customerResultsPerPage;
  const customerPaginatedResults = customerSearchResults.slice(customerStartIndex, customerEndIndex);
  const customerTotalPages = Math.ceil(customerSearchResults.length / customerResultsPerPage);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersResponse, loadedItems, loadedSalespersons, loadedTaxes] = await Promise.all([
          getCustomersFromAPI(),
          getItemsFromAPI(),
          getSalespersonsFromAPI(),
          getTaxesFromAPI()
        ]);
        const loadedCustomers = (customersResponse?.data || []).map((c: any) => normalizeCustomer(c));
        setCustomers(loadedCustomers);

        const transformedItems = (loadedItems || []).map(item => ({
          id: item._id || item.id,
          name: item.name || "",
          sku: item.sku || "",
          rate: item.sellingPrice || item.costPrice || item.rate || 0,
          stockOnHand: item.stockQuantity || item.stockOnHand || item.quantityOnHand || 0,
          unit: item.unit || item.unitOfMeasure || "pcs",
          tax: item.taxId || item.salesTaxId || item.tax || item.salesTax || item.taxInfo?.taxId || item.taxInfo?.taxName || item.taxRate || item.salesTaxRate || "",
          taxId: item.taxId || item.salesTaxId || item.taxInfo?.taxId || "",
          taxRate: item.taxRate || item.salesTaxRate || item.taxInfo?.taxRate || 0,
          taxInfo: item.taxInfo || undefined
        }));
        setItems(transformedItems);

        setSalespersons((loadedSalespersons || []).map((s: any) => normalizeSalesperson(s)));

        if (loadedTaxes && loadedTaxes.length > 0) {
          const formattedTaxes = loadedTaxes.map((tax: any) => ({
            id: tax.id || tax._id,
            name: tax.name,
            rate: tax.rate,
            isCompound: tax.isCompound || false,
            raw: tax
          }));
          setTaxOptions(formattedTaxes);
        }

        try {
          const token = getToken();
          if (!token) {
            // Optional block; avoid unauthorized call when not logged in.
            return;
          }
          const generalResponse = await fetch(`${API_BASE_URL}/settings/general`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (generalResponse.ok) {
            const generalJson = await generalResponse.json();
            const settings = generalJson?.data?.settings;
            if (settings) setEnabledSettings(settings);
          }
        } catch (generalError) {
          console.error("Error loading general settings:", generalError);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isDocumentsModalOpen) {
      setAvailableDocuments(getAllDocuments());
    }
  }, [isDocumentsModalOpen]);

  // selectedPaymentTerm stays in sync via usePaymentTermsDropdown(initialValue)

  const resolveEntityId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    const raw = value._id || value.id || value.projectId || value.customerId || value.customer;
    if (!raw) return "";
    if (typeof raw === "object") {
      return String(raw._id || raw.id || "");
    }
    return String(raw);
  };

  const getProjectLabel = (project: any): string => {
    return String(project?.name || project?.projectName || project?.title || "").trim();
  };

  const getProjectCustomerId = (project: any): string => {
    const customer = project?.customer;
    if (customer && typeof customer === "object") {
      return resolveEntityId(customer);
    }
    return resolveEntityId(project?.customerId || project?.customer || project?.customer_id);
  };

  const normalizeProjectIds = (value: any): string[] => {
    if (!Array.isArray(value)) return [];
    return Array.from(
      new Set(
        value
          .map((entry) => resolveEntityId(entry))
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      )
    );
  };

  const extractProjectIdsFromRecord = (record: any): string[] => {
    const fromProjectIds = normalizeProjectIds(record?.projectIds);
    const fromAssociatedProjects = normalizeProjectIds(record?.associatedProjects);
    const fromProjects = normalizeProjectIds(record?.projects);
    return Array.from(new Set([...fromProjectIds, ...fromAssociatedProjects, ...fromProjects]));
  };

  const loadProjectsForCustomer = React.useCallback(async (customerIdRaw: string) => {
    const customerId = String(customerIdRaw || "").trim();
    if (!customerId) {
      setCustomerProjects([]);
      setFormData(prev => (prev.projectIds.length > 0 ? { ...prev, projectIds: [] } : prev));
      return;
    }

    setIsProjectsLoading(true);
    try {
      const toArray = (response: any): any[] => {
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      };

      const normalize = (project: any): Project => ({
        ...project,
        id: resolveEntityId(project),
        _id: resolveEntityId(project),
        name: getProjectLabel(project),
        status: String(project?.status || "").toLowerCase()
      });

      let projectRecords: any[] = [];
      try {
        projectRecords = toArray(await projectsAPI.getByCustomer(customerId));
      } catch (err) {
        console.warn("Error fetching projects by customer, falling back to all projects:", err);
      }

      if (projectRecords.length === 0) {
        try {
          const allProjects = toArray(await projectsAPI.getAll());
          projectRecords = allProjects.filter((project) => {
            const projectCustomerId = getProjectCustomerId(project);
            return projectCustomerId && projectCustomerId === customerId;
          });
        } catch (fallbackErr) {
          console.error("Error fetching all projects during fallback:", fallbackErr);
        }
      }

      const statusPriority: Record<string, number> = {
        active: 0,
        planning: 1,
        on_hold: 2,
        completed: 3,
        cancelled: 4
      };

      const sortedProjects = projectRecords
        .map(normalize)
        .sort((a, b) => {
          const aStatus = String(a?.status || "").toLowerCase();
          const bStatus = String(b?.status || "").toLowerCase();
          const aPriority = statusPriority[aStatus] ?? 99;
          const bPriority = statusPriority[bStatus] ?? 99;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return String(getProjectLabel(a)).localeCompare(String(getProjectLabel(b)));
        });

      setCustomerProjects(sortedProjects);

      setFormData(prev => {
        if (!Array.isArray(prev.projectIds) || prev.projectIds.length === 0) return prev;
        const allowed = new Set(sortedProjects.map((project) => resolveEntityId(project)).filter(Boolean));
        const nextProjectIds = prev.projectIds.filter((projectId) => allowed.has(String(projectId)));
        if (nextProjectIds.length === prev.projectIds.length) return prev;
        return { ...prev, projectIds: nextProjectIds };
      });
    } catch (error) {
      console.error("Error loading projects for selected customer:", error);
      setCustomerProjects([]);
      setFormData(prev => (prev.projectIds.length > 0 ? { ...prev, projectIds: [] } : prev));
    } finally {
      setIsProjectsLoading(false);
    }
  }, []);

  const repeatEveryOptions = ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"];

  const formatFrequencyOption = (frequency: string) => {
    const frequencyMap: Record<string, string> = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'biweekly': 'Bi-weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'yearly': 'Yearly'
    };
    return frequencyMap[frequency] || frequency;
  };
  const taxExclusiveOptions =
    taxMode === "inclusive"
      ? ["Tax Inclusive"]
      : taxMode === "exclusive"
        ? ["Tax Exclusive"]
        : ["Tax Exclusive", "Tax Inclusive"];

  const recalculateItemsForTaxMode = (items: FormItem[], mode: string) => {
    return items.map((item) => {
      if (item.itemType === "header") return item;
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const baseAmount = quantity * rate;
      const taxOption = findTaxOptionById(item.tax);
      const taxRate = taxOption ? Number((taxOption as any).rate || 0) : 0;
      const amount = mode === "Tax Inclusive" || taxRate <= 0
        ? baseAmount
        : baseAmount + (baseAmount * taxRate / 100);
      return { ...item, amount: Number(amount.toFixed(2)) };
    });
  };

  useEffect(() => {
    setFormData(prev => {
      let changed = false;
      const next = { ...prev };
      if (!showTransactionDiscount) {
        if (Number(next.discount || 0) !== 0 || next.discountType !== "percent") {
          next.discount = 0;
          next.discountType = "percent";
          changed = true;
        }
      }
      if (!showShippingCharges) {
        if (Number(next.shippingCharges || 0) !== 0) {
          next.shippingCharges = 0;
          changed = true;
        }
      }
      if (!showAdjustment) {
        if (Number(next.adjustment || 0) !== 0) {
          next.adjustment = 0;
          changed = true;
        }
      }
      if (taxExclusiveOptions.length === 1 && next.taxExclusive !== taxExclusiveOptions[0]) {
        next.taxExclusive = taxExclusiveOptions[0];
        next.items = recalculateItemsForTaxMode(next.items, next.taxExclusive);
        changed = true;
      }
      return changed ? calculateTotals(next) : prev;
    });
  }, [showTransactionDiscount, showShippingCharges, showAdjustment, taxExclusiveOptions]);

  const discountAccountCategories = {
    "Income": [
      "Discount",
      "General Income",
      "Interest Income",
      "Late Fee Income",
      "Other Charges",
      "Sales"
    ]
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatDate = (date?: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date as string | Date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDaysInMonth = (date: Date) => {
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

  const handleDateSelect = (date: Date, type: 'startOn' | 'endsOn') => {
    const formatted = formatDate(date);
    setFormData(prev => ({
      ...prev,
      [type]: formatted
    }));
    if (type === 'startOn') {
      setIsStartDatePickerOpen(false);
      setStartDateCalendar(date);
    } else if (type === 'endsOn') {
      setIsEndDatePickerOpen(false);
      setEndDateCalendar(date);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next', type: 'startOn' | 'endsOn') => {
    const calendar = type === 'startOn' ? startDateCalendar : endDateCalendar;
    const setCalendar = type === 'startOn' ? setStartDateCalendar : setEndDateCalendar;
    const newDate = new Date(calendar);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendar(newDate);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (target && salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(target)) {
        setIsSalespersonDropdownOpen(false);
      }
      if (target && startDatePickerRef.current && !startDatePickerRef.current.contains(target)) {
        setIsStartDatePickerOpen(false);
      }
      if (target && endDatePickerRef.current && !endDatePickerRef.current.contains(target)) {
        setIsEndDatePickerOpen(false);
      }
      if (target && repeatEveryDropdownRef.current && !repeatEveryDropdownRef.current.contains(target)) {
        setIsRepeatEveryDropdownOpen(false);
      }
      if (target && taxExclusiveDropdownRef.current && !taxExclusiveDropdownRef.current.contains(target)) {
        setIsTaxExclusiveDropdownOpen(false);
      }
      if (target && discountAccountDropdownRef.current && !discountAccountDropdownRef.current.contains(target)) {
        setIsDiscountAccountDropdownOpen(false);
      }

      // Handle item dropdowns
      Object.keys(openItemDropdowns).forEach(itemId => {
        if (openItemDropdowns[itemId]) {
          const ref = itemDropdownRefs.current[itemId];
          if (ref && target && !ref.contains(target)) {
            setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });

      // Handle tax dropdowns
      Object.keys(openTaxDropdowns).forEach(itemId => {
        if (openTaxDropdowns[itemId]) {
          const ref = taxDropdownRefs.current[itemId];
          if (ref && target && !ref.contains(target)) {
            setOpenTaxDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });
    };

    const hasOpenDropdown = isCustomerDropdownOpen || isSalespersonDropdownOpen ||
      isStartDatePickerOpen || isEndDatePickerOpen || isTaxExclusiveDropdownOpen || isDiscountAccountDropdownOpen || isRepeatEveryDropdownOpen || isPaymentTermsDropdownOpen ||
      Object.values(openItemDropdowns).some(Boolean) || Object.values(openTaxDropdowns).some(Boolean);

    if (hasOpenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerDropdownOpen, isSalespersonDropdownOpen, isStartDatePickerOpen, isEndDatePickerOpen, isTaxExclusiveDropdownOpen, isDiscountAccountDropdownOpen, isRepeatEveryDropdownOpen, isPaymentTermsDropdownOpen, openItemDropdowns, openTaxDropdowns]);

  // Load taxes from localStorage on component mount
  // Taxes logic moved to main loadData effect

  // Load recurring invoice data when in edit mode
  useEffect(() => {
    const loadInvoiceData = async () => {
      if (isEditMode && id) {
        try {
          const recurringInvoiceData: any = await getRecurringInvoiceById(id);
          if (!recurringInvoiceData) {
            console.error("Recurring invoice not found with id:", id);
            // Navigate back to list if not found
            navigate("/sales/recurring-invoices");
            return;
          }
          const toInputDate = (value: any, fallback = "") => {
            if (!value) return fallback;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return fallback;
            return parsed.toISOString().split("T")[0];
          };

          const getSalespersonName = (data: any) => {
            if (!data?.salesperson) return "";
            if (typeof data.salesperson === "string") return data.salesperson;
            return data.salesperson.name || "";
          };

          const startDateSource =
            recurringInvoiceData.startOn ||
            recurringInvoiceData.startDate ||
            recurringInvoiceData.start_date ||
            recurringInvoiceData.createdAt;
          const endDateSource =
            recurringInvoiceData.endsOn ||
            recurringInvoiceData.endDate ||
            recurringInvoiceData.end_date;

          const formattedStartOn = toInputDate(startDateSource, new Date().toISOString().split("T")[0]);
          const formattedEndsOn = toInputDate(endDateSource, "");
          const parsedStartDate = new Date(formattedStartOn);
          const parsedEndDate = formattedEndsOn ? new Date(formattedEndsOn) : null;
          if (!Number.isNaN(parsedStartDate.getTime())) {
            setStartDateCalendar(parsedStartDate);
          }
          if (parsedEndDate && !Number.isNaN(parsedEndDate.getTime())) {
            setEndDateCalendar(parsedEndDate);
          }

          const mappedItems = recurringInvoiceData.items && recurringInvoiceData.items.length > 0
            ? recurringInvoiceData.items.map((it: any, index: number) => {
              const rawItem = it.item || it.itemId;
              const itemId = typeof rawItem === "object" ? (rawItem?._id || rawItem?.id) : rawItem;
              const databaseItem = items.find(i => String(i.id) === String(itemId));
              const quantity = Number(it.quantity ?? 1) || 1;
              const rate = Number(it.rate ?? it.unitPrice ?? it.price ?? databaseItem?.rate ?? 0) || 0;
              const baseAmount = quantity * rate;
              const rawTaxCandidates = [
                typeof it.tax === "object" ? (it.tax?._id || it.tax?.id || it.tax?.name || it.tax?.rate) : it.tax,
                it.taxId,
                it.taxName,
                it.taxLabel,
                it.taxRate,
                it.salesTaxRate
              ]
                .map((value: any) => String(value ?? "").trim())
                .filter(Boolean);
              const resolvedTaxOption = rawTaxCandidates
                .map((candidate: string) => findTaxOptionById(candidate))
                .find(Boolean);
              const tax = resolvedTaxOption
                ? String((resolvedTaxOption as any).id || (resolvedTaxOption as any)._id || "")
                : (rawTaxCandidates[0] || "");

              return {
                id: it.id || index + 1,
                itemId: itemId || null,
                itemDetails:
                  it.itemDetails ||
                  it.name ||
                  it.description ||
                  (typeof rawItem === "object" ? (rawItem?.name || rawItem?.itemName || "") : "") ||
                  databaseItem?.name ||
                  "",
                quantity,
                rate,
                stockOnHand: Number(databaseItem?.stockOnHand ?? it.stockOnHand ?? 0) || 0,
                tax,
                amount: Number(it.amount ?? it.total ?? baseAmount) || baseAmount
              };
            })
            : [{ id: 1, itemDetails: "", itemSku: "", quantity: 1, rate: 0, tax: "", amount: 0 }];

          const customerId = String(
            recurringInvoiceData.customerId ||
            recurringInvoiceData.customer?._id ||
            recurringInvoiceData.customer?.id ||
            (typeof recurringInvoiceData.customer === "string" ? recurringInvoiceData.customer : "") ||
            ""
          );
          const customerName = resolveCustomerNameForForm(recurringInvoiceData, customerId);
          const salespersonName = getSalespersonName(recurringInvoiceData);
          const salespersonId = String(
            recurringInvoiceData.salespersonId ||
            recurringInvoiceData.salesperson?._id ||
            recurringInvoiceData.salesperson?.id ||
            ""
          );
          const existingProjectIds = extractProjectIdsFromRecord(recurringInvoiceData);

          setFormData(prev => calculateTotals({
            ...prev,
            customerName,
            profileName: recurringInvoiceData.profileName || "",
            orderNumber: recurringInvoiceData.orderNumber || recurringInvoiceData.poNumber || "",
            repeatEvery: recurringInvoiceData.repeatEvery || recurringInvoiceData.frequency || "weekly",
            startOn: formattedStartOn,
            endsOn: formattedEndsOn,
            neverExpires: recurringInvoiceData.neverExpires !== undefined
              ? Boolean(recurringInvoiceData.neverExpires)
              : !Boolean(endDateSource),
            paymentTerms: recurringInvoiceData.paymentTerms || "Due on Receipt",
            accountsReceivable: recurringInvoiceData.accountsReceivable || "Accounts Receivable",
            salesperson: salespersonName,
            salespersonId: salespersonId || "",
            projectIds: existingProjectIds,
            taxExclusive: recurringInvoiceData.taxExclusive || recurringInvoiceData.taxPreference || "Tax Exclusive",
            items: mappedItems,
            customerNotes: recurringInvoiceData.customerNotes || recurringInvoiceData.notes || "",
            termsAndConditions: recurringInvoiceData.termsAndConditions || recurringInvoiceData.terms || "",
            subTotal: Number(recurringInvoiceData.subTotal ?? recurringInvoiceData.subtotal ?? 0) || 0,
            discount: Number(recurringInvoiceData.discount ?? 0) || 0,
            discountType: recurringInvoiceData.discountType || "percent",
            discountAccount: recurringInvoiceData.discountAccount || "",
            shippingCharges: Number(
              recurringInvoiceData.shippingCharges ??
              recurringInvoiceData.shippingCharge ??
              recurringInvoiceData.shipping ??
              0
            ) || 0,
            adjustment: Number(recurringInvoiceData.adjustment ?? recurringInvoiceData.adjustments ?? 0) || 0,
            roundOff: Number(recurringInvoiceData.roundOff ?? 0) || 0,
            total: Number(recurringInvoiceData.total ?? recurringInvoiceData.amount ?? 0) || 0,
            currency: recurringInvoiceData.currency || "USD",
            documents: recurringInvoiceData.documents || [],
            attachedFiles: recurringInvoiceData.attachedFiles || []
          }));

          if (customerName || customerId) {
            const customer = customers.find(c =>
              String(c.id || c._id || "") === customerId ||
              String(c.name || "").toLowerCase() === String(customerName || "").toLowerCase()
            );
            const resolvedCustomer =
              customer || {
                id: customerId || "",
                name: customerName || customerId || ""
              };
            setSelectedCustomer(resolvedCustomer);
            const resolvedCustomerId = resolveEntityId(resolvedCustomer);
            if (resolvedCustomerId) {
              await loadProjectsForCustomer(resolvedCustomerId);
            }
          }

          if (salespersonName) {
            const salesperson = salespersons.find(s =>
              String(s.name || "").toLowerCase() === String(salespersonName).toLowerCase() ||
              String(s.id || "").toLowerCase() === String(salespersonId).toLowerCase()
            );
            setSelectedSalesperson(
              salesperson || {
                id: salespersonId || "",
                name: salespersonName
              }
            );
          }
        } catch (error) {
          console.error("Error loading recurring invoice:", error);
          // Navigate back to list on error
          navigate("/sales/recurring-invoices");
        }
      } else if (!clonedDataFromState && invoiceIdFromQuery && !hasAppliedInvoicePrefillRef.current) {
        try {
          const invoiceData: any = await getInvoiceById(invoiceIdFromQuery);
          if (!invoiceData) return;

          hasAppliedInvoicePrefillRef.current = true;

          const toInputDate = (value: any, fallback: string) => {
            if (!value) return fallback;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return fallback;
            return parsed.toISOString().split("T")[0];
          };

          const getSalespersonName = (invoice: any) => {
            if (!invoice?.salesperson) return "";
            if (typeof invoice.salesperson === "string") return invoice.salesperson;
            return invoice.salesperson.name || "";
          };

          const mappedItems = Array.isArray(invoiceData.items) && invoiceData.items.length > 0
            ? invoiceData.items.map((it: any, index: number) => {
              const rawItem = it.item || it.itemId;
              const itemId = typeof rawItem === "object" ? (rawItem?._id || rawItem?.id) : rawItem;
              const matchingDbItem = items.find((i) => String(i.id) === String(itemId));
              const quantity = Number(it.quantity ?? 1) || 1;
              const rate = Number(it.rate ?? it.unitPrice ?? it.price ?? matchingDbItem?.rate ?? 0) || 0;
              const baseAmount = quantity * rate;
              const rawTaxCandidates = [
                typeof it.tax === "object" ? (it.tax?._id || it.tax?.id || it.tax?.name || it.tax?.rate) : it.tax,
                it.taxId,
                it.taxName,
                it.taxLabel,
                it.taxRate,
                it.salesTaxRate
              ]
                .map((value) => String(value ?? "").trim())
                .filter(Boolean);
              const resolvedTaxOption = rawTaxCandidates
                .map((candidate) => findTaxOptionById(candidate))
                .find(Boolean);
              const tax = resolvedTaxOption
                ? String((resolvedTaxOption as any).id || (resolvedTaxOption as any)._id || "")
                : (rawTaxCandidates[0] || "");

              return {
                id: index + 1,
                itemId: itemId || null,
                itemDetails:
                  it.itemDetails ||
                  it.name ||
                  it.description ||
                  (typeof rawItem === "object" ? (rawItem?.name || rawItem?.itemName || "") : "") ||
                  matchingDbItem?.name ||
                  "",
                quantity,
                rate,
                tax,
                amount: Number(it.amount ?? it.total ?? baseAmount) || baseAmount,
                itemType: it.itemType || "item",
                stockOnHand: Number(matchingDbItem?.stockOnHand ?? it.stockOnHand ?? 0) || 0
              };
            })
            : [{ id: 1, itemDetails: "", itemSku: "", quantity: 1, rate: 0, tax: "", amount: 0 }];

          setFormData((prev) => {
            const startOn = toInputDate(
              invoiceData.invoiceDate || invoiceData.date || invoiceData.createdAt,
              prev.startOn || new Date().toISOString().split("T")[0]
            );
            return calculateTotals({
              ...prev,
              customerName: resolveCustomerNameForForm(invoiceData, String(invoiceData.customerId || invoiceData.customer?._id || invoiceData.customer?.id || "")) || prev.customerName,
              profileName: "",
              orderNumber: String(invoiceData.orderNumber ?? invoiceData.poNumber ?? invoiceData.purchaseOrderNumber ?? ""),
              repeatEvery: prev.repeatEvery || "weekly",
              startOn,
              endsOn: "",
              neverExpires: true,
              paymentTerms: invoiceData.paymentTerms || prev.paymentTerms,
              accountsReceivable: invoiceData.accountsReceivable || prev.accountsReceivable,
              salesperson: getSalespersonName(invoiceData) || prev.salesperson,
              salespersonId: String(invoiceData.salespersonId || invoiceData.salesperson?._id || invoiceData.salesperson?.id || prev.salespersonId || ""),
              taxExclusive: invoiceData.taxExclusive || prev.taxExclusive,
              items: mappedItems,
              customerNotes: invoiceData.customerNotes || invoiceData.notes || prev.customerNotes,
              termsAndConditions: invoiceData.termsAndConditions || invoiceData.terms || prev.termsAndConditions,
              subTotal: Number(invoiceData.subTotal ?? invoiceData.subtotal ?? prev.subTotal) || 0,
              discount: Number(invoiceData.discount ?? prev.discount) || 0,
              discountType: invoiceData.discountType || prev.discountType,
              discountAccount: invoiceData.discountAccount || prev.discountAccount,
              shippingCharges: Number(
                invoiceData.shippingCharges
                ?? invoiceData.shippingCharge
                ?? invoiceData.shipping
                ?? prev.shippingCharges
              ) || 0,
              adjustment: Number(
                invoiceData.adjustment
                ?? invoiceData.adjustments
                ?? prev.adjustment
              ) || 0,
              roundOff: Number(invoiceData.roundOff ?? prev.roundOff) || 0,
              total: Number(invoiceData.total ?? prev.total) || 0,
              currency: invoiceData.currency || prev.currency,
              documents: [],
              attachedFiles: invoiceData.attachedFiles || []
            } as FormDataType);
          });

          const invoiceCustomerId = String(invoiceData.customerId || invoiceData.customer?._id || invoiceData.customer?.id || "");
          const invoiceCustomerName = resolveCustomerNameForForm(invoiceData, invoiceCustomerId);
          if (invoiceCustomerId || invoiceCustomerName) {
            const matchedCustomer = customers.find((c) => {
              const customerId = String(c.id || c._id || "");
              return (invoiceCustomerId && customerId === invoiceCustomerId)
                || (invoiceCustomerName && (c.name || "").toLowerCase() === invoiceCustomerName.toLowerCase());
            });

            if (matchedCustomer) {
              setSelectedCustomer(matchedCustomer);
              const matchedCustomerId = resolveEntityId(matchedCustomer);
              if (matchedCustomerId) {
                await loadProjectsForCustomer(matchedCustomerId);
              }
            } else {
              const fallbackCustomer = {
                id: invoiceCustomerId || undefined,
                name: invoiceCustomerName || invoiceCustomerId || ""
              };
              setSelectedCustomer(fallbackCustomer);
              const fallbackCustomerId = resolveEntityId(fallbackCustomer);
              if (fallbackCustomerId) {
                await loadProjectsForCustomer(fallbackCustomerId);
              }
            }
          }

          const invoiceSalespersonName = getSalespersonName(invoiceData);
          if (invoiceSalespersonName) {
            const matchedSalesperson = salespersons.find((s) => (s.name || "").toLowerCase() === invoiceSalespersonName.toLowerCase());
            if (matchedSalesperson) {
              setSelectedSalesperson(matchedSalesperson);
            } else {
              setSelectedSalesperson({
                id: invoiceData.salespersonId || invoiceData.salesperson?._id || invoiceData.salesperson?.id || "",
                name: invoiceSalespersonName
              });
            }
          }
        } catch (error) {
          console.error("Error pre-filling recurring invoice from invoice:", error);
        }
      } else {
        // Set default start date to today only when NOT in edit mode
        if (!formData.startOn) {
          setFormData(prev => ({
            ...prev,
            startOn: formatDate(new Date())
          }));
          setStartDateCalendar(new Date());
        }
      }
    };
    loadInvoiceData();
  }, [isEditMode, id, navigate, customers, salespersons, items, clonedDataFromState, invoiceIdFromQuery, formData.startOn]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      if (name === 'discount' || name === 'discountType' || name === 'shippingCharges' || name === 'adjustment') {
        return calculateTotals(updated);
      }

      return updated;
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    const paymentTermFromCustomer = (customer as any)?.paymentTerms || (customer as any)?.paymentTerm;
    const normalizedPaymentTerm = normalizePaymentTerm(paymentTermFromCustomer);
    const customerName = customer.name || customer.displayName || customer.companyName || "";
    const customerId = resolveEntityId(customer);
    const customerTaxCandidate = getCustomerTaxCandidate(customer);
    const customerTaxOption = customerTaxCandidate ? findTaxOptionById(customerTaxCandidate) : null;
    const customerTaxId = customerTaxOption ? getTaxIdentifier(customerTaxOption) : "";
    setSelectedCustomer(customer);
    setFormData(prev => {
      const nextItems = customerTaxId
        ? prev.items.map((item) => {
          const currentTax = String(item.tax || "").trim();
          if (currentTax && currentTax !== defaultTaxId) return item;
          return { ...item, tax: customerTaxId };
        })
        : prev.items;
      return calculateTotals({
        ...prev,
        customerName,
        projectIds: [],
        paymentTerms: paymentTermFromCustomer ? normalizedPaymentTerm : prev.paymentTerms,
        items: nextItems
      } as FormDataType);
    });
    if (customerId) {
      void loadProjectsForCustomer(customerId);
    } else {
      setCustomerProjects([]);
    }
    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");
  };

  const handleSalespersonSelect = (salesperson: Salesperson) => {
    setSelectedSalesperson(salesperson);
    setFormData(prev => ({
      ...prev,
      salesperson: salesperson.name || "",
      salespersonId: resolveEntityId(salesperson)
    }));
    setIsSalespersonDropdownOpen(false);
    setSalespersonSearch("");
  };

  const handleNewSalespersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSalespersonData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveAndSelectSalesperson = async () => {
    if (!newSalespersonData.name.trim()) {
      toast.error("Please enter a name for the salesperson");
      return;
    }

    try {
      setIsSavingNewSalesperson(true);
      const response = await salespersonsAPI.create({
        name: newSalespersonData.name.trim(),
        email: newSalespersonData.email.trim() || "",
        phone: ""
      });

      if (response && response.success && response.data) {
        const savedSalesperson = normalizeSalesperson(response.data);
        const latestSalespersons = await reloadSalespersonsForRecurring();
        const selected = latestSalespersons.find((s) => resolveEntityId(s) === resolveEntityId(savedSalesperson)) || savedSalesperson;
        handleSalespersonSelect(selected);
        setNewSalespersonData({ name: "", email: "" });
        setIsNewSalespersonQuickActionOpen(false);
        toast.success("Salesperson added successfully.");
        return;
      }

      toast.error("Failed to save salesperson.");
    } catch (error: any) {
      console.error("Error saving salesperson:", error);
      toast.error(error?.message || "Error saving salesperson.");
    } finally {
      setIsSavingNewSalesperson(false);
    }
  };

  const handleCancelNewSalesperson = () => {
    setNewSalespersonData({ name: "", email: "" });
    setIsNewSalespersonQuickActionOpen(false);
  };

  const getEntityId = (entity: any): string => {
    const raw = entity?._id || entity?.id;
    return raw ? String(raw) : "";
  };

  const pickNewestEntity = (entities: any[]) => {
    const toTime = (value: any) => {
      const time = new Date(value || 0).getTime();
      return Number.isFinite(time) ? time : 0;
    };
    return [...entities].sort((a, b) => {
      const aTime = Math.max(
        toTime(a?.createdAt),
        toTime(a?.created_at),
        toTime(a?.updatedAt),
        toTime(a?.updated_at)
      );
      const bTime = Math.max(
        toTime(b?.createdAt),
        toTime(b?.created_at),
        toTime(b?.updatedAt),
        toTime(b?.updated_at)
      );
      return bTime - aTime;
    })[0];
  };

  const normalizeCustomer = (customer: any): Customer => ({
    ...customer,
    id: customer?._id || customer?.id,
    _id: customer?._id || customer?.id,
    name: customer?.displayName || customer?.name || customer?.companyName || `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Unknown"
  });

  const normalizeSalesperson = (salesperson: any): Salesperson => ({
    ...salesperson,
    id: salesperson?._id || salesperson?.id,
    name: salesperson?.name || ""
  });

  const reloadCustomersForRecurring = async () => {
    const customersResponse = await getCustomersFromAPI();
    const normalizedCustomers = ((customersResponse?.data || []) as any[]).map(normalizeCustomer);
    setCustomers(normalizedCustomers);
    return normalizedCustomers;
  };

  const reloadSalespersonsForRecurring = async () => {
    const loadedSalespersons = await getSalespersonsFromAPI();
    const normalizedSalespersons = ((loadedSalespersons || []) as any[]).map(normalizeSalesperson);
    setSalespersons(normalizedSalespersons);
    return normalizedSalespersons;
  };

  const openCustomerQuickAction = async () => {
    setIsCustomerDropdownOpen(false);
    setIsRefreshingCustomersQuickAction(true);
    const latestCustomers = await reloadCustomersForRecurring();
    setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
    setIsRefreshingCustomersQuickAction(false);
    setIsNewCustomerQuickActionOpen(true);
  };

  const tryAutoSelectNewCustomerFromQuickAction = async () => {
    if (!isNewCustomerQuickActionOpen || isAutoSelectingCustomerFromQuickAction) return;
    setIsAutoSelectingCustomerFromQuickAction(true);
    try {
      const latestCustomers = await reloadCustomersForRecurring();
      const baselineIds = new Set(customerQuickActionBaseIds);
      const newCustomers = latestCustomers.filter((c: any) => {
        const entityId = getEntityId(c);
        return entityId && !baselineIds.has(entityId);
      });
      if (newCustomers.length > 0) {
        const newlyCreatedCustomer = pickNewestEntity(newCustomers) || newCustomers[newCustomers.length - 1];
        handleCustomerSelect(newlyCreatedCustomer);
        setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
        setIsNewCustomerQuickActionOpen(false);
      }
    } finally {
      setIsAutoSelectingCustomerFromQuickAction(false);
    }
  };

  const openSalespersonQuickAction = async () => {
    setIsSalespersonDropdownOpen(false);
    setIsManageSalespersonsOpen(false);
    await reloadSalespersonsForRecurring();
    setIsNewSalespersonQuickActionOpen(true);
  };

  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(customer =>
    (customer.name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
    (customer.email || "").toLowerCase().includes(customerSearch.toLowerCase())
  );

  useEffect(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!isCustomerDropdownOpen || !query || filteredCustomers.length !== 1) return;

    const onlyCustomer = filteredCustomers[0];
    if (!onlyCustomer || String(selectedCustomer?.id || selectedCustomer?._id || "") === String(onlyCustomer.id || onlyCustomer._id || "")) {
      return;
    }

    const timer = window.setTimeout(() => {
      handleCustomerSelect(onlyCustomer);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [customerSearch, filteredCustomers, isCustomerDropdownOpen, selectedCustomer]);

  const filteredSalespersons = salespersons.filter(salesperson =>
    (salesperson.name || "").toLowerCase().includes(salespersonSearch.toLowerCase())
  );

  const filteredManageSalespersons = salespersons.filter(salesperson =>
    (salesperson.name || "").toLowerCase().includes(manageSalespersonSearch.toLowerCase()) ||
    (salesperson.email || "").toLowerCase().includes(manageSalespersonSearch.toLowerCase())
  );

  const selectedProjectIdSet = React.useMemo(
    () => new Set((formData.projectIds || []).map((projectId) => String(projectId))),
    [formData.projectIds]
  );

  const selectedProjectNames = React.useMemo(() => {
    return customerProjects
      .filter((project) => selectedProjectIdSet.has(resolveEntityId(project)))
      .map((project) => getProjectLabel(project))
      .filter(Boolean);
  }, [customerProjects, selectedProjectIdSet]);

  const handleOpenProjectsModal = () => {
    if (customerProjects.length === 0) return;
    setPendingProjectIds((formData.projectIds || []).map((projectId) => String(projectId)));
    setIsProjectsModalOpen(true);
  };

  const handleTogglePendingProject = (projectId: string) => {
    setPendingProjectIds((prev) => {
      if (prev.includes(projectId)) {
        return prev.filter((id) => id !== projectId);
      }
      return [...prev, projectId];
    });
  };

  const handleAddSelectedProjects = () => {
    setFormData((prev) => ({
      ...prev,
      projectIds: Array.from(new Set((pendingProjectIds || []).map((projectId) => String(projectId)).filter(Boolean)))
    }));
    setIsProjectsModalOpen(false);
  };

  const handleCancelProjectsModal = () => {
    setIsProjectsModalOpen(false);
    setPendingProjectIds((formData.projectIds || []).map((projectId) => String(projectId)));
  };

  const handleRemoveSelectedProject = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      projectIds: (prev.projectIds || []).filter((id) => String(id) !== String(projectId))
    }));
  };

  const getFilteredItems = (itemId: string | number) => {
    const key = String(itemId);
    const search = itemSearches[key] || "";
    return items.filter(item =>
      (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(search.toLowerCase())
    );
  };

  const getBulkFilteredItems = () => {
    if (!bulkAddSearch.trim()) {
      return items;
    }
    return items.filter(item =>
      (item.name || "").toLowerCase().includes(bulkAddSearch.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(bulkAddSearch.toLowerCase())
    );
  };

  const handleBulkItemToggle = (item: Item) => {
    setBulkSelectedItems(prev => {
      const exists = prev.find(selected => selected.id === item.id);
      if (exists) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, { ...item, quantity: 1 } as Item];
      }
    });
  };

  const handleBulkItemQuantityChange = (itemId: string | number, quantity: string | number) => {
    setBulkSelectedItems(prev =>
      prev.map(item =>
        String(item.id) === String(itemId) ? { ...item, quantity: Math.max(1, parseFloat(String(quantity)) || 1) } : item
      )
    );
  };

  const handleAddBulkItems = () => {
    if (bulkSelectedItems.length === 0) return;

    // Add all selected items to the form and recalculate totals
    setFormData(prev => {
      const newItems = bulkSelectedItems.map((selectedItem, index) => ({
        id: Date.now() + index,
        itemId: selectedItem.id ?? null,
        itemDetails: selectedItem.name ?? "",
        itemSku: selectedItem.sku ?? "",
        quantity: Number(selectedItem.quantity ?? 1),
        rate: Number(selectedItem.rate ?? 0),
        stockOnHand: Number(selectedItem.stockOnHand ?? 0),
        tax: resolvePreferredTaxId(selectedCustomer, selectedItem),
        amount: Number((selectedItem.quantity ?? 1) * (selectedItem.rate ?? 0))
      } as FormItem));

      const updatedItems: FormItem[] = [...prev.items, ...newItems];
      return calculateTotals({
        ...prev,
        items: updatedItems
      } as FormDataType);
    });

    // Close modal and reset
    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleCancelBulkAdd = () => {
    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const getFilteredTaxGroups = (itemId: string | number) => {
    const key = String(itemId);
    const search = taxSearches[key] || "";
    const grouped = buildTaxOptionGroups(taxOptions as any[]);

    if (!search.trim()) {
      return grouped;
    }

    const normalizedSearch = search.toLowerCase().trim();
    return grouped
      .map((group) => ({
        ...group,
        options: group.options.filter((tax) =>
          taxLabel(tax.raw ?? tax).toLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter((group) => group.options.length > 0);
  };

  const handleTaxSelect = (itemId: string | number, taxId: string) => {
    handleItemChange(itemId, 'tax', taxId);
    const key = String(itemId);
    setOpenTaxDropdowns(prev => ({ ...prev, [key]: false }));
    setTaxSearches(prev => ({ ...prev, [key]: "" }));
  };

  const handleSaveNewTax = () => {
    if (!newTaxData.name || !newTaxData.rate) {
      return; // Validation - should show error in real app
    }

    // Create new tax option - append rate with % to name if not already included
    const rateValue = Number(newTaxData.rate);
    let displayName = newTaxData.name.trim();

    // If name doesn't already include %, append it with the rate
    if (!displayName.includes('%')) {
      displayName = `${displayName} ${rateValue}%`;
    }

    const newTax = {
      id: `TAX-${Date.now()}`,
      name: displayName,
      rate: rateValue,
      isCompound: newTaxData.isCompound,
      raw: {
        id: `TAX-${Date.now()}`,
        name: displayName,
        rate: rateValue,
        isCompound: newTaxData.isCompound
      }
    };

    // Save to localStorage
    saveTax(newTax);

    // Add to taxOptions
    setTaxOptions(prev => [...prev, newTax]);

    // Reset form and close modal
    setNewTaxData({ name: "", rate: "", isCompound: false });
    setIsNewTaxModalOpen(false);
  };

  const handleCancelNewTax = () => {
    setNewTaxData({ name: "", rate: "", isCompound: false });
    setIsNewTaxModalOpen(false);
  };

  const handleDeleteTax = (taxId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the tax when clicking delete

    // Delete from localStorage
    deleteTax(taxId);

    // Remove from taxOptions
    setTaxOptions(prev => prev.filter(tax => tax.id !== taxId));

    // Also remove the tax from any items that are using it
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.tax === taxId ? { ...item, tax: "" } : item
      )
    }));
  };

  const handleItemSelect = (itemId: string | number, selectedItem: Item) => {
    const key = String(itemId);
    setSelectedItemIds(prev => ({ ...prev, [key]: selectedItem.id ?? "" }));
    setFormData(prev => {
      const taxId = resolvePreferredTaxId(selectedCustomer, selectedItem);
      const updatedItems = prev.items.map(item =>
        String(item.id) === key
          ? {
            ...item,
            itemId: selectedItem.id,
            itemDetails: selectedItem.name || "",
            itemSku: selectedItem.sku || "",
            quantity: Number(item.quantity || 1),
            rate: Number(selectedItem.rate || 0),
            stockOnHand: Number(selectedItem.stockOnHand ?? 0),
            tax: taxId,
            amount: Number((Number(item.quantity || 1)) * (Number(selectedItem.rate || 0)))
          } as FormItem
          : item
      );
      return calculateTotals({ ...prev, items: updatedItems } as FormDataType);
    });
    setOpenItemDropdowns(prev => ({ ...prev, [key]: false }));
    setItemSearches(prev => ({ ...prev, [key]: "" }));
  };

  const toggleItemDropdown = (itemId: number | string) => {
    const key = String(itemId);
    setOpenItemDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    if (!itemDropdownRefs.current[key]) {
      itemDropdownRefs.current[key] = null;
    }
  };

  const handleItemChange = (id: number | string, field: string, value: string | number) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value } as FormItem;
          // Calculate amount
          if (field === 'quantity' || field === 'rate' || field === 'tax') {
            const quantity = field === 'quantity' ? Number(value) || 0 : (item.quantity || 0);
            const rate = field === 'rate' ? Number(value) || 0 : (item.rate || 0);
            const taxId = field === 'tax' ? String(value) : item.tax;
            const taxOption = findTaxOptionById(taxId);
            const taxRate = taxOption ? Number((taxOption as any).rate || 0) : 0;
            const subtotal = quantity * rate;
            if (prev.taxExclusive === "Tax Inclusive" && taxRate > 0) {
              updatedItem.amount = subtotal;
            } else {
              updatedItem.amount = subtotal + (subtotal * taxRate / 100);
            }
          }
          return updatedItem;
        }
        return item;
      });
      return calculateTotals({ ...prev, items: updatedItems } as FormDataType);
    });
  };

  const calculateTotals = (data: FormDataType) => {
    const items = (data.items || []).filter((i: FormItem) => i.itemType !== "header");
    const subTotal = items.reduce((sum: number, item: FormItem) => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      return sum + (quantity * rate);
    }, 0);

    const lineAmounts = items.map((item: FormItem) => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const baseAmount = quantity * rate;
      const taxOption = findTaxOptionById(item.tax);
      const taxRate = taxOption ? Number((taxOption as any).rate || 0) : 0;

      if (data.taxExclusive === "Tax Inclusive" && taxRate > 0) {
        const extractedTax = baseAmount - (baseAmount / (1 + taxRate / 100));
        const preTaxAmount = baseAmount - extractedTax;
        return { subTotal: preTaxAmount, taxAmount: extractedTax, totalAmount: baseAmount };
      }

      const taxAmount = baseAmount * (taxRate / 100);
      return { subTotal: baseAmount, taxAmount, totalAmount: baseAmount + taxAmount };
    });

    const grossItemsTotal = lineAmounts.reduce((sum, line) => sum + line.totalAmount, 0);

    const discountAmount = showTransactionDiscount
      ? (data.discountType === "percent"
        ? (subTotal * (Number(data.discount) || 0) / 100)
        : (Number(data.discount) || 0))
      : 0;

    const shipping = showShippingCharges ? (Number(data.shippingCharges) || 0) : 0;
    const adjustment = showAdjustment ? (Number(data.adjustment) || 0) : 0;
    const totalBeforeRound = grossItemsTotal - discountAmount + shipping + adjustment;
    const roundOff = Number(data.roundOff || 0);
    const total = totalBeforeRound + roundOff;

    return {
      ...data,
      subTotal: Number(subTotal.toFixed(2)),
      roundOff,
      total: Number(total.toFixed(2))
    } as FormDataType;
  };

  useEffect(() => {
    setFormData((prev) => {
      const computed = calculateTotals(prev);
      const prevSubTotal = Number(prev.subTotal || 0);
      const prevTotal = Number(prev.total || 0);
      const prevRoundOff = Number(prev.roundOff || 0);
      if (
        Math.abs(prevSubTotal - Number(computed.subTotal || 0)) < 0.0001 &&
        Math.abs(prevTotal - Number(computed.total || 0)) < 0.0001 &&
        Math.abs(prevRoundOff - Number(computed.roundOff || 0)) < 0.0001
      ) {
        return prev;
      }
      return computed;
    });
  }, [
    formData.items,
    formData.discount,
    formData.discountType,
    formData.shippingCharges,
    formData.adjustment,
    formData.roundOff,
    formData.taxExclusive,
    showTransactionDiscount,
    showShippingCharges,
    showAdjustment,
    taxOptions
  ]);

  const handleDuplicateItem = (itemId: number | string) => {
    setFormData(prev => {
      const index = prev.items.findIndex(item => item.id === itemId);
      if (index === -1) return prev;

      const itemToDuplicate = prev.items[index];
      const newItem = {
        ...itemToDuplicate,
        id: Date.now(),
      };

      const newItems = [...prev.items];
      newItems.splice(index + 1, 0, newItem);

      return calculateTotals({ ...prev, items: newItems });
    });
  };

  const handleInsertHeader = (index: number) => {
    setFormData(prev => {
      const newHeader = {
        id: Date.now(),
        itemType: "header",
        itemDetails: "",
        itemSku: "",
        quantity: 0,
        rate: 0,
        amount: 0
      };
      const newItems = [...prev.items];
      newItems.splice(index + 1, 0, newHeader);
      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), itemId: null, itemDetails: "", itemSku: "", quantity: 1, rate: 0, tax: resolvePreferredTaxId(selectedCustomer), amount: 0 }
      ]
    }));
  };

  const handleRemoveItem = (id: number | string) => {
    setFormData(prev => {
      const newItems = prev.items.filter(item => item.id !== id);
      return calculateTotals({ ...prev, items: newItems });
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [] as File[]);
    if (formData.documents.length + files.length > 10) {
      toast.error("You can upload a maximum of 10 files");
      return;
    }
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error(`Some files exceed 10MB limit. Maximum file size is 10MB.`);
      return;
    }
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      file: file
    }));
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...newFiles]
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsUploadDropdownOpen(false);
  };

  const handleRemoveFile = (fileId: string | number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== fileId)
    }));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const parseFileSize = (sizeStr: string | number) => {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;
    const match = sizeStr.toString().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    return Math.round(value * (multipliers[unit] || 1));
  };

  const normalizeRecurringAttachment = (entry: any) => ({
    name: String(entry?.name || entry?.fileName || "").trim(),
    url: String(entry?.url || "").trim(),
    size: Number(entry?.size || entry?.fileSize || 0) || 0,
    mimeType: String(entry?.mimeType || entry?.type || "").trim(),
    documentId: String(entry?.documentId || entry?.id || entry?._id || "").trim(),
    fileName: String(entry?.fileName || "").trim(),
    filePath: String(entry?.filePath || "").trim(),
    uploadedAt: entry?.uploadedAt || new Date().toISOString()
  });

  const dedupeRecurringAttachments = (attachments: any[]) => {
    const seen = new Set<string>();
    const result: any[] = [];

    for (const attachment of attachments || []) {
      const normalized = normalizeRecurringAttachment(attachment);
      if (!normalized.name && !normalized.documentId && !normalized.url && !normalized.filePath) {
        continue;
      }

      const key = normalized.documentId
        ? `doc:${normalized.documentId}`
        : `name:${normalized.name}|size:${normalized.size}|path:${normalized.filePath}|url:${normalized.url}`;

      if (seen.has(key)) continue;
      seen.add(key);
      result.push(normalized);
    }

    return result;
  };

  const prepareRecurringAttachmentsForSave = async (customerId: string) => {
    const docs = Array.isArray(formData.documents) ? formData.documents : [];
    const existingAttachments = Array.isArray(formData.attachedFiles) ? formData.attachedFiles : [];

    const linkedDocumentAttachments = docs
      .filter((doc) => doc.documentId)
      .map((doc) => ({
        name: doc.name,
        size: typeof doc.size === "number" ? doc.size : parseFileSize(doc.size || 0),
        mimeType: doc.type || "",
        documentId: String(doc.documentId || doc.id || ""),
        uploadedAt: doc.uploadedOn || new Date().toISOString()
      }));

    const cloudOnlyAttachments = docs
      .filter((doc) => !doc.documentId && !doc.file && doc.isCloud)
      .map((doc) => ({
        name: doc.name,
        size: typeof doc.size === "number" ? doc.size : parseFileSize(doc.size || 0),
        mimeType: doc.type || "",
        uploadedAt: new Date().toISOString()
      }));

    const filesToUpload = docs.filter((doc) => doc.file instanceof File);
    const uploadedAttachments: any[] = [];

    for (const doc of filesToUpload) {
      const file = doc.file as File;
      const uploadResponse = await documentsAPI.upload(file, {
        name: doc.name || file.name,
        module: "Recurring Invoices",
        type: "other",
        folder: "Files",
        relatedToType: customerId ? "customer" : undefined,
        relatedToId: customerId || undefined,
      });

      const uploadedDoc = uploadResponse?.data;
      if (!uploadedDoc) {
        throw new Error(`Failed to upload attachment "${doc.name || file.name}"`);
      }

      uploadedAttachments.push({
        name: uploadedDoc.name || file.name,
        url: uploadedDoc.url || "",
        size: Number(uploadedDoc.fileSize || file.size || 0) || 0,
        mimeType: uploadedDoc.mimeType || file.type || "",
        documentId: String(uploadedDoc._id || uploadedDoc.id || ""),
        fileName: uploadedDoc.fileName || file.name,
        filePath: uploadedDoc.filePath || "",
        uploadedAt: uploadedDoc.createdAt || new Date().toISOString()
      });
    }

    return dedupeRecurringAttachments([
      ...existingAttachments,
      ...linkedDocumentAttachments,
      ...cloudOnlyAttachments,
      ...uploadedAttachments
    ]);
  };

  const handleAttachFromDesktop = () => {
    fileInputRef.current?.click();
  };

  const handleAttachFromDocuments = () => {
    setIsDocumentsModalOpen(true);
    setIsUploadDropdownOpen(false);
  };

  const documents = [
    { id: 1, name: "SLA_Template.pdf", size: "1.2 MB", type: "pdf", uploadedBy: "Admin", uploadedOn: "2023-10-15" },
    { id: 2, name: "Service_Agreement.docx", size: "450 KB", type: "docx", uploadedBy: "John Doe", uploadedOn: "2023-10-20" },
    { id: 3, name: "Company_Logo.png", size: "1.5 MB", type: "png", uploadedBy: "Sarah Smith", uploadedOn: "2023-10-22" },
  ];

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(documentSearch.toLowerCase())
  );

  const parseTaxRate = (value: unknown) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const findTaxOptionById = (taxId?: string | number) => {
    const valueStr = String(taxId ?? "").trim();
    if (!valueStr) return undefined;

    const byId = taxOptions.find((t: any) => String((t as any).id || (t as any)._id || "") === valueStr);
    if (byId) return byId;

    const normalized = valueStr.toLowerCase();
    const byName = taxOptions.find((tax: any) => {
      const name = String((tax as any).name || "").trim().toLowerCase();
      const label = getTaxDisplayLabel(tax).toLowerCase();
      return name === normalized || label === normalized;
    });
    if (byName) return byName;

    const rateCandidate = parseTaxRate(valueStr);
    if (rateCandidate > 0) {
      return taxOptions.find((tax: any) => Math.abs(parseTaxRate((tax as any).rate) - rateCandidate) < 0.0001);
    }

    return undefined;
  };

  const getTaxDisplayLabel = (tax?: TaxOption) => {
    if (!tax) return "";
    const rawName = String((tax as any).name || "").trim();
    const baseName = rawName.replace(/\s*\[?\d+(\.\d+)?%\]?$/i, "").trim() || rawName;
    return `${baseName} [${Number((tax as any).rate || 0)}%]`;
  };

  const taxSummary = React.useMemo(() => {
    const summary: Record<string, number> = {};
    (formData.items || [])
      .filter((i: FormItem) => i.itemType !== "header")
      .forEach((item: FormItem) => {
        if (!item.tax) return;
        const taxOption = findTaxOptionById(item.tax);
        if (!taxOption) return;

        const quantity = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const baseAmount = quantity * rate;
        const taxRate = Number((taxOption as any).rate || 0);
        let taxAmount = 0;

        if (formData.taxExclusive === "Tax Inclusive" && taxRate > 0) {
          taxAmount = baseAmount - (baseAmount / (1 + taxRate / 100));
        } else {
          taxAmount = baseAmount * (taxRate / 100);
        }

        const key = getTaxDisplayLabel(taxOption);
        summary[key] = (summary[key] || 0) + taxAmount;
      });
    return summary;
  }, [formData.items, formData.taxExclusive, taxOptions]);

  const totalTaxAmount = Object.values(taxSummary).reduce((sum, amount) => sum + amount, 0);

  const handleSaveAndSend = async () => {
    try {
      const calculated = calculateTotals(formData);
      const subTotal = Number(calculated.subTotal || 0);
      const finalTotal = Number(calculated.total || 0);
      const roundOff = Number(calculated.roundOff || 0);
      const shipping = showShippingCharges ? (Number(calculated.shippingCharges) || 0) : 0;
      const adjustment = showAdjustment ? (Number(calculated.adjustment) || 0) : 0;
      const discountAmount = showTransactionDiscount
        ? (calculated.discountType === "percent"
          ? (subTotal * (Number(calculated.discount) || 0) / 100)
          : (Number(calculated.discount) || 0))
        : 0;

      // Get customer ID if customer is selected
      const customer = selectedCustomer || customers.find(c => c.name === formData.customerName);

      if (!formData.profileName || !customer || !formData.repeatEvery || !formData.startOn) {
        toast.error("Please fill in all required fields: Profile Name, Customer, Repeat Every, and Start Date.");
        return;
      }

      setSaveLoading(true);
      const customerId = String(customer?.id || customer?._id || "").trim();
      const preparedAttachments = await prepareRecurringAttachmentsForSave(customerId);

      // Prepare recurring invoice data with all fields
      // Map frontend fields to backend expected names
      const frequencyMapping: Record<string, string> = {
        "daily": "daily",
        "weekly": "weekly",
        "biweekly": "biweekly",
        "monthly": "monthly",
        "quarterly": "quarterly",
        "yearly": "yearly"
      };

      const recurringInvoiceData = {
        ...(isEditMode && id ? { id: id } : {}),
        profileName: formData.profileName,
        customer: customerId || undefined,
        customerId: customerId || undefined,
        orderNumber: formData.orderNumber,
        frequency: frequencyMapping[formData.repeatEvery] || "weekly",
        startDate: formData.startOn ? new Date(formData.startOn).toISOString() : new Date().toISOString(),
        endDate: formData.neverExpires ? undefined : (formData.endsOn ? new Date(formData.endsOn).toISOString() : undefined),
        nextInvoiceDate: (() => {
          // Use a robust date calculation to avoid timezone shifts
          const [year, month, day] = (formData.startOn || new Date().toISOString().split('T')[0]).split('-').map(Number);
          const date = new Date(year, month - 1, day);

          switch (formData.repeatEvery) {
            case "daily": date.setDate(date.getDate() + 1); break;
            case "weekly": date.setDate(date.getDate() + 7); break;
            case "biweekly": date.setDate(date.getDate() + 14); break;
            case "monthly": date.setMonth(date.getMonth() + 1); break;
            case "quarterly": date.setMonth(date.getMonth() + 3); break;
            case "yearly": date.setFullYear(date.getFullYear() + 1); break;
            default: date.setMonth(date.getMonth() + 1);
          }
          return date.toISOString();
        })(),
        neverExpires: formData.neverExpires,
        paymentTerms: formData.paymentTerms,
        accountsReceivable: formData.accountsReceivable,
        salesperson: formData.salesperson,
        salespersonId: formData.salespersonId || resolveEntityId(selectedSalesperson),
        projectIds: Array.from(new Set((formData.projectIds || []).map((projectId) => String(projectId)).filter(Boolean))),
        associatedProjects: Array.from(new Set((formData.projectIds || []).map((projectId) => String(projectId)).filter(Boolean))),
        taxExclusive: formData.taxExclusive,

        // Items array with all details - matching backend schema
        items: formData.items.filter(item => item.itemType !== 'header').map(item => {
          const taxObj = findTaxOptionById(item.tax);
          const taxRate = taxObj ? Number(taxObj.rate) : 0;
          return {
            item: item.itemId || null, // Use database ID
            name: item.itemDetails,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.rate) || 0,
            rate: Number(item.rate) || 0, // Keep rate for frontend compatibility if needed
            taxRate: taxRate,
            taxAmount: Number((item.amount || 0) - ((Number(item.quantity) || 0) * (Number(item.rate) || 0))),
            total: Number(item.amount) || 0,
            amount: Number(item.amount) || 0,
            description: item.itemDetails || ""
          };
        }),

        // Summary fields
        subtotal: subTotal,
        discount: showTransactionDiscount ? (Number(formData.discount) || 0) : 0,
        discountType: showTransactionDiscount ? formData.discountType : "percent",
        discountAmount: discountAmount,
        discountAccount: formData.discountAccount,
        shippingCharges: shipping,
        adjustment: adjustment,
        roundOff: roundOff,
        total: finalTotal,
        balanceDue: finalTotal,
        balance: finalTotal,
        amount: finalTotal,

        // Other fields
        currency: formData.currency,
        notes: formData.customerNotes,
        terms: formData.termsAndConditions,
        attachedFiles: preparedAttachments,

        // Status
        status: "active",
        createdAt: new Date().toISOString()
      };

      // Save or update recurring invoice to API
      let savedRecurringInvoice: any = null;
      if (isEditMode && id) {
        savedRecurringInvoice = await updateRecurringInvoice(id, recurringInvoiceData);
      } else {
        savedRecurringInvoice = await saveRecurringInvoice(recurringInvoiceData);
      }

      const savedRecurringId = String(
        savedRecurringInvoice?.id ||
        savedRecurringInvoice?._id ||
        id ||
        ""
      ).trim();

      // Immediate generation if start date is today
      const todayStr = new Date().toISOString().split('T')[0];
      if (!isEditMode && formData.startOn === todayStr && savedRecurringId) {
        try {
          await generateInvoiceFromRecurring(savedRecurringId);
        } catch (genError) {
          console.error("Error generating first invoice:", genError);
          // Profile is created, but generation failed - we show the error but continue
        }
      }

      // Show clear confirmation and navigate to the saved recurring invoice page
      toast.success(`Recurring Invoice Profile "${formData.profileName}" has been ${isEditMode ? "updated" : "created"}. Invoices will be generated automatically based on the schedule.`);
      if (savedRecurringId) {
        navigate(`/sales/recurring-invoices/${savedRecurringId}`);
      } else {
        navigate("/sales/recurring-invoices");
      }
    } catch (error) {
      console.error("Error saving recurring invoice:", error);
      toast.error("Failed to save recurring invoice. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/sales/recurring-invoices");
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText size={24} className="text-gray-700" />
            <h1 className="text-2xl font-semibold text-gray-900 m-0">
              {isEditMode ? "Edit Recurring Invoice" : "New Recurring Invoice"}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
            <div className="w-full max-w-[980px] px-6 py-6 space-y-6 pb-24">

          {/* Main Form Content */}
          <div className="space-y-4">
            {/* Customer Name */}
            <div className="flex items-start gap-4">
              <div className="w-[200px] pt-2">
                <label className="text-sm font-medium text-red-600 flex items-center gap-1">
                  Customer Name
                  <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="flex-1 max-w-[400px]">
                <div className="relative" ref={customerDropdownRef}>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] pr-10"
                      placeholder="Select or add a customer"
                      value={formData.customerName}
                      readOnly
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex items-center">
                      <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-gray-600"
                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 bg-[#156372] text-white rounded-r-md hover:bg-[#0D4A52] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerSearchModalOpen(true);
                        }}
                      >
                        <Search size={16} />
                      </button>
                    </div>
                  </div>

                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && filteredCustomers.length > 0) {
                              e.preventDefault();
                              handleCustomerSelect(filteredCustomers[0]);
                            }
                          }}
                          className="flex-1 text-sm bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCustomers.map(customer => (
                          <div
                            key={customer.id}
                            className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${selectedCustomer?.id === customer.id ? "bg-[rgba(21,99,114,0.1)]" : ""
                              }`}
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#156372] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                              {(customer.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{customer.name}</div>
                              <div className="text-xs text-gray-500 truncate">{customer.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#156372] hover:bg-[rgba(21,99,114,0.1)] transition-colors border-t border-gray-200"
                        onClick={() => {
                          setIsCustomerDropdownOpen(false);
                          navigate("/sales/customers/new", {
                            state: { from: location.pathname },
                          });
                        }}
                      >
                        <Plus size={14} />
                        New Customer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Associate Project Hours */}
            <div className="flex items-start gap-4">
              <div className="w-[200px] pt-2">
                <label className="text-sm font-medium text-[#156372] leading-5">
                  Associate Project(s)
                  <br />
                  Hours
                </label>
              </div>
              <div className="flex-1 max-w-[400px]">
                {isProjectsLoading ? (
                  <div className="text-sm text-gray-500 italic py-2">Loading customer projects...</div>
                ) : customerProjects.length > 0 ? (
                  <div className="py-1">
                    <button
                      type="button"
                      className="text-sm text-[#2563eb] hover:text-[#1d4ed8] hover:no-underline"
                      onClick={handleOpenProjectsModal}
                    >
                      Choose Project(s)
                    </button>
                    {selectedProjectNames.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {customerProjects
                          .filter((project) => selectedProjectIdSet.has(resolveEntityId(project)))
                          .map((project) => {
                            const projectId = resolveEntityId(project);
                            return (
                              <span
                                key={projectId}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50 text-gray-700"
                              >
                                {getProjectLabel(project)}
                                <button
                                  type="button"
                                  className="text-gray-500 hover:text-red-600"
                                  onClick={() => handleRemoveSelectedProject(projectId)}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic py-2">
                    There are no projects for this customer.
                  </div>
                )}
              </div>
            </div>

            {/* Profile Name */}
            <div className="flex items-start gap-4">
              <div className="w-[200px] pt-2">
                <label className="text-sm font-medium text-red-600">
                  Profile Name
                  <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="flex-1 max-w-[400px]">
                <input
                  type="text"
                  name="profileName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                  value={formData.profileName}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Order Number */}
            <div className="flex items-start gap-4">
              <div className="w-[200px] pt-2">
                <label className="text-sm font-medium text-gray-700">Order Number</label>
              </div>
              <div className="flex-1 max-w-[400px]">
                <input
                  type="text"
                  name="orderNumber"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                  value={formData.orderNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Repeat Every */}
            <div className="flex items-start gap-4">
              <div className="w-[200px] pt-2">
                <label className="text-sm font-medium text-red-600">
                  Repeat Every
                  <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="flex-1 max-w-[400px]">
                <div className="relative" ref={repeatEveryDropdownRef}>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] pr-10 cursor-pointer"
                      value={formatFrequencyOption(formData.repeatEvery)}
                      readOnly
                      onClick={() => setIsRepeatEveryDropdownOpen(!isRepeatEveryDropdownOpen)}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </div>
                  {isRepeatEveryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="max-h-60 overflow-y-auto">
                        {repeatEveryOptions.map((option) => (
                          <div
                            key={option}
                            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${formData.repeatEvery === option ? "bg-[rgba(21,99,114,0.1)] text-[#156372]" : "text-gray-700"
                              }`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, repeatEvery: option }));
                              setIsRepeatEveryDropdownOpen(false);
                            }}
                          >
                            <span>{formatFrequencyOption(option)}</span>
                            {formData.repeatEvery === option && <Check size={14} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Start On */}
            <div className="flex items-start gap-4">
              <div className="w-[200px] pt-2">
                <label className="text-sm font-medium text-gray-700">Start On</label>
              </div>
              <div className="flex-1 max-w-[500px]">
                <div className="relative flex items-center gap-4">
                  <div className="relative flex-1" ref={startDatePickerRef}>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] cursor-pointer"
                      value={formData.startOn}
                      readOnly
                      onClick={() => setIsStartDatePickerOpen(!isStartDatePickerOpen)}
                    />
                    {isStartDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-4 w-72">
                        <div className="flex items-center justify-between mb-2">
                          <button onClick={() => navigateMonth("prev", "startOn")} className="p-1 hover:bg-gray-100 rounded">«</button>
                          <span className="text-sm font-semibold">{months[startDateCalendar.getMonth()]} {startDateCalendar.getFullYear()}</span>
                          <button onClick={() => navigateMonth("next", "startOn")} className="p-1 hover:bg-gray-100 rounded">»</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {daysOfWeek.map(day => <div key={day} className="text-center text-[10px] font-bold text-gray-400 py-1 uppercase">{day}</div>)}
                          {getDaysInMonth(startDateCalendar).map((day, i) => (
                            <button
                              key={`start-${day.fullDate.getTime()}-${i}`}
                              onClick={() => handleDateSelect(day.fullDate, "startOn")}
                              className={`text-sm py-1 rounded transition-colors ${day.month !== 'current' ? 'text-gray-300' :
                                formatDate(day.fullDate) === formData.startOn ? 'bg-[#156372] text-white' : 'hover:bg-gray-100'
                                }`}
                            >
                              {day.date}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-sm font-medium text-gray-700">Ends On</span>
                  <div className="relative w-32" ref={endDatePickerRef}>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] cursor-pointer ${formData.neverExpires ? 'bg-gray-100 text-gray-400' : ''}`}
                      value={formData.neverExpires ? "" : formData.endsOn}
                      readOnly
                      placeholder="dd/MM/yyyy"
                      disabled={formData.neverExpires}
                      onClick={() => !formData.neverExpires && setIsEndDatePickerOpen(!isEndDatePickerOpen)}
                    />
                    {isEndDatePickerOpen && !formData.neverExpires && (
                      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-4 w-72">
                        <div className="flex items-center justify-between mb-2">
                          <button onClick={() => navigateMonth("prev", "endsOn")} className="p-1 hover:bg-gray-100 rounded">«</button>
                          <span className="text-sm font-semibold">{months[endDateCalendar.getMonth()]} {endDateCalendar.getFullYear()}</span>
                          <button onClick={() => navigateMonth("next", "endsOn")} className="p-1 hover:bg-gray-100 rounded">»</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {daysOfWeek.map(day => <div key={day} className="text-center text-[10px] font-bold text-gray-400 py-1 uppercase">{day}</div>)}
                          {getDaysInMonth(endDateCalendar).map((day, i) => (
                            <button
                              key={`end-${day.fullDate.getTime()}-${i}`}
                              onClick={() => handleDateSelect(day.fullDate, "endsOn")}
                              className={`text-sm py-1 rounded transition-colors ${day.month !== 'current' ? 'text-gray-300' :
                                formatDate(day.fullDate) === formData.endsOn ? 'bg-[#156372] text-white' : 'hover:bg-gray-100'
                                }`}
                            >
                              {day.date}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="neverExpires"
                      checked={formData.neverExpires}
                      onChange={(e) => setFormData(prev => ({ ...prev, neverExpires: e.target.checked, endsOn: e.target.checked ? "" : prev.endsOn }))}
                      className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                    />
                    <label htmlFor="neverExpires" className="text-sm text-gray-700 cursor-pointer">Never</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="flex items-start gap-4">
              <div className="w-[200px] pt-2">
                <label className="text-sm font-medium text-gray-700">Payment Terms</label>
              </div>
              <div className="flex-1 max-w-[400px]">
                <div className="relative" ref={paymentTermsDropdownRef}>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] pr-10 cursor-pointer"
                      value={selectedPaymentTerm}
                      readOnly
                      onClick={togglePaymentTermsDropdown}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </div>
                  {isPaymentTermsDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search payment terms"
                          value={paymentTermsSearchQuery}
                          onChange={(e) => setPaymentTermsSearchQuery(e.target.value)}
                          className="flex-1 text-sm bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredPaymentTerms.map((term) => (
                          <div
                            key={term.id}
                            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${selectedPaymentTerm === term.value ? "bg-[rgba(21,99,114,0.1)] text-[#156372]" : "text-gray-700"
                              }`}
                            onClick={() => handlePaymentTermSelect(term)}
                          >
                            <span>{term.label}</span>
                            {selectedPaymentTerm === term.value && <Check size={14} />}
                          </div>
                        ))}
                        {filteredPaymentTerms.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500">No payment terms found</div>
                        )}
                      </div>
                      <div className="border-t border-gray-200">
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-sm text-left text-[#156372] hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            setIsConfigureTermsOpen(true);
                            setPaymentTermsSearchQuery("");
                            if (isPaymentTermsDropdownOpen) {
                              togglePaymentTermsDropdown();
                            }
                          }}
                        >
                          <Settings size={14} />
                          Manage Terms
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Salesperson */}
            <div className="flex items-start gap-4">
              <div className="w-[200px] pt-2">
                <label className="text-sm font-medium text-gray-700">Salesperson</label>
              </div>
              <div className="flex-1 max-w-[400px]">
                <SalespersonDropdown
                  value={formData.salesperson}
                  isOpen={isSalespersonDropdownOpen}
                  search={salespersonSearch}
                  salespersons={filteredSalespersons}
                  dropdownRef={salespersonDropdownRef as React.RefObject<HTMLDivElement>}
                  onToggle={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                  onSearchChange={setSalespersonSearch}
                  onSelect={(salesperson) => handleSalespersonSelect(salesperson)}
                  onManage={() => {
                    setIsManageSalespersonsOpen(true);
                    setIsSalespersonDropdownOpen(false);
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
              <div className="w-[200px] pt-2 flex items-center gap-1">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Info size={14} className="text-gray-400" />
              </div>
              <div className="flex-1 max-w-[600px]">
                <div className="relative">
                  <textarea
                    name="subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-none"
                    placeholder="Let your customer know what this Recurring Invoice is for"
                    value={formData.subject}
                    onChange={handleChange}
                    rows={3}
                  />
                  <Pencil size={14} className="absolute right-3 bottom-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Item Table Header & Bulk Actions */}
            <div className="flex items-center justify-between mb-4 mt-6">
              <h3 className="text-sm font-semibold text-gray-900">Item Table</h3>
              <div className="flex items-center gap-4">
                <div className="relative inline-block" ref={taxExclusiveDropdownRef}>
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 text-sm text-gray-600 font-medium transition-colors ${taxExclusiveOptions.length > 1 ? "hover:text-gray-900" : "opacity-70 cursor-not-allowed"}`}
                    onClick={() => {
                      if (taxExclusiveOptions.length > 1) {
                        setIsTaxExclusiveDropdownOpen(!isTaxExclusiveDropdownOpen);
                      }
                    }}
                  >
                    <Settings size={14} />
                    {formData.taxExclusive}
                  </button>
                  {isTaxExclusiveDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">Item Tax Preference</div>
                      <div>
                        {taxExclusiveOptions.map((option, idx) => (
                          <div
                            key={option || idx}
                            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${formData.taxExclusive === option ? "bg-[rgba(21,99,114,0.1)] text-[#156372]" : "text-gray-700"
                              }`}
                            onClick={() => {
                              setFormData(prev => {
                                const updatedItems = recalculateItemsForTaxMode(prev.items, option);
                                return calculateTotals({
                                  ...prev,
                                  taxExclusive: option,
                                  items: updatedItems
                                } as FormDataType);
                              });
                              setIsTaxExclusiveDropdownOpen(false);
                            }}
                          >
                            <span>{option}</span>
                            {formData.taxExclusive === option && <Check size={14} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={bulkActionsRef}>
                  <button
                    className="flex items-center gap-1.5 text-sm text-[#156372] hover:text-[#0D4A52] font-medium transition-colors"
                    onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                  >
                    <Check size={16} />
                    Bulk Actions
                  </button>
                  {isBulkActionsOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px] overflow-hidden">
                      <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer" onClick={() => {
                        // Logic for "Insert New Header" via Bulk Actions?
                        // Or just toggle additional info.
                        // NewQuote had "Show Additional Information".
                        setShowAdditionalInformation(!showAdditionalInformation);
                        setIsBulkActionsOpen(false);
                      }}>
                        {showAdditionalInformation ? "Hide All Additional Information" : "Show All Additional Information"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-visible min-h-0">
                  <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-700">ITEM DETAILS</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-700 w-32">QUANTITY</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-700 w-32">RATE</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-700 w-48">TAX</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-700 w-32">AMOUNT</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <React.Fragment key={item.id || index}>
                      {item.itemType === "header" ? (
                        <tr className="border-b border-gray-100 bg-gray-50/50 group">
                          <td colSpan={5} className="py-3 px-3">
                            <input
                              type="text"
                              placeholder="Header Name"
                              value={item.itemDetails}
                              onChange={(e) => handleItemChange(item.id, 'itemDetails', e.target.value)}
                              className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#156372]500 outline-none text-sm font-bold text-gray-900 transition-colors"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr className={`border-b border-gray-100 group ${openItemMenuId === item.id ? "relative z-50" : ""}`}>
                          <td className="py-2 px-3">
                            <div
                              className="relative"
                              ref={el => {
                                itemDropdownRefs.current[String(item.id)] = el;
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Type or click to select an item"
                                  value={item.itemDetails}
                                  onChange={(e) => {
                                    handleItemChange(item.id, 'itemDetails', e.target.value);
                                    setItemSearches(prev => ({ ...prev, [String(item.id)]: e.target.value }));
                                    setOpenItemDropdowns(prev => ({ ...prev, [String(item.id)]: true }));
                                  }}
                                  onFocus={() => setOpenItemDropdowns(prev => ({ ...prev, [String(item.id)]: true }))}
                                  onClick={() => setOpenItemDropdowns(prev => ({ ...prev, [String(item.id)]: true }))}
                                  className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#156372]500 outline-none text-sm text-gray-900 transition-colors placeholder-gray-400"
                                />
                              </div>
                              {item.itemSku ? (
                                <div className="mt-1 text-xs text-gray-500">
                                  SKU: {item.itemSku}
                                </div>
                              ) : null}

                              {openItemDropdowns[String(item.id)] && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
                                  {getFilteredItems(item.id).map(productItem => (
                                    <div
                                      key={productItem.id}
                                      className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${selectedItemIds[String(item.id)] === productItem.id ? "bg-[rgba(21,99,114,0.1)]" : ""}`}
                                      onClick={() => handleItemSelect(item.id, productItem)}
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{productItem.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          SKU: {productItem.sku} Rate: {formData.currency}{Number(productItem?.rate || 0).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 w-full"
                                    onClick={() => {
                                      setOpenItemDropdowns(prev => ({ ...prev, [String(item.id)]: false }));
                                      navigate("/items", { state: { showNewItem: true, returnTo: window.location.pathname } });
                                    }}
                                  >
                                    <Plus size={16} />
                                    Add New Item
                                  </button>
                                </div>
                              )}
                            </div>
                            {showAdditionalInformation && (
                              <textarea
                                className="w-full mt-2 bg-transparent border-0 border-b border-gray-200 focus:border-[#156372]500 outline-none text-xs text-gray-600 resize-none"
                                placeholder="Item description..."
                                rows={1}
                              />
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col items-end">
                              <input
                                type="number"
                                value={item.quantity ?? 0}
                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#156372]500 outline-none text-sm text-right text-gray-900 transition-colors"
                                step="0.01"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={item.rate ?? 0}
                              onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                              className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#156372]500 outline-none text-sm text-right text-gray-900 transition-colors"
                              step="0.01"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div
                              className="relative"
                              ref={el => {
                                taxDropdownRefs.current[String(item.id)] = el;
                              }}
                            >
                              {(() => {
                                const selectedTaxObj: any = findTaxOptionById(item.tax);
                                const fallbackRate = parseTaxRate((item as any).taxRate);
                                const displayLabel = selectedTaxObj
                                  ? getTaxDisplayLabel(selectedTaxObj)
                                  : (fallbackRate > 0 ? `Tax [${fallbackRate}%]` : "Select a Tax");
                                const searchValue = taxSearches[String(item.id)] || "";
                                const filteredGroups = getFilteredTaxGroups(item.id);
                                const hasTaxes = filteredGroups.length > 0;

                                return (
                                  <>
                                    <button
                                      type="button"
                                      className="w-full px-2 py-1.5 border border-gray-300 bg-white rounded outline-none text-sm text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                                      onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [String(item.id)]: !prev[String(item.id)] }))}
                                    >
                                      <span className={displayLabel === "Select a Tax" ? "text-gray-500" : "text-gray-900"}>
                                        {displayLabel}
                                      </span>
                                      <ChevronDown
                                        size={14}
                                        className={`transition-transform ${openTaxDropdowns[String(item.id)] ? "rotate-180" : ""}`}
                                        style={{ color: "#156372" }}
                                      />
                                    </button>

                                    {openTaxDropdowns[String(item.id)] && (
                                      <div className="absolute left-0 top-full z-[9999] mt-1 w-72 rounded-xl border border-[#d6dbe8] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                                        <div className="p-2">
                                          <div className="flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: "#156372" }}>
                                            <Search size={14} className="text-slate-400" />
                                            <input
                                              type="text"
                                              value={searchValue}
                                              onChange={(e) => setTaxSearches(prev => ({ ...prev, [String(item.id)]: e.target.value }))}
                                              placeholder="Search..."
                                              className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                              autoFocus
                                            />
                                          </div>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                                          {!hasTaxes ? (
                                            <div className="px-4 py-3 text-center text-[13px] text-slate-400">No taxes found</div>
                                          ) : (
                                            filteredGroups.map((group) => (
                                              <div key={group.label}>
                                                <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-700">
                                                  {group.label}
                                                </div>
                                                {group.options.map((tax) => {
                                                  const taxId = tax.id;
                                                  const label = getTaxDisplayLabel(tax as any);
                                                  const selected = String(item.tax || "") === taxId || Number(item.taxRate || 0) === Number(tax.rate || 0);
                                                  return (
                                                    <button
                                                      key={taxId}
                                                      type="button"
                                                      onClick={() => handleTaxSelect(item.id, taxId)}
                                                      className={`w-full px-4 py-2 text-left text-[13px] ${selected
                                                        ? "text-[#156372] font-medium hover:bg-gray-50 hover:text-gray-900"
                                                        : "text-slate-700 hover:bg-gray-50 hover:text-gray-900"
                                                      }`}
                                                    >
                                                      {label}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          className="w-full border-t border-gray-200 px-4 py-2 text-left text-[#156372] text-[13px] font-medium flex items-center gap-2 hover:bg-gray-50"
                                          onClick={() => {
                                            setOpenTaxDropdowns(prev => ({ ...prev, [String(item.id)]: false }));
                                            navigate("/settings/taxes/new", {
                                              state: { from: location.pathname },
                                            });
                                          }}
                                        >
                                          <Plus size={13} />
                                          New Tax
                                        </button>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-sm text-gray-900 font-medium">{formData.currency} {Number(item?.amount || 0).toFixed(2)}</span>
                          </td>
                          <td className="py-2 px-3 relative">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" ref={el => { itemMenuRefs.current[String(item.id)] = el; }}>
                              <button
                                className="p-1 text-gray-400 hover:text-[#156372] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemMenuId(openItemMenuId === item.id ? null : item.id);
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              <button
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <X size={16} />
                              </button>
                            </div>

                            {openItemMenuId === item.id && (
                              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                                <button
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  onClick={() => {
                                    handleInsertHeader(index);
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  <Grid3x3 size={14} />
                                  Insert New Header
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  onClick={() => {
                                    handleDuplicateItem(item.id);
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  <RefreshCw size={14} />
                                  Duplicate Item
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                className="flex items-center gap-2 rounded-md border border-[#d7deef] bg-[#eef3ff] px-4 py-2 text-sm font-medium text-[#1f3f79] transition-colors hover:bg-[#e7eefb]"
                onClick={handleAddItem}
              >
                <Plus size={16} />
                Add New Row
              </button>
              <button
                className="flex items-center gap-2 rounded-md border border-[#d7deef] bg-[#eef3ff] px-4 py-2 text-sm font-medium text-[#1f3f79] transition-colors hover:bg-[#e7eefb]"
                onClick={() => setIsBulkAddModalOpen(true)}
              >
                <Plus size={16} />
                Add Items in Bulk
              </button>
            </div>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_520px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">Customer Notes</label>
              <textarea
                name="customerNotes"
                className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#156372] focus:outline-none bg-white"
                value={formData.customerNotes}
                onChange={handleChange}
              />
              <p className="mt-2 text-[11px] text-gray-400">Will be displayed on the recurring invoice</p>
            </div>

            <div className="w-full rounded-xl border border-gray-200 bg-[#f3f5f8] p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">Sub Total</span>
                <span className="font-semibold text-gray-900">{Number(formData?.subTotal || 0).toFixed(2)}</span>
              </div>
              <div className="mt-3 space-y-4 border-t border-gray-200 pt-4">
                {showTransactionDiscount && (
                  <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                    <span className="text-gray-700">Discount</span>
                    <div className="flex h-9 items-center overflow-hidden rounded-md border border-gray-300 bg-white">
                      <input
                        type="number"
                        className="h-full w-full bg-transparent px-2 text-right text-xs outline-none"
                        value={formData.discount}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                      />
                      <select
                        className="h-full min-w-[46px] cursor-pointer border-l border-gray-300 bg-[#f8fafc] px-1 text-[11px] text-gray-500 outline-none"
                        value={formData.discountType}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                      >
                        <option value="percent">%</option>
                        <option value="amount">{formData.currency}</option>
                      </select>
                    </div>
                    <span className="text-right font-medium text-gray-900">
                      {(formData.discountType === "percent" ? (formData.subTotal * formData.discount / 100) : formData.discount).toFixed(2)}
                    </span>
                  </div>
                )}

                {showShippingCharges && (
                  <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-700">Shipping Charges</span>
                      <Info size={14} className="text-gray-400" />
                    </div>
                    <input
                      type="number"
                      className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-right text-xs outline-none focus:border-[#156372]"
                      value={formData.shippingCharges}
                      onChange={(e) => setFormData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="text-right font-medium text-gray-900">{(parseFloat(String(formData.shippingCharges)) || 0).toFixed(2)}</span>
                  </div>
                )}

                {showAdjustment && (
                  <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-700">Adjustment</span>
                      <Info size={14} className="text-gray-400" />
                    </div>
                    <input
                      type="number"
                      className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-right text-xs outline-none focus:border-[#156372]"
                      value={formData.adjustment}
                      onChange={(e) => setFormData(prev => ({ ...prev, adjustment: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="text-right font-medium text-gray-900">{(parseFloat(String(formData.adjustment)) || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-700">Round Off (No Rounding)</span>
                    <LinkIcon size={14} className="text-[#156372]" />
                  </div>
                  <span className="font-medium text-gray-900">{Number(formData.roundOff || 0).toFixed(2)}</span>
                </div>

                {Object.keys(taxSummary).length > 0 && (
                  <div className="space-y-2 border-t border-gray-200 pt-2">
                    {Object.entries(taxSummary).map(([taxName, amount]) => (
                      <div key={taxName} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{taxName}</span>
                        <span className="font-medium text-gray-900">{Number(amount).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1 text-sm">
                      <span className="font-semibold text-gray-700">Total Tax Amount</span>
                      <span className="font-semibold text-gray-900">{Number(totalTaxAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <span className="text-base font-bold text-gray-900">Total ({formData.currency})</span>
                  <span className="text-base font-bold text-gray-900">{Number(formData?.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-10">
            {/* Terms & Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Terms & Conditions</label>
              <textarea
                name="termsAndConditions"
                className="w-full h-28 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] bg-white"
                placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                value={formData.termsAndConditions}
                onChange={handleChange}
              />
            </div>
          </div>

          </div>

          {/* Payment Gateway */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-gray-900">
                Want to get paid faster?
              </h3>
              <Zap size={14} className="text-red-600" />
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">{formData.currency}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Configure payment gateways and receive payments online.
            </p>
            <button className="text-[#156372] hover:text-[#0D4A52] text-sm font-medium hover:underline">
              Set up Payment Gateway
            </button>
          </div>

          {/* Preferences */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Preferences</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createAsDrafts"
                className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
              />
              <label htmlFor="createAsDrafts" className="text-sm text-gray-700 cursor-pointer flex items-center gap-1">
                Create Invoices as Drafts
                <Info size={14} className="text-[#156372]" />
              </label>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">
              Additional Fields: Start adding custom fields for your recurring invoices by going to Settings ➔ Sales ➔ Recurring Invoices.
            </p>
          </div>
        </div>
      </div >

      {/* Documents Modal */}
      {isDocumentsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Choose from Documents</h2>
                <p className="text-xs text-gray-500 mt-1">Select files to attach to this recurring invoice</p>
              </div>
              <button
                onClick={() => setIsDocumentsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your documents..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                  value={documentSearch}
                  onChange={e => setDocumentSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredDocuments.map((doc, index) => (
                <div
                  key={doc.id || index}
                  onClick={() => {
                    if (selectedDocuments.includes(doc.id)) setSelectedDocuments(p => p.filter(id => id !== doc.id));
                    else setSelectedDocuments(p => [...p, doc.id]);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedDocuments.includes(doc.id) ? 'bg-[rgba(21,99,114,0.1)] border-[#156372]200' : 'bg-white border-gray-100 hover:border-[#156372]100'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><FileText size={20} /></div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{doc.name}</div>
                      <div className="text-xs text-gray-500">{doc.size} • Uploaded by {doc.uploadedBy} on {doc.uploadedOn}</div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedDocuments.includes(doc.id) ? 'bg-[#156372] border-[#156372]600' : 'border-gray-200 group-hover:border-[#156372]400'}`}>
                    {selectedDocuments.includes(doc.id) && <Check size={14} className="text-white" />}
                  </div>
                </div>
              ))}
              {filteredDocuments.length === 0 && (
                <div className="py-20 text-center space-y-2">
                  <div className="flex justify-center text-gray-300"><Search size={48} /></div>
                  <p className="text-gray-500 text-sm">No documents found matching your search</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="text-sm font-medium text-gray-700">
                {selectedDocuments.length} files selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDocumentsModalOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const selected = documents.filter(d => selectedDocuments.includes(d.id));
                    setFormData(p => ({
                      ...p,
                      attachedFiles: [...(p.attachedFiles || []), ...selected]
                    }));
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                  }}
                  className="px-6 py-2 bg-[#156372] text-white rounded-lg text-sm font-bold shadow-lg shadow-[rgba(21,99,114,0.2)] hover:bg-[#0D4A52] transition-all disabled:opacity-50"
                  disabled={selectedDocuments.length === 0}
                >
                  Attach Selected Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick New Customer Modal */}
      {typeof document !== "undefined" && document.body && createPortal(
        <div
          className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
          onClick={() => {
            setIsNewCustomerQuickActionOpen(false);
            reloadCustomersForRecurring();
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1400px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Customer (Quick Action)</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isReloadingCustomerFrame || isAutoSelectingCustomerFromQuickAction}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => {
                    setIsReloadingCustomerFrame(true);
                    setCustomerQuickActionFrameKey(prev => prev + 1);
                  }}
                >
                  {isReloadingCustomerFrame ? "Reloading..." : "Reload Form"}
                </button>
                <button
                  type="button"
                  disabled={isRefreshingCustomersQuickAction || isAutoSelectingCustomerFromQuickAction}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={async () => {
                    setIsRefreshingCustomersQuickAction(true);
                    await reloadCustomersForRecurring();
                    setIsRefreshingCustomersQuickAction(false);
                  }}
                >
                  {isRefreshingCustomersQuickAction ? "Refreshing..." : "Refresh Customers"}
                </button>
              </div>
              <button
                type="button"
                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                onClick={() => {
                  setIsNewCustomerQuickActionOpen(false);
                  reloadCustomersForRecurring();
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-2 bg-gray-100">
              <iframe
                key={customerQuickActionFrameKey}
                title="New Customer Quick Action"
                src="/sales/customers/new?embed=1"
                loading="eager"
                onLoad={async () => {
                  if (isReloadingCustomerFrame) {
                    setIsReloadingCustomerFrame(false);
                  }
                  await tryAutoSelectNewCustomerFromQuickAction();
                }}
                className="w-full h-full bg-white rounded border border-gray-200"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick New Salesperson Modal */}
      {typeof document !== "undefined" && document.body && createPortal(
        <div
          className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewSalespersonQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
          onClick={handleCancelNewSalesperson}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Salesperson</h2>
              <button
                type="button"
                onClick={handleCancelNewSalesperson}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={newSalespersonData.name}
                    onChange={handleNewSalespersonChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newSalespersonData.email}
                    onChange={handleNewSalespersonChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    placeholder="Enter email"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAndSelectSalesperson}
                    disabled={isSavingNewSalesperson}
                    className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingNewSalesperson ? "Saving..." : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelNewSalesperson}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Associate Projects Modal */}
      {isProjectsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-start justify-center px-4 pt-12 pb-6 overflow-y-auto" onClick={handleCancelProjectsModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-xl font-medium text-gray-700">Active Projects</h2>
              <button
                type="button"
                onClick={handleCancelProjectsModal}
                className="w-6 h-6 border border-[#3b82f6] text-[#ef4444] rounded flex items-center justify-center hover:bg-gray-50"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-[280px] overflow-y-auto">
              <div className="grid grid-cols-[40px_1fr] gap-3 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <div></div>
                <div>Project Details</div>
              </div>
              {customerProjects.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">No active projects found.</div>
              ) : (
                customerProjects.map((project) => {
                  const projectId = resolveEntityId(project);
                  const isChecked = pendingProjectIds.includes(projectId);
                  return (
                    <div
                      key={projectId}
                      className="grid grid-cols-[40px_1fr] gap-3 px-4 py-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleTogglePendingProject(projectId)}
                    >
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePendingProject(projectId)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 border-gray-300 rounded text-[#156372] focus:ring-[#156372]"
                        />
                      </div>
                      <div>
                        <div className="text-sm text-gray-800">{getProjectLabel(project) || "Untitled Project"}</div>
                        <div className="text-xs text-gray-500">{project.description || "Single Line For The Project"}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200">
              <button
                type="button"
                className="px-4 py-2 bg-[#156372] text-white rounded text-sm font-medium hover:bg-[#0D4A52]"
                onClick={handleAddSelectedProjects}
              >
                Add
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                onClick={handleCancelProjectsModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Footer */}
      <div className="mt-6 bg-white border-t border-gray-200 p-4">
        <div className="w-full flex items-center justify-start gap-3 px-6">
          <button
            onClick={handleSaveAndSend}
            disabled={saveLoading}
            className={`px-6 py-2 bg-[#0A5A32] text-white rounded-md text-sm font-medium cursor-pointer transition-all shadow-sm flex items-center gap-2 ${saveLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-[#084629]"}`}
          >
            {saveLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {saveLoading ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Manage Salespersons Modal */}
      {
        isManageSalespersonsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setIsManageSalespersonsOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Manage Salespersons</h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900"
                  onClick={() => setIsManageSalespersonsOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Salesperson"
                    value={manageSalespersonSearch}
                    onChange={(e) => setManageSalespersonSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                  />
                </div>
                <button
                  className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52] flex items-center gap-2"
                  onClick={() => {
                    setIsManageSalespersonsOpen(false);
                    openSalespersonQuickAction();
                  }}
                >
                  <Plus size={16} />
                  New Salesperson
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 grid grid-cols-[50px_1fr_1fr] gap-4 p-3">
                    <div>
                      <input type="checkbox" className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]" />
                    </div>
                    <div className="text-xs font-semibold text-gray-700 uppercase">SALESPERSON NAME</div>
                    <div className="text-xs font-semibold text-gray-700 uppercase">EMAIL</div>
                  </div>
                  <div>
                    {filteredManageSalespersons.map((salesperson, index) => (
                      <div key={salesperson.id || index} className="grid grid-cols-[50px_1fr_1fr] gap-4 p-3 border-b border-gray-200 hover:bg-gray-50">
                        <div>
                          <input type="checkbox" className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]" />
                        </div>
                        <div className="text-sm text-gray-900">{salesperson.name}</div>
                        <div className="text-sm text-gray-900">{salesperson.email || ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Items in Bulk Modal */}
      {
        isBulkAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center" onClick={handleCancelBulkAdd}>
            <div className="bg-white rounded-b-lg shadow-xl max-w-4xl w-[calc(100vw-2rem)] mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Add Items in Bulk</h2>
                <button
                  className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={handleCancelBulkAdd}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-4 p-6">
                {/* Left Pane - Item Search and List */}
                <div className="flex-1 flex flex-col border-r border-gray-200 pr-4">
                  <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md mb-4">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Type to search or scan the barcode of the item."
                      value={bulkAddSearch}
                      onChange={(e) => setBulkAddSearch(e.target.value)}
                      className="flex-1 outline-none text-sm text-gray-700"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {getBulkFilteredItems().map((item, index) => {
                      const isSelected = bulkSelectedItems.find(selected => selected.id === item.id);
                      return (
                        <div
                          key={item.id || index}
                          className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between ${isSelected ? "bg-[rgba(21,99,114,0.1)]" : ""
                            }`}
                          onClick={() => handleBulkItemToggle(item)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {item.sku} Rate: {formData.currency}{Number(item?.rate || 0).toFixed(2)}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-2 w-6 h-6 bg-[#156372] rounded-full flex items-center justify-center">
                              <Check size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Pane - Selected Items */}
                <div className="w-80 flex-shrink-0 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-700">Selected Items</span>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                        {bulkSelectedItems.length}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Quantity: {bulkSelectedItems.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {bulkSelectedItems.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-8">
                        Click the item names from the left pane to select them.
                      </div>
                    ) : (
                      bulkSelectedItems.map((selectedItem, index) => (
                        <div key={selectedItem.id || index} className="p-3 bg-gray-50 rounded border border-gray-200 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{selectedItem.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {selectedItem.sku} • {formData.currency}{Number(selectedItem?.rate || 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={selectedItem.quantity || 1}
                              onChange={(e) => handleBulkItemQuantityChange(String(selectedItem.id ?? selectedItem.sku ?? index), e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBulkItemToggle(selectedItem);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52] disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleAddBulkItems}
                  disabled={bulkSelectedItems.length === 0}
                >
                  Add Items
                </button>
                <button
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                  onClick={handleCancelBulkAdd}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* New Tax Modal */}
      {
        isNewTaxModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleCancelNewTax}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">New Tax</h2>
                <button
                  className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={handleCancelNewTax}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Tax Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Name<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    placeholder="Enter tax name"
                    value={newTaxData.name}
                    onChange={(e) => setNewTaxData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* Rate (%) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate (%)<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      placeholder="0"
                      value={newTaxData.rate}
                      onChange={(e) => setNewTaxData(prev => ({ ...prev, rate: e.target.value }))}
                      step="0.01"
                      min="0"
                    />
                    <span className="absolute right-3 text-gray-500 text-sm">%</span>
                  </div>
                </div>

                {/* Compound Tax Checkbox */}
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="compoundTax"
                      checked={newTaxData.isCompound}
                      onChange={(e) => setNewTaxData(prev => ({ ...prev, isCompound: e.target.checked }))}
                      className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                    />
                    <label htmlFor="compoundTax" className="text-sm text-gray-700 cursor-pointer flex items-center gap-1">
                      This tax is a compound tax.
                      <Info size={14} className="text-gray-400" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-6 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-all"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.opacity = "0.9" }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.opacity = "1" }}
                  onClick={handleSaveNewTax}
                >
                  Save
                </button>
                <button
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                  onClick={handleCancelNewTax}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Choose from Documents Modal */}
      {isDocumentsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[640px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Choose from Documents</h2>
                <p className="text-sm text-gray-500 mt-1">Select files from your document library</p>
              </div>
              <button
                onClick={() => setIsDocumentsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar - Inbox Types */}
              <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-1">
                {[
                  { id: "files", label: "Files", icon: Grid3x3 },
                  { id: "bank-statements", label: "Bank Statements", icon: FileText },
                  { id: "all-documents", label: "All Documents", icon: Zap }
                ].map((inbox, index) => (
                  <button
                    key={inbox.id || index}
                    onClick={() => setSelectedInbox(inbox.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${selectedInbox === inbox.id
                      ? "bg-[#156372] text-white shadow-lg shadow-[rgba(21,99,114,0.2)]"
                      : "text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    <inbox.icon size={18} />
                    {inbox.label}
                  </button>
                ))}
              </div>

              {/* Main Documents List */}
              <div className="flex-1 flex flex-col bg-white">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search documents by name..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:bg-white transition-all"
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(() => {
                    let filteredDocs = availableDocuments;
                    if (selectedInbox === "files") {
                      filteredDocs = availableDocuments.filter(doc => doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder);
                    } else if (selectedInbox === "bank-statements") {
                      filteredDocs = availableDocuments.filter(doc => doc.folder === "Bank Statements" || doc.module === "Banking");
                    }
                    if (documentSearch) {
                      filteredDocs = filteredDocs.filter(doc => doc.name.toLowerCase().includes(documentSearch.toLowerCase()));
                    }

                    if (filteredDocs.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Zap size={32} className="text-gray-300" />
                          </div>
                          <p className="text-gray-500 font-medium font-sans">No documents found matching your criteria.</p>
                        </div>
                      );
                    }

                    return filteredDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          if (selectedDocuments.includes(doc.id)) {
                            setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                          } else {
                            setSelectedDocuments([...selectedDocuments, doc.id]);
                          }
                        }}
                        className={`group p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedDocuments.includes(doc.id)
                          ? "border-[#156372]500 bg-[rgba(21,99,114,0.1)]/50"
                          : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${selectedDocuments.includes(doc.id) ? 'bg-[#156372] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-white'}`}>
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 truncate max-w-[300px]">{doc.name}</div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              <span>{doc.size}</span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full" />
                              <span>{doc.uploadedOn || "Me"}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedDocuments.includes(doc.id)
                          ? "bg-[#156372] border-[#156372]600 text-white"
                          : "border-gray-300 group-hover:border-[#156372]400"
                          }`}>
                          {selectedDocuments.includes(doc.id) && <Check size={14} />}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => setIsDocumentsModalOpen(false)}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDocuments.length > 0) {
                    const selectedDocs = availableDocuments.filter(doc => selectedDocuments.includes(doc.id)).map(doc => ({
                      id: doc.id,
                      name: doc.name,
                      size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                      file: null,
                      documentId: doc.id
                    }));
                    setFormData(prev => ({ ...prev, documents: [...prev.documents, ...selectedDocs] }));
                  }
                  setIsDocumentsModalOpen(false);
                  setSelectedDocuments([]);
                }}
                disabled={selectedDocuments.length === 0}
                className="px-8 py-2.5 bg-[#156372] text-white rounded-xl text-sm font-bold hover:bg-[#0D4A52] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[rgba(21,99,114,0.2)] transition-all cursor-pointer"
              >
                Attach {selectedDocuments.length > 0 ? `(${selectedDocuments.length}) ` : ""}Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Picker Modal */}
      {isCloudPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[640px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 font-sans">Cloud Picker</h2>
              <button
                onClick={() => setIsCloudPickerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar - Cloud Providers */}
              <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  {[
                    { id: 'zoho', name: 'Zoho WorkDrive' },
                    { id: 'gdrive', name: 'Google Drive' },
                    { id: 'dropbox', name: 'Dropbox' },
                    { id: 'box', name: 'Box' },
                    { id: 'onedrive', name: 'OneDrive' },
                    { id: 'evernote', name: 'Evernote' }
                  ].map((provider, index) => (
                    <button
                      key={provider.id || index}
                      onClick={() => setSelectedCloudProvider(provider.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${selectedCloudProvider === provider.id
                        ? 'bg-[#156372] text-white shadow-lg shadow-[rgba(21,99,114,0.2)]'
                        : 'text-slate-600 hover:bg-white hover:shadow-sm'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${selectedCloudProvider === provider.id ? 'bg-white' : 'bg-slate-300'}`} />
                      {provider.name}
                    </button>
                  ))}
                </div>

                {/* Team Info / Help */}
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[rgba(21,99,114,0.1)] flex items-center justify-center">
                      <Zap size={14} className="text-[#156372]" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Pro Tip</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Connect your team's shared cloud storage to collaborate faster on invoices.
                  </p>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                {selectedCloudProvider === "gdrive" ? (
                  /* Google Drive Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* Google Drive Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32">
                        {/* Google Drive Triangle Logo */}
                        <svg viewBox="0 0 256 256" className="w-full h-full">
                          {/* Green triangle */}
                          <path
                            d="M128 32L32 128l96 96V32z"
                            fill="#0F9D58"
                          />
                          {/* Blue triangle */}
                          <path
                            d="M128 32l96 96-96 96V32z"
                            fill="#4285F4"
                          />
                          {/* Yellow triangle */}
                          <path
                            d="M32 128l96 96V128L32 32v96z"
                            fill="#F4B400"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho. The use and transfer of information received from Google APIs to Zoho will adhere to{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          Google API Services User Data Policy
                        </a>
                        , including the{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          Limited Use Requirements
                        </a>
                        .
                      </p>
                    </div>

                    {/* Authenticate Google Button */}
                    <button
                      className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://accounts.google.com/v3/signin/accountchooser",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate Google
                    </button>
                  </div>
                ) : selectedCloudProvider === "dropbox" ? (
                  /* Dropbox Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* Dropbox Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg viewBox="0 0 128 128" className="w-full h-full">
                          <defs>
                            <linearGradient id="dropboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0061FF" />
                              <stop offset="100%" stopColor="#0052CC" />
                            </linearGradient>
                          </defs>
                          <g fill="url(#dropboxGradient)">
                            <rect x="8" y="8" width="48" height="48" rx="4" />
                            <rect x="72" y="8" width="48" height="48" rx="4" />
                            <rect x="8" y="72" width="48" height="48" rx="4" />
                            <rect x="72" y="72" width="48" height="48" rx="4" />
                          </g>
                        </svg>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho.
                      </p>
                    </div>

                    {/* Authenticate Dropbox Button */}
                    <button
                      className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://www.dropbox.com/oauth2/authorize",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate Dropbox
                    </button>
                  </div>
                ) : selectedCloudProvider === "box" ? (
                  /* Box Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* Box Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gray-100 rounded-full transform scale-110"></div>
                          <div className="relative w-24 h-24 bg-[#0061D5] rounded-lg flex items-center justify-center">
                            <span className="text-white text-4xl font-bold">b</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho.
                      </p>
                    </div>

                    {/* Authenticate Box Button */}
                    <button
                      className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://account.box.com/api/oauth2/authorize",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate Box
                    </button>
                  </div>
                ) : selectedCloudProvider === "onedrive" ? (
                  /* OneDrive Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* OneDrive Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="relative">
                          <Cloud size={128} className="text-[#0078D4]" fill="#0078D4" strokeWidth={0} />
                        </div>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho.
                      </p>
                    </div>

                    {/* Authenticate OneDrive Button */}
                    <button
                      className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate OneDrive
                    </button>
                  </div>
                ) : selectedCloudProvider === "zoho" || selectedCloudProvider === "gdrive" || selectedCloudProvider === "dropbox" || selectedCloudProvider === "box" ? (
                  /* Functional Cloud Picker Content */
                  <div className="w-full flex-1 overflow-hidden flex flex-col">
                    {/* Search bar inside picker */}
                    <div className="mb-4 relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder={`Search in ${selectedCloudProvider}...`}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-[#156372]500 transition-all font-medium text-slate-700"
                        value={cloudSearchQuery}
                        onChange={(e) => setCloudSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <div className="flex border-b border-gray-100 pb-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                        <div className="w-[60%]">File Name</div>
                        <div className="w-[20%] text-right">Size</div>
                        <div className="w-[20%] text-right">Modified</div>
                      </div>
                      <div className="space-y-1">
                        {[
                          { id: 'cf1', name: 'Contract_Draft.pdf', size: 1048576, modified: '2 days ago', type: 'pdf' },
                          { id: 'cf2', name: 'Identity_Proof.jpg', size: 2097152, modified: 'Yesterday', type: 'image' },
                          { id: 'cf3', name: 'Tax_Exemption_Form.pdf', size: 524288, modified: '1 week ago', type: 'pdf' },
                          { id: 'cf4', name: 'Company_Logo_HighRes.png', size: 4194304, modified: '3 hours ago', type: 'image' },
                          { id: 'cf5', name: 'Previous_Invoices_Bundle.zip', size: 8388608, modified: 'May 12, 2025', type: 'zip' },
                        ]
                          .filter(f => f.name.toLowerCase().includes(cloudSearchQuery.toLowerCase()))
                          .map((file, index) => (
                            <div
                              key={file.id || index}
                              onClick={() => {
                                if (selectedCloudFiles.find(sf => sf.id === file.id)) {
                                  setSelectedCloudFiles(selectedCloudFiles.filter(sf => sf.id !== file.id));
                                } else {
                                  setSelectedCloudFiles([...selectedCloudFiles, file]);
                                }
                              }}
                              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${selectedCloudFiles.find(sf => sf.id === file.id)
                                ? 'bg-[rgba(21,99,114,0.1)] border-[#156372]200'
                                : 'bg-white border-transparent hover:bg-slate-50'
                                }`}
                            >
                              <div className="w-[60%] flex items-center gap-3">
                                <div className={`w-8 h-8 rounded flex items-center justify-center ${selectedCloudFiles.find(sf => sf.id === file.id) ? 'bg-blue-100 text-[#156372]' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                  <FileText size={16} />
                                </div>
                                <span className="text-[14px] font-medium text-slate-700">{file.name}</span>
                              </div>
                              <div className="w-[20%] text-right text-xs text-slate-500">{Number((file?.size || 0) / 1024 / 1024).toFixed(1)} MB</div>
                              <div className="w-[20%] text-right text-xs text-slate-500">{file.modified}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : selectedCloudProvider === "evernote" ? (
                  /* Evernote Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* Evernote Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="relative w-32 h-32 bg-[#00A82D] rounded-lg flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 100 100" className="w-20 h-20">
                            <path
                              d="M 50 15 Q 25 15 15 35 Q 10 45 10 60 Q 10 75 20 85 Q 15 80 15 70 Q 15 60 25 55 Q 20 50 20 40 Q 20 30 30 30 Q 35 25 40 30 Q 45 25 50 30 Q 55 25 60 30 Q 65 25 70 30 Q 75 30 75 40 Q 75 50 70 55 Q 80 60 80 70 Q 80 80 75 85 Q 85 75 85 60 Q 85 45 80 35 Q 70 15 50 15 Z"
                              fill="#2D2926"
                            />
                            <ellipse cx="20" cy="50" rx="8" ry="15" fill="#2D2926" />
                            <path
                              d="M 40 40 Q 35 45 35 50 Q 35 55 40 60"
                              stroke="#2D2926"
                              strokeWidth="2.5"
                              fill="none"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-[#156372] underline hover:text-[#0D4A52]"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho.
                      </p>
                    </div>

                    {/* Authenticate Evernote Button */}
                    <button
                      className="px-8 py-3 bg-[#00A82D] text-white rounded-md text-sm font-semibold hover:bg-[#008A24] transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://accounts.evernote.com/login",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate Evernote
                    </button>
                  </div>
                ) : (
                  /* Default Content for Zoho WorkDrive */
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                      <div className="relative w-full h-full">
                        <div className="absolute inset-0 flex items-end justify-center">
                          <div className="relative">
                            <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2"></div>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                              <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                                <Plus size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                              <div className="w-8 h-6 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                          <div className="relative ml-8">
                            <div className="w-20 h-28 bg-purple-300 rounded-lg mb-2"></div>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                              <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center">
                                <Plus size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                              <div className="text-2xl font-bold text-purple-600">A</div>
                            </div>
                          </div>
                          <div className="relative ml-8">
                            <div className="w-20 h-28 bg-pink-300 rounded-lg mb-2"></div>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                              <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
                                <Plus size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                              <div className="space-y-1">
                                <div className="w-12 h-1 bg-pink-600 rounded"></div>
                                <div className="w-10 h-1 bg-pink-600 rounded"></div>
                                <div className="w-8 h-1 bg-pink-600 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="absolute top-12 right-12 w-4 h-4 bg-blue-400 transform rotate-45"></div>
                        <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                        <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                      Zoho WorkDrive is an online file sync, storage and content collaboration platform.
                    </p>

                    <button
                      className="px-6 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://workdrive.zoho.com",
                          "_blank"
                        );
                      }}
                    >
                      Set up your team
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsCloudPickerOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedCloudFiles.length > 0) {
                    const newFiles = selectedCloudFiles.map(f => ({
                      id: Date.now() + Math.random(),
                      name: f.name,
                      size: f.size,
                      isCloud: true,
                      provider: selectedCloudProvider
                    }));
                    setFormData(prev => ({
                      ...prev,
                      documents: [...prev.documents, ...newFiles]
                    }));
                  }
                  setIsCloudPickerOpen(false);
                  setSelectedCloudFiles([]);
                }}
                className={`px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52] transition-colors ${selectedCloudFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={selectedCloudFiles.length === 0}
              >
                Attach ({selectedCloudFiles.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfigurePaymentTermsModal
        isOpen={isConfigureTermsOpen}
        onClose={() => setIsConfigureTermsOpen(false)}
        initialTerms={paymentTerms}
        onSave={(terms) => {
          const sanitizedTerms = terms.filter((term) => term.label?.trim());
          const finalTerms = sanitizedTerms.length > 0 ? sanitizedTerms : defaultPaymentTerms;
          setPaymentTerms(finalTerms);

          const currentStillExists = finalTerms.some((term) => term.value === formData.paymentTerms);
          if (!currentStillExists) {
            const fallbackTerm = finalTerms.find((term) => term.isDefault) || finalTerms[0];
            const fallbackValue = fallbackTerm?.value || "Due on Receipt";
            setFormData((prev) => ({
              ...prev,
              paymentTerms: fallbackValue
            }));
          }
        }}
      />

      {/* Advanced Customer Search Modal */}
      {customerSearchModalOpen && typeof document !== 'undefined' && document.body && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setCustomerSearchModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Advanced Customer Search</h2>
              <button
                type="button"
                onClick={() => setCustomerSearchModalOpen(false)}
                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center hover:bg-[#0D4A52]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCustomerSearchCriteriaOpen(!customerSearchCriteriaOpen)}
                    className="px-4 py-2 border border-gray-300 rounded-l-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    {customerSearchCriteria}
                    <ChevronDown size={16} />
                  </button>
                  {customerSearchCriteriaOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px]">
                      {["Display Name", "Email", "Company Name", "Phone"].map((criteria, index) => (
                        <button
                          key={criteria || index}
                          type="button"
                          onClick={() => {
                            setCustomerSearchCriteria(criteria);
                            setCustomerSearchCriteriaOpen(false);
                          }}
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-600 hover:text-white"
                        >
                          {criteria}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomerSearch()}
                  placeholder="Enter search term"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCustomerSearch}
                  className="px-6 py-2 bg-[#156372] text-white rounded-md hover:bg-[#0D4A52] font-medium"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">CUSTOMER NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">COMPANY NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PHONE</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerPaginatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        {customerSearchTerm ? "No customers found" : "Enter a search term and click Search"}
                      </td>
                    </tr>
                  ) : (
                    customerPaginatedResults.map((customer, index) => (
                      <tr
                        key={customer.id || customer.name || index}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          handleCustomerSelect(customer);
                          setCustomerSearchModalOpen(false);
                          setCustomerSearchTerm("");
                          setCustomerSearchResults([]);
                        }}
                      >
                        <td className="px-4 py-3 text-sm text-[#156372] hover:underline">
                          {customer.displayName || customer.name || ""}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{customer.email || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{customer.companyName || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{customer.workPhone || customer.mobile || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {customerSearchResults.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerSearchPage(prev => Math.max(1, prev - 1))}
                    disabled={customerSearchPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    &lt;
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {customerStartIndex + 1} - {Math.min(customerEndIndex, customerSearchResults.length)} of {customerSearchResults.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomerSearchPage(prev => Math.min(customerTotalPages, prev + 1))}
                    disabled={customerSearchPage >= customerTotalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
