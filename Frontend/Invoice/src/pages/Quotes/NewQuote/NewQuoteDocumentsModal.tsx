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

export default function NewQuoteDocumentsModal({ controller }: Props) {
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
      {/* Documents Modal */}
      {
        isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]" onClick={() => setIsDocumentsModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 m-0">Documents</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Files"
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                    />
                    {documentSearch && (
                      <button
                        onClick={() => setDocumentSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 "
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setIsDocumentsModalOpen(false)}
                    className="p-1 text-gray-400 "
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Navigation - INBOXES */}
                <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">INBOXES</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedInbox("files")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "files"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <Folder size={16} />
                        Files
                      </button>
                      <button
                        onClick={() => setSelectedInbox("bank-statements")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "bank-statements"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <CreditCard size={16} />
                        Bank Statements
                      </button>
                      <button
                        onClick={() => setSelectedInbox("all-documents")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "all-documents"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <FileText size={16} />
                        All Documents
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {(() => {
                    // Filter documents based on selected inbox
                    let filteredDocs = availableDocuments;

                    if (selectedInbox === "files") {
                      filteredDocs = availableDocuments.filter(doc =>
                        doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder
                      );
                    } else if (selectedInbox === "bank-statements") {
                      filteredDocs = availableDocuments.filter(doc =>
                        doc.folder === "Bank Statements" || doc.module === "Banking"
                      );
                    } else if (selectedInbox === "all-documents") {
                      filteredDocs = availableDocuments;
                    }

                    // Filter by search term
                    if (documentSearch) {
                      filteredDocs = filteredDocs.filter(doc =>
                        doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
                        (doc.associatedTo && doc.associatedTo.toLowerCase().includes(documentSearch.toLowerCase()))
                      );
                    }

                    const allSelected = filteredDocs.length > 0 && filteredDocs.every(doc => selectedDocuments.includes(doc.id));

                    if (filteredDocs.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                          <p className="text-gray-600 mb-4">Autoscan is disabled. Please enable it from the Inbox module.</p>
                          <a
                            href="#"
                            className="text-[#156372] "
                            onClick={(e) => {
                              e.preventDefault();
                              setIsDocumentsModalOpen(false);
                              navigate('/documents');
                            }}
                          >
                            Go to Inbox
                          </a>
                        </div>
                      );
                    }

                    return (
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        {/* Table Header */}
                        <div className="bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 px-4 py-3">
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocuments(filteredDocs.map(doc => doc.id));
                                } else {
                                  setSelectedDocuments(selectedDocuments.filter(id => !filteredDocs.some(doc => doc.id === id)));
                                }
                              }}
                              className="cursor-pointer"
                            />
                          </div>
                          <div className="col-span-4">
                            <span className="text-xs font-semibold text-gray-700 uppercase">FILE NAME</span>
                          </div>
                          <div className="col-span-5">
                            <span className="text-xs font-semibold text-gray-700 uppercase">DETAILS</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs font-semibold text-gray-700 uppercase">UPLOADED BY</span>
                          </div>
                        </div>

                        {/* Table Body - Documents */}
                        {filteredDocs.map((doc) => (
                          <div key={doc.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-200 ">
                            <div className="col-span-1 flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.includes(doc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDocuments([...selectedDocuments, doc.id]);
                                  } else {
                                    setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </div>
                            <div className="col-span-4">
                              <a href="#" className="text-sm text-[#156372] ">
                                {doc.name}
                              </a>
                            </div>
                            <div className="col-span-5">
                              <div className="text-sm text-gray-700 space-y-1">
                                {doc.associatedTo && <div>{doc.associatedTo}</div>}
                                {doc.module && <div>Module: {doc.module}</div>}
                                {doc.uploadedOn && <div>Date: {doc.uploadedOn}</div>}
                                {doc.size && <div>Size: {doc.size}</div>}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-sm text-gray-700">{doc.uploadedBy || "Me"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (selectedDocuments.length > 0) {
                      // Get selected documents from availableDocuments
                      const selectedDocs = availableDocuments.filter(doc =>
                        selectedDocuments.includes(doc.id)
                      );

                      // Convert to attachedFiles format
                      const newDocs = selectedDocs.map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                        file: null,
                        documentId: doc.id // Store reference to document
                      }));

                      setFormData(prev => ({
                        ...prev,
                        attachedFiles: [...prev.attachedFiles, ...newDocs]
                      }));
                    }
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  className="px-6 py-2.5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer "
                >
                  Attachments
                </button>
                <button
                  onClick={() => {
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer   "
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

    </>
  );
}
