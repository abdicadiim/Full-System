import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Edit3,
  Upload as UploadIcon,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Info,
  MoreVertical,
  Calendar,
  Check,
  Image as ImageIcon,
  FileText,
  Bookmark,
  File,
  Trash2,
} from "lucide-react";
import DatePicker from "../../../components/DatePicker";
import NewVendorModal from "../bills/NewVendorModal";
import { vendorsAPI, customersAPI, expensesAPI, chartOfAccountsAPI, journalEntriesAPI, projectsAPI, currenciesAPI as dbCurrenciesAPI, taxesAPI, reportingTagsAPI, locationsAPI } from "../../../services/api";
import NewCurrencyModal from "../../settings/organization-settings/setup-configurations/currencies/NewCurrencyModal";
import NewTaxModal from "../../../../components/modals/NewTaxModal";
import { createTaxLocal } from "../../settings/organization-settings/taxes-compliance/TAX/storage";
import { useCurrency } from "../../../hooks/useCurrency";
import { filterActiveRecords } from "../shared/activeFilters";
import RecordMileage from "./RecordMileage";

// Accounts API
const accountsAPI = {
  getAll: async () => {
    const response = await chartOfAccountsAPI.getAccounts({ isActive: true });
    return { success: true, data: response?.data || [] };
  },
  create: async (data: any) => {
    const response = await chartOfAccountsAPI.createAccount(data);
    return {
      success: Boolean(response?.success),
      code: response?.success ? 0 : 1,
      data: response?.data || null,
      message: response?.message || "",
    };
  },
};

const EXPENSE_ACCOUNTS_STRUCTURE = {
  "Cost Of Goods Sold": [
    "Cost of Goods Sold"
  ],
  "Expense": [
    "Advertising And Marketing",
    "Automobile Expense",
    "Bad Debt",
    "Bank Fees and Charges",
    "Consultant Expense",
    "Credit Card Charges",
    "Depreciation Expense",
    "Fuel/Mileage Expenses",
    "IT and Internet Expenses",
    "Janitorial Expense",
    "Lodging",
    "Meals and Entertainment",
    "Office Supplies",
    "Other Expenses",
    "Parking",
    "Postage",
    "Printing and Stationery",
    "Purchase Discounts",
    "Rent Expense",
    "Repairs and Maintenance",
    "Salaries and Employee Wages",
    "Telephone Expense",
    "Travel Expense"
  ],
  "Other Current Liability": [
    "Employee Reimbursements",
    "VAT Payable"
  ],
  "Fixed Asset": [
    "Furniture and Equipment"
  ],
  "Other Current Asset": [
    "Advance Tax",
    "Employee Advance",
    "Prepaid Expenses",
    "Sales to Customers (Cash)"
  ]
};

const ACCOUNT_TYPES_STRUCTURE = {
  "Asset": [
    "Other Asset",
    "Other Current Asset",
    "Fixed Asset",
    "Intangible Asset",
    "Non Current Asset"
  ],
  "Liability": [
    "Other Current Liability",
    "Non Current Liability",
    "Other Liability"
  ],
  "Expense": [
    "Expense",
    "Cost of Goods Sold",
    "Other Expense"
  ]
};

const ACCOUNT_TYPE_DESCRIPTIONS = {
  "Fixed Asset": {
    title: "Asset",
    description: "Any long term investment or an asset that cannot be converted into cash easily like:",
    points: ["Land and Buildings", "Plant, Machinery and Equipment", "Computers", "Furniture"]
  },
  "Other Asset": {
    title: "Other Asset",
    description: "Assets that do not fall under Fixed Assets or Current Assets.",
    points: ["Security Deposits", "Prepaid long-term expenses"]
  },
  "Other Current Asset": {
    title: "Other Current Asset",
    description: "Assets that can be converted into cash within one year.",
    points: ["Prepaid expenses", "Inventory"]
  },
  "Intangible Asset": {
    title: "Intangible Asset",
    description: "Assets that are not physical in nature.",
    points: ["Patents", "Copyrights"]
  },
  "Non Current Asset": {
    title: "Non Current Asset",
    description: "Long term investments.",
    points: ["Long term investments"]
  },
  "Expense": {
    title: "Expense",
    description: "Costs incurred for the day-to-day operation of the business.",
    points: ["Rent", "Salaries", "Utilities"]
  },
  "Cost of Goods Sold": {
    title: "COGS",
    description: "Direct costs attributable to the production of the goods sold in a company.",
    points: ["Material costs", "Direct labor"]
  },
  "Other Expense": {
    title: "Other Expense",
    description: "Expenses that are not directly related to the main business.",
    points: ["Exchange gain or loss"]
  },
  "Other Current Liability": {
    title: "Other Current Liability",
    description: "Short-term financial obligations that do not fit into other liability categories.",
    points: ["Short term loans", "Sales Tax Payable"]
  },
  "Non Current Liability": {
    title: "Non Current Liability",
    description: "Long term financial obligations.",
    points: ["Long term loans"]
  },
  "Other Liability": {
    title: "Other Liability",
    description: "Miscellaneous liabilities.",
    points: ["Tax payable"]
  }
};

const PAID_THROUGH_STRUCTURE = {
  "Cash": [
    "Petty Cash",
    "Undeposited Funds"
  ],
  "Other Current Asset": [
    "Advance Tax",
    "Employee Advance",
    "Prepaid Expenses"
  ],
  "Fixed Asset": [
    "Furniture and Equipment"
  ],
  "Other Current Liability": [
    "Employee Reimbursements"
  ],
  "Equity": [
    "Drawings",
    "Opening Balance Offset",
    "Owner's Equity"
  ]
};

const VENDORS_LIST = [
  "Vendor A",
  "Vendor B",
  "Vendor C",
  "Sample Vendor"
];

const CUSTOMERS_LIST = [
  "KOWNI",
  "Customer A",
  "Customer B",
  "Sample Customer"
];

const ITEMIZED_EXPENSE_ACCOUNT_OPTIONS = [
  "Advertising And Marketing",
  "Automobile Expense",
  "Consultant Expense",
  "Credit Card Charges",
  "Depreciation Expense",
  "IT and Internet Expenses",
  "Janitorial Expense",
  "Lodging",
  "Meals and Entertainment",
  "Office Supplies",
  "Postage",
  "Printing and Stationery",
  "Purchase Discounts",
  "Rent Expense",
  "Repairs and Maintenance",
  "Salaries and Employee Wages",
  "Telephone Expense",
  "Travel Expense",
  "Goods In Transit",
  "Prepaid Expenses",
];

const safeReadLocalArray = (keys: string[]) => {
  if (typeof localStorage === "undefined") return [];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Continue to next key
    }
  }
  return [];
};

const getInitialLocations = () => safeReadLocalArray(["taban_locations_cache"]);
const getInitialCurrencies = () => safeReadLocalArray(["taban_currencies", "taban_books_currencies"]);
const getInitialTaxes = () =>
  safeReadLocalArray(["taban_settings_taxes_v1", "taban_books_taxes"]);
const getInitialCustomerCustomFields = () => {
  const rows = safeReadLocalArray([
    "taban_customer_custom_fields",
    "taban_books_customer_custom_fields",
    "taban_customers_custom_fields",
  ]);
  return rows
    .map((field: any) =>
      String(field?.label || field?.name || field?.fieldName || field?.title || "").trim()
    )
    .filter(Boolean);
};

