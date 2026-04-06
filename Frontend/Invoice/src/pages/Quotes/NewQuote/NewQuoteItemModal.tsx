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

export default function NewQuoteItemModal({ controller }: Props) {
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
      {/* New Item Modal */}
      {
        isNewItemModalOpen && (
          <div className="new-invoice-modal-overlay" onClick={handleCancelNewItem}>
            <div className="new-item-modal" onClick={(e) => e.stopPropagation()}>
              <div className="new-item-modal-header">
                <h2 className="new-item-modal-title">New Item</h2>
                <button
                  className="new-item-modal-close"
                  onClick={handleCancelNewItem}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="new-item-modal-body">
                {/* Top Section - Type, Name, SKU, Unit, and Image */}
                <div className="new-item-top-section">
                  <div className="new-item-form-left">
                    {/* Type */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Type
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <div className="new-item-radio-group">
                        <label className="new-item-radio-label">
                          <input
                            type="radio"
                            name="type"
                            value="Goods"
                            checked={newItemData.type === "Goods"}
                            onChange={handleNewItemChange}
                            className="new-item-radio"
                          />
                          <span className="new-item-radio-dot"></span>
                          Goods
                        </label>
                        <label className="new-item-radio-label">
                          <input
                            type="radio"
                            name="type"
                            value="Service"
                            checked={newItemData.type === "Service"}
                            onChange={handleNewItemChange}
                            className="new-item-radio"
                          />
                          <span className="new-item-radio-dot"></span>
                          Service
                        </label>
                      </div>
                    </div>

                    {/* Name */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Name<span className="new-item-required">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        className="new-item-input"
                        value={newItemData.name}
                        onChange={handleNewItemChange}
                      />
                    </div>

                    {/* SKU */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        SKU
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <input
                        type="text"
                        name="sku"
                        className="new-item-input"
                        value={newItemData.sku}
                        onChange={handleNewItemChange}
                      />
                    </div>

                    {/* Unit */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Unit
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="unit"
                          className="new-item-select"
                          value={newItemData.unit}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select or type to add</option>
                          <option value="pcs">pcs</option>
                          <option value="box">box</option>
                          <option value="kg">kg</option>
                          <option value="ltr">ltr</option>
                          <option value="m">m</option>
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="new-item-image-section">
                    <div
                      className="new-item-image-upload"
                      onClick={() => newItemImageRef.current?.click()}
                    >
                      {newItemImage ? (
                        <img src={newItemImage} alt="Item" className="new-item-image-preview" />
                      ) : (
                        <>
                          <ImageIcon size={48} className="new-item-image-icon" />
                          <p className="new-item-image-text">Drag image(s) here or</p>
                          <button type="button" className="new-item-browse-button">
                            Browse images
                          </button>
                        </>
                      )}
                    </div>
                    <input
                      ref={newItemImageRef}
                      type="file"
                      accept="image/*"
                      onChange={handleNewItemImageUpload}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                {/* Sales and Purchase Information */}
                <div className="new-item-info-section">
                  {/* Sales Information */}
                  <div className="new-item-info-column">
                    <div className="new-item-info-header">
                      <h3 className="new-item-info-title">Sales Information</h3>
                      <label className="new-item-checkbox-label">
                        <input
                          type="checkbox"
                          name="sellable"
                          checked={newItemData.sellable}
                          onChange={handleNewItemChange}
                          className="new-item-checkbox"
                        />
                        Sellable
                      </label>
                    </div>

                    {/* Selling Price */}
                    <div className="new-item-field-group">
                      <label className="new-item-label new-item-label-red">
                        Selling Price<span className="new-item-required">*</span>
                      </label>
                      <div className="new-item-price-input">
                        <span className="new-item-currency-prefix">{formData.currency}</span>
                        <input
                          type="number"
                          name="sellingPrice"
                          className="new-item-input new-item-input-with-prefix"
                          value={newItemData.sellingPrice}
                          onChange={handleNewItemChange}
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Sales Account */}
                    <div className="new-item-field-group">
                      <label className="new-item-label new-item-label-red">
                        Account<span className="new-item-required">*</span>
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="salesAccount"
                          className="new-item-select"
                          value={newItemData.salesAccount}
                          onChange={handleNewItemChange}
                        >
                          <option value="Sales">Sales</option>
                          <option value="Service Income">Service Income</option>
                          <option value="Other Income">Other Income</option>
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>

                    {/* Sales Description */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">Description</label>
                      <textarea
                        name="salesDescription"
                        className="new-item-textarea"
                        value={newItemData.salesDescription}
                        onChange={handleNewItemChange}
                        rows={3}
                      />
                    </div>

                    {/* Sales Tax */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Tax
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="salesTax"
                          className="new-item-select"
                          value={newItemData.salesTax}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select a Tax</option>
                          {taxes.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>
                  </div>

                  {/* Purchase Information */}
                  <div className="new-item-info-column">
                    <div className="new-item-info-header">
                      <h3 className="new-item-info-title">Purchase Information</h3>
                      <label className="new-item-checkbox-label">
                        <input
                          type="checkbox"
                          name="purchasable"
                          checked={newItemData.purchasable}
                          onChange={handleNewItemChange}
                          className="new-item-checkbox"
                        />
                        Purchasable
                      </label>
                    </div>

                    {/* Cost Price */}
                    <div className="new-item-field-group">
                      <label className="new-item-label new-item-label-red">
                        Cost Price<span className="new-item-required">*</span>
                      </label>
                      <div className="new-item-price-input">
                        <span className="new-item-currency-prefix">{formData.currency}</span>
                        <input
                          type="number"
                          name="costPrice"
                          className="new-item-input new-item-input-with-prefix"
                          value={newItemData.costPrice}
                          onChange={handleNewItemChange}
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Purchase Account */}
                    <div className="new-item-field-group">
                      <label className="new-item-label new-item-label-red">
                        Account<span className="new-item-required">*</span>
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="purchaseAccount"
                          className="new-item-select"
                          value={newItemData.purchaseAccount}
                          onChange={handleNewItemChange}
                        >
                          <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                          <option value="Purchases">Purchases</option>
                          <option value="Expenses">Expenses</option>
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>

                    {/* Purchase Description */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">Description</label>
                      <textarea
                        name="purchaseDescription"
                        className="new-item-textarea"
                        value={newItemData.purchaseDescription}
                        onChange={handleNewItemChange}
                        rows={3}
                      />
                    </div>

                    {/* Purchase Tax */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Tax
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="purchaseTax"
                          className="new-item-select"
                          value={newItemData.purchaseTax}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select a Tax</option>
                          {taxes.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>

                    {/* Preferred Vendor */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">Preferred Vendor</label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="preferredVendor"
                          className="new-item-select"
                          value={newItemData.preferredVendor}
                          onChange={handleNewItemChange}
                        >
                          <option value=""></option>
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Track Inventory Section */}
                <div className="new-item-inventory-section">
                  <label className="new-item-inventory-checkbox">
                    <input
                      type="checkbox"
                      name="trackInventory"
                      checked={newItemData.trackInventory}
                      onChange={handleNewItemChange}
                      className="new-item-checkbox"
                    />
                    <span className="new-item-inventory-label">
                      Track Inventory for this item
                      <Info size={14} className="new-item-info-icon" />
                    </span>
                  </label>
                  <p className="new-item-inventory-note">
                    You cannot enable/disable inventory tracking once you've created transactions for this item
                  </p>

                  {newItemData.trackInventory && (
                    <div className="new-item-inventory-info">
                      <Info size={16} className="new-item-inventory-info-icon" />
                      <span>Note: You can configure the opening stock and stock tracking for this item under the Items module</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="new-item-modal-footer">
                <button
                  className="new-item-button new-item-button-primary"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onClick={handleSaveNewItem}
                >
                  Save
                </button>
                <button
                  className="new-item-button new-item-button-cancel"
                  onClick={handleCancelNewItem}
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
