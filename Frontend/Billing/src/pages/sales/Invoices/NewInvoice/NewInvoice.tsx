import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  X,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
  ShoppingBag,
  Upload,
  Image as ImageIcon,
  MoreVertical,
  Check,
  Trash2,
  Settings,
  Copy,
  Tag,
  Grid3x3,
  ScanLine,
  Folder,
  Cloud,
  Box,
  Layers,
  HardDrive,
  Paperclip,
  File,
  FileText,
  Pencil,
  CheckSquare,
  Printer,
  Lock,
  ClipboardList,
  CreditCard,
  Square,
  RefreshCw,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { saveInvoice, getInvoiceById, updateInvoice, getTaxes, saveTax, deleteTax, Customer, Tax, Salesperson, Invoice, ContactPerson } from "../../salesModel";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { customersAPI, salespersonsAPI, projectsAPI, invoicesAPI, itemsAPI, bankAccountsAPI, currenciesAPI, transactionNumberSeriesAPI, chartOfAccountsAPI, accountantAPI, reportingTagsAPI } from "../../../../services/api";
import { useCurrency } from "../../../../hooks/useCurrency";
import { usePaymentTermsDropdown, defaultPaymentTerms, PaymentTerm } from "../../../../hooks/usePaymentTermsDropdown";
import { API_BASE_URL, getToken } from "../../../../services/auth";
import SalespersonDropdown from "../../../../components/SalespersonDropdown";
import PaymentTermsDropdown from "../../../../components/PaymentTermsDropdown";
import { ConfigurePaymentTermsModal } from "../../../../components/ConfigurePaymentTermsModal";
import NewTaxQuickModal from "../../../../components/tax/NewTaxQuickModal";
import { toast } from "react-toastify";
import { readTaxesLocal, TAXES_STORAGE_EVENT } from "../../../settings/organization-settings/taxes-compliance/TAX/storage";

const PLANS_STORAGE_KEY = "inv_plans_v1";

interface Item {
  id: string | number;
  name: string;
  sku: string;
  rate: number;
  stockOnHand: number;
  unit: string;
  taxInfo?: {
    taxId?: string;
    taxName?: string;
    taxRate?: number;
  };
  taxId?: string;
  salesTax?: string | number;
  salesTaxId?: string;
  salesTaxRate?: number;
  taxRate?: number;
  tax?: string | number;
}

interface AttachedFile {
  id: string | number;
  name: string;
  size?: string | number;
  type?: string;
  file: File | null;
  documentId?: string;
  preview?: string | null;
}

interface InvoiceItem {
  id: string | number;
  itemId?: string;
  itemDetails: string;
  quantity: number;
  rate: number;
  tax: string;
  amount: number;
  name?: string;
  sku?: string;
  unit?: string;
  discount?: number;
  discountType?: "percent" | "amount";
  stockOnHand?: number;
  account?: string;
  projectId?: string;
  project?: string;
  projectName?: string;
  reportingTags?: Array<{ tagId: string; value: string; name: string }>;
}

interface InvoiceFormState {
  customerName: string;
  mobile: string;
  selectedLocation?: string;
  reportingTags?: any[];
  customDiscountDays?: string | number;
  selectedPriceList?: string;
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;
  dueDate: string;
  receipt: string;
  accountsReceivable: string;
  salesperson: string;
  salespersonId: string;
  subject: string;
  taxExclusive: string;
  items: InvoiceItem[];
  subTotal: number;
  discount: number;
  discountType: string;
  discountAccount: string;
  shippingCharges: number;
  shippingChargeTax: string;
  roundOff: number;
  total: number;
  adjustment: number;
  currency: string;
  customerNotes: string;
  termsAndConditions: string;
  attachedFiles: AttachedFile[];
  status: string;
}

const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";

type CatalogPriceListOption = {
  id: string;
  name: string;
  pricingScheme: string;
  currency: string;
  status: string;
  displayLabel: string;
};

const NewInvoice: React.FC = () => {
const navigate = useNavigate();
const { id } = useParams();
const location = useLocation();
const isEditMode = Boolean(id);
const settingsDropdownRef = useRef<HTMLDivElement>(null);
const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
const [activePreferencesTab, setActivePreferencesTab] = useState("preferences");
const [customFields] = useState([
  { id: 1, name: "Sales person", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
  { id: 2, name: "Description", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
  { id: 3, name: "Reference", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: false }
]);
const [preferences, setPreferences] = useState({
  allowEditingSentInvoice: true,
  associateExpenseReceipts: false,
  notifyOnOnlinePayment: true,
  includePaymentReceipt: true,
  automateThankYouNote: false,
  invoiceQRCodeEnabled: false,
  hideZeroValueLineItems: false,
  termsAndConditions: "",
  customerNotes: "Thank you for the payment. You just made our day."
});
const noop = (..._args: any[]) => {};
const asyncNoop = async (..._args: any[]) => {};
const currencySymbol = "$";
const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
const [customers, setCustomers] = useState<any[]>([]);
const [availableProjects, setAvailableProjects] = useState<any[]>([]);
const [availableItems, setAvailableItems] = useState<any[]>([]);
const availableDocuments: any[] = [];
const [taxOptions, setTaxOptions] = useState<any[]>([]);
const bankAccounts: any[] = [];
const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>(defaultPaymentTerms);
const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(defaultPaymentTerms[0]?.value || "due-on-receipt");
const filteredPaymentTerms = paymentTerms;
const paymentTermsSearchQuery = "";
const isPaymentTermsOpen = false;
const isPaymentReceived = false;
const showItemDiscount = false;
const showTransactionDiscount = true;
const showShippingCharges = true;
const showAdjustment = true;
const [customerSearch, setCustomerSearch] = useState("");
const customerSearchCriteria = "Display Name";
const customerSearchCriteriaOpen = false;
const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
const customerSearchPage = 1;
const customerSearchResults: any[] = [];
const customerSearchTerm = "";
const customerStartIndex = 0;
const customerEndIndex = 0;
const customerTotalPages = 1;
const customerPaginatedResults: any[] = [];
const [saveLoading, setSaveLoading] = useState<null | "draft" | "send">(null);
const [scanInput, setScanInput] = useState("");
const documentSearch = "";
const [bulkAddSearch, setBulkAddSearch] = useState("");
const [bulkAccountSearch, setBulkAccountSearch] = useState("");
const [shippingTaxSearch, setShippingTaxSearch] = useState("");
const invoicePrefix = "INV-";
const invoiceNextNumber = "000001";
const invoiceNumberMode = "auto";
const modalSelectedCustomerId = "";
const [selectedBulkAccount, setSelectedBulkAccount] = useState("");
const selectedCloudProvider = "zoho";
const selectedDocuments: any[] = [];
const selectedInbox = "files";
const selectedContactPersons: any[] = [];
const [salespersons, setSalespersons] = useState<any[]>([]);
const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
const [isPriceListDropdownOpen, setIsPriceListDropdownOpen] = useState(false);
const [priceListSearch, setPriceListSearch] = useState("");
const [catalogPriceLists, setCatalogPriceLists] = useState<CatalogPriceListOption[]>([]);
const readStoredLocationOptions = (): string[] => {
  try {
    const raw = localStorage.getItem("taban_locations_cache");
    const rows = raw ? JSON.parse(raw) : [];
    const names = Array.isArray(rows)
      ? rows
          .map((row: any) => String(row?.name || row?.locationName || row?.title || "").trim())
          .filter(Boolean)
      : [];
    return names.length > 0 ? Array.from(new Set(names)) : ["Head Office"];
  } catch {
    return ["Head Office"];
  }
};
const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
const [salespersonSearch, setSalespersonSearch] = useState("");
const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<any[]>([]);
const [manageSalespersonSearch, setManageSalespersonSearch] = useState("");
const [manageSalespersonMenuOpen, setManageSalespersonMenuOpen] = useState<any>(null);
const [menuPosition, setMenuPosition] = useState<any>(null);
const [editingSalespersonId, setEditingSalespersonId] = useState<any>(null);
const customerQuickActionFrameKey = 0;
const isAutoSelectingCustomerFromQuickAction = false;
const [isBulkAccountDropdownOpen, setIsBulkAccountDropdownOpen] = useState(false);
const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
const isBulkAddModalOpen = false;
const [isBulkUpdateAccountModalOpen, setIsBulkUpdateAccountModalOpen] = useState(false);
const [isBulkUpdateLineItemsActive, setIsBulkUpdateLineItemsActive] = useState(false);
const [activeBulkUpdateAction, setActiveBulkUpdateAction] = useState<"project" | "reporting" | "account">("project");
const [isBulkUpdateProjectModalOpen, setIsBulkUpdateProjectModalOpen] = useState(false);
const [selectedBulkProjectId, setSelectedBulkProjectId] = useState("");
const [isBulkUpdateReportingTagsModalOpen, setIsBulkUpdateReportingTagsModalOpen] = useState(false);
const [bulkReportingTagValues, setBulkReportingTagValues] = useState<Record<string, string>>({});
const [activeAdditionalInfoMenu, setActiveAdditionalInfoMenu] = useState<{ itemId: string | number; type: "account" | "project" } | null>(null);
const [additionalInfoSearch, setAdditionalInfoSearch] = useState("");
const [isItemReportingTagsModalOpen, setIsItemReportingTagsModalOpen] = useState(false);
const [itemReportingTagsTargetId, setItemReportingTagsTargetId] = useState<string | number | null>(null);
const [itemReportingTagDraftValues, setItemReportingTagDraftValues] = useState<Record<string, string>>({});
const isCloudPickerOpen = false;
const [isConfigureTermsOpen, setIsConfigureTermsOpen] = useState(false);
const isContactPersonModalOpen = false;
const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
const isDepositToDropdownOpen = false;
const isDocumentsModalOpen = false;
const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
const [isInvoiceDatePickerOpen, setIsInvoiceDatePickerOpen] = useState(false);
const [isInvoiceNumberModalOpen, setIsInvoiceNumberModalOpen] = useState(false);
const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);
const isNewCustomerQuickActionOpen = false;
const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
const [isNewSalespersonFormOpen, setIsNewSalespersonFormOpen] = useState(false);
const isNewTaxModalOpen = false;
const isPaymentModeDropdownOpen = false;
const isRefreshingCustomersQuickAction = false;
const isReloadingCustomerFrame = false;
const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
const [isScanModeOpen, setIsScanModeOpen] = useState(false);
const [isShippingTaxDropdownOpen, setIsShippingTaxDropdownOpen] = useState(false);
const isTaxExclusiveDropdownOpen = false;
const isUploadDropdownOpen = false;
const showNewHeaderInput = false;
const [itemsWithAdditionalInfo, setItemsWithAdditionalInfo] = useState<Set<any>>(new Set());
const additionalInfoMenuRef = useRef<HTMLDivElement | null>(null);
const newHeaderItemId = null as any;
const newHeaderText = "";
const newItemImage = null as any;
const newItemData: any = { name: "", sku: "", sellingPrice: "", costPrice: "", unit: "", description: "", tax: "" };
const newTaxData: any = { name: "", rate: "", isCompound: false };
const [newSalespersonData, setNewSalespersonData] = useState<any>({ name: "", email: "" });
const newContactPersonData: any = { firstName: "", lastName: "", email: "", mobile: "" };
const contactPersonImage = null as any;
const paymentData: any = { paymentMode: "Cash", depositTo: "Petty Cash", amountReceived: "", referenceNumber: "", taxDeducted: "no" };
const [openItemDropdowns, setOpenItemDropdowns] = useState<Record<string, boolean>>({});
const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<string, boolean>>({});
const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
const [isNewTaxQuickModalOpen, setIsNewTaxQuickModalOpen] = useState(false);
const [newTaxTargetItemId, setNewTaxTargetItemId] = useState<string | number | null>(null);
const [itemSearches, setItemSearches] = useState<Record<string, string>>({});
const isCustomerActive = (customer: any) => {
  const status = String(customer?.status || customer?.customerStatus || customer?.state || "active").toLowerCase();
  return status !== "inactive";
};
const filteredCustomers = customers.filter((customer) => {
  if (!isCustomerActive(customer)) return false;
  const name = String(customer?.name || customer?.displayName || customer?.companyName || "").toLowerCase();
  const email = String(customer?.email || "").toLowerCase();
  const query = customerSearch.toLowerCase();
  return name.includes(query) || email.includes(query);
});
const getCustomerOptionId = (customer: any) => String(customer?.id || customer?._id || customer?.customerId || "");
const getCustomerPrimaryName = (customer: any) => String(customer?.displayName || customer?.name || customer?.companyName || "Unnamed Customer");
const getCustomerCode = (customer: any) => String(customer?.customerNumber || customer?.customerCode || customer?.contactNumber || customer?.code || "");
const getCustomerEmail = (customer: any) => String(customer?.email || customer?.primaryEmail || "");
const getCustomerCompany = (customer: any) => String(customer?.companyName || customer?.displayName || customer?.name || "");
const getCustomerInitial = (customer: any) => getCustomerPrimaryName(customer).trim().charAt(0).toUpperCase() || "C";
const filteredSalespersons = salespersons.filter((salesperson) =>
  String(salesperson?.name || "").toLowerCase().includes(salespersonSearch.toLowerCase())
);
const filteredManageSalespersons = salespersons.filter((salesperson) =>
  String(salesperson?.name || "").toLowerCase().includes(manageSalespersonSearch.toLowerCase()) ||
  String(salesperson?.email || "").toLowerCase().includes(manageSalespersonSearch.toLowerCase())
);
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
const loadCatalogPriceLists = () => {
  try {
    const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      setCatalogPriceLists([]);
      return;
    }

    const normalized: CatalogPriceListOption[] = parsed
      .map((row: any) => ({
        id: String(row?.id || row?._id || row?.name || ""),
        name: String(row?.name || "").trim(),
        pricingScheme: String(row?.pricingScheme || "").trim(),
        currency: String(row?.currency || "").trim(),
        status: String(row?.status || "Active").trim(),
        displayLabel: formatPriceListDisplayLabel(row),
      }))
      .filter((row: CatalogPriceListOption) => row.name)
      .filter((row: CatalogPriceListOption) => row.status.toLowerCase() !== "inactive");

    setCatalogPriceLists(normalized);
  } catch (error) {
    console.error("Error loading price lists for invoice:", error);
    setCatalogPriceLists([]);
  }
};
const bulkSelectedItems: any[] = [];
const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState<any[]>([]);
const accountsReceivableOptions = ["Accounts Receivable"];
const depositToOptions = ["Petty Cash"];
const paymentModeOptions = ["Cash", "Bank Transfer", "Check"];
const taxExclusiveOptions = ["Tax Exclusive", "Tax Inclusive"];
const [invoiceDateCalendar, setInvoiceDateCalendar] = useState(() => new Date());
const [dueDateCalendar, setDueDateCalendar] = useState(() => new Date());
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
const groupedAccountOptions = [
  { group: "Other Current Asset", options: ["Advance Tax", "Employee Advance", "Goods In Transit", "Prepaid Expenses"] },
  { group: "Fixed Asset", options: ["Furniture and Equipment", "Office Equipment", "Computer Hardware"] },
];
const shouldPrefillFromProjects = Boolean((location.state as any)?.source === "timeTrackingProjects");
const createEmptyInvoiceItem = () => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  itemDetails: "",
  quantity: 1,
  rate: 0,
  tax: "",
  amount: 0
});
const initialInvoiceItems = [createEmptyInvoiceItem()];
const [formData, setFormData] = useState<InvoiceFormState>({
  customerName: "",
  mobile: "",
  selectedLocation: "Head Office" as any,
  reportingTags: [] as any,
  invoiceNumber: `${invoicePrefix}${invoiceNextNumber}`,
  orderNumber: "",
  invoiceDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
  dueDate: "",
  receipt: defaultPaymentTerms[0]?.value || "due-on-receipt",
  accountsReceivable: "Accounts Receivable",
  salesperson: "",
  salespersonId: "",
  subject: "",
  taxExclusive: "Tax Exclusive",
  selectedPriceList: "Select Price List",
  items: initialInvoiceItems,
  subTotal: 0,
  discount: 0,
  discountType: "percent",
  discountAccount: "",
  shippingCharges: 0,
  shippingChargeTax: "",
  roundOff: 0,
  total: 0,
  adjustment: 0,
  currency: "USD",
  customerNotes: "",
  termsAndConditions: "",
  attachedFiles: [],
  status: "draft"
});
const prefillAppliedRef = useRef(false);
const [loadedInvoice, setLoadedInvoice] = useState<any>(null);
const hasProjectItem = (item: any) =>
  Boolean(
    String(item?.projectId || item?.project || item?.projectName || "").trim()
  );
const standardLineItems = (formData.items || []).filter((item: any) => !hasProjectItem(item));
const projectLineItems = (formData.items || []).filter((item: any) => hasProjectItem(item));
const [projectEditTargetId, setProjectEditTargetId] = useState<string | number | null>(null);
const [projectEditValue, setProjectEditValue] = useState("");
const isCustomPaymentTerm = selectedPaymentTerm === "custom" || String(formData.receipt || "").toLowerCase() === "custom";
const selectedPriceListOption = catalogPriceLists.find(
  (option) => option.name === ((formData as any).selectedPriceList || "")
);
const selectedPriceListDisplay =
  selectedPriceListOption?.displayLabel ||
  (formData as any).selectedPriceList ||
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
const customerDropdownRef = useRef<HTMLDivElement | null>(null);
const depositToDropdownRef = useRef<HTMLDivElement | null>(null);
const dueDatePickerRef = useRef<HTMLDivElement | null>(null);
const fileInputRef = useRef<HTMLInputElement | null>(null);
const invoiceDatePickerRef = useRef<HTMLDivElement | null>(null);
const itemDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
const taxDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
const paymentModeDropdownRef = useRef<HTMLDivElement | null>(null);
const paymentTermsDropdownRef = useRef<HTMLDivElement | null>(null);
const priceListDropdownRef = useRef<HTMLDivElement | null>(null);
const salespersonDropdownRef = useRef<HTMLDivElement | null>(null);
const shippingTaxDropdownRef = useRef<HTMLDivElement | null>(null);
const taxExclusiveDropdownRef = useRef<HTMLDivElement | null>(null);
const bulkAccountDropdownRef = useRef<HTMLDivElement | null>(null);
const bulkActionsRef = useRef<HTMLDivElement | null>(null);
const contactPersonImageRef = useRef<HTMLInputElement | null>(null);
const newItemImageRef = useRef<HTMLInputElement | null>(null);
const setCustomerSearchCriteria = noop;
const setCustomerSearchCriteriaOpen = noop;
 
const setCustomerSearchPage = noop;
const setCustomerSearchResults = noop;
const setCustomerSearchTerm = noop;
const setDocumentSearch = noop;
const setInvoiceNextNumber = noop;
const setInvoiceNumberMode = noop;
const setInvoicePrefix = noop;
 
 
const setIsBulkAddModalOpen = noop;
 
const setIsCloudPickerOpen = noop;
const setIsContactPersonModalOpen = noop;
const setIsDepositToDropdownOpen = noop;
const setIsDocumentsModalOpen = noop;

const setIsNewCustomerQuickActionOpen = noop;

const setIsPaymentModeDropdownOpen = noop;
const setIsRefreshingCustomersQuickAction = noop;
const setIsReloadingCustomerFrame = noop;

const setIsTaxExclusiveDropdownOpen = noop;

