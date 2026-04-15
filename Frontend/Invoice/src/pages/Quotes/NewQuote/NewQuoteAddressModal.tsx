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
import { Country } from "country-state-city";
import NewTaxModal from "../../../../components/modals/NewTaxModal";
import { buildTaxOptionGroups, taxLabel, normalizeCreatedTaxPayload, isTaxActive } from "../../../hooks/Taxdropdownstyle";
import { readTaxesLocal, createTaxLocal, isTaxGroupRecord } from "../../settings/organization-settings/taxes-compliance/TAX/storage";
import { countryData } from "../../Customers/NewCustomer/countriesData";
import { getStatesByCountryName } from "../../Customers/NewCustomer/NewCustomer.utils";



type Props = {
  controller: any;
};

export default function NewQuoteAddressModal({ controller }: Props) {
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);
  const stateDropdownRef = useRef<HTMLDivElement | null>(null);
  const closeExclusiveAddressDropdowns = () => {
    setIsCountryDropdownOpen(false);
    setIsPhoneCodeDropdownOpen(false);
  };

  const openExclusiveDropdown = (
    isOpen: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (isOpen) {
      setOpen(false);
      return;
    }
    closeExclusiveAddressDropdowns();
    setOpen(true);
  };

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

  const allCountryNames = useMemo(() => {
    const libraryNames = Country.getAllCountries().map((country) => country.name);
    return Array.from(new Set([...libraryNames, ...Object.keys(countryData)])).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredCountries = useMemo(() => {
    const normalized = countrySearch.trim().toLowerCase();
    if (!normalized) return allCountryNames;
    return allCountryNames.filter((country) => country.toLowerCase().includes(normalized));
  }, [allCountryNames, countrySearch]);

  const countryStates = useMemo(() => {
    return getStatesByCountryName(String(addressFormData.country || ""), countryData);
  }, [addressFormData.country]);

  const filteredStates = useMemo(() => {
    const normalized = stateSearch.trim().toLowerCase();
    if (!normalized) return countryStates;
    return countryStates.filter((state) => state.toLowerCase().includes(normalized));
  }, [countryStates, stateSearch]);

  const closeAddressModal = () => {
    if (isAddressSaving) return;
    setIsAddressModalOpen(false);
    setIsCountryDropdownOpen(false);
    setIsStateDropdownOpen(false);
    setIsPhoneCodeDropdownOpen(false);
    setCountrySearch("");
    setStateSearch("");
    setPhoneCodeSearch("");
  };

  useEffect(() => {
    if (!isCountryDropdownOpen && !isStateDropdownOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isCountryDropdownOpen && countryDropdownRef.current && !countryDropdownRef.current.contains(target)) {
        setIsCountryDropdownOpen(false);
      }
      if (isStateDropdownOpen && stateDropdownRef.current && !stateDropdownRef.current.contains(target)) {
        setIsStateDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCountryDropdownOpen, isStateDropdownOpen]);

  useEffect(() => {
    if (!isCountryDropdownOpen) setCountrySearch("");
  }, [isCountryDropdownOpen]);

  useEffect(() => {
    if (!isStateDropdownOpen) setStateSearch("");
  }, [isStateDropdownOpen]);

  return (
    <>
      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[12000] bg-black/45 flex items-start justify-center p-4 pt-6 overflow-y-auto">
          <div className="w-full max-w-[620px] rounded-lg bg-white shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-[32px] leading-none font-medium text-gray-800">
                {addressModalType === "billing" ? "Billing Address" : "Shipping Address"}
              </h3>
              <button
                type="button"
                className="w-7 h-7 rounded-md text-red-500 flex items-center justify-center hover:bg-blue-50"
                onClick={closeAddressModal}
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
                <div ref={countryDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      openExclusiveDropdown(isCountryDropdownOpen, setIsCountryDropdownOpen);
                      setCountrySearch("");
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    aria-haspopup="listbox"
                    aria-expanded={isCountryDropdownOpen}
                  >
                    <span>{addressFormData.country || "Select or type to add"}</span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isCountryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-200">
                        <Search size={16} className="text-gray-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="flex-1 border-none outline-none text-sm text-gray-700"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((country) => {
                            const isSelected = String(addressFormData.country || "") === country;
                            return (
                              <button
                                key={country}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const nextStates = getStatesByCountryName(country, countryData);
                                  setAddressFormData((prev: any) => ({
                                    ...prev,
                                    country,
                                    state: nextStates[0] || ""
                                  }));
                                  setIsCountryDropdownOpen(false);
                                  setCountrySearch("");
                                  setStateSearch("");
                                }}
                                className={`w-full px-3 py-2 text-left text-sm cursor-pointer flex items-center justify-between hover:bg-gray-100 ${
                                  isSelected ? "bg-blue-50 text-blue-600" : "text-gray-700"
                                }`}
                              >
                                <span>{country}</span>
                                {isSelected && <Check size={16} className="text-blue-600" />}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No countries found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                  <div ref={stateDropdownRef} className="relative">
                    {countryStates.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsStateDropdownOpen((prev) => !prev);
                            setStateSearch("");
                          }}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                          aria-haspopup="listbox"
                          aria-expanded={isStateDropdownOpen}
                        >
                          <span>{addressFormData.state || "Select or type to add"}</span>
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isStateDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isStateDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
                            <div className="flex items-center gap-2 p-2 border-b border-gray-200">
                              <Search size={16} className="text-gray-400 flex-shrink-0" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={stateSearch}
                                onChange={(e) => setStateSearch(e.target.value)}
                                className="flex-1 border-none outline-none text-sm text-gray-700"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredStates.length > 0 ? (
                                filteredStates.map((state) => {
                                  const isSelected = String(addressFormData.state || "") === state;
                                  return (
                                    <button
                                      key={state}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setAddressFormData((prev: any) => ({ ...prev, state }));
                                        setIsStateDropdownOpen(false);
                                        setStateSearch("");
                                      }}
                                      className={`w-full px-3 py-2 text-left text-sm cursor-pointer flex items-center justify-between hover:bg-gray-100 ${
                                        isSelected ? "bg-blue-50 text-blue-600" : "text-gray-700"
                                      }`}
                                    >
                                      <span>{state}</span>
                                      {isSelected && <Check size={16} className="text-blue-600" />}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">No states found</div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <input
                        className="w-full h-10 rounded border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]"
                        name="state"
                        value={addressFormData.state}
                        onChange={handleAddressFieldChange}
                        placeholder="Enter state"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">ZIP Code</label>
                  <input className="w-full h-10 rounded border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-[#156372]" name="zipCode" value={addressFormData.zipCode} onChange={handleAddressFieldChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phone</label>
                  <div className="flex w-full max-w-sm items-center border border-gray-300 rounded bg-white">
                    <div className="relative" ref={phoneCodeDropdownRef}>
                      <button
                        type="button"
                        className="w-[88px] px-2 py-1.5 border-r border-gray-300 text-[13px] bg-gray-50 text-gray-600 focus:outline-none flex items-center justify-between"
                        onClick={() => {
                          openExclusiveDropdown(isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen);
                          setPhoneCodeSearch("");
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={isPhoneCodeDropdownOpen}
                      >
                        <span className="truncate">{addressFormData.phoneCountryCode || "+252"}</span>
                        <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                      </button>

                      {isPhoneCodeDropdownOpen && (
                        <div className="absolute left-0 top-full z-[13000] mt-1 w-[220px] overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg">
                          <div className="border-b border-gray-200 bg-white p-2">
                            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
                              <Search size={14} className="flex-shrink-0 text-gray-400" />
                              <input
                                type="text"
                                value={phoneCodeSearch}
                                onChange={(e) => setPhoneCodeSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-[148px] overflow-y-auto py-1">
                            {filteredPhoneCountryOptions.length === 0 ? (
                              <div className="px-3 py-2 text-[13px] text-gray-500">No matching country code</div>
                            ) : (
                              filteredPhoneCountryOptions.map((country: any, index: number) => {
                                const isSelected = addressFormData.phoneCountryCode === country.phoneCode;
                                return (
                                <button
                                  key={`${country.phoneCode}-${country.name}-${index}`}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setAddressFormData((prev: any) => ({ ...prev, phoneCountryCode: country.phoneCode }));
                                    setIsPhoneCodeDropdownOpen(false);
                                    setPhoneCodeSearch("");
                                  }}
                                  className={`flex w-full items-center gap-3 px-3 py-1.5 text-[13px] transition-colors hover:bg-gray-100 ${isSelected ? "bg-blue-50 font-medium text-blue-600" : "text-gray-700"}`}
                                >
                                  <span className="w-12 flex-shrink-0">{country.phoneCode}</span>
                                  <span className="min-w-0 flex-1 truncate text-left">{country.name}</span>
                                  {isSelected && <Check size={14} className="flex-shrink-0 text-blue-600" />}
                                </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <input className="flex-1 px-3 py-1.5 text-[13px] text-gray-700 outline-none bg-transparent" name="phone" value={addressFormData.phone} onChange={handleAddressFieldChange} inputMode="numeric" pattern="[0-9]*" placeholder="Enter phone" />
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
                className="px-5 h-9 rounded-md bg-[#156372] text-white text-sm font-semibold hover:bg-[#0f5260] disabled:opacity-70"
                onClick={handleSaveAddress}
                disabled={isAddressSaving}
              >
                {isAddressSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="px-5 h-9 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-70"
                onClick={closeAddressModal}
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
