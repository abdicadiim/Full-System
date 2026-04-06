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


export function useNewQuoteSalesProject(controller: any) {
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
  handleDateSelect, navigateMonth, handleChange, handleCustomerSelect, openAddressModal, handleAddressFieldChange, handleSaveAddress, countryOptions,
  phoneCountryOptions, filteredPhoneCountryOptions, selectedAddressCountryIso, stateOptions, reloadCustomersForQuote, reloadProjectsForQuote, getEntityId, pickNewestEntity,
  openCustomerQuickAction, closeCustomerQuickAction, openProjectQuickAction, tryAutoSelectNewCustomerFromQuickAction, tryAutoSelectNewProjectFromQuickAction, handleQuickActionCustomerCreated, handleQuickActionProjectCreated, loadCustomerContactPersons,
  loadVendorContactPersons, loadProjectsForCustomer, handleItemSelect, toggleItemDropdown, calculateAllTotals, handleItemChange, handleTaxCreatedFromModal, handleAddItem,
  handleInsertHeader, handleRemoveItem, handleDuplicateItem, getBulkFilteredItems, handleBulkItemToggle, handleBulkItemQuantityChange, handleAddBulkItems, handleCancelBulkAdd,
  handleSelectAllItems, handleDeselectAllItems, handleToggleItemSelection, handleDeleteSelectedItems, handleFileUpload, handleRemoveFile, parseFileSize, handleUploadClick,
  handleNewItemChange, handleNewItemImageUpload, handleSaveNewItem, handleCancelNewItem, filteredProjects, handleProjectSelect, handleNewProjectChange, handleAddProjectTask,
  handleRemoveProjectTask, handleProjectTaskChange, handleAddProjectUser, handleRemoveProjectUser, handleSaveNewProject, handleCancelNewProject, handleOpenNewProjectModal, handleContactPersonChange,
  handleContactPersonImageUpload, handleSaveContactPerson, uploadQuoteFiles, validateForm, buildQuoteFinancialsAndItems, extractSavedQuoteId, getNextQuoteNumberForSave, persistQuoteSeriesPreferences,
  handleSaveDraft, handleSaveAndSend, handleCancel, handleOtherAction
} = controller as any;  const handleSalespersonSelect = (salesperson) => {
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

  const filteredSalespersons = salespersons.filter(salesperson =>
    salesperson.name.toLowerCase().includes(salespersonSearch.toLowerCase())
  );

  const filteredManageSalespersons = salespersons.filter(salesperson =>
    salesperson.name.toLowerCase().includes(manageSalespersonSearch.toLowerCase()) ||
    (salesperson.email && salesperson.email.toLowerCase().includes(manageSalespersonSearch.toLowerCase()))
  );

  const handleNewSalespersonChange = (e) => {
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
      // Save the new salesperson to backend
      const response = await salespersonsAPI.create({
        name: newSalespersonData.name.trim(),
        email: newSalespersonData.email.trim() || "",
        phone: ""
      });

      if (response && response.success && response.data) {
        const savedSalesperson = response.data;

        // Reload salespersons from backend to get updated list
        try {
          const salespersonsResponse = await salespersonsAPI.getAll();
          if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data) {
            setSalespersons(salespersonsResponse.data);
          } else {
            // Fallback: add to existing list
            setSalespersons(prev => [...prev, savedSalesperson]);
          }
        } catch (error) {
          console.error('Error reloading salespersons:', error);
          // Fallback: add to existing list
          setSalespersons(prev => [...prev, savedSalesperson]);
        }

        // Select the new salesperson
        setSelectedSalesperson(savedSalesperson);
        setFormData(prev => ({
          ...prev,
          salesperson: savedSalesperson.name
        }));

        // Reset form and close
        setNewSalespersonData({ name: "", email: "" });
        setIsNewSalespersonFormOpen(false);
        setIsManageSalespersonsOpen(false);
        setIsSalespersonDropdownOpen(false);
      } else {
        alert("Failed to save salesperson: " + ((response as any)?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving salesperson:", error);
      alert("Error saving salesperson: " + (error.message || "Unknown error"));
    }
  };

  const handleDeleteSalesperson = async (salespersonId) => {
    if (!window.confirm("Are you sure you want to delete this salesperson?")) {
      return;
    }

    try {
      const response = await salespersonsAPI.delete(salespersonId);
      if (response && response.success) {
        // Reload salespersons from backend to get updated list
        try {
          const salespersonsResponse = await salespersonsAPI.getAll();
          if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data) {
            setSalespersons(salespersonsResponse.data);
          } else {
            // Fallback: remove from list
            setSalespersons(prev => prev.filter(sp => (sp.id || sp._id) !== salespersonId));
          }
        } catch (error) {
          console.error('Error reloading salespersons:', error);
          // Fallback: remove from list
          setSalespersons(prev => prev.filter(sp => (sp.id || sp._id) !== salespersonId));
        }

        // If deleted salesperson was selected, clear selection
        if (selectedSalesperson && (selectedSalesperson.id || selectedSalesperson._id) === salespersonId) {
          setSelectedSalesperson(null);
          setFormData(prev => ({
            ...prev,
            salesperson: ""
          }));
        }
      } else {
        alert("Failed to delete salesperson: " + ((response as any)?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting salesperson:", error);
      alert("Error deleting salesperson: " + (error.message || "Unknown error"));
    }
  };

  const handleCancelNewSalesperson = () => {
    setNewSalespersonData({ name: "", email: "" });
    setIsNewSalespersonFormOpen(false);
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

  const getFilteredItems = (itemId) => {
    const search = (itemSearches[itemId] || "").toLowerCase().trim();
    const onlyItems = availableItems.filter((row: any) => String(row?.entityType || "item") !== "plan");
    if (!search) return onlyItems;
    return onlyItems.filter(item =>
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

  const defaultTaxId = useMemo(() => resolveDefaultTaxIdFromTaxes(taxes as any[]), [taxes]);

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


  return {
    handleSalespersonSelect, filteredCustomers, filteredSalespersons, filteredManageSalespersons, handleNewSalespersonChange, handleSaveAndSelectSalesperson, handleDeleteSalesperson, handleCancelNewSalesperson, handleOpenReportingTagsModal, handleSaveReportingTags, getItemReportingTagsSummaryLabel, getFilteredItems,
    resolveItemTaxId, getFilteredTaxes, parseTaxRate, getTaxBySelection, getTaxMetaFromItem, isTaxInclusiveMode, defaultTaxId, calculateLineTaxAmount, computeDiscountAmount, applyDiscountShare, taxBreakdown
  };
}
