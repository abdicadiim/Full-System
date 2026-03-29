import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  FileText,
  Info,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Paperclip,
  Tag,
  Upload,
  Trash2,
  X,
  ChevronLeft,
} from "lucide-react";
import { customersAPI, debitNotesAPI, invoicesAPI, projectsAPI, reportingTagsAPI, salespersonsAPI, transactionNumberSeriesAPI } from "../../../../services/api";
import { getTaxes, saveInvoice } from "../../salesModel";
import { usePaymentTermsDropdown, defaultPaymentTerms, PaymentTerm } from "../../../../hooks/usePaymentTermsDropdown";
import PaymentTermsDropdown from "../../../../components/PaymentTermsDropdown";
import { ConfigurePaymentTermsModal } from "../../../../components/ConfigurePaymentTermsModal";
import { computeDueDateFromTerm } from "../../../shared/termPaymetn";
import { buildTaxOptionGroups, isTaxActive, taxLabel } from "../../../../hooks/Taxdropdownstyle";
import { readTaxesLocal, TAXES_STORAGE_EVENT } from "../../../settings/organization-settings/taxes-compliance/TAX/storage";

type DebitNoteItem = {
  id: number;
  description: string;
  rate: number;
  baseRate?: number;
  tax: string;
  amount: number;
};
type ReportingTagDef = {
  key: string;
  label: string;
  options: string[];
  isMandatory?: boolean;
  appliesTo?: string[];
};
type AccountGroup = {
  title: string;
  items: string[];
};
type CustomerOption = Record<string, any>;

const DISCOUNT_ACCOUNT_GROUPS: AccountGroup[] = [
  {
    title: "Other Current Asset",
    items: [
      "Advance Tax",
      "Employee Advance",
      "Goods In Transit",
      "Prepaid Expenses",
      "TDS Receivable",
    ],
  },
  {
    title: "Fixed Asset",
    items: ["Furniture and Equipment"],
  },
  {
    title: "Other Current Liability",
    items: [
      "Employee Reimbursements",
      "Opening Balance Adjustments",
      "TDS Payable",
      "Unearned Revenue",
    ],
  },
  {
    title: "Equity",
    items: ["Drawings", "Opening Balance Offset", "Owner's Equity"],
  },
  {
    title: "Income",
    items: [
      "Discount",
      "General Income",
      "Interest Income",
      "Late Fee Income",
      "Other Charges",
      "Sales",
      "Shipping Charge",
    ],
  },
  {
    title: "Expense",
    items: [
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
      "Postage",
      "Printing and Stationery",
      "Purchase Discounts",
      "Rent Expense",
      "Repairs and Maintenance",
      "Salaries and Employee Wages",
      "Telephone Expense",
      "Travel Expense",
      "Uncategorized",
    ],
  },
  {
    title: "Cost Of Goods Sold",
    items: ["Cost Of Goods Sold", "Cost of Goods Sold"],
  },
];

