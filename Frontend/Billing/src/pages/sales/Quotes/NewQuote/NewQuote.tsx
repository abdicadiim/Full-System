import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, ArrowUpDown, X,
  MessageSquare, Briefcase, User, Calendar, Plus, Paperclip, Minus, Check,
  Trash2, MoreVertical, Edit2, Edit3, Settings, Info, Tag, HelpCircle, HardDrive,
  Layers, Box, Folder, Cloud, CheckCircle, Calculator, Image as ImageIcon, GripVertical,
  FileText, CreditCard, Square, Upload, Loader2, LayoutGrid, PlusCircle, Mail, Building2, AlertTriangle,
  Package, Layout
} from "lucide-react";
import { getCustomers, saveQuote, saveSalesperson, getQuotes, getQuoteById, updateQuote, getProjects, getSalespersonsFromAPI, updateSalesperson, getItemsFromAPI, getTaxes, Customer, Tax, Salesperson, Quote, ContactPerson, Project } from "../../salesModel.ts";

import { getAllDocuments } from "../../../../utils/documentStorage";
import { customersAPI, projectsAPI, salespersonsAPI, quotesAPI, itemsAPI, currenciesAPI, contactPersonsAPI, vendorsAPI, settingsAPI, chartOfAccountsAPI, documentsAPI, reportingTagsAPI, priceListsAPI, plansAPI, transactionNumberSeriesAPI } from "../../../../services/api.ts";
import { useAccountSelect } from "../../../../hooks/useAccountSelect";
import { useCurrency } from "../../../../hooks/useCurrency";
import { API_BASE_URL, getToken } from "../../../../services/auth";
import { toast } from "react-toastify";
import { Country, State } from "country-state-city";
import NewTaxModal from "../../../../../components/modals/NewTaxModal";
import { buildTaxOptionGroups, taxLabel, normalizeCreatedTaxPayload, isTaxActive } from "../../../../hooks/Taxdropdownstyle";
import { readTaxesLocal, writeTaxesLocal } from "../../../settings/organization-settings/taxes-compliance/TAX/storage.ts";
import NewItemForm from "../../../Product-Calalog/items/components/NewItemForm";

// taxOptions REMOVED: Now fetching from backend API

// Sample salespersons data - REMOVED: Now using backend API only

// Sample items data - will be replaced by items from localStorage
const defaultSampleItems = [
  { id: "1", name: "iphone", sku: "Ip011", rate: 20.00, stockOnHand: 0.00, unit: "box" },
  { id: "2", name: "laptop", sku: "Lp022", rate: 1500.00, stockOnHand: 5.00, unit: "piece" },
  { id: "3", name: "keyboard", sku: "Kb033", rate: 45.00, stockOnHand: 12.00, unit: "piece" },
  { id: "4", name: "mouse", sku: "Ms044", rate: 25.00, stockOnHand: 8.00, unit: "piece" },
  { id: "5", name: "monitor", sku: "Mn055", rate: 300.00, stockOnHand: 3.00, unit: "piece" },
];

const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";
  const PLANS_STORAGE_KEY = "inv_plans_v1";
  const PLANS_STORAGE_KEYS = [PLANS_STORAGE_KEY, "taban_plans"];
  const LS_LOCATIONS_ENABLED_KEY = "taban_locations_enabled";
  const LS_LOCATIONS_CACHE_KEY = "taban_locations_cache";

type CatalogPriceListOption = {
  id: string;
  name: string;
  pricingScheme: string;
  currency: string;
  status: string;
  displayLabel: string;
};

type PriceListSwitchDialogState = {
  customerName: string;
  currentPriceListName: string;
  nextPriceListName: string;
  customerCurrency: string;
  nextPriceListCurrency: string;
};

