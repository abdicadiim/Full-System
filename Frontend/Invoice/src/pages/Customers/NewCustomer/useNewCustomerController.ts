import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { customersAPI, currenciesAPI, documentsAPI } from "../../../services/api";
import { API_BASE_URL, getToken } from "../../../../services/auth";
import { defaultPaymentTerms, PaymentTerm } from "../../../../hooks/usePaymentTermsDropdown";
import { createDefaultCustomerFormData, CustomerFormData } from "./NewCustomer.constants";
import {
  buildCustomerPayload,
  mapClonedCustomerToFormData,
  mapCustomerToFormData,
  mergeCustomerForUpdate,
  normalizePriceLists,
  normalizeTaxesList,
  processCustomerDocuments,
} from "./NewCustomer.utils";
import {
  buildCustomerValidationErrors,
  mapCustomerApiErrorsToFormErrors,
  resolveCustomerDisplayName,
} from "./NewCustomer.validation";
import { readTaxesLocal } from "../../settings/organization-settings/taxes-compliance/TAX/storage";

export default function useNewCustomerController() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("other-details");
  const [formData, setFormData] = useState<CustomerFormData>(createDefaultCustomerFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDisplayNameManuallyEdited, setIsDisplayNameManuallyEdited] = useState(false);
  const [isCustomerNumberManuallyEdited, setIsCustomerNumberManuallyEdited] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<any>(null);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [availableTaxes, setAvailableTaxes] = useState<any[]>([]);
  const [paymentTermsList, setPaymentTermsList] = useState<PaymentTerm[]>(defaultPaymentTerms);
  const [enableCustomerNumbers, setEnableCustomerNumbers] = useState(true);
  const [customerNumberPrefix, setCustomerNumberPrefix] = useState("CUS-");
  const [customerNumberStart, setCustomerNumberStart] = useState("00003");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [existingCustomerData, setExistingCustomerData] = useState<any | null>(null);

  const scrollCustomerFormToTop = useCallback(() => {
    if (typeof document === "undefined") return;
    const container = document.querySelector<HTMLElement>("[data-new-customer-scroll]");
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isEmbeddedQuickAction = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("embed") === "1" || searchParams.get("quickAction") === "1";
  }, [location.search]);

  const loadTaxes = useCallback(() => {
    try {
      const response = readTaxesLocal();
      setAvailableTaxes(normalizeTaxesList(response));
    } catch {
      setAvailableTaxes([]);
    }
  }, []);

  const loadPriceLists = useCallback(() => {
    setPriceLists(normalizePriceLists(localStorage.getItem("inv_price_lists_v1")));
  }, []);

  useEffect(() => {
    loadTaxes();
    loadPriceLists();
  }, [loadTaxes, loadPriceLists]);

  useEffect(() => {
    if (activeTab === "other-details") {
      loadTaxes();
    }
  }, [activeTab, loadTaxes]);

  useEffect(() => {
    if (!isEditMode) {
      const loadDefaults = async () => {
        try {
          const token = getToken();
          if (!token) return;
          const response = await fetch(`${API_BASE_URL}/settings/customers-vendors`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) return;
          const data = await response.json();
          if (data?.success && data?.data) {
            if (data.data.defaultCustomerType) {
              setFormData((prev) => ({ ...prev, customerType: data.data.defaultCustomerType }));
            }
            if (data.data.enableCustomerNumbers !== undefined) {
              setEnableCustomerNumbers(data.data.enableCustomerNumbers);
            }
            setCustomerNumberPrefix(data.data.customerNumberPrefix || "CUS-");
            setCustomerNumberStart(data.data.customerNumberStart || "00003");
          }
        } catch {
          // Use the built-in defaults.
        }
      };
      loadDefaults();
    }
  }, [isEditMode]);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await currenciesAPI.getAll({ isActive: true });
        if (response?.success) {
          setAvailableCurrencies(response.data || []);
          const base = (response.data || []).find((c: any) => c.isBaseCurrency);
          if (base) setBaseCurrency(base);
          if (!isEditMode && (response.data || []).length > 0) {
            const selected = base || (response.data || []).find((c: any) => c.code === "USD") || response.data[0];
            setFormData((prev) => ({ ...prev, currency: selected.code, exchangeRate: "1.00" }));
          }
        }
      } catch {
        setAvailableCurrencies([]);
      }
    };
    fetchCurrencies();
  }, [isEditMode]);

  useEffect(() => {
    if (location.state?.clonedData && !isEditMode) {
      setFormData((prev) => ({ ...prev, ...mapClonedCustomerToFormData(location.state.clonedData) }));
      if (location.state.clonedData.displayName || location.state.clonedData.name) {
        setIsDisplayNameManuallyEdited(true);
      }
    }
  }, [location.state, isEditMode]);

  useEffect(() => {
    const loadCustomerData = async () => {
      if (!isEditMode || !id) {
        setExistingCustomerData(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await customersAPI.getById(id);
        const customer = response?.data?.customer || response?.data || response;
        if (customer && (customer.id || customer._id || id)) {
          setExistingCustomerData(customer);
          setFormData((prev) => ({ ...prev, ...mapCustomerToFormData(customer) }));
        } else {
          toast.error("Customer not found. You can still edit the form, but changes won't be saved to an existing customer.");
          setExistingCustomerData(null);
        }
      } catch (error: any) {
        toast.error("Error loading customer: " + (error?.message || "Unknown error."));
        setExistingCustomerData(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomerData();
  }, [id, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as any;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (name && errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (name === "displayName") setIsDisplayNameManuallyEdited(true);
    if (name === "customerNumber") setIsCustomerNumberManuallyEdited(true);
    if (name === "firstName" || name === "lastName" || name === "companyName") {
      setIsDisplayNameManuallyEdited(false);
    }
  };

  const applyNextCustomerNumber = useCallback(async (force = false) => {
    if (isEditMode) return;
    if (!enableCustomerNumbers && !force) return;
    if (!force && isCustomerNumberManuallyEdited) return;
    try {
      const nextNumber = await customersAPI.getNextCustomerNumber({ prefix: customerNumberPrefix, start: customerNumberStart });
      setFormData((prev) => ({ ...prev, customerNumber: nextNumber }));
      if (force) setIsCustomerNumberManuallyEdited(false);
      setErrors((prev) => ({ ...prev, customerNumber: "" }));
    } catch {
      // Validation will handle it.
    }
  }, [customerNumberPrefix, customerNumberStart, enableCustomerNumbers, isCustomerNumberManuallyEdited, isEditMode]);

  useEffect(() => {
    applyNextCustomerNumber(false);
  }, [applyNextCustomerNumber]);

  const handleSaveCustomerNumberSettings = async () => {
    setIsSavingSettings(true);
    try {
      const token = getToken();
      if (token) {
        const currentRes = await fetch(`${API_BASE_URL}/settings/customers-vendors`, { headers: { Authorization: `Bearer ${token}` } });
        const currentData = currentRes.ok ? await currentRes.json() : { data: {} };
        await fetch(`${API_BASE_URL}/settings/customers-vendors`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...(currentData.data || {}),
            enableCustomerNumbers: true,
            customerNumberPrefix,
            customerNumberStart,
          }),
        });
      }
      setEnableCustomerNumbers(true);
      await applyNextCustomerNumber(true);
    } catch (error: any) {
      toast.error("Error saving customer number settings: " + (error?.message || "Unknown error."));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSave = async () => {
    const resolvedDisplayName = resolveCustomerDisplayName(formData);
    const saveFormData: CustomerFormData =
      String(formData.displayName || "").trim() || !resolvedDisplayName
        ? formData
        : {
            ...formData,
            displayName: resolvedDisplayName,
          };

    if (!String(formData.displayName || "").trim() && resolvedDisplayName) {
      setFormData((prev) =>
        String(prev.displayName || "").trim()
          ? prev
          : { ...prev, displayName: resolvedDisplayName },
      );
    }

    let resolvedCustomerNumber = String(formData.customerNumber || "").trim();
    setIsSaving(true);
    if (!isEditMode && enableCustomerNumbers && !resolvedCustomerNumber) {
      try {
        resolvedCustomerNumber = await customersAPI.getNextCustomerNumber({ prefix: customerNumberPrefix, start: customerNumberStart });
        setFormData((prev) => ({ ...prev, customerNumber: resolvedCustomerNumber }));
        setIsCustomerNumberManuallyEdited(false);
      } catch {
        // validation handles it
      }
    }

    const nextErrors = buildCustomerValidationErrors(saveFormData, {
      availableCurrencies,
      availableTaxes,
      enableCustomerNumbers,
      resolvedCustomerNumber,
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setIsSaving(false);
      const hasContactPersonErrors = Object.keys(nextErrors).some((key) => key.startsWith("contactPersons."));
      setActiveTab(hasContactPersonErrors ? "contact-persons" : "other-details");
      const firstErrorKey = Object.keys(nextErrors)[0];
      const firstErrorMessage = firstErrorKey ? nextErrors[firstErrorKey] : "";
      toast.error(firstErrorMessage || "Please fix the highlighted fields before saving.");
      scrollCustomerFormToTop();
      return;
    }

    setErrors({});
    try {
      const processedDocumentsPromise = processCustomerDocuments(saveFormData.documents || [], documentsAPI);
      const customerNumberPromise =
        !isEditMode && enableCustomerNumbers && !resolvedCustomerNumber
          ? customersAPI.getNextCustomerNumber({ prefix: customerNumberPrefix, start: customerNumberStart })
          : Promise.resolve(resolvedCustomerNumber);

      const [processedDocuments, nextCustomerNumber] = await Promise.all([
        processedDocumentsPromise,
        customerNumberPromise,
      ]);

      if (!isEditMode && enableCustomerNumbers && !resolvedCustomerNumber) {
        resolvedCustomerNumber = nextCustomerNumber;
        setFormData((prev) => ({ ...prev, customerNumber: nextCustomerNumber }));
      }

      const buildSavePayload = (documents: any[]) => {
        const customerData = buildCustomerPayload(saveFormData, enableCustomerNumbers, resolvedCustomerNumber, {
          availableCurrencies,
          paymentTermsList,
        });
        customerData.documents = documents;
        return customerData;
      };

      const submitCustomer = async (documents: any[]) => {
        const customerData = buildSavePayload(documents);
        return isEditMode && id
          ? await customersAPI.update(id, mergeCustomerForUpdate(existingCustomerData, customerData))
          : await customersAPI.create(customerData);
      };

      let response = await submitCustomer(processedDocuments);

      if (!response?.success) {
        const isPayloadTooLarge =
          Number(response?.status) === 413 ||
          /too large|entity too large|request entity too large/i.test(String(response?.message || ""));

        if (isPayloadTooLarge && processedDocuments.length > 0) {
          const retryResponse = await submitCustomer([]);
          if (retryResponse?.success) {
            response = retryResponse;
            toast.warning("Customer was saved without attachments because the upload payload was too large.");
          } else {
            response = retryResponse;
          }
        }
      }

      if (!response?.success) {
        const apiErrors = mapCustomerApiErrorsToFormErrors(response);
        if (Object.keys(apiErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...apiErrors }));
          setActiveTab("other-details");
          toast.error(response?.message || "Failed to save customer");
          return;
        }
        throw new Error(response?.message || "Failed to save customer");
      }

      const savedCustomer =
        response?.data?.customer ||
        response?.data?.customerData ||
        response?.data ||
        response;
      const savedCustomerId =
        String(
          savedCustomer?._id ||
          savedCustomer?.id ||
          savedCustomer?.customerId ||
          savedCustomer?.customer_id ||
          ""
        ).trim();

      const resolveSavedCustomer = async () => {
        if (savedCustomerId) return savedCustomer;

        try {
          const searchTerm = String(resolvedDisplayName || formData.customerNumber || "").trim();
          if (!searchTerm) return savedCustomer;

          const lookup = await customersAPI.getAll({ search: searchTerm, limit: 10 });
          const rows = Array.isArray(lookup?.data) ? lookup.data : [];
          const matched = rows.find((row: any) => {
            const rowId = String(row?._id || row?.id || "").trim();
            const rowDisplayName = String(row?.displayName || row?.name || "").trim().toLowerCase();
            const rowCustomerNumber = String(row?.customerNumber || row?.customer_number || "").trim().toLowerCase();
            const rowEmail = String(row?.email || "").trim().toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            return Boolean(rowId) && (
              rowDisplayName === searchLower ||
              rowCustomerNumber === searchLower ||
              rowEmail === searchLower
            );
          });

          return matched || savedCustomer;
        } catch {
          return savedCustomer;
        }
      };

      const normalizedSavedCustomer = await resolveSavedCustomer();
      const normalizedSavedCustomerId = String(
        normalizedSavedCustomer?._id ||
        normalizedSavedCustomer?.id ||
        normalizedSavedCustomer?.customerId ||
        normalizedSavedCustomer?.customer_id ||
        ""
      ).trim();

      toast.success(isEditMode ? "Customer updated successfully." : "Customer created successfully.");
      if (!isEditMode && isEmbeddedQuickAction && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "quick-action-created", entity: "customer", data: normalizedSavedCustomer }, window.location.origin);
      }
      window.dispatchEvent(new CustomEvent("customersUpdated", { detail: { customer: normalizedSavedCustomer, action: isEditMode ? "updated" : "created" } }));

      setTimeout(() => {
        const returnTo = location.state?.returnTo;
        if (returnTo) navigate(returnTo);
        else if (isEditMode && id) navigate(`/sales/customers/${id}`);
        else navigate("/sales/customers");
      }, 100);
    } catch (error: any) {
      toast.error("Failed to save customer: " + (error.message || "Unknown error."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isEmbeddedQuickAction && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "quick-action-cancel", entity: "customer" }, window.location.origin);
      return;
    }
    navigate("/sales/customers");
  };

  return {
    id,
    isEditMode,
    isLoading,
    isSaving,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    errors,
    setErrors,
    isDisplayNameManuallyEdited,
    setIsDisplayNameManuallyEdited,
    isCustomerNumberManuallyEdited,
    setIsCustomerNumberManuallyEdited,
    availableCurrencies,
    baseCurrency,
    priceLists,
    availableTaxes,
    paymentTermsList,
    setPaymentTermsList,
    enableCustomerNumbers,
    customerNumberPrefix,
    setCustomerNumberPrefix,
    customerNumberStart,
    setCustomerNumberStart,
    isSavingSettings,
    handleChange,
    handleSave,
    handleCancel,
    handleSaveCustomerNumberSettings,
    loadTaxes,
    isEmbeddedQuickAction,
    setEnableCustomerNumbers,
  };
}
