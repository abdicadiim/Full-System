import React from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";

const TableRowSkeleton = ({ columns }: { columns: any[] }) => (
  <>
    {[...Array(8)].map((_, i) => (
      <tr key={i} className="animate-pulse border-b border-[#eef1f6] h-[50px]">
        <td className="px-4 py-3 w-16">
          <div className="h-4 w-4 bg-gray-100 rounded mx-auto" />
        </td>
        {columns.map((col, idx) => (
          <td
            key={idx}
            className="px-4 py-3"
            style={{ width: col.width }}
          >
            <div className={`h-4 bg-gray-100 rounded ${idx === 0 ? "w-3/4" : "w-1/2"}`} />
          </td>
        ))}
        <td className="px-4 py-3 w-12 sticky right-0 bg-white/95 backdrop-blur-sm" />
      </tr>
    ))}
  </>
);

export default function CustomersMainContent({ controller }: { controller: any }) {
  const {
    currentPage,
    displayedCustomers = [],
    formatCurrency,
    getCustomerFieldValue,
    getCustomerIdForNavigation,
    handleBulkMarkActive,
    handleBulkMarkInactive,
    handleBulkMerge,
    handleClearSelection,
    handleOpenBulkUpdate,
    handlePrintStatements,
    handleResetColumnWidths,
    handleSelectAll,
    handleSelectCustomer,
    handleSort,
    hasResized,
    isDownloading,
    isLoading,
    isMoreMenuOpen,
    isRefreshing,
    itemsPerPage,
    loadCustomers,
    navigate,
    openSearchModalForCurrentContext,
    selectedColumns,
    selectedCustomers,
    selectedView,
    setIsExportCustomersModalOpen,
    setIsImportContinueLoading,
    setIsImportModalOpen,
    setIsMoreMenuOpen,
    setReceivablesDropdownPosition,
    sortConfig,
    visibleColumns = [],
  } = controller as any;

  const selectedCount = selectedCustomers?.size ?? 0;
  const showSkeletonRows = Boolean((isLoading || isRefreshing) && displayedCustomers.length === 0);

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] w-full bg-white font-sans text-gray-800 antialiased relative overflow-hidden">
      <div className="flex-none flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-white z-30">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="truncate text-[15px] font-bold text-slate-900">
            {selectedView || "Customers"}
          </h1>
          {selectedCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-[#156372] px-2.5 py-1 text-xs font-semibold text-white">
              {selectedCount} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 ? (
            <>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={handleClearSelection}
              >
                <X size={14} />
                Clear
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={handleOpenBulkUpdate}
              >
                Bulk Update
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={handleBulkMarkActive}
              >
                Mark Active
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={handleBulkMarkInactive}
              >
                Mark Inactive
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={handleBulkMerge}
              >
                Merge
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={handlePrintStatements}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                PDF
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={openSearchModalForCurrentContext}
              >
                <Search size={14} />
                Search
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-[#0d4a52] bg-gradient-to-b from-[#156372] to-[#0d4a52] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
                onClick={() => navigate("/sales/customers/new")}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New</span>
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              aria-label="More"
            >
              <MoreVertical size={16} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full z-[110] mt-2 w-56 rounded-lg border border-gray-100 bg-white py-2 shadow-xl">
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setIsImportContinueLoading(false);
                    setIsImportModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                >
                  Import Customers
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setIsExportCustomersModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                >
                  Export Customers
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    navigate("/settings/customers-vendors");
                  }}
                >
                  Preferences
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={async () => {
                    setIsMoreMenuOpen(false);
                    await loadCustomers(currentPage, itemsPerPage, { rowRefreshOnly: true });
                  }}
                >
                  Refresh List
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    handleResetColumnWidths();
                    setIsMoreMenuOpen(false);
                  }}
                >
                  Reset Column Width
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasResized && (
        <div className="mx-6 mt-4 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 p-3 animate-in slide-in-from-top-1 duration-300">
          <div className="flex items-center gap-3">
            <Settings size={16} className="text-[#156372]" />
            <span className="text-sm text-[#156372]">
              You have resized the columns. Would you like to save the changes?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={controller.handleSaveLayout}
              className="rounded-md bg-[#10b981] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#059669]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={controller.handleCancelLayout}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 bg-[#f6f7fb]">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedCount > 0 && selectedCount === displayedCustomers.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              {visibleColumns.map((col: any) => (
                <th
                  key={col.key}
                  className="group relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                  style={{ width: col.width, maxWidth: col.width }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="truncate">{col.label || col.key}</span>
                    {sortConfig?.key === col.key ? (
                      sortConfig.direction === "asc" ? (
                        <ChevronUp size={12} className="text-[#156372]" />
                      ) : (
                        <ChevronDown size={12} className="text-[#156372]" />
                      )
                    ) : (
                      <ArrowUpDown size={10} className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                </th>
              ))}
              <th className="w-12 px-4 py-3 text-left">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={openSearchModalForCurrentContext}
                >
                  <Search size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {showSkeletonRows ? (
              <TableRowSkeleton columns={visibleColumns} />
            ) : (
              displayedCustomers.map((customer: any, index: number) => {
                const customerId = getCustomerIdForNavigation(customer) ?? customer.id ?? index;
                const isSelected = selectedCustomers?.has?.(customer.id) ?? false;
                return (
                  <tr
                    key={`${customerId}-${index}`}
                    className={`cursor-pointer border-b border-[#eef1f6] text-[13px] transition-all hover:bg-[#f8fafc] ${isSelected ? "bg-[#1b5e6a1A]" : ""}`}
                    onClick={() => {
                      if (customerId !== undefined && customerId !== null) {
                        navigate(`/sales/customers/${String(customerId)}`, { state: { customer } });
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectCustomer(customer.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                        style={{ accentColor: "#1b5e6a" }}
                      />
                    </td>

                    {visibleColumns.map((col: any) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 truncate ${col.key !== "name" && col.key !== "receivables_bcy" && col.key !== "companyName" ? "hidden sm:table-cell" : ""}`}
                        style={{ width: col.width, maxWidth: col.width }}
                      >
                        {col.key === "name" ? (
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium text-[#1b5e6a]">
                              {customer.name || customer.displayName || "Customer"}
                            </span>
                            <span className="truncate text-[11px] text-gray-400 md:hidden">
                              {customer.email || "No email provided"}
                            </span>
                          </div>
                        ) : col.key === "receivables" || col.key === "receivables_bcy" ? (
                          <span className="font-medium text-gray-700">
                            {formatCurrency ? formatCurrency(customer.receivables || customer.receivables_bcy) : String(customer.receivables || customer.receivables_bcy || "")}
                          </span>
                        ) : col.key === "unusedCredits" || col.key === "unused_credits_bcy" ? (
                          <span className="text-gray-700">
                            {formatCurrency ? formatCurrency(customer.unusedCredits || customer.unused_credits_bcy) : String(customer.unusedCredits || customer.unused_credits_bcy || "")}
                          </span>
                        ) : (
                          <span className="text-gray-700">{getCustomerFieldValue(customer, col.key)}</span>
                        )}
                      </td>
                    ))}

                    <td className="sticky right-0 bg-white/95 px-4 py-3 backdrop-blur-sm transition-colors group-hover:bg-[#f8fafc]">
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-500 hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          const customerIdString = String(customerId);
                          setReceivablesDropdownPosition({
                            top: 0,
                            left: 0,
                          });
                          navigate(`/sales/customers/${customerIdString}`, { state: { customer } });
                        }}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
