import React from "react";
import { ArrowUpDown, Check, ChevronDown, ChevronRight, Download, MoreVertical, Plus, RefreshCw, Settings, Upload, X } from "lucide-react";
import { toast } from "react-toastify";

export default function CustomerDetailSidebar(args: any) {
  const {
    selectedCustomers,
    customers,
    handleOpenSidebarCustomer,
    handleSelectAllCustomers,
    bulkActionsDropdownRef,
    isBulkActionsDropdownOpen,
    setIsBulkActionsDropdownOpen,
    handleSidebarBulkUpdate,
    handlePrintCustomerStatements,
    handleSidebarBulkMarkActive,
    handleSidebarBulkMarkInactive,
    handleMergeCustomers,
    handleAssociateTemplates,
    handleSidebarBulkEnableConsolidatedBilling,
    handleSidebarBulkDisableConsolidatedBilling,
    handleSidebarBulkDelete,
    handleClearSelection,
    navigate,
    sidebarMoreMenuRef,
    isSidebarMoreMenuOpen,
    setIsSidebarMoreMenuOpen,
    sidebarSort,
    setSidebarSort,
    reloadSidebarCustomerList,
    sidebarSortedCustomers,
    id,
    handleCustomerCheckboxChange,
    formatCurrency,
  } = args;

  return (
    <div className="flex h-full min-h-0 w-80 flex-col overflow-visible border-r border-gray-200 bg-white">
      {selectedCustomers.length > 0 ? (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={selectedCustomers.length === customers.length} onChange={handleSelectAllCustomers} className="h-4 w-4 cursor-pointer" />
            <div className="relative" ref={bulkActionsDropdownRef}>
              <button
                className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsBulkActionsDropdownOpen(!isBulkActionsDropdownOpen)}
              >
                Bulk Actions
                <ChevronDown size={14} />
              </button>
              {isBulkActionsDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="cursor-pointer px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50" onClick={handleSidebarBulkUpdate}>Bulk Update</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={handlePrintCustomerStatements}>Print Customer Statements</div>
                  <div className="my-1 h-px bg-gray-200"></div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={handleSidebarBulkMarkActive}>Mark as Active</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={handleSidebarBulkMarkInactive}>Mark as Inactive</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={handleMergeCustomers}>Merge</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50" onClick={handleAssociateTemplates}>Associate Templates</div>
                  <div className="my-1 h-px bg-gray-200"></div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={handleSidebarBulkEnableConsolidatedBilling}>Enable Consolidated Billing</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={handleSidebarBulkDisableConsolidatedBilling}>Disable Consolidated Billing</div>
                  <div className="my-1 h-px bg-gray-200"></div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={handleSidebarBulkDelete}>Delete</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded px-2 text-xs font-semibold text-white" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
              {selectedCustomers.length}
            </span>
            <span className="text-sm text-gray-700">Selected</span>
            <button className="cursor-pointer p-1 text-gray-500 hover:text-gray-700" onClick={handleClearSelection}>
              <X size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <button className="flex cursor-pointer items-center gap-2 text-xl font-semibold text-slate-900">
            All Customers
            <ChevronDown size={16} className="text-[#1b5e6a]" />
          </button>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-b-[3px] border-[#0D4A52] bg-[#1b5e6a] text-white shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[4px] hover:brightness-110 active:translate-y-[1px] active:border-b-[1px]"
              onClick={() => navigate("/sales/customers/new")}
            >
              <Plus size={16} />
            </button>
            <div className="relative" ref={sidebarMoreMenuRef}>
              <button
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white text-slate-600 transition-colors hover:bg-gray-50"
                onClick={() => setIsSidebarMoreMenuOpen(!isSidebarMoreMenuOpen)}
              >
                <MoreVertical size={16} />
              </button>
              {isSidebarMoreMenuOpen && (
                <div className="animate-in fade-in slide-in-from-top-1 absolute right-0 top-full z-[110] mt-2 w-60 rounded-lg border border-gray-100 bg-white py-2 shadow-xl duration-200">
                  <div className="group relative flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-all hover:bg-[#156372] hover:text-white">
                    <ArrowUpDown size={16} className="flex-shrink-0 text-[#156372] group-hover:text-white" />
                    <span className="flex-1">Sort by</span>
                    <ChevronRight size={16} className="flex-shrink-0 text-gray-400 group-hover:text-white" />

                    <div className="pointer-events-none absolute left-full top-0 z-[99999] ml-1.5 w-[220px] translate-x-2.5 rounded-lg border border-gray-200 bg-white py-2 opacity-0 shadow-lg transition-all group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
                      <div className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm text-gray-700 transition-all hover:bg-[#156372] hover:text-white" onClick={() => { setSidebarSort("name_asc"); setIsSidebarMoreMenuOpen(false); }}>
                        <span>Customer Name (A-Z)</span>
                        {sidebarSort === "name_asc" && <Check size={16} className="text-[#156372]" />}
                      </div>
                      <div className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm text-gray-700 transition-all hover:bg-[#156372] hover:text-white" onClick={() => { setSidebarSort("name_desc"); setIsSidebarMoreMenuOpen(false); }}>
                        <span>Customer Name (Z-A)</span>
                        {sidebarSort === "name_desc" && <Check size={16} className="text-[#156372]" />}
                      </div>
                      <div className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm text-gray-700 transition-all hover:bg-[#156372] hover:text-white" onClick={() => { setSidebarSort("receivables_desc"); setIsSidebarMoreMenuOpen(false); }}>
                        <span>Receivables (High-Low)</span>
                        {sidebarSort === "receivables_desc" && <Check size={16} className="text-[#156372]" />}
                      </div>
                    </div>
                  </div>

                  <div className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-[#156372] hover:text-white" onClick={() => { setIsSidebarMoreMenuOpen(false); navigate("/sales/customers/import"); }}>
                    <Download size={16} className="flex-shrink-0 text-[#156372] group-hover:text-white" />
                    <span className="flex-1">Import</span>
                  </div>

                  <div className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-[#156372] hover:text-white" onClick={() => { setIsSidebarMoreMenuOpen(false); navigate("/sales/customers", { state: { openExportModal: true } }); }}>
                    <Upload size={16} className="flex-shrink-0 text-[#156372] group-hover:text-white" />
                    <span className="flex-1">Export</span>
                  </div>

                  <div className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-[#156372] hover:text-white" onClick={() => { setIsSidebarMoreMenuOpen(false); navigate("/settings/customers-vendors"); }}>
                    <Settings size={16} className="flex-shrink-0 text-[#156372] group-hover:text-white" />
                    <span className="flex-1">Preferences</span>
                  </div>

                  <div
                    className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-[#156372] hover:text-white"
                    onClick={async () => {
                      setIsSidebarMoreMenuOpen(false);
                      try {
                        await reloadSidebarCustomerList();
                        toast.success("Customer list refreshed");
                      } catch {
                        toast.error("Failed to refresh customer list");
                      }
                    }}
                  >
                    <RefreshCw size={16} className="flex-shrink-0 text-[#156372] group-hover:text-white" />
                    <span className="flex-1">Refresh List</span>
                  </div>

                  <div
                    className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-[#156372] hover:text-white"
                    onClick={() => {
                      setIsSidebarMoreMenuOpen(false);
                      toast.info("Column widths reset to default");
                    }}
                  >
                    <RefreshCw size={16} className="flex-shrink-0 text-[#156372] group-hover:text-white" />
                    <span className="flex-1">Reset Column Width</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sidebarSortedCustomers.map((customerRow: any, index: number) => (
          <div
            key={`${customerRow.id}-${index}`}
            className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 p-3 hover:bg-gray-50 ${
              customerRow.id === id ? "border-l-4 border-l-blue-600 bg-blue-50" : ""
            } ${selectedCustomers.includes(customerRow.id) ? "bg-[#f5f6ff]" : ""}`}
            onClick={() => {
              if (typeof handleOpenSidebarCustomer === "function") {
                handleOpenSidebarCustomer(customerRow);
                return;
              }

              navigate(`/sales/customers/${customerRow.id}`, {
                state: {
                  customer: customerRow,
                  customerList: sidebarSortedCustomers,
                },
              });
            }}
          >
            <input
              type="checkbox"
              checked={selectedCustomers.includes(customerRow.id)}
              onChange={(event) => handleCustomerCheckboxChange(customerRow.id, event)}
              onClick={(event) => event.stopPropagation()}
              className="h-4 w-4 cursor-pointer"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-gray-900">{customerRow.name}</div>
              <div className="text-xs text-gray-600">{formatCurrency(customerRow.receivables, customerRow.currency)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