useEffect(() => {
  if (!isEditMode || !id) return;
  let active = true;
  (async () => {
    try {
      const invoiceData = await getInvoiceById(id);
      if (!active || !invoiceData) return;
      setLoadedInvoice(invoiceData);

      const rawItems = Array.isArray((invoiceData as any)?.items) ? (invoiceData as any).items : [];
      const mappedItems =
        rawItems.length > 0
          ? rawItems.map((item: any, idx: number) => {
              const quantity = Number(item?.quantity || 1) || 1;
              const rate = Number(item?.rate || item?.unitPrice || 0) || 0;
              const amount = Number(item?.amount ?? quantity * rate) || 0;
              return {
                id: item?.id || item?._id || `item-${idx + 1}`,
                itemId: item?.itemId || item?.productId,
                itemDetails: String(item?.itemDetails || item?.name || item?.description || ""),
                description: String(item?.description || item?.itemDetails || ""),
                quantity,
                rate,
                tax: String(item?.tax || item?.taxId || item?.taxName || ""),
                amount,
                name: item?.name,
                sku: item?.sku,
                unit: item?.unit,
                discount: item?.discount,
                discountType: item?.discountType,
                stockOnHand: item?.stockOnHand,
                account: item?.account,
                projectId: item?.projectId,
                project: item?.project,
                projectName: item?.projectName,
                reportingTags: item?.reportingTags || [],
              };
            })
          : [{ id: 1, itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0 }];

      setFormData((prev) => ({
        ...prev,
        customerName:
          (invoiceData as any)?.customerName ||
          (invoiceData as any)?.customer?.displayName ||
          (invoiceData as any)?.customer?.companyName ||
          (invoiceData as any)?.customer?.name ||
          "",
        mobile:
          (invoiceData as any)?.mobile ||
          (invoiceData as any)?.customer?.mobile ||
          (invoiceData as any)?.customer?.workPhone ||
          "",
        selectedLocation:
          (invoiceData as any)?.location ||
          (invoiceData as any)?.selectedLocation ||
          prev.selectedLocation,
        reportingTags: (invoiceData as any)?.reportingTags || prev.reportingTags,
        invoiceNumber: (invoiceData as any)?.invoiceNumber || (invoiceData as any)?.id || prev.invoiceNumber,
        orderNumber: (invoiceData as any)?.orderNumber || "",
        invoiceDate: formatDate((invoiceData as any)?.invoiceDate || (invoiceData as any)?.date || (invoiceData as any)?.createdAt),
        dueDate: (invoiceData as any)?.dueDate ? formatDate((invoiceData as any)?.dueDate) : prev.dueDate,
        receipt: (invoiceData as any)?.receipt || (invoiceData as any)?.paymentTerms || prev.receipt,
        accountsReceivable: (invoiceData as any)?.accountsReceivable || prev.accountsReceivable,
        salesperson: (invoiceData as any)?.salesperson || (invoiceData as any)?.salespersonName || prev.salesperson,
        salespersonId: (invoiceData as any)?.salespersonId || (invoiceData as any)?.salesperson || prev.salespersonId,
        subject: (invoiceData as any)?.subject || "",
        taxExclusive: (invoiceData as any)?.taxExclusive || (invoiceData as any)?.taxPreference || prev.taxExclusive,
        items: mappedItems as any,
        subTotal: Number((invoiceData as any)?.subTotal ?? (invoiceData as any)?.subtotal ?? prev.subTotal) || 0,
        discount: Number((invoiceData as any)?.discount ?? (invoiceData as any)?.discountAmount ?? prev.discount) || 0,
        discountType: String((invoiceData as any)?.discountType || prev.discountType || "percent"),
        discountAccount: (invoiceData as any)?.discountAccount || prev.discountAccount,
        shippingCharges: Number((invoiceData as any)?.shippingCharges ?? (invoiceData as any)?.shipping ?? prev.shippingCharges) || 0,
        shippingChargeTax: String((invoiceData as any)?.shippingChargeTax || ""),
        roundOff: Number((invoiceData as any)?.roundOff ?? 0) || 0,
        total: Number((invoiceData as any)?.total ?? (invoiceData as any)?.amount ?? prev.total) || 0,
        adjustment: Number((invoiceData as any)?.adjustment ?? 0) || 0,
        currency: String((invoiceData as any)?.currency || prev.currency || "USD"),
        customerNotes: String((invoiceData as any)?.customerNotes || (invoiceData as any)?.notes || ""),
        termsAndConditions: String((invoiceData as any)?.termsAndConditions || ""),
        attachedFiles: Array.isArray((invoiceData as any)?.attachedFiles) ? (invoiceData as any).attachedFiles : prev.attachedFiles,
        status: String((invoiceData as any)?.status || prev.status || "draft"),
      }));

      const fallbackCustomer = (invoiceData as any)?.customer || null;
      if (fallbackCustomer) {
        setSelectedCustomer({
          ...fallbackCustomer,
          id: fallbackCustomer?._id || fallbackCustomer?.id,
          name:
            fallbackCustomer?.displayName ||
            fallbackCustomer?.companyName ||
            fallbackCustomer?.name ||
            (invoiceData as any)?.customerName ||
            "",
        });
      }
    } catch (error) {
      console.error("Failed to load invoice for edit:", error);
      toast.error("Failed to load invoice data.");
    }
  })();
  return () => {
    active = false;
  };
}, [isEditMode, id]);

useEffect(() => {
  if (!loadedInvoice || customers.length === 0) return;
  const loadedCustomerId =
    (loadedInvoice as any)?.customerId ||
    (loadedInvoice as any)?.customer?._id ||
    (loadedInvoice as any)?.customer?.id ||
    "";
  const match =
    customers.find((c: any) => String(c?.id || c?._id) === String(loadedCustomerId)) ||
    customers.find((c: any) => String(c?.name || c?.displayName || "").trim() === String((loadedInvoice as any)?.customerName || "").trim());
  if (match) {
    setSelectedCustomer(match);
    setFormData((prev) => ({
      ...prev,
      customerName: prev.customerName || match?.displayName || match?.name || match?.companyName || "",
    }));
    return;
  }
  const fallbackCustomer = (loadedInvoice as any)?.customer;
  if (fallbackCustomer) {
    setSelectedCustomer({
      ...fallbackCustomer,
      id: fallbackCustomer?._id || fallbackCustomer?.id,
      name:
        fallbackCustomer?.displayName ||
        fallbackCustomer?.companyName ||
        fallbackCustomer?.name ||
        (loadedInvoice as any)?.customerName ||
        "",
    });
    setFormData((prev) => ({
      ...prev,
      customerName:
        prev.customerName ||
        fallbackCustomer?.displayName ||
        fallbackCustomer?.companyName ||
        fallbackCustomer?.name ||
        (loadedInvoice as any)?.customerName ||
        "",
    }));
  }
}, [loadedInvoice, customers]);
const setIsUploadDropdownOpen = noop;
const setModalSelectedCustomerId = noop;
const setNewHeaderText = noop;
const setNewTaxData = noop;
const setPaymentData = noop;
const setPaymentTermsSearchQuery = noop;

 
const setSelectedCloudProvider = noop;
const setSelectedContactPersons = noop;
const setSelectedDocuments = noop;
const setSelectedInbox = noop;

const setShowNewHeaderInput = noop;
 


const setCurrentItemRowId = noop;
const setCustomerQuickActionFrameKey = noop;
const setOpenItemMenuId = noop;
const togglePaymentTermsDropdown = noop;
const openCustomerQuickAction = noop;
const reloadCustomersForInvoice = asyncNoop;
const tryAutoSelectNewCustomerFromQuickAction = asyncNoop;
const handleAddBulkItems = noop;
const handleBulkItemQuantityChange = noop;
const handleBulkItemToggle = noop;
const handleCancelBulkAdd = noop;
const handleCancelContactPerson = noop;
const handleCancelNewItem = noop;
const handleCancelNewTax = noop;
const handleChange = (e: any) => {
  const { name, value, type, checked } = e.target;
  setFormData((prev) => {
    const nextState = {
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    } as InvoiceFormState;
    const totals = calculateInvoiceTotalsFromData(nextState);
    return {
      ...nextState,
      subTotal: totals.subTotal,
      roundOff: totals.roundOff,
      total: totals.total,
    };
  });
};
const handleContactPersonChange = noop;
const handleContactPersonImageUpload = noop;
const handleCustomerSearch = noop;
const handleCustomerSelect = (customer: any) => {
  setSelectedCustomer(customer);
  setFormData((prev) => ({
    ...prev,
    customerName: customer?.displayName || customer?.name || customer?.companyName || "",
  }));
  setIsCustomerDropdownOpen(false);
  setCustomerSearch("");
};
const handleDeleteSalesperson = async (salespersonId: string) => {
  if (!window.confirm("Are you sure you want to delete this salesperson?")) return;
  try {
    const response = await salespersonsAPI.delete(salespersonId);
    if (response && response.success) {
      setSalespersons((prev) => prev.filter((sp) => String(sp.id || sp._id) !== String(salespersonId)));
      if (selectedSalesperson && String(selectedSalesperson.id || selectedSalesperson._id) === String(salespersonId)) {
        setSelectedSalesperson(null);
        setFormData((prev) => ({ ...prev, salesperson: "", salespersonId: "" }));
      }
    }
  } catch (error) {
    console.error("Error deleting salesperson:", error);
  }
};
const handleEditSalesperson = (salesperson: any) => {
  const salespersonId = salesperson?.id || salesperson?._id;
  if (!salespersonId) return;
  navigate(`/sales/salespersons/${salespersonId}/edit`, {
    state: { returnTo: isEditMode ? `/sales/invoices/${id}/edit` : "/sales/invoices/new" },
  });
};
const handleNewItemChange = noop;
const handleNewItemImageUpload = noop;
const handleNewSalespersonChange = (e: any) => {
  const { name, value } = e.target;
  setNewSalespersonData((prev: any) => ({ ...prev, [name]: value }));
};
const handlePaymentTermSelect = noop;
const handleSalespersonSelect = (salesperson: any) => {
  setSelectedSalesperson(salesperson);
  setFormData((prev) => ({
    ...prev,
    salesperson: salesperson?.name || "",
    salespersonId: salesperson?.id || salesperson?._id || "",
  }));
  setIsSalespersonDropdownOpen(false);
  setSalespersonSearch("");
};
const handleSaveAndSelectSalesperson = async () => {
  if (!newSalespersonData.name?.trim()) {
    alert("Please enter a name for the salesperson");
    return;
  }
  try {
    const response = await salespersonsAPI.create({
      name: newSalespersonData.name.trim(),
      email: newSalespersonData.email?.trim() || "",
      phone: "",
    });
    if (response && response.success && response.data) {
      const savedSalesperson = response.data;
      setSalespersons((prev) => [...prev, savedSalesperson]);
      handleSalespersonSelect(savedSalesperson);
      setNewSalespersonData({ name: "", email: "" });
      setIsNewSalespersonFormOpen(false);
      setIsManageSalespersonsOpen(false);
    }
  } catch (error: any) {
    console.error("Error saving salesperson:", error);
    alert("Error saving salesperson: " + (error?.message || "Unknown error"));
  }
};
const handleSaveContactPerson = asyncNoop;
const handleSaveNewItem = asyncNoop;
const handleSaveNewTax = asyncNoop;
const handleTaxSelect = (itemId: number | string, taxId: string) => {
  setFormData((prev) => {
    const updatedItems = prev.items.map((item) =>
      String(item.id) === String(itemId) ? { ...item, tax: taxId } : item
    );
    const nextState = { ...prev, items: updatedItems } as InvoiceFormState;
    const totals = calculateInvoiceTotalsFromData(nextState);
    return {
      ...nextState,
      subTotal: totals.subTotal,
      roundOff: totals.roundOff,
      total: totals.total,
    };
  });
  setOpenTaxDropdowns((prev) => ({ ...prev, [String(itemId)]: false }));
  setTaxSearches((prev) => ({ ...prev, [String(itemId)]: "" }));
};
const handleCancelNewSalesperson = () => {
  setNewSalespersonData({ name: "", email: "" });
  setIsNewSalespersonFormOpen(false);
};
const formatDate = (value: any) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const parseDisplayDate = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(raw.replace(/(\d{2}) ([A-Za-z]{3}) (\d{4})/, "$1 $2, $3"));
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};
const computeDueDateFromTerm = (invoiceDateValue: any, termValue: string, termsList: PaymentTerm[]) => {
  const invoiceDate = parseDisplayDate(invoiceDateValue);
  const selectedTerm = termsList.find((term) => term.value === termValue) || termsList[0];
  if (!selectedTerm) return formatDate(invoiceDate);
  const label = String(selectedTerm.label || "").toLowerCase();
  const termDays = Number(selectedTerm.days);
  let dueDate = new Date(invoiceDate);

  if (label.includes("due end of next month")) {
    dueDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 2, 0);
  } else if (label.includes("due end of the month")) {
    dueDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 0);
  } else if (label.includes("due on receipt")) {
    dueDate = new Date(invoiceDate);
  } else if (!Number.isNaN(termDays) && termDays >= 0) {
    dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + termDays);
  }

  return formatDate(dueDate);
};
const applyPaymentTerm = (termValue: string, termsList: PaymentTerm[] = paymentTerms) => {
  const dueDate = computeDueDateFromTerm(formData.invoiceDate, termValue, termsList);
  setSelectedPaymentTerm(termValue);
  setFormData((prev) => ({
    ...prev,
    receipt: termValue,
    dueDate,
  }));
};
const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const days = [];
  const prevMonthEnd = new Date(year, month, 0);
  for (let day = 1; day <= end.getDate(); day += 1) {
    days.push({ date: day, fullDate: new Date(year, month, day), month: "current" });
  }
  const startOffset = (start.getDay() + 6) % 7;
  for (let i = startOffset - 1; i >= 0; i -= 1) {
    const prevDate = prevMonthEnd.getDate() - i;
    days.unshift({ date: prevDate, fullDate: new Date(year, month - 1, prevDate), month: "prev" });
  }
  const remainingCells = Math.max(35, Math.ceil(days.length / 7) * 7) - days.length;
  for (let day = 1; day <= remainingCells; day += 1) {
    days.push({ date: day, fullDate: new Date(year, month + 1, day), month: "next" });
  }
  return days;
};
const navigateMonth = (direction: "prev" | "next", field: "invoiceDate" | "dueDate") => {
  const setter = field === "invoiceDate" ? setInvoiceDateCalendar : setDueDateCalendar;
  setter((prev) => {
    const next = new Date(prev);
    next.setMonth(next.getMonth() + (direction === "next" ? 1 : -1));
    return next;
  });
};
const handleDateSelect = (date: Date, field: "invoiceDate" | "dueDate") => {
  const formatted = formatDate(date);
  if (field === "invoiceDate") {
    setInvoiceDateCalendar(new Date(date.getFullYear(), date.getMonth(), 1));
    setIsInvoiceDatePickerOpen(false);
    setFormData((prev) => ({
      ...prev,
      invoiceDate: formatted,
      dueDate: computeDueDateFromTerm(formatted, selectedPaymentTerm, paymentTerms),
    }));
    setDueDateCalendar(new Date(parseDisplayDate(computeDueDateFromTerm(formatted, selectedPaymentTerm, paymentTerms)).getFullYear(), parseDisplayDate(computeDueDateFromTerm(formatted, selectedPaymentTerm, paymentTerms)).getMonth(), 1));
    return;
  }
  setDueDateCalendar(new Date(date.getFullYear(), date.getMonth(), 1));
  setIsDueDatePickerOpen(false);
  setFormData((prev) => ({ ...prev, dueDate: formatted }));
};
const parseFileSize = (size: any) => `${Number(size || 0)} B`;
const getTaxDisplayLabel = (tax: any) => `${tax?.name || "Tax"} [${Number(tax?.rate || 0)}%]`;
const findTaxOptionById = (taxId: any) => taxOptions.find((tax: any) => String(tax.id || tax._id) === String(taxId));
const getFilteredTaxes = (itemIdOrQuery: any = "") => {
  const mappedSearch = taxSearches[String(itemIdOrQuery)];
  const search = String(mappedSearch ?? itemIdOrQuery ?? "").toLowerCase().trim();
  if (!search) return taxOptions;
  return taxOptions.filter((tax: any) => {
    const label = getTaxDisplayLabel(tax).toLowerCase();
    const name = String(tax?.name || tax?.taxName || "").toLowerCase();
    const rate = String(tax?.rate ?? "").toLowerCase();
    return label.includes(search) || name.includes(search) || rate.includes(search);
  });
};
const parseTaxRate = (value: any) => Number.parseFloat(String(value || 0).replace("%", "")) || 0;
const isTaxInclusiveMode = (value: any) => String(value || "").toLowerCase().includes("inclusive");
const getTaxBySelection = (selection: any) => {
  const normalizedSelection = String(selection || "").toLowerCase().trim();
  if (!normalizedSelection) return undefined;
  return findTaxOptionById(selection)
    || taxOptions.find((tax: any) => String(tax.name || "").toLowerCase().trim() === normalizedSelection)
    || taxOptions.find((tax: any) => getTaxDisplayLabel(tax).toLowerCase().trim() === normalizedSelection);
};
const getItemBaseAmount = (item: any) => Number(item?.quantity || 0) * Number(item?.rate || 0);
const getTaxAmountFromBase = (base: number, rate: number, _isInclusive: boolean) => (base * rate) / 100;
const calculateInvoiceTotalsFromData = (data: InvoiceFormState) => {
  const rows = (data.items || []).filter((item: any) => item?.itemType !== "header");
  const subTotal = rows.reduce((sum, item) => sum + getItemBaseAmount(item), 0);
  const discountAmount = showTransactionDiscount
    ? (data.discountType === "amount"
      ? Number(data.discount || 0)
      : (subTotal * Number(data.discount || 0)) / 100)
    : 0;
  const discountBase = subTotal;
  const netSubTotal = Math.max(0, subTotal - discountAmount);
  const isInclusive = isTaxInclusiveMode(data.taxExclusive);

  let taxAmount = 0;
  rows.forEach((item: any) => {
    const base = Number(getItemBaseAmount(item) || 0);
    if (base <= 0) return;
    const adjustedBase = subTotal > 0 ? (base / subTotal) * netSubTotal : base;
    const taxOption = getTaxBySelection(item.tax);
    const taxRate = taxOption ? parseTaxRate((taxOption as any).rate) : 0;
    if (taxRate <= 0) return;
    taxAmount += getTaxAmountFromBase(adjustedBase, taxRate, isInclusive);
  });

  const shippingTaxOption = getTaxBySelection((data as any).shippingChargeTax);
  const shippingTaxRate = shippingTaxOption ? parseTaxRate((shippingTaxOption as any).rate) : 0;
  const shippingBase = showShippingCharges ? Number(data.shippingCharges || 0) : 0;
  const shippingTaxAmount = shippingTaxRate > 0 ? getTaxAmountFromBase(shippingBase, shippingTaxRate, isInclusive) : 0;
  const total = netSubTotal + shippingBase + Number(data.adjustment || 0) + taxAmount + shippingTaxAmount;
  return {
    subTotal,
    taxAmount,
    discountBase,
    discountAmount,
    shippingTaxAmount,
    shippingTaxRate,
    roundOff: 0,
    total,
  };
};
const taxSummary = useMemo(() => {
  const summary: Record<string, number> = {};
  const rows = (formData.items || []).filter((item: any) => item?.itemType !== "header");
  const subTotal = rows.reduce((sum: number, item: any) => sum + getItemBaseAmount(item), 0);
  const discountAmount = showTransactionDiscount
    ? (formData.discountType === "amount"
      ? Number(formData.discount || 0)
      : (subTotal * Number(formData.discount || 0)) / 100)
    : 0;
  const netSubTotal = Math.max(0, subTotal - discountAmount);
  const isInclusive = isTaxInclusiveMode(formData.taxExclusive);

  rows.forEach((item: any) => {
    const base = Number(getItemBaseAmount(item) || 0);
    if (base <= 0) return;
    const adjustedBase = subTotal > 0 ? (base / subTotal) * netSubTotal : base;
    const taxOption = getTaxBySelection(item.tax);
    const taxRate = taxOption ? parseTaxRate((taxOption as any).rate) : 0;
    if (taxRate <= 0) return;
    const amount = getTaxAmountFromBase(adjustedBase, taxRate, isInclusive);
    const label = `${String((taxOption as any)?.name || "Tax")} [${Number(taxRate)}%]`;
    summary[label] = Number((summary[label] || 0) + amount);
  });

  return summary;
}, [formData, showTransactionDiscount, taxOptions]);
const liveTotals = useMemo(
  () => calculateInvoiceTotalsFromData(formData),
  [formData, showShippingCharges, showTransactionDiscount, taxOptions]
);
useEffect(() => {
  setInvoiceDateCalendar(new Date(parseDisplayDate(formData.invoiceDate).getFullYear(), parseDisplayDate(formData.invoiceDate).getMonth(), 1));
}, [formData.invoiceDate]);

