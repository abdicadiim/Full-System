import React from "react";
import { AlertTriangle, ChevronDown, Edit, Eye, EyeOff, Info, Loader2, Lock, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "react-toastify";

const CUSTOMER_EDIT_PRELOAD_PREFIX = "billing_customer_edit_preload:";

const toSerializableCustomerState = (value: any) => {
  if (!value || typeof value !== "object") return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    const safeCopy: Record<string, any> = {};
    Object.entries(value).forEach(([key, entry]) => {
      if (typeof entry === "function") return;
      try {
        safeCopy[key] = JSON.parse(JSON.stringify(entry));
      } catch {
        if (entry === null || ["string", "number", "boolean"].includes(typeof entry)) {
          safeCopy[key] = entry;
        }
      }
    });
    return safeCopy;
  }
};

export default function CustomersSecondaryModals({ controller }: { controller: any }) {
  const {
    activePreferencesTab,
    bulkConsolidatedAction,
    columnSearch,
    columns,
    confirmBulkConsolidatedBilling,
    confirmBulkDelete,
    confirmDeleteCustomer,
    customers,
    customFields,
    decimalFormatDropdownRef,
    decimalFormatOptions,
    deleteCustomerIds,
    displayedCustomers,
    dropdownMergeTargets,
    exportData,
    handleExportCustomers,
    handleExportSubmit,
    handleMergeContinue,
    handleReorder,
    handleSaveLayout,
    handleToggleColumn,
    handleTogglePasswordVisibility,
    importType,
    isBulkConsolidatedUpdating,
    isBulkDeleteModalOpen,
    isBulkDeletingCustomers,
    isCustomizeModalOpen,
    isDecimalFormatDropdownOpen,
    isDeleteModalOpen,
    isDeletingCustomer,
    isExportCurrentViewModalOpen,
    isExportCustomersModalOpen,
    isFieldCustomizationOpen,
    isImportContinueLoading,
    isImportModalOpen,
    isMergeCustomerDropdownOpen,
    isMergeModalOpen,
    isModuleDropdownOpen,
    isPreferencesOpen,
    mergeCustomerDropdownRef,
    mergeCustomerSearch,
    mergeTargetCustomer,
    moduleDropdownRef,
    moduleOptions,
    navigate,
    openReceivablesDropdownId,
    preferences,
    receivablesDropdownPosition,
    receivablesDropdownRef,
    selectedCustomers,
    setActivePreferencesTab,
    setBulkConsolidatedAction,
    setColumnSearch,
    setDeleteCustomerId,
    setDeleteCustomerIds,
    setExportData,
    setHoveredRowId,
    setImportType,
    setIsBulkDeleteModalOpen,
    setIsCustomizeModalOpen,
    setIsDecimalFormatDropdownOpen,
    setIsDeleteModalOpen,
    setIsExportCurrentViewModalOpen,
    setIsExportCustomersModalOpen,
    setIsFieldCustomizationOpen,
    setIsImportContinueLoading,
    setIsImportModalOpen,
    setIsMergeCustomerDropdownOpen,
    setIsMergeModalOpen,
    setIsModuleDropdownOpen,
    setIsPreferencesOpen,
    setMergeCustomerSearch,
    setMergeTargetCustomer,
    setOpenReceivablesDropdownId,
    setPreferences,
  } = controller;

  return (
    <>      {/* Export Current View Modal */}
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

      {/* Export Customers Modal */}
      {
        isExportCustomersModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsExportCustomersModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg w-[90%] max-w-[600px] max-h-[90vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between py-5 px-6 border-b border-gray-200">
                <h2 className="m-0 text-xl font-semibold text-gray-900">Export Customers</h2>
                <button
                  className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-blue-600 transition-colors hover:text-red-500"
                  onClick={() => setIsExportCustomersModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* Info Box */}
                <div className="flex items-start gap-3 py-3 px-4 bg-blue-50 rounded-md mb-6 text-sm text-blue-900">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <span>You can export your data from Zoho Books in CSV, XLS or XLSX format.</span>
                </div>

                {/* Module */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative mb-3" ref={moduleDropdownRef}>
                    <div
                      className="flex items-center justify-between py-2.5 px-3 border border-gray-300 rounded-md bg-white cursor-pointer text-sm text-gray-700 transition-colors hover:border-gray-400"
                      onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                    >
                      <span>{exportData.module}</span>
                      <ChevronDown size={16} />
                    </div>
                    {isModuleDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1000] max-h-[300px] overflow-y-auto">
                        {moduleOptions.map((option) => (
                          <div
                            key={option}
                            className="py-2.5 px-3 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setExportData(prev => ({
                                ...prev,
                                module: option,
                                dataScope: `All ${option}`, // Update data scope when module changes
                                moduleType: option === "Customers" ? "Customers" : prev.moduleType // Reset module type if not Customers
                              }));
                              setIsModuleDropdownOpen(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Module Type Radio Buttons - Only show for Customers module */}
                  {exportData.module === "Customers" && (
                    <div className="flex flex-col gap-2 mt-2">
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customers"
                          checked={exportData.moduleType === "Customers"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customers</span>
                      </label>
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customer's Contact Persons"
                          checked={exportData.moduleType === "Customer's Contact Persons"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customer's Contact Persons</span>
                      </label>
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customer's Addresses"
                          checked={exportData.moduleType === "Customer's Addresses"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customer's Addresses</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Data Scope */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Scope
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="dataScope"
                        value={`All ${exportData.module}`}
                        checked={exportData.dataScope === `All ${exportData.module}`}
                        onChange={(e) => setExportData(prev => ({ ...prev, dataScope: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>All {exportData.module}</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="dataScope"
                        value="Specific Period"
                        checked={exportData.dataScope === "Specific Period"}
                        onChange={(e) => setExportData(prev => ({ ...prev, dataScope: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>Specific Period</span>
                    </label>
                  </div>
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
                  {/* Include PII Checkbox */}
                  <div className="mt-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportData.includePII}
                        onChange={(e) => setExportData(prev => ({ ...prev, includePII: e.target.checked }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">Include Sensitive Personally Identifiable Information (PII) while exporting.</span>
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
                  <strong>Note:</strong> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{" "}
                  <a href="#" className="text-blue-600 no-underline font-medium hover:underline">Backup Your Data</a>
                </div>
              </div>
              <div className="flex items-center justify-start gap-3 py-5 px-6 border-t border-gray-200">
                <button
                  className="py-2.5 px-5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#0f4f5a]"
                  onClick={handleExportCustomers}
                >
                  Export
                </button>
                <button
                  className="py-2.5 px-5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsExportCustomersModalOpen(false)}
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
                  const customer = displayedCustomers.find(c => c.id === openReceivablesDropdownId);
                  const customerId = String(
                    customer?._id || customer?.id || openReceivablesDropdownId || ""
                  ).trim();
                  const safeCustomer = toSerializableCustomerState(customer);

                  if (customerId && typeof window !== "undefined") {
                    try {
                      sessionStorage.setItem(
                        `${CUSTOMER_EDIT_PRELOAD_PREFIX}${customerId}`,
                        JSON.stringify(safeCustomer)
                      );
                    } catch {
                    }
                  }

                  navigate(`/sales/customers/${customerId || openReceivablesDropdownId}/edit`, {
                    state: customerId
                      ? {
                          customer: safeCustomer,
                          returnTo: "/sales/customers",
                        }
                      : undefined,
                  });
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
        )
      }

      {/* Preferences Sidebar */}
      {
        (isPreferencesOpen || isFieldCustomizationOpen) && (
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
        )
      }

      {/* Import Customers Modal */}
      {
        isImportModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => {
            setIsImportContinueLoading(false);
            setIsImportModalOpen(false);
          }}>
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
        )
      }
      {
        isCustomizeModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
              <div className="bg-white rounded shadow-2xl w-[500px] max-h-[85vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#f6f7fb] border-b border-[#e6e9f2]">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[#1b5e6a]" />
                    <h3 className="text-[15px] font-medium text-[#313131]">Customize Columns</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-gray-600">
                      {columns.filter((c) => c.visible).length} of {columns.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomizeModalOpen(false)}
                      className="h-6 w-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition-colors"
                      aria-label="Close"
                      title="Close"
                    >
                      <X size={16} className="text-red-500" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-50">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full bg-white border border-gray-200 rounded py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-400 transition-all placeholder:text-gray-400 text-gray-700"
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Columns List */}
              <div className="flex-1 overflow-y-auto px-4 py-2 bg-[#fcfcfc] scrollbar-thin scrollbar-thumb-gray-200">
                <div className="space-y-1.5">
                  {columns
                    .filter(c => c.label.toLowerCase().includes(columnSearch.toLowerCase()))
                    .map((col, index) => (
                      <div
                        key={col.key}
                        draggable={col.key !== 'name'}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          handleReorder(dragIndex, index);
                        }}
                        className={`flex items-center gap-3 p-2 rounded transition-all ${col.key === 'name' ? 'bg-[#f4f4f4] border-transparent cursor-default py-3' : 'bg-[#fff] border border-transparent hover:border-gray-200 hover:bg-gray-50/50'}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`cursor-grab active:cursor-grabbing text-gray-400 flex-shrink-0 ${col.key === 'name' ? 'invisible' : ''}`}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="2" cy="2" r="1" fill="currentColor" />
                              <circle cx="2" cy="6" r="1" fill="currentColor" />
                              <circle cx="2" cy="10" r="1" fill="currentColor" />
                              <circle cx="6" cy="2" r="1" fill="currentColor" />
                              <circle cx="6" cy="6" r="1" fill="currentColor" />
                              <circle cx="6" cy="10" r="1" fill="currentColor" />
                            </svg>
                          </div>

                          <div className="flex items-center gap-3">
                            {col.key === 'name' ? (
                              <Lock size={14} className="text-gray-400" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={col.visible}
                                onChange={() => handleToggleColumn(col.key)}
                                className="cursor-pointer h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                              />
                            )}
                            <span className={`text-sm ${col.key === 'name' ? 'text-gray-500' : 'text-gray-700'}`}>
                              {col.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-start gap-2 bg-white sticky bottom-0">
                <button
                  onClick={() => {
                    handleSaveLayout();
                    setIsCustomizeModalOpen(false);
                  }}
                  className="px-5 py-2 bg-[#156372] text-white rounded text-sm font-medium hover:bg-[#0f4f5a] transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsCustomizeModalOpen(false)}
                  className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-all"
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

