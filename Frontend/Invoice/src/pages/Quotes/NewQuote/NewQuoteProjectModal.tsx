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

export default function NewQuoteProjectModal({ controller }: Props) {
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
      {/* New Project Modal */}
      {
        isNewProjectModalOpen && (
          <div className="new-invoice-modal-overlay" onClick={handleCancelNewProject}>
            <div className="new-project-modal" onClick={(e) => e.stopPropagation()}>
              <div className="new-project-modal-header">
                <h2 className="new-project-modal-title">New Project</h2>
                <button
                  className="new-project-modal-close"
                  onClick={handleCancelNewProject}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="new-project-modal-body">
                {/* Project Name */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Project Name<span className="new-project-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    className="new-project-input"
                    value={newProjectData.projectName}
                    onChange={handleNewProjectChange}
                  />
                </div>

                {/* Project Code */}
                <div className="new-project-field-row">
                  <label className="new-project-label">Project Code</label>
                  <input
                    type="text"
                    name="projectCode"
                    className="new-project-input"
                    value={newProjectData.projectCode}
                    onChange={handleNewProjectChange}
                  />
                </div>

                {/* Customer Name */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Customer Name<span className="new-project-required">*</span>
                  </label>
                  <div className="new-project-customer-select">
                    <select
                      name="customerName"
                      className="new-project-select"
                      value={newProjectData.customerName}
                      onChange={handleNewProjectChange}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.name}>{customer.name}</option>
                      ))}
                    </select>
                    <button type="button" className="new-project-search-btn">
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                {/* Billing Method */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Billing Method<span className="new-project-required">*</span>
                  </label>
                  <select
                    name="billingMethod"
                    className="new-project-select"
                    value={newProjectData.billingMethod}
                    onChange={handleNewProjectChange}
                  >
                    <option value="Fixed Cost for Project">Fixed Cost for Project</option>
                    <option value="Based on Project Hours">Based on Project Hours</option>
                    <option value="Based on Task Hours">Based on Task Hours</option>
                    <option value="Based on Staff Hours">Based on Staff Hours</option>
                  </select>
                </div>

                {/* Total Project Cost */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Total Project Cost<span className="new-project-required">*</span>
                  </label>
                  <div className="new-project-price-input">
                    <span className="new-project-currency-prefix">{formData.currency}</span>
                    <input
                      type="number"
                      name="totalProjectCost"
                      className="new-project-input new-project-input-with-prefix"
                      value={newProjectData.totalProjectCost}
                      onChange={handleNewProjectChange}
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="new-project-field-row">
                  <label className="new-project-label">Description</label>
                  <textarea
                    name="description"
                    className="new-project-textarea"
                    placeholder="Max. 2000 characters"
                    value={newProjectData.description}
                    onChange={handleNewProjectChange}
                    rows={3}
                    maxLength={2000}
                  />
                </div>

                {/* Budget Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Budget</h3>

                  {/* Cost Budget */}
                  <div className="new-project-field-row">
                    <label className="new-project-label">
                      Cost Budget
                      <Info size={14} className="new-project-info-icon" />
                    </label>
                    <div className="new-project-price-input">
                      <span className="new-project-currency-prefix">{formData.currency}</span>
                      <input
                        type="number"
                        name="costBudget"
                        className="new-project-input new-project-input-with-prefix"
                        value={newProjectData.costBudget}
                        onChange={handleNewProjectChange}
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Revenue Budget */}
                  <div className="new-project-field-row">
                    <label className="new-project-label">
                      Revenue Budget
                      <Info size={14} className="new-project-info-icon" />
                    </label>
                    <div className="new-project-price-input">
                      <span className="new-project-currency-prefix">{formData.currency}</span>
                      <input
                        type="number"
                        name="revenueBudget"
                        className="new-project-input new-project-input-with-prefix"
                        value={newProjectData.revenueBudget}
                        onChange={handleNewProjectChange}
                        step="0.01"
                      />
                    </div>
                  </div>

                  <button type="button" className="new-project-link-button">
                    Add budget for project hours.
                  </button>
                </div>

                {/* Users Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Users</h3>

                  <table className="new-project-table">
                    <thead>
                      <tr>
                        <th className="new-project-th" style={{ width: "60px" }}>S.NO</th>
                        <th className="new-project-th">USER</th>
                        <th className="new-project-th">EMAIL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProjectData.users.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="new-project-td new-project-empty-row">
                            No users added yet
                          </td>
                        </tr>
                      ) : (
                        newProjectData.users.map((user, index) => (
                          <tr key={user.id}>
                            <td className="new-project-td">{index + 1}</td>
                            <td className="new-project-td">{user.name}</td>
                            <td className="new-project-td">{user.email}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    className="new-project-add-button"
                    onClick={handleAddProjectUser}
                  >
                    <Plus size={16} />
                    Add User
                  </button>
                </div>

                {/* Project Tasks Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Project Tasks</h3>

                  <table className="new-project-table">
                    <thead>
                      <tr>
                        <th className="new-project-th" style={{ width: "60px" }}>S.NO</th>
                        <th className="new-project-th">TASK NAME</th>
                        <th className="new-project-th">DESCRIPTION</th>
                        <th className="new-project-th" style={{ width: "50px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProjectData.tasks.map((task, index) => (
                        <tr key={task.id}>
                          <td className="new-project-td">{index + 1}</td>
                          <td className="new-project-td">
                            <input
                              type="text"
                              className="new-project-table-input"
                              placeholder="Task Name"
                              value={task.taskName}
                              onChange={(e) => handleProjectTaskChange(task.id, 'taskName', e.target.value)}
                            />
                          </td>
                          <td className="new-project-td">
                            <textarea
                              className="new-project-table-textarea"
                              placeholder="Description"
                              value={task.description}
                              onChange={(e) => handleProjectTaskChange(task.id, 'description', e.target.value)}
                              rows={2}
                            />
                          </td>
                          <td className="new-project-td">
                            {newProjectData.tasks.length > 1 && (
                              <button
                                type="button"
                                className="new-project-delete-button"
                                onClick={() => handleRemoveProjectTask(task.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    className="new-project-add-button"
                    onClick={handleAddProjectTask}
                  >
                    <Plus size={16} />
                    Add Project Task
                  </button>
                </div>

                {/* Add to Watchlist */}
                <div className="new-project-checkbox-row">
                  <label className="new-project-checkbox-label">
                    <input
                      type="checkbox"
                      name="addToWatchlist"
                      checked={newProjectData.addToWatchlist}
                      onChange={handleNewProjectChange}
                      className="new-project-checkbox"
                    />
                    Add to the watchlist on my dashboard
                  </label>
                </div>
              </div>

              <div className="new-project-modal-footer">
                <button
                  className="new-project-button new-project-button-primary"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onClick={handleSaveNewProject}
                >
                  Save and Select
                </button>
                <button
                  className="new-project-button new-project-button-cancel"
                  onClick={handleCancelNewProject}
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