export default function RecordExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: baseCurrencyCode } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const expenseAccountRef = useRef(null);
  const locationRef = useRef(null);
  const customerRef = useRef(null);
  const projectRef = useRef(null);
  const uploadDropdownRef = useRef(null);
  const paidThroughRef = useRef(null);
  const initialLocationsCache = getInitialLocations();
  const initialCurrenciesCache = getInitialCurrencies();
  const initialLocationName =
    String(
      initialLocationsCache[0]?.name ||
      initialLocationsCache[0]?.locationName ||
      initialLocationsCache[0]?.location_name ||
      initialLocationsCache[0]?.displayName ||
      initialLocationsCache[0]?.title ||
      "Head Office"
    ).trim() || "Head Office";
  const initialCurrencyCode = String(
    initialCurrenciesCache.find((c: any) => c?.isBaseCurrency || c?.is_base_currency || c?.isBase)?.code ||
    initialCurrenciesCache[0]?.code ||
    baseCurrencyCode ||
    "USD"
  ).trim();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState("");
  const [expenseAccountOpen, setExpenseAccountOpen] = useState(false);
  const [expenseAccountSearch, setExpenseAccountSearch] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  // Parent account dropdown state
  const [parentAccountOpen, setParentAccountOpen] = useState(false);
  const [parentAccountSearch, setParentAccountSearch] = useState("");

  // Paid Through dropdown state
  const [paidThroughOpen, setPaidThroughOpen] = useState(false);
  const [paidThroughSearch, setPaidThroughSearch] = useState("");

  // Vendor dropdown state
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");

  // Customer dropdown state
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);
  const [newVendorModalOpen, setNewVendorModalOpen] = useState(false);
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [customerQuickActionFrameKey, setCustomerQuickActionFrameKey] = useState(0);
  const [quickCustomerFirstName, setQuickCustomerFirstName] = useState("");
  const [quickCustomerLastName, setQuickCustomerLastName] = useState("");
  const [quickCustomerCompanyName, setQuickCustomerCompanyName] = useState("");
  const [quickCustomerDisplayName, setQuickCustomerDisplayName] = useState("");
  const [quickCustomerEmail, setQuickCustomerEmail] = useState("");
  const [quickCustomerActiveTab, setQuickCustomerActiveTab] = useState<"otherDetails" | "address" | "customFields" | "reportingTags" | "remarks">("otherDetails");
  const [quickCustomerAddressLine1, setQuickCustomerAddressLine1] = useState("");
  const [quickCustomerAddressLine2, setQuickCustomerAddressLine2] = useState("");
  const [quickCustomerCity, setQuickCustomerCity] = useState("");
  const [quickCustomerState, setQuickCustomerState] = useState("");
  const [quickCustomerPostalCode, setQuickCustomerPostalCode] = useState("");
  const [quickCustomerCountry, setQuickCustomerCountry] = useState("");
  const [quickCustomerCustomFieldValue, setQuickCustomerCustomFieldValue] = useState("");
  const [quickCustomerReportingTagValue, setQuickCustomerReportingTagValue] = useState("");
  const [quickCustomerRemarks, setQuickCustomerRemarks] = useState("");
  const [quickCustomerLanguage, setQuickCustomerLanguage] = useState("English");
  const [quickCustomerLocationCode, setQuickCustomerLocationCode] = useState("");
  const [quickCustomerCurrency, setQuickCustomerCurrency] = useState(initialCurrencyCode);
  const [quickCustomerOpeningBalance, setQuickCustomerOpeningBalance] = useState("");
  const [quickCustomerCustomFields, setQuickCustomerCustomFields] = useState<Array<{ label: string; value: string }>>([]);
  const [quickCustomerReportingTags, setQuickCustomerReportingTags] = useState<Record<string, string>>({});
  const [associateTagsModalOpen, setAssociateTagsModalOpen] = useState(false);
  const [associateTagsRowIndex, setAssociateTagsRowIndex] = useState<number | null>(null);
  const [associateTagsDraft, setAssociateTagsDraft] = useState<Record<string, string>>({});
  const [vendorSearchModalOpen, setVendorSearchModalOpen] = useState(false);
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
  const [newCurrencyModalOpen, setNewCurrencyModalOpen] = useState(false);
  const [taxes, setTaxes] = useState<any[]>(() => getInitialTaxes());
  const [accountQuickActionTarget, setAccountQuickActionTarget] = useState<"expenseAccount" | "paidThrough">("expenseAccount");

  // Vendor search modal state
  const [vendorSearchCriteria, setVendorSearchCriteria] = useState("Display Name");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [vendorSearchResults, setVendorSearchResults] = useState<any[]>([]);
  const [vendorSearchPage, setVendorSearchPage] = useState(1);
  const [vendorSearchCriteriaOpen, setVendorSearchCriteriaOpen] = useState(false);

  // Customer search modal state
  const [customerSearchCriteria, setCustomerSearchCriteria] = useState("Display Name");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState(false);
  const [openItemizedAccountIndex, setOpenItemizedAccountIndex] = useState<number | null>(null);
  const [itemizedAccountSearch, setItemizedAccountSearch] = useState("");
  const [openItemizedTaxIndex, setOpenItemizedTaxIndex] = useState<number | null>(null);
  const [itemizedTaxSearch, setItemizedTaxSearch] = useState("");
  const [expenseTaxDropdownOpen, setExpenseTaxDropdownOpen] = useState(false);
  const [expenseTaxSearch, setExpenseTaxSearch] = useState("");
  const [amountCurrencyOpen, setAmountCurrencyOpen] = useState(false);
  const [bulkLocationOpenIndex, setBulkLocationOpenIndex] = useState<number | null>(null);
  const [bulkLocationSearch, setBulkLocationSearch] = useState("");
  const [bulkTaxOpenIndex, setBulkTaxOpenIndex] = useState<number | null>(null);
  const [bulkTaxSearch, setBulkTaxSearch] = useState("");
  const [bulkCustomerOpenIndex, setBulkCustomerOpenIndex] = useState<number | null>(null);
  const [bulkCustomerSearch, setBulkCustomerSearch] = useState("");
  const [bulkProjectOpenIndex, setBulkProjectOpenIndex] = useState<number | null>(null);
  const [bulkProjectSearch, setBulkProjectSearch] = useState("");
  const [bulkRowMenuOpenIndex, setBulkRowMenuOpenIndex] = useState<number | null>(null);
  const [bulkCategoryOpenIndex, setBulkCategoryOpenIndex] = useState<number | null>(null);
  const [bulkCategorySearch, setBulkCategorySearch] = useState("");
  const [bulkCurrencyOpenIndex, setBulkCurrencyOpenIndex] = useState<number | null>(null);
  const [bulkCurrencySearch, setBulkCurrencySearch] = useState("");
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);
  const [newTaxTarget, setNewTaxTarget] = useState<{ type: "expense" } | { type: "itemized"; index: number } | null>(null);

  const getFileExtension = (name: string) => {
    const parts = String(name || "").split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  };

  const isImageUpload = (fileRow: any) => {
    const mime = String(fileRow?.type || "").toLowerCase();
    const ext = getFileExtension(String(fileRow?.name || ""));
    const imageExts = new Set(["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tif", "tiff", "jfif"]);
    return mime.startsWith("image/") || imageExts.has(ext);
  };

  const getDocumentTypeLabel = (fileRow: any) => {
    const mime = String(fileRow?.type || "").toLowerCase();
    const ext = getFileExtension(String(fileRow?.name || ""));
    if (mime.includes("pdf") || ext === "pdf") return "PDF";
    if (mime.includes("word") || ext === "doc" || ext === "docx") return "DOC";
    if (mime.includes("excel") || ext === "xls" || ext === "xlsx") return "XLS";
    if (mime.includes("csv") || ext === "csv") return "CSV";
    if (mime.includes("text") || ext === "txt") return "TXT";
    if (ext) return ext.toUpperCase();
    return "FILE";
  };

  useEffect(() => {
    const first = uploadedFiles[0];
    if (!first || !first.file || !isImageUpload(first)) {
      setUploadedPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(first.file);
    setUploadedPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [uploadedFiles]);

  // Helper function to close all dropdowns
  const closeAllDropdowns = () => {
    setExpenseAccountOpen(false);
    setLocationOpen(false);
    setLocationSearch("");
    setPaidThroughOpen(false);
    setVendorOpen(false);
    setCustomerOpen(false);
    setProjectOpen(false);
    setProjectSearch("");
    setUploadDropdownOpen(false);
    setVendorSearchCriteriaOpen(false);
    setCustomerSearchCriteriaOpen(false);
    setParentAccountOpen(false);
    setOpenItemizedAccountIndex(null);
    setOpenItemizedTaxIndex(null);
    setItemizedAccountSearch("");
    setItemizedTaxSearch("");
    setExpenseTaxDropdownOpen(false);
    setExpenseTaxSearch("");
    setAmountCurrencyOpen(false);
  };

  // Load vendors and customers from API
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Currencies from database
  const [currencies, setCurrencies] = useState<any[]>(() => initialCurrenciesCache);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [locations, setLocations] = useState<any[]>(() => initialLocationsCache);

  // Accounts from database
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Projects from database
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [customerProjects, setCustomerProjects] = useState<Array<{ id: string; name: string; customerId: string }>>([]);
  const [loadingCustomerProjects, setLoadingCustomerProjects] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saveLoadingState, setSaveLoadingState] = useState<null | "save" | "saveAndNew">(null);

  const normalizeText = (value: any) => String(value ?? "").trim();
  const getLocationName = (location: any) =>
    normalizeText(
      location?.name ||
      location?.locationName ||
      location?.location_name ||
      location?.branchName ||
      location?.branch_name ||
      location?.displayName ||
      location?.title
    );
  const getCurrencyCode = (currency: any) =>
    normalizeText(currency?.code || currency?.currencyCode || currency?.currency).toUpperCase();
  const locationNames = React.useMemo(
    () => Array.from(new Set(locations.map((loc: any) => getLocationName(loc)).filter(Boolean))),
    [locations]
  );
  const availableCurrencyCodes = React.useMemo(
    () => Array.from(new Set(currencies.map((cur: any) => getCurrencyCode(cur)).filter(Boolean))),
    [currencies]
  );
  const locationOptions = locationNames.length > 0 ? locationNames : ["Head Office"];
  const currencyOptions = React.useMemo(() => {
    const base = String(baseCurrencyCode || "").trim().toUpperCase();
    const deduped = availableCurrencyCodes.length > 0 ? availableCurrencyCodes : [base || "USD"];
    if (!base || !deduped.includes(base)) return deduped;
    return [base, ...deduped.filter((code) => code !== base)];
  }, [baseCurrencyCode, availableCurrencyCodes]);
  const filteredLocationOptions = locationOptions.filter((loc) =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );
  const bulkCategoryOptions = [
    "Advertising And Marketing",
    "Automobile Expense",
    "Consultant Expense",
    "Credit Card Charges",
    "Depreciation Expense",
    "IT and Internet Expenses",
    "Janitorial Expense",
    "Lodging",
    "Meals and Entertainment",
    "Office Supplies",
    "Postage",
    "Printing and Stationery",
    "Purchase Discounts",
    "Rent Expense",
    "Repairs and Maintenance",
    "Salaries and Employee Wages",
    "Telephone Expense",
    "Travel Expense",
    "Goods In Transit",
    "Prepaid Expenses",
  ];

  const isObjectId = (value: any) => /^[a-f\d]{24}$/i.test(normalizeText(value));
  const getProjectId = (project: any) =>
    normalizeText(project?._id || project?.id || project?.project_id || project?.projectId);
  const getProjectName = (project: any) =>
    normalizeText(project?.name || project?.projectName || project?.project_name || project?.title);
  const getProjectCustomerId = (project: any) => {
    const rawCustomer = project?.customer_id || project?.customerId || project?.customer;
    if (rawCustomer && typeof rawCustomer === "object") {
      return normalizeText(rawCustomer?._id || rawCustomer?.id);
    }
    return normalizeText(rawCustomer);
  };
  const getProjectCustomerName = (project: any) =>
    normalizeText(
      project?.customerName ||
      project?.customer_name ||
      project?.customer?.name ||
      project?.customer?.displayName
    );
  const closeBulkDropdowns = () => {
    setBulkLocationOpenIndex(null);
    setBulkLocationSearch("");
    setBulkTaxOpenIndex(null);
    setBulkTaxSearch("");
    setBulkCustomerOpenIndex(null);
    setBulkCustomerSearch("");
    setBulkProjectOpenIndex(null);
    setBulkProjectSearch("");
    setBulkCategoryOpenIndex(null);
    setBulkCategorySearch("");
    setBulkCurrencyOpenIndex(null);
    setBulkCurrencySearch("");
    setBulkRowMenuOpenIndex(null);
  };

  const normalizeProjectRecords = (records: any[]) => {
    const seen = new Set<string>();
    return records
      .map((project: any) => ({
        id: getProjectId(project),
        name: getProjectName(project),
        customerId: getProjectCustomerId(project),
        customerName: getProjectCustomerName(project),
      }))
      .filter((project) => {
        if (!project.id || !project.name) return false;
        if (seen.has(project.id)) return false;
        seen.add(project.id);
        return true;
      });
  };

  const loadProjectsForSelectedCustomer = async (customerIdRaw: any) => {
    const customerId = normalizeText(customerIdRaw);
    if (!customerId) {
      setCustomerProjects([]);
      return;
    }

    setLoadingCustomerProjects(true);
    try {
      if (!isObjectId(customerId)) {
        const fallbackProjects = normalizeProjectRecords(allProjects).filter(
          (project) => project.customerId === customerId
        );
        setCustomerProjects(fallbackProjects);
        return;
      }

      let projectRecords: any[] = [];
      const response = await projectsAPI.getByCustomer(customerId);
      if (Array.isArray(response?.data)) {
        projectRecords = response.data;
      } else if (Array.isArray(response)) {
        projectRecords = response;
      }

      let normalizedProjects = normalizeProjectRecords(projectRecords);

      if (normalizedProjects.length === 0) {
        normalizedProjects = normalizeProjectRecords(allProjects).filter(
          (project) => project.customerId === customerId
        );
      }

      setCustomerProjects(normalizedProjects);
    } catch (error) {
      console.error("Error loading projects for selected customer:", error);
      const fallbackProjects = normalizeProjectRecords(allProjects).filter(
        (project) => project.customerId === customerId
      );
      setCustomerProjects(fallbackProjects);
    } finally {
      setLoadingCustomerProjects(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingVendors(true);
        const vendorsResponse = await vendorsAPI.getAll({ limit: 1000 });
        if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
          setAllVendors(filterActiveRecords(vendorsResponse.data));
        }
      } catch (error) {
        console.error("Error loading vendors:", error);
        setAllVendors([]);
      } finally {
        setLoadingVendors(false);
      }

      try {
        setLoadingCustomers(true);
        const customersResponse = await customersAPI.getAll({ limit: 1000 });
        if (customersResponse && customersResponse.success && customersResponse.data) {
          setAllCustomers(filterActiveRecords(customersResponse.data));
        }
      } catch (error) {
        console.error("Error loading customers:", error);
        setAllCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }

      try {
        const locationsResponse = await locationsAPI.getAll();
        const locationRows = Array.isArray(locationsResponse?.data)
          ? locationsResponse.data
          : Array.isArray(locationsResponse?.locations)
            ? locationsResponse.locations
            : Array.isArray(locationsResponse?.results)
              ? locationsResponse.results
              : Array.isArray(locationsResponse)
                ? locationsResponse
                : [];
        const cachedLocationsRaw = (() => {
          try {
            const raw = localStorage.getItem("taban_locations_cache");
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const combinedRows = [...locationRows, ...cachedLocationsRaw];
        const dedupedByName = Array.from(
          new Map(
            combinedRows
              .map((loc: any) => ({ loc, name: getLocationName(loc) }))
              .filter((entry: any) => Boolean(entry.name))
              .map((entry: any) => [entry.name.toLowerCase(), entry.loc])
          ).values()
        );
        const activeLocations = dedupedByName.filter((loc: any) => {
          const status = String(loc?.status || "").toLowerCase();
          if (status) return status === "active";
          return loc?.isActive !== false && loc?.is_active !== false && loc?.active !== false;
        });
        const finalLocations = activeLocations.length > 0 ? activeLocations : dedupedByName;
        setLocations(finalLocations);

        const nextLocationNames = Array.from(new Set(finalLocations.map((loc: any) => getLocationName(loc)).filter(Boolean)));
        const fallbackLocation = nextLocationNames[0] || "Head Office";
        setFormData((prev) => {
          const current = normalizeText(prev.location);
          const next = current && nextLocationNames.includes(current) ? current : fallbackLocation;
          return { ...prev, location: next };
        });
      } catch (error) {
        console.error("Error loading locations:", error);
        setLocations([]);
      }

      try {
        setLoadingCurrencies(true);
        const currenciesResponse = await dbCurrenciesAPI.getAll();
        const currencyRowsFromApi = Array.isArray(currenciesResponse?.data)
          ? currenciesResponse.data
          : Array.isArray(currenciesResponse)
            ? currenciesResponse
            : [];
        const settingsCurrenciesRaw = (() => {
          try {
            const raw = localStorage.getItem("taban_currencies");
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const expenseCurrenciesRaw = (() => {
          try {
            const raw = localStorage.getItem("taban_books_currencies");
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();

        const mergedCurrencies = Array.from(
          new Map(
            [...settingsCurrenciesRaw, ...currencyRowsFromApi, ...expenseCurrenciesRaw]
              .map((currency: any) => ({ currency, code: getCurrencyCode(currency) }))
              .filter((entry: any) => Boolean(entry.code))
              .map((entry: any) => [entry.code.toLowerCase(), entry.currency])
          ).values()
        ).filter((currency: any) => currency?.isActive !== false && currency?.active !== false);

        const finalCurrencies = mergedCurrencies.length > 0 ? mergedCurrencies : currencyRowsFromApi;
        setCurrencies(finalCurrencies);
        if (finalCurrencies.length > 0) {
          const baseCurrency = finalCurrencies.find((c: any) => c.isBaseCurrency || c.is_base_currency || c.isBase) || finalCurrencies[0];
          const baseCode = getCurrencyCode(baseCurrency) || getCurrencyCode(finalCurrencies[0]) || "";
          setFormData(prev => ({ ...prev, currency: baseCode || baseCurrencyCode || prev.currency }));
          setBulkExpenses(prev => prev.map(e => ({ ...e, currency: baseCode || baseCurrencyCode || e.currency })));
        }
      } catch (error) {
        console.error("Error loading currencies:", error);
        setCurrencies(getInitialCurrencies());
      } finally {
        setLoadingCurrencies(false);
      }

      // Load accounts from Chart of Accounts
      const loadAccounts = async () => {
        try {
          const response = await chartOfAccountsAPI.getAccounts({ isActive: true });
          if (response && response.success) {
            setAccounts(filterActiveRecords(response.data));
          }
        } catch (error) {
          console.error('Error loading accounts:', error);
        }
      };

      loadAccounts();

      try {
        setLoadingProjects(true);
        const projectsResponse = await projectsAPI.getAll();
        if (projectsResponse && projectsResponse.success && projectsResponse.data) {
          setAllProjects(projectsResponse.data);
        }
      } catch (error) {
        console.error("Error loading projects:", error);
        setAllProjects([]);
      } finally {
        setLoadingProjects(false);
      }

      try {
        const taxesResponse = await taxesAPI.getAll({ status: "active" });
        const taxListRaw = Array.isArray(taxesResponse)
          ? taxesResponse
          : Array.isArray(taxesResponse?.data)
            ? taxesResponse.data
            : Array.isArray(taxesResponse?.taxes)
              ? taxesResponse.taxes
              : Array.isArray(taxesResponse?.data?.taxes)
                ? taxesResponse.data.taxes
                : Array.isArray(taxesResponse?.results)
                  ? taxesResponse.results
                  : [];
        const cachedTaxesRaw = (() => {
          try {
            const raw = localStorage.getItem("taban_books_taxes");
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const combinedTaxes = [...taxListRaw, ...cachedTaxesRaw];
        const dedupedTaxes = Array.from(
          new Map(
            combinedTaxes.map((tax: any) => {
              const id = String(tax?._id || tax?.id || tax?.tax_id || tax?.taxId || tax?.name || tax?.taxName || tax?.tax_name || "").trim();
              return [id.toLowerCase(), tax];
            }).filter(([id]: any) => Boolean(id))
          ).values()
        );
        const normalizedTaxes = dedupedTaxes.filter((tax: any) => {
          const name = String(tax?.name || tax?.taxName || tax?.tax_name || tax?.displayName || tax?.title || "").trim();
          return name.length > 0;
        });
        const activeTaxes = normalizedTaxes.filter((tax: any) => tax?.isActive !== false && tax?.is_active !== false);
        setTaxes(activeTaxes.length > 0 ? activeTaxes : normalizedTaxes);
      } catch (error) {
        console.error("Error loading taxes:", error);
        try {
          const raw = localStorage.getItem("taban_books_taxes");
          const parsed = raw ? JSON.parse(raw) : [];
          setTaxes(Array.isArray(parsed) ? parsed : []);
        } catch {
          setTaxes([]);
        }
      }
    };

    loadData();

    // Listen for vendor updates
    const handleVendorUpdate = async (e: any) => {
      try {
        const [vendorsResponse, customersResponse] = await Promise.all([
          vendorsAPI.getAll({ limit: 1000 }),
          customersAPI.getAll({ limit: 1000 }),
        ]);

        if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
          setAllVendors(filterActiveRecords(vendorsResponse.data));
        }
        if (customersResponse && customersResponse.success && customersResponse.data) {
          setAllCustomers(filterActiveRecords(customersResponse.data));
        }
      } catch (refreshError) {
        console.error("Error refreshing vendors/customers:", refreshError);
      }
      // If vendor was just created, update the vendor field
      if (e.detail) {
        const vendor = e.detail;
        const vendorId = vendor._id || vendor.id;
        const displayName = vendor.displayName || vendor.companyName || vendor.name || "";
        if (displayName && vendorId) {
          setFormData(prev => ({
            ...prev,
            vendor: displayName,
            vendor_id: vendorId
          }));
        }
      }
    };
    window.addEventListener("vendorCreated" as any, handleVendorUpdate);

    return () => {
      window.removeEventListener("vendorCreated" as any, handleVendorUpdate);
    };
  }, []);

  useEffect(() => {
    const handleQuickActionMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload: any = event.data || {};
      if (payload?.type === "quick-action-created" && payload?.entity === "customer") {
        const customer = payload?.data || {};
        const customerId = String(customer?._id || customer?.id || "").trim();
        const customerName = String(
          customer?.displayName || customer?.name || customer?.companyName || ""
        ).trim();

        if (customerId || customerName) {
          setFormData((prev) => ({
            ...prev,
            customer_id: customerId || prev.customer_id,
            customerName: customerName || prev.customerName,
          }));
        }

        setNewCustomerModalOpen(false);
        await reloadCustomersForExpense();
      }

      if (payload?.type === "quick-action-cancel" && payload?.entity === "customer") {
        setNewCustomerModalOpen(false);
      }
    };

    window.addEventListener("message", handleQuickActionMessage);
    return () => {
      window.removeEventListener("message", handleQuickActionMessage);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    if (newCustomerModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow || "";
    }
    return () => {
      document.body.style.overflow = previousOverflow || "";
    };
  }, [newCustomerModalOpen]);

  const [vendorMoreDetailsExpanded, setVendorMoreDetailsExpanded] = useState(false);
  const [customerMoreDetailsExpanded, setCustomerMoreDetailsExpanded] = useState(false);

  // New state for account type dropdown in modal
  const [accountTypeOpen, setAccountTypeOpen] = useState(false);
  const [accountTypeSearch, setAccountTypeSearch] = useState("");

  const [structuredAccounts, setStructuredAccounts] = useState(EXPENSE_ACCOUNTS_STRUCTURE);
  const [structuredPaidThrough, setStructuredPaidThrough] = useState(PAID_THROUGH_STRUCTURE);

  useEffect(() => {
    if (accounts.length > 0) {
      // Helper to format account type keys (e.g. 'fixed_asset' -> 'Fixed Asset')
      const formatType = (type: string) => {
        if (!type) return "Other";
        return type
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };

      // 1. Build Expense Structure
      const newExpenseStructure: any = {};
      const expenseTypes = [
        'expense',
        'cost_of_goods_sold'
      ];

      // Strictly filter accounts to only these types
      const relevantAccounts = accounts.filter(acc =>
        expenseTypes.includes(acc.accountType)
      );

      relevantAccounts.forEach((acc: any) => {
        let key = formatType(acc.accountType);
        // Map specific keys to match UI expectations if needed
        if (acc.accountType === 'expense' || acc.accountType === 'other_expense') key = 'Expense';

        if (!newExpenseStructure[key]) {
          newExpenseStructure[key] = [];
        }
        newExpenseStructure[key].push(acc.accountName);
      });

      // Sort lists
      Object.keys(newExpenseStructure).forEach(k => newExpenseStructure[k].sort());
      setStructuredAccounts(newExpenseStructure);

      // 2. Build Paid Through Structure - Only include real money movement accounts
      const newPaidThroughStructure: any = {};
      const paidThroughTypes = [
        'bank',
        'cash',
        'mobile_wallet',
        'credit_card'
      ];

      // Filter for active accounts of specific types only
      const paidAccounts = accounts.filter(acc =>
        acc.isActive && paidThroughTypes.includes(acc.accountType?.toLowerCase())
      );

      paidAccounts.forEach((acc: any) => {
        let key = formatType(acc.accountType);
        // Group mappings
        if (acc.accountType === 'other_current_liability') key = 'Other Current Liability';

        if (!newPaidThroughStructure[key]) {
          newPaidThroughStructure[key] = [];
        }
        newPaidThroughStructure[key].push(acc.accountName);
      });

      // Sort lists
      Object.keys(newPaidThroughStructure).forEach(k => newPaidThroughStructure[k].sort());
      setStructuredPaidThrough(newPaidThroughStructure);
    }
  }, [accounts]);

  const [newAccountData, setNewAccountData] = useState({
    accountType: "Fixed Asset",
    accountName: "",
    isSubAccount: false,
    accountCode: "",
    description: "",
    zohoExpense: false,
  });
  const [activeTab, setActiveTab] = useState("expense");
  const [isItemized, setIsItemized] = useState(false);
  const [reportingTagDefinitions, setReportingTagDefinitions] = useState<any[]>([]);
  const [itemRows, setItemRows] = useState([
    {
      id: 1,
      itemDetails: "",
      account: "",
      tax: "",
      quantity: 100,
      rate: 0.00,
      amount: 0.00
    }
  ]);
  const [discount, setDiscount] = useState({ value: 0, type: "%" });

  const formatDateForAPI = (dateStr: string) => {
    if (!dateStr) return "";
    // If it's dd/mm/yyyy, convert it
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    // If it's already YYYY-MM-DD or other, return as is
    return dateStr;
  };

  // Bulk expenses state
  const [bulkExpenses, setBulkExpenses] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      date: (() => {
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        return `${d}/${m}/${y}`;
      })(),
      expenseAccount: "",
      amount: "",
      currency: initialCurrencyCode,
      location: initialLocationName,
      tax: "",
      is_inclusive_tax: true,
      customerName: "",
      projects: "",
      billable: false,
      reportingTags: [] as any[],
    }))
  );
  const [formData, setFormData] = useState({
    location: initialLocationName,
    date: (() => {
      const today = new Date();
      const d = String(today.getDate()).padStart(2, '0');
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const y = today.getFullYear();
      return `${d}/${m}/${y}`;
    })(),
    expenseAccount: "",
    amount: "",
    currency: initialCurrencyCode,
    is_inclusive_tax: true,
    paidThrough: "",
    tax: "",
    vendor: "",
    vendor_id: "",
    reference: "",
    notes: "",
    customerName: "",
    customer_id: "",
    projectName: "",
    project_id: "",
    billable: false,
    markupBy: "1",
    markupType: "%",
    reportingTags: [] as any[],
  });
  const [taxAmountOverride, setTaxAmountOverride] = useState<string>("");
  const [taxAmountEditOpen, setTaxAmountEditOpen] = useState(false);
  const [taxAmountEditValue, setTaxAmountEditValue] = useState("");

  const normalizeReportingTagOptions = (tag: any): string[] => {
    const candidates = Array.isArray(tag?.options)
      ? tag.options
      : Array.isArray(tag?.values)
        ? tag.values
        : [];

    const normalized = candidates
      .map((option: any) => {
        if (typeof option === "string") return option.trim();
        if (option && typeof option === "object") {
          return String(
            option.value ??
            option.label ??
            option.name ??
            option.option ??
            option.title ??
            ""
          ).trim();
        }
        return "";
      })
      .filter(Boolean);

    return Array.from(new Set(normalized));
  };

  const buildReportingTagMeta = (tag: any) => {
    const tagId = String(tag?._id || tag?.id || tag?.tagId || tag?.name || "");
    const tagName = String(tag?.name || tag?.tagName || tag?.title || "Reporting Tag");
    const options = normalizeReportingTagOptions(tag);
    const isMandatory = Boolean(tag?.isMandatory || tag?.mandatory);
    return { tagId, tagName, options, isMandatory };
  };

  const loadReportingTags = async () => {
    try {
      const response = await reportingTagsAPI.getAll();
      const rows = Array.isArray(response) ? response : (response?.data || []);
      if (!Array.isArray(rows)) {
        setReportingTagDefinitions([]);
        return;
      }

      // Show all available reporting tags in expense form.
      // If active flags exist, prefer active set; otherwise fallback to all rows.
      const activeRows = rows.filter((tag: any) => tag?.isActive !== false && tag?.is_active !== false);
      const tagsToUse = (activeRows.length > 0 ? activeRows : rows).map((tag: any) => ({
        ...buildReportingTagMeta(tag),
      }));

      setReportingTagDefinitions(tagsToUse);
      setFormData((prev) => {
        const existing = Array.isArray(prev.reportingTags) ? prev.reportingTags : [];
        const mapped = tagsToUse.map((def: any) => {
          const found = existing.find((rt: any) => String(rt?.tagId || rt?.id) === String(def.tagId));
          return {
            tagId: def.tagId,
            id: def.tagId,
            name: def.tagName,
            isMandatory: def.isMandatory,
            options: def.options,
            value: found?.value || "",
          };
        });
        return { ...prev, reportingTags: mapped };
      });
    } catch (error) {
      console.error("Error loading reporting tags:", error);
      setReportingTagDefinitions([]);
    }
  };

  useEffect(() => {
    if (formData.paidThrough) return;
    const paidThroughValues = Object.values(structuredPaidThrough || {})
      .flat()
      .filter(Boolean) as string[];
    const defaultPaidThrough = paidThroughValues[0] || "Petty Cash";
    if (defaultPaidThrough) {
      setFormData((prev) => ({ ...prev, paidThrough: defaultPaidThrough }));
    }
  }, [structuredPaidThrough, formData.paidThrough]);

  useEffect(() => {
    if (!baseCurrencyCode) return;
    setFormData((prev) => ({ ...prev, currency: baseCurrencyCode }));
    setBulkExpenses((prev) => prev.map((e) => ({ ...e, currency: baseCurrencyCode })));
  }, [baseCurrencyCode]);

  useEffect(() => {
    const hasAnyBulkOpen =
      bulkRowMenuOpenIndex !== null ||
      bulkLocationOpenIndex !== null ||
      bulkTaxOpenIndex !== null ||
      bulkCustomerOpenIndex !== null ||
      bulkProjectOpenIndex !== null ||
      bulkCategoryOpenIndex !== null ||
      bulkCurrencyOpenIndex !== null;
    if (!hasAnyBulkOpen) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-bulk-dropdown="true"]')) return;
      closeBulkDropdowns();
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [
    bulkRowMenuOpenIndex,
    bulkLocationOpenIndex,
    bulkTaxOpenIndex,
    bulkCustomerOpenIndex,
    bulkProjectOpenIndex,
    bulkCategoryOpenIndex,
    bulkCurrencyOpenIndex,
  ]);

  useEffect(() => {
    const fallbackCurrency = currencyOptions[0] || baseCurrencyCode || "USD";
    setBulkExpenses((prev) => {
      let changed = false;
      const next = prev.map((e) => {
        const nextCurrency =
          e.currency && currencyOptions.includes(e.currency) ? e.currency : fallbackCurrency;
        if (e.currency === nextCurrency) return e;
        changed = true;
        return { ...e, currency: nextCurrency };
      });
      return changed ? next : prev;
    });
  }, [currencyOptions, baseCurrencyCode]);
  useEffect(() => {
    void loadReportingTags();
  }, []);

  // Handle location state to pre-fill form with project/customer data or edit existing expense
  useEffect(() => {
    if (location.state) {
      const { projectName, customerName, editExpense, isEdit: isEditFromState, clonedData, receiptFiles } = location.state;

      if (receiptFiles && Array.isArray(receiptFiles)) {
        setUploadedFiles(receiptFiles);
      }

      if (isEditFromState && editExpense) {
        setIsEdit(true);
        setEditId(editExpense.id);
        setTaxAmountOverride(String((editExpense as any)?.tax_amount ?? ""));
        setTaxAmountEditOpen(false);

        // Convert raw_date to dd/MM/yyyy if available
        let formattedDate = editExpense.date;
        if (editExpense.raw_date) {
          const d = new Date(editExpense.raw_date);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          }
        }

        setFormData({
          location: editExpense.location || locationOptions[0] || "Head Office",
          date: formattedDate,
          expenseAccount: editExpense.expenseAccount || "",
          amount: String(editExpense.amount || ""),
          currency: baseCurrencyCode || editExpense.currency || "",
          is_inclusive_tax: editExpense.is_inclusive_tax !== undefined ? editExpense.is_inclusive_tax : true,
          paidThrough: editExpense.paidThrough || "",
          tax: String(editExpense.tax || ""),
          vendor: editExpense.vendor || "",
          vendor_id: editExpense.vendor_id || "",
          reference: editExpense.reference || "",
          notes: editExpense.notes || "",
          customerName: editExpense.customerName || "",
          customer_id: editExpense.customer_id || "",
          projectName: editExpense.projectName || editExpense.project_name || editExpense.project?.name || "",
          project_id: editExpense.project_id || editExpense.project?._id || editExpense.project?.id || "",
          billable: !!editExpense.is_billable,
          markupBy: String((editExpense as any).markupBy ?? (editExpense as any).markup_by ?? 1),
          markupType: String((editExpense as any).markupType ?? (editExpense as any).markup_type ?? "%"),
          reportingTags: Array.isArray(editExpense.reportingTags) ? editExpense.reportingTags : [],
        });

        if (editExpense.is_billable) {
          // You might have a state for this if it's not in formData
        }

        if (editExpense.is_itemized_expense && editExpense.line_items) {
          setIsItemized(true);
          setItemRows(editExpense.line_items.map((line: any, idx: number) => ({
            id: line._id || line.id || idx + 1,
            itemDetails: line.description || "",
            account: line.account_name || "",
            tax: "",
            quantity: line.quantity || 1,
            rate: line.rate || line.amount || 0,
            amount: line.amount || 0
          })));
        }
      } else if (clonedData) {
        setIsEdit(false);
        setEditId(null);
        setTaxAmountOverride("");
        setTaxAmountEditOpen(false);

        let formattedDate = clonedData.date;
        if (clonedData.raw_date) {
          const d = new Date(clonedData.raw_date);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          }
        }

        setFormData({
          location: clonedData.location || "Head Office",
          date: formattedDate || new Date().toLocaleDateString("en-GB"),
          expenseAccount: clonedData.expenseAccount || "",
          amount: String(clonedData.amount || ""),
          currency: baseCurrencyCode || clonedData.currency || "",
          is_inclusive_tax: clonedData.is_inclusive_tax !== undefined ? clonedData.is_inclusive_tax : true,
          paidThrough: clonedData.paidThrough || "",
          tax: String(clonedData.tax || clonedData.tax_id || ""),
          vendor: clonedData.vendor || "",
          vendor_id: clonedData.vendor_id || "",
          reference: "",
          notes: clonedData.notes || "",
          customerName: clonedData.customerName || "",
          customer_id: clonedData.customer_id || "",
          projectName: clonedData.projectName || clonedData.project_name || clonedData.project?.name || "",
          project_id: clonedData.project_id || clonedData.project?._id || clonedData.project?.id || "",
          billable: !!clonedData.is_billable,
          markupBy: String((clonedData as any).markupBy ?? (clonedData as any).markup_by ?? 1),
          markupType: String((clonedData as any).markupType ?? (clonedData as any).markup_type ?? "%"),
          reportingTags: Array.isArray(clonedData.reportingTags) ? clonedData.reportingTags : [],
        });

        if (clonedData.is_itemized_expense && clonedData.line_items) {
          setIsItemized(true);
          setItemRows(clonedData.line_items.map((line: any, idx: number) => ({
            id: line._id || line.id || idx + 1,
            itemDetails: line.description || "",
            account: line.account_name || "",
            tax: "",
            quantity: line.quantity || 1,
            rate: line.rate || line.amount || 0,
            amount: line.amount || 0
          })));
        }
      } else if (projectName || customerName) {
        setTaxAmountOverride("");
        setTaxAmountEditOpen(false);
        setFormData(prev => ({
          ...prev,
          customerName: customerName || prev.customerName,
          customer_id: prev.customer_id,
          projectName: projectName || prev.projectName,
        }));
      }
    }
  }, [location.state]);

  // Fallback: if edit state has only tax name, resolve it after taxes load.
  useEffect(() => {
    const editExpense = (location.state as any)?.editExpense;
    if (!isEdit || !editExpense) return;
    if (String(formData.tax || "").trim()) return;

    const nameRaw = String(
      editExpense?.tax_name ||
      editExpense?.taxName ||
      ""
    ).trim();
    if (!nameRaw || !Array.isArray(taxes) || taxes.length === 0) return;

    const target = nameRaw.split("[")[0].trim().toLowerCase();
    if (!target) return;

    const matched = taxes.find((tax: any) => {
      const name = String(tax?.name || tax?.taxName || tax?.tax_name || "").trim().toLowerCase();
      return name === target;
    });
    if (!matched) return;

    const matchedId = String(matched?._id || matched?.id || matched?.tax_id || matched?.taxId || "").trim();
    if (!matchedId) return;

    setFormData((prev) => ({ ...prev, tax: matchedId }));
  }, [isEdit, taxes, location.state, formData.tax]);

  useEffect(() => {
    if (!formData.customer_id) {
      setCustomerProjects([]);
      setFormData((prev) => {
        if (!prev.billable && !prev.project_id && !prev.projectName) {
          return prev;
        }
        return {
          ...prev,
          billable: false,
          project_id: "",
          projectName: "",
        };
      });
    }
  }, [formData.customer_id]);

  useEffect(() => {
    if (!formData.customer_id) {
      setCustomerProjects([]);
      return;
    }

    void loadProjectsForSelectedCustomer(formData.customer_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.customer_id, allProjects]);

  useEffect(() => {
    if (!formData.customer_id) return;
    if (formData.project_id || !formData.projectName || customerProjects.length === 0) return;

    const projectNameLower = normalizeText(formData.projectName).toLowerCase();
    const matchedProject = customerProjects.find(
      (project) => normalizeText(project.name).toLowerCase() === projectNameLower
    );

    if (matchedProject) {
      setFormData((prev) => ({
        ...prev,
        project_id: matchedProject.id,
        projectName: matchedProject.name,
      }));
    }
  }, [formData.customer_id, formData.project_id, formData.projectName, customerProjects]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => {
      const nextValue = type === "checkbox" ? checked : value;
      const nextState: any = { ...prev, [name]: nextValue };

      return nextState;
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        processFiles(files);
      }
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      (fileInputRef.current as HTMLInputElement).value = "";
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 10MB limit. Maximum file size is 10MB.`);
        return false;
      }
      return true;
    });

    const newFiles = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileId: number) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const generateJournalEntry = async (expenseData: any) => {
    try {
      // Prefer provided account IDs; otherwise attempt to resolve by name
      let paidThroughAccount = null;
      if (expenseData.paid_through_account_id) {
        paidThroughAccount = accounts.find(a => a._id === expenseData.paid_through_account_id || a.id === expenseData.paid_through_account_id);
      }
      if (!paidThroughAccount) {
        paidThroughAccount = accounts.find(a => a.accountName === expenseData.paid_through_account_name || a.accountName?.toLowerCase() === (expenseData.paid_through_account_name || '').toLowerCase());
      }

      let expenseAccount = null;
      if (expenseData.account_id) {
        expenseAccount = accounts.find(a => a._id === expenseData.account_id || a.id === expenseData.account_id);
      }
      if (!expenseAccount) {
        expenseAccount = accounts.find(a => a.accountName === expenseData.account_name || a.accountName?.toLowerCase() === (expenseData.account_name || '').toLowerCase());
      }

      if (!paidThroughAccount || !expenseAccount) {
        console.error('Accounts required for journal entry not found:', {
          expenseAccount: expenseData.account_name || expenseData.account_id,
          paidThrough: expenseData.paid_through_account_name || expenseData.paid_through_account_id
        });
        // Do not block expense creation — log and return so system remains consistent
        return;
      }

      // Build journal entry; include currency on entry and lines
      const amt = parseFloat(expenseData.amount) || 0;
      const journalEntry: any = {
        date: expenseData.date,
        referenceNumber: `EXP-${Date.now()}`,
        description: `Expense - ${expenseData.description || 'No description'}`,
        currency: expenseData.currency_code || expenseData.currency || undefined,
        journalLines: [
          {
            accountId: expenseAccount._id || expenseAccount.id,
            accountName: expenseAccount.accountName,
            accountType: expenseAccount.accountType,
            debit: amt,
            credit: 0,
            currency: expenseData.currency_code || expenseData.currency || undefined,
            description: `Expense: ${expenseData.description || 'No description'}`
          },
          {
            accountId: paidThroughAccount._id || paidThroughAccount.id,
            accountName: paidThroughAccount.accountName,
            accountType: paidThroughAccount.accountType,
            debit: 0,
            credit: amt,
            currency: expenseData.currency_code || expenseData.currency || undefined,
            description: `Paid through: ${paidThroughAccount.accountName}`
          }
        ],
        totalDebit: amt,
        totalCredit: amt,
        status: 'Posted',
        notes: `Auto-generated journal entry for expense ${expenseData.referenceNumber || 'N/A'}`,
        relatedTransaction: {
          type: 'Expense',
          id: expenseData.id,
          referenceNumber: expenseData.reference_number
        }
      };

      // Save journal entry
      const response = await journalEntriesAPI.create(journalEntry);
      if (response && response.success) {
        console.log('Journal entry created successfully:', response.data);
      } else {
        console.error('Failed to create journal entry:', response);
      }
    } catch (error) {
      console.error('Error generating journal entry:', error);
    }
  };

  const handleSave = async (navigateAway = true) => {
    if (saveLoadingState) return false;
    setSaveLoadingState(navigateAway ? "save" : "saveAndNew");
    if (activeTab === "bulk") {
      // Filter out empty rows - require at least Date, Account, and Amount
      const validBulkExpenses = bulkExpenses.filter(
        exp => exp.date && exp.expenseAccount && exp.amount
      );

      if (validBulkExpenses.length === 0) {
        alert("Please fill in at least one expense with all required fields (Date, Category Name, Amount)");
        setSaveLoadingState(null);
        return false;
      }

      try {
        let successCount = 0;
        let errorMessages = [];

        for (const exp of validBulkExpenses) {
          // Find customer_id from name
          const customer = allCustomers.find(c => (c.displayName || c.name) === exp.customerName);

          // Resolve account IDs when possible to make journal creation robust
          const expenseAccountObj = accounts.find(a => a.accountName === exp.expenseAccount || a.accountName?.toLowerCase() === (exp.expenseAccount || '').toLowerCase());
          const selectedTax = (Array.isArray(taxes) ? taxes : []).find((tax: any) => getTaxId(tax) === String(exp.tax || ""));

          const expenseData: any = {
            date: formatDateForAPI(exp.date),
            account_name: exp.expenseAccount,
            account_id: expenseAccountObj?._id || expenseAccountObj?.id,
            amount: parseFloat(exp.amount),
            currency_code: baseCurrencyCode || exp.currency,
            description: "",
            customer_id: customer ? (customer._id || customer.id) : undefined,
            is_billable: exp.billable,
            is_inclusive_tax: !!exp.is_inclusive_tax,
            location: exp.location || "",
          };
          if (exp.tax) {
            expenseData.tax_id = String(exp.tax);
            if (selectedTax) {
              expenseData.tax_name = String(getTaxName(selectedTax) || "");
              expenseData.tax_rate = Number(getTaxRate(selectedTax) || 0);
            }
          }

          const response = await expensesAPI.create(expenseData);

          if (response && (response.code === 0 || response.success)) {
            // Generate journal entry for the expense
            await generateJournalEntry(expenseData);
            successCount++;
          } else {
            errorMessages.push(`Row ${exp.id}: ${response?.message || "Error"}`);
          }
        }

        if (successCount > 0) {
          alert(`${successCount} expenses saved successfully!${errorMessages.length > 0 ? `\nErrors: ${errorMessages.join(', ')}` : ''}`);
          window.dispatchEvent(new Event("expensesUpdated"));

          if (navigateAway) {
            navigate("/expenses");
          }
          return true;
        } else {
          alert(`Failed to save expenses: ${errorMessages.join(', ')}`);
          return false;
        }
      } catch (error: any) {
        console.error("Error saving bulk expenses:", error);
        alert(error?.message || "Error creating bulk expenses. Please try again.");
        return false;
      } finally {
        setSaveLoadingState(null);
      }
    }

    // Validate required fields for single expense
    if (!formData.date || !formData.expenseAccount || !formData.amount || !formData.paidThrough) {
      alert("Please fill in all required fields (Date, Expense Account, Amount, Paid Through)");
      setSaveLoadingState(null);
      return false;
    }

    try {
      const formattedDate = formatDateForAPI(formData.date);

      // Resolve account IDs for more reliable journal creation
      const expenseAccountObj = accounts.find(a => a.accountName === formData.expenseAccount || a.accountName?.toLowerCase() === (formData.expenseAccount || '').toLowerCase());
      const paidThroughObj = accounts.find(a => a.accountName === formData.paidThrough || a.accountName?.toLowerCase() === (formData.paidThrough || '').toLowerCase());

      const expenseData: any = {
        date: formattedDate,
        account_name: formData.expenseAccount, // preserve name for API compatibility
        account_id: expenseAccountObj?._id || expenseAccountObj?.id,
        amount: parseFloat(formData.amount),
        paid_through_account_name: formData.paidThrough,
        paid_through_account_id: paidThroughObj?._id || paidThroughObj?.id,
        reference_number: formData.reference || "",
        description: formData.notes || "",
        currency_code: baseCurrencyCode || formData.currency,
        is_inclusive_tax: formData.is_inclusive_tax,
      };

      const selectedReportingTags = (Array.isArray(formData.reportingTags) ? formData.reportingTags : [])
        .filter((tag: any) => String(tag?.value || "").trim() !== "")
        .map((tag: any) => ({
          tagId: String(tag?.tagId || tag?.id || ""),
          id: String(tag?.id || tag?.tagId || ""),
          name: String(tag?.name || ""),
          value: String(tag?.value || ""),
        }))
        .filter((tag: any) => tag.tagId || tag.id);
      if (selectedReportingTags.length > 0) {
        expenseData.reportingTags = selectedReportingTags;
      }

      if (formData.tax) {
        expenseData.tax_id = String(formData.tax);
        const selectedTax = (Array.isArray(taxes) ? taxes : []).find((tax: any) => {
          const id = String(tax?._id || tax?.id || tax?.tax_id || tax?.taxId || "").trim();
          return id && id === String(formData.tax).trim();
        });
        if (selectedTax) {
          const selectedTaxName = String(
            selectedTax?.name || selectedTax?.taxName || selectedTax?.tax_name || ""
          ).trim();
          const selectedTaxRate = Number(
            selectedTax?.rate ?? selectedTax?.taxPercentage ?? selectedTax?.percentage ?? 0
          );
          if (selectedTaxName) {
            expenseData.tax_name = selectedTaxName;
          }
          if (Number.isFinite(selectedTaxRate)) {
            expenseData.tax_rate = selectedTaxRate;
          }
        }
        expenseData.tax_amount = Number(taxAmountDisplay);
      }

      // Add vendor_id if vendor is selected
      if (formData.vendor_id) {
        expenseData.vendor_id = formData.vendor_id;
      }

      // Billable/status behavior:
      // - With customer + billable checked => UNBILLED
      // - Otherwise => NON-BILLABLE
      if (formData.customer_id) {
        expenseData.customer_id = formData.customer_id;
      }
      expenseData.is_billable = !!(formData.customer_id && formData.billable);
      expenseData.status = expenseData.is_billable ? "unbilled" : "non-billable";

      if (expenseData.is_billable && isObjectId(formData.project_id)) {
        expenseData.project_id = formData.project_id;
        if (formData.projectName) {
          expenseData.project_name = formData.projectName;
        }
      }
      if (expenseData.is_billable) {
        expenseData.markup_by = Number(formData.markupBy || 0);
        expenseData.markup_type = formData.markupType || "%";
      }

      // Handle itemized expenses
      if (isItemized && itemRows.length > 0) {
        expenseData.is_itemized_expense = true;
        expenseData.line_items = itemRows
          .filter(row => row.account && row.amount > 0)
          .map((row, index) => {
            return {
              account_name: row.account, // Send account name instead of ID
              description: row.itemDetails || "",
              amount: row.amount,
              item_order: index + 1,
            };
          });
      }

      // Persist uploaded files so they can be shown in Expense Detail.
      const receiptNames = uploadedFiles
        .map((file: any) => String(file?.name || "").trim())
        .filter(Boolean);
      if (receiptNames.length > 0) {
        expenseData.receipts = receiptNames;
        expenseData.uploads = uploadedFiles.map((file: any, index: number) => ({
          id: file?.id || `upload-${Date.now()}-${index}`,
          name: String(file?.name || `attachment-${index + 1}`),
          size: Number(file?.size || 0),
          type: String(file?.type || ""),
          uploadedAt: file?.uploadedAt || new Date().toISOString(),
        }));
      }

      console.log("Sending expense data:", expenseData);
      let response;
      if (isEdit && editId) {
        response = await expensesAPI.update(editId, expenseData);
      } else {
        response = await expensesAPI.create(expenseData);
      }

      if (response && (response.code === 0 || response.success)) {
        // Generate journal entry for the expense
        await generateJournalEntry(expenseData);

        alert("Expense saved successfully!");
        window.dispatchEvent(new Event("expensesUpdated"));

        if (navigateAway) {
          navigate("/expenses");
        }
        return true;
      } else {
        alert(response?.message || "Error creating expense");
        return false;
      }
    } catch (error: any) {
      console.error("Error saving expense:", error);
      alert(error?.message || "Error creating expense. Please try again.");
      return false;
    } finally {
      setSaveLoadingState(null);
    }
  };


  const handleSaveAndNew = async () => {
    // Use the same save logic, but don't navigate away
    const success = await handleSave(false);

    if (success) {
      if (activeTab === "bulk") {
        setBulkExpenses(
          Array.from({ length: 10 }, (_, i) => ({
            id: Date.now() + i,
            date: (() => {
              const today = new Date();
              const d = String(today.getDate()).padStart(2, '0');
              const m = String(today.getMonth() + 1).padStart(2, '0');
              const y = today.getFullYear();
              return `${d}/${m}/${y}`;
            })(),
            expenseAccount: "",
            amount: "",
            currency: baseCurrencyCode || currencies.find(c => (c.isBaseCurrency || c.is_base_currency))?.code || "USD",
            location: locationOptions[0] || "Head Office",
            tax: "",
            is_inclusive_tax: true,
            customerName: "",
            projects: "",
            billable: false,
            reportingTags: [],
          }))
        );
      } else {
        // Reset form for single expense
        setFormData({
          location: locationOptions[0] || "Head Office",
          date: (() => {
            const today = new Date();
            const d = String(today.getDate()).padStart(2, '0');
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const y = today.getFullYear();
            return `${d}/${m}/${y}`;
          })(),
          expenseAccount: '',
          amount: '',
          currency: baseCurrencyCode || currencies.find(c => (c.isBaseCurrency || c.is_base_currency))?.code || 'USD',
          is_inclusive_tax: true,
          paidThrough: '',
          tax: '',
          vendor: '',
          vendor_id: '',
          reference: '',
          notes: '',
          customerName: '',
          customer_id: '',
          projectName: '',
          project_id: '',
          billable: false,
          markupBy: "1",
          markupType: "%",
          reportingTags: reportingTagDefinitions.map((def: any) => ({
            tagId: def.tagId,
            id: def.tagId,
            name: def.tagName,
            isMandatory: def.isMandatory,
            options: def.options,
            value: "",
          })),
        });
        setItemRows([{
          id: 1,
          itemDetails: "",
          account: "",
          tax: "",
          quantity: 100,
          rate: 0.00,
          amount: 0.00
        }]);
        setTaxAmountOverride("");
        setTaxAmountEditOpen(false);
        setTaxAmountEditValue("");
        setIsItemized(false);
        setUploadedFiles([]);
      }
    }
  };

  const handleCancel = () => {
    navigate("/expenses");
  };

  // Keyboard shortcuts for Save and Save and New
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          handleSaveAndNew();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]); // Update dependency to include formData if save functions use it

  // Vendor search handlers
  const handleVendorSearch = () => {
    const searchTerm = vendorSearchTerm.toLowerCase();
    let results = [];

    if (vendorSearchCriteria === "Display Name") {
      results = allVendors.filter(vendor => {
        const displayName = vendor.displayName || vendor.name || "";
        return displayName.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Email") {
      results = allVendors.filter(vendor => {
        const email = vendor.email || "";
        return email.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Company Name") {
      results = allVendors.filter(vendor => {
        const companyName = vendor.companyName || "";
        return companyName.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Phone") {
      results = allVendors.filter(vendor => {
        const phone = vendor.workPhone || vendor.mobile || "";
        return phone.includes(searchTerm);
      });
    }

    setVendorSearchResults(results);
    setVendorSearchPage(1);
  };

  // Customer search handlers
  const handleCustomerSearch = () => {
    const searchTerm = customerSearchTerm.toLowerCase();
    let results = [];

    if (customerSearchCriteria === "Display Name") {
      results = allCustomers.filter(customer => {
        const displayName = customer.displayName || customer.name || "";
        return displayName.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Email") {
      results = allCustomers.filter(customer => {
        const email = customer.email || "";
        return email.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Company Name") {
      results = allCustomers.filter(customer => {
        const companyName = customer.companyName || "";
        return companyName.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Phone") {
      results = allCustomers.filter(customer => {
        const phone = customer.workPhone || customer.mobile || "";
        return phone.includes(searchTerm);
      });
    }

    setCustomerSearchResults(results);
    setCustomerSearchPage(1);
  };

  // Pagination helpers
  const itemsPerPage = 10;
  const vendorStartIndex = (vendorSearchPage - 1) * itemsPerPage;
  const vendorEndIndex = vendorStartIndex + itemsPerPage;
  const vendorPaginatedResults = vendorSearchResults.slice(vendorStartIndex, vendorEndIndex);
  const vendorTotalPages = Math.ceil(vendorSearchResults.length / itemsPerPage);

  const customerStartIndex = (customerSearchPage - 1) * itemsPerPage;
  const customerEndIndex = customerStartIndex + itemsPerPage;
  const customerPaginatedResults = customerSearchResults.slice(customerStartIndex, customerEndIndex);
  const customerTotalPages = Math.ceil(customerSearchResults.length / itemsPerPage);

  const filteredAccounts = ITEMIZED_EXPENSE_ACCOUNT_OPTIONS.filter((account) =>
    account.toLowerCase().includes(expenseAccountSearch.toLowerCase())
  );

  // Filter paid through accounts
  const getFilteredPaidThrough = () => {
    if (!paidThroughSearch) return structuredPaidThrough;

    const filtered: any = {};
    Object.entries(structuredPaidThrough).forEach(([category, items]) => {
      const filteredItems = items.filter(item =>
        item.toLowerCase().includes(paidThroughSearch.toLowerCase())
      );
      if (filteredItems.length > 0 || category.toLowerCase().includes(paidThroughSearch.toLowerCase())) {
        filtered[category] = filteredItems.length > 0 ? filteredItems : items;
      }
    });
    return filtered;
  };

  const filteredPaidThrough = getFilteredPaidThrough();
  const getTaxId = (tax: any) => String(tax?._id || tax?.id || tax?.tax_id || tax?.taxId || tax?.name || tax?.taxName || "");
  const getTaxName = (tax: any) => String(tax?.name || tax?.taxName || tax?.tax_name || tax?.displayName || tax?.title || "").trim();
  const getTaxRate = (tax: any) => Number(tax?.rate ?? tax?.taxPercentage ?? tax?.percentage ?? tax?.tax_rate ?? 0);
  const taxLabel = (tax: any) => `${getTaxName(tax)} [${getTaxRate(tax)}%]`;
  const selectedExpenseTax = (Array.isArray(taxes) ? taxes : []).find(
    (tax: any) => getTaxId(tax) === String(formData.tax || "")
  );
  const selectedExpenseTaxRate = Number(selectedExpenseTax ? getTaxRate(selectedExpenseTax) : 0);
  const parsedExpenseAmount = Number(formData.amount || 0);
  const computedTaxAmount = (() => {
    if (!selectedExpenseTax || !Number.isFinite(selectedExpenseTaxRate) || selectedExpenseTaxRate <= 0) return 0;
    if (!Number.isFinite(parsedExpenseAmount) || parsedExpenseAmount <= 0) return 0;
    if (formData.is_inclusive_tax) {
      return parsedExpenseAmount - (parsedExpenseAmount / (1 + selectedExpenseTaxRate / 100));
    }
    return parsedExpenseAmount * (selectedExpenseTaxRate / 100);
  })();
  const resolvedTaxAmount = (() => {
    const overrideValue = Number(taxAmountOverride);
    if (taxAmountOverride !== "" && Number.isFinite(overrideValue) && overrideValue >= 0) {
      return overrideValue;
    }
    return computedTaxAmount;
  })();
  const taxAmountDisplay = Number.isFinite(resolvedTaxAmount) ? resolvedTaxAmount.toFixed(2) : "0.00";
  const filteredItemizedExpenseAccounts = ITEMIZED_EXPENSE_ACCOUNT_OPTIONS.filter((account) =>
    account.toLowerCase().includes(itemizedAccountSearch.toLowerCase())
  );
  const filteredItemizedTaxes = taxes.filter((tax: any) => {
    const label = taxLabel(tax).toLowerCase();
    return label.includes(itemizedTaxSearch.toLowerCase());
  });
  const filteredExpenseTaxes = taxes.filter((tax: any) => {
    const label = taxLabel(tax).toLowerCase();
    return label.includes(expenseTaxSearch.toLowerCase());
  });
  const filteredCustomerProjects = customerProjects.filter((project) =>
    String(project?.name || "").toLowerCase().includes(projectSearch.toLowerCase())
  );

  useEffect(() => {
    if (String(formData.tax || "").trim()) return;
    setTaxAmountOverride("");
    setTaxAmountEditOpen(false);
    setTaxAmountEditValue("");
  }, [formData.tax]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        expenseAccountRef.current &&
        !(expenseAccountRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setExpenseAccountOpen(false);
        setExpenseAccountSearch("");
      }
      if (
        locationRef.current &&
        !(locationRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setLocationOpen(false);
        setLocationSearch("");
      }

      if (
        uploadDropdownRef.current &&
        !(uploadDropdownRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setUploadDropdownOpen(false);
      }

      if (
        paidThroughRef.current &&
        !(paidThroughRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setPaidThroughOpen(false);
        setPaidThroughSearch("");
      }

      if (
        customerRef.current &&
        !(customerRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setCustomerOpen(false);
        setCustomerSearch("");
      }
      if (
        projectRef.current &&
        !(projectRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setProjectOpen(false);
        setProjectSearch("");
      }

      const target = event.target as HTMLElement;
      if (!target.closest(".itemized-account-dropdown")) {
        setOpenItemizedAccountIndex(null);
        setItemizedAccountSearch("");
      }
      if (!target.closest(".itemized-tax-dropdown")) {
        setOpenItemizedTaxIndex(null);
        setItemizedTaxSearch("");
      }
      if (!target.closest(".expense-tax-dropdown")) {
        setExpenseTaxDropdownOpen(false);
        setExpenseTaxSearch("");
      }
      if (!target.closest(".amount-currency-dropdown")) {
        setAmountCurrencyOpen(false);
      }

      // Also close account type dropdown if clicking outside (would need a ref but for now simple check)
      // Since it is in a portal, event target logic might be tricky, keeping it simple or adding ref:
    };

    if (
      expenseAccountOpen ||
      locationOpen ||
      customerOpen ||
      projectOpen ||
      uploadDropdownOpen ||
      paidThroughOpen ||
      vendorSearchCriteriaOpen ||
      customerSearchCriteriaOpen ||
      openItemizedAccountIndex !== null ||
      openItemizedTaxIndex !== null ||
      expenseTaxDropdownOpen ||
      amountCurrencyOpen
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expenseAccountOpen, locationOpen, customerOpen, projectOpen, uploadDropdownOpen, paidThroughOpen, vendorSearchCriteriaOpen, customerSearchCriteriaOpen, openItemizedAccountIndex, openItemizedTaxIndex, expenseTaxDropdownOpen, amountCurrencyOpen]);

  // Adding useEffect for account type dropdown close
  useEffect(() => {
    const handleCloseTypeDropdown = (e: MouseEvent) => {
      // Simple logic: if click is not in a dropdown related element... 
      // For robustness we rely on e.stopPropagation() in the dropdown itself
    }
    document.addEventListener('click', handleCloseTypeDropdown);
    return () => document.removeEventListener('click', handleCloseTypeDropdown);
  }, []);


  const handleExpenseAccountSelect = (account: string) => {
    setFormData((prev) => ({ ...prev, expenseAccount: account }));
    setExpenseAccountOpen(false);
    setExpenseAccountSearch("");
  };

  const reloadCustomersForExpense = async () => {
    try {
      const customersResponse = await customersAPI.getAll({ limit: 1000 });
      if (customersResponse && customersResponse.success && customersResponse.data) {
        setAllCustomers(filterActiveRecords(customersResponse.data));
      }
    } catch (error) {
      console.error("Error refreshing customers:", error);
    }
  };

  const openNewCustomerQuickAction = () => {
    setCustomerOpen(false);
    setNewCustomerModalOpen(true);
  };

  const handleSaveQuickCustomer = async () => {
    const firstName = String(quickCustomerFirstName || "").trim();
    const lastName = String(quickCustomerLastName || "").trim();
    const companyName = String(quickCustomerCompanyName || "").trim();
    const displayNameInput = String(quickCustomerDisplayName || "").trim();
    const email = String(quickCustomerEmail || "").trim();
    const fallbackName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const finalDisplayName = displayNameInput || companyName || fallbackName;

    if (!finalDisplayName) {
      alert("Please enter Display Name");
      return;
    }

    try {
      const reportingTagEntries = Object.entries(quickCustomerReportingTags || {})
        .map(([tagId, value]) => ({ tagId: String(tagId), value: String(value || "").trim() }))
        .filter((row) => Boolean(row.tagId) && Boolean(row.value));
      const customFieldEntries = (Array.isArray(quickCustomerCustomFields) ? quickCustomerCustomFields : [])
        .map((field) => ({
          label: String(field?.label || "").trim(),
          value: String(field?.value || "").trim(),
        }))
        .filter((field) => Boolean(field.label) && Boolean(field.value));
      const openingBalanceNumeric = Number(quickCustomerOpeningBalance);
      const response = await customersAPI.create({
        displayName: finalDisplayName,
        name: finalDisplayName,
        firstName,
        lastName,
        companyName,
        email,
        notes: quickCustomerRemarks,
        billingAddress: {
          address1: quickCustomerAddressLine1,
          address2: quickCustomerAddressLine2,
          city: quickCustomerCity,
          state: quickCustomerState,
          zipCode: quickCustomerPostalCode,
          country: quickCustomerCountry,
        },
        language: quickCustomerLanguage,
        locationCode: quickCustomerLocationCode,
        currency: quickCustomerCurrency,
        openingBalance: Number.isFinite(openingBalanceNumeric) ? openingBalanceNumeric : 0,
        reportingTags: reportingTagEntries.length > 0
          ? reportingTagEntries
          : quickCustomerReportingTagValue
            ? [quickCustomerReportingTagValue]
            : [],
        customFields: customFieldEntries.length > 0
          ? customFieldEntries
          : quickCustomerCustomFieldValue
            ? [{ label: "Custom Field", value: quickCustomerCustomFieldValue }]
            : [],
        status: "active",
        active: true,
      });

      const created = response?.data || response?.customer || response;
      const createdId = String(created?._id || created?.id || "").trim() || `cus_${Date.now()}`;
      const createdCustomer = {
        ...created,
        _id: createdId,
        id: createdId,
        displayName: String(created?.displayName || created?.name || finalDisplayName),
        name: String(created?.name || created?.displayName || finalDisplayName),
        companyName: String(created?.companyName || companyName),
        email: String(created?.email || email),
        status: String(created?.status || "active"),
        active: created?.active !== false,
      };

      setAllCustomers((prev) => {
        const rows = [createdCustomer, ...prev];
        const deduped = Array.from(
          new Map(
            rows.map((c: any) => [String(c?._id || c?.id || "").toLowerCase(), c]).filter(([id]: any) => Boolean(id))
          ).values()
        );
        return filterActiveRecords(deduped as any[]);
      });

      setFormData((prev) => ({
        ...prev,
        customerName: createdCustomer.displayName || createdCustomer.name || finalDisplayName,
        customer_id: createdId,
      }));
      setNewCustomerModalOpen(false);
    } catch (error) {
      console.error("Error creating customer from quick action:", error);
      alert("Error creating customer");
    }
  };

  const openNewTaxQuickAction = (target: { type: "expense" } | { type: "itemized"; index: number }) => {
    setExpenseTaxDropdownOpen(false);
    setExpenseTaxSearch("");
    setOpenItemizedTaxIndex(null);
    setItemizedTaxSearch("");
    setNewTaxTarget(target);
    setIsNewTaxModalOpen(true);
  };

  const handleTaxCreatedFromModal = async (payload: any) => {
    let createdTax = payload?.tax || payload?.data || payload;
    const inputName = String(createdTax?.name || createdTax?.taxName || "").trim();
    const inputRate = Number(createdTax?.rate ?? createdTax?.taxPercentage ?? createdTax?.percentage ?? 0);

    if (!inputName) {
      setIsNewTaxModalOpen(false);
      setNewTaxTarget(null);
      return;
    }

    try {
      createdTax = createTaxLocal({
        name: inputName,
        rate: Number.isFinite(inputRate) ? inputRate : 0,
        isActive: true,
        type: "both",
      }) || createdTax;
    } catch (error) {
      console.error("Error creating tax in local settings storage:", error);
      try {
        const createRes = await taxesAPI.create({
          name: inputName,
          rate: Number.isFinite(inputRate) ? inputRate : 0,
          status: "active",
          isActive: true,
        });
        createdTax = createRes?.data || createRes?.tax || createRes || createdTax;
      } catch (fallbackError) {
        console.error("Fallback tax create failed:", fallbackError);
      }
    }

    const normalizedTax = {
      ...createdTax,
      _id: String(createdTax?._id || createdTax?.id || createdTax?.tax_id || createdTax?.taxId || `tax_${Date.now()}`),
      id: String(createdTax?._id || createdTax?.id || createdTax?.tax_id || createdTax?.taxId || `tax_${Date.now()}`),
      name: String(createdTax?.name || createdTax?.taxName || inputName).trim(),
      rate: Number(createdTax?.rate ?? createdTax?.taxPercentage ?? createdTax?.percentage ?? inputRate ?? 0),
      isActive: createdTax?.isActive !== false && createdTax?.is_active !== false,
    };

    const createdTaxId = String(normalizedTax._id || normalizedTax.id);
    const createdTaxLabel = taxLabel(normalizedTax);

    setTaxes((prev) => {
      const rows = [...prev, normalizedTax];
      const deduped = Array.from(
        new Map(
          rows.map((tax: any) => [String(getTaxId(tax)).toLowerCase(), tax]).filter(([id]: any) => Boolean(id))
        ).values()
      );
      return deduped;
    });

    if (newTaxTarget?.type === "expense") {
      setFormData((prev) => ({ ...prev, tax: createdTaxId }));
    } else if (newTaxTarget?.type === "itemized") {
      const idx = newTaxTarget.index;
      setItemRows((prev) => {
        if (idx < 0 || idx >= prev.length) return prev;
        const next = [...prev] as any[];
        next[idx] = { ...(next[idx] as any), tax: createdTaxLabel };
        return next;
      });
    }

    setIsNewTaxModalOpen(false);
    setNewTaxTarget(null);
  };


  const handleNewAccountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setNewAccountData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveAndSelect = async () => {
    if (!newAccountData.accountName.trim()) {
      alert("Please enter an account name");
      return;
    }

    try {
      // Map UI type to Backend Enum
      const typeMap: any = {
        "Fixed Asset": "fixed_asset",
        "Other Asset": "other_asset",
        "Other Current Asset": "other_current_asset",
        "Cash": "cash",
        "Bank": "bank",
        "Credit Card": "credit_card",
        "Equity": "equity",
        "Expense": "expense",
        "Cost of Goods Sold": "cost_of_goods_sold",
        "Other Expense": "other_expense",
        "Other Current Liability": "other_current_liability",
        "Accounts Payable": "accounts_payable",
        "Accounts Receivable": "accounts_receivable",
        "Income": "income",
        "Other Income": "other_income",
        "Intangible Asset": "intangible_asset",
        "Non Current Asset": "non_current_asset",
        "Non Current Liability": "non_current_liability",
        "Other Liability": "other_liability"
      };

      const accountTypeEnum = typeMap[newAccountData.accountType] || "expense"; // Fallback to expense

      // Prepare payload
      const payload = {
        accountName: newAccountData.accountName,
        accountCode: newAccountData.accountCode || `AUTO-${Date.now()}`, // Ensure code exists
        accountType: accountTypeEnum,
        description: newAccountData.description,
        isSystemAccount: false,
        isActive: true,
        // Default currency if needed
        currency: baseCurrencyCode || formData.currency || "USD"
      };

      // Call API
      const response = await accountsAPI.create(payload);

      if (response && (response.success || response.code === 0)) {
        // Refresh accounts list
        const accountsResponse = await accountsAPI.getAll();
        if (accountsResponse && accountsResponse.success && accountsResponse.data) {
          setAccounts(filterActiveRecords(accountsResponse.data));
        }

        // Set the new account on the target selector
        setFormData((prev) => ({
          ...prev,
          ...(accountQuickActionTarget === "paidThrough"
            ? { paidThrough: newAccountData.accountName }
            : { expenseAccount: newAccountData.accountName })
        }));
        setNewAccountModalOpen(false);

        // Reset form
        setNewAccountData({
          accountType: "Fixed Asset",
          accountName: "",
          isSubAccount: false,
          accountCode: "",
          description: "",
          zohoExpense: false,
        });

        alert("Account created successfully!");
      } else {
        alert(response.message || "Failed to create account");
      }
    } catch (error: any) {
      console.error("Error creating account:", error);
      alert("Error creating account: " + (error.message || "Unknown error"));
    }
  };

  const handleCancelNewAccount = () => {
    setNewAccountModalOpen(false);
  };

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
    },
    tabs: {
      display: "flex",
      borderBottom: "1px solid #e5e7eb",
      padding: "0 24px",
      backgroundColor: "#ffffff",
    },
    tab: {
      padding: "12px 20px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      background: "none",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
      marginBottom: "-1px",
    },
    tabActive: {
      color: "#156372",
      borderBottomColor: "#156372",
    },
    content: {
      display: "flex",
      flex: 1,
      gap: "24px",
      padding: "24px",
      overflow: "auto",
    },
    formSection: {
      flex: 1,
      maxWidth: "600px",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
    },
    required: {
      color: "#156372",
      marginLeft: "2px",
    },
    input: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    inputGroup: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    searchBtn: {
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    select: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      outline: "none",
      width: "100%",
      backgroundColor: "#ffffff",
      cursor: "pointer",
    },
    accountWrapper: {
      position: "relative",
      width: "100%",
    },
    accountButton: {
      width: "100%",
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      textAlign: "left",
    },
    accountButtonPlaceholder: {
      color: "#9ca3af",
    },
    accountDropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: "4px",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      zIndex: 1000,
      maxHeight: "300px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      minWidth: "100%",
    },
    accountSearch: {
      padding: "8px 12px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 10
    },
    accountSearchInput: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: "14px",
    },
    accountList: {
      padding: "4px 0",
    },
    accountCategory: {
      padding: "8px 12px",
      fontSize: "12px",
      fontWeight: "700",
      color: "#4b5563",
      backgroundColor: "transparent",
      textTransform: "capitalize",
      marginTop: "4px",
      marginBottom: "2px"
    },
    accountNew: {
      padding: "10px 12px",
      borderTop: "1px solid #e5e7eb",
      fontSize: "14px",
      color: "#156372",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: "500",
      backgroundColor: "white",
      position: "sticky",
      bottom: 0,
      zIndex: 10
    },
    linkButton: {
      marginTop: "4px",
      padding: "0",
      border: "none",
      background: "none",
      color: "#156372",
      fontSize: "14px",
      cursor: "pointer",
      textAlign: "left",
    },
    amountGroup: {
      display: "flex",
      gap: "0",
      alignItems: "stretch",
    },
    currency: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRight: "none",
      borderTopLeftRadius: "6px",
      borderBottomLeftRadius: "6px",
      backgroundColor: "#f9fafb",
      outline: "none",
      cursor: "pointer",
    },
    amountInput: {
      flex: 1,
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderTopRightRadius: "6px",
      borderBottomRightRadius: "6px",
      outline: "none",
    },
    radioGroup: {
      display: "flex",
      gap: "16px",
      marginTop: "4px",
    },
    radio: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      cursor: "pointer",
    },
    textareaWrapper: {
      position: "relative",
    },
    textarea: {
      width: "100%",
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      outline: "none",
      resize: "vertical",
      minHeight: "80px",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    textareaIcon: {
      position: "absolute",
      bottom: "8px",
      right: "8px",
      color: "#9ca3af",
      cursor: "pointer",
    },
    tagsButton: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    tagsIcon: {
      fontSize: "12px",
    },
    receiptSection: {
      width: "400px",
    },
    receiptArea: {
      border: "2px dashed #d1d5db",
      borderRadius: "8px",
      padding: "40px 24px",
      textAlign: "center",
      backgroundColor: "#f9fafb",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    receiptAreaDragging: {
      borderColor: "#156372",
      backgroundColor: "#15637210",
    },
    receiptIcon: {
      marginBottom: "16px",
    },
    receiptTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "8px",
    },
    receiptSubtitle: {
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "16px",
    },
    receiptBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
    },
    actions: {
      padding: "16px 24px",
      borderTop: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
    },
    saveBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    saveNewBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    cancelBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
    },
    shortcut: {
      fontSize: "12px",
      opacity: 0.7,
    },
  };

  const getAccountTypeInfo = (type: string) => (ACCOUNT_TYPE_DESCRIPTIONS as any)[type] || ACCOUNT_TYPE_DESCRIPTIONS["Fixed Asset"];

  return (
    <>
      <div className="w-full min-h-full flex flex-col overflow-y-auto scroll-smooth bg-gray-50">
        {/* Tabs */}
        <div className="border-b border-gray-200 bg-[#f8fafc] px-6 pt-4">
          <div className="flex items-end gap-0">
            <button
              className={`px-5 py-3 text-sm font-medium rounded-t-md border border-b-0 transition-colors ${activeTab === "expense"
                ? "bg-white text-[#334155] border-[#d1d5db] border-t-[3px] border-t-[#156372]"
                : "bg-[#f1f5f9] text-[#475569] border-[#d1d5db]"
                }`}
              onClick={() => setActiveTab("expense")}
            >
              Record Expense
            </button>
            <button
              className={`px-5 py-3 text-sm font-medium rounded-t-md border border-b-0 transition-colors ${activeTab === "mileage"
                ? "bg-white text-[#334155] border-[#d1d5db] border-t-[3px] border-t-[#156372]"
                : "bg-[#f8fafc] text-[#2563eb] border-transparent"
                }`}
              onClick={() => setActiveTab("mileage")}
            >
              Record Mileage
            </button>
            <button
              className={`px-5 py-3 text-sm font-medium rounded-t-md border border-b-0 transition-colors ${activeTab === "bulk"
                ? "bg-white text-[#334155] border-[#d1d5db] border-t-[3px] border-t-[#156372]"
                : "bg-[#f8fafc] text-[#156372] border-transparent"
                }`}
              onClick={() => setActiveTab("bulk")}
            >
              Bulk Add Expenses
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white">
          {activeTab === "expense" ? (
            isItemized ? (
              /* Itemized Expense View */
              <div className="w-full px-6 py-8 flex gap-14">
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-900">Location</label>
                    <div className="max-w-[460px] relative location-dropdown" ref={locationRef}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!locationOpen) {
                            closeAllDropdowns();
                          }
                          setLocationOpen((prev) => !prev);
                        }}
                        className="w-full rounded-md border border-[#156372] bg-white px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      >
                        <span className={formData.location ? "text-gray-900" : "text-gray-400"}>
                          {formData.location || "Select location"}
                        </span>
                        {locationOpen ? (
                          <ChevronUp size={14} className="text-[#156372]" />
                        ) : (
                          <ChevronDown size={14} className="text-[#156372]" />
                        )}
                      </button>
                      {locationOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#156372] rounded-md shadow-lg z-50">
                          <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                            <Search size={14} className="text-gray-400" />
                            <input
                              type="text"
                              value={locationSearch}
                              onChange={(e) => setLocationSearch(e.target.value)}
                              placeholder="Search"
                              className="flex-1 rounded-md border border-[#156372] px-2.5 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[220px] overflow-y-auto py-1">
                            {filteredLocationOptions.map((loc) => {
                              const selected = String(formData.location || "") === loc;
                              return (
                                <button
                                  key={`itemized-location-${loc}`}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, location: loc }));
                                    setLocationOpen(false);
                                    setLocationSearch("");
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${selected ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"}`}
                                >
                                  <span>{loc}</span>
                                  {selected && <Check size={14} className="text-white" />}
                                </button>
                              );
                            })}
                            {filteredLocationOptions.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">No locations found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-red-600">Date*</label>
                    <div className="max-w-[460px]">
                      <DatePicker
                        value={formData.date}
                        onChange={(date: string) => setFormData(prev => ({ ...prev, date }))}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 my-6"></div>

                  <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-900">Currency</label>
                    <div className="max-w-[460px]">
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      >
                        {currencyOptions.map((code) => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-900">Amounts are</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          checked={formData.is_inclusive_tax === true}
                          onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: true }))}
                          className="accent-[#156372]"
                        />
                        Tax Inclusive
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          checked={formData.is_inclusive_tax === false}
                          onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: false }))}
                          className="accent-[#156372]"
                        />
                        Tax Exclusive
                      </label>
                    </div>
                  </div>

                  {Array.isArray(formData.reportingTags) && formData.reportingTags.length > 0 && (
                    formData.reportingTags.map((tag: any, index: number) => {
                      const tagKey = String(tag?.tagId || tag?.id || tag?.name || index);
                      const options = Array.isArray(tag?.options) ? tag.options : [];
                      return (
                        <div key={`itemized-tag-${tagKey}-${index}`} className="grid grid-cols-[160px_1fr] items-center gap-4">
                          <label className={`text-sm font-medium ${tag?.isMandatory ? "text-red-600" : "text-gray-900"}`}>
                            {String(tag?.name || "Reporting Tag")}{tag?.isMandatory ? "*" : ""}
                          </label>
                          <div className="max-w-[460px]">
                            <select
                              value={String(tag?.value || "")}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => {
                                  const nextReportingTags = Array.isArray(prev.reportingTags) ? [...prev.reportingTags] : [];
                                  nextReportingTags[index] = { ...nextReportingTags[index], value };
                                  return { ...prev, reportingTags: nextReportingTags };
                                });
                              }}
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                            >
                              <option value="">None</option>
                              {options.map((option: string) => (
                                <option key={`${tagKey}-${option}`} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <button onClick={() => setIsItemized(false)} className="text-[#2563eb] text-sm mb-2 flex items-center gap-1 hover:underline">
                    &lt; Back to single expense view
                  </button>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-900">Apply Tax Override</span>
                    <label className="flex items-center gap-2 text-gray-700"><input type="radio" checked className="accent-[#156372]" readOnly />At Transaction Level</label>
                    <label className="flex items-center gap-2 text-gray-700"><input type="radio" className="accent-[#156372]" readOnly />At Line Item Level</label>
                  </div>

                  <div className="border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#f8fafc] border-b border-gray-200">
                          <th className="w-6"></th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-red-600 uppercase">Expense Account</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-700 uppercase">Notes</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-700 uppercase">Tax</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-red-600 uppercase">Amount</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemRows.map((row, idx) => (
                          <tr key={row.id} className="border-b border-gray-100">
                            <td className="px-1 text-gray-400">
                              <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="2" r="1.2" /><circle cx="2" cy="8" r="1.2" /><circle cx="2" cy="14" r="1.2" /><circle cx="8" cy="2" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="14" r="1.2" /></svg>
                            </td>
                            <td className="py-2 px-3">
                              <div className="relative itemized-account-dropdown">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenItemizedTaxIndex(null);
                                    setItemizedTaxSearch("");
                                    setOpenItemizedAccountIndex(openItemizedAccountIndex === idx ? null : idx);
                                  }}
                                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-left flex items-center justify-between"
                                >
                                  <span className={row.account ? "text-gray-900" : "text-gray-400"}>
                                    {row.account || ""}
                                  </span>
                                  <ChevronDown size={14} className="text-gray-500" />
                                </button>
                                {openItemizedAccountIndex === idx && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                    <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                                      <Search size={14} className="text-gray-400" />
                                      <input
                                        type="text"
                                        value={itemizedAccountSearch}
                                        onChange={(e) => setItemizedAccountSearch(e.target.value)}
                                        placeholder="Search"
                                        className="flex-1 border-none outline-none text-sm"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-[220px] overflow-y-auto py-1">
                                      {filteredItemizedExpenseAccounts.map((acc) => {
                                        const selected = row.account === acc;
                                        return (
                                          <button
                                            key={`${idx}-${acc}`}
                                            type="button"
                                            onClick={() => {
                                              const next = [...itemRows];
                                              next[idx].account = acc;
                                              setItemRows(next);
                                              setOpenItemizedAccountIndex(null);
                                              setItemizedAccountSearch("");
                                            }}
                                            className={`w-full px-3 py-2 text-left text-sm ${selected
                                              ? "text-[#156372] font-medium hover:bg-[#156372] hover:text-white"
                                              : "text-gray-700 hover:bg-[#156372] hover:text-white"
                                              }`}
                                          >
                                            {acc}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <textarea value={row.itemDetails} onChange={(e) => { const next = [...itemRows]; next[idx].itemDetails = e.target.value; setItemRows(next); }} placeholder="Max. 500 characters" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] resize-none" rows={2} />
                            </td>
                            <td className="py-2 px-3">
                              <div className="relative itemized-tax-dropdown">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenItemizedAccountIndex(null);
                                    setItemizedAccountSearch("");
                                    setOpenItemizedTaxIndex(openItemizedTaxIndex === idx ? null : idx);
                                  }}
                                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-left flex items-center justify-between"
                                >
                                  <span className={(row as any).tax ? "text-gray-900" : "text-gray-400"}>
                                    {(row as any).tax || "Select a Tax"}
                                  </span>
                                  <ChevronDown size={14} className="text-gray-500" />
                                </button>
                                {openItemizedTaxIndex === idx && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                    <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                                      <Search size={14} className="text-gray-400" />
                                      <input
                                        type="text"
                                        value={itemizedTaxSearch}
                                        onChange={(e) => setItemizedTaxSearch(e.target.value)}
                                        placeholder="Search"
                                        className="flex-1 border-none outline-none text-sm"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500">Compound tax</div>
                                    <div className="max-h-[220px] overflow-y-auto py-1">
                                      {filteredItemizedTaxes.map((tax: any) => {
                                        const label = taxLabel(tax);
                                        const selected = (row as any).tax === label;
                                        return (
                                          <button
                                            key={`${idx}-${getTaxId(tax)}`}
                                            type="button"
                                            onClick={() => {
                                              const next = [...itemRows] as any[];
                                              next[idx].tax = label;
                                              setItemRows(next);
                                              setOpenItemizedTaxIndex(null);
                                              setItemizedTaxSearch("");
                                            }}
                                            className={`w-full px-3 py-2 text-left text-sm ${selected
                                              ? "text-[#156372] font-medium hover:bg-[#156372] hover:text-white"
                                              : "text-gray-700 hover:bg-[#156372] hover:text-white"
                                              }`}
                                          >
                                            {label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenItemizedTaxIndex(null);
                                        openNewTaxQuickAction({ type: "itemized", index: idx });
                                      }}
                                      className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-[#156372] hover:bg-[#156372] hover:text-white flex items-center gap-2"
                                    >
                                      <Plus size={14} />
                                      New Tax
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 w-[140px]">
                              <input type="number" value={row.amount || ""} onChange={(e) => { const next = [...itemRows]; next[idx].amount = parseFloat(e.target.value) || 0; setItemRows(next); const total = next.reduce((sum, r) => sum + (Number(r.amount) || 0), 0); setFormData(prev => ({ ...prev, amount: total.toString() })); }} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]" />
                            </td>
                            <td className="text-center">
                              <button onClick={() => { const next = itemRows.filter((_, i) => i !== idx); setItemRows(next); const total = next.reduce((sum, r) => sum + (Number(r.amount) || 0), 0); setFormData(prev => ({ ...prev, amount: total.toString() })); }} className="text-gray-500 hover:text-gray-700 p-1"><MoreVertical size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-gray-200 px-3 py-4 text-sm text-gray-700 flex items-center gap-2"><Bookmark size={14} className="text-gray-500" />Reporting Tags<ChevronDown size={14} className="text-gray-500" /></div>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <button onClick={() => setItemRows([...itemRows, { id: Date.now(), itemDetails: "", account: "", tax: "", quantity: 1, rate: 0, amount: 0 } as any])} className="px-3 py-1.5 rounded-md bg-[#eef2ff] text-[#2563eb] text-sm font-medium flex items-center gap-1"><Plus size={14} />Add New Row</button>
                    <div className="flex items-center gap-10"><span className="text-base font-semibold text-gray-900">Expense Total ( {formData.currency || baseCurrencyCode} )</span><span className="text-[28px] font-semibold text-gray-900">{parseFloat(formData.amount || "0").toFixed(2)}</span></div>
                  </div>

                  <div className="h-px bg-gray-200 my-6"></div>

                  <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-900">Reference#</label>
                    <div className="max-w-[460px]"><input type="text" name="reference" value={formData.reference} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]" /></div>
                  </div>

                  <div className="h-px bg-gray-200 my-6"></div>

                  <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-900">Customer Name</label>
                    <div className="max-w-[560px] flex items-center gap-0">
                      <div className="flex-1 relative" ref={customerRef}>
                        <button
                          type="button"
                          className="w-full rounded-l-md rounded-r-none border border-gray-300 bg-white px-3 py-2 text-sm text-left flex items-center justify-between focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          onClick={() => setCustomerOpen(!customerOpen)}
                        >
                          <span className={!formData.customerName ? "text-gray-400" : "text-gray-900"}>
                            {formData.customerName || "Select or add a customer"}
                          </span>
                          <ChevronDown size={14} className="text-gray-500" />
                        </button>
                        {customerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                            <div className="p-2 border-b border-gray-200 flex items-center gap-2 bg-white sticky top-0">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                className="flex-1 rounded-md border border-[#156372] px-2.5 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
                              {allCustomers
                                .filter((c) => {
                                  const display = String(c.displayName || c.name || "").toLowerCase();
                                  const email = String(c.email || "").toLowerCase();
                                  const company = String(c.companyName || "").toLowerCase();
                                  const q = customerSearch.toLowerCase();
                                  return !q || display.includes(q) || email.includes(q) || company.includes(q);
                                })
                                .map((c, index) => {
                                  const displayName = c.displayName || c.name || "";
                                  const customerNo = c.customerNumber || c.customer_number || c.number || "";
                                  const email = c.email || "";
                                  const company = c.companyName || displayName;
                                  const selected = formData.customer_id === (c._id || c.id);
                                  return (
                                    <button
                                      key={c._id || c.id || `${displayName}-${index}`}
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev) => ({
                                          ...prev,
                                          customerName: displayName,
                                          customer_id: c._id || c.id || "",
                                          billable: c ? prev.billable : false,
                                          projectName: "",
                                          project_id: "",
                                        }));
                                        setCustomerProjects([]);
                                        setCustomerOpen(false);
                                      }}
                                      className={`w-full rounded-md px-3 py-2 text-left ${selected
                                        ? "bg-[#156372] text-white"
                                        : "text-gray-900 hover:bg-[#156372] hover:text-white"
                                        }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${selected ? "bg-white/20 text-white" : "bg-[#e2e8f0] text-gray-700"}`}>
                                          {String(displayName || "C").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium truncate">
                                            {displayName}{customerNo ? ` | ${customerNo}` : ""}
                                          </div>
                                          <div className={`text-xs truncate ${selected ? "text-white/90" : "text-gray-500"}`}>
                                            {email || company}
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                            <button
                              type="button"
                              className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-[#156372] hover:bg-[#156372] hover:text-white flex items-center gap-2"
                              onClick={() => {
                                openNewCustomerQuickAction();
                              }}
                            >
                              <Plus size={14} />
                              New Customer
                            </button>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setCustomerSearchModalOpen(true)} className="h-[38px] px-3 bg-[#16a34a] text-white rounded-r-md rounded-l-none hover:bg-[#15803d] transition-colors" type="button"><Search size={16} /></button>
                      <label className={`flex items-center gap-1.5 text-sm ${formData.customer_id ? "text-gray-700" : "text-gray-400"}`}><input type="checkbox" name="billable" checked={!!formData.billable} disabled={!formData.customer_id} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372] disabled:cursor-not-allowed" />Billable</label>
                    </div>
                  </div>

                  {formData.customer_id && (
                    <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">Projects</label>
                      <div className="max-w-[460px] relative" ref={projectRef}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!projectOpen) {
                              closeAllDropdowns();
                              if (!loadingCustomerProjects && customerProjects.length === 0) {
                                void loadProjectsForSelectedCustomer(formData.customer_id);
                              }
                            }
                            setProjectOpen((prev) => !prev);
                          }}
                          disabled={loadingCustomerProjects}
                          className="w-full rounded-md border border-[#156372] bg-white px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          <span className={formData.project_id ? "text-gray-900" : "text-gray-400"}>
                            {formData.projectName || (loadingCustomerProjects ? "Loading projects..." : "Select a project")}
                          </span>
                          {projectOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-[#156372]" />}
                        </button>
                        {projectOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#156372] rounded-md shadow-lg z-50">
                            <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className="flex-1 rounded-md border border-[#156372] px-2.5 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredCustomerProjects.map((project) => {
                                const selected = formData.project_id === project.id;
                                return (
                                  <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, project_id: project.id, projectName: project.name }));
                                      setProjectOpen(false);
                                      setProjectSearch("");
                                    }}
                                    className={`w-full px-3 py-2 text-left text-sm ${selected ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"}`}
                                  >
                                    {project.name}
                                  </button>
                                );
                              })}
                              {!loadingCustomerProjects && filteredCustomerProjects.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">No projects found for the selected customer.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {formData.billable && formData.customer_id && (
                    <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Mark up by <Info size={13} className="text-gray-400" />
                      </label>
                      <div className="max-w-[230px] flex border border-gray-300 rounded-md overflow-hidden">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.markupBy}
                          onChange={(e) => setFormData((prev) => ({ ...prev, markupBy: e.target.value }))}
                          className="flex-1 px-3 py-2 text-sm outline-none border-none text-right"
                        />
                        <select
                          value={formData.markupType}
                          onChange={(e) => setFormData((prev) => ({ ...prev, markupType: e.target.value }))}
                          className="w-[58px] border-l border-gray-300 bg-[#f8fafc] text-sm px-2 outline-none"
                        >
                          <option value="%">%</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-[380px]">
                  {uploadedFiles.length > 0 ? (
                    <div className="bg-white border border-[#cbd5e1] rounded-xl min-h-[440px] flex flex-col overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#dbe1ea]">
                        <div className="flex w-full items-stretch">
                          <button
                            onClick={handleUploadClick}
                            className="flex-1 bg-transparent text-[#334155] py-1.5 px-2 text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <UploadIcon size={15} />
                            Upload your Files
                            <ChevronDown size={14} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                        {isImageUpload(uploadedFiles[0]) && uploadedPreviewUrl ? (
                          <img
                            src={uploadedPreviewUrl}
                            alt={String(uploadedFiles[0]?.name || "Uploaded image")}
                            className="max-h-[260px] w-auto rounded-md border border-gray-200 object-contain"
                          />
                        ) : (
                          <>
                            <div className="w-24 h-24 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                              <File size={38} className="text-[#2563eb]" />
                            </div>
                            <p className="mt-3 text-lg font-semibold text-[#334155]">{getDocumentTypeLabel(uploadedFiles[0])}</p>
                          </>
                        )}
                        <p className="mt-3 text-[22px] text-[#475569] break-all">{uploadedFiles[0]?.name}</p>
                      </div>
                      <div className="px-4 py-3 border-t border-dashed border-[#dbe1ea] flex items-center justify-between">
                        <span className="text-[24px] text-[#475569]">1 of {uploadedFiles.length} Files</span>
                        <button onClick={() => handleRemoveFile(uploadedFiles[0].id)} className="text-[#ef4444] hover:text-[#dc2626]">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-dashed border-[#cbd5e1] rounded-lg p-8 min-h-[440px] flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-teal-50 rounded-lg flex items-center justify-center mb-6"><ImageIcon size={32} className="text-blue-900" /></div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Drag or Drop your Receipts</h3>
                      <p className="text-xs text-gray-500 mb-8">Maximum file size allowed is 10MB</p>
                      <div className="flex w-full items-stretch">
                        <button onClick={handleUploadClick} className="flex-1 bg-[#f1f5f9] border border-[#d1d5db] text-[#334155] py-2.5 px-4 rounded-l-md text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#e2e8f0] transition-colors"><UploadIcon size={16} />Upload your Files</button>
                        <button className="px-3 bg-[#f1f5f9] border border-[#d1d5db] border-l-0 rounded-r-md text-gray-500 hover:bg-[#e2e8f0]"><ChevronDown size={14} /></button>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,.pdf" />
                </div>
              </div>
            ) : (
              <div className="w-full px-6 py-8 flex gap-14">
                {/* Left Section - Form */}
                <div className="flex-1 space-y-6">
                  {/* Location */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-900">Location</label>
                    <div className="max-w-[460px] relative location-dropdown" ref={locationRef}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!locationOpen) {
                            closeAllDropdowns();
                          }
                          setLocationOpen((prev) => !prev);
                        }}
                        className="w-full rounded-md border border-[#156372] bg-white px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      >
                        <span className={formData.location ? "text-gray-900" : "text-gray-400"}>
                          {formData.location || "Select location"}
                        </span>
                        {locationOpen ? (
                          <ChevronUp size={14} className="text-[#156372]" />
                        ) : (
                          <ChevronDown size={14} className="text-[#156372]" />
                        )}
                      </button>
                      {locationOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#156372] rounded-md shadow-lg z-50">
                          <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                            <Search size={14} className="text-gray-400" />
                            <input
                              type="text"
                              value={locationSearch}
                              onChange={(e) => setLocationSearch(e.target.value)}
                              placeholder="Search"
                              className="flex-1 rounded-md border border-[#156372] px-2.5 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[220px] overflow-y-auto py-1">
                            {filteredLocationOptions.map((loc) => {
                              const selected = String(formData.location || "") === loc;
                              return (
                                <button
                                  key={`single-location-${loc}`}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, location: loc }));
                                    setLocationOpen(false);
                                    setLocationSearch("");
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${selected ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"}`}
                                >
                                  <span>{loc}</span>
                                  {selected && <Check size={14} className="text-white" />}
                                </button>
                              );
                            })}
                            {filteredLocationOptions.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">No locations found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-red-600 flex items-center">
                      Date<span className="ml-[1px]">*</span>
                    </label>
                    <div className="max-w-[460px]">
                      <DatePicker
                        value={formData.date}
                        onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                  </div>

                  {/* Category Name */}
                  <div className="grid grid-cols-[180px_1fr] items-start gap-4">
                    <label className="text-sm font-medium text-red-600 mt-2 flex items-center">
                      Category Name<span className="ml-[1px]">*</span>
                    </label>
                    <div className="max-w-[460px] relative" ref={expenseAccountRef}>
                      {!isItemized ? (
                        <>
                          <div
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 flex items-center justify-between cursor-pointer focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                            onClick={() => {
                              if (!expenseAccountOpen) {
                                closeAllDropdowns();
                              }
                              setExpenseAccountOpen(!expenseAccountOpen);
                            }}
                          >
                            <span className={!formData.expenseAccount ? "text-gray-400" : ""}>
                              {formData.expenseAccount || "Select Category"}
                            </span>
                            <ChevronDown size={14} className="text-gray-500" />
                          </div>
                          <button
                            onClick={() => setIsItemized(true)}
                            className="text-xs text-[#156372] hover:underline mt-1 flex items-center gap-1"
                          >
                            <Edit3 size={12} />
                            Itemize
                          </button>
                        </>
                      ) : (
                        <div className="w-full">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500 font-medium">
                                <th className="text-left pb-2 font-normal">Account</th>
                                <th className="text-right pb-2 font-normal">Amount</th>
                                <th className="w-8 pb-2"></th>
                              </tr>
                            </thead>
                            <tbody className="space-y-2">
                              {itemRows.map((row, idx) => (
                                <tr key={row.id}>
                                  <td className="pr-2 pb-2">
                                    <select
                                      value={row.account}
                                      onChange={(e) => {
                                        const newRows = [...itemRows];
                                        newRows[idx].account = e.target.value;
                                        setItemRows(newRows);
                                      }}
                                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                    >
                                      <option value="">Select Category</option>
                                      {ITEMIZED_EXPENSE_ACCOUNT_OPTIONS.map(acc => (
                                        <option key={acc} value={acc}>{acc}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="w-32 pb-2">
                                    <input
                                      type="number"
                                      value={row.amount}
                                      onChange={(e) => {
                                        const newRows = [...itemRows];
                                        newRows[idx].amount = parseFloat(e.target.value) || 0;
                                        setItemRows(newRows);
                                        // Update total amount in formData
                                        const total = newRows.reduce((sum, r) => sum + r.amount, 0);
                                        setFormData(prev => ({ ...prev, amount: total.toString() }));
                                      }}
                                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-right outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="pl-2 pb-2 text-center">
                                    {itemRows.length > 1 && (
                                      <button onClick={() => setItemRows(itemRows.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                                        <X size={14} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex justify-between items-center mt-2">
                            <button
                              onClick={() => setItemRows([...itemRows, { id: Date.now(), itemDetails: "", account: "", tax: "", quantity: 1, rate: 0, amount: 0 }])}
                              className="text-xs text-[#156372] hover:underline"
                            >
                              + Add another line
                            </button>
                            <button
                              onClick={() => {
                                setIsItemized(false);
                                // Keep the first account if possible
                                if (itemRows.length > 0) {
                                  setFormData(prev => ({ ...prev, expenseAccount: itemRows[0].account }));
                                }
                              }}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              Cancel Itemize
                            </button>
                          </div>
                        </div>
                      )}
                      {expenseAccountOpen && !isItemized && (
                        <div className="absolute top-full left-0 w-[320px] mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto flex flex-col">
                          <div className="p-2 border-b border-gray-200 flex items-center gap-2 bg-white sticky top-0 z-10">
                            <Search size={14} className="text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={expenseAccountSearch}
                              onChange={(e) => setExpenseAccountSearch(e.target.value)}
                              className="flex-1 border-none outline-none text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="py-1 overflow-y-auto max-h-[250px]">
                            {filteredAccounts.length === 0 ? (
                              <div className="p-3 text-sm text-gray-500 text-center">
                                No accounts found
                              </div>
                            ) : (
                              filteredAccounts.map((account: string) => {
                                const isSelected = formData.expenseAccount === account;
                                return (
                                  <div
                                    key={account}
                                    onClick={() => handleExpenseAccountSelect(account)}
                                    className={`w-full px-6 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${isSelected
                                      ? "text-[#156372] font-medium hover:bg-[#156372] hover:text-white"
                                      : "text-gray-700 hover:bg-[#156372] hover:text-white"
                                      }`}
                                  >
                                    <span>{account}</span>
                                    {isSelected && <Check size={14} className="text-[#156372]" />}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-red-600 flex items-center">
                      Amount<span className="ml-[1px]">*</span>
                    </label>
                    <div className="max-w-[460px] flex">
                      <div className="relative flex-1 flex border border-gray-300 rounded-md overflow-visible focus-within:border-[#156372] focus-within:ring-1 focus-within:ring-[#156372]">
                        <div className="relative bg-[#f8fafc] border-r border-gray-300 amount-currency-dropdown">
                          <button
                            type="button"
                            onClick={() => {
                              if (!amountCurrencyOpen) {
                                closeAllDropdowns();
                              }
                              setAmountCurrencyOpen((prev) => !prev);
                            }}
                            className="min-w-[78px] h-full px-3 py-2 text-sm font-medium text-gray-700 flex items-center justify-between gap-2"
                          >
                            <span>{formData.currency || currencyOptions[0] || "USD"}</span>
                            <ChevronDown size={14} className="text-gray-500" />
                          </button>
                          {amountCurrencyOpen && (
                            <div className="absolute left-0 top-full mt-1 w-[206px] bg-white border border-gray-200 rounded-md shadow-lg z-50">
                              <div className="max-h-[220px] overflow-y-auto py-1">
                                {currencyOptions.map((code) => {
                                  const selected = code === String(formData.currency || currencyOptions[0] || "");
                                  return (
                                    <button
                                      key={code}
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, currency: code }));
                                        setAmountCurrencyOpen(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-sm ${selected
                                        ? "text-[#156372] font-medium hover:bg-[#156372] hover:text-white"
                                        : "text-gray-700 hover:bg-[#156372] hover:text-white"
                                        }`}
                                    >
                                      {code}
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setAmountCurrencyOpen(false);
                                  setNewCurrencyModalOpen(true);
                                }}
                                className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-[#156372] hover:bg-[#156372] hover:text-white flex items-center gap-2"
                              >
                                <Plus size={14} />
                                New Currency
                              </button>
                            </div>
                          )}
                        </div>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="flex-1 px-3 py-2 text-sm outline-none border-none"
                          readOnly={isItemized}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amount Is - Tax Inclusive/Exclusive */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4 mt-4">
                    <label className="text-sm font-medium text-gray-700">
                      Amount Is
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative flex items-center">
                          <input
                            type="radio"
                            name="amountIs"
                            checked={formData.is_inclusive_tax === true}
                            onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: true }))}
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-[#2196F3] checked:bg-[#2196F3] transition-all"
                          />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                        </div>
                        <span className="text-sm text-gray-700">Tax Inclusive</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative flex items-center">
                          <input
                            type="radio"
                            name="amountIs"
                            checked={formData.is_inclusive_tax === false}
                            onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: false }))}
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-[#2196F3] checked:bg-[#2196F3] transition-all"
                          />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                        </div>
                        <span className="text-sm text-gray-700">Tax Exclusive</span>
                      </label>
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 my-8"></div>

                  {/* Tax */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Tax</label>
                    <div className="max-w-[460px]">
                      <div className="relative expense-tax-dropdown">
                        <button
                          type="button"
                          onClick={() => setExpenseTaxDropdownOpen((prev) => !prev)}
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        >
                          <span className={formData.tax ? "text-gray-900" : "text-gray-400"}>
                            {formData.tax
                              ? taxLabel(taxes.find((tax: any) => getTaxId(tax) === String(formData.tax)) || { name: formData.tax, rate: 0 })
                              : "Select a Tax"}
                          </span>
                          <span className="flex items-center">
                            {formData.tax && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData((prev) => ({ ...prev, tax: "" }));
                                  setTaxAmountOverride("");
                                  setTaxAmountEditOpen(false);
                                  setTaxAmountEditValue("");
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setFormData((prev) => ({ ...prev, tax: "" }));
                                    setTaxAmountOverride("");
                                    setTaxAmountEditOpen(false);
                                    setTaxAmountEditValue("");
                                  }
                                }}
                                className="text-red-500 hover:text-red-600 px-2"
                              >
                                <X size={14} />
                              </span>
                            )}
                            {formData.tax && <span className="h-5 w-px bg-gray-200" />}
                            <span className="px-2">
                            {expenseTaxDropdownOpen ? (
                              <ChevronUp size={14} className="text-gray-500" />
                            ) : (
                              <ChevronDown size={14} className="text-gray-500" />
                            )}
                            </span>
                          </span>
                        </button>
                        {expenseTaxDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                            <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={expenseTaxSearch}
                                onChange={(e) => setExpenseTaxSearch(e.target.value)}
                                placeholder="Search"
                                className="flex-1 border-none outline-none text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500">Compound tax</div>
                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredExpenseTaxes.map((tax: any) => {
                                const taxId = getTaxId(tax);
                                const label = taxLabel(tax);
                                const selected = String(formData.tax || "") === taxId;
                                return (
                                  <button
                                    key={taxId}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, tax: taxId }));
                                      setTaxAmountOverride("");
                                      setTaxAmountEditOpen(false);
                                      setTaxAmountEditValue("");
                                      setExpenseTaxDropdownOpen(false);
                                      setExpenseTaxSearch("");
                                    }}
                                    className={`w-full px-3 py-2 text-left text-sm ${selected
                                      ? "text-[#156372] font-medium hover:bg-[#156372] hover:text-white"
                                      : "text-gray-700 hover:bg-[#156372] hover:text-white"
                                      }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                              {filteredExpenseTaxes.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                openNewTaxQuickAction({ type: "expense" });
                              }}
                              className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-[#156372] hover:bg-[#156372] hover:text-white flex items-center gap-2"
                            >
                              <Plus size={14} />
                              New Tax
                            </button>
                          </div>
                        )}
                      </div>
                      {formData.tax && (
                        <div className="mt-1 text-sm text-gray-500 relative">
                          <span>Tax Amount = {taxAmountDisplay} {formData.currency || baseCurrencyCode || "USD"}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTaxAmountEditValue(taxAmountDisplay);
                              setTaxAmountEditOpen((prev) => !prev);
                            }}
                            className="ml-2 text-[#3b82f6] inline-flex items-center"
                          >
                            <Edit3 size={13} />
                          </button>
                          {taxAmountEditOpen && (
                            <div className="absolute left-0 top-full mt-2 w-[360px] max-w-[92vw] bg-white border border-gray-300 rounded-md shadow-lg z-50">
                              <div className="flex items-center justify-between px-2.5 py-2 border-b border-gray-200">
                                <span className="text-[18px] leading-none text-gray-300">*</span>
                                <span className="text-base font-medium text-gray-800">
                                  Update Taxes Amount ( in {formData.currency || baseCurrencyCode || "USD"} )
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setTaxAmountEditOpen(false)}
                                  className="w-7 h-7 rounded border border-[#3b82f6] text-red-500 flex items-center justify-center"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="px-2.5 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-[13px] text-gray-700">
                                    {taxLabel(selectedExpenseTax || { name: "", rate: 0 })} <span className="text-xs text-gray-500">(Compound tax)</span>
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={taxAmountEditValue}
                                    onChange={(e) => setTaxAmountEditValue(e.target.value)}
                                    className="w-[140px] rounded-md border border-gray-300 px-2.5 py-1.5 text-right text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                  />
                                </div>
                                <div className="mt-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const parsed = Number(taxAmountEditValue);
                                      if (Number.isFinite(parsed) && parsed >= 0) {
                                        setTaxAmountOverride(parsed.toFixed(2));
                                      }
                                      setTaxAmountEditOpen(false);
                                    }}
                                    className="px-3.5 py-1.5 rounded-md bg-[#16a34a] text-sm text-white hover:bg-[#15803d]"
                                  >
                                    Update
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Reference#</label>
                    <div className="max-w-[460px]">
                      <input
                        type="text"
                        name="reference"
                        value={formData.reference}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="grid grid-cols-[180px_1fr] items-start gap-4">
                    <label className="text-sm font-medium text-gray-700 mt-2">Notes</label>
                    <div className="max-w-[460px]">
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Max. 500 characters"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] min-h-[100px] resize-none"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 my-8"></div>

                  {/* Customer Name */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Customer Name</label>
                    <div className="max-w-[560px] flex items-center gap-0">
                      <div className="flex-1 relative" ref={customerRef}>
                        <div
                          className="w-full rounded-l-md rounded-r-none border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 flex items-center justify-between cursor-pointer focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          onClick={() => setCustomerOpen(!customerOpen)}
                        >
                          <span className={!formData.customerName ? "text-gray-400" : ""}>
                            {formData.customerName || "Select or add a customer"}
                          </span>
                          <ChevronDown size={14} className="text-gray-500" />
                        </div>
                        {customerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                            <div className="p-2 border-b border-gray-200 flex items-center gap-2 bg-white sticky top-0">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search customers"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                className="flex-1 rounded-md border border-[#156372] px-2.5 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
                              {loadingCustomers ? (
                                <div className="p-3 text-sm text-gray-500 text-center">
                                  Loading customers...
                                </div>
                              ) : allCustomers.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500 text-center">
                                  No customers found
                                </div>
                              ) : (
                                allCustomers
                                  .filter((c) => (c.displayName || c.name || "").toLowerCase().includes(customerSearch.toLowerCase()))
                                  .map((c, index) => {
                                    const displayName = c.displayName || c.name || "";
                                    const customerNo = c.customerNumber || c.customer_number || c.number || "";
                                    const email = c.email || "";
                                    const company = c.companyName || displayName;
                                    const selected = formData.customer_id === (c._id || c.id);
                                    return (
                                      <button
                                        key={c._id || c.id || `${displayName}-${index}`}
                                        type="button"
                                        onClick={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            customerName: displayName,
                                            customer_id: c._id || c.id || "",
                                            billable: c ? prev.billable : false,
                                            projectName: "",
                                            project_id: "",
                                          }));
                                          setCustomerProjects([]);
                                          setCustomerOpen(false);
                                        }}
                                        className={`w-full rounded-md px-3 py-2 text-left ${selected
                                          ? "bg-[#156372] text-white"
                                          : "text-gray-900 hover:bg-[#156372] hover:text-white"
                                          }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${selected ? "bg-white/20 text-white" : "bg-[#e2e8f0] text-gray-700"}`}>
                                            {String(displayName || "C").charAt(0).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">
                                              {displayName}{customerNo ? ` | ${customerNo}` : ""}
                                            </div>
                                            <div className={`text-xs truncate ${selected ? "text-white/90" : "text-gray-500"}`}>
                                              {email || company}
                                            </div>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })
                              )}
                            </div>
                            <button
                              type="button"
                              className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-[#156372] hover:bg-[#156372] hover:text-white flex items-center gap-2"
                              onClick={() => {
                                openNewCustomerQuickAction();
                              }}
                            >
                              <Plus size={14} />
                              New Customer
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setCustomerSearchModalOpen(true)}
                        className="h-[38px] px-3 bg-[#156372] text-white rounded-r-md rounded-l-none hover:bg-[#0D4A52] transition-colors"
                      >
                        <Search size={16} />
                      </button>
                      <label className={`ml-3 flex items-center gap-1.5 text-sm ${formData.customer_id ? "text-gray-700" : "text-gray-400"}`}>
                        <input
                          type="checkbox"
                          name="billable"
                          checked={!!formData.billable}
                          disabled={!formData.customer_id}
                          onChange={handleChange}
                          className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372] disabled:cursor-not-allowed"
                        />
                        Billable
                      </label>
                    </div>
                  </div>

                  {formData.customer_id && (
                    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">Projects</label>
                      <div className="max-w-[460px] relative" ref={projectRef}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!projectOpen) {
                              closeAllDropdowns();
                              if (!loadingCustomerProjects && customerProjects.length === 0) {
                                void loadProjectsForSelectedCustomer(formData.customer_id);
                              }
                            }
                            setProjectOpen((prev) => !prev);
                          }}
                          disabled={loadingCustomerProjects}
                          className="w-full rounded-md border border-[#156372] bg-white px-3 py-2 text-sm text-left flex items-center justify-between outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          <span className={formData.project_id ? "text-gray-900" : "text-gray-400"}>
                            {formData.projectName || (loadingCustomerProjects ? "Loading projects..." : "Select a project")}
                          </span>
                          {projectOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-[#156372]" />}
                        </button>
                        {projectOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#156372] rounded-md shadow-lg z-50">
                            <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className="flex-1 rounded-md border border-[#156372] px-2.5 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredCustomerProjects.map((project) => {
                                const selected = formData.project_id === project.id;
                                return (
                                  <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, project_id: project.id, projectName: project.name }));
                                      setProjectOpen(false);
                                      setProjectSearch("");
                                    }}
                                    className={`w-full px-3 py-2 text-left text-sm ${selected ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"}`}
                                  >
                                    {project.name}
                                  </button>
                                );
                              })}
                              {!loadingCustomerProjects && filteredCustomerProjects.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">No projects found for the selected customer.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {formData.billable && formData.customer_id && (
                    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Mark up by <Info size={13} className="text-gray-400" />
                      </label>
                      <div className="max-w-[230px] flex border border-gray-300 rounded-md overflow-hidden">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.markupBy}
                          onChange={(e) => setFormData((prev) => ({ ...prev, markupBy: e.target.value }))}
                          className="flex-1 px-3 py-2 text-sm outline-none border-none text-right"
                        />
                        <select
                          value={formData.markupType}
                          onChange={(e) => setFormData((prev) => ({ ...prev, markupType: e.target.value }))}
                          className="w-[58px] border-l border-gray-300 bg-[#f8fafc] text-sm px-2 outline-none"
                        >
                          <option value="%">%</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="h-px bg-gray-200 my-8"></div>

                  {/* Reporting Tags */}
                  {Array.isArray(formData.reportingTags) && formData.reportingTags.length > 0 && (
                    <div className="grid grid-cols-2 gap-10 pb-4">
                      {formData.reportingTags.map((tag: any, index: number) => {
                        const tagKey = String(tag?.tagId || tag?.id || tag?.name || index);
                        const options = Array.isArray(tag?.options) ? tag.options : [];
                        const selectedValue = String(tag?.value || "");
                        return (
                          <div key={`expense-reporting-tag-${tagKey}-${index}`} className="grid grid-cols-[180px_1fr] items-center gap-4">
                            <label className={`text-sm font-medium ${tag?.isMandatory ? "text-red-600" : "text-gray-700"}`}>
                              {String(tag?.name || "Reporting Tag")}{tag?.isMandatory ? " *" : ""}
                            </label>
                            <select
                              value={selectedValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => {
                                  const nextReportingTags = Array.isArray(prev.reportingTags) ? [...prev.reportingTags] : [];
                                  nextReportingTags[index] = {
                                    ...nextReportingTags[index],
                                    value,
                                    name: nextReportingTags[index]?.name || tag?.name,
                                    tagId: nextReportingTags[index]?.tagId || nextReportingTags[index]?.id || tagKey,
                                    id: nextReportingTags[index]?.id || nextReportingTags[index]?.tagId || tagKey,
                                  };
                                  return { ...prev, reportingTags: nextReportingTags };
                                });
                              }}
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                            >
                              <option value="">None</option>
                              {options.map((option: string) => (
                                <option key={`${tagKey}-${option}`} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Section - Receipts */}
                <div className="w-[380px]">
                  {uploadedFiles.length > 0 ? (
                    <div className="bg-white border border-[#cbd5e1] rounded-xl min-h-[440px] flex flex-col overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#dbe1ea]">
                        <button
                          onClick={handleUploadClick}
                          className="w-full bg-transparent text-[#334155] py-1.5 px-2 text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <UploadIcon size={15} />
                          Upload your Files
                          <ChevronDown size={14} className="text-gray-400" />
                        </button>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                        {isImageUpload(uploadedFiles[0]) && uploadedPreviewUrl ? (
                          <img
                            src={uploadedPreviewUrl}
                            alt={String(uploadedFiles[0]?.name || "Uploaded image")}
                            className="max-h-[260px] w-auto rounded-md border border-gray-200 object-contain"
                          />
                        ) : (
                          <>
                            <div className="w-24 h-24 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                              <File size={38} className="text-[#2563eb]" />
                            </div>
                            <p className="mt-3 text-lg font-semibold text-[#334155]">{getDocumentTypeLabel(uploadedFiles[0])}</p>
                          </>
                        )}
                        <p className="mt-3 text-[22px] text-[#475569] break-all">{uploadedFiles[0]?.name}</p>
                      </div>
                      <div className="px-4 py-3 border-t border-dashed border-[#dbe1ea] flex items-center justify-between">
                        <span className="text-[24px] text-[#475569]">1 of {uploadedFiles.length} Files</span>
                        <button onClick={() => handleRemoveFile(uploadedFiles[0].id)} className="text-[#ef4444] hover:text-[#dc2626]">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-dashed border-[#cbd5e1] rounded-lg p-8 min-h-[440px] flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-teal-50 rounded-lg flex items-center justify-center mb-6">
                        <ImageIcon size={32} className="text-blue-900" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Drag or Drop your Receipts</h3>
                      <p className="text-xs text-gray-500 mb-8">Maximum file size allowed is 10MB</p>

                      <div className="flex w-full items-stretch">
                        <button
                          onClick={handleUploadClick}
                          className="flex-1 bg-[#f1f5f9] border border-[#d1d5db] text-[#334155] py-2.5 px-4 rounded-l-md text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#e2e8f0] transition-colors"
                        >
                          <UploadIcon size={16} />
                          Upload your Files
                        </button>
                        <button
                          className="px-3 bg-[#f1f5f9] border border-[#d1d5db] border-l-0 rounded-r-md text-gray-500 hover:bg-[#e2e8f0]"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf"
                  />
                </div>
              </div>
            )) : activeTab === "mileage" ? (
              <RecordMileage />
            ) : (
            <div className="p-4 max-w-full">
              <div style={{ backgroundColor: "white", borderRadius: "6px", overflow: "visible", border: "1px solid #e5e7eb" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          DATE<span style={{ color: "#156372" }}>*</span>
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          CATEGORY NAME<span style={{ color: "#156372" }}>*</span>
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          AMOUNT<span style={{ color: "#156372" }}>*</span>
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          LOCATION
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          TAX
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          CUSTOMER NAME
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          PROJECTS
                        </th>
                        <th style={{ padding: "10px", textAlign: "center", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          BILLABLE
                        </th>
                        <th style={{ padding: "10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#dc2626", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          REPORTING TAGS
                        </th>
                        <th style={{ padding: "10px 6px", textAlign: "center", width: "44px", minWidth: "44px", position: "sticky", right: 0, background: "#f9fafb", zIndex: 2 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkExpenses.map((expense, index) => (
                        <tr key={expense.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          {/* DATE */}
                          <td style={{ padding: "6px 10px" }}>
                            <DatePicker
                              value={expense.date}
                              onChange={(date) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].date = date;
                                setBulkExpenses(newExpenses);
                              }}
                              placeholder="dd/mm/yyyy"
                            />
                          </td>

                          {/* EXPENSE ACCOUNT */}
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ position: "relative", minWidth: "140px" }} data-bulk-dropdown="true">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (bulkCategoryOpenIndex === index) {
                                    setBulkCategoryOpenIndex(null);
                                    setBulkCategorySearch("");
                                  } else {
                                    closeBulkDropdowns();
                                    setBulkCategoryOpenIndex(index);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "5px 10px",
                                  fontSize: "13px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  background: "white",
                                  outline: "none",
                                  color: expense.expenseAccount ? "#1f2937" : "#9ca3af",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{expense.expenseAccount || "Select an account"}</span>
                                {bulkCategoryOpenIndex === index ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
                              </button>
                              {bulkCategoryOpenIndex === index && (
                                <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", background: "white", border: "1px solid #d1d5db", borderRadius: "6px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", zIndex: 92 }}>
                                  <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Search size={14} color="#9ca3af" />
                                    <input
                                      value={bulkCategorySearch}
                                      onChange={(e) => setBulkCategorySearch(e.target.value)}
                                      placeholder="Search"
                                      autoFocus
                                      style={{ width: "100%", border: "1px solid #156372", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", outline: "none" }}
                                    />
                                  </div>
                                  <div style={{ maxHeight: "220px", overflowY: "auto", padding: "4px" }}>
                                    {bulkCategoryOptions
                                      .filter((acc) => acc.toLowerCase().includes(bulkCategorySearch.toLowerCase()))
                                      .map((acc) => {
                                        const selected = String(expense.expenseAccount || "") === acc;
                                        return (
                                          <button
                                            key={`${expense.id}-acc-${acc}`}
                                            type="button"
                                            onClick={() => {
                                              const next = [...bulkExpenses];
                                              next[index].expenseAccount = acc;
                                              setBulkExpenses(next);
                                              setBulkCategoryOpenIndex(null);
                                              setBulkCategorySearch("");
                                            }}
                                            style={{
                                              width: "100%",
                                              padding: "8px 10px",
                                              border: "none",
                                              borderRadius: "6px",
                                              textAlign: "left",
                                              background: selected ? "#156372" : "transparent",
                                              color: selected ? "white" : "#374151",
                                              cursor: "pointer",
                                            }}
                                          >
                                            {acc}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* AMOUNT */}
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden", minWidth: "180px", backgroundColor: "#fff" }}>
                              <div style={{ position: "relative", width: "68px", backgroundColor: "#f3f4f6", borderRight: "1px solid #d1d5db", flexShrink: 0 }} data-bulk-dropdown="true">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (bulkCurrencyOpenIndex === index) {
                                      setBulkCurrencyOpenIndex(null);
                                      setBulkCurrencySearch("");
                                    } else {
                                      closeBulkDropdowns();
                                      setBulkCurrencyOpenIndex(index);
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    padding: "5px 20px 5px 8px",
                                    fontSize: "13px",
                                    border: "none",
                                    backgroundColor: "transparent",
                                    cursor: "pointer",
                                    color: "#374151",
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span>{expense.currency || currencyOptions[0] || baseCurrencyCode || "USD"}</span>
                                </button>
                                <ChevronDown size={14} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#6b7280" }} />
                                {bulkCurrencyOpenIndex === index && (
                                  <div style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", width: "180px", background: "white", border: "1px solid #d1d5db", borderRadius: "6px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", zIndex: 94 }}>
                                    <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
                                      <Search size={14} color="#9ca3af" />
                                      <input
                                        value={bulkCurrencySearch}
                                        onChange={(e) => setBulkCurrencySearch(e.target.value)}
                                        placeholder="Search"
                                        autoFocus
                                        style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", outline: "none" }}
                                      />
                                    </div>
                                    <div style={{ maxHeight: "220px", overflowY: "auto", padding: "4px" }}>
                                      {(() => {
                                        const rowCurrency = String(expense.currency || "").trim().toUpperCase();
                                        const merged = Array.from(new Set([rowCurrency, ...currencyOptions].filter(Boolean)));
                                        const filtered = merged.filter((code) =>
                                          String(code).toLowerCase().includes(bulkCurrencySearch.toLowerCase())
                                        );
                                        if (filtered.length === 0) {
                                          return (
                                            <div style={{ padding: "8px 10px", fontSize: "13px", color: "#6b7280" }}>
                                              No currencies found
                                            </div>
                                          );
                                        }
                                        return filtered.map((code) => {
                                          const selected = String(expense.currency || "").toUpperCase() === String(code).toUpperCase();
                                          return (
                                            <button
                                              key={`${expense.id}-cc-${code}`}
                                              type="button"
                                              onClick={() => {
                                                const next = [...bulkExpenses];
                                                next[index].currency = String(code);
                                                setBulkExpenses(next);
                                                setBulkCurrencyOpenIndex(null);
                                                setBulkCurrencySearch("");
                                              }}
                                              style={{
                                                width: "100%",
                                                padding: "8px 10px",
                                                border: "none",
                                                borderRadius: "6px",
                                                textAlign: "left",
                                                background: selected ? "#156372" : "transparent",
                                                color: selected ? "white" : "#374151",
                                                cursor: "pointer",
                                              }}
                                            >
                                              {code}
                                            </button>
                                          );
                                        });
                                      })()}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBulkCurrencyOpenIndex(null);
                                        setBulkCurrencySearch("");
                                        setNewCurrencyModalOpen(true);
                                      }}
                                      style={{ width: "100%", border: "none", borderTop: "1px solid #e5e7eb", background: "white", textAlign: "left", padding: "10px 12px", fontSize: "13px", color: "#156372", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                                    >
                                      <Plus size={14} />
                                      New Currency
                                    </button>
                                  </div>
                                )}
                              </div>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={expense.amount}
                                onChange={(e) => {
                                  const newExpenses = [...bulkExpenses];
                                  newExpenses[index].amount = e.target.value;
                                  setBulkExpenses(newExpenses);
                                }}
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "13px",
                                  border: "none",
                                  flex: 1,
                                  outline: "none",
                                  width: "100%",
                                  minWidth: "80px",
                                  backgroundColor: "#fff",
                                }}
                              />
                            </div>
                          </td>

                          {/* LOCATION */}
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ position: "relative", minWidth: "140px" }} data-bulk-dropdown="true">
                              <button
                                type="button"
                                onClick={() => {
                                  if (bulkLocationOpenIndex === index) {
                                    setBulkLocationOpenIndex(null);
                                    setBulkLocationSearch("");
                                  } else {
                                    closeBulkDropdowns();
                                    setBulkLocationOpenIndex(index);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "5px 10px",
                                  fontSize: "13px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  background: "white",
                                  outline: "none",
                                  color: expense.location ? "#1f2937" : "#9ca3af",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{expense.location || "Select a location"}</span>
                                {bulkLocationOpenIndex === index ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
                              </button>
                              {bulkLocationOpenIndex === index && (
                                <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", background: "white", border: "1px solid #d1d5db", borderRadius: "6px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", zIndex: 80 }}>
                                  <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Search size={14} color="#9ca3af" />
                                    <input
                                      value={bulkLocationSearch}
                                      onChange={(e) => setBulkLocationSearch(e.target.value)}
                                      placeholder="Search"
                                      autoFocus
                                      style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", outline: "none" }}
                                    />
                                  </div>
                                  <div style={{ maxHeight: "220px", overflowY: "auto", padding: "4px" }}>
                                    {locationOptions
                                      .filter((loc) => loc.toLowerCase().includes(bulkLocationSearch.toLowerCase()))
                                      .map((loc) => {
                                        const selected = (expense.location || "") === loc;
                                        return (
                                          <button
                                            key={`${expense.id}-loc-${loc}`}
                                            type="button"
                                            onClick={() => {
                                              const newExpenses = [...bulkExpenses];
                                              newExpenses[index].location = loc;
                                              setBulkExpenses(newExpenses);
                                              setBulkLocationOpenIndex(null);
                                              setBulkLocationSearch("");
                                            }}
                                            style={{
                                              width: "100%",
                                              padding: "8px 10px",
                                              border: "none",
                                              borderRadius: "6px",
                                              textAlign: "left",
                                                background: selected ? "#156372" : "transparent",
                                                color: selected ? "white" : "#374151",
                                              cursor: "pointer",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                            }}
                                          >
                                            <span>{loc}</span>
                                            {selected && <Check size={14} />}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* TAX */}
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ minWidth: "135px", position: "relative" }} data-bulk-dropdown="true">
                              <button
                                type="button"
                                onClick={() => {
                                  if (bulkTaxOpenIndex === index) {
                                    setBulkTaxOpenIndex(null);
                                    setBulkTaxSearch("");
                                  } else {
                                    closeBulkDropdowns();
                                    setBulkTaxOpenIndex(index);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "5px 10px",
                                  fontSize: "13px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  background: "white",
                                  outline: "none",
                                  color: expense.tax ? "#1f2937" : "#9ca3af",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>
                                  {expense.tax ? taxLabel((Array.isArray(taxes) ? taxes : []).find((t: any) => getTaxId(t) === String(expense.tax)) || { name: "", rate: 0 }) : "Select a Tax"}
                                </span>
                                {bulkTaxOpenIndex === index ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
                              </button>
                              {bulkTaxOpenIndex === index && (
                                <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", background: "white", border: "1px solid #d1d5db", borderRadius: "6px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", zIndex: 85 }}>
                                  <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Search size={14} color="#9ca3af" />
                                    <input
                                      value={bulkTaxSearch}
                                      onChange={(e) => setBulkTaxSearch(e.target.value)}
                                      placeholder="Search"
                                      autoFocus
                                        style={{ width: "100%", border: "1px solid #156372", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", outline: "none" }}
                                    />
                                  </div>
                                  <div style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>Compound tax</div>
                                  <div style={{ maxHeight: "220px", overflowY: "auto", padding: "4px" }}>
                                    {(Array.isArray(taxes) ? taxes : [])
                                      .filter((tax: any) => taxLabel(tax).toLowerCase().includes(bulkTaxSearch.toLowerCase()))
                                      .map((tax: any) => {
                                        const taxId = getTaxId(tax);
                                        const selected = String(expense.tax || "") === taxId;
                                        return (
                                          <button
                                            key={`${expense.id}-tax-${taxId}`}
                                            type="button"
                                            onClick={() => {
                                              const newExpenses = [...bulkExpenses];
                                              newExpenses[index].tax = taxId;
                                              setBulkExpenses(newExpenses);
                                              setBulkTaxOpenIndex(null);
                                              setBulkTaxSearch("");
                                            }}
                                            style={{
                                              width: "100%",
                                              padding: "8px 10px",
                                              border: "none",
                                              borderRadius: "6px",
                                              textAlign: "left",
                                              background: selected ? "#156372" : "transparent",
                                              color: selected ? "white" : "#374151",
                                              cursor: "pointer",
                                            }}
                                          >
                                            {taxLabel(tax)}
                                          </button>
                                        );
                                      })}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBulkTaxOpenIndex(null);
                                      setBulkTaxSearch("");
                                      openNewTaxQuickAction({ type: "expense" });
                                    }}
                                    style={{ width: "100%", border: "none", borderTop: "1px solid #e5e7eb", background: "white", textAlign: "left", padding: "10px 12px", fontSize: "13px", color: "#156372", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                                  >
                                    <Plus size={14} />
                                    New Tax
                                  </button>
                                </div>
                              )}
                              <label style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6b7280" }}>
                                <input
                                  type="checkbox"
                                  checked={!!expense.is_inclusive_tax}
                                  onChange={(e) => {
                                    const newExpenses = [...bulkExpenses];
                                    newExpenses[index].is_inclusive_tax = e.target.checked;
                                    setBulkExpenses(newExpenses);
                                  }}
                                />
                                Tax Inclusive
                              </label>
                            </div>
                          </td>

                          {/* CUSTOMER NAME */}
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ position: "relative", minWidth: "140px" }} data-bulk-dropdown="true">
                              <button
                                type="button"
                                onClick={() => {
                                  if (bulkCustomerOpenIndex === index) {
                                    setBulkCustomerOpenIndex(null);
                                    setBulkCustomerSearch("");
                                  } else {
                                    closeBulkDropdowns();
                                    setBulkCustomerOpenIndex(index);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "5px 10px",
                                  fontSize: "13px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  background: "white",
                                  outline: "none",
                                  color: expense.customerName ? "#1f2937" : "#9ca3af",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{expense.customerName || "Select or add a customer"}</span>
                                {bulkCustomerOpenIndex === index ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
                              </button>
                              {bulkCustomerOpenIndex === index && (
                                <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", background: "white", border: "1px solid #d1d5db", borderRadius: "6px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", zIndex: 90 }}>
                                  <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Search size={14} color="#9ca3af" />
                                    <input
                                      value={bulkCustomerSearch}
                                      onChange={(e) => setBulkCustomerSearch(e.target.value)}
                                      placeholder="Search"
                                      autoFocus
                                      style={{ width: "100%", border: "1px solid #156372", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", outline: "none" }}
                                    />
                                  </div>
                                  <div style={{ maxHeight: "220px", overflowY: "auto", padding: "4px" }}>
                                    {allCustomers
                                      .filter((c: any) => {
                                        const name = String(c?.displayName || c?.name || "").toLowerCase();
                                        return name.includes(bulkCustomerSearch.toLowerCase());
                                      })
                                      .map((c: any) => {
                                        const name = String(c?.displayName || c?.name || "");
                                        const selected = (expense.customerName || "") === name;
                                        return (
                                          <button
                                            key={`${expense.id}-customer-${c?._id || c?.id || name}`}
                                            type="button"
                                            onClick={() => {
                                              const newExpenses = [...bulkExpenses];
                                              newExpenses[index].customerName = name;
                                              newExpenses[index].projects = "";
                                              setBulkExpenses(newExpenses);
                                              setBulkCustomerOpenIndex(null);
                                              setBulkCustomerSearch("");
                                            }}
                                            style={{
                                              width: "100%",
                                              padding: "8px 10px",
                                              border: "none",
                                              borderRadius: "6px",
                                              textAlign: "left",
                                              background: selected ? "#156372" : "transparent",
                                              color: selected ? "white" : "#374151",
                                              cursor: "pointer",
                                            }}
                                          >
                                            {name}
                                          </button>
                                        );
                                      })}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBulkCustomerOpenIndex(null);
                                      setBulkCustomerSearch("");
                                      openNewCustomerQuickAction();
                                    }}
                                    style={{ width: "100%", border: "none", borderTop: "1px solid #e5e7eb", background: "white", textAlign: "left", padding: "10px 12px", fontSize: "13px", color: "#156372", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                                  >
                                    <Plus size={14} />
                                    New Customer
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* PROJECTS */}
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ position: "relative", minWidth: "140px" }} data-bulk-dropdown="true">
                              {(() => {
                                const selectedCustomer = allCustomers.find((c: any) => String(c?.displayName || c?.name || "") === String(expense.customerName || ""));
                                const selectedCustomerId = normalizeText(selectedCustomer?._id || selectedCustomer?.id);
                                const selectedCustomerName = String(expense.customerName || "").toLowerCase();
                                const rowProjects = normalizeProjectRecords(allProjects).filter((project: any) => {
                                  if (!selectedCustomerId && !selectedCustomerName) return false;
                                  return (
                                    (selectedCustomerId && String(project.customerId || "") === selectedCustomerId) ||
                                    (selectedCustomerName && String(project.customerName || "").toLowerCase() === selectedCustomerName)
                                  );
                                });
                                const filteredRowProjects = rowProjects.filter((project: any) =>
                                  String(project.name || "").toLowerCase().includes(bulkProjectSearch.toLowerCase())
                                );

                                return (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (bulkProjectOpenIndex === index) {
                                          setBulkProjectOpenIndex(null);
                                          setBulkProjectSearch("");
                                        } else {
                                          closeBulkDropdowns();
                                          setBulkProjectOpenIndex(index);
                                        }
                                      }}
                                        style={{
                                          width: "100%",
                                          padding: "5px 10px",
                                          fontSize: "13px",
                                        border: "1px solid #d1d5db",
                                          borderRadius: "6px",
                                          background: "white",
                                          outline: "none",
                                        color: expense.projects ? "#1f2937" : "#9ca3af",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <span>{expense.projects || (expense.customerName ? "Select a project" : "Select customer first")}</span>
                                      {bulkProjectOpenIndex === index ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
                                    </button>
                                    {bulkProjectOpenIndex === index && (
                                      <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", background: "white", border: "1px solid #d1d5db", borderRadius: "6px", boxShadow: "0 8px 20px rgba(0,0,0,0.08)", zIndex: 95 }}>
                                        <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
                                          <Search size={14} color="#9ca3af" />
                                          <input
                                            value={bulkProjectSearch}
                                            onChange={(e) => setBulkProjectSearch(e.target.value)}
                                            placeholder="Search"
                                            autoFocus
                                            style={{ width: "100%", border: "1px solid #156372", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", outline: "none" }}
                                          />
                                        </div>
                                        <div style={{ maxHeight: "220px", overflowY: "auto", padding: "4px" }}>
                                          {!expense.customerName && (
                                            <div style={{ padding: "8px 10px", fontSize: "13px", color: "#6b7280" }}>Select customer first</div>
                                          )}
                                          {expense.customerName && filteredRowProjects.length === 0 && (
                                            <div style={{ padding: "8px 10px", fontSize: "13px", color: "#6b7280" }}>No projects found</div>
                                          )}
                                          {filteredRowProjects.map((project: any) => {
                                            const selected = String(expense.projects || "") === String(project.name || "");
                                            return (
                                              <button
                                                key={`${expense.id}-project-${project.id}`}
                                                type="button"
                                                onClick={() => {
                                                  const newExpenses = [...bulkExpenses];
                                                  newExpenses[index].projects = project.name;
                                                  setBulkExpenses(newExpenses);
                                                  setBulkProjectOpenIndex(null);
                                                  setBulkProjectSearch("");
                                                }}
                                                style={{
                                                  width: "100%",
                                                  padding: "8px 10px",
                                                  border: "none",
                                                  borderRadius: "6px",
                                                  textAlign: "left",
                                                  background: selected ? "#156372" : "transparent",
                                                  color: selected ? "white" : "#374151",
                                                  cursor: "pointer",
                                                }}
                                              >
                                                {project.name}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>

                          {/* BILLABLE */}
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={expense.billable}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].billable = e.target.checked;
                                setBulkExpenses(newExpenses);
                              }}
                              style={{ width: "16px", height: "16px", cursor: "pointer" }}
                            />
                          </td>

                          {/* REPORTING TAGS */}
                          <td style={{ padding: "6px 10px" }}>
                            {(() => {
                              const rowTags = Array.isArray((expense as any).reportingTags) ? (expense as any).reportingTags : [];
                              const selectedCount = rowTags.filter((tag: any) => String(tag?.value || "").trim() !== "").length;
                              const totalCount = Array.isArray(reportingTagDefinitions) && reportingTagDefinitions.length > 0
                                ? reportingTagDefinitions.length
                                : rowTags.length;
                              const hasSelection = selectedCount > 0 && totalCount > 0;

                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const rowTags = Array.isArray((expense as any).reportingTags) ? (expense as any).reportingTags : [];
                                    const draft: Record<string, string> = {};
                                    rowTags.forEach((tag: any) => {
                                      const tagId = String(tag?.tagId || tag?.id || "").trim();
                                      if (tagId) draft[tagId] = String(tag?.value || "");
                                    });
                                    setAssociateTagsRowIndex(index);
                                    setAssociateTagsDraft(draft);
                                    setAssociateTagsModalOpen(true);
                                  }}
                                  style={{
                                    border: "none",
                                    background: "#f3f4f6",
                                    color: hasSelection ? "#065f46" : "#374151",
                                    borderRadius: "4px",
                                    padding: "5px 8px",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <Bookmark size={12} />
                                  {hasSelection ? `${selectedCount} out of ${totalCount} selected.` : "Associate Tags"}
                                </button>
                              );
                            })()}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "6px 6px", textAlign: "center", width: "44px", minWidth: "44px", position: "sticky", right: 0, background: "#ffffff", zIndex: bulkRowMenuOpenIndex === index ? 200 : 1 }}>
                            <div style={{ position: "relative", display: "inline-block", zIndex: bulkRowMenuOpenIndex === index ? 201 : 1 }} data-bulk-dropdown="true">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBulkRowMenuOpenIndex((prev) => (prev === index ? null : index));
                                }}
                                style={{
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  color: "#4b5563",
                                  padding: "3px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <MoreVertical size={18} />
                              </button>
                              {bulkRowMenuOpenIndex === index && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: "absolute",
                                    top: "calc(100% + 4px)",
                                    right: 0,
                                    minWidth: "110px",
                                    background: "white",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "8px",
                                    boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
                                    zIndex: 999,
                                    overflow: "hidden",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBulkExpenses((prev) => {
                                        const clone = { ...prev[index], id: Date.now() + Math.floor(Math.random() * 1000) };
                                        const next = [...prev];
                                        next.splice(index + 1, 0, clone);
                                        return next;
                                      });
                                      setBulkRowMenuOpenIndex(null);
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "8px 12px",
                                      border: "none",
                                      background: "#3b82f6",
                                      color: "white",
                                      textAlign: "left",
                                      fontSize: "13px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Clone
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBulkExpenses((prev) => {
                                        if (prev.length <= 1) return prev;
                                        return prev.filter((_, i) => i !== index);
                                      });
                                      setBulkRowMenuOpenIndex(null);
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "8px 12px",
                                      border: "none",
                                      borderTop: "1px solid #e5e7eb",
                                      background: "white",
                                      color: "#4b5563",
                                      textAlign: "left",
                                      fontSize: "13px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add More Expenses Button */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkExpenses([...bulkExpenses, {
                        id: Date.now(),
                        date: "",
                        expenseAccount: "",
                        amount: "",
                        currency: baseCurrencyCode || "USD",
                        location: locationOptions[0] || "Head Office",
                        tax: "",
                        is_inclusive_tax: true,
                        customerName: "",
                        projects: "",
                        billable: false,
                        reportingTags: [],
                      }]);
                    }}
                    style={{
                      padding: "0",
                      fontSize: "14px",
                      color: "#156372",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "500",
                      textAlign: "left"
                    }}
                  >
                    + Add More Expenses
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Bottom Action Buttons */}
          {activeTab !== "mileage" && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex gap-3">
              <button
                type="button"
                className="bg-[#156372] hover:bg-[#0D4A52] text-white px-6 py-2.5 rounded-md border border-[#156372] text-sm font-medium"
                onClick={handleSave}
                disabled={!!saveLoadingState}
              >
                {saveLoadingState === "save" ? "Saving..." : (isEdit ? "Update" : "Save")} <span className="text-xs opacity-75">(Alt+S)</span>
              </button>
              {!isEdit && (
                <button
                  type="button"
                  className="bg-white text-gray-700 px-6 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 text-sm font-medium"
                  onClick={handleSaveAndNew}
                  disabled={!!saveLoadingState}
                >
                  {saveLoadingState === "saveAndNew" ? "Saving..." : "Save and New"} <span className="text-xs opacity-75">(Alt+N)</span>
                </button>
              )}
              <button
                type="button"
                className="bg-white text-gray-700 px-6 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 text-sm font-medium"
                onClick={handleCancel}
                disabled={!!saveLoadingState}
              >
                Cancel
              </button>
            </div>
          )}
        </div >

        {/* New Currency Modal */}
        {newCurrencyModalOpen && (
          <NewCurrencyModal
            onClose={() => setNewCurrencyModalOpen(false)}
            onSave={async (currencyData) => {
              try {
                const code = String(currencyData.code || "").split(" - ")[0].trim().toUpperCase();
                const symbol = String(currencyData.symbol || "").trim();
                const name = String(currencyData.name || "").trim();
                const decimalPlaces = String(currencyData.decimalPlaces || "2");
                const format = String(currencyData.format || "1,234,567.89");
                const isBaseCurrency = Boolean(currencyData.isBaseCurrency);

                if (!code || !name || !symbol) {
                  alert("Please enter currency code, name, and symbol");
                  return;
                }

                const readRows = (key: string) => {
                  try {
                    const raw = localStorage.getItem(key);
                    const parsed = raw ? JSON.parse(raw) : [];
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [];
                  }
                };
                const writeRows = (key: string, rows: any[]) => {
                  localStorage.setItem(key, JSON.stringify(rows));
                };

                const settingsRows = readRows("taban_currencies");
                const otherSettingsRows = settingsRows.filter(
                  (c: any) => String(c?.code || "").trim().toUpperCase() !== code
                ).map((c: any) => ({
                  ...c,
                  isBase: isBaseCurrency ? false : Boolean(c?.isBase || c?.isBaseCurrency),
                  isBaseCurrency: isBaseCurrency ? false : Boolean(c?.isBase || c?.isBaseCurrency),
                }));

                const createdSettingsCurrency = {
                  id: `curr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  code,
                  name,
                  symbol,
                  isBase: isBaseCurrency,
                  isBaseCurrency,
                  isActive: true,
                  decimalPlaces,
                  format,
                  latestRate: null,
                  asOfDate: null,
                  exchangeRates: [],
                };
                writeRows("taban_currencies", [...otherSettingsRows, createdSettingsCurrency]);

                const expenseRows = readRows("taban_books_currencies");
                const otherExpenseRows = expenseRows.filter(
                  (c: any) => String(c?.code || "").trim().toUpperCase() !== code
                ).map((c: any) => ({
                  ...c,
                  isBaseCurrency: isBaseCurrency ? false : Boolean(c?.isBaseCurrency || c?.is_base_currency || c?.isBase),
                  is_base_currency: isBaseCurrency ? false : Boolean(c?.isBaseCurrency || c?.is_base_currency || c?.isBase),
                  isBase: isBaseCurrency ? false : Boolean(c?.isBaseCurrency || c?.is_base_currency || c?.isBase),
                }));
                const createdExpenseCurrency = {
                  id: `cur_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  _id: `cur_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  code,
                  name,
                  symbol,
                  isBaseCurrency,
                  is_base_currency: isBaseCurrency,
                  isBase: isBaseCurrency,
                  active: true,
                  decimalPlaces,
                  format,
                };
                writeRows("taban_books_currencies", [...otherExpenseRows, createdExpenseCurrency]);

                setCurrencies((prev) => {
                  const normalized = [
                    ...prev.filter((c: any) => String(c?.code || "").trim().toUpperCase() !== code),
                    createdExpenseCurrency,
                  ].map((c: any) => ({
                    ...c,
                    isBaseCurrency: isBaseCurrency && String(c?.code || "").trim().toUpperCase() === code
                      ? true
                      : Boolean(c?.isBaseCurrency || c?.is_base_currency || c?.isBase) && String(c?.code || "").trim().toUpperCase() !== code,
                    is_base_currency: isBaseCurrency && String(c?.code || "").trim().toUpperCase() === code
                      ? true
                      : Boolean(c?.isBaseCurrency || c?.is_base_currency || c?.isBase) && String(c?.code || "").trim().toUpperCase() !== code,
                    isBase: isBaseCurrency && String(c?.code || "").trim().toUpperCase() === code
                      ? true
                      : Boolean(c?.isBaseCurrency || c?.is_base_currency || c?.isBase) && String(c?.code || "").trim().toUpperCase() !== code,
                  }));
                  return normalized;
                });
                setFormData((prev) => ({ ...prev, currency: code }));
                setBulkExpenses((prev) => prev.map((row) => ({ ...row, currency: row.currency || code })));
                setNewCurrencyModalOpen(false);
              } catch (error) {
                console.error("Error saving currency:", error);
                alert("Error saving currency");
              }
            }}
          />
        )}

        <NewTaxModal
          isOpen={isNewTaxModalOpen}
          onClose={() => {
            setIsNewTaxModalOpen(false);
            setNewTaxTarget(null);
          }}
          onCreated={handleTaxCreatedFromModal}
        />

        {/* New Account Modal */}
        {
          newAccountModalOpen && typeof document !== 'undefined' && document.body && createPortal(
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999
              }}
              onClick={handleCancelNewAccount}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "white",
                  borderRadius: "4px",
                  width: "750px",
                  maxWidth: "95vw",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "inherit"
                }}
              >
                <div style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f9fafb",
                  borderTopLeftRadius: "4px",
                  borderTopRightRadius: "4px"
                }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>Create Account</h2>
                  <button
                    type="button"
                    onClick={handleCancelNewAccount}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ padding: "24px", display: "flex", gap: "32px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Account Type */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>
                        Account Type*
                      </label>
                      <div style={{ position: "relative" }}>
                        <div
                          onClick={() => setAccountTypeOpen(!accountTypeOpen)}
                          style={{
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            width: "100%",
                            outline: "none",
                            cursor: "pointer",
                            backgroundColor: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            boxSizing: "border-box"
                          }}
                        >
                          <span>{newAccountData.accountType}</span>
                          {accountTypeOpen ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                        </div>

                        {accountTypeOpen && (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            marginTop: "4px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            zIndex: 999999,
                            maxHeight: "300px",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column"
                          }}>
                            <div style={{
                              padding: "8px 12px",
                              borderBottom: "1px solid #e5e7eb",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              backgroundColor: "#ffffff",
                              position: "sticky",
                              top: 0
                            }}>
                              <Search size={14} style={{ color: "#9ca3af" }} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={accountTypeSearch}
                                onChange={(e) => setAccountTypeSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                style={{
                                  border: "none",
                                  outline: "none",
                                  fontSize: "14px",
                                  width: "100%"
                                }}
                              />
                            </div>

                            {Object.entries(ACCOUNT_TYPES_STRUCTURE).map(([category, types]) => {
                              const filteredTypes = types.filter(t => t.toLowerCase().includes(accountTypeSearch.toLowerCase()));
                              if (filteredTypes.length === 0 && !category.toLowerCase().includes(accountTypeSearch.toLowerCase())) return null;

                              // If category matches but types don't, show all? Or just matching types? 
                              // Standard behavior: if category matches, show all. If type matches, show type.
                              const typesToShow = category.toLowerCase().includes(accountTypeSearch.toLowerCase()) ? types : filteredTypes;

                              if (typesToShow.length === 0) return null;

                              return (
                                <div key={category}>
                                  <div style={{
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    color: "#1f2937",
                                    backgroundColor: "transparent",
                                    marginTop: "4px"
                                  }}>
                                    {category}
                                  </div>
                                  {typesToShow.map(type => (
                                    <div
                                      key={type}
                                      onClick={() => {
                                        handleNewAccountChange({ target: { name: 'accountType', value: type } });
                                        setAccountTypeOpen(false);
                                        setAccountTypeSearch("");
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#156372";
                                        e.currentTarget.style.color = "#ffffff";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.color = "#374151";
                                      }}
                                      style={{
                                        padding: "8px 24px",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        color: "#374151",
                                        transition: "all 0.1s"
                                      }}
                                    >
                                      <span>{type}</span>
                                      {newAccountData.accountType === type && <Check size={14} />}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account Name */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>
                        Account Name*
                      </label>
                      <input
                        type="text"
                        name="accountName"
                        value={newAccountData.accountName}
                        onChange={handleNewAccountChange}
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          outline: "none"
                        }}
                      />
                    </div>

                    {/* Sub Account Checkbox */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        name="isSubAccount"
                        checked={newAccountData.isSubAccount}
                        onChange={handleNewAccountChange}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "14px", color: "#374151" }}>Make this a sub-account</span>
                      <Info size={14} color="#9ca3af" />
                    </div>

                    {/* Parent Account Field - Conditional */}
                    {newAccountData.isSubAccount && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>
                          Parent Account*
                        </label>
                        <div style={{ position: "relative" }}>
                          <div
                            onClick={() => setParentAccountOpen(!parentAccountOpen)}
                            style={{
                              padding: "8px 12px",
                              fontSize: "14px",
                              border: "1px solid #156372", // Highlighted border as in screenshot
                              borderRadius: "4px",
                              width: "100%",
                              outline: "none",
                              cursor: "pointer",
                              backgroundColor: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              boxSizing: "border-box"
                            }}
                          >
                            <span style={{ color: newAccountData.parentAccount ? "#374151" : "#9ca3af" }}>
                              {newAccountData.parentAccount || "Select an account"}
                            </span>
                            {parentAccountOpen ? <ChevronUp size={16} color="#156372" /> : <ChevronDown size={16} color="#6b7280" />}
                          </div>

                          {parentAccountOpen && (
                            <div style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              marginTop: "4px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                              zIndex: 999999,
                              maxHeight: "200px",
                              overflowY: "auto",
                              display: "flex",
                              flexDirection: "column"
                            }}>
                              <div style={{
                                padding: "8px 12px",
                                borderBottom: "1px solid #e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                backgroundColor: "#ffffff",
                                position: "sticky",
                                top: 0
                              }}>
                                <Search size={14} style={{ color: "#9ca3af" }} />
                                <input
                                  type="text"
                                  placeholder="Search"
                                  value={parentAccountSearch}
                                  onChange={(e) => setParentAccountSearch(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                  style={{
                                    border: "none",
                                    outline: "none",
                                    fontSize: "14px",
                                    width: "100%"
                                  }}
                                />
                              </div>

                              {/* Show filtered accounts from the SAME category as selected accountType if possible */}
                              {(() => {
                                // Simple logic: mapping accountType to main structure keys
                                let targetCategory = "Expense";
                                const type = newAccountData.accountType;
                                // Match the earlier mapping logic
                                if (type === "Cost of Goods Sold") targetCategory = "Cost of Goods Sold";
                                else if (type === "Fixed Asset") targetCategory = "Fixed Asset";
                                else if (type.includes("Liability")) targetCategory = "Other Current Liability"; // Approximate
                                else if (type.includes("Asset")) targetCategory = "Other Current Asset"; // Approximate
                                else targetCategory = "Expense";

                                // Or better, just show active category if it exists in structure, else fallback
                                let accountsToShow = [];
                                let categoryTitle = targetCategory;

                                // Try to find exact match in structure keys
                                // structuredAccounts keys: "Cost of Goods Sold", "Expense", "Other Current Liability", "Fixed Asset", "Other Current Asset"

                                // We will iterate and find best match or simply list all relevant
                                if (structuredAccounts[targetCategory]) {
                                  accountsToShow = structuredAccounts[targetCategory];
                                } else {
                                  // Fallback: Show all? No, likely empty.
                                  // Show Fixed Asset if select key matches
                                  if (type === 'Fixed Asset' && structuredAccounts['Fixed Asset']) {
                                    accountsToShow = structuredAccounts['Fixed Asset'];
                                    categoryTitle = "Fixed Asset";
                                  }
                                }

                                const filtered = accountsToShow.filter(a => a.toLowerCase().includes(parentAccountSearch.toLowerCase()));

                                if (filtered.length === 0) return <div style={{ padding: "12px", color: "#9ca3af", fontSize: "13px", textAlign: "center" }}>No accounts found</div>

                                return (
                                  <div>
                                    <div style={{
                                      padding: "8px 12px",
                                      fontSize: "12px",
                                      fontWeight: "700",
                                      color: "#4b5563",
                                      backgroundColor: "transparent",
                                      marginTop: "4px"
                                    }}>
                                      {categoryTitle}
                                    </div>
                                    {filtered.map(acc => (
                                      <div
                                        key={acc}
                                        onClick={() => {
                                          setNewAccountData(prev => ({ ...prev, parentAccount: acc }));
                                          setParentAccountOpen(false);
                                          setParentAccountSearch("");
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = "#156372";
                                          e.currentTarget.style.color = "#ffffff";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = "transparent";
                                          e.currentTarget.style.color = "#374151";
                                        }}
                                        style={{
                                          padding: "8px 24px",
                                          fontSize: "14px",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          color: "#374151",
                                          transition: "all 0.1s"
                                        }}
                                      >
                                        <span>{acc}</span>
                                        {newAccountData.parentAccount === acc && <Check size={14} />}
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Account Code */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", textDecoration: "underline dashed #9ca3af", textUnderlineOffset: "4px", alignSelf: "flex-start" }}>
                        Account Code
                      </label>
                      <input
                        type="text"
                        name="accountCode"
                        value={newAccountData.accountCode}
                        onChange={handleNewAccountChange}
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          maxWidth: "200px",
                          outline: "none"
                        }}
                      />
                    </div>

                    {/* Description */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={newAccountData.description}
                        onChange={handleNewAccountChange}
                        placeholder="Max. 500 characters"
                        maxLength={500}
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          outline: "none",
                          minHeight: "80px",
                          resize: "vertical",
                          fontFamily: "inherit"
                        }}
                      />
                    </div>

                    {/* Zoho Expense Checkbox */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        name="zohoExpense"
                        checked={newAccountData.zohoExpense}
                        onChange={handleNewAccountChange}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "14px", color: "#374151" }}>Show as an active account in Zoho Expense</span>
                      <Info size={14} color="#9ca3af" />
                    </div>
                  </div>

                  {/* Right Side Info Box - Dynamic based on account type */}
                  <div style={{ width: "240px", flexShrink: 0 }}>
                    <div style={{
                      backgroundColor: "#1e293b",
                      borderRadius: "6px",
                      padding: "20px",
                      color: "white",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}>
                      <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>
                        {getAccountTypeInfo(newAccountData.accountType).title}
                      </div>
                      <div style={{ fontSize: "13px", lineHeight: "1.6", opacity: 0.9 }}>
                        {getAccountTypeInfo(newAccountData.accountType).description}
                        <ul style={{ paddingLeft: "20px", marginTop: "12px", margin: 0, listStyleType: "disc" }}>
                          {getAccountTypeInfo(newAccountData.accountType).points.map((point, idx) => (
                            <li key={idx} style={{ marginBottom: "4px" }}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  gap: "12px",
                  backgroundColor: "#ffffff",
                  borderBottomLeftRadius: "4px",
                  borderBottomRightRadius: "4px"
                }}>
                  <button
                    type="button"
                    onClick={handleSaveAndSelect}
                    style={{
                      padding: "8px 20px",
                      fontSize: "14px",
                      backgroundColor: "#156372",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                    }}
                  >
                    Save and Select
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelNewAccount}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        }

        {/* New Vendor Modal */}
        <NewVendorModal
          isOpen={newVendorModalOpen}
          onClose={() => setNewVendorModalOpen(false)}
          onVendorCreated={async (vendor) => {
            // Update vendor field with the created vendor's display name and ID
            const vendorId = vendor._id || vendor.id;
            const displayName = vendor.displayName || vendor.companyName || vendor.name || "";
            if (displayName && vendorId) {
              setFormData(prev => ({
                ...prev,
                vendor: displayName,
                vendor_id: vendorId
              }));
            }
            // Reload vendors list from API
            try {
              const vendorsResponse = await vendorsAPI.getAll({ limit: 1000 });
              if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
                setAllVendors(filterActiveRecords(vendorsResponse.data));
              }
            } catch (error) {
              console.error("Error reloading vendors:", error);
            }
            setNewVendorModalOpen(false);
          }}
        />

        {/* Legacy vendor modal block removed */}
        {/* New Customer Modal */}
        {typeof document !== "undefined" && document.body && createPortal(
          <div
            className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${newCustomerModalOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
            onClick={async () => {
              setNewCustomerModalOpen(false);
              await reloadCustomersForExpense();
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1400px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">New Customer (Quick Action)</h2>
                <button
                  type="button"
                  className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                  onClick={async () => {
                    setNewCustomerModalOpen(false);
                    await reloadCustomersForExpense();
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
                  className="w-full h-full bg-white rounded border border-gray-200"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* Associate Tags Modal */}
      {
        associateTagsModalOpen && typeof document !== 'undefined' && document.body && createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999
            }}
            onClick={() => {
              setAssociateTagsModalOpen(false);
              setAssociateTagsRowIndex(null);
              setAssociateTagsDraft({});
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "white",
                borderRadius: "4px",
                width: "500px",
                maxWidth: "90vw",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                fontFamily: "inherit"
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: "16px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>Associate Tags</h2>
                <button
                  type="button"
                  onClick={() => {
                    setAssociateTagsModalOpen(false);
                    setAssociateTagsRowIndex(null);
                    setAssociateTagsDraft({});
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#156372",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    backgroundColor: "#156372"
                  }}
                >
                  <X size={16} color="white" />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "24px" }}>
                {Array.isArray(reportingTagDefinitions) && reportingTagDefinitions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {reportingTagDefinitions.map((tag: any) => {
                      const tagId = String(tag?.tagId || tag?.id || "");
                      const tagName = String(tag?.tagName || tag?.name || "Reporting Tag");
                      const options = Array.isArray(tag?.options) ? tag.options : [];
                      const isMandatory = Boolean(tag?.isMandatory);
                      return (
                        <div key={`associate-tag-${tagId}`} style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center", gap: "12px" }}>
                          <label style={{ fontSize: "14px", color: isMandatory ? "#dc2626" : "#374151", fontWeight: 500 }}>
                            {tagName}{isMandatory ? " *" : ""}
                          </label>
                          <select
                            value={associateTagsDraft[tagId] || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setAssociateTagsDraft((prev) => ({ ...prev, [tagId]: value }));
                            }}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "14px",
                              color: "#374151",
                              backgroundColor: "white",
                              outline: "none",
                            }}
                          >
                            <option value="">None</option>
                            {options.map((option: string) => (
                              <option key={`${tagId}-${option}`} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{
                    fontSize: "14px",
                    color: "#374151",
                    margin: 0,
                    lineHeight: "1.5"
                  }}>
                    There are no active reporting tags or you haven't created a reporting tag yet. You can create/edit reporting tags under settings.
                  </p>
                )}
              </div>

              <div style={{ padding: "0 24px 20px", display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (associateTagsRowIndex !== null) {
                      const defs = Array.isArray(reportingTagDefinitions) ? reportingTagDefinitions : [];
                      const nextTags = defs.map((def: any) => {
                        const tagId = String(def?.tagId || def?.id || "");
                        return {
                          tagId,
                          id: tagId,
                          name: String(def?.tagName || def?.name || "Reporting Tag"),
                          isMandatory: Boolean(def?.isMandatory),
                          options: Array.isArray(def?.options) ? def.options : [],
                          value: String(associateTagsDraft[tagId] || ""),
                        };
                      });
                      setBulkExpenses((prev) => {
                        const next = [...prev];
                        if (next[associateTagsRowIndex]) {
                          (next[associateTagsRowIndex] as any).reportingTags = nextTags;
                        }
                        return next;
                      });
                    }
                    setAssociateTagsModalOpen(false);
                    setAssociateTagsRowIndex(null);
                    setAssociateTagsDraft({});
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #22a06b",
                    background: "#22a06b",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssociateTagsModalOpen(false);
                    setAssociateTagsRowIndex(null);
                    setAssociateTagsDraft({});
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: "white",
                    color: "#374151",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Advanced Vendor Search Modal */}
      {
        vendorSearchModalOpen && typeof document !== 'undefined' && document.body && createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={() => setVendorSearchModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Advanced Vendor Search</h2>
                <button
                  type="button"
                  onClick={() => setVendorSearchModalOpen(false)}
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
                      onClick={() => setVendorSearchCriteriaOpen(!vendorSearchCriteriaOpen)}
                      className="px-4 py-2 border border-gray-300 rounded-l-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      {vendorSearchCriteria}
                      <ChevronDown size={16} />
                    </button>
                    {vendorSearchCriteriaOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px]">
                        {["Display Name", "Email", "Company Name", "Phone"].map((criteria) => (
                          <button
                            key={criteria}
                            type="button"
                            onClick={() => {
                              setVendorSearchCriteria(criteria);
                              setVendorSearchCriteriaOpen(false);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-[#156372] hover:text-white"
                          >
                            {criteria}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={vendorSearchTerm}
                    onChange={(e) => setVendorSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleVendorSearch()}
                    placeholder="Enter search term"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleVendorSearch}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">VENDOR NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">COMPANY NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PHONE</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorPaginatedResults.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          {vendorSearchTerm ? "No vendors found" : "Enter a search term and click Search"}
                        </td>
                      </tr>
                    ) : (
                      vendorPaginatedResults.map((vendor) => (
                        <tr
                          key={vendor.id || vendor.name}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              vendor: vendor.displayName || vendor.name || "",
                              vendor_id: vendor.id || vendor._id || ""
                            }));
                            setVendorSearchModalOpen(false);
                            setVendorSearchTerm("");
                            setVendorSearchResults([]);
                          }}
                        >
                          <td className="px-4 py-3 text-sm text-[#156372] hover:underline">
                            {vendor.displayName || vendor.name || ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{vendor.email || ""}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{vendor.companyName || ""}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{vendor.workPhone || vendor.mobile || ""}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {vendorSearchResults.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVendorSearchPage(prev => Math.max(1, prev - 1))}
                      disabled={vendorSearchPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      {vendorStartIndex + 1} - {Math.min(vendorEndIndex, vendorSearchResults.length)} of {vendorSearchResults.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVendorSearchPage(prev => Math.min(vendorTotalPages, prev + 1))}
                      disabled={vendorSearchPage >= vendorTotalPages}
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
                        {["Display Name", "Email", "Company Name", "Phone"].map((criteria) => (
                          <button
                            key={criteria}
                            type="button"
                            onClick={() => {
                              setCustomerSearchCriteria(criteria);
                              setCustomerSearchCriteriaOpen(false);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-[#156372] hover:text-white"
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
                          key={customer._id || customer.id || `${customer.displayName || customer.name || "customer"}-${index}`}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              customerName: customer.displayName || customer.name || "",
                              customer_id: customer._id || customer.id || "",
                              billable: customer ? prev.billable : false,
                              projectName: "",
                              project_id: "",
                            }));
                            setCustomerProjects([]);
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
        )
      }
    </div >
    </>
  );
}



