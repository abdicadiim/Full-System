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


export default function ImportCustomersModal({ controller }: { controller: any }) {
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
      {/* Import Customers Modal */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={() => {
            setIsImportContinueLoading(false);
            setIsImportModalOpen(false);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Import Customers</h2>
              <button
                onClick={() => {
                  setIsImportContinueLoading(false);
                  setIsImportModalOpen(false);
                }}
                disabled={isImportContinueLoading}
                className={`text-red-500 hover:text-red-600 transition-colors ${isImportContinueLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-6">
                You can import contacts into Zoho Books from a .CSV or .TSV or .XLS file.
              </p>

              {/* Radio Buttons */}
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    value="customers"
                    checked={importType === "customers"}
                    onChange={(e) => setImportType(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">Customers</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    value="contactPersons"
                    checked={importType === "contactPersons"}
                    onChange={(e) => setImportType(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">Customer's Contact Persons</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsImportContinueLoading(false);
                  setIsImportModalOpen(false);
                }}
                disabled={isImportContinueLoading}
                className={`px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors ${isImportContinueLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsImportContinueLoading(true);
                  setIsImportModalOpen(false);
                  navigate("/sales/customers/import");
                }}
                disabled={isImportContinueLoading}
                className={`px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0f4f5a] transition-colors flex items-center gap-2 ${isImportContinueLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isImportContinueLoading && <Loader2 size={14} className="animate-spin" />}
                {isImportContinueLoading ? "Loading..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
