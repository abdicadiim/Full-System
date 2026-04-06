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


export default function CustomersSearchModalCore({ controller }: { controller: any }) {
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
                {searchType === "Customers" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                        <input
                          type="text"
                          value={searchModalData.displayName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, displayName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                        <input
                          type="text"
                          value={searchModalData.companyName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                        <input
                          type="text"
                          value={searchModalData.lastName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status}</span>
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

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <input
                          type="text"
                          value={searchModalData.address}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Customer Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Type</label>
                        <div className="relative" ref={customerTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerTypeDropdownOpen(!isCustomerTypeDropdownOpen)}
                          >
                            <span className={searchModalData.customerType ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerType || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["Business", "Individual"].map((type) => (
                                <div
                                  key={type}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, customerType: type }));
                                    setIsCustomerTypeDropdownOpen(false);
                                  }}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                        <input
                          type="text"
                          value={searchModalData.firstName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                          type="email"
                          value={searchModalData.email}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                        <input
                          type="tel"
                          value={searchModalData.phone}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Items" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <input
                          type="text"
                          value={searchModalData.itemName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <input
                          type="text"
                          value={searchModalData.description}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Purchase Rate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Rate</label>
                        <input
                          type="text"
                          value={searchModalData.purchaseRate}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, purchaseRate: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Sales Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sales Account</label>
                        <div className="relative" ref={salesAccountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalesAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalesAccountDropdownOpen(!isSalesAccountDropdownOpen)}
                          >
                            <span className={searchModalData.salesAccount ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salesAccount || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalesAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalesAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* SKU */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                        <input
                          type="text"
                          value={searchModalData.sku}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, sku: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Rate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate</label>
                        <input
                          type="text"
                          value={searchModalData.rate}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, rate: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
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

                      {/* Purchase Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Account</label>
                        <div className="relative" ref={purchaseAccountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isPurchaseAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsPurchaseAccountDropdownOpen(!isPurchaseAccountDropdownOpen)}
                          >
                            <span className={searchModalData.purchaseAccount ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.purchaseAccount || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPurchaseAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isPurchaseAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Inventory Adjustments" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <input
                          type="text"
                          value={searchModalData.itemName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Reason */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                        <input
                          type="text"
                          value={searchModalData.reason}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescription}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescription: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Adjustment Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Adjustment Type</label>
                        <div className="relative" ref={adjustmentTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAdjustmentTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAdjustmentTypeDropdownOpen(!isAdjustmentTypeDropdownOpen)}
                          >
                            <span>{searchModalData.adjustmentType || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAdjustmentTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAdjustmentTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Quantity", "Value"].map((type) => (
                                <div
                                  key={type}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, adjustmentType: type }));
                                    setIsAdjustmentTypeDropdownOpen(false);
                                  }}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Banking" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
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

                      {/* Transaction Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction Type</label>
                        <div className="relative" ref={transactionTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTransactionTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTransactionTypeDropdownOpen(!isTransactionTypeDropdownOpen)}
                          >
                            <span className={searchModalData.transactionType ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.transactionType || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTransactionTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTransactionTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
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

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
    </>
  );
}
