import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, ArrowUpDown, X,
  MessageSquare, User, Calendar, Plus, Paperclip, Minus, Check,
  Trash2, MoreVertical, Edit2, Edit3, Settings, Info, Tag, HelpCircle, HardDrive,
  Layers, Box, Folder, Cloud, Calculator, Image as ImageIcon, GripVertical,
  FileText, CreditCard, Square, Upload, LayoutGrid, PlusCircle, Mail, Building2, AlertTriangle, ExternalLink, Phone, Users
} from "lucide-react";
import { getCustomers, saveQuote, getQuotes, getQuoteById, updateQuote, getProjects, getSalespersonsFromAPI, updateSalesperson, getItemsFromAPI, getTaxes, Customer, Tax, Salesperson, Quote, ContactPerson, Project } from "../../salesModel";

import { getAllDocuments } from "../../../utils/documentStorage";
import { customersAPI, projectsAPI, salespersonsAPI, quotesAPI, invoicesAPI, itemsAPI, currenciesAPI, contactPersonsAPI, vendorsAPI, settingsAPI, chartOfAccountsAPI, documentsAPI, reportingTagsAPI, priceListsAPI, transactionNumberSeriesAPI } from "../../../services/api";
import { useAccountSelect } from "../../../hooks/useAccountSelect";
import { useCurrency } from "../../../hooks/useCurrency";
import { API_BASE_URL, getToken } from "../../../services/auth";
import toast from "react-hot-toast";
import { Country, State } from "country-state-city";
import NewTaxModal from "../../../../components/modals/NewTaxModal";
import { buildTaxOptionGroups, taxLabel, normalizeCreatedTaxPayload, isTaxActive } from "../../../hooks/Taxdropdownstyle";
import { readTaxesLocal, createTaxLocal, isTaxGroupRecord } from "../../settings/organization-settings/taxes-compliance/TAX/storage";



type Props = {
  controller: any;
};

