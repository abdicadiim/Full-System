import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  X,
  Search,
  ChevronDown,
  Plus,
  Settings,
  Trash2,
  Check,
  Edit2,
  Printer,
  FileText,
  Calendar,
  GripVertical,
  Info,
  Paperclip,
  Upload,
  MoreVertical,
  Cloud,
  Zap,
  ScanLine,
  CheckSquare,
  Copy,
  Grid3x3,
  PlusCircle,
  Image as ImageIcon,
  Loader2,
  Tag
} from "lucide-react";
import {
  getCustomers,
  getTaxes,
  saveCreditNote,
  updateCreditNote,
  getCreditNoteById,
  getSalespersons,
  saveSalesperson,
  getInvoiceById,
  Customer,
  Tax,
  CreditNote,
  AttachedFile
} from "../../salesModel";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { customersAPI, salespersonsAPI, itemsAPI, taxesAPI, currenciesAPI, creditNotesAPI, reportingTagsAPI, locationsAPI } from "../../../../services/api";
import { API_BASE_URL, getToken } from "../../../../services/auth";

const accountCategories = {
  "Other Current Asset": [
    "Advance Tax",
    "Employee Advance",
    "Goods In Transit",
    "Prepaid Expenses",
    "Retention Receivable"
  ],
  "Fixed Asset": [
    "Furniture and Equipment"
  ],
  "Other Current Liability": [
    "Employee Reimbursements",
    "Opening Balance Adjustments",
    "Retention Payable",
    "Unearned Revenue"
  ],
  "Equity": [
    "Drawings",
    "Opening Balance Offset",
    "Owner's Equity"
  ],
  "Income": [
    "Discount",
    "General Income",
    "Interest Income",
    "Late Fee Income",
    "Other Charges",
    "Sales",
    "Shipping Charge"
  ],
  "Expense": [
    "Advertising And Marketing",
    "Automobile Expense",
    "Bad Debt",
    "Bank Fees and Charges",
    "Consultant Expense",
    "Credit Card Charges",
    "Depreciation Expense",
    "IT and Internet Expenses",
    "Janitorial Expense",
    "Lodging",
    "Meals and Entertainment",
    "Office Supplies",
    "Other Expenses",
    "Postage",
    "Printing and Stationery",
    "Purchase Discounts",
    "Rent Expense",
    "Repairs and Maintenance",
    "Salaries and Employee Wages",
    "sdff",
    "Telephone Expense",
    "Travel Expense",
    "Uncategorized"
  ],
  "Cost Of Goods Sold": [
    "Cost of Goods Sold"
  ]
} as const;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CreditNoteDocument {
  id: number;
  name: string;
  size: number;
  file?: File | null;
  isCloud?: boolean;
  provider?: string;
}

interface CreditNoteItem {
  id: number;
  itemId?: string;
  itemDetails: string;
  account?: string;
  quantity: number;
  rate: number;
  tax: string;
  amount: number;
  stockOnHand?: number;
  reportingTags?: Array<{ tagId: string; value: string; name?: string }>;
}

const sanitizeCreditNotePrefix = (value: string) => value.replace(/\d/g, "").slice(0, 10);
const extractCreditNoteDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);
const buildCreditNoteNumber = (prefix: string, nextNumber: string) => `${prefix}${nextNumber}`;
const normalizeReportingTagOptions = (tag: any): string[] => {
  const rawOptions = Array.isArray(tag?.options) ? tag.options
    : Array.isArray(tag?.values) ? tag.values
      : Array.isArray(tag?.tagValues) ? tag.tagValues
        : Array.isArray(tag?.choices) ? tag.choices
          : [];
  return Array.from(new Set(rawOptions
    .map((option: any) => {
      if (typeof option === "string") return option.trim();
      if (option && typeof option === "object") {
        return String(option.value ?? option.name ?? option.option ?? option.title ?? "").trim();
      }
      return "";
    })
    .filter(Boolean)));
};
const normalizeReportingTagAppliesTo = (tag: any): string[] => {
  const rawAppliesTo = Array.isArray(tag?.appliesTo)
    ? tag.appliesTo
    : Array.isArray(tag?.modules)
      ? tag.modules
      : Array.isArray(tag?.moduleNames)
        ? tag.moduleNames
        : Array.isArray(tag?.entities)
          ? tag.entities
          : [];
  return rawAppliesTo
    .map((value: any) => String(value || "").toLowerCase().trim())
    .filter(Boolean);
};
const resolveItemAccount = (item: any): string => {
  const direct = item?.account || item?.accountName || item?.incomeAccount || item?.incomeAccountName;
  if (direct) return String(direct);
  const salesAccount = item?.salesAccount;
  if (salesAccount) {
    if (typeof salesAccount === "string") return salesAccount;
    return String(salesAccount?.name || salesAccount?.accountName || "");
  }
  return "";
};
const resolveItemTaxId = (item: any, taxOptions: any[]): string => {
  const rawArray = item?.taxs || item?.taxes || item?.tax_ids;
  if (Array.isArray(rawArray) && rawArray.length > 0) {
    const first = rawArray[0];
    if (typeof first === "string" || typeof first === "number") return String(first);
    const firstId = first?.id || first?._id || first?.taxId || first?.tax_id;
    if (firstId) return String(firstId);
    const firstName = first?.name || first?.label;
    if (firstName) {
      const match = taxOptions.find((t) => String(t?.name || "").toLowerCase() === String(firstName).toLowerCase());
      if (match) return String(match.id);
    }
  }

  const raw = item?.taxId || item?.tax || item?.taxRateId || item?.salesTaxId || item?.tax_id || item?.taxs || item?.taxes;
  if (raw !== undefined && raw !== null && raw !== "") {
    const rawStr = String(raw).trim();
    const idMatch = taxOptions.find((t) => String(t?.id) === rawStr);
    if (idMatch) return String(idMatch.id);
    const cleanedName = rawStr.toLowerCase().replace(/\[.*?\]/g, "").trim();
    const nameMatch = taxOptions.find((t) => {
      const tName = String(t?.name || "").toLowerCase().trim();
      return tName === rawStr.toLowerCase() || tName === cleanedName || tName.includes(cleanedName);
    });
    if (nameMatch) return String(nameMatch.id);
    const percentMatch = rawStr.match(/(\d+(\.\d+)?)/);
    if (percentMatch) {
      const rateVal = Number(percentMatch[1]);
      const byRate = taxOptions.find((t) => Math.abs(Number(t?.rate || 0) - rateVal) < 0.0001);
      if (byRate) return String(byRate.id);
    }
  }
  const numericRate = item?.taxRate || item?.tax_rate || item?.taxPercent || item?.tax_percentage || item?.percentage;
  if (numericRate !== undefined && numericRate !== null && numericRate !== "") {
    const rateVal = Number(numericRate);
    const byRate = taxOptions.find((t) => Math.abs(Number(t?.rate || 0) - rateVal) < 0.0001);
    if (byRate) return String(byRate.id);
  }
  const taxObj = item?.taxRate || item?.tax_rate || item?.taxInfo;
  if (taxObj) {
    const byId = taxObj?.id || taxObj?._id || taxObj?.taxId;
    if (byId) return String(byId);
    const byName = taxObj?.name || taxObj?.label;
    if (byName) {
      const match = taxOptions.find((t) => String(t?.name || "").toLowerCase() === String(byName).toLowerCase());
      if (match) return String(match.id);
    }
  }
  const taxName = item?.taxName || item?.tax_label || item?.taxNameDisplay || item?.taxDisplayName;
  if (taxName) {
    const cleanedName = String(taxName).toLowerCase().replace(/\[.*?\]/g, "").trim();
    const match = taxOptions.find((t) => {
      const tName = String(t?.name || "").toLowerCase().trim();
      return tName === String(taxName).toLowerCase().trim() || tName === cleanedName || tName.includes(cleanedName);
    });
    if (match) return String(match.id);
    const percentMatch = String(taxName).match(/(\d+(\.\d+)?)/);
    if (percentMatch) {
      const rateVal = Number(percentMatch[1]);
      const byRate = taxOptions.find((t) => Math.abs(Number(t?.rate || 0) - rateVal) < 0.0001);
      if (byRate) return String(byRate.id);
    }
  }
  return "";
};

