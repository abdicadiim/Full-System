import React, { useState, useRef, useEffect } from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Upload,
  Info,
  Settings,
  AlertCircle,
  Square,
  CheckSquare,
  Zap,
  Plus,
  Share2,
  HelpCircle,
  Folder,
  Cloud,
  Box,
  Layers,
  HardDrive,
  FileText,
  Building2,
  Users,
  LayoutGrid,
  ChevronRight,
  Check,
  Loader2
} from "lucide-react";
import { getCustomers, savePayment, getPaymentById, updatePayment, getInvoices, getInvoiceById, getNextPaymentNumber, updateInvoice, Invoice } from "../../../sales/salesModel";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { customersAPI, bankAccountsAPI, paymentsReceivedAPI, chartOfAccountsAPI, reportingTagsAPI } from "../../../../services/api";
import ZohoSelect from "../../../../components/ZohoSelect";
import PaymentModeDropdown from "../../../../components/PaymentModeDropdown";
import { toast } from "react-toastify";

const paymentModeOptions = ["Cash", "Check", "Credit Card", "Debit Card", "Bank Transfer", "PayPal", "Other"];
const LS_LOCATIONS_CACHE_KEY = "taban_locations_cache";

export default function RecordPayment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = !!id;
  const invoiceId = location.state?.invoiceId;
  const { baseCurrency, symbol } = useCurrency();
  const baseCurrencyCode = baseCurrency?.code || "USD";
  const currencySymbol = symbol || "$";
  const [formData, setFormData] = useState({
    customerName: "",
    customerId: "",
    location: "Head Office",
    amountReceived: "",
    bankCharges: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentReceivedOn: "",
    paymentNumber: "",
    paymentMode: "Cash",
    depositTo: "Petty Cash",
    depositToAccountId: "",
    referenceNumber: "",
    taxDeducted: "no", // "no" or "yes"
    reportingTags: [] as any[],
    notes: "",
    sendThankYouNote: false,
    currency: "", // Will be set to base currency
    symbol: "" // Store symbol if needed for record keeping
  });

  const isCustomerSelected = !!formData.customerId;
  const [saveLoading, setSaveLoading] = useState<null | "draft" | "paid">(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [limitToInvoice, setLimitToInvoice] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
  const [reportingTagDefinitions, setReportingTagDefinitions] = useState<any[]>([]);
  const [depositToOptions, setDepositToOptions] = useState(["Petty Cash", "Bank Account", "Savings Account"]);
  const [isDepositToDropdownOpen, setIsDepositToDropdownOpen] = useState(false);
  const [isPaymentModeDropdownOpen, setIsPaymentModeDropdownOpen] = useState(false);
  const depositToDropdownRef = useRef<HTMLDivElement>(null);
  const paymentModeDropdownRef = useRef<HTMLDivElement>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAllInvoicesDropdownOpen, setIsAllInvoicesDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen] = useState(false);
  const [customerQuickActionBaseIds, setCustomerQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingCustomersQuickAction, setIsRefreshingCustomersQuickAction] = useState(false);
  const [isAutoSelectingCustomerFromQuickAction, setIsAutoSelectingCustomerFromQuickAction] = useState(false);
  const [customerQuickActionFrameKey, setCustomerQuickActionFrameKey] = useState(0);
  const [isReloadingCustomerFrame, setIsReloadingCustomerFrame] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showEarlyPaymentBanner, setShowEarlyPaymentBanner] = useState(true);
  const [receivedFullAmount, setReceivedFullAmount] = useState(false);
  const [invoicePayments, setInvoicePayments] = useState<{ [key: string]: number }>({}); // { invoiceId: amount }
  const [originalInvoicePayments, setOriginalInvoicePayments] = useState<{ [key: string]: number }>({});
  const [isDateRangeDropdownOpen, setIsDateRangeDropdownOpen] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState("");

  // Email Communications and Contact Persons
  const [selectedContactPersons, setSelectedContactPersons] = useState<any[]>([]);
  const [isContactPersonModalOpen, setIsContactPersonModalOpen] = useState(false);
  const [newContactPersonData, setNewContactPersonData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    mobile: "",
    designation: "",
    department: "",
    skypeName: "",
    isPrimary: false
  });
  const [contactPersonImage, setContactPersonImage] = useState<string | null>(null);
  const contactPersonImageRef = useRef<HTMLInputElement>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);

  // Customer search modal state
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
  const [customerSearchCriteria, setCustomerSearchCriteria] = useState("Display Name");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState(false);

  // Share Modal States
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareVisibility, setShareVisibility] = useState("Public");
  const [isVisibilityDropdownOpen, setIsVisibilityDropdownOpen] = useState(false);
  const [linkExpirationDate, setLinkExpirationDate] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLinkGenerated, setIsLinkGenerated] = useState(false);

  // Upload Dropdown States
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState("files");
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [documentSearch, setDocumentSearch] = useState("");
  const [cloudSearchQuery, setCloudSearchQuery] = useState("");
  const [selectedCloudFiles, setSelectedCloudFiles] = useState<any[]>([]);
  const [selectedInbox, setSelectedInbox] = useState("files");

  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allInvoicesDropdownRef = useRef<HTMLDivElement>(null);
  const shareModalRef = useRef<HTMLDivElement>(null);
  const visibilityDropdownRef = useRef<HTMLDivElement>(null);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  const dateRangeDropdownRef = useRef<HTMLDivElement>(null);

  const handleCustomerSearch = () => {
    const searchTerm = customerSearchTerm.toLowerCase();
    let results: any[] = [];

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
  const normalizeCustomerReportingTags = (tags: any[]): any[] => {
    if (!Array.isArray(tags)) return [];
    return tags
      .map((tag: any) => {
        const tagId = tag?.tagId || tag?.id || tag?._id || "";
        const name = String(tag?.name || tag?.tagName || "").trim();
        const value = String(tag?.value ?? "").trim();
        const options = normalizeReportingTagOptions(tag);
        if (!tagId && !name) return null;
        return {
          ...tag,
          tagId: String(tagId || name),
          id: String(tagId || name),
          name: name || String(tagId),
          value,
          options,
        };
      })
      .filter(Boolean);
  };
  const buildReportingTagMeta = (tag: any) => {
    const tagId = String(tag?.tagId || tag?.id || "").trim();
    const tagName = String(tag?.name || tag?.tagName || "").trim();
    const matchingDefinition = reportingTagDefinitions.find((definition: any) => {
      const definitionId = String(definition?._id || definition?.id || definition?.tagId || "").trim();
      const definitionName = String(definition?.name || definition?.tagName || "").trim();
      if (tagId && definitionId && tagId === definitionId) return true;
      if (tagName && definitionName && tagName.toLowerCase() === definitionName.toLowerCase()) return true;
      return false;
    });

    const mergedOptions = Array.from(
      new Set(
        [
          ...normalizeReportingTagOptions(tag),
          ...normalizeReportingTagOptions(matchingDefinition),
          String(tag?.value ?? "").trim(),
        ].filter((value) => Boolean(value))
      )
    );

    return {
      name: tagName || String(matchingDefinition?.name || matchingDefinition?.tagName || tagId || "Reporting Tag"),
      options: mergedOptions,
      isMandatory: Boolean(tag?.isMandatory ?? matchingDefinition?.isMandatory),
    };
  };
  const resolveLocation = (...values: any[]) => {
    for (const value of values) {
      const normalized = String(value || "").trim();
      if (normalized) return normalized;
    }
    return "Head Office";
  };

  useEffect(() => {
    if (isDocumentsModalOpen) {
      setAvailableDocuments(getAllDocuments());
    }
  }, [isDocumentsModalOpen]);

  useEffect(() => {
    try {
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
        location: nextOptions.includes(prev.location) ? prev.location : nextOptions[0],
      }));
    } catch {
      setLocationOptions(["Head Office"]);
      setFormData(prev => ({ ...prev, location: prev.location || "Head Office" }));
    }
  }, []);

  useEffect(() => {
    const loadReportingTags = async () => {
      try {
        const response = await reportingTagsAPI.getAll();
        const rows = Array.isArray(response) ? response : (response?.data || []);
        setReportingTagDefinitions(Array.isArray(rows) ? rows : []);
      } catch (error) {
        console.error("Error loading reporting tags for payments:", error);
        setReportingTagDefinitions([]);
      }
    };
    loadReportingTags();
  }, []);

  // Load customers and bank accounts from backend
  // Always keep payment currency aligned to organization base currency.
  useEffect(() => {
    if (!baseCurrencyCode) return;
    setFormData(prev => (
      prev.currency === baseCurrencyCode
        ? prev
        : { ...prev, currency: baseCurrencyCode }
    ));
  }, [baseCurrencyCode]);

  // Load customers and bank accounts from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load customers from backend
        const customersResponse = await customersAPI.getAll();
        if (customersResponse && customersResponse.success && customersResponse.data) {
          setCustomers(customersResponse.data.map((c: any) => normalizeCustomer(c)));
        } else {
          // Fallback to local storage
          const allCustomers = await getCustomers();
          setCustomers((allCustomers || []).map((c: any) => normalizeCustomer(c)));
        }

        // Load bank accounts and Chart of Accounts (Cash/Bank types)
        try {
          const [bankAccountsResponse, coaAccountsResponse] = await Promise.all([
            bankAccountsAPI.getAll(),
            chartOfAccountsAPI.getAccounts({ limit: 1000 }) // Fetch all to filter locally as bankAccountsAPI might differ
          ]);

          let depositOptions = ["Petty Cash"];
          let allBankAccounts = [];
          if (bankAccountsResponse && bankAccountsResponse.success && bankAccountsResponse.data) {
            allBankAccounts = bankAccountsResponse.data.map((acc: any) => ({
              ...acc,
              account_type: 'bank'
            }));
          }

          if (coaAccountsResponse && coaAccountsResponse.success && coaAccountsResponse.data) {
            const relevantCoaAccounts = coaAccountsResponse.data
              .filter((acc: any) => {
                const type = (acc.accountType || acc.account_type || "").toLowerCase();
                const name = (acc.accountName || acc.name || "").toLowerCase();
                return type === 'cash' || type === 'bank' || type === 'asset' ||
                  name.includes('cash') || name.includes('undeposited') || name.includes('petty') || name.includes('bank');
              })
              .map((acc: any) => {
                let type = acc.accountType || acc.account_type || 'Other';
                const nameLower = (acc.accountName || acc.name || "").toLowerCase();
                if (nameLower.includes('cash') || nameLower.includes('undeposited') || nameLower.includes('petty') || type === 'cash') {
                  type = 'cash';
                } else if (nameLower.includes('bank') || type === 'bank') {
                  type = 'bank';
                }
                return { ...acc, account_type: type };
              });

            // Combine and avoid duplicates by name
            const names = new Set(allBankAccounts.map(a => a.name || a.accountName));
            relevantCoaAccounts.forEach(acc => {
              const accName = acc.accountName || acc.name;
              if (accName && !names.has(accName)) {
                allBankAccounts.push(acc);
              }
            });
          }

          setBankAccounts(allBankAccounts);
          setDepositToOptions(allBankAccounts.map(a => a.accountName || a.name));

          // If current depositTo name exists in loaded accounts, set its ID
          if (!isEditMode) {
            const currentAccount = allBankAccounts.find(a => (a.accountName || a.name) === formData.depositTo);
            if (currentAccount) {
              setFormData(prev => ({
                ...prev,
                depositToAccountId: currentAccount.id || currentAccount._id
              }));
            }
          }

          // Load payment modes and set default
          if (!isEditMode && !formData.paymentMode) {
            const modesResponse = await paymentModesAPI.getAll();
            if (modesResponse && modesResponse.success && modesResponse.data) {
              const defaultMode = modesResponse.data.find(m => m.isDefault);
              if (defaultMode) {
                setFormData(prev => ({
                  ...prev,
                  paymentMode: defaultMode.name
                }));
              }
            }
          }
        } catch (error) {
          console.error('Error loading deposit accounts:', error);
          // Keep default options if API fails
          setDepositToOptions(["Petty Cash", "Bank Account", "Savings Account"]);
        }

        // Load invoices
        const allInvoices = await getInvoices();
        setInvoices(allInvoices || []);

        // Generate a new payment number if creating new
        if (!isEditMode) {
          const nextNum = await getNextPaymentNumber();
          setFormData(prev => ({ ...prev, paymentNumber: nextNum, currency: prev.currency || baseCurrencyCode }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to local storage
        const allCustomers = await getCustomers();
        setCustomers((allCustomers || []).map((c: any) => normalizeCustomer(c)));
      }
    };

    loadData();
  }, [isEditMode, baseCurrencyCode]);

  // Load invoice data if invoiceId is provided via state or param
  useEffect(() => {
    const initializeFromState = async () => {
      // Priority 1: Use full invoice object from location state if available
      if (location.state?.invoice && !isEditMode) {
        const inv = location.state.invoice;
        setSelectedInvoice(inv);

        const custName = location.state.customerName || inv.customerName || (typeof inv.customer === 'string' ? inv.customer : inv.customer?.displayName || inv.customer?.name) || "";
        const custId = location.state.customerId || inv.customerId || inv.customer?._id || inv.customer?.id || "";
        const amt = (location.state.amount || computeInvoiceDue(inv) || inv.balanceDue || inv.total || inv.amount || "").toString();
        setFormData(prev => ({
          ...prev,
          customerName: custName,
          customerId: custId,
          location: resolveLocation(location.state?.location, inv.location, inv.selectedLocation, inv.branch),
          amountReceived: amt,
          currency: baseCurrencyCode,
          reportingTags: normalizeCustomerReportingTags(
            location.state?.reportingTags ||
            location.state?.customerReportingTags ||
            inv.customer?.reportingTags ||
            prev.reportingTags
          ),
          paymentDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : (inv.invoiceDate || inv.date ? new Date(inv.invoiceDate || inv.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        }));

        if (custId) {
          setLimitToInvoice(true);
          const invoiceIdStr = String(inv.id || inv._id);
          await loadInvoicesForPayment([invoiceIdStr], { [invoiceIdStr]: parseFloat(amt) || 0 });
        }
        return;
      }

      // Priority 2: Use IDs from state to fetch
      const targetInvoiceId = invoiceId || location.state?.invoiceId;
      if (targetInvoiceId && !isEditMode) {
        try {
          const inv = await getInvoiceById(targetInvoiceId);
          if (inv) {
            setSelectedInvoice(null);
            const customer = customers.find(c => c.id === inv.customerId || (typeof inv.customer === 'object' ? (inv.customer?._id === c.id || inv.customer?.id === c.id) : false));

            const custName = inv.customerName || (typeof inv.customer === 'string' ? inv.customer : inv.customer?.displayName || inv.customer?.name) || "";
            const custId = inv.customerId || inv.customer?._id || inv.customer?.id || customer?.id || "";
            const amt = (computeInvoiceDue(inv) || inv.balanceDue || inv.total || inv.amount || "").toString();
            setFormData(prev => ({
              ...prev,
              customerName: custName,
              customerId: custId,
              location: resolveLocation(location.state?.location, inv.location, inv.selectedLocation, inv.branch),
              amountReceived: amt,
              currency: baseCurrencyCode,
              reportingTags: normalizeCustomerReportingTags(
                inv.customer?.reportingTags || customer?.reportingTags || prev.reportingTags
              ),
              paymentDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : (inv.invoiceDate || inv.date ? new Date(inv.invoiceDate || inv.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            }));

            if (custId) {
              setLimitToInvoice(true);
              const invoiceIdStr = String(inv.id || inv._id || targetInvoiceId);
              await loadInvoicesForPayment([invoiceIdStr], { [invoiceIdStr]: parseFloat(amt) || 0 });
            }
          }
        } catch (error) {
          console.error("Error loading invoice for payment:", error);
        }
      }
    };

    initializeFromState();
  }, [invoiceId, location.state, isEditMode, customers]);

  // Load payment data if editing
  useEffect(() => {
    const loadPaymentData = async () => {
      if (isEditMode && id) {
        try {
          const statePaymentData = location.state?.paymentData;
          const paymentFromState =
            statePaymentData &&
              (String(statePaymentData.id || statePaymentData._id || "") === String(id))
              ? statePaymentData
              : null;

          let payment = paymentFromState;
          if (!payment) {
            const response = await paymentsReceivedAPI.getById(id);
            if (response && response.success && response.data) {
              payment = response.data;
            }
          }

          if (payment) {
            const customerObj = typeof payment.customer === "object" && payment.customer !== null ? payment.customer : null;
            const customerId =
              payment.customerId ||
              customerObj?._id ||
              customerObj?.id ||
              (typeof payment.customer === "string" ? payment.customer : "");
            const customerName =
              payment.customerName ||
              customerObj?.displayName ||
              customerObj?.name ||
              customerObj?.companyName ||
              (typeof payment.customer === "string" ? payment.customer : "");
            const amountValue =
              payment.amountReceived ??
              payment.amount ??
              payment.total ??
              0;
            const paymentDateValue = payment.paymentDate || payment.date || "";
            const paymentMethodRaw = String(payment.paymentMethod || "").toLowerCase();
            const normalizedPaymentMode =
              payment.paymentMode ||
              (paymentMethodRaw === "cash" ? "Cash" :
                paymentMethodRaw === "check" ? "Check" :
                  paymentMethodRaw === "card" ? "Credit Card" :
                    paymentMethodRaw === "bank_transfer" ? "Bank Transfer" :
                      payment.paymentMethod || "Other");
            const referenceNumberValue =
              payment.referenceNumber ||
              payment.paymentReference ||
              "";
            const depositToValue =
              payment.depositTo ||
              payment.bankAccount?.name ||
              "Petty Cash";
            const formDateValue = (() => {
              if (!paymentDateValue) return "";
              const parsed = new Date(paymentDateValue);
              if (Number.isNaN(parsed.getTime())) return "";
              return parsed.toISOString().split("T")[0];
            })();

            setFormData({
              customerName: customerName || "",
              customerId: customerId || "",
              location: resolveLocation(payment.location, payment.branch, customerObj?.location),
              amountReceived: amountValue?.toString() || "",
              bankCharges: payment.bankCharges?.toString() || "",
              paymentDate: formDateValue || new Date().toISOString().split("T")[0],
              paymentReceivedOn: formDateValue || "",
              paymentNumber: payment.paymentNumber || "",
              paymentMode: normalizedPaymentMode,
              depositTo: depositToValue,
              referenceNumber: referenceNumberValue,
              taxDeducted: payment.taxDeducted || "no",
              reportingTags: normalizeCustomerReportingTags(payment.reportingTags || []),
              notes: payment.notes || "",
              sendThankYouNote: false,
              currency: payment.currency || baseCurrencyCode,
              symbol: payment.symbol || "$"
            });

            // Set invoice payments from allocations
            if (Array.isArray(payment.allocations) && payment.allocations.length > 0) {
              const allocations: { [key: string]: number } = {};
              payment.allocations.forEach((allocation: any) => {
                const invId = allocation.invoice?._id || allocation.invoice?.id || allocation.invoice;
                if (invId) {
                  allocations[invId] = allocation.amount;
                }
              });
              setInvoicePayments(allocations);
              setOriginalInvoicePayments(allocations);
            } else if (payment.invoicePayments && typeof payment.invoicePayments === "object") {
              const normalized: { [key: string]: number } = {};
              Object.entries(payment.invoicePayments).forEach(([k, v]) => {
                const parsed = parseFloat(String(v || 0));
                if (!isNaN(parsed) && parsed > 0) normalized[String(k)] = parsed;
              });
              setInvoicePayments(normalized);
              setOriginalInvoicePayments(normalized);
            }

            if (customerId) {
              const custId = customerId;
              const custName = customerName || "";

              // If payment has allocations, load only the referenced invoices
              if (Array.isArray(payment.allocations) && payment.allocations.length > 0) {
                const allocationsMap: { [key: string]: number } = {};
                const invoiceIds: string[] = [];
                payment.allocations.forEach((allocation: any) => {
                  const invId = allocation.invoice?._id || allocation.invoice?.id || allocation.invoice;
                  if (invId) {
                    invoiceIds.push(String(invId));
                    allocationsMap[String(invId)] = allocation.amount || 0;
                  }
                });

                if (invoiceIds.length > 0) {
                  await loadInvoicesForPayment(invoiceIds, allocationsMap);
                } else {
                  await loadUnpaidInvoices(custId, custName);
                }
              } else {
                await loadUnpaidInvoices(custId, custName);
              }
            }
          }
        } catch (error) {
          console.error("Error loading payment:", error);

        }
      }
    };

    loadPaymentData();
  }, [id, isEditMode, location.state, baseCurrencyCode]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (allInvoicesDropdownRef.current && !allInvoicesDropdownRef.current.contains(e.target as Node)) {
        setIsAllInvoicesDropdownOpen(false);
      }
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(e.target as Node)) {
        setIsUploadDropdownOpen(false);
      }
      if (depositToDropdownRef.current && !depositToDropdownRef.current.contains(e.target as Node)) {
        setIsDepositToDropdownOpen(false);
      }
      if (paymentModeDropdownRef.current && !paymentModeDropdownRef.current.contains(e.target as Node)) {
        setIsPaymentModeDropdownOpen(false);
      }
      if (shareModalRef.current && !shareModalRef.current.contains(e.target as Node)) {
        // Don't close modal on outside click, let user explicitly close it
      }
      if (visibilityDropdownRef.current && !visibilityDropdownRef.current.contains(e.target as Node)) {
        setIsVisibilityDropdownOpen(false);
      }
      if (dateRangeDropdownRef.current && !dateRangeDropdownRef.current.contains(e.target as Node)) {
        setIsDateRangeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reload unpaid invoices when date range filter changes
  useEffect(() => {
    if (formData.customerId) {
      loadUnpaidInvoices(formData.customerId, formData.customerName);
    }
  }, [dateRangeFilter]);

  // Helper: compute amount due for an invoice (respecting balanceDue, balance, discounts and paid amounts)
  const computeInvoiceDue = (inv: any) => {
    if (!inv) return 0;

    // Use balance or balanceDue if available
    const balanceField = inv.balance !== undefined ? inv.balance : inv.balanceDue;
    if (balanceField !== undefined && balanceField !== null) {
      return parseFloat(balanceField as any) || 0;
    }

    // Fallback: try to compute from available fields
    const totalFromFields = (() => {
      if (inv.total !== undefined && inv.total !== null) return parseFloat(inv.total as any) || 0;
      const subTotal = parseFloat(inv.subTotal || 0) || 0;
      const discountAmount = inv.discountType === 'percent'
        ? (subTotal * (parseFloat(inv.discount || 0) / 100))
        : (parseFloat(inv.discount || 0) || 0);
      const shipping = parseFloat(inv.shippingCharges || inv.shipping || 0) || 0;
      const adjustment = parseFloat(inv.adjustment || 0) || 0;
      return subTotal - discountAmount + shipping + adjustment;
    })();

    const paid = parseFloat(inv.paidAmount || inv.paid || 0) || 0;
    const calc = totalFromFields - paid;
    return Math.max(0, calc || 0);
  };

  const loadUnpaidInvoices = async (custId: string, customerName: string, targetInvoiceId: string | null = null, targetAmount: number = 0) => {
    try {
      // If we're asked to limit to a specific invoice, fetch that invoice only
      if (targetInvoiceId) {
        try {
          const inv = await getInvoiceById(String(targetInvoiceId));
          if (inv) {
            setUnpaidInvoices([inv]);
            const invId = inv.id || inv._id;
            const initialPayments: { [key: string]: number } = {};
            initialPayments[invId] = targetAmount || parseFloat(invoicePayments[invId] || 0) || 0;
            setInvoicePayments(initialPayments);
            return;
          }
        } catch (err) {
          console.error('Error fetching target invoice:', err);
          // Fall through to loading all invoices if fetching single invoice fails
        }
      }

      const allInvoices = await getInvoices();
      // Normalize custId comparison (handle string vs object)
      const targetCustId = typeof custId === 'object' ? (custId?._id || custId?.id) : custId;

      let invoices = (allInvoices || []).filter((inv: any) => {
        const invCustId = typeof inv.customer === 'object' ? (inv.customer?._id || inv.customer?.id) : inv.customerId;
        if (!(invCustId === targetCustId || inv.customerName === customerName || inv.customer === customerName)) return false;
        const status = (inv.status || '').toString().toLowerCase();
        // Exclude drafts, voids and paid invoices explicitly
        if (status === 'draft' || status === 'void' || status === 'paid') return false;
        // Include invoices that have a positive due amount (this covers unpaid, partially paid and overdue)
        const due = computeInvoiceDue(inv);
        return due > 0;
      });

      // Apply date range filter if set
      if (dateRangeFilter) {
        const [fromDate, toDate] = dateRangeFilter.split(' - ');
        if (fromDate || toDate) {
          invoices = invoices.filter((inv: any) => {
            const invDate = new Date(inv.invoiceDate || inv.date || inv.createdAt);
            if (fromDate && invDate < new Date(fromDate)) return false;
            if (toDate && invDate > new Date(toDate)) return false;
            return true;
          });
        }
      }

      // Sort invoices by date ascending (Oldest first for FIFO payment distribution)
      invoices.sort((a, b) => {
        const dateA = new Date(a.invoiceDate || a.date || a.createdAt).getTime();
        const dateB = new Date(b.invoiceDate || b.date || b.createdAt).getTime();
        return dateA - dateB;
      });

      setUnpaidInvoices(invoices);

      // Initialize/Update payment amounts
      const initialPayments: { [key: string]: number } = {};
      let currentAmountReceived = parseFloat(formData.amountReceived) || 0;
      let remainingToDistribute = targetAmount > 0 ? targetAmount : currentAmountReceived;

      invoices.forEach((inv: any) => {
        const invId = inv.id || inv._id;
        const due = computeInvoiceDue(inv);
        if (targetInvoiceId && (invId === targetInvoiceId)) {
          initialPayments[invId] = targetAmount;
        } else if (remainingToDistribute > 0 && !targetInvoiceId) {
          // Auto-distribute if we have an amount but no target invoice
          if (remainingToDistribute >= due) {
            initialPayments[invId] = due;
            remainingToDistribute -= due;
          } else {
            initialPayments[invId] = remainingToDistribute;
            remainingToDistribute = 0;
          }
        } else {
          initialPayments[invId] = invoicePayments[invId] || 0;
        }
      });
      setInvoicePayments(initialPayments);
    } catch (error) {
      console.error("Error loading unpaid invoices:", error);
    }
  };

  // Load only invoices that are referenced by this payment's allocations
  const loadInvoicesForPayment = async (invoiceIds: string[] = [], allocationsMap: { [key: string]: number } = {}) => {
    try {
      if (!invoiceIds || invoiceIds.length === 0) {
        setUnpaidInvoices([]);
        setInvoicePayments({});
        return;
      }

      const fetched = await Promise.all(invoiceIds.map(id => getInvoiceById(String(id))));
      const invoices = (fetched || []).filter(inv => inv !== null) as any[];

      // Keep original order of invoiceIds
      invoices.sort((a, b) => {
        const ai = invoiceIds.indexOf(a.id || a._id || "");
        const bi = invoiceIds.indexOf(b.id || b._id || "");
        return ai - bi;
      });

      setUnpaidInvoices(invoices);

      // Prepare payments mapping from allocationsMap (fallback to 0 if missing)
      const initialPayments: { [key: string]: number } = {};
      invoices.forEach(inv => {
        const invId = inv.id || inv._id;
        initialPayments[invId] = allocationsMap[invId] || allocationsMap[String(invId)] || 0;
      });
      setInvoicePayments(initialPayments);
    } catch (error) {
      console.error('Error loading invoices for payment:', error);
    }
  };

  // Calculate total amount due for unpaid invoices
  const getTotalAmountDue = () => {
    return unpaidInvoices.reduce((sum, inv) => {
      const amountDue = parseFloat(computeInvoiceDue(inv) || 0);
      return sum + amountDue;
    }, 0);
  };

  // Calculate total applied amount
  const getTotalAppliedAmount = () => {
    return Object.values(invoicePayments).reduce((sum, amount) => sum + parseFloat(amount || 0), 0);
  };

  // Handle invoice payment amount change
  const handleInvoicePaymentChange = (invoiceId: string, amount: string | number) => {
    const val = parseFloat(amount as string || '0');
    setInvoicePayments(prev => {
      const next = { ...prev, [invoiceId]: val };
      // Two-way sync: Update the top-level amount received
      const totalApplied = Object.values(next).reduce((sum, a) => sum + (parseFloat(a as any) || 0), 0);
      setFormData(f => ({ ...f, amountReceived: totalApplied.toString() }));
      return next;
    });
  };

  // Handle "Pay in Full" checkbox
  const handlePayInFull = (invoiceId: string) => {
    const invoice = unpaidInvoices.find(inv => (inv.id || inv._id) === invoiceId);
    if (invoice) {
      const fullAmount = parseFloat(computeInvoiceDue(invoice) || 0);
      handleInvoicePaymentChange(invoiceId, fullAmount);
    }
  };

  // Handle "Received full amount" checkbox
  const handleReceivedFullAmount = () => {
    setReceivedFullAmount(!receivedFullAmount);
    if (!receivedFullAmount) {
      const totalDue = getTotalAmountDue();
      setFormData(prev => ({ ...prev, amountReceived: totalDue.toString() }));
      // Apply full amount to all invoices
      const fullPayments: { [key: string]: number } = {};
      unpaidInvoices.forEach(inv => {
        const amountDue = parseFloat(computeInvoiceDue(inv) || 0);
        fullPayments[inv.id || inv._id] = amountDue;
      });
      setInvoicePayments(fullPayments);
    }
  };

  // Clear all applied amounts
  const handleClearAppliedAmount = () => {
    const clearedPayments: { [key: string]: number } = {};
    unpaidInvoices.forEach(inv => {
      clearedPayments[inv.id || inv._id] = 0;
    });
    setInvoicePayments(clearedPayments);
    setReceivedFullAmount(false);
    setFormData(prev => ({ ...prev, amountReceived: "0" }));
  };

  const handleCustomerSelect = async (customer: any) => {
    const customerId = customer.id || customer._id;
    const customerName = customer.name || customer.displayName || customer.companyName;
    setFormData(prev => ({
      ...prev,
      customerName: customerName,
      customerId: customerId,
      location: resolveLocation(customer.location, customer.branch, prev.location),
      currency: baseCurrencyCode,
      reportingTags: normalizeCustomerReportingTags(customer.reportingTags || prev.reportingTags || [])
    }));
    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");
    if (customerId) {
      // User explicitly selected a customer -> clear any invoice-limited mode so we show all unpaid invoices
      setLimitToInvoice(false);
      await loadUnpaidInvoices(customerId, customerName);

      // Fetch full customer details and load contact persons
      try {
        const response = await customersAPI.getById(customerId);
        if (response && response.success && response.data) {
          setCustomerDetails(response.data);
          setFormData(prev => ({
            ...prev,
            reportingTags: normalizeCustomerReportingTags(response.data.reportingTags || prev.reportingTags || []),
          }));
          // Load contact persons if available
          if (response.data.contactPersons && response.data.contactPersons.length > 0) {
            setSelectedContactPersons(response.data.contactPersons);
          } else {
            setSelectedContactPersons([]);
          }
        }
      } catch (error) {
        console.error('Error fetching customer details:', error);
        setCustomerDetails(customer);
        setFormData(prev => ({
          ...prev,
          reportingTags: normalizeCustomerReportingTags(customer.reportingTags || prev.reportingTags || []),
        }));
        setSelectedContactPersons([]);
      }
    }
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

  const normalizeCustomer = (customer: any) => ({
    ...customer,
    id: customer?._id || customer?.id,
    _id: customer?._id || customer?.id,
    name: customer?.displayName || customer?.name || customer?.companyName || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || "Unknown"
  });

  const reloadCustomersForRecordPayment = async () => {
    const customersResponse = await customersAPI.getAll();
    const normalizedCustomers = ((customersResponse?.data || []) as any[]).map(normalizeCustomer);
    setCustomers(normalizedCustomers);
    return normalizedCustomers;
  };

  const openCustomerQuickAction = async () => {
    setIsCustomerDropdownOpen(false);
    setIsRefreshingCustomersQuickAction(true);
    const latestCustomers = await reloadCustomersForRecordPayment();
    setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
    setIsRefreshingCustomersQuickAction(false);
    setIsNewCustomerQuickActionOpen(true);
  };

  const tryAutoSelectNewCustomerFromQuickAction = async () => {
    if (!isNewCustomerQuickActionOpen || isAutoSelectingCustomerFromQuickAction) return;
    setIsAutoSelectingCustomerFromQuickAction(true);
    try {
      const latestCustomers = await reloadCustomersForRecordPayment();
      const baselineIds = new Set(customerQuickActionBaseIds);
      const newCustomers = latestCustomers.filter((c: any) => {
        const entityId = getEntityId(c);
        return entityId && !baselineIds.has(entityId);
      });
      if (newCustomers.length > 0) {
        const newlyCreatedCustomer = pickNewestEntity(newCustomers) || newCustomers[newCustomers.length - 1];
        await handleCustomerSelect(newlyCreatedCustomer);
        setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
        setIsNewCustomerQuickActionOpen(false);
      }
    } finally {
      setIsAutoSelectingCustomerFromQuickAction(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    const MAX_FILES = 5;

    const newValidFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`File "${file.name}" exceeds the 5MB limit and will not be uploaded.`);
        return false;
      }
      return true;
    });

    setAttachedFiles(prev => {
      const combinedFiles = [...prev, ...newValidFiles];
      if (combinedFiles.length > MAX_FILES) {
        alert(`You can upload a maximum of ${MAX_FILES} files. Some files were not added.`);
        return combinedFiles.slice(0, MAX_FILES);
      }
      return combinedFiles;
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Contact Person Handlers
  const handleContactPersonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setNewContactPersonData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleContactPersonImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setContactPersonImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveContactPerson = async () => {
    // Validate required fields
    if (!newContactPersonData.firstName || !newContactPersonData.lastName) {
      alert('Please enter first name and last name');
      return;
    }

    if (!formData.customerId) {
      alert('Please select a customer first');
      return;
    }

    try {
      // Get current customer data
      const customerResponse = await customersAPI.getById(formData.customerId);
      if (!customerResponse || !customerResponse.success) {
        throw new Error('Failed to fetch customer data');
      }

      const customer = customerResponse.data;
      const existingContactPersons = customer.contactPersons || [];

      // Add new contact person
      const newContactPerson = {
        salutation: newContactPersonData.salutation || '',
        firstName: newContactPersonData.firstName.trim(),
        lastName: newContactPersonData.lastName.trim(),
        email: newContactPersonData.email || '',
        workPhone: newContactPersonData.workPhone || '',
        mobile: newContactPersonData.mobile || '',
        designation: newContactPersonData.designation || '',
        department: newContactPersonData.department || '',
        skypeName: newContactPersonData.skypeName || '',
        isPrimary: newContactPersonData.isPrimary || false
      };

      // Update customer with new contact person
      const updatedContactPersons = [...existingContactPersons, newContactPerson];

      const updateResponse = await customersAPI.update(formData.customerId, {
        contactPersons: updatedContactPersons
      });

      if (!updateResponse || !updateResponse.success) {
        throw new Error('Failed to update customer');
      }

      // Reload customer details to get the updated contact persons list
      const updatedCustomerResponse = await customersAPI.getById(formData.customerId);
      if (updatedCustomerResponse && updatedCustomerResponse.success) {
        setCustomerDetails(updatedCustomerResponse.data);
        // Update selected contact persons with the full list from backend
        if (updatedCustomerResponse.data.contactPersons && updatedCustomerResponse.data.contactPersons.length > 0) {
          setSelectedContactPersons(updatedCustomerResponse.data.contactPersons);
        } else {
          // If no contact persons in backend, add the new one we just created
          setSelectedContactPersons([...selectedContactPersons, newContactPerson]);
        }
      } else {
        // Fallback: add to selected contact persons if backend reload fails
        setSelectedContactPersons([...selectedContactPersons, newContactPerson]);
      }

      // Reset form
      setNewContactPersonData({
        salutation: "",
        firstName: "",
        lastName: "",
        email: "",
        workPhone: "",
        mobile: "",
        designation: "",
        department: "",
        skypeName: "",
        isPrimary: false
      });
      setContactPersonImage(null);
      setIsContactPersonModalOpen(false);

      // Show success message
      alert('Contact person added successfully!');
    } catch (error) {
      console.error('Error saving contact person:', error);
      alert('Failed to save contact person. Please try again.');
    }
  };

  const handleCancelContactPerson = () => {
    setNewContactPersonData({
      salutation: "",
      firstName: "",
      lastName: "",
      email: "",
      workPhone: "",
      mobile: "",
      designation: "",
      department: "",
      skypeName: "",
      isPrimary: false
    });
    setContactPersonImage(null);
    setIsContactPersonModalOpen(false);
  };

  const handleAttachFromDesktop = () => {
    setIsUploadDropdownOpen(false);
    fileInputRef.current?.click();
  };

  const handleAttachFromCloud = () => {
    setIsUploadDropdownOpen(false);
    setIsCloudPickerOpen(true);
  };

  const handleAttachFromDocuments = () => {
    setIsUploadDropdownOpen(false);
    setIsDocumentsModalOpen(true);
  };

  const parseFileSize = (sizeStr: string | number) => {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;
    const match = sizeStr.toString().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: { [key: string]: number } = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    return Math.round(value * (multipliers[unit] || 1));
  };

  const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

  const toStatusKey = (value: any) =>
    String(value || "")
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .trim();

  const applyPaymentsToInvoices = async (
    invoiceDeltas: Record<string, number>,
    paymentMeta: {
      paymentId: string;
      paymentNumber: string;
      paymentDate: string;
      paymentMode: string;
      referenceNumber: string;
    },
    appliedAmountsByInvoice: Record<string, number>
  ) => {
    const entries = Object.entries(invoiceDeltas).filter(([invoiceId, delta]) => String(invoiceId).trim() && Math.abs(Number(delta) || 0) > 0);
    for (const [invoiceId, deltaRaw] of entries) {
      const delta = Number(deltaRaw) || 0;
      const current = await getInvoiceById(String(invoiceId));
      if (!current) continue;

      const totalAmount = roundMoney(parseFloat(String((current as any).total ?? (current as any).amount ?? 0)) || 0);
      const currentPaid = roundMoney(parseFloat(String((current as any).amountPaid ?? (current as any).paidAmount ?? 0)) || 0);
      const nextPaid = Math.max(0, roundMoney(currentPaid + delta));
      const nextBalance = Math.max(0, roundMoney(totalAmount - nextPaid));

      const currentStatusKey = toStatusKey((current as any).status || "sent");
      let nextStatus: string = (current as any).status || "sent";
      if (currentStatusKey !== "void") {
        if (nextPaid > 0 && nextBalance <= 0) nextStatus = "paid";
        else if (nextPaid > 0 && nextBalance > 0) nextStatus = "partially_paid";
        else nextStatus = currentStatusKey === "draft" ? "draft" : "sent";
      }

      const existingPayments = Array.isArray((current as any).paymentsReceived)
        ? [...(current as any).paymentsReceived]
        : Array.isArray((current as any).payments)
        ? [...(current as any).payments]
        : [];

      const paymentIdKey = String(paymentMeta.paymentId || "").trim();
      const normalizedExisting = existingPayments.filter((row: any) => {
        const rowPaymentId = String(row?.paymentId || row?.id || row?._id || "").trim();
        return !(paymentIdKey && rowPaymentId && rowPaymentId === paymentIdKey);
      });

      const appliedAmount = roundMoney(Number(appliedAmountsByInvoice[invoiceId] || 0));
      const nextPaymentsReceived =
        appliedAmount > 0
          ? [
              ...normalizedExisting,
              {
                paymentId: paymentIdKey,
                id: paymentIdKey || undefined,
                paymentNumber: paymentMeta.paymentNumber || "",
                date: paymentMeta.paymentDate || new Date().toISOString(),
                paymentMode: paymentMeta.paymentMode || "Cash",
                referenceNumber: paymentMeta.referenceNumber || "",
                amount: appliedAmount,
                balance: nextBalance,
                balanceAmount: nextBalance,
              },
            ]
          : normalizedExisting;

      const patch: Partial<Invoice> & Record<string, any> = {
        amountPaid: nextPaid,
        paidAmount: nextPaid,
        balanceDue: nextBalance,
        balance: nextBalance,
        status: nextStatus,
        paymentsReceived: nextPaymentsReceived,
      };
      await updateInvoice(String(invoiceId), patch);
    }
  };

  const handleSave = async (status = "paid") => {
    if (saveLoading) return;
    setSaveLoading(status as "draft" | "paid");
    try {
      // Validate required fields
      if (!formData.customerId || !formData.customerName) {
        toast.error("Please select a customer.");
        return;
      }
      if (!formData.amountReceived || parseFloat(formData.amountReceived) <= 0) {
        toast.error("Please enter a valid amount.");
        return;
      }
      if (!formData.paymentDate) {
        toast.error("Please select a payment date.");
        return;
      }
      if (!formData.paymentNumber) {
        toast.error("Please enter a payment number.");
        return;
      }

      // Ensure allocations are properly built. If none applied but amount exists, distribute now.
      let finalInvoicePayments = { ...invoicePayments };
      const currentApplied = Object.values(finalInvoicePayments).reduce((sum, val) => sum + (parseFloat(val as any) || 0), 0);
      const totalToApply = parseFloat(formData.amountReceived) || 0;

      if (currentApplied === 0 && totalToApply > 0 && unpaidInvoices.length > 0) {
        let remaining = totalToApply;
        unpaidInvoices.forEach(inv => {
          const invId = inv.id || inv._id;
          const due = parseFloat(computeInvoiceDue(inv) || 0);
          if (remaining >= due) {
            finalInvoicePayments[invId] = due;
            remaining -= due;
          } else if (remaining > 0) {
            finalInvoicePayments[invId] = remaining;
            remaining = 0;
          }
        });
      }

      // Clean invoicePayments: ensure keys are strings and amounts are numbers, remove zero/invalid entries
      const cleanedInvoicePayments: { [key: string]: number } = {};
      Object.entries(finalInvoicePayments).forEach(([k, v]) => {
        const key = String(k || "");
        const val = typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : NaN);
        if (!isNaN(val) && val > 0) {
          cleanedInvoicePayments[key] = val;
        }
      });

      const firstAppliedInvoiceId = Object.keys(cleanedInvoicePayments)[0] || "";
      const firstAppliedInvoice = unpaidInvoices.find((inv: any) => String(inv.id || inv._id) === firstAppliedInvoiceId);
      const primaryInvoiceNumber =
        firstAppliedInvoice?.invoiceNumber ||
        firstAppliedInvoice?.id ||
        firstAppliedInvoiceId ||
        "";

      const data = {
        customerId: formData.customerId,
        customerName: formData.customerName || "",
        paymentNumber: formData.paymentNumber,
        date: formData.paymentDate,
        amount: totalToApply,
        currency: baseCurrencyCode,
        location: formData.location || "Head Office",
        paymentMode: formData.paymentMode || "Cash",
        depositTo: formData.depositTo || "Petty Cash",
        depositToAccountId: formData.depositToAccountId,
        referenceNumber: formData.referenceNumber || "",
        invoiceNumber: primaryInvoiceNumber,
        bankCharges: formData.bankCharges ? parseFloat(formData.bankCharges) : 0,
        invoicePayments: cleanedInvoicePayments,
        reportingTags: (Array.isArray(formData.reportingTags) ? formData.reportingTags : [])
          .filter((tag: any) => String(tag?.tagId || tag?.id || "").trim() || String(tag?.name || "").trim())
          .map((tag: any) => ({
            tagId: String(tag?.tagId || tag?.id || tag?.name || "").trim(),
            id: String(tag?.id || tag?.tagId || tag?.name || "").trim(),
            name: String(tag?.name || tag?.tagId || tag?.id || "").trim(),
            value: String(tag?.value || "").trim(),
          })),
        notes: formData.notes || "",
        status: status
      };

      if (isEditMode) {
        // Update existing payment
        console.debug('Updating payment payload:', id, data);
        const response = await paymentsReceivedAPI.update(id, data);
        if (response && response.success) {
          const invoiceIds = new Set<string>([
            ...Object.keys(originalInvoicePayments || {}),
            ...Object.keys(cleanedInvoicePayments || {}),
          ]);
          const invoiceDeltas: Record<string, number> = {};
          invoiceIds.forEach((invId) => {
            const prevApplied = Number(originalInvoicePayments?.[invId] || 0);
            const nextApplied = Number(cleanedInvoicePayments?.[invId] || 0);
            const diff = roundMoney(nextApplied - prevApplied);
            if (Math.abs(diff) > 0) invoiceDeltas[invId] = diff;
          });

          await applyPaymentsToInvoices(
            invoiceDeltas,
            {
              paymentId: String((response as any)?.data?._id || (response as any)?.data?.id || id || ""),
              paymentNumber: formData.paymentNumber || "",
              paymentDate: formData.paymentDate || "",
              paymentMode: formData.paymentMode || "Cash",
              referenceNumber: formData.referenceNumber || "",
            },
            cleanedInvoicePayments
          );

          toast.success("Payment updated successfully.");
          navigate("/payments/payments-received");
        } else {
          toast.error("Failed to update payment: " + (response?.message || "Unknown error"));
        }
      } else {
        // Create new payment
        const response = await paymentsReceivedAPI.create(data);
        if (response && response.success) {
          await applyPaymentsToInvoices(
            cleanedInvoicePayments,
            {
              paymentId: String((response as any)?.data?._id || (response as any)?.data?.id || ""),
              paymentNumber: formData.paymentNumber || "",
              paymentDate: formData.paymentDate || "",
              paymentMode: formData.paymentMode || "Cash",
              referenceNumber: formData.referenceNumber || "",
            },
            cleanedInvoicePayments
          );

          toast.success("Payment saved successfully.");
          navigate("/payments/payments-received");
        } else {
          toast.error("Failed to save payment: " + (response?.message || "Unknown error"));
        }
      }
    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast.error("Error saving payment: " + (error.message || "Unknown error"));
    } finally {
      setSaveLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (amount: string | number, currency = "USD") => {
    return `${currency}${parseFloat(amount as string || '0').toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const handleInvoiceSelect = (invoice: any) => {
    setSelectedInvoice(invoice);
    const customer = customers.find(c => c.id === invoice.customerId || c.name === invoice.customer);

    setFormData(prev => ({
      ...prev,
      customerName: invoice.customer || "",
      customerId: invoice.customerId || customer?.id || "",
      location: resolveLocation(invoice.location, invoice.selectedLocation, customer?.location, prev.location),
      amountReceived: (invoice.balanceDue || invoice.total || invoice.amount || "").toString(),
      currency: baseCurrencyCode,
      reportingTags: normalizeCustomerReportingTags(
        invoice.customer?.reportingTags || customer?.reportingTags || prev.reportingTags || []
      ),
      paymentDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : (invoice.invoiceDate || invoice.date ? new Date(invoice.invoiceDate || invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    }));

    if (invoice.customerId || customer?.id) {
      loadUnpaidInvoices(invoice.customerId || customer?.id, invoice.customer);
    }
  };

  const handleShare = () => {
    if (!selectedInvoice) {
      alert("Please select an invoice first");
      return;
    }

    let defaultExpiryDate;
    if (selectedInvoice.dueDate) {
      defaultExpiryDate = new Date(selectedInvoice.dueDate);
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    } else {
      defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    }

    const day = String(defaultExpiryDate.getDate()).padStart(2, '0');
    const month = String(defaultExpiryDate.getMonth() + 1).padStart(2, '0');
    const year = defaultExpiryDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    setLinkExpirationDate(formattedDate);
    setGeneratedLink("");
    setIsLinkGenerated(false);
    setShowShareModal(true);
  };

  const handleGenerateLink = () => {
    if (!linkExpirationDate) {
      alert("Please select an expiration date");
      return;
    }

    const baseUrl = "https://zohosecurepay.com/books/tabanenterprises/secure";
    const invoiceId = selectedInvoice?.id || selectedInvoice?.invoiceNumber || Date.now();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const secureLink = `${baseUrl}?CInvoiceID=${invoiceId}-${token}`;
    setGeneratedLink(secureLink);
    setIsLinkGenerated(true);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink).then(() => {
        alert("Link copied to clipboard!");
      }).catch(() => {
        alert("Unable to copy link. Please copy manually: " + generatedLink);
      });
    }
  };

  const handleDisableAllActiveLinks = () => {
    if (window.confirm("Are you sure you want to disable all active links for this invoice?")) {
      setGeneratedLink("");
      setIsLinkGenerated(false);
      alert("All active links have been disabled.");
    }
  };

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(inv => {
    const searchLower = invoiceSearch.toLowerCase();
    // Safely get customer name string
    const customerName = (
      inv.customerName ||
      (typeof inv.customer === 'string' ? inv.customer : inv.customer?.displayName || inv.customer?.name || "")
    ).toLowerCase();

    return (
      customerName.includes(searchLower) ||
      (inv.invoiceNumber || "").toLowerCase().includes(searchLower) ||
      (inv.id || "").toLowerCase().includes(searchLower)
    );
  }) : [];

  const thankYouRecipients = selectedContactPersons.length > 0
    ? selectedContactPersons.map((cp: any, index: number) => ({
      key: cp._id || cp.id || `${cp.email || ''}-${cp.firstName || ''}-${cp.lastName || ''}-${index}`,
      displayName: cp.firstName && cp.lastName
        ? `${cp.firstName} ${cp.lastName}`
        : cp.name || cp.displayName || cp.email || 'Contact Person',
      email: cp.email || "",
    }))
    : (customerDetails?.email
      ? [{
        key: "customer-primary-email",
        displayName: customerDetails.name || customerDetails.displayName || formData.customerName || "Customer",
        email: customerDetails.email,
      }]
      : []);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">
            {selectedInvoice ? `Payment for ${selectedInvoice.invoiceNumber || selectedInvoice.id}` : "Record Payment"}
          </h1>
          <div className="flex items-center gap-2">
            {selectedInvoice && (
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
              >
                <Share2 size={16} />
                Share
              </button>
            )}
            <button onClick={() => navigate("/payments/payments-received")} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Early Payment Discount Banner */}
        {showEarlyPaymentBanner && (
          <div className="px-6 py-2.5 bg-[#f0f7ff] text-[#0066cc] border-b border-[#cde2f5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-[#0066cc] rounded-full flex items-center justify-center">
                <Zap size={12} className="text-white fill-white" />
              </div>
              <span className="text-[13px]">
                Encourage faster payments, reduce outstanding invoices and improve cash flow by offering discounts to customers who pay within the specified period.{" "}
                <button className="text-[#0066cc] hover:underline font-medium">Enable Early Payment Discount Now</button>
              </span>
            </div>
            <button
              onClick={() => setShowEarlyPaymentBanner(false)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Form Content */}
        <div className="p-8 w-full">
          <div className="space-y-5">
            {/* Customer Name Row */}
            <div className="bg-[#fafafa] -mx-8 px-8 py-4 mb-8">
              <div className="grid grid-cols-[200px_1fr_auto] gap-4 items-center">
                <label className="text-sm font-medium text-red-500">
                  Customer Name*
                </label>
                <div className="relative" ref={customerDropdownRef}>
                  <div className="flex items-center">
                    <div
                      className="flex-1 border border-gray-300 rounded-l px-3 py-1.5 text-sm flex items-center justify-between cursor-pointer hover:border-gray-400 bg-white min-h-[36px]"
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                    >
                      <span className={formData.customerName ? "text-gray-900" : "text-gray-400"}>
                        {formData.customerName || "Select Customer"}
                      </span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </div>
                    <button
                      type="button"
                      className="h-[36px] px-3 text-white rounded-r border transition-colors flex items-center justify-center"
                      style={{ backgroundColor: "#156372", borderColor: "#156372" }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#0D4A52"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "#156372"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomerSearchModalOpen(true);
                      }}
                    >
                      <Search size={16} />
                    </button>
                  </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="p-2 sticky top-0 bg-white border-b border-gray-100">
                      <div className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1">
                        <Search size={14} className="text-gray-400" />
                        <input
                          autoFocus
                          className="w-full outline-none text-sm p-1"
                          placeholder="Search..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    {customers
                      .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                      .map(c => (
                        <div
                          key={c.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleCustomerSelect(c)}
                        >
                          {c.name}
                        </div>
                      ))}
                    <div
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm border-t border-gray-100 flex items-center gap-2"
                      style={{ color: "#156372" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.target as HTMLDivElement).style.color = "#0D4A52"; }}
                      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.target as HTMLDivElement).style.color = "#156372"; }}
                      onClick={openCustomerQuickAction}
                    >
                      <Plus size={14} /> New Customer
                    </div>
                  </div>
                )}
              </div>
                <div className="pl-4">
                  {formData.customerName && (
                    <button className="bg-[#4a5568] text-white text-[13px] px-4 py-2 rounded flex items-center justify-between gap-4 hover:bg-[#2d3748] min-w-[160px]">
                      <span>{formData.customerName.toLowerCase()}'s Details</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">
                Location
              </label>
              <div className="max-w-[400px]">
                <ZohoSelect
                  value={formData.location}
                  options={locationOptions}
                  onChange={(val) => setFormData(p => ({ ...p, location: val }))}
                  placeholder="Select Location"
                  className={!isCustomerSelected ? 'opacity-50 pointer-events-none bg-gray-100' : ''}
                />
              </div>
            </div>

            {/* Amount Received */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="text-sm font-medium text-red-500 pt-2">
                Amount Received ({baseCurrencyCode})*
              </label>
              <div className="max-w-[400px]">
                <div className={`flex border border-gray-300 rounded overflow-hidden focus-within:border-[#156372] focus-within:ring-2 focus-within:ring-[rgba(21,99,114,0.1)] ${!isCustomerSelected ? 'opacity-50 pointer-events-none bg-gray-100' : ''}`}>
                  <div className="bg-gray-50 border-r border-gray-300 px-3 py-1.5 text-sm text-gray-600 flex items-center">
                    {baseCurrencyCode}
                  </div>
                  <input
                    type="number"
                    className="flex-1 px-3 py-1.5 text-sm outline-none disabled:bg-gray-100"
                    value={formData.amountReceived}
                    onChange={(e) => {
                      const amountStr = e.target.value;
                      setFormData(p => ({ ...p, amountReceived: amountStr }));
                      setReceivedFullAmount(false);

                      // Automatically distribute the amount among unpaid invoices
                      const amount = parseFloat(amountStr) || 0;
                      let remainingAmount = amount;
                      const newPayments: { [key: string]: number } = {};

                      unpaidInvoices.forEach(inv => {
                        const amountDue = parseFloat(computeInvoiceDue(inv) as any || 0);
                        const invKey = inv.id || inv._id;
                        if (remainingAmount >= amountDue) {
                          newPayments[invKey] = amountDue;
                          remainingAmount -= amountDue;
                        } else if (remainingAmount > 0) {
                          newPayments[invKey] = remainingAmount;
                          remainingAmount = 0;
                        } else {
                          newPayments[invKey] = 0;
                        }
                      });
                      setInvoicePayments(newPayments);
                    }}
                    disabled={!isCustomerSelected}
                  />
                </div>
                {getTotalAmountDue() > 0 && (
                  <label className={`flex items-center gap-2 cursor-pointer mt-2 ${!isCustomerSelected ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input
                      type="checkbox"
                      checked={receivedFullAmount}
                      onChange={handleReceivedFullAmount}
                      className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] accent-[#156372]"
                      disabled={!isCustomerSelected}
                    />
                    <span className="text-sm text-gray-700">
                      Received full amount ({baseCurrencyCode}{getTotalAmountDue().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Bank Charges */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">
                Bank Charges (if any)
              </label>
              <div className="max-w-[400px]">
                <input
                  type="number"
                  className={`w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] ${!isCustomerSelected ? 'opacity-50 pointer-events-none bg-gray-100' : ''}`}
                  value={formData.bankCharges}
                  onChange={(e) => setFormData(p => ({ ...p, bankCharges: e.target.value }))}
                  disabled={!isCustomerSelected}
                />
              </div>
            </div>

            {/* Payment Date */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-sm font-medium text-red-500">
                Payment Date*
              </label>
              <div className="max-w-[400px]">
                <input
                  type="date"
                  className={`w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] ${!isCustomerSelected ? 'opacity-50 pointer-events-none bg-gray-100' : ''}`}
                  value={formData.paymentDate}
                  onChange={(e) => setFormData(p => ({ ...p, paymentDate: e.target.value }))}
                  disabled={!isCustomerSelected}
                />
                <div className="text-xs text-gray-600 flex items-center gap-1 mt-2">
                  <span>(As on {formData.paymentDate ? new Date(formData.paymentDate).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : new Date().toISOString().split('T')[0]}) 1 {baseCurrencyCode} = 1 {baseCurrencyCode}</span>
                  <Settings size={12} className="text-gray-400 cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Payment # */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-sm font-medium text-red-500">
                Payment #*
              </label>
              <div className="max-w-[400px] relative">
                <input
                  type="text"
                  className={`w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] ${!isCustomerSelected ? 'opacity-50 pointer-events-none bg-gray-100' : ''}`}
                  value={formData.paymentNumber}
                  onChange={(e) => setFormData(p => ({ ...p, paymentNumber: e.target.value }))}
                  disabled={!isCustomerSelected}
                />
                <Settings size={14} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "#156372" }} />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">
                Payment Mode
              </label>
              <div className="max-w-[400px]">
                <PaymentModeDropdown
                  value={formData.paymentMode}
                  onChange={(val) => setFormData(p => ({ ...p, paymentMode: val }))}
                  className={!isCustomerSelected ? 'opacity-50 pointer-events-none' : ''}
                />
              </div>
            </div>

            {/* Deposit To */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-sm font-medium text-red-500">
                Deposit To*
              </label>
              <div className="max-w-[400px]">
                <ZohoSelect
                  value={formData.depositTo}
                  options={bankAccounts}
                  onChange={(val) => {
                    const account = bankAccounts.find(a => (a.id || a._id) === val || a.name === val);
                    setFormData(p => ({
                      ...p,
                      depositTo: val,
                      depositToAccountId: account?.id || account?._id
                    }));
                  }}
                  placeholder="Select Deposit Account"
                  className={!isCustomerSelected ? 'opacity-50 pointer-events-none' : ''}
                  direction="up"
                  groupBy="account_type"
                />
              </div>
            </div>

            {/* Reference # */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">
                Reference#
              </label>
              <div className="max-w-[400px]">
                <input
                  type="text"
                  className={`w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] ${!isCustomerSelected ? 'opacity-50 pointer-events-none bg-gray-100' : ''}`}
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData(p => ({ ...p, referenceNumber: e.target.value }))}
                  disabled={!isCustomerSelected}
                />
              </div>
            </div>

            {/* Tax deducted? */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">
                Tax deducted?
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taxDeductedDetails"
                    value="no"
                    checked={formData.taxDeducted === "no"}
                    onChange={(e) => setFormData(p => ({ ...p, taxDeducted: e.target.value }))}
                    className="w-4 h-4 border-gray-300 focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] accent-[#156372]"
                    disabled={!isCustomerSelected}
                  />
                  <span className={`text-sm text-gray-700 ${!isCustomerSelected ? 'opacity-50' : ''}`}>No Tax deducted</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taxDeductedDetails"
                    value="yes"
                    checked={formData.taxDeducted === "yes"}
                    onChange={(e) => setFormData(p => ({ ...p, taxDeducted: e.target.value }))}
                    className="w-4 h-4 border-gray-300 focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] accent-[#156372]"
                    disabled={!isCustomerSelected}
                  />
                  <span className={`text-sm text-gray-700 ${!isCustomerSelected ? 'opacity-50' : ''}`}>Yes, TDS</span>
                </label>
              </div>
            </div>

            {isCustomerSelected && Array.isArray(formData.reportingTags) && formData.reportingTags.length > 0 && (
              <>
                {formData.reportingTags.map((tag: any, index: number) => {
                  const tagKey = String(tag?.tagId || tag?.id || tag?.name || index);
                  const tagMeta = buildReportingTagMeta(tag);
                  const selectedValue = String(tag?.value || "");
                  const options = ["", ...tagMeta.options.filter((option: string) => option !== "")];

                  return (
                    <div key={`reporting-tag-${tagKey}-${index}`} className="grid grid-cols-[200px_1fr] gap-4 items-center">
                      <label className={`text-sm font-medium ${tagMeta.isMandatory ? "text-red-500" : "text-gray-700"}`}>
                        {tagMeta.name}{tagMeta.isMandatory ? "*" : ""}
                      </label>
                      <div className="max-w-[400px] relative">
                        <select
                          value={selectedValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => {
                              const nextReportingTags = Array.isArray(prev.reportingTags) ? [...prev.reportingTags] : [];
                              nextReportingTags[index] = {
                                ...nextReportingTags[index],
                                value,
                                name: nextReportingTags[index]?.name || tagMeta.name,
                                tagId: nextReportingTags[index]?.tagId || nextReportingTags[index]?.id || tagKey,
                                id: nextReportingTags[index]?.id || nextReportingTags[index]?.tagId || tagKey,
                              };
                              return { ...prev, reportingTags: nextReportingTags };
                            });
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 pr-9 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)]"
                        >
                          {options.map((option) => (
                            <option key={`${tagKey}-${option || "none"}`} value={option}>
                              {option || "None"}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Unpaid Invoices Section */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 border-b-2 border-transparent pb-1">
                    <span className="text-sm font-bold text-gray-900">Unpaid Invoices</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="relative" ref={dateRangeDropdownRef}>
                    <button
                      onClick={() => setIsDateRangeDropdownOpen(!isDateRangeDropdownOpen)}
                      className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-gray-900"
                    >
                      <Calendar size={14} className="text-gray-400" />
                      Filter by Date Range
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    {isDateRangeDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[250px]">
                        <div className="p-3 space-y-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">From Date</label>
                            <input
                              type="date"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                              value={dateRangeFilter.split(' - ')[0] || ''}
                              onChange={(e) => {
                                const fromDate = e.target.value;
                                const toDate = dateRangeFilter.split(' - ')[1] || '';
                                setDateRangeFilter(toDate ? `${fromDate} - ${toDate}` : fromDate);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">To Date</label>
                            <input
                              type="date"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                              value={dateRangeFilter.split(' - ')[1] || ''}
                              onChange={(e) => {
                                const fromDate = dateRangeFilter.split(' - ')[0] || '';
                                const toDate = e.target.value;
                                setDateRangeFilter(fromDate ? `${fromDate} - ${toDate}` : toDate);
                              }}
                            />
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-gray-200">
                            <button
                              onClick={() => {
                                setDateRangeFilter('');
                                setIsDateRangeDropdownOpen(false);
                              }}
                              className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => setIsDateRangeDropdownOpen(false)}
                              className="flex-1 px-3 py-1.5 text-xs text-white rounded"
                              style={{ backgroundColor: '#156372' }}
                              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#0D4A52'}
                              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#156372'}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClearAppliedAmount}
                  className="text-[13px] font-medium"
                  style={{ color: "#156372" }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.color = "#0D4A52"}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.color = "#156372"}
                >
                  Clear Applied Amount
                </button>
              </div>

              <div className="relative border border-gray-200 rounded overflow-hidden mb-6">
                <table className="w-full text-[13px]">
                  <thead className="bg-[#f9fafb] text-gray-500 font-medium uppercase text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">DATE</th>
                      <th className="px-4 py-3 text-left font-semibold">INVOICE NUMBER</th>
                      <th className="px-4 py-3 text-left font-semibold">ORDER NUMBER</th>
                      <th className="px-4 py-3 text-left font-semibold">INVOICE AMOUNT</th>
                      <th className="px-4 py-3 text-left font-semibold">AMOUNT DUE</th>
                      <th className="px-4 py-3 text-left font-semibold flex items-center gap-1">
                        PAYMENT RECEIVED ON <Info size={12} className="text-gray-400" />
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">PAYMENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidInvoices.length > 0 ? (
                      unpaidInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{formatDate(invoice.invoiceDate || invoice.date)}</td>
                          <td className="px-4 py-3" style={{ color: "#156372" }} onMouseEnter={(e: React.MouseEvent<HTMLTableCellElement>) => (e.target as HTMLTableCellElement).style.color = "#0D4A52"} onMouseLeave={(e: React.MouseEvent<HTMLTableCellElement>) => (e.target as HTMLTableCellElement).style.color = "#156372"}>{invoice.invoiceNumber || invoice.id}</td>
                          <td className="px-4 py-3 text-gray-900">{invoice.orderNumber || "-"}</td>
                          <td className="px-4 py-3 text-gray-900">{formatCurrency(invoice.total || invoice.amount, invoice.currency || formData.currency)}</td>
                          <td className="px-4 py-3 text-gray-900">{formatCurrency(invoice.balanceDue || invoice.total || invoice.amount, invoice.currency || formData.currency)}</td>
                          <td className="px-4 py-3 text-gray-900">{formData.paymentDate ? formatDate(formData.paymentDate) : "-"}</td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              className="w-24 text-right border-none outline-none focus:ring-0 p-1"
                              value={invoicePayments[invoice.id || invoice._id] || 0}
                              onChange={(e) => handleInvoicePaymentChange(invoice.id || invoice._id, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-gray-500 italic bg-white">
                          There are no unpaid invoices associated with this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end gap-2 mb-8">
                <div className="flex items-center gap-12 text-[13px] text-gray-500 mb-4 pr-4">
                  <span className="italic">**List contains only UNPAID invoices</span>
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500 uppercase">Total Due</span>
                      <span className="font-semibold text-gray-700">{getTotalAmountDue().toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 uppercase">Total Payment</span>
                      <span className="font-semibold text-gray-900 w-24 text-right">{getTotalAppliedAmount().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="w-[400px] bg-[#f9fafb] border border-gray-100 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-gray-600 font-medium">Amount Received :</span>
                    <span className="text-gray-900">{(parseFloat(formData.amountReceived) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-gray-600 font-medium">Amount used for Payments :</span>
                    <span className="text-gray-900">{getTotalAppliedAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-gray-600 font-medium">Amount Refunded :</span>
                    <span className="text-gray-900">0.00</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle size={14} /> Amount in Excess:
                    </span>
                    <span className="text-gray-900 font-bold">{baseCurrencyCode} {Math.max(0, (parseFloat(formData.amountReceived) || 0) - getTotalAppliedAmount()).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <label className="text-[13px] font-medium text-gray-700">
                Notes (Internal use. Not visible to customer)
              </label>
              <textarea
                className={`w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 min-h-[80px] resize-y ${!isCustomerSelected ? 'opacity-50 pointer-events-none bg-gray-100' : ''}`}
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                disabled={!isCustomerSelected}
              />
            </div>

            {/* Attachments */}
            <div className="mt-8 space-y-2">
              <label className="text-[13px] font-medium text-gray-700">
                Attachments
              </label>
              <div className="relative inline-block" ref={uploadDropdownRef}>
                <button
                  type="button"
                  className={`h-9 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2 ${!isCustomerSelected ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
                  disabled={attachedFiles.length >= 5 || !isCustomerSelected}
                >
                  <Upload size={14} className="text-gray-500" />
                  Upload File
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {isUploadDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-[200px] py-1">
                    <div
                      onClick={handleAttachFromDesktop}
                      className="px-4 py-2 text-sm text-white cursor-pointer transition-colors flex items-center gap-3"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.target as HTMLDivElement).style.opacity = "0.9"}
                      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.target as HTMLDivElement).style.opacity = "1"}
                    >
                      <Upload size={14} />
                      Attach From Desktop
                    </div>
                    <div
                      className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors flex items-center gap-3"
                      onClick={handleAttachFromDocuments}
                    >
                      <FileText size={14} className="text-gray-400" />
                      Attach From Documents
                    </div>
                    <div
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                      onClick={() => {
                        setSelectedCloudProvider("zoho");
                        setIsUploadDropdownOpen(false);
                        setIsCloudPickerOpen(true);
                      }}
                    >
                      <Cloud size={14} className="text-gray-400" />
                      Attach From Cloud
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[11px] text-gray-400">You can upload a maximum of 5 files, 5MB each</div>
              {attachedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">{f.name}</span>
                      </div>
                      <button onClick={() => setAttachedFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendThankYouNote"
                  checked={formData.sendThankYouNote}
                  onChange={(e) => setFormData(p => ({ ...p, sendThankYouNote: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6]"
                  disabled={!isCustomerSelected}
                />
                <span className={`text-[15px] text-gray-700 ${!isCustomerSelected ? 'opacity-50' : ''}`}>
                  Send a "Thank you" note for this payment
                </span>
              </label>

              {formData.sendThankYouNote && thankYouRecipients.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {thankYouRecipients.map((recipient) => {
                    return (
                      <label
                        key={recipient.key}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-[#f3f4f6] px-4 py-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          readOnly
                          className="h-4 w-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6]"
                        />
                        <span>
                          {recipient.displayName}
                          {recipient.email && <span className="text-gray-600"> &lt;{recipient.email}&gt;</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-[15px] text-[#667085]">
                <span className="font-semibold">Additional Fields:</span> Start adding custom fields for your payments received by going to{" "}
                <span className="italic">Settings</span> {"->"} <span className="italic">Sales</span> {"->"} <span className="italic">Payments Received</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-[260px] right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2 z-10">
          <button
            onClick={() => handleSave("draft")}
            disabled={saveLoading !== null}
            className={`bg-[#f5f5f5] border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors ${saveLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-[#efefef]"}`}
          >
            {saveLoading === "draft" && <Loader2 className="inline-block mr-2 animate-spin" size={16} />}
            {saveLoading === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => handleSave("paid")}
            disabled={saveLoading !== null}
            className={`bg-[#22c55e] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${saveLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-[#16a34a]"}`}
          >
            {saveLoading === "paid" ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              <>
                <span className="text-base leading-none font-bold text-white" aria-hidden="true">&#10003;</span>
                Save as Paid
              </>
            )}
          </button>
          <button
            onClick={() => navigate("/payments/payments-received")}
            disabled={saveLoading !== null}
            className={`bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors ${saveLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-[#f9fafb]"}`}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && selectedInvoice && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShareModal(false);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in duration-200"
            ref={shareModalRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                Share Invoice Link
              </h2>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                onClick={() => setShowShareModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Visibility Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Visibility:
                </label>
                <div className="relative" ref={visibilityDropdownRef}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white transition-all transition-all"
                    style={{ color: "#156372" }}
                    onClick={() => setIsVisibilityDropdownOpen(!isVisibilityDropdownOpen)}
                  >
                    <span className="font-bold">{shareVisibility}</span>
                    <ChevronDown size={16} style={{ color: "#156372" }} />
                  </button>
                  {isVisibilityDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                      <div
                        className="px-4 py-3 text-sm font-semibold cursor-pointer"
                        style={{ color: "#156372" }}
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.target as HTMLDivElement).style.backgroundColor = "rgba(21, 99, 114, 0.1)"; }}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.target as HTMLDivElement).style.backgroundColor = "transparent"; }}
                        onClick={() => {
                          setShareVisibility("Public");
                          setIsVisibilityDropdownOpen(false);
                        }}
                      >
                        Public
                      </div>
                      <div
                        className="px-4 py-3 text-sm text-gray-700 font-semibold cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setShareVisibility("Private");
                          setIsVisibilityDropdownOpen(false);
                        }}
                      >
                        Private
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description Text */}
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Select an expiration date and generate the link to share it with your customer. Anyone who has access to this link can view, print or download it.
              </p>

              {/* Link Expiration Date */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-red-600 mb-2">
                  Link Expiration Date*
                </label>
                <input
                  type="text"
                  value={linkExpirationDate}
                  onChange={(e) => setLinkExpirationDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] focus:border-[#156372] focus:bg-white bg-gray-50 transition-all font-sans"
                />
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <HelpCircle size={14} className="text-gray-400 flex-shrink-0" />
                  <span>By default, the link is set to expire 90 days from the invoice due date.</span>
                </div>
              </div>

              {/* Generated Link Display */}
              {isLinkGenerated && generatedLink && (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Generated Link:
                  </label>
                  <textarea
                    readOnly
                    value={generatedLink}
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl text-xs bg-gray-50 font-mono resize-none font-medium"
                    style={{ color: "#156372" }}
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
              {!isLinkGenerated ? (
                <>
                  <button
                    className="px-8 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "0.9"}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "1"}
                    onClick={handleGenerateLink}
                  >
                    Generate Link
                  </button>
                  <button
                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
                    onClick={() => setShowShareModal(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="px-8 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "0.9"}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "1"}
                    onClick={handleCopyLink}
                  >
                    Copy Link
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                      onClick={handleDisableAllActiveLinks}
                    >
                      Disable All Links
                    </button>
                    <button
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
                      onClick={() => setShowShareModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Choose from Documents Modal */}
      {isDocumentsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[640px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Choose from Documents</h2>
                <p className="text-sm text-gray-500 mt-1">Select files from your document library</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="w-64 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setIsDocumentsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar - Inbox Types */}
              <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-1">
                {[
                  { id: "files", label: "Files", icon: Folder },
                  { id: "bankStatements", label: "Bank Statements", icon: Building2 },
                  { id: "allDocuments", label: "All Documents", icon: Zap }
                ].map((inbox) => (
                  <button
                    key={inbox.id}
                    onClick={() => setSelectedDocumentCategory(inbox.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${selectedDocumentCategory === inbox.id
                      ? "text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-200"
                      }`}
                    style={selectedDocumentCategory === inbox.id ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                  >
                    <inbox.icon size={18} />
                    {inbox.label}
                  </button>
                ))}
              </div>

              {/* Main Documents List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                {(() => {
                  let filteredDocs = availableDocuments;
                  if (selectedDocumentCategory === "files") {
                    filteredDocs = availableDocuments.filter(doc => doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder);
                  } else if (selectedDocumentCategory === "bankStatements") {
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
                        <p className="text-gray-500 font-medium">No documents found matching your criteria.</p>
                      </div>
                    );
                  }

                  return filteredDocs.map((doc: any) => (
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
                        ? "bg-[rgba(21,99,114,0.1)]"
                        : "border-gray-100 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      style={selectedDocuments.includes(doc.id) ? { borderColor: "#156372" } : {}}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${selectedDocuments.includes(doc.id) ? 'text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-white'}`}
                          style={selectedDocuments.includes(doc.id) ? { background: "#156372" } : {}}
                        >
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
                        ? "text-white"
                        : "border-gray-300"
                        }`}
                        style={selectedDocuments.includes(doc.id) ? { background: "#156372", borderColor: "#156372" } : { borderColor: "#d1d5db" }}
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { if (!selectedDocuments.includes(doc.id)) e.target.style.borderColor = "#156372"; }}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { if (!selectedDocuments.includes(doc.id)) e.target.style.borderColor = "#d1d5db"; }}
                      >
                        {selectedDocuments.includes(doc.id) && <Check size={14} />}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => setIsDocumentsModalOpen(false)}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDocuments.length > 0) {
                    const selectedDocs = availableDocuments.filter(doc => selectedDocuments.includes(doc.id)).map((doc: any) => ({
                      name: doc.name,
                      size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                      type: doc.type
                    }));
                    setAttachedFiles((prev: File[]) => [...prev, ...selectedDocs as File[]].slice(0, 10));
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                  }
                }}
                disabled={selectedDocuments.length === 0}
                className="px-8 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all font-sans"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { if (!e.target.disabled) e.target.style.opacity = "0.9"; }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { if (!e.target.disabled) e.target.style.opacity = "1"; }}
              >
                Attach {selectedDocuments.length > 0 ? `(${selectedDocuments.length}) ` : ""}Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Picker Modal */}
      {isCloudPickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
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
                      style={selectedCloudProvider === provider.id ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
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
                    Connect your team's shared cloud storage to collaborate faster on payments.
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
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho. The use and transfer of information received from Google APIs to Zoho will adhere to{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          Google API Services User Data Policy
                        </a>
                        , including the{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
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
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "0.9"}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "1"}
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
                            <linearGradient id="dropboxGradientPayment" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0061FF" />
                              <stop offset="100%" stopColor="#0052CC" />
                            </linearGradient>
                          </defs>
                          <g fill="url(#dropboxGradientPayment)">
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
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
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
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "0.9"}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "1"}
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
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
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
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "0.9"}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "1"}
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
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
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
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "0.9"}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "1"}
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
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
                          { id: 'cf1', name: 'Payment_Receipt.pdf', size: 1048576, modified: '2 days ago', type: 'pdf' },
                          { id: 'cf2', name: 'Bank_Statement.pdf', size: 2097152, modified: 'Yesterday', type: 'pdf' },
                          { id: 'cf3', name: 'Invoice_Copy.pdf', size: 524288, modified: '1 week ago', type: 'pdf' },
                          { id: 'cf4', name: 'Transaction_Proof.jpg', size: 4194304, modified: '3 hours ago', type: 'image' },
                          { id: 'cf5', name: 'Payment_Records.zip', size: 8388608, modified: 'May 12, 2025', type: 'zip' },
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
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-white border-transparent hover:bg-slate-50'
                                }`}
                            >
                              <div className="w-[60%] flex items-center gap-3">
                                <div className={`w-8 h-8 rounded flex items-center justify-center ${selectedCloudFiles.find(sf => sf.id === file.id) ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                                  }`}>
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
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
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
                    setAttachedFiles(prev => [...prev, ...newFiles as File[]]);
                  }
                  setIsCloudPickerOpen(false);
                  setSelectedCloudFiles([]);
                }}
                className={`px-6 py-2 text-white rounded-md text-sm font-medium transition-colors ${selectedCloudFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { if (!e.target.disabled && selectedCloudFiles.length > 0) e.target.style.opacity = "0.9"; }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { if (!e.target.disabled && selectedCloudFiles.length > 0) e.target.style.opacity = "1"; }}
                disabled={selectedCloudFiles.length === 0}
              >
                Attach ({selectedCloudFiles.length})
              </button>
            </div>
          </div>
        </div>
      )}
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
                className="w-8 h-8 text-white rounded flex items-center justify-center"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "0.9"}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.target.style.opacity = "1"}
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
                          className="w-full px-4 py-2 text-sm text-left text-gray-700"
                          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.target.style.backgroundColor = "#156372"; e.target.style.color = "white"; }}
                          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#374151"; }}
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] focus:border-[#156372]"
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
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          handleCustomerSelect(customer);
                          setCustomerSearchModalOpen(false);
                          setCustomerSearchTerm("");
                          setCustomerSearchResults([]);
                        }}
                      >
                        <td className="px-4 py-3 text-sm hover:underline"
                          style={{ color: "#156372" }}
                          onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                          onMouseLeave={(e) => e.target.style.color = "#156372"}
                        >
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

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
        accept="*/*"
      />

      {/* Add Contact Person Modal */}
      {isContactPersonModalOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={handleCancelContactPerson}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add Contact Person</h2>
              <button
                onClick={handleCancelContactPerson}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

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
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      name="lastName"
                      value={newContactPersonData.lastName}
                      onChange={handleContactPersonChange}
                      placeholder="Last Name"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Skype */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skype Name/Number</label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                    <input
                      type="text"
                      name="skypeName"
                      value={newContactPersonData.skypeName}
                      onChange={handleContactPersonChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <img src={contactPersonImage} alt="Profile" className="w-32 h-32 mx-auto rounded-full object-cover" />
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
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700"
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

      {/* Quick New Customer Modal */}
      {typeof document !== "undefined" && document.body && createPortal(
        <div
          className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
          onClick={() => {
            setIsNewCustomerQuickActionOpen(false);
            reloadCustomersForRecordPayment();
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
                    await reloadCustomersForRecordPayment();
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
                  reloadCustomersForRecordPayment();
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
  );
}
