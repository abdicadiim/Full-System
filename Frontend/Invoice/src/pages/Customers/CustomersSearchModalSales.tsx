import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCustomViews, getCustomersPaginated, getCustomers } from "../customersDbModel";
import { customersAPI, taxesAPI, reportingTagsAPI, currenciesAPI } from "../../services/api";
import FieldCustomization from "../shared/FieldCustomization";
import { usePaymentTermsDropdown } from "../../../hooks/usePaymentTermsDropdown";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ChevronDown, ChevronUp, Plus, MoreVertical, Search, ArrowUpDown, Filter, Star, X, Trash2, Download, Upload, Settings, RefreshCw, ChevronRight, ChevronLeft, GripVertical, Lock, Users, FileText, Check, Eye, EyeOff, Info, Layers, Edit, ClipboardList, SlidersHorizontal, Layout, AlignLeft, RotateCcw, Pin, PinOff, Loader2, AlertTriangle } from "lucide-react";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import { useSettings } from "../../lib/settings/SettingsContext";


export default function CustomersSearchModalSales({ controller }: { controller: any }) {
  const {
    AUTH_URL, DEFAULT_COLUMNS, LOCAL_COLUMNS_LAYOUT_KEY, accountDropdownRef, accountsReceivableDropdownRef, accountsReceivableOptions,
    accountsReceivableSearch, activePreferencesTab, adjustmentTypeDropdownRef, allViews, availableReportingTags, bulkConsolidatedAction,
    bulkMoreMenuRef, bulkUpdateData, closeBulkUpdateDropdowns, columnSearch, columns, comparatorSearch,
    comparators, confirmBulkConsolidatedBilling, confirmBulkDelete, confirmDeleteCustomer, criteria, currencyDropdownRef,
    currencyOptions, currencySearch, currentPage, customFields, customViews, customerFields,
    customerLanguageDropdownRef, customerLanguageSearch, customerNameDropdownRef, customerTypeDropdownRef, customers, decimalFormatDropdownRef,
    decimalFormatOptions, defaultCustomerViews, deleteCustomerId, deleteCustomerIds, displayedCustomers, downloadExportFile,
    dropdownMergeTargets, dropdownRef, evaluateCriterion, evaluateCustomViewCriteria, exportData, favoriteViews,
    fieldSearch, filterCustomersByView, filterDropdownRef, filteredCurrencies, filteredCustomerLanguages, formatCurrency,
    formatNumberForExport, getCustomerFieldValue, getCustomerIdForNavigation, getFilteredAndSortedCustomers, getSearchFilterOptions, getSelectedCustomerDbIds,
    handleAddColumn, handleAddCriterion, handleBulkDelete, handleBulkDisableConsolidatedBilling, handleBulkEnableConsolidatedBilling, handleBulkMarkActive,
    handleBulkMarkInactive, handleBulkMerge, handleBulkUpdateSubmit, handleCancelLayout, handleClearSelection, handleCriterionChange,
    handleDeleteCustomView, handleDeleteCustomer, handleExportCurrentView, handleExportCustomers, handleExportSubmit, handleManageCustomFields,
    handleMergeContinue, handleOpenBulkUpdate, handlePrintStatements, handleRemoveColumn, handleRemoveCriterion, handleReorder,
    handleResetColumnWidths, handleSaveCustomView, handleSaveLayout, handleSelectAll, handleSelectCustomer, handleSort,
    handleToggleColumn, handleToggleFavorite, handleTogglePasswordVisibility, handleTogglePin, handleViewSelect, hasResized,
    hasValue, hoveredRowId, hoveredView, importType, isAccountDropdownOpen, isAccountsReceivableDropdownOpen,
    isAdjustmentTypeDropdownOpen, isBulkConsolidatedUpdating, isBulkDeleteModalOpen, isBulkDeletingCustomers, isBulkMoreMenuOpen, isBulkUpdateModalOpen,
    isComparatorDropdownOpen, isCurrencyDropdownOpen, isCustomerLanguageDropdownOpen, isCustomerNameDropdownOpen, isCustomerTypeDropdownOpen, isCustomizeModalOpen,
    isDecimalFormatDropdownOpen, isDeleteModalOpen, isDeletingCustomer, isDownloading, isDropdownOpen, isExportCurrentViewModalOpen,
    isExportCustomersModalOpen, isFavorite, isFieldCustomizationOpen, isFieldDropdownOpen, isFilterDropdownOpen, isImportContinueLoading,
    isImportModalOpen, isItemNameDropdownOpen, isLoading, isMergeCustomerDropdownOpen, isMergeModalOpen, isModalOpen,
    isModuleDropdownOpen, isMoreMenuOpen, isMoreOptionsDropdownOpen, isNewDropdownOpen, isPaymentMethodDropdownOpen, isPreferencesOpen,
    isPrintModalOpen, isPrintPreviewOpen, isProjectNameDropdownOpen, isPurchaseAccountDropdownOpen, isRefreshing, isSalesAccountDropdownOpen,
    isSalespersonDropdownOpen, isSearchHeaderDropdownOpen, isSearchModalOpen, isSearchTypeDropdownOpen, isSortBySubmenuOpen, isStatusDropdownOpen,
    isTaxExemptionsDropdownOpen, isTaxRateDropdownOpen, isTransactionTypeDropdownOpen, itemNameDropdownRef, itemsPerPage, loadCustomers,
    loadPriceLists, loadReportingTags, location, mapCustomerForList, mergeCustomerDropdownRef, mergeCustomerSearch,
    mergeTargetCustomer, modalRef, moduleDropdownRef, moduleOptions, moreMenuRef, moreOptionsDropdownRef,
    navigate, newDropdownRef, newViewName, normalizeReportingTagAppliesTo, normalizeReportingTagOptions, openReceivablesDropdownId,
    openSearchModalForCurrentContext, organizationName, organizationNameHtml, originalColumns, paymentMethodDropdownRef, paymentTermsHook,
    pickFirstValue, portalLanguageOptions, preferences, priceLists, printDateRange, printPreviewContent,
    projectNameDropdownRef, purchaseAccountDropdownRef, receivablesDropdownPosition, receivablesDropdownRef, receivablesDropdownRefs, resetSearchModalData,
    resizingRef, salesAccountDropdownRef, salespersonDropdownRef, searchHeaderDropdownRef, searchModalData, searchModalFilter,
    searchType, searchTypeDropdownRef, searchTypeOptions, selectedColumns, selectedCustomers, selectedView,
    setAccountsReceivableSearch, setActivePreferencesTab, setAvailableReportingTags, setBulkConsolidatedAction, setBulkUpdateData, setColumnSearch,
    setColumnWidth, setColumns, setComparatorSearch, setCriteria, setCurrencyOptions, setCurrencySearch,
    setCurrentPage, setCustomFields, setCustomViews, setCustomerLanguageSearch, setCustomers, setDeleteCustomerId,
    setDeleteCustomerIds, setExportData, setFavoriteViews, setFieldSearch, setHasResized, setHoveredRowId,
    setHoveredView, setImportType, setIsAccountDropdownOpen, setIsAccountsReceivableDropdownOpen, setIsAdjustmentTypeDropdownOpen, setIsBulkConsolidatedUpdating,
    setIsBulkDeleteModalOpen, setIsBulkDeletingCustomers, setIsBulkMoreMenuOpen, setIsBulkUpdateModalOpen, setIsComparatorDropdownOpen, setIsCurrencyDropdownOpen,
    setIsCustomerLanguageDropdownOpen, setIsCustomerNameDropdownOpen, setIsCustomerTypeDropdownOpen, setIsCustomizeModalOpen, setIsDecimalFormatDropdownOpen, setIsDeleteModalOpen,
    setIsDeletingCustomer, setIsDownloading, setIsDropdownOpen, setIsExportCurrentViewModalOpen, setIsExportCustomersModalOpen, setIsFavorite,
    setIsFieldCustomizationOpen, setIsFieldDropdownOpen, setIsFilterDropdownOpen, setIsImportContinueLoading, setIsImportModalOpen, setIsItemNameDropdownOpen,
    setIsLoading, setIsMergeCustomerDropdownOpen, setIsMergeModalOpen, setIsModalOpen, setIsModuleDropdownOpen, setIsMoreMenuOpen,
    setIsMoreOptionsDropdownOpen, setIsNewDropdownOpen, setIsPaymentMethodDropdownOpen, setIsPreferencesOpen, setIsPrintModalOpen, setIsPrintPreviewOpen,
    setIsProjectNameDropdownOpen, setIsPurchaseAccountDropdownOpen, setIsRefreshing, setIsSalesAccountDropdownOpen, setIsSalespersonDropdownOpen, setIsSearchHeaderDropdownOpen,
    setIsSearchModalOpen, setIsSearchTypeDropdownOpen, setIsSortBySubmenuOpen, setIsStatusDropdownOpen, setIsTaxExemptionsDropdownOpen, setIsTaxRateDropdownOpen,
    setIsTransactionTypeDropdownOpen, setItemsPerPage, setMergeCustomerSearch, setMergeTargetCustomer, setNewViewName, setOpenReceivablesDropdownId,
    setOriginalColumns, setPreferences, setPriceLists, setPrintDateRange, setPrintPreviewContent, setReceivablesDropdownPosition,
    setSearchModalData, setSearchModalFilter, setSearchType, setSelectedColumns, setSelectedCustomers, setSelectedView,
    setSortConfig, setTaxRateOptions, setTaxRateSearch, setTotalItems, setTotalPages, setViewSearchQuery,
    setVisibilityPreference, settings, singleSelectionMergeTargets, sortConfig, startResizing, statusDropdownRef,
    tableMinWidth, taxExemptionsDropdownRef, taxRateDropdownRef, taxRateOptions, taxRateSearch, totalItems,
    totalPages, transactionTypeDropdownRef, viewSearchQuery, visibilityPreference, visibleColumns
  } = controller as any;
  return (
    <>
                {searchType === "Quotes" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Quote# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Quote#</label>
                        <input
                          type="text"
                          value={searchModalData.quoteNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescriptionQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerName || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                        <div className="relative" ref={salespersonDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalespersonDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                          >
                            <span className={searchModalData.salesperson ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salesperson || "Select a salesperson"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalespersonDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalespersonDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Billing and Shipping"
                              checked={searchModalData.addressType === "Billing and Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Billing"
                              checked={searchModalData.addressType === "Billing"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Shipping"
                              checked={searchModalData.addressType === "Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-blue-600 text-sm hover:underline">+ Address Line</button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumberQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumberQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameDropdownOpen(!isItemNameDropdownOpen)}
                          >
                            <span className={searchModalData.itemNameQuote ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.itemNameQuote || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromQuote}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToQuote}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                        <div className="relative" ref={projectNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsProjectNameDropdownOpen(!isProjectNameDropdownOpen)}
                          >
                            <span className={searchModalData.projectName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.projectName || "Select a project"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isProjectNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsDropdownOpen(!isTaxExemptionsDropdownOpen)}
                          >
                            <span className={searchModalData.taxExemptions ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.taxExemptions || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Invoices" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Invoice# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice#</label>
                        <input
                          type="text"
                          value={searchModalData.invoiceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span className={searchModalData.status ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.status || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescriptionInvoice}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionInvoice: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromInvoice}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToInvoice}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                        <div className="relative" ref={projectNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsProjectNameDropdownOpen(!isProjectNameDropdownOpen)}
                          >
                            <span className={searchModalData.projectNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.projectNameInvoice || "Select a project"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isProjectNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsDropdownOpen(!isTaxExemptionsDropdownOpen)}
                          >
                            <span className={searchModalData.taxExemptionsInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.taxExemptionsInvoice || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Order Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Number</label>
                        <input
                          type="text"
                          value={searchModalData.orderNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, orderNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Created Between */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Created Between</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.createdBetweenFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.createdBetweenTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameDropdownOpen(!isItemNameDropdownOpen)}
                          >
                            <span className={searchModalData.itemNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.itemNameInvoice || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                        <div className="relative" ref={accountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                          >
                            <span className={searchModalData.account ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.account || "Select an account"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerNameInvoice || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                        <div className="relative" ref={salespersonDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalespersonDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                          >
                            <span className={searchModalData.salespersonInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salespersonInvoice || "Select a salesperson"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalespersonDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalespersonDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Billing and Shipping"
                              checked={searchModalData.addressTypeInvoice === "Billing and Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Billing"
                              checked={searchModalData.addressTypeInvoice === "Billing"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Shipping"
                              checked={searchModalData.addressTypeInvoice === "Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-blue-600 text-sm hover:underline">+ Address Line</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Payments Received" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerName || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumberPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumberPayment: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                        <div className="relative" ref={paymentMethodDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isPaymentMethodDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsPaymentMethodDropdownOpen(!isPaymentMethodDropdownOpen)}
                          >
                            <span className={searchModalData.paymentMethod ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.paymentMethod || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPaymentMethodDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isPaymentMethodDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Payment # */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment #</label>
                        <input
                          type="text"
                          value={searchModalData.paymentNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, paymentNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFromPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFromPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeToPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeToPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span className={searchModalData.statusPayment ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.statusPayment || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, statusPayment: status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notesPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notesPayment: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Expenses Form */}
                {searchType === "Expenses" && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Expense#</label>
                        <input
                          type="text"
                          value={searchModalData.expenseNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, expenseNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.vendorName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.vendorName || "Select vendor"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                        <div className="relative" ref={accountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                          >
                            <span className={searchModalData.account ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.account || "Select an account"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

    </>
  );
}
