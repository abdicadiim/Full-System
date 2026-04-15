import React from "react";
import { ArrowUpDown, Check, ChevronDown, ChevronRight, ChevronUp, Download, Eye, Info, Loader2, MoreVertical, Plus, RefreshCw, Search, Settings, SlidersHorizontal, Star, Trash2, Upload, X } from "lucide-react";

import { preloadCustomerDetailRoute } from "./customerRouteLoaders";

const CUSTOMER_DETAIL_SIDEBAR_CACHE_KEY = "billing_customer_detail_sidebar_seed";
const CUSTOMER_DETAIL_SIDEBAR_SEED_LIMIT = 60;

const toSerializableCustomerState = (value: any) => {
  if (!value || typeof value !== "object") return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

export default function CustomersPageContent({ controller }: { controller: any }) {
  const {
    bulkMoreMenuRef,
    customViews,
    defaultCustomerViews,
    displayedCustomers,
    dropdownRef,
    formatCurrency,
    getCustomerFieldValue,
    getCustomerIdForNavigation,
    handleBulkDelete,
    handleBulkDisableConsolidatedBilling,
    handleBulkEnableConsolidatedBilling,
    handleBulkMarkActive,
    handleBulkMarkInactive,
    handleBulkMerge,
    handleClearSelection,
    handleDeleteCustomView,
    handleExportCurrentView,
    handleManageCustomFields,
    handleOpenBulkUpdate,
    handlePrintStatements,
    handleResetColumnWidths,
    handleSaveLayout,
    handleCancelLayout,
    handleSelectAll,
    handleSelectCustomer,
    handleSort,
    handleViewSelect,
    hasResized,
    hoveredRowId,
    isBulkMoreMenuOpen,
    isDownloading,
    isDropdownOpen,
    isMoreMenuOpen,
    isRefreshing,
    navigate,
    moreMenuRef,
    openReceivablesDropdownId,
    openSearchModalForCurrentContext,
    selectedCustomers,
    selectedView,
    setHoveredRowId,
    setIsBulkMoreMenuOpen,
    setIsCustomizeModalOpen,
    setIsDropdownOpen,
    setIsExportCustomersModalOpen,
    setIsImportContinueLoading,
    setIsImportModalOpen,
    setIsMoreMenuOpen,
    setOpenReceivablesDropdownId,
    setReceivablesDropdownPosition,
    showCustomerSkeletons,
    sortConfig,
    startResizing,
    tableMinWidth,
    tableVisibleColumns,
    viewSearchQuery,
    setViewSearchQuery,
    loadCustomers,
    currentPage,
    itemsPerPage,
  } = controller;

  const navigateToCustomerDetail = (selectedCustomer: any) => {
    void preloadCustomerDetailRoute();
    const customerId = getCustomerIdForNavigation(selectedCustomer);
    if (!customerId) return;

    const safeCustomer = toSerializableCustomerState(selectedCustomer);

    if (typeof window !== "undefined") {
      try {
        const selectedCustomerId = String(selectedCustomer?._id ?? selectedCustomer?.id ?? "").trim();
        const sidebarSeed: any[] = [];

        if (safeCustomer) {
          sidebarSeed.push(safeCustomer);
        }

        for (const row of Array.isArray(displayedCustomers) ? displayedCustomers : []) {
          const rowId = String(row?._id ?? row?.id ?? "").trim();
          if (!rowId || rowId === selectedCustomerId) continue;
          sidebarSeed.push(toSerializableCustomerState(row));
          if (sidebarSeed.length >= CUSTOMER_DETAIL_SIDEBAR_SEED_LIMIT) break;
        }

        sessionStorage.setItem(CUSTOMER_DETAIL_SIDEBAR_CACHE_KEY, JSON.stringify(sidebarSeed));
      } catch {
      }
    }

    navigate(`/sales/customers/${String(customerId)}`, {
      state: {
        customer: safeCustomer,
      },
    });
  };

  return (
    <>      {/* Header - Show Bulk Actions Bar when items are selected, otherwise show normal header */}
      {selectedCustomers.size > 0 ? (
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white z-30">
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={handleOpenBulkUpdate}
            >
              Bulk Update
            </button>

            <button
              className={`h-[34px] w-[34px] flex items-center justify-center bg-white border border-gray-200 rounded-md transition-all hover:bg-gray-50 ${isDownloading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              onClick={handlePrintStatements}
              title="Download PDF"
              aria-label="Download PDF"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 size={16} className="text-gray-600 animate-spin" />
              ) : (
                <Download size={16} className="text-gray-600" />
              )}
            </button>

            <div className="mx-2 h-6 w-px bg-gray-200" aria-hidden />

            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={handleBulkMarkActive}
            >
              Mark as Active
            </button>
            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={handleBulkMarkInactive}
            >
              Mark as Inactive
            </button>
            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={handleBulkMerge}
            >
              Merge
            </button>
            <div className="relative" ref={bulkMoreMenuRef}>
              <button
                className="h-[34px] w-[34px] flex items-center justify-center bg-white border border-gray-200 rounded-md cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => setIsBulkMoreMenuOpen(!isBulkMoreMenuOpen)}
                aria-label="More"
                title="More"
              >
                <MoreVertical size={16} className="text-gray-600" />
              </button>

              {isBulkMoreMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[110] py-2">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsBulkMoreMenuOpen(false);
                      handleBulkEnableConsolidatedBilling();
                    }}
                  >
                    Enable Consolidated Billing
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsBulkMoreMenuOpen(false);
                      handleBulkDisableConsolidatedBilling();
                    }}
                  >
                    Disable Consolidated Billing
                  </button>
                  <div className="my-2 h-px bg-gray-200" />
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => {
                      setIsBulkMoreMenuOpen(false);
                      handleBulkDelete();
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-[#156372] rounded text-[13px] font-semibold text-white">{selectedCustomers.size}</span>
              <span className="text-sm text-gray-700">Selected</span>
            </div>
            <span className="text-xs text-gray-400">Esc</span>
            <button
              onClick={handleClearSelection}
              className="text-red-500 hover:text-red-600"
              aria-label="Clear selection"
              title="Clear selection"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        /* Normal Page Header */
        <div className="flex-none flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white z-30">
          <div className="flex items-center gap-6 pl-4">
            {/* Title with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 py-4 cursor-pointer group border-b-2 border-slate-900 -mb-[px]"
              >
                <h1 className="text-[15px] font-bold text-slate-900 transition-colors">
                  {selectedView}
                </h1>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                  style={{ color: "#1b5e6a" }}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[300px] flex flex-col max-h-[500px] overflow-hidden">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search views..."
                      value={viewSearchQuery}
                      onChange={(e) => setViewSearchQuery(e.target.value)}
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                    />
                  </div>

                  {/* View Options Scroll Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                    {/* System Views */}
                    <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                      System Views
                    </div>
                    {defaultCustomerViews
                      .filter(view => view.toLowerCase().includes(viewSearchQuery.toLowerCase()))
                      .map((view) => (
                        <div
                          key={view}
                          onClick={() => handleViewSelect(view)}
                          className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all ${selectedView === view ? "bg-[#15637210] text-[#156372] font-bold" : "text-gray-900 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Eye size={16} className={selectedView === view ? "text-[#156372]" : "text-gray-400 opacity-40"} />
                            <span>{view}</span>
                          </div>
                          {selectedView === view && <Check size={14} className="text-[#156372]" />}
                        </div>
                      ))}

                    {/* Custom Views */}
                    {customViews
                      .filter(view => view.name.toLowerCase().includes(viewSearchQuery.toLowerCase()))
                      .length > 0 && (
                        <div className="mt-4">
                          <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                            Custom Views
                          </div>
                          {customViews
                            .filter(view => view.name.toLowerCase().includes(viewSearchQuery.toLowerCase()))
                            .map((view) => (
                              <div
                                key={view.id}
                                className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all ${selectedView === view.name ? "bg-[#15637210] text-[#156372] font-bold" : "text-gray-900 hover:bg-gray-50"
                                  }`}
                                onClick={() => handleViewSelect(view.name)}
                              >
                                <div className="flex items-center gap-3">
                                  <Star
                                    size={14}
                                    className={view.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                                  />
                                  <span className="truncate max-w-[160px]">{view.name}</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => handleDeleteCustomView(view.id, e)}
                                    className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                  {selectedView === view.name && <Check size={14} className="text-[#156372]" />}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-2 mr-4">
            <button
              className="h-[38px] min-w-[100px] cursor-pointer transition-all text-white px-5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
              onClick={() => navigate("/sales/customers/new")}
            >
              <Plus size={16} /> <span className="hidden sm:inline">New</span>
            </button>


            <div className="relative" ref={moreMenuRef}>
              <button
                className="h-[38px] flex items-center justify-center p-2 bg-white border border-gray-300 border-b-[4px] rounded-lg hover:bg-gray-50 transition-all hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              >
                <MoreVertical size={18} className="text-gray-500" />
              </button>


              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <ArrowUpDown size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Sort by</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Sort by Submenu - shown via CSS hover */}
                    <div className="absolute top-0 right-full mr-1.5 w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "name" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("name");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Name
                        {sortConfig.key === "name" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "customerNumber" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("customerNumber");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Customer Number
                        {sortConfig.key === "customerNumber" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "companyName" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("companyName");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Company Name
                        {sortConfig.key === "companyName" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "receivables" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("receivables");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Receivables (BCY)
                        {sortConfig.key === "receivables" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "createdTime" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("createdTime");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Created Time
                        {sortConfig.key === "createdTime" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "lastModifiedTime" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("lastModifiedTime");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Last Modified Time
                        {sortConfig.key === "lastModifiedTime" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <Download size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Import</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Import Submenu */}
                    <div className="absolute top-0 right-full mr-1.5 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={() => {
                          setIsImportContinueLoading(false);
                          setIsImportModalOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Import Customers
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <Upload size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Export</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Export Submenu */}
                    <div className="absolute top-0 right-full mr-1.5 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={() => {
                          setIsExportCustomersModalOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Export Customers
                      </div>
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={handleExportCurrentView}
                      >
                        Export Current View
                      </div>
                    </div>
                  </div>
                  <div
                    className="group flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      navigate("/settings/customers-vendors");
                    }}
                  >
                    <Settings size={16} className="text-[#156372] group-hover:text-white flex-shrink-0" />
                    <span className="flex-1">Preferences</span>
                  </div>
                  <div
                    className="group flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white"
                    onClick={async () => {
                      setIsMoreMenuOpen(false);
                      try {
                        await loadCustomers(currentPage, itemsPerPage, { rowRefreshOnly: true });
                      } catch (error) {
                      }
                    }}
                  >
                    <RefreshCw size={16} className={`text-[#156372] group-hover:text-white flex-shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span className="flex-1">Refresh List</span>
                  </div>
                  <div
                    className="group flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white"
                    onClick={() => {
                      handleResetColumnWidths();
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    <RefreshCw size={16} className="text-[#156372] group-hover:text-white flex-shrink-0" />
                    <span className="flex-1">Reset Column Width</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}




      {/* Resizing Save Banner */}
      {
        hasResized && (
          <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md animate-in slide-in-from-top-1 duration-300">
            <div className="flex items-center gap-3">
              <Info size={16} className="text-[#156372]" />
              <span className="text-sm text-[#156372]">You have resized the columns. Would you like to save the changes?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveLayout}
                className="px-3 py-1.5 bg-[#10b981] text-white text-xs font-medium rounded hover:bg-[#059669] transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancelLayout}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      }

      {/* Table Container */}
      {/* Mobile Card View (Mockup Style) */}
      <div className="block sm:hidden bg-white overflow-hidden mb-8">
        <div className="divide-y divide-gray-100">
          {showCustomerSkeletons ? Array(3).fill(0).map((_, index) => (
            <div key={`mobile-skeleton-${index}`} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-3/5 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/5" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-2 bg-gray-100 rounded w-12" />
              </div>
            </div>
          )) : displayedCustomers.map((customer, index) => {
            const receivables = parseFloat(customer.receivables || 0);
            const unusedCredits = parseFloat(customer.unusedCredits || 0);
            const isInactiveCustomer = customer.status?.toLowerCase() === "inactive" || customer.isInactive === true;
            const initials = (customer.name || customer.displayName || 'C')
              .split(' ')
              .map(n => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={`${customer.id}-${index}`}
                onPointerDown={() => {
                  void preloadCustomerDetailRoute();
                }}
                onClick={() => {
                  navigateToCustomerDetail(customer);
                }}
                className="flex items-center gap-3 p-4 active:bg-slate-50 transition-colors"
              >
                {/* Avatar with Status */}
                <div className="relative flex-shrink-0">
                  {customer.imageUrl ? (
                    <img src={customer.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#156372] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {initials}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${customer.status?.toLowerCase() === 'active' || !customer.status ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>

                {/* Name and Company Section */}
                <div className="flex-1 min-w-0">
                  <div className={`${isInactiveCustomer ? "text-slate-400" : "text-slate-900"} font-bold truncate text-[15px]`}>
                    {customer.name || customer.displayName || 'Customer'}
                  </div>
                  <div className="text-slate-400 text-xs truncate">
                    {customer.companyName || 'No Company'}
                  </div>
                </div>

                {/* Financial Metric Section */}
                <div className="flex items-center gap-3">
                  {unusedCredits > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <div className="text-gray-400 font-medium text-[12px] leading-tight">{formatCurrency(receivables)}</div>
                        <div className="text-gray-400 font-bold text-[8px] uppercase tracking-wider">RECEIVABLES</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-[#10b981] font-bold text-[14px] leading-tight">{formatCurrency(unusedCredits)}</div>
                        <div className="text-[#10b981] font-bold text-[8px] uppercase tracking-wider whitespace-nowrap">UNUSED CREDITS</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="text-slate-900 font-bold text-[14px] leading-tight">{formatCurrency(receivables)}</div>
                      <div className="text-[#156372] font-bold text-[8px] uppercase tracking-wider">RECEIVABLES</div>
                    </div>
                  )}
                </div>

                {/* Right Arrow */}
                <ChevronRight size={18} className="text-slate-300 ml-1 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white min-h-0 custom-scrollbar">
        {/* Table */}
        <table
          className="w-full text-left border-collapse text-[13px] table-fixed"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead className="bg-[#f6f7fb] sticky top-0 z-20 border-b border-[#e6e9f2]">
            <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
              {/* Settings Dropdown Column */}
              <th className="px-4 py-3 w-16 min-w-[64px]">
                <div className="flex items-center gap-2 relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomizeModalOpen(true);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    title="Manage columns"
                    aria-label="Manage columns"
                  >
                    <SlidersHorizontal size={13} style={{ color: "#1b5e6a" }} />
                  </button>
                  <div className="h-5 w-px bg-gray-200" />
                  <input
                    type="checkbox"
                    checked={selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0}
                    onChange={handleSelectAll}
                    style={{ accentColor: "#1b5e6a" }}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer focus:ring-0"
                  />
                </div>
              </th>

              {tableVisibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 relative group/header cursor-pointer select-none ${col.key !== 'name' && col.key !== 'receivables_bcy' && col.key !== 'companyName' ? 'hidden md:table-cell' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => col.key === 'name' ? handleSort('name') : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{col.label}</span>
                      {col.key === 'name' && (
                        sortConfig.key === "name" ? (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={12} className="text-[#156372]" /> :
                            <ChevronDown size={12} className="text-[#156372]" />
                        ) : (
                          <ArrowUpDown size={10} className="text-gray-400 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                        )
                      )}
                    </div>
                  </div>

                  {/* Column resize handle */}
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={(e) => startResizing(col.key, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize opacity-0 group-hover/header:opacity-100 transition-opacity"
                    title="Drag to resize"
                  >
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-[#7b8494]/60" />
                  </div>
                </th>
              ))}

              <th className="px-4 py-3 w-12 sticky right-0 bg-[#f6f7fb]">
                <div className="flex items-center justify-center">
                  <Search
                    size={14}
                    className="text-gray-300 cursor-pointer transition-colors hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSearchModalForCurrentContext();
                    }}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {showCustomerSkeletons ? (
              Array(4).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-50">
                  <td className="px-4 py-3 w-16">
                    <div className="h-4 w-4 bg-gray-100 rounded mx-auto" />
                  </td>
                  {tableVisibleColumns.map((col, idx) => (
                    <td key={idx} className="px-4 py-3" style={{ width: col.width }}>
                      <div className={`h-4 bg-gray-100 rounded ${idx === 0 ? 'w-3/4' : 'w-1/2'}`} />
                    </td>
                  ))}
                  <td className="px-4 py-3 w-12 sticky right-0 bg-white" />
                </tr>
              ))
            ) : (
              displayedCustomers.map((customer, index) => {
                const isSelected = selectedCustomers.has(customer.id);
                const isInactiveCustomer = customer.status?.toLowerCase() === "inactive" || customer.isInactive === true;
                return (
                  <tr
                    key={`${customer.id}-${index}`}
                    onMouseEnter={() => {
                      setHoveredRowId(customer.id);
                    }}
                    onPointerDown={() => {
                      void preloadCustomerDetailRoute();
                    }}
                    onMouseLeave={() => {
                      if (openReceivablesDropdownId !== customer.id) {
                        setHoveredRowId(null);
                      }
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('input[type="checkbox"]') ||
                        target.closest('button') ||
                        target.closest('[data-receivables-button]')) {
                        return;
                      }
                      navigateToCustomerDetail(customer);
                    }}
                    className="text-[13px] group transition-all hover:bg-[#f8fafc] cursor-pointer h-[50px] border-b border-[#eef1f6]"
                    style={isSelected ? { backgroundColor: "#1b5e6a1A" } : {}}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 shrink-0" aria-hidden />
                        <span className="h-5 w-px shrink-0 bg-transparent" aria-hidden />
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectCustomer(customer.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer focus:ring-0"
                          style={{ accentColor: "#1b5e6a" }}
                        />
                      </div>
                    </td>

                    {tableVisibleColumns.map(col => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 truncate ${col.key !== 'name' && col.key !== 'receivables_bcy' && col.key !== 'companyName' ? 'hidden sm:table-cell' : ''}`}
                        style={{ width: col.width, maxWidth: col.width }}
                      >
                        {col.key === 'name' ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[#1b5e6a] font-medium truncate">
                                {customer.name || customer.displayName || 'Customer'}
                              </span>
                              <span className="text-[11px] text-gray-400 truncate md:hidden">{customer.email || 'No email provided'}</span>
                            </div>
                          </div>
                        ) : col.key === 'receivables' || col.key === 'receivables_bcy' ? (
                          <span className="text-[13px] text-gray-700 font-medium">{formatCurrency(customer.receivables || customer.receivables_bcy)}</span>
                        ) : col.key === 'unusedCredits' || col.key === 'unused_credits_bcy' ? (
                          <span className="text-[13px] text-gray-700">{formatCurrency(customer.unusedCredits || customer.unused_credits_bcy)}</span>
                        ) : (
                          <span className="text-[13px] text-gray-700">{getCustomerFieldValue(customer, col.key)}</span>
                        )}
                      </td>
                    ))}

                    <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors">
                      {(hoveredRowId === customer.id || openReceivablesDropdownId === customer.id) && (
                        <div className="flex justify-center">
                          <button
                            data-receivables-button
                            data-customer-id={customer.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              const button = e.currentTarget;
                              const rect = button.getBoundingClientRect();
                              setReceivablesDropdownPosition({
                                top: rect.bottom + 4,
                                left: rect.right - 120
                              });
                              setOpenReceivablesDropdownId(openReceivablesDropdownId === customer.id ? null : customer.id);
                            }}
                            className="flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full cursor-pointer transition-all hover:bg-gray-50"
                          >
                            <ChevronDown size={14} className="text-slate-500" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>


    </>
  );
}

