import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, ArrowUpDown, X,
  MessageSquare, User, Calendar, Plus, Paperclip, Minus, Check,
  Trash2, MoreVertical, Edit2, Edit3, Settings, Info, Tag, HelpCircle, HardDrive,
  Layers, Box, Folder, Cloud, Calculator, Image as ImageIcon, GripVertical,
  FileText, CreditCard, Square, Upload, LayoutGrid, PlusCircle, Mail, Building2, AlertTriangle
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



type Props = {
  controller: any;
};

export default function NewQuoteFormSection({ controller }: Props) {
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
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useSimplifiedView ? "bg-[#2F80FF]" : "bg-gray-200"}`}
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
            <div className={`relative px-6 ${useSimplifiedView ? "py-4" : "py-6"} border-b border-gray-200 bg-gray-50`}>
              {!useSimplifiedView && selectedCustomer && (
                <button
                  type="button"
                  className="absolute right-6 top-4 inline-flex items-center gap-2 rounded-md bg-[#454D5E] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3a4252]"
                  onClick={() => {
                    const customerId = (selectedCustomer as any)?.id || (selectedCustomer as any)?._id;
                    if (customerId) {
                      navigate(`/sales/customers/${encodeURIComponent(String(customerId))}`);
                    }
                  }}
                >
                  <span className="truncate max-w-[220px]">{formData.customerName || "Customer"}'s Details</span>
                  <ChevronRight size={16} />
                </button>
              )}
              {/* Customer Name */}
              <div className="flex items-start gap-4">
                <label className="text-sm text-red-600 w-44 pt-2 flex-shrink-0">
                  Customer Name*
                </label>
                <div className="w-full max-w-[540px] relative" ref={customerDropdownRef}>
                  <div className="relative flex items-stretch">
                    <input
                      type="text"
                      className={`flex-1 h-10 px-3 py-2 pr-10 border ${formErrors.customerName ? 'border-red-500' : isCustomerDropdownOpen ? 'border-[#156372]' : 'border-gray-300'} rounded-l text-sm text-gray-700 focus:outline-none focus:border-[#156372] bg-white`}
                      placeholder="Select or add a customer"
                      value={formData.customerName}
                      readOnly
                      onClick={() => {
                        if (!customers.length && !isCustomersLoading) {
                          void loadCustomersForDropdown();
                        }
                        setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                      }}
                    />
                    <div
                      className="absolute right-10 top-0 bottom-0 flex items-center px-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!customers.length && !isCustomersLoading) {
                          void loadCustomersForDropdown();
                        }
                        setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
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
                        className="ml-3 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
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
                                onMouseDown={(e) => {
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

                  {!useSimplifiedView && selectedCustomer && (
                    <div className="mt-4 flex gap-20">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold tracking-wide text-gray-500">BILLING ADDRESS</span>
                        <div className="mt-2 text-[13px] text-gray-600">
                          {billingAddress?.street1 ? (
                            <div className="flex flex-col space-y-0.5 leading-relaxed">
                              <span className="font-medium text-gray-700">{billingAddress.attention}</span>
                              <span>{billingAddress.street1}</span>
                              <span>{billingAddress.city}, {billingAddress.state} {billingAddress.zipCode}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-[#156372] hover:text-[#0D4A52] font-medium text-[13px]"
                              onClick={() => openAddressModal("billing")}
                            >
                              New Address
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold tracking-wide text-gray-500">SHIPPING ADDRESS</span>
                        <div className="mt-2 text-[13px] text-gray-600">
                          {shippingAddress?.street1 ? (
                            <div className="flex flex-col space-y-0.5 leading-relaxed">
                              <span className="font-medium text-gray-700">{shippingAddress.attention}</span>
                              <span>{shippingAddress.street1}</span>
                              <span>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-[#156372] hover:text-[#0D4A52] font-medium text-[13px]"
                              onClick={() => openAddressModal("shipping")}
                            >
                              New Address
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isLocationFeatureEnabled && (
                <div className="flex items-start gap-4 mt-3">
                  <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
                    Location
                  </label>
                  <div className="w-full max-w-[300px] relative">
                    <button
                      type="button"
                      className="w-full h-10 px-3 pr-8 border border-gray-300 rounded text-sm text-gray-700 bg-white flex items-center justify-between focus:outline-none focus:border-[#156372]"
                      onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
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
                <label className="text-sm text-red-600 w-44 pt-2 flex-shrink-0">
                  Quote#*
                </label>
                <div className="flex-1 max-w-xs relative">
                  <input
                    type="text"
                    name="quoteNumber"
                    className={`w-full px-3 py-2 border ${formErrors.quoteNumber ? 'border-red-500' : 'border-gray-300'} rounded text-sm text-gray-700 bg-gray-50 focus:outline-none`}
                    value={formData.quoteNumber}
                    readOnly
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#156372] hover:text-[#0D4A52]"
                    onClick={() => setIsQuoteNumberModalOpen(true)}
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>

              {/* Reference# */}
              {!useSimplifiedView && (
                <div className="flex items-start gap-4 mb-4">
                  <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
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
                <label className="text-sm text-red-600 w-44 pt-2 flex-shrink-0">
                  Quote Date*
                </label>
                <div className="flex-1 flex items-center gap-8">
                  <div className="w-48 relative" ref={quoteDatePickerRef}>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border ${formErrors.quoteDate ? 'border-red-500' : 'border-gray-300'} rounded text-sm text-gray-700 focus:outline-none`}
                      value={formatDateForDisplay(formData.quoteDate)}
                      readOnly
                      onClick={() => setIsQuoteDatePickerOpen(!isQuoteDatePickerOpen)}
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
                        onClick={() => setIsExpiryDatePickerOpen(!isExpiryDatePickerOpen)}
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
                  <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
                    Salesperson
                  </label>
                  <div className="flex-1 max-w-xs relative" ref={salespersonDropdownRef}>
                    <div
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 flex justify-between items-center bg-white cursor-pointer"
                      onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
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
                        <div className="max-h-60 overflow-y-auto">
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
                            <div className="px-4 py-2 text-sm text-gray-500 italic">No salespersons found</div>
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
                <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
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
                        setIsProjectDropdownOpen(!isProjectDropdownOpen);
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
                  <label className="text-sm text-gray-700 w-44 pt-2 flex-shrink-0">
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
    </>
  );
}
