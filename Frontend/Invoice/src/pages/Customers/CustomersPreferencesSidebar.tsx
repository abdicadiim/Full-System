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


export default function CustomersPreferencesSidebar({ controller }: { controller: any }) {
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
      {/* Preferences Sidebar */}
      {(isPreferencesOpen || isFieldCustomizationOpen) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActivePreferencesTab("preferences")}
                    className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "preferences"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Preferences
                  </button>
                  <button
                    onClick={() => setActivePreferencesTab("field-customization")}
                    className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "field-customization"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Field Customization
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-sm text-blue-600 hover:text-blue-700">All Preferences</button>
                  <button
                    onClick={() => {
                      setIsPreferencesOpen(false);
                      setIsFieldCustomizationOpen(false);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Preferences Tab Content */}
              {activePreferencesTab === "preferences" && (
                <div className="p-6">
                  {/* General Settings */}
                  <div className="mb-6">
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.allowEditingSentInvoice}
                          onChange={(e) => setPreferences(prev => ({ ...prev, allowEditingSentInvoice: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Allow editing of Sent Invoice?</span>
                      </label>
                    </div>
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.associateExpenseReceipts}
                          onChange={(e) => setPreferences(prev => ({ ...prev, associateExpenseReceipts: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Associate and display expense receipts in Invoice PDF</span>
                      </label>
                    </div>
                  </div>

                  {/* Payments Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Payments</h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifyOnOnlinePayment}
                          onChange={(e) => setPreferences(prev => ({ ...prev, notifyOnOnlinePayment: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Get notified when customers pay online</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.includePaymentReceipt}
                          onChange={(e) => setPreferences(prev => ({ ...prev, includePaymentReceipt: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Do you want to include the payment receipt along with the Thank You note?</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.automateThankYouNote}
                          onChange={(e) => setPreferences(prev => ({ ...prev, automateThankYouNote: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Automate thank you note to customer on receipt of online payment</span>
                      </label>
                    </div>
                  </div>

                  {/* Invoice QR Code Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Invoice QR Code</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{preferences.invoiceQRCodeEnabled ? "Enabled" : "Disabled"}</span>
                        <button
                          onClick={() => setPreferences(prev => ({ ...prev, invoiceQRCodeEnabled: !prev.invoiceQRCodeEnabled }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.invoiceQRCodeEnabled ? "bg-blue-600" : "bg-gray-300"
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.invoiceQRCodeEnabled ? "translate-x-6" : "translate-x-1"
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Enable and configure the QR code you want to display on the PDF copy of an Invoice. Your customers can scan the QR code using their device to access the URL or other information that you configure.
                    </p>
                  </div>

                  {/* Zero-Value Line Items Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Zero-Value Line Items</h3>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.hideZeroValueLineItems}
                        onChange={(e) => setPreferences(prev => ({ ...prev, hideZeroValueLineItems: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">Hide zero-value line items</span>
                        <p className="text-sm text-gray-600 mt-1">
                          Choose whether you want to hide zero-value line items in an invoice's PDF and the Customer Portal. They will still be visible while editing an invoice. This setting will not apply to invoices whose total is zero.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Terms & Conditions Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                    <textarea
                      value={preferences.termsAndConditions}
                      onChange={(e) => setPreferences(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                      className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[200px]"
                      placeholder="Enter terms and conditions..."
                    />
                  </div>

                  {/* Customer Notes Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Notes</h3>
                    <textarea
                      value={preferences.customerNotes}
                      onChange={(e) => setPreferences(prev => ({ ...prev, customerNotes: e.target.value }))}
                      className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[200px]"
                      placeholder="Enter customer notes..."
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-start pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        // TODO: Save preferences to localStorage or backend
                        toast.success("Preferences saved successfully!");
                        setIsPreferencesOpen(false);
                      }}
                      className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0f4f5a]"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Field Customization Tab Content */}
              {activePreferencesTab === "field-customization" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0f4f5a]">
                      <Plus size={16} />
                      New
                    </button>
                  </div>

                  {/* Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customFields.map((field) => (
                          <tr
                            key={field.id}
                            className={`border-b border-gray-200 hover:bg-gray-50 ${field.name === "Reference" ? "cursor-pointer" : ""
                              }`}
                            onClick={() => {
                              if (field.name === "Reference") {
                                setIsPreferencesOpen(true);
                                setActivePreferencesTab("preferences");
                              }
                            }}
                          >
                            <td className="px-4 py-3 text-gray-900">
                              <div className="flex items-center gap-2">
                                {field.isLocked && <Lock size={14} className="text-gray-400" />}
                                <span>{field.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{field.dataType}</td>
                            <td className="px-4 py-3 text-gray-700">{field.mandatory ? "Yes" : "No"}</td>
                            <td className="px-4 py-3 text-gray-700">{field.showInPDF ? "Yes" : "No"}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                {field.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
}
