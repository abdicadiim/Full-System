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

export default function NewQuoteQuoteNumberModal({ controller }: Props) {
  const [draftQuoteNumberMode, setDraftQuoteNumberMode] = useState("auto");
  const [draftQuotePrefix, setDraftQuotePrefix] = useState("");
  const [draftQuoteNextNumber, setDraftQuoteNextNumber] = useState("");
  const quoteNumberDraftSourceRef = useRef("");
  const quoteNumberDraftRequestRef = useRef(0);

  const resolveLiveQuoteNextDigits = async (sourceRow: any) => {
    const prefix = sanitizeQuotePrefix(sourceRow?.prefix || quotePrefix || "QT-");
    try {
      const response: any = await quotesAPI.getNextNumber(prefix);
      const liveNumber = String(
        response?.data?.nextNumber ||
          response?.data?.next_number ||
          response?.data?.quoteNumber ||
          response?.nextNumber ||
          "",
      ).trim();
      const liveDigits = extractQuoteDigits(liveNumber);
      if (liveDigits) return liveDigits;
    } catch (error) {
      console.error("Error loading live quote number preview:", error);
    }

    return "";
  };

  const resolveDraftQuoteNumber = async (sourceRow: any, nextMode?: "auto" | "manual") => {
    const requestId = ++quoteNumberDraftRequestRef.current;
    const resolvedPrefix = sanitizeQuotePrefix(sourceRow?.prefix || quotePrefix || "QT-");
    const fallbackDigits =
      resolveSeriesNextDigits(sourceRow) ||
      extractQuoteDigits(formData.quoteNumber) ||
      quoteNextNumber ||
      "000001";

    const targetMode = nextMode || (quoteNumberMode === "manual" ? "manual" : "auto");
    setDraftQuoteNumberMode(targetMode);
    setDraftQuotePrefix(resolvedPrefix);
    setDraftQuoteNextNumber(fallbackDigits);
    setFormData((prev: any) => ({
      ...prev,
      quoteNumber: buildQuoteNumber(resolvedPrefix, fallbackDigits),
    }));

    const liveDigits = await resolveLiveQuoteNextDigits(sourceRow);
    if (requestId !== quoteNumberDraftRequestRef.current) return;

    const resolvedDigits = liveDigits || fallbackDigits;
    setDraftQuotePrefix(resolvedPrefix);
    setDraftQuoteNextNumber(resolvedDigits);
    setFormData((prev: any) => ({
      ...prev,
      quoteNumber: buildQuoteNumber(resolvedPrefix, resolvedDigits),
    }));
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

  const isQuoteSeriesReady = Boolean(quoteSeriesRow);

  useEffect(() => {
    if (!isQuoteNumberModalOpen) {
      quoteNumberDraftSourceRef.current = "";
      quoteNumberDraftRequestRef.current += 1;
      return;
    }

    const sourceRow = quoteSeriesRow;
    if (!sourceRow) return;

    const sourceKey = [
      String(sourceRow?.id || sourceRow?._id || sourceRow?.seriesName || ""),
      String(sourceRow?.prefix || ""),
      String(sourceRow?.startingNumber ?? sourceRow?.nextNumber ?? ""),
      String(sourceRow?.nextNumber ?? "")
    ].join("|");

    if (quoteNumberDraftSourceRef.current === sourceKey) return;
    quoteNumberDraftSourceRef.current = sourceKey;

    void resolveDraftQuoteNumber(sourceRow);
  }, [
    isQuoteNumberModalOpen,
    quoteSeriesRow,
    quoteNumberMode,
    quotePrefix,
    quoteNextNumber,
    formData.quoteNumber,
    resolveSeriesNextDigits,
    sanitizeQuotePrefix,
    extractQuoteDigits,
    buildQuoteNumber,
  ]);

  const closeQuoteNumberModal = () => {
    setIsQuoteNumberModalOpen(false);
  };

  const handleSaveQuoteNumberPreferences = async () => {
    const nextDigits = extractQuoteDigits(draftQuoteNextNumber) || "1";
    const width = nextDigits.length >= 2 ? nextDigits.length : 6;
    const normalizedDigits = nextDigits.padStart(width, "0");
    const normalizedPrefix = sanitizeQuotePrefix(draftQuotePrefix);
    const isAutoMode = draftQuoteNumberMode === "auto";
    const nextQuoteNumber = isAutoMode
      ? buildQuoteNumber(normalizedPrefix, normalizedDigits)
      : String(formData.quoteNumber || "").trim();

    try {
      setQuoteNumberMode(draftQuoteNumberMode);
      if (isAutoMode) {
        setQuoteNextNumber(normalizedDigits);
        setQuotePrefix(normalizedPrefix);
        setFormData((prev: any) => ({
          ...prev,
          quoteNumber: nextQuoteNumber
        }));
        closeQuoteNumberModal();
        toast.success("Quote number preferences saved.");
        void persistQuoteSeriesPreferences({ prefix: normalizedPrefix, nextDigits: normalizedDigits })
          .then(() => {
            quoteSeriesSyncRef.current = true;
          })
          .catch((error) => {
            console.error("Error saving quote number series:", error);
            toast.error("Failed to save quote number series.");
          });
        return;
      }
      quoteSeriesSyncRef.current = true;
      if (!isAutoMode) {
        setQuotePrefix(normalizedPrefix);
        setQuoteNextNumber(normalizedDigits);
        if (!String(nextQuoteNumber || "").trim()) {
          setFormData((prev: any) => ({ ...prev, quoteNumber: "" }));
        }
      }

      toast.success("Quote number preferences saved.");
      closeQuoteNumberModal();
    } catch (error) {
      console.error("Error saving quote number series:", error);
      toast.error("Failed to save quote number series.");
    }
  };

  return (
    <>
      {/* Quote Number Configuration Modal */}
      {
        isQuoteNumberModalOpen && (
      <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 z-50"
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-[520px] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2 className="text-[18px] leading-none font-medium text-gray-800">Configure Quote Number Preferences</h2>
                <button
                  onClick={closeQuoteNumberModal}
                  className="w-7 h-7 rounded-md text-red-500 flex items-center justify-center hover:bg-blue-50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-4">
                {!isQuoteSeriesReady ? (
                  <div className="py-8 text-center text-[13px] text-gray-500">
                    Loading quote number preferences...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[1fr_1fr] gap-x-5 gap-y-1 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-[13px] leading-none font-semibold text-gray-800 mb-2">Location</p>
                        <p className="text-[14px] leading-none text-gray-700">{formData.selectedLocation || "Head Office"}</p>
                      </div>
                      <div>
                        <p className="text-[13px] leading-none font-semibold text-gray-800 mb-2">Associated Series</p>
                        <p className="text-[14px] leading-none text-gray-700">Default Transaction Series</p>
                      </div>
                    </div>

                    <div className="pt-4">
                      {draftQuoteNumberMode === "auto" ? (
                        <p className="text-[12px] leading-[1.45] text-gray-700 mb-3 max-w-[96%]">
                          Your quote numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                        </p>
                      ) : (
                        <p className="text-[12px] leading-[1.45] text-gray-700 mb-3 max-w-[96%]">
                          You have selected manual quote numbering. Do you want us to auto-generate it for you?
                        </p>
                      )}

                      <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <div className="pt-1">
                            <input
                              type="radio"
                              name="quoteNumberMode"
                              value="auto"
                              checked={draftQuoteNumberMode === "auto"}
                              onChange={() => {
                                setDraftQuoteNumberMode("auto");
                                void resolveDraftQuoteNumber(quoteSeriesRow, "auto");
                              }}
                              className="w-4 h-4 accent-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] leading-none font-semibold text-gray-800">
                                Continue auto-generating quote numbers
                              </span>
                              <Info size={11} className="text-gray-400" />
                            </div>
                            {draftQuoteNumberMode === "auto" && (
                              <div className="mt-3 pl-4">
                                <div className="grid grid-cols-[95px_1fr] gap-3">
                                  <div>
                                    <label className="block text-[11px] text-gray-700 mb-1">Prefix</label>
                                    <input
                                      type="text"
                                      value={draftQuotePrefix}
                                      onChange={(e) => {
                                        const nextPrefix = sanitizeQuotePrefix(e.target.value);
                                        setDraftQuotePrefix(nextPrefix);
                                      }}
                                      className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-[12px] text-gray-700 focus:outline-none focus:border-[#156372]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-gray-700 mb-1">Next Number</label>
                                    <input
                                      type="text"
                                      value={draftQuoteNextNumber}
                                      onChange={(e) => {
                                        const nextDigits = extractQuoteDigits(e.target.value) || "";
                                        setDraftQuoteNextNumber(nextDigits);
                                      }}
                                      className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-[12px] text-gray-700 focus:outline-none focus:border-[#156372]"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <div className="pt-1">
                            <input
                              type="radio"
                              name="quoteNumberMode"
                              value="manual"
                              checked={draftQuoteNumberMode === "manual"}
                              onChange={() => {
                                setDraftQuoteNumberMode("manual");
                                setFormData((prev: any) => ({
                                  ...prev,
                                  quoteNumber: ""
                                }));
                              }}
                              className="w-4 h-4 accent-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <span className="text-[13px] leading-none text-gray-700">
                              Enter quote numbers manually
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 px-4 py-4 border-t border-gray-200">
                <button
                  onClick={handleSaveQuoteNumberPreferences}
                  disabled={!isQuoteSeriesReady}
                  className="px-4 h-8 bg-[#156372] text-white rounded-md text-[12px] font-semibold hover:bg-[#0f5661] disabled:opacity-70"
                >
                  Save
                </button>
                <button
                  onClick={closeQuoteNumberModal}
                  className="px-4 h-8 bg-white border border-gray-300 text-gray-700 rounded-md text-[12px] font-medium hover:bg-gray-50"
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
