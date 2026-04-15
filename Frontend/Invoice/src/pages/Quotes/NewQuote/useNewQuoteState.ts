import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, ArrowUpDown, X,
  MessageSquare, User, Calendar, Plus, Paperclip, Minus, Check,
  Trash2, MoreVertical, Edit2, Edit3, Settings, Info, Tag, HelpCircle, HardDrive,
  Layers, Box, Folder, Cloud, Calculator, Image as ImageIcon, GripVertical,
  FileText, CreditCard, Square, Upload, Loader2, LayoutGrid, PlusCircle, Mail, Building2, AlertTriangle
} from "lucide-react";
import { getCustomers, saveQuote, getQuotes, getQuoteById, updateQuote, getProjects, getSalespersonsFromAPI, updateSalesperson, getItemsFromAPI, getTaxes, Customer, Tax, Salesperson, Quote, ContactPerson, Project } from "../../salesModel";
import { getAllDocuments } from "../../../utils/documentStorage";
import { customersAPI, projectsAPI, salespersonsAPI, quotesAPI, itemsAPI, currenciesAPI, contactPersonsAPI, vendorsAPI, settingsAPI, chartOfAccountsAPI, documentsAPI, reportingTagsAPI, priceListsAPI, transactionNumberSeriesAPI } from "../../../services/api";
import { useAccountSelect } from "../../../hooks/useAccountSelect";
import { useCurrency } from "../../../hooks/useCurrency";
import { queryClient } from "../../../lib/queryClient";
import { API_BASE_URL, getToken } from "../../../services/auth";
import toast from "react-hot-toast";
import { Country, State } from "country-state-city";
import NewTaxModal from "../../../../components/modals/NewTaxModal";
import { buildTaxOptionGroups, taxLabel, normalizeCreatedTaxPayload, isTaxActive } from "../../../hooks/Taxdropdownstyle";
import { readTaxesLocal, createTaxLocal, isTaxGroupRecord } from "../../settings/organization-settings/taxes-compliance/TAX/storage";
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
const LS_LOCATIONS_ENABLED_KEY = "taban_locations_enabled";
const LS_LOCATIONS_CACHE_KEY = "taban_locations_cache";