export default function NewCreditNote() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;
  const clonedDataFromState = location.state?.clonedData || null;

  const [formData, setFormData] = useState({
    customerName: "",
    creditNoteNumber: "CN-00001",
    referenceNumber: "",
    creditNoteDate: "29 Dec 2025",
    accountsReceivable: "Accounts Receivable",
    salesperson: "",
    subject: "",
    items: [{ id: Date.now(), itemDetails: "", account: "", quantity: 1, rate: 0, tax: "", amount: 0, reportingTags: [] }] as CreditNoteItem[],
    subTotal: 0,
    discount: 0,
    discountType: "percent",
    shippingCharges: 0,
    adjustment: 0,
    total: 0,
    currency: "",
    customerNotes: "",
    termsAndConditions: "",
    documents: [] as CreditNoteDocument[]
  });
  const hasAppliedCloneRef = useRef(false);
  const [saveLoading, setSaveLoading] = useState<null | "draft" | "open">(null);
  const [enabledSettings, setEnabledSettings] = useState<any>(null);
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";
  const showShippingCharges = enabledSettings?.chargeSettings?.shippingCharges !== false;
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const initialCreditNoteDigits = extractCreditNoteDigits("CN-00001") || "00001";
  const [isCreditNoteNumberModalOpen, setIsCreditNoteNumberModalOpen] = useState(false);
  const [creditNoteNumberMode, setCreditNoteNumberMode] = useState<"auto" | "manual">("auto");
  const [creditNotePrefix, setCreditNotePrefix] = useState("CN-");
  const [creditNoteNextNumber, setCreditNoteNextNumber] = useState(initialCreditNoteDigits);
  const [warehouseLocation, setWarehouseLocation] = useState("Head Office");
  const [priceList, setPriceList] = useState("");
  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
  const normalizedReportingTags = useMemo(
    () =>
      (Array.isArray(availableReportingTags) ? availableReportingTags : []).map((tag: any, index: number) => ({
        ...tag,
        key: String(tag?.id || tag?._id || tag?.name || tag?.title || `reporting-tag-${index}`),
        label: String(tag?.name || tag?.title || tag?.label || `Reporting Tag ${index + 1}`),
        options: normalizeReportingTagOptions(tag),
      })),
    [availableReportingTags]
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxOptions, setTaxOptions] = useState<Tax[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen] = useState(false);
  const [customerQuickActionBaseIds, setCustomerQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingCustomersQuickAction, setIsRefreshingCustomersQuickAction] = useState(false);
  const [isAutoSelectingCustomerFromQuickAction, setIsAutoSelectingCustomerFromQuickAction] = useState(false);
  const [customerQuickActionFrameKey, setCustomerQuickActionFrameKey] = useState(0);
  const [isReloadingCustomerFrame, setIsReloadingCustomerFrame] = useState(false);
  const [itemReportingTagsTargetId, setItemReportingTagsTargetId] = useState<number | null>(null);
  const [itemReportingTagDraftValues, setItemReportingTagDraftValues] = useState<Record<string, string>>({});
  const [itemReportingTagsPopoverId, setItemReportingTagsPopoverId] = useState<number | null>(null);
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [isPriceListDropdownOpen, setIsPriceListDropdownOpen] = useState(false);
  const [priceListSearch, setPriceListSearch] = useState("");
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availablePriceLists, setAvailablePriceLists] = useState<string[]>([]);

  // Customer search modal state
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
  const [customerSearchCriteria, setCustomerSearchCriteria] = useState("Display Name");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState(false);
  const prefillFromProjectRef = useRef(false);

  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);
  const [manageSalespersonSearch, setManageSalespersonSearch] = useState("");
  const [manageSalespersonMenuOpen, setManageSalespersonMenuOpen] = useState<string | null>(null);
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>([]);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isNewSalespersonFormOpen, setIsNewSalespersonFormOpen] = useState(false);
  const [newSalespersonData, setNewSalespersonData] = useState({ name: "", email: "" });
  const [isNewSalespersonQuickActionOpen, setIsNewSalespersonQuickActionOpen] = useState(false);
  const [salespersonQuickActionBaseIds, setSalespersonQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingSalespersonsQuickAction, setIsRefreshingSalespersonsQuickAction] = useState(false);
  const [isAutoSelectingSalespersonFromQuickAction, setIsAutoSelectingSalespersonFromQuickAction] = useState(false);
  const [salespersonQuickActionFrameKey, setSalespersonQuickActionFrameKey] = useState(0);
  const [isReloadingSalespersonFrame, setIsReloadingSalespersonFrame] = useState(false);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateCalendar, setDateCalendar] = useState(new Date(2025, 11, 29));

  const [openItemDropdowns, setOpenItemDropdowns] = useState<Record<string | number, boolean>>({});
  const [openAccountDropdowns, setOpenAccountDropdowns] = useState<Record<string | number, boolean>>({});
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<string | number, boolean>>({});

  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkAddSearch, setBulkAddSearch] = useState("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState<any[]>([]);
  const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState<number[]>([]);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [isBulkUpdateMode, setIsBulkUpdateMode] = useState(false);
  const [openItemMenuId, setOpenItemMenuId] = useState<number | null>(null);
  const [isScanModeOpen, setIsScanModeOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [showAdditionalInformation, setShowAdditionalInformation] = useState(false);
  const [itemsWithAdditionalInfo, setItemsWithAdditionalInfo] = useState(new Set<number>());
  const [showNewHeaderInput, setShowNewHeaderInput] = useState(false);
  const [newHeaderText, setNewHeaderText] = useState("");
  const [newHeaderItemId, setNewHeaderItemId] = useState<number | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string | number, string>>({});
  const [accountSearches, setAccountSearches] = useState<Record<string | number, string>>({});
  const [itemSearches, setItemSearches] = useState<Record<string | number, string>>({});

  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");
  const [cloudSearchQuery, setCloudSearchQuery] = useState("");
  const [selectedCloudFiles, setSelectedCloudFiles] = useState<any[]>([]);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [selectedInbox, setSelectedInbox] = useState("files");

  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const itemDropdownRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const accountDropdownRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const taxDropdownRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const itemMenuRefs = useRef<Record<string | number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isEditMode || !clonedDataFromState || hasAppliedCloneRef.current) return;
    hasAppliedCloneRef.current = true;

    const cloned = clonedDataFromState as any;
    const toDisplayDate = (value: any, fallback: string) => {
      if (!value) return fallback;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      }
      return String(value);
    };

    const mappedItems = Array.isArray(cloned.items) && cloned.items.length > 0
      ? cloned.items.map((item: any, index: number) => ({
        id: Date.now() + index,
        itemId: item.itemId || item.id || item._id || undefined,
        itemDetails: item.itemDetails || item.name || item.description || "",
        quantity: Number(item.quantity ?? 1) || 1,
        rate: Number(item.rate ?? item.price ?? 0) || 0,
        tax: String(item.tax || item.taxId || ""),
        amount: Number(item.amount ?? 0) || 0,
        stockOnHand: Number(item.stockOnHand ?? item.stockQuantity ?? 0) || 0,
        reportingTags: Array.isArray(item.reportingTags) ? item.reportingTags : []
      }))
      : undefined;

    setFormData(prev => ({
      ...prev,
      customerName: cloned.customerName || cloned.customer?.displayName || cloned.customer?.name || prev.customerName,
      referenceNumber: cloned.referenceNumber || prev.referenceNumber,
      creditNoteDate: toDisplayDate(cloned.creditNoteDate || cloned.date, prev.creditNoteDate),
      accountsReceivable: cloned.accountsReceivable || prev.accountsReceivable,
      salesperson: cloned.salesperson || prev.salesperson,
      subject: cloned.subject || prev.subject,
      items: mappedItems || prev.items,
      subTotal: Number(cloned.subtotal ?? cloned.subTotal ?? prev.subTotal) || 0,
      discount: Number(cloned.discount ?? prev.discount) || 0,
      discountType: cloned.discountType || prev.discountType,
      shippingCharges: Number(cloned.shippingCharges ?? prev.shippingCharges) || 0,
      adjustment: Number(cloned.adjustment ?? prev.adjustment) || 0,
      total: Number(cloned.total ?? prev.total) || 0,
      currency: cloned.currency || prev.currency,
      customerNotes: cloned.customerNotes || cloned.notes || prev.customerNotes,
      termsAndConditions: cloned.termsAndConditions || cloned.terms || prev.termsAndConditions,
      documents: []
    }));
  }, [clonedDataFromState, isEditMode]);

  const handleCustomerSearch = () => {
    const searchTerm = customerSearchTerm.toLowerCase();
    let results: Customer[] = [];

    if (customerSearchCriteria === "Display Name") {
      results = customers.filter(customer => {
        const displayName = customer.displayName || customer.name || "";
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
        // Load customers from backend
        try {
          const customersResponse = await customersAPI.getAll();
          if (customersResponse && customersResponse.success && customersResponse.data) {
            const normalizedCustomers = customersResponse.data.map((c: any) => ({
              ...c,
              id: c._id || c.id,
              name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
            }));
            setCustomers(normalizedCustomers);
          }
        } catch (error) {
          console.error('Error loading customers:', error);
        }

        // Load salespersons from backend
        try {
          const salespersonsResponse = await salespersonsAPI.getAll();
          if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data) {
            setSalespersons(salespersonsResponse.data.map((s: any) => normalizeSalesperson(s)));
          }
        } catch (error) {
          console.error('Error loading salespersons:', error);
        }

        // Load taxes from backend
        try {
          const taxesResponse = await taxesAPI.getForTransactions("sales");
          if (taxesResponse && taxesResponse.success && taxesResponse.data) {
            const normalizedTaxes = taxesResponse.data.map((t: any) => ({
              ...t,
              id: t.id || t._id || t.taxId || t.tax_id || t.code,
              name: t.name || t.label || t.taxName || t.tax_name || t.title || t.displayName,
              rate: Number(t.rate ?? t.taxRate ?? t.percentage ?? t.value ?? 0)
            }));
            setTaxOptions(normalizedTaxes);
          }
        } catch (error) {
          console.error('Error loading taxes:', error);
        }

        // Load reporting tags
        try {
          const response = await reportingTagsAPI.getAll();
          const rows = Array.isArray(response) ? response : (response?.data || []);
          const fallbackRows = (() => {
            try {
              const raw = localStorage.getItem("taban_books_reporting_tags");
              const parsed = raw ? JSON.parse(raw) : [];
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();
          const sourceRows = Array.isArray(rows) && rows.length > 0 ? rows : fallbackRows;
          const activeRows = sourceRows.filter((tag: any) => String(tag?.status || "active").toLowerCase() !== "inactive");
          const scopedRows = activeRows.filter((tag: any) => {
            const appliesTo = normalizeReportingTagAppliesTo(tag);
            return appliesTo.some((entry) => entry.includes("credit") || entry.includes("sales"));
          });
          const tagsToUse = (scopedRows.length > 0 ? scopedRows : activeRows).map((tag: any) => ({
            ...tag,
            options: normalizeReportingTagOptions(tag),
          }));
          setAvailableReportingTags(tagsToUse);
        } catch (error) {
          console.error("Error loading reporting tags:", error);
          setAvailableReportingTags([]);
        }

        // Load locations from settings
        try {
          const locationsResponse = await locationsAPI.getAll();
          const rows = Array.isArray(locationsResponse?.data)
            ? locationsResponse.data
            : Array.isArray(locationsResponse?.locations)
              ? locationsResponse.locations
              : Array.isArray(locationsResponse)
                ? locationsResponse
                : [];
          const cached = (() => {
            try {
              const raw = localStorage.getItem("taban_locations_cache");
              const parsed = raw ? JSON.parse(raw) : [];
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();
          const combined = [...rows, ...cached];
          const names = Array.from(new Set(combined
            .map((loc: any) =>
              loc?.name || loc?.locationName || loc?.location_name || loc?.branchName || loc?.displayName || loc?.title
            )
            .filter(Boolean)
            .map((value: string) => String(value).trim())
            .filter(Boolean)));
          setAvailableLocations(names);
          if (!warehouseLocation && names[0]) setWarehouseLocation(names[0]);
        } catch (error) {
          console.error("Error loading locations:", error);
        }

        // Load price lists from settings cache
        try {
          const raw = localStorage.getItem("inv_price_lists_v1");
          const parsed = raw ? JSON.parse(raw) : [];
          const names = Array.from(new Set((Array.isArray(parsed) ? parsed : [])
            .map((row: any) => row?.name || row?.priceListName || row?.title || row?.label)
            .filter(Boolean)
            .map((value: string) => String(value).trim())
            .filter(Boolean)));
          setAvailablePriceLists(names);
        } catch (error) {
          console.error("Error loading price lists:", error);
        }

        // Load items from backend
        try {
          const itemsResponse = await itemsAPI.getAll();
          if (itemsResponse && itemsResponse.success && itemsResponse.data) {
            const transformedItems = itemsResponse.data.map((item: any) => ({
              id: item._id || item.id,
              name: item.name || "",
              sku: item.sku || "",
              rate: item.sellingPrice || item.costPrice || item.rate || 0,
              stockOnHand: item.stockOnHand || item.quantityOnHand || 0,
              unit: item.unit || item.unitOfMeasure || "pcs",
              taxId: item.taxId || item.tax || item.salesTaxId || item.taxRateId || "",
              taxName: item.taxName || item.tax_label || item.taxRate?.name || "",
              account: resolveItemAccount(item)
            }));
            setAvailableItems(transformedItems);
          }
        } catch (error) {
          console.error('Error loading items:', error);
        }

        // Load base currency and next credit note number if not in edit mode
        if (!isEditMode) {
          try {
            const baseCurrencyResponse = await currenciesAPI.getBaseCurrency();
            if (baseCurrencyResponse && baseCurrencyResponse.success && baseCurrencyResponse.data) {
              const code = baseCurrencyResponse.data.code || "USD";
              setFormData(prev => ({
                ...prev,
                currency: code.split(' - ')[0]
              }));
            }
          } catch (error) {
            console.error('Error loading base currency:', error);
          }

          try {
            const nextNumber = await fetchNextCreditNoteNumber();
            if (nextNumber) {
              setFormData(prev => ({
                ...prev,
                creditNoteNumber: nextNumber
              }));
            }
          } catch (error) {
            console.error("Error loading next credit note number:", error);
          }
        }

        try {
          const generalResponse = await fetch(`${API_BASE_URL}/settings/general`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (generalResponse.ok) {
            const generalJson = await generalResponse.json();
            const settings = generalJson?.data?.settings;
            if (settings) setEnabledSettings(settings);
          }
        } catch (generalError) {
          console.error("Error loading general settings:", generalError);
        }

        // If navigated from an Invoice (query param invoiceId), prefill credit note fields
        try {
          const params = new URLSearchParams(window.location.search);
          const invoiceId = params.get('invoiceId') || (window.history.state && window.history.state.invoiceId);
          if (invoiceId && !isEditMode) {
            const invoiceData = await getInvoiceById(invoiceId);
            if (invoiceData) {
              // Map invoice items to credit note items
              const mappedItems = (invoiceData.items || []).map((it: any) => ({
                id: Date.now() + Math.random(),
                itemId: it.item?._id || it.item || undefined,
                itemDetails: it.name || it.itemDetails || it.description || "",
                quantity: it.quantity || it.qty || 1,
                rate: it.rate || it.unitPrice || it.price || 0,
                tax: it.taxId || it.tax || "",
                amount: it.total || it.amount || ((it.quantity || 0) * (it.rate || it.unitPrice || 0) || 0),
                reportingTags: Array.isArray(it.reportingTags) ? it.reportingTags : []
              }));

              console.debug('[NewCreditNote] Prefilling from invoice', invoiceData);
              setFormData(prev => ({
                ...prev,
                customerName: invoiceData.customerName || (invoiceData.customer && (invoiceData.customer.displayName || invoiceData.customer.name)) || prev.customerName,
                creditNoteDate: invoiceData.date ? formatDate(invoiceData.date) : prev.creditNoteDate,
                referenceNumber: invoiceData.invoiceNumber || prev.referenceNumber,
                items: mappedItems.length ? mappedItems : prev.items,
                subTotal: invoiceData.subtotal || invoiceData.subTotal || mappedItems.reduce((s: any, it: any) => s + (parseFloat(it.amount) || 0), 0),
                discount: invoiceData.discount || 0,
                shippingCharges: invoiceData.shipping || invoiceData.shippingCharges || 0,
                total: invoiceData.total || invoiceData.amount || 0,
                currency: invoiceData.currency || prev.currency,
                customerNotes: invoiceData.customerNotes || prev.customerNotes,
                termsAndConditions: (invoiceData as any).terms || invoiceData.termsAndConditions || prev.termsAndConditions
              }));

              // set selected customer if available — if not found, set a minimal selectedCustomer so the UI shows name
              try {
                const custs = (await customersAPI.getAll()).data || [];
                let found = null;
                if (invoiceData.customer) {
                  found = custs.find((c: any) => (c._id || c.id) === (invoiceData.customer._id || invoiceData.customer));
                }
                if (found) {
                  setSelectedCustomer(found);
                } else if (invoiceData.customerName) {
                  setSelectedCustomer({ id: invoiceData.customerId || invoiceData.customer || 'unknown', name: invoiceData.customerName } as any);
                }
              } catch (e) {
                console.warn('[NewCreditNote] error setting selected customer', e);
                if (invoiceData.customerName) setSelectedCustomer({ id: invoiceData.customerId || invoiceData.customer || 'unknown', name: invoiceData.customerName } as any);
              }
            }
          }
        } catch (e) {
          // ignore query parsing errors
        }

        if (isEditMode) {
          try {
            const existing = await getCreditNoteById(id!);
            if (existing) {
              setFormData(prev => ({
                ...prev,
                ...existing,
                creditNoteDate: existing.date ? formatDate(existing.date) : prev.creditNoteDate
              }));

              // Find objects to set selected state
              const custs = (await customersAPI.getAll()).data;
              const cust = custs?.find((c: any) => (c._id || c.id) === (existing.customer || (existing as any).customerId));
              if (cust) setSelectedCustomer({ ...cust, id: cust._id || cust.id, name: cust.displayName || cust.name });

              const spData = (await salespersonsAPI.getAll()).data;
              const sp = spData?.find((s: any) => s.name === (existing as any).salesperson);
              if (sp) setSelectedSalesperson(sp);
            }
          } catch (error) {
            console.error("Error fetching credit note:", error);
          }
        }
      } catch (error) {
        console.error('Error in loadData:', error);
      }
    };

    loadData();
  }, [id, isEditMode]);

  useEffect(() => {
    if (prefillFromProjectRef.current) return;
    if (isEditMode) return;
    const state = location.state as any;
    if (!state || state.source !== "timeTrackingProjects") return;

    const customerId = String(state.customerId || state.project?.customerId || "").trim();
    const customerName = String(state.customerName || state.project?.customerName || "").trim();
    const currency = String(state.currency || "").trim();

    if (customerId || customerName) {
      const matchedCustomer =
        customers.find((c: any) => String(c?.id || c?._id || "") === customerId) ||
        customers.find(
          (c: any) =>
            String(c?.name || c?.displayName || "").trim().toLowerCase() ===
            customerName.toLowerCase()
        );
      if (matchedCustomer) {
        setSelectedCustomer(matchedCustomer);
      } else if (customerName) {
        setSelectedCustomer({ id: customerId || "unknown", name: customerName, displayName: customerName } as any);
      }

      setFormData((prev: any) => ({
        ...prev,
        customerName: customerName || prev.customerName,
        currency: currency || prev.currency,
      }));
    }

    prefillFromProjectRef.current = true;
  }, [location.state, customers, isEditMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) setIsCustomerDropdownOpen(false);
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(target)) setIsSalespersonDropdownOpen(false);
      if (datePickerRef.current && !datePickerRef.current.contains(target)) setIsDatePickerOpen(false);
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(target)) setIsUploadDropdownOpen(false);
      Object.entries(accountDropdownRefs.current).forEach(([key, ref]) => {
        if (ref && !ref.contains(target)) {
          setOpenAccountDropdowns(prev => ({ ...prev, [key]: false }));
        }
      });

      // Close item dropdowns
      Object.keys(openItemDropdowns).forEach(key => {
        const el = itemDropdownRefs.current[key];
        if (openItemDropdowns[key] && el && !el.contains(target)) {
          setOpenItemDropdowns(prev => ({ ...prev, [key]: false }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openItemDropdowns]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (isDocumentsModalOpen) {
        const docs = await getAllDocuments();
        setAvailableDocuments(docs);
      }
    };
    fetchDocuments();
  }, [isDocumentsModalOpen]);

  useEffect(() => {
    setFormData(prev => {
      const next = { ...prev };
      if (!showTransactionDiscount) {
        next.discount = 0;
        next.discountType = "percent";
      }
      if (!showShippingCharges) {
        next.shippingCharges = 0;
      }
      if (!showAdjustment) {
        next.adjustment = 0;
      }
      return next;
    });
  }, [showTransactionDiscount, showShippingCharges, showAdjustment]);

  // Helper to recalculate totals
  const calculateTotals = (items: CreditNoteItem[], discount: string | number, discountType: string, shipping: string | number, adjustment: string | number) => {
    const subTotal = items.reduce((sum, item) => sum + ((parseFloat(item.quantity as any) || 0) * (parseFloat(item.rate as any) || 0)), 0);

    const totalTax = items.reduce((sum, item) => {
      const taxOption = taxOptions.find(t => t.id === item.tax);
      const taxRate = taxOption ? taxOption.rate : 0;
      return sum + ((parseFloat(item.quantity as any) || 0) * (parseFloat(item.rate as any) || 0) * taxRate / 100);
    }, 0);

    const discountAmount = showTransactionDiscount
      ? (discountType === "percent"
        ? (subTotal * (parseFloat(discount as any) || 0) / 100)
        : (parseFloat(discount as any) || 0))
      : 0;

    const shippingAmount = showShippingCharges ? (parseFloat(shipping as any) || 0) : 0;
    const adjustmentAmount = showAdjustment ? (parseFloat(adjustment as any) || 0) : 0;
    const totalBeforeRound = subTotal + totalTax - discountAmount + shippingAmount + adjustmentAmount;
    const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
    const total = totalBeforeRound + roundOff;

    return { subTotal, totalTax, roundOff, total };
  };

  const taxSummary = React.useMemo(() => {
    const summary: Record<string, number> = {};
    (formData.items || []).forEach((item) => {
      if (!item.tax) return;
      const taxOption = taxOptions.find((t) => t.id === item.tax);
      if (!taxOption) return;
      const quantity = parseFloat(item.quantity as any) || 0;
      const rate = parseFloat(item.rate as any) || 0;
      const baseAmount = quantity * rate;
      const taxAmount = baseAmount * ((taxOption.rate || 0) / 100);
      summary[taxOption.name] = (summary[taxOption.name] || 0) + taxAmount;
    });
    return summary;
  }, [formData.items, taxOptions]);

  const totalTaxAmount = Object.values(taxSummary).reduce((sum, val) => sum + val, 0);

  useEffect(() => {
    setFormData((prev: any) => {
      const { subTotal, roundOff, total } = calculateTotals(
        prev.items,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      const sameSubTotal = Math.abs((Number(prev.subTotal) || 0) - Number(subTotal || 0)) < 0.0001;
      const sameRoundOff = Math.abs((Number(prev.roundOff) || 0) - Number(roundOff || 0)) < 0.0001;
      const sameTotal = Math.abs((Number(prev.total) || 0) - Number(total || 0)) < 0.0001;

      if (sameSubTotal && sameRoundOff && sameTotal) {
        return prev;
      }

      return {
        ...prev,
        subTotal,
        roundOff,
        total
      };
    });
  }, [
    formData.items,
    formData.discount,
    formData.discountType,
    formData.shippingCharges,
    formData.adjustment,
    taxOptions,
    showTransactionDiscount,
    showShippingCharges,
    showAdjustment
  ]);

  const handleSummaryChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updatedData = { ...prev, [field]: value };
      const { subTotal, roundOff, total } = calculateTotals(
        updatedData.items,
        updatedData.discount,
        updatedData.discountType,
        updatedData.shippingCharges,
        updatedData.adjustment
      );
      return {
        ...updatedData,
        subTotal,
        roundOff,
        total
      };
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customerName: customer.displayName || customer.name || "" }));
    setIsCustomerDropdownOpen(false);
  };

  const handleSalespersonSelect = (sp: any) => {
    setSelectedSalesperson(sp);
    setFormData(prev => ({ ...prev, salesperson: sp.name }));
    setIsSalespersonDropdownOpen(false);
    setSalespersonSearch("");
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

  const normalizeSalesperson = (salesperson: any) => ({
    ...salesperson,
    id: salesperson?._id || salesperson?.id,
    _id: salesperson?._id || salesperson?.id,
    name: salesperson?.name || ""
  });

  const reloadCustomersForCreditNote = async () => {
    const customersResponse = await customersAPI.getAll();
    const normalizedCustomers = ((customersResponse?.data || []) as any[]).map(normalizeCustomer);
    setCustomers(normalizedCustomers);
    return normalizedCustomers;
  };

  const reloadSalespersonsForCreditNote = async () => {
    const salespersonsResponse = await salespersonsAPI.getAll();
    const normalizedSalespersons = ((salespersonsResponse?.data || []) as any[]).map(normalizeSalesperson);
    setSalespersons(normalizedSalespersons);
    return normalizedSalespersons;
  };

  const openCustomerQuickAction = async () => {
    setIsCustomerDropdownOpen(false);
    setIsRefreshingCustomersQuickAction(true);
    const latestCustomers = await reloadCustomersForCreditNote();
    setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
    setIsRefreshingCustomersQuickAction(false);
    setIsNewCustomerQuickActionOpen(true);
  };

  const tryAutoSelectNewCustomerFromQuickAction = async () => {
    if (!isNewCustomerQuickActionOpen || isAutoSelectingCustomerFromQuickAction) return;
    setIsAutoSelectingCustomerFromQuickAction(true);
    try {
      const latestCustomers = await reloadCustomersForCreditNote();
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
    setIsRefreshingSalespersonsQuickAction(true);
    const latestSalespersons = await reloadSalespersonsForCreditNote();
    setSalespersonQuickActionBaseIds(latestSalespersons.map((s: any) => getEntityId(s)).filter(Boolean));
    setIsRefreshingSalespersonsQuickAction(false);
    setIsNewSalespersonQuickActionOpen(true);
  };

  const tryAutoSelectNewSalespersonFromQuickAction = async () => {
    if (!isNewSalespersonQuickActionOpen || isAutoSelectingSalespersonFromQuickAction) return;
    setIsAutoSelectingSalespersonFromQuickAction(true);
    try {
      const latestSalespersons = await reloadSalespersonsForCreditNote();
      const baselineIds = new Set(salespersonQuickActionBaseIds);
      const newSalespersons = latestSalespersons.filter((s: any) => {
        const entityId = getEntityId(s);
        return entityId && !baselineIds.has(entityId);
      });
      if (newSalespersons.length > 0) {
        const newlyCreatedSalesperson = pickNewestEntity(newSalespersons) || newSalespersons[newSalespersons.length - 1];
        handleSalespersonSelect(newlyCreatedSalesperson);
        setSalespersonQuickActionBaseIds(latestSalespersons.map((s: any) => getEntityId(s)).filter(Boolean));
        setIsNewSalespersonQuickActionOpen(false);
      }
    } finally {
      setIsAutoSelectingSalespersonFromQuickAction(false);
    }
  };

  const filteredManageSalespersons = salespersons.filter((salesperson: any) =>
    String(salesperson?.name || "").toLowerCase().includes(manageSalespersonSearch.toLowerCase()) ||
    String(salesperson?.email || "").toLowerCase().includes(manageSalespersonSearch.toLowerCase())
  );

  const handleNewSalespersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSalespersonData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveAndSelectSalesperson = async () => {
    if (!newSalespersonData.name.trim()) {
      alert("Please enter a name for the salesperson");
      return;
    }

    try {
      const response = await salespersonsAPI.create({
        name: newSalespersonData.name.trim(),
        email: newSalespersonData.email.trim() || "",
        phone: ""
      });

      if (response && response.success && response.data) {
        const savedSalesperson = normalizeSalesperson(response.data);
        setSalespersons(prev => [...prev, savedSalesperson]);
        handleSalespersonSelect(savedSalesperson);
        setNewSalespersonData({ name: "", email: "" });
        setIsNewSalespersonFormOpen(false);
        setIsManageSalespersonsOpen(false);
      } else {
        alert("Failed to save salesperson");
      }
    } catch (error: any) {
      console.error("Error saving salesperson:", error);
      alert("Error saving salesperson: " + (error?.message || "Unknown error"));
    }
  };

  const handleDeleteSalesperson = async (salespersonId: string) => {
    if (!window.confirm("Are you sure you want to delete this salesperson?")) {
      return;
    }

    try {
      const response = await salespersonsAPI.delete(salespersonId);
      if (response && response.success) {
        try {
          const latestSalespersons = await reloadSalespersonsForCreditNote();
          setSalespersons(latestSalespersons);
        } catch (error) {
          console.error("Error reloading salespersons:", error);
          setSalespersons(prev => prev.filter(sp => String(sp.id || sp._id) !== salespersonId));
        }

        if (selectedSalesperson && String(selectedSalesperson.id || selectedSalesperson._id) === salespersonId) {
          setSelectedSalesperson(null);
          setFormData(prev => ({
            ...prev,
            salesperson: ""
          }));
        }
      } else {
        alert("Failed to delete salesperson: " + ((response as any)?.message || "Unknown error"));
      }
    } catch (error: any) {
      console.error("Error deleting salesperson:", error);
      alert("Error deleting salesperson: " + (error?.message || "Unknown error"));
    }
  };

  const handleCancelNewSalesperson = () => {
    setNewSalespersonData({ name: "", email: "" });
    setIsNewSalespersonFormOpen(false);
  };

  const handleItemChange = (itemId: number, field: string, value: any) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          if (field === "quantity" || field === "rate" || field === "tax") {
            const quantity = field === "quantity" ? parseFloat(value) || 0 : item.quantity;
            const rate = field === "rate" ? parseFloat(value) || 0 : item.rate;
            const taxId = field === "tax" ? value : item.tax;
            const taxOption = taxOptions.find(t => t.id === taxId);
            const taxRate = taxOption ? taxOption.rate : 0;

            const subAmt = (quantity as number) * (rate as number);
            updatedItem.amount = subAmt + (subAmt * taxRate / 100);
          }
          return updatedItem;
        }
        return item;
      });

      const { subTotal, roundOff, total } = calculateTotals(
        updatedItems,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        roundOff,
        total
      };
    });
  };

  const handleItemSelect = (itemId: number, pItem: any) => {
    const rawTaxValue = pItem?.taxId || pItem?.tax || pItem?.taxRateId || pItem?.salesTaxId || pItem?.tax_id || pItem?.taxs || pItem?.taxes;
    const rawTaxName = pItem?.taxName || pItem?.tax_label || pItem?.taxRate?.name || pItem?.taxNameDisplay || pItem?.taxDisplayName;
    const rawTaxRate =
      pItem?.taxRate ||
      pItem?.tax_rate ||
      pItem?.taxPercent ||
      pItem?.tax_percentage ||
      pItem?.percentage;
    const parsedRateFromName = rawTaxName
      ? Number(String(rawTaxName).match(/(\d+(\.\d+)?)/)?.[1] || "")
      : undefined;
    let ensuredTaxId = resolveItemTaxId(pItem, taxOptions);

    if (!ensuredTaxId) {
      const fallbackName = rawTaxName || (rawTaxValue && typeof rawTaxValue === "string" ? rawTaxValue : "");
      const fallbackRate =
        rawTaxRate !== undefined && rawTaxRate !== null && rawTaxRate !== ""
          ? Number(rawTaxRate)
          : parsedRateFromName;
      if (fallbackName || (fallbackRate !== undefined && !Number.isNaN(fallbackRate))) {
        const existing = taxOptions.find((t) => {
          const tName = String(t?.name || "").toLowerCase().trim();
          const fName = String(fallbackName || "").toLowerCase().trim();
          return (
            (fName && (tName === fName || tName.includes(fName))) ||
            (fallbackRate !== undefined && Math.abs(Number(t?.rate || 0) - Number(fallbackRate || 0)) < 0.0001)
          );
        });
        if (existing) {
          ensuredTaxId = String(existing.id);
        } else {
          const tempId = `temp-${String(fallbackName || "tax").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
          const tempOption = {
            id: tempId,
            name: String(fallbackName || `Tax ${fallbackRate ?? ""}`).trim() || "Tax",
            rate: Number(fallbackRate || 0),
            isTemp: true
          };
          setTaxOptions((prev) => [tempOption, ...prev]);
          ensuredTaxId = tempId;
        }
      }
    }

    setFormData(prev => {
      console.debug("[CreditNote] item selected", {
        itemId,
        item: pItem,
        rawTaxValue,
        rawTaxName,
        rawTaxRate,
        ensuredTaxId,
        taxOptions: taxOptions.map((t) => ({ id: t.id, name: t.name, rate: t.rate }))
      });
      const updatedItems = prev.items.map(item => {
        if (item.id !== itemId) return item;
        const nextRate = Number(pItem.rate ?? 0);
        const nextQty = Number(item.quantity ?? 1) || 1;
        const nextAccount = resolveItemAccount(pItem) || item.account;
        const nextTaxId = ensuredTaxId || resolveItemTaxId(pItem, taxOptions);
        console.debug("[CreditNote] resolved item tax", {
          nextTaxId,
          nextAccount,
          rawTax: rawTaxValue,
          rawTaxName,
          rawTaxRate
        });
        const taxOption = taxOptions.find(t => String(t.id) === nextTaxId);
        const taxRate = taxOption ? Number(taxOption.rate) || 0 : 0;
        const subAmt = nextQty * nextRate;
        const amount = subAmt + (subAmt * taxRate / 100);
        return {
          ...item,
          itemId: pItem._id || pItem.id,
          itemDetails: pItem.name,
          rate: nextRate,
          account: nextAccount,
          tax: nextTaxId,
          amount,
          stockOnHand: pItem.stockOnHand
        };
      });

      const { subTotal, roundOff, total } = calculateTotals(
        updatedItems,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        roundOff,
        total
      };
    });
    setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));

    // Clear the search term for this item
    setItemSearches(prev => ({ ...prev, [itemId]: "" }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (formData.documents.length + files.length > 10) {
      alert("You can upload a maximum of 10 files");
      return;
    }
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`Some files exceed 10MB limit. Maximum file size is 10MB.`);
      return;
    }
    const newFiles: CreditNoteDocument[] = files.map(file => ({
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
  };

  const handleRemoveFile = (fileId: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => (doc as any).id !== fileId)
    }));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const parseFileSize = (sizeStr: any) => {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;
    const match = sizeStr.toString().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    return Math.round(value * (multipliers[unit] || 1));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), itemDetails: "", account: "", quantity: 1, rate: 0, tax: "", amount: 0, reportingTags: [] }
      ]
    }));
  };

  const handleRemoveItem = (itemId: number) => {
    setFormData(prev => {
      if (prev.items.length <= 1) return prev;
      const updatedItems = prev.items.filter(item => item.id !== itemId);

      const { subTotal, total } = calculateTotals(
        updatedItems,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        total,
        roundOff: 0
      };
    });
  };

  const handleSelectAllItems = () => {
    setBulkSelectedItemIds(formData.items.map(item => item.id));
  };

  const handleDeselectAllItems = () => {
    setBulkSelectedItemIds([]);
  };

  const handleToggleItemSelection = (itemId: number) => {
    setBulkSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleDuplicateItem = (id: number) => {
    const itemToDuplicate = formData.items.find(item => item.id === id);
    if (itemToDuplicate) {
      setFormData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            ...itemToDuplicate,
            id: Date.now(),
            itemId: itemToDuplicate.itemId,
            amount: 0
          }
        ]
      }));
    }
  };

  const getFilteredItems = (itemId: number) => {
    const searchTerm = itemSearches[itemId] || "";
    if (!searchTerm) return availableItems;
    return (availableItems as any[]).filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };


  const getBulkFilteredItems = () => {
    if (!bulkAddSearch.trim()) {
      return availableItems;
    }
    return (availableItems as any[]).filter(item =>
      item.name.toLowerCase().includes(bulkAddSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(bulkAddSearch.toLowerCase())
    );
  };

  const handleBulkItemToggle = (item: any) => {
    setBulkSelectedItems(prev => {
      const exists = prev.find((selected: any) => selected.id === item.id);
      if (exists) {
        return prev.filter((selected: any) => selected.id !== item.id);
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleBulkItemQuantityChange = (itemId: any, quantity: any) => {
    setBulkSelectedItems(prev =>
      prev.map((item: any) =>
        item.id === itemId ? { ...item, quantity: Math.max(1, parseFloat(quantity) || 1) } : item
      )
    );
  };

  const handleAddBulkItems = () => {
    if (bulkSelectedItems.length === 0) return;

    // Add all selected items to the form and recalculate totals
    setFormData(prev => {
      const newItems = bulkSelectedItems.map((selectedItem, index) => {
        const quantity = selectedItem.quantity || 1;
        const rate = selectedItem.rate || 0;
        return {
          id: Date.now() + index,
          itemId: selectedItem._id || selectedItem.id,
          itemDetails: selectedItem.name,
          quantity: quantity,
          rate: rate,
          tax: "",
          amount: quantity * rate,
          stockOnHand: selectedItem.stockOnHand,
          reportingTags: []
        };
      });

      const updatedItems = [...prev.items, ...newItems];

      const { subTotal, roundOff, total } = calculateTotals(
        updatedItems,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        roundOff,
        total
      };
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

  const formatDate = (date: any) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  async function fetchNextCreditNoteNumber() {
    try {
      const response = await creditNotesAPI.getNextNumber();
      const nextNumber = response?.data?.creditNoteNumber || response?.nextNumber || "";
      return String(nextNumber || "").trim();
    } catch (error) {
      console.error("Error fetching next credit note number:", error);
      return "";
    }
  }

  const getDaysInMonth = (date: any) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, 0).getDate() - i, month: "prev", fullDate: new Date(year, month - 1, new Date(year, month - 1, 0).getDate() - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, month: "current", fullDate: new Date(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, month: "next", fullDate: new Date(year, month + 1, i) });
    }
    return days;
  };

  const handleSave = async (status = "open") => {
    setSaveLoading(status === "draft" ? "draft" : "open");
    try {
      let effectiveCreditNoteNumber = String(formData.creditNoteNumber || "").trim();
      if (!isEditMode && (!effectiveCreditNoteNumber || effectiveCreditNoteNumber === "CN-00001")) {
        const nextNumber = await fetchNextCreditNoteNumber();
        if (nextNumber) {
          effectiveCreditNoteNumber = nextNumber;
          setFormData(prev => ({ ...prev, creditNoteNumber: nextNumber }));
        }
      }

      // Prepare normalized data for the backend Model
      const data = {
        creditNoteNumber: effectiveCreditNoteNumber || formData.creditNoteNumber,
        customer: selectedCustomer?._id || selectedCustomer?.id || (formData as any).customer,
        date: formData.creditNoteDate ? new Date(formData.creditNoteDate.split('/').reverse().join('-')) : new Date(),
        reason: (formData as any).reason || "",
        items: formData.items
          .filter(item => item.itemId)
          .map(item => {
            const quantity = parseFloat(item.quantity as any) || 0;
            const rate = parseFloat(item.rate as any) || 0;
            const taxOption = taxOptions.find(t => t.id === item.tax);
            const taxRate = taxOption ? taxOption.rate : 0;
            const taxAmount = (quantity * rate) * taxRate / 100;

            return {
              item: item.itemId,
              name: item.itemDetails,
              description: item.itemDetails,
              quantity: quantity,
              unitPrice: rate,
              taxRate: taxRate,
              taxAmount: taxAmount,
              total: item.amount
            };
          }),
        subtotal: formData.subTotal || 0,
        tax: formData.items.reduce((sum, item) => {
          const taxOption = taxOptions.find(t => t.id === item.tax);
          const taxRate = taxOption ? taxOption.rate : 0;
          return sum + ((parseFloat(item.quantity as any) * parseFloat(item.rate as any)) * taxRate / 100);
        }, 0),
        total: formData.total || 0,
        currency: formData.currency || "USD",
        status: status,
        notes: formData.customerNotes || ""
      };

      if (isEditMode) {
        await updateCreditNote(id!, data as any);
      } else {
        try {
          await saveCreditNote(data as any);
        } catch (error: any) {
          const rawError = String(error?.data?.error || error?.message || "").toLowerCase();
          const isDuplicateNumberError =
            rawError.includes("duplicate key") ||
            rawError.includes("e11000") ||
            rawError.includes("creditnotenumber");

          if (!isDuplicateNumberError) {
            throw error;
          }

          const retryNumber = await fetchNextCreditNoteNumber();
          if (!retryNumber) {
            throw error;
          }

          const retryPayload = {
            ...data,
            creditNoteNumber: retryNumber
          };
          setFormData(prev => ({ ...prev, creditNoteNumber: retryNumber }));
          await saveCreditNote(retryPayload as any);
        }
      }
      navigate("/sales/credit-notes");
    } catch (error) {
      console.error("Error saving credit note:", error);
      alert("Failed to save credit note. Please try again.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleCancel = () => navigate("/sales/credit-notes");

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  const filteredSalespersons = salespersons.filter((salesperson: any) =>
    String(salesperson?.name || "").toLowerCase().includes(salespersonSearch.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-normal text-gray-900 m-0">New Credit Note</h1>
          <button
            onClick={handleCancel}
            className="text-red-500 hover:text-red-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full py-6 pb-28">
        <div className="bg-white overflow-visible">
          {/* Customer Row */}
          <div className="px-6 py-5 border-b border-gray-100 bg-[#fafafa]">
            <div className="max-w-[980px]">
              <div className="flex items-start gap-4">
              <label className="text-sm text-red-600 w-40 pt-2 flex-shrink-0">Customer Name*</label>
              <div className="w-full max-w-[540px] relative" ref={customerDropdownRef}>
                <div className="relative flex items-stretch">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 pr-10 border border-gray-300 rounded-l text-sm text-gray-700 focus:outline-none focus:border-[#156372] bg-white"
                    placeholder="Select or add a customer"
                    value={formData.customerName}
                    readOnly
                    onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  />
                  <div
                    className="absolute right-10 top-0 bottom-0 flex items-center px-2 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                    }}
                  >
                    <ChevronDown size={14} className="text-gray-400" />
                  </div>
                  <button
                    type="button"
                    className="w-10 bg-[#156372] text-white rounded-r hover:bg-[#0D4A52] flex items-center justify-center border border-[#156372]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerSearchModalOpen(true);
                    }}
                  >
                    <Search size={16} />
                  </button>
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                    <div className="flex items-center gap-2 p-2 border-b border-gray-200 sticky top-0 bg-white">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="flex-1 text-sm focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 cursor-pointer hover:bg-gray-50"
                            onClick={() => handleCustomerSelect(c)}
                          >
                            <div className="text-sm font-medium truncate text-gray-900">{c.name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">No customers found</div>
                      )}
                    </div>
                    <button
                      className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-gray-50 text-sm font-medium text-[#156372] w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCustomerDropdownOpen(false);
                        openCustomerQuickAction();
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
          </div>

          <div className="px-6 py-5 space-y-4 max-w-[980px]">

            {/* Credit Note# */}
            <div className="flex items-center group">
              <label className="w-48 text-sm font-medium text-red-600">Credit Note#*</label>
              <div className="flex-1 max-w-xs relative">
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm focus:outline-none"
                  value={formData.creditNoteNumber}
                  readOnly={creditNoteNumberMode === "auto"}
                  onChange={(e) => {
                    if (creditNoteNumberMode === "manual") {
                      setFormData(p => ({ ...p, creditNoteNumber: e.target.value }));
                    }
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#156372" }}
                  onClick={() => setIsCreditNoteNumberModalOpen(true)}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.color = "#0D4A52"}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.color = "#156372"}
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>

            {/* Reference# */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium text-gray-700">Reference#</label>
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:border-[#156372] focus:outline-none bg-gray-50"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData(p => ({ ...p, referenceNumber: e.target.value }))}
                />
              </div>
            </div>

            {/* Credit Note Date */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium text-red-600">Credit Note Date*</label>
              <div className="flex-1 max-w-xs relative" ref={datePickerRef}>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none cursor-pointer bg-gray-50"
                  value={formData.creditNoteDate}
                  readOnly
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                />
                {isDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 w-64 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setDateCalendar(new Date(dateCalendar.getFullYear(), dateCalendar.getMonth() - 1, 1))}>«</button>
                      <span className="text-sm font-semibold">{months[dateCalendar.getMonth()]} {dateCalendar.getFullYear()}</span>
                      <button onClick={() => setDateCalendar(new Date(dateCalendar.getFullYear(), dateCalendar.getMonth() + 1, 1))}>»</button>
                    </div>
                    <div className="grid grid-cols-7 text-[10px] text-center font-bold text-gray-400 mb-1">
                      {daysOfWeek.map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(dateCalendar).map((day, idx) => (
                        <div
                          key={idx}
                          className={`text-xs p-1 text-center rounded cursor-pointer ${day.month === 'current' ? 'text-gray-800 hover:bg-gray-100' : 'text-gray-300'} ${formData.creditNoteDate === formatDate(day.fullDate) ? 'text-white' : ''}`}
                          style={formData.creditNoteDate === formatDate(day.fullDate) ? { backgroundColor: "#156372" } : {}}
                          onMouseEnter={(e) => {
                            if (formData.creditNoteDate === formatDate(day.fullDate)) {
                              (e.target as HTMLElement).style.backgroundColor = "#0D4A52";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.creditNoteDate === formatDate(day.fullDate)) {
                              (e.target as HTMLElement).style.backgroundColor = "#156372";
                            }
                          }}
                          onClick={() => { setFormData(p => ({ ...p, creditNoteDate: formatDate(day.fullDate) })); setIsDatePickerOpen(false); }}
                        >
                          {day.date}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Salesperson */}
            <div className="flex items-center pt-4 border-t border-gray-100">
              <label className="w-48 text-sm font-medium text-gray-700">Salesperson</label>
              <div className="flex-1 max-w-xs relative" ref={salespersonDropdownRef}>
                <div
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 flex justify-between items-center bg-white cursor-pointer"
                  onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                >
                  <span className={formData.salesperson ? "text-gray-900" : "text-gray-400"}>
                    {formData.salesperson || "Select or Add Salesperson"}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
                {isSalespersonDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 flex flex-col">
                    <div className="flex items-center gap-2 p-2 border-b border-gray-200 sticky top-0 bg-white">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={salespersonSearch}
                        onChange={(e) => setSalespersonSearch(e.target.value)}
                        className="flex-1 text-sm focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredSalespersons.length > 0 ? (
                        filteredSalespersons.map((salesperson: any) => (
                          <div
                            key={salesperson.id || salesperson._id}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-[#156372] hover:text-white cursor-pointer truncate"
                            onClick={() => handleSalespersonSelect(salesperson)}
                          >
                            {salesperson.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500 italic">No salespersons found</div>
                      )}
                    </div>
                    <div
                      className="p-3 border-t border-gray-100 flex items-center gap-2 text-[#156372] hover:bg-gray-50 cursor-pointer text-sm font-medium"
                      onClick={() => {
                        setIsSalespersonDropdownOpen(false);
                        setManageSalespersonSearch("");
                        setSelectedSalespersonIds([]);
                        setIsNewSalespersonFormOpen(false);
                        setIsManageSalespersonsOpen(true);
                      }}
                    >
                      <PlusCircle size={16} />
                      <span>Manage Salespersons</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-start pt-4 border-t border-gray-100">
              <label className="w-48 text-sm font-medium text-gray-700 flex items-center gap-1 pt-2">
                Subject <Info size={14} className="text-gray-400" />
              </label>
              <div className="flex-1 max-w-[330px] relative">
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:border-[#156372] focus:outline-none h-20 resize-none font-sans bg-gray-50"
                  placeholder="Let your customer know what this Credit Note is for"
                  value={formData.subject}
                  onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
                />
                <div className="absolute bottom-2 right-2 text-gray-300"><div className="w-4 h-4 border-r-2 border-b-2" /></div>
              </div>
            </div>

            {/* Item Table Section */}
            <div className="pt-10">
              <div className="mb-4 flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <label className="flex items-center gap-3">
                  <span className="text-gray-600">Warehouse Location</span>
                  <div className="relative">
                    <button
                      type="button"
                      className="h-9 min-w-[180px] border-b-2 border-gray-200 bg-transparent text-left text-sm text-gray-700 focus:border-[#156372] focus:outline-none flex items-center justify-between"
                      onClick={() => setIsWarehouseDropdownOpen((open) => !open)}
                    >
                      <span>{warehouseLocation}</span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isWarehouseDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isWarehouseDropdownOpen && (
                      <div className="absolute left-0 top-full mt-2 w-[220px] rounded-md border border-gray-200 bg-white shadow-lg z-[200]">
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={warehouseSearch}
                              onChange={(e) => setWarehouseSearch(e.target.value)}
                              placeholder="Search"
                              className="h-8 w-full rounded-md border border-gray-200 pl-8 pr-2 text-xs outline-none focus:border-[#156372]"
                            />
                          </div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {(availableLocations.length > 0 ? availableLocations : ["Head Office"])
                            .filter((loc) => loc.toLowerCase().includes(warehouseSearch.toLowerCase()))
                            .map((loc) => (
                              <button
                                key={loc}
                                type="button"
                                className={`w-full px-3 py-2 text-left text-sm ${warehouseLocation === loc ? "bg-[#4285f4] text-white" : "text-gray-700 hover:bg-gray-50"}`}
                                onClick={() => {
                                  setWarehouseLocation(loc);
                                  setIsWarehouseDropdownOpen(false);
                                  setWarehouseSearch("");
                                }}
                              >
                                {loc}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <span className="text-gray-600">Select Price List</span>
                  <div className="relative">
                    <button
                      type="button"
                      className="h-9 min-w-[180px] border-b-2 border-gray-200 bg-transparent text-left text-sm text-gray-700 focus:border-[#156372] focus:outline-none flex items-center justify-between"
                      onClick={() => setIsPriceListDropdownOpen((open) => !open)}
                    >
                      <span>{priceList || "Select Price List"}</span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isPriceListDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isPriceListDropdownOpen && (
                      <div className="absolute left-0 top-full mt-2 w-[220px] rounded-md border border-gray-200 bg-white shadow-lg z-[200]">
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={priceListSearch}
                              onChange={(e) => setPriceListSearch(e.target.value)}
                              placeholder="Search"
                              className="h-8 w-full rounded-md border border-gray-200 pl-8 pr-2 text-xs outline-none focus:border-[#156372]"
                            />
                          </div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {availablePriceLists
                            .filter((pl) => pl.toLowerCase().includes(priceListSearch.toLowerCase()))
                            .map((pl) => (
                              <button
                                key={pl}
                                type="button"
                                className={`w-full px-3 py-2 text-left text-sm ${priceList === pl ? "bg-[#4285f4] text-white" : "text-gray-700 hover:bg-gray-50"}`}
                                onClick={() => {
                                  setPriceList(pl);
                                  setIsPriceListDropdownOpen(false);
                                  setPriceListSearch("");
                                }}
                              >
                                {pl}
                              </button>
                            ))}
                          {availablePriceLists.length === 0 && (
                            <div className="px-3 py-2 text-xs text-gray-500">No price lists found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
              {!isBulkUpdateMode && (
                <div className="flex items-center justify-between mb-4 rounded-md border border-gray-200 bg-[#f5f6f8] px-4 py-3">
                  <span className="ms-4 text-[15px] font-semibold text-gray-800">Item Table</span>
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={bulkActionsRef}>
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                      >
                        <CheckSquare size={15} className="text-gray-600" />
                        Bulk Actions
                      </button>
                    {isBulkActionsOpen && (
                      <div className="absolute top-full right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[240px] overflow-hidden">
                        <div
                          className={`px-4 py-3 text-sm cursor-pointer transition-all ${isBulkUpdateMode
                            ? "text-white"
                            : "text-gray-700 hover:bg-gray-50"
                            }`}
                          style={isBulkUpdateMode ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                            if (isBulkUpdateMode) {
                              (e.currentTarget as HTMLElement).style.opacity = "0.9";
                            }
                          }}
                          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                            if (isBulkUpdateMode) {
                              (e.currentTarget as HTMLElement).style.opacity = "1";
                            }
                          }}
                          onClick={() => {
                            setIsBulkUpdateMode(true);
                            setIsBulkActionsOpen(false);
                          }}
                        >
                          Bulk Update Line Items
                        </div>
                        <div
                          className={`px-4 py-3 text-sm cursor-pointer transition-colors border-t border-gray-200 ${showAdditionalInformation
                            ? "bg-gray-50 text-gray-700"
                            : "text-gray-700 hover:bg-gray-50"
                            }`}
                          onClick={() => {
                            if (showAdditionalInformation) {
                              setItemsWithAdditionalInfo(new Set());
                              setShowAdditionalInformation(false);
                            } else {
                              setItemsWithAdditionalInfo(new Set(formData.items.map(item => item.id)));
                              setShowAdditionalInformation(true);
                            }
                            setIsBulkActionsOpen(false);
                          }}
                        >
                          Show All Additional Information
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Update Banner */}
              {isBulkUpdateMode && (
                <div className="mb-4 flex items-center justify-between rounded-md border border-[#d7dee8] bg-[#e7edf5] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      className="rounded-md bg-[#22b573] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1ea465]"
                      type="button"
                      onMouseEnter={(e) => (e.currentTarget as any).style.opacity = "0.9"}
                      onMouseLeave={(e) => (e.currentTarget as any).style.opacity = "1"}
                      onClick={() => {
                        // Handle Update Reporting Tags
                        alert("Update Reporting Tags functionality");
                      }}
                    >
                      Update Reporting Tags
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkUpdateMode(false);
                      setBulkSelectedItemIds([]);
                    }}
                    className="p-1 text-[#156372] hover:text-[#0D4A52] hover:bg-gray-100 rounded transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <div className="border border-gray-200 rounded-md bg-white">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    {isBulkUpdateMode ? <col className="w-8" /> : null}
                    <col className="w-8" />
                    <col className="w-[31%]" />
                    <col className="w-[12%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[16%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-200 bg-[#f9fafb]">
                    {isBulkUpdateMode && (
                      <th className="w-12 py-3 px-3">
                        <input
                          type="checkbox"
                          checked={bulkSelectedItemIds.length === formData.items.length && formData.items.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSelectAllItems();
                            } else {
                              handleDeselectAllItems();
                            }
                          }}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                          style={{ accentColor: "#156372" }}
                        />
                      </th>
                    )}
                    <th className="w-8"></th>
                    <th className="text-left py-3 px-3 text-[12px] tracking-wide font-semibold text-gray-700">ITEM DETAILS</th>
                    <th className="text-left py-3 px-3 text-[12px] tracking-wide font-semibold text-gray-700">ACCOUNT</th>
                    <th className="text-left py-3 px-3 text-[12px] tracking-wide font-semibold text-gray-700">QUANTITY</th>
                    <th className="text-center py-3 px-3 text-[12px] tracking-wide font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        RATE
                        <Grid3x3 size={14} className="hidden" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-3 text-[12px] tracking-wide font-semibold text-gray-700">TAX</th>
                    <th className="text-right py-3 px-3 text-[12px] tracking-wide font-semibold text-gray-700">AMOUNT</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-gray-200 bg-white">
                        {isBulkUpdateMode && (
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={bulkSelectedItemIds.includes(item.id)}
                              onChange={() => handleToggleItemSelection(item.id)}
                              className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                              style={{ accentColor: "#156372" }}
                            />
                          </td>
                        )}
                        <td className="py-3 px-2 text-center">
                          <GripVertical size={16} className="text-gray-300" />
                        </td>
                        <td className="py-3 px-3">
                          <div
                            className="relative"
                            ref={el => {
                              itemDropdownRefs.current[item.id] = el;
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-[#f1f5f9] border border-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                <ImageIcon size={14} className="text-gray-400" />
                              </div>
                              <input
                                type="text"
                                placeholder="Type or click to select an item"
                                value={item.itemDetails}
                                readOnly
                                onClick={() => setOpenItemDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                className="h-9 w-full px-3 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none cursor-pointer focus:border-[#156372]"
                              />
                            </div>
                            {item.itemId && (
                              <div className="mt-1 text-xs text-[#156372] font-semibold ml-8">
                                Stock on Hand: {item.stockOnHand || 0}
                              </div>
                            )}

                            {openItemDropdowns[item.id] && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                                {getFilteredItems(item.id).length > 0 ? (
                                  getFilteredItems(item.id).map(productItem => (
                                    <div
                                      key={productItem.id}
                                      className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 ${selectedItemIds[item.id] === productItem.id ? "bg-gray-50" : ""
                                        }`}
                                      onClick={() => handleItemSelect(item.id, productItem)}
                                    >
                                      <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ backgroundColor: "#156372" }}>
                                        {productItem.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{productItem.name}</div>
                                        <div className="text-xs text-gray-500 truncate">
                                          SKU: {productItem.sku} • Rate: {formData.currency} {productItem.rate.toFixed(2)} • Stock: {productItem.stockOnHand}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-sm text-gray-500">
                                    {itemSearches[item.id] ? "No items found" : "No items available"}
                                  </div>
                                )}
                                <button
                                  className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm font-medium text-[#156372] cursor-pointer hover:bg-gray-100 w-full transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenItemDropdowns(prev => ({ ...prev, [item.id]: false }));
                                    navigate("/items", { state: { showNewItem: true, returnTo: window.location.pathname } });
                                  }}
                                >
                                  <Plus size={16} />
                                  Add New Item
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div
                            className="relative"
                            ref={el => {
                              accountDropdownRefs.current[item.id] = el;
                            }}
                          >
                            <div
                              className="h-9 w-full px-3 border border-gray-300 rounded-md text-sm bg-white flex items-center justify-between cursor-pointer"
                              onClick={() => setOpenAccountDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            >
                              <span className={item.account ? "text-gray-900 truncate" : "text-gray-400 truncate"}>
                                {item.account || "Select an account"}
                              </span>
                              <ChevronDown
                                size={14}
                                className={`text-gray-400 transition-transform ${openAccountDropdowns[item.id] ? "rotate-180" : ""}`}
                              />
                            </div>
                            {openAccountDropdowns[item.id] && (
                              <div className="absolute left-0 top-full z-50 mt-1 w-[260px] overflow-hidden rounded-md border border-[#3b82f6] bg-white shadow-lg">
                                <div className="border-b border-gray-200 p-3">
                                  <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search"
                                      value={accountSearches[item.id] || ""}
                                      onChange={(e) => setAccountSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-9 w-full rounded-md border border-[#3b82f6] pl-9 pr-3 text-sm focus:outline-none"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-[260px] overflow-y-auto py-1">
                                  {Object.entries(accountCategories)
                                    .map(([category, accounts]) => {
                                      const search = (accountSearches[item.id] || "").trim().toLowerCase();
                                      const filteredAccounts = accounts.filter((account) =>
                                        !search || account.toLowerCase().includes(search) || category.toLowerCase().includes(search)
                                      );
                                      if (filteredAccounts.length === 0) return null;
                                      return (
                                        <div key={category}>
                                          <div className="px-4 py-2 text-sm font-semibold text-gray-800">{category}</div>
                                          {filteredAccounts.map((account) => (
                                            <button
                                              key={account}
                                              type="button"
                                              className={`block w-full px-4 py-2 text-left text-sm ${item.account === account ? "bg-[#4285f4] text-white" : "text-gray-700 hover:bg-gray-50"}`}
                                              onClick={() => {
                                                handleItemChange(item.id, "account", account);
                                                setOpenAccountDropdowns(prev => ({ ...prev, [item.id]: false }));
                                                setAccountSearches(prev => ({ ...prev, [item.id]: "" }));
                                              }}
                                            >
                                              {account}
                                            </button>
                                          ))}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                            className="h-9 w-full px-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] bg-white"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                            className="h-9 w-full px-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] bg-white"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="relative">
                            <select
                              className="h-9 w-full px-3 border border-gray-300 rounded-md text-sm appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                              value={item.tax}
                              onChange={(e) => handleItemChange(item.id, 'tax', e.target.value)}
                            >
                              <option key="select-tax" value="">Select a Tax</option>
                              {taxOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-sm font-semibold text-gray-900">{item.amount.toFixed(2)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="relative"
                              ref={el => {
                                itemMenuRefs.current[item.id] = el;
                              }}
                            >
                              <button
                                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemMenuId(openItemMenuId === item.id ? null : item.id);
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openItemMenuId === item.id && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px] overflow-hidden">
                                  <button
                                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${itemsWithAdditionalInfo.has(item.id)
                                      ? "text-white"
                                      : "text-gray-700 hover:bg-gray-50"
                                      }`}
                                    style={itemsWithAdditionalInfo.has(item.id) ? { backgroundColor: "#156372" } : {}}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setItemsWithAdditionalInfo(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(item.id)) {
                                          newSet.delete(item.id);
                                        } else {
                                          newSet.add(item.id);
                                        }
                                        return newSet;
                                      });
                                      setOpenItemMenuId(null);
                                    }}
                                  >
                                    {itemsWithAdditionalInfo.has(item.id) ? "Hide Additional Information" : "Show Additional Information"}
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateItem(item.id);
                                      setOpenItemMenuId(null);
                                    }}
                                  >
                                    <Copy size={14} className="text-gray-500" />
                                    Clone
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentIndex = formData.items.findIndex(i => i.id === item.id);
                                      const newItem = { id: Date.now(), itemDetails: "", account: "", quantity: 1, rate: 0, tax: "", amount: 0, reportingTags: [] };
                                      setFormData(prev => {
                                        const newItems = [...prev.items];
                                        newItems.splice(currentIndex + 1, 0, newItem);
                                        return { ...prev, items: newItems };
                                      });
                                      setOpenItemMenuId(null);
                                    }}
                                  >
                                    <Plus size={14} className="text-gray-500" />
                                    Insert New Row
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsBulkAddModalOpen(true);
                                      setOpenItemMenuId(null);
                                    }}
                                  >
                                    <Plus size={14} className="text-gray-500" />
                                    Insert Items in Bulk
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowNewHeaderInput(true);
                                      setNewHeaderItemId(item.id);
                                      setOpenItemMenuId(null);
                                    }}
                                  >
                                    <Plus size={14} className="text-gray-500" />
                                    Insert New Header
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {(showAdditionalInformation || itemsWithAdditionalInfo.has(item.id)) && (
                        <tr className="border-b border-gray-100 bg-white">
                          <td colSpan={isBulkUpdateMode ? 9 : 8} className="pl-2 pr-4 py-2">
                            <div className="relative inline-flex">
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-600"
                                onClick={() => {
                                  const existing = Array.isArray((item as any).reportingTags) ? (item as any).reportingTags : [];
                                  const initialValues: Record<string, string> = {};
                                  normalizedReportingTags.forEach((tag: any) => {
                                    const existingTag = existing.find((entry: any) =>
                                      String(entry?.tagId || "") === String(tag?.id || tag?._id || tag?.key || "") ||
                                      String(entry?.name || "") === String(tag?.label || "")
                                    );
                                    initialValues[String(tag.key)] = existingTag?.value ? String(existingTag.value) : "";
                                  });
                                  setItemReportingTagDraftValues(initialValues);
                                  setItemReportingTagsTargetId(item.id);
                                  setItemReportingTagsPopoverId(itemReportingTagsPopoverId === item.id ? null : item.id);
                                }}
                              >
                                <Tag size={14} className="text-red-400" />
                                <span className="font-medium">Reporting Tags*</span>
                                <ChevronDown size={14} className="text-gray-400" />
                                <span className="sr-only">
                                  {Array.isArray((item as any).reportingTags)
                                    ? (item as any).reportingTags.filter((entry: any) => String(entry?.value || "").trim()).length
                                    : 0}{" "}
                                  / {normalizedReportingTags.length}
                                </span>
                              </button>

                              {itemReportingTagsPopoverId === item.id && (
                                <div className="absolute left-0 top-full z-[200] mt-2 w-[320px] rounded-md border border-gray-200 bg-white shadow-lg">
                                  <div className="px-3 py-2 border-b border-gray-200 text-sm font-semibold text-gray-800">
                                    Reporting Tags
                                  </div>
                                  <div className="p-3 space-y-3">
                                    {normalizedReportingTags.length === 0 ? (
                                      <div className="text-sm text-gray-500">No reporting tags available.</div>
                                    ) : (
                                      normalizedReportingTags.map((tag: any) => (
                                        <div key={`item-reporting-tag-${tag.key}`}>
                                          <label className="block text-xs text-gray-700 mb-1">
                                            {tag.label} <span className="text-red-500">*</span>
                                          </label>
                                          <div className="relative max-w-[220px]">
                                            <select
                                              value={itemReportingTagDraftValues[String(tag.key)] ?? ""}
                                              onChange={(e) =>
                                                setItemReportingTagDraftValues((prev) => ({
                                                  ...prev,
                                                  [String(tag.key)]: e.target.value,
                                                }))
                                              }
                                              className="w-full h-8 px-2.5 pr-7 border border-gray-300 rounded-md text-sm text-gray-700 appearance-none bg-white focus:outline-none focus:border-[#3f83f8]"
                                            >
                                              <option value="">None</option>
                                              {Array.isArray(tag.options) &&
                                                tag.options.map((option: string, index: number) => (
                                                  <option key={`${tag.key}-item-option-${index}-${option}`} value={option}>
                                                    {option}
                                                  </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200">
                                    <button
                                      onClick={() => {
                                        if (!itemReportingTagsTargetId) {
                                          setItemReportingTagsPopoverId(null);
                                          return;
                                        }
                                        const selectedUpdates = normalizedReportingTags
                                          .map((tag: any) => ({
                                            tag,
                                            value: String(itemReportingTagDraftValues[String(tag.key)] ?? ""),
                                          }))
                                          .filter((entry: any) => entry.value !== "");

                                        setFormData((prev: any) => ({
                                          ...prev,
                                          items: prev.items.map((row: any) => {
                                            if (String(row.id) !== String(itemReportingTagsTargetId)) return row;
                                            const existing = Array.isArray(row.reportingTags) ? [...row.reportingTags] : [];
                                            const nextTags = [...existing];
                                            selectedUpdates.forEach((entry: any) => {
                                              const tagId = String(entry.tag?.id || entry.tag?._id || entry.tag?.key || "");
                                              const tagName = String(entry.tag?.label || entry.tag?.name || "");
                                              const idx = nextTags.findIndex((t: any) =>
                                                String(t?.tagId || "") === tagId || String(t?.name || "") === tagName
                                              );
                                              const payload = { tagId, value: entry.value, name: tagName };
                                              if (idx >= 0) nextTags[idx] = { ...nextTags[idx], ...payload };
                                              else nextTags.push(payload);
                                            });
                                            return { ...row, reportingTags: nextTags };
                                          }),
                                        }));
                                        setItemReportingTagsPopoverId(null);
                                      }}
                                      className="px-3 py-1.5 bg-[#25b46b] text-white rounded-md text-xs font-medium hover:bg-[#1f9c5d] transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setItemReportingTagsPopoverId(null)}
                                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-medium transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {newHeaderItemId === item.id && showNewHeaderInput && (
                        <tr>
                          <td colSpan={isBulkUpdateMode ? 8 : 7} className="p-3">
                            <div className="flex items-center gap-2">
                              <button
                                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                                onClick={() => {
                                  // Three dots icon - can be used for menu if needed
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              <input
                                type="text"
                                placeholder="Add New Header"
                                value={newHeaderText}
                                onChange={(e) => setNewHeaderText(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && newHeaderText.trim()) {
                                    setShowNewHeaderInput(false);
                                    setNewHeaderText("");
                                    setNewHeaderItemId(null);
                                  }
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                                autoFocus
                              />
                              <button
                                className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                                onClick={() => {
                                  setShowNewHeaderInput(false);
                                  setNewHeaderText("");
                                  setNewHeaderItemId(null);
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <button
                  className="px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
                  style={{ backgroundColor: "rgba(21, 99, 114, 0.12)", color: "#156372" }}
                  onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = "rgba(21, 99, 114, 0.15)"}
                  onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                  onClick={handleAddItem}
                >
                  <Plus size={16} />
                  Add New Row
                </button>
                <button
                  onClick={() => setIsBulkAddModalOpen(true)}
                  className="px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 border bg-white"
                  style={{ color: "#156372", borderColor: "#156372" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as any).style.backgroundColor = "rgba(21, 99, 114, 0.08)";
                    (e.currentTarget as any).style.borderColor = "#0D4A52";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as any).style.backgroundColor = "#ffffff";
                    (e.currentTarget as any).style.borderColor = "#156372";
                  }}
                >
                  <CheckSquare size={16} />
                  Add Items in Bulk
                </button>
              </div>
            </div>

            {/* Notes & Summary */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-10">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Customer Notes</label>
                <textarea
                  className="w-full h-28 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] bg-white"
                  value={formData.customerNotes}
                  onChange={(e) => setFormData(p => ({ ...p, customerNotes: e.target.value }))}
                />
                <p className="mt-1 text-xs text-gray-500">Will be displayed on the credit note</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 shadow-sm">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-gray-600">Sub Total</span>
                  <span className="font-semibold text-gray-900">{formData.subTotal.toFixed(2)}</span>
                </div>

                {showTransactionDiscount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Discount</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden">
                      <input
                        type="number"
                        className="w-16 px-2 py-1 text-sm text-right focus:outline-none"
                        value={formData.discount}
                        onChange={(e) => handleSummaryChange("discount", e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-2 py-1 border-l border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        onClick={() => handleSummaryChange("discountType", formData.discountType === "percent" ? "fixed" : "percent")}
                      >
                        {formData.discountType === "percent" ? "%" : "$"}
                      </button>
                    </div>
                    <span className="min-w-[70px] text-right text-sm text-gray-900">
                      {(formData.discountType === "percent"
                        ? (formData.subTotal * parseFloat(formData.discount as any) / 100)
                        : Number(formData.discount) || 0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                )}

                {showShippingCharges && (
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      Shipping Charges <Info size={14} className="text-gray-400" />
                    </span>
                    <button
                      type="button"
                      className="text-[10px] text-[#156372] hover:text-[#0D4A52] hover:underline text-left"
                      onClick={(e) => e.preventDefault()}
                    >
                      Configure Account
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:border-[#156372] bg-white"
                      value={formData.shippingCharges}
                      onChange={(e) => handleSummaryChange("shippingCharges", parseFloat(e.target.value) || 0)}
                    />
                    <span className="min-w-[70px] text-right text-sm text-gray-900">{(formData.shippingCharges || 0).toFixed(2)}</span>
                  </div>
                </div>
                )}

                {showAdjustment && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Adjustment</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:border-[#156372] bg-white"
                      value={formData.adjustment}
                      onChange={(e) => handleSummaryChange("adjustment", parseFloat(e.target.value) || 0)}
                    />
                    <span className="min-w-[70px] text-right text-sm text-gray-900">{(formData.adjustment || 0).toFixed(2)}</span>
                  </div>
                </div>
                )}

                {Object.keys(taxSummary).length > 0 && (
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    {Object.entries(taxSummary).map(([taxName, amount]) => (
                      <div key={taxName} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{taxName}</span>
                        <span className="text-gray-900">{amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-gray-700">Total Tax Amount</span>
                      <span className="text-gray-900">{totalTaxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">Total ({formData.currency})</span>
                    <span className="text-base font-bold text-gray-900">{formData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-900 mb-2">Terms & Conditions</label>
              <textarea
                className="w-full h-28 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] bg-white"
                placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                value={formData.termsAndConditions}
                onChange={(e) => setFormData(p => ({ ...p, termsAndConditions: e.target.value }))}
              />
            </div>

          </div>
        </div >
      </div >

      {/* Documents Modal */}
      {
        isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Choose from Documents</h2>
                <button onClick={() => setIsDocumentsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-2">
                  {["files", "bank-statements", "all-documents"].map(id => (
                    <div
                      key={id}
                      onClick={() => setSelectedInbox(id)}
                      className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${selectedInbox === id ? '' : 'text-gray-600 hover:bg-gray-200'}`}
                      style={selectedInbox === id ? { backgroundColor: "rgba(21, 99, 114, 0.1)", color: "#156372" } : {}}
                    >
                      {id.charAt(0).toUpperCase() + id.slice(1).replace("-", " ")}
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="mb-4 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                      value={documentSearch}
                      onChange={e => setDocumentSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    {availableDocuments
                      .filter(doc => {
                        if (selectedInbox === "files") return doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder;
                        if (selectedInbox === "bank-statements") return doc.folder === "Bank Statements" || doc.module === "Banking";
                        return true;
                      })
                      .filter(doc => doc.name.toLowerCase().includes(documentSearch.toLowerCase()))
                      .map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => {
                            if (selectedDocuments.includes(doc.id)) setSelectedDocuments(p => p.filter(id => id !== doc.id));
                            else setSelectedDocuments(p => [...p, doc.id]);
                          }}
                          className={`p-4 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${selectedDocuments.includes(doc.id) ? '' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                          style={selectedDocuments.includes(doc.id) ? { backgroundColor: "rgba(21, 99, 114, 0.1)", borderColor: "#156372" } : {}}
                        >
                          <div className="flex items-center gap-4">
                            <FileText size={20} className="text-gray-400" />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{doc.name}</div>
                              <div className="text-xs text-gray-500">{doc.size} • Uploaded by {doc.uploadedBy || "Me"}</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${selectedDocuments.includes(doc.id) ? '' : 'border-gray-300'}`}
                            style={selectedDocuments.includes(doc.id) ? { backgroundColor: "#156372", borderColor: "#156372" } : {}}
                          >
                            {selectedDocuments.includes(doc.id) && <Check size={14} className="text-white" />}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    const selectedDocs = availableDocuments.filter(d => selectedDocuments.includes(d.id)).map(doc => ({
                      id: doc.id,
                      name: doc.name,
                      size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                      file: null
                    }));
                    setFormData(prev => ({ ...prev, documents: [...prev.documents, ...selectedDocs] }));
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                  }}
                  className="px-6 py-2 text-white rounded-md text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e) => !(e.currentTarget as any).disabled && ((e.currentTarget as any).style.backgroundColor = "#0D4A52")}
                  onMouseLeave={(e) => !(e.currentTarget as any).disabled && ((e.currentTarget as any).style.backgroundColor = "#156372")}
                  disabled={selectedDocuments.length === 0}
                >
                  Attach Selected Files
                </button>
                <button onClick={() => setIsDocumentsModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Cloud Picker Modal */}
      {
        isCloudPickerOpen && (
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
                    ].map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedCloudProvider(provider.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${selectedCloudProvider === provider.id
                          ? 'text-white shadow-lg'
                          : 'text-slate-600 hover:bg-white hover:shadow-sm'
                          }`}
                        style={selectedCloudProvider === provider.id ? { backgroundColor: "#156372", boxShadow: "0 10px 15px -3px rgba(21, 99, 114, 0.2)" } : {}}
                      >
                        <div className={`w-2 h-2 rounded-full ${selectedCloudProvider === provider.id ? 'bg-white' : 'bg-slate-300'}`} />
                        {provider.name}
                      </button>
                    ))}
                  </div>

                  {/* Team Info / Help */}
                  <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(21, 99, 114, 0.1)" }}>
                        <Zap size={14} style={{ color: "#156372" }} />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Pro Tip</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Connect your team's shared cloud storage to collaborate faster on credit notes.
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
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho. The use and transfer of information received from Google APIs to Zoho will adhere to{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            Google API Services User Data Policy
                          </a>
                          , including the{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            Limited Use Requirements
                          </a>
                          .
                        </p>
                      </div>

                      {/* Authenticate Google Button */}
                      <button
                        className="px-8 py-3 text-white rounded-md text-sm font-semibold transition-colors shadow-sm"
                        style={{ backgroundColor: "#156372" }}
                        onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = "#0D4A52"}
                        onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = "#156372"}
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
                              <linearGradient id="dropboxGradientCredit" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0061FF" />
                                <stop offset="100%" stopColor="#0052CC" />
                              </linearGradient>
                            </defs>
                            <g fill="url(#dropboxGradientCredit)">
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
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate Dropbox Button */}
                      <button
                        className="px-8 py-3 text-white rounded-md text-sm font-semibold transition-colors shadow-sm"
                        style={{ backgroundColor: "#156372" }}
                        onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = "#0D4A52"}
                        onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = "#156372"}
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
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate Box Button */}
                      <button
                        className="px-8 py-3 text-white rounded-md text-sm font-semibold transition-colors shadow-sm"
                        style={{ backgroundColor: "#156372" }}
                        onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = "#0D4A52"}
                        onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = "#156372"}
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
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate OneDrive Button */}
                      <button
                        className="px-8 py-3 text-white rounded-md text-sm font-semibold transition-colors shadow-sm"
                        style={{ backgroundColor: "#156372" }}
                        onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = "#0D4A52"}
                        onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = "#156372"}
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
                          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-[#156372] transition-all font-medium text-slate-700"
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
                            { id: 'cf1', name: 'Credit_Note_Template.pdf', size: 1048576, modified: '2 days ago', type: 'pdf' },
                            { id: 'cf2', name: 'Return_Authorization.pdf', size: 2097152, modified: 'Yesterday', type: 'pdf' },
                            { id: 'cf3', name: 'Product_Return_Form.pdf', size: 524288, modified: '1 week ago', type: 'pdf' },
                            { id: 'cf4', name: 'Refund_Receipt.jpg', size: 4194304, modified: '3 hours ago', type: 'image' },
                            { id: 'cf5', name: 'Credit_Records.zip', size: 8388608, modified: 'May 12, 2025', type: 'zip' },
                          ]
                            .filter(f => f.name.toLowerCase().includes(cloudSearchQuery.toLowerCase()))
                            .map((file) => (
                              <div
                                key={file.id}
                                onClick={() => {
                                  if (selectedCloudFiles.find(sf => sf.id === file.id)) {
                                    setSelectedCloudFiles(selectedCloudFiles.filter(sf => sf.id !== file.id));
                                  } else {
                                    setSelectedCloudFiles([...selectedCloudFiles, file]);
                                  }
                                }}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${selectedCloudFiles.find(sf => sf.id === file.id)
                                  ? ''
                                  : 'bg-white border-transparent hover:bg-slate-50'
                                  }`}
                                style={selectedCloudFiles.find(sf => sf.id === file.id) ? { backgroundColor: "rgba(21, 99, 114, 0.1)", borderColor: "#156372" } : {}}
                              >
                                <div className="w-[60%] flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center ${selectedCloudFiles.find(sf => sf.id === file.id) ? '' : 'bg-slate-100 text-slate-500'
                                    }`}
                                    style={selectedCloudFiles.find(sf => sf.id === file.id) ? { backgroundColor: "rgba(21, 99, 114, 0.2)", color: "#156372" } : {}}>
                                    <FileText size={16} />
                                  </div>
                                  <span className="text-[14px] font-medium text-slate-700">{file.name}</span>
                                </div>
                                <div className="w-[20%] text-right text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
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
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => (e.currentTarget as any).style.color = "#0D4A52"}
                            onMouseLeave={(e) => (e.currentTarget as any).style.color = "#156372"}
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
                                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#156372" }}>
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
                          <div className="absolute top-12 right-12 w-4 h-4 transform rotate-45" style={{ backgroundColor: "#156372" }}></div>
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
                  className={`px-6 py-2 text-white rounded-md text-sm font-medium transition-colors ${selectedCloudFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e) => selectedCloudFiles.length > 0 && ((e.currentTarget as any).style.backgroundColor = "#0D4A52")}
                  onMouseLeave={(e) => selectedCloudFiles.length > 0 && ((e.currentTarget as any).style.backgroundColor = "#156372")}
                  disabled={selectedCloudFiles.length === 0}
                >
                  Attach ({selectedCloudFiles.length})
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Items in Bulk Modal */}
      {
        isBulkAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancelBulkAdd}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add Items in Bulk</h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900"
                  onClick={handleCancelBulkAdd}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left Pane - Item Search and List */}
                <div className="w-1/2 border-r border-gray-200 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Type to search or scan the barcode of the item."
                        value={bulkAddSearch}
                        onChange={(e) => setBulkAddSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {getBulkFilteredItems().map(item => {
                      const isSelected = bulkSelectedItems.find(selected => selected.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between ${isSelected ? "" : ""
                            }`}
                          style={isSelected ? { backgroundColor: "rgba(21, 99, 114, 0.1)" } : {}}
                          onClick={() => handleBulkItemToggle(item)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {item.sku} Rate: {formData.currency}{item.rate.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Stock on Hand {item.stockOnHand.toFixed(2)} {item.unit}
                            </div>
                            {isSelected && (
                              <div className="mt-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#156372" }}>
                                <Check size={16} className="text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Pane - Selected Items */}
                <div className="w-1/2 flex flex-col">
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
                  <div className="flex-1 overflow-y-auto">
                    {bulkSelectedItems.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        Click the item names from the left pane to select them.
                      </div>
                    ) : (
                      <div className="p-4 space-y-2">
                        {bulkSelectedItems.map(selectedItem => (
                          <div key={selectedItem.id} className="p-3 bg-gray-50 rounded border border-gray-200 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{selectedItem.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                SKU: {selectedItem.sku} • {formData.currency}{selectedItem.rate.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                value={selectedItem.quantity || 1}
                                onChange={(e) => handleBulkItemQuantityChange(selectedItem.id, e.target.value)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBulkItemToggle(selectedItem);
                                }}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                <button
                  className="px-6 py-2 text-white rounded-md text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e) => !(e.currentTarget as any).disabled && ((e.currentTarget as any).style.backgroundColor = "#0D4A52")}
                  onMouseLeave={(e) => !(e.currentTarget as any).disabled && ((e.currentTarget as any).style.backgroundColor = "#156372")}
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

      {/* Advanced Customer Search Modal */}
      {
        customerSearchModalOpen && typeof document !== 'undefined' && document.body && createPortal(
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
                  className="w-8 h-8 text-white rounded flex items-center justify-center"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#0D4A52"}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "#156372"}
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
                        {["Display Name", "Email", "Company Name", "Phone"].map((criteria) => (
                          <button
                            key={criteria}
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                  />
                  <button
                    type="button"
                    onClick={handleCustomerSearch}
                    className="px-6 py-2 text-white rounded-md font-medium"
                    style={{ backgroundColor: "#156372" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#0D4A52"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#156372"}
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
                      customerPaginatedResults.map((customer) => (
                        <tr
                          key={customer.id || customer.name}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setFormData(prev => ({ ...prev, customerName: customer.displayName || customer.name || "" }));
                            setCustomerSearchModalOpen(false);
                            setCustomerSearchTerm("");
                            setCustomerSearchResults([]);
                          }}
                        >
                          <td className="px-4 py-3 text-sm hover:underline" style={{ color: "#156372" }} onMouseEnter={(e) => (e.target as HTMLElement).style.color = "#0D4A52"} onMouseLeave={(e) => (e.target as HTMLElement).style.color = "#156372"}>
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
        )
      }

      {/* Quick New Customer Modal */}
      {typeof document !== "undefined" && document.body && createPortal(
        <div
          className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
          onClick={() => {
            setIsNewCustomerQuickActionOpen(false);
            reloadCustomersForCreditNote();
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
                    await reloadCustomersForCreditNote();
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
                  reloadCustomersForCreditNote();
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
          onClick={() => {
            setIsNewSalespersonQuickActionOpen(false);
            reloadSalespersonsForCreditNote();
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1200px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Salesperson (Quick Action)</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isReloadingSalespersonFrame || isAutoSelectingSalespersonFromQuickAction}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => {
                    setIsReloadingSalespersonFrame(true);
                    setSalespersonQuickActionFrameKey(prev => prev + 1);
                  }}
                >
                  {isReloadingSalespersonFrame ? "Reloading..." : "Reload Form"}
                </button>
                <button
                  type="button"
                  disabled={isRefreshingSalespersonsQuickAction || isAutoSelectingSalespersonFromQuickAction}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={async () => {
                    setIsRefreshingSalespersonsQuickAction(true);
                    await reloadSalespersonsForCreditNote();
                    setIsRefreshingSalespersonsQuickAction(false);
                  }}
                >
                  {isRefreshingSalespersonsQuickAction ? "Refreshing..." : "Refresh Salespersons"}
                </button>
              </div>
              <button
                type="button"
                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                onClick={() => {
                  setIsNewSalespersonQuickActionOpen(false);
                  reloadSalespersonsForCreditNote();
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 p-2 bg-gray-100">
              <iframe
                key={salespersonQuickActionFrameKey}
                title="New Salesperson Quick Action"
                src="/sales/salespersons/new?embed=1"
                loading="eager"
                onLoad={async () => {
                  if (isReloadingSalespersonFrame) {
                    setIsReloadingSalespersonFrame(false);
                  }
                  await tryAutoSelectNewSalespersonFromQuickAction();
                }}
                className="w-full h-full bg-white rounded border border-gray-200"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {isCreditNoteNumberModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50"
          onClick={() => setIsCreditNoteNumberModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-[600px] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[18px] leading-none font-medium text-gray-800">Configure Credit Note Number Preferences</h2>
              <button
                type="button"
                onClick={() => setIsCreditNoteNumberModalOpen(false)}
                className="w-7 h-7 rounded-md border border-[#2f80ed] text-red-500 flex items-center justify-center hover:bg-blue-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="grid grid-cols-[1fr_1.4fr] gap-x-5 gap-y-1 pb-5 border-b border-gray-200">
                <div>
                  <p className="text-[13px] leading-none font-semibold text-gray-800 mb-2">Location</p>
                  <p className="text-[14px] leading-none text-gray-700">Head Office</p>
                </div>
                <div>
                  <p className="text-[13px] leading-none font-semibold text-gray-800 mb-2">Associated Series</p>
                  <p className="text-[14px] leading-none text-gray-700">Default Transaction Series</p>
                </div>
              </div>

              <div className="pt-5">
                {creditNoteNumberMode === "auto" ? (
                  <p className="text-[12px] leading-[1.45] text-gray-700 mb-4 max-w-[96%]">
                    Your credit note numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                  </p>
                ) : (
                  <p className="text-[12px] leading-[1.45] text-gray-700 mb-4 max-w-[96%]">
                    You have selected manual credit note numbering. Do you want us to auto-generate it for you?
                  </p>
                )}

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="pt-1">
                      <input
                        type="radio"
                        name="creditNoteNumberMode"
                        value="auto"
                        checked={creditNoteNumberMode === "auto"}
                        onChange={() => setCreditNoteNumberMode("auto")}
                        className="w-4 h-4 text-[#2f80ed] border-gray-300 focus:ring-[#2f80ed] cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] leading-none font-semibold text-gray-800">
                          Continue auto-generating credit note numbers
                        </span>
                        <Info size={11} className="text-gray-400" />
                      </div>
                      {creditNoteNumberMode === "auto" && (
                        <div className="mt-3 pl-4">
                          <div className="grid grid-cols-[110px_1fr] gap-4">
                            <div>
                              <label className="block text-[11px] text-gray-700 mb-1">Prefix</label>
                              <input
                                type="text"
                                value={creditNotePrefix}
                                onChange={(e) => {
                                  const nextPrefix = sanitizeCreditNotePrefix(e.target.value);
                                  setCreditNotePrefix(nextPrefix);
                                  setFormData(prev => ({
                                    ...prev,
                                    creditNoteNumber: buildCreditNoteNumber(nextPrefix, creditNoteNextNumber)
                                  }));
                                }}
                                className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-[12px] text-gray-700 focus:outline-none focus:border-[#156372]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-700 mb-1">Next Number</label>
                              <input
                                type="text"
                                value={creditNoteNextNumber}
                                onChange={(e) => {
                                  const nextDigits = extractCreditNoteDigits(e.target.value) || "";
                                  setCreditNoteNextNumber(nextDigits);
                                  setFormData(prev => ({
                                    ...prev,
                                    creditNoteNumber: buildCreditNoteNumber(creditNotePrefix, nextDigits)
                                  }));
                                }}
                                className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-[12px] text-gray-700 focus:outline-none focus:border-[#156372]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="pt-1">
                      <input
                        type="radio"
                        name="creditNoteNumberMode"
                        value="manual"
                        checked={creditNoteNumberMode === "manual"}
                        onChange={() => setCreditNoteNumberMode("manual")}
                        className="w-4 h-4 text-[#2f80ed] border-gray-300 focus:ring-[#2f80ed] cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[13px] leading-none text-gray-700">
                        Enter credit note numbers manually
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-5 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (creditNoteNumberMode === "auto") {
                    setFormData(prev => ({
                      ...prev,
                      creditNoteNumber: buildCreditNoteNumber(creditNotePrefix, creditNoteNextNumber)
                    }));
                  }
                  setIsCreditNoteNumberModalOpen(false);
                }}
                className="px-4 h-8 bg-[#22b573] text-white rounded-md text-[12px] font-semibold hover:bg-[#1ea465]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCreditNoteNumberModalOpen(false)}
                className="px-4 h-8 bg-white border border-gray-300 text-gray-700 rounded-md text-[12px] font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isManageSalespersonsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsManageSalespersonsOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Manage Salespersons</h2>
              <button
                onClick={() => setIsManageSalespersonsOpen(false)}
                className="p-2 rounded-lg text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {selectedSalespersonIds.length > 0 ? (
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">
                    Merge
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPosition({ top: rect.bottom, left: rect.left });
                      setManageSalespersonMenuOpen("BULK_ACTIONS");
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2"
                  >
                    More Actions
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button
                  onClick={() => setSelectedSalespersonIds([])}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="p-6 border-b border-gray-200 flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Salesperson"
                    value={manageSalespersonSearch}
                    onChange={(e) => setManageSalespersonSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                  />
                </div>
                <button
                  onClick={() => {
                    setIsNewSalespersonFormOpen(true);
                    setManageSalespersonSearch("");
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md"
                >
                  <Plus size={16} />
                  New Salesperson
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {isNewSalespersonFormOpen ? (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Salesperson</h3>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={newSalespersonData.email}
                        onChange={handleNewSalespersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveAndSelectSalesperson}
                        className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md"
                      >
                        Add
                      </button>
                      <button
                        onClick={handleCancelNewSalesperson}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                        checked={filteredManageSalespersons.length > 0 && selectedSalespersonIds.length === filteredManageSalespersons.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSalespersonIds(filteredManageSalespersons.map((s: any) => String(s.id || s._id)));
                          } else {
                            setSelectedSalespersonIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SALESPERSON NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredManageSalespersons.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        {manageSalespersonSearch ? "No salespersons found" : "No salespersons available"}
                      </td>
                    </tr>
                  ) : (
                    filteredManageSalespersons.map((salesperson: any) => {
                      const salespersonId = String(salesperson.id || salesperson._id);
                      return (
                        <tr key={salespersonId} className="group hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                                checked={selectedSalespersonIds.includes(salespersonId)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSalespersonIds([...selectedSalespersonIds, salespersonId]);
                                  } else {
                                    setSelectedSalespersonIds(selectedSalespersonIds.filter(id => id !== salespersonId));
                                  }
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{salesperson.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{salesperson.email || ""}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="hidden group-hover:flex items-center justify-end gap-2">
                              <button
                                className="p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuPosition({ top: rect.bottom, left: rect.right });
                                  setManageSalespersonMenuOpen(manageSalespersonMenuOpen === salespersonId ? null : salespersonId);
                                }}
                                className={`p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded ${manageSalespersonMenuOpen === salespersonId ? "bg-gray-100 text-[#156372]" : ""}`}
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-[260px] right-0 bg-white border-t border-gray-200 py-4 px-8 z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-[980px] mx-auto flex items-center gap-3">
          <button
            onClick={() => handleSave("draft")}
            disabled={saveLoading !== null}
            className={`px-5 py-2 border border-gray-300 rounded text-sm text-gray-700 font-medium bg-white ${saveLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}`}
          >
            {saveLoading === "draft" && <Loader2 className="inline-block mr-2 animate-spin" size={16} />}
            {saveLoading === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => handleSave("open")}
            disabled={saveLoading !== null}
            className={`px-8 py-2 text-white rounded text-sm font-semibold shadow-md ${saveLoading ? "opacity-60 cursor-not-allowed" : ""}`}
            style={{ backgroundColor: "#156372", boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.2)" }}
            onMouseEnter={(e) => {
              if (saveLoading === null) (e.target as HTMLElement).style.backgroundColor = "#0D4A52";
            }}
            onMouseLeave={(e) => {
              if (saveLoading === null) (e.target as HTMLElement).style.backgroundColor = "#156372";
            }}
          >
            {saveLoading === "open" && <Loader2 className="inline-block mr-2 animate-spin" size={16} />}
            {saveLoading === "open" ? "Saving..." : "Save as Open"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saveLoading !== null}
            className={`px-5 py-2 border border-gray-300 rounded text-sm text-gray-700 font-medium bg-white ${saveLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div >
  );
}