useEffect(() => {
  if (!formData.dueDate) return;
  const parsedDueDate = parseDisplayDate(formData.dueDate);
  setDueDateCalendar(new Date(parsedDueDate.getFullYear(), parsedDueDate.getMonth(), 1));
}, [formData.dueDate]);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    if (invoiceDatePickerRef.current && !invoiceDatePickerRef.current.contains(target)) {
      setIsInvoiceDatePickerOpen(false);
    }
    if (dueDatePickerRef.current && !dueDatePickerRef.current.contains(target)) {
      setIsDueDatePickerOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

useEffect(() => {
  const handleOutsideAdditionalInfoMenu = (event: MouseEvent) => {
    if (additionalInfoMenuRef.current && !additionalInfoMenuRef.current.contains(event.target as Node)) {
      setActiveAdditionalInfoMenu(null);
      setAdditionalInfoSearch("");
    }
  };
  document.addEventListener("mousedown", handleOutsideAdditionalInfoMenu);
  return () => document.removeEventListener("mousedown", handleOutsideAdditionalInfoMenu);
}, []);

useEffect(() => {
  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      const rows = response?.success && Array.isArray(response?.data)
        ? response.data
        : Array.isArray((response as any)?.data)
          ? (response as any).data
          : [];
      const normalizedCustomers = rows.map((customer: any) => ({
        ...customer,
        id: customer?._id || customer?.id,
        name: customer?.displayName || customer?.companyName || customer?.name || "",
      }));
      setCustomers(normalizedCustomers.filter(isCustomerActive));
    } catch (error) {
      console.error("Error loading customers:", error);
      setCustomers([]);
    }
  };
  loadCustomers();
}, []);

useEffect(() => {
  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll({ limit: 10000 });
      const rows = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray((response as any)?.projects)
          ? (response as any).projects
          : [];
      const normalized = rows
        .map((project: any) => ({
          id: String(project?._id || project?.id || "").trim(),
          name: String(project?.projectName || project?.name || "Project").trim(),
          status: String(project?.status || "").toLowerCase(),
        }))
        .filter((project: any) => project.id && project.name)
        .filter((project: any, index: number, list: any[]) => list.findIndex((row: any) => row.id === project.id) === index)
        .filter((project: any) => project.status !== "inactive");
      setAvailableProjects(normalized);
    } catch (error) {
      console.error("Error loading projects for invoice:", error);
      setAvailableProjects([]);
    }
  };
  loadProjects();
}, []);

useEffect(() => {
  if (prefillAppliedRef.current) return;
  if (isEditMode) return;

  const state = location.state as any;
  if (!state || state.source !== "timeTrackingProjects") return;

  const rawProjects = Array.isArray(state.projects) ? state.projects : [];
  if (rawProjects.length === 0) return;

  const customerId = String(state.customerId || rawProjects[0]?.customerId || "").trim();
  const customerName = String(state.customerName || rawProjects[0]?.customerName || "").trim();

  const matchedCustomer =
    customers.find((c: any) => String(c?.id || c?._id || "") === customerId) ||
    customers.find(
      (c: any) =>
        String(c?.name || c?.displayName || "").trim().toLowerCase() ===
        String(customerName || "").trim().toLowerCase()
    );

  if (matchedCustomer) {
    setSelectedCustomer(matchedCustomer);
  } else if (customerName) {
    setSelectedCustomer({ id: customerId || undefined, name: customerName, displayName: customerName });
  }

  const mappedItems = rawProjects.map((project: any, index: number) => {
    const method = String(project?.billingMethod || "").toLowerCase();
    const rateSource =
      method === "fixed"
        ? project?.totalProjectCost ?? project?.billingRate ?? project?.rate ?? 0
        : project?.billingRate ?? project?.rate ?? 0;
    const rate = Number(rateSource) || 0;
    const quantity = 1;
    const projectId = project?.id || project?.projectId || project?.project || "";
    return {
      id: Date.now() + index,
      itemDetails: project?.projectName || project?.name || "Project",
      quantity,
      rate,
      tax: "",
      amount: rate * quantity,
      description: project?.description || "",
      projectId,
      project: projectId,
      projectName: project?.projectName || project?.name || "",
    };
  });

  setFormData((prev) => {
    const cleanedItems = mappedItems.filter((item) => {
      const hasProject = String((item as any).projectId || (item as any).project || "").trim();
      const hasDetails = String(item?.itemDetails || "").trim();
      return hasProject || hasDetails;
    });
    const hasStandardItem = cleanedItems.some((item: any) => {
      const hasProject = String((item as any).projectId || (item as any).project || (item as any).projectName || "").trim();
      return !hasProject;
    });
    const mergedItems = hasStandardItem ? cleanedItems : [...cleanedItems, createEmptyInvoiceItem()];
    const nextState = {
      ...prev,
      customerName: customerName || prev.customerName,
      currency: String(rawProjects[0]?.currency || prev.currency || "USD"),
      items: mergedItems.length > 0 ? mergedItems : prev.items,
    } as InvoiceFormState;
    const totals = calculateInvoiceTotalsFromData(nextState);
    return {
      ...nextState,
      subTotal: totals.subTotal,
      roundOff: totals.roundOff,
      total: totals.total,
    };
  });

  prefillAppliedRef.current = true;
}, [location.state, customers, isEditMode]);

useEffect(() => {
  const normalizeLocalTaxRow = (tax: any) => ({
    id: tax?._id || tax?.id,
    _id: tax?._id || tax?.id,
    name: String(tax?.name || "").trim(),
    rate: Number(tax?.rate || 0),
    type: tax?.type || "both",
    isCompound: !!tax?.isCompound,
    isDefault: !!tax?.isDefault,
    isActive: tax?.isActive !== false,
    createdAt: tax?.createdAt,
    updatedAt: tax?.updatedAt,
  });

  const loadTaxOptions = async () => {
    try {
      const localRows = readTaxesLocal()
        .filter((tax: any) => tax?.isActive !== false)
        .map(normalizeLocalTaxRow)
        .filter((tax: any) => tax.name);

      if (localRows.length > 0) {
        setTaxOptions(localRows);
        return;
      }

      const rows = await getTaxes();
      const normalized = Array.isArray(rows)
        ? rows.filter((tax: any) => String(tax?.status || "active").toLowerCase() !== "inactive")
        : [];
      setTaxOptions(normalized);
    } catch (error) {
      console.error("Error loading taxes for invoice:", error);
      setTaxOptions([]);
    }
  };

  loadTaxOptions();

  const onTaxStorageUpdated = () => loadTaxOptions();
  const onWindowFocus = () => loadTaxOptions();

  window.addEventListener(TAXES_STORAGE_EVENT, onTaxStorageUpdated as EventListener);
  window.addEventListener("focus", onWindowFocus);
  return () => {
    window.removeEventListener(TAXES_STORAGE_EVENT, onTaxStorageUpdated as EventListener);
    window.removeEventListener("focus", onWindowFocus);
  };
}, []);

useEffect(() => {
  const loadCatalogItemsAndPlans = async () => {
    try {
      let transformedItems: any[] = [];
      try {
        const response = await itemsAPI.getAll();
        const rows = response?.success && Array.isArray(response?.data)
          ? response.data
          : Array.isArray((response as any)?.data)
            ? (response as any).data
            : Array.isArray(response)
              ? response
              : [];

        transformedItems = Array.isArray(rows)
          ? rows
              .map((item: any, index: number) => ({
                ...item,
                entityType: "item",
                id: String(item?.id || item?._id || item?.itemId || `item-${index}`),
                sourceId: String(item?.id || item?._id || item?.itemId || `item-${index}`),
                name: String(item?.name || item?.itemName || "").trim(),
                sku: String(item?.sku || item?.itemCode || "").trim(),
                code: String(item?.sku || item?.itemCode || "").trim(),
                rate: Number(item?.sellingPrice || item?.costPrice || item?.rate || 0) || 0,
                stockOnHand: Number(item?.stockOnHand || item?.quantityOnHand || item?.stockQuantity || 0) || 0,
                unit: String(item?.unit || item?.unitOfMeasure || "pcs"),
                description: String(item?.salesDescription || item?.description || ""),
              }))
              .filter((item: any) => item.name)
          : [];
      } catch (error) {
        console.error("Error loading items for invoice:", error);
      }

      let transformedPlans: any[] = [];
      try {
        const rawPlans = localStorage.getItem(PLANS_STORAGE_KEY);
        const parsedPlans = rawPlans ? JSON.parse(rawPlans) : [];
        if (Array.isArray(parsedPlans)) {
          transformedPlans = parsedPlans
            .map((plan: any, index: number) => {
              const sourceId = String(plan?.id || plan?._id || `plan-${index}`);
              return {
                ...plan,
                entityType: "plan",
                id: `plan:${sourceId}`,
                sourceId,
                name: String(plan?.planName || plan?.name || plan?.plan || "").trim(),
                sku: String(plan?.planCode || plan?.code || "").trim(),
                code: String(plan?.planCode || plan?.code || "").trim(),
                rate: Number(plan?.price ?? plan?.rate ?? 0) || 0,
                stockOnHand: 0,
                unit: String(plan?.billingFrequencyUnit || plan?.billingFrequency || "plan"),
                description: String(plan?.planDescription || plan?.description || ""),
              };
            })
            .filter((plan: any) => plan.name)
            .filter((plan: any) => String(plan?.status || "active").toLowerCase() !== "inactive");
        }
      } catch (error) {
        console.error("Error loading plans for invoice:", error);
      }

      const uniqueByEntityAndId = new Map<string, any>();
      [...transformedItems, ...transformedPlans].forEach((entry: any) => {
        const key = `${String(entry?.entityType || "item")}:${String(entry?.id || entry?.name || "")}`;
        if (!key.endsWith(":")) uniqueByEntityAndId.set(key, entry);
      });
      setAvailableItems(Array.from(uniqueByEntityAndId.values()));
    } catch (error) {
      console.error("Error loading invoice catalog entries:", error);
      setAvailableItems([]);
    }
  };

  loadCatalogItemsAndPlans();

  const onStorageChange = (event: StorageEvent) => {
    if (!event.key || event.key === PLANS_STORAGE_KEY) {
      loadCatalogItemsAndPlans();
    }
  };
  const onWindowFocus = () => loadCatalogItemsAndPlans();

  window.addEventListener("storage", onStorageChange);
  window.addEventListener("focus", onWindowFocus);
  return () => {
    window.removeEventListener("storage", onStorageChange);
    window.removeEventListener("focus", onWindowFocus);
  };
}, []);

useEffect(() => {
  const loadSalespersons = async () => {
    try {
      const response = await salespersonsAPI.getAll();
      if (response?.success && Array.isArray(response.data)) {
        setSalespersons(response.data);
      }
    } catch (error) {
      console.error("Error loading salespersons:", error);
    }
  };
  loadSalespersons();
}, []);

useEffect(() => {
  const loadReportingTags = async () => {
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
      if (!Array.isArray(sourceRows)) {
        setAvailableReportingTags([]);
        return;
      }

      const activeRows = sourceRows.filter((tag: any) => String(tag?.status || "active").toLowerCase() !== "inactive");
      const invoiceScoped = activeRows.filter((tag: any) => {
        const appliesTo = normalizeReportingTagAppliesTo(tag);
        return appliesTo.some((entry) => entry.includes("invoice") || entry.includes("sales"));
      });

      const tagsToUse = (invoiceScoped.length > 0 ? invoiceScoped : activeRows).map((tag: any) => ({
        ...tag,
        options: normalizeReportingTagOptions(tag),
      }));

      setAvailableReportingTags(tagsToUse);
    } catch (error) {
      console.error("Error loading reporting tags:", error);
      setAvailableReportingTags([]);
    }
  };
  loadReportingTags();
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

useEffect(() => {
  const nextLocations = readStoredLocationOptions();
  setLocationOptions(nextLocations);
  setFormData((prev: any) => ({
    ...prev,
    selectedLocation: nextLocations.includes((prev as any).selectedLocation)
      ? (prev as any).selectedLocation
      : (nextLocations[0] || "Head Office"),
  }));
}, []);

useEffect(() => {
  const handleOutside = (event: MouseEvent) => {
    if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
      setIsCustomerDropdownOpen(false);
    }
    if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(event.target as Node)) {
      setIsSalespersonDropdownOpen(false);
    }
    if (priceListDropdownRef.current && !priceListDropdownRef.current.contains(event.target as Node)) {
      setIsPriceListDropdownOpen(false);
    }
    if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
      setIsBulkActionsOpen(false);
    }
    Object.keys(openItemDropdowns).forEach((itemId) => {
      if (openItemDropdowns[itemId]) {
        const ref = itemDropdownRefs.current[itemId];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenItemDropdowns((prev) => ({ ...prev, [itemId]: false }));
        }
      }
    });
  };
  if (isSalespersonDropdownOpen || isCustomerDropdownOpen || isPriceListDropdownOpen || isBulkActionsOpen || Object.values(openItemDropdowns).some(Boolean)) {
    document.addEventListener("mousedown", handleOutside);
  }
  return () => document.removeEventListener("mousedown", handleOutside);
}, [isSalespersonDropdownOpen, isCustomerDropdownOpen, isPriceListDropdownOpen, isBulkActionsOpen, openItemDropdowns]);

const handleItemSelect = (itemId: number | string, selectedItem: any) => {
  setFormData((prev) => {
    const updatedItems = prev.items.map((item) => {
      if (String(item.id) !== String(itemId)) return item;
      const quantity = Number(item.quantity || 1);
      const rate = Number(selectedItem.rate || 0);
      const updatedItem: any = {
        ...item,
        itemId: String(selectedItem.id || ""),
        itemDetails: selectedItem.name || item.itemDetails || "",
        name: selectedItem.name || item.name || "",
        sku: selectedItem.sku || item.sku || "",
        rate,
        tax: selectedItem.taxId || selectedItem.tax || item.tax || "",
        stockOnHand: Number(selectedItem.stockOnHand || 0),
        unit: selectedItem.unit || item.unit || "pcs",
      };

      if (!showItemDiscount) {
        updatedItem.discount = 0;
        updatedItem.discountType = "percent";
      }

      const itemSubtotal = quantity * rate;
      const discountValue = showItemDiscount ? Number(updatedItem.discount || 0) : 0;
      const discountType = showItemDiscount ? (updatedItem.discountType || "percent") : "percent";
      const discountAmount = discountType === "amount"
        ? Math.min(itemSubtotal, discountValue)
        : Math.min(itemSubtotal, (itemSubtotal * discountValue) / 100);

      updatedItem.amount = Math.max(0, itemSubtotal - discountAmount);
      return updatedItem;
    });

    const nextState = { ...prev, items: updatedItems } as InvoiceFormState;
    const totals = calculateInvoiceTotalsFromData(nextState);
    return {
      ...nextState,
      subTotal: totals.subTotal,
      roundOff: totals.roundOff,
      total: totals.total,
    };
  });

  setOpenItemDropdowns((prev) => ({ ...prev, [String(itemId)]: false }));
  setItemSearches((prev) => ({ ...prev, [String(itemId)]: "" }));
};

const toggleItemDropdown = (itemId: number | string) => {
  setOpenItemDropdowns(prev => ({
    ...prev,
    [String(itemId)]: !prev[String(itemId)]
  }));
};

const getFilteredItemOptions = (itemId: number | string) => {
  const search = String(itemSearches[String(itemId)] || "").toLowerCase().trim();
  if (!search) return availableItems;
  return availableItems.filter((entry: any) =>
    String(entry?.name || "").toLowerCase().includes(search) ||
    String(entry?.sku || entry?.code || "").toLowerCase().includes(search) ||
    String(entry?.description || "").toLowerCase().includes(search)
  );
};

const handleItemChange = (id: number | string, field: string, value: any) => {
  setFormData(prev => {
    const updatedItems = prev.items.map(item => {
      if (String(item.id) === String(id)) {
        const updatedItem: any = { ...item, [field]: value };

        if (field === "quantity" || field === "rate") {
          updatedItem[field] = Number(value) || 0;
        }
        if (field === "discount" && showItemDiscount) {
          updatedItem.discount = Number(value) || 0;
        }
        if (field === "discountType" && showItemDiscount) {
          updatedItem.discountType = value === "amount" ? "amount" : "percent";
        }
        if (!showItemDiscount) {
          updatedItem.discount = 0;
          updatedItem.discountType = "percent";
        }

        const quantity = Number(updatedItem.quantity || 0);
        const rate = Number(updatedItem.rate || 0);
        const itemSubtotal = quantity * rate;
        const discountValue = showItemDiscount ? Number(updatedItem.discount || 0) : 0;
        const discountType = showItemDiscount ? (updatedItem.discountType || "percent") : "percent";
        const discountAmount = discountType === "amount"
          ? Math.min(itemSubtotal, discountValue)
          : Math.min(itemSubtotal, (itemSubtotal * discountValue) / 100);
        updatedItem.amount = Math.max(0, itemSubtotal - discountAmount);
        return updatedItem;
      }
      return item;
    });

    const nextState = { ...prev, items: updatedItems } as InvoiceFormState;
    const totals = calculateInvoiceTotalsFromData(nextState);
    return {
      ...nextState,
      subTotal: totals.subTotal,
      roundOff: totals.roundOff,
      total: totals.total
    };
  });
};

const handleAddItem = () => {
  const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  setFormData(prev => ({
    ...prev,
    items: [
      ...prev.items,
      { id: uniqueId, itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0 }
    ]
  }));
};

const handleRemoveItem = (id: number | string) => {
  setFormData(prev => ({
    ...prev,
    items: prev.items.filter(item => item.id !== id)
  }));
};

const handleSelectAllItems = () => {
  setBulkSelectedItemIds(standardLineItems.map(item => item.id));
};

const handleDeselectAllItems = () => {
  setBulkSelectedItemIds([]);
};

const handleToggleItemSelection = (itemId: number | string) => {
  setBulkSelectedItemIds(prev =>
    prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
  );
};