const readCachedCustomersForQuote = (): Customer[] => {
  try {
    const cachedQueries = queryClient.getQueriesData({ queryKey: ["api", "/customers"] });
    for (const [queryKey, cachedValue] of cachedQueries) {
      const cachedState = queryClient.getQueryState(queryKey as any);
      if ((cachedState as any)?.isInvalidated) {
        continue;
      }

      const payload: any = cachedValue;
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : [];
      if (rows.length > 0) {
        return rows
          .map((customer: any) => ({
            ...customer,
            id: customer?._id || customer?.id,
            name:
              customer?.displayName ||
              customer?.companyName ||
              `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
              "Customer",
            email: customer?.email || "",
            workPhone: customer?.workPhone || customer?.mobile || "",
          }))
          .filter((customer: any) => {
            const status = String(customer?.status ?? customer?.customerStatus ?? customer?.state ?? "")
              .trim()
              .toLowerCase();
            if (status) return status === "active";
            const rawIsActive = (customer as any)?.isActive ?? (customer as any)?.active ?? (customer as any)?.enabled;
            if (typeof rawIsActive === "boolean") return rawIsActive;
            if (typeof rawIsActive === "number") return rawIsActive === 1;
            return true;
          });
      }
    }
  } catch {
    // Cache is best-effort only.
  }
  return [];
};
const resolveDefaultTaxIdFromTaxes = (rows: any[]): string => {
  const taxes = Array.isArray(rows) ? rows : [];
  if (taxes.length === 0) return "";
  const pickId = (tax: any) => String(tax?.id || tax?._id || "").trim();
  const byFlag = taxes.find((t: any) =>
    Boolean(t?.isDefault || t?.default || t?.is_default || t?.isDefaultTax || t?.defaultTax)
  );
  if (byFlag) return pickId(byFlag);
  const byName = taxes.find((t: any) => /default|standard/i.test(String(t?.name || t?.taxName || "")));
  if (byName) return pickId(byName);
  const byPositiveRate = taxes.find((t: any) => Number(t?.rate) > 0);
  if (byPositiveRate) return pickId(byPositiveRate);
  return pickId(taxes[0]);
};
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
export function useNewQuoteState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { baseCurrencyCode } = useCurrency();
  const { quoteId } = useParams();
  const isEditMode = !!quoteId;
  const clonedDataFromState = location.state?.clonedData || null;
  const [saveLoading, setSaveLoading] = useState<null | "draft" | "send">(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [enabledSettings, setEnabledSettings] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    customerName: "",
    selectedLocation: "Head Office",
    selectedPriceList: "Select Price List",
    quoteNumber: "QT-000002",
    status: "Draft",
    referenceNumber: "",
    quoteDate: new Date().toLocaleDateString("en-GB"), // DD/MM/YYYY format which our salesModel now handles
    expiryDate: "",
    salesperson: "",
    salespersonId: "",
    projectName: "",
    subject: "",
    taxExclusive: "Tax Exclusive",
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
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";
  const showShippingCharges = enabledSettings?.chargeSettings?.shippingCharges !== false;
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "inclusive";
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
  const [customerDefaultTaxId, setCustomerDefaultTaxId] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<any | null>(null);
  const [shippingAddress, setShippingAddress] = useState<any | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalType, setAddressModalType] = useState<"billing" | "shipping">("billing");
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen] = useState(false);
  const [phoneCodeSearch, setPhoneCodeSearch] = useState("");
  const phoneCodeDropdownRef = useRef<HTMLDivElement | null>(null);
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
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, string>>({});
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
  const [isTheseDropdownOpen, setIsTheseDropdownOpen] = useState(false);
  const [showAdditionalInformation, setShowAdditionalInformation] = useState(false);
  const [additionalInfoItemIds, setAdditionalInfoItemIds] = useState<string[]>([]);
  const [useSimplifiedView, setUseSimplifiedView] = useState(false);
  const [isTotalSummaryOpen, setIsTotalSummaryOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isReportingTagsModalOpen, setIsReportingTagsModalOpen] = useState(false);
  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
  const [reportingTagSelections, setReportingTagSelections] = useState<Record<string, string>>({});
  const [currentReportingTagsItemId, setCurrentReportingTagsItemId] = useState<string | number | null>(null);
  const [isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const showAdditionalInformationEffective = showAdditionalInformation && !useSimplifiedView;
  useEffect(() => {
    if (!useSimplifiedView) return;
    setShowAdditionalInformation(false);
    setIsTotalSummaryOpen(false);
  }, [useSimplifiedView]);
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
  const initialCachedCustomers = useMemo(() => readCachedCustomersForQuote(), []);
  // Load customers from cache first so the quote form stays instant on repeat visits.
  const [customers, setCustomers] = useState<Customer[]>(() => initialCachedCustomers);
  const [isCustomersLoading, setIsCustomersLoading] = useState(() => initialCachedCustomers.length === 0);
  const isCustomerActive = (customer: any) => {
    const status = String(customer?.status ?? customer?.customerStatus ?? customer?.state ?? "")
      .trim()
      .toLowerCase();
    if (status) return status === "active";
    const rawIsActive = (customer as any)?.isActive ?? (customer as any)?.active ?? (customer as any)?.enabled;
    if (typeof rawIsActive === "boolean") return rawIsActive;
    if (typeof rawIsActive === "number") return rawIsActive === 1;
    if (typeof rawIsActive === "string") {
      const v = rawIsActive.trim().toLowerCase();
      if (["true", "1", "yes", "active", "enabled"].includes(v)) return true;
      if (["false", "0", "no", "inactive", "disabled"].includes(v)) return false;
    }
    const rawIsInactive = (customer as any)?.isInactive ?? (customer as any)?.inactive ?? (customer as any)?.disabled;
    if (typeof rawIsInactive === "boolean") return !rawIsInactive;
    if (typeof rawIsInactive === "number") return rawIsInactive === 0;
    if (typeof rawIsInactive === "string") {
      const v = rawIsInactive.trim().toLowerCase();
      if (["true", "1", "yes"].includes(v)) return false;
      if (["false", "0", "no"].includes(v)) return true;
    }
    return true;
  };
  const isItemActive = (item: any) => {
    const status = String(item?.status ?? item?.itemStatus ?? item?.state ?? "")
      .trim()
      .toLowerCase();
    if (status) return status === "active";
    const rawIsActive = (item as any)?.isActive ?? (item as any)?.active ?? (item as any)?.enabled;
    if (typeof rawIsActive === "boolean") return rawIsActive;
    if (typeof rawIsActive === "number") return rawIsActive === 1;
    if (typeof rawIsActive === "string") {
      const v = rawIsActive.trim().toLowerCase();
      if (["true", "1", "yes", "active", "enabled"].includes(v)) return true;
      if (["false", "0", "no", "inactive", "disabled"].includes(v)) return false;
    }
    const rawIsInactive = (item as any)?.isInactive ?? (item as any)?.inactive ?? (item as any)?.disabled;
    if (typeof rawIsInactive === "boolean") return !rawIsInactive;
    if (typeof rawIsInactive === "number") return rawIsInactive === 0;
    if (typeof rawIsInactive === "string") {
      const v = rawIsInactive.trim().toLowerCase();
      if (["true", "1", "yes"].includes(v)) return false;
      if (["false", "0", "no"].includes(v)) return true;
    }
    return true;
  };
  // Load items from localStorage
  const [availableItems, setAvailableItems] = useState<any[]>(defaultSampleItems as any[]);
  const loadCustomersForDropdown = async () => {
    const cachedCustomers = readCachedCustomersForQuote();
    if (cachedCustomers.length > 0) {
      setCustomers(cachedCustomers);
      setIsCustomersLoading(false);
      return cachedCustomers;
    }

    try {
      setIsCustomersLoading(true);
      const rows = await getCustomers();
      const normalizedCustomers = (rows || []).map((c: any) => ({
        ...c,
        id: c._id || c.id,
        name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
      }));
      setCustomers(normalizedCustomers.filter(isCustomerActive));
      return normalizedCustomers;
    } catch (error) {
      console.error("Error loading customers:", error);
      setCustomers([]);
      return [];
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

  useEffect(() => {
    const handleCustomersUpdated = () => {
      void loadCustomersForDropdown();
    };

    window.addEventListener("customersUpdated", handleCustomersUpdated);
    window.addEventListener("focus", handleCustomersUpdated);
    return () => {
      window.removeEventListener("customersUpdated", handleCustomersUpdated);
      window.removeEventListener("focus", handleCustomersUpdated);
    };
  }, []);
  const [quotePrefix, setQuotePrefix] = useState("");
  const [quoteNextNumber, setQuoteNextNumber] = useState("");
  const quoteSeriesSyncRef = useRef(false);
  const [quoteSeriesRow, setQuoteSeriesRow] = useState<any | null>(null);
  const [quoteSeriesRows, setQuoteSeriesRows] = useState<any[]>([]);
  const [isPriceListDropdownOpen, setIsPriceListDropdownOpen] = useState(false);
  const [priceListSearch, setPriceListSearch] = useState("");
  const [catalogPriceListsRaw, setCatalogPriceListsRaw] = useState<any[]>([]);
  const [catalogPriceLists, setCatalogPriceLists] = useState<CatalogPriceListOption[]>([]);
  const [priceListSwitchDialog, setPriceListSwitchDialog] = useState<PriceListSwitchDialogState | null>(null);
  const [isLocationFeatureEnabled, setIsLocationFeatureEnabled] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
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
  const formatMoneyForDropdown = (amount: any): string => {
    const value = Number(amount || 0);
    const code = String(formData?.currency || baseCurrencyCode || "USD").split(" - ")[0];
    const symbol = getCurrencySymbol(code);
    const formatted = value.toFixed(2);
    if (symbol && symbol !== code) return `${symbol}${formatted}`;
    return `${code} ${formatted}`.trim();
  };
  // Define months array before use
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  const isQuoteSeriesRow = (row: any) => {
    const moduleValue = String(row?.module || row?.name || row?.moduleKey || "").toLowerCase();
    return moduleValue === "quote" || moduleValue === "quotes" || moduleValue.includes("quote");
  };
  const resolveQuoteSeriesRow = (rows: any[]) => {
    const quoteRows = (rows || []).filter(isQuoteSeriesRow);
    if (!quoteRows.length) return null;
    return (
      quoteRows.find((row: any) => Boolean(row?.isDefault)) ||
      quoteRows.find((row: any) => String(row?.seriesName || "").toLowerCase() === "default transaction series") ||
      quoteRows[0]
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
    // 1) Local fallback for instant UI
    try {
      const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      normalizeCatalogPriceLists(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Error reading cached price lists for quote:", error);
      normalizeCatalogPriceLists([]);
    }
    // 2) Refresh from backend
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
        selectedLocation:
          nextOptions.includes(prev.selectedLocation)
            ? prev.selectedLocation
            : (isEditMode && String(prev.selectedLocation || "").trim()
              ? prev.selectedLocation
              : nextOptions[0])
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
      id: String(resolvedPriceList?.id || resolvedPriceList?._id || customerPriceListId || "").trim(),
      name: String(resolvedPriceList?.name || customerPriceListNameRaw || "").trim(),
      currency: String(resolvedPriceList?.currency || "").trim(),
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
  return {
    navigate, location, baseCurrencyCode, quoteId, isEditMode, clonedDataFromState, saveLoading, setSaveLoading, taxes, setTaxes, enabledSettings, setEnabledSettings,
    formData, setFormData, hasAppliedCloneRef, discountMode, showTransactionDiscount, showShippingCharges, showAdjustment, taxMode, toNumberSafe, resolveSubtotalFromQuoteLike, normalizeDiscountForForm, isDiscountAccountOpen,
    setIsDiscountAccountOpen, discountAccountSearch, setDiscountAccountSearch, filteredDiscountAccounts, groupedDiscountAccounts, discountAccountDropdownRef, isCustomerDropdownOpen, setIsCustomerDropdownOpen, customerSearch, setCustomerSearch, selectedCustomer, setSelectedCustomer,
    customerDefaultTaxId, setCustomerDefaultTaxId, billingAddress, setBillingAddress, shippingAddress, setShippingAddress, isAddressModalOpen, setIsAddressModalOpen, addressModalType, setAddressModalType, isAddressSaving, setIsAddressSaving,
    isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen, phoneCodeSearch, setPhoneCodeSearch, phoneCodeDropdownRef, addressFormData, setAddressFormData, customerSearchModalOpen, setCustomerSearchModalOpen, customerSearchCriteria, setCustomerSearchCriteria, customerSearchTerm,
    setCustomerSearchTerm, customerSearchResults, setCustomerSearchResults, customerSearchPage, setCustomerSearchPage, customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen, isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen, customerQuickActionFrameKey, setCustomerQuickActionFrameKey, isNewProjectQuickActionOpen,
    setIsNewProjectQuickActionOpen, projectQuickActionFrameKey, setProjectQuickActionFrameKey, customerQuickActionBaseIds, setCustomerQuickActionBaseIds, projectQuickActionBaseIds, setProjectQuickActionBaseIds, isRefreshingCustomersQuickAction, setIsRefreshingCustomersQuickAction, isRefreshingProjectsQuickAction, setIsRefreshingProjectsQuickAction, isReloadingCustomerFrame,
    setIsReloadingCustomerFrame, isReloadingProjectFrame, setIsReloadingProjectFrame, isAutoSelectingCustomerFromQuickAction, setIsAutoSelectingCustomerFromQuickAction, isAutoSelectingProjectFromQuickAction, setIsAutoSelectingProjectFromQuickAction, isSalespersonDropdownOpen, setIsSalespersonDropdownOpen, salespersonSearch, setSalespersonSearch, selectedSalesperson,
    setSelectedSalesperson, isManageSalespersonsOpen, setIsManageSalespersonsOpen, manageSalespersonSearch, setManageSalespersonSearch, manageSalespersonMenuOpen, setManageSalespersonMenuOpen, selectedSalespersonIds, setSelectedSalespersonIds, menuPosition, setMenuPosition, isNewSalespersonFormOpen,
    setIsNewSalespersonFormOpen, editingSalespersonId, setEditingSalespersonId, isAddContactPersonModalOpen, setIsAddContactPersonModalOpen, contactPersonData, setContactPersonData, newSalespersonData, setNewSalespersonData, salespersons, setSalespersons, openItemDropdowns, setOpenItemDropdowns, itemSearches,
    setItemSearches, openTaxDropdowns, setOpenTaxDropdowns, isNewTaxQuickModalOpen, setIsNewTaxQuickModalOpen, newTaxTargetItemId, setNewTaxTargetItemId, taxSearches, setTaxSearches, selectedItemIds, setSelectedItemIds, itemDropdownRefs,
    taxDropdownRefs, taxOptionGroups, getFilteredTaxGroups, openItemMenuId, setOpenItemMenuId, itemMenuRefs, isBulkAddModalOpen, setIsBulkAddModalOpen, bulkAddInsertIndex, setBulkAddInsertIndex, bulkAddSearch, setBulkAddSearch,
    bulkSelectedItems, setBulkSelectedItems, bulkSelectedItemIds, setBulkSelectedItemIds, isTheseDropdownOpen, setIsTheseDropdownOpen, showAdditionalInformation, setShowAdditionalInformation, additionalInfoItemIds, setAdditionalInfoItemIds, useSimplifiedView, setUseSimplifiedView,
    isTotalSummaryOpen, setIsTotalSummaryOpen,
    isNewItemModalOpen, setIsNewItemModalOpen, isReportingTagsModalOpen, setIsReportingTagsModalOpen, availableReportingTags, setAvailableReportingTags, reportingTagSelections, setReportingTagSelections, currentReportingTagsItemId, setCurrentReportingTagsItemId, isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen,
    formErrors, setFormErrors, showAdditionalInformationEffective, newItemData, setNewItemData, newItemImage, setNewItemImage, newItemImageRef, isProjectDropdownOpen, setIsProjectDropdownOpen, projectSearch, setProjectSearch,
    projects, setProjects, selectedProject, setSelectedProject, selectedCustomerIdForProjects, setSelectedCustomerIdForProjects, isNewProjectModalOpen, setIsNewProjectModalOpen, newProjectData, setNewProjectData, bankAccounts, setBankAccounts,
    projectDropdownRef, isQuoteDatePickerOpen, setIsQuoteDatePickerOpen, isExpiryDatePickerOpen, setIsExpiryDatePickerOpen, quoteDateCalendar, setQuoteDateCalendar, expiryDateCalendar, setExpiryDateCalendar, customerDropdownRef, salespersonDropdownRef, quoteDatePickerRef,
    expiryDatePickerRef, fileInputRef, isUploadDropdownOpen, setIsUploadDropdownOpen, uploadDropdownRef, isDocumentsModalOpen, setIsDocumentsModalOpen, selectedInbox, setSelectedInbox, documentSearch, setDocumentSearch, selectedDocuments,
    setSelectedDocuments, availableDocuments, setAvailableDocuments, isCloudPickerOpen, setIsCloudPickerOpen, selectedCloudProvider, setSelectedCloudProvider, customers, setCustomers, isCustomersLoading, setIsCustomersLoading, isCustomerActive,
    isItemActive, availableItems, setAvailableItems, loadCustomersForDropdown, isQuoteNumberModalOpen, setIsQuoteNumberModalOpen, quoteNumberMode, setQuoteNumberMode, quotePrefix, setQuotePrefix, quoteNextNumber, setQuoteNextNumber,
    quoteSeriesSyncRef, quoteSeriesRow, setQuoteSeriesRow, quoteSeriesRows, setQuoteSeriesRows, isPriceListDropdownOpen, setIsPriceListDropdownOpen, priceListSearch, setPriceListSearch, catalogPriceListsRaw, setCatalogPriceListsRaw, catalogPriceLists,
    setCatalogPriceLists, priceListSwitchDialog, setPriceListSwitchDialog, isLocationFeatureEnabled, setIsLocationFeatureEnabled, locationOptions, setLocationOptions, isLocationDropdownOpen, setIsLocationDropdownOpen, priceListDropdownRef, currencyMap, setCurrencyMap,
    contactPersons, setContactPersons, vendorContactPersons, setVendorContactPersons, selectedContactPersons, setSelectedContactPersons, isEmailCommunicationsOpen, setIsEmailCommunicationsOpen, getCurrencySymbol, formatMoneyForDropdown, months, daysOfWeek,
    sanitizeQuotePrefix, extractQuoteDigits, deriveQuotePrefixFromNumber, buildQuoteNumber, isQuoteSeriesRow, resolveQuoteSeriesRow, resolveSeriesNextDigits, formatPriceListDisplayLabel, normalizeCatalogPriceLists, loadCatalogPriceLists, selectedPriceListOption, normalizeSelectedPriceListName,
    selectedPriceListDisplay, filteredPriceListOptions, selectedPriceList, resolveCustomerPriceListDefault, applyResolvedPriceListChoice, parsePercentage, applyRounding, getIndividualPriceListRate, applyPriceListToBaseRate, normalizeReportingTagOptions, normalizeReportingTagAppliesTo, loadReportingTags
  };
}