const normalizeReportingTagOptions = (tag: any): string[] => {
  const rawOptions = Array.isArray(tag?.options)
    ? tag.options
    : Array.isArray(tag?.values)
      ? tag.values
      : Array.isArray(tag?.tagValues)
        ? tag.tagValues
        : Array.isArray(tag?.choices)
          ? tag.choices
          : [];
  return Array.from(
    new Set(
      rawOptions
        .map((option: any) => {
          if (typeof option === "string") return option.trim();
          if (option && typeof option === "object") {
            return String(option.value ?? option.name ?? option.option ?? option.title ?? "").trim();
          }
          return "";
        })
        .filter(Boolean)
    )
  );
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

const getCustomerPrimaryName = (customer: CustomerOption) =>
  String(
    customer?.name ||
    customer?.displayName ||
    customer?.customerName ||
    customer?.contactName ||
    customer?.companyName ||
    ""
  ).trim();

const getCustomerCode = (customer: CustomerOption) =>
  String(customer?.customerNumber || customer?.customerCode || customer?.code || "").trim();

const getCustomerEmail = (customer: CustomerOption) =>
  String(customer?.email || customer?.emailAddress || customer?.primaryEmail || "").trim();

const getCustomerCompany = (customer: CustomerOption) =>
  String(customer?.companyName || customer?.company || "").trim();

const getCustomerInitial = (customer: CustomerOption) => {
  const name = getCustomerPrimaryName(customer);
  return name ? name.charAt(0).toUpperCase() : "C";
};

const getCustomerCurrency = (customer: CustomerOption) =>
  String(customer?.currency || customer?.currencyCode || customer?.preferredCurrency || "").trim();

const getCustomerId = (customer: CustomerOption) =>
  String(customer?.id || customer?._id || customer?.customerId || "").trim();

const getReportingTagLabel = (entry: any): string => {
  if (typeof entry === "string") return entry.trim();
  if (entry && typeof entry === "object") {
    return String(entry.name || entry.label || entry.value || entry.tagName || entry.tag || "").trim();
  }
  return "";
};

const getAddress = (customer: CustomerOption, kind: "billing" | "shipping") => {
  const nested =
    customer?.[`${kind}Address`] ||
    customer?.[kind] ||
    customer?.[`${kind}_address`] ||
    (kind === "billing" ? customer?.address : null) ||
    {};

  return {
    attention: String(nested?.attention || customer?.[`${kind}Attention`] || "").trim(),
    street1: String(
      nested?.street1 ||
      nested?.address1 ||
      nested?.addressLine1 ||
      nested?.line1 ||
      nested?.street ||
      customer?.[`${kind}Street1`] ||
      customer?.[`${kind}AddressLine1`] ||
      ""
    ).trim(),
    street2: String(
      nested?.street2 ||
      nested?.address2 ||
      nested?.addressLine2 ||
      nested?.line2 ||
      customer?.[`${kind}Street2`] ||
      customer?.[`${kind}AddressLine2`] ||
      ""
    ).trim(),
    city: String(nested?.city || customer?.[`${kind}City`] || "").trim(),
    state: String(nested?.state || customer?.[`${kind}State`] || "").trim(),
    zipCode: String(
      nested?.zipCode ||
      nested?.postalCode ||
      nested?.zip ||
      customer?.[`${kind}ZipCode`] ||
      customer?.[`${kind}PostalCode`] ||
      ""
    ).trim(),
    country: String(nested?.country || customer?.[`${kind}Country`] || "").trim(),
    phone: String(nested?.phone || customer?.[`${kind}Phone`] || "").trim(),
    fax: String(nested?.fax || customer?.[`${kind}Fax`] || "").trim(),
  };
};

const getAddressLines = (address: any): string[] =>
  [
    address?.attention,
    address?.street1,
    address?.street2,
    address?.city,
    address?.state ? `${address.state}${address?.zipCode ? ` ${address.zipCode}` : ""}` : address?.zipCode,
    address?.country,
    address?.phone ? `Phone: ${address.phone}` : "",
    address?.fax ? `Fax Number: ${address.fax}` : "",
  ].filter((line) => Boolean(String(line || "").trim()));

const hasAddress = (address: any) =>
  Boolean(
    address?.attention ||
    address?.street1 ||
    address?.street2 ||
    address?.city ||
    address?.state ||
    address?.zipCode ||
    address?.country ||
    address?.phone ||
    address?.fax
  );

const reasons = [
  "Correction in invoice",
  "Change in POS",
  "Finalization of Provisional assessment",
  "Others",
];
const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const parseDisplayDate = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(raw.replace(/(\d{2}) ([A-Za-z]{3}) (\d{4})/, "$1 $2, $3"));
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

const parseTaxRate = (taxLabel: string): number => {
  const match = String(taxLabel || "").match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : 0;
};
const parsePercent = (raw: any): number => {
  const match = String(raw ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const getInvoiceBalanceDue = (invoice: any): number => {
  const totalAmount = Number(invoice?.total ?? invoice?.grandTotal ?? invoice?.invoiceTotal ?? invoice?.amount ?? 0) || 0;
  const paidAmount = Number(invoice?.amountPaid ?? invoice?.paidAmount ?? 0) || 0;
  const balanceRaw =
    invoice?.balance !== undefined
      ? Number(invoice.balance)
      : invoice?.balanceDue !== undefined
        ? Number(invoice.balanceDue)
        : totalAmount - paidAmount;
  return Number.isFinite(balanceRaw) ? Math.max(0, balanceRaw) : 0;
};

const isUnpaidInvoice = (invoice: any): boolean => {
  const status = String(invoice?.status || invoice?.paymentStatus || "").toLowerCase().trim();
  if (status === "draft" || status === "paid") return false;
  const balanceDue = getInvoiceBalanceDue(invoice);
  if (balanceDue > 0) return true;
  return ["unpaid", "partially paid", "partially_paid", "open", "overdue", "sent"].includes(status);
};

export default function NewDebitNote() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: debitNoteId } = useParams();
  const isEditMode = Boolean(debitNoteId);
  const invoiceId = new URLSearchParams(location.search).get("invoiceId") || "";
  const clonedDataFromState = location.state?.clonedData || null;

  const [formData, setFormData] = useState({
    customerName: "",
    reason: "",
    location: "Head Office",
    debitNoteNumber: "CDN-000001",
    orderNumber: "",
    debitNoteDate: formatDate(new Date()),
    term: defaultPaymentTerms[2]?.value || "due-on-receipt",
    dueDate: formatDate(new Date()),
    earlyPaymentDays: "",
    earlyPaymentPercent: 0,
    salesperson: "",
    customField: "None",
    subject: "",
    taxMode: "Tax Exclusive",
    priceList: "Select Price List",
    customerNotes: "Thanks for your business.",
    termsAndConditions: "",
    attachedFiles: [],
    displayAttachmentsInPortalEmails: true,
    discount: 0,
    discountType: "percent",
    shippingCharges: 0,
    adjustment: 0,
    currency: "AMD",
  });

  const [items, setItems] = useState<DebitNoteItem[]>([
    { id: Date.now(), description: "", rate: 0, baseRate: 0, tax: "", amount: 0 },
  ]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [reasonSearch, setReasonSearch] = useState("");
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(false);
  const [customerPanelTab, setCustomerPanelTab] = useState<"details" | "invoices" | "activity">("details");
  const [isCustomerContactPersonsOpen, setIsCustomerContactPersonsOpen] = useState(true);
  const [isCustomerAddressOpen, setIsCustomerAddressOpen] = useState(true);
  const [activeHeaderReportingTagKey, setActiveHeaderReportingTagKey] = useState<string | null>(null);
  const [isTaxModeDropdownOpen, setIsTaxModeDropdownOpen] = useState(false);
  const [isPriceListDropdownOpen, setIsPriceListDropdownOpen] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);
  const [isNewSalespersonFormOpen, setIsNewSalespersonFormOpen] = useState(false);
  const [newSalespersonData, setNewSalespersonData] = useState<any>({ name: "", email: "" });
  const [taxes, setTaxes] = useState<any[]>([]);
  const [catalogPriceLists, setCatalogPriceLists] = useState<
    Array<{ id: string; name: string; status?: string; markup?: number; markupType?: string }>
  >([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>(defaultPaymentTerms);
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(
    defaultPaymentTerms[2]?.value || "due-on-receipt"
  );
  const [isConfigureTermsOpen, setIsConfigureTermsOpen] = useState(false);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
  const [isDebitNoteDatePickerOpen, setIsDebitNoteDatePickerOpen] = useState(false);
  const [isAttachmentCountOpen, setIsAttachmentCountOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [debitNoteDateCalendar, setDebitNoteDateCalendar] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dueDateCalendar, setDueDateCalendar] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [isBulkUpdateLineItemsActive, setIsBulkUpdateLineItemsActive] = useState(false);
  const [activeBulkUpdateAction, setActiveBulkUpdateAction] = useState<"project" | "reporting" | "account">("project");
  const [itemsWithAdditionalInfo, setItemsWithAdditionalInfo] = useState<Set<number>>(new Set());
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<number, boolean>>({});
  const [taxSearches, setTaxSearches] = useState<Record<number, string>>({});
  const [activeAdditionalInfoMenu, setActiveAdditionalInfoMenu] = useState<{ itemId: number; type: "account" | "reporting" | "project" | "discount" } | null>(null);
  const [additionalInfoSearch, setAdditionalInfoSearch] = useState("");
  const [itemAccountSelections, setItemAccountSelections] = useState<Record<number, string>>({});
  const [itemProjectSelections, setItemProjectSelections] = useState<Record<number, string>>({});
  const [itemDiscountSelections, setItemDiscountSelections] = useState<Record<number, string>>({});
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [availableReportingTags, setAvailableReportingTags] = useState<ReportingTagDef[]>([]);
  const [headerReportingTagSelections, setHeaderReportingTagSelections] = useState<Record<string, string>>({});
  const [itemReportingTagSelections, setItemReportingTagSelections] = useState<Record<number, Record<string, string>>>({});
  const [reportingTagDraft, setReportingTagDraft] = useState<Record<string, string>>({});
  const bulkActionsRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentCountDropdownRef = useRef<HTMLDivElement | null>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement | null>(null);
  const locationDropdownRef = useRef<HTMLDivElement | null>(null);
  const taxDropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const additionalInfoMenuRef = useRef<HTMLDivElement | null>(null);
  const additionalInfoReportingRef = useRef<HTMLDivElement | null>(null);
  const headerReportingTagDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const taxModeDropdownRef = useRef<HTMLDivElement | null>(null);
  const priceListDropdownRef = useRef<HTMLDivElement | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);

  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [isLoadingDebitNote, setIsLoadingDebitNote] = useState(false);
  const [loadedDebitNote, setLoadedDebitNote] = useState<any>(null);
  const hasAppliedCloneRef = useRef(false);

  const deriveDebitNotePrefix = (value: any, fallbackPrefix = "CDN-") => {
    const raw = String(value || "").trim();
    const match = raw.match(/^(.*?)(\d+)\s*$/);
    if (match && String(match[1] || "").trim()) return String(match[1]);
    return fallbackPrefix;
  };

  const isDuplicateDebitNoteNumberError = (error: any) => {
    const status = Number(error?.status || error?.response?.status || error?.data?.status || 0);
    if (status === 409) return true;
    const message = String(
      error?.data?.error ||
      error?.data?.message ||
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      ""
    ).toLowerCase();
    return (
      message.includes("already exists") ||
      message.includes("duplicate") ||
      message.includes("invoice number")
    );
  };

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
          id: Number(item?.id || item?._id || Date.now() + index),
          description: String(item?.description || item?.name || item?.itemDetails || ""),
          rate: Number(item?.rate ?? item?.unitPrice ?? item?.price ?? 0) || 0,
          baseRate: Number(item?.baseRate ?? item?.rate ?? item?.unitPrice ?? item?.price ?? 0) || 0,
          tax: String(item?.tax || item?.taxId || ""),
          amount: Number(item?.amount ?? item?.total ?? 0) || 0,
        }))
      : [];

    setFormData((prev) => ({
      ...prev,
      customerName: String(cloned.customerName || cloned.customer?.displayName || cloned.customer?.companyName || cloned.customer?.name || prev.customerName || "").trim(),
      reason: String(cloned.reason || prev.reason || ""),
      location: String(cloned.location || prev.location || "Head Office"),
      orderNumber: String(cloned.orderNumber || prev.orderNumber || ""),
      debitNoteDate: formatDate(new Date(cloned.invoiceDate || cloned.date || cloned.debitNoteDate || prev.debitNoteDate)),
      dueDate: formatDate(new Date(cloned.dueDate || cloned.invoiceDate || cloned.date || cloned.debitNoteDate || prev.dueDate)),
      salesperson: String(cloned.salesperson || prev.salesperson || ""),
      subject: String(cloned.subject || prev.subject || ""),
      taxMode: String(cloned.taxExclusive || cloned.taxMode || prev.taxMode || "Tax Exclusive"),
      priceList: String(cloned.priceList || prev.priceList || "Select Price List"),
      customerNotes: String(cloned.customerNotes || cloned.notes || prev.customerNotes || ""),
      termsAndConditions: String(cloned.termsAndConditions || cloned.terms || prev.termsAndConditions || ""),
      discount: Number(cloned.discount ?? prev.discount ?? 0) || 0,
      discountType: String(cloned.discountType || prev.discountType || "percent"),
      shippingCharges: Number(cloned.shippingCharges ?? cloned.shipping ?? prev.shippingCharges ?? 0) || 0,
      adjustment: Number(cloned.adjustment ?? prev.adjustment ?? 0) || 0,
      currency: String(cloned.currency || prev.currency || "AMD"),
    }));

    if (mappedItems.length > 0) {
      setItems(mappedItems);
    }

    const sourceInvoiceId = String(cloned.id || cloned._id || cloned.invoiceId || "").trim();
    const sourceInvoiceNumber = String(cloned.invoiceNumber || cloned.number || sourceInvoiceId || "").trim();
    if (sourceInvoiceNumber) {
      setSelectedInvoice(sourceInvoiceNumber);
    }

    if (cloned.customer || cloned.customerId || cloned.customerName) {
      setSelectedCustomer((prev) => prev || {
        id: String(cloned.customerId || cloned.customer?._id || cloned.customer?.id || sourceInvoiceId || "source-invoice"),
        name: String(cloned.customerName || cloned.customer?.displayName || cloned.customer?.companyName || cloned.customer?.name || "Customer"),
        displayName: String(cloned.customerName || cloned.customer?.displayName || cloned.customer?.companyName || cloned.customer?.name || "Customer"),
      } as any);
    }
  }, [clonedDataFromState, isEditMode]);

  const fetchNextDebitNoteNumber = async (options?: { reserve?: boolean }) => {
    const reserve = Boolean(options?.reserve);
    const prefix = deriveDebitNotePrefix(formData.debitNoteNumber, "CDN-");
    try {
      const response: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Debit Note", reserve });
      const nextNumber =
        response?.data?.nextNumber ||
        response?.data?.next_number ||
        response?.data?.debitNoteNumber ||
        response?.data?.invoiceNumber ||
        response?.nextNumber;
      if (nextNumber) return String(nextNumber).trim();
    } catch (error) {
      console.warn("Failed to fetch next debit note number from transaction series:", error);
    }

    try {
      const response: any = await invoicesAPI.getNextNumber(prefix);
      const nextNumber =
        response?.data?.nextNumber ||
        response?.data?.invoiceNumber ||
        response?.data?.next_number ||
        response?.nextNumber;
      if (nextNumber) return String(nextNumber).trim();
    } catch (error) {
      console.warn("Failed to fetch next debit note number from invoices API:", error);
    }

    try {
      const response: any = await debitNotesAPI.getNextNumber();
      const nextNumber =
        response?.data?.nextNumber ||
        response?.data?.debitNoteNumber ||
        response?.data?.invoiceNumber ||
        response?.nextNumber;
      if (nextNumber) return String(nextNumber).trim();
    } catch (error) {
      console.warn("Failed to fetch next debit note number from debit notes API:", error);
    }

    return "";
  };

  const resolveDebitNoteSendStatus = (dueDateValue: any) => {
    if (!dueDateValue) return "due";
    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) return "due";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime() ? "overdue" : "due";
  };

  const createDebitNoteWithNumberRetry = async (payload: any) => {
    try {
      return await saveInvoice(payload as any);
    } catch (error: any) {
      if (!isEditMode && isDuplicateDebitNoteNumberError(error)) {
        const freshNumber = await fetchNextDebitNoteNumber({ reserve: true });
        if (freshNumber) {
          const retryPayload = {
            ...payload,
            invoiceNumber: freshNumber,
            debitNoteNumber: freshNumber,
          };
          setFormData((prev) => ({
            ...prev,
            debitNoteNumber: freshNumber,
          }));
          return await saveInvoice(retryPayload as any);
        }
      }
      throw error;
    }
  };

  const handleSave = async (status: "draft" | "sent" = "sent") => {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    setSaveLoading(status === "draft" ? "draft" : "send");
    try {
      const selectedInvoiceRecord = invoiceOptions.find(
        (inv) => String(inv?.invoiceNumber || inv?.number || inv?.id || inv?._id || "") === selectedInvoice
      );
      const associatedInvoiceId = String(
        selectedInvoiceRecord?.id ||
        selectedInvoiceRecord?._id ||
        selectedInvoiceRecord?.invoiceId ||
        selectedInvoiceRecord?.invoice?._id ||
        selectedInvoiceRecord?.invoice?.id ||
        loadedDebitNote?.associatedInvoiceId ||
        loadedDebitNote?.invoiceId ||
        ""
      ).trim();
      const associatedInvoiceNumber = String(
        selectedInvoiceRecord?.invoiceNumber ||
        selectedInvoiceRecord?.number ||
        selectedInvoice ||
        loadedDebitNote?.associatedInvoiceNumber ||
        ""
      ).trim();
      const statusValue = status === "draft"
        ? "draft"
        : resolveDebitNoteSendStatus(formData.dueDate);
      const payload = {
        invoiceNumber: formData.debitNoteNumber,
        debitNoteNumber: formData.debitNoteNumber,
        customer: selectedCustomer.id || selectedCustomer._id,
        customerId: selectedCustomer.id || selectedCustomer._id,
        customerName: getCustomerPrimaryName(selectedCustomer),
        date: parseDisplayDate(formData.debitNoteDate).toISOString(),
        invoiceDate: parseDisplayDate(formData.debitNoteDate).toISOString(),
        dueDate: parseDisplayDate(formData.dueDate).toISOString(),
        invoiceId: associatedInvoiceId,
        associatedInvoiceId,
        associatedInvoiceNumber,
        orderNumber: formData.orderNumber,
        salesperson: formData.salesperson,
        subject: formData.subject,
        taxExclusive: formData.taxMode,
        customerNotes: formData.customerNotes,
        termsAndConditions: formData.termsAndConditions,
        attachedFiles: Array.isArray(formData.attachedFiles) ? formData.attachedFiles : [],
        attachments: Array.isArray(formData.attachedFiles) ? formData.attachedFiles : [],
        displayAttachmentsInPortalEmails: Boolean((formData as any).displayAttachmentsInPortalEmails),
        subtotal: total - (formData.shippingCharges || 0) - (formData.adjustment || 0), // Simplification
        total: total,
        currency: resolvedCurrency,
        status: statusValue,
        debitNote: true,
        items: items.map(item => ({
          name: item.description,
          description: item.description,
          quantity: 1,
          unitPrice: item.rate,
          rate: item.rate,
          tax: item.tax,
          amount: item.amount,
          account: itemAccountSelections[item.id] || "",
          projectId: itemProjectSelections[item.id] || "",
          projectName: itemProjectSelections[item.id] || "",
          discountAccount: itemDiscountSelections[item.id] || "",
        })),
      };

      const saved = isEditMode && debitNoteId
        ? await debitNotesAPI.update(debitNoteId, payload as any)
        : await createDebitNoteWithNumberRetry(payload);

      const savedId = String((saved as any)?.id || (saved as any)?._id || debitNoteId || "").trim();
      if (savedId) {
        navigate(`/sales/debit-notes/${savedId}`);
      } else {
        navigate("/sales/invoices");
      }
    } catch (error) {
      console.error("Error saving debit note:", error);
      if (isDuplicateDebitNoteNumberError(error)) {
        alert("Debit note number already exists. Please try again.");
      } else {
        alert("Failed to save debit note");
      }
    } finally {
      setSaveLoading(null);
    }
  };
  const reasonDropdownRef = useRef<HTMLDivElement | null>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement | null>(null);
  const dueDatePickerRef = useRef<HTMLDivElement | null>(null);
  const debitNoteDatePickerRef = useRef<HTMLDivElement | null>(null);
  const paymentTermsDropdownRef = useRef<HTMLDivElement | null>(null);

  const applyPaymentTerm = (termValue: string, termsList: PaymentTerm[] = paymentTerms) => {
    const dueDate = computeDueDateFromTerm(formData.debitNoteDate, termValue, termsList);
    setSelectedPaymentTerm(termValue);
    setFormData((prev) => {
      const selectedTerm = termsList.find(t => t.value === termValue);
      return {
        ...prev,
        term: termValue,
        dueDate,
        earlyPaymentDays: termValue === "custom" ? prev.earlyPaymentDays : String(selectedTerm?.discountDays || ""),
        earlyPaymentPercent: termValue === "custom" ? prev.earlyPaymentPercent : Number(selectedTerm?.discountPercentage || 0),
      };
    });
  };

  const navigateMonth = (direction: "prev" | "next", field: "debitNoteDate" | "dueDate") => {
    const setter = field === "debitNoteDate" ? setDebitNoteDateCalendar : setDueDateCalendar;
    setter((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + (direction === "next" ? 1 : -1));
      return next;
    });
  };

  const handleDateSelect = (date: Date, field: "debitNoteDate" | "dueDate") => {
    const formatted = formatDate(date);
    if (field === "debitNoteDate") {
      setDebitNoteDateCalendar(new Date(date.getFullYear(), date.getMonth(), 1));
      setIsDebitNoteDatePickerOpen(false);
      setFormData((prev) => ({
        ...prev,
        debitNoteDate: formatted,
        dueDate: computeDueDateFromTerm(formatted, selectedPaymentTerm, paymentTerms),
      }));
      const calculatedDueDate = computeDueDateFromTerm(formatted, selectedPaymentTerm, paymentTerms);
      setDueDateCalendar(new Date(parseDisplayDate(calculatedDueDate).getFullYear(), parseDisplayDate(calculatedDueDate).getMonth(), 1));
    } else {
      setDueDateCalendar(new Date(date.getFullYear(), date.getMonth(), 1));
      setIsDueDatePickerOpen(false);
      setFormData((prev) => ({
        ...prev,
        dueDate: formatted,
      }));
    }
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

  const taxComputation = useMemo(() => {
    const mode = String(formData.taxMode || "Tax Exclusive").toLowerCase();
    const isInclusive = mode.includes("inclusive");
    const grouped = new Map<string, number>();
    let baseSubTotal = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const gross = Number(item.amount || 0);
      const rate = parseTaxRate(item.tax);
      if (!item.tax || rate <= 0) {
        baseSubTotal += gross;
        return;
      }
      if (isInclusive) {
        const base = gross / (1 + rate / 100);
        const tax = gross - base;
        baseSubTotal += base;
        taxTotal += tax;
        grouped.set(item.tax, (grouped.get(item.tax) || 0) + tax);
      } else {
        const base = gross;
        const tax = (base * rate) / 100;
        baseSubTotal += base;
        taxTotal += tax;
        grouped.set(item.tax, (grouped.get(item.tax) || 0) + tax);
      }
    });

    return {
      baseSubTotal,
      taxTotal,
      groupedTaxes: Array.from(grouped.entries()).map(([label, amount]) => ({ label, amount })),
    };
  }, [formData.taxMode, items]);

  const subTotal = useMemo(() => Number(taxComputation.baseSubTotal || 0), [taxComputation.baseSubTotal]);
  const discountAmount = useMemo(() => {
    const raw = Number(formData.discount || 0);
    const computed = formData.discountType === "amount" ? raw : (subTotal * raw) / 100;
    return Math.max(0, Math.min(subTotal, computed));
  }, [formData.discount, formData.discountType, subTotal]);
  const discountFactor = useMemo(() => {
    if (subTotal <= 0) return 1;
    return Math.max(0, (subTotal - discountAmount) / subTotal);
  }, [discountAmount, subTotal]);
  const discountedTaxTotal = useMemo(
    () => taxComputation.taxTotal * discountFactor,
    [discountFactor, taxComputation.taxTotal]
  );
  const discountedGroupedTaxes = useMemo(
    () =>
      taxComputation.groupedTaxes
        .map((row) => ({ ...row, amount: row.amount * discountFactor }))
        .filter((row) => row.amount > 0),
    [discountFactor, taxComputation.groupedTaxes]
  );
  const total = useMemo(
    () =>
      Number(
        Math.max(0, subTotal - discountAmount + discountedTaxTotal) +
        Number(formData.shippingCharges || 0) +
        Number(formData.adjustment || 0)
      ),
    [discountAmount, discountedTaxTotal, formData.adjustment, formData.shippingCharges, subTotal]
  );

  const setField = (name: string, value: any) => setFormData((prev) => ({ ...prev, [name]: value }));

  const handleInvoiceSelect = (invoiceNumber: string) => {
    setSelectedInvoice(invoiceNumber);
    setIsInvoiceDropdownOpen(false);
    setInvoiceSearch("");
    if (!invoiceNumber) return;

    const invObj = invoiceOptions.find(
      (inv) => String(inv?.invoiceNumber || inv?.number || inv?.id || inv?._id || "") === invoiceNumber
    );

    if (invObj) {
      const invDate = invObj.date || invObj.invoiceDate;
      const datePart = invDate ? ` dated ${formatDate(new Date(invDate))}` : "";
      const autoDescription = `Debit Note for Invoice ${invoiceNumber}${datePart}`;

      setItems((prevItems) => {
        const next = [...prevItems];
        if (next.length > 0 && !next[0].description) {
          next[0] = { ...next[0], description: autoDescription };
        } else if (next.length === 0) {
          next.push({ id: Date.now(), description: autoDescription, rate: 0, baseRate: 0, tax: "", amount: 0 });
        }
        return next;
      });

      if (!formData.subject) {
        setField("subject", autoDescription);
      }
    }
  };

  const selectedPriceListOption = useMemo(
    () => catalogPriceLists.find((row) => row.name === formData.priceList),
    [catalogPriceLists, formData.priceList]
  );
  const filteredLocationOptions = useMemo(() => {
    const term = locationSearch.trim().toLowerCase();
    const options = Array.isArray(locationOptions) && locationOptions.length > 0 ? locationOptions : ["Head Office"];
    if (!term) return options;
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [locationOptions, locationSearch]);
  const filteredInvoiceOptions = useMemo(() => {
    const term = invoiceSearch.trim().toLowerCase();
    const rows = Array.isArray(invoiceOptions) ? invoiceOptions : [];
    const normalized = rows
      .map((invoice, index) => ({
        invoice,
        number: String(invoice?.invoiceNumber || invoice?.number || invoice?.id || invoice?._id || "").trim() || `INV-${index + 1}`,
      }))
      .filter((row) => row.number);
    if (!term) return normalized;
    return normalized.filter((row) => row.number.toLowerCase().includes(term));
  }, [invoiceOptions, invoiceSearch]);
  const discountAccountGroups = useMemo(() => {
    const term = String(additionalInfoSearch || "").trim().toLowerCase();
    if (!term) return DISCOUNT_ACCOUNT_GROUPS;
    return DISCOUNT_ACCOUNT_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = `${group.title} ${item}`.toLowerCase();
          return haystack.includes(term);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [additionalInfoSearch]);
  const getPriceListAdjustedRate = (baseRate: number) => {
    if (!selectedPriceListOption) return baseRate;
    const pct = Math.max(0, parsePercent(selectedPriceListOption.markup));
    if (!pct) return baseRate;
    const mode = String(selectedPriceListOption.markupType || "Markup").toLowerCase();
    const adjusted =
      mode === "markdown" ? baseRate * (1 - pct / 100) : baseRate * (1 + pct / 100);
    return Math.max(0, adjusted);
  };

  const updateItem = (id: number, patch: Partial<DebitNoteItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, "rate")) {
          next.baseRate = Number(patch.rate || 0);
        } else if (typeof next.baseRate !== "number") {
          next.baseRate = Number(next.rate || 0);
        }
        const appliedRate = getPriceListAdjustedRate(Number(next.baseRate || 0));
        next.rate = Number(appliedRate.toFixed(2));
        next.amount = Number(next.rate.toFixed(2));
        return next;
      })
    );
  };

  const addRow = () =>
    setItems((prev) => [
      ...prev,
      { id: Date.now() + prev.length, description: "", rate: 0, baseRate: 0, tax: "", amount: 0 },
    ]);
  const removeRow = (id: number) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  const groupedAccountOptions = [
    { group: "Other Current Asset", options: ["Advance Tax", "Employee Advance", "Goods In Transit", "Prepaid Expenses"] },
    { group: "Fixed Asset", options: ["Furniture and Equipment", "Office Equipment", "Computer Hardware"] },
  ];
  const filteredGroupedAccountOptions = groupedAccountOptions
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        option.toLowerCase().includes(String(additionalInfoSearch || "").toLowerCase().trim())
      ),
    }))
    .filter((group) => group.options.length > 0);
  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [
        getCustomerPrimaryName(customer),
        getCustomerCode(customer),
        getCustomerEmail(customer),
        getCustomerCompany(customer),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [customerSearch, customers]);
  const filteredReasons = useMemo(() => {
    const query = reasonSearch.trim().toLowerCase();
    if (!query) return reasons;
    return reasons.filter((reason) => reason.toLowerCase().includes(query));
  }, [reasonSearch]);
  const filteredSalespersons = useMemo(() => {
    const query = salespersonSearch.trim().toLowerCase();
    if (!query) return salespersons;
    return salespersons.filter((salesperson) =>
      String(salesperson?.name || "").toLowerCase().includes(query)
    );
  }, [salespersonSearch, salespersons]);
  const taxOptionGroups = useMemo(() => buildTaxOptionGroups(taxes), [taxes]);
  const getFilteredTaxGroups = (itemId: number) => {
    const query = String(taxSearches[itemId] || "").toLowerCase().trim();
    if (!query) return taxOptionGroups;

    return taxOptionGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((tax) =>
          taxLabel(tax.raw).toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.options.length > 0);
  };
  const customerDetails =
    selectedCustomer ||
    customers.find((customer) => {
      const selectedName = String(formData.customerName || "").trim().toLowerCase();
      if (!selectedName) return false;
      return getCustomerPrimaryName(customer).toLowerCase() === selectedName;
    });
  const billingAddress = customerDetails ? getAddress(customerDetails, "billing") : null;
  const shippingAddress = customerDetails ? getAddress(customerDetails, "shipping") : null;
  const hasBillingAddress = hasAddress(billingAddress);
  const hasShippingAddress = hasAddress(shippingAddress);
  const unpaidInvoiceCount = invoiceOptions.filter((invoice) => isUnpaidInvoice(invoice)).length;
  const customerPanelInitial = getCustomerInitial(customerDetails || selectedCustomer || {});
  const customerPanelName = getCustomerPrimaryName(customerDetails || selectedCustomer || {}) || "Customer";
  const customerPanelEmail = getCustomerEmail(customerDetails || selectedCustomer || "");
  const customerPanelCompany = getCustomerCompany(customerDetails || selectedCustomer || "");
  const customerPanelReportingTags = Array.isArray(customerDetails?.reportingTags)
    ? customerDetails.reportingTags
        .map((tag: any) => getReportingTagLabel(tag))
        .filter(Boolean)
    : Array.isArray(customerDetails?.tags)
      ? customerDetails.tags.map((tag: any) => getReportingTagLabel(tag)).filter(Boolean)
      : [];
  const customerPanelContactPersons = Array.isArray(customerDetails?.contactPersons)
    ? customerDetails.contactPersons
    : Array.isArray(customerDetails?.contacts)
      ? customerDetails.contacts
      : [];
  const customerPanelUnpaidInvoices = invoiceOptions.filter((invoice) => isUnpaidInvoice(invoice));
  const customerPanelOutstandingReceivables = customerPanelUnpaidInvoices.reduce(
    (sum, invoice) => sum + getInvoiceBalanceDue(invoice),
    0
  );
  const customerPanelUnusedCredits = Number(
    customerDetails?.unusedCredits ??
    customerDetails?.unusedCreditsAmount ??
    customerDetails?.creditBalance ??
    customerDetails?.availableCredits ??
    0
  ) || 0;
  const resolvedCurrency = getCustomerCurrency(customerDetails || selectedCustomer || {}) || formData.currency || "AMD";

  useEffect(() => {
    const nextCurrency = getCustomerCurrency(customerDetails || selectedCustomer || "");
    if (nextCurrency && nextCurrency !== formData.currency) {
      setField("currency", nextCurrency);
    }
  }, [customerDetails, selectedCustomer, formData.currency]);

  useEffect(() => {
    if (isEditMode || debitNoteId) return;

    let cancelled = false;

    const loadNextDebitNoteNumber = async () => {
      try {
        const nextNumber = await fetchNextDebitNoteNumber({ reserve: false });
        if (!cancelled && nextNumber) {
          setField("debitNoteNumber", nextNumber);
        }
      } catch (error) {
        console.warn("Failed to auto-generate debit note number:", error);
      }
    };

    void loadNextDebitNoteNumber();

    return () => {
      cancelled = true;
    };
  }, [debitNoteId, isEditMode]);

  useEffect(() => {
    if (!isCustomerPanelOpen || !customerDetails) return;
    setIsCustomerContactPersonsOpen(true);
    setIsCustomerAddressOpen(true);
  }, [customerDetails, isCustomerPanelOpen]);

  const normalizeReportingTagOptions = (tag: any): string[] => {
    const rawOptions = Array.isArray(tag?.options)
      ? tag.options
      : Array.isArray(tag?.values)
        ? tag.values
        : Array.isArray(tag?.tagValues)
          ? tag.tagValues
          : Array.isArray(tag?.choices)
            ? tag.choices
            : [];
    return Array.from(
      new Set(
        rawOptions
          .map((option: any) => {
            if (typeof option === "string") return option.trim();
            if (option && typeof option === "object") {
              return String(option.value ?? option.name ?? option.option ?? option.title ?? "").trim();
            }
            return "";
          })
          .filter(Boolean)
      )
    );
  };

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await customersAPI.getAll();
        const raw = (Array.isArray(response) ? response : response?.data) || [];
        const rows = Array.isArray(raw) ? raw : [];
        const activeRows = rows.filter((customer: any) => {
          const status = String(customer?.status || "").toLowerCase();
          if (status === "inactive") return false;
          if (customer?.isActive === false) return false;
          if (customer?.active === false) return false;
          return true;
        });
        setCustomers(activeRows);
      } catch {
        setCustomers([]);
      }
    };
    const loadSalespersons = async () => {
      try {
        const response = await salespersonsAPI.getAll();
        const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        setSalespersons(rows);
      } catch {
        setSalespersons([]);
      }
    };
    loadCustomers();
    loadSalespersons();
    const loadTaxes = async () => {
      try {
        const rows = await getTaxes();
        const apiRows = Array.isArray(rows?.data)
          ? rows.data
          : Array.isArray(rows)
            ? rows
            : [];
        const localRows = readTaxesLocal();
        const merged: any[] = [];
        const seen = new Set<string>();
        [...apiRows, ...localRows].forEach((row: any) => {
          if (!row) return;
          const id = String(row?._id || row?.id || "").trim();
          const name = String(row?.name || row?.taxName || "").trim().toLowerCase();
          const key = id ? `id:${id}` : name ? `name:${name}` : "";
          if (!key || seen.has(key)) return;
          seen.add(key);
          merged.push(row);
        });
        setTaxes(merged.filter(isTaxActive));
      } catch {
        setTaxes([]);
      }
    };
    loadTaxes();
    const onTaxesUpdated = () => loadTaxes();
    window.addEventListener(TAXES_STORAGE_EVENT, onTaxesUpdated as EventListener);
    window.addEventListener("focus", onTaxesUpdated);
    try {
      const raw = localStorage.getItem("taban_locations_cache");
      const parsed = raw ? JSON.parse(raw) : [];
      const options = Array.isArray(parsed)
        ? parsed
          .map((row: any) => String(row?.name || row?.locationName || row?.title || "").trim())
          .filter(Boolean)
        : [];
      setLocationOptions(options.length > 0 ? Array.from(new Set(options)) : ["Head Office"]);
    } catch {
      setLocationOptions(["Head Office"]);
    }
    return () => {
      window.removeEventListener(TAXES_STORAGE_EVENT, onTaxesUpdated as EventListener);
      window.removeEventListener("focus", onTaxesUpdated);
    };
  }, []);

  useEffect(() => {
    const loadPriceLists = () => {
      try {
        const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(parsed) ? parsed : [];
        const normalized = rows
          .map((row: any, index: number) => ({
            id: String(row?.id || row?._id || `price-list-${index}`),
            name: String(row?.name || row?.priceListName || "").trim(),
            status: String(row?.status || "").toLowerCase(),
            markup: parsePercent(row?.markup),
            markupType: String(row?.markupType || "Markup"),
          }))
          .filter((row: any) => row.name);
        const active = normalized.filter((row: any) => row.status !== "inactive");
        setCatalogPriceLists(active);
      } catch {
        setCatalogPriceLists([]);
      }
    };

    loadPriceLists();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === PRICE_LISTS_STORAGE_KEY) loadPriceLists();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const baseRate = Number(
          typeof item.baseRate === "number" ? item.baseRate : item.rate || 0
        );
        const nextRate = Number(getPriceListAdjustedRate(baseRate).toFixed(2));
        return { ...item, baseRate, rate: nextRate, amount: nextRate };
      })
    );
  }, [selectedPriceListOption]);

  useEffect(() => {
    const loadReportingTags = async () => {
      try {
        const response = await reportingTagsAPI.getAll();
        const apiRows = Array.isArray(response)
          ? response
          : Array.isArray((response as any)?.data)
            ? (response as any).data
            : [];
        const fallbackRows = (() => {
          try {
            const raw = localStorage.getItem("taban_books_reporting_tags");
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const sourceRows = Array.isArray(apiRows) && apiRows.length > 0 ? apiRows : fallbackRows;
        const activeRows = sourceRows.filter((tag: any) => String(tag?.status || "active").toLowerCase() !== "inactive");
        const salesScoped = activeRows.filter((tag: any) => {
          const appliesTo = normalizeReportingTagAppliesTo(tag);
          return appliesTo.some((entry) => entry.includes("sales") || entry.includes("invoice") || entry.includes("debit"));
        });

        const normalized = (salesScoped.length > 0 ? salesScoped : activeRows)
          .map((tag: any, index: number) => ({
            key: String(tag?.id || tag?._id || tag?.name || tag?.title || `reporting-tag-${index}`),
            label: String(tag?.name || tag?.title || tag?.label || `Reporting Tag ${index + 1}`),
            options: normalizeReportingTagOptions(tag),
            isMandatory: Boolean(tag?.isMandatory || tag?.mandatory),
            appliesTo: normalizeReportingTagAppliesTo(tag),
          }))
          .filter((tag: ReportingTagDef) => Boolean(tag.key));

        setAvailableReportingTags(normalized);
        setHeaderReportingTagSelections((prev) => {
          const next = { ...prev };
          normalized.forEach((tag) => {
            if (typeof next[tag.key] === "undefined") {
              next[tag.key] = tag.options[0] || "None";
            }
          });
          return next;
        });
      } catch {
        setAvailableReportingTags([]);
      }
    };
    loadReportingTags();
  }, []);

  useEffect(() => {
    if (!isEditMode || !debitNoteId) {
      setLoadedDebitNote(null);
      setIsLoadingDebitNote(false);
      return;
    }

    let cancelled = false;

    const loadDebitNote = async () => {
      setIsLoadingDebitNote(true);
      try {
        const response = await debitNotesAPI.getById(debitNoteId);
        const note = (response as any)?.data || response;
        if (!note) {
          toast.error("Debit note not found.");
          navigate("/sales/invoices");
          return;
        }

        setLoadedDebitNote(note);

        const customerId = String(
          note?.customerId ||
          note?.customer?._id ||
          note?.customer?.id ||
          note?.customer ||
          ""
        ).trim();
        const customerName = String(
          note?.customerName ||
          note?.customer?.displayName ||
          note?.customer?.companyName ||
          note?.customer?.name ||
          ""
        ).trim();
        const currency = String(note?.currency || "AMD").trim() || "AMD";
        const debitNoteNumber = String(note?.debitNoteNumber || note?.invoiceNumber || "").trim();
        const associatedInvoiceId = String(
          note?.associatedInvoiceId ||
          note?.invoiceId ||
          note?.invoice?._id ||
          note?.invoice?.id ||
          ""
        ).trim();
        const associatedInvoiceNumber = String(note?.associatedInvoiceNumber || "").trim();
        const noteDate = note?.debitNoteDate || note?.date || note?.invoiceDate || new Date().toISOString();
        const noteDueDate = note?.dueDate || noteDate;
        const noteItems = Array.isArray(note?.items) ? note.items : [];

        if (cancelled) return;

        setFormData((prev) => ({
          ...prev,
          customerName: customerName || prev.customerName,
          reason: String(note?.reason || prev.reason || ""),
          location: String(note?.location || prev.location || "Head Office"),
          debitNoteNumber: debitNoteNumber || prev.debitNoteNumber,
          orderNumber: String(note?.orderNumber || prev.orderNumber || ""),
          debitNoteDate: formatDate(new Date(noteDate)),
          term: String(note?.term || prev.term || defaultPaymentTerms[2]?.value || "due-on-receipt"),
          dueDate: formatDate(new Date(noteDueDate)),
          earlyPaymentDays: String(note?.earlyPaymentDays || prev.earlyPaymentDays || ""),
          earlyPaymentPercent: Number(note?.earlyPaymentPercent || prev.earlyPaymentPercent || 0),
          salesperson: String(note?.salesperson || prev.salesperson || ""),
          customField: String(note?.customField || prev.customField || "None"),
          subject: String(note?.subject || prev.subject || ""),
          taxMode: String(note?.taxExclusive || note?.taxMode || prev.taxMode || "Tax Exclusive"),
          priceList: String(note?.priceList || prev.priceList || "Select Price List"),
          customerNotes: String(note?.customerNotes || note?.notes || prev.customerNotes || ""),
          termsAndConditions: String(note?.termsAndConditions || prev.termsAndConditions || ""),
          attachedFiles: Array.isArray(note?.attachedFiles)
            ? note.attachedFiles
            : Array.isArray(note?.attachments)
              ? note.attachments
              : prev.attachedFiles,
          displayAttachmentsInPortalEmails: Boolean(
            note?.displayAttachmentsInPortalEmails ?? prev.displayAttachmentsInPortalEmails ?? true
          ),
          discount: Number(note?.discount || prev.discount || 0),
          discountType: String(note?.discountType || prev.discountType || "percent"),
          shippingCharges: Number(note?.shippingCharges || prev.shippingCharges || 0),
          adjustment: Number(note?.adjustment || prev.adjustment || 0),
          currency,
        }));

        setItems(
          noteItems.length > 0
            ? noteItems.map((item: any, index: number) => ({
                id: Number(item?.id || item?._id || index + 1),
                description: String(item?.description || item?.name || item?.itemDetails || ""),
                rate: Number(item?.rate ?? item?.unitPrice ?? 0),
                baseRate: Number(item?.baseRate ?? item?.rate ?? item?.unitPrice ?? 0),
                tax: String(item?.tax || item?.taxId || ""),
                amount: Number(item?.amount ?? item?.total ?? 0),
              }))
            : [{ id: Date.now(), description: "", rate: 0, baseRate: 0, tax: "", amount: 0 }]
        );
        setItemAccountSelections(
          noteItems.reduce((acc: Record<number, string>, item: any, index: number) => {
            const id = Number(item?.id || item?._id || index + 1);
            acc[id] = String(item?.account || item?.accountName || "");
            return acc;
          }, {})
        );
        setItemProjectSelections(
          noteItems.reduce((acc: Record<number, string>, item: any, index: number) => {
            const id = Number(item?.id || item?._id || index + 1);
            acc[id] = String(item?.projectName || item?.project || item?.projectId || "");
            return acc;
          }, {})
        );
        setItemDiscountSelections(
          noteItems.reduce((acc: Record<number, string>, item: any, index: number) => {
            const id = Number(item?.id || item?._id || index + 1);
            acc[id] = String(item?.discountAccount || item?.discount || item?.discountType || "");
            return acc;
          }, {})
        );

        setSelectedCustomer({
          id: customerId,
          _id: customerId,
          customerId,
          name: customerName,
          displayName: customerName,
          companyName: customerName,
          email: String(note?.customerEmail || note?.email || ""),
          currency,
        });

        let invoiceRows: any[] = [];
        if (customerId) {
          try {
            const response = await invoicesAPI.getByCustomer(customerId);
            invoiceRows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
          } catch {
            invoiceRows = [];
          }
        }
        setInvoiceOptions(invoiceRows);

        const matchedInvoice =
          invoiceRows.find((row: any) => String(row?.id || row?._id || "").trim() === associatedInvoiceId) ||
          invoiceRows.find((row: any) => String(row?.invoiceNumber || row?.number || "").trim() === associatedInvoiceNumber) ||
          null;

        const nextSelectedInvoice = String(
          matchedInvoice?.invoiceNumber ||
          matchedInvoice?.number ||
          associatedInvoiceNumber ||
          ""
        ).trim();
        setSelectedInvoice(nextSelectedInvoice);
      } catch (error) {
        console.error("Error loading debit note for edit:", error);
        toast.error("Failed to load debit note for editing.");
        navigate("/sales/invoices");
      } finally {
        if (!cancelled) {
          setIsLoadingDebitNote(false);
        }
      }
    };

    void loadDebitNote();

    return () => {
      cancelled = true;
    };
  }, [debitNoteId, isEditMode, navigate]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Debit Note Date Picker
      if (debitNoteDatePickerRef.current && !debitNoteDatePickerRef.current.contains(event.target as Node)) {
        setIsDebitNoteDatePickerOpen(false);
      }
      // Due Date Picker
      if (dueDatePickerRef.current && !dueDatePickerRef.current.contains(event.target as Node)) {
        setIsDueDatePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(target)) {
        setIsBulkActionsOpen(false);
      }
      const clickedInsideTax = Object.values(taxDropdownRefs.current).some((el) => el && el.contains(target));
      if (!clickedInsideTax) setOpenTaxDropdowns({});
      if (additionalInfoMenuRef.current && !additionalInfoMenuRef.current.contains(target)) {
        setActiveAdditionalInfoMenu(null);
        setAdditionalInfoSearch("");
      }
      if (additionalInfoReportingRef.current && !additionalInfoReportingRef.current.contains(target)) {
        if (activeAdditionalInfoMenu?.type === "reporting") {
          setActiveAdditionalInfoMenu(null);
        }
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(target)) {
        setIsReasonDropdownOpen(false);
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(target)) {
        setIsSalespersonDropdownOpen(false);
      }
      if (taxModeDropdownRef.current && !taxModeDropdownRef.current.contains(target)) {
        setIsTaxModeDropdownOpen(false);
      }
      if (priceListDropdownRef.current && !priceListDropdownRef.current.contains(target)) {
        setIsPriceListDropdownOpen(false);
      }
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(target)) {
        setIsInvoiceDropdownOpen(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(target)) {
        setIsLocationDropdownOpen(false);
      }
      if (attachmentCountDropdownRef.current && !attachmentCountDropdownRef.current.contains(target)) {
        setIsAttachmentCountOpen(false);
      }
      const clickedInsideHeaderReportingTag = Object.values(headerReportingTagDropdownRefs.current).some(
        (el) => el && el.contains(target)
      );
      if (!clickedInsideHeaderReportingTag) {
        setActiveHeaderReportingTagKey(null);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [activeAdditionalInfoMenu?.type, activeHeaderReportingTagKey]);

  const handleCustomerSelect = async (customer: CustomerOption) => {
    const customerName = getCustomerPrimaryName(customer);
    const customerCurrency = getCustomerCurrency(customer);
    const customerId = getCustomerId(customer);
    setSelectedCustomer(customer);
    setField("customerName", customerName);
    if (customerCurrency) setField("currency", customerCurrency);
    setInvoiceOptions([]);
    setSelectedInvoice("");
    setIsInvoiceDropdownOpen(false);
    setInvoiceSearch("");
    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");

    if (customerId) {
      try {
        const response = await invoicesAPI.getByCustomer(customerId);
        const rows = Array.isArray(response?.data) ? response.data : [];
        setInvoiceOptions(rows);
      } catch {
        // Fallback to customer-embedded invoice references when invoice API fails.
      }
      return;
    }

    const embeddedInvoices = Array.isArray(customer?.invoices)
      ? customer.invoices
      : Array.isArray(customer?.invoiceNumbers)
        ? customer.invoiceNumbers
        : Array.isArray(customer?.invoiceRefs)
          ? customer.invoiceRefs
          : [];
    setInvoiceOptions(embeddedInvoices.map(inv => typeof inv === 'string' ? { invoiceNumber: inv } : inv));
  };

  useEffect(() => {
    const customerId = getCustomerId(selectedCustomer || {});
    if (!customerId) {
      setAvailableProjects([]);
      return;
    }

    let cancelled = false;
    const loadProjectsForCustomer = async () => {
      try {
        const response = await projectsAPI.getByCustomer(customerId);
        const rows = Array.isArray((response as any)?.data)
          ? (response as any).data
          : Array.isArray((response as any)?.projects)
            ? (response as any).projects
            : [];
        const normalized = rows
          .map((project: any, index: number) => ({
            id: String(project?.id || project?._id || `project-${index}`),
            name: String(project?.projectName || project?.name || "Project").trim(),
          }))
          .filter((project: any) => project.id && project.name);
        if (!cancelled) {
          setAvailableProjects(normalized);
        }
      } catch {
        if (!cancelled) {
          setAvailableProjects([]);
        }
      }
    };

    void loadProjectsForCustomer();
    return () => {
      cancelled = true;
    };
  }, [selectedCustomer]);

  const handleSalespersonSelect = (salesperson: any) => {
    setSelectedSalesperson(salesperson);
    setField("salesperson", salesperson?.name || "");
    setIsSalespersonDropdownOpen(false);
    setSalespersonSearch("");
  };

  const handleNewSalespersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSalespersonData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSaveAndSelectSalesperson = async () => {
    if (!newSalespersonData.name?.trim()) {
      toast.error("Please enter a name for the salesperson");
      return;
    }
    try {
      const response = await salespersonsAPI.create({
        name: newSalespersonData.name.trim(),
        email: newSalespersonData.email?.trim() || "",
        phone: "",
      });
      if (response?.success && response?.data) {
        const savedSalesperson = response.data;
        setSalespersons((prev) => [...prev, savedSalesperson]);
        handleSalespersonSelect(savedSalesperson);
        setNewSalespersonData({ name: "", email: "" });
        setIsNewSalespersonFormOpen(false);
        setIsManageSalespersonsOpen(false);
      }
    } catch (error: any) {
      console.error("Error saving salesperson:", error);
      toast.error(error?.message || "Error saving salesperson");
    }
  };

  const handleCancelNewSalesperson = () => {
    setNewSalespersonData({ name: "", email: "" });
    setIsNewSalespersonFormOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const currentFiles = Array.isArray(formData.attachedFiles) ? formData.attachedFiles : [];
    if (currentFiles.length + files.length > 10) {
      alert("You can upload a maximum of 10 files");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const invalidFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert("Some files exceed the 10MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newFiles = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      file,
    }));

    setFormData((prev) => ({
      ...prev,
      attachedFiles: [...(Array.isArray(prev.attachedFiles) ? prev.attachedFiles : []), ...newFiles],
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (fileId: string | number) => {
    setFormData((prev) => ({
      ...prev,
      attachedFiles: Array.isArray(prev.attachedFiles)
        ? prev.attachedFiles.filter((file: any) => file.id !== fileId)
        : [],
    }));
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (isLoadingDebitNote) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-slate-600">
        Loading debit note...
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto bg-white">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-3xl font-semibold text-slate-900">
            <FileText size={22} className="text-slate-700" />
            {isEditMode ? "Edit Debit Note" : "New Debit Note"}
          </h1>
          <div className="flex items-center gap-3">
            <button
              className="text-slate-500"
              onClick={() => navigate(isEditMode && debitNoteId ? `/sales/debit-notes/${debitNoteId}` : "/sales/invoices")}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className={`space-y-7 bg-[#fbfbfe] px-4 py-5 pb-56 ${isCustomerPanelOpen ? "lg:pr-[430px]" : ""}`}>
        <section className="max-w-[1510px] rounded-md bg-[#f7f7fb] p-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-[150px_minmax(0,1fr)_auto] items-start gap-3">
              <label className="pt-2 text-[13px] text-[#ef4444]">Customer Name*</label>
              <div className="w-full max-w-[520px] space-y-2 justify-self-stretch">
                <div className="flex w-full items-center justify-end gap-2">
                  <div className="relative w-full max-w-[470px]" ref={customerDropdownRef}>
                    <div className="flex">
                      <button
                        type="button"
                        className="h-9 flex-1 rounded-l-md border border-slate-300 bg-white px-3 text-left text-[14px] text-slate-700 focus:border-blue-400"
                        onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      >
                        {formData.customerName || "Select or add a customer"}
                      </button>
                      <button
                        type="button"
                        className="h-9 w-9 border-y border-r border-slate-300 bg-white text-slate-500"
                        onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      >
                        {isCustomerDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button type="button" className="h-9 w-9 rounded-r-md bg-[#156372] text-white hover:bg-[#0D4A52]">
                        <Search size={14} />
                      </button>
                    </div>
                    {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-100 p-2">
                          <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={customerSearch}
                              onChange={(e) => setCustomerSearch(e.target.value)}
                              className="h-8 w-full rounded-md border border-slate-300 pl-7 pr-2 text-[13px] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto p-1.5">
                          {filteredCustomers.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">No customers found.</div>
                          ) : (
                            filteredCustomers.map((customer, index) => {
                              const isSelected =
                                getCustomerId(customer) &&
                                getCustomerId(customer) === getCustomerId(selectedCustomer || {});
                              return (
                                <button
                                  type="button"
                                  key={getCustomerId(customer) || `customer-${index}`}
                                  className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${isSelected ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200" : "text-slate-800 hover:bg-slate-50"
                                    }`}
                                  onClick={() => handleCustomerSelect(customer)}
                                >
                                  <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${isSelected ? "bg-white text-slate-500" : "bg-slate-100 text-slate-500"
                                      }`}
                                  >
                                    {getCustomerInitial(customer)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[15px]">
                                      {getCustomerPrimaryName(customer)}
                                      {getCustomerCode(customer) ? (
                                        <span className={`ml-1 ${isSelected ? "text-slate-500" : "text-slate-500"}`}>
                                          | {getCustomerCode(customer)}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className={`mt-1 flex items-center gap-2 truncate text-sm ${isSelected ? "text-slate-500" : "text-slate-500"}`}>
                                      {getCustomerEmail(customer) ? (
                                        <span className="inline-flex items-center gap-1 truncate">
                                          <Mail size={12} />
                                          <span className="truncate">{getCustomerEmail(customer)}</span>
                                        </span>
                                      ) : null}
                                      {getCustomerCompany(customer) ? (
                                        <span className="inline-flex items-center gap-1 truncate">
                                          <Building2 size={12} />
                                          <span className="truncate">{getCustomerCompany(customer)}</span>
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  {isSelected ? <Check size={14} className="shrink-0" /> : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                        <button
                          type="button"
                          className="w-full border-t border-slate-100 px-3 py-2 text-left text-[13px] font-medium text-[#3b82f6] hover:bg-slate-50"
                        >
                          + New Customer
                        </button>
                      </div>
                    )}
                  </div>
                  {customerDetails ? (
                    <div className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-700">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <MapPin size={10} />
                      </span>
                      {resolvedCurrency}
                    </div>
                  ) : null}
                </div>
              </div>
              {customerDetails && !isCustomerPanelOpen ? (
                <button
                  type="button"
                  className="inline-flex w-[184px] flex-col items-start gap-1 self-start justify-self-end rounded-md bg-[#565d79] px-3 py-2 text-left text-white shadow-sm transition-colors hover:bg-[#4a516b]"
                  onClick={() => {
                    setCustomerPanelTab("details");
                    setIsCustomerPanelOpen(true);
                  }}
                >
                  <span className="text-[12px] font-semibold leading-none">
                    {customerPanelName}'s Details
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/85">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/45">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                    </span>
                    {unpaidInvoiceCount} Unpaid Invoice{unpaidInvoiceCount === 1 ? "" : "s"}
                    <ChevronRight size={12} className="ml-1" />
                  </span>
                </button>
              ) : null}
              {customerDetails ? (
                <div className="col-start-2 col-span-2 mt-1 grid max-w-[720px] grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-1 text-[13px] uppercase tracking-wide text-[#344d7d]">
                      BILLING ADDRESS
                      {hasBillingAddress ? <Pencil size={12} className="text-slate-500" /> : null}
                    </div>
                    {hasBillingAddress ? (
                      <div className="mt-1 space-y-0.5 text-sm text-slate-900">
                        {getAddressLines(billingAddress).map((line, idx) => (
                          <div key={`billing-${idx}`}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <button type="button" className="mt-2 text-sm text-[#3f66e0] hover:underline">
                        New Address
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[13px] uppercase tracking-wide text-[#344d7d]">
                      SHIPPING ADDRESS
                      {hasShippingAddress ? <Pencil size={12} className="text-slate-500" /> : null}
                    </div>
                    {hasShippingAddress ? (
                      <div className="mt-1 space-y-0.5 text-sm text-slate-900">
                        {getAddressLines(shippingAddress).map((line, idx) => (
                          <div key={`shipping-${idx}`}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <button type="button" className="mt-2 text-sm text-[#3f66e0] hover:underline">
                        New Address
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {customerDetails ? (
              <div className="grid grid-cols-[150px_minmax(0,320px)] items-center gap-3">
                <label className="text-[13px] text-slate-700">Invoice#</label>
                <div className="relative w-full max-w-[320px]" ref={invoiceDropdownRef}>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center justify-between rounded border border-gray-300 bg-white px-3 text-left text-sm focus:border-blue-400 focus:outline-none"
                    onClick={() => setIsInvoiceDropdownOpen((prev) => !prev)}
                  >
                    <span className={selectedInvoice ? "truncate text-slate-900" : "truncate text-slate-400"}>
                      {selectedInvoice || "Select Invoice"}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform ${isInvoiceDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isInvoiceDropdownOpen ? (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 p-2">
                        <div className="relative">
                          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={invoiceSearch}
                            onChange={(e) => setInvoiceSearch(e.target.value)}
                            className="h-8 w-full rounded-md border border-slate-300 pl-7 pr-2 text-[13px] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto p-1.5">
                        {filteredInvoiceOptions.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-slate-500">No invoices found.</div>
                        ) : (
                          filteredInvoiceOptions.map(({ number }, index) => {
                            const isSelected = number === selectedInvoice;
                            return (
                              <button
                                key={`${number}-${index}`}
                                type="button"
                                className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                                  isSelected
                                    ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                                    : "text-slate-800 hover:bg-slate-50"
                                }`}
                                onClick={() => handleInvoiceSelect(number)}
                              >
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                                  isSelected ? "bg-white text-slate-500" : "bg-slate-100 text-slate-500"
                                }`}>
                                  {String(number || "I").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[14px] font-medium">{number}</div>
                                  {(() => {
                                    const invObj = invoiceOptions.find(
                                      (inv) => String(inv?.invoiceNumber || inv?.number || inv?.id || inv?._id || "") === number
                                    );
                                    const invoiceDate = invObj?.date || invObj?.invoiceDate;
                                    return invoiceDate ? (
                                      <div className="mt-0.5 text-[12px] text-slate-500">Invoice Date: {formatDate(new Date(invoiceDate))}</div>
                                    ) : null;
                                  })()}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                  {selectedInvoice && (() => {
                    const invObj = invoiceOptions.find(inv => String(inv?.invoiceNumber || inv?.number || inv?.id || inv?._id || "") === selectedInvoice);
                    if (invObj && (invObj.date || invObj.invoiceDate)) {
                      return (
                    <div className="mt-1 text-[12px] text-slate-500">
                          Invoice Date: {formatDate(new Date(invObj.date || invObj.invoiceDate))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-[150px_minmax(0,320px)] items-center gap-3">
              <label className="text-[13px] text-[#ef4444]">Reason*</label>
              <div className="relative w-full max-w-[320px]" ref={reasonDropdownRef}>
                <button
                  type="button"
                  className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm bg-white flex items-center justify-between text-left"
                  onClick={() => setIsReasonDropdownOpen((prev) => !prev)}
                >
                  <span>{formData.reason || ""}</span>
                  {isReasonDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {isReasonDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={reasonSearch}
                          onChange={(e) => setReasonSearch(e.target.value)}
                          className="w-full h-9 rounded border border-gray-300 pl-7 pr-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
                      </div>
                    </div>
                    <div className="max-h-44 overflow-y-auto p-1.5">
                      {filteredReasons.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          className={`mb-1 w-full rounded px-3 py-2 text-left text-sm ${formData.reason === reason
                            ? "bg-[#4a89e8] text-white"
                            : "text-slate-700 hover:bg-slate-50"
                            }`}
                          onClick={() => {
                            setField("reason", reason);
                            setIsReasonDropdownOpen(false);
                            setReasonSearch("");
                          }}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[150px_minmax(0,320px)] items-start gap-3">
              <label className="pt-2 text-[13px] text-slate-700">Location</label>
              <div className="relative w-full max-w-[320px] space-y-1" ref={locationDropdownRef}>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded border border-gray-300 bg-white px-3 text-left text-sm focus:border-blue-400 focus:outline-none"
                  onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                >
                  <span className={formData.location ? "truncate text-slate-900" : "truncate text-slate-400"}>
                    {formData.location || "Select Location"}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform ${isLocationDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isLocationDropdownOpen ? (
                  <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          className="h-8 w-full rounded-md border border-slate-300 pl-7 pr-2 text-[13px] focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-44 overflow-y-auto p-1.5">
                      {filteredLocationOptions.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-slate-500">No locations found.</div>
                      ) : (
                        filteredLocationOptions.map((option) => {
                          const isSelected = formData.location === option;
                          return (
                            <button
                              type="button"
                              key={option}
                              className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
                                isSelected
                                  ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                                  : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                              onClick={() => {
                                setField("location", option);
                                setIsLocationDropdownOpen(false);
                                setLocationSearch("");
                              }}
                            >
                              <span className="truncate">{option}</span>
                              {isSelected ? <Check size={14} className="text-slate-500" /> : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="text-[12px] text-[#3f66e0]">Source of Supply: {formData.location}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 max-w-[1120px] pr-4 xl:pr-8">
          <div className="grid grid-cols-[150px_minmax(0,320px)] items-center gap-3">
            <label className="text-[13px] text-[#ef4444]">Debit Note Number*</label>
            <div className="relative w-full max-w-[320px]">
              <input
                className="w-full h-9 px-3 border border-gray-300 rounded bg-slate-50 text-sm text-slate-700 focus:outline-none"
                value={formData.debitNoteNumber}
                readOnly
              />
            </div>
          </div>
          <div className="grid grid-cols-[150px_minmax(0,320px)] items-center gap-3">
            <label className="text-[13px] text-slate-700">Order Number</label>
            <input className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm bg-white" value={formData.orderNumber} onChange={(e) => setField("orderNumber", e.target.value)} />
          </div>
          <div className="grid grid-cols-[150px_minmax(0,320px)_70px_150px_70px_150px] items-center gap-3">
            <label className="text-[13px] text-[#ef4444]">Debit Note Date*</label>
            <div className="relative w-full max-w-[320px]" ref={debitNoteDatePickerRef}>
              <input
                className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm bg-white cursor-pointer"
                value={formData.debitNoteDate}
                readOnly
                onClick={() => setIsDebitNoteDatePickerOpen(!isDebitNoteDatePickerOpen)}
              />
              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              {isDebitNoteDatePickerOpen && (
                <div className="absolute top-full left-0 z-50 mt-2 w-[286px] rounded-md border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigateMonth("prev", "debitNoteDate"); }}
                      className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div className="text-[15px] font-medium text-slate-700">
                      {debitNoteDateCalendar.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigateMonth("next", "debitNoteDate"); }}
                      className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="py-1 text-center text-[11px] font-semibold text-slate-400 uppercase">
                        {day}
                      </div>
                    ))}
                    {getDaysInMonth(debitNoteDateCalendar).map((day, idx) => {
                      const isSelected = formData.debitNoteDate === formatDate(day.fullDate);
                      const isToday = formatDate(new Date()) === formatDate(day.fullDate);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDateSelect(day.fullDate, "debitNoteDate"); }}
                          className={`h-8 w-8 rounded text-[13px] transition-colors ${day.month === 'current' ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-600' : 'text-slate-300'} ${isSelected ? 'bg-blue-600 font-semibold !text-white' : ''} ${isToday && !isSelected ? 'border border-blue-200 bg-blue-50/50 text-blue-600' : ''}`}
                        >
                          {day.date}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[13px] text-slate-700">Terms</span>
            <div className="w-full" ref={paymentTermsDropdownRef}>
              <PaymentTermsDropdown
                value={selectedPaymentTerm}
                onChange={(value) => applyPaymentTerm(value)}
                customTerms={paymentTerms}
                onConfigureTerms={() => setIsConfigureTermsOpen(true)}
              />
            </div>
            <span className="text-[13px] text-slate-700">Due Date</span>
            <div className="relative w-full max-w-[150px]" ref={dueDatePickerRef}>
              <input
                className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm bg-white cursor-pointer"
                value={formData.dueDate}
                readOnly
                onClick={() => setIsDueDatePickerOpen(!isDueDatePickerOpen)}
              />
              {isDueDatePickerOpen && (
                <div className="absolute top-full left-0 z-50 mt-2 w-[286px] rounded-md border border-slate-200 bg-white p-3 shadow-xl">
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
                  <div className="grid grid-cols-7 gap-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="py-1 text-center text-[11px] font-semibold text-slate-400 uppercase">
                        {day}
                      </div>
                    ))}
                    {getDaysInMonth(dueDateCalendar).map((day, idx) => {
                      const isSelected = formData.dueDate === formatDate(day.fullDate);
                      const isToday = formatDate(new Date()) === formatDate(day.fullDate);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDateSelect(day.fullDate, "dueDate"); }}
                          className={`h-8 w-8 rounded text-[13px] transition-colors ${day.month === 'current' ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-600' : 'text-slate-300'} ${isSelected ? 'bg-blue-600 font-semibold !text-white' : ''} ${isToday && !isSelected ? 'border border-blue-200 bg-blue-50/50 text-blue-600' : ''}`}
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
          <div className="grid grid-cols-[150px_minmax(0,320px)] items-center gap-3">
            <label className="flex items-center gap-1 text-[13px] text-slate-700">Early Payment Discount <Info size={13} className="text-slate-400" /></label>
            <div className="grid grid-cols-[120px_52px_120px_34px] gap-2 max-w-[320px]">
              <input className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm bg-white" value={formData.earlyPaymentDays} onChange={(e) => setField("earlyPaymentDays", e.target.value)} />
              <div className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm">Days</div>
              <input type="number" className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm bg-white text-right" value={formData.earlyPaymentPercent} onChange={(e) => setField("earlyPaymentPercent", Number(e.target.value || 0))} />
              <div className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm">%</div>
            </div>
          </div>
          <div className="grid grid-cols-[150px_minmax(0,320px)] items-center gap-3 border-t border-slate-200 pt-4">
            <label className="text-[13px] text-slate-700">Salesperson</label>
            <div className="relative w-full max-w-[320px]" ref={salespersonDropdownRef}>
              <button
                type="button"
                className="flex h-9 w-full items-center justify-between rounded border border-gray-300 bg-white px-3 text-left text-sm focus:border-blue-400 focus:outline-none"
                onClick={() => setIsSalespersonDropdownOpen((prev) => !prev)}
              >
                <span className={formData.salesperson ? "text-slate-900" : "text-slate-400"}>
                  {formData.salesperson || "Select or Add Salesperson"}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {isSalespersonDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-200 p-2">
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <Search size={14} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={salespersonSearch}
                      onChange={(e) => setSalespersonSearch(e.target.value)}
                      className="w-full border-0 p-0 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
                      autoFocus
                    />
                  </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1.5">
                    {filteredSalespersons.length > 0 ? (
                      filteredSalespersons.map((salesperson) => (
                        <button
                          key={salesperson?.id || salesperson?._id || salesperson?.name}
                          type="button"
                          className="block w-full truncate rounded-md px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => handleSalespersonSelect(salesperson)}
                        >
                          {salesperson?.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm italic text-slate-500">No salespersons found</div>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-medium text-[#156372] hover:bg-slate-50 cursor-pointer"
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
          {availableReportingTags.map((tag) => (
            <div key={`header-reporting-${tag.key}`} className="grid grid-cols-[150px_minmax(0,320px)] items-center gap-3 border-t border-slate-200 pt-4">
              <label className="text-[13px] text-[#ef4444]">{tag.label} *</label>
              <div className="relative w-full max-w-[320px]" ref={(el) => {
                headerReportingTagDropdownRefs.current[tag.key] = el;
              }}>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded border border-gray-300 bg-white px-3 text-left text-sm focus:border-blue-400 focus:outline-none"
                  onClick={() =>
                    setActiveHeaderReportingTagKey((prev) => (prev === tag.key ? null : tag.key))
                  }
                >
                  <span className={headerReportingTagSelections[tag.key] || tag.options[0] ? "text-slate-900" : "text-slate-400"}>
                    {headerReportingTagSelections[tag.key] || tag.options[0] || "Select"}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform ${activeHeaderReportingTagKey === tag.key ? "rotate-180" : ""}`}
                  />
                </button>
                {activeHeaderReportingTagKey === tag.key ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="max-h-60 overflow-y-auto p-1.5">
                      {tag.options.length > 0 ? (
                        tag.options.map((option) => {
                          const isSelected = (headerReportingTagSelections[tag.key] || tag.options[0] || "") === option;
                          return (
                            <button
                              key={`${tag.key}-${option}`}
                              type="button"
                              className={`block w-full truncate rounded-md px-4 py-2 text-left text-sm transition-colors ${
                                isSelected
                                  ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                              onClick={() => {
                                setHeaderReportingTagSelections((prev) => ({
                                  ...prev,
                                  [tag.key]: option,
                                }));
                                setActiveHeaderReportingTagKey(null);
                              }}
                            >
                              {option}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-4 py-2 text-sm italic text-slate-500">No options available</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[150px_minmax(0,320px)] items-start gap-3 border-t border-slate-200 pt-4">
            <label className="pt-2 text-[13px] text-slate-700">Subject</label>
            <textarea className="h-16 w-full max-w-[320px] rounded-md border border-gray-300 px-3 py-2 text-sm bg-white" placeholder="Let your customer know what this Debit Note is for" value={formData.subject} onChange={(e) => setField("subject", e.target.value)} />
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-4 max-w-[1120px]">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="relative" ref={taxModeDropdownRef}>
              <button
                type="button"
                className="flex h-9 w-[118px] items-center justify-between rounded border border-gray-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                onClick={() => {
                  setIsPriceListDropdownOpen(false);
                  setIsTaxModeDropdownOpen((prev) => !prev);
                }}
              >
                <span className="truncate">{formData.taxMode || "Tax Exclusive"}</span>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${isTaxModeDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isTaxModeDropdownOpen ? (
                <div className="absolute left-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <div className="p-1.5">
                    {["Tax Exclusive", "Tax Inclusive"].map((option) => {
                      const isSelected = formData.taxMode === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`block w-full truncate rounded-md px-4 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                          onClick={() => {
                            setField("taxMode", option);
                            setIsTaxModeDropdownOpen(false);
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={priceListDropdownRef}>
              <button
                type="button"
                className="flex h-9 w-[128px] items-center justify-between rounded border border-gray-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                onClick={() => {
                  setIsTaxModeDropdownOpen(false);
                  setIsPriceListDropdownOpen((prev) => !prev);
                }}
              >
                <span className={formData.priceList && formData.priceList !== "Select Price List" ? "truncate text-slate-900" : "truncate text-slate-400"}>
                  {formData.priceList || "Select Price List"}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${isPriceListDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isPriceListDropdownOpen ? (
                <div className="absolute left-0 top-full z-50 mt-1 w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <div className="max-h-60 overflow-y-auto p-1.5">
                    <button
                      type="button"
                      className={`block w-full truncate rounded-md px-4 py-2 text-left text-sm transition-colors ${
                        !formData.priceList || formData.priceList === "Select Price List"
                          ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      onClick={() => {
                        setField("priceList", "Select Price List");
                        setIsPriceListDropdownOpen(false);
                      }}
                    >
                      Select Price List
                    </button>
                    {catalogPriceLists.map((priceList) => {
                      const isSelected = formData.priceList === priceList.name;
                      return (
                        <button
                          key={priceList.id}
                          type="button"
                          className={`block w-full truncate rounded-md px-4 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                          onClick={() => {
                            setField("priceList", priceList.name);
                            setIsPriceListDropdownOpen(false);
                          }}
                        >
                          {priceList.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="max-w-[1000px] overflow-visible rounded-xl border border-slate-200 bg-white relative z-20">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-[14px] font-semibold text-slate-800">Item Table</h2>
              <div className="flex items-center gap-4 text-sm text-[#2563eb]">
                <button className="inline-flex items-center gap-1"><Search size={14} />Scan Item</button>
                <div className="relative" ref={bulkActionsRef}>
                  <button className="inline-flex items-center gap-1" onClick={() => setIsBulkActionsOpen((prev) => !prev)}>
                    <Check size={14} />Bulk Actions
                  </button>
                  {isBulkActionsOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
                      <button
                        type="button"
                        className="mx-1 mt-1 flex w-[calc(100%-8px)] items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-left text-[13px] font-medium text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        onClick={() => {
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
                          const allVisible = items.length > 0 && items.every((item) => itemsWithAdditionalInfo.has(item.id));
                          if (allVisible) setItemsWithAdditionalInfo(new Set());
                          else setItemsWithAdditionalInfo(new Set(items.map((item) => item.id)));
                          setIsBulkActionsOpen(false);
                        }}
                      >
                        {items.length > 0 && items.every((item) => itemsWithAdditionalInfo.has(item.id))
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
                    onClick={() => setActiveBulkUpdateAction("project")}
                  >
                    Update Project
                  </button>
                  <button
                    type="button"
                    className={`rounded-md bg-[#1fb374] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#18a067] ${activeBulkUpdateAction === "reporting" ? "ring-2 ring-[#2f6fed] ring-offset-1" : ""}`}
                    onClick={() => {
                      setActiveBulkUpdateAction("reporting");
                      setItemsWithAdditionalInfo(new Set(items.map((item) => item.id)));
                    }}
                  >
                    Update Reporting Tags
                  </button>
                  <button
                    type="button"
                    className={`rounded-md bg-[#1fb374] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#18a067] ${activeBulkUpdateAction === "account" ? "ring-2 ring-[#2f6fed] ring-offset-1" : ""}`}
                    onClick={() => setActiveBulkUpdateAction("account")}
                  >
                    Update Account
                  </button>
                </div>
                <button
                  type="button"
                  className="text-[#3b82f6] hover:text-[#2563eb]"
                  onClick={() => {
                    setIsBulkUpdateLineItemsActive(false);
                    setActiveBulkUpdateAction("project");
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="w-8" />
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">DESCRIPTION</th>
                  <th className="w-28 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">RATE</th>
                  <th className="w-40 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">TAX</th>
                  <th className="w-28 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">AMOUNT</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="border-b border-slate-200">
                      <td className="text-center text-slate-300">::</td>
                      <td className="px-3 py-3">
                        <textarea className="h-11 w-full resize-none border-none text-[14px] outline-none" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                      </td>
                      <td className="px-3 py-3">
                        <input type="number" className="ml-auto h-9 w-[88px] rounded-md border border-slate-300 px-2 text-right text-[14px]" value={item.rate} onChange={(e) => updateItem(item.id, { rate: Number(e.target.value || 0) })} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="relative w-[150px]" ref={(el) => { taxDropdownRefs.current[item.id] = el; }}>
                          <button
                            type="button"
                            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 text-left text-sm transition"
                            onClick={() => setOpenTaxDropdowns((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                          >
                            <span className={`${item.tax ? "text-slate-700" : "text-slate-400"} truncate`}>
                              {item.tax || "Select a Tax"}
                            </span>
                            <ChevronDown
                              size={14}
                              className={`text-slate-400 transition-transform ${openTaxDropdowns[item.id] ? "rotate-180" : ""}`}
                              style={{ color: "#156372" }}
                            />
                          </button>
                          {openTaxDropdowns[item.id] && (
                            <div className="absolute left-0 top-full z-[140] mt-1 w-72 rounded-xl border border-[#d6dbe8] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                              <div className="p-2">
                                <div className="flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: "#156372" }}>
                                  <Search size={14} className="text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder="Search..."
                                    value={taxSearches[item.id] || ""}
                                    onChange={(e) => setTaxSearches((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                    className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                                {(() => {
                                  const searchValue = String(taxSearches[item.id] || "").trim().toLowerCase();
                                  const grouped = getFilteredTaxGroups(item.id);
                                  const filteredGroups = searchValue
                                    ? grouped
                                        .map((group) => ({
                                          ...group,
                                          options: group.options.filter((tax) =>
                                            `${taxLabel(tax.raw)} [${tax.rate}%]`.toLowerCase().includes(searchValue)
                                          ),
                                        }))
                                        .filter((group) => group.options.length > 0)
                                    : grouped;
                                  const hasTaxes = filteredGroups.some((group) => group.options.length > 0);

                                  return !hasTaxes ? (
                                    <div className="px-4 py-3 text-center text-[13px] text-slate-400">No taxes found</div>
                                  ) : (
                                    filteredGroups.map((group) => (
                                      <div key={group.label}>
                                        <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-700">
                                          {group.label}
                                        </div>
                                        {group.options.map((tax) => {
                                          const label = taxLabel(tax.raw);
                                          const selected = item.tax === label;
                                          return (
                                            <button
                                              key={`${item.id}-${tax.id}`}
                                              type="button"
                                              onClick={() => {
                                                updateItem(item.id, { tax: label });
                                                setOpenTaxDropdowns((prev) => ({ ...prev, [item.id]: false }));
                                                setTaxSearches((prev) => ({ ...prev, [item.id]: "" }));
                                              }}
                                              className={`w-full px-4 py-2 text-left text-[13px] ${
                                                selected
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
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{Number(item.amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-center">
                        <button className="text-red-500" onClick={() => removeRow(item.id)}><X size={16} /></button>
                      </td>
                    </tr>
                    {itemsWithAdditionalInfo.has(item.id) && (
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <td />
                        <td colSpan={5} className="px-3 py-2 text-[14px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-3" ref={additionalInfoMenuRef}>
                            <div className="relative">
                              <button
                                type="button"
                                className={`inline-flex h-8 items-center gap-1.5 rounded border px-2 text-[14px] transition-colors ${activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "account"
                                  ? "border-slate-300 bg-white text-slate-900"
                                  : "border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                onClick={() => {
                                  setActiveAdditionalInfoMenu((prev) =>
                                    prev?.itemId === item.id && prev.type === "account" ? null : { itemId: item.id, type: "account" }
                                  );
                                }}
                              >
                                <BriefcaseBusiness size={13} className="text-slate-500" />
                                <span>{itemAccountSelections[item.id] || "Select an account"}</span>
                                <ChevronDown size={13} className="text-slate-500" />
                              </button>
                              {activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "account" && (
                                <div className="absolute left-0 top-full z-[170] mt-1 w-[280px] rounded-md border border-slate-200 bg-white shadow-xl">
                                  <div className="border-b border-slate-100 p-2">
                                    <div className="relative">
                                      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        value={additionalInfoSearch}
                                        onChange={(e) => setAdditionalInfoSearch(e.target.value)}
                                        className="h-8 w-full rounded border border-[#3b82f6] pl-7 pr-2 text-sm focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-56 overflow-y-auto py-1">
                                    {filteredGroupedAccountOptions.length > 0 ? (
                                      filteredGroupedAccountOptions.map((group) => (
                                        <div key={group.group}>
                                          <div className="px-3 py-1 text-sm font-semibold text-slate-700">{group.group}</div>
                                          {group.options.map((option) => (
                                            <button
                                              key={option}
                                              type="button"
                                              className={`w-full px-3 py-1.5 text-left text-sm ${itemAccountSelections[item.id] === option
                                                ? "bg-[#4a89e8] text-white"
                                                : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                              onClick={() => {
                                                setItemAccountSelections((prev) => ({ ...prev, [item.id]: option }));
                                                setActiveAdditionalInfoMenu(null);
                                                setAdditionalInfoSearch("");
                                              }}
                                            >
                                              {option}
                                            </button>
                                          ))}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-slate-500">NO RESULTS FOUND</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="relative">
                              <button
                                type="button"
                                className={`inline-flex h-8 items-center gap-1.5 rounded border px-2 text-[14px] transition-colors ${activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "discount"
                                  ? "border-slate-300 bg-white text-slate-900"
                                  : "border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                onClick={() => {
                                  setAdditionalInfoSearch("");
                                  setActiveAdditionalInfoMenu((prev) =>
                                    prev?.itemId === item.id && prev.type === "discount" ? null : { itemId: item.id, type: "discount" }
                                  );
                                }}
                              >
                                <Tag size={13} className="text-slate-500" />
                                <span>{itemDiscountSelections[item.id] || "Discount"}</span>
                                <ChevronDown size={13} className="text-slate-500" />
                              </button>
                              {activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "discount" && (
                                <div className="absolute left-0 top-full z-[180] mt-1 w-[340px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                                  <div className="border-b border-slate-100 p-2">
                                    <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                                      <Search size={14} className="text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        value={additionalInfoSearch}
                                        onChange={(e) => setAdditionalInfoSearch(e.target.value)}
                                        className="w-full border-0 p-0 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto py-1">
                                    {discountAccountGroups.length > 0 ? (
                                      discountAccountGroups.map((group) => (
                                        <div key={group.title}>
                                          <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-700">
                                            {group.title}
                                          </div>
                                          {group.items.map((option) => {
                                            const isSelected = itemDiscountSelections[item.id] === option;
                                            return (
                                              <button
                                                key={`${group.title}-${option}`}
                                                type="button"
                                                className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                                                  isSelected
                                                    ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                                }`}
                                                onClick={() => {
                                                  setItemDiscountSelections((prev) => ({ ...prev, [item.id]: option }));
                                                  setActiveAdditionalInfoMenu(null);
                                                  setAdditionalInfoSearch("");
                                                }}
                                              >
                                                {option}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="px-4 py-2 text-sm text-slate-500">No options found</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="relative">
                              <button
                                type="button"
                                className={`inline-flex h-8 items-center gap-1.5 rounded border px-2 text-[14px] transition-colors ${activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "project"
                                  ? "border-slate-300 bg-white text-slate-900"
                                  : "border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                onClick={() => {
                                  setActiveAdditionalInfoMenu((prev) =>
                                    prev?.itemId === item.id && prev.type === "project" ? null : { itemId: item.id, type: "project" }
                                  );
                                }}
                              >
                                <BriefcaseBusiness size={13} className="text-slate-500" />
                                <span>{itemProjectSelections[item.id] || "Select a project"}</span>
                                <ChevronDown size={13} className="text-slate-500" />
                              </button>
                              {activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "project" && (
                                <div className="absolute left-0 top-full z-[180] mt-1 w-[280px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                                  <div className="max-h-60 overflow-y-auto py-1">
                                    <button
                                      type="button"
                                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                                        !itemProjectSelections[item.id]
                                          ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                      }`}
                                      onClick={() => {
                                        setItemProjectSelections((prev) => ({ ...prev, [item.id]: "" }));
                                        setActiveAdditionalInfoMenu(null);
                                      }}
                                    >
                                      Select a project
                                    </button>
                                    {availableProjects.length > 0 ? (
                                      availableProjects.map((project: any) => (
                                        <button
                                          key={project.id}
                                          type="button"
                                          className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                                            itemProjectSelections[item.id] === project.name
                                              ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                          }`}
                                          onClick={() => {
                                            setItemProjectSelections((prev) => ({ ...prev, [item.id]: project.name }));
                                            setActiveAdditionalInfoMenu(null);
                                          }}
                                        >
                                          {project.name}
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-4 py-2 text-sm italic text-slate-500">No projects found</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="relative z-[180]" ref={additionalInfoReportingRef}>
                              <button
                                type="button"
                                className="inline-flex h-8 items-center gap-1.5 rounded border border-transparent px-2 text-[14px] hover:border-slate-300"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => {
                                  const current = itemReportingTagSelections[item.id] || {};
                                  const initialDraft: Record<string, string> = {};
                                  availableReportingTags.forEach((tag) => {
                                    initialDraft[tag.key] = current[tag.key] || tag.options[0] || "";
                                  });
                                  setReportingTagDraft(initialDraft);
                                  setActiveAdditionalInfoMenu((prev) =>
                                    prev?.itemId === item.id && prev.type === "reporting" ? null : { itemId: item.id, type: "reporting" }
                                  );
                                }}
                              >
                                <Tag size={13} className="text-slate-500" />
                                <span>
                                  {(() => {
                                    const selected = itemReportingTagSelections[item.id] || {};
                                    const selectedCount = availableReportingTags.filter((tag) => {
                                      const value = String(selected[tag.key] || "").trim().toLowerCase();
                                      return value && value !== "none";
                                    }).length;
                                    return availableReportingTags.length > 0
                                      ? `Reporting Tags : ${selectedCount} out of ${availableReportingTags.length} selected.`
                                      : "Reporting Tags";
                                  })()}
                                </span>
                                <ChevronDown size={13} className="text-slate-500" />
                              </button>
                              {activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "reporting" && (
                                <div
                                  className="absolute left-0 top-full z-[190] mt-1 w-[480px] rounded-md border border-slate-200 bg-white shadow-xl"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <div className="border-b border-slate-200 px-4 py-3 text-[24px] text-slate-700">Reporting Tags</div>
                                  <div className="space-y-3 px-4 py-4">
                                    {availableReportingTags.length === 0 ? (
                                      <p className="text-sm text-slate-500">No reporting tags found.</p>
                                    ) : (
                                      availableReportingTags.map((tag) => (
                                        <div key={tag.key} className="space-y-2">
                                          <label className="block text-sm text-slate-700">
                                            {tag.label}{tag.isMandatory ? " *" : ""}
                                          </label>
                                          <select
                                            className="h-10 w-[260px] rounded-md border border-[#3b82f6] bg-white px-3 text-sm"
                                            value={reportingTagDraft[tag.key] ?? tag.options[0] ?? ""}
                                            onChange={(e) =>
                                              setReportingTagDraft((prev) => ({ ...prev, [tag.key]: e.target.value }))
                                            }
                                          >
                                            {!tag.isMandatory && <option value="">None</option>}
                                            {tag.options.length > 0 ? (
                                              tag.options.map((option) => (
                                                <option key={`${tag.key}-${option}`} value={option}>
                                                  {option}
                                                </option>
                                              ))
                                            ) : (
                                              <option value="" disabled>No options available</option>
                                            )}
                                          </select>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-3">
                                    <button
                                      type="button"
                                      className="rounded-md bg-[#156372] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0D4A52]"
                                      onClick={() => {
                                        const mandatoryMissing = availableReportingTags.find((tag) => {
                                          if (!tag.isMandatory) return false;
                                          const value = String(reportingTagDraft[tag.key] || "").trim();
                                          return !value;
                                        });
                                        if (mandatoryMissing) {
                                          alert(`${mandatoryMissing.label} is required`);
                                          return;
                                        }
                                        setItemReportingTagSelections((prev) => ({ ...prev, [item.id]: reportingTagDraft }));
                                        setActiveAdditionalInfoMenu(null);
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700"
                                      onClick={() => setActiveAdditionalInfoMenu(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <button className="inline-flex h-9 items-center gap-1 rounded-md border border-[#d7deef] bg-[#eef3ff] px-4 text-[13px] font-medium text-[#1f3f79]" onClick={addRow}>
            <Plus size={14} /> Add New Row
          </button>
        </section>

        <section className="grid max-w-[1120px] grid-cols-1 gap-8 pt-3 pr-4 xl:pr-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <label className="mb-2 block text-sm font-medium text-slate-800">Customer Notes</label>
            <textarea className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-[14px]" value={formData.customerNotes} onChange={(e) => setField("customerNotes", e.target.value)} />
            <p className="mt-1 text-[12px] text-slate-500">Will be displayed on the invoice</p>
            <div className="pt-2">
              <label className="mb-2 block text-sm font-medium text-slate-800">Terms & Conditions</label>
              <textarea className="h-24 w-full max-w-[720px] rounded-md border border-slate-300 px-3 py-2 text-[14px]" placeholder="Enter the terms and conditions of your business to be displayed in your transaction" value={formData.termsAndConditions} onChange={(e) => setField("termsAndConditions", e.target.value)} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex justify-between text-[14px] font-semibold"><span>Sub Total</span><span>{subTotal.toFixed(2)}</span></div>
              <div className="flex justify-between items-center text-[14px]">
                <span>Discount</span>
                <div className="flex items-center gap-2">
                  <input type="number" className="h-9 w-20 rounded-md border border-gray-300 px-3 text-right text-sm bg-white" value={formData.discount} onChange={(e) => setField("discount", Number(e.target.value || 0))} />
                  <select className="h-9 rounded-md border border-gray-300 px-2 text-sm bg-white" value={formData.discountType} onChange={(e) => setField("discountType", e.target.value)}>
                    <option value="percent">%</option>
                    <option value="amount">{resolvedCurrency}</option>
                  </select>
                </div>
                <span>{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[14px]">
                <span>Shipping Charges</span>
                <div className="flex items-center gap-2">
                  <input type="number" className="h-9 w-24 rounded-md border border-gray-300 px-3 text-right text-sm bg-white" value={formData.shippingCharges} onChange={(e) => setField("shippingCharges", Number(e.target.value || 0))} />
                  <Info size={14} className="text-slate-400" />
                </div>
                <span>{Number(formData.shippingCharges || 0).toFixed(2)}</span>
              </div>
              {discountedGroupedTaxes.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  {discountedGroupedTaxes.map((tax) => (
                    <div key={tax.label} className="flex justify-between items-center text-[14px]">
                      <span>{tax.label}</span>
                      <span>{Number(tax.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center text-[14px]">
                <span>Adjustment</span>
                <div className="flex items-center gap-2">
                  <input type="number" className="h-9 w-24 rounded-md border border-gray-300 px-3 text-right text-sm bg-white" value={formData.adjustment} onChange={(e) => setField("adjustment", Number(e.target.value || 0))} />
                  <Info size={14} className="text-slate-400" />
                </div>
                <span>{Number(formData.adjustment || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-[22px] font-semibold">
                <span>Total ({resolvedCurrency})</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between text-[16px]">
                <span>Early Payment Discount</span>
                <span>0.00</span>
              </div>
              <div className="flex items-center justify-between text-[22px] font-semibold">
                <span className="text-[16px]">Total After Early Payment Discount</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid max-w-[1120px] grid-cols-1 gap-8 border-t border-slate-200 pt-5 pr-4 xl:pr-8 lg:grid-cols-[1fr_280px]">
          <div />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="space-y-3">
              <label className="block text-[14px] font-medium text-slate-800">Attach File(s) to Debit Note</label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-[#1f3f79] transition hover:bg-slate-50"
                  onClick={handleUploadClick}
                >
                  <Upload size={15} className="text-slate-500" />
                  Upload File
                  <ChevronDown size={13} className="text-slate-400" />
                </button>
                {Array.isArray(formData.attachedFiles) && formData.attachedFiles.length > 0 ? (
                  <div className="relative" ref={attachmentCountDropdownRef}>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3b82f6] px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2563eb]"
                      onClick={() => setIsAttachmentCountOpen((prev) => !prev)}
                    >
                      <Paperclip size={12} />
                      {formData.attachedFiles.length}
                    </button>
                    {isAttachmentCountOpen ? (
                      <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                        {formData.attachedFiles.map((file: any) => (
                          <div
                            key={file.id}
                            className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
                          >
                            <div className="flex min-w-0 items-start gap-2">
                              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                                <FileText size={13} />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-medium text-slate-700">{file.name}</div>
                                <div className="text-[12px] text-slate-500">File Size: {formatFileSize(Number(file.size || 0))}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(file.id)}
                              className="mt-0.5 rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  name="displayAttachmentsInPortalEmails"
                  checked={Boolean((formData as any).displayAttachmentsInPortalEmails)}
                  onChange={(e) => setField("displayAttachmentsInPortalEmails", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#156372] focus:ring-[#156372]"
                />
                <span>Display attachments in Customer Portal and emails</span>
              </label>
              <p className="text-[11px] text-slate-500">You can upload a maximum of 10 files, 10MB each</p>
            </div>
          </div>
        </section>
      </div >

      <div className={`sticky bottom-0 z-10 flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 ${isCustomerPanelOpen ? "lg:pr-[430px]" : ""}`}>
        <div className="flex items-center gap-3">
          <button
            className="h-10 rounded-md border border-slate-300 bg-white px-4 text-[14px] disabled:opacity-50"
            onClick={() => handleSave("draft")}
            disabled={!!saveLoading}
          >
            {saveLoading === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#156372] px-4 text-[14px] font-semibold text-white hover:bg-[#0D4A52] disabled:opacity-50"
            onClick={() => handleSave("sent")}
            disabled={!!saveLoading}
          >
            {saveLoading === "send" ? "Saving..." : isEditMode ? "Save Changes" : "Save and Send"} <ChevronDown size={14} />
          </button>
          <button
            className="h-10 rounded-md border border-slate-300 bg-white px-4 text-[14px]"
            onClick={() => navigate(isEditMode && debitNoteId ? `/sales/debit-notes/${debitNoteId}` : "/sales/invoices")}
          >
            Cancel
          </button>
        </div>
        <div className="text-right text-[14px]">
          <div>Total Amount: {resolvedCurrency} {total.toFixed(2)}</div>
        </div>
      </div>

      {invoiceId ? (
        <div className="fixed bottom-4 right-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 shadow">
          Source Invoice: {invoiceId}
        </div>
      ) : null}

      {isManageSalespersonsOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-3"
          onClick={() => {
            setIsManageSalespersonsOpen(false);
            setIsNewSalespersonFormOpen(false);
            setNewSalespersonData({ name: "", email: "" });
          }}
        >
          <div
            className="flex h-[52vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <h2 className="text-lg font-semibold text-slate-900">Manage Salespersons</h2>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setIsManageSalespersonsOpen(false);
                  setIsNewSalespersonFormOpen(false);
                  setNewSalespersonData({ name: "", email: "" });
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <div className="relative w-full max-w-md">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Salesperson"
                  value={salespersonSearch}
                  onChange={(e) => setSalespersonSearch(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#156372]"
                />
              </div>
              <button
                type="button"
                className="ml-4 inline-flex items-center gap-2 rounded-md bg-[#156372] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0D4A52]"
                onClick={() => setIsNewSalespersonFormOpen(true)}
              >
                <Plus size={16} />
                New Salesperson
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {isNewSalespersonFormOpen ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Add New Salesperson</h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-red-600">Name*</label>
                      <input
                        type="text"
                        name="name"
                        value={newSalespersonData.name}
                        onChange={handleNewSalespersonChange}
                        className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-[#156372]"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-red-600">Email*</label>
                      <input
                        type="email"
                        name="email"
                        value={newSalespersonData.email}
                        onChange={handleNewSalespersonChange}
                        className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-[#156372]"
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="flex gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={handleSaveAndSelectSalesperson}
                        className="rounded-md bg-[#156372] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0D4A52]"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelNewSalesperson}
                        className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                {filteredSalespersons.length > 0 ? (
                  filteredSalespersons.map((salesperson) => (
                    <button
                      key={salesperson?.id || salesperson?._id || salesperson?.name}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => {
                        handleSalespersonSelect(salesperson);
                        setIsManageSalespersonsOpen(false);
                        setIsNewSalespersonFormOpen(false);
                      }}
                    >
                      <span className="truncate">{salesperson?.name}</span>
                      {formData.salesperson === salesperson?.name ? (
                        <Check size={16} className="text-slate-500" />
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm italic text-slate-500">No salespersons found</div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isCustomerPanelOpen && customerDetails ? (
        <aside className="fixed right-0 top-[64px] z-40 h-[calc(100vh-64px)] w-[430px] border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[18px] font-semibold text-slate-500">
                  {customerPanelInitial}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] text-slate-500">Customer</div>
                  <div className="truncate text-[18px] font-semibold text-slate-900">
                    {customerPanelName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mt-1 text-slate-400 hover:text-slate-700"
                onClick={() => setIsCustomerPanelOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3 text-[13px] text-slate-600">
                {customerPanelCompany ? (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Building2 size={14} className="text-slate-400" />
                    <span className="truncate">{customerPanelCompany}</span>
                  </span>
                ) : null}
                {customerPanelEmail ? (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">{customerPanelEmail}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="border-b border-slate-200 px-4">
              <div className="flex items-center gap-5 text-[14px]">
                {[
                  { key: "details", label: "Details" },
                  { key: "invoices", label: "Unpaid Invoices", badge: unpaidInvoiceCount },
                  { key: "activity", label: "Activity Log" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`relative py-3 text-left font-medium ${customerPanelTab === tab.key ? "text-slate-900" : "text-slate-500"}`}
                    onClick={() => setCustomerPanelTab(tab.key as "details" | "invoices" | "activity")}
                  >
                    <span className="inline-flex items-center gap-1">
                      {tab.label}
                      {"badge" in tab ? (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                          {tab.badge}
                        </span>
                      ) : null}
                    </span>
                    {customerPanelTab === tab.key ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#156372]" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fbfbfe] p-4">
              {customerPanelTab === "details" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-r border-slate-200 p-4 text-center">
                      <div className="mb-2 flex justify-center text-amber-500">
                        <BriefcaseBusiness size={18} />
                      </div>
                      <div className="text-[12px] text-slate-500">Outstanding Receivables</div>
                      <div className="mt-1 text-[20px] font-semibold text-slate-900">
                        {resolvedCurrency}{customerPanelOutstandingReceivables.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-4 text-center">
                      <div className="mb-2 flex justify-center text-emerald-500">
                        <Tag size={18} />
                      </div>
                      <div className="text-[12px] text-slate-500">Unused Credits</div>
                      <div className="mt-1 text-[20px] font-semibold text-slate-900">
                        {resolvedCurrency}{customerPanelUnusedCredits.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3 text-[15px] font-medium text-slate-900">
                      Contact Details
                    </div>
                    <div className="grid grid-cols-[160px_1fr] gap-y-3 px-4 py-4 text-[13px]">
                      <div className="text-slate-500">Customer Type</div>
                      <div className="text-slate-900">{customerDetails?.customerType || customerDetails?.type || "Business"}</div>
                      <div className="text-slate-500">Currency</div>
                      <div className="text-slate-900">{getCustomerCurrency(customerDetails) || formData.currency || "AMD"}</div>
                      <div className="text-slate-500">Payment Terms</div>
                      <div className="text-slate-900">{formData.term === "due-on-receipt" ? "Due on Receipt" : formData.term}</div>
                      <div className="text-slate-500">Portal Status</div>
                      <div className="text-slate-900">
                        {String(customerDetails?.portalStatus || "").toLowerCase() === "enabled" || customerDetails?.portalEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </div>
                      <div className="text-slate-500">Customer Language</div>
                      <div className="text-slate-900">{customerDetails?.language || customerDetails?.customerLanguage || "English"}</div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-3 text-left text-[15px] font-medium text-slate-900"
                      onClick={() => setIsCustomerContactPersonsOpen((prev) => !prev)}
                    >
                      <span className="inline-flex items-center gap-2">
                        Contact Persons
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                          {customerPanelContactPersons.length}
                        </span>
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform ${isCustomerContactPersonsOpen ? "" : "-rotate-90"}`}
                      />
                    </button>
                    {isCustomerContactPersonsOpen ? (
                      <div className="px-4 py-4">
                      {customerPanelContactPersons.length > 0 ? (
                        <div className="space-y-4">
                          {customerPanelContactPersons.map((contact: any, index: number) => {
                            const contactName =
                              String(
                                `${contact?.salutation ? `${contact.salutation}. ` : ""}${contact?.firstName || ""} ${contact?.lastName || ""}`
                              ).trim() ||
                              String(contact?.name || contact?.displayName || "Contact");
                            const contactEmail = String(contact?.email || "").trim();
                            const workPhone = String(contact?.workPhone || contact?.phone || "").trim();
                            const mobilePhone = String(contact?.mobile || contact?.mobilePhone || "").trim();
                            const contactInitial = contactName ? contactName.charAt(0).toUpperCase() : "C";
                            const isPrimary = Boolean(contact?.isPrimary);

                            return (
                              <div key={String(contactEmail || contactName || index)} className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-500">
                                  {contactInitial}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-[14px] font-semibold text-slate-900">{contactName}</span>
                                    {isPrimary ? (
                                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                        Primary
                                      </span>
                                    ) : null}
                                  </div>
                                  {contactEmail ? (
                                    <div className="mt-1 flex items-center gap-2 text-[13px] text-slate-600">
                                      <Mail size={12} className="shrink-0" />
                                      <span className="truncate">{contactEmail}</span>
                                    </div>
                                  ) : null}
                                  {workPhone ? (
                                    <div className="mt-1 text-[13px] text-slate-600">{workPhone}</div>
                                  ) : null}
                                  {mobilePhone ? (
                                    <div className="mt-1 text-[13px] text-slate-600">{mobilePhone}</div>
                                  ) : null}
                                  {String(contact?.portalInvitationAccepted || contact?.portalAccess || contact?.hasPortalAccess || "").toLowerCase() === "false" || contact?.portalInvitationStatus === "not accepted" ? (
                                    <div className="mt-1 text-[13px] text-[#f97316]">Portal invitation not accepted</div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[13px] text-slate-500">No contact persons available.</div>
                      )}
                    </div>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-medium text-slate-900"
                      onClick={() => setIsCustomerAddressOpen((prev) => !prev)}
                    >
                      <span>Address</span>
                      <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform ${isCustomerAddressOpen ? "" : "-rotate-90"}`}
                      />
                    </button>
                    {isCustomerAddressOpen ? (
                      <div className="border-t border-slate-200 px-4 py-4">
                      <div className="space-y-4">
                        <div>
                          <div className="text-[13px] font-medium text-slate-700">Billing Address</div>
                          <div className="mt-2 text-[13px] text-slate-500">
                            {hasBillingAddress ? getAddressLines(billingAddress).join(", ") : "No Billing Address"}
                          </div>
                        </div>
                        <div className="border-t border-slate-100 pt-4">
                          <div className="text-[13px] font-medium text-slate-700">Shipping Address</div>
                          <div className="mt-2 text-[13px] text-slate-500">
                            {hasShippingAddress ? getAddressLines(shippingAddress).join(", ") : "No Shipping Address"}
                          </div>
                        </div>
                      </div>
                    </div>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3 text-[15px] font-medium text-slate-900">
                      Reporting Tags
                    </div>
                    <div className="flex flex-wrap gap-2 px-4 py-4">
                      {customerPanelReportingTags.length > 0 ? (
                        customerPanelReportingTags.map((tag: string) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-[12px] text-slate-700">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[13px] text-slate-500">No reporting tags.</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : customerPanelTab === "invoices" ? (
                <div className="space-y-3">
                  {customerPanelUnpaidInvoices.length > 0 ? (
                    customerPanelUnpaidInvoices.map((invoice) => {
                      const invoiceId = String(invoice?.id || invoice?._id || invoice?.invoiceId || "").trim();
                      const invoiceNumber = String(invoice?.invoiceNumber || invoice?.number || invoiceId || "Invoice").trim();
                      const invoiceDateValue = invoice?.invoiceDate || invoice?.date || invoice?.createdAt;
                      const invoiceDate = invoiceDateValue ? formatDate(new Date(invoiceDateValue)) : "";

                      return (
                        <button
                          key={invoiceId || invoiceNumber}
                          type="button"
                          className="group flex w-full items-start justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                          onClick={() => {
                            if (invoiceId) navigate(`/sales/invoices/${invoiceId}`);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[15px] font-semibold text-slate-900">{invoiceNumber}</span>
                              <ExternalLink
                                size={13}
                                className={`shrink-0 text-[#3f66e0] transition-opacity ${invoiceId ? "opacity-0 group-hover:opacity-100" : "opacity-0"}`}
                              />
                            </div>
                            {invoiceDate ? <div className="mt-1 text-[12px] text-slate-500">{invoiceDate}</div> : null}
                          </div>
                          <div className="text-right">
                            <div className="text-[15px] font-semibold text-slate-900">
                              {formData.currency}{getInvoiceBalanceDue(invoice).toFixed(2)}
                            </div>
                            <div className="mt-1 text-[12px] text-[#f97316]">
                              {getInvoiceBalanceDue(invoice) > 0 ? "Overdue" : "Paid"}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-500">
                      No unpaid invoices for this customer.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(customerDetails?.activityLogs) && customerDetails.activityLogs.length > 0 ? (
                    customerDetails.activityLogs.map((log: any, index: number) => (
                      <div key={log?.id || index} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-[13px] font-medium text-slate-900">{String(log?.title || log?.action || "Activity")}</div>
                        <div className="mt-1 text-[12px] text-slate-500">{String(log?.message || log?.description || "")}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-500">
                      No activity log available for this customer yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      ) : null}

      <ConfigurePaymentTermsModal
        isOpen={isConfigureTermsOpen}
        onClose={() => setIsConfigureTermsOpen(false)}
        initialTerms={paymentTerms}
        onSave={(updated) => {
          setPaymentTerms(updated);
          setIsConfigureTermsOpen(false);
          const newDueDate = computeDueDateFromTerm(formData.debitNoteDate, selectedPaymentTerm, updated);
          setFormData(prev => ({ ...prev, dueDate: newDueDate }));
        }}
      />
    </div>
  );
}