export default function NewQuoteFormSection({ controller }: Props) {
  const [showCustomerDetailsPanel, setShowCustomerDetailsPanel] = useState(false);
  const [isCustomerContactPersonsOpen, setIsCustomerContactPersonsOpen] = useState(true);
  const [isCustomerAddressOpen, setIsCustomerAddressOpen] = useState(true);
  const [customerPanelTab, setCustomerPanelTab] = useState<"details" | "unpaid-invoices" | "activity-log">("details");
  const [customerPanelLoading, setCustomerPanelLoading] = useState(false);
  const [customerPanelError, setCustomerPanelError] = useState("");
  const [customerUnpaidInvoices, setCustomerUnpaidInvoices] = useState<any[]>([]);
  const [customerActivityLogs, setCustomerActivityLogs] = useState<any[]>([]);
  const {
    navigate, location, baseCurrencyCode, quoteId, isEditMode, clonedDataFromState, saveLoading, setSaveLoading, taxes, setTaxes, enabledSettings, setEnabledSettings,
    formData, setFormData, hasAppliedCloneRef, discountMode, showTransactionDiscount, showShippingCharges, showAdjustment, taxMode, toNumberSafe, resolveSubtotalFromQuoteLike, normalizeDiscountForForm, isDiscountAccountOpen,
    setIsDiscountAccountOpen, discountAccountSearch, setDiscountAccountSearch, filteredDiscountAccounts, groupedDiscountAccounts, discountAccountDropdownRef, isCustomerDropdownOpen, setIsCustomerDropdownOpen, customerSearch, setCustomerSearch, selectedCustomer, setSelectedCustomer,
    customerDefaultTaxId, setCustomerDefaultTaxId, billingAddress, setBillingAddress, shippingAddress, setShippingAddress, isAddressModalOpen, setIsAddressModalOpen, addressModalType, setAddressModalType, isAddressSaving, setIsAddressSaving,
    isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen, phoneCodeSearch, setPhoneCodeSearch, phoneCodeDropdownRef, addressFormData, setAddressFormData, customerSearchModalOpen, setCustomerSearchModalOpen, customerSearchCriteria, setCustomerSearchCriteria, customerSearchTerm,
    setCustomerSearchTerm, customerSearchResults, setCustomerSearchResults, customerSearchPage, setCustomerSearchPage, customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen, isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen, customerQuickActionFrameKey, setCustomerQuickActionFrameKey, isNewProjectQuickActionOpen,
    setIsNewProjectQuickActionOpen, projectQuickActionFrameKey, setProjectQuickActionFrameKey, customerQuickActionBaseIds, setCustomerQuickActionBaseIds, projectQuickActionBaseIds, setProjectQuickActionBaseIds, isRefreshingCustomersQuickAction, setIsRefreshingCustomersQuickAction, isRefreshingProjectsQuickAction, setIsRefreshingProjectsQuickAction, isReloadingCustomerFrame,
    setIsReloadingCustomerFrame, isReloadingProjectFrame, setIsReloadingProjectFrame, isAutoSelectingCustomerFromQuickAction, setIsAutoSelectingCustomerFromQuickAction, isAutoSelectingProjectFromQuickAction, setIsAutoSelectingProjectFromQuickAction, isSalespersonDropdownOpen, setIsSalespersonDropdownOpen, salespersonSearch, setSalespersonSearch, selectedSalesperson,
    setSelectedSalesperson, isManageSalespersonsOpen, setIsManageSalespersonsOpen, manageSalespersonSearch, setManageSalespersonSearch, manageSalespersonMenuOpen, setManageSalespersonMenuOpen, selectedSalespersonIds, setSelectedSalespersonIds, menuPosition, setMenuPosition, isNewSalespersonFormOpen,
    setIsNewSalespersonFormOpen, isAddContactPersonModalOpen, setIsAddContactPersonModalOpen, contactPersonData, setContactPersonData, newSalespersonData, setNewSalespersonData, salespersons, setSalespersons, openItemDropdowns, setOpenItemDropdowns, itemSearches,
    setItemSearches, openTaxDropdowns, setOpenTaxDropdowns, isNewTaxQuickModalOpen, setIsNewTaxQuickModalOpen, newTaxTargetItemId, setNewTaxTargetItemId, taxSearches, setTaxSearches, selectedItemIds, setSelectedItemIds, itemDropdownRefs,
    taxDropdownRefs, taxOptionGroups, getFilteredTaxGroups, openItemMenuId, setOpenItemMenuId, itemMenuRefs, isBulkAddModalOpen, setIsBulkAddModalOpen, bulkAddInsertIndex, setBulkAddInsertIndex, bulkAddSearch, setBulkAddSearch,
    bulkSelectedItems, setBulkSelectedItems, bulkSelectedItemIds, setBulkSelectedItemIds, isTheseDropdownOpen, setIsTheseDropdownOpen, showAdditionalInformation, setShowAdditionalInformation, additionalInfoItemIds, setAdditionalInfoItemIds, useSimplifiedView, setUseSimplifiedView,
    isNewItemModalOpen, setIsNewItemModalOpen, isReportingTagsModalOpen, setIsReportingTagsModalOpen, availableReportingTags, setAvailableReportingTags, reportingTagSelections, setReportingTagSelections, currentReportingTagsItemId, setCurrentReportingTagsItemId, isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen,
    formErrors, setFormErrors, showAdditionalInformationEffective, newItemData, setNewItemData, newItemImage, setNewItemImage, newItemImageRef, isProjectDropdownOpen, setIsProjectDropdownOpen, projectSearch, setProjectSearch,
    projects, setProjects, selectedProject, setSelectedProject, selectedCustomerIdForProjects, setSelectedCustomerIdForProjects, isNewProjectModalOpen, setIsNewProjectModalOpen, newProjectData, setNewProjectData, bankAccounts, setBankAccounts,
    projectDropdownRef, isQuoteDatePickerOpen, setIsQuoteDatePickerOpen, isExpiryDatePickerOpen, setIsExpiryDatePickerOpen, quoteDateCalendar, setQuoteDateCalendar, expiryDateCalendar, setExpiryDateCalendar, customerDropdownRef, salespersonDropdownRef, quoteDatePickerRef,
    expiryDatePickerRef, fileInputRef, isUploadDropdownOpen, setIsUploadDropdownOpen, uploadDropdownRef, isDocumentsModalOpen, setIsDocumentsModalOpen, selectedInbox, setSelectedInbox, documentSearch, setDocumentSearch, selectedDocuments,
    setSelectedDocuments, availableDocuments, setAvailableDocuments, isCloudPickerOpen, setIsCloudPickerOpen, selectedCloudProvider, setSelectedCloudProvider, customers, setCustomers, isCustomersLoading, setIsCustomersLoading, isCustomerActive,
    isItemActive, availableItems, setAvailableItems, loadCustomersForDropdown, isQuoteNumberModalOpen, setIsQuoteNumberModalOpen, quoteNumberMode, setQuoteNumberMode, quotePrefix, setQuotePrefix, quoteNextNumber, setQuoteNextNumber,
    quoteSeriesSyncRef, quoteSeriesRow, setQuoteSeriesRow, quoteSeriesRows, setQuoteSeriesRows, isPriceListDropdownOpen, setIsPriceListDropdownOpen, priceListSearch, setPriceListSearch, catalogPriceListsRaw, setCatalogPriceListsRaw, catalogPriceLists,
    setCatalogPriceLists, priceListSwitchDialog, setPriceListSwitchDialog, isLocationFeatureEnabled, setIsLocationFeatureEnabled, locationOptions, setLocationOptions, isLocationDropdownOpen, setIsLocationDropdownOpen, priceListDropdownRef, currencyMap, setCurrencyMap,
    contactPersons, setContactPersons, vendorContactPersons, setVendorContactPersons, selectedContactPersons, setSelectedContactPersons, isEmailCommunicationsOpen, setIsEmailCommunicationsOpen, getCurrencySymbol, formatMoneyForDropdown, months, daysOfWeek,
    sanitizeQuotePrefix, extractQuoteDigits, deriveQuotePrefixFromNumber, buildQuoteNumber, isQuoteSeriesRow, resolveQuoteSeriesRow, resolveSeriesNextDigits, formatPriceListDisplayLabel, normalizeCatalogPriceLists, loadCatalogPriceLists, selectedPriceListOption, normalizeSelectedPriceListName,
    selectedPriceListDisplay, filteredPriceListOptions, selectedPriceList, resolveCustomerPriceListDefault, applyResolvedPriceListChoice, parsePercentage, applyRounding, getIndividualPriceListRate, applyPriceListToBaseRate, normalizeReportingTagOptions, normalizeReportingTagAppliesTo, loadReportingTags,
    handleCustomerSearch, customerResultsPerPage, customerStartIndex, customerEndIndex, customerPaginatedResults, customerTotalPages, formatDate, getDateOnly, isPastDate, formatDateForDisplay, convertToISODate, getDaysInMonth,
    handleDateSelect, navigateMonth, handleChange, handleCustomerSelect, openAddressModal, handleAddressFieldChange, handleSaveAddress, countryOptions, phoneCountryOptions, filteredPhoneCountryOptions, selectedAddressCountryIso, stateOptions,
    reloadCustomersForQuote, reloadProjectsForQuote, getEntityId, pickNewestEntity, openCustomerQuickAction, closeCustomerQuickAction, openProjectQuickAction, tryAutoSelectNewCustomerFromQuickAction, tryAutoSelectNewProjectFromQuickAction, handleQuickActionCustomerCreated, handleQuickActionProjectCreated, loadCustomerContactPersons,
    loadVendorContactPersons, loadProjectsForCustomer, handleSalespersonSelect, filteredCustomers, filteredSalespersons, filteredManageSalespersons, handleNewSalespersonChange, handleSaveAndSelectSalesperson, handleDeleteSalesperson, handleCancelNewSalesperson, handleOpenReportingTagsModal, handleSaveReportingTags,
    getItemReportingTagsSummaryLabel, getFilteredItems, resolveItemTaxId, getFilteredTaxes, parseTaxRate, getTaxBySelection, getTaxMetaFromItem, isTaxInclusiveMode, defaultTaxId, calculateLineTaxAmount, computeDiscountAmount, applyDiscountShare,
    taxBreakdown, handleItemSelect, toggleItemDropdown, calculateAllTotals, handleItemChange, handleTaxCreatedFromModal, handleAddItem, handleInsertHeader, handleRemoveItem, handleDuplicateItem, getBulkFilteredItems, handleBulkItemToggle,
    handleBulkItemQuantityChange, handleAddBulkItems, handleCancelBulkAdd, handleSelectAllItems, handleDeselectAllItems, handleToggleItemSelection, handleDeleteSelectedItems, handleFileUpload, handleRemoveFile, parseFileSize, handleUploadClick, handleNewItemChange,
    handleNewItemImageUpload, handleSaveNewItem, handleCancelNewItem, filteredProjects, handleProjectSelect, handleNewProjectChange, handleAddProjectTask, handleRemoveProjectTask, handleProjectTaskChange, handleAddProjectUser, handleRemoveProjectUser, handleSaveNewProject,
    handleCancelNewProject, handleOpenNewProjectModal, handleContactPersonChange, handleContactPersonImageUpload, handleSaveContactPerson, uploadQuoteFiles, validateForm, buildQuoteFinancialsAndItems, extractSavedQuoteId, getNextQuoteNumberForSave, persistQuoteSeriesPreferences, handleSaveDraft,
    handleSaveAndSend, handleCancel, handleOtherAction
  } = controller as any;

  const selectedCustomerName =
    (selectedCustomer as any)?.displayName ||
    (selectedCustomer as any)?.name ||
    (selectedCustomer as any)?.companyName ||
    formData.customerName ||
    "Customer";
  const selectedCustomerEmail =
    (selectedCustomer as any)?.email ||
    (selectedCustomer as any)?.primaryEmail ||
    (selectedCustomer as any)?.contactEmail ||
    "-";
  const selectedCustomerPhone =
    (selectedCustomer as any)?.workPhone ||
    (selectedCustomer as any)?.phone ||
    (selectedCustomer as any)?.mobile ||
    "-";
  const displayQuoteNumber =
    String(formData.quoteNumber || "").trim();
  const selectedCustomerType =
    (selectedCustomer as any)?.customerType ||
    (selectedCustomer as any)?.type ||
    (selectedCustomer as any)?.category ||
    "-";
  const selectedCustomerCurrency =
    (selectedCustomer as any)?.currency ||
    formData.currency ||
    baseCurrencyCode ||
    "-";
  const selectedCustomerPaymentTerms =
    (selectedCustomer as any)?.paymentTerms ||
    (selectedCustomer as any)?.paymentTerm ||
    (selectedCustomer as any)?.payment_terms ||
    "-";
  const selectedCustomerPortalStatusRaw =
    (selectedCustomer as any)?.portalStatus ??
    (selectedCustomer as any)?.portalEnabled ??
    (selectedCustomer as any)?.portal_active;
  const selectedCustomerPortalStatus =
    typeof selectedCustomerPortalStatusRaw === "boolean"
      ? (selectedCustomerPortalStatusRaw ? "Enabled" : "Disabled")
      : String(selectedCustomerPortalStatusRaw || "-");

  const closeOpenDropdowns = () => {
    setIsCustomerDropdownOpen(false);
    setIsSalespersonDropdownOpen(false);
    setIsProjectDropdownOpen(false);
    setIsLocationDropdownOpen(false);
    setIsQuoteDatePickerOpen(false);
    setIsExpiryDatePickerOpen(false);
  };

  const openExclusiveDropdown = (
    isOpen: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (isOpen) {
      setOpen(false);
      return;
    }
    closeOpenDropdowns();
    setOpen(true);
  };
  const selectedCustomerLanguage =
    (selectedCustomer as any)?.language ||
    (selectedCustomer as any)?.languageCode ||
    (selectedCustomer as any)?.locale ||
    "-";
  const selectedCustomerOutstanding =
    (selectedCustomer as any)?.outstandingReceivables ||
    (selectedCustomer as any)?.outstanding ||
    0;
  const selectedCustomerCredits =
    (selectedCustomer as any)?.unusedCredits ||
    (selectedCustomer as any)?.credits ||
    0;
  const selectedCustomerUnpaidCount =
    (selectedCustomer as any)?.unpaidInvoicesCount ||
    (selectedCustomer as any)?.unpaidInvoices ||
    0;
  const unpaidInvoicesDisplayCount = customerPanelLoading
    ? Number(selectedCustomerUnpaidCount || 0)
    : customerUnpaidInvoices.length;
  const selectedCustomerId = (selectedCustomer as any)?.id || (selectedCustomer as any)?._id || "";
  const formatAddressLine = (address: any) => {
    if (!address) return "-";
    const parts = [
      address.attention,
      address.street1,
      address.street2,
      address.city,
      address.state,
      address.zipCode,
      address.country
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  };
  const selectedBillingAddress = (selectedCustomer as any)?.billingAddress || {
    attention: (selectedCustomer as any)?.billingAttention,
    street1: (selectedCustomer as any)?.billingStreet1,
    street2: (selectedCustomer as any)?.billingStreet2,
    city: (selectedCustomer as any)?.billingCity,
    state: (selectedCustomer as any)?.billingState,
    zipCode: (selectedCustomer as any)?.billingZipCode,
    country: (selectedCustomer as any)?.billingCountry
  };
  const selectedShippingAddress = (selectedCustomer as any)?.shippingAddress || {
    attention: (selectedCustomer as any)?.shippingAttention,
    street1: (selectedCustomer as any)?.shippingStreet1,
    street2: (selectedCustomer as any)?.shippingStreet2,
    city: (selectedCustomer as any)?.shippingCity,
    state: (selectedCustomer as any)?.shippingState,
    zipCode: (selectedCustomer as any)?.shippingZipCode,
    country: (selectedCustomer as any)?.shippingCountry
  };
  const computeInvoiceDue = (inv: any) => {
    if (!inv) return 0;

    const balanceField = inv.balance !== undefined ? inv.balance : inv.balanceDue;
    if (balanceField !== undefined && balanceField !== null) {
      return parseFloat(balanceField as any) || 0;
    }

    const totalFromFields = (() => {
      if (inv.total !== undefined && inv.total !== null) return parseFloat(inv.total as any) || 0;
      const subTotal = parseFloat(inv.subTotal || 0) || 0;
      const discountAmount = inv.discountType === "percent"
        ? (subTotal * (parseFloat(inv.discount || 0) / 100))
        : (parseFloat(inv.discount || 0) || 0);
      const shipping = parseFloat(inv.shippingCharges || inv.shipping || 0) || 0;
      const adjustment = parseFloat(inv.adjustment || 0) || 0;
      return subTotal - discountAmount + shipping + adjustment;
    })();

    const paid = parseFloat(inv.paidAmount || inv.paid || 0) || 0;
    return Math.max(0, totalFromFields - paid);
  };
  const formatPanelDateTime = (value: any) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${formatDateForDisplay(date.toISOString().slice(0, 10))} ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
  };
  const hasBillingAddress = Boolean(
    selectedBillingAddress &&
    [
      selectedBillingAddress.attention,
      selectedBillingAddress.street1,
      selectedBillingAddress.street2,
      selectedBillingAddress.city,
      selectedBillingAddress.state,
      selectedBillingAddress.zipCode,
      selectedBillingAddress.country
    ].some(Boolean)
  );
  const hasShippingAddress = Boolean(
    selectedShippingAddress &&
    [
      selectedShippingAddress.attention,
      selectedShippingAddress.street1,
      selectedShippingAddress.street2,
      selectedShippingAddress.city,
      selectedShippingAddress.state,
      selectedShippingAddress.zipCode,
      selectedShippingAddress.country
    ].some(Boolean)
  );
  const renderAddressSummaryRow = (
    label: string,
    address: any,
    hasAddress: boolean,
    fallbackText: string,
    fallbackAction?: { label: string; onClick: () => void }
  ) => (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
          <Building2 size={14} className="text-slate-400" />
          <span>{label}</span>
        </div>
        <div className="min-w-0 flex-1 text-right">
          {hasAddress ? (
            <div className="text-[13px] leading-5 text-gray-700">
              <span className="font-medium text-gray-900">
                {address.attention || label}
              </span>
              <span className="ml-2 break-words">
                {[
                  address.street1,
                  address.street2,
                  address.city,
                  address.state,
                  address.zipCode,
                  address.country
                ].filter(Boolean).join(", ")}
              </span>
            </div>
          ) : (
            fallbackAction ? (
              <button
                type="button"
                className="text-[#156372] hover:text-[#0D4A52] font-medium text-[13px]"
                onClick={fallbackAction.onClick}
              >
                {fallbackAction.label}
              </button>
            ) : (
              <div className="text-[13px] leading-5 text-gray-500">
                {fallbackText}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (!showCustomerDetailsPanel) return;
    setCustomerPanelTab("details");
  }, [showCustomerDetailsPanel, selectedCustomerId]);

  useEffect(() => {
    let cancelled = false;

    const loadCustomerPanelData = async () => {
      if (!showCustomerDetailsPanel || !selectedCustomerId) {
        setCustomerUnpaidInvoices([]);
        setCustomerActivityLogs([]);
        setCustomerPanelError("");
        setCustomerPanelLoading(false);
        return;
      }

      setCustomerPanelLoading(true);
      setCustomerPanelError("");

      try {
        const [invoicesResult, quotesResult] = await Promise.allSettled([
          invoicesAPI.getAll({ limit: 10000, customerId: selectedCustomerId }),
          quotesAPI.getAll({ limit: 10000, customerId: selectedCustomerId })
        ]);

        if (cancelled) return;

        const invoices = invoicesResult.status === "fulfilled"
          ? (Array.isArray(invoicesResult.value)
            ? invoicesResult.value
            : Array.isArray(invoicesResult.value?.data)
              ? invoicesResult.value.data
              : [])
          : [];
        const quotes = quotesResult.status === "fulfilled"
          ? (Array.isArray(quotesResult.value)
            ? quotesResult.value
            : Array.isArray(quotesResult.value?.data)
              ? quotesResult.value.data
              : [])
          : [];

        const unpaidInvoices = invoices
          .filter((inv: any) => {
            const status = String(inv?.status || "").toLowerCase();
            if (status === "draft" || status === "void" || status === "paid") return false;
            return computeInvoiceDue(inv) > 0;
          })
          .sort((a: any, b: any) => {
            const dateA = new Date(a.invoiceDate || a.date || a.createdAt || 0).getTime();
            const dateB = new Date(b.invoiceDate || b.date || b.createdAt || 0).getTime();
            return dateB - dateA;
          });

        const invoiceActivities = unpaidInvoices.slice(0, 20).map((inv: any) => {
          const due = computeInvoiceDue(inv);
          const invoiceNumber = inv.invoiceNumber || inv.number || inv.referenceNumber || inv.id || inv._id || "Invoice";
          const status = String(inv.status || "").trim();
          const action = status ? `${status.charAt(0).toUpperCase()}${status.slice(1)} invoice` : "Invoice";
          return {
            id: `invoice-${inv.id || inv._id || invoiceNumber}`,
            kind: "invoice",
            title: action,
            subject: String(invoiceNumber),
            details: `Due ${formatMoneyForDropdown(due)}`,
            timestamp: inv.updatedAt || inv.invoiceDate || inv.date || inv.createdAt || null
          };
        });

        const quoteActivities = quotes.slice(0, 20).map((quote: any) => {
          const quoteNumber = quote.quoteNumber || quote.number || quote.referenceNumber || quote.id || quote._id || "Quote";
          const status = String(quote.status || "").trim();
          const action = status ? `${status.charAt(0).toUpperCase()}${status.slice(1)} quote` : "Quote";
          return {
            id: `quote-${quote.id || quote._id || quoteNumber}`,
            kind: "quote",
            title: action,
            subject: String(quoteNumber),
            details: quote.subject || quote.customerName || "Customer quote activity",
            timestamp: quote.updatedAt || quote.quoteDate || quote.date || quote.createdAt || null
          };
        });

        const customerCreatedActivity = selectedCustomer?.createdAt ? [{
          id: `customer-${selectedCustomerId}`,
          kind: "customer",
          title: "Customer created",
          subject: selectedCustomerName,
          details: "Customer record available in quote context",
          timestamp: (selectedCustomer as any)?.createdAt || null
        }] : [];

        const combinedActivities = [...customerCreatedActivity, ...invoiceActivities, ...quoteActivities]
          .sort((a, b) => new Date(String(b.timestamp || 0)).getTime() - new Date(String(a.timestamp || 0)).getTime());

        setCustomerUnpaidInvoices(unpaidInvoices);
        setCustomerActivityLogs(combinedActivities);
      } catch (error) {
        if (!cancelled) {
          setCustomerPanelError("Unable to load customer details right now.");
          setCustomerUnpaidInvoices([]);
          setCustomerActivityLogs([]);
        }
      } finally {
        if (!cancelled) {
          setCustomerPanelLoading(false);
        }
      }
    };

    void loadCustomerPanelData();

    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId, selectedCustomer, selectedCustomerName, showCustomerDetailsPanel, formatMoneyForDropdown]);

  return (
    <>
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white">
          <div className="w-full px-8 h-16 flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-600 flex-shrink-0">
                <FileText size={18} />
              </div>
              <div className="flex items-center gap-4 min-w-0">
                <div className="text-[18px] font-semibold text-gray-900 truncate">
                  {isEditMode ? "Edit Quote" : "New Quote"}
                </div>
                <div className="h-5 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Use Simplified View</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useSimplifiedView}
                    onClick={() => setUseSimplifiedView(prev => !prev)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useSimplifiedView ? "bg-[#156372]" : "bg-[#dbe8eb]"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${useSimplifiedView ? "translate-x-4" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/sales/quotes")}
              className="text-red-500 hover:text-red-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full pb-2">
          {/* Form Fields Section */}
            <div className="bg-white overflow-visible">
            <div className={`px-6 ${useSimplifiedView ? "py-4" : "py-6"} bg-white`}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-4">
                    <label className="text-sm text-red-600 w-32 pt-2 flex-shrink-0">
                      Customer Name*
                    </label>
                    <div className="w-[320px] relative flex-shrink-0" ref={customerDropdownRef}>
                      <div className="relative flex items-stretch">
                        <input
                          type="text"
                          className={`flex-1 h-10 px-3 py-2 pr-10 border ${formErrors.customerName ? "border-red-500" : isCustomerDropdownOpen ? "border-[#156372]" : "border-gray-300"} rounded-l text-sm text-gray-700 focus:outline-none focus:border-[#156372] bg-white`}
                          placeholder="Select or add a customer"
                          value={formData.customerName}
                          readOnly
                          onClick={() => {
                            if (!customers.length && !isCustomersLoading) {
                              void loadCustomersForDropdown();
                            }
                            openExclusiveDropdown(isCustomerDropdownOpen, setIsCustomerDropdownOpen);
                          }}
                        />
                        <div
                          className="absolute right-10 top-0 bottom-0 flex items-center px-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!customers.length && !isCustomersLoading) {
                              void loadCustomersForDropdown();
                            }
                            openExclusiveDropdown(isCustomerDropdownOpen, setIsCustomerDropdownOpen);
                          }}
                        >
                          {isCustomerDropdownOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>
                        <button
                          type="button"
                          className="w-10 h-10 bg-[#156372] text-white rounded-r hover:bg-[#0D4A52] flex items-center justify-center border border-[#156372]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomerSearchModalOpen(true);
                          }}
                        >
                          <Search size={16} />
                        </button>
                        {selectedCustomer && (
                          <button
                            type="button"
                            className="absolute left-full top-0 ml-3 inline-flex h-10 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            {(selectedCustomer as any)?.currency || formData.currency || "AMD"}
                          </button>
                        )}
                      </div>

                      {isCustomerDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
                          <div className="p-2 border-b border-gray-200 bg-white">
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                className="w-full h-9 pl-9 pr-2 text-sm border border-[#156372] rounded-md focus:outline-none"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                            {filteredCustomers.length > 0 ? (
                              filteredCustomers.map(customer => {
                                const customerId = customer.id || customer._id;
                                const customerName = customer.name || customer.displayName || customer.companyName || "";
                                const customerEmail = customer.email || "";
                                const customerCode = (customer as any).customerCode || (customer as any).code || (customer as any).customerNumber || "";
                                const customerCompany = customer.companyName || customerName;
                                return (
                                  <div
                                    key={customerId}
                                    role="button"
                                    tabIndex={0}
                                    className="p-2 cursor-pointer rounded-md flex items-center gap-3 hover:bg-[#f4f8f7]"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCustomerSelect(customer);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        handleCustomerSelect(customer);
                                      }
                                    }}
                                  >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-100 text-gray-600">
                                      {(customerName || "C").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold truncate text-gray-900">
                                        {customerName}
                                        {customerCode ? <span className="ml-2 font-medium text-gray-500">{customerCode}</span> : null}
                                      </div>
                                      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                                        <span className="inline-flex items-center gap-1 truncate">
                                          <Mail size={12} />
                                          {customerEmail || "-"}
                                        </span>
                                        <span className="inline-flex items-center gap-1 truncate">
                                          <Building2 size={12} />
                                          {customerCompany}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : customerSearch.trim() ? (
                              <div className="p-3 text-center text-sm text-gray-500">
                                No customers found
                              </div>
                            ) : null}
                          </div>
                          <button
                            className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-white text-sm font-medium text-[#156372] w-full hover:bg-[#f4f8f7]"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setIsCustomerDropdownOpen(false);
                              await openCustomerQuickAction();
                            }}
                          >
                            <PlusCircle size={14} />
                            New Customer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {!useSimplifiedView && selectedCustomer && (
                    <div className="mt-4 ml-32 w-fit max-w-full">
                      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                        <div className="min-w-[160px]">
                          <div className="text-[13px] font-medium uppercase tracking-wide text-slate-600">
                            Billing Address
                          </div>
                          <button
                            type="button"
                            className="mt-3 text-[13px] font-medium text-[#156372] hover:text-[#0D4A52]"
                            onClick={() => openAddressModal("billing")}
                          >
                            New Address
                          </button>
                        </div>
                        <div className="min-w-[160px]">
                          <div className="text-[13px] font-medium uppercase tracking-wide text-slate-600">
                            Shipping Address
                          </div>
                          <button
                            type="button"
                            className="mt-3 text-[13px] font-medium text-[#156372] hover:text-[#0D4A52]"
                            onClick={() => openAddressModal("shipping")}
                          >
                            New Address
                          </button>
                        </div>
                      </div>
                      {formErrors.customerAddress ? (
                        <p className="mt-3 text-xs font-medium text-red-600">{formErrors.customerAddress}</p>
                      ) : null}
                    </div>
                  )}

                </div>

                {!useSimplifiedView && selectedCustomer && (
                  <div className="shrink-0 self-start pt-0.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md bg-[#454D5E] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3a4252]"
                      onClick={() => {
                        setShowCustomerDetailsPanel(true);
                      }}
                    >
                      <span className="truncate max-w-[220px]">{formData.customerName || "Customer"}'s Details</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {isLocationFeatureEnabled && (
                <div className="flex items-start gap-4 mt-2">
                  <label className="text-sm text-gray-700 w-32 pt-2 flex-shrink-0">
                    Location
                  </label>
                  <div className="flex-1 max-w-xs relative">
                    <button
                      type="button"
                      className="w-full h-10 px-3 pr-8 border border-gray-300 rounded text-sm text-gray-700 bg-white flex items-center justify-between focus:outline-none focus:border-[#156372]"
                      onClick={() => openExclusiveDropdown(isLocationDropdownOpen, setIsLocationDropdownOpen)}
                    >
                      <span className="truncate">{formData.selectedLocation || "Head Office"}</span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    {isLocationDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 overflow-hidden">
                        {locationOptions.map((loc) => (
                          <button
                            type="button"
                            key={loc}
                            className={`w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${formData.selectedLocation === loc ? "bg-gray-100 font-medium" : ""}`}
                            onClick={() => {
                              setFormData((prev: any) => ({ ...prev, selectedLocation: loc }));
                              setIsLocationDropdownOpen(false);
                            }}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={`px-6 ${useSimplifiedView ? "py-4" : "py-5"}`}>
              {/* Quote# */}
              <div className="flex items-start gap-4 mb-8">
                <label className="text-sm text-red-600 w-32 pt-2 flex-shrink-0">
                  Quote#*
                </label>
                <div className="flex-1 max-w-xs relative">
                  <input
                    type="text"
                    name="quoteNumber"
                    aria-invalid={Boolean(formErrors.quoteNumber)}
                    className={`w-full px-3 py-2 border ${formErrors.quoteNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#156372]'} rounded text-sm text-gray-700 ${quoteNumberMode === "manual" ? "bg-white" : "bg-gray-50"} focus:outline-none`}
                    value={displayQuoteNumber}
                    readOnly={quoteNumberMode !== "manual"}
                    onChange={(e) => {
                      if (quoteNumberMode !== "manual") return;
                      setFormData((prev: any) => ({ ...prev, quoteNumber: e.target.value }));
                      if (formErrors.quoteNumber) {
                        setFormErrors((prev: any) => ({ ...prev, quoteNumber: "" }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#156372] hover:text-[#0D4A52]"
                    onClick={() => setIsQuoteNumberModalOpen(true)}
                  >
                    <Settings size={14} />
                  </button>
                  {formErrors.quoteNumber ? (
                    <p className="mt-1 text-xs font-medium text-red-500">
                      {formErrors.quoteNumber}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Reference# */}
              {!useSimplifiedView && (
                <div className="flex items-start gap-4 mb-4">
                  <label className="text-sm text-gray-700 w-32 pt-2 flex-shrink-0">
                    Reference#
                  </label>
                  <div className="flex-1 max-w-xs">
                    <input
                      type="text"
                      name="referenceNumber"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372]"
                      value={formData.referenceNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-red-600 w-32 pt-2 flex-shrink-0">
                  Quote Date*
                </label>
                <div className="flex-1 flex items-center gap-8">
                  <div className="w-48 relative" ref={quoteDatePickerRef}>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border ${formErrors.quoteDate ? 'border-red-500' : 'border-gray-300'} rounded text-sm text-gray-700 focus:outline-none`}
                      value={formatDateForDisplay(formData.quoteDate)}
                      readOnly
                      onClick={() => openExclusiveDropdown(isQuoteDatePickerOpen, setIsQuoteDatePickerOpen)}
                    />
                    {isQuoteDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 w-64 p-4">
                        {/* Calendar Header */}
                        <div className="flex justify-between items-center mb-3">
                          <button
                            onClick={() => navigateMonth("prev", "quoteDate")}
                            type="button"
                            className="p-1 text-gray-600 cursor-pointer"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <div className="text-sm font-semibold text-gray-900">
                            {months[quoteDateCalendar.getMonth()]} {quoteDateCalendar.getFullYear()}
                          </div>
                          <button
                            onClick={() => navigateMonth("next", "quoteDate")}
                            type="button"
                            className="p-1 text-gray-600 cursor-pointer"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {daysOfWeek.map((day) => (
                            <div key={day} className="text-center text-xs font-medium py-1 text-gray-700">
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysInMonth(quoteDateCalendar).map((day, index) => {
                            const isSelected = formData.quoteDate && formatDate(day.fullDate) === formData.quoteDate;
                            const isCurrentMonth = day.month === "current";
                            return (
                              <button
                                key={index}
                                onClick={() => handleDateSelect(day.fullDate, "quoteDate")}
                                type="button"
                                className={`p-2 text-sm rounded cursor-pointer ${isSelected ? "bg-[#156372] text-white font-semibold" : isCurrentMonth ? "text-gray-900 " : "text-gray-400 "}`}
                              >
                                {day.date}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-700 whitespace-nowrap">Expiry Date</label>
                    <div className="w-48 relative" ref={expiryDatePickerRef}>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none"
                        placeholder="dd/MM/yyyy"
                        value={formatDateForDisplay(formData.expiryDate)}
                        readOnly
                        onClick={() => openExclusiveDropdown(isExpiryDatePickerOpen, setIsExpiryDatePickerOpen)}
                      />
                      {isExpiryDatePickerOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 w-64 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <button onClick={() => navigateMonth("prev", "expiryDate")} type="button" className="p-1 text-gray-600 cursor-pointer">
                              <ChevronLeft size={18} />
                            </button>
                            <div className="text-sm font-semibold text-gray-900">
                              {months[expiryDateCalendar.getMonth()]} {expiryDateCalendar.getFullYear()}
                            </div>
                            <button onClick={() => navigateMonth("next", "expiryDate")} type="button" className="p-1 text-gray-600 cursor-pointer">
                              <ChevronRight size={18} />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {daysOfWeek.map((day) => (
                              <div key={day} className="text-center text-xs font-medium py-1 text-gray-700">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(expiryDateCalendar).map((day, index) => {
                              const isSelected = formData.expiryDate && formatDate(day.fullDate) === formData.expiryDate;
                              const isCurrentMonth = day.month === "current";
                              const isDisabled = false;
                              return (
                                <button
                                  key={index}
                                  onClick={() => handleDateSelect(day.fullDate, "expiryDate")}
                                  type="button"
                                  disabled={isDisabled}
                                  className={`p-2 text-sm rounded ${isDisabled ? "text-gray-300 cursor-not-allowed opacity-70" : "cursor-pointer"} ${!isDisabled && isSelected ? "bg-[#156372] text-white font-semibold" : isCurrentMonth ? "text-gray-900 " : "text-gray-400 "}`}
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
                </div>
              </div>

              {/* Salesperson */}
              {!useSimplifiedView && (
                <div className="flex items-start gap-4 mb-4">
                  <label className="text-sm text-gray-700 w-32 pt-2 flex-shrink-0">
                    Salesperson
                  </label>
                  <div className="flex-1 max-w-xs relative" ref={salespersonDropdownRef}>
                    <div
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 flex justify-between items-center bg-white cursor-pointer"
                      onClick={() => openExclusiveDropdown(isSalespersonDropdownOpen, setIsSalespersonDropdownOpen)}
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
                        <div className="max-h-[144px] overflow-y-auto">
                          {filteredSalespersons.length > 0 ? (
                            filteredSalespersons.map(salesperson => (
                              <div
                                key={salesperson.id || salesperson._id}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer truncate"
                                onClick={() => handleSalespersonSelect(salesperson)}
                              >
                                {salesperson.name}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500 italic">No active salespersons found</div>
                          )}
                        </div>
                        <div
                          className="p-3 border-t border-gray-100 flex items-center gap-2 text-[#156372] hover:bg-gray-50 cursor-pointer text-sm font-medium"
                          onClick={() => {
                            setIsManageSalespersonsOpen(true);
                            setIsSalespersonDropdownOpen(false);
                          }}
                        >
                          <PlusCircle size={16} />
                          <span>Manage Salespersons</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Project Name */}
              {!useSimplifiedView && (
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-gray-700 w-32 pt-2 flex-shrink-0">
                  Project Name
                </label>
                <div className="flex-1 max-w-xs relative" ref={projectDropdownRef}>
                  <div
                    className={`w-full px-3 py-2 border border-gray-300 rounded text-sm flex justify-between items-center ${!selectedCustomer
                      ? "bg-gray-100 cursor-not-allowed text-gray-400"
                      : "bg-white cursor-pointer text-gray-700"
                      }`}
                    onClick={() => {
                      if (selectedCustomer) {
                        openExclusiveDropdown(isProjectDropdownOpen, setIsProjectDropdownOpen);
                      }
                    }}
                  >
                    <span className={formData.projectName ? "text-gray-900" : "text-gray-400"}>
                      {formData.projectName || "Select a project"}
                    </span>
                    {isProjectDropdownOpen ? (
                      <ChevronUp size={14} className="text-[#156372]" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-400" />
                    )}
                  </div>
                  {isProjectDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <Search size={14} className="text-gray-400" />
                        <input type="text" placeholder="Search" value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="flex-1 text-sm focus:outline-none" autoFocus />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredProjects.length > 0 ? (
                          filteredProjects.map(project => (
                            <div key={project.id || project._id} className="p-2 cursor-pointer hover:bg-gray-50" onClick={() => handleProjectSelect(project)}>
                              <div className="text-sm font-medium truncate text-gray-900">{project.projectName || project.name}</div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-gray-500 uppercase tracking-wide">No Results Found</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="w-full p-2 border-t border-gray-200 bg-gray-50 text-[#156372] text-sm font-medium flex items-center gap-2"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await openProjectQuickAction();
                        }}
                      >
                        <PlusCircle size={14} />
                        Add New
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Subject */}
              {!useSimplifiedView && (
                <div className="flex items-start gap-4 mb-4">
                  <label className="text-sm text-gray-700 w-32 pt-2 flex-shrink-0">
                    Subject
                  </label>
                  <div className="flex-1 max-w-xs">
                    <textarea
                      name="subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-y h-10 min-h-[2.5rem] overflow-auto"
                      placeholder="Let your customer know what this Quote is for"
                      value={formData.subject}
                      onChange={handleChange}
                      rows={1}
                    />
                  </div>
                </div>
              )}

             </div>
           </div>
         </div>

        {showCustomerDetailsPanel && selectedCustomer && (
          <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-[360px] max-w-[90vw] bg-[#f3f5fb] border-l border-gray-200 shadow-xl z-[60] flex flex-col">
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#e8ecf4] flex items-center justify-center text-sm font-semibold text-gray-700">
                    {String(selectedCustomerName || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-gray-400">Customer</div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">{selectedCustomerName}</span>
                      <button
                        type="button"
                        className="text-[#1a73e8] hover:text-[#125bc2]"
                        title="View in Customers module"
                        onClick={() => {
                          const customerId = (selectedCustomer as any)?.id || (selectedCustomer as any)?._id;
                          if (customerId) {
                            navigate(`/sales/customers/${encodeURIComponent(String(customerId))}`);
                          }
                        }}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => setShowCustomerDetailsPanel(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-gray-400" />
                  <span className="truncate">{selectedCustomerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <span className="truncate">{selectedCustomerEmail}</span>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 px-3 pt-2">
                <div className="flex items-center gap-5 text-sm text-gray-600">
                  <button
                    type="button"
                    onClick={() => setCustomerPanelTab("details")}
                    className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${customerPanelTab === "details" ? "text-gray-900 border-[#1a73e8]" : "text-gray-500 border-transparent"}`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerPanelTab("unpaid-invoices")}
                    className={`inline-flex items-center gap-1 whitespace-nowrap pb-2 text-sm font-semibold border-b-2 transition-colors ${customerPanelTab === "unpaid-invoices" ? "text-gray-900 border-[#1a73e8]" : "text-gray-500 border-transparent"}`}
                  >
                    Unpaid Invoices
                    <span className={`inline-flex shrink-0 items-center justify-center text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${customerPanelTab === "unpaid-invoices" ? "text-white bg-[#1a73e8]" : "text-white bg-gray-400"}`}>
                      {unpaidInvoicesDisplayCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerPanelTab("activity-log")}
                    className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${customerPanelTab === "activity-log" ? "text-gray-900 border-[#1a73e8]" : "text-gray-500 border-transparent"}`}
                  >
                    Activity Log
                  </button>
                </div>
              </div>

              {customerPanelError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {customerPanelError}
                </div>
              )}

              {customerPanelTab === "details" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-h-[96px] rounded-lg border border-gray-200 bg-white px-3 py-4 text-center flex flex-col items-center justify-center">
                      <AlertTriangle size={14} className="mb-2 text-amber-500" />
                      <div className="whitespace-nowrap text-[11px] leading-none text-gray-500">
                        Outstanding Receivables
                      </div>
                      <div className="mt-1 text-[18px] font-semibold leading-none text-gray-900">
                        {formatMoneyForDropdown(selectedCustomerOutstanding)}
                      </div>
                    </div>
                    <div className="min-h-[96px] rounded-lg border border-gray-200 bg-white px-3 py-4 text-center flex flex-col items-center justify-center">
                      <Check size={14} className="mb-2 text-emerald-500" />
                      <div className="whitespace-nowrap text-[11px] leading-none text-gray-500">
                        Unused Credits
                      </div>
                      <div className="mt-1 text-[18px] font-semibold leading-none text-gray-900">
                        {formatMoneyForDropdown(selectedCustomerCredits)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 text-sm font-semibold text-gray-900">Contact Details</div>
                    <div className="border-t border-gray-200 px-3 py-3 space-y-2 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Customer Type</span>
                        <span className="text-gray-800 capitalize">{selectedCustomerType}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Currency</span>
                        <span className="text-gray-800">{selectedCustomerCurrency}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Payment Terms</span>
                        <span className="text-gray-800">{selectedCustomerPaymentTerms}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Portal Status</span>
                        <span className="text-gray-800 capitalize">{selectedCustomerPortalStatus}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Customer Language</span>
                        <span className="text-gray-800">{selectedCustomerLanguage}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Phone</span>
                        <span className="text-gray-800">{selectedCustomerPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800"
                      onClick={() => setIsCustomerContactPersonsOpen((prev) => !prev)}
                    >
                      <span className="flex items-center gap-2">
                        Contact Persons
                        <span className="inline-flex items-center justify-center text-[10px] font-semibold text-white bg-gray-400 rounded-full px-2 py-0.5">
                          {Array.isArray(contactPersons) ? contactPersons.length : 0}
                        </span>
                      </span>
                      {isCustomerContactPersonsOpen ? (
                        <ChevronUp size={14} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={14} className="text-gray-400" />
                      )}
                    </button>
                    {isCustomerContactPersonsOpen && (
                      <div className="border-t border-gray-200 px-4 py-3">
                        {Array.isArray(contactPersons) && contactPersons.length > 0 ? (
                          <div className="space-y-3">
                            {contactPersons.map((person: any, index: number) => {
                              const fullName = [
                                person?.salutation,
                                person?.firstName,
                                person?.lastName
                              ].filter(Boolean).join(" ") || person?.name || `Contact ${index + 1}`;

                              const email = person?.email || "-";
                              const phone = person?.workPhone || person?.mobile || "-";
                              const isPortalEnabled = Boolean(person?.hasPortalAccess || person?.enablePortal);

                              return (
                                <div key={person?.id || person?._id || index} className="flex items-start gap-3">
                                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600 flex-shrink-0">
                                    {String(fullName).charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 truncate">{fullName}</div>
                                    <div className="text-xs text-gray-500">{email}</div>
                                    <div className="text-xs text-gray-500">{phone}</div>
                                    {isPortalEnabled ? (
                                      <div className="text-xs text-emerald-600">Portal access enabled</div>
                                    ) : (
                                      <div className="text-xs text-orange-500">Portal invitation not accepted</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">No contact persons found for this customer.</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800"
                      onClick={() => setIsCustomerAddressOpen((prev) => !prev)}
                    >
                      <span>Address</span>
                      {isCustomerAddressOpen ? (
                        <ChevronUp size={14} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={14} className="text-gray-400" />
                      )}
                    </button>
                    {isCustomerAddressOpen && (
                      <div className="border-t border-gray-200 px-4 py-3 space-y-4">
                        {renderAddressSummaryRow("Billing Address", selectedBillingAddress, hasBillingAddress, "No Billing Address")}
                        {renderAddressSummaryRow("Shipping Address", selectedShippingAddress, hasShippingAddress, "No Shipping Address")}
                      </div>
                    )}
                  </div>
                </>
              )}

              {customerPanelTab === "unpaid-invoices" && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {customerPanelLoading ? (
                    <div className="p-4 text-sm text-gray-500">Loading unpaid invoices...</div>
                  ) : customerUnpaidInvoices.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {customerUnpaidInvoices.map((invoice: any) => {
                        const due = computeInvoiceDue(invoice);
                        const invoiceNumber = invoice.invoiceNumber || invoice.number || invoice.referenceNumber || invoice.id || invoice._id || "Invoice";
                        const invoiceDateValue = invoice.invoiceDate || invoice.date || invoice.createdAt || null;
                        const dueDateValue = invoice.dueDate || invoice.dueOn || invoice.paymentDueDate || invoice.expiryDate || null;
                        const dueDate = dueDateValue ? new Date(dueDateValue) : null;
                        const overdueDays = dueDate && !Number.isNaN(dueDate.getTime())
                          ? Math.max(0, Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
                          : 0;

                        return (
                          <div key={String(invoice.id || invoice._id || invoiceNumber)} className="px-4 py-3 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{invoiceNumber}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                {invoiceDateValue ? formatPanelDateTime(invoiceDateValue) : "-"}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-semibold text-gray-900">{formatMoneyForDropdown(due)}</div>
                              <div className={`mt-1 text-[11px] font-medium ${overdueDays > 0 ? "text-orange-500" : "text-emerald-600"}`}>
                                {overdueDays > 0 ? `OVERDUE BY ${overdueDays} DAYS` : "DUE"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-gray-500">No unpaid invoices found for this customer.</div>
                  )}
                </div>
              )}

              {customerPanelTab === "activity-log" && (
                <div className="space-y-3">
                  {customerPanelLoading ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-500">Loading activity log...</div>
                  ) : customerActivityLogs.length > 0 ? (
                    customerActivityLogs.map((entry: any, index: number) => (
                      <div key={entry.id || index} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 text-[#1a73e8]">
                          {entry.kind === "invoice" ? (
                            <FileText size={13} />
                          ) : entry.kind === "quote" ? (
                            <FileText size={13} />
                          ) : (
                            <User size={13} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-900 truncate">{entry.subject}</span>
                            <span className="text-[11px] text-gray-500 whitespace-nowrap">{formatPanelDateTime(entry.timestamp)}</span>
                          </div>
                          <div className="mt-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                            <div className="font-medium text-gray-900">{entry.title}</div>
                            <div className="text-gray-600">{entry.details}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-500">No activity logs yet.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
}
