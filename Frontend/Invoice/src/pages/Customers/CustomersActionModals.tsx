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


export default function CustomersActionModals({ controller }: { controller: any }) {
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
      {/* Bulk Update Modal */}
      {isBulkUpdateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[1000] overflow-y-auto pt-10 pb-10">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-[560px] mt-2 mb-2 flex flex-col overflow-visible">
              <div className="flex items-center justify-between py-4 px-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 m-0">Bulk Update - Customers</h2>
                <button
                  className="flex items-center justify-center w-7 h-7 bg-[#156372] border-2 border-white rounded text-white cursor-pointer hover:bg-[#0f4f5a] transition-colors"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-visible">
                {/* Customer Type */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Customer Type</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="business"
                        checked={bulkUpdateData.customerType === "business"}
                        onChange={(e) => setBulkUpdateData(prev => ({ ...prev, customerType: e.target.value }))}
                        className="hidden"
                      />
                      <span className={`w-[18px] h-[18px] border-2 rounded-full flex items-center justify-center transition-all ${bulkUpdateData.customerType === "business" ? "border-[#156372]" : "border-gray-300"}`}>
                        {bulkUpdateData.customerType === "business" && <span className="w-2.5 h-2.5 bg-[#156372] rounded-full"></span>}
                      </span>
                      Business
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="individual"
                        checked={bulkUpdateData.customerType === "individual"}
                        onChange={(e) => setBulkUpdateData(prev => ({ ...prev, customerType: e.target.value }))}
                        className="hidden"
                      />
                      <span className={`w-[18px] h-[18px] border-2 rounded-full flex items-center justify-center transition-all ${bulkUpdateData.customerType === "individual" ? "border-[#156372]" : "border-gray-300"}`}>
                        {bulkUpdateData.customerType === "individual" && <span className="w-2.5 h-2.5 bg-[#156372] rounded-full"></span>}
                      </span>
                      Individual
                    </label>
                  </div>
                </div>

                {/* Credit Limit */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Credit Limit</label>
                  <div className="flex-1 flex items-center">
                    <div className="h-[38px] min-w-[52px] px-3 flex items-center justify-center rounded-l-md border border-gray-300 bg-gray-50 text-sm text-gray-700">
                      {bulkUpdateData.currency || "USD"}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkUpdateData.creditLimit}
                      onChange={(e) => setBulkUpdateData(prev => ({ ...prev, creditLimit: e.target.value }))}
                      onFocus={closeBulkUpdateDropdowns}
                      placeholder="0.00"
                      className="h-[38px] w-full rounded-r-md border border-l-0 border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    />
                  </div>
                </div>

                {/* Currency */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Currency</label>
                  <div className="flex-1 relative" ref={currencyDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCurrencyDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isCurrencyDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsCurrencyDropdownOpen(nextOpen);
                        setCurrencySearch("");
                      }}
                    >
                      <span className={bulkUpdateData.currency ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.currency
                          ? (currencyOptions.find(c => c.code === bulkUpdateData.currency)?.name || bulkUpdateData.currency)
                          : "Select"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isCurrencyDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={currencySearch}
                            onChange={(e) => setCurrencySearch(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredCurrencies.map(currency => (
                            <div
                              key={currency.code}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.currency === currency.code ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, currency: currency.code }));
                                setIsCurrencyDropdownOpen(false);
                                setCurrencySearch("");
                              }}
                            >
                              {currency.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax Rate */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Tax Rate</label>
                  <div className="flex-1 relative" ref={taxRateDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxRateDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isTaxRateDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsTaxRateDropdownOpen(nextOpen);
                      }}
                    >
                      <span className={bulkUpdateData.taxRate ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.taxRate || "Select a Tax"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxRateDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isTaxRateDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="max-h-[200px] overflow-y-auto">
                          {taxRateOptions.map((option, index) => (
                            option.isHeader ? (
                              <div key={`header-${index}`} className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider sticky top-0 border-y border-gray-100 first:border-t-0">
                                {option.label}
                              </div>
                            ) : (
                              <div
                                key={option.value}
                                className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.taxRate === option.value ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                                onClick={() => {
                                  setBulkUpdateData(prev => ({ ...prev, taxRate: option.value }));
                                  setIsTaxRateDropdownOpen(false);
                                }}
                              >
                                {option.label}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Payment Terms</label>
                  <div className="flex-1 relative" ref={paymentTermsHook.dropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${paymentTermsHook.isOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        if (paymentTermsHook.isOpen) {
                          paymentTermsHook.close();
                          return;
                        }
                        closeBulkUpdateDropdowns();
                        paymentTermsHook.open();
                      }}
                    >
                      <span className={paymentTermsHook.selectedTerm ? "text-gray-700" : "text-gray-400"}>
                        {paymentTermsHook.selectedTerm || ""}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${paymentTermsHook.isOpen ? "rotate-180" : ""}`} />
                    </div>
                    {paymentTermsHook.isOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={paymentTermsHook.searchQuery}
                            onChange={(e) => paymentTermsHook.setSearchQuery(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {paymentTermsHook.filteredTerms.map(term => (
                            <div
                              key={term.value}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${paymentTermsHook.selectedTerm === term.value ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => paymentTermsHook.handleSelect(term)}
                            >
                              {term.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Language */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700 flex items-center gap-1.5">
                    Customer Language
                    <Info size={14} className="text-gray-400" />
                  </label>
                  <div className="flex-1 relative" ref={customerLanguageDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerLanguageDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isCustomerLanguageDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsCustomerLanguageDropdownOpen(nextOpen);
                        setCustomerLanguageSearch("");
                      }}
                    >
                      <span className={bulkUpdateData.customerLanguage ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.customerLanguage || ""}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerLanguageDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isCustomerLanguageDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={customerLanguageSearch}
                            onChange={(e) => setCustomerLanguageSearch(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredCustomerLanguages.map(lang => (
                            <div
                              key={lang}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.customerLanguage === lang ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, customerLanguage: lang }));
                                setIsCustomerLanguageDropdownOpen(false);
                                setCustomerLanguageSearch("");
                              }}
                            >
                              {lang}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price List */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Price List</label>
                  <div className="flex-1 max-w-md">
                    <SearchableDropdown
                      value={bulkUpdateData.priceListId}
                      options={[
                        { value: "", label: "None" },
                        ...priceLists.map((p) => ({ value: p.id, label: p.name || p.id })),
                      ]}
                      placeholder="None"
                      accentColor="#156372"
                      onOpenChange={(open) => {
                        if (open) closeBulkUpdateDropdowns();
                      }}
                      onChange={(value) => setBulkUpdateData(prev => ({ ...prev, priceListId: value }))}
                    />
                  </div>
                </div>

                {/* Accounts Receivable */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Accounts Receivable</label>
                  <div className="flex-1 relative" ref={accountsReceivableDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountsReceivableDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isAccountsReceivableDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsAccountsReceivableDropdownOpen(nextOpen);
                      }}
                    >
                      <span className={bulkUpdateData.accountsReceivable ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.accountsReceivable || "Select an account"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountsReceivableDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isAccountsReceivableDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="max-h-[200px] overflow-y-auto">
                          {accountsReceivableOptions.map(account => (
                            <div
                              key={account}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.accountsReceivable === account ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, accountsReceivable: account }));
                                setIsAccountsReceivableDropdownOpen(false);
                              }}
                            >
                              {account}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reporting Tags */}
                {availableReportingTags.map((tag: any) => {
                  const tagId = String(tag?._id || tag?.id || "");
                  if (!tagId) return null;
                  const selectedVal = bulkUpdateData.reportingTags?.[tagId] ?? "";
                  const normalizedOptions = Array.isArray(tag?.options) ? tag.options : [];
                  const options = [
                    { value: "", label: "None" },
                    ...normalizedOptions.map((opt: string) => ({ value: opt, label: opt })),
                  ];

                  return (
                    <div key={tagId} className="flex items-center mb-5 last:mb-0">
                      <label className="w-40 flex-shrink-0 text-sm text-gray-700">
                        {tag.name || "Reporting Tag"}
                      </label>
                      <div className="flex-1 max-w-md">
                        <SearchableDropdown
                          value={selectedVal}
                          options={options}
                          placeholder="None"
                          accentColor="#156372"
                          onOpenChange={(open) => {
                            if (open) closeBulkUpdateDropdowns();
                          }}
                          onChange={(value) => {
                            setBulkUpdateData((prev: any) => {
                              const existing = prev?.reportingTags || {};
                              const next = { ...existing };
                              if (!value) {
                                delete next[tagId];
                              } else {
                                next[tagId] = value;
                              }
                              return { ...prev, reportingTags: next };
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 py-4 px-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <button
                  className="py-2.5 px-5 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer transition-colors hover:bg-[#0f4f5a]"
                  onClick={handleBulkUpdateSubmit}
                >
                  Update Fields
                </button>
                <button
                  className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal containers removed as download is now automatic */}

      {/* Export Current View Modal */}
      {
        isExportCurrentViewModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsExportCurrentViewModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg w-[90%] max-w-[600px] max-h-[90vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between py-5 px-6 border-b border-gray-200">
                <h2 className="m-0 text-xl font-semibold text-gray-900">Export Current View</h2>
                <button
                  className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-500 transition-colors hover:text-red-500"
                  onClick={() => setIsExportCurrentViewModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* Info Box */}
                <div className="flex items-start gap-3 py-3 px-4 bg-[#15637210] rounded-md mb-6 text-sm text-blue-900">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Only the current view with its visible columns will be exported from Zoho Books in CSV or XLS format.</span>
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
                  <strong>Note:</strong> You can export only the first 10,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{" "}
                  <a href="#" className="text-[#156372] no-underline font-medium hover:underline">Backup Your Data</a>
                </div>
              </div>
              <div className="flex items-center justify-start gap-3 py-5 px-6 border-t border-gray-200">
                <button
                  className="py-2.5 px-5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700"
                  onClick={handleExportSubmit}
                >
                  Export
                </button>
                <button
                  className="py-2.5 px-5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsExportCurrentViewModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Merge Customers Modal */}
      {
        isMergeModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-16 pb-10 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsMergeModalOpen(false);
                setMergeTargetCustomer(null);
                setMergeCustomerSearch("");
                setIsMergeCustomerDropdownOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 m-0">Merge Customers</h2>
                <button
                  className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50"
                  onClick={() => {
                    setIsMergeModalOpen(false);
                    setMergeTargetCustomer(null);
                    setMergeCustomerSearch("");
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-700 mb-4">
                  {(() => {
                    const selectedArr = Array.from(selectedCustomers);
                    if (selectedArr.length === 1) {
                      const source = customers.find((c) => c.id === selectedArr[0]);
                      const sourceName = source?.name || "";
                      return (
                        <>
                          Select a customer profile with whom you'd like to merge <strong>{sourceName}</strong>. Once merged,
                          the transactions of <strong>{sourceName}</strong> will be transferred, and this customer record will be marked as inactive.
                        </>
                      );
                    }

                    return (
                      <>
                        Kindly select the master customer to whom the customer(s) should be merged. Once merged, all the transactions will be listed under the master customer and the other customers will be marked as inactive.
                      </>
                    );
                  })()}
                </p>

                {selectedCustomers.size >= 2 ? (
                  <div className="space-y-3 pt-1">
                    {Array.from(selectedCustomers).map((selectedId) => {
                      const row = customers.find((c) => c.id === selectedId);
                      if (!row) return null;
                      return (
                        <label
                          key={row.id}
                          className="flex items-center gap-3 text-sm text-gray-800 cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name="mergeTarget"
                            checked={mergeTargetCustomer?.id === row.id}
                            onChange={() => setMergeTargetCustomer(row)}
                            className="w-4 h-4"
                          />
                          <span>{row.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative" ref={mergeCustomerDropdownRef}>
                    <div
                      className="flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-colors hover:border-gray-400"
                      onClick={() => {
                        setIsMergeCustomerDropdownOpen(!isMergeCustomerDropdownOpen);
                        setMergeCustomerSearch("");
                      }}
                    >
                      <span className={mergeTargetCustomer ? "text-gray-700" : "text-gray-400"}>
                        {mergeTargetCustomer ? mergeTargetCustomer.name : "Select Customer"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isMergeCustomerDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isMergeCustomerDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={mergeCustomerSearch}
                            onChange={(e) => setMergeCustomerSearch(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {(() => {
                            const selectedArr = Array.from(selectedCustomers);
                            const sourceId = selectedArr.length === 1 ? selectedArr[0] : null;
                            const options = dropdownMergeTargets.filter((c: any) => (sourceId ? c.id !== sourceId : true));

                            if (options.length === 0) {
                              return (
                                <div className="py-2.5 px-3.5 text-sm text-gray-500">
                                  No customers found.
                                </div>
                              );
                            }

                            return options.map((customer, index) => (
                              <div
                                key={`${customer.id}-${index}`}
                                className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${mergeTargetCustomer?.id === customer.id ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-gray-100"}`}
                                onClick={() => {
                                  setMergeTargetCustomer(customer);
                                  setIsMergeCustomerDropdownOpen(false);
                                  setMergeCustomerSearch("");
                                }}
                              >
                                {customer.name} {customer.companyName && `(${customer.companyName})`}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-start gap-3 py-4 px-6 bg-white border-t border-gray-200 rounded-b-lg">
                <button
                  className={`py-2.5 px-5 text-sm font-medium text-white bg-blue-600 border-none rounded-md transition-colors hover:bg-blue-700 ${mergeTargetCustomer ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                  onClick={handleMergeContinue}
                  disabled={!mergeTargetCustomer}
                >
                  Continue
                </button>
                <button
                  className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => {
                    setIsMergeModalOpen(false);
                    setMergeTargetCustomer(null);
                    setMergeCustomerSearch("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Receivables Dropdown Overlay - Rendered outside table to avoid clipping */}
      {
        openReceivablesDropdownId && displayedCustomers.find(c => c.id === openReceivablesDropdownId) && (
          <div
            ref={receivablesDropdownRef}
            className="fixed bg-transparent z-[10000]"
            style={{
              top: `${receivablesDropdownPosition.top}px`,
              left: `${receivablesDropdownPosition.left}px`
            }}
            onMouseEnter={() => {
              const customer = displayedCustomers.find(c => c.id === openReceivablesDropdownId);
              if (customer) setHoveredRowId(customer.id);
            }}
            onMouseLeave={() => {
              setOpenReceivablesDropdownId(null);
              setHoveredRowId(null);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (openReceivablesDropdownId) {
                  navigate(`/sales/customers/${openReceivablesDropdownId}/edit`);
                }
                setOpenReceivablesDropdownId(null);
                setHoveredRowId(null);
              }}
              className="flex items-center gap-2 py-2 px-4 bg-[#156372] text-white border border-white rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-[#0f4f5a] shadow-lg"
            >
              <Edit size={16} className="text-white" />
              Edit
            </button>
          </div>
        )
      }

      {/* Delete Customer Confirmation Modal */}
      {
        isDeleteModalOpen && (
          <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                  !
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                  Delete customer?
                </h3>
                <button
                  type="button"
                  className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteCustomerId(null);
                  }}
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="px-5 py-3 text-[13px] text-slate-600">
                You cannot retrieve this customer once they have been deleted.
              </div>
              <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700 ${isDeletingCustomer ? "opacity-70 cursor-not-allowed" : ""}`}
                  onClick={confirmDeleteCustomer}
                  disabled={isDeletingCustomer}
                >
                  {isDeletingCustomer && <Loader2 size={14} className="animate-spin" />}
                  {isDeletingCustomer ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50 ${isDeletingCustomer ? "opacity-70 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteCustomerId(null);
                  }}
                  disabled={isDeletingCustomer}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Bulk Delete Confirmation Modal */}
      {
        isBulkDeleteModalOpen && (
          <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                  !
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                  Delete {deleteCustomerIds.length} customer{deleteCustomerIds.length === 1 ? "" : "s"}?
                </h3>
                <button
                  type="button"
                  className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => {
                    setIsBulkDeleteModalOpen(false);
                    setDeleteCustomerIds([]);
                  }}
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="px-5 py-3 text-[13px] text-slate-600">
                You cannot retrieve these customers once they have been deleted.
              </div>
              <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700 ${isBulkDeletingCustomers ? "opacity-70 cursor-not-allowed" : ""}`}
                  onClick={confirmBulkDelete}
                  disabled={isBulkDeletingCustomers}
                >
                  {isBulkDeletingCustomers && <Loader2 size={14} className="animate-spin" />}
                  {isBulkDeletingCustomers ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50 ${isBulkDeletingCustomers ? "opacity-70 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    setIsBulkDeleteModalOpen(false);
                    setDeleteCustomerIds([]);
                  }}
                  disabled={isBulkDeletingCustomers}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Bulk Consolidated Billing Confirmation Modal */}
      {
        bulkConsolidatedAction && (
          <div
            className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-16 pb-10 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isBulkConsolidatedUpdating) {
                setBulkConsolidatedAction(null);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {bulkConsolidatedAction === "enable" ? "Enable Consolidated Billing?" : "Disable Consolidated Billing?"}
                    </h2>
                  </div>
                </div>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={() => setBulkConsolidatedAction(null)}
                  disabled={isBulkConsolidatedUpdating}
                  aria-label="Close"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Invoices will be {bulkConsolidatedAction === "enable" ? "consolidated" : "separated"} for the selected customers. Any invoices that were generated already will not be affected.
                </p>

                <div className="mt-8 flex items-center justify-start gap-3">
                  <button
                    onClick={confirmBulkConsolidatedBilling}
                    disabled={isBulkConsolidatedUpdating}
                    className={`px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700 flex items-center gap-2 ${isBulkConsolidatedUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {isBulkConsolidatedUpdating && <Loader2 size={14} className="animate-spin" />}
                    {bulkConsolidatedAction === "enable" ? "Enable Now" : "Disable Now"}
                  </button>
                  <button
                    onClick={() => setBulkConsolidatedAction(null)}
                    disabled={isBulkConsolidatedUpdating}
                    className={`px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-200 ${isBulkConsolidatedUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
