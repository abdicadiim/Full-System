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


export function useCustomersActions(controller: any = {}) {
  const {
    AUTH_URL, DEFAULT_COLUMNS, LOCAL_COLUMNS_LAYOUT_KEY, accountDropdownRef, accountsReceivableDropdownRef, accountsReceivableOptions,
    accountsReceivableSearch, activePreferencesTab, adjustmentTypeDropdownRef, allViews, availableReportingTags, bulkConsolidatedAction,
    bulkMoreMenuRef, bulkUpdateData, closeBulkUpdateDropdowns, columnSearch, columns, comparatorSearch,
    comparators, confirmBulkDelete, confirmDeleteCustomer, criteria, currencyDropdownRef, currencyOptions,
    currencySearch, currentPage, customFields, customViews, customerFields, customerLanguageDropdownRef,
    customerLanguageSearch, customerNameDropdownRef, customerTypeDropdownRef, customers, decimalFormatDropdownRef, defaultCustomerViews,
    deleteCustomerId, deleteCustomerIds, displayedCustomers, dropdownMergeTargets, dropdownRef, evaluateCriterion,
    evaluateCustomViewCriteria, exportData, favoriteViews, fieldSearch, filterCustomersByView, filterDropdownRef,
    filteredCurrencies, filteredCustomerLanguages, formatCurrency, getCustomerFieldValue, getCustomerIdForNavigation, getFilteredAndSortedCustomers,
    getSearchFilterOptions, handleAddColumn, handleAddCriterion, handleBulkDelete, handleCancelLayout, handleClearSelection,
    handleCriterionChange, handleDeleteCustomView, handleDeleteCustomer, handleRemoveColumn, handleRemoveCriterion, handleReorder,
    handleResetColumnWidths, handleSaveCustomView, handleSaveLayout, handleSelectAll, handleSelectCustomer, handleSort,
    handleToggleColumn, handleToggleFavorite, handleTogglePin, handleViewSelect, hasResized, hasValue,
    hoveredRowId, hoveredView, importType, isAccountDropdownOpen, isAccountsReceivableDropdownOpen, isAdjustmentTypeDropdownOpen,
    isBulkConsolidatedUpdating, isBulkDeleteModalOpen, isBulkDeletingCustomers, isBulkMoreMenuOpen, isBulkUpdateModalOpen, isComparatorDropdownOpen,
    isCurrencyDropdownOpen, isCustomerLanguageDropdownOpen, isCustomerNameDropdownOpen, isCustomerTypeDropdownOpen, isCustomizeModalOpen, isDecimalFormatDropdownOpen,
    isDeleteModalOpen, isDeletingCustomer, isDownloading, isDropdownOpen, isExportCurrentViewModalOpen, isExportCustomersModalOpen,
    isFavorite, isFieldCustomizationOpen, isFieldDropdownOpen, isFilterDropdownOpen, isImportContinueLoading, isImportModalOpen,
    isItemNameDropdownOpen, isLoading, isMergeCustomerDropdownOpen, isMergeModalOpen, isModalOpen, isModuleDropdownOpen,
    isMoreMenuOpen, isMoreOptionsDropdownOpen, isNewDropdownOpen, isPaymentMethodDropdownOpen, isPreferencesOpen, isPrintModalOpen,
    isPrintPreviewOpen, isProjectNameDropdownOpen, isPurchaseAccountDropdownOpen, isRefreshing, isSalesAccountDropdownOpen, isSalespersonDropdownOpen,
    isSearchHeaderDropdownOpen, isSearchModalOpen, isSearchTypeDropdownOpen, isSortBySubmenuOpen, isStatusDropdownOpen, isTaxExemptionsDropdownOpen,
    isTaxRateDropdownOpen, isTransactionTypeDropdownOpen, itemNameDropdownRef, itemsPerPage, loadCustomers, loadPriceLists,
    loadReportingTags, location, mapCustomerForList, mergeCustomerDropdownRef, mergeCustomerSearch, mergeTargetCustomer,
    modalRef, moduleDropdownRef, moreMenuRef, moreOptionsDropdownRef, navigate, newDropdownRef,
    newViewName, normalizeReportingTagAppliesTo, normalizeReportingTagOptions, openReceivablesDropdownId, openSearchModalForCurrentContext, organizationName,
    organizationNameHtml, originalColumns, paymentMethodDropdownRef, paymentTermsHook, pickFirstValue, portalLanguageOptions,
    preferences, priceLists, printDateRange, printPreviewContent, projectNameDropdownRef, purchaseAccountDropdownRef,
    receivablesDropdownPosition, receivablesDropdownRef, receivablesDropdownRefs, resetSearchModalData, resizingRef, salesAccountDropdownRef,
    salespersonDropdownRef, searchHeaderDropdownRef, searchModalData, searchModalFilter, searchType, searchTypeDropdownRef,
    searchTypeOptions, selectedColumns, selectedCustomers, selectedView, setAccountsReceivableSearch, setActivePreferencesTab,
    setAvailableReportingTags, setBulkConsolidatedAction, setBulkUpdateData, setColumnSearch, setColumnWidth, setColumns,
    setComparatorSearch, setCriteria, setCurrencyOptions, setCurrencySearch, setCurrentPage, setCustomFields,
    setCustomViews, setCustomerLanguageSearch, setCustomers, setDeleteCustomerId, setDeleteCustomerIds, setExportData,
    setFavoriteViews, setFieldSearch, setHasResized, setHoveredRowId, setHoveredView, setImportType,
    setIsAccountDropdownOpen, setIsAccountsReceivableDropdownOpen, setIsAdjustmentTypeDropdownOpen, setIsBulkConsolidatedUpdating, setIsBulkDeleteModalOpen, setIsBulkDeletingCustomers,
    setIsBulkMoreMenuOpen, setIsBulkUpdateModalOpen, setIsComparatorDropdownOpen, setIsCurrencyDropdownOpen, setIsCustomerLanguageDropdownOpen, setIsCustomerNameDropdownOpen,
    setIsCustomerTypeDropdownOpen, setIsCustomizeModalOpen, setIsDecimalFormatDropdownOpen, setIsDeleteModalOpen, setIsDeletingCustomer, setIsDownloading,
    setIsDropdownOpen, setIsExportCurrentViewModalOpen, setIsExportCustomersModalOpen, setIsFavorite, setIsFieldCustomizationOpen, setIsFieldDropdownOpen,
    setIsFilterDropdownOpen, setIsImportContinueLoading, setIsImportModalOpen, setIsItemNameDropdownOpen, setIsLoading, setIsMergeCustomerDropdownOpen,
    setIsMergeModalOpen, setIsModalOpen, setIsModuleDropdownOpen, setIsMoreMenuOpen, setIsMoreOptionsDropdownOpen, setIsNewDropdownOpen,
    setIsPaymentMethodDropdownOpen, setIsPreferencesOpen, setIsPrintModalOpen, setIsPrintPreviewOpen, setIsProjectNameDropdownOpen, setIsPurchaseAccountDropdownOpen,
    setIsRefreshing, setIsSalesAccountDropdownOpen, setIsSalespersonDropdownOpen, setIsSearchHeaderDropdownOpen, setIsSearchModalOpen, setIsSearchTypeDropdownOpen,
    setIsSortBySubmenuOpen, setIsStatusDropdownOpen, setIsTaxExemptionsDropdownOpen, setIsTaxRateDropdownOpen, setIsTransactionTypeDropdownOpen, setItemsPerPage,
    setMergeCustomerSearch, setMergeTargetCustomer, setNewViewName, setOpenReceivablesDropdownId, setOriginalColumns, setPreferences,
    setPriceLists, setPrintDateRange, setPrintPreviewContent, setReceivablesDropdownPosition, setSearchModalData, setSearchModalFilter,
    setSearchType, setSelectedColumns, setSelectedCustomers, setSelectedView, setSortConfig, setTaxRateOptions,
    setTaxRateSearch, setTotalItems, setTotalPages, setViewSearchQuery, setVisibilityPreference, settings,
    singleSelectionMergeTargets, sortConfig, startResizing, statusDropdownRef, tableMinWidth, taxExemptionsDropdownRef,
    taxRateDropdownRef, taxRateOptions, taxRateSearch, totalItems, totalPages, transactionTypeDropdownRef,
    viewSearchQuery, visibilityPreference, visibleColumns
  } = controller as any;
  const handleBulkMarkActive = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    try {
      await customersAPI.bulkUpdate(Array.from(selectedCustomers), { status: "active" });
      await loadCustomers();
      toast.success(`Marked ${selectedCustomers.size} customer(s) as active`);
      setSelectedCustomers(new Set());
    } catch (error) {
      toast.error("Failed to mark customers as active. Please try again.");
    }
  };

  const handleBulkMarkInactive = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    try {
      await customersAPI.bulkUpdate(Array.from(selectedCustomers), { status: "inactive" });
      await loadCustomers();
      toast.success(`Marked ${selectedCustomers.size} customer(s) as inactive`);
      setSelectedCustomers(new Set());
    } catch (error) {
      toast.error("Failed to mark customers as inactive. Please try again.");
    }
  };

  const handleBulkMerge = () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer to merge.");
      return;
    }
    // Do not preselect a merge target (Zoho-style: user chooses master profile)
    setMergeTargetCustomer(null);
    setIsMergeCustomerDropdownOpen(false);
    setMergeCustomerSearch("");
    setIsMergeModalOpen(true);
  };

  const handleMergeContinue = async () => {
    if (!mergeTargetCustomer) {
      toast.error("Please select a customer to merge with.");
      return;
    }

    const selectedCustomerIds = Array.from(selectedCustomers);
    const sourceCustomerIds = selectedCustomerIds.filter(id => id !== mergeTargetCustomer.id);

    if (sourceCustomerIds.length === 0) {
      toast.error("Please select different customers to merge.");
      return;
    }

    try {
      await customersAPI.merge(mergeTargetCustomer.id, sourceCustomerIds);
      await loadCustomers();
      const sourceNames = customers
        .filter(c => sourceCustomerIds.includes(c.id))
        .map(c => c.name)
        .join(", ");
      toast.success(`Successfully merged "${sourceNames}" into "${mergeTargetCustomer.name}". The merged customer(s) have been marked as inactive.`);
      setSelectedCustomers(new Set());
      setIsMergeModalOpen(false);
      setMergeTargetCustomer(null);
      setMergeCustomerSearch("");
    } catch (error) {
      const message = (error as any)?.message || "Failed to merge customers. Please try again.";
      toast.error(message);
    }
  };

  const handleBulkEnableConsolidatedBilling = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }
    setBulkConsolidatedAction("enable");
  };

  const handleBulkDisableConsolidatedBilling = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }
    setBulkConsolidatedAction("disable");
  };

  const confirmBulkConsolidatedBilling = async () => {
    if (!bulkConsolidatedAction) return;
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      setBulkConsolidatedAction(null);
      return;
    }

    const ids = Array.from(selectedCustomers);
    const count = ids.length;
    const enabled = bulkConsolidatedAction === "enable";

    setIsBulkConsolidatedUpdating(true);
    try {
      await customersAPI.bulkUpdate(ids, {
        consolidatedBilling: enabled,
        enableConsolidatedBilling: enabled,
        isConsolidatedBillingEnabled: enabled,
      });
      await loadCustomers();
      toast.success(`${enabled ? "Enabled" : "Disabled"} consolidated billing for ${count} customer(s).`);
      setSelectedCustomers(new Set());
      setBulkConsolidatedAction(null);
    } catch {
      toast.error(`Failed to ${enabled ? "enable" : "disable"} consolidated billing. Please try again.`);
    } finally {
      setIsBulkConsolidatedUpdating(false);
    }
  };


  const handlePrintStatements = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    // Show loading state on download button
    setIsDownloading(true);

    const selectedCustomerData = Array.from(selectedCustomers).map(id =>
      customers.find(c => c.id === id)
    ).filter(Boolean);

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Create a hidden container for PDF generation
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    document.body.appendChild(container);

    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 0; i < selectedCustomerData.length; i++) {
        const customer = selectedCustomerData[i];
        if (i > 0) pdf.addPage();

        // Render customer statement HTML
        container.innerHTML = `
          <div style="padding: 15mm; background: white; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.6; min-height: 297mm; box-sizing: border-box;">
            <!-- Header section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
              <div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #156372; text-transform: uppercase; letter-spacing: -0.5px;">${organizationNameHtml}</h1>
                <div style="margin-top: 8px; font-size: 13px; color: #4a5568;">
                  <p style="margin: 2px 0;">Aland Islands</p>
                  <p style="margin: 2px 0;">asowrs685@gmail.com</p>
                </div>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 32px; font-weight: 900; color: #2d3748; text-transform: uppercase; line-height: 1;">Statement</h2>
                <div style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #718096; background: #f7fafc; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                  ${dateStr} – ${dateStr}
                </div>
              </div>
            </div>

            <div style="height: 1px; background: #e2e8f0; margin-bottom: 40px;"></div>

            <!-- Addresses Section -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;">
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a0aec0; font-weight: 700;">Statement Of Accounts To</h3>
                <div style="font-size: 16px; font-weight: 700; color: #1a202c;">${customer.name || 'N/A'}</div>
                ${customer.companyName ? `<div style="font-size: 14px; color: #4a5568; margin-top: 4px;">${customer.companyName}</div>` : ''}
                <div style="font-size: 14px; color: #4a5568; margin-top: 2px;">${customer.email || ''}</div>
              </div>
              <div style="background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #edf2f7;">
                <h3 style="margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; color: #2d3748; font-weight: 700; border-bottom: 2px solid #156372; display: inline-block; padding-bottom: 4px;">Account Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Opening Balance</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${customer.currency || 'AED'} 0.00</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Invoiced Amount</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${customer.currency || 'AED'} ${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Amount Received</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600; color: #48bb78;">${customer.currency || 'AED'} 0.00</td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="padding: 12px 0 0 0; font-weight: 800; color: #1a202c; font-size: 16px;">Balance Due</td>
                    <td style="text-align: right; padding: 12px 0 0 0; font-weight: 800; color: #156372; font-size: 18px;">${customer.currency || 'AED'} ${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Transactions Table -->
            <div style="margin-bottom: 60px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #156372; color: white;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700; border-radius: 8px 0 0 8px;">DATE</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">TRANSACTIONS</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">DETAILS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">AMOUNT</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">PAYMENTS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700; border-radius: 0 8px 8px 0;">BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600;">Opening Balance</td>
                    <td style="padding: 15px; color: #718096;">Initial balance</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; color: #48bb78;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">0.00</td>
                  </tr>
                  <tr style="background: #fcfcfc; border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600; color: #156372;">Invoice</td>
                    <td style="padding: 15px; color: #718096;">Account Balance Adjustment</td>
                    <td style="padding: 15px; text-align: right;">${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; border-top: 2px solid #156372;">
                    <td colspan="4" style="padding: 20px 15px; text-align: right; font-weight: 800; font-size: 14px; color: #2d3748;">NET BALANCE DUE</td>
                    <td style="padding: 20px 15px; text-align: right;"></td>
                    <td style="padding: 20px 15px; text-align: right; font-weight: 900; font-size: 15px; color: #156372;">${customer.currency || 'AED'} ${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Footer -->
            <div style="position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; font-size: 10px;">
              <p style="margin: 0; font-weight: 600;">Generated professionally by ${organizationNameHtml}</p>
              <p style="margin: 4px 0 0 0;">Report Date: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        `;

        const canvas = await html2canvas(container, {
          scale: 3, // High quality
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      pdf.save(`Statements_${today.toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      toast.error("Error generating PDF. Please try again.");
    } finally {
      try {
        document.body.removeChild(container);
      } catch (e) {
        // ignore
      }
      setIsDownloading(false);
    }
  };
  const handleOpenBulkUpdate = () => {
    setBulkUpdateData({
      customerType: "",
      creditLimit: "",
      currency: "",
      taxRate: "",
      paymentTerms: "",
      customerLanguage: "",
      accountsReceivable: "",
      priceListId: "",
      reportingTags: {}
    });
    setIsBulkUpdateModalOpen(true);
  };

  const getSelectedCustomerDbIds = () => {
    const resolved = Array.from(selectedCustomers).map((selectedId) => {
      const matched = customers.find(
        (c: any) => String(c.id) === String(selectedId) || String(c._id) === String(selectedId)
      );
      return matched?.id ? String(matched.id) : String(selectedId);
    });
    return Array.from(new Set(resolved));
  };

  const handleBulkUpdateSubmit = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    // Check if at least one field has a value
    const hasAtLeastOneField =
      bulkUpdateData.customerType ||
      String(bulkUpdateData.creditLimit || "").trim() ||
      bulkUpdateData.currency ||
      bulkUpdateData.taxRate ||
      bulkUpdateData.paymentTerms ||
      bulkUpdateData.customerLanguage ||
      bulkUpdateData.accountsReceivable ||
      bulkUpdateData.priceListId ||
      Object.values(bulkUpdateData.reportingTags || {}).some((v) => String(v || "").trim() !== "");

    if (!hasAtLeastOneField) {
      toast.error("Please fill in at least one field to update.");
      return;
    }

    try {
      const updateData: Record<string, any> = {};

      // Only include fields that have values
      if (bulkUpdateData.customerType) {
        updateData.customerType = bulkUpdateData.customerType;
      }
      const parsedCreditLimit = parseFloat(String(bulkUpdateData.creditLimit || "").trim());
      if (!Number.isNaN(parsedCreditLimit)) {
        updateData.creditLimit = parsedCreditLimit;
        updateData.credit_limit = parsedCreditLimit;
      }
      if (bulkUpdateData.currency) {
        updateData.currency = bulkUpdateData.currency;
      }
      if (bulkUpdateData.paymentTerms) {
        updateData.paymentTerms = bulkUpdateData.paymentTerms;
      }
      if (bulkUpdateData.customerLanguage) {
        updateData.portalLanguage = bulkUpdateData.customerLanguage;
      }
      if (bulkUpdateData.taxRate) {
        updateData.taxRate = bulkUpdateData.taxRate;
      }
      if (bulkUpdateData.accountsReceivable) {
        updateData.accountsReceivable = bulkUpdateData.accountsReceivable;
      }
      if (bulkUpdateData.priceListId) {
        updateData.priceListId = bulkUpdateData.priceListId;
      }

      const reportingTagEntries = Object.entries(bulkUpdateData.reportingTags || {})
        .map(([tagId, value]) => {
          const matchedTag = availableReportingTags.find((t: any) => String(t?._id || t?.id) === String(tagId));
          return {
            tagId,
            id: tagId,
            name: matchedTag?.name || "",
            value: String(value ?? "")
          };
        })
        .filter((entry) => entry.value !== "");

      if (reportingTagEntries.length > 0) {
        updateData.reportingTags = reportingTagEntries;
      }

      // Keep both naming variants for compatibility with existing customer schemas
      if (bulkUpdateData.customerLanguage) {
        updateData.customerLanguage = bulkUpdateData.customerLanguage;
      }

      const selectedCustomerIds = getSelectedCustomerDbIds();

      // Update each selected customer
      await customersAPI.bulkUpdate(selectedCustomerIds, updateData);

      // Refresh customers list
      await loadCustomers();
      setIsBulkUpdateModalOpen(false);
      toast.success(`Updated ${selectedCustomers.size} customer(s) successfully.`);
      setSelectedCustomers(new Set());

      // Reset bulk update data
      setBulkUpdateData({
        customerType: "",
        creditLimit: "",
        currency: "",
        taxRate: "",
        paymentTerms: "",
        customerLanguage: "",
        accountsReceivable: "",
        priceListId: "",
        reportingTags: {}
      });
    } catch (error) {
      toast.error("Failed to update customers. Please try again.");
    }
  };

  const decimalFormatOptions = [
    "1234567.89",
    "1,234,567.89",
    "1234567,89",
    "1.234.567,89"
  ];

  const moduleOptions = [
    "Quotes",
    "Invoices",
    "Invoice Payments",
    "Recurring Invoices",
    "Credit Notes",
    "Credit Notes Applied to Invoices",
    "Refunds",
    "Purchase",
    "Expenses",
    "Recurring Expenses",
    "Purchase Orders",
    "Bills",
    "Bill Payments",
    "Recurring Bills",
    "Vendor Credits",
    "Applied Vendor Credits",
    "Vendor Credit Refunds",
    "Timesheet",
    "Projects",
    "Project Tasks",
    "Others",
    "Customers",
    "Vendors",
    "Tasks",
    "Items",
    "Inventory Adjustments",
    "Exchange Rates",
    "Users",
    "Chart of Accounts",
    "Manual Journals",
    "Documents",
    "Export Template"
  ];

  const handleManageCustomFields = () => {
    setIsMoreMenuOpen(false);
    navigate("/settings/customers-vendors");
  };

  const handleExportCurrentView = () => {
    setIsExportCurrentViewModalOpen(true);
    setIsMoreMenuOpen(false);
  };

  const handleTogglePasswordVisibility = () => {
    setExportData(prev => ({ ...prev, showPassword: !prev.showPassword }));
  };

  const handleExportCustomers = async () => {
    try {
      // Get customers data
      const allCustomers = await getCustomers();
      let dataToExport = allCustomers;

      // Apply data scope filter if needed
      if (exportData.dataScope === "Specific Period") {
        // For now, export all customers. In a real app, you'd filter by date range
        // dataToExport = allCustomers.filter(...);
      }

      // Limit to 25,000 rows as per note
      const limitedData = dataToExport.slice(0, 25000);

      // Prepare All Fields Mapping
      const allFields = [
        { label: "Display Name", key: "displayName", getValue: (c: any) => c.displayName || c.name || "" },
        { label: "Company Name", key: "companyName", getValue: (c: any) => c.companyName || "" },
        { label: "Salutation", key: "salutation", getValue: (c: any) => c.salutation || "" },
        { label: "First Name", key: "firstName", getValue: (c: any) => c.firstName || "" },
        { label: "Last Name", key: "lastName", getValue: (c: any) => c.lastName || "" },
        { label: "Email ID", key: "email", getValue: (c: any) => c.email || "" },
        { label: "Work Phone", key: "workPhone", getValue: (c: any) => c.workPhone || "" },
        { label: "Mobile", key: "mobile", getValue: (c: any) => c.mobile || c.mobilePhone || "" },
        { label: "Payment Terms", key: "paymentTerms", getValue: (c: any) => c.paymentTerms || "" },
        { label: "Currency", key: "currency", getValue: (c: any) => c.currency || "" },
        { label: "Notes", key: "notes", getValue: (c: any) => c.notes || c.remarks || "" },
        { label: "Website", key: "website", getValue: (c: any) => c.websiteUrl || c.website || "" },
        { label: "Billing Attention", key: "billingAttention", getValue: (c: any) => c.billingAddress?.attention || "" },
        { label: "Billing Street", key: "billingStreet", getValue: (c: any) => c.billingAddress?.street1 || "" },
        { label: "Billing Street 2", key: "billingStreet2", getValue: (c: any) => c.billingAddress?.street2 || "" },
        { label: "Billing City", key: "billingCity", getValue: (c: any) => c.billingAddress?.city || "" },
        { label: "Billing State", key: "billingState", getValue: (c: any) => c.billingAddress?.state || "" },
        { label: "Billing Zip Code", key: "billingZipCode", getValue: (c: any) => c.billingAddress?.zipCode || "" },
        { label: "Billing Country", key: "billingCountry", getValue: (c: any) => c.billingAddress?.country || "" },
        { label: "Billing Fax", key: "billingFax", getValue: (c: any) => c.billingAddress?.fax || "" },
        { label: "Shipping Attention", key: "shippingAttention", getValue: (c: any) => c.shippingAddress?.attention || "" },
        { label: "Shipping Street", key: "shippingStreet", getValue: (c: any) => c.shippingAddress?.street1 || "" },
        { label: "Shipping Street 2", key: "shippingStreet2", getValue: (c: any) => c.shippingAddress?.street2 || "" },
        { label: "Shipping City", key: "shippingCity", getValue: (c: any) => c.shippingAddress?.city || "" },
        { label: "Shipping State", key: "shippingState", getValue: (c: any) => c.shippingAddress?.state || "" },
        { label: "Shipping Zip Code", key: "shippingZipCode", getValue: (c: any) => c.shippingAddress?.zipCode || "" },
        { label: "Shipping Country", key: "shippingCountry", getValue: (c: any) => c.shippingAddress?.country || "" },
        { label: "Shipping Fax", key: "shippingFax", getValue: (c: any) => c.shippingAddress?.fax || "" },
        { label: "Customer Type", key: "customerType", getValue: (c: any) => c.customerType || "" },
        { label: "Opening Balance", key: "openingBalance", getValue: (c: any) => formatNumberForExport(c.openingBalance || c.receivables || 0, exportData.decimalFormat) },
        { label: "Status", key: "status", getValue: (c: any) => (c.status || "active").toLowerCase() },
      ];

      // Convert data to CSV/Format
      const headers = allFields.map(f => f.label);
      const csvRows = [headers.join(",")];

      limitedData.forEach(customer => {
        const rowData = allFields.map(field => {
          const val = field.getValue(customer);
          const stringVal = (val === null || val === undefined) ? "" : String(val);
          return `"${stringVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(rowData.join(","));
      });

      downloadExportFile(csvRows.join("\n"), `All_Customers`);

      setIsExportCustomersModalOpen(false);
      toast.success(`Export completed successfully! ${limitedData.length} records exported.`);
    } catch (error) {
      toast.error("Failed to export data. Please try again.");
    }
  };

  const handleExportSubmit = () => {
    // This is for Export Current View
    try {
      // Get currently displayed customers
      const dataToExport = displayedCustomers.slice(0, 10000); // Current view limit is usually smaller or just displayed

      // Get visible columns
      const cols = visibleColumns;
      const headers = cols.map(c => c.label);
      const csvRows = [headers.join(",")];

      dataToExport.forEach(customer => {
        const rowData = cols.map(col => {
          let val = getCustomerFieldValue(customer, col.key);

          // Special formatting for numbers in current view
          if (col.key === 'receivables' || col.key === 'unusedCredits') {
            val = formatNumberForExport(val, exportData.decimalFormat);
          }

          const stringVal = (val === null || val === undefined) ? "" : String(val);
          return `"${stringVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(rowData.join(","));
      });

      downloadExportFile(csvRows.join("\n"), `Customers_Current_View`);

      setIsExportCurrentViewModalOpen(false);
      toast.success(`Export completed successfully! ${dataToExport.length} records exported.`);
      setExportData(prev => ({
        ...prev,
        decimalFormat: "1234567.89",
        fileFormat: "csv",
        password: "",
        showPassword: false
      }));
    } catch (error) {
      toast.error("Failed to export current view. Please try again.");
    }
  };

  const downloadExportFile = (content, defaultFileName) => {
    // Determine file extension and MIME type
    let fileExtension = "csv";
    let mimeType = "text/csv";

    if (exportData.fileFormat === "xls") {
      fileExtension = "xls";
      mimeType = "application/vnd.ms-excel";
    } else if (exportData.fileFormat === "xlsx") {
      fileExtension = "xlsx";
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Generate filename based on module and date
    const dateStr = new Date().toISOString().split('T')[0];
    const moduleName = (exportData.module || defaultFileName).replace(/\s+/g, "_");
    link.download = `${moduleName}_${dateStr}.${fileExtension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const formatNumberForExport = (number, format) => {
    const num = parseFloat(number) || 0;

    switch (format) {
      case "1,234,567.89":
        return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "1234567,89":
        return num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "1.234.567,89":
        return num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "1234567.89":
      default:
        return num.toFixed(2);
    }
  };

  return {
    confirmBulkConsolidatedBilling, decimalFormatOptions, downloadExportFile, formatNumberForExport, getSelectedCustomerDbIds, handleBulkDisableConsolidatedBilling,
    handleBulkEnableConsolidatedBilling, handleBulkMarkActive, handleBulkMarkInactive, handleBulkMerge, handleBulkUpdateSubmit, handleExportCurrentView,
    handleExportCustomers, handleExportSubmit, handleManageCustomFields, handleMergeContinue, handleOpenBulkUpdate, handlePrintStatements,
    handleTogglePasswordVisibility, moduleOptions
  };
}
