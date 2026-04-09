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

export default function NewQuoteCustomerSearchModal({ controller }: Props) {
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
    setIsNewSalespersonFormOpen, editingSalespersonId, isAddContactPersonModalOpen, setIsAddContactPersonModalOpen, contactPersonData, setContactPersonData, newSalespersonData, setNewSalespersonData, salespersons, setSalespersons, openItemDropdowns, setOpenItemDropdowns, itemSearches,
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
    loadVendorContactPersons, loadProjectsForCustomer, handleSalespersonSelect, filteredCustomers, filteredSalespersons, filteredManageSalespersons, handleNewSalespersonChange, handleStartNewSalesperson, handleStartEditSalesperson, handleSaveAndSelectSalesperson, handleDeleteSalesperson, handleCancelNewSalesperson, handleSetSalespersonStatus, handleBulkSalespersonStatusChange, handleBulkDeleteSalespersons, handleOpenReportingTagsModal, handleSaveReportingTags,
    getItemReportingTagsSummaryLabel, getFilteredItems, resolveItemTaxId, getFilteredTaxes, parseTaxRate, getTaxBySelection, getTaxMetaFromItem, isTaxInclusiveMode, defaultTaxId, calculateLineTaxAmount, computeDiscountAmount, applyDiscountShare,
    taxBreakdown, handleItemSelect, toggleItemDropdown, calculateAllTotals, handleItemChange, handleTaxCreatedFromModal, handleAddItem, handleInsertHeader, handleRemoveItem, handleDuplicateItem, getBulkFilteredItems, handleBulkItemToggle,
    handleBulkItemQuantityChange, handleAddBulkItems, handleCancelBulkAdd, handleSelectAllItems, handleDeselectAllItems, handleToggleItemSelection, handleDeleteSelectedItems, handleFileUpload, handleRemoveFile, parseFileSize, handleUploadClick, handleNewItemChange,
    handleNewItemImageUpload, handleSaveNewItem, handleCancelNewItem, filteredProjects, handleProjectSelect, handleNewProjectChange, handleAddProjectTask, handleRemoveProjectTask, handleProjectTaskChange, handleAddProjectUser, handleRemoveProjectUser, handleSaveNewProject,
    handleCancelNewProject, handleOpenNewProjectModal, handleContactPersonChange, handleContactPersonImageUpload, handleSaveContactPerson, uploadQuoteFiles, validateForm, buildQuoteFinancialsAndItems, extractSavedQuoteId, getNextQuoteNumberForSave, persistQuoteSeriesPreferences, handleSaveDraft,
    handleSaveAndSend, handleCancel, handleOtherAction
  } = controller as any;
  const manageSalespersonsPageSize = 3;
  const [manageSalespersonsPage, setManageSalespersonsPage] = useState(1);
  const manageSalespersonsTotalPages = Math.max(1, Math.ceil(filteredManageSalespersons.length / manageSalespersonsPageSize));
  const manageSalespersonsCurrentPage = Math.min(manageSalespersonsPage, manageSalespersonsTotalPages);
  const paginatedManageSalespersons = useMemo(() => {
    const startIndex = (manageSalespersonsCurrentPage - 1) * manageSalespersonsPageSize;
    return filteredManageSalespersons.slice(startIndex, startIndex + manageSalespersonsPageSize);
  }, [filteredManageSalespersons, manageSalespersonsCurrentPage]);

  useEffect(() => {
    if (isManageSalespersonsOpen) {
      setManageSalespersonsPage(1);
    }
  }, [isManageSalespersonsOpen, manageSalespersonSearch]);

  return (
    <>
      {/* Advanced Customer Search Modal */}
      {
        customerSearchModalOpen && typeof document !== 'undefined' && document.body && createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16"
            onClick={() => setCustomerSearchModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Advanced Customer Search</h2>
                <button
                  type="button"
                  onClick={() => setCustomerSearchModalOpen(false)}
                  className="w-8 h-8 text-[#156372] rounded flex items-center justify-center hover:bg-[#e6f4f7]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCustomerSearchCriteriaOpen(!customerSearchCriteriaOpen)}
                      className="px-4 py-2 border border-gray-300 rounded-l-md bg-white text-sm font-medium text-gray-700  flex items-center gap-2"
                    >
                      {customerSearchCriteria}
                      <ChevronDown size={16} />
                    </button>
                    {customerSearchCriteriaOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px]">
                        {["Customer Number", "Display Name", "Company Name", "First Name", "Last Name", "Email", "Phone"].map((criteria) => (
                          <button
                            key={criteria}
                            type="button"
                            onClick={() => {
                              setCustomerSearchCriteria(criteria);
                              setCustomerSearchCriteriaOpen(false);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                          >
                            {criteria}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomerSearch()}
                    placeholder="Enter search term"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleCustomerSearch}
                    className="px-6 py-2 bg-[#156372] text-white rounded-md font-medium hover:bg-[#0f5260] transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Results Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">CUSTOMER NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">COMPANY NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PHONE</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerPaginatedResults.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          {customerSearchTerm ? "No customers found" : "Enter a search term and click Search"}
                        </td>
                      </tr>
                    ) : (
                      customerPaginatedResults.map((customer) => (
                        <tr
                          key={customer.id || customer.name}
                          className=" cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCustomerSelect(customer);
                            setCustomerSearchModalOpen(false);
                            setCustomerSearchTerm("");
                            setCustomerSearchResults([]);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleCustomerSelect(customer);
                              setCustomerSearchModalOpen(false);
                              setCustomerSearchTerm("");
                              setCustomerSearchResults([]);
                            }
                          }}
                          tabIndex={0}
                        >
                          <td className="px-4 py-3 text-sm text-[#156372] ">
                            {customer.displayName || customer.name || ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{customer.email || ""}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{customer.companyName || ""}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{customer.workPhone || customer.mobile || ""}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {customerSearchResults.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomerSearchPage(prev => Math.max(1, prev - 1))}
                      disabled={customerSearchPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed "
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      {customerStartIndex + 1} - {Math.min(customerEndIndex, customerSearchResults.length)} of {customerSearchResults.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomerSearchPage(prev => Math.min(customerTotalPages, prev + 1))}
                      disabled={customerSearchPage >= customerTotalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed "
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      }

      {/* Quick New Customer Modal */}
      {
        typeof document !== "undefined" && document.body && createPortal(
          <div
            className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
            onClick={closeCustomerQuickAction}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-[84vw] h-[92vh] max-w-[1120px] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-1 bg-gray-50 p-0">
                <iframe
                  key={customerQuickActionFrameKey}
                  title="New Customer Quick Action"
                  src="/sales/customers/new?embed=1"
                  loading="eager"
                  onLoad={async () => {
                    if (isReloadingCustomerFrame) {
                      setIsReloadingCustomerFrame(false);
                    }
                    await tryAutoSelectNewCustomerFromQuickAction();
                  }}
                  className="w-full h-full bg-white border-0"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Quick New Project Modal */}
      {
        typeof document !== "undefined" && document.body && createPortal(
          <div
            className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewProjectQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
            onClick={() => {
              setIsNewProjectQuickActionOpen(false);
              reloadProjectsForQuote();
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1400px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">New Project (Quick Action)</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isReloadingProjectFrame || isAutoSelectingProjectFromQuickAction}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => {
                      setIsReloadingProjectFrame(true);
                      setProjectQuickActionFrameKey(prev => prev + 1);
                    }}
                  >
                    {isReloadingProjectFrame ? "Reloading..." : "Reload Form"}
                  </button>
                  <button
                    type="button"
                    disabled={isRefreshingProjectsQuickAction || isAutoSelectingProjectFromQuickAction}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={async () => {
                      setIsRefreshingProjectsQuickAction(true);
                      await reloadProjectsForQuote();
                      setIsRefreshingProjectsQuickAction(false);
                    }}
                  >
                    {isRefreshingProjectsQuickAction ? "Refreshing..." : "Refresh Projects"}
                  </button>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                  onClick={() => {
                    setIsNewProjectQuickActionOpen(false);
                    reloadProjectsForQuote();
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 p-2 bg-gray-100">
                <iframe
                  key={projectQuickActionFrameKey}
                  title="New Project Quick Action"
                  src={`/time-tracking/projects/new?embed=1${selectedCustomer?.id ? `&customerId=${encodeURIComponent(String(selectedCustomer.id))}` : ""}`}
                  loading="eager"
                  onLoad={async () => {
                    if (isReloadingProjectFrame) {
                      setIsReloadingProjectFrame(false);
                    }
                    await tryAutoSelectNewProjectFromQuickAction();
                  }}
                  className="w-full h-full bg-white rounded border border-gray-200"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* New Salesperson Modal */}
      {
        isNewSalespersonFormOpen && !isManageSalespersonsOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 z-[10000]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-[18px] leading-none font-semibold text-gray-900">
                  {editingSalespersonId ? "Edit Salesperson" : "Add New Salesperson"}
                </h2>
                <button
                  onClick={handleCancelNewSalesperson}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={newSalespersonData.name}
                      onChange={handleNewSalespersonChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={newSalespersonData.email}
                      onChange={handleNewSalespersonChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                      <button
                        onClick={handleSaveAndSelectSalesperson}
                          className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md "
                        >
                      {editingSalespersonId ? "Save Changes" : "Add"}
                      </button>
                    <button
                      onClick={handleCancelNewSalesperson}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md "
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Manage Salespersons Modal */}
      {
        isManageSalespersonsOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 z-[10000]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-[18px] leading-none font-semibold text-gray-900">Manage Salespersons</h2>
                <button
                  onClick={() => {
                    handleCancelNewSalesperson();
                    setIsManageSalespersonsOpen(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search and Add Button / Bulk Actions */}
              {selectedSalespersonIds.length > 0 ? (
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">
                      Merge
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Bulk Actions Menu Trigger
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ top: rect.bottom, left: rect.left });
                        setManageSalespersonMenuOpen("BULK_ACTIONS");
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2"
                    >
                      More Actions
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedSalespersonIds([])}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="p-6 border-b border-gray-200 flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Salesperson"
                      value={manageSalespersonSearch}
                      onChange={(e) => setManageSalespersonSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      handleStartNewSalesperson();
                      setManageSalespersonSearch("");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md "
                  >
                    <Plus size={16} />
                    New Salesperson
                  </button>
                </div>
              )}

              {/* Salespersons List */}
              <div className="flex-1 overflow-y-auto p-6">
                {isNewSalespersonFormOpen ? (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      {editingSalespersonId ? "Edit Salesperson" : "Add New Salesperson"}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={newSalespersonData.name}
                          onChange={handleNewSalespersonChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={newSalespersonData.email}
                          onChange={handleNewSalespersonChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          placeholder="Enter email"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAndSelectSalesperson}
                          className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md "
                        >
                          {editingSalespersonId ? "Save Changes" : "Add"}
                        </button>
                        <button
                          onClick={handleCancelNewSalesperson}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md "
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                          checked={
                            paginatedManageSalespersons.length > 0 &&
                            paginatedManageSalespersons.every((sp: any) =>
                              selectedSalespersonIds.includes(String(sp.id || sp._id || ""))
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSalespersonIds(
                                paginatedManageSalespersons.map((s: any) => String(s.id || s._id || ""))
                              );
                            } else {
                              setSelectedSalespersonIds(
                                selectedSalespersonIds.filter(
                                  (id) => !paginatedManageSalespersons.some((sp: any) => String(sp.id || sp._id || "") === String(id))
                                )
                              );
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SALESPERSON NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredManageSalespersons.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          {manageSalespersonSearch ? "No salespersons found" : "No salespersons available"}
                        </td>
                      </tr>
                    ) : (
                      paginatedManageSalespersons.map(salesperson => {
                        const salespersonId = String(salesperson.id || salesperson._id || "");
                        return (
                          <tr key={salespersonId} className="group hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                                  checked={selectedSalespersonIds.includes(salespersonId)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSalespersonIds([...selectedSalespersonIds, salespersonId]);
                                    } else {
                                      setSelectedSalespersonIds(selectedSalespersonIds.filter(id => id !== salespersonId));
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {salesperson.name}
                              {salesperson.status === 'inactive' && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{salesperson.email || ""}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="hidden group-hover:flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditSalesperson(salesperson);
                                  }}
                                  className="p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuPosition({ top: rect.bottom, left: rect.right });
                                    setManageSalespersonMenuOpen(manageSalespersonMenuOpen === salespersonId ? null : salespersonId);
                                  }}
                                  className={`p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded ${manageSalespersonMenuOpen === salespersonId ? 'bg-gray-100 text-[#156372]' : ''}`}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {manageSalespersonsTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Page {manageSalespersonsCurrentPage} of {manageSalespersonsTotalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setManageSalespersonsPage(prev => Math.max(1, prev - 1))}
                        disabled={manageSalespersonsCurrentPage === 1}
                        className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => setManageSalespersonsPage(prev => Math.min(manageSalespersonsTotalPages, prev + 1))}
                        disabled={manageSalespersonsCurrentPage >= manageSalespersonsTotalPages}
                        className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dropdown Portal */}
            {manageSalespersonMenuOpen && menuPosition && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[10000]"
                  onClick={() => setManageSalespersonMenuOpen(null)}
                />
                <div
                  className="fixed bg-white rounded-md shadow-lg z-[10001] border border-gray-100 py-1 w-48"
                  style={{
                    top: menuPosition.top,
                    left: manageSalespersonMenuOpen === "BULK_ACTIONS" ? menuPosition.left : menuPosition.left - 192
                  }}
                >
                  {manageSalespersonMenuOpen === "BULK_ACTIONS" ? (
                    <>
                      <button
                        onClick={() => handleBulkSalespersonStatusChange("active")}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        Mark as Active
                      </button>
                      <button
                        onClick={() => handleBulkSalespersonStatusChange("inactive")}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        Mark as Inactive
                      </button>
                      <button
                        onClick={() => handleBulkDeleteSalespersons()}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const salesperson = salespersons.find((sp: any) => String(sp.id || sp._id || "") === String(manageSalespersonMenuOpen || ""));
                          if (salesperson) {
                            handleStartEditSalesperson(salesperson);
                          }
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          const salesperson = salespersons.find((sp: any) => String(sp.id || sp._id || "") === String(manageSalespersonMenuOpen || ""));
                          const nextStatus = String(salesperson?.status || "active").toLowerCase() === "inactive" ? "active" : "inactive";
                          handleSetSalespersonStatus(String(manageSalespersonMenuOpen || ""), nextStatus as "active" | "inactive");
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        {String((salespersons.find((sp: any) => String(sp.id || sp._id || "") === String(manageSalespersonMenuOpen || ""))?.status || "active")).toLowerCase() === "inactive"
                          ? "Mark as Active"
                          : "Mark as Inactive"}
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteSalesperson(manageSalespersonMenuOpen);
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>,
              document.body
            )}
          </div>,
          document.body
        )
      }

      <NewTaxModal
        isOpen={isNewTaxQuickModalOpen}
        onClose={() => {
          setIsNewTaxQuickModalOpen(false);
          setNewTaxTargetItemId(null);
        }}
        onCreated={handleTaxCreatedFromModal}
      />
    </>
  );
}