const handleDuplicateItem = (id: number | string) => {
  const itemToDuplicate = formData.items.find(item => item.id === id);
  if (itemToDuplicate) {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...itemToDuplicate,
          id: Date.now(),
          amount: 0
        }
      ]
    }));
  }
  setOpenItemMenuId(null);
};

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files ? Array.from(e.target.files) : [];

  // Validate file count
  if (formData.attachedFiles.length + files.length > 10) {
    alert("You can upload a maximum of 10 files");
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

const handleRemoveFile = (fileId: string | number) => {
  setFormData(prev => ({
    ...prev,
    attachedFiles: prev.attachedFiles.filter(file => file.id !== fileId)
  }));
};

const handleUploadClick = () => {
  fileInputRef.current?.click();
};

const customerDetails = selectedCustomer || customers.find(c => c.name === formData.customerName);

const buildInvoicePayload = (statusValue: string) => {
  const totals = calculateInvoiceTotalsFromData(formData);
  const subTotal = Number(totals.subTotal || 0);
  const finalTotal = Number(totals.total || 0);
  const roundOff = Number(totals.roundOff || 0);
  const totalTaxAmountValue = Number(totals.taxAmount || 0);
  const shippingTaxAmount = Number(totals.shippingTaxAmount || 0);
  const shippingTaxRate = Number(totals.shippingTaxRate || 0);
  const discountAmount = Number(totals.discountAmount || 0);
  const shipping = showShippingCharges ? Number(formData.shippingCharges || 0) : 0;
  const adjustment = showAdjustment ? Number(formData.adjustment || 0) : 0;
  const isInclusive = isTaxInclusiveMode(formData.taxExclusive);

  const taxLabels = Object.keys(taxSummary);
  const taxName = totalTaxAmountValue > 0
    ? (taxLabels.length === 1 ? taxLabels[0] : (isInclusive ? "Tax (Included)" : "Tax"))
    : "";

  const customer = customerDetails;
  const customerDisplayName =
    customer?.displayName ||
    customer?.companyName ||
    customer?.name ||
    formData.customerName ||
    "";
  const itemRows = (formData.items as any[]).filter((item) => item.itemType !== "header");

  const payload = {
    invoiceNumber: formData.invoiceNumber,
    customer: customer?.id || customer?._id || undefined,
    customerId: customer?.id || customer?._id || undefined,
    customerName: customerDisplayName,
    date: formData.invoiceDate || new Date().toISOString(),
    dueDate: formData.dueDate,
    orderNumber: formData.orderNumber,
    receipt: formData.receipt,
    accountsReceivable: formData.accountsReceivable,
    salesperson: formData.salesperson,
    salespersonId: formData.salespersonId,
    subject: formData.subject,
    taxExclusive: formData.taxExclusive,

    items: itemRows.map((item) => {
      const baseAmount = getItemBaseAmount(item);
      const taxOption = getTaxBySelection(item.tax);
      const taxRate = taxOption ? parseTaxRate((taxOption as any).rate) : 0;
      const taxAmount = getTaxAmountFromBase(baseAmount, taxRate, isInclusive);
      return {
        item: item.itemId || null,
        itemId: item.itemId || null,
        projectId: (item as any).projectId || (item as any).project || null,
        project: (item as any).projectId || (item as any).project || null,
        projectName: (item as any).projectName || "",
        name: item.itemDetails,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.rate) || 0,
        rate: Number(item.rate) || 0,
        tax: item.tax || "",
        taxRate: Number(taxRate.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        total: Number(baseAmount.toFixed(2)),
        amount: Number(baseAmount.toFixed(2)),
        description: item.description || item.itemDetails || ""
      };
    }),

    subtotal: subTotal,
    subTotal: subTotal,
    tax: totalTaxAmountValue,
    taxAmount: totalTaxAmountValue,
    taxName: taxName,
    discount: showTransactionDiscount ? Number(formData.discount || 0) : 0,
    discountType: showTransactionDiscount ? formData.discountType : "percent",
    discountAmount: discountAmount,
    discountAccount: formData.discountAccount,
    shippingCharges: shipping,
    shippingChargeTax: formData.shippingChargeTax || "",
    shippingTaxAmount: shippingTaxAmount,
    shippingTaxRate: shippingTaxRate,
    adjustment: adjustment,
    roundOff: roundOff,
    total: finalTotal,
    balanceDue: finalTotal,
    balance: finalTotal,
    amount: finalTotal,

    currency: formData.currency,
    location: (formData as any).selectedLocation || "Head Office",
    selectedLocation: (formData as any).selectedLocation || "Head Office",
    notes: formData.customerNotes,
    customerNotes: formData.customerNotes,
    termsAndConditions: formData.termsAndConditions,
    attachedFiles: formData.attachedFiles || [],
    reportingTags: (formData as any).reportingTags || [],

    paymentReceived: isPaymentReceived,
    paymentData: isPaymentReceived ? {
      paymentMode: paymentData.paymentMode || "Cash",
      depositTo: paymentData.depositTo || "Petty Cash",
      amountReceived: parseFloat(paymentData.amountReceived) || 0,
      referenceNumber: paymentData.referenceNumber || "",
      taxDeducted: paymentData.taxDeducted || "no"
    } : null,

    contactPersons: selectedContactPersons.map(cp => ({
      salutation: cp.salutation || '',
      firstName: cp.firstName || '',
      lastName: cp.lastName || '',
      email: cp.email || '',
      workPhone: cp.workPhone || '',
      mobile: cp.mobile || '',
      designation: cp.designation || '',
      department: cp.department || '',
      skypeName: cp.skypeName || '',
      isPrimary: cp.isPrimary || false
    })),

    status: statusValue,
    createdAt: new Date().toISOString()
  };

  return { payload, customer };
};

const isDuplicateInvoiceNumberError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || 0);
  const hasInvoiceNumberText = message.includes("invoice number");
  const hasDuplicateText = message.includes("already exists") || message.includes("duplicate");
  return hasInvoiceNumberText && hasDuplicateText && (status === 0 || status === 400 || status === 409);
};

const fetchLatestInvoiceNumber = async () => {
  const response = await invoicesAPI.getNextNumber(invoicePrefix || "INV-");
  if (response && response.success && response.data?.invoiceNumber) {
    const latestNumber = String(response.data.invoiceNumber);
    setFormData(prev => ({ ...prev, invoiceNumber: latestNumber }));
    if (response.data.nextNumber !== undefined && response.data.nextNumber !== null) {
      setInvoiceNextNumber(String(response.data.nextNumber).padStart(6, "0"));
    }
    return latestNumber;
  }
  return null;
};

const createInvoiceWithNumberRetry = async (invoiceData: any) => {
  try {
    return await saveInvoice(invoiceData);
  } catch (error: any) {
    if (!isEditMode && invoiceNumberMode === "auto" && isDuplicateInvoiceNumberError(error)) {
      const freshNumber = await fetchLatestInvoiceNumber();
      if (freshNumber) {
        const retryPayload = { ...invoiceData, invoiceNumber: freshNumber };
        return await saveInvoice(retryPayload);
      }
    }
    throw error;
  }
};

const handleSaveDraft = async () => {
  try {
    const { payload: invoiceData } = buildInvoicePayload("draft");
    if (!isEditMode && invoiceNumberMode === "auto") {
      try {
        const latestNumber = await fetchLatestInvoiceNumber();
        if (latestNumber) {
          invoiceData.invoiceNumber = latestNumber;
        }
      } catch (numberError) {
        console.warn("Failed to refresh invoice number before draft save:", numberError);
      }
    }

    // Save or update invoice in localStorage
    if (isEditMode && id) {
      await updateInvoice(id, invoiceData);
      toast.success("Invoice draft updated successfully.");
    } else {
      await createInvoiceWithNumberRetry(invoiceData);
      toast.success("Invoice draft created successfully.");
    }

    // Navigate back to invoices page
    navigate("/sales/invoices");
  } catch (error) {
    console.error("Error saving invoice as draft:", error);
    toast.error("Failed to save invoice. Please try again.");
  }
};

const handleSaveAndSend = async (overridingStatus?: string) => {
  try {
    // Validate required fields
    if (!formData.customerName || formData.customerName.trim() === "") {
      toast.error("Please select a customer.");
      return;
    }

    if (!formData.invoiceNumber || formData.invoiceNumber.trim() === "") {
      toast.error("Please enter an invoice number.");
      return;
    }

    const requestedStatus = String(overridingStatus || formData.status || "draft").toLowerCase();
    setSaveLoading(requestedStatus === "sent" ? "send" : "draft");

    // DISABLED: Stock validation is handled by the backend which has access to real-time
    // database data and respects inventory tracking settings
    /*
    const stockValidationErrors: string[] = [];
    formData.items.forEach((item: any, index: number) => {
      const quantity = parseFloat(item.quantity as any) || 0;
      const stockOnHand = parseFloat(item.stockOnHand as any) || 0;
      const itemName = item.itemDetails || `Item ${index + 1}`;

      if (quantity > stockOnHand) {
        stockValidationErrors.push(`${itemName}: Required: ${quantity}, Available: ${stockOnHand}`);
      }
    });

    if (stockValidationErrors.length > 0) {
      alert(`Cannot create invoice: Insufficient stock for the following items:\n${stockValidationErrors.join('\n')}\n\nPlease update inventory or reduce quantities.`);
      return;
    }
    */

    // For new invoices, always create as draft first, then send from detail/email flow.
    // This avoids backend stock rejection during initial create when status is "sent".
    const statusForCreateOrUpdate = (!isEditMode && requestedStatus !== "draft") ? "draft" : requestedStatus;
    const { payload: invoiceData, customer } = buildInvoicePayload(statusForCreateOrUpdate);
    if (!isEditMode && invoiceNumberMode === "auto") {
      try {
        const latestNumber = await fetchLatestInvoiceNumber();
        if (latestNumber) {
          invoiceData.invoiceNumber = latestNumber;
        }
      } catch (numberError) {
        console.warn("Failed to refresh invoice number before save:", numberError);
      }
    }

    if (!customer || (!customer.id && !customer._id)) {
      toast.error("Invalid customer selected. Please re-select the customer.");
      return;
    }

    // Save or update invoice in localStorage
    let savedInvoice: any;
    if (isEditMode && id) {
      savedInvoice = await updateInvoice(id, invoiceData);
      toast.success(requestedStatus === "sent" ? "Invoice updated and ready to send." : "Invoice updated successfully.");
    } else {
      savedInvoice = await createInvoiceWithNumberRetry(invoiceData);
      toast.success(requestedStatus === "sent" ? "Invoice created and ready to send." : "Invoice created successfully.");
    }

    // If user requested send, open email modal after successful save.
    if (requestedStatus === "sent") {
      navigate(`/sales/invoices/${savedInvoice.id}`, { state: { openEmailModal: true } });
    } else {
      navigate("/sales/invoices");
    }
  } catch (error) {
    console.error("Error saving and sending invoice:", error);

    // Handle specific error messages
    if (error instanceof Error) {
      if (error.message.includes("insufficient stock")) {
        toast.error("Cannot create invoice: One or more items have insufficient stock. Please check inventory levels before creating the invoice.");
      } else if (error.message.toLowerCase().includes("already exists") || error.message.toLowerCase().includes("duplicate")) {
        toast.error("Cannot create invoice: Invoice number already exists. Please use a different invoice number.");
      } else if (error.message.includes("customer")) {
        toast.error("Cannot create invoice: Invalid customer selected. Please select a valid customer.");
      } else {
        toast.error(`Failed to save invoice: ${error.message}`);
      }
    } else {
      toast.error("Failed to save invoice. Please try again.");
    }
  } finally {
    setSaveLoading(null);
  }
};

const handleSave = (status: string) => {
  handleSaveAndSend(status);
};

const handleSaveAndPrint = () => {
  handleSaveAndSend("sent");
  // Open print dialog after a short delay
  setTimeout(() => {
    window.print();
  }, 500);
};

const handleCancel = () => {
  navigate("/sales/invoices");
};

