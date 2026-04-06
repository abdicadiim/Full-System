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


export function useNewQuoteItemActions(controller: any) {
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
  loadVendorContactPersons, loadProjectsForCustomer, handleSalespersonSelect, filteredCustomers, filteredSalespersons, filteredManageSalespersons, handleNewSalespersonChange, handleSaveAndSelectSalesperson,
  handleDeleteSalesperson, handleCancelNewSalesperson, handleOpenReportingTagsModal, handleSaveReportingTags, getItemReportingTagsSummaryLabel, getFilteredItems, resolveItemTaxId, getFilteredTaxes,
  parseTaxRate, getTaxBySelection, getTaxMetaFromItem, isTaxInclusiveMode, defaultTaxId, calculateLineTaxAmount, computeDiscountAmount, applyDiscountShare,
  taxBreakdown, handleSaveContactPerson, uploadQuoteFiles, validateForm, buildQuoteFinancialsAndItems, extractSavedQuoteId, getNextQuoteNumberForSave, persistQuoteSeriesPreferences,
  handleSaveDraft, handleSaveAndSend, handleCancel, handleOtherAction
} = controller as any;  const handleItemSelect = (itemId, selectedItem) => {
    const selectedEntityId = selectedItem.sourceId || selectedItem.id;
    const baseRate = Number(selectedItem?.rate ?? 0) || 0;
    const nextRate = selectedPriceList ? applyPriceListToBaseRate(baseRate, selectedPriceList, selectedItem) : baseRate;
    setSelectedItemIds(prev => ({ ...prev, [itemId]: selectedItem.id }));
    handleItemChange(itemId, 'itemId', selectedEntityId); // Store the selected Item ID
    handleItemChange(itemId, 'itemEntityType', selectedItem.entityType || selectedItem.itemEntityType || "item");
    handleItemChange(itemId, 'catalogRate', baseRate);
    handleItemChange(itemId, 'itemDetails', selectedItem.name);
    handleItemChange(itemId, 'rate', nextRate);
    handleItemChange(itemId, 'stockOnHand', selectedItem.stockOnHand);
    handleItemChange(itemId, 'unit', selectedItem.unit);
    handleItemChange(itemId, 'description', selectedItem.salesDescription || selectedItem.description || "");

    // Customer tax > Item tax > Default tax.
    const resolvedTaxId = resolveItemTaxId(selectedItem);
    const effectiveTaxId = customerDefaultTaxId || resolvedTaxId || defaultTaxId || "";
    if (effectiveTaxId) {
      handleItemChange(itemId, 'tax', effectiveTaxId);
      const resolved = getTaxBySelection(effectiveTaxId);
      if (!resolved) {
        const fallbackRate = parseTaxRate(selectedItem?.taxInfo?.taxRate ?? selectedItem?.taxRate ?? selectedItem?.salesTaxRate);
        if (fallbackRate > 0) {
          handleItemChange(itemId, 'taxRate', fallbackRate);
        }
      }
    } else {
      const fallbackRate = parseTaxRate(selectedItem?.taxInfo?.taxRate ?? selectedItem?.taxRate ?? selectedItem?.salesTaxRate);
      if (fallbackRate > 0) {
        handleItemChange(itemId, 'taxRate', fallbackRate);
      }
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

  useEffect(() => {
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
        if (Number(row.rate ?? 0) === nextRate && prev.currency === nextCurrency) return row;
        return {
          ...row,
          itemEntityType: selectedEntity.entityType || row.itemEntityType || "item",
          catalogRate: baseRate,
          rate: nextRate,
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
      createdTax = createTaxLocal({
        name: inputName,
        rate: Number.isFinite(inputRate) ? inputRate : 0,
        isActive: true,
        type: "both",
        isCompound: inputIsCompound,
      }) || createdTax;
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
      const effectiveTaxId = customerDefaultTaxId || defaultTaxId || "";
      const defaultTax = effectiveTaxId ? getTaxBySelection(effectiveTaxId) : null;
      const newItem = {
        id: Date.now(),
        itemType: "item",
        itemDetails: "",
        quantity: 1,
        rate: 0,
        tax: effectiveTaxId,
        taxRate: defaultTax ? parseTaxRate((defaultTax as any).rate) : 0,
        amount: 0,
        description: "",
        stockOnHand: 0,
        reportingTags: []
      };
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
    const onlyItems = availableItems.filter((row: any) => String(row?.entityType || "item") !== "plan");
    if (!bulkAddSearch.trim()) {
      return onlyItems;
    }
    const search = bulkAddSearch.toLowerCase().trim();
    return onlyItems.filter(item =>
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
        const effectiveTaxId = customerDefaultTaxId || resolvedTaxId || defaultTaxId || "";
        const resolvedTax = getTaxBySelection(effectiveTaxId);
        const fallbackTaxRate = parseTaxRate(selectedItem?.taxInfo?.taxRate ?? selectedItem?.taxRate ?? selectedItem?.salesTaxRate);

        return {
          id: Date.now() + index,
          itemType: "item",
          itemDetails: selectedItem.name,
          quantity: selectedItem.quantity || 1,
          rate: selectedItem.rate,
          tax: effectiveTaxId,
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


  return {
    handleItemSelect, toggleItemDropdown, calculateAllTotals, handleItemChange, handleTaxCreatedFromModal, handleAddItem, handleInsertHeader, handleRemoveItem, handleDuplicateItem, getBulkFilteredItems, handleBulkItemToggle, handleBulkItemQuantityChange,
    handleAddBulkItems, handleCancelBulkAdd, handleSelectAllItems, handleDeselectAllItems, handleToggleItemSelection, handleDeleteSelectedItems, handleFileUpload, handleRemoveFile, parseFileSize, handleUploadClick, handleNewItemChange, handleNewItemImageUpload,
    handleSaveNewItem, handleCancelNewItem, filteredProjects, handleProjectSelect, handleNewProjectChange, handleAddProjectTask, handleRemoveProjectTask, handleProjectTaskChange, handleAddProjectUser, handleRemoveProjectUser, handleSaveNewProject, handleCancelNewProject,
    handleOpenNewProjectModal, handleContactPersonChange, handleContactPersonImageUpload
  };
}
