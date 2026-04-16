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


export function useNewQuoteSaveHelpers(controller: any) {
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
  taxBreakdown, handleItemSelect, toggleItemDropdown, calculateAllTotals, handleItemChange, handleTaxCreatedFromModal, handleAddItem, handleInsertHeader,
  handleRemoveItem, handleDuplicateItem, getBulkFilteredItems, handleBulkItemToggle, handleBulkItemQuantityChange, handleAddBulkItems, handleCancelBulkAdd, handleSelectAllItems,
  handleDeselectAllItems, handleToggleItemSelection, handleDeleteSelectedItems, handleFileUpload, handleRemoveFile, parseFileSize, handleUploadClick, handleNewItemChange,
  handleNewItemImageUpload, handleSaveNewItem, handleCancelNewItem, filteredProjects, handleProjectSelect, handleNewProjectChange, handleAddProjectTask, handleRemoveProjectTask,
  handleProjectTaskChange, handleAddProjectUser, handleRemoveProjectUser, handleSaveNewProject, handleCancelNewProject, handleOpenNewProjectModal, handleContactPersonChange, handleContactPersonImageUpload,
  handleSaveDraft, handleSaveAndSend, handleCancel, handleOtherAction
} = controller as any;

  const formatAddressSnapshot = (address: any) => {
    if (!address) return "";
    if (typeof address === "string") return address.trim();

    const attention = String(address?.attention || "").trim();
    const street1 = String(address?.street1 || "").trim();
    const street2 = String(address?.street2 || "").trim();
    const city = String(address?.city || "").trim();
    const state = String(address?.state || "").trim();
    const zipCode = String(address?.zipCode || "").trim();
    const country = String(address?.country || "").trim();
    const cityStateZip = [city, state, zipCode].filter(Boolean).join(", ");

    return [attention, street1, street2, cityStateZip, country].filter(Boolean).join(", ");
  };

  const hasAddressSnapshot = (address: any) => Boolean(formatAddressSnapshot(address));

  const handleSaveContactPerson = () => {
    if (!contactPersonData.firstName.trim() || !contactPersonData.email.trim()) {
      toast.error("First Name and Email are required");
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

    const billingCandidate = billingAddress || (selectedCustomer as any)?.billingAddress;
    const shippingCandidate = shippingAddress || (selectedCustomer as any)?.shippingAddress;
    if (!hasAddressSnapshot(billingCandidate) && !hasAddressSnapshot(shippingCandidate)) {
      errors.customerAddress = "Please add a billing or shipping address for the selected customer";
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
    const shippingTaxName = shippingTaxObj
      ? String((shippingTaxObj as any).name || (shippingTaxObj as any).taxName || "")
      : String(formData.shippingChargeTax || "");
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
      shippingTaxRate,
      shippingTaxName,
      adjustment,
      roundOff,
      finalTotal
    };
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

  const getNextQuoteNumberForSave = async () => {
    let quoteNumber = formData.quoteNumber;
    if (quoteNumberMode !== "auto") return quoteNumber;

    try {
      const quoteNumberResponse: any = await quotesAPI.getNextNumber(quotePrefix);
      if (quoteNumberResponse && quoteNumberResponse.success && quoteNumberResponse.data) {
        const quoteNumberData: any = quoteNumberResponse.data || {};
        const serverQuoteNumber = String(quoteNumberData.quoteNumber || quoteNumberData.nextNumber || "").trim();
        if (serverQuoteNumber) return serverQuoteNumber;
      }
    } catch (error) {
      console.error("Error getting next quote number from quotes endpoint:", error);
    }

    try {
      const seriesId = String(quoteSeriesRow?.id || quoteSeriesRow?._id || "").trim();
      if (seriesId) {
        const seriesResponse: any = await transactionNumberSeriesAPI.getNextNumber(seriesId);
        if (seriesResponse && seriesResponse.success && seriesResponse.data) {
          const serverQuoteNumber = String(seriesResponse.data.nextNumber || seriesResponse.data.next_number || "").trim();
          if (serverQuoteNumber) return serverQuoteNumber;
        }
      }
    } catch (error) {
      console.error("Error getting next quote number from series:", error);
    }

    const existingQuotes = await getQuotes();
    const normalizedPrefix = sanitizeQuotePrefix(quotePrefix);
    const highestQuoteNumber = (Array.isArray(existingQuotes) ? existingQuotes : []).reduce(
      (max, quote: any) => {
        const quotePrefixValue = deriveQuotePrefixFromNumber(quote?.quoteNumber, normalizedPrefix);
        if (quotePrefixValue !== normalizedPrefix) return max;

        const digits = parseInt(extractQuoteDigits(quote?.quoteNumber), 10);
        if (!Number.isFinite(digits) || digits <= max) return max;
        return digits;
      },
      0,
    );
    const widthSource = extractQuoteDigits(quoteNextNumber || formData.quoteNumber) || "1";
    const width = widthSource.length >= 2 ? widthSource.length : 6;
    quoteNumber = buildQuoteNumber(
      normalizedPrefix,
      String(highestQuoteNumber + 1).padStart(width, "0"),
    );

    return quoteNumber;
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

  return {
    handleSaveContactPerson, uploadQuoteFiles, validateForm, buildQuoteFinancialsAndItems, extractSavedQuoteId, getNextQuoteNumberForSave, persistQuoteSeriesPreferences
  };
}
