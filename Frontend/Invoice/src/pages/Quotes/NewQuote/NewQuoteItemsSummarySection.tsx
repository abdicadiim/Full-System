import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, ArrowUpDown, X,
  MessageSquare, User, Calendar, Plus, Paperclip, Minus, Check,
  Trash2, MoreVertical, Edit2, Edit3, Settings, Tag, HelpCircle, HardDrive,
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

export default function NewQuoteItemsSummarySection({ controller }: Props) {
  const [draggedRowId, setDraggedRowId] = useState<string | number | null>(null);
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
    isTotalSummaryOpen, setIsTotalSummaryOpen,
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

  const closeExclusiveRowDropdowns = () => {
    setIsAddNewRowDropdownOpen(false);
    setIsUploadDropdownOpen(false);
  };

  const openExclusiveDropdown = (
    isOpen: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (isOpen) {
      setOpen(false);
      return;
    }
    closeExclusiveRowDropdowns();
    setOpen(true);
  };

  const formatDecimalPlaceholderValue = (value: any) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric) || numeric === 0) return "";
    return String(value ?? "");
  };

  const handleRowDragStart = (rowId: string | number) => {
    setDraggedRowId(rowId);
  };

  const handleRowDragOver = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleRowDrop = (targetRowId: string | number) => {
    if (draggedRowId === null || String(draggedRowId) === String(targetRowId)) {
      setDraggedRowId(null);
      return;
    }

    setFormData((prev: any) => {
      const nextItems = Array.isArray(prev.items) ? [...prev.items] : [];
      const fromIndex = nextItems.findIndex((row) => String(row?.id) === String(draggedRowId));
      const toIndex = nextItems.findIndex((row) => String(row?.id) === String(targetRowId));
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;

      const [movedRow] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, movedRow);
      const totals = calculateAllTotals(nextItems, prev);
      return {
        ...prev,
        items: nextItems,
        ...totals,
      };
    });

    setDraggedRowId(null);
  };

  const handleRowDragEnd = () => {
    setDraggedRowId(null);
  };

  const renderReportingTagsInlinePanel = (item: any) => {
    if (!isReportingTagsModalOpen || currentReportingTagsItemId !== item.id) return null;

    return (
      <div className="mt-2 rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Reporting Tags</h3>
        </div>
        <div className="p-4">
          {availableReportingTags.length === 0 ? (
            <p className="text-sm text-gray-700">
              There are no active reporting tags or you haven't created a reporting tag yet. You can create/edit reporting tags under settings.
            </p>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {availableReportingTags.map((tag: any) => {
                const tagId = String(tag?._id || tag?.id || "");
                const tagName = String(tag?.name || "Tag");
                const tagOptions = Array.isArray(tag?.options) ? tag.options : [];
                return (
                  <div key={tagId} className="space-y-1">
                    <label className="text-sm text-gray-700">
                      {tagName}
                      {Boolean(tag?.isMandatory) ? <span className="text-red-500 ml-1">*</span> : null}
                    </label>
                    <select
                      className="w-full h-10 px-3 border border-gray-300 rounded text-sm text-gray-700 bg-white focus:outline-none focus:border-[#156372]"
                      value={reportingTagSelections[tagId] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setReportingTagSelections(prev => ({ ...prev, [tagId]: value }));
                      }}
                    >
                      <option value="">None</option>
                      {tagOptions.map((option: string) => (
                        <option key={`${tagId}-${option}`} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            className="px-4 py-2 bg-white text-gray-700 rounded-md text-sm font-medium border border-gray-300"
            onClick={() => {
              setCurrentReportingTagsItemId(null);
              setIsReportingTagsModalOpen(false);
            }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium border border-[#156372]"
            onClick={handleSaveReportingTags}
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
            {/* Item Table Section */}
            <div className="max-w-[980px]">
              <div className="mt-0 bg-white border border-gray-200 rounded-md overflow-visible">
                <div className="flex items-center px-3 py-3 border-b border-gray-200 bg-[#f8f9fb] rounded-t-md">
                  <h2 className="text-[13px] font-semibold text-gray-800">Item Table</h2>
                </div>

                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase">Item Details</th>
                      <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-24">Quantity</th>
                      <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-32">Rate</th>
                      <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-40">Tax</th>
                      <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-32">Amount</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-200 group ${draggedRowId === item.id ? "bg-[#f0f7f8]" : ""}`}
                        onDragOver={handleRowDragOver}
                        onDrop={() => handleRowDrop(item.id)}
                      >
                        <td className="py-2 px-3 align-middle" colSpan={item.itemType === "header" ? 6 : 1}>
                          {item.itemType === "header" ? (
                            <div className="flex items-center gap-3">
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", String(item.id));
                                  handleRowDragStart(item.id);
                                }}
                                onDragEnd={handleRowDragEnd}
                                className="flex h-8 w-7 items-center justify-center rounded border border-transparent text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 hover:bg-gray-50"
                                title="Drag to reorder"
                                aria-label="Drag to reorder header"
                                >
                                  <GripVertical size={14} />
                              </div>
                              <input
                                type="text"
                                value={item.itemDetails}
                                onChange={(e) => handleItemChange(item.id, 'itemDetails', e.target.value)}
                                placeholder="Add New Header"
                                className="flex-1 min-w-0 px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm bg-transparent font-medium text-gray-900"
                              />
                              <button
                                type="button"
                                className="flex h-8 w-8 shrink-0 items-center justify-center text-red-500 hover:text-red-600 transition-colors"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (

                            <div className="flex gap-3 items-center">
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", String(item.id));
                                  handleRowDragStart(item.id);
                                }}
                                onDragEnd={handleRowDragEnd}
                                className="flex h-8 w-7 items-center justify-center text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500"
                                title="Drag to reorder"
                                aria-label="Drag to reorder item"
                              >
                                <GripVertical size={14} />
                              </div>
                              {/* Image Placeholder */}
                              <div className="w-9 h-9 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                                <ImageIcon size={18} />
                              </div>

                              <div className="flex-1 space-y-2 min-w-[200px]">
                                <div
                                  className="relative"
                                  ref={(el) => { itemDropdownRefs.current[String(item.id)] = el; }}
                                >
                                  <input
                                    type="text"
                                    value={item.itemDetails}
                                    onChange={(e) => {
                                      handleItemChange(item.id, 'itemDetails', e.target.value);
                                      setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }));
                                      if (!openItemDropdowns[item.id]) {
                                        setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                      }
                                    }}
                                    onFocus={() => {
                                      if (!openItemDropdowns[item.id]) {
                                        setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                      }
                                    }}
                                    placeholder="Type or click to select an item."
                                    className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm bg-transparent font-medium text-gray-900"
                                  />
                                  {openItemDropdowns[item.id] && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[60] w-[300px] max-w-[90vw]">
                                      <div className="p-2 border-b border-gray-100 bg-white rounded-t-lg">
                                        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                                          <Search size={14} className="text-gray-400" />
                                            <input
                                              type="text"
                                              placeholder="Search items..."
                                              className="flex-1 bg-transparent text-sm outline-none"
                                              value={itemSearches[item.id] || ""}
                                              onChange={(e) => setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                              autoFocus
                                            />
                                        </div>
                                      </div>
                                      <div className="max-h-60 overflow-y-auto">
                                        {(() => {
                                          const rows = getFilteredItems(item.id);
                                          if (!rows.length) {
                                            return (
                                              <div className="px-4 py-6 text-sm text-gray-500">
                                                No items found.
                                              </div>
                                            );
                                          }

                                          return rows.map((availItem) => {
                                            const isSelected = selectedItemIds[item.id] === availItem.id;
                                            const codeLabel = "SKU";
                                            const codeValue = availItem.sku || availItem.code || "-";
                                            return (
                                              <div
                                                key={availItem.id}
                                                className={[
                                                  "px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0",
                                                  isSelected ? "bg-[#f0f7f8] text-gray-900" : "text-gray-800 hover:bg-gray-50"
                                                ].join(" ")}
                                                onClick={() => handleItemSelect(item.id, availItem)}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="min-w-0">
                                                    <div className="text-sm font-semibold truncate">
                                                      {availItem.name}
                                                    </div>
                                                    <div className={["text-xs mt-0.5", isSelected ? "text-[#2a6670]" : "text-gray-500"].join(" ")}>
                                                      {codeLabel}: {codeValue} <span className="mx-1">|</span> Rate: {formatMoneyForDropdown(availItem.rate)}
                                                    </div>
                                                  </div>
                                                  {isSelected ? (
                                                    <Check size={16} className="text-[#156372] flex-shrink-0 mt-0.5" />
                                                  ) : null}
                                                </div>
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                      <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#156372] hover:bg-[#e6f4f7] font-semibold border-t border-gray-100 rounded-b-lg"
                                        onClick={() => {
                                          setIsNewItemModalOpen(true);
                                          setOpenItemDropdowns(prev => ({ ...prev, [item.id]: false }));
                                        }}
                                      >
                                        <PlusCircle size={16} />
                                        <span>Add New Item</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {(showAdditionalInformationEffective || additionalInfoItemIds.includes(String(item.id))) && (
                                  <>
                                    <textarea
                                      value={item.description || ""}
                                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                      placeholder="Add a description to your item"
                                      className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-xs text-gray-500 resize-none bg-transparent"
                                      rows={2}
                                    />
                                    <button
                                      type="button"
                                      className="mt-1 inline-flex items-center gap-2 text-xs text-gray-700 hover:text-[#156372]"
                                      onClick={() => {
                                        const isCurrentOpen = isReportingTagsModalOpen && currentReportingTagsItemId === item.id;
                                        if (isCurrentOpen) {
                                          setCurrentReportingTagsItemId(null);
                                          setIsReportingTagsModalOpen(false);
                                          return;
                                        }
                                        handleOpenReportingTagsModal(item.id);
                                      }}
                                    >
                                      <Tag size={12} className="text-gray-500" />
                                      <span>{getItemReportingTagsSummaryLabel(item)}</span>
                                      <ChevronDown size={12} className="text-gray-500" />
                                    </button>
                                    {renderReportingTagsInlinePanel(item)}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        {item.itemType !== "header" && (
                          <>
                            <td className="py-2 px-3 align-top">
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm text-center bg-transparent"
                                  step="0.01"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 align-top">
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  value={item.rate}
                                  onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm text-center bg-transparent"
                                  step="0.01"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 align-top">
                              <div className="relative" ref={(el) => { taxDropdownRefs.current[String(item.id)] = el; }}>
                                {(() => {
                                  const selectedTaxObj: any = getTaxBySelection(item.tax);
                                  const fallbackRate = parseTaxRate(item.taxRate);
                                  const displayLabel = selectedTaxObj
                                    ? taxLabel(selectedTaxObj)
                                    : (fallbackRate > 0 ? `Tax [${fallbackRate}%]` : "Select a Tax");
                                  const searchValue = taxSearches[item.id] || "";
                                  const filteredGroups = getFilteredTaxGroups(searchValue);
                                  const hasTaxes = filteredGroups.length > 0;

                                  return (
                                    <>
                                      <button
                                        type="button"
                                        className="w-full px-2 py-1.5 border border-gray-300 bg-white rounded outline-none text-sm text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                                        onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                      >
                                        <span className={displayLabel === "Select a Tax" ? "text-gray-500" : "text-gray-900"}>
                                          {displayLabel}
                                        </span>
                                        <ChevronDown
                                          size={14}
                                          className={`transition-transform ${openTaxDropdowns[item.id] ? "rotate-180" : ""}`}
                                          style={{ color: "#156372" }}
                                        />
                                      </button>

                                      {openTaxDropdowns[item.id] && (
                                        <div className="absolute left-0 top-full z-[9999] mt-1 w-72 rounded-xl border border-[#d6dbe8] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                                          <div className="p-2">
                                            <div className="flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: "#156372" }}>
                                              <Search size={14} className="text-slate-400" />
                                              <input
                                                type="text"
                                                value={searchValue}
                                                onChange={(e) => setTaxSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                placeholder="Search..."
                                                className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                                autoFocus
                                              />
                                            </div>
                                          </div>
                                          <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                                            {!hasTaxes ? (
                                              <div className="px-4 py-3 text-center text-[13px] text-slate-400">No taxes found</div>
                                            ) : (
                                              filteredGroups.map((group) => (
                                                <div key={group.label}>
                                                  <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-700">
                                                    {group.label}
                                                  </div>
                                                  {group.options.map((tax) => {
                                                    const taxId = tax.id;
                                                    const label = taxLabel(tax.raw ?? tax);
                                                    const selected = String(item.tax || "") === taxId || Number(item.taxRate || 0) === tax.rate;
                                                    return (
                                                      <button
                                                        key={taxId}
                                                        type="button"
                                                        onClick={() => {
                                                          handleItemChange(item.id, "tax", taxId);
                                                          setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                                          setTaxSearches(prev => ({ ...prev, [item.id]: "" }));
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-[13px] ${selected
                                                          ? "text-[#156372] font-medium hover:bg-gray-50 hover:text-gray-900"
                                                          : "text-slate-700 hover:bg-gray-50 hover:text-gray-900"
                                                          }`}
                                                      >
                                                        {label}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              ))
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            className="w-full border-t border-gray-200 px-4 py-2 text-left text-[#156372] text-[13px] font-medium flex items-center gap-2 hover:bg-gray-50"
                                            onClick={() => {
                                              setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                              setNewTaxTargetItemId(item.id);
                                              setIsNewTaxQuickModalOpen(true);
                                            }}
                                          >
                                            <PlusCircle size={14} />
                                            New Tax
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right align-top">
                              <span className="text-sm font-medium text-gray-900 block py-1.5">
                                {item.amount.toFixed(2)}
                              </span>
                            </td>
                          </>
                        )}
                        {item.itemType !== "header" && (
                          <td className="py-2 px-3 text-center align-middle">
                          <div
                            className="relative inline-flex h-8 items-center gap-2"
                            ref={(el) => {
                              itemMenuRefs.current[String(item.id)] = el;
                            }}
                          >
                            {item.itemType !== "header" && (
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemMenuId(openItemMenuId === item.id ? null : item.id);
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center text-red-500 hover:text-red-600 transition-colors"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X size={16} />
                            </button>

                            {item.itemType !== "header" && openItemMenuId === item.id && (
                              <div className="absolute top-full right-0 mt-1.5 w-[176px] bg-white border border-gray-200 rounded-lg shadow-[0_16px_32px_rgba(15,23,42,0.12)] z-[80] p-1">
                                <button
                                  type="button"
                                  className="w-full mt-1 px-3 py-2 text-left text-[13px] font-semibold text-gray-800 rounded-md hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    handleDuplicateItem(item.id);
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  Clone
                                </button>
                                <div className="my-1.5 h-px bg-gray-100" />
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-[13px] text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    const index = formData.items.findIndex((i: any) => i.id === item.id);
                                    if (index >= 0) {
                                      handleAddItem(index + 1);
                                    }
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  Insert New Row
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-[13px] text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    const index = formData.items.findIndex((i: any) => i.id === item.id);
                                    if (index >= 0) {
                                      setBulkAddInsertIndex(index);
                                      setIsBulkAddModalOpen(true);
                                    }
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  Insert Items in Bulk
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-[13px] text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    const index = formData.items.findIndex((i: any) => i.id === item.id);
                                    if (index >= 0) {
                                      handleInsertHeader(index);
                                    }
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  Insert New Header
                                </button>
                              </div>
                            )}
                          </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Row Buttons */}
              <div className="mt-4 flex items-center gap-3 w-full justify-start self-start">
                <div className="relative inline-flex items-center overflow-visible rounded-md border border-[#d7deef] bg-[#eef3ff]">
                  <button
                    type="button"
                    className="flex h-10 items-center gap-2 px-4 text-[#1f3f79] text-sm font-medium hover:bg-[#e7eefb] transition-colors"
                    onClick={() => {
                      handleAddItem();
                      setIsAddNewRowDropdownOpen(false);
                    }}
                  >
                    <Plus size={16} />
                    Add New Row
                  </button>
                  <div className="h-5 w-px bg-[#d7deef]" />
                  <button
                    type="button"
                    className="flex h-10 items-center justify-center px-3 text-[#1f3f79] hover:bg-[#e7eefb] transition-colors"
                    onClick={() => openExclusiveDropdown(isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen)}
                    aria-label="Add row options"
                    aria-expanded={isAddNewRowDropdownOpen}
                  >
                    <ChevronDown size={14} />
                  </button>
                  {isAddNewRowDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[140px] p-1">
                      <button
                        type="button"
                        className="w-full inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          handleInsertHeader(Math.max(formData.items.length - 1, 0));
                          setIsAddNewRowDropdownOpen(false);
                        }}
                      >
                        <Plus size={12} />
                        <span>Add New Header</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-[#eef3ff] border border-[#d7deef] text-[#1f3f79] rounded-md text-sm font-medium hover:bg-[#e7eefb] transition-colors"
                  onClick={() => setIsBulkAddModalOpen(true)}
                >
                  <Plus size={16} />
                  Add Items in Bulk
                </button>
              </div>



              {/* Summary and Notes Section */}
              <div className={`${useSimplifiedView ? "mt-5" : "mt-5"} pb-16 space-y-6`}>
                <div className={`grid grid-cols-1 ${useSimplifiedView ? "xl:grid-cols-[1fr_360px]" : "xl:grid-cols-[1fr_500px]"} gap-8 items-start`}>
                  <div className="flex-1 w-full max-w-[520px]">
                    <label className="block text-sm text-gray-700 mb-2 font-medium">Customer Notes</label>
                    <textarea
                      name="customerNotes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-y h-24 overflow-auto"
                      placeholder="Will be displayed on the quote"
                      value={formData.customerNotes}
                      onChange={handleChange}
                    />
                  </div>

                  {!useSimplifiedView ? (
                    <div className="w-full max-w-[520px] bg-[#f3f5f8] rounded-lg p-5 space-y-4 border border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">Sub Total</span>
                      <span className="text-gray-900 font-semibold">{formData.subTotal.toFixed(2)}</span>
                    </div>

                    {showTransactionDiscount && (
                      <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                        <span className="text-gray-700">Discount</span>
                        <div className="h-8 flex items-center border border-gray-300 rounded bg-white overflow-hidden">
                          <input
                            type="number"
                            className="w-full h-full px-2 text-right text-xs outline-none bg-transparent"
                            value={formatDecimalPlaceholderValue(formData.discount)}
                            placeholder="0.00"
                            onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                          />
                          <select
                            className="h-full min-w-[46px] px-1 text-[11px] text-gray-500 bg-[#f8fafc] border-l border-gray-300 outline-none cursor-pointer"
                            value={formData.discountType}
                            onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                          >
                            <option value="percent">%</option>
                            <option value="amount">{formData.currency}</option>
                          </select>
                        </div>
                        <span className="text-gray-900 font-medium text-right">
                          {(formData.discountType === "percent" ? (formData.subTotal * formData.discount / 100) : formData.discount).toFixed(2)}
                        </span>
                      </div>
                    )}



                    {showShippingCharges && (
                      <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-700">Shipping Charges</span>
                          <HelpCircle size={14} className="text-gray-400" />
                        </div>
                        <input
                          type="number"
                          className="w-full h-8 px-2 text-right border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white"
                          value={formatDecimalPlaceholderValue(formData.shippingCharges)}
                          placeholder="0.00"
                          onChange={(e) => setFormData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-gray-900 font-medium text-right">{(parseFloat(String(formData.shippingCharges)) || 0).toFixed(2)}</span>
                      </div>
                    )}

                    {showShippingCharges && (parseFloat(String(formData.shippingCharges)) || 0) > 0 && (
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                        <span className="text-gray-700">Shipping Charge Tax</span>
                        <select
                          value={String(formData.shippingChargeTax || "")}
                          onChange={(e) => setFormData(prev => ({ ...prev, shippingChargeTax: e.target.value }))}
                          className="w-56 h-8 px-2 border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white text-gray-700"
                        >
                          <option value="">Select a Tax</option>
                          {taxes.map((tax: any) => {
                            const taxId = String(tax.id || tax._id || "");
                            const taxName = tax.name || tax.taxName || "Tax";
                            const rate = Number(tax.rate || 0);
                            return (
                              <option key={taxId} value={taxId}>
                                {taxName} [{rate}%]
                              </option>
                            );
                          })}
                        </select>
                        <span></span>
                      </div>
                    )}

                    <div className="border-t border-gray-200 my-2"></div>

                    {taxBreakdown.map((tx) => (
                      <div key={tx.label} className="grid grid-cols-[1fr_auto] items-center text-sm">
                        <span className="text-gray-700">{tx.label}</span>
                        <span className="text-gray-900 font-medium">{tx.amount.toFixed(2)}</span>
                      </div>
                    ))}

                    {showAdjustment && (
                      <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-700">Adjustment</span>
                          <HelpCircle size={14} className="text-gray-400" />
                        </div>
                        <input
                          type="number"
                          className="w-full h-8 px-2 text-right border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white"
                          value={formatDecimalPlaceholderValue(formData.adjustment)}
                          placeholder="0.00"
                          onChange={(e) => setFormData(prev => ({ ...prev, adjustment: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-gray-900 font-medium text-right">{(parseFloat(String(formData.adjustment)) || 0).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[30px] leading-none font-semibold text-gray-900">Total ({formData.currency})</span>
                        <span className="text-[30px] leading-none font-bold text-gray-900">{formData.total.toFixed(2)}</span>
                      </div>
                    </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-[520px] self-start pt-2">
                      <div className="flex items-end justify-between gap-4 border-t border-gray-200 pt-4">
                        <div>
                          <div className="text-[18px] font-semibold text-gray-900 leading-none">
                            Total ({formData.currency})
                          </div>
                        </div>
                        <div className="text-[18px] font-bold text-gray-900 leading-none">
                          {formData.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm text-[#156372] hover:text-[#0D4A52]"
                          onClick={() => setIsTotalSummaryOpen((prev) => !prev)}
                        >
                          <span>{isTotalSummaryOpen ? "Hide Total Summary" : "Show Total Summary"}</span>
                          <ChevronDown size={14} className={`transition-transform ${isTotalSummaryOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                      {isTotalSummaryOpen && (
                        <div className="mt-4 bg-[#f3f5f8] rounded-lg p-5 space-y-4 border border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700 font-medium">Sub Total</span>
                            <span className="text-gray-900 font-semibold">{formData.subTotal.toFixed(2)}</span>
                          </div>
                          {showTransactionDiscount && (
                            <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                              <span className="text-gray-700">Discount</span>
                              <div className="h-8 flex items-center border border-gray-300 rounded bg-white overflow-hidden">
                                <input
                                  type="number"
                                  className="w-full h-full px-2 text-right text-xs outline-none bg-transparent"
                                  value={formatDecimalPlaceholderValue(formData.discount)}
                                  placeholder="0.00"
                                  onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                                />
                                <select
                                  className="h-full min-w-[46px] px-1 text-[11px] text-gray-500 bg-[#f8fafc] border-l border-gray-300 outline-none cursor-pointer"
                                  value={formData.discountType}
                                  onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                                >
                                  <option value="percent">%</option>
                                  <option value="amount">{formData.currency}</option>
                                </select>
                              </div>
                              <span className="text-gray-900 font-medium text-right">
                                {(formData.discountType === "percent" ? (formData.subTotal * formData.discount / 100) : formData.discount).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {showShippingCharges && (
                            <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-700">Shipping Charges</span>
                                <HelpCircle size={14} className="text-gray-400" />
                              </div>
                              <input
                                type="number"
                                className="w-full h-8 px-2 text-right border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white"
                                value={formatDecimalPlaceholderValue(formData.shippingCharges)}
                                placeholder="0.00"
                                onChange={(e) => setFormData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }))}
                              />
                              <span className="text-gray-900 font-medium text-right">{(parseFloat(String(formData.shippingCharges)) || 0).toFixed(2)}</span>
                            </div>
                          )}
                          {showShippingCharges && (parseFloat(String(formData.shippingCharges)) || 0) > 0 && (
                            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                              <span className="text-gray-700">Shipping Charge Tax</span>
                              <select
                                value={String(formData.shippingChargeTax || "")}
                                onChange={(e) => setFormData(prev => ({ ...prev, shippingChargeTax: e.target.value }))}
                                className="w-56 h-8 px-2 border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white text-gray-700"
                              >
                                <option value="">Select a Tax</option>
                                {taxes.map((tax: any) => {
                                  const taxId = String(tax.id || tax._id || "");
                                  const taxName = tax.name || tax.taxName || "Tax";
                                  const rate = Number(tax.rate || 0);
                                  return (
                                    <option key={taxId} value={taxId}>
                                      {taxName} [{rate}%]
                                    </option>
                                  );
                                })}
                              </select>
                              <span></span>
                            </div>
                          )}
                          <div className="border-t border-gray-200 my-2"></div>
                          {taxBreakdown.map((tx) => (
                            <div key={tx.label} className="grid grid-cols-[1fr_auto] items-center text-sm">
                              <span className="text-gray-700">{tx.label}</span>
                              <span className="text-gray-900 font-medium">{tx.amount.toFixed(2)}</span>
                            </div>
                          ))}
                          {showAdjustment && (
                            <div className="grid grid-cols-[1fr_140px_72px] items-center gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-700">Adjustment</span>
                                <HelpCircle size={14} className="text-gray-400" />
                              </div>
                              <input
                                type="number"
                                className="w-full h-8 px-2 text-right border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white"
                                value={formatDecimalPlaceholderValue(formData.adjustment)}
                                placeholder="0.00"
                                onChange={(e) => setFormData(prev => ({ ...prev, adjustment: parseFloat(e.target.value) || 0 }))}
                              />
                              <span className="text-gray-900 font-medium text-right">{(parseFloat(String(formData.adjustment)) || 0).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!useSimplifiedView && (
                  <div className="border border-gray-200 rounded-md bg-gray-50 p-4 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-12 items-start">
                    <div className="min-w-0">
                      <label className="block text-sm text-gray-700 mb-2 font-medium">Terms & Conditions</label>
                      <textarea
                        name="termsAndConditions"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-y h-24 overflow-auto"
                        placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                        value={formData.termsAndConditions}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="xl:justify-self-center xl:w-full xl:max-w-[360px]">
                      <label className="block text-sm text-gray-700 mb-2 font-medium">Attach File(s) to Quote</label>
                      <div className="relative flex items-center gap-2" ref={uploadDropdownRef}>
                        <button
                          type="button"
                          className="h-10 px-4 border border-dashed border-gray-300 rounded-md bg-white text-sm text-[#156372] hover:bg-[#f4f8f7] transition-colors inline-flex items-center gap-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload size={15} />
                          Upload File
                        </button>
                        {formData.attachedFiles.length > 0 && (
                          <button
                            type="button"
                            className="h-10 min-w-[40px] px-3 rounded-md bg-[#156372] text-white text-sm font-semibold hover:bg-[#0f5661] transition-colors inline-flex items-center justify-center"
                            onClick={() => openExclusiveDropdown(isUploadDropdownOpen, setIsUploadDropdownOpen)}
                          >
                            <Paperclip size={14} className="mr-1" />
                            {formData.attachedFiles.length}
                          </button>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          multiple
                          className="hidden"
                          accept="*/*"
                        />
                        {isUploadDropdownOpen && (
                          <div className="absolute left-0 mt-2 translate-y-[44px] w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <div className="p-2 space-y-2">
                              {formData.attachedFiles.length > 0 ? (
                                formData.attachedFiles.map((file: any) => (
                                  <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
                                      <p className="text-xs text-gray-500">File Size: {(Number(file.size || 0) / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                      type="button"
                                      className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                      onClick={() => handleRemoveFile(file.id)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">No files uploaded</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">You can upload a maximum of 5 files, 10MB each</p>
                    </div>
                  </div>
                )}

              </div>
            </div>
    </>
  );
}