const NewQuote = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baseCurrencyCode } = useCurrency();
  const { quoteId } = useParams();
  const isEditMode = !!quoteId;
  const isSubscriptionMode = location.pathname.includes("/sales/quotes/subscription/new");
  const clonedDataFromState = location.state?.clonedData || null;
  const cachedGeneralSettings = settingsAPI.getCachedGeneralSettings?.() || {};
  const cachedTaxModeSetting = String(
    cachedGeneralSettings?.taxSettings?.taxInclusive ??
    cachedGeneralSettings?.taxSettings?.taxBasis ??
    cachedGeneralSettings?.taxSettings?.taxMode ??
    "both"
  ).trim().toLowerCase();
  const initialTaxExclusiveValue = (() => {
    if (
      cachedTaxModeSetting.includes("both") ||
      (cachedTaxModeSetting.includes("inclusive") && cachedTaxModeSetting.includes("exclusive"))
    ) {
      return "Tax Exclusive";
    }
    if (cachedTaxModeSetting === "inclusive" || cachedTaxModeSetting === "tax inclusive" || cachedTaxModeSetting.includes("tax inclusive")) {
      return "Tax Inclusive";
    }
    if (cachedTaxModeSetting === "exclusive" || cachedTaxModeSetting === "tax exclusive" || cachedTaxModeSetting.includes("tax exclusive")) {
      return "Tax Exclusive";
    }
    return "Tax Exclusive";
  })();
  const [isLoading, setIsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState<null | "draft" | "send">(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [enabledSettings, setEnabledSettings] = useState<any>(cachedGeneralSettings);
  const [formData, setFormData] = useState<any>({
    customerName: "",
    selectedLocation: "Head Office",
    selectedPriceList: "Select Price List",
    quoteNumber: transactionNumberSeriesAPI.getCachedNextNumber({
      module: "Quote",
      locationName: "Head Office",
    }) || "",
    referenceNumber: "",
    quoteDate: new Date().toLocaleDateString("en-GB"), // DD/MM/YYYY format which our salesModel now handles
    expiryDate: "",
    salesperson: "",
    salespersonId: "",
    projectName: "",
    subject: "",
    taxExclusive: initialTaxExclusiveValue,
    items: [
      { id: 1, itemType: "item", itemDetails: "", quantity: 1, rate: 0, tax: "", taxRate: 0, amount: 0, description: "", stockOnHand: 0, reportingTags: [] }
    ],
    subTotal: 0,
    totalTax: 0,
    discount: 0,
    discountType: "percent",
    discountAccount: "General Income",
    shippingCharges: 0,
    shippingChargeTax: "",
    adjustment: 0,
    roundOff: 0,
    total: 0,
    currency: baseCurrencyCode || "USD",
    customerNotes: "Looking forward for your business.",
    termsAndConditions: "",
    attachedFiles: [],

    reportingTags: [] as any[],
    contactPersons: []
  });
  const hasAppliedCloneRef = useRef(false);
  const prefillFromProjectRef = useRef(false);
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";
  const showShippingCharges = enabledSettings?.chargeSettings?.shippingCharges !== false;
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const rawTaxModeSetting = String(
    enabledSettings?.taxSettings?.taxInclusive ??
    enabledSettings?.taxSettings?.taxBasis ??
    enabledSettings?.taxSettings?.taxMode ??
    "both"
  ).trim().toLowerCase();
  const taxMode = (() => {
    if (!rawTaxModeSetting) return "both";
    if (
      rawTaxModeSetting.includes("both") ||
      (rawTaxModeSetting.includes("inclusive") && rawTaxModeSetting.includes("exclusive"))
    ) {
      return "both";
    }
    if (rawTaxModeSetting === "inclusive" || rawTaxModeSetting === "tax inclusive" || rawTaxModeSetting.includes("tax inclusive")) {
      return "inclusive";
    }
    if (rawTaxModeSetting === "exclusive" || rawTaxModeSetting === "tax exclusive" || rawTaxModeSetting.includes("tax exclusive")) {
      return "exclusive";
    }
    if (rawTaxModeSetting.includes("inclusive")) return "inclusive";
    if (rawTaxModeSetting.includes("exclusive")) return "exclusive";
    return "both";
  })();
  const isTaxPreferenceLocked = taxMode === "inclusive" || taxMode === "exclusive";
  const resolvedTaxPreference = taxMode === "inclusive"
    ? "Tax Inclusive"
    : taxMode === "exclusive"
      ? "Tax Exclusive"
      : formData.taxExclusive || "Tax Exclusive";

  const toNumberSafe = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resolveSubtotalFromQuoteLike = (quoteLike: any, fallbackItems: any[] = []) => {
    const explicitSubtotal = toNumberSafe(quoteLike?.subTotal ?? quoteLike?.subtotal);
    if (explicitSubtotal > 0) return explicitSubtotal;

    const computedFromItems = (Array.isArray(fallbackItems) ? fallbackItems : []).reduce((sum, item) => {
      const quantity = toNumberSafe(item?.quantity);
      const rate = toNumberSafe(item?.rate ?? item?.unitPrice ?? item?.price);
      return sum + (quantity * rate);
    }, 0);
    return computedFromItems;
  };

  const normalizeDiscountForForm = (quoteLike: any, subTotalValue: number, taxValue: number) => {
    const discountTypeRaw = String(quoteLike?.discountType || "percent").toLowerCase();
    const discountTypeValue = discountTypeRaw === "amount" ? "amount" : "percent";
    const rawDiscount = toNumberSafe(quoteLike?.discount);

    if (discountTypeValue === "amount" || rawDiscount <= 0 || subTotalValue <= 0) {
      return { discountValue: rawDiscount, discountTypeValue };
    }

    const taxModeRaw = String(quoteLike?.taxExclusive || "Tax Exclusive").toLowerCase();
    const isInclusive = taxModeRaw.includes("inclusive");
    const shipping = toNumberSafe(quoteLike?.shippingCharges);
    const adjustment = toNumberSafe(quoteLike?.adjustment);
    const roundOff = toNumberSafe(quoteLike?.roundOff);
    const totalValue = toNumberSafe(quoteLike?.total ?? quoteLike?.amount);

    const totalAssumingPercent =
      subTotalValue +
      (isInclusive ? 0 : taxValue) -
      ((subTotalValue * rawDiscount) / 100) +
      shipping +
      adjustment +
      roundOff;

    const totalAssumingAmount =
      subTotalValue +
      (isInclusive ? 0 : taxValue) -
      rawDiscount +
      shipping +
      adjustment +
      roundOff;

    const looksLikeAmount =
      rawDiscount > 100 ||
      (Math.abs(totalValue - totalAssumingAmount) + 0.01 < Math.abs(totalValue - totalAssumingPercent));

    if (!looksLikeAmount) {
      return { discountValue: rawDiscount, discountTypeValue: "percent" };
    }

    return {
      discountValue: (rawDiscount / subTotalValue) * 100,
      discountTypeValue: "percent"
    };
  };

  useEffect(() => {
    if (isEditMode || !clonedDataFromState || hasAppliedCloneRef.current) return;
    hasAppliedCloneRef.current = true;

    const cloned = clonedDataFromState as any;
    const toDisplayDate = (value: any, fallback = "") => {
      if (!value) return fallback;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-GB");
      return String(value);
    };

    const mappedItems = Array.isArray(cloned.items) && cloned.items.length > 0
      ? cloned.items.map((item: any, index: number) => {
        const quantity = Number(item.quantity ?? 1) || 1;
        const rate = Number(item.rate ?? item.price ?? item.unitPrice ?? 0) || 0;
        const amount = Number(item.amount ?? item.total ?? (quantity * rate)) || 0;
        const rawTaxSource =
          item?.taxId ??
          (item?.tax && typeof item.tax === "object"
            ? (
              item.tax?._id ||
              item.tax?.id ||
              item.tax?.taxId ||
              item.tax?.name ||
              item.tax?.taxName ||
              item.tax?.rate ||
              (typeof item.tax?.toString === "function" ? item.tax.toString() : "")
            )
            : item?.tax) ??
          item?.taxName ??
          item?.taxLabel ??
          item?.salesTaxRate ??
          item?.taxRate ??
          "";
        const normalizedRawTax = String(rawTaxSource || "").trim() === "[object Object]" ? "" : rawTaxSource;
        const parsedTaxRate = Number(item?.taxRate ?? item?.salesTaxRate ?? (item?.tax && typeof item.tax === "object" ? item.tax?.rate : item?.tax) ?? 0) || 0;
        const explicitTaxAmount = Number(item?.taxAmount || 0) || 0;
        const derivedTaxRate = parsedTaxRate > 0
          ? parsedTaxRate
          : (amount > 0 && explicitTaxAmount > 0 ? (explicitTaxAmount / amount) * 100 : 0);
        const matchedTax = (() => {
          const candidate = String(normalizedRawTax || "").trim();
          if (!candidate) return null;
          const byId = taxes.find((t: any) => String(t.id || t._id) === candidate);
          if (byId) return byId;
          const byName = taxes.find((t: any) => String(t.name || t.taxName || "").toLowerCase() === candidate.toLowerCase());
          if (byName) return byName;
          const asRate = parseFloat(candidate.replace("%", ""));
          if (Number.isFinite(asRate) && asRate > 0) {
            return taxes.find((t: any) => Number(t.rate || 0) === asRate) || null;
          }
          return null;
        })();
        const resolvedTaxId = matchedTax ? String((matchedTax as any).id || (matchedTax as any)._id || "") : "";
        const resolvedTaxRate = matchedTax ? (Number((matchedTax as any).rate) || derivedTaxRate) : derivedTaxRate;

        return {
          id: index + 1,
          itemType: item.itemType || "item",
          itemDetails: item.itemDetails || item.name || item.description || "",
          quantity,
          rate,
          tax: String(resolvedTaxId || normalizedRawTax || (resolvedTaxRate > 0 ? resolvedTaxRate : "")),
          taxRate: resolvedTaxRate,
          amount,
          reportingTags: Array.isArray(item.reportingTags) ? item.reportingTags : []
        };
      })
      : undefined;

    const clonedSubTotal = resolveSubtotalFromQuoteLike(cloned, mappedItems || []);
    const clonedTax = toNumberSafe(cloned.totalTax ?? cloned.taxAmount ?? cloned.tax);
    const normalizedClonedDiscount = normalizeDiscountForForm(cloned, clonedSubTotal, clonedTax);

    setFormData(prev => ({
      ...prev,
      customerName: cloned.customerName || cloned.customer?.displayName || cloned.customer?.name || prev.customerName,
      selectedPriceList: cloned.selectedPriceList || cloned.priceList || cloned.priceListName || prev.selectedPriceList,
      createRetainerInvoice: Boolean(cloned.createRetainerInvoice ?? prev.createRetainerInvoice),
      retainerPercentage: String(cloned.retainerPercentage ?? prev.retainerPercentage ?? ""),
      referenceNumber: cloned.referenceNumber || prev.referenceNumber,
      quoteDate: toDisplayDate(cloned.quoteDate || cloned.date, prev.quoteDate),
      expiryDate: toDisplayDate(cloned.expiryDate, prev.expiryDate),
      salesperson: cloned.salesperson || prev.salesperson,
      salespersonId: cloned.salespersonId || prev.salespersonId,
      projectName: cloned.projectName || prev.projectName,
      subject: cloned.subject || prev.subject,
      taxExclusive: cloned.taxExclusive || prev.taxExclusive,
      items: mappedItems || prev.items,
      subTotal: clonedSubTotal || prev.subTotal,
      totalTax: clonedTax || prev.totalTax,
      discount: normalizedClonedDiscount.discountValue,
      discountType: normalizedClonedDiscount.discountTypeValue,
      discountAccount: cloned.discountAccount || prev.discountAccount,
      shippingCharges: Number(cloned.shippingCharges ?? prev.shippingCharges) || 0,
      shippingChargeTax: String(cloned.shippingChargeTax || cloned.shippingTax || prev.shippingChargeTax || ""),
      adjustment: Number(cloned.adjustment ?? prev.adjustment) || 0,
      roundOff: Number(cloned.roundOff ?? prev.roundOff) || 0,
      total: Number(cloned.total ?? prev.total) || 0,
      currency: cloned.currency || prev.currency,
      customerNotes: cloned.customerNotes || cloned.notes || prev.customerNotes,
      termsAndConditions: cloned.termsAndConditions || cloned.terms || prev.termsAndConditions,
      attachedFiles: [],
      reportingTags: Array.isArray(cloned.reportingTags) ? cloned.reportingTags : []
    }));
  }, [clonedDataFromState, isEditMode]);

  const {
    isOpen: isDiscountAccountOpen,
    setIsOpen: setIsDiscountAccountOpen,
    searchTerm: discountAccountSearch,
    setSearchTerm: setDiscountAccountSearch,
    filteredAccounts: filteredDiscountAccounts,
    groupedAccounts: groupedDiscountAccounts,
    dropdownRef: discountAccountDropdownRef
  } = useAccountSelect();

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billingAddress, setBillingAddress] = useState<any | null>(null);
  const [shippingAddress, setShippingAddress] = useState<any | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalType, setAddressModalType] = useState<"billing" | "shipping">("billing");
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen] = useState(false);
  const [phoneCodeSearch, setPhoneCodeSearch] = useState("");
  const phoneCodeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    attention: "",
    country: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zipCode: "",
    phoneCountryCode: "",
    phone: "",
    fax: ""
  });

  // Customer search modal state
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
  const [customerSearchCriteria, setCustomerSearchCriteria] = useState("Display Name");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState(false);
  const [isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen] = useState(false);
  const [customerQuickActionFrameKey, setCustomerQuickActionFrameKey] = useState(0);
  const [isNewProjectQuickActionOpen, setIsNewProjectQuickActionOpen] = useState(false);
  const [projectQuickActionFrameKey, setProjectQuickActionFrameKey] = useState(0);
  const [customerQuickActionBaseIds, setCustomerQuickActionBaseIds] = useState<string[]>([]);
  const [projectQuickActionBaseIds, setProjectQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingCustomersQuickAction, setIsRefreshingCustomersQuickAction] = useState(false);
  const [isRefreshingProjectsQuickAction, setIsRefreshingProjectsQuickAction] = useState(false);
  const [isReloadingCustomerFrame, setIsReloadingCustomerFrame] = useState(false);
  const [isReloadingProjectFrame, setIsReloadingProjectFrame] = useState(false);
  const [isAutoSelectingCustomerFromQuickAction, setIsAutoSelectingCustomerFromQuickAction] = useState(false);
  const [isAutoSelectingProjectFromQuickAction, setIsAutoSelectingProjectFromQuickAction] = useState(false);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);
  const [manageSalespersonSearch, setManageSalespersonSearch] = useState("");
  const [manageSalespersonMenuOpen, setManageSalespersonMenuOpen] = useState<string | null>(null);
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>([]);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isNewSalespersonFormOpen, setIsNewSalespersonFormOpen] = useState(false);
  const [editingSalespersonId, setEditingSalespersonId] = useState<string | null>(null);
  const [isAddContactPersonModalOpen, setIsAddContactPersonModalOpen] = useState(false);
  const [contactPersonData, setContactPersonData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    workPhonePrefix: "+358",
    mobile: "",
    mobilePrefix: "+358",
    skype: "",
    designation: "",
    department: "",
    profileImage: null as File | null
  });

  const [newSalespersonData, setNewSalespersonData] = useState({ name: "", email: "" });
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [openItemDropdowns, setOpenItemDropdowns] = useState<Record<string, boolean>>({});
  const [itemSearches, setItemSearches] = useState<Record<string, string>>({});
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<string, boolean>>({});
  const [isNewTaxQuickModalOpen, setIsNewTaxQuickModalOpen] = useState(false);
  const [newTaxTargetItemId, setNewTaxTargetItemId] = useState<string | number | null>(null);
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  const itemDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const taxDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const taxOptionGroups = useMemo(() => buildTaxOptionGroups(taxes as any[]), [taxes]);
  const getFilteredTaxGroups = (search: string) => {
    const keyword = (search || "").trim().toLowerCase();
    if (!keyword) return taxOptionGroups;
    return taxOptionGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((tax) =>
          taxLabel(tax.raw ?? tax).toLowerCase().includes(keyword)
        ),
      }))
      .filter((group) => group.options.length > 0);
  };
  const [openItemMenuId, setOpenItemMenuId] = useState<string | number | null>(null);
  const itemMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkAddInsertIndex, setBulkAddInsertIndex] = useState(null);
  const [bulkAddSearch, setBulkAddSearch] = useState("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState<any[]>([]);
  const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState<number[]>([]);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const bulkActionsRef = useRef(null);
  const [isTheseDropdownOpen, setIsTheseDropdownOpen] = useState(false);
  const [showAdditionalInformation, setShowAdditionalInformation] = useState(false);
  const [additionalInfoItemIds, setAdditionalInfoItemIds] = useState<string[]>([]);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItemTargetRowId, setNewItemTargetRowId] = useState<string | number | null>(null);
  const [isReportingTagsModalOpen, setIsReportingTagsModalOpen] = useState(false);
  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
  const [reportingTagSelections, setReportingTagSelections] = useState<Record<string, string>>({});
  const [currentReportingTagsItemId, setCurrentReportingTagsItemId] = useState<string | number | null>(null);
  const [isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [newItemData, setNewItemData] = useState({
    type: "Goods",
    name: "",
    sku: "",
    unit: "",
    sellingPrice: "",
    salesAccount: "Sales",
    salesDescription: "",
    salesTax: "",
    costPrice: "",
    purchaseAccount: "Cost of Goods Sold",
    purchaseDescription: "",
    purchaseTax: "",
    preferredVendor: "",
    sellable: true,
    purchasable: true,
    trackInventory: false
  });
  const [newItemImage, setNewItemImage] = useState(null);
  const newItemImageRef = useRef(null);

  // Project state
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCustomerIdForProjects, setSelectedCustomerIdForProjects] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    projectName: "",
    projectCode: "",
    customerName: "",
    customerId: "",
    billingMethod: "Fixed Cost for Project",
    totalProjectCost: "",
    description: "",
    costBudget: "",
    revenueBudget: "",
    users: [],
    tasks: [{ id: 1, taskName: "", description: "" }],
    addToWatchlist: true
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const projectDropdownRef = useRef(null);
  const [isQuoteDatePickerOpen, setIsQuoteDatePickerOpen] = useState(false);
  const [isExpiryDatePickerOpen, setIsExpiryDatePickerOpen] = useState(false);
  const [quoteDateCalendar, setQuoteDateCalendar] = useState(new Date());
  const [expiryDateCalendar, setExpiryDateCalendar] = useState(new Date());
  const customerDropdownRef = useRef(null);
  const salespersonDropdownRef = useRef(null);
  const quoteDatePickerRef = useRef(null);
  const expiryDatePickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const uploadDropdownRef = useRef(null);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState("files");
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");

  // Load customers from localStorage
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(true);

  const isCustomerActive = (customer: any) => {
    const status = String(customer?.status || "").toLowerCase();
    if (status) return status === "active";
    if (typeof customer?.isActive === "boolean") return customer.isActive;
    return true;
  };

  // Load items from localStorage
  const [availableItems, setAvailableItems] = useState<any[]>(defaultSampleItems as any[]);

  const loadCustomersForDropdown = async () => {
    try {
      setIsCustomersLoading(true);
      let rows = await getCustomers();
      if (!Array.isArray(rows) || rows.length === 0) {
        const response: any = await customersAPI.getAll({ limit: 2000 });
        rows = Array.isArray(response?.data) ? response.data : [];
      }
      const normalizedCustomers = (rows || []).map((c: any) => ({
        ...c,
        id: c._id || c.id,
        name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
      }));
      setCustomers(normalizedCustomers.filter(isCustomerActive));
    } catch (error) {
      console.error("Error loading customers:", error);
      setCustomers([]);
    } finally {
      setIsCustomersLoading(false);
    }
  };

  // Quote number configuration state
  const [isQuoteNumberModalOpen, setIsQuoteNumberModalOpen] = useState(false);
  const [quoteNumberMode, setQuoteNumberMode] = useState("auto"); // "auto" or "manual"

  useEffect(() => {
    void loadCustomersForDropdown();
  }, []);
  const [quotePrefix, setQuotePrefix] = useState("");
  const [quoteNextNumber, setQuoteNextNumber] = useState("");
  const quoteSeriesSyncRef = useRef(false);
  const [quoteSeriesRow, setQuoteSeriesRow] = useState<any | null>(null);
  const [quoteSeriesRows, setQuoteSeriesRows] = useState<any[]>([]);
  const [isTaxPreferenceDropdownOpen, setIsTaxPreferenceDropdownOpen] = useState(false);
  const [taxPreferenceSearch, setTaxPreferenceSearch] = useState("");
  const [isPriceListDropdownOpen, setIsPriceListDropdownOpen] = useState(false);
  const [priceListSearch, setPriceListSearch] = useState("");
  const [catalogPriceListsRaw, setCatalogPriceListsRaw] = useState<any[]>([]);
  const [catalogPriceLists, setCatalogPriceLists] = useState<CatalogPriceListOption[]>([]);
  const [priceListSwitchDialog, setPriceListSwitchDialog] = useState<PriceListSwitchDialogState | null>(null);
  const [isLocationFeatureEnabled, setIsLocationFeatureEnabled] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const taxPreferenceDropdownRef = useRef<HTMLDivElement | null>(null);
  const priceListDropdownRef = useRef<HTMLDivElement | null>(null);

  // Currency Mapping state
  const [currencyMap, setCurrencyMap] = useState<Record<string, string>>({});

  // Contact Persons state
  const [contactPersons, setContactPersons] = useState([]);
  const [vendorContactPersons, setVendorContactPersons] = useState([]);
  const [selectedContactPersons, setSelectedContactPersons] = useState<ContactPerson[]>([]);
  const [isEmailCommunicationsOpen, setIsEmailCommunicationsOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined" || !isNewCustomerQuickActionOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isNewCustomerQuickActionOpen]);

  const getCurrencySymbol = (currencyCode?: string | null): string => {
    if (!currencyCode) return "";
    const code = String(currencyCode).split(' - ')[0];

    // Look up in our dynamic currency map
    const symbol = currencyMap[code];

    // If we have a symbol that is different from the code, use it.
    // Otherwise return the code (3 letters).
    if (symbol && symbol !== code) {
      return symbol;
    }
    return code;
  };

  // Define months array before use
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const taxPreferenceOptions = ["Tax Exclusive", "Tax Inclusive"];
  const filteredTaxPreferenceOptions = taxPreferenceOptions.filter((option) =>
    option.toLowerCase().includes(taxPreferenceSearch.toLowerCase())
  );
  const sanitizeQuotePrefix = (value: any) => String(value || "QT-").trim() || "QT-";
  const extractQuoteDigits = (value: any) => {
    const raw = String(value || "").trim();
    const matches = raw.match(/(\d+)\s*$/);
    return matches ? matches[1] : "";
  };
  const deriveQuotePrefixFromNumber = (value: any, fallbackPrefix = "QT-") => {
    const raw = String(value || "").trim();
    const match = raw.match(/^(.*?)(\d+)\s*$/);
    if (match && String(match[1] || "").trim()) {
      return String(match[1]);
    }
    return sanitizeQuotePrefix(fallbackPrefix);
  };
  const buildQuoteNumber = (prefixValue: any, numberValue: any) => {
    const safePrefix = sanitizeQuotePrefix(prefixValue);
    const rawDigits = extractQuoteDigits(numberValue);
    const safeDigits = rawDigits ? rawDigits.padStart(6, "0") : "000001";
    return `${safePrefix}${safeDigits}`;
  };
  const normalizeSeriesName = (value: any) => String(value || "").trim().toLowerCase();
  const getLocationIdsForLocationName = (locationName: string) => {
    if (typeof window === "undefined") return [];
    const targetName = String(locationName || "").trim().toLowerCase();
    if (!targetName) return [];

    try {
      const raw = localStorage.getItem(LS_LOCATIONS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      return Array.from(
        new Set(
          parsed
            .filter((row: any) => {
              const rowName = String(row?.name || row?.locationName || "").trim().toLowerCase();
              return rowName === targetName;
            })
            .map((row: any) => String(row?._id || row?.id || "").trim())
            .filter(Boolean)
        )
      );
    } catch {
      return [];
    }
  };
  const isQuoteSeriesRow = (row: any) => {
    const moduleValue = String(row?.module || row?.name || row?.moduleKey || "").toLowerCase();
    return moduleValue === "quote" || moduleValue === "quotes" || moduleValue.includes("quote");
  };
  const resolveQuoteSeriesRow = (rows: any[], selectedLocationName = "") => {
    const quoteRows = (rows || []).filter((row: any) => isQuoteSeriesRow(row) && String(row?.status || "Active").toLowerCase() !== "inactive");
    if (!quoteRows.length) return null;

    const locationIds = getLocationIdsForLocationName(selectedLocationName);
    const scoreRow = (row: any) => {
      const seriesName = normalizeSeriesName(row?.seriesName || "");
      const rowLocationIds = Array.isArray(row?.locationIds)
        ? row.locationIds.map((id: any) => String(id || "").trim()).filter(Boolean)
        : [];
      const createdAt = new Date(String(row?.updatedAt || row?.createdAt || 0)).getTime();

      let score = 0;
      if (locationIds.length) {
        const matchesLocation = rowLocationIds.some((id) => locationIds.includes(id));
        if (matchesLocation) score += 100;
        else if (!rowLocationIds.length) score += 10;
      }

      if (!Boolean(row?.isDefault)) score += 25;
      if (seriesName !== "default transaction series") score += 15;
      if (rowLocationIds.length) score += 5;
      if (Number.isFinite(createdAt) && createdAt > 0) score += Math.min(createdAt / 1e11, 10);

      return score;
    };

    return (
      quoteRows
        .slice()
        .sort((a: any, b: any) => {
          const scoreDiff = scoreRow(b) - scoreRow(a);
          if (scoreDiff !== 0) return scoreDiff;
          const timeB = new Date(String(b?.updatedAt || b?.createdAt || 0)).getTime();
          const timeA = new Date(String(a?.updatedAt || a?.createdAt || 0)).getTime();
          return timeB - timeA;
        })[0] || null
    );
  };
  const resolveSeriesNextDigits = (row: any) => {
    const starting = String(row?.startingNumber ?? row?.nextNumber ?? "1").trim() || "1";
    const width = /^\d+$/.test(starting) ? starting.length : 6;
    const parsed = parseInt(starting, 10);
    const nextValue = Number(row?.nextNumber) > 0 ? Number(row?.nextNumber) : Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    return String(nextValue).padStart(width, "0");
  };

  // NOTE: We only reserve (increment) the series when saving, not on load.

  const formatPriceListDisplayLabel = (row: any) => {
    const name = String(row?.name || "").trim();
    if (!name) return "";

    const pricingScheme = String(row?.pricingScheme || "").trim();
    const rawMarkup = String(row?.markup ?? "").trim();
    const markupType = String(row?.markupType || "").trim();
    const normalizedMarkup = rawMarkup
      ? (rawMarkup.includes("%") ? rawMarkup : `${rawMarkup}%`)
      : "";
    const detail = normalizedMarkup
      ? `${normalizedMarkup} ${markupType || "Markup"}`.trim()
      : pricingScheme;

    return detail ? `${name} [ ${detail} ]` : name;
  };

  const normalizeCatalogPriceLists = (rows: any[]) => {
    const parsed = Array.isArray(rows) ? rows : [];
    setCatalogPriceListsRaw(parsed);

    const normalized: CatalogPriceListOption[] = parsed
      .map((row: any) => ({
        id: String(row?.id || row?._id || ""),
        name: String(row?.name || "").trim(),
        pricingScheme: String(row?.pricingScheme || "").trim(),
        currency: String(row?.currency || "").trim(),
        status: String(row?.status || "Active").trim(),
        displayLabel: formatPriceListDisplayLabel(row),
      }))
      .filter((row: CatalogPriceListOption) => row.name)
      .filter((row: CatalogPriceListOption) => row.status.toLowerCase() !== "inactive");

    setCatalogPriceLists(normalized);
  };

  const loadCatalogPriceLists = async () => {
    // 1) Instant local fallback (for offline + faster UI)
    try {
      const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      normalizeCatalogPriceLists(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Error reading cached price lists for quote:", error);
      normalizeCatalogPriceLists([]);
    }

    // 2) Refresh from backend and keep localStorage in sync
    try {
      const response: any = await priceListsAPI.list({ limit: 5000 });
      const rows = response?.success ? response?.data : null;
      if (Array.isArray(rows)) {
        localStorage.setItem(PRICE_LISTS_STORAGE_KEY, JSON.stringify(rows));
        normalizeCatalogPriceLists(rows);
      }
    } catch (error) {
      console.error("Error loading price lists from API for quote:", error);
    }
  };

  useEffect(() => {
    try {
      const enabled = localStorage.getItem(LS_LOCATIONS_ENABLED_KEY) === "true";
      setIsLocationFeatureEnabled(enabled);

      const raw = localStorage.getItem(LS_LOCATIONS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const names = Array.isArray(parsed)
        ? parsed
          .map((row: any) => String(row?.name || "").trim())
          .filter((name: string) => name.length > 0)
        : [];
      const uniqueNames = Array.from(new Set(names));
      const nextOptions = uniqueNames.length > 0 ? uniqueNames : ["Head Office"];
      setLocationOptions(nextOptions);

      setFormData(prev => ({
        ...prev,
        selectedLocation: nextOptions.includes(prev.selectedLocation) ? prev.selectedLocation : nextOptions[0]
      }));
    } catch {
      setIsLocationFeatureEnabled(false);
      setLocationOptions(["Head Office"]);
    }
  }, []);

  useEffect(() => {
    loadCatalogPriceLists();

    const onStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === PRICE_LISTS_STORAGE_KEY) {
        loadCatalogPriceLists();
      }
    };
    const onWindowFocus = () => loadCatalogPriceLists();

    window.addEventListener("storage", onStorageChange);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);

  const selectedPriceListOption = catalogPriceLists.find(
    (option) => option.name === formData.selectedPriceList
  );
  const normalizeSelectedPriceListName = (value: any) => {
    const normalized = String(value || "").trim();
    if (!normalized || normalized.toLowerCase() === "select price list") return "";
    return normalized;
  };
  const selectedPriceListDisplay =
    selectedPriceListOption?.displayLabel ||
    formData.selectedPriceList ||
    "Select Price List";

  const filteredPriceListOptions = catalogPriceLists.filter((option) => {
    const search = priceListSearch.toLowerCase().trim();
    if (!search) return true;
    return (
      option.name.toLowerCase().includes(search) ||
      option.displayLabel.toLowerCase().includes(search) ||
      option.pricingScheme.toLowerCase().includes(search) ||
      option.currency.toLowerCase().includes(search)
    );
  });

  const selectedPriceList = useMemo(() => {
    const selected = normalizeSelectedPriceListName(formData.selectedPriceList);
    if (!selected) return null;
    return (
      catalogPriceListsRaw.find((row: any) => String(row?.name || "").trim() === selected) ||
      catalogPriceListsRaw.find((row: any) => String(row?.id || row?._id || "").trim() === selected) ||
      null
    );
  }, [catalogPriceListsRaw, formData.selectedPriceList]);

  const resolveCustomerPriceListDefault = (customer: any) => {
    const customerPriceListId = String(customer?.priceListId || customer?.priceListID || customer?.price_list_id || "").trim();
    const customerPriceListNameRaw = String(customer?.priceListName || customer?.priceList || customer?.price_list || "").trim();
    const resolvedPriceList =
      (customerPriceListId
        ? catalogPriceListsRaw.find((row: any) => String(row?.id || row?._id || "").trim() === customerPriceListId)
        : null) ||
      (customerPriceListNameRaw
        ? catalogPriceListsRaw.find((row: any) => String(row?.name || "").trim() === customerPriceListNameRaw)
        : null) ||
      null;

    return {
      id: resolvedPriceList ? String(resolvedPriceList?.id || resolvedPriceList?._id || customerPriceListId || "").trim() : customerPriceListId,
      name: resolvedPriceList ? String(resolvedPriceList?.name || "").trim() : customerPriceListNameRaw,
      currency: resolvedPriceList ? String(resolvedPriceList?.currency || "").trim() : "",
    };
  };

  const applyResolvedPriceListChoice = (nextPriceListName: string, nextCurrency = "") => {
    setFormData((prev) => ({
      ...prev,
      selectedPriceList: nextPriceListName || "Select Price List",
      currency: nextCurrency || prev.currency,
    }));
    setPriceListSwitchDialog(null);
  };

  const parsePercentage = (value: any) => {
    const raw = String(value || "").replace(/[^0-9.-]/g, "");
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  };

  const applyRounding = (value: number, roundOffTo: string) => {
    const label = String(roundOffTo || "").toLowerCase();
    if (label.includes("decimal places")) {
      const digits = Number(label.split(" ")[0]);
      if (Number.isFinite(digits)) return Number(value.toFixed(digits));
    }
    if (label.includes("nearest whole")) return Math.round(value);
    if (label.includes("0.99")) return Math.floor(value) + 0.99;
    if (label.includes("0.50")) return Math.floor(value) + 0.5;
    if (label.includes("0.49")) return Math.floor(value) + 0.49;
    return value;
  };

  const getIndividualPriceListRate = (priceList: any, entity: any) => {
    if (!priceList) return null;
    if (String(priceList.priceListType || "").toLowerCase() !== "individual") return null;

    const entityType = String(entity?.entityType || entity?.itemEntityType || "item").toLowerCase();
    const entityId = String(entity?.sourceId || entity?.itemId || entity?.id || "").trim();
    const entityName = String(entity?.name || "").trim();

    if (entityType === "item") {
      const itemRates = Array.isArray(priceList.itemRates) ? priceList.itemRates : [];
      const match = itemRates.find((row: any) => {
        const rowId = String(row?.itemId || "").trim();
        const rowName = String(row?.itemName || "").trim();
        return (rowId && rowId === entityId) || (rowName && entityName && rowName === entityName);
      });
      const rate = match ? Number(match.rate ?? match.price) : null;
      return Number.isFinite(rate as any) ? (rate as number) : null;
    }

    // plan/addon from Product Catalog
    const productRates = Array.isArray(priceList.productRates) ? priceList.productRates : [];
    for (const productRow of productRates) {
      const plans = Array.isArray(productRow?.plans) ? productRow.plans : [];
      const addons = Array.isArray(productRow?.addons) ? productRow.addons : [];

      const planMatch = plans.find((row: any) => String(row?.planId || "").trim() === entityId || String(row?.name || "").trim() === entityName);
      if (planMatch) {
        const rate = Number(planMatch.rate ?? planMatch.price);
        return Number.isFinite(rate) ? rate : null;
      }

      const addonMatch = addons.find((row: any) => String(row?.addonId || "").trim() === entityId || String(row?.name || "").trim() === entityName);
      if (addonMatch) {
        const rate = Number(addonMatch.rate ?? addonMatch.price);
        return Number.isFinite(rate) ? rate : null;
      }
    }

    return null;
  };

  const applyPriceListToBaseRate = (baseRate: number, priceList: any, entity: any) => {
    if (!priceList) return baseRate;

    const override = getIndividualPriceListRate(priceList, entity);
    if (override !== null) return override;

    // Sales list -> markup/markdown against base rate
    if (String(priceList.priceListType || "").toLowerCase() === "individual") return baseRate;
    const pct = parsePercentage(priceList.markup);
    if (!pct) return baseRate;

    const type = String(priceList.markupType || "").toLowerCase();
    const next = type === "markdown" ? baseRate * (1 - pct / 100) : baseRate * (1 + pct / 100);
    return applyRounding(next, priceList.roundOffTo || "Never mind");
  };

  const normalizeReportingTagOptions = (tag: any): string[] => {
    const candidates = Array.isArray(tag?.options)
      ? tag.options
      : Array.isArray(tag?.values)
        ? tag.values
        : [];

    return candidates
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
      .filter((value: string) => Boolean(value));
  };

  const normalizeReportingTagAppliesTo = (tag: any): string[] => {
    const direct = Array.isArray(tag?.appliesTo) ? tag.appliesTo : [];
    const fromModulesObject = tag?.modules && typeof tag.modules === "object"
      ? Object.keys(tag.modules).filter((key) => Boolean(tag.modules[key]))
      : [];
    const fromModuleSettings = tag?.moduleSettings && typeof tag.moduleSettings === "object"
      ? Object.keys(tag.moduleSettings).filter((key) => Boolean(tag.moduleSettings[key]))
      : [];
    const fromAssociations = Array.isArray(tag?.associations) ? tag.associations : [];
    const fromModulesList = Array.isArray(tag?.modulesList) ? tag.modulesList : [];

    return [...direct, ...fromModulesObject, ...fromModuleSettings, ...fromAssociations, ...fromModulesList]
      .map((value: any) => String(value || "").toLowerCase().trim())
      .filter(Boolean);
  };

  const loadReportingTags = async () => {
    try {
      const response = await reportingTagsAPI.getAll();
      const rows = Array.isArray(response) ? response : (response?.data || []);
      if (!Array.isArray(rows)) {
        setAvailableReportingTags([]);
        return;
      }

      const activeRows = rows.filter((tag: any) => String(tag?.status || "active").toLowerCase() !== "inactive");
      const quoteScoped = activeRows.filter((tag: any) => {
        const appliesTo = normalizeReportingTagAppliesTo(tag);
        return appliesTo.some((entry) => entry.includes("quote") || entry.includes("sales"));
      });

      const tagsToUse = (quoteScoped.length > 0 ? quoteScoped : activeRows).map((tag: any) => ({
        ...tag,
        options: normalizeReportingTagOptions(tag),
      }));

      setAvailableReportingTags(tagsToUse);
    } catch (error) {
      console.error("Error loading reporting tags:", error);
      setAvailableReportingTags([]);
    }
  };

  useEffect(() => {
    loadReportingTags();
  }, []);

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

  // Update currency when baseCurrencyCode is loaded
  useEffect(() => {
    if (baseCurrencyCode && !isEditMode) {
      setFormData(prev => ({ ...prev, currency: baseCurrencyCode }));
    }
  }, [baseCurrencyCode, isEditMode]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        void Promise.allSettled([getSalespersonsFromAPI(), getTaxes()]).then(([salespersonsResult, taxesResult]) => {
          if (salespersonsResult.status === "fulfilled") {
            const normalizedSalespersons = (salespersonsResult.value || []).map((s: any) => ({
              ...s,
              id: s._id || s.id,
              name: s.name || s.displayName || "Unknown"
            }));
            setSalespersons(normalizedSalespersons);
          }

          if (taxesResult.status === "fulfilled") {
            const fetchedTaxes = (taxesResult.value || []).map((t: any) => ({
              ...t,
              id: t._id || t.id
            }));
            const cachedTaxes = readTaxesLocal();
            const combinedTaxes = [...fetchedTaxes, ...cachedTaxes];
            const dedupedTaxes = Array.from(
              new Map(
                combinedTaxes
                  .map((tax: any): [string, any] => {
                    const id = String(tax?._id || tax?.id || tax?.tax_id || tax?.taxId || tax?.name || tax?.taxName || tax?.tax_name || "").trim();
                    return [id.toLowerCase(), tax];
                  })
                  .filter(([id]) => Boolean(id))
              ).values()
            );
            const normalizedTaxes = dedupedTaxes.filter((tax: any) => {
              const name = String(tax?.name || tax?.taxName || tax?.tax_name || tax?.displayName || tax?.title || "").trim();
              return name.length > 0;
            });
            const activeTaxes = normalizedTaxes.filter((tax: any) => isTaxActive(tax));
            setTaxes(activeTaxes);
          }
        });

        // Load heavy dropdown data in parallel.
        const [
          projectsResult,
          salespersonsResult,
          itemsResult,
            plansResult,
            txSeriesResult,
            quoteListResult,
            currenciesResult,
            baseCurrencyResult,
            settingsResult,
            taxesResult,
            generalSettingsResult
        ] = await Promise.allSettled([
            getProjects(),
            getSalespersonsFromAPI(),
            getItemsFromAPI(),
            plansAPI.getAll({ limit: 5000 }),
            transactionNumberSeriesAPI.getAll({ limit: 10000 }),
            quotesAPI.getAll({ limit: 1 }),
            currenciesAPI.getAll(),
            isEditMode ? Promise.resolve(null) : currenciesAPI.getBaseCurrency(),
            isEditMode ? Promise.resolve(null) : settingsAPI.getQuotesSettings(),
            getTaxes(),
            settingsAPI.getGeneralSettings()
          ]);

        if (projectsResult.status === "fulfilled") {
          setProjects(Array.isArray(projectsResult.value) ? projectsResult.value : []);
        } else {
          console.error("Error loading projects:", projectsResult.reason);
          setProjects([]);
        }

        if (salespersonsResult.status === "fulfilled") {
          const normalizedSalespersons = (salespersonsResult.value || []).map((s: any) => ({
            ...s,
            id: s._id || s.id,
            name: s.name || s.displayName || "Unknown"
          }));
          setSalespersons(normalizedSalespersons);
        } else {
          console.error("Error loading salespersons:", salespersonsResult.reason);
          setSalespersons([]);
        }

        const transformedItems = itemsResult.status === "fulfilled"
          ? (itemsResult.value || []).map((item: any) => ({
            ...item,
            entityType: "item",
            id: String(item._id || item.id || ""),
            sourceId: String(item._id || item.id || ""),
            name: String(item.name || "").trim(),
            sku: String(item.sku || item.itemCode || "").trim(),
            code: String(item.sku || item.itemCode || "").trim(),
            rate: Number(item.sellingPrice || item.costPrice || item.rate || 0) || 0,
            stockOnHand: Number(item.stockOnHand || item.quantityOnHand || item.stockQuantity || 0) || 0,
            unit: item.unit || item.unitOfMeasure || "pcs",
            description: item.salesDescription || item.description || ""
          }))
          : [];
        if (itemsResult.status !== "fulfilled") {
          console.error("Error loading items:", itemsResult.reason);
        }

        const normalizePlanRow = (plan: any, index: number) => {
          const sourceId = String(plan?.id || plan?._id || plan?.planId || `plan-${index}`);
          return {
            ...plan,
            entityType: "plan",
            id: `plan:${sourceId}`,
            sourceId,
            name: String(plan?.planName || plan?.name || plan?.plan || "").trim(),
            sku: String(plan?.planCode || plan?.code || plan?.sku || "").trim(),
            code: String(plan?.planCode || plan?.code || plan?.sku || "").trim(),
            rate: Number(plan?.price ?? plan?.rate ?? plan?.amount ?? 0) || 0,
            stockOnHand: 0,
            unit: String(plan?.billingFrequencyUnit || plan?.billingFrequency || plan?.unit || "plan"),
            description: String(plan?.planDescription || plan?.description || ""),
          };
        };

        let transformedPlans: any[] = [];
        try {
          if (plansResult.status === "fulfilled") {
            const response: any = plansResult.value;
            const rows =
              response?.success && Array.isArray(response?.data)
                ? response.data
                : Array.isArray((response as any)?.data)
                  ? (response as any).data
                  : Array.isArray(response)
                    ? response
                    : [];
            transformedPlans.push(
              ...(Array.isArray(rows) ? rows.map(normalizePlanRow).filter((plan: any) => plan.name) : [])
            );
          } else {
            console.error("Error loading plans from API:", plansResult.reason);
          }
        } catch (error) {
          console.error("Error parsing plans from API response:", error);
        }

        // Also load plans from localStorage caches (supports legacy keys)
        try {
          const mergedLocal: any[] = [];
          PLANS_STORAGE_KEYS.forEach((key) => {
            try {
              const raw = localStorage.getItem(key);
              const parsed = raw ? JSON.parse(raw) : [];
              if (Array.isArray(parsed)) mergedLocal.push(...parsed);
            } catch {
              // ignore invalid key and continue
            }
          });
          if (mergedLocal.length) {
            transformedPlans.push(
              ...mergedLocal.map(normalizePlanRow).filter((plan: any) => plan.name)
            );
          }
        } catch (error) {
          console.error("Error loading plans from localStorage:", error);
        }

        transformedPlans = transformedPlans
          .filter((plan: any) => String(plan?.status || "active").toLowerCase() !== "inactive")
          .filter((plan: any) => String(plan?.name || "").trim().length > 0);

        const combinedItemsAndPlans = [...transformedItems, ...transformedPlans];
        const uniqueByEntityAndId = new Map<string, any>();
        combinedItemsAndPlans.forEach((entry: any) => {
          const key = `${String(entry.entityType || "item")}:${String(entry.id || entry.name || "")}`;
          if (!key.endsWith(":")) {
            uniqueByEntityAndId.set(key, entry);
          }
        });
        setAvailableItems(Array.from(uniqueByEntityAndId.values()));

        if (taxesResult.status === "fulfilled") {
          const fetchedTaxes = (taxesResult.value || []).map((t: any) => ({
            ...t,
            id: t._id || t.id
          }));
          const cachedTaxes = readTaxesLocal();
          const combinedTaxes = [...fetchedTaxes, ...cachedTaxes];
          const dedupedTaxes = Array.from(
            new Map(
              combinedTaxes
                .map((tax: any): [string, any] => {
                  const id = String(tax?._id || tax?.id || tax?.tax_id || tax?.taxId || tax?.name || tax?.taxName || tax?.tax_name || "").trim();
                  return [id.toLowerCase(), tax];
                })
                .filter(([id]) => Boolean(id))
            ).values()
          );
          const normalizedTaxes = dedupedTaxes.filter((tax: any) => {
            const name = String(tax?.name || tax?.taxName || tax?.tax_name || tax?.displayName || tax?.title || "").trim();
            return name.length > 0;
          });
          const activeTaxes = normalizedTaxes.filter((tax: any) => isTaxActive(tax));
          setTaxes(activeTaxes);
        } else {
          console.error("Error loading taxes:", taxesResult.reason);
          setTaxes([]);
        }

        let resolvedSeriesRow: any = null;
        if (txSeriesResult.status === "fulfilled") {
          const txSeriesResponse: any = txSeriesResult.value;
          const rows = Array.isArray(txSeriesResponse?.data)
            ? txSeriesResponse.data
            : Array.isArray(txSeriesResponse?.data?.data)
              ? txSeriesResponse.data.data
              : Array.isArray(txSeriesResponse)
                ? txSeriesResponse
                : [];
          setQuoteSeriesRows(rows);
          resolvedSeriesRow = resolveQuoteSeriesRow(rows, formData.selectedLocation);
          if (resolvedSeriesRow) {
            setQuoteSeriesRow(resolvedSeriesRow);
            const resolvedPrefix = sanitizeQuotePrefix(resolvedSeriesRow?.prefix || "QT-");
            const resolvedNextDigits = resolveSeriesNextDigits(resolvedSeriesRow);
            setQuotePrefix(resolvedPrefix);
            setQuoteNextNumber(resolvedNextDigits);
            setFormData(prev => ({ ...prev, quoteNumber: buildQuoteNumber(resolvedPrefix, resolvedNextDigits) }));
          }
        } else {
          console.error("Error loading transaction number series:", txSeriesResult.reason);
        }

        if (!resolvedSeriesRow) {
          setQuotePrefix("");
          setQuoteNextNumber("");
          setFormData(prev => ({ ...prev, quoteNumber: "" }));
        }

        if (!isEditMode && resolvedSeriesRow && !quoteSeriesSyncRef.current) {
          const listResponse: any = quoteListResult.status === "fulfilled" ? quoteListResult.value : null;
          const totalQuotes =
            Number(listResponse?.pagination?.total ?? listResponse?.data?.pagination?.total ?? 0) ||
            Number(listResponse?.data?.length ?? 0) ||
            0;
          const needsReset = totalQuotes === 0 && Number(resolvedSeriesRow?.nextNumber || 0) > 1;
          if (needsReset) {
            quoteSeriesSyncRef.current = true;
            const desiredPrefix = sanitizeQuotePrefix(resolvedSeriesRow?.prefix || "QT-");
            const desiredDigits = needsReset ? "000001" : resolveSeriesNextDigits(resolvedSeriesRow);
            setQuotePrefix(desiredPrefix);
            setQuoteNextNumber(desiredDigits);
            setFormData(prev => ({ ...prev, quoteNumber: buildQuoteNumber(desiredPrefix, desiredDigits) }));
            try {
              await persistQuoteSeriesPreferences({ prefix: desiredPrefix, nextDigits: desiredDigits });
            } catch (error) {
              console.error("Failed to sync quote number series:", error);
            }
          }
        }

        if (currenciesResult.status === "fulfilled") {
          const currenciesResponse: any = currenciesResult.value;
          if (currenciesResponse && currenciesResponse.success && currenciesResponse.data) {
            const mapping: any = {};
            currenciesResponse.data.forEach((curr: any) => {
              mapping[curr.code] = curr.symbol;
            });
            setCurrencyMap(mapping);
          }
        } else {
          console.error("Error loading currencies for mapping:", currenciesResult.reason);
        }

        if (!isEditMode && baseCurrencyResult.status === "fulfilled") {
          const baseCurrencyResponse: any = baseCurrencyResult.value;
          if (baseCurrencyResponse && baseCurrencyResponse.success && baseCurrencyResponse.data) {
            const code = baseCurrencyResponse.data.code || "USD";
            setFormData(prev => ({ ...prev, currency: code.split(' - ')[0] }));
          }
        }

        if (!isEditMode && settingsResult.status === "fulfilled") {
          const settingsResponse: any = settingsResult.value;
          if (settingsResponse && settingsResponse.success && settingsResponse.data) {
            const s = settingsResponse.data;
            setFormData(prev => ({
              ...prev,
              customerNotes: s.customerNotes || prev.customerNotes,
              termsAndConditions: s.termsConditions || prev.termsAndConditions
            }));
          }
        }

        if (generalSettingsResult.status === "fulfilled") {
          const response: any = generalSettingsResult.value;
          if (response?.success && response?.data) {
            setEnabledSettings(response.data?.settings || response.data || {});
          }
        }

        // Load all vendors for contact persons (not blocking initial render)
        loadVendorContactPersons();

        if (!isEditMode) {
          const today = new Date();
          const todayStr = today.toLocaleDateString("en-GB");
          setQuoteDateCalendar(today);
          setFormData(prev => ({
            ...prev,
            quoteDate: prev.quoteDate || todayStr
          }));
        }

        if (!isEditMode) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [isEditMode]);

  useEffect(() => {
    const handleGeneralSettingsUpdate = (event: any) => {
      const detail = event?.detail;
      if (!detail) return;
      setEnabledSettings(detail?.settings || detail || {});
    };

    window.addEventListener("generalSettingsUpdated", handleGeneralSettingsUpdate as EventListener);
    return () => window.removeEventListener("generalSettingsUpdated", handleGeneralSettingsUpdate as EventListener);
  }, []);

  useEffect(() => {
    if (isEditMode || quoteNumberMode !== "auto" || !quoteSeriesRows.length) return;

    const resolvedSeriesRow = resolveQuoteSeriesRow(quoteSeriesRows, formData.selectedLocation);
    if (!resolvedSeriesRow) return;

    const resolvedPrefix = sanitizeQuotePrefix(resolvedSeriesRow?.prefix || "QT-");
    const resolvedNextDigits = resolveSeriesNextDigits(resolvedSeriesRow);
    const resolvedSeriesId = String(resolvedSeriesRow?.id || resolvedSeriesRow?._id || "").trim();
    const currentSeriesId = String(quoteSeriesRow?.id || quoteSeriesRow?._id || "").trim();
    const nextQuoteNumber = buildQuoteNumber(resolvedPrefix, resolvedNextDigits);

    if (
      currentSeriesId === resolvedSeriesId &&
      quotePrefix === resolvedPrefix &&
      quoteNextNumber === resolvedNextDigits &&
      formData.quoteNumber === nextQuoteNumber
    ) {
      return;
    }

    setQuoteSeriesRow(resolvedSeriesRow);
    setQuotePrefix(resolvedPrefix);
    setQuoteNextNumber(resolvedNextDigits);
    setFormData((prev) => ({ ...prev, quoteNumber: nextQuoteNumber }));
  }, [
    isEditMode,
    quoteNumberMode,
    quoteSeriesRows,
    formData.selectedLocation,
    quoteSeriesRow,
    quotePrefix,
    quoteNextNumber,
    formData.quoteNumber,
  ]);

  // Centralized totals calculation
  useEffect(() => {
    setFormData(prev => {
      const totals = calculateAllTotals(prev.items, prev);

      // Only update if values actually changed to avoid unnecessary re-renders
      if (
        prev.subTotal === totals.subTotal &&
        prev.totalTax === totals.totalTax &&
        prev.total === totals.total &&
        prev.roundOff === totals.roundOff
      ) {
        return prev;
      }

      return {
        ...prev,
        ...totals
      };
    });
  }, [formData.items, formData.discount, formData.discountType, formData.shippingCharges, formData.shippingChargeTax, formData.adjustment, formData.taxExclusive, taxes, taxMode]);

  useEffect(() => {
    setFormData(prev => {
      const next = { ...prev };
      if (!showTransactionDiscount && !isEditMode) {
        next.discount = 0;
        next.discountType = "percent";
      }
      if (!showShippingCharges && !isEditMode) {
        next.shippingCharges = 0;
        next.shippingChargeTax = "";
      }
      if (!showAdjustment && !isEditMode) {
        next.adjustment = 0;
      }
      if (taxMode === "inclusive") {
        next.taxExclusive = "Tax Inclusive";
      } else if (taxMode === "exclusive") {
        next.taxExclusive = "Tax Exclusive";
      }
      return next;
    });
  }, [showTransactionDiscount, showShippingCharges, showAdjustment, taxMode, isEditMode]);

  useEffect(() => {
    if (!isTaxPreferenceLocked) return;
    setIsTaxPreferenceDropdownOpen(false);
    setTaxPreferenceSearch("");
    setFormData(prev => {
      if (prev.taxExclusive === resolvedTaxPreference) return prev;
      return { ...prev, taxExclusive: resolvedTaxPreference };
    });
  }, [isTaxPreferenceLocked, resolvedTaxPreference]);

  // Load quote data when in edit mode (after salespersons are loaded)
  useEffect(() => {
    const loadQuote = async () => {
      if (isEditMode && quoteId && salespersons.length >= 0) {
        setIsLoading(true);
        try {
          let quote = await getQuoteById(quoteId);

          // Try numeric ID if not found
          if (!quote && !isNaN(parseInt(quoteId))) {
            quote = await getQuoteById(String(parseInt(quoteId)));
          }

          // Fallback: if not found, try matching by quoteNumber
          if (!quote) {
            const quotes = await getQuotes();
            quote = quotes.find(q => q.quoteNumber === quoteId);
          }

          if (quote) {
            // Format dates for display
            const formatDateForInput = (dateString: any) => {
              if (!dateString) return "";
              try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return "";
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              } catch (error) {
                console.error("Error formatting date:", error);
                return "";
              }
            };

            // Map quote items to form items format
            // Map quote items to form items format
            const mappedItems = (quote.items || []).map((item: any, index: number) => {
              const quantity = parseFloat(item.quantity) || 1;
              const rate = parseFloat(item.unitPrice || item.rate || item.price) || 0;
              const amount = parseFloat(item.total || item.amount || (quantity * rate)) || 0;
              const rawTaxSource =
                item?.taxId ??
                (item?.tax && typeof item.tax === "object"
                  ? (
                    item.tax?._id ||
                    item.tax?.id ||
                    item.tax?.taxId ||
                    item.tax?.name ||
                    item.tax?.taxName ||
                    item.tax?.rate ||
                    (typeof item.tax?.toString === "function" ? item.tax.toString() : "")
                  )
                  : item?.tax) ??
                item?.taxName ??
                item?.taxLabel ??
                item?.salesTaxRate ??
                item?.taxRate ??
                "";
              const normalizedRawTax = String(rawTaxSource || "").trim() === "[object Object]" ? "" : rawTaxSource;
              const parsedTaxRate = parseFloat(String(
                item?.taxRate ??
                item?.salesTaxRate ??
                (item?.tax && typeof item.tax === "object" ? item.tax?.rate : item?.tax) ??
                0
              )) || 0;
              const explicitTaxAmount = parseFloat(String(item?.taxAmount ?? 0)) || 0;
              const derivedTaxRate = parsedTaxRate > 0
                ? parsedTaxRate
                : (amount > 0 && explicitTaxAmount > 0 ? (explicitTaxAmount / amount) * 100 : 0);
              const matchedTax = (() => {
                const candidate = String(normalizedRawTax || "").trim();
                if (!candidate) return null;
                const byId = taxes.find((t: any) => String(t.id || t._id) === candidate);
                if (byId) return byId;
                const byName = taxes.find((t: any) => String(t.name || t.taxName || "").toLowerCase() === candidate.toLowerCase());
                if (byName) return byName;
                const asRate = parseFloat(candidate.replace("%", ""));
                if (Number.isFinite(asRate) && asRate > 0) {
                  return taxes.find((t: any) => Number(t.rate || 0) === asRate) || null;
                }
                return null;
              })();
              const resolvedTaxId = matchedTax ? String((matchedTax as any).id || (matchedTax as any)._id || "") : "";
              const resolvedTaxRate = matchedTax ? (Number((matchedTax as any).rate) || derivedTaxRate) : derivedTaxRate;

              return {
                id: item.item?._id || item.item?.id || item.item || item._id || item.id || index + 1, // Map product ID if available
                itemType: item.itemType || "item",
                itemDetails: item.item?.name || item.item?.itemName || item.name || item.itemName || item.itemDetails || "",
                name: item.item?.name || item.item?.itemName || item.name || item.itemName || "",
                quantity,
                rate,
                tax: String(resolvedTaxId || normalizedRawTax || (resolvedTaxRate > 0 ? resolvedTaxRate : "")),
                taxRate: resolvedTaxRate,
                amount,
                description: item.description || "",
                reportingTags: Array.isArray((item as any).reportingTags) ? (item as any).reportingTags : []
              };
            });

            const subTotalValue = resolveSubtotalFromQuoteLike(quote, mappedItems);
            const totalTaxValue = toNumberSafe(quote.totalTax ?? quote.taxAmount ?? quote.tax);
            const normalizedDiscount = normalizeDiscountForForm(quote, subTotalValue, totalTaxValue);

            // Get customer name - check both customer and customerName fields
            const customerName = quote.customerName || quote.customer || "";

            setFormData(prev => ({
              ...prev,
              customerName: customerName,
              selectedLocation: (quote as any).selectedLocation || (quote as any).location || prev.selectedLocation,
              selectedPriceList: (quote as any).selectedPriceList || (quote as any).priceList || (quote as any).priceListName || prev.selectedPriceList,
              quoteNumber: quote.quoteNumber || quote.id || "",
              referenceNumber: quote.referenceNumber || "",
              quoteDate: formatDateForInput(quote.quoteDate || quote.date),
              expiryDate: formatDateForInput(quote.expiryDate),
              salesperson: quote.salesperson || prev.salesperson,
              salespersonId: quote.salespersonId || prev.salespersonId,
              projectName: quote.projectName || prev.projectName,
              subject: quote.subject || prev.subject,
              taxExclusive: quote.taxExclusive || prev.taxExclusive,
              items: mappedItems.length > 0 ? mappedItems : [{ id: 1, itemType: "item", itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0, reportingTags: [] }],
              subTotal: subTotalValue,
              totalTax: totalTaxValue,
              discount: normalizedDiscount.discountValue,
              discountType: normalizedDiscount.discountTypeValue,
              shippingCharges: Number(quote.shippingCharges || 0),
              shippingChargeTax: String((quote as any).shippingChargeTax || (quote as any).shippingTax || ""),
              adjustment: Number(quote.adjustment || 0),
              roundOff: Number(quote.roundOff || 0),
              total: Number(quote.total || quote.amount || 0),
              currency: quote.currency || prev.currency,
              customerNotes: quote.customerNotes || quote.notes || prev.customerNotes,
              termsAndConditions: quote.termsAndConditions || quote.terms || prev.termsAndConditions,
              attachedFiles: quote.attachedFiles || prev.attachedFiles,

              reportingTags: Array.isArray((quote as any).reportingTags) ? (quote as any).reportingTags : prev.reportingTags
            }));

            // Sync calendar state with the loaded dates
            const parsedQuoteDate = new Date(quote.quoteDate || quote.date);
            if (!isNaN(parsedQuoteDate.getTime())) setQuoteDateCalendar(parsedQuoteDate);

            if (quote.expiryDate) {
              const parsedExpiryDate = new Date(quote.expiryDate);
              if (!isNaN(parsedExpiryDate.getTime())) setExpiryDateCalendar(parsedExpiryDate);
            }

            // Set selected customer if exists - check both customer and customerName
            if (customerName) {
              const loadedCustomers = await getCustomers();
              const customer = loadedCustomers.find(c =>
                c.name === customerName || c.name === quote.customer || c.name === quote.customerName
              );
              if (customer) {
                setSelectedCustomer(customer);

                // Load projects for this customer so the dropdown is populated
                const customerId = customer.id || customer._id;
                if (customerId) {
                  try {
                    // Try fetching for specific customer first
                    const customerProjectsResponse = await projectsAPI.getByCustomer(customerId);
                    if (customerProjectsResponse && customerProjectsResponse.success && customerProjectsResponse.data) {
                      setProjects(customerProjectsResponse.data);
                    } else {
                      // Fallback: fetch all and filter
                      const allProjectsResponse = await projectsAPI.getAll();
                      if (allProjectsResponse && allProjectsResponse.success && allProjectsResponse.data) {
                        const customerProjects = allProjectsResponse.data.filter(p =>
                          p.customer?._id === customerId || p.customer === customerId || p.customerId === customerId
                        );
                        setProjects(customerProjects);
                      }
                    }
                  } catch (err) {
                    console.error("Error loading customer projects in edit:", err);
                  }
                }
              }
            }

            // Set selected salesperson if exists
            if (quote.salesperson || quote.salespersonId) {
              // Ensure salespersons are loaded or use the one from quote if needed
              const salesperson = salespersons.find(s =>
                (s.name === quote.salesperson) ||
                (s._id === quote.salespersonId) ||
                (s.id === quote.salespersonId)
              );
              if (salesperson) {
                setSelectedSalesperson(salesperson);
              } else if (quote.salesperson) {
                setSelectedSalesperson({ name: quote.salesperson, _id: quote.salespersonId });
              }
            }

            // Set selected project if exists
            if (quote.projectName || quote.projectId) {
              // Load projects and find matching project
              try {
                const projectsResponse = await projectsAPI.getAll();
                if (projectsResponse && projectsResponse.success && projectsResponse.data) {
                  const project = projectsResponse.data.find(p =>
                    (quote.projectId && (p._id === quote.projectId || p.id === quote.projectId)) ||
                    ((p.projectName || p.name) === quote.projectName)
                  );
                  if (project) {
                    setSelectedProject(project);
                    setFormData(prev => ({ ...prev, projectName: project.projectName || project.name }));
                  }
                } else {
                  const loadedProjects = await getProjects();
                  const project = loadedProjects.find(p =>
                    (quote.projectId && (p._id === quote.projectId || p.id === quote.projectId)) ||
                    ((p.projectName || p.name) === quote.projectName)
                  );
                  if (project) {
                    setSelectedProject(project);
                    setFormData(prev => ({ ...prev, projectName: project.projectName || project.name }));
                  }
                }
              } catch (error) {
                console.error("Error loading projects for matching:", error);
                const loadedProjects = await getProjects();
                const project = loadedProjects.find(p =>
                  (quote.projectId && (p._id === quote.projectId || p.id === quote.projectId)) ||
                  ((p.projectName || p.name) === quote.projectName)
                );
                if (project) {
                  setSelectedProject(project);
                  setFormData(prev => ({ ...prev, projectName: project.projectName || project.name }));
                }
              }
            }
          } else {
            console.error("Quote not found with ID:", quoteId);
          }
        } catch (error) {
          console.error("Error loading quote for edit:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadQuote();
  }, [isEditMode, quoteId, salespersons]);

  // Handle selected project when returning from new project form
  useEffect(() => {
    const fetchAndSetProject = async () => {
      if (location.state?.selectedProject) {
        const projectName = location.state.selectedProject;
        // Load projects and find the newly created project
        try {
          const loadedProjects = await getProjects();
          if (Array.isArray(loadedProjects)) {
            const project = loadedProjects.find(p =>
              (p.projectName || p.name) === projectName
            );
            if (project) {
              setSelectedProject(project);
              setFormData(prev => ({
                ...prev,
                projectName: project.projectName || project.name
              }));
            }
          }
        } catch (error) {
          console.error("Error loading project after creation:", error);
        }
        // Clear the state to avoid re-selecting on re-render
        navigate(location.pathname, { replace: true, state: {} });
      }
    };
    fetchAndSetProject();
  }, [location.state?.selectedProject, navigate, location.pathname]);

  useEffect(() => {
    if (prefillFromProjectRef.current) return;
    if (isEditMode) return;
    const state = location.state as any;
    if (!state || state.source !== "timeTrackingProjects") return;

    const customerId = String(state.customerId || state.project?.customerId || "").trim();
    const customerName = String(state.customerName || state.project?.customerName || "").trim();
    const projectId = String(state.projectId || state.project?.id || state.project?.projectId || "").trim();
    const projectName = String(state.projectName || state.project?.projectName || state.project?.name || "").trim();
    const currency = String(state.currency || "").trim();
    const rawProjects = Array.isArray(state.projects) ? state.projects : [];

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
        setSelectedCustomer({ id: customerId || undefined, name: customerName, displayName: customerName } as any);
      }

      if (customerId) {
        setSelectedCustomerIdForProjects(customerId);
      }

      setFormData((prev: any) => ({
        ...prev,
        customerName: customerName || prev.customerName,
        currency: currency || prev.currency,
      }));
    }

    if (projectName) {
      setFormData((prev: any) => ({
        ...prev,
        projectName: projectName || prev.projectName,
      }));
    }

    if (rawProjects.length > 0) {
      const mappedItems = rawProjects.map((project: any, index: number) => {
        const method = String(project?.billingMethod || "").toLowerCase();
        const rateSource =
          method === "fixed"
            ? project?.totalProjectCost ?? project?.billingRate ?? project?.rate ?? 0
            : project?.billingRate ?? project?.rate ?? 0;
        const rate = Number(rateSource) || 0;
        const quantity = 1;
        const projectRef = project?.id || project?.projectId || project?.project || "";
        return {
          id: Date.now() + index,
          itemType: "item",
          itemDetails: project?.projectName || project?.name || "Project",
          quantity,
          rate,
          tax: "",
          taxRate: 0,
          amount: rate * quantity,
          description: project?.description || "",
          stockOnHand: 0,
          reportingTags: [],
          projectId: projectRef,
          project: projectRef,
          projectName: project?.projectName || project?.name || "",
        };
      });

      setFormData((prev: any) => ({
        ...prev,
        items: mappedItems.length > 0 ? mappedItems : prev.items,
        currency: currency || prev.currency,
      }));
    }

    if (projectId || projectName) {
      const matchedProject =
        projects.find((p: any) => (projectId && String(p?._id || p?.id || "") === projectId)) ||
        projects.find(
          (p: any) =>
            String(p?.projectName || p?.name || "").trim().toLowerCase() === projectName.toLowerCase()
        );
      if (matchedProject) {
        setSelectedProject(matchedProject);
      }
    }

    prefillFromProjectRef.current = true;
  }, [location.state, customers, projects, isEditMode]);

  useEffect(() => {
    if (prefillFromProjectRef.current) return;
    if (isEditMode) return;

    const state = location.state as any;
    if (!state || state.source) return;

    const customerId = String(state.customerId || state.customer?._id || state.customer?.id || "").trim();
    const customerName = String(
      state.customerName ||
        state.customer?.displayName ||
        state.customer?.companyName ||
        state.customer?.name ||
        ""
    ).trim();

    if (!customerId && !customerName) return;

    const matchedCustomer =
      (customerId
        ? customers.find((c: any) => String(c?.id || c?._id || "") === customerId)
        : null) ||
      customers.find(
        (c: any) =>
          String(c?.name || c?.displayName || c?.companyName || "")
            .trim()
            .toLowerCase() === customerName.toLowerCase()
      );

    if (matchedCustomer) {
      setSelectedCustomer(matchedCustomer);
    } else {
      setSelectedCustomer({
        id: customerId || undefined,
        _id: customerId || undefined,
        name: customerName,
        displayName: customerName,
        companyName: customerName,
      } as any);
    }

    if (customerName) {
      setFormData((prev: any) => ({
        ...prev,
        customerName: prev.customerName || customerName,
      }));
    }
  }, [location.state, customers, isEditMode]);

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDateOnly = (value: Date) => {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const isPastDate = (value: Date) => {
    const today = getDateOnly(new Date());
    const selected = getDateOnly(value);
    return selected.getTime() < today.getTime();
  };

  // Format date for display in input field (e.g., "28 Dec 2025")
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      // Parse dd/MM/yyyy format
      const parts = dateString.split("/");
      if (parts.length !== 3) return dateString;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return dateString;

      const dayStr = String(date.getDate()).padStart(2, "0");
      const monthStr = months[date.getMonth()];
      const yearStr = date.getFullYear();
      return `${dayStr} ${monthStr} ${yearStr}`;
    } catch (error) {
      return dateString;
    }
  };

  // Convert DD/MM/YYYY to ISO date string for API
  const convertToISODate = (dateString) => {
    if (!dateString) return null;
    try {
      // Parse dd/MM/yyyy format
      const parts = dateString.split("/");
      if (parts.length !== 3) return null;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      console.error("Error converting date to ISO:", error);
      return null;
    }
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

  const handleDateSelect = (date, type) => {

    const formatted = formatDate(date);
    setFormData(prev => ({
      ...prev,
      [type]: formatted
    }));

    // Clear validation error if any
    if (formErrors[type]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[type];
        return newErrors;
      });
    }

    if (type === 'quoteDate') {
      setIsQuoteDatePickerOpen(false);
      setQuoteDateCalendar(date);
    } else {
      setIsExpiryDatePickerOpen(false);
      setExpiryDateCalendar(date);
    }
  };

  const navigateMonth = (direction, type) => {
    const calendar = type === 'quoteDate' ? quoteDateCalendar : expiryDateCalendar;
    const setCalendar = type === 'quoteDate' ? setQuoteDateCalendar : setExpiryDateCalendar;
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
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(event.target as Node)) {
        setIsSalespersonDropdownOpen(false);
      }
      if (quoteDatePickerRef.current && !quoteDatePickerRef.current.contains(event.target as Node)) {
        setIsQuoteDatePickerOpen(false);
      }
      if (expiryDatePickerRef.current && !expiryDatePickerRef.current.contains(event.target as Node)) {
        setIsExpiryDatePickerOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (taxPreferenceDropdownRef.current && !taxPreferenceDropdownRef.current.contains(event.target as Node)) {
        setIsTaxPreferenceDropdownOpen(false);
      }
      if (priceListDropdownRef.current && !priceListDropdownRef.current.contains(event.target as Node)) {
        setIsPriceListDropdownOpen(false);
      }

      // Handle item dropdowns
      Object.keys(openItemDropdowns).forEach(itemId => {
        if (openItemDropdowns[itemId]) {
          const ref = itemDropdownRefs.current[itemId];
          if (ref && !ref.contains(event.target as Node)) {
            setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });
      // Handle tax dropdowns
      Object.keys(openTaxDropdowns).forEach(itemId => {
        if (openTaxDropdowns[itemId]) {
          const ref = taxDropdownRefs.current[itemId];
          if (ref && !ref.contains(event.target as Node)) {
            setOpenTaxDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });
      // Handle item menu dropdowns
      if (openItemMenuId !== null) {
        const ref = itemMenuRefs.current[String(openItemMenuId)];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenItemMenuId(null);
        }
      }

      // Handle bulk actions dropdown
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target)) {
        setIsBulkActionsOpen(false);
      }

      // Handle upload dropdown
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target)) {
        setIsUploadDropdownOpen(false);
      }
    };

    const hasOpenDropdown = isCustomerDropdownOpen || isSalespersonDropdownOpen ||
      isQuoteDatePickerOpen || isExpiryDatePickerOpen || isProjectDropdownOpen ||
      isTaxPreferenceDropdownOpen || isPriceListDropdownOpen ||
      Object.values(openItemDropdowns).some(Boolean) || Object.values(openTaxDropdowns).some(Boolean) || openItemMenuId !== null || isBulkActionsOpen || isUploadDropdownOpen;

    if (hasOpenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerDropdownOpen, isSalespersonDropdownOpen, isQuoteDatePickerOpen, isExpiryDatePickerOpen, isProjectDropdownOpen, isTaxPreferenceDropdownOpen, isPriceListDropdownOpen, openItemDropdowns, openTaxDropdowns, openItemMenuId, isBulkActionsOpen, isUploadDropdownOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value
      };

      // Recalculate totals
      const totals = calculateAllTotals(updated.items, updated);

      return {
        ...updated,
        ...totals
      };
    });
  };

  const handleCustomerSelect = (customer) => {
    const customerId = customer.id || customer._id;
    const customerName = customer.name || customer.displayName || customer.companyName;
    const currentPriceListName = normalizeSelectedPriceListName(formData.selectedPriceList);
    const customerPriceListDefault = resolveCustomerPriceListDefault(customer);
    const nextCustomerPriceListName = normalizeSelectedPriceListName(customerPriceListDefault.name);
    const hadExistingCustomerOrPriceList = Boolean(selectedCustomer) || Boolean(currentPriceListName);
    const shouldPromptForPriceListChange =
      hadExistingCustomerOrPriceList &&
      Boolean(currentPriceListName || nextCustomerPriceListName) &&
      currentPriceListName !== nextCustomerPriceListName;

    setSelectedCustomer(customer);
    const customerTaxMeta = getCustomerTaxMeta(customer);

    setFormData(prev => {
      const customerCurrency = (customer.currency || prev.currency || "USD").split(' - ')[0];
      const nextPriceListName = shouldPromptForPriceListChange
        ? normalizeSelectedPriceListName(prev.selectedPriceList)
        : (nextCustomerPriceListName || normalizeSelectedPriceListName(prev.selectedPriceList));
      const nextCurrency = shouldPromptForPriceListChange
        ? prev.currency
        : (customerPriceListDefault.currency || customerCurrency);

      // Tax auto-select rules:
      // - If customer has a tax configured -> override item tax with customer's tax.
      // - Else -> keep whatever the user already selected.
      // - If nothing selected -> apply a default tax (first active from Taxes list).
      const fallbackDefaultTax = defaultTaxId ? getTaxMetaById(defaultTaxId) : { taxId: "", taxRate: 0 };
      const updatedItems = (prev.items || []).map((row: any) => {
        if (row?.itemType === "header") return row;

        if (customerTaxMeta.taxId) {
          return { ...row, tax: customerTaxMeta.taxId, taxRate: customerTaxMeta.taxRate };
        }

        const hasUserTax = Boolean(String(row?.tax || "").trim()) || parseTaxRate(row?.taxRate) > 0;
        if (hasUserTax) return row;

        if (fallbackDefaultTax.taxId) {
          return { ...row, tax: fallbackDefaultTax.taxId, taxRate: fallbackDefaultTax.taxRate };
        }

        return row;
      });

      const nextState = {
        ...prev,
        customerName: customerName,
        selectedPriceList: nextPriceListName || "Select Price List",
        currency: nextCurrency,
        items: updatedItems,
      };
      const totals = calculateAllTotals(updatedItems, nextState);
      return { ...nextState, ...totals };
    });

    if (shouldPromptForPriceListChange) {
      setPriceListSwitchDialog({
        customerName,
        currentPriceListName,
        nextPriceListName: nextCustomerPriceListName,
        customerCurrency: String(customer?.currency || formData.currency || "USD").split(" - ")[0],
        nextPriceListCurrency: customerPriceListDefault.currency || "",
      });
    } else {
      setPriceListSwitchDialog(null);
    }

    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");

    // Clear validation error if any
    if (formErrors.customerName) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.customerName;
        return newErrors;
      });
    }


    // Auto-fill billing address if customer has one
    if (customer.billingAddress) {
      setBillingAddress({
        attention: customer.billingAddress.attention || customer.billingAttention || "",
        street1: customer.billingAddress.street1 || customer.billingStreet1 || "",
        street2: customer.billingAddress.street2 || customer.billingStreet2 || "",
        city: customer.billingAddress.city || customer.billingCity || "",
        state: customer.billingAddress.state || customer.billingState || "",
        zipCode: customer.billingAddress.zipCode || customer.billingZipCode || "",
        country: customer.billingAddress.country || customer.billingCountry || "",
        phone: customer.billingAddress.phone || customer.billingPhone || ""
      });
    } else if (customer.billingStreet1 || customer.billingCity || customer.billingCountry) {
      // Fallback: check if billing fields are directly on customer object
      setBillingAddress({
        attention: customer.billingAttention || "",
        street1: customer.billingStreet1 || "",
        street2: customer.billingStreet2 || "",
        city: customer.billingCity || "",
        state: customer.billingState || "",
        zipCode: customer.billingZipCode || "",
        country: customer.billingCountry || "",
        phone: customer.billingPhone || ""
      });
    } else {
      setBillingAddress(null);
    }

    // Auto-fill shipping address if customer has one
    if (customer.shippingAddress) {
      setShippingAddress({
        attention: customer.shippingAddress.attention || customer.shippingAttention || "",
        street1: customer.shippingAddress.street1 || customer.shippingStreet1 || "",
        street2: customer.shippingAddress.street2 || customer.shippingStreet2 || "",
        city: customer.shippingAddress.city || customer.shippingCity || "",
        state: customer.shippingAddress.state || customer.shippingState || "",
        zipCode: customer.shippingAddress.zipCode || customer.shippingZipCode || "",
        country: customer.shippingAddress.country || customer.shippingCountry || "",
        phone: customer.shippingAddress.phone || customer.shippingPhone || ""
      });
    } else if (customer.shippingStreet1 || customer.shippingCity || customer.shippingCountry) {
      // Fallback: check if shipping fields are directly on customer object
      setShippingAddress({
        attention: customer.shippingAttention || "",
        street1: customer.shippingStreet1 || "",
        street2: customer.shippingStreet2 || "",
        city: customer.shippingCity || "",
        state: customer.shippingState || "",
        zipCode: customer.shippingZipCode || "",
        country: customer.shippingCountry || "",
        phone: customer.shippingPhone || ""
      });
    } else {
      setShippingAddress(null);
    }

    // Load contact persons for this customer
    if (customerId) {
      loadCustomerContactPersons(customerId);
    } else {
      setContactPersons([]);
    }

    // Load projects for this customer so the dropdown is populated
    if (customerId) {
      try {
        loadProjectsForCustomer(customerId);
      } catch (err) {
        console.error("Error loading customer projects:", err);
      }
    }
  };

  const customerDefaultsAppliedRef = useRef<{
    customerId: string;
    taxApplied: boolean;
    priceListFetchTriggered: boolean;
  }>({ customerId: "", taxApplied: false, priceListFetchTriggered: false });

  useEffect(() => {
    if (!selectedCustomer) {
      customerDefaultsAppliedRef.current = { customerId: "", taxApplied: false, priceListFetchTriggered: false };
      return;
    }

    const selectedCustomerId = String((selectedCustomer as any)?.id || (selectedCustomer as any)?._id || "").trim();
    if (!selectedCustomerId) return;

    if (customerDefaultsAppliedRef.current.customerId !== selectedCustomerId) {
      customerDefaultsAppliedRef.current = { customerId: selectedCustomerId, taxApplied: false, priceListFetchTriggered: false };
    }

    const customerPriceListId = String((selectedCustomer as any)?.priceListId || (selectedCustomer as any)?.priceListID || (selectedCustomer as any)?.price_list_id || "").trim();
    const customerPriceListNameRaw = String((selectedCustomer as any)?.priceListName || (selectedCustomer as any)?.priceList || (selectedCustomer as any)?.price_list || "").trim();

    if ((customerPriceListId || customerPriceListNameRaw) && catalogPriceListsRaw.length === 0 && !customerDefaultsAppliedRef.current.priceListFetchTriggered) {
      customerDefaultsAppliedRef.current.priceListFetchTriggered = true;
      try {
        loadCatalogPriceLists();
      } catch {
        // ignore
      }
    }

    if (!customerDefaultsAppliedRef.current.taxApplied) {
      const customerTaxMeta = getCustomerTaxMeta(selectedCustomer);
      if (customerTaxMeta.taxId) {
        setFormData((prev) => {
          const updatedItems = (prev.items || []).map((row: any) => {
            if (row?.itemType === "header") return row;
            const currentTaxId = String(row?.tax || "").trim();
            const currentTaxRate = parseTaxRate(row?.taxRate);
            if (currentTaxId === customerTaxMeta.taxId && currentTaxRate === customerTaxMeta.taxRate) return row;
            return { ...row, tax: customerTaxMeta.taxId, taxRate: customerTaxMeta.taxRate };
          });

          const totals = calculateAllTotals(updatedItems, prev);
          return { ...prev, items: updatedItems, ...totals };
        });
        customerDefaultsAppliedRef.current.taxApplied = true;
      }
    }
  }, [selectedCustomer, catalogPriceListsRaw, taxes]);

  const openAddressModal = (type: "billing" | "shipping") => {
    const source = type === "billing" ? billingAddress : shippingAddress;
    setAddressModalType(type);
    setAddressFormData({
      attention: source?.attention || "",
      country: source?.country || "",
      street1: source?.street1 || "",
      street2: source?.street2 || "",
      city: source?.city || "",
      state: source?.state || "",
      zipCode: source?.zipCode || "",
      phoneCountryCode: source?.phoneCountryCode || "",
      phone: source?.phone || "",
      fax: source?.fax || ""
    });
    setIsPhoneCodeDropdownOpen(false);
    setPhoneCodeSearch("");
    setIsCountryDropdownOpen(false);
    setCountrySearch("");
    setIsAddressModalOpen(true);
  };

  const handleAddressFieldChange = (e: any) => {
    const { name, value } = e.target;
    setAddressFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSaveAddress = async () => {
    if (!selectedCustomer) return;
    const customerId = String((selectedCustomer as any).id || (selectedCustomer as any)._id || "");
    if (!customerId) return;

    const addressPayload = {
      attention: String(addressFormData.attention || "").trim(),
      country: String(addressFormData.country || "").trim(),
      street1: String(addressFormData.street1 || "").trim(),
      street2: String(addressFormData.street2 || "").trim(),
      city: String(addressFormData.city || "").trim(),
      state: String(addressFormData.state || "").trim(),
      zipCode: String(addressFormData.zipCode || "").trim(),
      phone: `${String(addressFormData.phoneCountryCode || "").trim()} ${String(addressFormData.phone || "").trim()}`.trim(),
      fax: String(addressFormData.fax || "").trim(),
      phoneCountryCode: String(addressFormData.phoneCountryCode || "").trim()
    };

    setIsAddressSaving(true);
    try {
      const patch =
        addressModalType === "billing"
          ? { billingAddress: addressPayload }
          : { shippingAddress: addressPayload };

      await customersAPI.update(customerId, patch);

      setCustomers((prev: any[]) =>
        prev.map((customer: any) => {
          const id = String(customer.id || customer._id || "");
          if (id !== customerId) return customer;
          return {
            ...customer,
            ...(addressModalType === "billing"
              ? { billingAddress: addressPayload }
              : { shippingAddress: addressPayload })
          };
        })
      );

      setSelectedCustomer((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(addressModalType === "billing"
            ? { billingAddress: addressPayload }
            : { shippingAddress: addressPayload })
        };
      });

      if (addressModalType === "billing") setBillingAddress(addressPayload);
      else setShippingAddress(addressPayload);

      setIsAddressModalOpen(false);
    } catch (error) {
      console.error(`Failed to save ${addressModalType} address:`, error);
      alert("Failed to save address. Please try again.");
    } finally {
      setIsAddressSaving(false);
    }
  };

  const countryOptions = useMemo(() => Country.getAllCountries(), []);
  const filteredCountryOptions = useMemo(() => {
    const query = String(countrySearch || "").trim().toLowerCase();
    if (!query) return countryOptions;
    return countryOptions.filter((country: any) =>
      String(country.name || "").toLowerCase().includes(query) ||
      String(country.isoCode || "").toLowerCase().includes(query)
    );
  }, [countryOptions, countrySearch]);
  const phoneCountryOptions = useMemo(
    () =>
      countryOptions
        .filter((country: any) => String(country.phonecode || "").trim().length > 0)
        .map((country: any) => ({
          name: String(country.name || ""),
          isoCode: String(country.isoCode || ""),
          phoneCode: `+${String(country.phonecode || "").trim()}`
        })),
    [countryOptions]
  );
  const filteredPhoneCountryOptions = useMemo(() => {
    const query = String(phoneCodeSearch || "").trim().toLowerCase();
    if (!query) return phoneCountryOptions;
    return phoneCountryOptions.filter((country: any) =>
      country.name.toLowerCase().includes(query) ||
      country.phoneCode.toLowerCase().includes(query) ||
      country.isoCode.toLowerCase().includes(query)
    );
  }, [phoneCodeSearch, phoneCountryOptions]);
  const selectedAddressCountryIso = useMemo(() => {
    const raw = String(addressFormData.country || "").trim();
    if (!raw) return "";
    if (raw.length === 2) return raw.toUpperCase();
    const match = countryOptions.find((country: any) => String(country.name || "").toLowerCase() === raw.toLowerCase());
    return match?.isoCode || "";
  }, [addressFormData.country, countryOptions]);
  const stateOptions = useMemo(() => {
    if (!selectedAddressCountryIso) return [];
    return State.getStatesOfCountry(selectedAddressCountryIso);
  }, [selectedAddressCountryIso]);

  useEffect(() => {
    if (!addressFormData.state) return;
    if (stateOptions.length === 0) return;
    const exists = stateOptions.some((state: any) => String(state.name || "").toLowerCase() === String(addressFormData.state || "").toLowerCase());
    if (!exists) {
      setAddressFormData((prev: any) => ({ ...prev, state: "" }));
    }
  }, [addressFormData.state, stateOptions]);

  useEffect(() => {
    if (!isPhoneCodeDropdownOpen) return;
    const handleOutsideClick = (event: any) => {
      if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target)) {
        setIsPhoneCodeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isPhoneCodeDropdownOpen]);

  useEffect(() => {
    if (!isCountryDropdownOpen) return;
    const handleOutsideClick = (event: any) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCountryDropdownOpen]);

  useEffect(() => {
    if (addressFormData.phoneCountryCode) return;
    const country = countryOptions.find(
      (entry: any) => String(entry.name || "").toLowerCase() === String(addressFormData.country || "").toLowerCase()
    );
    if (country?.phonecode) {
      setAddressFormData((prev: any) => ({ ...prev, phoneCountryCode: `+${country.phonecode}` }));
    }
  }, [addressFormData.country, addressFormData.phoneCountryCode, countryOptions]);

  const reloadCustomersForQuote = async () => {
    try {
      const list = await getCustomers();
      const normalizedCustomers = (list || []).map((c: any) => ({
        ...c,
        id: c._id || c.id,
        name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
      }));
      const activeCustomers = normalizedCustomers.filter(isCustomerActive);
      setCustomers(activeCustomers);
      return activeCustomers;
    } catch (error) {
      console.error("Error refreshing customers after quick action:", error);
      return [];
    }
  };

  const reloadProjectsForQuote = async () => {
    try {
      const loadedProjects = await getProjects();
      const normalizedProjects = Array.isArray(loadedProjects) ? loadedProjects : [];
      setProjects(normalizedProjects);
      return normalizedProjects;
    } catch (error) {
      console.error("Error refreshing projects after quick action:", error);
      setProjects([]);
      return [];
    }
  };

  const getEntityId = (entity: any) => String(entity?.id || entity?._id || "");

  const pickNewestEntity = (entities: any[]) => {
    if (!entities.length) return null;
    const toTime = (value: any) => {
      const t = new Date(value || 0).getTime();
      return Number.isFinite(t) ? t : 0;
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

  const openCustomerQuickAction = async () => {
    setIsCustomerDropdownOpen(false);
    setIsRefreshingCustomersQuickAction(true);
    const latestCustomers = await reloadCustomersForQuote();
    setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
    setIsRefreshingCustomersQuickAction(false);
    setIsNewCustomerQuickActionOpen(true);
  };

  const closeCustomerQuickAction = () => {
    setIsNewCustomerQuickActionOpen(false);
    reloadCustomersForQuote();
  };

  const openProjectQuickAction = async () => {
    setIsProjectDropdownOpen(false);
    setIsRefreshingProjectsQuickAction(true);
    const latestProjects = await reloadProjectsForQuote();
    setProjectQuickActionBaseIds(latestProjects.map((p: any) => getEntityId(p)).filter(Boolean));
    setIsRefreshingProjectsQuickAction(false);
    setIsNewProjectQuickActionOpen(true);
  };

  const tryAutoSelectNewCustomerFromQuickAction = async () => {
    if (!isNewCustomerQuickActionOpen || isAutoSelectingCustomerFromQuickAction) return;
    setIsAutoSelectingCustomerFromQuickAction(true);
    try {
      const latestCustomers = await reloadCustomersForQuote();
      const baselineIds = new Set(customerQuickActionBaseIds);
      const newCustomers = latestCustomers.filter((c: any) => {
        const id = getEntityId(c);
        return id && !baselineIds.has(id);
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

  const tryAutoSelectNewProjectFromQuickAction = async () => {
    if (!isNewProjectQuickActionOpen || isAutoSelectingProjectFromQuickAction) return;
    setIsAutoSelectingProjectFromQuickAction(true);
    try {
      const latestProjects = await reloadProjectsForQuote();
      const baselineIds = new Set(projectQuickActionBaseIds);
      const newProjects = latestProjects.filter((p: any) => {
        const id = getEntityId(p);
        return id && !baselineIds.has(id);
      });

      if (newProjects.length > 0) {
        const newlyCreatedProject = pickNewestEntity(newProjects) || newProjects[newProjects.length - 1];
        handleProjectSelect(newlyCreatedProject);
        setProjectQuickActionBaseIds(latestProjects.map((p: any) => getEntityId(p)).filter(Boolean));
        setIsNewProjectQuickActionOpen(false);
      }
    } finally {
      setIsAutoSelectingProjectFromQuickAction(false);
    }
  };

  const handleQuickActionCustomerCreated = (customerFromMessage: any) => {
    if (!customerFromMessage) return;
    const normalizedCustomer = {
      ...customerFromMessage,
      id: customerFromMessage?._id || customerFromMessage?.id,
      name: customerFromMessage?.displayName || customerFromMessage?.name || customerFromMessage?.companyName || "Unknown"
    };
    const normalizedId = getEntityId(normalizedCustomer);
    setCustomers(prev => {
      if (!normalizedId) return prev;
      const existingIndex = prev.findIndex((c: any) => getEntityId(c) === normalizedId);
      if (existingIndex === -1) {
        return [...prev, normalizedCustomer];
      }
      const updated = [...prev];
      updated[existingIndex] = { ...updated[existingIndex], ...normalizedCustomer };
      return updated;
    });
    handleCustomerSelect(normalizedCustomer as any);
    setIsNewCustomerQuickActionOpen(false);
    setCustomerQuickActionBaseIds(prev => (normalizedId ? Array.from(new Set([...prev, normalizedId])) : prev));
  };

  const handleQuickActionProjectCreated = (projectFromMessage: any) => {
    if (!projectFromMessage) return;
    const normalizedProject = {
      ...projectFromMessage,
      id: projectFromMessage?._id || projectFromMessage?.id,
    };
    const normalizedId = getEntityId(normalizedProject);
    setProjects(prev => {
      if (!normalizedId) return prev;
      const existingIndex = prev.findIndex((p: any) => getEntityId(p) === normalizedId);
      if (existingIndex === -1) {
        return [...prev, normalizedProject as any];
      }
      const updated = [...prev];
      updated[existingIndex] = { ...updated[existingIndex], ...normalizedProject };
      return updated;
    });
    handleProjectSelect(normalizedProject as any);
    setIsNewProjectQuickActionOpen(false);
    setProjectQuickActionBaseIds(prev => (normalizedId ? Array.from(new Set([...prev, normalizedId])) : prev));
  };

  useEffect(() => {
    const handleQuickActionCreatedMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload) return;

      if (payload.type === "quick-action-cancel") {
        if (payload.entity === "customer") {
          setIsNewCustomerQuickActionOpen(false);
        }
        if (payload.entity === "project") {
          setIsNewProjectQuickActionOpen(false);
        }
        return;
      }

      if (payload.type !== "quick-action-created") return;

      if (payload.entity === "customer" && isNewCustomerQuickActionOpen) {
        if (payload.data) {
          handleQuickActionCustomerCreated(payload.data);
          await reloadCustomersForQuote();
        } else {
          await tryAutoSelectNewCustomerFromQuickAction();
        }
      }

      if (payload.entity === "project" && isNewProjectQuickActionOpen) {
        if (payload.data) {
          handleQuickActionProjectCreated(payload.data);
          await reloadProjectsForQuote();
        } else {
          await tryAutoSelectNewProjectFromQuickAction();
        }
      }
    };

    window.addEventListener("message", handleQuickActionCreatedMessage);
    return () => {
      window.removeEventListener("message", handleQuickActionCreatedMessage);
    };
  }, [
    isNewCustomerQuickActionOpen,
    isNewProjectQuickActionOpen,
    customerQuickActionBaseIds,
    projectQuickActionBaseIds,
    isAutoSelectingCustomerFromQuickAction,
    isAutoSelectingProjectFromQuickAction
  ]);

  // Load contact persons for selected customer
  const loadCustomerContactPersons = async (customerId) => {
    try {
      const response = await contactPersonsAPI.getAll(customerId);
      if (response && response.success && response.data) {
        setContactPersons(response.data);
      } else {
        setContactPersons([]);
      }
    } catch (error) {
      console.error('Error loading customer contact persons:', error);
      setContactPersons([]);
    }
  };

  // Load all vendor contact persons
  const loadVendorContactPersons = async () => {
    try {
      // Get all vendors first
      const vendorsResponse = await vendorsAPI.getAll();
      if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
        const allContactPersons = [];

        // Load contact persons for each vendor
        for (const vendor of vendorsResponse.data) {
          try {
            const contactResponse = await contactPersonsAPI.getAll(vendor.id || vendor._id);
            if (contactResponse && contactResponse.success && contactResponse.data) {
              // Add vendor info to each contact person
              const vendorContacts = contactResponse.data.map(contact => ({
                ...contact,
                vendorName: vendor.name || vendor.displayName,
                vendorId: vendor.id || vendor._id,
                type: 'vendor'
              }));
              allContactPersons.push(...vendorContacts);
            }
          } catch (error) {
            console.error(`Error loading contact persons for vendor ${vendor.id}:`, error);
          }
        }

        setVendorContactPersons(allContactPersons);
      } else {
        setVendorContactPersons([]);
      }
    } catch (error) {
      console.error('Error loading vendor contact persons:', error);
      setVendorContactPersons([]);
    }
  };

  // Load projects for selected customer
  const loadProjectsForCustomer = async (customerId) => {
    setSelectedCustomerIdForProjects(customerId);
    // We already have all projects in the 'projects' state from initial load.
    // If we want to ensure we have the latest for this customer, we can fetch,
    // but we should append/update instead of replacing if we want to keep others.
    // However, filteredProjects will correctly show what's needed.
    try {
      const projectsResponse = await projectsAPI.getByCustomer(customerId);
      if (projectsResponse && projectsResponse.success && projectsResponse.data) {
        // Update projects list with these items, merging with existing
        setProjects(prev => {
          const existingIds = new Set(prev.map(p => p.id || p._id));
          const newProjects = projectsResponse.data.filter(p => !existingIds.has(p.id || p._id));
          return [...prev, ...newProjects];
        });
      }
    } catch (error) {
      console.error('Error loading projects for customer:', error);
    }
  };

  const handleSalespersonSelect = (salesperson) => {
    setSelectedSalesperson(salesperson);
    setFormData(prev => ({
      ...prev,
      salesperson: salesperson.name || "",
      salespersonId: salesperson.id || salesperson._id || null
    }));
    setIsSalespersonDropdownOpen(false);
    setSalespersonSearch("");
  };

  const filteredCustomers = customers.filter(customer => {
    if (!isCustomerActive(customer)) return false;
    const name = customer.name || customer.displayName || customer.companyName || "";
    const email = customer.email || "";
    return name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      email.toLowerCase().includes(customerSearch.toLowerCase());
  });

  const isSalespersonActive = (salesperson: any) => {
    const status = String(salesperson?.status || "").toLowerCase();
    if (status) return status !== "inactive";
    if (typeof salesperson?.active === "boolean") return salesperson.active;
    if (typeof salesperson?.isActive === "boolean") return salesperson.isActive;
    return true;
  };

  const filteredSalespersons = salespersons.filter((salesperson: any) =>
    isSalespersonActive(salesperson) &&
    String(salesperson.name || salesperson.displayName || "").toLowerCase().includes(salespersonSearch.toLowerCase())
  );

  useEffect(() => {
    const currentName = String(formData.salesperson || "").trim().toLowerCase();
    if (!currentName) return;

    const matched = salespersons.find((salesperson: any) => {
      const salespersonName = String(salesperson.name || salesperson.displayName || "").trim().toLowerCase();
      return salespersonName === currentName;
    });

    if (!matched || !isSalespersonActive(matched)) {
      setSelectedSalesperson(null);
      setFormData((prev: any) => ({
        ...prev,
        salesperson: "",
        salespersonId: "",
      }));
    }
  }, [salespersons, formData.salesperson]);

  const filteredManageSalespersons = salespersons.filter((salesperson: any) => {
    const term = manageSalespersonSearch.toLowerCase().trim();
    if (!term) return true;
    const name = String(salesperson?.name || salesperson?.displayName || "").toLowerCase();
    const email = String(salesperson?.email || "").toLowerCase();
    return name.includes(term) || email.includes(term);
  });
  const manageSalespersonsPageSize = 3;
  const [manageSalespersonsPage, setManageSalespersonsPage] = useState(1);
  const manageSalespersonsTotalPages = Math.max(1, Math.ceil(filteredManageSalespersons.length / manageSalespersonsPageSize));
  const manageSalespersonsCurrentPage = Math.min(manageSalespersonsPage, manageSalespersonsTotalPages);
  const paginatedManageSalespersons = useMemo(() => {
    const startIndex = (manageSalespersonsCurrentPage - 1) * manageSalespersonsPageSize;
    return filteredManageSalespersons.slice(startIndex, startIndex + manageSalespersonsPageSize);
  }, [filteredManageSalespersons, manageSalespersonsCurrentPage]);

  const handleStartNewSalesperson = () => {
    setEditingSalespersonId(null);
    setNewSalespersonData({ name: "", email: "" });
    setManageSalespersonMenuOpen(null);
    setIsNewSalespersonFormOpen(true);
  };

  const handleStartEditSalesperson = (salesperson: any) => {
    const salespersonId = String(salesperson?.id || salesperson?._id || "").trim();
    setEditingSalespersonId(salespersonId || null);
    setNewSalespersonData({
      name: String(salesperson?.name || salesperson?.displayName || ""),
      email: String(salesperson?.email || "")
    });
    setIsNewSalespersonFormOpen(true);
  };

  const handleNewSalespersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSalespersonData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveNewSalesperson = async () => {
    const trimmedName = String(newSalespersonData.name || "").trim();
    const trimmedEmail = String(newSalespersonData.email || "").trim();
    const normalizedName = trimmedName.toLowerCase();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const editingId = String(editingSalespersonId || "").trim();

    if (!trimmedName) {
      toast.error("Please enter a name for the salesperson");
      return;
    }

    try {
      const duplicateSalesperson: any = (salespersons as any[]).find((sp: any) => {
        const spId = String(sp.id || sp._id || "").trim();
        if (editingId && spId === editingId) return false;
        const existingName = String(sp.name || sp.displayName || "").trim().toLowerCase();
        const existingEmail = String(sp.email || "").trim().toLowerCase();
        return (
          (existingName && existingName === normalizedName) ||
          (normalizedEmail && existingEmail && existingEmail === normalizedEmail)
        );
      });

      if (duplicateSalesperson) {
        const existingName = String(duplicateSalesperson.name || duplicateSalesperson.displayName || "").trim();
        const existingEmail = String(duplicateSalesperson.email || "").trim();
        if (existingName.toLowerCase() === normalizedName && normalizedName) {
          toast.error(`A salesperson named "${trimmedName}" already exists.`);
        } else if (normalizedEmail && existingEmail.toLowerCase() === normalizedEmail) {
          toast.error(`A salesperson with email "${trimmedEmail}" already exists.`);
        } else {
          toast.error("This salesperson already exists.");
        }
        return;
      }

      const payload: any = {
        name: trimmedName,
        email: trimmedEmail,
        status: "active",
      };

      const isEditing = Boolean(editingId);
      const saved = isEditing
        ? await updateSalesperson(editingId, payload)
        : await saveSalesperson({
            ...payload,
            phone: "",
          });

      try {
        const salespersonsResponse = await salespersonsAPI.getAll();
        const refreshed = Array.isArray((salespersonsResponse as any)?.data)
          ? (salespersonsResponse as any).data
          : Array.isArray(salespersonsResponse)
            ? salespersonsResponse
            : [];
        setSalespersons(refreshed);
      } catch {
        setSalespersons((prev) => {
          if (!saved) return prev;
          if (!isEditing) return [saved as any, ...prev];
          return prev.map((sp: any) => {
            const spId = String(sp.id || sp._id || "").trim();
            return spId === editingId ? (saved as any) : sp;
          });
        });
      }

      if (saved) {
        handleSalespersonSelect(saved);
      }
      setNewSalespersonData({ name: "", email: "" });
      setEditingSalespersonId(null);
      setIsNewSalespersonFormOpen(false);
      setIsManageSalespersonsOpen(false);
      toast.success(isEditing ? "Salesperson updated successfully" : "Salesperson added successfully");
    } catch (error) {
      console.error("Error saving salesperson:", error);
      toast.error("Error saving salesperson: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const handleCancelNewSalesperson = () => {
    setNewSalespersonData({ name: "", email: "" });
    setEditingSalespersonId(null);
    setManageSalespersonMenuOpen(null);
    setIsNewSalespersonFormOpen(false);
  };

  const handleDeleteSalesperson = async (salespersonId: string) => {
    const normalizedId = String(salespersonId || "").trim();
    if (!normalizedId) return;

    if (!window.confirm("Are you sure you want to delete this salesperson?")) {
      return;
    }

    try {
      await salespersonsAPI.delete(normalizedId);
      try {
        const salespersonsResponse = await salespersonsAPI.getAll();
        const refreshed = Array.isArray((salespersonsResponse as any)?.data)
          ? (salespersonsResponse as any).data
          : Array.isArray(salespersonsResponse)
            ? salespersonsResponse
            : [];
        setSalespersons(refreshed);
      } catch {
        setSalespersons(prev => prev.filter(sp => String(sp.id || sp._id || "") !== normalizedId));
      }

      if (selectedSalesperson && String(selectedSalesperson.id || selectedSalesperson._id || "") === normalizedId) {
        setSelectedSalesperson(null);
        setFormData(prev => ({
          ...prev,
          salesperson: "",
          salespersonId: ""
        }));
      }

      if (editingSalespersonId === normalizedId) {
        handleCancelNewSalesperson();
      }

      toast.success("Salesperson deleted successfully");
    } catch (error) {
      console.error("Error deleting salesperson:", error);
      toast.error("Error deleting salesperson: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const handleSetSalespersonStatus = async (salespersonId: string, nextStatus: "active" | "inactive") => {
    const normalizedId = String(salespersonId || "").trim();
    if (!normalizedId) return;

    const salesperson: any = (salespersons as any[]).find((sp: any) => String(sp.id || sp._id || "") === normalizedId);
    if (!salesperson) {
      toast.error("Salesperson not found");
      return;
    }

    const previousSalespersons = salespersons;
    const previousSalespersonName = formData.salesperson;
    const previousSalespersonId = formData.salespersonId;
    const nextIsActive = nextStatus === "active";

    setSalespersons((prev) =>
      prev.map((sp: any) => {
        const spId = String(sp.id || sp._id || "");
        if (spId !== normalizedId) return sp;
        return {
          ...sp,
          status: nextStatus,
          active: nextIsActive,
          isActive: nextIsActive,
        };
      })
    );

    setManageSalespersonMenuOpen(null);
    toast.success(nextStatus === "inactive" ? "Salesperson marked inactive" : "Salesperson marked active");

    try {
      const response = await updateSalesperson(normalizedId, {
        name: String(salesperson.name || salesperson.displayName || "").trim(),
        email: String(salesperson.email || "").trim(),
        status: nextStatus,
        active: nextIsActive,
        isActive: nextIsActive,
      } as any);

      if (response) {
        const updatedSalesperson = {
          ...salesperson,
          ...response,
          status: nextStatus,
        };

        if (String(formData.salespersonId || "") === normalizedId) {
          if (nextStatus === "inactive") {
            setSelectedSalesperson(null);
            setFormData((prev) => ({ ...prev, salesperson: "", salespersonId: "" }));
          } else {
            setSelectedSalesperson(updatedSalesperson);
            setFormData((prev) => ({
              ...prev,
              salesperson: String(updatedSalesperson.name || previousSalespersonName || ""),
              salespersonId: String(updatedSalesperson.id || updatedSalesperson._id || previousSalespersonId || ""),
            }));
          }
        }

        try {
          const refreshed = await salespersonsAPI.getAll();
          const rows = Array.isArray((refreshed as any)?.data)
            ? (refreshed as any).data
            : Array.isArray(refreshed)
              ? refreshed
              : [];
          setSalespersons(rows);
        } catch {
          const refreshed = await getSalespersonsFromAPI();
          setSalespersons(Array.isArray(refreshed) ? refreshed : []);
        }
        return;
      }

      setSalespersons(previousSalespersons);
      setFormData((prev) => ({
        ...prev,
        salesperson: previousSalespersonName,
        salespersonId: previousSalespersonId,
      }));
      toast.error("Failed to update salesperson status");
    } catch (error: any) {
      console.error("Error updating salesperson status:", error);
      setSalespersons(previousSalespersons);
      setFormData((prev) => ({
        ...prev,
        salesperson: previousSalespersonName,
        salespersonId: previousSalespersonId,
      }));
      toast.error("Error updating salesperson: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const applySalespersonStatusLocally = (ids: string[], nextStatus: "active" | "inactive") => {
    const normalizedIds = new Set(ids.map((id) => String(id || "").trim()).filter(Boolean));
    const isActive = nextStatus === "active";
    setSalespersons((prev) =>
      prev.map((sp: any) => {
        const spId = String(sp.id || sp._id || "").trim();
        if (!normalizedIds.has(spId)) return sp;
        return {
          ...sp,
          status: nextStatus,
          active: isActive,
          isActive,
        };
      })
    );
  };

  const handleBulkSalespersonStatusChange = async (nextStatus: "active" | "inactive") => {
    const ids = Array.from(
      new Set(
        selectedSalespersonIds
          .map((id: any) => String(id || "").trim())
          .filter(Boolean)
      )
    );

    if (ids.length === 0) {
      toast.error("Please select at least one salesperson");
      return;
    }

    const previousSalespersons = salespersons;
    applySalespersonStatusLocally(ids, nextStatus);
    setSelectedSalespersonIds([]);
    setManageSalespersonMenuOpen(null);
    toast.success(
      nextStatus === "inactive"
        ? `${ids.length} salesperson${ids.length === 1 ? "" : "s"} marked inactive`
        : `${ids.length} salesperson${ids.length === 1 ? "" : "s"} marked active`
    );

    try {
      await Promise.all(
        ids.map(async (salespersonId) => {
          const salesperson: any = (salespersons as any[]).find((sp: any) => String(sp.id || sp._id || "") === salespersonId);
          if (!salesperson) return;
          await updateSalesperson(salespersonId, {
            name: String(salesperson.name || salesperson.displayName || "").trim(),
            email: String(salesperson.email || "").trim(),
            status: nextStatus,
            active: nextStatus === "active",
            isActive: nextStatus === "active",
          } as any);
        })
      );

      try {
        const refreshed = await salespersonsAPI.getAll();
        const rows = Array.isArray((refreshed as any)?.data)
          ? (refreshed as any).data
          : Array.isArray(refreshed)
            ? refreshed
            : [];
        setSalespersons(rows);
      } catch {
        const refreshed = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(refreshed) ? refreshed : []);
      }
    } catch (error: any) {
      console.error("Error updating salesperson statuses:", error);
      setSalespersons(previousSalespersons);
      try {
        const refreshed = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(refreshed) ? refreshed : []);
      } catch {
        setSalespersons(previousSalespersons);
      }
      toast.error("Error updating salespersons: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const handleBulkDeleteSalespersons = async () => {
    const ids = Array.from(
      new Set(
        selectedSalespersonIds
          .map((id: any) => String(id || "").trim())
          .filter(Boolean)
      )
    );

    if (ids.length === 0) {
      toast.error("Please select at least one salesperson");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${ids.length} salesperson${ids.length === 1 ? "" : "s"}?`)) {
      return;
    }

    try {
      await Promise.all(ids.map(async (salespersonId) => salespersonsAPI.delete(salespersonId)));
      try {
        const refreshed = await salespersonsAPI.getAll();
        const rows = Array.isArray((refreshed as any)?.data)
          ? (refreshed as any).data
          : Array.isArray(refreshed)
            ? refreshed
            : [];
        setSalespersons(rows);
      } catch {
        const refreshed = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(refreshed) ? refreshed : []);
      }
      setSelectedSalespersonIds([]);
      setManageSalespersonMenuOpen(null);

      if (ids.includes(String(formData.salespersonId || ""))) {
        setSelectedSalesperson(null);
        setFormData((prev) => ({ ...prev, salesperson: "", salespersonId: "" }));
      }

      toast.success(`${ids.length} salesperson${ids.length === 1 ? "" : "s"} deleted`);
    } catch (error: any) {
      console.error("Error deleting salespersons:", error);
      toast.error("Error deleting salespersons: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const handleOpenReportingTagsModal = (itemId: string | number) => {
    const row = formData.items.find((item: any) => item.id === itemId);
    const existingSelections: Record<string, string> = {};
    (row?.reportingTags || []).forEach((tag: any) => {
      const tagId = String(tag?.tagId || tag?.id || "");
      if (tagId) {
        existingSelections[tagId] = String(tag?.value || "");
      }
    });
    setCurrentReportingTagsItemId(itemId);
    setReportingTagSelections(existingSelections);
    setIsReportingTagsModalOpen(true);
  };

  const handleSaveReportingTags = () => {
    if (currentReportingTagsItemId === null) {
      setIsReportingTagsModalOpen(false);
      return;
    }

    const selectedTags = availableReportingTags
      .map((tag: any) => {
        const tagId = String(tag?._id || tag?.id || "");
        const value = String(reportingTagSelections[tagId] || "").trim();
        if (!tagId || !value) return null;
        return {
          tagId,
          id: tagId,
          name: String(tag?.name || ""),
          value
        };
      })
      .filter(Boolean);

    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item: any) =>
        item.id === currentReportingTagsItemId
          ? { ...item, reportingTags: selectedTags }
          : item
      ),
      reportingTags: prev.items
        .map((item: any) => (
          item.id === currentReportingTagsItemId
            ? selectedTags
            : (Array.isArray(item.reportingTags) ? item.reportingTags : [])
        ))
        .flat()
    }));
    setCurrentReportingTagsItemId(null);
    setIsReportingTagsModalOpen(false);
  };

  const getItemReportingTagsSummaryLabel = (item: any) => {
    const selectedCount = (item?.reportingTags || []).filter((tag: any) => String(tag?.value || "").trim()).length;
    const totalCount = availableReportingTags.length;
    if (selectedCount > 0) {
      return `Reporting Tags : ${selectedCount} out of ${totalCount} selected.`;
    }
    return "Reporting Tags";
  };

  const renderReportingTagsInlinePanel = (item: any) => {
    if (!isReportingTagsModalOpen || currentReportingTagsItemId !== item.id) return null;

    return (
      <div className="mt-2 rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Reporting Tags</h3>
        </div>
        <div className="p-4">
          {availableReportingTags.length === 0 ? (
            <p className="text-sm text-gray-700">
              There are no active reporting tags or you haven't created a reporting tag yet. You can create/edit reporting tags under settings.
            </p>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {availableReportingTags.map((tag: any) => {
                const tagId = String(tag?._id || tag?.id || "");
                const tagName = String(tag?.name || "Tag");
                const tagOptions = Array.isArray(tag?.options) ? tag.options : [];
                return (
                  <div key={tagId} className="space-y-1">
                    <label className="text-sm text-gray-700">
                      {tagName}
                      {Boolean(tag?.isMandatory) ? <span className="text-red-500 ml-1">*</span> : null}
                    </label>
                    <select
                      className="w-full h-10 px-3 border border-gray-300 rounded text-sm text-gray-700 bg-white focus:outline-none focus:border-[#156372]"
                      value={reportingTagSelections[tagId] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setReportingTagSelections(prev => ({ ...prev, [tagId]: value }));
                      }}
                    >
                      <option value="">None</option>
                      {tagOptions.map((option: string) => (
                        <option key={`${tagId}-${option}`} value={option}>
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
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            className="px-4 py-2 bg-white text-gray-700 rounded-md text-sm font-medium border border-gray-300"
            onClick={() => {
              setCurrentReportingTagsItemId(null);
              setIsReportingTagsModalOpen(false);
            }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium border border-[#156372]"
            onClick={handleSaveReportingTags}
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  const getFilteredItems = (itemId) => {
    const search = (itemSearches[itemId] || "").toLowerCase().trim();
    if (!search) return availableItems;
    return availableItems.filter(item =>
      String(item.name || "").toLowerCase().includes(search) ||
      String(item.sku || "").toLowerCase().includes(search) ||
      String(item.code || "").toLowerCase().includes(search) ||
      String(item.entityType || "").toLowerCase().includes(search)
    );
  };

  const resolveItemTaxId = (selectedItem: any): string => {
    const taxCandidates: any[] = [
      selectedItem?.taxInfo?.taxId,
      selectedItem?.taxId,
      selectedItem?.salesTaxId,
      selectedItem?.tax,
      selectedItem?.salesTax
    ].filter(Boolean);

    for (const candidate of taxCandidates) {
      const candidateStr = String(candidate);
      const idMatch = taxes.find((t: any) => String(t.id) === candidateStr || String(t._id) === candidateStr);
      if (idMatch) return String(idMatch.id || idMatch._id);

      const nameMatch = taxes.find((t: any) => {
        const taxName = String(t.name || t.taxName || "").toLowerCase();
        return taxName && taxName === candidateStr.toLowerCase();
      });
      if (nameMatch) return String(nameMatch.id || nameMatch._id);

      const rateMatchText = candidateStr.match(/(\d+(?:\.\d+)?)\s*%/);
      if (rateMatchText) {
        const rate = parseFloat(rateMatchText[1]);
        const byRate = taxes.find((t: any) => Number(t.rate) === rate);
        if (byRate) return String(byRate.id || byRate._id);
      }
    }

    return "";
  };

  const getFilteredTaxes = (itemId: string | number) => {
    const search = (taxSearches[itemId] || "").toLowerCase();
    if (!search) return taxes;
    return taxes.filter((tax: any) => {
      const name = String(tax.name || tax.taxName || "").toLowerCase();
      const rate = String(tax.rate ?? "").toLowerCase();
      return name.includes(search) || rate.includes(search);
    });
  };

  const parseTaxRate = (value: any): number => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = parseFloat(String(value).replace("%", "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getTaxBySelection = (taxValue: any): any => {
    if (taxValue === null || taxValue === undefined || taxValue === "") return null;
    const valueStr = String(taxValue).trim();
    if (!valueStr) return null;

    const byId = taxes.find((t: any) => String(t.id) === valueStr || String(t._id) === valueStr);
    if (byId) return byId;

    const byName = taxes.find((t: any) => {
      const taxName = String(t.name || t.taxName || "").toLowerCase();
      return taxName && taxName === valueStr.toLowerCase();
    });
    if (byName) return byName;

    const numericRate = parseTaxRate(valueStr);
    if (numericRate > 0) {
      const byRate = taxes.find((t: any) => Number(t.rate) === numericRate);
      if (byRate) return byRate;
    }

    return null;
  };

  const getNormalizedTaxId = (taxObj: any): string => {
    if (!taxObj) return "";
    return String(taxObj?.id || taxObj?._id || taxObj?.taxId || "").trim();
  };

  const defaultTaxId = useMemo(() => {
    const activeRows = (taxes || []).filter((tax: any) => {
      if (!tax) return false;
      const status = String(tax?.status || "").toLowerCase();
      const active = tax?.active;
      const isActive = tax?.isActive;
      if (status === "inactive") return false;
      if (active === false) return false;
      if (isActive === false) return false;
      const name = String(tax?.name || tax?.taxName || "").trim();
      return Boolean(name);
    });

    const preferred =
      activeRows.find((tax: any) => Boolean(tax?.isDefault || tax?.default)) ||
      activeRows[0] ||
      taxes?.[0] ||
      null;

    return preferred ? getNormalizedTaxId(preferred) : "";
  }, [taxes]);

  const getCustomerTaxMeta = (customer: any) => {
    const raw = String(customer?.taxRate || customer?.taxId || customer?.tax || "").trim();
    if (!raw) return { taxId: "", taxRate: 0 };
    const taxObj = getTaxBySelection(raw);
    if (!taxObj) return { taxId: "", taxRate: 0 };
    return { taxId: getNormalizedTaxId(taxObj), taxRate: parseTaxRate(taxObj.rate) };
  };

  const getTaxMetaById = (taxId: string) => {
    const taxObj = getTaxBySelection(taxId);
    if (!taxObj) return { taxId: "", taxRate: 0 };
    return { taxId: getNormalizedTaxId(taxObj), taxRate: parseTaxRate(taxObj.rate) };
  };

  const getTaxMetaFromItem = (item: any) => {
    const taxObj = getTaxBySelection(item?.tax);
    if (taxObj) {
      return {
        id: String(taxObj.id || taxObj._id || ""),
        name: taxObj.name || taxObj.taxName || "Tax",
        rate: parseTaxRate(taxObj.rate)
      };
    }

    const fallbackRate = parseTaxRate(item?.taxRate ?? item?.taxInfo?.taxRate ?? item?.salesTaxRate);
    return {
      id: "",
      name: "Tax",
      rate: fallbackRate
    };
  };

  const isTaxInclusiveMode = (currentFormData: any) => {
    const mode = String(currentFormData?.taxExclusive || "").toLowerCase();
    if (mode.includes("inclusive")) return true;
    if (mode.includes("exclusive")) return false;
    return taxMode === "inclusive";
  };

  const calculateLineTaxAmount = (lineAmount: number, taxRate: number, isInclusive: boolean) => {
    if (!lineAmount || !taxRate) return 0;
    if (isInclusive) {
      return lineAmount - lineAmount / (1 + taxRate / 100);
    }
    return (lineAmount * taxRate) / 100;
  };

  const computeDiscountAmount = (subTotal: number, discountValue: any, discountTypeValue: string) => {
    if (!showTransactionDiscount) return 0;
    const rawValue = parseFloat(String(discountValue)) || 0;
    if (subTotal <= 0 || rawValue <= 0) return 0;
    const calculated = discountTypeValue === "percent" ? (subTotal * rawValue) / 100 : rawValue;
    return Math.min(calculated, subTotal);
  };

  const applyDiscountShare = (amount: number, subTotal: number, discountAmount: number) => {
    if (subTotal <= 0 || discountAmount <= 0) return amount;
    const share = (amount / subTotal) * discountAmount;
    return Math.max(0, amount - share);
  };

  const taxBreakdown = useMemo(() => {
    const breakdown: Record<string, { label: string; amount: number }> = {};
    const isInclusive = isTaxInclusiveMode(formData);

    const itemRows = formData.items.filter((i: any) => i.itemType !== "header");
    const subTotal = itemRows.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    }, 0);
    const discountAmount = computeDiscountAmount(subTotal, formData.discount, formData.discountType);

    itemRows
      .filter((i: any) => i.itemType !== "header")
      .forEach((item: any) => {
        const taxMeta = getTaxMetaFromItem(item);
        if (!taxMeta.rate) return;
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const lineAmount = quantity * rate;
        const discountedLineAmount = applyDiscountShare(lineAmount, subTotal, discountAmount);
        const taxAmount = calculateLineTaxAmount(discountedLineAmount, taxMeta.rate, isInclusive);
        const key = taxMeta.id || `${taxMeta.name}-${taxMeta.rate}`;
        const label = `${taxMeta.name} [${taxMeta.rate}%]${isInclusive ? " (Included)" : ""}`;
        if (!breakdown[key]) breakdown[key] = { label, amount: 0 };
        breakdown[key].amount += taxAmount;
      });

    const shippingAmount = showShippingCharges ? (parseFloat(String(formData.shippingCharges)) || 0) : 0;
    if (shippingAmount > 0 && formData.shippingChargeTax) {
      const shippingTaxObj = getTaxBySelection(formData.shippingChargeTax);
      const shippingTaxRate = shippingTaxObj ? parseTaxRate((shippingTaxObj as any).rate) : 0;
      if (shippingTaxRate > 0) {
        const shippingTaxAmount = calculateLineTaxAmount(shippingAmount, shippingTaxRate, isInclusive);
        const shippingTaxId = shippingTaxObj ? String((shippingTaxObj as any).id || (shippingTaxObj as any)._id || "") : "";
        const shippingTaxName = shippingTaxObj ? ((shippingTaxObj as any).name || (shippingTaxObj as any).taxName || "Tax") : "Tax";
        const key = shippingTaxId || `${shippingTaxName}-${shippingTaxRate}`;
        const label = `${shippingTaxName} [${shippingTaxRate}%]${isInclusive ? " (Included)" : ""}`;
        if (!breakdown[key]) breakdown[key] = { label, amount: 0 };
        breakdown[key].amount += shippingTaxAmount;
      }
    }

    return Object.values(breakdown);
  }, [formData.items, formData.taxExclusive, formData.shippingCharges, formData.shippingChargeTax, taxes, taxMode, showShippingCharges]);

  const handleItemSelect = (itemId, selectedItem) => {
    const selectedEntityId = selectedItem.sourceId || selectedItem.id;
    const baseRate = Number(selectedItem?.rate ?? 0) || 0;
    const nextRate = selectedPriceList ? applyPriceListToBaseRate(baseRate, selectedPriceList, selectedItem) : baseRate;

    const row = (formData.items || []).find((r: any) => String(r?.id) === String(itemId));
    const existingRowTaxId = String(row?.tax || "").trim();
    const customerTaxMeta = selectedCustomer ? getCustomerTaxMeta(selectedCustomer) : { taxId: "", taxRate: 0 };
    const itemTaxId = resolveItemTaxId(selectedItem);
    const fallbackDefaultTax = defaultTaxId ? getTaxMetaById(defaultTaxId) : { taxId: "", taxRate: 0 };
    const resolvedTaxId =
      customerTaxMeta.taxId ||
      existingRowTaxId ||
      itemTaxId ||
      fallbackDefaultTax.taxId ||
      "";
    const resolvedTaxRate =
      (customerTaxMeta.taxId ? customerTaxMeta.taxRate : 0) ||
      (resolvedTaxId ? getTaxMetaById(resolvedTaxId).taxRate : 0) ||
      parseTaxRate(selectedItem?.taxInfo?.taxRate ?? selectedItem?.taxRate ?? selectedItem?.salesTaxRate) ||
      0;

    setSelectedItemIds(prev => ({ ...prev, [itemId]: selectedItem.id }));
    handleItemChange(itemId, 'itemId', selectedEntityId); // Store the actual Product/Plan ID
    handleItemChange(itemId, 'itemEntityType', selectedItem.entityType || selectedItem.itemEntityType || "item");
    handleItemChange(itemId, 'catalogRate', baseRate);
    handleItemChange(itemId, 'itemDetails', selectedItem.name);
    handleItemChange(itemId, 'rate', nextRate);
    handleItemChange(itemId, 'stockOnHand', selectedItem.stockOnHand);
    handleItemChange(itemId, 'unit', selectedItem.unit);
    handleItemChange(itemId, 'description', selectedItem.salesDescription || selectedItem.description || "");

    if (resolvedTaxId) {
      handleItemChange(itemId, 'tax', resolvedTaxId);
      if (resolvedTaxRate > 0) {
        handleItemChange(itemId, 'taxRate', resolvedTaxRate);
      }
    } else if (resolvedTaxRate > 0) {
      // Support rate-only taxes (no id match) as a last resort
      handleItemChange(itemId, 'taxRate', resolvedTaxRate);
    }

    setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));
    setItemSearches(prev => ({ ...prev, [itemId]: "" }));
  };

  const toggleItemDropdown = (itemId) => {
    setOpenItemDropdowns(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
    if (!itemDropdownRefs.current[itemId]) itemDropdownRefs.current[itemId] = null;
  };

  const calculateAllTotals = (items, currentFormData) => {
    const itemRows = items.filter(i => i.itemType !== "header");
    const isInclusive = isTaxInclusiveMode(currentFormData);

    const subTotal = itemRows.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    }, 0);

    const discountAmount = computeDiscountAmount(subTotal, currentFormData.discount, currentFormData.discountType);

    const itemsTax = itemRows.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const lineAmount = quantity * rate;
      const discountedLineAmount = applyDiscountShare(lineAmount, subTotal, discountAmount);
      const taxMeta = getTaxMetaFromItem(item);
      return sum + calculateLineTaxAmount(discountedLineAmount, taxMeta.rate, isInclusive);
    }, 0);

    const shipping = showShippingCharges ? (parseFloat(currentFormData.shippingCharges) || 0) : 0;
    const shippingTaxObj = (showShippingCharges && shipping > 0 && currentFormData.shippingChargeTax)
      ? getTaxBySelection(currentFormData.shippingChargeTax)
      : null;
    const shippingTaxRate = shippingTaxObj ? parseTaxRate((shippingTaxObj as any).rate) : 0;
    const shippingTaxAmount = (showShippingCharges && shipping > 0 && shippingTaxRate > 0)
      ? calculateLineTaxAmount(shipping, shippingTaxRate, isInclusive)
      : 0;
    const totalTax = itemsTax + shippingTaxAmount;
    const adjustment = showAdjustment ? (parseFloat(currentFormData.adjustment) || 0) : 0;
    const totalBeforeRound = subTotal + (isInclusive ? 0 : totalTax) - discountAmount + shipping + adjustment;
    const roundedTotal = Number(totalBeforeRound.toFixed(2));
    const roundOff = Number((roundedTotal - totalBeforeRound).toFixed(2));
    const total = roundedTotal;

    return {
      subTotal,
      totalTax,
      roundOff,
      total
    };
  };

  const recalculateLineAmount = (row: any, nextRate: number, nextQuantity?: number) => {
    if (row?.itemType === "header") return row;
    const quantity = nextQuantity ?? (parseFloat(String(row?.quantity)) || 0);
    return {
      ...row,
      rate: nextRate,
      amount: quantity * nextRate,
    };
  };

  useEffect(() => {
    // Re-apply selected price list to all selected lines (keeps rates consistent)
    const list = selectedPriceList;
    setFormData((prev) => {
      const nextCurrency = list?.currency ? String(list.currency).trim() : prev.currency;
      const updatedItems = prev.items.map((row: any) => {
        if (row.itemType === "header") return row;
        const selectedUiId = selectedItemIds?.[row.id];
        if (!selectedUiId) return row;
        const selectedEntity = availableItems.find((item: any) => String(item.id) === String(selectedUiId));
        if (!selectedEntity) return row;

        const baseRate = Number(selectedEntity?.rate ?? row.catalogRate ?? row.rate ?? 0) || 0;
        const nextRate = list ? applyPriceListToBaseRate(baseRate, list, selectedEntity) : baseRate;
        const nextAmount = (parseFloat(String(row?.quantity)) || 0) * nextRate;
        if (
          Number(row.rate ?? 0) === nextRate &&
          Number(row.amount ?? 0) === nextAmount &&
          row.itemEntityType === (selectedEntity.entityType || row.itemEntityType) &&
          prev.currency === nextCurrency
        ) {
          return row;
        }
        return {
          ...recalculateLineAmount(row, nextRate),
          itemEntityType: selectedEntity.entityType || row.itemEntityType || "item",
          catalogRate: baseRate,
        };
      });

      const totals = calculateAllTotals(updatedItems, { ...prev, currency: nextCurrency });
      return { ...prev, currency: nextCurrency, items: updatedItems, ...totals };
    });
  }, [selectedPriceList, availableItems, selectedItemIds]);

  const handleItemChange = (id, field, value) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (item.itemType === "header") return updatedItem;

          if (field === "tax") {
            const selectedTax = getTaxBySelection(value);
            updatedItem.taxRate = selectedTax ? parseTaxRate(selectedTax.rate) : 0;
          }

          // Row amount should exclude tax; tax is shown only in totals section.
          const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(item.quantity) || 0;
          const rate = field === 'rate' ? parseFloat(value) || 0 : parseFloat(item.rate) || 0;
          const subtotal = quantity * rate;
          updatedItem.amount = subtotal;
          return updatedItem;
        }
        return item;
      });

      const totals = calculateAllTotals(updatedItems, prev);

      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });
  };

  const handleTaxCreatedFromModal = (payload: any) => {
    const normalizedInput = normalizeCreatedTaxPayload(payload);
    let createdTax = normalizedInput.raw;
    const inputName = normalizedInput.name;
    const inputRate = normalizedInput.rate;
    const inputIsCompound = normalizedInput.isCompound;

    if (!inputName) {
      setIsNewTaxQuickModalOpen(false);
      setNewTaxTargetItemId(null);
      return;
    }

    try {
      const nextTaxId = String(createdTax?._id || createdTax?.id || inputName).trim() || inputName;
      const nextRow = {
        _id: nextTaxId,
        id: nextTaxId,
        name: inputName,
        rate: Number.isFinite(inputRate) ? inputRate : 0,
        type: "both",
        isActive: true,
        isCompound: inputIsCompound,
      };
      const existing = readTaxesLocal();
      const alreadyExists = existing.some((row: any) => {
        const rowId = String(row?._id || row?.id || "").trim();
        return rowId === nextTaxId;
      });
      const nextRows = alreadyExists
        ? existing.map((row: any) => {
            const rowId = String(row?._id || row?.id || "").trim();
            return rowId === nextTaxId ? { ...row, ...nextRow } : row;
          })
        : [nextRow, ...existing];
      writeTaxesLocal(nextRows as any);
      createdTax = { ...nextRow, ...createdTax };
    } catch (error) {
      console.error("Error creating tax in local settings storage:", error);
    }

    const option: any = {
      ...createdTax,
      id: createdTax?._id || createdTax?.id || inputName,
      _id: createdTax?._id || createdTax?.id || inputName,
      name: createdTax?.name || inputName,
      rate: Number(createdTax?.rate ?? inputRate) || 0,
      isActive: createdTax?.isActive !== false && createdTax?.is_active !== false,
      isCompound: createdTax?.isCompound === true || createdTax?.is_compound === true,
      type: createdTax?.type || "tax",
    };

    setTaxes((prev: any) => {
      const exists = prev.some((tax: any) => String(tax.id || tax._id) === String(option.id || option._id));
      return exists ? prev : [option, ...prev];
    });

    if (newTaxTargetItemId !== null && newTaxTargetItemId !== undefined) {
      handleItemChange(newTaxTargetItemId, "tax", String(option.id || option._id || ""));
    }

    setIsNewTaxQuickModalOpen(false);
    setNewTaxTargetItemId(null);
  };

  const handleAddItem = (insertAfterIndex?: number) => {
    setFormData(prev => {
      const newItem = { id: Date.now(), itemType: "item", itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0, description: "", stockOnHand: 0, reportingTags: [] };
      const newItems = [
        ...prev.items
      ];
      if (typeof insertAfterIndex === "number" && insertAfterIndex >= 0 && insertAfterIndex <= newItems.length) {
        newItems.splice(insertAfterIndex, 0, newItem);
      } else {
        newItems.push(newItem);
      }
      const totals = calculateAllTotals(newItems, prev);
      return {
        ...prev,
        items: newItems,
        ...totals
      };
    });
  };

  const handleInsertHeader = (index) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems.splice(index + 1, 0, { id: Date.now(), itemType: "header", itemDetails: "", quantity: 0, rate: 0, tax: "", amount: 0, description: "", stockOnHand: 0, reportingTags: [] });
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (id) => {
    setFormData(prev => {
      const updatedItems = prev.items.filter(item => item.id !== id);
      const totals = calculateAllTotals(updatedItems, prev);
      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });
  };

  const handleDuplicateItem = (id) => {
    setFormData(prev => {
      const itemToDuplicate = prev.items.find(item => item.id === id);
      if (!itemToDuplicate) return prev;

      const newItem = { ...itemToDuplicate, id: Date.now() };
      const index = prev.items.findIndex(item => item.id === id);
      const updatedItems = [...prev.items];
      updatedItems.splice(index + 1, 0, newItem);
      const totals = calculateAllTotals(updatedItems, prev);
      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });
    setOpenItemMenuId(null);
  };

  const getBulkFilteredItems = () => {
    if (!bulkAddSearch.trim()) {
      return availableItems;
    }
    const search = bulkAddSearch.toLowerCase().trim();
    return availableItems.filter(item =>
      String(item.name || "").toLowerCase().includes(search) ||
      String(item.sku || "").toLowerCase().includes(search) ||
      String(item.code || "").toLowerCase().includes(search) ||
      String(item.entityType || "").toLowerCase().includes(search)
    );
  };

  const handleBulkItemToggle = (item) => {
    setBulkSelectedItems(prev => {
      const exists = prev.find(selected => selected.id === item.id);
      if (exists) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleBulkItemQuantityChange = (itemId, quantity) => {
    setBulkSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(1, parseFloat(quantity) || 1) } : item
      )
    );
  };

  const handleAddBulkItems = () => {
    if (bulkSelectedItems.length === 0) return;

    // Add all selected items to the form and recalculate totals
    setFormData(prev => {
      const newItems = bulkSelectedItems.map((selectedItem, index) => {
        const resolvedTaxId = resolveItemTaxId(selectedItem);
        const resolvedTax = getTaxBySelection(resolvedTaxId);
        const fallbackTaxRate = parseTaxRate(selectedItem?.taxInfo?.taxRate ?? selectedItem?.taxRate ?? selectedItem?.salesTaxRate);

        return {
          id: Date.now() + index,
          itemType: "item",
          itemDetails: selectedItem.name,
          quantity: selectedItem.quantity || 1,
          rate: selectedItem.rate,
          tax: resolvedTaxId || "",
          taxRate: resolvedTax ? parseTaxRate(resolvedTax.rate) : fallbackTaxRate,
          amount: (selectedItem.quantity || 1) * selectedItem.rate,
          stockOnHand: selectedItem.stockOnHand
        };
      });

      const updatedItems = [...prev.items];
      if (bulkAddInsertIndex !== null) {
        updatedItems.splice(bulkAddInsertIndex + 1, 0, ...newItems);
      } else {
        updatedItems.push(...newItems);
      }
      const totals = calculateAllTotals(updatedItems, prev);

      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });

    // Close modal and reset
    setIsBulkAddModalOpen(false);
    setBulkAddInsertIndex(null);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleCancelBulkAdd = () => {
    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleSelectAllItems = () => {
    setBulkSelectedItemIds(formData.items.map(item => item.id));
  };

  const handleDeselectAllItems = () => {
    setBulkSelectedItemIds([]);
  };

  const handleToggleItemSelection = (itemId) => {
    setBulkSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleDeleteSelectedItems = () => {
    if (bulkSelectedItemIds.length === 0) return;

    if (window.confirm(`Are you sure you want to delete ${bulkSelectedItemIds.length} item(s)?`)) {
      setFormData(prev => {
        const updatedItems = prev.items.filter(item => !bulkSelectedItemIds.includes(item.id));
        const totals = calculateAllTotals(updatedItems, prev);

        return {
          ...prev,
          items: updatedItems,
          ...totals
        };
      });
      setBulkSelectedItemIds([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file count
    if (formData.attachedFiles.length + files.length > 5) {
      alert("You can upload a maximum of 5 files");
      return;
    }

    // Validate file sizes (10MB each)
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`Some files exceed 10MB limit. Maximum file size is 10MB.`);
      return;
    }

    // Add files to attachedFiles array with metadata
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      file: file
    }));

    setFormData(prev => ({
      ...prev,
      attachedFiles: [...prev.attachedFiles, ...newFiles]
    }));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter(file => file.id !== fileId)
    }));
  };

  // Helper function to parse file size string to bytes
  const parseFileSize = (sizeStr) => {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;

    const match = sizeStr.toString().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    return Math.round(value * (multipliers[unit] || 1));
  };

  // Load documents when modal opens
  useEffect(() => {
    if (isDocumentsModalOpen) {
      const documents = getAllDocuments();
      setAvailableDocuments(documents);
    }
  }, [isDocumentsModalOpen]);

  // Listen for document updates
  useEffect(() => {
    const handleDocumentUpdate = () => {
      if (isDocumentsModalOpen) {
        const documents = getAllDocuments();
        setAvailableDocuments(documents);
      }
    };

    window.addEventListener('documentAdded', handleDocumentUpdate);
    window.addEventListener('documentDeleted', handleDocumentUpdate);
    window.addEventListener('documentUpdated', handleDocumentUpdate);

    return () => {
      window.removeEventListener('documentAdded', handleDocumentUpdate);
      window.removeEventListener('documentDeleted', handleDocumentUpdate);
      window.removeEventListener('documentUpdated', handleDocumentUpdate);
    };
  }, [isDocumentsModalOpen]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleNewItemChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewItemData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleNewItemImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItemImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const normalizeItemForQuote = (item: any) => ({
    ...item,
    entityType: "item",
    id: String(item?._id || item?.id || ""),
    sourceId: String(item?._id || item?.id || ""),
    name: String(item?.name || "").trim(),
    sku: String(item?.sku || item?.itemCode || "").trim(),
    code: String(item?.sku || item?.itemCode || "").trim(),
    rate: Number(item?.sellingPrice || item?.costPrice || item?.rate || 0) || 0,
    stockOnHand: Number(item?.stockOnHand || item?.quantityOnHand || item?.stockQuantity || 0) || 0,
    unit: item?.unit || item?.unitOfMeasure || "pcs",
    description: item?.salesDescription || item?.description || ""
  });

  const handleCreateItemFromModal = async (data: any, tagIds: string[] = []) => {
    try {
      const response: any = await itemsAPI.create(data);
      if (response?.success === false) {
        throw new Error(response?.message || "Failed to save item");
      }
      const savedItem = response?.data || response;
      if (!savedItem) {
        throw new Error("Item saved without data");
      }

      const normalizedItem = normalizeItemForQuote(savedItem);
      setAvailableItems(prev => [...prev, normalizedItem]);

      // Keep local cache in sync for immediate dropdown availability
      try {
        const savedItems = JSON.parse(localStorage.getItem("inv_items_v1") || "[]");
        savedItems.push({
          id: savedItem._id || savedItem.id,
          name: savedItem.name,
          sku: savedItem.sku || savedItem.itemCode,
          sellingPrice: savedItem.sellingPrice ?? savedItem.rate ?? normalizedItem.rate,
          costPrice: savedItem.costPrice ?? 0,
          stockOnHand: savedItem.stockOnHand ?? 0,
          unit: savedItem.unit || savedItem.unitOfMeasure || "pcs",
          type: savedItem.type || "Goods"
        });
        localStorage.setItem("inv_items_v1", JSON.stringify(savedItems));
      } catch {
        // ignore local cache write errors
      }

      if (newItemTargetRowId !== null && newItemTargetRowId !== undefined) {
        handleItemSelect(newItemTargetRowId, normalizedItem);
      }

      setNewItemTargetRowId(null);
      setIsNewItemModalOpen(false);
      toast.success("Item created successfully");
    } catch (error: any) {
      console.error("Failed to create item from modal:", error);
      throw error;
    }
  };

  const handleSaveNewItem = () => {
    if (!newItemData.name.trim()) {
      alert("Please enter item name");
      return;
    }
    if (!newItemData.sellingPrice) {
      alert("Please enter selling price");
      return;
    }

    // Create new item
    const newItem = {
      id: `ITEM-${Date.now()}`,
      entityType: "item",
      name: newItemData.name,
      sku: newItemData.sku,
      code: newItemData.sku,
      rate: parseFloat(newItemData.sellingPrice) || 0,
      stockOnHand: 0,
      unit: newItemData.unit || "pcs",
      type: newItemData.type,
      costPrice: parseFloat(newItemData.costPrice) || 0,
      salesAccount: newItemData.salesAccount,
      purchaseAccount: newItemData.purchaseAccount,
      sellable: newItemData.sellable,
      purchasable: newItemData.purchasable,
      trackInventory: newItemData.trackInventory,
      description: newItemData.salesDescription || ""
    };

    // Add to availableItems
    setAvailableItems(prev => [...prev, newItem]);

    // Also save to localStorage
    const savedItems = JSON.parse(localStorage.getItem("inv_items_v1") || "[]");
    const itemToSave = {
      id: newItem.id,
      name: newItem.name,
      sku: newItem.sku,
      sellingPrice: newItem.rate,
      costPrice: newItem.costPrice || 0,
      stockOnHand: newItem.stockOnHand || 0,
      unit: newItem.unit,
      type: newItem.type,
      salesAccount: newItemData.salesAccount,
      purchaseAccount: newItemData.purchaseAccount,
      sellable: newItemData.sellable,
      purchasable: newItemData.purchasable,
      trackInventory: newItemData.trackInventory
    };
    savedItems.push(itemToSave);
    localStorage.setItem("inv_items_v1", JSON.stringify(savedItems));

    // Reset form and close modal
    setNewItemData({
      type: "Goods",
      name: "",
      sku: "",
      unit: "",
      sellingPrice: "",
      salesAccount: "Sales",
      salesDescription: "",
      salesTax: "",
      costPrice: "",
      purchaseAccount: "Cost of Goods Sold",
      purchaseDescription: "",
      purchaseTax: "",
      preferredVendor: "",
      sellable: true,
      purchasable: true,
      trackInventory: false
    });
    setNewItemImage(null);
    setIsNewItemModalOpen(false);
  };

  const handleCancelNewItem = () => {
    setNewItemData({
      type: "Goods",
      name: "",
      sku: "",
      unit: "",
      sellingPrice: "",
      salesAccount: "Sales",
      salesDescription: "",
      salesTax: "",
      costPrice: "",
      purchaseAccount: "Cost of Goods Sold",
      purchaseDescription: "",
      purchaseTax: "",
      preferredVendor: "",
      sellable: true,
      purchasable: true,
      trackInventory: false
    });
    setNewItemImage(null);
    setIsNewItemModalOpen(false);
  };

  // Project handlers
  const filteredProjects = projects.filter(project => {
    const projectName = project.projectName || project.name || "";
    const matchesSearch = projectName.toLowerCase().includes(projectSearch.toLowerCase());

    // If no customer is selected, show all matching search
    if (!selectedCustomer) return matchesSearch;

    const selectedCustomerId = selectedCustomer.id || selectedCustomer._id;

    // Support both ID and nested object structure for customer field
    const projectCustomer = project.customer || project.customerId;
    const projectCustomerId = (typeof projectCustomer === 'object' && projectCustomer !== null)
      ? (projectCustomer.id || projectCustomer._id)
      : projectCustomer;

    const matchesCustomer = projectCustomerId && (
      projectCustomerId === selectedCustomerId ||
      projectCustomerId.toString() === selectedCustomerId.toString()
    );

    // Also check customerName as a fallback if IDs don't match or aren't present
    const customerName = selectedCustomer.name || selectedCustomer.displayName;
    const matchesCustomerName = project.customerName === customerName;

    // SHOW projects for selected customer OR projects with NO customer assigned
    return matchesSearch && (matchesCustomer || matchesCustomerName || !projectCustomerId || projectCustomerId === "");
  });

  const handleProjectSelect = (project) => {
    const projectName = project.projectName || project.name || "";
    setSelectedProject(project);
    setFormData(prev => ({
      ...prev,
      projectName: projectName
    }));
    setIsProjectDropdownOpen(false);
    setProjectSearch("");
  };

  const handleNewProjectChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewProjectData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleAddProjectTask = () => {
    setNewProjectData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { id: Date.now(), taskName: "", description: "" }]
    }));
  };

  const handleRemoveProjectTask = (taskId) => {
    setNewProjectData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId)
    }));
  };

  const handleProjectTaskChange = (taskId, field, value) => {
    setNewProjectData(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, [field]: value } : task
      )
    }));
  };

  const handleAddProjectUser = () => {
    // For now, add a placeholder user - in real app, this would open a user selection modal
    const newUser = {
      id: Date.now(),
      name: "New User",
      email: "user@example.com"
    };
    setNewProjectData(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));
  };

  const handleRemoveProjectUser = (userId) => {
    setNewProjectData(prev => ({
      ...prev,
      users: prev.users.filter(user => user.id !== userId)
    }));
  };

  const handleSaveNewProject = () => {
    if (!newProjectData.projectName.trim()) {
      alert("Please enter project name");
      return;
    }

    // Create new project
    const newProject = {
      projectName: newProjectData.projectName,
      projectCode: newProjectData.projectCode,
      customerName: selectedCustomer?.name || newProjectData.customerName,
      customerId: selectedCustomer?.id || newProjectData.customerId,
      billingMethod: newProjectData.billingMethod,
      totalProjectCost: parseFloat(newProjectData.totalProjectCost) || 0,
      description: newProjectData.description,
      costBudget: parseFloat(newProjectData.costBudget) || 0,
      revenueBudget: parseFloat(newProjectData.revenueBudget) || 0,
      users: newProjectData.users,
      tasks: newProjectData.tasks.filter(t => t.taskName.trim()),
      addToWatchlist: newProjectData.addToWatchlist,
      createdAt: new Date().toISOString()
    };

    // Persist project locally for immediate UX; project list is refreshed from API elsewhere.
    const savedProject = {
      ...newProject,
      id: String(Date.now())
    };

    // Add to local state
    setProjects(prev => [...prev, savedProject]);

    // Select the new project
    setSelectedProject(savedProject);
    setFormData(prev => ({
      ...prev,
      projectName: savedProject.projectName
    }));

    // Reset form and close modal
    setNewProjectData({
      projectName: "",
      projectCode: "",
      customerName: "",
      customerId: "",
      billingMethod: "Fixed Cost for Project",
      totalProjectCost: "",
      description: "",
      costBudget: "",
      revenueBudget: "",
      users: [],
      tasks: [{ id: 1, taskName: "", description: "" }],
      addToWatchlist: true
    });
    setIsNewProjectModalOpen(false);
  };

  const handleCancelNewProject = () => {
    setNewProjectData({
      projectName: "",
      projectCode: "",
      customerName: "",
      customerId: "",
      billingMethod: "Fixed Cost for Project",
      totalProjectCost: "",
      description: "",
      costBudget: "",
      revenueBudget: "",
      users: [],
      tasks: [{ id: 1, taskName: "", description: "" }],
      addToWatchlist: true
    });
    setIsNewProjectModalOpen(false);
  };

  const handleOpenNewProjectModal = () => {
    // Navigate to new project form with customer data
    setIsProjectDropdownOpen(false);
    navigate('/time-tracking/projects/new', {
      state: {
        returnTo: isEditMode ? `/sales/quotes/${quoteId}/edit` : '/sales/quotes/new',
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        quoteId: quoteId || null
      }
    });
  };

  const handleContactPersonChange = (e) => {
    const { name, value } = e.target;
    setContactPersonData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactPersonImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setContactPersonData(prev => ({
        ...prev,
        profileImage: file
      }));
    }
  };

  const handleSaveContactPerson = () => {
    if (!contactPersonData.firstName.trim() || !contactPersonData.email.trim()) {
      alert("First Name and Email are required");
      return;
    }

    const newContact = {
      ...contactPersonData,
      fullName: `${contactPersonData.salutation} ${contactPersonData.firstName} ${contactPersonData.lastName}`.trim(),
      selected: true
    };

    setFormData(prev => ({
      ...prev,
      contactPersons: [...(prev.contactPersons || []), newContact]
    }));

    setIsAddContactPersonModalOpen(false);
    // Reset form
    setContactPersonData({
      salutation: "",
      firstName: "",
      lastName: "",
      email: "",
      workPhone: "",
      workPhonePrefix: "+358",
      mobile: "",
      mobilePrefix: "+358",
      skype: "",
      designation: "",
      department: "",
      profileImage: null
    });
  };

  const uploadQuoteFiles = async (files: any[]) => {
    const uploaded = [];
    for (const fileObj of files) {
      if (fileObj.file) {
        try {
          // If it's a real File object, upload it
          const response = await documentsAPI.upload(fileObj.file);
          if (response && response.success && response.data) {
            uploaded.push({
              id: response.data.id || response.data._id,
              name: fileObj.name,
              size: fileObj.size,
              url: response.data.url,
              uploadedAt: new Date()
            });
          }
        } catch (error) {
          console.error("Error uploading file:", fileObj.name, error);
          // If upload fails, we still keep the metadata but it won't have a URL
          uploaded.push({
            id: fileObj.id,
            name: fileObj.name,
            size: fileObj.size
          });
        }
      } else {
        // Already uploaded or from cloud, keep as is
        uploaded.push(fileObj);
      }
    }
    return uploaded;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedCustomer || (!selectedCustomer.id && !selectedCustomer._id)) {
      errors.customerName = "Please select a customer";
    }

    if (!formData.quoteNumber || !formData.quoteNumber.trim()) {
      errors.quoteNumber = "Quote number is required";
    }

    if (!formData.quoteDate) {
      errors.quoteDate = "Quote date is required";
    }

    // Also check if there's at least one valid item
    const validItems = formData.items.filter(item => {
      const quantityValue = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity));
      return item.itemDetails?.trim() && !isNaN(quantityValue) && quantityValue > 0;
    });

    if (validItems.length === 0) {
      errors.items = "Please add at least one item with quantity";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildQuoteFinancialsAndItems = () => {
    const isInclusive = isTaxInclusiveMode(formData);

    const validItems = formData.items
      .filter((item) => {
        if (item.itemType === "header") return false;
        const hasDetails = item.itemDetails?.trim();
        const quantity = parseFloat(item.quantity);
        const rate = parseFloat(item.rate);
        return hasDetails && !isNaN(quantity) && quantity > 0 && !isNaN(rate) && rate >= 0;
      })
      .map((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const lineSubtotal = quantity * rate;
        const taxMeta = getTaxMetaFromItem(item);
        const taxRate = taxMeta.rate;

        return {
          id: item._id || item.id,
          itemId: item.itemId || item._id || item.id,
          item: item.itemId || item._id || item.id,
          name: item.itemDetails || item.name || "Item",
          itemDetails: item.itemDetails || item.name || "Item",
          description: item.description || item.itemDetails || "",
          reportingTags: Array.isArray(item.reportingTags) ? item.reportingTags : [],
          quantity,
          rate,
          unitPrice: rate,
          tax: item.tax || "",
          taxRate,
          taxAmount: 0,
          amount: lineSubtotal,
          total: lineSubtotal,
          lineSubtotal
        };
      });

    const subTotal = validItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountAmount = computeDiscountAmount(subTotal, formData.discount, formData.discountType);

    const normalizedItems = validItems.map((item) => {
      const lineAmount = Number(item.lineSubtotal || 0);
      const discountedLineAmount = applyDiscountShare(lineAmount, subTotal, discountAmount);
      const taxAmount = calculateLineTaxAmount(discountedLineAmount, Number(item.taxRate || 0), isInclusive);
      return { ...item, taxAmount };
    });

    const itemsTax = normalizedItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const shipping = showShippingCharges ? (parseFloat(formData.shippingCharges) || 0) : 0;
    const shippingTaxObj = (showShippingCharges && shipping > 0 && formData.shippingChargeTax)
      ? getTaxBySelection(formData.shippingChargeTax)
      : null;
    const shippingTaxRate = shippingTaxObj ? parseTaxRate((shippingTaxObj as any).rate) : 0;
    const shippingTaxAmount = (showShippingCharges && shipping > 0 && shippingTaxRate > 0)
      ? calculateLineTaxAmount(shipping, shippingTaxRate, isInclusive)
      : 0;
    const totalTax = itemsTax + shippingTaxAmount;
    const adjustment = showAdjustment ? (parseFloat(formData.adjustment) || 0) : 0;
    const totalBeforeRound = isInclusive
      ? (subTotal - discountAmount + shipping + adjustment)
      : (subTotal + totalTax - discountAmount + shipping + adjustment);
    const roundedTotal = Number(totalBeforeRound.toFixed(2));
    const roundOff = Number((roundedTotal - totalBeforeRound).toFixed(2));
    const finalTotal = roundedTotal;

    return {
      validItems: normalizedItems,
      subTotal,
      totalTax,
      discountAmount,
      shipping,
      shippingTaxAmount,
      adjustment,
      roundOff,
      finalTotal
    };
  };

  const persistQuoteSeriesPreferences = async (options?: { prefix?: string; nextDigits?: string }) => {
    const nextDigitsValue = options?.nextDigits ?? quoteNextNumber;
    const prefixValue = options?.prefix ?? quotePrefix;
    const rawDigits = extractQuoteDigits(nextDigitsValue) || "1";
    const width = rawDigits.length >= 2 ? rawDigits.length : 6;
    const normalizedNextDigits = rawDigits.padStart(width, "0");
    const normalizedPrefix = sanitizeQuotePrefix(prefixValue);
    const normalizedNextNumberValue = parseInt(normalizedNextDigits, 10) || 1;

    if (!quoteSeriesRow) {
      try {
        const createdResponse: any = await transactionNumberSeriesAPI.createMultiple({
          seriesName: "Default Transaction Series",
          locationIds: [],
          modules: [
            {
              module: "Quote",
              prefix: normalizedPrefix,
              startingNumber: normalizedNextDigits,
              restartNumbering: "none",
              isDefault: true,
              status: "Active"
            }
          ]
        });
        const createdRows = Array.isArray(createdResponse?.data) ? createdResponse.data : [];
        if (createdRows.length) {
          setQuoteSeriesRows(createdRows);
          const resolved = resolveQuoteSeriesRow(createdRows);
          if (resolved) setQuoteSeriesRow(resolved);
        }
      } catch (error) {
        console.error("Failed to create transaction number series:", error);
        throw error;
      }
      return;
    }

    const seriesName = String(quoteSeriesRow?.seriesName || "Default Transaction Series").trim() || "Default Transaction Series";
    const matchingRows = (quoteSeriesRows || []).filter(
      (row) => String(row?.seriesName || "").toLowerCase() === seriesName.toLowerCase()
    );
    const rowsToUpdate = matchingRows.length ? matchingRows : [quoteSeriesRow];
    const locationIds = Array.isArray(quoteSeriesRow?.locationIds) ? quoteSeriesRow.locationIds : [];

    const modules = rowsToUpdate.map((row) => {
      const isQuoteRow = isQuoteSeriesRow(row);
      return {
        module: String(row?.module || row?.name || "Quote"),
        prefix: isQuoteRow ? normalizedPrefix : String(row?.prefix || ""),
        startingNumber: isQuoteRow ? normalizedNextDigits : String(row?.startingNumber ?? row?.nextNumber ?? "1"),
        restartNumbering: String(row?.restartNumbering || "none").toLowerCase() || "none",
        isDefault: Boolean(row?.isDefault),
        status: String(row?.status || "Active")
      };
    });

    await transactionNumberSeriesAPI.updateMultiple({
      seriesName,
      originalName: seriesName,
      locationIds,
      modules
    });

    setQuoteSeriesRows((prev) =>
      (prev || []).map((row) => {
        if (
          String(row?.seriesName || "").toLowerCase() === seriesName.toLowerCase() &&
          isQuoteSeriesRow(row)
        ) {
          return {
            ...row,
            prefix: normalizedPrefix,
            startingNumber: normalizedNextDigits,
            nextNumber: normalizedNextNumberValue
          };
        }
        return row;
      })
    );
    setQuoteSeriesRow((prev) =>
      prev
        ? {
          ...prev,
          prefix: normalizedPrefix,
          startingNumber: normalizedNextDigits,
          nextNumber: normalizedNextNumberValue
        }
        : prev
    );
  };

  const getNextQuoteNumberForSave = async () => {
    let quoteNumber = formData.quoteNumber;
    if (quoteNumberMode !== "auto") return quoteNumber;

    const seriesId = String(quoteSeriesRow?.id || quoteSeriesRow?._id || "").trim();
    if (seriesId) {
      try {
        const seriesResponse: any = await transactionNumberSeriesAPI.getNextNumber(seriesId);
        if (seriesResponse && seriesResponse.success && seriesResponse.data) {
          const serverQuoteNumber = String(seriesResponse.data.nextNumber || seriesResponse.data.next_number || "").trim();
          if (serverQuoteNumber) return serverQuoteNumber;
        }
      } catch (error) {
        console.error("Error getting next quote number from series:", error);
      }
    }

    try {
      const quoteNumberResponse = await quotesAPI.getNextNumber(quotePrefix);
      if (quoteNumberResponse && quoteNumberResponse.success && quoteNumberResponse.data) {
        const quoteNumberData: any = quoteNumberResponse.data || {};
        const serverQuoteNumber = String(quoteNumberData.quoteNumber || quoteNumberData.nextNumber || "").trim();
        const resolvedPrefix = deriveQuotePrefixFromNumber(serverQuoteNumber, quotePrefix);
        const resolvedNextDigits = extractQuoteDigits(quoteNumberData.nextNumber || serverQuoteNumber) || quoteNextNumber;
        quoteNumber = buildQuoteNumber(resolvedPrefix, resolvedNextDigits);
      }
    } catch (error) {
      console.error("Error getting next quote number:", error);
      const existingQuotes = await getQuotes();
      quoteNumber = buildQuoteNumber(quotePrefix, String(existingQuotes.length + 1));
    }

    return quoteNumber;
  };

  const extractSavedQuoteId = (savedQuote: any) => {
    if (!savedQuote) return "";

    const directId = savedQuote._id || savedQuote.id || savedQuote.quoteId;
    if (directId) return String(directId);

    const nested = savedQuote.data || savedQuote.quote || savedQuote.result;
    if (nested) {
      const nestedId = nested._id || nested.id || nested.quoteId;
      if (nestedId) return String(nestedId);
    }

    return "";
  };

  const hasCustomerAddress = () => {
    const sources = [
      billingAddress,
      shippingAddress,
      (selectedCustomer as any)?.billingAddress,
      (selectedCustomer as any)?.shippingAddress,
      (selectedCustomer as any)?.billing_address,
      (selectedCustomer as any)?.shipping_address
    ];
    return sources.some((addr: any) => {
      if (!addr) return false;
      const values = Object.values(addr).map((v) => String(v ?? "").trim());
      return values.some((v) => v.length > 0);
    });
  };

  const ensureCustomerHasAddress = async () => {
    if (hasCustomerAddress()) return true;
    const customerId = String((selectedCustomer as any)?.id || (selectedCustomer as any)?._id || "");
    if (!customerId) return false;

    const trimmed = (value: any) => String(value ?? "").trim();
    const addressPayload = {
      attention: trimmed(addressFormData.attention),
      country: trimmed(addressFormData.country) || "N/A",
      street1: trimmed(addressFormData.street1) || "N/A",
      street2: trimmed(addressFormData.street2),
      city: trimmed(addressFormData.city),
      state: trimmed(addressFormData.state),
      zipCode: trimmed(addressFormData.zipCode),
      phone: `${trimmed(addressFormData.phoneCountryCode)} ${trimmed(addressFormData.phone)}`.trim(),
      fax: trimmed(addressFormData.fax),
      phoneCountryCode: trimmed(addressFormData.phoneCountryCode),
    };

    try {
      await customersAPI.update(customerId, { billingAddress: addressPayload });
      setBillingAddress(addressPayload);
      setSelectedCustomer((prev: any) => prev ? { ...prev, billingAddress: addressPayload } : prev);
      return true;
    } catch (error) {
      console.error("Failed to auto-create customer address:", error);
      return false;
    }
  };

  const handleSaveDraft = async () => {
    if (saveLoading) return;

    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0] || "Please fill in all required fields marked with *";
      alert(firstError);
      return;
    }

    setSaveLoading("draft");

    try {
      await ensureCustomerHasAddress();
      // Upload files first

      const finalAttachedFiles = await uploadQuoteFiles(formData.attachedFiles);

      const {
        validItems,
        subTotal,
        totalTax,
        discountAmount,
        shipping,
        shippingTaxAmount,
        adjustment,
        roundOff,
        finalTotal
      } = buildQuoteFinancialsAndItems();

      // Get quote number from backend (only for new quotes)
      let quoteNumber = formData.quoteNumber;
      if (!isEditMode) {
        quoteNumber = await getNextQuoteNumberForSave();
      }

      // Prepare quote data
      const quoteData = {
        quoteNumber: quoteNumber,
        referenceNumber: formData.referenceNumber,
        customerName: formData.customerName,
        customer: selectedCustomer?.id || selectedCustomer?._id || formData.customerName,
        customerId: selectedCustomer?.id || selectedCustomer?._id || null,
        customerEmail: String((selectedCustomer as any)?.email || (selectedCustomer as any)?.primaryEmail || "").trim(),
        quoteDate: convertToISODate(formData.quoteDate),
        expiryDate: convertToISODate(formData.expiryDate),
        salesperson: formData.salesperson,
        salespersonId: formData.salespersonId,
        projectName: formData.projectName,
        subject: formData.subject,
        priceListId: String(selectedPriceList?.id || selectedPriceList?._id || ""),
        priceListName: String(selectedPriceList?.name || ""),
        taxPreference: formData.taxExclusive,
        taxExclusive: formData.taxExclusive,

        // Items array - filter out empty rows and ensure valid data
        items: validItems,

        // Summary
        subTotal: subTotal,
        totalTax: totalTax,
        subtotal: subTotal,
        tax: totalTax,
        taxAmount: totalTax,
        discount: showTransactionDiscount ? parseFloat(formData.discount || 0) : 0,
        discountType: showTransactionDiscount ? formData.discountType : "percent",
        discountAmount: discountAmount,
        discountAccount: formData.discountAccount,
        shippingCharges: shipping,
        shippingChargeTax: String(formData.shippingChargeTax || ""),
        shippingTaxAmount: shippingTaxAmount,
        adjustment: adjustment,
        roundOff: roundOff,
        total: finalTotal,


        // Other fields
        currency: formData.currency,
        customerNotes: formData.customerNotes,
        termsAndConditions: formData.termsAndConditions,
        reportingTags: formData.reportingTags || [],
        attachedFiles: finalAttachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          url: file.url
        })) || [],

        // Status
        status: "Draft"
      };

      // Save or update quote
      let savedQuote;
      if (isEditMode && quoteId) {
        savedQuote = await updateQuote(quoteId, quoteData);
      } else {
        savedQuote = await saveQuote(quoteData);
      }

      // Handle URL change to detect if we should show a specific modal
      // Navigate back to quotes page or quote detail
      if (savedQuote) {
        const id = extractSavedQuoteId(savedQuote) || quoteId || "";
        if (id) {
          navigate(`/sales/quotes/${id}`, { replace: true });
          return;
        }
      }
      navigate("/sales/quotes", { replace: true });
    } catch (error) {
      console.error("Error saving quote as draft:", error);
      const message = String((error as any)?.message || "");
      if (!message.toLowerCase().includes("must have at least one address")) {
        toast.error("Failed to save quote. Please try again.");
      }
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSaveAndSend = async () => {
    if (saveLoading) return;

    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0] || "Please fill in all required fields marked with *";
      toast.error(String(firstError));
      return;
    }

    setSaveLoading("send");
    try {
      await ensureCustomerHasAddress();


      // Upload files first
      const finalAttachedFiles = await uploadQuoteFiles(formData.attachedFiles);

      // Step 1: Save the quote as draft
      const {
        validItems,
        subTotal,
        totalTax,
        discountAmount,
        shipping,
        shippingTaxAmount,
        adjustment,
        roundOff,
        finalTotal
      } = buildQuoteFinancialsAndItems();

      let quoteNumber = formData.quoteNumber;
      if (!isEditMode) {
        quoteNumber = await getNextQuoteNumberForSave();
      }

      const quoteData = {
        quoteNumber: quoteNumber,
        referenceNumber: formData.referenceNumber,
        customerName: formData.customerName,
        customer: selectedCustomer?.id || selectedCustomer?._id || formData.customerName,
        customerId: selectedCustomer?.id || selectedCustomer?._id || null,
        customerEmail: String((selectedCustomer as any)?.email || (selectedCustomer as any)?.primaryEmail || "").trim(),
        quoteDate: convertToISODate(formData.quoteDate),
        expiryDate: convertToISODate(formData.expiryDate),
        salesperson: formData.salesperson,
        salespersonId: formData.salespersonId,
        projectName: formData.projectName,
        subject: formData.subject,
        priceListId: String(selectedPriceList?.id || selectedPriceList?._id || ""),
        priceListName: String(selectedPriceList?.name || ""),
        taxPreference: formData.taxExclusive,
        taxExclusive: formData.taxExclusive,
        items: validItems,
        subTotal: subTotal,
        totalTax: totalTax,
        subtotal: subTotal,
        tax: totalTax,
        taxAmount: totalTax,
        discount: showTransactionDiscount ? parseFloat(formData.discount || 0) : 0,
        discountType: showTransactionDiscount ? formData.discountType : "percent",
        discountAmount: discountAmount,
        discountAccount: formData.discountAccount,
        shippingCharges: shipping,
        shippingChargeTax: String(formData.shippingChargeTax || ""),
        shippingTaxAmount: shippingTaxAmount,
        adjustment: adjustment,
        roundOff: roundOff,
        total: finalTotal,

        currency: formData.currency,
        customerNotes: formData.customerNotes,
        termsAndConditions: formData.termsAndConditions,
        reportingTags: formData.reportingTags || [],
        attachedFiles: finalAttachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          url: file.url
        })) || [],
        status: "Draft", // Save as draft first
        date: formData.quoteDate
      };

      let savedQuote;
      if (isEditMode && quoteId) {
        savedQuote = await updateQuote(quoteId, quoteData);
      } else {
        savedQuote = await saveQuote(quoteData);
      }

      // Step 2: Navigate to email page
      if (savedQuote) {
        const id = savedQuote._id || savedQuote.id || quoteId;
        navigate(`/sales/quotes/${id}/email`, {
          state: {
            preloadedQuote: savedQuote,
            customerEmail: String((selectedCustomer as any)?.email || (selectedCustomer as any)?.primaryEmail || "").trim(),
          },
        });
      } else {
        throw new Error("Failed to save quote before sending.");
      }
    } catch (error: any) {
      console.error("Error in handleSaveAndSend:", error);
      const message = String(error?.message || "");
      if (!message.toLowerCase().includes("must have at least one address")) {
        toast.error(message || "Failed to save quote. Please try again.");
      }
    } finally {
      setSaveLoading(null);
    }
  };

  const handleCancel = () => {
    navigate("/sales/quotes");
  };

  const handleOtherAction = () => {
    // Handle "Other" action - can be customized based on requirements
    // You can add custom logic here for what "Other" should do
    // For example: open a modal with more options, or perform a specific action
  };

  const closeOpenDropdowns = () => {
    setIsCustomerDropdownOpen(false);
    setIsSalespersonDropdownOpen(false);
    setIsProjectDropdownOpen(false);
    setIsTaxPreferenceDropdownOpen(false);
    setIsLocationDropdownOpen(false);
    setIsPhoneCodeDropdownOpen(false);
    setIsCountryDropdownOpen(false);
    setIsUploadDropdownOpen(false);
    setIsAddNewRowDropdownOpen(false);
    setIsBulkActionsOpen(false);
    setIsQuoteDatePickerOpen(false);
    setIsExpiryDatePickerOpen(false);
  };

  const openExclusiveDropdown = (
    isOpen: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (isOpen) {
      setOpen(false);
      return;
    }
    closeOpenDropdowns();
    setOpen(true);
  };

  return (
    <>
      <div className="w-full min-h-full bg-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white">
          <div className="w-full px-8 h-16 flex justify-between items-center">
            <div className="h-full flex items-end gap-8">
              <button
                type="button"
                className={`h-full border-b-2 text-[18px] leading-none pb-3 font-medium transition-colors ${isSubscriptionMode ? "border-transparent text-gray-500 hover:text-gray-700" : "border-[#156372] text-gray-900"}`}
                onClick={() => navigate("/sales/quotes/new")}
              >
                Quote
              </button>
              <button
                type="button"
                className={`h-full border-b-2 text-[18px] leading-none pb-3 font-medium transition-colors ${isSubscriptionMode ? "border-[#156372] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => navigate("/sales/quotes/subscription/new")}
              >
                Subscription Quote
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/sales/quotes")}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full pb-28">
          {/* Form Fields Section */}
          <div className="bg-white overflow-visible">
            <div className="px-6 py-6 border-b border-gray-200 bg-[#f5f6f8]">
              {/* Customer Name */}
              <div className="flex items-start gap-4">
                <label className="text-sm text-red-600 w-44 pt-2 flex-shrink-0">
                  Customer Name*
                </label>
                <div className="w-full max-w-[540px] relative" ref={customerDropdownRef}>
                  <div className="relative flex items-stretch">
                    <input
                      type="text"
                      className={`flex-1 h-10 px-3 py-2 pr-10 border ${formErrors.customerName ? 'border-red-500' : isCustomerDropdownOpen ? 'border-[#156372]' : 'border-gray-300'} rounded-l text-sm text-gray-700 focus:outline-none focus:border-[#156372] bg-white`}
                      placeholder="Select or add a customer"
                      value={formData.customerName}
                      readOnly
                      onClick={() => {
                        if (!customers.length && !isCustomersLoading) {
                          void loadCustomersForDropdown();
                        }
                        openExclusiveDropdown(isCustomerDropdownOpen, setIsCustomerDropdownOpen);
                      }}
                    />
                    <div
                      className="absolute right-10 top-0 bottom-0 flex items-center px-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!customers.length && !isCustomersLoading) {
                          void loadCustomersForDropdown();
                        }
                        openExclusiveDropdown(isCustomerDropdownOpen, setIsCustomerDropdownOpen);
                      }}
                    >
                      {isCustomerDropdownOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                    <button
                      type="button"
                      className="w-10 h-10 bg-[#156372] text-white rounded-r hover:bg-[#0D4A52] flex items-center justify-center border border-[#156372]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomerSearchModalOpen(true);
                      }}
                    >
                      <Search size={16} />
                    </button>
                    {selectedCustomer && (
                      <button
                        type="button"
                        className="ml-3 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        {(selectedCustomer as any)?.currency || formData.currency || "AMD"}
                      </button>
                    )}
                  </div>

                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                      <div className="p-2 border-b border-gray-200 bg-white">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="w-full h-9 pl-9 pr-2 text-sm border border-[#156372] rounded-md focus:outline-none"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {isCustomersLoading ? (
                          <div className="p-3 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Loading customers...
                          </div>
                        ) : filteredCustomers.length > 0 ? (
                          filteredCustomers.map(customer => {
                            const customerId = customer.id || customer._id;
                            const customerName = customer.name || customer.displayName || customer.companyName || "";
                            const customerEmail = customer.email || "";
                            const customerCode = (customer as any).customerCode || (customer as any).code || (customer as any).customerNumber || "";
                            const customerCompany = customer.companyName || customerName;
                            return (
                              <div
                                key={customerId}
                                className="p-2 cursor-pointer rounded-md flex items-center gap-3 hover:bg-[#f4f8f7]"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-100 text-gray-600">
                                  {(customerName || "C").charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold truncate text-gray-900">
                                    {customerName}
                                    {customerCode ? <span className="ml-2 font-medium text-gray-500">{customerCode}</span> : null}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                                    <span className="inline-flex items-center gap-1 truncate">
                                      <Mail size={12} />
                                      {customerEmail || "-"}
                                    </span>
                                    <span className="inline-flex items-center gap-1 truncate">
                                      <Building2 size={12} />
                                      {customerCompany}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-sm text-gray-500">
                            No customers found
                          </div>
                        )}
                      </div>
                      <button
                        className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-white text-sm font-medium text-[#156372] w-full hover:bg-[#f4f8f7]"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsCustomerDropdownOpen(false);
                          await openCustomerQuickAction();
                        }}
                      >
                        <PlusCircle size={14} />
                        New Customer
                      </button>
                    </div>
                  )}

                  {selectedCustomer && (
                    <div className="mt-4 flex gap-20">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold tracking-wide text-gray-500">BILLING ADDRESS</span>
                        <div className="mt-2 text-[13px] text-gray-600">
                          {billingAddress?.street1 ? (
                            <div className="flex flex-col space-y-0.5 leading-relaxed">
                              <span className="font-medium text-gray-700">{billingAddress.attention}</span>
                              <span>{billingAddress.street1}</span>
                              <span>{billingAddress.city}, {billingAddress.state} {billingAddress.zipCode}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-[#156372] hover:text-[#0D4A52] font-medium text-[13px]"
                              onClick={() => openAddressModal("billing")}
                            >
                              New Address
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold tracking-wide text-gray-500">SHIPPING ADDRESS</span>
                        <div className="mt-2 text-[13px] text-gray-600">
                          {shippingAddress?.street1 ? (
                            <div className="flex flex-col space-y-0.5 leading-relaxed">
                              <span className="font-medium text-gray-700">{shippingAddress.attention}</span>
                              <span>{shippingAddress.street1}</span>
                              <span>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-[#156372] hover:text-[#0D4A52] font-medium text-[13px]"
                              onClick={() => openAddressModal("shipping")}
                            >
                              New Address
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isLocationFeatureEnabled && (
                <div className="flex items-start gap-4 mt-3">
                  <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
                    Location
                  </label>
                  <div className="w-full max-w-[300px] relative">
                    <button
                      type="button"
                      className="w-full h-10 px-3 pr-8 border border-gray-300 rounded text-sm text-gray-700 bg-white flex items-center justify-between focus:outline-none focus:border-[#156372]"
                      onClick={() => openExclusiveDropdown(isLocationDropdownOpen, setIsLocationDropdownOpen)}
                    >
                      <span className="truncate">{formData.selectedLocation || "Head Office"}</span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    {isLocationDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 overflow-hidden">
                        {locationOptions.map((loc) => (
                          <button
                            type="button"
                            key={loc}
                            className={`w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${formData.selectedLocation === loc ? "bg-gray-100 font-medium" : ""}`}
                            onClick={() => {
                              setFormData((prev: any) => ({ ...prev, selectedLocation: loc }));
                              setIsLocationDropdownOpen(false);
                            }}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-5">
              {/* Quote# */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-red-600 w-44 pt-2 flex-shrink-0">
                  Quote#*
                </label>
                <div className="flex-1 max-w-xs relative">
                  <input
                    type="text"
                    name="quoteNumber"
                    className={`w-full px-3 py-2 border ${formErrors.quoteNumber ? 'border-red-500' : 'border-gray-300'} rounded text-sm text-gray-700 bg-gray-50 focus:outline-none`}
                    value={formData.quoteNumber}
                    readOnly
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#156372] hover:text-[#0D4A52]"
                    onClick={() => setIsQuoteNumberModalOpen(true)}
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>

              {/* Reference# */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
                  Reference#
                </label>
                <div className="flex-1 max-w-xs">
                  <input
                    type="text"
                    name="referenceNumber"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372]"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-red-600 w-44 pt-2 flex-shrink-0">
                  Quote Date*
                </label>
                <div className="flex-1 flex items-center gap-8">
                  <div className="w-48 relative" ref={quoteDatePickerRef}>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border ${formErrors.quoteDate ? 'border-red-500' : 'border-gray-300'} rounded text-sm text-gray-700 focus:outline-none`}
                      value={formatDateForDisplay(formData.quoteDate)}
                      readOnly
                      onClick={() => openExclusiveDropdown(isQuoteDatePickerOpen, setIsQuoteDatePickerOpen)}
                    />
                    {isQuoteDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 w-64 p-4">
                        {/* Calendar Header */}
                        <div className="flex justify-between items-center mb-3">
                          <button
                            onClick={() => navigateMonth("prev", "quoteDate")}
                            type="button"
                            className="p-1 text-gray-600 cursor-pointer"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <div className="text-sm font-semibold text-gray-900">
                            {months[quoteDateCalendar.getMonth()]} {quoteDateCalendar.getFullYear()}
                          </div>
                          <button
                            onClick={() => navigateMonth("next", "quoteDate")}
                            type="button"
                            className="p-1 text-gray-600 cursor-pointer"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {daysOfWeek.map((day) => (
                            <div key={day} className="text-center text-xs font-medium py-1 text-gray-700">
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysInMonth(quoteDateCalendar).map((day, index) => {
                            const isSelected = formData.quoteDate && formatDate(day.fullDate) === formData.quoteDate;
                            const isCurrentMonth = day.month === "current";
                            return (
                              <button
                                key={index}
                                onClick={() => handleDateSelect(day.fullDate, "quoteDate")}
                                type="button"
                                className={`p-2 text-sm rounded cursor-pointer ${isSelected ? "bg-[#156372] text-white font-semibold" : isCurrentMonth ? "text-gray-900 " : "text-gray-400 "}`}
                              >
                                {day.date}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-700 whitespace-nowrap">Expiry Date</label>
                    <div className="w-48 relative" ref={expiryDatePickerRef}>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none"
                        placeholder="dd/MM/yyyy"
                        value={formatDateForDisplay(formData.expiryDate)}
                        readOnly
                        onClick={() => openExclusiveDropdown(isExpiryDatePickerOpen, setIsExpiryDatePickerOpen)}
                      />
                      {isExpiryDatePickerOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 w-64 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <button onClick={() => navigateMonth("prev", "expiryDate")} type="button" className="p-1 text-gray-600 cursor-pointer">
                              <ChevronLeft size={18} />
                            </button>
                            <div className="text-sm font-semibold text-gray-900">
                              {months[expiryDateCalendar.getMonth()]} {expiryDateCalendar.getFullYear()}
                            </div>
                            <button onClick={() => navigateMonth("next", "expiryDate")} type="button" className="p-1 text-gray-600 cursor-pointer">
                              <ChevronRight size={18} />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {daysOfWeek.map((day) => (
                              <div key={day} className="text-center text-xs font-medium py-1 text-gray-700">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(expiryDateCalendar).map((day, index) => {
                              const isSelected = formData.expiryDate && formatDate(day.fullDate) === formData.expiryDate;
                              const isCurrentMonth = day.month === "current";
                              const isDisabled = false;
                              return (
                                <button
                                  key={index}
                                  onClick={() => handleDateSelect(day.fullDate, "expiryDate")}
                                  type="button"
                                  disabled={isDisabled}
                                  className={`p-2 text-sm rounded ${isDisabled ? "text-gray-300 cursor-not-allowed opacity-70" : "cursor-pointer"} ${!isDisabled && isSelected ? "bg-[#156372] text-white font-semibold" : isCurrentMonth ? "text-gray-900 " : "text-gray-400 "}`}
                                >
                                  {day.date}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Salesperson */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
                  Salesperson
                </label>
                <div className="flex-1 max-w-xs relative" ref={salespersonDropdownRef}>
                  <div
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 flex justify-between items-center bg-white cursor-pointer"
                    onClick={() => openExclusiveDropdown(isSalespersonDropdownOpen, setIsSalespersonDropdownOpen)}
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
                          filteredSalespersons.map(salesperson => (
                            <div
                              key={salesperson.id || salesperson._id}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer truncate"
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
                          setIsManageSalespersonsOpen(true);
                          setIsSalespersonDropdownOpen(false);
                        }}
                      >
                        <PlusCircle size={16} />
                        <span>Manage Salespersons</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Name */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
                  Project Name
                </label>
                <div className="flex-1 max-w-xs relative" ref={projectDropdownRef}>
                  <div
                    className={`w-full px-3 py-2 border border-gray-300 rounded text-sm flex justify-between items-center ${!selectedCustomer
                      ? "bg-gray-100 cursor-not-allowed text-gray-400"
                      : "bg-white cursor-pointer text-gray-700"
                      }`}
                    onClick={() => {
                      if (selectedCustomer) {
                        openExclusiveDropdown(isProjectDropdownOpen, setIsProjectDropdownOpen);
                      }
                    }}
                  >
                    <span className={formData.projectName ? "text-gray-900" : "text-gray-400"}>
                      {formData.projectName || "Select a project"}
                    </span>
                    {isProjectDropdownOpen ? (
                      <ChevronUp size={14} className="text-[#156372]" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-400" />
                    )}
                  </div>
                  {isProjectDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <Search size={14} className="text-gray-400" />
                        <input type="text" placeholder="Search" value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="flex-1 text-sm focus:outline-none" autoFocus />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredProjects.length > 0 ? (
                          filteredProjects.map(project => (
                            <div key={project.id || project._id} className="p-2 cursor-pointer hover:bg-gray-50" onClick={() => handleProjectSelect(project)}>
                              <div className="text-sm font-medium truncate text-gray-900">{project.projectName || project.name}</div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-gray-500 uppercase tracking-wide">No Results Found</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="w-full p-2 border-t border-gray-200 bg-gray-50 text-[#156372] text-sm font-medium flex items-center gap-2"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await openProjectQuickAction();
                        }}
                      >
                        <PlusCircle size={14} />
                        Add New
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div className="flex items-start gap-4 mb-8">
                <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
                  Subject
                </label>
                <div className="flex-1 max-w-2xl">
                  <textarea
                    name="subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-none"
                    placeholder="Let your customer know what this Quote is for"
                    value={formData.subject}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-3 max-w-[980px]">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {isTaxPreferenceLocked ? (
                    <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <Briefcase size={14} className="text-gray-400" />
                      <span>{resolvedTaxPreference}</span>
                    </div>
                  ) : (
                    <div className="relative" ref={taxPreferenceDropdownRef}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-[#156372] transition-colors"
                        onClick={() => {
                          openExclusiveDropdown(isTaxPreferenceDropdownOpen, setIsTaxPreferenceDropdownOpen);
                        }}
                      >
                        <Briefcase size={14} className="text-gray-400" />
                        <span>{formData.taxExclusive}</span>
                        {isTaxPreferenceDropdownOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </button>

                      {isTaxPreferenceDropdownOpen && (
                        <div className="absolute left-0 top-full mt-2 w-[220px] rounded-md border border-gray-200 bg-white shadow-lg z-[90] overflow-hidden">
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={taxPreferenceSearch}
                                onChange={(e) => setTaxPreferenceSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full h-8 pl-7 pr-2 text-sm border border-[#3b82f6] rounded-md outline-none"
                              />
                            </div>
                          </div>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">Item Tax Preference</div>
                          <div className="py-1">
                            {filteredTaxPreferenceOptions.length > 0 ? filteredTaxPreferenceOptions.map((option) => {
                              const selected = formData.taxExclusive === option;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between ${selected ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-white"}`}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, taxExclusive: option }));
                                    setIsTaxPreferenceDropdownOpen(false);
                                    setTaxPreferenceSearch("");
                                  }}
                                >
                                  <span>{option}</span>
                                  {selected ? <Check size={14} className="text-gray-700" /> : null}
                                </button>
                              );
                            }) : (
                              <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Item Table Section */}
            <div className="max-w-[980px]">
              <div className="mt-3 bg-white border border-gray-200 rounded-md overflow-visible">
                <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 bg-[#f8f9fb] rounded-t-md">
                  <h2 className="text-[13px] font-semibold text-gray-800">Item Table</h2>
                  <div className="relative" ref={bulkActionsRef}>
                    <div
                      className="flex items-center gap-1 text-[#156372] cursor-pointer hover:text-[#0D4A52] text-sm font-medium"
                      onClick={() => openExclusiveDropdown(isBulkActionsOpen, setIsBulkActionsOpen)}
                    >
                      <CheckCircle size={14} />
                      <span>Bulk Actions</span>
                    </div>
                    {isBulkActionsOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px]">
                        <button
                          onClick={() => {
                            setShowAdditionalInformation(!showAdditionalInformation);
                            setIsBulkActionsOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          {showAdditionalInformation ? "Hide All Additional Information" : "Show All Additional Information"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase">Item Details</th>
                      <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-24">Quantity</th>
                      <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-32">Rate</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-40">Tax</th>
                      <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-32">Amount</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-200 group">
                        <td className="py-2 px-3">
                          {item.itemType === "header" ? (
                            <input
                              type="text"
                              value={item.itemDetails}
                              onChange={(e) => handleItemChange(item.id, 'itemDetails', e.target.value)}
                              placeholder="Header Title"
                              className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm font-bold bg-gray-50"
                            />
                          ) : (

                            <div className="flex gap-3 items-start">
                              <div className="pt-2 text-gray-300">
                                <GripVertical size={14} />
                              </div>
                              {/* Image Placeholder */}
                              <div className="w-9 h-9 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 mt-1 flex-shrink-0">
                                <ImageIcon size={18} />
                              </div>

                              <div className="flex-1 space-y-2 min-w-[200px]">
                                <div
                                  className="relative"
                                  ref={(el) => { itemDropdownRefs.current[String(item.id)] = el; }}
                                >
                                  <input
                                    type="text"
                                    value={item.itemDetails}
                                    onChange={(e) => {
                                      handleItemChange(item.id, 'itemDetails', e.target.value);
                                      setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }));
                                      if (!openItemDropdowns[item.id]) {
                                        setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                      }
                                    }}
                                    onFocus={() => {
                                      if (!openItemDropdowns[item.id]) {
                                        setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                      }
                                    }}
                                    placeholder="Type or click to select an item."
                                    className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm bg-transparent font-medium text-gray-900"
                                  />
                                  {openItemDropdowns[item.id] && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-[60] max-h-60 overflow-y-auto w-[400px]">
                                      <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                                          <Search size={14} className="text-gray-400" />
                                          <input
                                            type="text"
                                            placeholder="Search items or plans..."
                                            className="flex-1 bg-transparent text-sm outline-none"
                                            value={itemSearches[item.id] || ""}
                                            onChange={(e) => setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                            autoFocus
                                          />
                                        </div>
                                      </div>
                                      {getFilteredItems(item.id).map((availItem) => (
                                        <div
                                          key={availItem.id}
                                          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                          onClick={() => handleItemSelect(item.id, availItem)}
                                        >
                                          <div className="font-medium flex items-center gap-2">
                                            <span>{availItem.name}</span>
                                            {availItem.entityType === "plan" ? (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e6f4f7] text-[#156372]">Plan</span>
                                            ) : null}
                                          </div>
                                          <div className="text-[11px] text-gray-500">
                                            {availItem.entityType === "plan" ? "Code" : "SKU"}: {availItem.code || availItem.sku || "-"}
                                          </div>
                                        </div>
                                      ))}
                                      <div
                                        className="px-4 py-2 text-sm text-[#156372] hover:bg-gray-50 cursor-pointer font-medium border-t border-gray-100"
                                        onClick={() => {
                                          setNewItemTargetRowId(item.id);
                                          setIsNewItemModalOpen(true);
                                          setOpenItemDropdowns(prev => ({ ...prev, [item.id]: false }));
                                        }}
                                      >
                                        + New Item
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {(showAdditionalInformation || additionalInfoItemIds.includes(String(item.id))) && (
                                  <>
                                    <textarea
                                      value={item.description || ""}
                                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                      placeholder="Add a description to your item"
                                      className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-xs text-gray-500 resize-none bg-transparent"
                                      rows={2}
                                    />
                                    <button
                                      type="button"
                                      className="mt-1 inline-flex items-center gap-2 text-xs text-gray-700 hover:text-[#156372]"
                                      onClick={() => {
                                        const isCurrentOpen = isReportingTagsModalOpen && currentReportingTagsItemId === item.id;
                                        if (isCurrentOpen) {
                                          setCurrentReportingTagsItemId(null);
                                          setIsReportingTagsModalOpen(false);
                                          return;
                                        }
                                        handleOpenReportingTagsModal(item.id);
                                      }}
                                    >
                                      <Tag size={12} className="text-gray-500" />
                                      <span>{getItemReportingTagsSummaryLabel(item)}</span>
                                      <ChevronDown size={12} className="text-gray-500" />
                                    </button>
                                    {renderReportingTagsInlinePanel(item)}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          {item.itemType !== "header" && (
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm text-center bg-transparent"
                                step="0.01"
                              />
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          {item.itemType !== "header" && (
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm text-center bg-transparent"
                                step="0.01"
                              />
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          {item.itemType !== "header" && (
                            <div className="relative" ref={(el) => { taxDropdownRefs.current[String(item.id)] = el; }}>
                              {(() => {
                                const selectedTaxObj: any = getTaxBySelection(item.tax);
                                const fallbackRate = parseTaxRate(item.taxRate);
                                const displayLabel = selectedTaxObj
                                  ? taxLabel(selectedTaxObj)
                                  : (fallbackRate > 0 ? `Tax [${fallbackRate}%]` : "Select a Tax");
                                const searchValue = taxSearches[item.id] || "";
                                const filteredGroups = getFilteredTaxGroups(searchValue);
                                const hasTaxes = filteredGroups.length > 0;

                                return (
                                  <>
                                    <button
                                      type="button"
                                      className="w-full px-2 py-1.5 border border-gray-300 bg-white rounded outline-none text-sm text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                                      onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                    >
                                      <span className={displayLabel === "Select a Tax" ? "text-gray-500" : "text-gray-900"}>
                                        {displayLabel}
                                      </span>
                                      <ChevronDown
                                        size={14}
                                        className={`transition-transform ${openTaxDropdowns[item.id] ? "rotate-180" : ""}`}
                                        style={{ color: "#156372" }}
                                      />
                                    </button>

                                    {openTaxDropdowns[item.id] && (
                                      <div className="absolute left-0 top-full z-[9999] mt-1 w-72 rounded-xl border border-[#d6dbe8] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                                        <div className="p-2">
                                          <div className="flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: "#156372" }}>
                                            <Search size={14} className="text-slate-400" />
                                            <input
                                              type="text"
                                              value={searchValue}
                                              onChange={(e) => setTaxSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
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
                                                  const label = taxLabel(tax.raw ?? tax);
                                                  const selected = String(item.tax || "") === taxId || Number(item.taxRate || 0) === tax.rate;
                                                  return (
                                                    <button
                                                      key={taxId}
                                                      type="button"
                                                      onClick={() => {
                                                        handleItemChange(item.id, "tax", taxId);
                                                        setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                                        setTaxSearches(prev => ({ ...prev, [item.id]: "" }));
                                                      }}
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
                                            setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                            setNewTaxTargetItemId(item.id);
                                            setIsNewTaxQuickModalOpen(true);
                                          }}
                                        >
                                          <PlusCircle size={14} />
                                          New Tax
                                        </button>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right align-top">
                          {item.itemType !== "header" && (
                            <span className="text-sm font-medium text-gray-900 block py-1.5">
                              {item.amount.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center align-top">
                          <div
                            className="relative inline-flex items-center gap-2 py-1.5"
                            ref={(el) => {
                              itemMenuRefs.current[String(item.id)] = el;
                            }}
                          >
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenItemMenuId(openItemMenuId === item.id ? null : item.id);
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-600 transition-colors"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X size={16} />
                            </button>

                            {openItemMenuId === item.id && (
                              <div className="absolute top-full right-0 mt-0 min-w-[200px] bg-white border border-gray-200 rounded shadow-lg z-[80] overflow-hidden">
                                <button
                                  type="button"
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                  onClick={() => {
                                    setShowAdditionalInformation((prev) => !prev);
                                    setAdditionalInfoItemIds([]);
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  {showAdditionalInformation
                                    ? "Hide Additional Information"
                                    : "Show Additional Information"}
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                  onClick={() => {
                                    handleDuplicateItem(item.id);
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  Clone
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                  onClick={() => {
                                    const index = formData.items.findIndex((i: any) => i.id === item.id);
                                    if (index >= 0) {
                                      handleAddItem(index + 1);
                                    }
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  Insert New Row
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                  onClick={() => {
                                    const index = formData.items.findIndex((i: any) => i.id === item.id);
                                    if (index >= 0) {
                                      setBulkAddInsertIndex(index);
                                      setIsBulkAddModalOpen(true);
                                    }
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  Insert Items in Bulk
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                  onClick={() => {
                                    const index = formData.items.findIndex((i: any) => i.id === item.id);
                                    if (index >= 0) {
                                      handleInsertHeader(index);
                                    }
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  Insert New Header
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

              {/* Add Row Buttons */}
              <div className="mt-4 flex items-center gap-3 w-full justify-start self-start">
                <div className="relative">
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-[#eef3ff] border border-[#d7deef] text-[#1f3f79] rounded-md text-sm font-medium hover:bg-[#e7eefb] transition-colors"
                    onClick={() => openExclusiveDropdown(isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen)}
                  >
                    <Plus size={16} />
                    Add New Row
                    <ChevronDown size={14} />
                  </button>
                  {isAddNewRowDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px]">
                      <div
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          handleAddItem();
                          setIsAddNewRowDropdownOpen(false);
                        }}
                      >
                        Default Row
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-[#eef3ff] border border-[#d7deef] text-[#1f3f79] rounded-md text-sm font-medium hover:bg-[#e7eefb] transition-colors"
                  onClick={() => setIsBulkAddModalOpen(true)}
                >
                  <Plus size={16} />
                  Add Items in Bulk
                </button>
              </div>



              {/* Summary and Notes Section */}
              <div className="mt-5 pb-16 space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_500px] gap-8 items-start">
                  <div className="flex-1 w-full max-w-[520px]">
                    <label className="block text-sm text-gray-700 mb-2 font-medium">Customer Notes</label>
                    <textarea
                      name="customerNotes"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-none h-24"
                      placeholder="Will be displayed on the quote"
                      value={formData.customerNotes}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="w-full max-w-[520px] bg-[#f3f5f8] rounded-lg p-5 space-y-4 border border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">Sub Total</span>
                      <span className="text-gray-900 font-semibold">{formData.subTotal.toFixed(2)}</span>
                    </div>

                    {showTransactionDiscount && (
                      <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                        <span className="text-gray-700">Discount</span>
                        <div className="h-8 flex items-center border border-gray-300 rounded bg-white overflow-hidden">
                          <input
                            type="number"
                            className="w-full h-full px-2 text-right text-xs outline-none bg-transparent"
                            value={formData.discount}
                            onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                          />
                          <select
                            className="h-full min-w-[46px] px-1 text-[11px] text-gray-500 bg-[#f8fafc] border-l border-gray-300 outline-none cursor-pointer"
                            value={formData.discountType}
                            onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                          >
                            <option value="percent">%</option>
                            <option value="amount">{formData.currency}</option>
                          </select>
                        </div>
                        <span className="text-gray-900 font-medium text-right">
                          {(formData.discountType === "percent" ? (formData.subTotal * formData.discount / 100) : formData.discount).toFixed(2)}
                        </span>
                      </div>
                    )}



                    {showShippingCharges && (
                      <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-700">Shipping Charges</span>
                          <HelpCircle size={14} className="text-gray-400" />
                        </div>
                        <input
                          type="number"
                          className="w-full h-8 px-2 text-right border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white"
                          value={formData.shippingCharges}
                          onChange={(e) => setFormData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-gray-900 font-medium text-right">{(parseFloat(String(formData.shippingCharges)) || 0).toFixed(2)}</span>
                      </div>
                    )}

                    {showShippingCharges && (parseFloat(String(formData.shippingCharges)) || 0) > 0 && (
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                        <span className="text-gray-700">Shipping Charge Tax</span>
                        <select
                          value={String(formData.shippingChargeTax || "")}
                          onChange={(e) => setFormData(prev => ({ ...prev, shippingChargeTax: e.target.value }))}
                          className="w-56 h-8 px-2 border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white text-gray-700"
                        >
                          <option value="">Select a Tax</option>
                          {taxes.map((tax: any) => {
                            const taxId = String(tax.id || tax._id || "");
                            const taxName = tax.name || tax.taxName || "Tax";
                            const rate = Number(tax.rate || 0);
                            return (
                              <option key={taxId} value={taxId}>
                                {taxName} [{rate}%]
                              </option>
                            );
                          })}
                        </select>
                        <span></span>
                      </div>
                    )}

                    <div className="border-t border-gray-200 my-2"></div>

                    {taxBreakdown.map((tx) => (
                      <div key={tx.label} className="grid grid-cols-[1fr_auto] items-center text-sm">
                        <span className="text-gray-700">{tx.label}</span>
                        <span className="text-gray-900 font-medium">{tx.amount.toFixed(2)}</span>
                      </div>
                    ))}

                    {showAdjustment && (
                      <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-700">Adjustment</span>
                          <HelpCircle size={14} className="text-gray-400" />
                        </div>
                        <input
                          type="number"
                          className="w-full h-8 px-2 text-right border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white"
                          value={formData.adjustment}
                          onChange={(e) => setFormData(prev => ({ ...prev, adjustment: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-gray-900 font-medium text-right">{(parseFloat(String(formData.adjustment)) || 0).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[30px] leading-none font-semibold text-gray-900">Total ({formData.currency})</span>
                        <span className="text-[30px] leading-none font-bold text-gray-900">{formData.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-md bg-[#f5f6f8] p-4 grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-8">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-medium">Terms & Conditions</label>
                    <textarea
                      name="termsAndConditions"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-none h-24"
                      placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                      value={formData.termsAndConditions}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-medium">Attach File(s) to Quote</label>
                    <div className="relative flex items-center gap-2" ref={uploadDropdownRef}>
                      <button
                        type="button"
                        className="h-10 px-4 border border-dashed border-gray-300 rounded-md bg-white text-sm text-[#156372] hover:bg-[#f4f8f7] transition-colors inline-flex items-center gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={15} />
                        Upload File
                        <ChevronDown size={14} className="text-gray-400" />
                      </button>
                      {formData.attachedFiles.length > 0 && (
                        <button
                          type="button"
                          className="h-10 min-w-[40px] px-3 rounded-md bg-[#156372] text-white text-sm font-semibold hover:bg-[#0f5661] transition-colors inline-flex items-center justify-center"
                          onClick={() => openExclusiveDropdown(isUploadDropdownOpen, setIsUploadDropdownOpen)}
                        >
                          <Paperclip size={14} className="mr-1" />
                          {formData.attachedFiles.length}
                        </button>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        multiple
                        className="hidden"
                        accept="*/*"
                      />
                      {isUploadDropdownOpen && (
                        <div className="absolute left-0 mt-2 translate-y-[44px] w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          <div className="p-2 space-y-2">
                            {formData.attachedFiles.length > 0 ? (
                              formData.attachedFiles.map((file: any) => (
                                <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
                                    <p className="text-xs text-gray-500">File Size: {(Number(file.size || 0) / 1024).toFixed(1)} KB</p>
                                  </div>
                                  <button
                                    type="button"
                                    className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => handleRemoveFile(file.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500">No files uploaded</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">You can upload a maximum of 5 files, 10MB each</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
      {priceListSwitchDialog && typeof document !== "undefined" && document.body && createPortal(
        <div className="fixed inset-0 z-[12100] bg-slate-900/35">
          <div className="flex min-h-full items-start justify-center px-4 pt-6">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start gap-4 border-b border-slate-200 px-5 py-6">
                <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-600">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 pr-6">
                  <p className="text-base font-semibold text-slate-900">
                    {priceListSwitchDialog.nextPriceListName
                      ? "You have selected a customer with a different price list."
                      : "You have selected a customer without a price list."}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {priceListSwitchDialog.nextPriceListName
                      ? `${priceListSwitchDialog.customerName} uses "${priceListSwitchDialog.nextPriceListName}". You can apply this new price list to update item rates and discounts on the quote, or keep the existing price list "${priceListSwitchDialog.currentPriceListName}".`
                      : `${priceListSwitchDialog.customerName} does not have a saved price list. You can clear the current quote price list "${priceListSwitchDialog.currentPriceListName}" and use the standard item rates, or keep the existing price list.`}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setPriceListSwitchDialog(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 px-5 py-5">
                <button
                  type="button"
                  className="rounded-md bg-[#156372] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0f4f5b]"
                  onClick={() => applyResolvedPriceListChoice(
                    priceListSwitchDialog.nextPriceListName,
                    priceListSwitchDialog.nextPriceListName
                      ? (priceListSwitchDialog.nextPriceListCurrency || priceListSwitchDialog.customerCurrency)
                      : priceListSwitchDialog.customerCurrency
                  )}
                >
                  {priceListSwitchDialog.nextPriceListName ? "Apply New Price List" : "Clear Price List"}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setPriceListSwitchDialog(null)}
                >
                  Keep Existing Price List
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[12000] bg-black/45 flex items-start justify-center pt-3 pb-4 px-4" onClick={() => !isAddressSaving && setIsAddressModalOpen(false)}>
          <div className="w-full max-w-[620px] rounded-lg bg-white shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <h3 className="text-[28px] leading-none font-medium text-gray-800">
                {addressModalType === "billing" ? "Billing Address" : "Shipping Address"}
              </h3>
              <button
                type="button"
                className="w-7 h-7 rounded-md border border-[#2f80ed] text-red-500 flex items-center justify-center hover:bg-blue-50"
                onClick={() => setIsAddressModalOpen(false)}
                disabled={isAddressSaving}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-3.5 space-y-3.5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[12px] text-gray-700 mb-1">Attention</label>
                <input className="w-full h-9 rounded border border-gray-300 px-3 text-[12px] text-gray-700 outline-none focus:border-[#156372]" name="attention" value={addressFormData.attention} onChange={handleAddressFieldChange} autoFocus />
              </div>

              <div>
                <label className="block text-[12px] text-gray-700 mb-1">Country/Region</label>
                <div className="relative" ref={countryDropdownRef}>
                  <button
                    type="button"
                    className="w-full h-9 rounded border border-gray-300 px-3 text-[12px] text-gray-700 outline-none focus:border-[#156372] bg-white flex items-center justify-between"
                    onClick={() => {
                      openExclusiveDropdown(isCountryDropdownOpen, setIsCountryDropdownOpen);
                      setCountrySearch("");
                    }}
                  >
                    <span className={addressFormData.country ? "text-gray-700" : "text-gray-400"}>
                      {addressFormData.country || "Select or type to add"}
                    </span>
                    {isCountryDropdownOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </button>
                  {isCountryDropdownOpen && (
                    <div className="absolute left-0 top-full z-[13000] mt-1 w-full rounded-md border border-gray-200 bg-white shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search"
                            className="h-9 w-full rounded border border-gray-300 pl-7 pr-2 text-[12px] text-gray-700 outline-none focus:border-[#156372]"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredCountryOptions.length === 0 ? (
                          <div className="px-3 py-2 text-[12px] text-gray-500">No matching country</div>
                        ) : (
                          filteredCountryOptions.map((country: any) => (
                            <button
                              key={country.isoCode}
                              type="button"
                              className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f4f8f7] ${String(addressFormData.country || "").toLowerCase() === String(country.name || "").toLowerCase() ? "bg-[#e6f4f7] text-[#156372]" : "text-gray-700"}`}
                              onClick={() => {
                                setAddressFormData((prev: any) => ({ ...prev, country: String(country.name || "") }));
                                setIsCountryDropdownOpen(false);
                                setCountrySearch("");
                              }}
                            >
                              {country.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-gray-700 mb-1">Address</label>
                <textarea className="w-full min-h-[50px] rounded border border-gray-300 px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#156372]" name="street1" value={addressFormData.street1} onChange={handleAddressFieldChange} placeholder="Street 1" />
                <textarea className="mt-2 w-full min-h-[50px] rounded border border-gray-300 px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#156372]" name="street2" value={addressFormData.street2} onChange={handleAddressFieldChange} placeholder="Street 2" />
              </div>

              <div>
                <label className="block text-[12px] text-gray-700 mb-1">City</label>
                <input className="w-full h-9 rounded border border-gray-300 px-3 text-[12px] text-gray-700 outline-none focus:border-[#156372]" name="city" value={addressFormData.city} onChange={handleAddressFieldChange} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] text-gray-700 mb-1">State</label>
                  <input className="w-full h-9 rounded border border-gray-300 px-3 text-[12px] text-gray-700 outline-none focus:border-[#156372]" name="state" value={addressFormData.state} onChange={handleAddressFieldChange} placeholder="Select or type to add" list="state-list" />
                  <datalist id="state-list">
                    {stateOptions.map((state: any) => (
                      <option key={state.isoCode} value={state.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[12px] text-gray-700 mb-1">ZIP Code</label>
                  <input className="w-full h-9 rounded border border-gray-300 px-3 text-[12px] text-gray-700 outline-none focus:border-[#156372]" name="zipCode" value={addressFormData.zipCode} onChange={handleAddressFieldChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] text-gray-700 mb-1">Phone</label>
                  <div className="grid grid-cols-[88px_1fr] gap-0">
                    <div className="relative" ref={phoneCodeDropdownRef}>
                      <button
                        type="button"
                        className="h-9 w-full rounded-l border border-gray-300 px-2 text-[12px] text-gray-700 bg-white flex items-center justify-between outline-none focus:border-[#156372]"
                        onClick={() => {
                          openExclusiveDropdown(isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen);
                          setPhoneCodeSearch("");
                        }}
                      >
                        <span>{addressFormData.phoneCountryCode || "+"}</span>
                        {isPhoneCodeDropdownOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </button>

                      {isPhoneCodeDropdownOpen && (
                        <div className="absolute left-0 top-full z-[13000] mt-1 w-[320px] rounded-md border border-gray-200 bg-white shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={phoneCodeSearch}
                                onChange={(e) => setPhoneCodeSearch(e.target.value)}
                                placeholder="Search"
                                className="h-9 w-full rounded border border-gray-300 pl-7 pr-2 text-[12px] text-gray-700 outline-none focus:border-[#156372]"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredPhoneCountryOptions.length === 0 ? (
                              <div className="px-3 py-2 text-[12px] text-gray-500">No matching country code</div>
                            ) : (
                              filteredPhoneCountryOptions.map((country: any) => (
                                <button
                                  key={`${country.isoCode}-${country.phoneCode}`}
                                  type="button"
                                  className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#3b82f6] hover:text-white ${addressFormData.phoneCountryCode === country.phoneCode ? "bg-[#3b82f6] text-white" : "text-gray-700"}`}
                                  onClick={() => {
                                    setAddressFormData((prev: any) => ({ ...prev, phoneCountryCode: country.phoneCode }));
                                    setIsPhoneCodeDropdownOpen(false);
                                  }}
                                >
                                  <span className="inline-block w-14">{country.phoneCode}</span>
                                  <span>{country.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <input className="h-9 rounded-r border border-l-0 border-gray-300 px-3 text-[12px] text-gray-700 outline-none focus:border-[#156372]" name="phone" value={addressFormData.phone} onChange={handleAddressFieldChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] text-gray-700 mb-1">Fax Number</label>
                  <input className="w-full h-9 rounded border border-gray-300 px-3 text-[12px] text-gray-700 outline-none focus:border-[#156372]" name="fax" value={addressFormData.fax} onChange={handleAddressFieldChange} />
                </div>
              </div>

              <p className="text-[12px] text-gray-500">
                <span className="font-semibold">Note:</span> Changes made here will be updated for this customer.
              </p>
            </div>

            <div className="px-5 py-3.5 border-t border-gray-200 flex items-center gap-3">
              <button
                type="button"
                className="px-5 h-9 rounded-md bg-[#15803d] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-70"
                onClick={handleSaveAddress}
                disabled={isAddressSaving}
              >
                {isAddressSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="px-5 h-9 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-70"
                onClick={() => setIsAddressModalOpen(false)}
                disabled={isAddressSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-white py-4 z-50">
        <div className="px-8">
          <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saveLoading !== null}
            className={`px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 ${saveLoading !== null ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {saveLoading === "draft" ? <Loader2 size={16} className="animate-spin" /> : null}
            {saveLoading === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={handleSaveAndSend}
            disabled={saveLoading !== null}
            className={`px-6 py-2 bg-[#156372] text-white rounded text-sm font-semibold hover:bg-[#0D4A52] transition-colors flex items-center gap-2 ${saveLoading !== null ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {saveLoading === "send" ? <Loader2 size={16} className="animate-spin" /> : null}
            {saveLoading === "send" ? "Saving..." : "Save and Send"}
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          </div>
        </div>
      </div>

      {/* New Item Modal */}
      {isNewItemModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setIsNewItemModalOpen(false);
            setNewItemTargetRowId(null);
          }}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[90vh] overflow-y-auto bg-gray-50">
              <NewItemForm
                onCancel={() => {
                  setIsNewItemModalOpen(false);
                  setNewItemTargetRowId(null);
                }}
                onCreate={handleCreateItemFromModal}
                baseCurrency={baseCurrencyCode ? { code: baseCurrencyCode } : undefined}
                formTitle="New Item"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* New Project Modal */}
      {
        isNewProjectModalOpen && (
          <div className="new-invoice-modal-overlay" onClick={handleCancelNewProject}>
            <div className="new-project-modal" onClick={(e) => e.stopPropagation()}>
              <div className="new-project-modal-header">
                <h2 className="new-project-modal-title">New Project</h2>
                <button
                  className="new-project-modal-close"
                  onClick={handleCancelNewProject}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="new-project-modal-body">
                {/* Project Name */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Project Name<span className="new-project-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    className="new-project-input"
                    value={newProjectData.projectName}
                    onChange={handleNewProjectChange}
                  />
                </div>

                {/* Project Code */}
                <div className="new-project-field-row">
                  <label className="new-project-label">Project Code</label>
                  <input
                    type="text"
                    name="projectCode"
                    className="new-project-input"
                    value={newProjectData.projectCode}
                    onChange={handleNewProjectChange}
                  />
                </div>

                {/* Customer Name */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Customer Name<span className="new-project-required">*</span>
                  </label>
                  <div className="new-project-customer-select">
                    <select
                      name="customerName"
                      className="new-project-select"
                      value={newProjectData.customerName}
                      onChange={handleNewProjectChange}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.name}>{customer.name}</option>
                      ))}
                    </select>
                    <button type="button" className="new-project-search-btn">
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                {/* Billing Method */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Billing Method<span className="new-project-required">*</span>
                  </label>
                  <select
                    name="billingMethod"
                    className="new-project-select"
                    value={newProjectData.billingMethod}
                    onChange={handleNewProjectChange}
                  >
                    <option value="Fixed Cost for Project">Fixed Cost for Project</option>
                    <option value="Based on Project Hours">Based on Project Hours</option>
                    <option value="Based on Task Hours">Based on Task Hours</option>
                    <option value="Based on Staff Hours">Based on Staff Hours</option>
                  </select>
                </div>

                {/* Total Project Cost */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Total Project Cost<span className="new-project-required">*</span>
                  </label>
                  <div className="new-project-price-input">
                    <span className="new-project-currency-prefix">{formData.currency}</span>
                    <input
                      type="number"
                      name="totalProjectCost"
                      className="new-project-input new-project-input-with-prefix"
                      value={newProjectData.totalProjectCost}
                      onChange={handleNewProjectChange}
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="new-project-field-row">
                  <label className="new-project-label">Description</label>
                  <textarea
                    name="description"
                    className="new-project-textarea"
                    placeholder="Max. 2000 characters"
                    value={newProjectData.description}
                    onChange={handleNewProjectChange}
                    rows={3}
                    maxLength={2000}
                  />
                </div>

                {/* Budget Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Budget</h3>

                  {/* Cost Budget */}
                  <div className="new-project-field-row">
                    <label className="new-project-label">
                      Cost Budget
                      <Info size={14} className="new-project-info-icon" />
                    </label>
                    <div className="new-project-price-input">
                      <span className="new-project-currency-prefix">{formData.currency}</span>
                      <input
                        type="number"
                        name="costBudget"
                        className="new-project-input new-project-input-with-prefix"
                        value={newProjectData.costBudget}
                        onChange={handleNewProjectChange}
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Revenue Budget */}
                  <div className="new-project-field-row">
                    <label className="new-project-label">
                      Revenue Budget
                      <Info size={14} className="new-project-info-icon" />
                    </label>
                    <div className="new-project-price-input">
                      <span className="new-project-currency-prefix">{formData.currency}</span>
                      <input
                        type="number"
                        name="revenueBudget"
                        className="new-project-input new-project-input-with-prefix"
                        value={newProjectData.revenueBudget}
                        onChange={handleNewProjectChange}
                        step="0.01"
                      />
                    </div>
                  </div>

                  <button type="button" className="new-project-link-button">
                    Add budget for project hours.
                  </button>
                </div>

                {/* Users Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Users</h3>

                  <table className="new-project-table">
                    <thead>
                      <tr>
                        <th className="new-project-th" style={{ width: "60px" }}>S.NO</th>
                        <th className="new-project-th">USER</th>
                        <th className="new-project-th">EMAIL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProjectData.users.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="new-project-td new-project-empty-row">
                            No users added yet
                          </td>
                        </tr>
                      ) : (
                        newProjectData.users.map((user, index) => (
                          <tr key={user.id}>
                            <td className="new-project-td">{index + 1}</td>
                            <td className="new-project-td">{user.name}</td>
                            <td className="new-project-td">{user.email}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    className="new-project-add-button"
                    onClick={handleAddProjectUser}
                  >
                    <Plus size={16} />
                    Add User
                  </button>
                </div>

                {/* Project Tasks Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Project Tasks</h3>

                  <table className="new-project-table">
                    <thead>
                      <tr>
                        <th className="new-project-th" style={{ width: "60px" }}>S.NO</th>
                        <th className="new-project-th">TASK NAME</th>
                        <th className="new-project-th">DESCRIPTION</th>
                        <th className="new-project-th" style={{ width: "50px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProjectData.tasks.map((task, index) => (
                        <tr key={task.id}>
                          <td className="new-project-td">{index + 1}</td>
                          <td className="new-project-td">
                            <input
                              type="text"
                              className="new-project-table-input"
                              placeholder="Task Name"
                              value={task.taskName}
                              onChange={(e) => handleProjectTaskChange(task.id, 'taskName', e.target.value)}
                            />
                          </td>
                          <td className="new-project-td">
                            <textarea
                              className="new-project-table-textarea"
                              placeholder="Description"
                              value={task.description}
                              onChange={(e) => handleProjectTaskChange(task.id, 'description', e.target.value)}
                              rows={2}
                            />
                          </td>
                          <td className="new-project-td">
                            {newProjectData.tasks.length > 1 && (
                              <button
                                type="button"
                                className="new-project-delete-button"
                                onClick={() => handleRemoveProjectTask(task.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    className="new-project-add-button"
                    onClick={handleAddProjectTask}
                  >
                    <Plus size={16} />
                    Add Project Task
                  </button>
                </div>

                {/* Add to Watchlist */}
                <div className="new-project-checkbox-row">
                  <label className="new-project-checkbox-label">
                    <input
                      type="checkbox"
                      name="addToWatchlist"
                      checked={newProjectData.addToWatchlist}
                      onChange={handleNewProjectChange}
                      className="new-project-checkbox"
                    />
                    Add to the watchlist on my dashboard
                  </label>
                </div>
              </div>

              <div className="new-project-modal-footer">
                <button
                  className="new-project-button new-project-button-primary"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onClick={handleSaveNewProject}
                >
                  Save and Select
                </button>
                <button
                  className="new-project-button new-project-button-cancel"
                  onClick={handleCancelNewProject}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Quote Number Configuration Modal */}
      {
        isQuoteNumberModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 z-50"
            onClick={() => setIsQuoteNumberModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-[520px] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2 className="text-[18px] leading-none font-medium text-gray-800">Configure Quote Number Preferences</h2>
                <button
                  onClick={() => setIsQuoteNumberModalOpen(false)}
                  className="w-7 h-7 rounded-md border border-[#2f80ed] text-red-500 flex items-center justify-center hover:bg-blue-50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-4">
                <div className="grid grid-cols-[1fr_1fr] gap-x-5 gap-y-1 pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-[13px] leading-none font-semibold text-gray-800 mb-2">Location</p>
                    <p className="text-[14px] leading-none text-gray-700">{formData.selectedLocation || "Head Office"}</p>
                  </div>
                  <div>
                    <p className="text-[13px] leading-none font-semibold text-gray-800 mb-2">Associated Series</p>
                    <p className="text-[14px] leading-none text-gray-700">
                      {quoteSeriesRow?.seriesName || "Default Transaction Series"}
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  {quoteNumberMode === "auto" ? (
                    <p className="text-[12px] leading-[1.45] text-gray-700 mb-3 max-w-[96%]">
                      Your quote numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                    </p>
                  ) : (
                    <p className="text-[12px] leading-[1.45] text-gray-700 mb-3 max-w-[96%]">
                      You have selected manual quote numbering. Do you want us to auto-generate it for you?
                    </p>
                  )}

                  <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="pt-1">
                        <input
                          type="radio"
                          name="quoteNumberMode"
                          value="auto"
                          checked={quoteNumberMode === "auto"}
                          onChange={() => setQuoteNumberMode("auto")}
                          className="w-4 h-4 text-[#2f80ed] border-gray-300 focus:ring-[#2f80ed] cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] leading-none font-semibold text-gray-800">
                            Continue auto-generating quote numbers
                          </span>
                          <Info size={11} className="text-gray-400" />
                        </div>
                        {quoteNumberMode === "auto" && (
                          <div className="mt-3 pl-4">
                            <div className="grid grid-cols-[95px_1fr] gap-3">
                              <div>
                                <label className="block text-[11px] text-gray-700 mb-1">Prefix</label>
                                <input
                                  type="text"
                                  value={quotePrefix}
                                  onChange={(e) => {
                                    const nextPrefix = sanitizeQuotePrefix(e.target.value);
                                    setQuotePrefix(nextPrefix);
                                    setFormData(prev => ({
                                      ...prev,
                                      quoteNumber: buildQuoteNumber(nextPrefix, quoteNextNumber)
                                    }));
                                  }}
                                  className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-[12px] text-gray-700 focus:outline-none focus:border-[#156372]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-gray-700 mb-1">Next Number</label>
                                <input
                                  type="text"
                                  value={quoteNextNumber}
                                  onChange={(e) => {
                                    const nextDigits = extractQuoteDigits(e.target.value) || "";
                                    setQuoteNextNumber(nextDigits);
                                    setFormData(prev => ({
                                      ...prev,
                                      quoteNumber: buildQuoteNumber(quotePrefix, nextDigits)
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
                          name="quoteNumberMode"
                          value="manual"
                          checked={quoteNumberMode === "manual"}
                          onChange={() => setQuoteNumberMode("manual")}
                          className="w-4 h-4 text-[#2f80ed] border-gray-300 focus:ring-[#2f80ed] cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[13px] leading-none text-gray-700">
                          Enter quote numbers manually
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    const nextDigits = extractQuoteDigits(quoteNextNumber) || "1";
                    const width = nextDigits.length >= 2 ? nextDigits.length : 6;
                    const normalizedDigits = nextDigits.padStart(width, "0");
                    const normalizedPrefix = sanitizeQuotePrefix(quotePrefix);
                    setQuoteNextNumber(normalizedDigits);
                    setQuotePrefix(normalizedPrefix);
                    setFormData(prev => ({
                      ...prev,
                      quoteNumber:
                        quoteNumberMode === "auto"
                          ? buildQuoteNumber(normalizedPrefix, normalizedDigits)
                          : prev.quoteNumber
                    }));
      try {
        await persistQuoteSeriesPreferences();
        toast.success("Quote number series updated.");
      } catch (error) {
                        console.error("Error saving quote number series:", error);
                        toast.error("Failed to save quote number series.");
                      }
                    setIsQuoteNumberModalOpen(false);
                  }}
                  className="px-4 h-8 bg-[#156372] text-white rounded-md text-[12px] font-semibold hover:bg-[#0f5661]"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsQuoteNumberModalOpen(false)}
                  className="px-4 h-8 bg-white border border-gray-300 text-gray-700 rounded-md text-[12px] font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Contact Person Modal */}
      {
        isAddContactPersonModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]" onClick={() => setIsAddContactPersonModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-semibold text-gray-800">Add Contact Person</h2>
                <button onClick={() => setIsAddContactPersonModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 overflow-y-auto flex-1">
                <div className="flex gap-12">
                  {/* Left side - Form */}
                  <div className="flex-1 space-y-5">
                    {/* Salutation & First Name */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Salutation</label>
                      <select
                        name="salutation"
                        value={contactPersonData.salutation}
                        onChange={handleContactPersonChange}
                        className="w-1/3 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      >
                        <option value="">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Miss.">Miss.</option>
                        <option value="Dr.">Dr.</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-[#ea5b23] flex items-center gap-0.5">
                        First Name<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={contactPersonData.firstName}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Last Name */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={contactPersonData.lastName}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Email Address */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-[#ea5b23] flex items-center gap-0.5">
                        Email Address<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={contactPersonData.email}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Work Phone */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Work Phone</label>
                      <div className="flex gap-2">
                        <select
                          name="workPhonePrefix"
                          value={contactPersonData.workPhonePrefix}
                          onChange={handleContactPersonChange}
                          className="w-24 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                        >
                          <option value="+358">+358</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+91">+91</option>
                        </select>
                        <input
                          type="text"
                          name="workPhone"
                          value={contactPersonData.workPhone}
                          onChange={handleContactPersonChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                        />
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Mobile</label>
                      <div className="flex gap-2">
                        <select
                          name="mobilePrefix"
                          value={contactPersonData.mobilePrefix}
                          onChange={handleContactPersonChange}
                          className="w-24 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                        >
                          <option value="+358">+358</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+91">+91</option>
                        </select>
                        <input
                          type="text"
                          name="mobile"
                          value={contactPersonData.mobile}
                          onChange={handleContactPersonChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                        />
                      </div>
                    </div>

                    {/* Skype */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Skype Name/Number</label>
                      <input
                        type="text"
                        name="skype"
                        value={contactPersonData.skype}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Designation */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={contactPersonData.designation}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Department */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Department</label>
                      <input
                        type="text"
                        name="department"
                        value={contactPersonData.department}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>
                  </div>

                  {/* Right side - Profile Image */}
                  <div className="w-48 flex flex-col items-center pt-2">
                    <div className="w-32 h-32 rounded border border-gray-300 bg-gray-50 flex items-center justify-center relative group overflow-hidden">
                      {contactPersonData.profileImage ? (
                        <img
                          src={URL.createObjectURL(contactPersonData.profileImage)}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-400">Profile Image</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <input type="file" className="hidden" accept="image/*" onChange={handleContactPersonImageUpload} />
                        <span className="text-white text-[10px] font-medium uppercase tracking-wider">Change Image</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-start gap-4">
                <button
                  onClick={handleSaveContactPerson}
                  className="px-6 py-1.5 bg-[#156372] text-white rounded text-sm font-medium hover:bg-[#0D4A52] transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsAddContactPersonModalOpen(false)}
                  className="px-6 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
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
                  className="p-2  rounded-md text-gray-600 "
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
                        placeholder="Type to search or scan the barcode of the item or plan."
                        value={bulkAddSearch}
                        onChange={(e) => setBulkAddSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {getBulkFilteredItems().map(item => {
                      const isSelected = bulkSelectedItems.find(selected => selected.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`p-4 cursor-pointer  border-b border-gray-200 flex items-center justify-between ${isSelected ? "bg-[#e8f7fa]" : ""
                            }`}
                          onClick={() => handleBulkItemToggle(item)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              <span>{item.name}</span>
                              {item.entityType === "plan" ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e6f4f7] text-[#156372]">Plan</span>
                              ) : null}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {item.entityType === "plan" ? "Code" : "SKU"}: {item.code || item.sku || "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            {isSelected && (
                              <div className="mt-2 w-6 h-6 bg-[#156372] rounded-full flex items-center justify-center">
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
                                {selectedItem.entityType === "plan" ? "Code" : "SKU"}: {selectedItem.code || selectedItem.sku || "-"} • {formData.currency}{Number(selectedItem.rate || 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                value={selectedItem.quantity || 1}
                                onChange={(e) => handleBulkItemQuantityChange(selectedItem.id, e.target.value)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBulkItemToggle(selectedItem);
                                }}
                                className="p-1 text-red-500  rounded"
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
                  className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium  disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleAddBulkItems}
                  disabled={bulkSelectedItems.length === 0}
                >
                  Add Items
                </button>
                <button
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium "
                  onClick={handleCancelBulkAdd}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Documents Modal */}
      {
        isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]" onClick={() => setIsDocumentsModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 m-0">Documents</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Files"
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                    />
                    {documentSearch && (
                      <button
                        onClick={() => setDocumentSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 "
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setIsDocumentsModalOpen(false)}
                    className="p-1 text-gray-400 "
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Navigation - INBOXES */}
                <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">INBOXES</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedInbox("files")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "files"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <Folder size={16} />
                        Files
                      </button>
                      <button
                        onClick={() => setSelectedInbox("bank-statements")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "bank-statements"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <CreditCard size={16} />
                        Bank Statements
                      </button>
                      <button
                        onClick={() => setSelectedInbox("all-documents")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "all-documents"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <FileText size={16} />
                        All Documents
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {(() => {
                    // Filter documents based on selected inbox
                    let filteredDocs = availableDocuments;

                    if (selectedInbox === "files") {
                      filteredDocs = availableDocuments.filter(doc =>
                        doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder
                      );
                    } else if (selectedInbox === "bank-statements") {
                      filteredDocs = availableDocuments.filter(doc =>
                        doc.folder === "Bank Statements" || doc.module === "Banking"
                      );
                    } else if (selectedInbox === "all-documents") {
                      filteredDocs = availableDocuments;
                    }

                    // Filter by search term
                    if (documentSearch) {
                      filteredDocs = filteredDocs.filter(doc =>
                        doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
                        (doc.associatedTo && doc.associatedTo.toLowerCase().includes(documentSearch.toLowerCase()))
                      );
                    }

                    const allSelected = filteredDocs.length > 0 && filteredDocs.every(doc => selectedDocuments.includes(doc.id));

                    if (filteredDocs.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                          <p className="text-gray-600 mb-4">Autoscan is disabled. Please enable it from the Inbox module.</p>
                          <a
                            href="#"
                            className="text-[#156372] "
                            onClick={(e) => {
                              e.preventDefault();
                              setIsDocumentsModalOpen(false);
                              navigate('/documents');
                            }}
                          >
                            Go to Inbox
                          </a>
                        </div>
                      );
                    }

                    return (
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        {/* Table Header */}
                        <div className="bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 px-4 py-3">
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocuments(filteredDocs.map(doc => doc.id));
                                } else {
                                  setSelectedDocuments(selectedDocuments.filter(id => !filteredDocs.some(doc => doc.id === id)));
                                }
                              }}
                              className="cursor-pointer"
                            />
                          </div>
                          <div className="col-span-4">
                            <span className="text-xs font-semibold text-gray-700 uppercase">FILE NAME</span>
                          </div>
                          <div className="col-span-5">
                            <span className="text-xs font-semibold text-gray-700 uppercase">DETAILS</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs font-semibold text-gray-700 uppercase">UPLOADED BY</span>
                          </div>
                        </div>

                        {/* Table Body - Documents */}
                        {filteredDocs.map((doc) => (
                          <div key={doc.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-200 ">
                            <div className="col-span-1 flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.includes(doc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDocuments([...selectedDocuments, doc.id]);
                                  } else {
                                    setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </div>
                            <div className="col-span-4">
                              <a href="#" className="text-sm text-[#156372] ">
                                {doc.name}
                              </a>
                            </div>
                            <div className="col-span-5">
                              <div className="text-sm text-gray-700 space-y-1">
                                {doc.associatedTo && <div>{doc.associatedTo}</div>}
                                {doc.module && <div>Module: {doc.module}</div>}
                                {doc.uploadedOn && <div>Date: {doc.uploadedOn}</div>}
                                {doc.size && <div>Size: {doc.size}</div>}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-sm text-gray-700">{doc.uploadedBy || "Me"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (selectedDocuments.length > 0) {
                      // Get selected documents from availableDocuments
                      const selectedDocs = availableDocuments.filter(doc =>
                        selectedDocuments.includes(doc.id)
                      );

                      // Convert to attachedFiles format
                      const newDocs = selectedDocs.map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                        file: null,
                        documentId: doc.id // Store reference to document
                      }));

                      setFormData(prev => ({
                        ...prev,
                        attachedFiles: [...prev.attachedFiles, ...newDocs]
                      }));
                    }
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  className="px-6 py-2.5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer "
                >
                  Attachments
                </button>
                <button
                  onClick={() => {
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer   "
                >
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsCloudPickerOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-700">Cloud Picker</h2>
                <button
                  onClick={() => setIsCloudPickerOpen(false)}
                  className="text-red-500 "
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-1 overflow-hidden">
                {/* Cloud Services Sidebar */}
                <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                  <div className="p-2">
                    {[
                      { id: "zoho", name: "Zoho WorkDrive", icon: LayoutGrid },
                      { id: "gdrive", name: "Google Drive", icon: HardDrive },
                      { id: "dropbox", name: "Dropbox", icon: Box },
                      { id: "box", name: "Box", icon: Square },
                      { id: "onedrive", name: "OneDrive", icon: Cloud },
                      { id: "evernote", name: "Evernote", icon: FileText },
                    ].map((provider) => {
                      const IconComponent = provider.icon;
                      const isSelected = selectedCloudProvider === provider.id;
                      return (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedCloudProvider(provider.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${isSelected
                            ? "bg-[#e8f7fa] text-[#156372] border-l-4 border-[#156372]"
                            : "text-gray-700 "
                            }`}
                        >
                          <IconComponent
                            size={24}
                            className={isSelected ? "text-[#156372]" : "text-gray-500"}
                          />
                          <span>{provider.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Scroll indicator */}
                  <div className="mt-auto p-2 flex justify-center">
                    <div className="flex flex-col gap-1">
                      <ChevronUp size={16} className="text-gray-300" />
                      <ChevronDown size={16} className="text-gray-300" />
                    </div>
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho. The use and transfer of information received from Google APIs to Zoho will adhere to{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            Google API Services User Data Policy
                          </a>
                          , including the{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            Limited Use Requirements
                          </a>
                          .
                        </p>
                      </div>

                      {/* Authenticate Google Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://accounts.google.com/v3/signin/accountchooser?access_type=offline&approval_prompt=force&client_id=932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Fauth%2Fgoogle&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&state=3a3b0106a0c2d908b369a75ad93185c0aa431c64497733bda2d375130c4da610d88104c252c552adc1dee9d6167ad6bb8d2258113b9dce48b47ca4a970314a1fa7b51df3a7716016ac37be9e7d4d9f21077f946b82dc039ae2f08b7be79117042545529cf82d67d58ef6426621f5b5f885af900571347968d419f6d1a5abe3e7e1a3a4d04a433a6b3c5173f68c0c5bea&dsh=S557386361%3A1766903862725658&o2v=1&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAP8z-36EGAbjuuLEd2uWDyjQgraM1HNpjnJVe4mUhXhPOQkoJHNKZG6WoCFPPrb5EDYGeFuyF3TI7jUSvDUIwBbk0PGoZLgn4Jt5TdOWWzFyQf6jLfEXhnKHaHRvCzRofERa0CbAnwAUviCEIRh6OE8GWAy3xDGHH6VltpKe7vSGjJfzwkDnAckJm1v9fghFiv7u6_xqfZlF8iB26QlWNE86HHYqzyIP3N9LKEh0NWNZAdiV__IdSu_RqOJPYoHDRNRRsyctIbVsj3CDhUyCADZvROzoeQI9VvIqJSiWLTxE7royBXKDDS96rJYovyIQ79hC_n_aNjoPVUD9jfp5cnJkn_rkGpzetwAYJTRSKhP8gM5YlFdK2Pfp2uT6ZHzVAOYmlyeCX4dc1IsyRtinTLx5WyAUPR_QcLPQzuQcRPvtjL23ZvKxoexvKp3t4zX_HTFKMrduT4G6ojAd7C-kurnZ1Wx6g%26flowName%3DGeneralOAuthFlow%26as%3DS557386361%253A1766903862725658%26client_id%3D932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fgadgets.zoho.com",
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
                          {/* Dropbox Box Logo - Geometric box made of smaller boxes */}
                          <svg viewBox="0 0 128 128" className="w-full h-full">
                            <defs>
                              <linearGradient id="dropboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0061FF" />
                                <stop offset="100%" stopColor="#0052CC" />
                              </linearGradient>
                            </defs>
                            {/* Dropbox geometric box icon - composed of smaller boxes */}
                            <g fill="url(#dropboxGradient)">
                              {/* Top-left box */}
                              <rect x="8" y="8" width="48" height="48" rx="4" />
                              {/* Top-right box */}
                              <rect x="72" y="8" width="48" height="48" rx="4" />
                              {/* Bottom-left box */}
                              <rect x="8" y="72" width="48" height="48" rx="4" />
                              {/* Bottom-right box */}
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate Dropbox Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=ovpkm9147d63ifh&redirect_uri=https://gadgets.zoho.com/dropbox/auth/v2/saveToken&state=190d910cedbc107e58195259f79a434d05c66c88e1e6eaa0bc585c6a0fddb159871ede64adb4d5da61c107ca7cbb7bae891c80e9c69cf125faaaf622ab58f37c5b1d42b42c7f3add07d92465295564a6c5bd98228654cce8ff68da24941db6f0aab9a60398ac49e41b3ec211acfd5bcc&force_reapprove=true&token_access_type=offline",
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
                          {/* Box Logo - Blue "b" inside a square with cloud background */}
                          <div className="relative">
                            {/* White cloud shape background */}
                            <div className="absolute inset-0 bg-gray-100 rounded-full transform scale-110"></div>
                            {/* Blue square with rounded corners */}
                            <div className="relative w-24 h-24 bg-[#0061D5] rounded-lg flex items-center justify-center">
                              {/* White lowercase "b" */}
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate Box Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://account.box.com/api/oauth2/authorize?response_type=code&client_id=f95f6ysfm8vg1q3g84m0xyyblwnj3tr5&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Fauth%2Fbox&state=37e352acfadd37786b1d388fb0f382baa59c9246f4dda329361910db55643700578352e4636bde8a0743bd3060e51af0ee338a34b2080bbd53a337f46b0995e28facbeff76d7efaf8db4493a0ef77be45364e38816d94499fba739987744dd1f6f5c08f84c0a11b00e075d91d7ea5c6d",
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
                          {/* OneDrive Logo - Blue cloud icon */}
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate OneDrive Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=0ecabec7-1fac-433f-a968-9985926b51c3&state=e0b1053c9465a9cb98fea7eea99d3074930c6c5607a21200967caf2db861cf9df77442c92e8565087c2a339614e18415cbeb95d59c63605cee4415353b2c44da13c6b9f34bca1fcd3abdd630595133a5232ddb876567bedbe620001a59c9989df94c3823476d0eef4363b351e8886c5563f56bc9d39db9f3db7c37cd1ad827c5.%5E.US&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Ftpa%2Foffice365&response_type=code&prompt=select_account&scope=Files.Read%20User.Read%20offline_access&sso_reload=true",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate OneDrive
                      </button>
                    </div>
                  ) : selectedCloudProvider === "evernote" ? (
                    /* Evernote Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Evernote Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Evernote Logo - Green square with elephant head */}
                          <div className="relative w-32 h-32 bg-[#00A82D] rounded-lg flex items-center justify-center shadow-lg">
                            {/* Elephant head silhouette - simplified */}
                            <svg viewBox="0 0 100 100" className="w-20 h-20">
                              {/* Elephant head - main shape */}
                              <path
                                d="M 50 15 Q 25 15 15 35 Q 10 45 10 60 Q 10 75 20 85 Q 15 80 15 70 Q 15 60 25 55 Q 20 50 20 40 Q 20 30 30 30 Q 35 25 40 30 Q 45 25 50 30 Q 55 25 60 30 Q 65 25 70 30 Q 75 30 75 40 Q 75 50 70 55 Q 80 60 80 70 Q 80 80 75 85 Q 85 75 85 60 Q 85 45 80 35 Q 70 15 50 15 Z"
                                fill="#2D2926"
                              />
                              {/* Elephant ear */}
                              <ellipse cx="20" cy="50" rx="8" ry="15" fill="#2D2926" />
                              {/* Elephant trunk */}
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate Evernote Button */}
                      <button
                        className="px-8 py-3 bg-[#00A82D] text-white rounded-md text-sm font-semibold  shadow-sm"
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
                      {/* Illustration Area - Using a placeholder illustration */}
                      <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                        <div className="relative w-full h-full">
                          {/* Stylized illustration with people and documents */}
                          <div className="absolute inset-0 flex items-end justify-center">
                            {/* Person on document with laptop */}
                            <div className="relative">
                              <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2"></div>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-[#156372] rounded-full flex items-center justify-center">
                                  <Plus size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                                <div className="w-8 h-6 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            {/* Person pushing document */}
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
                            {/* Person with list */}
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
                          {/* Decorative shapes */}
                          <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <div className="absolute top-12 right-12 w-4 h-4 bg-[#156372] transform rotate-45"></div>
                          <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                          <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                        </div>
                      </div>

                      {/* Description Text */}
                      <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                        Zoho WorkDrive is an online file sync, storage and content collaboration platform.
                      </p>

                      {/* Set up your team button */}
                      <button
                        className="px-6 py-2.5 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://workdrive.zoho.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=ZohoBooks",
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
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium "
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsCloudPickerOpen(false);
                  }}
                  className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium "
                >
                  Attach
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
                  className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center "
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
                      className="px-4 py-2 border border-gray-300 rounded-l-md bg-white text-sm font-medium text-gray-700  flex items-center gap-2"
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
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 "
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
                    className="px-6 py-2 bg-red-600 text-white rounded-md  font-medium"
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
                          className=" cursor-pointer"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setFormData(prev => ({ ...prev, customerName: customer.displayName || customer.name || "" }));
                            setCustomerSearchModalOpen(false);
                            setCustomerSearchTerm("");
                            setCustomerSearchResults([]);
                          }}
                        >
                          <td className="px-4 py-3 text-sm text-[#156372] ">
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
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed "
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
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed "
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
      {
        typeof document !== "undefined" && document.body && createPortal(
          <div
            className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
            onClick={closeCustomerQuickAction}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-[84vw] h-[92vh] max-w-[1120px] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-1 bg-[#f6f7fb] p-0">
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
                  className="w-full h-full bg-white border-0"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Quick New Project Modal */}
      {
        typeof document !== "undefined" && document.body && createPortal(
          <div
            className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewProjectQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
            onClick={() => {
              setIsNewProjectQuickActionOpen(false);
              reloadProjectsForQuote();
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1400px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">New Project (Quick Action)</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isReloadingProjectFrame || isAutoSelectingProjectFromQuickAction}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => {
                      setIsReloadingProjectFrame(true);
                      setProjectQuickActionFrameKey(prev => prev + 1);
                    }}
                  >
                    {isReloadingProjectFrame ? "Reloading..." : "Reload Form"}
                  </button>
                  <button
                    type="button"
                    disabled={isRefreshingProjectsQuickAction || isAutoSelectingProjectFromQuickAction}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={async () => {
                      setIsRefreshingProjectsQuickAction(true);
                      await reloadProjectsForQuote();
                      setIsRefreshingProjectsQuickAction(false);
                    }}
                  >
                    {isRefreshingProjectsQuickAction ? "Refreshing..." : "Refresh Projects"}
                  </button>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                  onClick={() => {
                    setIsNewProjectQuickActionOpen(false);
                    reloadProjectsForQuote();
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 p-2 bg-gray-100">
                <iframe
                  key={projectQuickActionFrameKey}
                  title="New Project Quick Action"
                  src={`/time-tracking/projects/new?embed=1${selectedCustomer?.id ? `&customerId=${encodeURIComponent(String(selectedCustomer.id))}` : ""}`}
                  loading="eager"
                  onLoad={async () => {
                    if (isReloadingProjectFrame) {
                      setIsReloadingProjectFrame(false);
                    }
                    await tryAutoSelectNewProjectFromQuickAction();
                  }}
                  className="w-full h-full bg-white rounded border border-gray-200"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* New Salesperson Modal */}
      {
        isNewSalespersonFormOpen && !isManageSalespersonsOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsNewSalespersonFormOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Add New Salesperson</h2>
                <button
                  onClick={() => setIsNewSalespersonFormOpen(false)}
                  className="p-2  rounded-lg text-gray-400 "
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
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
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSaveNewSalesperson}
                      className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md "
                    >
                      Add
                    </button>
                    <button
                      onClick={handleCancelNewSalesperson}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md "
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Manage Salespersons Modal */}
      {
        isManageSalespersonsOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Manage Salespersons</h2>
                <button
                  onClick={() => {
                    handleCancelNewSalesperson();
                    setSelectedSalespersonIds([]);
                    setManageSalespersonMenuOpen(null);
                    setIsManageSalespersonsOpen(false);
                  }}
                  className="p-2  rounded-lg text-gray-400 "
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search and Add Button / Bulk Actions */}
              {selectedSalespersonIds.length > 0 ? (
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">
                      Merge
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Bulk Actions Menu Trigger
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
                      onChange={(e) => {
                        setManageSalespersonSearch(e.target.value);
                        setManageSalespersonsPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      handleStartNewSalesperson();
                      setManageSalespersonSearch("");
                      setManageSalespersonsPage(1);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md "
                  >
                    <Plus size={16} />
                    New Salesperson
                  </button>
                </div>
              )}

              {/* Salespersons List */}
              <div className="flex-1 overflow-y-auto p-6">
                {isNewSalespersonFormOpen ? (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      {editingSalespersonId ? "Edit Salesperson" : "Add New Salesperson"}
                    </h3>
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
                          onClick={handleSaveNewSalesperson}
                          className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md "
                        >
                          {editingSalespersonId ? "Save Changes" : "Add"}
                        </button>
                        <button
                          onClick={handleCancelNewSalesperson}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md "
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
                          checked={paginatedManageSalespersons.length > 0 && paginatedManageSalespersons.every((sp: any) => selectedSalespersonIds.includes(String(sp.id || sp._id || "")))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSalespersonIds(paginatedManageSalespersons.map((s: any) => String(s.id || s._id || "")));
                            } else {
                              setSelectedSalespersonIds(
                                selectedSalespersonIds.filter(
                                  (id) => !paginatedManageSalespersons.some((sp: any) => String(sp.id || sp._id || "") === String(id))
                                )
                              );
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
                    {paginatedManageSalespersons.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          {manageSalespersonSearch ? "No salespersons found" : "No salespersons available"}
                        </td>
                      </tr>
                    ) : (
                      paginatedManageSalespersons.map((salesperson: any) => {
                        const salespersonId = String(salesperson.id || salesperson._id || "");
                        const isInactive = String(salesperson.status || "").toLowerCase() === "inactive";
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
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {salesperson.name || salesperson.displayName || "Unnamed Salesperson"}
                              {isInactive && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{salesperson.email || ""}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="hidden group-hover:flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditSalesperson(salesperson);
                                  }}
                                  className="p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuPosition({ top: rect.bottom, left: rect.right });
                                    setManageSalespersonMenuOpen(manageSalespersonMenuOpen === salespersonId ? null : salespersonId);
                                  }}
                                  className={`p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded ${manageSalespersonMenuOpen === salespersonId ? 'bg-gray-100 text-[#156372]' : ''}`}
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

                {manageSalespersonsTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <div>
                      Page {manageSalespersonsCurrentPage} of {manageSalespersonsTotalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={manageSalespersonsCurrentPage <= 1}
                        onClick={() => setManageSalespersonsPage((prev) => Math.max(1, prev - 1))}
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={manageSalespersonsCurrentPage >= manageSalespersonsTotalPages}
                        onClick={() => setManageSalespersonsPage((prev) => Math.min(manageSalespersonsTotalPages, prev + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dropdown Portal */}
              {manageSalespersonMenuOpen && menuPosition && createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[10000]"
                    onClick={() => setManageSalespersonMenuOpen(null)}
                />
                <div
                  className="fixed bg-white rounded-md shadow-lg z-[10001] border border-gray-100 py-1 w-48"
                  style={{
                    top: menuPosition.top,
                    left: manageSalespersonMenuOpen === "BULK_ACTIONS" ? menuPosition.left : menuPosition.left - 192
                  }}
                >
                  {manageSalespersonMenuOpen === "BULK_ACTIONS" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleBulkSalespersonStatusChange("active")}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Mark as Active
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSalespersonStatusChange("inactive")}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Mark as Inactive
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleBulkDeleteSalespersons();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const salesperson = salespersons.find((sp: any) => String(sp.id || sp._id || "") === manageSalespersonMenuOpen);
                          if (salesperson) handleStartEditSalesperson(salesperson);
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const salesperson = salespersons.find((sp: any) => String(sp.id || sp._id || "") === manageSalespersonMenuOpen);
                          if (salesperson) {
                            const nextStatus = String(salesperson?.status || "").toLowerCase() === "inactive" ? "active" : "inactive";
                            void handleSetSalespersonStatus(manageSalespersonMenuOpen, nextStatus);
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        {salespersons.find((sp: any) => String(sp.id || sp._id || "") === manageSalespersonMenuOpen && String(sp?.status || "").toLowerCase() === "inactive") ? "Mark as Active" : "Mark as Inactive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteSalesperson(manageSalespersonMenuOpen);
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>,
              document.body
            )}
          </div>,
          document.body
        )
      }

      <NewTaxModal
        isOpen={isNewTaxQuickModalOpen}
        onClose={() => {
          setIsNewTaxQuickModalOpen(false);
          setNewTaxTargetItemId(null);
        }}
        onCreated={handleTaxCreatedFromModal}
      />
    </>
  );
};

export default NewQuote;






