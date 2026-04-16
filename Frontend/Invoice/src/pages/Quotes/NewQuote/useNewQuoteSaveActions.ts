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

const getQuoteSaveErrorMessage = (error: unknown) => {
  const raw =
    String((error as any)?.message || (error as any)?.response?.data?.message || "").trim() ||
    "Failed to save quote. Please try again.";
  const normalized = raw.toLowerCase();

  if (normalized.includes("quote number already exists") || normalized.includes("duplicate")) {
    return "Quote number already exists. Open the quote number settings and generate a new number.";
  }
  if (normalized.includes("customer is required")) {
    return "Select a customer before saving the quote.";
  }
  if (normalized.includes("customer not found")) {
    return "The selected customer could not be found. Please re-select the customer.";
  }
  if (normalized.includes("customer must have at least one address")) {
    return "Add a billing or shipping address before saving the quote.";
  }

  if (raw.startsWith("Failed to save quote:")) {
    return raw;
  }
  return raw.includes("Failed to save quote") ? raw : `Failed to save quote: ${raw}`;
};


export function useNewQuoteSaveActions(controller: any) {
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
  handleSaveContactPerson, uploadQuoteFiles, validateForm, buildQuoteFinancialsAndItems, extractSavedQuoteId, getNextQuoteNumberForSave, persistQuoteSeriesPreferences
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

  const refreshQuoteSeriesPreview = async () => {
    try {
      const nextResponse: any = await quotesAPI.getNextNumber(quotePrefix);
      const refreshedQuoteNumber = String(
        nextResponse?.data?.nextNumber ||
          nextResponse?.data?.next_number ||
          nextResponse?.data?.quoteNumber ||
          nextResponse?.nextNumber ||
          "",
      ).trim();
      if (!refreshedQuoteNumber) return;

      const refreshedPrefix = deriveQuotePrefixFromNumber(refreshedQuoteNumber, quotePrefix || "QT-");
      const refreshedNextDigits = extractQuoteDigits(refreshedQuoteNumber) || quoteNextNumber || "000001";

      setQuotePrefix(refreshedPrefix);
      setQuoteNextNumber(refreshedNextDigits);
      if (quoteSeriesRow) {
        setQuoteSeriesRow((prev: any) => (prev ? { ...prev, prefix: refreshedPrefix, nextNumber: refreshedNextDigits } : prev));
      }
      setQuoteSeriesRows((prev: any[]) =>
        (prev || []).map((row: any) => {
          if (!isQuoteSeriesRow(row)) return row;
          return {
            ...row,
            prefix: refreshedPrefix,
            nextNumber: refreshedNextDigits,
          };
        }),
      );
      if (quoteNumberMode === "auto") {
        setFormData((prev: any) => ({
          ...prev,
          quoteNumber: refreshedQuoteNumber,
        }));
      }
    } catch (error) {
      console.error("Error refreshing quote series preview:", error);
    }
  };

  const handleSaveDraft = async () => {
    if (saveLoading) return;

    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0] || "Please fill in all required fields marked with *";
      toast.error(String(firstError));
      return;
    }

    setSaveLoading("draft");

    try {
      // Upload files first

      const finalAttachedFiles = await uploadQuoteFiles(formData.attachedFiles);

      const {
        validItems,
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
      } = buildQuoteFinancialsAndItems();

      // Get quote number from backend (only for new quotes)
      let quoteNumber = formData.quoteNumber;
      if (!isEditMode) quoteNumber = await getNextQuoteNumberForSave();

      // Prepare quote data
      const currentQuoteStatus = String(formData.status || "").trim();
      const quoteData = {
        quoteNumber: quoteNumber,
        referenceNumber: formData.referenceNumber,
        customerName: formData.customerName,
        customer: selectedCustomer?.id || selectedCustomer?._id || formData.customerName,
        customerId: selectedCustomer?.id || selectedCustomer?._id || null,
        contactPersons: Array.isArray(selectedContactPersons) && selectedContactPersons.length > 0
          ? selectedContactPersons
          : contactPersons,
        location: formData.selectedLocation,
        billingAddress: formatAddressSnapshot(billingAddress || (selectedCustomer as any)?.billingAddress),
        shippingAddress: formatAddressSnapshot(shippingAddress || (selectedCustomer as any)?.shippingAddress),
        quoteDate: convertToISODate(formData.quoteDate),
        expiryDate: convertToISODate(formData.expiryDate),
        salesperson: formData.salesperson,
        salespersonId: formData.salespersonId,
        projectName: formData.projectName,
        subject: formData.subject,
        priceListId: String(selectedPriceList?.id || selectedPriceList?._id || ""),
        priceListName: String(selectedPriceList?.name || ""),
        taxPreference: formData.taxExclusive,
        taxExclusive: formData.taxExclusive,

        // Items array - filter out empty rows and ensure valid data
        items: validItems,

        // Summary
        subTotal: subTotal,
        totalTax: totalTax,
        subtotal: subTotal,
        tax: totalTax,
        taxAmount: totalTax,
        discount: showTransactionDiscount ? parseFloat(formData.discount || 0) : 0,
        discountType: showTransactionDiscount ? formData.discountType : "percent",
        discountAmount: discountAmount,
        discountAccount: formData.discountAccount,
        shippingCharges: shipping,
        shippingChargeTax: String(formData.shippingChargeTax || ""),
        shippingTaxAmount: shippingTaxAmount,
        shippingTaxRate: shippingTaxRate,
        shippingTaxName: shippingTaxName,
        adjustment: adjustment,
        roundOff: roundOff,
        total: finalTotal,


        // Other fields
        currency: formData.currency,
        customerNotes: formData.customerNotes,
        termsAndConditions: formData.termsAndConditions,
        reportingTags: formData.reportingTags || [],
        attachedFiles: finalAttachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          url: file.url
        })) || [],

        // Status
        status: isEditMode
          ? (currentQuoteStatus || "Draft")
          : "Draft"
      };

      // Save or update quote
      let savedQuote;
      if (isEditMode && quoteId) {
        savedQuote = await updateQuote(quoteId, quoteData);
        console.log("Quote updated as draft:", savedQuote);
      } else {
        savedQuote = await saveQuote(quoteData);
        console.log("Quote saved as draft:", savedQuote);
      }

      // Handle URL change to detect if we should show a specific modal
      // Navigate back to quotes page or quote detail
      if (savedQuote) {
        if (!isEditMode && quoteNumberMode === "auto") {
          await refreshQuoteSeriesPreview();
        }
        const id = extractSavedQuoteId(savedQuote) || quoteId || "";
        if (id) {
          navigate(`/sales/quotes/${id}`, { replace: true });
          return;
        }
      }
      navigate("/sales/quotes", { replace: true });
    } catch (error) {
      console.error("Error saving quote as draft:", error);
      toast.error(getQuoteSaveErrorMessage(error));
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSaveAndSend = async () => {
    if (saveLoading) return;

    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0] || "Please fill in all required fields marked with *";
      toast.error(String(firstError));
      return;
    }

    setSaveLoading("send");
    try {


      // Upload files first
      const finalAttachedFiles = await uploadQuoteFiles(formData.attachedFiles);

      // Step 1: Save the quote as draft
      const {
        validItems,
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
      } = buildQuoteFinancialsAndItems();

      const currentQuoteStatus = String(formData.status || "").trim();
      let quoteNumber = formData.quoteNumber;
      if (!isEditMode) quoteNumber = await getNextQuoteNumberForSave();

        const quoteData = {
        quoteNumber: quoteNumber,
        referenceNumber: formData.referenceNumber,
        customerName: formData.customerName,
        customer: selectedCustomer?.id || selectedCustomer?._id || formData.customerName,
        customerId: selectedCustomer?.id || selectedCustomer?._id || null,
        contactPersons: Array.isArray(selectedContactPersons) && selectedContactPersons.length > 0
          ? selectedContactPersons
          : contactPersons,
        location: formData.selectedLocation,
        billingAddress: formatAddressSnapshot(billingAddress || (selectedCustomer as any)?.billingAddress),
        shippingAddress: formatAddressSnapshot(shippingAddress || (selectedCustomer as any)?.shippingAddress),
        quoteDate: convertToISODate(formData.quoteDate),
        expiryDate: convertToISODate(formData.expiryDate),
        salesperson: formData.salesperson,
        salespersonId: formData.salespersonId,
        projectName: formData.projectName,
        subject: formData.subject,
        priceListId: String(selectedPriceList?.id || selectedPriceList?._id || ""),
        priceListName: String(selectedPriceList?.name || ""),
        taxPreference: formData.taxExclusive,
        taxExclusive: formData.taxExclusive,
        items: validItems,
        subTotal: subTotal,
        totalTax: totalTax,
        subtotal: subTotal,
        tax: totalTax,
        taxAmount: totalTax,
        discount: showTransactionDiscount ? parseFloat(formData.discount || 0) : 0,
        discountType: showTransactionDiscount ? formData.discountType : "percent",
        discountAmount: discountAmount,
        discountAccount: formData.discountAccount,
        shippingCharges: shipping,
        shippingChargeTax: String(formData.shippingChargeTax || ""),
        shippingTaxAmount: shippingTaxAmount,
        shippingTaxRate: shippingTaxRate,
        shippingTaxName: shippingTaxName,
        adjustment: adjustment,
        roundOff: roundOff,
        total: finalTotal,

        currency: formData.currency,
        customerNotes: formData.customerNotes,
        termsAndConditions: formData.termsAndConditions,
        reportingTags: formData.reportingTags || [],
        attachedFiles: finalAttachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          url: file.url
        })) || [],
        status: isEditMode
          ? (currentQuoteStatus.toLowerCase() === "draft" ? "Sent" : (currentQuoteStatus || "Sent"))
          : "Draft",
        date: formData.quoteDate
      };

      let savedQuote;
      if (isEditMode && quoteId) {
        savedQuote = await updateQuote(quoteId, quoteData);
      } else {
        savedQuote = await saveQuote(quoteData);
      }

      // Step 2: Navigate to email page
      if (savedQuote) {
        if (!isEditMode && quoteNumberMode === "auto") {
          await refreshQuoteSeriesPreview();
        }
        const id = savedQuote._id || savedQuote.id || quoteId;
        console.log("Quote saved as draft, navigating to email:", id);
        navigate(`/sales/quotes/${id}/email`, {
          state: {
            preloadedQuote: savedQuote,
            customerEmail: String((selectedCustomer as any)?.email || (selectedCustomer as any)?.primaryEmail || "").trim(),
          },
        });
      } else {
        throw new Error("Failed to save quote before sending.");
      }
    } catch (error) {
      console.error("Error in handleSaveAndSend:", error);
      toast.error(getQuoteSaveErrorMessage(error));
    } finally {
      setSaveLoading(null);
    }
  };

  const handleCancel = () => {
    navigate("/sales/quotes");
  };

  const handleOtherAction = () => {
    // Handle "Other" action - can be customized based on requirements
    console.log("Other action clicked");
    // You can add custom logic here for what "Other" should do
    // For example: open a modal with more options, or perform a specific action
  };

  return {
    handleSaveDraft, handleSaveAndSend, handleCancel, handleOtherAction
  };
}
