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


export function useNewQuoteCustomerAddress(controller: any) {
  const {
  navigate, location, baseCurrencyCode, quoteId, isEditMode, clonedDataFromState, saveLoading, setSaveLoading,
  taxes, setTaxes, enabledSettings, setEnabledSettings, formData, setFormData, hasAppliedCloneRef, discountMode,
  showTransactionDiscount, showShippingCharges, showAdjustment, taxMode, toNumberSafe, resolveSubtotalFromQuoteLike, normalizeDiscountForForm, isDiscountAccountOpen,
  setIsDiscountAccountOpen, discountAccountSearch, setDiscountAccountSearch, filteredDiscountAccounts, groupedDiscountAccounts, discountAccountDropdownRef, isCustomerDropdownOpen, setIsCustomerDropdownOpen,
  customerSearch, setCustomerSearch, selectedCustomer, setSelectedCustomer, customerDefaultTaxId, setCustomerDefaultTaxId, billingAddress, setBillingAddress,
  shippingAddress, setShippingAddress, isAddressModalOpen, setIsAddressModalOpen, addressModalType, setAddressModalType, isAddressSaving, setIsAddressSaving,
  isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen, phoneCodeSearch, setPhoneCodeSearch, phoneCodeDropdownRef, addressFormData, setAddressFormData, customerSearchModalOpen,
  setCustomerSearchModalOpen, customerSearchCriteria, setCustomerSearchCriteria, customerSearchTerm, setCustomerSearchTerm, customerSearchResults, setCustomerSearchResults, customerSearchPage,
  setCustomerSearchPage, customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen, isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen, customerQuickActionFrameKey, setCustomerQuickActionFrameKey, isNewProjectQuickActionOpen,
  setIsNewProjectQuickActionOpen, projectQuickActionFrameKey, setProjectQuickActionFrameKey, customerQuickActionBaseIds, setCustomerQuickActionBaseIds, projectQuickActionBaseIds, setProjectQuickActionBaseIds, isRefreshingCustomersQuickAction,
  setIsRefreshingCustomersQuickAction, isRefreshingProjectsQuickAction, setIsRefreshingProjectsQuickAction, isReloadingCustomerFrame, setIsReloadingCustomerFrame, isReloadingProjectFrame, setIsReloadingProjectFrame, isAutoSelectingCustomerFromQuickAction,
  setIsAutoSelectingCustomerFromQuickAction, isAutoSelectingProjectFromQuickAction, setIsAutoSelectingProjectFromQuickAction, isSalespersonDropdownOpen, setIsSalespersonDropdownOpen, salespersonSearch, setSalespersonSearch, selectedSalesperson,
  setSelectedSalesperson, isManageSalespersonsOpen, setIsManageSalespersonsOpen, manageSalespersonSearch, setManageSalespersonSearch, manageSalespersonMenuOpen, setManageSalespersonMenuOpen, selectedSalespersonIds,
  setSelectedSalespersonIds, menuPosition, setMenuPosition, isNewSalespersonFormOpen, setIsNewSalespersonFormOpen, isAddContactPersonModalOpen, setIsAddContactPersonModalOpen, contactPersonData,
  setContactPersonData, newSalespersonData, setNewSalespersonData, salespersons, setSalespersons, openItemDropdowns, setOpenItemDropdowns, itemSearches,
  setItemSearches, openTaxDropdowns, setOpenTaxDropdowns, isNewTaxQuickModalOpen, setIsNewTaxQuickModalOpen, newTaxTargetItemId, setNewTaxTargetItemId, taxSearches,
  setTaxSearches, selectedItemIds, setSelectedItemIds, itemDropdownRefs, taxDropdownRefs, taxOptionGroups, getFilteredTaxGroups, openItemMenuId,
  setOpenItemMenuId, itemMenuRefs, isBulkAddModalOpen, setIsBulkAddModalOpen, bulkAddInsertIndex, setBulkAddInsertIndex, bulkAddSearch, setBulkAddSearch,
  bulkSelectedItems, setBulkSelectedItems, bulkSelectedItemIds, setBulkSelectedItemIds, isTheseDropdownOpen, setIsTheseDropdownOpen, showAdditionalInformation, setShowAdditionalInformation,
  additionalInfoItemIds, setAdditionalInfoItemIds, useSimplifiedView, setUseSimplifiedView, isNewItemModalOpen, setIsNewItemModalOpen, isReportingTagsModalOpen, setIsReportingTagsModalOpen,
  availableReportingTags, setAvailableReportingTags, reportingTagSelections, setReportingTagSelections, currentReportingTagsItemId, setCurrentReportingTagsItemId, isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen,
  formErrors, setFormErrors, showAdditionalInformationEffective, newItemData, setNewItemData, newItemImage, setNewItemImage, newItemImageRef,
  isProjectDropdownOpen, setIsProjectDropdownOpen, projectSearch, setProjectSearch, projects, setProjects, selectedProject, setSelectedProject,
  selectedCustomerIdForProjects, setSelectedCustomerIdForProjects, isNewProjectModalOpen, setIsNewProjectModalOpen, newProjectData, setNewProjectData, bankAccounts, setBankAccounts,
  projectDropdownRef, isQuoteDatePickerOpen, setIsQuoteDatePickerOpen, isExpiryDatePickerOpen, setIsExpiryDatePickerOpen, quoteDateCalendar, setQuoteDateCalendar, expiryDateCalendar,
  setExpiryDateCalendar, customerDropdownRef, salespersonDropdownRef, quoteDatePickerRef, expiryDatePickerRef, fileInputRef, isUploadDropdownOpen, setIsUploadDropdownOpen,
  uploadDropdownRef, isDocumentsModalOpen, setIsDocumentsModalOpen, selectedInbox, setSelectedInbox, documentSearch, setDocumentSearch, selectedDocuments,
  setSelectedDocuments, availableDocuments, setAvailableDocuments, isCloudPickerOpen, setIsCloudPickerOpen, selectedCloudProvider, setSelectedCloudProvider, customers,
  setCustomers, isCustomersLoading, setIsCustomersLoading, isCustomerActive, isItemActive, availableItems, setAvailableItems, loadCustomersForDropdown,
  isQuoteNumberModalOpen, setIsQuoteNumberModalOpen, quoteNumberMode, setQuoteNumberMode, quotePrefix, setQuotePrefix, quoteNextNumber, setQuoteNextNumber,
  quoteSeriesSyncRef, quoteSeriesRow, setQuoteSeriesRow, quoteSeriesRows, setQuoteSeriesRows, isPriceListDropdownOpen, setIsPriceListDropdownOpen, priceListSearch,
  setPriceListSearch, catalogPriceListsRaw, setCatalogPriceListsRaw, catalogPriceLists, setCatalogPriceLists, priceListSwitchDialog, setPriceListSwitchDialog, isLocationFeatureEnabled,
  setIsLocationFeatureEnabled, locationOptions, setLocationOptions, isLocationDropdownOpen, setIsLocationDropdownOpen, priceListDropdownRef, currencyMap, setCurrencyMap,
  contactPersons, setContactPersons, vendorContactPersons, setVendorContactPersons, selectedContactPersons, setSelectedContactPersons, isEmailCommunicationsOpen, setIsEmailCommunicationsOpen,
  getCurrencySymbol, formatMoneyForDropdown, months, daysOfWeek, sanitizeQuotePrefix, extractQuoteDigits, deriveQuotePrefixFromNumber, buildQuoteNumber,
  isQuoteSeriesRow, resolveQuoteSeriesRow, resolveSeriesNextDigits, formatPriceListDisplayLabel, normalizeCatalogPriceLists, loadCatalogPriceLists, selectedPriceListOption, normalizeSelectedPriceListName,
  selectedPriceListDisplay, filteredPriceListOptions, selectedPriceList, resolveCustomerPriceListDefault, applyResolvedPriceListChoice, parsePercentage, applyRounding, getIndividualPriceListRate,
  applyPriceListToBaseRate, normalizeReportingTagOptions, normalizeReportingTagAppliesTo, loadReportingTags, handleCustomerSearch, customerResultsPerPage, customerStartIndex, customerEndIndex,
  customerPaginatedResults, customerTotalPages, formatDate, getDateOnly, isPastDate, formatDateForDisplay, convertToISODate, getDaysInMonth,
  handleSalespersonSelect, filteredCustomers, filteredSalespersons, filteredManageSalespersons, handleNewSalespersonChange, handleSaveAndSelectSalesperson, handleDeleteSalesperson, handleCancelNewSalesperson,
  handleOpenReportingTagsModal, handleSaveReportingTags, getItemReportingTagsSummaryLabel, getFilteredItems, resolveItemTaxId, getFilteredTaxes, parseTaxRate, getTaxBySelection,
  getTaxMetaFromItem, isTaxInclusiveMode, defaultTaxId, calculateLineTaxAmount, computeDiscountAmount, applyDiscountShare, taxBreakdown, handleItemSelect,
  toggleItemDropdown, calculateAllTotals, handleItemChange, handleTaxCreatedFromModal, handleAddItem, handleInsertHeader, handleRemoveItem, handleDuplicateItem,
  getBulkFilteredItems, handleBulkItemToggle, handleBulkItemQuantityChange, handleAddBulkItems, handleCancelBulkAdd, handleSelectAllItems, handleDeselectAllItems, handleToggleItemSelection,
  handleDeleteSelectedItems, handleFileUpload, handleRemoveFile, parseFileSize, handleUploadClick, handleNewItemChange, handleNewItemImageUpload, handleSaveNewItem,
  handleCancelNewItem, filteredProjects, handleProjectSelect, handleNewProjectChange, handleAddProjectTask, handleRemoveProjectTask, handleProjectTaskChange, handleAddProjectUser,
  handleRemoveProjectUser, handleSaveNewProject, handleCancelNewProject, handleOpenNewProjectModal, handleContactPersonChange, handleContactPersonImageUpload, handleSaveContactPerson, uploadQuoteFiles,
  validateForm, buildQuoteFinancialsAndItems, extractSavedQuoteId, getNextQuoteNumberForSave, persistQuoteSeriesPreferences, handleSaveDraft, handleSaveAndSend, handleCancel,
  handleOtherAction
} = controller as any;  const handleDateSelect = (date, type) => {

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

      // Handle upload dropdown
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target)) {
        setIsUploadDropdownOpen(false);
      }
    };

    const hasOpenDropdown = isCustomerDropdownOpen || isSalespersonDropdownOpen ||
      isQuoteDatePickerOpen || isExpiryDatePickerOpen || isProjectDropdownOpen ||
      isPriceListDropdownOpen ||
      Object.values(openItemDropdowns).some(Boolean) || Object.values(openTaxDropdowns).some(Boolean) || openItemMenuId !== null || isUploadDropdownOpen;

    if (hasOpenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerDropdownOpen, isSalespersonDropdownOpen, isQuoteDatePickerOpen, isExpiryDatePickerOpen, isProjectDropdownOpen, isPriceListDropdownOpen, openItemDropdowns, openTaxDropdowns, openItemMenuId, isUploadDropdownOpen]);

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
    const previousDefaultTaxId = customerDefaultTaxId;
    const currentPriceListName = normalizeSelectedPriceListName(formData.selectedPriceList);

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
    const nextPriceListName = resolvedPriceList ? String(resolvedPriceList.name || "").trim() : customerPriceListNameRaw;
    const nextCustomerPriceListName = normalizeSelectedPriceListName(nextPriceListName);
    const hadExistingCustomerOrPriceList = Boolean(selectedCustomer) || Boolean(currentPriceListName);
    const shouldPromptForPriceListChange =
      hadExistingCustomerOrPriceList &&
      Boolean(currentPriceListName || nextCustomerPriceListName) &&
      currentPriceListName !== nextCustomerPriceListName;

    const rawCustomerTax =
      (customer as any)?.taxRate ??
      (customer as any)?.taxId ??
      (customer as any)?.defaultTaxId ??
      (customer as any)?.taxName ??
      (customer as any)?.tax ??
      "";
    const matchedTax = getTaxBySelection(rawCustomerTax);
    const resolvedCustomerTaxId = matchedTax
      ? String((matchedTax as any).id || (matchedTax as any)._id || "")
      : (typeof rawCustomerTax === "string" ? rawCustomerTax : "");

    setSelectedCustomer(customer);
    setCustomerDefaultTaxId(resolvedCustomerTaxId);

    setFormData(prev => {
      const customerCurrency = (customer.currency || prev.currency || "USD").split(' - ')[0];
      const nextCurrency = shouldPromptForPriceListChange
        ? prev.currency
        : (resolvedPriceList?.currency ? String(resolvedPriceList.currency).trim() : customerCurrency);

      const updatedItems = prev.items.map((item: any) => {
        if (item.itemType === "header") return item;

        // If the selected customer has a tax, it must take priority over any existing item/default tax.
        if (resolvedCustomerTaxId) {
          const selectedTaxObj: any = getTaxBySelection(resolvedCustomerTaxId) || matchedTax;
          const quantity = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          return {
            ...item,
            tax: resolvedCustomerTaxId,
            taxRate: selectedTaxObj ? parseTaxRate((selectedTaxObj as any).rate) : parseTaxRate(item?.taxRate),
            amount: quantity * rate
          };
        }

        const currentTax = String(item?.tax || "");
        const shouldOverride =
          !currentTax ||
          (previousDefaultTaxId && currentTax === previousDefaultTaxId);
        if (!shouldOverride) return item;

        let effectiveTaxId = resolvedCustomerTaxId;
        let selectedTaxObj: any = null;

        if (effectiveTaxId) {
          selectedTaxObj = getTaxBySelection(effectiveTaxId) || matchedTax;
        } else {
          const rowItemId = String(item?.itemId || "").trim();
          const catalogEntry = rowItemId
            ? availableItems.find((entry: any) => {
              const sourceId = String(entry?.sourceId || "").trim();
              const id = String(entry?.id || "").trim();
              return sourceId === rowItemId || id === rowItemId;
            })
            : null;
          const itemTaxId = catalogEntry ? resolveItemTaxId(catalogEntry) : "";
          effectiveTaxId = itemTaxId || defaultTaxId || "";
          selectedTaxObj = effectiveTaxId ? getTaxBySelection(effectiveTaxId) : null;
        }

        if (!effectiveTaxId) return item;

        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;

        return {
          ...item,
          tax: effectiveTaxId,
          taxRate: selectedTaxObj ? parseTaxRate((selectedTaxObj as any).rate) : parseTaxRate(item?.taxRate),
          amount: quantity * rate
        };
      });

      const nextForm = {
        ...prev,
        customerName: customerName,
        selectedPriceList: shouldPromptForPriceListChange
          ? (normalizeSelectedPriceListName(prev.selectedPriceList) || "Select Price List")
          : (nextCustomerPriceListName || normalizeSelectedPriceListName(prev.selectedPriceList) || "Select Price List"),
        currency: nextCurrency,
        items: updatedItems
      };
      const totals = calculateAllTotals(updatedItems, nextForm);
      return {
        ...nextForm,
        ...totals
      };
    });

    if (shouldPromptForPriceListChange) {
      setPriceListSwitchDialog({
        customerName,
        currentPriceListName,
        nextPriceListName: nextCustomerPriceListName,
        customerCurrency: String(customer?.currency || formData.currency || "USD").split(" - ")[0],
        nextPriceListCurrency: String(resolvedPriceList?.currency || "").trim(),
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


  return {
    handleDateSelect, navigateMonth, handleChange, handleCustomerSelect, openAddressModal, handleAddressFieldChange, handleSaveAddress, countryOptions, phoneCountryOptions, filteredPhoneCountryOptions, selectedAddressCountryIso, stateOptions,
    reloadCustomersForQuote, reloadProjectsForQuote, getEntityId, pickNewestEntity, openCustomerQuickAction, closeCustomerQuickAction, openProjectQuickAction, tryAutoSelectNewCustomerFromQuickAction, tryAutoSelectNewProjectFromQuickAction, handleQuickActionCustomerCreated, handleQuickActionProjectCreated, loadCustomerContactPersons,
    loadVendorContactPersons, loadProjectsForCustomer
  };
}
