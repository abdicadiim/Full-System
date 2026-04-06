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



type Props = {
  controller: any;
};

export default function NewQuoteAddressModal({ controller }: Props) {
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
      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[12000] bg-black/45 flex items-center justify-center p-4" onClick={() => !isAddressSaving && setIsAddressModalOpen(false)}>
          <div className="w-full max-w-[620px] rounded-lg bg-white shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[32px] leading-none font-medium text-gray-800">
                {addressModalType === "billing" ? "Billing Address" : "Shipping Address"}
              </h3>
              <button
                type="button"
                className="w-7 h-7 rounded-md border border-[#2f80ed] text-red-500 flex items-center justify-center hover:bg-blue-50"
                onClick={() => setIsAddressModalOpen(false)}
                disabled={isAddressSaving}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Attention</label>
                <input className="w-full h-10 rounded border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]" name="attention" value={addressFormData.attention} onChange={handleAddressFieldChange} autoFocus />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Country/Region</label>
                <input className="w-full h-10 rounded border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]" name="country" value={addressFormData.country} onChange={handleAddressFieldChange} placeholder="Select or type to add" list="country-list" />
                <datalist id="country-list">
                  {countryOptions.map((country: any) => (
                    <option key={country.isoCode} value={country.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Address</label>
                <textarea className="w-full min-h-[54px] rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#156372]" name="street1" value={addressFormData.street1} onChange={handleAddressFieldChange} placeholder="Street 1" />
                <textarea className="mt-2 w-full min-h-[54px] rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#156372]" name="street2" value={addressFormData.street2} onChange={handleAddressFieldChange} placeholder="Street 2" />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">City</label>
                <input className="w-full h-10 rounded border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]" name="city" value={addressFormData.city} onChange={handleAddressFieldChange} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">State</label>
                  <input className="w-full h-10 rounded border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]" name="state" value={addressFormData.state} onChange={handleAddressFieldChange} placeholder="Select or type to add" list="state-list" />
                  <datalist id="state-list">
                    {stateOptions.map((state: any) => (
                      <option key={state.isoCode} value={state.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">ZIP Code</label>
                  <input className="w-full h-10 rounded border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]" name="zipCode" value={addressFormData.zipCode} onChange={handleAddressFieldChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phone</label>
                  <div className="grid grid-cols-[88px_1fr] gap-0">
                    <div className="relative" ref={phoneCodeDropdownRef}>
                      <button
                        type="button"
                        className="h-10 w-full rounded-l border border-gray-300 px-2 text-sm text-gray-700 bg-white flex items-center justify-between outline-none focus:border-[#156372]"
                        onClick={() => {
                          setIsPhoneCodeDropdownOpen((prev) => !prev);
                          setPhoneCodeSearch("");
                        }}
                      >
                        <span>{addressFormData.phoneCountryCode || "+"}</span>
                        {isPhoneCodeDropdownOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </button>

                      {isPhoneCodeDropdownOpen && (
                        <div className="absolute left-0 top-full z-[13000] mt-1 w-[320px] rounded-md border border-gray-200 bg-white shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={phoneCodeSearch}
                                onChange={(e) => setPhoneCodeSearch(e.target.value)}
                                placeholder="Search"
                                className="h-9 w-full rounded border border-gray-300 pl-7 pr-2 text-sm text-gray-700 outline-none focus:border-[#156372]"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredPhoneCountryOptions.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-500">No matching country code</div>
                            ) : (
                              filteredPhoneCountryOptions.map((country: any) => (
                                <button
                                  key={`${country.isoCode}-${country.phoneCode}`}
                                  type="button"
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[#3b82f6] hover:text-white ${addressFormData.phoneCountryCode === country.phoneCode ? "bg-[#3b82f6] text-white" : "text-gray-700"}`}
                                  onClick={() => {
                                    setAddressFormData((prev: any) => ({ ...prev, phoneCountryCode: country.phoneCode }));
                                    setIsPhoneCodeDropdownOpen(false);
                                  }}
                                >
                                  <span className="inline-block w-14">{country.phoneCode}</span>
                                  <span>{country.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <input className="h-10 rounded-r border border-l-0 border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]" name="phone" value={addressFormData.phone} onChange={handleAddressFieldChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Fax Number</label>
                  <input className="w-full h-10 rounded border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]" name="fax" value={addressFormData.fax} onChange={handleAddressFieldChange} />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                <span className="font-semibold">Note:</span> Changes made here will be updated for this customer.
              </p>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-3">
              <button
                type="button"
                className="px-5 h-9 rounded-md bg-[#22b573] text-white text-sm font-semibold hover:bg-[#1ea465] disabled:opacity-70"
                onClick={handleSaveAddress}
                disabled={isAddressSaving}
              >
                {isAddressSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="px-5 h-9 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-70"
                onClick={() => setIsAddressModalOpen(false)}
                disabled={isAddressSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
