import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { getCachedCustomersPage, getCustomViews, getCustomersPaginated, setCachedCustomersPage } from "../customersDbModel";
import { customersAPI, taxesAPI, reportingTagsAPI, currenciesAPI } from "../../services/api";
import FieldCustomization from "../shared/FieldCustomization";
import { usePaymentTermsDropdown } from "../../../hooks/usePaymentTermsDropdown";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ChevronDown, ChevronUp, Plus, MoreVertical, Search, ArrowUpDown, Filter, Star, X, Trash2, Download, Upload, Settings, RefreshCw, ChevronRight, ChevronLeft, GripVertical, Lock, Users, FileText, Check, Eye, EyeOff, Info, Layers, Edit, ClipboardList, SlidersHorizontal, Layout, AlignLeft, RotateCcw, Pin, PinOff, Loader2, AlertTriangle } from "lucide-react";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import { useSettings } from "../../lib/settings/SettingsContext";
import { waitForBackendReady } from "../../services/backendReady";

import { DEFAULT_CUSTOMER_VIEWS } from "./Customers.constants";

export function useCustomersView(controller: any = {}) {
  const {
    AUTH_URL, DEFAULT_COLUMNS, LOCAL_COLUMNS_LAYOUT_KEY, accountDropdownRef, accountsReceivableDropdownRef, accountsReceivableOptions,
    accountsReceivableSearch, activePreferencesTab, adjustmentTypeDropdownRef, availableReportingTags, bulkConsolidatedAction, bulkMoreMenuRef,
    bulkUpdateData, closeBulkUpdateDropdowns, columnSearch, columns, comparatorSearch, criteria,
    currencyDropdownRef, currencyOptions, currencySearch, currentPage, customFields, customViews,
    customerLanguageDropdownRef, customerLanguageSearch, customerNameDropdownRef, customerTypeDropdownRef, customers, decimalFormatDropdownRef,
    deleteCustomerId, deleteCustomerIds, dropdownRef, exportData, favoriteViews, fieldSearch,
    filterDropdownRef, getCustomerFieldValue, getSearchFilterOptions, handleCancelLayout, handleReorder, handleResetColumnWidths,
    handleSaveLayout, handleToggleColumn, handleTogglePin, hasResized, hasValue, hoveredRowId,
    hoveredView, importType, isAccountDropdownOpen, isAccountsReceivableDropdownOpen, isAdjustmentTypeDropdownOpen, isBulkConsolidatedUpdating,
    isBulkDeleteModalOpen, isBulkDeletingCustomers, isBulkMoreMenuOpen, isBulkUpdateModalOpen, isComparatorDropdownOpen, isCurrencyDropdownOpen,
    isCustomerLanguageDropdownOpen, isCustomerNameDropdownOpen, isCustomerTypeDropdownOpen, isCustomizeModalOpen, isDecimalFormatDropdownOpen, isDeleteModalOpen,
    isDeletingCustomer, isDownloading, isDropdownOpen, isExportCurrentViewModalOpen, isExportCustomersModalOpen, isFavorite,
    isFieldCustomizationOpen, isFieldDropdownOpen, isFilterDropdownOpen, isImportContinueLoading, isImportModalOpen, isItemNameDropdownOpen,
    isLoading, isMergeCustomerDropdownOpen, isMergeModalOpen, isModalOpen, isModuleDropdownOpen, isMoreMenuOpen,
    isMoreOptionsDropdownOpen, isPaymentMethodDropdownOpen, isPreferencesOpen, isPrintModalOpen, isPrintPreviewOpen, isProjectNameDropdownOpen,
    isPurchaseAccountDropdownOpen, isRefreshing, isSalesAccountDropdownOpen, isSalespersonDropdownOpen, isSearchHeaderDropdownOpen, isSearchModalOpen,
    isSearchTypeDropdownOpen, isSortBySubmenuOpen, isStatusDropdownOpen, isTaxExemptionsDropdownOpen, isTaxRateDropdownOpen, isTransactionTypeDropdownOpen,
    itemNameDropdownRef, itemsPerPage, loadPriceLists, loadReportingTags, location, mergeCustomerDropdownRef,
    mergeCustomerSearch, mergeTargetCustomer, modalRef, moduleDropdownRef, moreMenuRef, moreOptionsDropdownRef,
    navigate, newViewName, normalizeReportingTagAppliesTo, normalizeReportingTagOptions, openReceivablesDropdownId, openSearchModalForCurrentContext,
    organizationName, organizationNameHtml, originalColumns, paymentMethodDropdownRef, paymentTermsHook, pickFirstValue,
    portalLanguageOptions, preferences, priceLists, printDateRange, printPreviewContent, projectNameDropdownRef,
    purchaseAccountDropdownRef, receivablesDropdownPosition, receivablesDropdownRef, receivablesDropdownRefs, resetSearchModalData, resizingRef,
    salesAccountDropdownRef, salespersonDropdownRef, searchHeaderDropdownRef, searchModalData, searchModalFilter, searchType,
    searchTypeDropdownRef, searchTypeOptions, selectedColumns, selectedCustomers, selectedView, setAccountsReceivableSearch,
    setActivePreferencesTab, setAvailableReportingTags, setBulkConsolidatedAction, setBulkUpdateData, setColumnSearch, setColumnWidth,
    setColumns, setComparatorSearch, setCriteria, setCurrencyOptions, setCurrencySearch, setCurrentPage,
    setCustomFields, setCustomViews, setCustomerLanguageSearch, setCustomers, setDeleteCustomerId, setDeleteCustomerIds,
    setExportData, setFavoriteViews, setFieldSearch, setHasResized, setHoveredRowId, setHoveredView,
    setImportType, setIsAccountDropdownOpen, setIsAccountsReceivableDropdownOpen, setIsAdjustmentTypeDropdownOpen, setIsBulkConsolidatedUpdating, setIsBulkDeleteModalOpen,
    setIsBulkDeletingCustomers, setIsBulkMoreMenuOpen, setIsBulkUpdateModalOpen, setIsComparatorDropdownOpen, setIsCurrencyDropdownOpen, setIsCustomerLanguageDropdownOpen,
    setIsCustomerNameDropdownOpen, setIsCustomerTypeDropdownOpen, setIsCustomizeModalOpen, setIsDecimalFormatDropdownOpen, setIsDeleteModalOpen, setIsDeletingCustomer,
    setIsDownloading, setIsDropdownOpen, setIsExportCurrentViewModalOpen, setIsExportCustomersModalOpen, setIsFavorite, setIsFieldCustomizationOpen,
    setIsFieldDropdownOpen, setIsFilterDropdownOpen, setIsImportContinueLoading, setIsImportModalOpen, setIsItemNameDropdownOpen, setIsLoading,
    setIsMergeCustomerDropdownOpen, setIsMergeModalOpen, setIsModalOpen, setIsModuleDropdownOpen, setIsMoreMenuOpen, setIsMoreOptionsDropdownOpen,
    setIsPaymentMethodDropdownOpen, setIsPreferencesOpen, setIsPrintModalOpen, setIsPrintPreviewOpen, setIsProjectNameDropdownOpen, setIsPurchaseAccountDropdownOpen,
    setIsRefreshing, setIsSalesAccountDropdownOpen, setIsSalespersonDropdownOpen, setIsSearchHeaderDropdownOpen, setIsSearchModalOpen, setIsSearchTypeDropdownOpen,
    setIsSortBySubmenuOpen, setIsStatusDropdownOpen, setIsTaxExemptionsDropdownOpen, setIsTaxRateDropdownOpen, setIsTransactionTypeDropdownOpen, setItemsPerPage,
    setMergeCustomerSearch, setMergeTargetCustomer, setNewViewName, setOpenReceivablesDropdownId, setOriginalColumns, setPreferences,
    setPriceLists, setPrintDateRange, setPrintPreviewContent, setReceivablesDropdownPosition, setSearchModalData, setSearchModalFilter,
    setSearchType, setSelectedColumns, setSelectedCustomers, setSelectedView, setSortConfig, setTaxRateOptions,
    setTaxRateSearch, setTotalItems, setTotalPages, setViewSearchQuery, setVisibilityPreference, settings,
    sortConfig, startResizing, statusDropdownRef, tableMinWidth, taxExemptionsDropdownRef, taxRateDropdownRef,
    taxRateOptions, taxRateSearch, totalItems, totalPages, transactionTypeDropdownRef, viewSearchQuery,
    visibilityPreference, visibleColumns
  } = controller as any;
  const defaultCustomerViews = DEFAULT_CUSTOMER_VIEWS;
  const filteredCurrencies = currencyOptions.filter(c =>
    c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const filteredCustomerLanguages = portalLanguageOptions.filter(opt =>
    opt.toLowerCase().includes(customerLanguageSearch.toLowerCase())
  );



  // Evaluate a single criterion
  const evaluateCriterion = (fieldValue: any, comparator: string, value: any) => {
    const fieldStr = String(fieldValue || "").toLowerCase();
    const valueStr = String(value || "").toLowerCase();

    switch (comparator) {
      case "is":
        return fieldStr === valueStr;
      case "is not":
        return fieldStr !== valueStr;
      case "starts with":
        return fieldStr.startsWith(valueStr);
      case "contains":
        return fieldStr.includes(valueStr);
      case "doesn't contain":
        return !fieldStr.includes(valueStr);
      case "is in":
        return valueStr.split(",").map(v => v.trim()).includes(fieldStr);
      case "is not in":
        return !valueStr.split(",").map(v => v.trim()).includes(fieldStr);
      case "is empty":
        return !fieldValue || fieldStr === "";
      case "is not empty":
        return fieldValue && fieldStr !== "";
      case "greater than":
        return parseFloat(fieldValue) > parseFloat(value);
      case "less than":
        return parseFloat(fieldValue) < parseFloat(value);
      case "greater than or equal":
        return parseFloat(fieldValue) >= parseFloat(value);
      case "less than or equal":
        return parseFloat(fieldValue) <= parseFloat(value);
      default:
        return true;
    }
  };

  // Evaluate custom view criteria
  const evaluateCustomViewCriteria = (customersList: any[], criteria: any[]) => {
    if (!criteria || criteria.length === 0) {
      return customersList;
    }

    return customersList.filter((customer: any) => {
      return criteria.every((criterion: any) => {
        if (!criterion.field || !criterion.comparator) {
          return true; // Skip incomplete criteria
        }

        const fieldValue = getCustomerFieldValue(customer, criterion.field);
        return evaluateCriterion(fieldValue, criterion.comparator, criterion.value);
      });
    });
  };

  // Filter customers based on selected view
  const filterCustomersByView = (customersList, viewName) => {
    if (viewName === "All Customers") {
      return customersList;
    }

    // Check if it's a custom view
    const customView = customViews.find(v => v.name === viewName);
    if (customView && customView.criteria) {
      return evaluateCustomViewCriteria(customersList, customView.criteria);
    }

    // Default view filters
    switch (viewName) {
      case "Active Customers":
        return customersList.filter(c =>
          (c.status?.toLowerCase() === "active") || c.isActive === true || (!c.status && !c.isInactive)
        );

      case "Inactive Customers":
        return customersList.filter(c =>
          (c.status?.toLowerCase() === "inactive") || c.isInactive === true
        );

      case "CRM Customers":
        return customersList.filter(c =>
          c.customerType === "CRM" || c.source === "CRM"
        );

      case "Duplicate Customers":
        // Find duplicates by name or email
        const nameMap = {};
        const emailMap = {};
        customersList.forEach(c => {
          if (c.name) {
            nameMap[c.name] = (nameMap[c.name] || 0) + 1;
          }
          if (c.email) {
            emailMap[c.email] = (emailMap[c.email] || 0) + 1;
          }
        });
        return customersList.filter(c =>
          (c.name && nameMap[c.name] > 1) || (c.email && emailMap[c.email] > 1)
        );

      case "Customer Portal Enabled":
        return customersList.filter(c =>
          c.enablePortal === true || c.portalStatus === "Enabled"
        );

      case "Customer Portal Disabled":
        return customersList.filter(c =>
          c.enablePortal === false || c.portalStatus === "Disabled" || !c.enablePortal
        );

      case "Overdue Customers":
        return customersList.filter(c => {
          const receivables = parseFloat(c.receivables || 0);
          return receivables > 0;
        });

      case "Unpaid Customers":
        return customersList.filter(c => {
          const receivables = parseFloat(c.receivables || 0);
          return receivables > 0;
        });

      default:
        return customersList;
    }
  };

  // Get filtered and sorted customers
  const getFilteredAndSortedCustomers = () => {
    let filtered = filterCustomersByView(customers, selectedView);

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested properties
        if (sortConfig.key === "name") {
          aValue = a.name || "";
          bValue = b.name || "";
        } else if (sortConfig.key === "companyName") {
          aValue = a.companyName || "";
          bValue = b.companyName || "";
        } else if (sortConfig.key === "receivables") {
          aValue = parseFloat(a.receivables || 0);
          bValue = parseFloat(b.receivables || 0);
        } else if (sortConfig.key === "createdTime") {
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
        } else if (sortConfig.key === "lastModifiedTime") {
          aValue = new Date(a.updatedAt || a.createdAt || 0);
          bValue = new Date(b.updatedAt || b.createdAt || 0);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const displayedCustomers = getFilteredAndSortedCustomers();

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(new Set(displayedCustomers.map(c => c.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (customerId) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toFixed(2);
  };

  const getCustomerIdForNavigation = (customer: any) => {
    const rawId = customer?._id ?? customer?.id;
    if (rawId === undefined || rawId === null) return "";
    return String(rawId).trim();
  };

  const mapCustomerForList = (customer: any) => {
    const customerId = customer?.id ? String(customer.id) : (customer?._id ? String(customer._id) : "");
    if (!customerId) return null;

    let customerName = customer.displayName || customer.name;
    if (!customerName || customerName.trim() === "") {
      const firstName = customer.firstName || "";
      const lastName = customer.lastName || "";
      const companyName = customer.companyName || "";
      if (firstName || lastName) {
        customerName = `${firstName} ${lastName}`.trim();
      } else if (companyName) {
        customerName = companyName.trim();
      } else {
        customerName = "Customer";
      }
    }

    customerName = customerName.trim() || "Customer";

    return {
      ...customer,
      id: customerId,
      _id: customer._id || customerId,
      name: customerName,
      displayName: customer.displayName || customerName || "Customer",
      companyName: pickFirstValue(customer.companyName, customer.company_name),
      email: pickFirstValue(customer.email, customer.emailAddress, customer.contactEmail),
      workPhone: pickFirstValue(customer.workPhone, customer.phone, customer.phoneNumber),
      mobilePhone: pickFirstValue(customer.mobilePhone, customer.mobile, customer.mobileNumber),
      firstName: pickFirstValue(customer.firstName, customer.first_name),
      lastName: pickFirstValue(customer.lastName, customer.last_name),
      source: pickFirstValue(customer.source, customer.customerSource, customer.origin),
      customerNumber: pickFirstValue(
        customer.customerNumber,
        customer.customer_number,
        customer.customerNo,
        customer.customer_no
      ),
      paymentTerms: pickFirstValue(customer.paymentTerms, customer.payment_terms),
      status: pickFirstValue(customer.status, "Active"),
      website: pickFirstValue(customer.website, customer.webSite),
      receivables: Number(customer.receivables ?? customer.accountsReceivable ?? 0),
      unusedCredits: Number(customer.unusedCredits ?? customer.unused_credits ?? 0),
      currency: pickFirstValue(customer.currency, customer.currencyCode, "KES")
    };
  };

  const customersQuery = useQuery({
    queryKey: ["customers", currentPage, itemsPerPage, viewSearchQuery],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if ((import.meta as any).env?.DEV) {
        await waitForBackendReady();
      }

      const cacheParams = { page: currentPage, limit: itemsPerPage, search: viewSearchQuery };
      const cachedPage = getCachedCustomersPage(cacheParams);
      const response = await getCustomersPaginated({
        page: currentPage,
        limit: itemsPerPage,
        search: viewSearchQuery
      });

      const customersArray = Array.isArray(response.data) ? response.data : [];
      setCachedCustomersPage(cacheParams, {
        data: customersArray,
        total: response.total || 0,
        page: response.page || currentPage,
        limit: response.limit || itemsPerPage,
        totalPages: response.totalPages || 0,
      });

      return {
        data: customersArray,
        total: response.total || cachedPage?.total || 0,
        page: response.page || currentPage,
        limit: response.limit || itemsPerPage,
        totalPages: response.totalPages || cachedPage?.totalPages || 0,
      };
    }
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
      if (bulkMoreMenuRef.current && !bulkMoreMenuRef.current.contains(event.target)) {
        setIsBulkMoreMenuOpen(false);
      }
      if (decimalFormatDropdownRef.current && !decimalFormatDropdownRef.current.contains(event.target)) {
        setIsDecimalFormatDropdownOpen(false);
      }
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target)) {
        setIsModuleDropdownOpen(false);
      }
      // Close field and comparator dropdowns when clicking outside
      const isFieldDropdown = event.target.closest('[data-field-dropdown]') ||
        event.target.closest('[data-field-button]');
      if (!isFieldDropdown && Object.keys(isFieldDropdownOpen).length > 0) {
        setIsFieldDropdownOpen({});
      }
      if (!isFieldDropdown && Object.keys(isComparatorDropdownOpen).length > 0) {
        setIsComparatorDropdownOpen({});
      }
      // Close merge customer dropdown when clicking outside
      if (mergeCustomerDropdownRef.current && !mergeCustomerDropdownRef.current.contains(event.target)) {
        setIsMergeCustomerDropdownOpen(false);
      }
      // Close more options dropdown when clicking outside
      if (moreOptionsDropdownRef.current && !moreOptionsDropdownRef.current.contains(event.target)) {
        setIsMoreOptionsDropdownOpen(false);
      }
      // Close search header dropdown when clicking outside
      if (searchHeaderDropdownRef.current && !searchHeaderDropdownRef.current.contains(event.target)) {
        setIsSearchHeaderDropdownOpen(false);
      }
      // Close search modal dropdowns when clicking outside
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (customerTypeDropdownRef.current && !customerTypeDropdownRef.current.contains(event.target)) {
        setIsCustomerTypeDropdownOpen(false);
      }
      // Close receivables dropdown when clicking outside
      if (openReceivablesDropdownId !== null) {
        const dropdownRef = receivablesDropdownRef.current;
        // Check if click is on the button that opens the dropdown
        const clickedElement = event.target.closest('[data-receivables-button]');
        if (dropdownRef && !dropdownRef.contains(event.target) && (!clickedElement || clickedElement.getAttribute('data-customer-id') !== openReceivablesDropdownId)) {
          setOpenReceivablesDropdownId(null);
          setHoveredRowId(null);
        }
      }
    };

    if (isDropdownOpen || isMoreMenuOpen || isBulkMoreMenuOpen || isDecimalFormatDropdownOpen || isModuleDropdownOpen || Object.keys(isFieldDropdownOpen).length > 0 || Object.keys(isComparatorDropdownOpen).length > 0 || isMergeCustomerDropdownOpen || isMoreOptionsDropdownOpen || isSearchTypeDropdownOpen || isFilterDropdownOpen || isStatusDropdownOpen || isCustomerTypeDropdownOpen || openReceivablesDropdownId !== null || isSearchHeaderDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isMoreMenuOpen, isBulkMoreMenuOpen, isDecimalFormatDropdownOpen, isModuleDropdownOpen, isFieldDropdownOpen, isComparatorDropdownOpen, isMergeCustomerDropdownOpen, isMoreOptionsDropdownOpen, isSearchTypeDropdownOpen, isFilterDropdownOpen, isStatusDropdownOpen, isCustomerTypeDropdownOpen, openReceivablesDropdownId, isSearchHeaderDropdownOpen]);

  const handleViewSelect = (view) => {
    setSelectedView(view);
    setIsDropdownOpen(false);
  };

  const handleToggleFavorite = (view, e) => {
    e.stopPropagation();
    const newFavorites = new Set(favoriteViews);
    if (newFavorites.has(view)) {
      newFavorites.delete(view);
    } else {
      newFavorites.add(view);
    }
    setFavoriteViews(newFavorites);
  };

  const handleSaveCustomView = () => {
    if (newViewName.trim()) {
      const newView = {
        id: Date.now().toString(),
        name: newViewName.trim(),
        isFavorite: isFavorite,
        criteria: criteria,
        columns: selectedColumns,
        visibility: visibilityPreference
      };
      setCustomViews([...customViews, newView]);
      setNewViewName("");
      setIsFavorite(false);
      setCriteria([{ id: 1, field: "", comparator: "", value: "" }]);
      setSelectedColumns(["Name"]);
      setVisibilityPreference("only-me");
      setIsModalOpen(false);
      setSelectedView(newView.name);
      if (isFavorite) {
        setFavoriteViews(prev => new Set([...prev, newView.name]));
      }
    }
  };

  const handleAddCriterion = () => {
    setCriteria([...criteria, { id: Date.now(), field: "", comparator: "", value: "" }]);
  };

  const handleRemoveCriterion = (id) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter(c => c.id !== id));
    }
  };

  const handleCriterionChange = (id, field, value) => {
    setCriteria(criteria.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleAddColumn = (column) => {
    if (!selectedColumns.includes(column)) {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const handleRemoveColumn = (column) => {
    if (selectedColumns.length > 1 && column !== "Name") {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    }
  };

  const customerFields = [
    "Name", "Company Name", "Email", "Work Phone", "Mobile Phone", "Phone",
    "Receivables", "Receivables (BCY)", "Unused Credits", "Unused Credits (BCY)",
    "Currency", "Status", "Payment Terms", "Customer Type", "Source", "Website",
    "Notes", "Billing Country", "Shipping Country", "Portal Status",
    "Portal Invitation Accepted Date", "Tax", "First Name", "Last Name"
  ];

  const comparators = [
    "is", "is not", "starts with", "contains", "doesn't contain",
    "is in", "is not in", "is empty", "is not empty"
  ];

  const handleDeleteCustomView = (viewId, e) => {
    e.stopPropagation();
    const updatedViews = customViews.filter(v => v.id !== viewId);
    setCustomViews(updatedViews);
    if (selectedView === customViews.find(v => v.id === viewId)?.name) {
      setSelectedView("All Customers");
    }
  };

  const handleDeleteCustomer = async (customerId, e) => {
    e.stopPropagation();
    setDeleteCustomerId(customerId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteCustomerId) return;

    try {
      setIsDeletingCustomer(true);
      await customersAPI.delete(deleteCustomerId);
      await loadCustomers();
      setSelectedCustomers(prev => {
        const newSet = new Set(prev);
        newSet.delete(deleteCustomerId);
        return newSet;
      });
      setIsDeleteModalOpen(false);
      setDeleteCustomerId(null);
      toast.success("Customer deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete customer: " + (error?.message || "Unknown error."));
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedCustomers.size === 0) return;
    setDeleteCustomerIds(Array.from(selectedCustomers));
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (deleteCustomerIds.length === 0) return;

    try {
      setIsBulkDeletingCustomers(true);
      await customersAPI.bulkDelete(deleteCustomerIds);
      await loadCustomers();
      setSelectedCustomers(new Set());
      setIsBulkDeleteModalOpen(false);
      setDeleteCustomerIds([]);
      toast.success("Customers deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete customers: " + (error?.message || "Unknown error."));
    } finally {
      setIsBulkDeletingCustomers(false);
    }
  };

  useEffect(() => {
    const response = customersQuery.data;
    if (!response) return;

    const mappedCustomers = (response.data || []).map(mapCustomerForList).filter(Boolean);

    startTransition(() => {
      setCustomers(mappedCustomers);
      setTotalItems(response.total || 0);
      setTotalPages(response.totalPages || 0);
    });
    setIsLoading(false);
  }, [customersQuery.data]);

  useEffect(() => {
    setIsLoading(customersQuery.isLoading);
    setIsRefreshing(customersQuery.isFetching);
  }, [customersQuery.isLoading, customersQuery.isFetching]);

  const loadCustomers = useCallback(async () => {
    await customersQuery.refetch();
  }, [customersQuery.refetch]);

  useEffect(() => {
    try {
      localStorage.removeItem("taban_customers_cache");
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith("taban_customers_page_cache_v1:")) {
          keysToClear.push(key);
        }
      }
      keysToClear.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore cache cleanup issues.
    }
    const refreshCustomViews = () => {
      setCustomViews(getCustomViews());
    };
    refreshCustomViews();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void customersQuery.refetch();
        refreshCustomViews();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleCustomersUpdated = () => {
      void customersQuery.refetch();
      setTimeout(() => {
        void customersQuery.refetch();
      }, 800);
    };

    window.addEventListener("customersUpdated", handleCustomersUpdated);

    const handleFocus = () => {
      void customersQuery.refetch();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("customersUpdated", handleCustomersUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [customersQuery.refetch, setCustomViews]);

  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
  const newDropdownRef = useRef<HTMLDivElement>(null);

  // Close new dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
        setIsNewDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsModalOpen(false);
        setNewViewName("");
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  // Close currency dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
    };

    if (isCurrencyDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCurrencyDropdownOpen]);

  // Close customer language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerLanguageDropdownRef.current && !customerLanguageDropdownRef.current.contains(event.target)) {
        setIsCustomerLanguageDropdownOpen(false);
      }
    };

    if (isCustomerLanguageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerLanguageDropdownOpen]);

  const allViews = [...defaultCustomerViews, ...customViews.map(v => v.name)];
  const singleSelectionMergeTargets = useMemo(
    () => customers.filter((customer: any) => !selectedCustomers.has(customer.id)),
    [customers, selectedCustomers]
  );
  const dropdownMergeTargets = useMemo(() => {
    const search = mergeCustomerSearch.toLowerCase();
    return customers.filter((customer: any) =>
      (customer.name || customer.displayName || "").toLowerCase().includes(search)
    );
  }, [customers, mergeCustomerSearch]);

  const handleClearSelection = () => {
    setSelectedCustomers(new Set());
  };

  return {
    allViews, comparators, confirmBulkDelete, confirmDeleteCustomer, customerFields, defaultCustomerViews,
    displayedCustomers, dropdownMergeTargets, evaluateCriterion, evaluateCustomViewCriteria, filterCustomersByView, filteredCurrencies,
    filteredCustomerLanguages, formatCurrency, getCustomerIdForNavigation, getFilteredAndSortedCustomers, handleAddColumn, handleAddCriterion,
    handleBulkDelete, handleClearSelection, handleCriterionChange, handleDeleteCustomView, handleDeleteCustomer, handleRemoveColumn,
    handleRemoveCriterion, handleSaveCustomView, handleSelectAll, handleSelectCustomer, handleSort, handleToggleFavorite,
    handleViewSelect, isNewDropdownOpen, loadCustomers, mapCustomerForList, newDropdownRef, setIsNewDropdownOpen,
    singleSelectionMergeTargets
  };
}