return (
  <>
    <div className="w-full h-screen flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white z-10">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-normal text-gray-900 m-0 flex items-center gap-3">
            <FileText size={20} className="text-gray-500" />
            {isEditMode ? "Edit Invoice" : "New Invoice"}
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative" ref={settingsDropdownRef}>
              <button
                className="p-2 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
              >
                <Settings size={18} />
              </button>
              {isSettingsDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded shadow-lg border border-gray-200 z-50 min-w-[200px] overflow-hidden">
                  <div className="p-1">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      onClick={() => {
                        setIsSettingsDropdownOpen(false);
                        setIsPreferencesOpen(true);
                        setActivePreferencesTab("preferences");
                      }}
                    >
                      Preferences
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      onClick={() => {
                        setIsSettingsDropdownOpen(false);
                        navigate("/settings/invoices");
                      }}
                    >
                      Manage Custom Fields
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded text-red-500 hover:text-red-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white pb-24">
        <div className="w-full px-6 py-6 space-y-6">
          {/* Scan Mode Interface */}
          {isScanModeOpen && (
            <div className="bg-gray-50 bg-opacity-50 mb-6 p-6 rounded-xl" style={{
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ScanLine size={20} className="text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">Item Details</h2>
                </div>
                <button
                  onClick={() => {
                    setIsScanModeOpen(false);
                    setScanInput("");
                  }}
                  className="flex items-center gap-2 text-gray-600  transition-colors"
                >
                  <span className="text-sm font-medium">Close Scan</span>
                  <X size={18} className="text-red-500" />
                </button>
              </div>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && scanInput.trim()) {
                    // Handle scan - search for item by SKU or name
                    const foundItem = availableItems.find(item =>
                      item.sku.toLowerCase() === scanInput.toLowerCase() ||
                      item.name.toLowerCase().includes(scanInput.toLowerCase())
                    );
                    if (foundItem) {
                      // Add item to form and recalculate totals
                      setFormData(prev => {
                        const newItem = {
                          id: Date.now(),
                          itemDetails: foundItem.name,
                          quantity: 1,
                          rate: foundItem.rate,
                          tax: "",
                          amount: foundItem.rate
                        };
                        const updatedItems = [...prev.items, newItem];

                        const subTotal = updatedItems.reduce((sum, item) => {
                          const quantity = item.quantity || 0;
                          const rate = item.rate || 0;
                          return sum + (quantity * rate);
                        }, 0);
                        const netItemsTotal = updatedItems.reduce((sum, item) => {
                          return sum + (Number(item.amount || 0));
                        }, 0);

                        const discountAmount = showTransactionDiscount
                          ? (prev.discountType === "percent"
                            ? (subTotal * (prev.discount || 0) / 100)
                            : (prev.discount || 0))
                          : 0;
                        const shipping = showShippingCharges ? (prev.shippingCharges || 0) : 0;
                        const adjustment = showAdjustment ? (prev.adjustment || 0) : 0;
                        const totalBeforeRound = netItemsTotal - discountAmount + shipping + adjustment;
                        const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
                        const total = totalBeforeRound + roundOff;

                        return {
                          ...prev,
                          items: updatedItems,
                          subTotal,
                          roundOff,
                          total
                        };
                      });
                      setScanInput("");
                    } else {
                      alert("Item not found. Please check the SKU or item name.");
                    }
                  }
                }}
                placeholder="Scan the item SKU, etc.,"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-6">
            {/* Row 1: Customer Name */}
            {/* Customer Selection Row */}
            <div className="flex items-center gap-6">
              <label className="text-[13px] font-medium text-red-500 w-[140px] flex-shrink-0">
                Customer Name*
              </label>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex w-[540px] max-w-full min-w-[320px]" ref={customerDropdownRef}>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="w-full h-9 px-3 border border-gray-300 rounded-l focus:outline-none focus:border-[#3f83fb] text-sm bg-white"
                      placeholder="Select or add a customer"
                      value={formData.customerName}
                      readOnly
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                    />
                    <ChevronDown
                      size={14}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                  <button
                    type="button"
                    className="h-9 w-10 bg-[#156372] text-white rounded-r hover:bg-[#0D4A52] flex items-center justify-center transition-colors border border-[#156372]"
                    onClick={() => setCustomerSearchModalOpen(true)}
                  >
                    <Search size={16} />
                  </button>

                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-hidden">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="flex-1 text-sm outline-none px-1 py-1"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCustomers.map((customer, idx) => (
                          <div
                            key={customer.id || customer._id || `cust-${idx}`}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="text-sm text-gray-700">{customer.name || customer.displayName}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="w-full p-2 border-t border-gray-100 text-xs text-[#156372] hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
                        onClick={openCustomerQuickAction}
                      >
                        <Plus size={14} />
                        New Customer
                      </button>
                    </div>
                  )}
                </div>
                {customerDetails && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const customerId = customerDetails._id || customerDetails.id;
                      navigate(`/sales/customers/${customerId}`);
                    }}
                    className="h-9 whitespace-nowrap flex items-center gap-2 px-4 text-white rounded-md transition-colors text-sm font-medium"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {customerDetails.name || customerDetails.displayName || customerDetails.companyName || "Customer"}'s Details
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>


            <div className="flex items-center gap-6">
              <label className="text-[13px] font-medium text-gray-600 w-[140px] flex-shrink-0">
                Location
              </label>
              <div className="relative w-[280px]">
                <select
                  value={(formData as any).selectedLocation || "Head Office"}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, selectedLocation: e.target.value }))}
                  className="w-full h-9 px-3 pr-8 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm appearance-none bg-white"
                >
                  {locationOptions.map((option, index) => (
                    <option key={`location-top-${index}-${option}`} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Invoice Number & Order Number */}
            <div className="flex items-center gap-6">
              <label className="text-[13px] font-medium text-red-500 w-[140px] flex-shrink-0">
                Invoice#*
              </label>
              <div className="relative w-[280px]">
                <input
                  type="text"
                  className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none bg-white text-sm pr-9"
                  value={formData.invoiceNumber}
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => setIsInvoiceNumberModalOpen(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-[#156372] transition-colors"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="text-[13px] font-medium text-gray-600 w-[140px] flex-shrink-0">
                Order Number
              </label>
              <input
                type="text"
                name="orderNumber"
                className="w-[280px] h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm"
                value={formData.orderNumber}
                onChange={handleChange}
              />
            </div>

            {/* Document Date, Terms, Due Date */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 flex-grow max-w-[420px]">
                <label className="text-[13px] font-medium text-red-500 w-[140px] flex-shrink-0">
                  Invoice Date*
                </label>
                <div className="relative flex-1" ref={invoiceDatePickerRef}>
                  <input
                    type="text"
                    className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm cursor-pointer"
                    value={formData.invoiceDate}
                    readOnly
                    placeholder="26 Jan 2026"
                    onClick={() => setIsInvoiceDatePickerOpen(!isInvoiceDatePickerOpen)}
                  />
                  {isInvoiceDatePickerOpen && (
                    <div className="absolute top-full left-0 z-50 mt-2 w-[286px] rounded-md border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="mb-3 flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateMonth("prev", "invoiceDate");
                          }}
                          className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[15px] font-medium text-slate-700">
                          {invoiceDateCalendar.toLocaleString("default", { month: "long", year: "numeric" })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateMonth("next", "invoiceDate");
                          }}
                          className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="mb-2 grid grid-cols-7 text-center">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                          <div key={day} className="py-1 text-[11px] font-medium text-[#d14b4b]">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-y-1 text-center">
                        {getDaysInMonth(invoiceDateCalendar).map((day, i) => {
                            const isSelected = formData.invoiceDate === formatDate(day.fullDate);
                            const isCurrentMonth = day.month === "current";
                            const isToday = formatDate(new Date()) === formatDate(day.fullDate);
                            return (
                              <button
                                key={`${day.fullDate.toISOString()}-${i}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDateSelect(day.fullDate, "invoiceDate");
                                }}
                                className={`mx-auto flex h-8 w-8 items-center justify-center text-[13px] transition ${
                                  isSelected
                                    ? "bg-[#cf3b24] text-white"
                                    : isCurrentMonth
                                      ? "text-slate-600 hover:bg-slate-100"
                                      : "text-slate-300 hover:bg-slate-50"
                                } ${isToday && !isSelected ? "rounded border border-slate-300" : "rounded"}`}
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

              <div className="flex items-center gap-4 flex-1">
                <label className="text-[13px] font-medium text-gray-600 whitespace-nowrap">
                  Terms
                </label>
                <div className="w-[220px]" ref={paymentTermsDropdownRef}>
                  <PaymentTermsDropdown
                    value={selectedPaymentTerm}
                    onChange={(value) => applyPaymentTerm(value)}
                    customTerms={paymentTerms}
                    onConfigureTerms={() => setIsConfigureTermsOpen(true)}
                  />
                </div>

                <label className="text-[13px] font-medium text-gray-600 whitespace-nowrap ml-4">
                  Due Date
                </label>
                <div className="relative" ref={dueDatePickerRef}>
                  <input
                    type="text"
                    className="w-[140px] h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm border-dashed text-gray-600 cursor-pointer"
                    value={formData.dueDate}
                    readOnly
                    placeholder="26 Jan 2026"
                    onClick={() => setIsDueDatePickerOpen(!isDueDatePickerOpen)}
                  />
                  {isDueDatePickerOpen && (
                    <div className="absolute top-full right-0 z-50 mt-2 w-[286px] rounded-md border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="mb-3 flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigateMonth("prev", "dueDate"); }}
                          className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <div className="text-[15px] font-medium text-slate-700">
                          {dueDateCalendar.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigateMonth("next", "dueDate"); }}
                          className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="mb-2 grid grid-cols-7 text-center">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                          <div key={day} className="py-1 text-[11px] font-medium text-[#d14b4b]">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-y-1 text-center">
                        {getDaysInMonth(dueDateCalendar).map((day, i) => (
                          <button
                            key={`${day.fullDate.toISOString()}-${i}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateSelect(day.fullDate, 'dueDate');
                            }}
                            className={`
                                mx-auto flex h-8 w-8 items-center justify-center rounded text-[13px] transition
                                ${day.month !== 'current' ? 'text-slate-300 hover:bg-slate-50' : 'text-slate-600 hover:bg-slate-100'}
                                ${formData.dueDate === formatDate(day.fullDate) ? 'bg-[#cf3b24] text-white hover:bg-[#cf3b24] hover:text-white' : ''}
                                ${formatDate(new Date()) === formatDate(day.fullDate) && formData.dueDate !== formatDate(day.fullDate) ? 'border border-slate-300' : ''}
                              `}
                          >
                            {day.date}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>



            {isCustomPaymentTerm && (
              <div className="flex items-start gap-6">
                <div className="flex items-center gap-2 w-[140px] pt-2">
                  <label className="text-[13px] font-medium text-gray-600">
                    Early Payment Discount
                  </label>
                  <Info size={12} className="text-gray-300 cursor-help" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
                    <input
                      type="number"
                      min="0"
                      className="w-20 h-9 px-2 text-sm outline-none"
                      value={(formData as any).customDiscountDays || ""}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, customDiscountDays: e.target.value }))}
                    />
                    <div className="h-9 px-3 border-l border-gray-300 flex items-center text-sm text-gray-500 bg-gray-50">Days</div>
                  </div>
                  <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
                    <input
                      type="number"
                      min="0"
                      name="discount"
                      className="w-20 h-9 px-2 text-right text-sm outline-none"
                      value={formData.discount}
                      onChange={handleChange}
                    />
                    <div className="h-9 px-3 border-l border-gray-300 flex items-center text-sm text-gray-500 bg-gray-50">%</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6">
              <label className="text-[13px] font-medium text-gray-600 w-[140px] flex-shrink-0">
                Salesperson
              </label>
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
                        filteredSalespersons.map((salesperson) => (
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
                        setIsManageSalespersonsOpen(true);
                        setIsSalespersonDropdownOpen(false);
                      }}
                    >
                      <Plus size={16} />
                      <span>Manage Salespersons</span>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {normalizedReportingTags.map((tag) => {
              const currentValue =
                ((formData as any).reportingTags || []).find(
                  (entry: any) => String(entry?.tagId || "") === String(tag.id || tag._id || tag.key)
                    || String(entry?.name || "") === tag.label
                )?.value || "";

              return (
                <div key={tag.key} className="flex items-center gap-6">
                  <label className="text-[13px] font-medium text-gray-600 w-[140px] flex-shrink-0">
                    {tag.label}
                  </label>
                  <div className="relative w-[280px]">
                    <select
                      value={currentValue}
                      onChange={(e) =>
                        setFormData((prev: any) => {
                          const nextReportingTags = Array.isArray(prev.reportingTags)
                            ? prev.reportingTags.filter(
                                (entry: any) =>
                                  String(entry?.tagId || "") !== String(tag.id || tag._id || tag.key)
                                  && String(entry?.name || "") !== tag.label
                              )
                            : [];

                          if (e.target.value) {
                            nextReportingTags.push({
                              tagId: tag.id || tag._id || tag.key,
                              value: e.target.value,
                              name: tag.label,
                            });
                          }

                          return {
                            ...prev,
                            reportingTags: nextReportingTags,
                          };
                        })
                      }
                      className="w-full h-9 px-3 pr-8 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm appearance-none bg-white"
                    >
                      <option value="">None</option>
                      {tag.options.map((option: string, index: number) => (
                        <option key={`${tag.key}-option-${index}-${option}`} value={option}>{option}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              );
            })}

            <div className="flex items-start gap-6">
              <div className="flex items-center gap-2 w-[140px] pt-2">
                <label className="text-[13px] font-medium text-gray-600">
                  Subject
                </label>
                <Info size={12} className="text-gray-300 cursor-help" />
              </div>
              <textarea
                name="subject"
                className="flex-1 h-14 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm resize-none"
                  placeholder="Let your customer know what this Invoice is for"
                value={formData.subject}
                onChange={handleChange}
              />
            </div>

          </div>

          {/* Item Table Section */}
          <div className="border-t border-gray-200 pt-8">
            <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-gray-200 pb-5">
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <span>Warehouse Location</span>
                <div className="relative">
                  <select
                    value={(formData as any).selectedLocation || "Head Office"}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, selectedLocation: e.target.value }))}
                    className="h-9 min-w-[148px] appearance-none border-b border-dashed border-slate-300 bg-transparent pr-6 text-[13px] font-medium text-slate-700 outline-none"
                  >
                    {locationOptions.map((option, index) => (
                      <option key={`location-table-${index}-${option}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="relative">
                <select
                  name="taxExclusive"
                  value={formData.taxExclusive}
                  onChange={handleChange}
                  className="h-9 min-w-[152px] appearance-none rounded-md border border-transparent bg-white px-9 pr-8 text-[13px] text-slate-600 shadow-sm outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-300"
                >
                  {taxExclusiveOptions.map((option, index) => (
                    <option key={`tax-exclusive-${index}-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ClipboardList size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative" ref={priceListDropdownRef}>
                <button
                  type="button"
                  className="flex h-9 min-w-[160px] items-center justify-between rounded-md border border-transparent bg-white px-3 text-[13px] text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-700"
                  onClick={() => {
                    loadCatalogPriceLists();
                    setIsPriceListDropdownOpen((prev) => !prev);
                    setPriceListSearch("");
                  }}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList size={13} className="text-slate-400" />
                    {selectedPriceListDisplay}
                  </span>
                  {isPriceListDropdownOpen ? (
                    <ChevronUp size={13} className="text-[#2563eb]" />
                  ) : (
                    <ChevronDown size={13} className="text-slate-400" />
                  )}
                </button>

                {isPriceListDropdownOpen && (
                  <div className="absolute left-0 top-full z-[90] mt-2 w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={priceListSearch}
                          onChange={(e) => setPriceListSearch(e.target.value)}
                          placeholder="Search"
                          className="h-9 w-full rounded-md border border-[#3b82f6] bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto py-1">
                      {filteredPriceListOptions.length > 0 ? (
                        filteredPriceListOptions.map((option) => {
                          const isSelected = ((formData as any).selectedPriceList || "") === option.name;
                          return (
                            <button
                              key={option.id || option.name}
                              type="button"
                              className={`mx-2 flex w-[calc(100%-16px)] items-center justify-between rounded-md px-3 py-2 text-left text-[13px] ${
                                isSelected
                                  ? "bg-[#4a89e8] text-white"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                              onClick={() => {
                                setFormData((prev: any) => ({ ...prev, selectedPriceList: option.name }));
                                setIsPriceListDropdownOpen(false);
                                setPriceListSearch("");
                              }}
                            >
                              <span className="truncate">{option.displayLabel}</span>
                              {isSelected ? <Check size={14} /> : null}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-[13px] text-slate-500">No price lists found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-[14px] font-semibold text-slate-800">Item Table</h2>
                <div className="flex items-center gap-5">
                  <button
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#2563eb] hover:text-[#1d4ed8]"
                    onClick={() => setIsScanModeOpen(true)}
                  >
                    <ScanLine size={14} />
                    Scan Item
                  </button>
                  <div className="relative" ref={bulkActionsRef}>
                    <button
                      className="flex items-center gap-1.5 text-[12px] font-medium text-[#2563eb] hover:text-[#1d4ed8]"
                      onClick={() => setIsBulkActionsOpen((prev) => !prev)}
                    >
                      <CheckSquare size={14} />
                      Bulk Actions
                    </button>
                    {isBulkActionsOpen && (
                      <div className="absolute right-0 top-full z-[140] mt-2 min-w-[210px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
                        <button
                          type="button"
                          className="mx-1 mt-1 flex w-[calc(100%-8px)] items-center justify-between rounded-md bg-[#4a89e8] px-3 py-2 text-left text-[13px] font-medium text-white"
                          onClick={() => {
                            setBulkSelectedItemIds(standardLineItems.map((item) => item.id));
                            setIsBulkUpdateLineItemsActive(true);
                            setActiveBulkUpdateAction("project");
                            setIsBulkActionsOpen(false);
                          }}
                        >
                          <span>Bulk Update Line Items</span>
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            const allVisible =
                              standardLineItems.length > 0 &&
                              standardLineItems.every((item) => itemsWithAdditionalInfo.has(item.id));
                            if (allVisible) {
                              setItemsWithAdditionalInfo(new Set());
                              setActiveAdditionalInfoMenu(null);
                              setAdditionalInfoSearch("");
                            } else {
                              setItemsWithAdditionalInfo(new Set(standardLineItems.map((item) => item.id)));
                            }
                            setIsBulkActionsOpen(false);
                          }}
                        >
                          {standardLineItems.length > 0 && standardLineItems.every((item) => itemsWithAdditionalInfo.has(item.id))
                            ? "Hide All Additional Information"
                            : "Show All Additional Information"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isBulkUpdateLineItemsActive && (
                <div className="mx-3 mt-3 mb-0 flex items-center justify-between rounded-md bg-[#dce8f6] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className={`rounded-md bg-[#1fb374] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#18a067] ${activeBulkUpdateAction === "project" ? "ring-2 ring-[#2f6fed] ring-offset-1" : ""}`}
                      onClick={() => {
                        setActiveBulkUpdateAction("project");
                        const ids = bulkSelectedItemIds.length > 0 ? bulkSelectedItemIds : standardLineItems.map((item) => item.id);
                        setBulkSelectedItemIds(ids);
                        const firstSelected = standardLineItems.find((item: any) => ids.includes(item.id));
                        setSelectedBulkProjectId(String((firstSelected as any)?.projectId || (firstSelected as any)?.project || ""));
                        setIsBulkUpdateProjectModalOpen(true);
                      }}
                    >
                      Update Project
                    </button>
                    <button
                      type="button"
                      className={`rounded-md bg-[#1fb374] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#18a067] ${activeBulkUpdateAction === "reporting" ? "ring-2 ring-[#2f6fed] ring-offset-1" : ""}`}
                      onClick={() => {
                        setActiveBulkUpdateAction("reporting");
                        const ids = bulkSelectedItemIds.length > 0 ? bulkSelectedItemIds : standardLineItems.map((item) => item.id);
                        setBulkSelectedItemIds(ids);
                        const firstSelected = standardLineItems.find((item: any) => ids.includes(item.id));
                        const firstTags = Array.isArray((firstSelected as any)?.reportingTags) ? (firstSelected as any).reportingTags : [];
                        const initialValues: Record<string, string> = {};
                        normalizedReportingTags.forEach((tag: any) => {
                          const existing = firstTags.find((entry: any) =>
                            String(entry?.tagId || "") === String(tag?.id || tag?._id || tag?.key || "") ||
                            String(entry?.name || "") === String(tag?.label || "")
                          );
                          initialValues[String(tag?.key || "")] = existing?.value ? String(existing.value) : "";
                        });
                        setBulkReportingTagValues(initialValues);
                        setIsBulkUpdateReportingTagsModalOpen(true);
                      }}
                    >
                      Update Reporting Tags
                    </button>
                    <button
                      type="button"
                      className={`rounded-md bg-[#1fb374] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#18a067] ${activeBulkUpdateAction === "account" ? "ring-2 ring-[#2f6fed] ring-offset-1" : ""}`}
                      onClick={() => {
                        setActiveBulkUpdateAction("account");
                        const ids = bulkSelectedItemIds.length > 0 ? bulkSelectedItemIds : standardLineItems.map((item) => item.id);
                        setBulkSelectedItemIds(ids);
                        setIsBulkUpdateAccountModalOpen(true);
                      }}
                    >
                      Update Account
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-[#3b82f6] hover:text-[#2563eb]"
                    onClick={() => {
                      setIsBulkUpdateLineItemsActive(false);
                      setBulkSelectedItemIds([]);
                      setActiveBulkUpdateAction("project");
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-white">
                    <th className="w-10"></th>
                    <th className="w-[300px] px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">ITEM DETAILS</th>
                    <th className="w-24 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">QUANTITY</th>
                    <th className="w-32 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                      <div className="flex items-center justify-end gap-1">
                        RATE <Grid3x3 size={12} className="text-slate-300" />
                      </div>
                    </th>
                    {showItemDiscount && (
                      <th className="w-24 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">DISCOUNT</th>
                    )}
                    <th className="w-28 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">TAX</th>
                    <th className="w-28 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">AMOUNT</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {standardLineItems.map((item, index) => (
                    <React.Fragment key={item.id || `item-${index}`}>
                      <tr className="group border-b border-slate-200">
                        <td className="pt-6 text-center align-top">
                          <MoreVertical size={14} className="inline-block cursor-move text-slate-300" />
                        </td>
                        <td className="w-[300px] max-w-[300px] px-3 py-4">
                          <div className="relative" ref={el => { itemDropdownRefs.current[item.id] = el; }}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100">
                                <ImageIcon size={16} className="text-slate-300" />
                              </div>
                              <input
                                type="text"
                                placeholder="Type or click to select an item."
                                className="w-full border-none bg-transparent py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                                value={item.itemDetails}
                                onClick={() => toggleItemDropdown(item.id)}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  handleItemChange(item.id, "itemDetails", value);
                                  setItemSearches((prev) => ({ ...prev, [String(item.id)]: value }));
                                  setOpenItemDropdowns((prev) => ({ ...prev, [String(item.id)]: true }));
                                }}
                              />
                            </div>
                            {openItemDropdowns[item.id] && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-[140] max-h-72 overflow-y-auto">
                                {getFilteredItemOptions(item.id).length === 0 ? (
                                  <div className="px-3 py-3 text-sm text-gray-500">No items found.</div>
                                ) : (
                                  getFilteredItemOptions(item.id).map((p, pidx) => {
                                    return (
                                      <button
                                        key={p.id || `prod-${pidx}`}
                                        type="button"
                                        onClick={() => handleItemSelect(item.id, p)}
                                        className="w-full px-3 py-2 text-left border-b border-gray-100 last:border-b-0 hover:bg-[#3b82f6] hover:text-white group/item transition-colors"
                                      >
                                        <div className="min-w-0">
                                          <div className="font-medium text-sm truncate">{p.name}</div>
                                          <div className="mt-1 text-xs text-gray-500 group-hover/item:text-blue-100">
                                            Code: {p.code || p.sku || "-"}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })
                                )}
                                <button
                                  type="button"
                                  className="w-full px-3 py-2.5 text-sm text-[#156372] hover:bg-blue-50 text-left border-t border-gray-100 font-medium flex items-center gap-2"
                                  onClick={() => { setIsNewItemModalOpen(true); setCurrentItemRowId(item.id); }}
                                >
                                  <Plus size={14} />
                                  Add New Item
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 align-top pt-4">
                          {(() => {
                            const qty = Number(item.quantity || 0);
                            const stock = Number(item.stockOnHand || 0);
                            const isOverStock = qty > stock;
                            return (
                              <input
                                type="number"
                                className={`h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-right text-sm outline-none transition hover:border-slate-200 focus:border-blue-300 ${isOverStock ? "text-slate-900 font-semibold" : "text-slate-700"}`}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              />
                            );
                          })()}
                        </td>
                        <td className="px-3 align-top pt-4">
                          <input
                            type="number"
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-right text-sm text-slate-700 outline-none transition hover:border-slate-200 focus:border-blue-300"
                            value={item.rate}
                            onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          />
                          <div className="border-t border-slate-100 pt-0.5 pr-2 text-right text-[11px] text-slate-300">0.00</div>
                        </td>
                        {showItemDiscount && (
                          <td className="px-3 align-top pt-4">
                            <div className="flex items-center justify-end overflow-hidden rounded-md border border-slate-200 bg-white">
                              <input
                                type="text"
                                className="h-9 w-12 border-none px-1 text-right text-sm outline-none"
                                value={item.discount || 0}
                                onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)}
                              />
                              <div className="flex h-9 items-center border-l border-slate-200 bg-slate-50">
                                <select
                                  className="h-full cursor-pointer appearance-none bg-transparent px-1 text-[11px] text-slate-600 outline-none"
                                  value={item.discountType || 'percent'}
                                  onChange={(e) => handleItemChange(item.id, 'discountType', e.target.value)}
                                >
                                  <option value="percent">%</option>
                                  <option value="amount">{currencySymbol}</option>
                                </select>
                                <ChevronDown size={8} className="-ml-1 mr-1 pointer-events-none text-slate-400" />
                              </div>
                            </div>
                            <div className="pt-0.5 pr-1 text-right text-[10px] text-slate-300">
                              {item.discountType === 'amount' ? Number(item.discount || 0).toFixed(2) : '0.00'}
                            </div>
                          </td>
                        )}
                        <td className="w-[120px] min-w-[120px] px-3 align-top pt-4">
                          <div className="relative" ref={(el) => { taxDropdownRefs.current[item.id] = el; }}>
                            <button
                              type="button"
                              className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 text-left text-sm transition hover:border-blue-300"
                              onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            >
                              <span className={`${item.tax ? "text-slate-700" : "text-slate-400"} truncate`}>
                                {item.tax ? (getTaxDisplayLabel(getTaxBySelection(item.tax)) || "Select a Tax") : "Select a Tax"}
                              </span>
                              <ChevronDown size={14} className="text-slate-400" />
                            </button>
                            {openTaxDropdowns[item.id] && (
                              <div className="absolute top-full left-0 mt-1 w-[220px] bg-white border border-gray-200 rounded-md shadow-xl z-[140]">
                                <div className="p-2 border-b border-gray-100">
                                  <div className="relative">
                                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search"
                                      value={taxSearches[item.id] || ""}
                                      onChange={(e) => setTaxSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      className="w-full h-8 pl-7 pr-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto py-1">
                                  <div className="px-3 pb-1 text-xs font-semibold text-gray-500">Taxes</div>
                                  {getFilteredTaxes(item.id).length > 0 ? (
                                    getFilteredTaxes(item.id).map((tax, taxIndex) => (
                                      <button
                                        key={String((tax as any).id || (tax as any)._id || `tax-${taxIndex}`)}
                                        type="button"
                                        onClick={() => handleTaxSelect(item.id, String((tax as any).id || (tax as any)._id))}
                                        className={`w-full px-3 py-1.5 text-sm text-left hover:bg-blue-50 ${String(item.tax || "") === String((tax as any).id || (tax as any)._id) ? "bg-blue-600 text-white hover:bg-blue-600" : "text-gray-700"}`}
                                      >
                                        {getTaxDisplayLabel(tax)}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                                  )}
                                </div>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 text-left flex items-center gap-2"
                                    onClick={() => {
                                      setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                      setNewTaxTargetItemId(item.id);
                                      setIsNewTaxQuickModalOpen(true);
                                    }}
                                  >
                                    <Plus size={13} />
                                    New Tax
                                  </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 pt-6 text-right align-top">
                          <span className="text-sm font-semibold text-slate-800">
                            {Number(item.amount || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="pt-6 text-center align-top opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </td>
                      </tr>
                      {newHeaderItemId === item.id && showNewHeaderInput && (
                        <tr>
                          <td colSpan={7} className="p-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Add New Header"
                                value={newHeaderText}
                                onChange={(e) => setNewHeaderText(e.target.value)}
                                className="flex-1 px-4 py-2 border border-blue-200 rounded text-sm focus:outline-none"
                                autoFocus
                              />
                              <button onClick={() => setShowNewHeaderInput(false)} className="text-red-500">
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {itemsWithAdditionalInfo.has(item.id) && (
                        <tr>
                          <td colSpan={showItemDiscount ? 8 : 7} className="bg-[#f4f5f7] px-3 py-2.5">
                            <div className="relative" ref={activeAdditionalInfoMenu?.itemId === item.id ? additionalInfoMenuRef : undefined}>
                              <div className="flex flex-wrap items-center text-[13px] text-slate-600">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 pr-4 hover:text-slate-800"
                                  onClick={() => {
                                    setActiveAdditionalInfoMenu(
                                      activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu?.type === "account"
                                        ? null
                                        : { itemId: item.id, type: "account" }
                                    );
                                    setAdditionalInfoSearch("");
                                  }}
                                >
                                  <CreditCard size={13} className="text-slate-500" />
                                  <span>{(item as any).account || "Select an account"}</span>
                                  <ChevronDown size={12} className="text-slate-400" />
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 border-l border-slate-300 px-4 hover:text-slate-800"
                                  onClick={() => {
                                    setActiveAdditionalInfoMenu(
                                      activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu?.type === "project"
                                        ? null
                                        : { itemId: item.id, type: "project" }
                                    );
                                    setAdditionalInfoSearch("");
                                  }}
                                >
                                  <Folder size={13} className="text-slate-500" />
                                  <span>{(item as any).projectName || "Select a project"}</span>
                                  <ChevronDown size={12} className="text-slate-400" />
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 border-l border-slate-300 pl-4 hover:text-slate-800"
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
                                    setIsItemReportingTagsModalOpen(true);
                                  }}
                                >
                                  <Tag size={13} className="text-emerald-500" />
                                  <span>
                                    Reporting Tags :{" "}
                                    {Array.isArray((item as any).reportingTags)
                                      ? (item as any).reportingTags.filter((entry: any) => String(entry?.value || "").trim()).length
                                      : 0}{" "}
                                    out of {Math.max(1, normalizedReportingTags.length)} selected.
                                  </span>
                                  <ChevronDown size={12} className="text-slate-400" />
                                </button>
                              </div>

                              {activeAdditionalInfoMenu?.itemId === item.id && (
                                <div className="absolute left-0 top-full z-[160] mt-2 w-[320px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
                                  <div className="p-3 border-b border-slate-100">
                                    <div className="relative">
                                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input
                                        type="text"
                                        value={additionalInfoSearch}
                                        onChange={(e) => setAdditionalInfoSearch(e.target.value)}
                                        placeholder="Search"
                                        className="h-9 w-full rounded-md border border-blue-300 pl-8 pr-2 text-sm outline-none focus:border-blue-400"
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[260px] overflow-y-auto">
                                    {activeAdditionalInfoMenu.type === "account" ? (
                                      (() => {
                                        const query = additionalInfoSearch.toLowerCase().trim();
                                        const filteredGroups = groupedAccountOptions
                                          .map((group) => ({
                                            ...group,
                                            options: group.options.filter((option) => option.toLowerCase().includes(query)),
                                          }))
                                          .filter((group) => group.options.length > 0);
                                        if (filteredGroups.length === 0) {
                                          return <div className="px-4 py-3 text-sm text-slate-500 uppercase">No results found</div>;
                                        }
                                        return filteredGroups.map((group) => (
                                          <div key={`account-group-${group.group}`}>
                                            <div className="px-4 py-2 text-xs font-semibold uppercase text-slate-700">{group.group}</div>
                                            {group.options.map((option) => (
                                              <button
                                                key={`account-option-${group.group}-${option}`}
                                                type="button"
                                                className={`mx-2 my-0.5 flex w-[calc(100%-16px)] items-center rounded-md px-3 py-2 text-left text-sm ${
                                                  (item as any).account === option
                                                    ? "bg-[#4a89e8] text-white"
                                                    : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                                onClick={() => {
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    items: prev.items.map((row) =>
                                                      row.id === item.id ? { ...row, account: option } : row
                                                    ),
                                                  }));
                                                  setActiveAdditionalInfoMenu(null);
                                                  setAdditionalInfoSearch("");
                                                }}
                                              >
                                                {option}
                                              </button>
                                            ))}
                                          </div>
                                        ));
                                      })()
                                    ) : (
                                      (() => {
                                        const query = additionalInfoSearch.toLowerCase().trim();
                                        const filteredProjects = availableProjects.filter((project: any) =>
                                          String(project?.name || "").toLowerCase().includes(query)
                                        );
                                        if (filteredProjects.length === 0) {
                                          return <div className="px-4 py-3 text-sm text-slate-500 uppercase">NO RESULTS FOUND</div>;
                                        }
                                        return filteredProjects.map((project: any) => (
                                          <button
                                            key={`project-option-${project.id}`}
                                            type="button"
                                            className={`mx-2 my-0.5 flex w-[calc(100%-16px)] items-center rounded-md px-3 py-2 text-left text-sm ${
                                              String((item as any).projectId || "") === String(project.id || "")
                                                ? "bg-[#4a89e8] text-white"
                                                : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                            onClick={() => {
                                              setFormData((prev) => ({
                                                ...prev,
                                                items: prev.items.map((row) =>
                                                  row.id === item.id
                                                    ? { ...row, projectId: project.id, project: project.id, projectName: project.name }
                                                    : row
                                                ),
                                              }));
                                              setActiveAdditionalInfoMenu(null);
                                              setAdditionalInfoSearch("");
                                            }}
                                          >
                                            {project.name}
                                          </button>
                                        ));
                                      })()
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="relative">
                <button
                  className="relative flex h-9 items-center rounded-md border border-[#d7deef] bg-[#eef3ff] pl-3 pr-8 text-[13px] font-medium text-[#1f3f79] transition hover:bg-[#e7eefb]"
                  onClick={() => handleAddItem()}
                >
                  <Plus size={14} className="mr-1 inline" /> Add New Row
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2" />
                </button>
              </div>
              <button
                className="flex h-9 items-center gap-1.5 rounded-md border border-[#d7deef] bg-[#eef3ff] px-4 text-[13px] font-medium text-[#1f3f79] transition hover:bg-[#e7eefb]"
                onClick={() => setIsBulkAddModalOpen(true)}
              >
                <Plus size={14} /> Add Items in Bulk
              </button>
            </div>
          </div>

          {projectLineItems.length > 0 && (
            <div className="mt-6 overflow-visible rounded-xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-[14px] font-semibold text-slate-800">Project Details</h2>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-white">
                    <th className="w-10"></th>
                    <th className="w-[300px] px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">ITEM DETAILS</th>
                    <th className="w-24 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">QUANTITY</th>
                    <th className="w-32 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                      <div className="flex items-center justify-end gap-1">
                        RATE <Grid3x3 size={12} className="text-slate-300" />
                      </div>
                    </th>
                    {showItemDiscount && (
                      <th className="w-24 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">DISCOUNT</th>
                    )}
                    <th className="w-28 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">TAX</th>
                    <th className="w-28 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">AMOUNT</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {projectLineItems.map((item, index) => (
                    <tr key={item.id || `project-item-${index}`} className="group border-b border-slate-200">
                      <td className="pt-6 text-center align-top">
                        <MoreVertical size={14} className="inline-block cursor-move text-slate-300" />
                      </td>
                      <td className="w-[300px] max-w-[300px] px-3 py-4">
                        <div className="relative flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100">
                            <ImageIcon size={16} className="text-slate-300" />
                          </div>
                          <input
                            type="text"
                            className="w-full border-none bg-transparent py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                            value={item.itemDetails || item.projectName || "Project"}
                            onChange={(e) => handleItemChange(item.id, "itemDetails", e.target.value)}
                          />
                          <button
                            type="button"
                            className="ml-auto text-slate-400 hover:text-slate-600"
                            onClick={() => {
                              setProjectEditTargetId(item.id);
                              setProjectEditValue(String(item.itemDetails || item.projectName || ""));
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          {projectEditTargetId === item.id && (
                            <div className="absolute right-0 top-full z-[150] mt-2 w-[260px] rounded-lg border border-slate-200 bg-white p-3 shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
                              <div className="text-[12px] font-semibold text-slate-700">Project Details</div>
                              <input
                                type="text"
                                className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                                value={projectEditValue}
                                onChange={(e) => setProjectEditValue(e.target.value)}
                              />
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-md bg-[#2563eb] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#1d4ed8]"
                                  onClick={() => {
                                    handleItemChange(item.id, "itemDetails", projectEditValue);
                                    handleItemChange(item.id, "projectName", projectEditValue);
                                    setProjectEditTargetId(null);
                                  }}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                                  onClick={() => setProjectEditTargetId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <textarea
                          id={`project-desc-${item.id}`}
                          placeholder="Add a description to your item"
                          className="mt-2 h-16 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-[12px] text-slate-600 outline-none focus:border-blue-300"
                          value={item.description || ""}
                          onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                        />
                      </td>
                      <td className="px-3 align-top pt-4">
                        <input
                          type="number"
                          className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-right text-sm text-slate-700 outline-none transition hover:border-slate-200 focus:border-blue-300"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="px-3 align-top pt-4">
                        <input
                          type="number"
                          className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-right text-sm text-slate-700 outline-none transition hover:border-slate-200 focus:border-blue-300"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                        />
                        <div className="border-t border-slate-100 pt-0.5 pr-2 text-right text-[11px] text-slate-300">0.00</div>
                      </td>
                      {showItemDiscount && (
                        <td className="px-3 align-top pt-4">
                          <div className="flex items-center justify-end overflow-hidden rounded-md border border-slate-200 bg-white">
                            <input
                              type="text"
                              className="h-9 w-12 border-none px-1 text-right text-sm outline-none"
                              value={item.discount || 0}
                              onChange={(e) => handleItemChange(item.id, "discount", e.target.value)}
                            />
                            <div className="flex h-9 items-center border-l border-slate-200 bg-slate-50">
                              <select
                                className="h-full cursor-pointer appearance-none bg-transparent px-1 text-[11px] text-slate-600 outline-none"
                                value={item.discountType || "percent"}
                                onChange={(e) => handleItemChange(item.id, "discountType", e.target.value)}
                              >
                                <option value="percent">%</option>
                                <option value="amount">{currencySymbol}</option>
                              </select>
                              <ChevronDown size={8} className="-ml-1 mr-1 pointer-events-none text-slate-400" />
                            </div>
                          </div>
                          <div className="pt-0.5 pr-1 text-right text-[10px] text-slate-300">
                            {item.discountType === "amount" ? Number(item.discount || 0).toFixed(2) : "0.00"}
                          </div>
                        </td>
                      )}
                      <td className="w-[120px] min-w-[120px] px-3 align-top pt-4">
                        <div className="relative" ref={(el) => { taxDropdownRefs.current[item.id] = el; }}>
                          <button
                            type="button"
                            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 text-left text-sm transition hover:border-blue-300"
                            onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                          >
                            <span className={`${item.tax ? "text-slate-700" : "text-slate-400"} truncate`}>
                              {item.tax ? (getTaxDisplayLabel(getTaxBySelection(item.tax)) || "Select a Tax") : "Select a Tax"}
                            </span>
                            <ChevronDown size={14} className="text-slate-400" />
                          </button>
                          {openTaxDropdowns[item.id] && (
                            <div className="absolute top-full left-0 mt-1 w-[220px] bg-white border border-gray-200 rounded-md shadow-xl z-[140]">
                              <div className="p-2 border-b border-gray-100">
                                <div className="relative">
                                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="text"
                                    placeholder="Search"
                                    value={taxSearches[item.id] || ""}
                                    onChange={(e) => setTaxSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    className="w-full h-8 pl-7 pr-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto py-1">
                                <div className="px-3 pb-1 text-xs font-semibold text-gray-500">Taxes</div>
                                {getFilteredTaxes(item.id).length > 0 ? (
                                  getFilteredTaxes(item.id).map((tax, taxIndex) => (
                                    <button
                                      key={String((tax as any).id || (tax as any)._id || `tax-${taxIndex}`)}
                                      type="button"
                                      onClick={() => handleTaxSelect(item.id, String((tax as any).id || (tax as any)._id))}
                                      className={`w-full px-3 py-1.5 text-sm text-left hover:bg-blue-50 ${String(item.tax || "") === String((tax as any).id || (tax as any)._id) ? "bg-blue-600 text-white hover:bg-blue-600" : "text-gray-700"}`}
                                    >
                                      {getTaxDisplayLabel(tax)}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 text-left flex items-center gap-2"
                                onClick={() => {
                                  setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                  setNewTaxTargetItemId(item.id);
                                  setIsNewTaxQuickModalOpen(true);
                                }}
                              >
                                <Plus size={13} />
                                New Tax
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 pt-6 text-right align-top">
                        <span className="text-sm font-semibold text-slate-800">
                          {Number(item.amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="pt-6 text-center align-top opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}


          {/* Bottom Form Layout: Notes & Summary */}
          <div className="grid grid-cols-1 gap-8 border-t border-slate-200 pt-8 lg:grid-cols-[1fr_420px]">

            {/* Left Column: Notes & Terms */}
            <div className="space-y-8">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">Customer Notes</label>
                <textarea
                  name="customerNotes"
                  className="h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-blue-300"
                  value={formData.customerNotes}
                  onChange={handleChange}
                />
                <p className="mt-2 text-[11px] text-slate-400">Will be displayed on the invoice</p>
              </div>
            </div>

            {/* Right Column: Detailed Summary */}
            <div className="w-full space-y-4">
              <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">Sub Total</span>
                  <span className="font-semibold text-slate-900">{Number(formData.subTotal || 0).toFixed(2)}</span>
                </div>

                {showTransactionDiscount && (
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-slate-600">Discount</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center">
                          <input
                            type="number"
                            name="discount"
                            className="h-8 w-16 rounded-l border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-blue-300"
                            value={formData.discount}
                            onChange={handleChange}
                          />
                          <select
                            name="discountType"
                            value={formData.discountType || 'percent'}
                            onChange={handleChange}
                            className="h-8 rounded-r border border-l-0 border-slate-300 bg-slate-50 px-2 text-xs outline-none"
                          >
                            <option value="percent">%</option>
                            <option value="amount">{formData.currency || 'USD'}</option>
                          </select>
                        </div>
                        <span className="min-w-[60px] text-right font-semibold text-slate-800">
                          {Number(liveTotals.discountAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {Number(liveTotals.discountAmount || 0) > 0 && (
                      <div className="mt-1 text-right text-[11px] text-slate-500">
                        (Applied on {Number(liveTotals.discountBase || 0).toFixed(2)})
                      </div>
                    )}
                  </div>
                )}

                {showShippingCharges && (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-slate-600">Shipping Charges</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="shippingCharges"
                          className="h-8 w-20 rounded border border-slate-300 bg-white px-2 text-right text-sm"
                          value={formData.shippingCharges}
                          onChange={handleChange}
                        />
                        <Info size={14} className="text-slate-300" />
                        <span className="min-w-[60px] text-right font-semibold text-slate-800">{Number(formData.shippingCharges || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-slate-600">Shipping Charge Tax</span>
                      <div className="relative min-w-[220px]" ref={shippingTaxDropdownRef}>
                        <button
                          type="button"
                          className="flex h-8 w-full items-center justify-between rounded border border-slate-200 bg-white px-2 text-left text-sm transition hover:border-blue-300"
                          onClick={() => setIsShippingTaxDropdownOpen((prev) => !prev)}
                        >
                          <span className={`${formData.shippingChargeTax ? "text-slate-700" : "text-slate-400"} truncate`}>
                            {formData.shippingChargeTax ? (getTaxDisplayLabel(getTaxBySelection(formData.shippingChargeTax)) || "Select a Tax") : "Select a Tax"}
                          </span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </button>
                        {isShippingTaxDropdownOpen && (
                          <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-xl z-50">
                            <div className="p-2 border-b border-gray-100">
                              <div className="relative">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search"
                                  value={shippingTaxSearch}
                                  onChange={(e) => setShippingTaxSearch(e.target.value)}
                                  className="w-full h-8 pl-7 pr-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto py-1">
                              {taxOptions
                                .filter((tax) => getTaxDisplayLabel(tax).toLowerCase().includes(shippingTaxSearch.toLowerCase()))
                                .map((tax, taxIndex) => {
                                  const taxId = String((tax as any).id || (tax as any)._id || `shipping-tax-${taxIndex}`);
                                  return (
                                    <button
                                      key={taxId}
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev) => {
                                          const nextState = { ...prev, shippingChargeTax: taxId } as InvoiceFormState;
                                          const totals = calculateInvoiceTotalsFromData(nextState);
                                          return {
                                            ...nextState,
                                            subTotal: totals.subTotal,
                                            roundOff: totals.roundOff,
                                            total: totals.total
                                          };
                                        });
                                        setIsShippingTaxDropdownOpen(false);
                                        setShippingTaxSearch("");
                                      }}
                                      className={`w-full px-3 py-1.5 text-sm text-left hover:bg-blue-50 ${String(formData.shippingChargeTax || "") === taxId ? "bg-blue-600 text-white hover:bg-blue-600" : "text-gray-700"}`}
                                    >
                                      {getTaxDisplayLabel(tax)}
                                    </button>
                                  );
                                })}
                              {taxOptions.filter((tax) => getTaxDisplayLabel(tax).toLowerCase().includes(shippingTaxSearch.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-100 text-left"
                              onClick={() => {
                                setFormData((prev) => {
                                  const nextState = { ...prev, shippingChargeTax: "" } as InvoiceFormState;
                                  const totals = calculateInvoiceTotalsFromData(nextState);
                                  return {
                                    ...nextState,
                                    subTotal: totals.subTotal,
                                    roundOff: totals.roundOff,
                                    total: totals.total
                                  };
                                });
                                setIsShippingTaxDropdownOpen(false);
                                setShippingTaxSearch("");
                              }}
                            >
                              Clear Selection
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Taxes Breakdown */}
                {Object.keys(taxSummary).length > 0 && (
                  <div className="mt-2 space-y-2 border-t border-slate-200 py-2">
                    {Object.entries(taxSummary).map(([taxName, taxAmount]) => (
                      <div key={taxName} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{taxName}</span>
                        <span className="font-semibold text-slate-800">{taxAmount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {showAdjustment && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] text-slate-600">Adjustment</span>
                      <ChevronDown size={14} className="text-slate-300" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="adjustment"
                        className="h-8 w-20 rounded border border-slate-300 bg-white px-2 text-right text-sm"
                        value={formData.adjustment}
                        onChange={handleChange}
                      />
                      <Info size={14} className="text-slate-300" />
                      <span className="min-w-[60px] text-right font-semibold text-slate-800">{Number(formData.adjustment || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}



                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-[28px] font-semibold leading-none text-slate-900">Total ({formData.currency || currencySymbol})</span>
                  <span className="text-[28px] font-bold leading-none text-slate-900">{Number(formData.total || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between text-[16px] font-medium text-slate-700">
                  <span>Early Payment Discount</span>
                  <span>{Number(0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[22px] font-semibold text-slate-900 leading-tight">
                  <span className="text-[16px]">Total After Early Payment Discount</span>
                  <span>{Number(formData.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-8 rounded-xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[1fr_320px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Terms & Conditions</label>
              <textarea
                name="termsAndConditions"
                className="h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-blue-300"
                placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                value={formData.termsAndConditions}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Attach File(s) to Invoice</label>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-[#1f3f79] transition hover:bg-slate-50"
                onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
              >
                <Upload size={15} className="text-slate-500" />
                Upload File
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <p className="mt-2 text-xs text-slate-500">You can upload a maximum of 10 files, 10MB each</p>
              {formData.attachedFiles.length > 0 && (
                <p className="mt-1 text-xs font-medium text-[#2563eb]">{formData.attachedFiles.length} file(s) attached</p>
              )}
            </div>
          </div>

          {/* Payment Fields - Show when checkbox is checked */}
          {isPaymentReceived && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4 space-y-4">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Details</h3>

              {/* Payment Mode */}
              <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Payment Mode
                </label>
                <div className="max-w-[400px] relative" ref={paymentModeDropdownRef}>
                  <div
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] bg-white cursor-pointer flex items-center justify-between min-h-[36px]"
                    onClick={() => setIsPaymentModeDropdownOpen(!isPaymentModeDropdownOpen)}
                  >
                    <span className={paymentData.paymentMode ? "text-gray-900" : "text-gray-400"}>
                      {paymentData.paymentMode || "Select Payment Mode"}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isPaymentModeDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isPaymentModeDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                      {paymentModeOptions.map((mode, idx) => (
                        <div
                          key={mode || idx}
                          className="px-4 py-2  cursor-pointer text-sm"
                          onClick={() => {
                            setPaymentData(p => ({ ...p, paymentMode: mode }));
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

              {/* Deposit To */}
              <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                <label className="text-sm font-medium text-red-500">
                  Deposit To*
                </label>
                <div className="max-w-[400px] relative" ref={depositToDropdownRef}>
                  <div
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] bg-white cursor-pointer flex items-center justify-between min-h-[36px]"
                    onClick={() => setIsDepositToDropdownOpen(!isDepositToDropdownOpen)}
                  >
                    <span className={paymentData.depositTo ? "text-gray-900" : "text-gray-400"}>
                      {paymentData.depositTo || "Select Deposit Account"}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isDepositToDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isDepositToDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                      {depositToOptions.map((account, idx) => (
                        <div
                          key={account || idx}
                          className="px-4 py-2  cursor-pointer text-sm"
                          onClick={() => {
                            setPaymentData(p => ({ ...p, depositTo: account }));
                            setIsDepositToDropdownOpen(false);
                          }}
                        >
                          {account}
                        </div>
                      ))}
                      {bankAccounts.length === 0 && (
                        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                          No bank accounts found. Add accounts in Banking section.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Received */}
              <div className="grid grid-cols-[150px_1fr] gap-4 items-start">
                <label className="text-sm font-medium text-red-500 pt-2">
                  Amount Received*
                </label>
                <div className="max-w-[400px]">
                  <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-[#156372] focus-within:ring-2 focus-within:ring-[rgba(21,99,114,0.1)]">
                    <div className="bg-gray-50 border-r border-gray-300 px-3 py-1.5 text-sm text-gray-600 flex items-center">
                      {currencySymbol}
                    </div>
                    <input
                      type="number"
                      className="flex-1 px-3 py-1.5 text-sm outline-none"
                      value={paymentData.amountReceived}
                      onChange={(e) => setPaymentData(p => ({ ...p, amountReceived: e.target.value }))}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Reference Number */}
              <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Reference#
                </label>
                <div className="max-w-[400px]">
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)]"
                    value={paymentData.referenceNumber}
                    onChange={(e) => setPaymentData(p => ({ ...p, referenceNumber: e.target.value }))}
                    placeholder="Payment reference number"
                  />
                </div>
              </div>

              {/* Tax deducted? */}
              <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Tax deducted?
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="taxDeductedDetails"
                      value="no"
                      checked={paymentData.taxDeducted === "no"}
                      onChange={(e) => setPaymentData(p => ({ ...p, taxDeducted: e.target.value }))}
                      className="w-4 h-4 border-gray-300 focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] accent-[#156372]"
                    />
                    <span className="text-sm text-gray-700">No Tax deducted</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="taxDeductedDetails"
                      value="yes"
                      checked={paymentData.taxDeducted === "yes"}
                      onChange={(e) => setPaymentData(p => ({ ...p, taxDeducted: e.target.value }))}
                      className="w-4 h-4 border-gray-300 focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] accent-[#156372]"
                    />
                    <span className="text-sm text-gray-700">Yes, TDS</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Email Communications */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Email Communications</h3>
              {selectedContactPersons.length > 0 && (
                <button
                  onClick={() => setSelectedContactPersons([])}
                  className="flex items-center gap-1 text-sm text-gray-700 hover:text-red-600 transition-colors"
                >
                  <X size={14} className="text-red-600" />
                  <span>Clear Selection</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  // Set modal customer ID if a customer is already selected
                  if (selectedCustomer && (selectedCustomer.id || selectedCustomer._id)) {
                    setModalSelectedCustomerId(selectedCustomer.id || selectedCustomer._id || null);
                  } else {
                    setModalSelectedCustomerId(null);
                  }
                  setIsContactPersonModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:border-gray-400  transition-colors"
              >
                <Plus size={16} className="text-gray-600" />
                <span>Add New</span>
              </button>
              {selectedContactPersons.map((cp, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md border border-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    className="w-4 h-4 text-[#156372] border-gray-300 rounded"
                  />
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-600">
                      {cp.firstName?.[0] || cp.email?.[0] || 'U'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700">
                    {cp.firstName && cp.lastName
                      ? `${cp.firstName} ${cp.lastName}`
                      : cp.email || 'Contact Person'}
                    {cp.email && <span className="text-gray-500"> &lt;{cp.email}&gt;</span>}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedContactPersons(selectedContactPersons.filter((_, i) => i !== index));
                    }}
                    className="ml-1 text-gray-400 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Gateway Section - Bottom Left */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm text-gray-700 font-medium">Want to get paid faster?</span>
              <div className="flex gap-2 items-center">
                <div className="w-8 h-5 bg-red-600 rounded"></div>
                <div className="w-8 h-5 bg-[#1a1f71] rounded text-white flex items-center justify-center text-[10px] font-semibold">VISA</div>
                <div className="w-8 h-5 bg-[#1a1f71] rounded text-white flex items-center justify-center text-[10px] font-semibold">MC</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Configure payment gateways and receive payments online.
            </p>
            <button className="text-[#156372] hover:text-[#0D4A52] text-sm font-medium">
              Set up Payment Gateway
            </button>
          </div>

          {/* Additional Fields */}
          <div className="border-t border-gray-200 pt-6 mt-6 mb-24">
            <p className="text-sm text-gray-600">
              Additional Fields: Start adding custom fields for your invoices by going to Settings ➔ Sales ➔ Invoices.
            </p>
          </div>
        </div>



        {/* New Salesperson Modal */}
        {isNewSalespersonFormOpen && !isManageSalespersonsOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => {
            setIsNewSalespersonFormOpen(false);
            setEditingSalespersonId(null);
            setNewSalespersonData({ name: "", email: "" });
          }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{editingSalespersonId ? "Edit Salesperson" : "Add New Salesperson"}</h2>
                <button
                  onClick={() => {
                    setIsNewSalespersonFormOpen(false);
                    setEditingSalespersonId(null);
                    setNewSalespersonData({ name: "", email: "" });
                  }}
                  className="p-2  rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-1">
                      Name<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newSalespersonData.name}
                      onChange={handleNewSalespersonChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:bg-white"
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-1">
                      Email<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newSalespersonData.email}
                      onChange={handleNewSalespersonChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:bg-white"
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSaveAndSelectSalesperson}
                      className="px-4 py-2 bg-[#156372] text-white rounded-md hover:bg-[#0D4A52] transition-colors text-sm font-medium"
                    >
                      Add
                    </button>
                    <button
                      onClick={handleCancelNewSalesperson}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
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

        {/* Manage Salespersons Modal */}
        {isManageSalespersonsOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900">Manage Salespersons</h2>
                <button
                  onClick={() => setIsManageSalespersonsOpen(false)}
                  className="p-2  rounded-lg text-gray-400 "
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
                    className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md "
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
                              setSelectedSalespersonIds(filteredManageSalespersons.map(s => (s.id || s._id || "").toString()));
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
                      filteredManageSalespersons.map(salesperson => {
                        const salespersonId = (salesperson.id || salesperson._id || "").toString();
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
                              {salesperson.name}
                              {(salesperson as any).status === 'inactive' && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{salesperson.email || ""}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="hidden group-hover:flex items-center justify-end gap-2">
                                <button
                                  className="p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded"
                                  title="Edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSalesperson(salesperson);
                                  }}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
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
              </div>
            </div>

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
                        onClick={() => setManageSalespersonMenuOpen(null)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Mark as Active
                      </button>
                      <button
                        onClick={() => setManageSalespersonMenuOpen(null)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Mark as Inactive
                      </button>
                      <button
                        onClick={() => setManageSalespersonMenuOpen(null)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Mark as Inactive
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteSalesperson(manageSalespersonMenuOpen);
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
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
        )}

        {/* Add Contact Person Modal */}
        {isContactPersonModalOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={handleCancelContactPerson}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Add Contact Person</h2>
                <button
                  onClick={handleCancelContactPerson}
                  className="p-2  rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Customer Selection (if no customer selected) */}
              {(!selectedCustomer || !selectedCustomer.id) && (
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalSelectedCustomerId || ''}
                    onChange={(e) => setModalSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                  >
                    <option value="">-- Select a customer --</option>
                    {customers.map((customer) => {
                      const customerId = customer.id || customer._id;
                      const customerName = customer.name || customer.displayName || customer.companyName || '';
                      return (
                        <option key={customerId} value={customerId}>
                          {customerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Form Content */}
              <div className="p-6 grid grid-cols-2 gap-6">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  {/* Name Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        name="salutation"
                        value={newContactPersonData.salutation}
                        onChange={handleContactPersonChange}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      >
                        <option value="">Select</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                      </select>
                      <input
                        type="text"
                        name="firstName"
                        value={newContactPersonData.firstName}
                        onChange={handleContactPersonChange}
                        placeholder="First Name"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      />
                      <input
                        type="text"
                        name="lastName"
                        value={newContactPersonData.lastName}
                        onChange={handleContactPersonChange}
                        placeholder="Last Name"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={newContactPersonData.email}
                      onChange={handleContactPersonChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Phone Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none">
                          <option value="+252">+252 (Somalia)</option>
                          <option value="+254">+254 (Kenya)</option>
                          <option value="+1">+1 (USA/Canada)</option>
                          <option value="+44">+44 (UK)</option>
                          <option value="+971">+971 (UAE)</option>
                          <option value="+966">+966 (Saudi Arabia)</option>
                        </select>
                        <input
                          type="text"
                          name="workPhone"
                          value={newContactPersonData.workPhone}
                          onChange={handleContactPersonChange}
                          placeholder="Work Phone"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none">
                          <option value="+252">+252 (Somalia)</option>
                          <option value="+254">+254 (Kenya)</option>
                          <option value="+1">+1 (USA/Canada)</option>
                          <option value="+44">+44 (UK)</option>
                          <option value="+971">+971 (UAE)</option>
                          <option value="+966">+966 (Saudi Arabia)</option>
                        </select>
                        <input
                          type="text"
                          name="mobile"
                          value={newContactPersonData.mobile}
                          onChange={handleContactPersonChange}
                          placeholder="Mobile"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Skype */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skype Name/Number</label>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#156372] rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">S</span>
                      </div>
                      <input
                        type="text"
                        name="skypeName"
                        value={newContactPersonData.skypeName}
                        onChange={handleContactPersonChange}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        placeholder="Enter Skype name or number"
                      />
                    </div>
                  </div>

                  {/* Other Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={newContactPersonData.designation}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        placeholder="Enter designation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input
                        type="text"
                        name="department"
                        value={newContactPersonData.department}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        placeholder="Enter department"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Profile Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => contactPersonImageRef.current?.click()}
                  >
                    <input
                      ref={contactPersonImageRef}
                      type="file"
                      accept="image/*"
                      onChange={handleContactPersonImageUpload}
                      className="hidden"
                    />
                    {contactPersonImage ? (
                      <div className="space-y-2">
                        <img src={contactPersonImage as string} alt="Profile" className="w-32 h-32 mx-auto rounded-full object-cover" />
                        <p className="text-sm text-gray-600">Click to change image</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload size={32} className="mx-auto text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">Drag & Drop Profile Image</p>
                        <p className="text-xs text-gray-500">Supported Files: jpg, jpeg, png, gif, bmp</p>
                        <p className="text-xs text-gray-500">Maximum File Size: 5MB</p>
                        <button
                          type="button"
                          className="mt-2 text-sm text-[#156372] hover:text-[#0D4A52]"
                        >
                          Upload File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleCancelContactPerson}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContactPerson}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <ConfigurePaymentTermsModal
          isOpen={isConfigureTermsOpen}
          onClose={() => setIsConfigureTermsOpen(false)}
          initialTerms={paymentTerms}
          onSave={(terms) => {
            const sanitizedTerms = terms.filter((term) => term.label?.trim());
            const finalTerms = sanitizedTerms.length > 0 ? sanitizedTerms : defaultPaymentTerms;
            setPaymentTerms(finalTerms);

            const currentStillExists = finalTerms.some((term) => term.value === selectedPaymentTerm);
            const fallbackTerm = currentStillExists ? finalTerms.find((term) => term.value === selectedPaymentTerm) : finalTerms[0];
            applyPaymentTerm(fallbackTerm?.value || finalTerms[0]?.value || "due-on-receipt", finalTerms);
          }}
        />

        {/* Invoice Number Configuration Modal */}
        {
          isInvoiceNumberModalOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setIsInvoiceNumberModalOpen(false)}
            >
              <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Configure Invoice Number Preferences</h2>
                  <button
                    onClick={() => setIsInvoiceNumberModalOpen(false)}
                    className="p-2  rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  {/* Transaction Number Series Configuration Section */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-start gap-4">
                    <Settings size={20} className="text-gray-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 mb-2">
                        Configure multiple transaction number series to auto-generate transaction numbers with unique prefixes according to your business needs.
                      </p>
                      <button className="text-[#156372] hover:text-[#0D4A52] text-sm font-medium">
                        Configure →
                      </button>
                    </div>
                  </div>

                  {/* Invoice Numbering Preference Section */}
                  <div className="mb-6">
                    {invoiceNumberMode === "auto" ? (
                      <p className="text-sm text-gray-700 mb-4">
                        Your invoice numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                      </p>
                    ) : (
                      <p className="text-sm text-gray-700 mb-4">
                        You have selected manual invoice numbering. Do you want us to auto-generate it for you?
                      </p>
                    )}

                    {/* Radio Button Options */}
                    <div className="space-y-4">
                      {/* Auto-generate option */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5">
                          <input
                            type="radio"
                            name="invoiceNumberMode"
                            value="auto"
                            checked={invoiceNumberMode === "auto"}
                            onChange={(e) => setInvoiceNumberMode(e.target.value)}
                            className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              Continue auto-generating invoice numbers
                            </span>
                            <Info size={14} className="text-gray-400" />
                          </div>
                          {invoiceNumberMode === "auto" && (
                            <div className="mt-3 space-y-3 pl-6">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Prefix</label>
                                <input
                                  type="text"
                                  value={invoicePrefix}
                                  onChange={(e) => {
                                    setInvoicePrefix(e.target.value);
                                    // Update invoice number in real-time
                                    setFormData(prev => ({
                                      ...prev,
                                      invoiceNumber: `${e.target.value}${invoiceNextNumber}`
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Next Number</label>
                                <input
                                  type="text"
                                  value={invoiceNextNumber}
                                  onChange={(e) => {
                                    setInvoiceNextNumber(e.target.value);
                                    // Update invoice number in real-time
                                    setFormData(prev => ({
                                      ...prev,
                                      invoiceNumber: `${invoicePrefix}${e.target.value}`
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </label>

                      {/* Manual option */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5">
                          <input
                            type="radio"
                            name="invoiceNumberMode"
                            value="manual"
                            checked={invoiceNumberMode === "manual"}
                            onChange={(e) => setInvoiceNumberMode(e.target.value)}
                            className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            Enter invoice numbers manually
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={() => setIsInvoiceNumberModalOpen(false)}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer  transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Update invoice number based on mode
                      if (invoiceNumberMode === "auto") {
                        setFormData(prev => ({
                          ...prev,
                          invoiceNumber: `${invoicePrefix}${invoiceNextNumber}`
                        }));
                      }
                      // If switching to manual, keep current value but make it editable
                      setIsInvoiceNumberModalOpen(false);
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors"
                  >
                    Save
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setIsDocumentsModalOpen(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${selectedInbox === "files"
                            ? "bg-[#156372] text-white"
                            : "text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          <Folder size={16} />
                          Files
                        </button>
                        <button
                          onClick={() => setSelectedInbox("bank-statements")}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${selectedInbox === "bank-statements"
                            ? "bg-[#156372] text-white"
                            : "text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          <CreditCard size={16} />
                          Bank Statements
                        </button>
                        <button
                          onClick={() => setSelectedInbox("all-documents")}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${selectedInbox === "all-documents"
                            ? "bg-[#156372] text-white"
                            : "text-gray-700 hover:bg-gray-200"
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
                              className="text-[#156372] hover:underline"
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
                                <a href="#" className="text-sm text-[#156372] hover:underline">
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
                    className="px-6 py-2.5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#0D4A52]"
                  >
                    Attachments
                  </button>
                  <button
                    onClick={() => {
                      setIsDocumentsModalOpen(false);
                      setSelectedDocuments([]);
                      setDocumentSearch("");
                    }}
                    className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-all  hover:border-gray-400"
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
                    className="text-red-500 hover:text-red-600 transition-colors"
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
                        { id: "zoho", name: "Zoho WorkDrive", icon: Grid3x3 },
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
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isSelected
                              ? "bg-blue-50 text-[#156372] border-l-4 border-[#156372]"
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
                        {/* Illustration Area - Using a placeholder illustration */}
                        <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                          <div className="relative w-full h-full">
                            {/* Stylized illustration with people and documents */}
                            <div className="absolute inset-0 flex items-end justify-center">
                              {/* Person on document with laptop */}
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
                            <div className="absolute top-12 right-12 w-4 h-4 bg-blue-400 transform rotate-45"></div>
                            <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                            <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                          </div>
                        </div>

                        {/* Description Text */}
                        <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                          {selectedCloudProvider === "zoho"
                            ? "Zoho WorkDrive is an online file sync, storage and content collaboration platform."
                            : "Select a cloud storage provider to get started."}
                        </p>

                        {/* Set up your team button */}
                        {selectedCloudProvider === "zoho" && (
                          <button
                            className="px-6 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                            onClick={() => {
                              window.open(
                                "https://workdrive.zoho.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=ZohoBooks",
                                "_blank"
                              );
                            }}
                          >
                            Set up your team
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={() => setIsCloudPickerOpen(false)}
                    className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium  transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Handle file attachment from cloud
                      setIsCloudPickerOpen(false);
                    }}
                    className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52] transition-colors"
                  >
                    Attach
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
                          placeholder="Type to search or scan the barcode of the item."
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
                            className={`p-4 cursor-pointer  border-b border-gray-200 flex items-center justify-between ${isSelected ? "bg-blue-50" : ""
                              }`}
                            onClick={() => handleBulkItemToggle(item)}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                SKU: {item.sku} Rate: {formData.currency}{Number(item.rate || 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">
                                Stock on Hand {Number(item.stockOnHand || 0).toFixed(2)} {item.unit}
                              </div>
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
                                  SKU: {selectedItem.sku} • {formData.currency}{Number(selectedItem.rate || 0).toFixed(2)}
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
                    className="px-6 py-2 text-white rounded-md text-sm font-medium transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.opacity = "0.9";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.opacity = "1";
                      }
                    }}
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

        {/* New Tax Modal */}
        {
          isNewTaxModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancelNewTax}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">New Tax</h2>
                  <button
                    className="p-2  rounded-md text-gray-600 "
                    onClick={handleCancelNewTax}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Tax Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Name<span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent"
                      placeholder="Enter tax name"
                      value={newTaxData.name}
                      onChange={(e) => setNewTaxData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {/* Rate (%) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rate (%)<span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent"
                        placeholder="0"
                        value={newTaxData.rate}
                        onChange={(e) => setNewTaxData(prev => ({ ...prev, rate: e.target.value }))}
                        step="0.01"
                        min="0"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                    </div>
                  </div>

                  {/* Compound Tax Checkbox */}
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="compoundTax"
                        checked={newTaxData.isCompound}
                        onChange={(e) => setNewTaxData(prev => ({ ...prev, isCompound: e.target.checked }))}
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                      />
                      <label htmlFor="compoundTax" className="text-sm text-gray-700 cursor-pointer flex items-center gap-1">
                        This tax is a compound tax.
                        <Info size={14} className="text-gray-400" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                  <button
                    className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52]"
                    onClick={handleSaveNewTax}
                  >
                    Save
                  </button>
                  <button
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium "
                    onClick={handleCancelNewTax}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* New Item Modal */}
        {isNewItemModalOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] overflow-y-auto py-8" onClick={handleCancelNewItem}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">New Item</h2>
                <button
                  className="p-2  rounded-md text-gray-600 "
                  onClick={handleCancelNewItem}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Top Section - Type, Name, SKU, Unit, and Image */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="md:col-span-2 space-y-4">
                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        Type
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="type"
                            value="Goods"
                            checked={newItemData.type === "Goods"}
                            onChange={handleNewItemChange}
                            className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                          />
                          <span className="text-sm text-gray-700">Goods</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="type"
                            value="Service"
                            checked={newItemData.type === "Service"}
                            onChange={handleNewItemChange}
                            className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                          />
                          <span className="text-sm text-gray-700">Service</span>
                        </label>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name<span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent"
                        value={newItemData.name}
                        onChange={handleNewItemChange}
                      />
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        SKU
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <input
                        type="text"
                        name="sku"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent"
                        value={newItemData.sku}
                        onChange={handleNewItemChange}
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        Unit
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <div className="relative">
                        <select
                          name="unit"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10"
                          value={newItemData.unit}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select or type to add</option>
                          <option value="pcs">pcs</option>
                          <option value="box">box</option>
                          <option value="kg">kg</option>
                          <option value="ltr">ltr</option>
                          <option value="m">m</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#156372] transition-colors"
                      onClick={() => newItemImageRef.current?.click()}
                    >
                      {newItemImage ? (
                        <img src={newItemImage as string} alt="Item" className="w-full h-48 object-cover rounded" />
                      ) : (
                        <>
                          <ImageIcon size={48} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 mb-2">Drag image(s) here or</p>
                          <button type="button" className="text-[#156372] hover:text-[#0D4A52] text-sm font-medium">
                            Browse images
                          </button>
                        </>
                      )}
                    </div>
                    <input
                      ref={newItemImageRef}
                      type="file"
                      accept="image/*"
                      onChange={handleNewItemImageUpload}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                {/* Sales and Purchase Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  {/* Sales Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Sales Information</h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="sellable"
                          checked={newItemData.sellable}
                          onChange={handleNewItemChange}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                        />
                        <span className="text-sm text-gray-700">Sellable</span>
                      </label>
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selling Price<span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                        <span className="px-3 py-2 bg-gray-50 text-sm text-gray-700 border-r border-gray-300">{formData.currency}</span>
                        <input
                          type="number"
                          name="sellingPrice"
                          className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          value={newItemData.sellingPrice}
                          onChange={handleNewItemChange}
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Sales Account */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account<span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="salesAccount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                          value={newItemData.salesAccount}
                          onChange={handleNewItemChange}
                        >
                          <option value="Sales">Sales</option>
                          <option value="Service Income">Service Income</option>
                          <option value="Other Income">Other Income</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sales Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        name="salesDescription"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent resize-none"
                        value={newItemData.salesDescription}
                        onChange={handleNewItemChange}
                        rows={3}
                        placeholder="Enter description"
                      />
                    </div>

                    {/* Sales Tax */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        Tax
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <div className="relative">
                        <select
                          name="salesTax"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                          value={newItemData.salesTax}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select a Tax</option>
                          {taxOptions.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Purchase Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Purchase Information</h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="purchasable"
                          checked={newItemData.purchasable}
                          onChange={handleNewItemChange}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                        />
                        <span className="text-sm text-gray-700">Purchasable</span>
                      </label>
                    </div>

                    {/* Cost Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost Price<span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                        <span className="px-3 py-2 bg-gray-50 text-sm text-gray-700 border-r border-gray-300">{formData.currency}</span>
                        <input
                          type="number"
                          name="costPrice"
                          className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          value={newItemData.costPrice}
                          onChange={handleNewItemChange}
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Purchase Account */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account<span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="purchaseAccount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                          value={newItemData.purchaseAccount}
                          onChange={handleNewItemChange}
                        >
                          <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                          <option value="Purchases">Purchases</option>
                          <option value="Expenses">Expenses</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Purchase Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        name="purchaseDescription"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent resize-none"
                        value={newItemData.purchaseDescription}
                        onChange={handleNewItemChange}
                        rows={3}
                        placeholder="Enter description"
                      />
                    </div>

                    {/* Purchase Tax */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        Tax
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <div className="relative">
                        <select
                          name="purchaseTax"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                          value={newItemData.purchaseTax}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select a Tax</option>
                          {taxOptions.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Preferred Vendor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Vendor</label>
                      <div className="relative">
                        <select
                          name="preferredVendor"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                          value={newItemData.preferredVendor}
                          onChange={handleNewItemChange}
                        >
                          <option value=""></option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Track Inventory Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      name="trackInventory"
                      checked={newItemData.trackInventory}
                      onChange={handleNewItemChange}
                      className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Track Inventory for this item
                      <Info size={14} className="text-gray-400" />
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mb-4 ml-6">
                    You cannot enable/disable inventory tracking once you've created transactions for this item
                  </p>

                  {newItemData.trackInventory && (
                    <div className="ml-6 p-3 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-2">
                      <Info size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-orange-800">Note: You can configure the opening stock and stock tracking for this item under the Items module</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-6 py-2 text-sm font-medium text-white rounded-md transition-colors"
                  style={{
                    background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  onClick={handleSaveNewItem}
                >
                  Save
                </button>
                <button
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md  transition-colors"
                  onClick={handleCancelNewItem}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Preferences Sidebar */}
        {isPreferencesOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActivePreferencesTab("preferences")}
                    className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "preferences"
                      ? "text-[#156372] border-b-2 border-[#156372]"
                      : "text-gray-600 "
                      }`}
                  >
                    Preferences
                  </button>
                  <button
                    onClick={() => setActivePreferencesTab("field-customization")}
                    className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "field-customization"
                      ? "text-[#156372] border-b-2 border-[#156372]"
                      : "text-gray-600 "
                      }`}
                  >
                    Field Customization
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-sm text-[#156372] hover:text-[#0D4A52]">All Preferences</button>
                  <button
                    onClick={() => setIsPreferencesOpen(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Preferences Tab Content */}
              {activePreferencesTab === "preferences" && (
                <div className="p-6">
                  {/* Invoice Editing Options */}
                  <div className="mb-6">
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.allowEditingSentInvoice}
                          onChange={(e) => setPreferences(prev => ({ ...prev, allowEditingSentInvoice: e.target.checked }))}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Allow editing of Sent Invoice?</span>
                      </label>
                    </div>
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.associateExpenseReceipts}
                          onChange={(e) => setPreferences(prev => ({ ...prev, associateExpenseReceipts: e.target.checked }))}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Associate and display expense receipts in Invoice PDF</span>
                      </label>
                    </div>
                  </div>

                  {/* Payments Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Payments</h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifyOnOnlinePayment}
                          onChange={(e) => setPreferences(prev => ({ ...prev, notifyOnOnlinePayment: e.target.checked }))}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Get notified when customers pay online</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.includePaymentReceipt}
                          onChange={(e) => setPreferences(prev => ({ ...prev, includePaymentReceipt: e.target.checked }))}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Do you want to include the payment receipt along with the Thank You note?</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.automateThankYouNote}
                          onChange={(e) => setPreferences(prev => ({ ...prev, automateThankYouNote: e.target.checked }))}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Automate thank you note to customer on receipt of online payment</span>
                      </label>
                    </div>
                  </div>

                  {/* Invoice QR Code Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Invoice QR Code</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{preferences.invoiceQRCodeEnabled ? "Enabled" : "Disabled"}</span>
                        <button
                          onClick={() => setPreferences(prev => ({ ...prev, invoiceQRCodeEnabled: !prev.invoiceQRCodeEnabled }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.invoiceQRCodeEnabled ? "bg-[#156372]" : "bg-gray-300"
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.invoiceQRCodeEnabled ? "translate-x-6" : "translate-x-1"
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Enable and configure the QR code you want to display on the PDF copy of an Invoice. Your customers can scan the QR code using their device to access the URL or other information that you configure.
                    </p>
                  </div>

                  {/* Zero-Value Line Items Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Zero-Value Line Items</h3>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.hideZeroValueLineItems}
                        onChange={(e) => setPreferences(prev => ({ ...prev, hideZeroValueLineItems: e.target.checked }))}
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">Hide zero-value line items</span>
                        <p className="text-sm text-gray-600 mt-1">
                          Choose whether you want to hide zero-value line items in an invoice's PDF and the Customer Portal. They will still be visible while editing an invoice. This setting will not apply to invoices whose total is zero.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Terms & Conditions Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                    <textarea
                      value={preferences.termsAndConditions}
                      onChange={(e) => setPreferences(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                      className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-y min-h-[200px]"
                      placeholder="Enter terms and conditions..."
                    />
                  </div>

                  {/* Customer Notes Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Notes</h3>
                    <textarea
                      value={preferences.customerNotes}
                      onChange={(e) => setPreferences(prev => ({ ...prev, customerNotes: e.target.value }))}
                      className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-y min-h-[200px]"
                      placeholder="Enter customer notes..."
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-start pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        // TODO: Save preferences to localStorage or backend
                        alert("Preferences saved successfully!");
                        setIsPreferencesOpen(false);
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Field Customization Tab Content */}
              {activePreferencesTab === "field-customization" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700">
                      <Plus size={16} />
                      New
                    </button>
                  </div>

                  {/* Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customFields.map((field) => (
                          <tr key={field.id} className="border-b border-gray-200 ">
                            <td className="px-4 py-3 text-gray-900">
                              <div className="flex items-center gap-2">
                                {field.isLocked && <Lock size={14} className="text-gray-400" />}
                                <span>{field.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{field.dataType}</td>
                            <td className="px-4 py-3 text-gray-700">{field.mandatory ? "Yes" : "No"}</td>
                            <td className="px-4 py-3 text-gray-700">{field.showInPDF ? "Yes" : "No"}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                {field.status}
                              </span>
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
        )}

        {/* Bulk Update Project Modal */}
        {
          isBulkUpdateProjectModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsBulkUpdateProjectModalOpen(false)}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-medium text-gray-800">Bulk Update Line Items</h2>
                  <button
                    onClick={() => setIsBulkUpdateProjectModalOpen(false)}
                    className="p-1 rounded-md border border-[#3f83f8] text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6">
                  <p className="text-[14px] text-gray-700 mb-5">
                    Select a project to update them for all the selected line items.
                  </p>

                  <div className="max-w-[520px]">
                    <label className="block text-[14px] text-gray-700 mb-2">Project</label>
                    <div className="relative">
                      <select
                        value={selectedBulkProjectId}
                        onChange={(e) => setSelectedBulkProjectId(e.target.value)}
                        className="w-full h-11 px-4 pr-10 border border-gray-300 rounded-md text-[14px] text-gray-700 appearance-none bg-white focus:outline-none focus:border-blue-400"
                      >
                        <option value="">Select a project</option>
                        {availableProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <p className="mt-5 text-[14px] italic text-gray-600 max-w-4xl">
                    Note: The selected project will not be updated for timesheet entries and line items to which a project was associated in another transaction.
                  </p>
                </div>

                <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (!selectedBulkProjectId || bulkSelectedItemIds.length === 0) return;
                      const selectedProject = availableProjects.find((project: any) => String(project.id) === String(selectedBulkProjectId));
                      if (!selectedProject) return;
                      setFormData((prev) => ({
                        ...prev,
                        items: prev.items.map((item: any) =>
                          bulkSelectedItemIds.includes(item.id)
                            ? {
                                ...item,
                                projectId: selectedProject.id,
                                project: selectedProject.id,
                                projectName: selectedProject.name,
                              }
                            : item
                        ),
                      }));
                      setIsBulkUpdateProjectModalOpen(false);
                    }}
                    disabled={!selectedBulkProjectId || bulkSelectedItemIds.length === 0}
                    className="px-6 py-2 bg-[#25b46b] text-white rounded-md text-sm font-medium hover:bg-[#1f9c5d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => setIsBulkUpdateProjectModalOpen(false)}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Bulk Update Reporting Tags Modal */}
        {
          isBulkUpdateReportingTagsModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsBulkUpdateReportingTagsModalOpen(false)}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-medium text-gray-800">Bulk Update Line Items</h2>
                  <button
                    onClick={() => setIsBulkUpdateReportingTagsModalOpen(false)}
                    className="p-1 rounded-md border border-[#3f83f8] text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6">
                  <p className="text-[14px] text-gray-700 mb-4">
                    Select an option in the reporting tags to update them for all the selected line items.
                  </p>

                  <div className="space-y-4 max-w-[520px]">
                    {normalizedReportingTags.length === 0 ? (
                      <div className="text-sm text-gray-500">No reporting tags available.</div>
                    ) : (
                      normalizedReportingTags.map((tag: any) => (
                        <div key={`bulk-reporting-${tag.key}`}>
                          <label className="block text-sm text-gray-700 mb-1">{tag.label}</label>
                          <div className="relative">
                            <select
                              value={bulkReportingTagValues[String(tag.key)] ?? ""}
                              onChange={(e) =>
                                setBulkReportingTagValues((prev) => ({
                                  ...prev,
                                  [String(tag.key)]: e.target.value,
                                }))
                              }
                              className="w-full h-11 px-4 pr-10 border border-gray-300 rounded-md text-[14px] text-gray-700 appearance-none bg-white focus:outline-none focus:border-blue-400"
                            >
                              <option value="">None</option>
                              {Array.isArray(tag.options) &&
                                tag.options.map((option: string, index: number) => (
                                  <option key={`${tag.key}-bulk-option-${index}-${option}`} value={option}>
                                    {option}
                                  </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <p className="mt-5 text-[14px] italic text-gray-600 max-w-4xl">
                    Note: Only the reporting tags you select will be updated in the line items. Other tags will not be updated.
                  </p>
                </div>

                <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const selectedUpdates = normalizedReportingTags
                        .map((tag: any) => ({
                          tag,
                          value: String(bulkReportingTagValues[String(tag.key)] ?? ""),
                        }))
                        .filter((entry: any) => entry.value !== "");

                      if (bulkSelectedItemIds.length === 0 || selectedUpdates.length === 0) {
                        setIsBulkUpdateReportingTagsModalOpen(false);
                        return;
                      }

                      setFormData((prev: any) => ({
                        ...prev,
                        items: prev.items.map((item: any) => {
                          if (!bulkSelectedItemIds.includes(item.id)) return item;
                          const existing = Array.isArray(item.reportingTags) ? [...item.reportingTags] : [];
                          const nextTags = [...existing];

                          selectedUpdates.forEach((entry: any) => {
                            const tagId = String(entry.tag?.id || entry.tag?._id || entry.tag?.key || "");
                            const tagName = String(entry.tag?.label || entry.tag?.name || "");
                            const existingIndex = nextTags.findIndex((row: any) =>
                              String(row?.tagId || "") === tagId || String(row?.name || "") === tagName
                            );
                            const updatedTag = {
                              tagId,
                              value: entry.value,
                              name: tagName,
                            };
                            if (existingIndex >= 0) {
                              nextTags[existingIndex] = { ...nextTags[existingIndex], ...updatedTag };
                            } else {
                              nextTags.push(updatedTag);
                            }
                          });

                          return {
                            ...item,
                            reportingTags: nextTags,
                          };
                        }),
                      }));

                      setItemsWithAdditionalInfo(new Set(bulkSelectedItemIds));
                      setIsBulkUpdateReportingTagsModalOpen(false);
                    }}
                    className="px-6 py-2 bg-[#25b46b] text-white rounded-md text-sm font-medium hover:bg-[#1f9c5d] transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => setIsBulkUpdateReportingTagsModalOpen(false)}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Item Reporting Tags Modal */}
        {
          isItemReportingTagsModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsItemReportingTagsModalOpen(false)}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-medium text-gray-800">Reporting Tags</h2>
                  <button
                    onClick={() => setIsItemReportingTagsModalOpen(false)}
                    className="p-1 rounded-md border border-[#3f83f8] text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {normalizedReportingTags.length === 0 ? (
                    <div className="text-sm text-gray-500">No reporting tags available.</div>
                  ) : (
                    normalizedReportingTags.map((tag: any) => (
                      <div key={`item-reporting-tag-${tag.key}`}>
                        <label className="block text-sm text-gray-700 mb-2">{tag.label} <span className="text-red-500">*</span></label>
                        <div className="relative max-w-[320px]">
                          <select
                            value={itemReportingTagDraftValues[String(tag.key)] ?? ""}
                            onChange={(e) =>
                              setItemReportingTagDraftValues((prev) => ({
                                ...prev,
                                [String(tag.key)]: e.target.value,
                              }))
                            }
                            className="w-full h-11 px-4 pr-9 border border-gray-300 rounded-md text-sm text-gray-700 appearance-none bg-white focus:outline-none focus:border-blue-400"
                          >
                            <option value="">None</option>
                            {Array.isArray(tag.options) &&
                              tag.options.map((option: string, index: number) => (
                                <option key={`${tag.key}-item-option-${index}-${option}`} value={option}>
                                  {option}
                                </option>
                              ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (!itemReportingTagsTargetId) {
                        setIsItemReportingTagsModalOpen(false);
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
                      setIsItemReportingTagsModalOpen(false);
                    }}
                    className="px-6 py-2 bg-[#25b46b] text-white rounded-md text-sm font-medium hover:bg-[#1f9c5d] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsItemReportingTagsModalOpen(false)}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Bulk Update Account Modal */}
        {
          isBulkUpdateAccountModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsBulkUpdateAccountModalOpen(false)}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Bulk Update Line Items</h2>
                  <button
                    onClick={() => setIsBulkUpdateAccountModalOpen(false)}
                    className="p-2  rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6">
                  <p className="text-sm text-gray-700 mb-4">Select an account for the selected line items.</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Choose Account</label>
                    <div className="relative" ref={bulkAccountDropdownRef}>
                      <input
                        type="text"
                        value={selectedBulkAccount}
                        readOnly
                        onClick={() => setIsBulkAccountDropdownOpen(!isBulkAccountDropdownOpen)}
                        placeholder="Select an account"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all pr-10 cursor-pointer"
                      />
                      <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      {isBulkAccountDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden">
                          <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                            <Search size={16} className="text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={bulkAccountSearch}
                              onChange={(e) => setBulkAccountSearch(e.target.value)}
                              className="flex-1 text-sm bg-transparent focus:outline-none"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {[
                              "Sales",
                              "Service Income",
                              "Other Income",
                              "Cost of Goods Sold",
                              "Purchases",
                              "Expenses",
                              "Accounts Receivable",
                              "Accounts Payable"
                            ]
                              .filter(account => account.toLowerCase().includes(bulkAccountSearch.toLowerCase()))
                              .map(account => (
                                <div
                                  key={account}
                                  onClick={() => {
                                    setSelectedBulkAccount(account);
                                    setIsBulkAccountDropdownOpen(false);
                                    setBulkAccountSearch("");
                                  }}
                                  className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${selectedBulkAccount === account ? "bg-blue-50" : "hover:bg-blue-50"
                                    }`}
                                >
                                  <span className="text-sm text-gray-900">{account}</span>
                                  {selectedBulkAccount === account && (
                                    <Check size={16} className="text-[#156372]" />
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsBulkUpdateAccountModalOpen(false);
                      setSelectedBulkAccount("");
                      setBulkAccountSearch("");
                    }}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium  transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedBulkAccount && bulkSelectedItemIds.length > 0) {
                        // Update account for selected items
                        setFormData(prev => ({
                          ...prev,
                          items: prev.items.map(item =>
                            bulkSelectedItemIds.includes(item.id)
                              ? { ...item, account: selectedBulkAccount }
                              : item
                          )
                        }));
                        setIsBulkUpdateAccountModalOpen(false);
                        setSelectedBulkAccount("");
                        setBulkAccountSearch("");
                      }
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          )
        }

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
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
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
        )}

        {/* Quick New Customer Modal */}
        {typeof document !== "undefined" && document.body && createPortal(
          <div
            className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
            onClick={() => {
              setIsNewCustomerQuickActionOpen(false);
              reloadCustomersForInvoice();
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
                      await reloadCustomersForInvoice();
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
                    reloadCustomersForInvoice();
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
      </div>

      {/* Floating Footer */}
      <div className="fixed bottom-0 left-[260px] right-0 bg-white border-t border-gray-200 px-8 py-3 flex items-center justify-between z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave('draft')}
            disabled={saveLoading !== null}
            className={`h-9 px-5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 ${saveLoading !== null ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {saveLoading === "draft" ? <Loader2 size={16} className="animate-spin" /> : null}
            {saveLoading === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => handleSaveAndSend('sent')}
            disabled={saveLoading !== null}
            className={`h-9 px-5 bg-[#156372] text-white rounded text-sm font-semibold hover:bg-[#0D4A52] transition-colors flex items-center gap-2 ${saveLoading !== null ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {saveLoading === "send" ? <Loader2 size={16} className="animate-spin" /> : null}
            {saveLoading === "send" ? "Saving..." : "Save and Send"}
          </button>
          <button
            onClick={handleCancel}
            className="h-9 px-5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm text-[#156372] hover:text-[#0D4A52] font-medium">
            <RefreshCw size={15} />
            Make Recurring
          </button>
          <div className="pl-6 border-l border-gray-200 text-xs text-gray-500 font-semibold">
            Total Amount: <span className="text-sm font-bold text-gray-900 ml-1">KES {Number(formData.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <NewTaxQuickModal
        open={isNewTaxQuickModalOpen}
        onClose={() => {
          setIsNewTaxQuickModalOpen(false);
          setNewTaxTargetItemId(null);
        }}
        onCreated={(createdTax) => {
          const option: any = {
            id: createdTax.id || createdTax._id,
            _id: createdTax._id || createdTax.id,
            name: createdTax.name,
            rate: Number(createdTax.rate || 0),
            type: "tax",
            isActive: createdTax.isActive !== false,
          };
          setTaxOptions((prev: any[]) => {
            const exists = prev.some((tax: any) => String(tax.id || tax._id) === String(option.id || option._id));
            return exists ? prev : [option, ...prev];
          });
          if (newTaxTargetItemId !== null && newTaxTargetItemId !== undefined) {
            handleTaxSelect(newTaxTargetItemId, String(option.id || option._id || ""));
          }
          setIsNewTaxQuickModalOpen(false);
          setNewTaxTargetItemId(null);
        }}
      />
    </div>
  </>
);
}

export default NewInvoice;






