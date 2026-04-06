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


export default function ExportCustomersModal({ controller }: { controller: any }) {
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
      {/* Export Customers Modal */}
      {isExportCustomersModalOpen && (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsExportCustomersModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg w-[90%] max-w-[600px] max-h-[90vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between py-5 px-6 border-b border-gray-200">
                <h2 className="m-0 text-xl font-semibold text-gray-900">Export Customers</h2>
                <button
                  className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-blue-600 transition-colors hover:text-red-500"
                  onClick={() => setIsExportCustomersModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* Info Box */}
                <div className="flex items-start gap-3 py-3 px-4 bg-blue-50 rounded-md mb-6 text-sm text-blue-900">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <span>You can export your data from Zoho Books in CSV, XLS or XLSX format.</span>
                </div>

                {/* Module */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative mb-3" ref={moduleDropdownRef}>
                    <div
                      className="flex items-center justify-between py-2.5 px-3 border border-gray-300 rounded-md bg-white cursor-pointer text-sm text-gray-700 transition-colors hover:border-gray-400"
                      onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                    >
                      <span>{exportData.module}</span>
                      <ChevronDown size={16} />
                    </div>
                    {isModuleDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1000] max-h-[300px] overflow-y-auto">
                        {moduleOptions.map((option) => (
                          <div
                            key={option}
                            className="py-2.5 px-3 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setExportData(prev => ({
                                ...prev,
                                module: option,
                                dataScope: `All ${option}`, // Update data scope when module changes
                                moduleType: option === "Customers" ? "Customers" : prev.moduleType // Reset module type if not Customers
                              }));
                              setIsModuleDropdownOpen(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Module Type Radio Buttons - Only show for Customers module */}
                  {exportData.module === "Customers" && (
                    <div className="flex flex-col gap-2 mt-2">
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customers"
                          checked={exportData.moduleType === "Customers"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customers</span>
                      </label>
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customer's Contact Persons"
                          checked={exportData.moduleType === "Customer's Contact Persons"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customer's Contact Persons</span>
                      </label>
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customer's Addresses"
                          checked={exportData.moduleType === "Customer's Addresses"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customer's Addresses</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Data Scope */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Scope
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="dataScope"
                        value={`All ${exportData.module}`}
                        checked={exportData.dataScope === `All ${exportData.module}`}
                        onChange={(e) => setExportData(prev => ({ ...prev, dataScope: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>All {exportData.module}</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="dataScope"
                        value="Specific Period"
                        checked={exportData.dataScope === "Specific Period"}
                        onChange={(e) => setExportData(prev => ({ ...prev, dataScope: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>Specific Period</span>
                    </label>
                  </div>
                </div>

                {/* Decimal Format */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decimal Format<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative" ref={decimalFormatDropdownRef}>
                    <div
                      className="flex items-center justify-between py-2.5 px-3 border border-gray-300 rounded-md bg-white cursor-pointer text-sm text-gray-700 transition-colors hover:border-gray-400"
                      onClick={() => setIsDecimalFormatDropdownOpen(!isDecimalFormatDropdownOpen)}
                    >
                      <span>{exportData.decimalFormat}</span>
                      <ChevronDown size={16} />
                    </div>
                    {isDecimalFormatDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1000] max-h-[200px] overflow-y-auto">
                        {decimalFormatOptions.map((format) => (
                          <div
                            key={format}
                            className="py-2.5 px-3 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setExportData(prev => ({ ...prev, decimalFormat: format }));
                              setIsDecimalFormatDropdownOpen(false);
                            }}
                          >
                            {format}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Export File Format */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export File Format<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="csv"
                        checked={exportData.fileFormat === "csv"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>CSV (Comma Separated Value)</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="xls"
                        checked={exportData.fileFormat === "xls"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="xlsx"
                        checked={exportData.fileFormat === "xlsx"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>XLSX (Microsoft Excel)</span>
                    </label>
                  </div>
                  {/* Include PII Checkbox */}
                  <div className="mt-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportData.includePII}
                        onChange={(e) => setExportData(prev => ({ ...prev, includePII: e.target.checked }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">Include Sensitive Personally Identifiable Information (PII) while exporting.</span>
                    </label>
                  </div>
                </div>

                {/* File Protection Password */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Protection Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={exportData.showPassword ? "text" : "password"}
                      className="w-full py-2.5 px-3 pr-10 border border-gray-300 rounded-md text-sm text-gray-700 transition-colors focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      value={exportData.password}
                      onChange={(e) => setExportData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-500 transition-colors hover:text-gray-700"
                      onClick={handleTogglePasswordVisibility}
                    >
                      {exportData.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                    Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                  </p>
                </div>

                {/* Note */}
                <div className="mt-6 p-4 bg-gray-50 rounded-md text-sm text-gray-700 leading-relaxed">
                  <strong>Note:</strong> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{" "}
                  <a href="#" className="text-blue-600 no-underline font-medium hover:underline">Backup Your Data</a>
                </div>
              </div>
              <div className="flex items-center justify-start gap-3 py-5 px-6 border-t border-gray-200">
                <button
                  className="py-2.5 px-5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#0f4f5a]"
                  onClick={handleExportCustomers}
                >
                  Export
                </button>
                <button
                  className="py-2.5 px-5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsExportCustomersModalOpen(false)}
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
