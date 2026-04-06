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


export function useNewQuoteCustomerSearch(controller: any) {
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
  applyPriceListToBaseRate, normalizeReportingTagOptions, normalizeReportingTagAppliesTo, loadReportingTags, handleDateSelect, navigateMonth, handleChange, handleCustomerSelect,
  openAddressModal, handleAddressFieldChange, handleSaveAddress, countryOptions, phoneCountryOptions, filteredPhoneCountryOptions, selectedAddressCountryIso, stateOptions,
  reloadCustomersForQuote, reloadProjectsForQuote, getEntityId, pickNewestEntity, openCustomerQuickAction, closeCustomerQuickAction, openProjectQuickAction, tryAutoSelectNewCustomerFromQuickAction,
  tryAutoSelectNewProjectFromQuickAction, handleQuickActionCustomerCreated, handleQuickActionProjectCreated, loadCustomerContactPersons, loadProjectsForCustomer, handleSalespersonSelect, filteredCustomers,
  filteredSalespersons, filteredManageSalespersons, handleNewSalespersonChange, handleSaveAndSelectSalesperson, handleDeleteSalesperson, handleCancelNewSalesperson, handleOpenReportingTagsModal, handleSaveReportingTags,
  getItemReportingTagsSummaryLabel, getFilteredItems, resolveItemTaxId, getFilteredTaxes,
  defaultTaxId, taxBreakdown, handleItemSelect, toggleItemDropdown,
  handleItemChange, handleTaxCreatedFromModal, handleAddItem, handleInsertHeader, handleRemoveItem, handleDuplicateItem, getBulkFilteredItems, handleBulkItemToggle,
  handleBulkItemQuantityChange, handleAddBulkItems, handleCancelBulkAdd, handleSelectAllItems, handleDeselectAllItems, handleToggleItemSelection, handleDeleteSelectedItems, handleFileUpload,
  handleRemoveFile, parseFileSize, handleUploadClick, handleNewItemChange, handleNewItemImageUpload, handleSaveNewItem, handleCancelNewItem, filteredProjects,
  handleProjectSelect, handleNewProjectChange, handleAddProjectTask, handleRemoveProjectTask, handleProjectTaskChange, handleAddProjectUser, handleRemoveProjectUser, handleSaveNewProject,
  handleCancelNewProject, handleOpenNewProjectModal, handleContactPersonChange, handleContactPersonImageUpload, handleSaveContactPerson, uploadQuoteFiles, validateForm, buildQuoteFinancialsAndItems,
  extractSavedQuoteId, getNextQuoteNumberForSave, persistQuoteSeriesPreferences, handleSaveDraft, handleSaveAndSend, handleCancel, handleOtherAction
} = controller as any;  const handleCustomerSearch = () => {
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

  const parseTaxRate = (value: any) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (!value) return 0;
    if (typeof value === "object") {
      return parseTaxRate((value as any).rate ?? (value as any).taxRate ?? (value as any).percentage);
    }
    const text = String(value).trim().replace(/%$/, "");
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getTaxBySelection = (selection: any) => {
    if (!selection && selection !== 0) return null;
    if (typeof selection === "object") return selection;
    const candidate = String(selection).trim().toLowerCase();
    if (!candidate) return null;

    return (Array.isArray(taxes) ? taxes : []).find((tax: any) => {
      const id = String(tax?.id || tax?._id || "").trim().toLowerCase();
      const name = String(tax?.name || tax?.taxName || tax?.displayName || "").trim().toLowerCase();
      const rate = String(parseTaxRate(tax?.rate)).trim().toLowerCase();
      return candidate === id || candidate === name || candidate === rate;
    }) || null;
  };

  const getTaxMetaFromItem = (item: any) => {
    const tax = getTaxBySelection(item?.tax);
    const explicitRate = parseTaxRate(item?.taxRate ?? item?.salesTaxRate ?? item?.taxInfo?.taxRate);
    const rate = tax ? parseTaxRate((tax as any).rate) : explicitRate;
    return {
      tax,
      rate,
    };
  };

  const calculateLineTaxAmount = (amount: number, taxRate: number, isInclusive: boolean) => {
    const baseAmount = Number(amount) || 0;
    const rate = Number(taxRate) || 0;
    if (baseAmount <= 0 || rate <= 0) return 0;
    return isInclusive ? baseAmount - baseAmount / (1 + rate / 100) : (baseAmount * rate) / 100;
  };

  const computeDiscountAmount = (subTotal: number, discountValue: any, discountType: any) => {
    const subtotalNum = Number(subTotal) || 0;
    const value = Number(discountValue) || 0;
    const type = String(discountType || "percent").toLowerCase();
    if (subtotalNum <= 0 || value <= 0) return 0;
    return type === "amount" ? Math.min(value, subtotalNum) : (subtotalNum * value) / 100;
  };

  const applyDiscountShare = (lineAmount: number, subTotal: number, discountAmount: number) => {
    const amount = Number(lineAmount) || 0;
    const subtotalNum = Number(subTotal) || 0;
    const discountNum = Number(discountAmount) || 0;
    if (amount <= 0 || subtotalNum <= 0 || discountNum <= 0) return amount;
    const share = Math.min(discountNum, subtotalNum) * (amount / subtotalNum);
    return Math.max(0, amount - share);
  };

  const isTaxInclusiveMode = (currentFormData: any) =>
    String(currentFormData?.taxExclusive || taxMode || "").toLowerCase().includes("inclusive");

  const calculateAllTotals = (items: any[], currentFormData: any) => {
    const itemRows = (Array.isArray(items) ? items : []).filter((i) => i.itemType !== "header");
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

  const loadVendorContactPersons = async () => {
    try {
      const vendorsResponse = await vendorsAPI.getAll();
      if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
        const allContactPersons: any[] = [];

        for (const vendor of vendorsResponse.data) {
          try {
            const contactResponse = await contactPersonsAPI.getAll(vendor.id || vendor._id);
            if (contactResponse && contactResponse.success && contactResponse.data) {
              const vendorContacts = contactResponse.data.map((contact: any) => ({
                ...contact,
                vendorName: vendor.name || vendor.displayName,
                vendorId: vendor.id || vendor._id,
                type: "vendor"
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
      console.error("Error loading vendor contact persons:", error);
      setVendorContactPersons([]);
    }
  };

  // Update currency when baseCurrencyCode is loaded
  useEffect(() => {
    if (baseCurrencyCode && !isEditMode) {
      setFormData(prev => ({ ...prev, currency: baseCurrencyCode }));
    }
  }, [baseCurrencyCode, isEditMode]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load heavy dropdown data in parallel.
        const [
          projectsResult,
          salespersonsResult,
          itemsResult,
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
          ? (itemsResult.value || [])
            .filter(isItemActive)
            .map((item: any) => ({
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
            .filter((row: any) => row?.id && row?.name)
          : [];
        if (itemsResult.status !== "fulfilled") {
          console.error("Error loading items:", itemsResult.reason);
        }

        // Item selection should show only Items (exclude Plans).
        const combinedItemsAndPlans = [...transformedItems];
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
          const useFetched = fetchedTaxes.length > 0;
          const combinedTaxes = useFetched ? fetchedTaxes : cachedTaxes;
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
          resolvedSeriesRow = resolveQuoteSeriesRow(rows);
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
          const fallbackPrefix = "QT-";
          const fallbackDigits = "000001";
          setQuotePrefix(fallbackPrefix);
          setQuoteNextNumber(fallbackDigits);
          setFormData(prev => ({ ...prev, quoteNumber: buildQuoteNumber(fallbackPrefix, fallbackDigits) }));
        }

        if (!isEditMode && resolvedSeriesRow && !quoteSeriesSyncRef.current) {
          const listResponse: any = quoteListResult.status === "fulfilled" ? quoteListResult.value : null;
          const totalQuotes =
            Number(listResponse?.pagination?.total ?? listResponse?.data?.pagination?.total ?? 0) ||
            Number(listResponse?.data?.length ?? 0) ||
            0;
          const currentPrefix = String(resolvedSeriesRow?.prefix || "QT-");
          const needsPrefixFix = !currentPrefix.startsWith("QT-");
          const needsReset = totalQuotes === 0 && Number(resolvedSeriesRow?.nextNumber || 0) > 1;
          if (needsPrefixFix || needsReset) {
            quoteSeriesSyncRef.current = true;
            const desiredPrefix = "QT-";
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
            setEnabledSettings(response.data);
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

      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

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

  // Load quote data when in edit mode (after salespersons are loaded)
  useEffect(() => {
    const loadQuote = async () => {
      if (isEditMode && quoteId && salespersons.length >= 0) {
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
            const formatDateForInput = (dateString) => {
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
            const mappedItems = (quote.items || []).map((item, index) => {
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

                // Keep a default tax ready for new line items, without overriding loaded quote taxes.
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
                setCustomerDefaultTaxId(resolvedCustomerTaxId);

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


  return {
    handleCustomerSearch, customerResultsPerPage, customerStartIndex, customerEndIndex, customerPaginatedResults, customerTotalPages, formatDate, getDateOnly, isPastDate, formatDateForDisplay, convertToISODate, getDaysInMonth
  };
}
