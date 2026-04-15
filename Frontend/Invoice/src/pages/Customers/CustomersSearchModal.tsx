import React from "react";
import { ChevronDown, Search, X } from "lucide-react";

export default function CustomersSearchModal({ controller }: { controller: any }) {
  const {
    accountDropdownRef,
    adjustmentTypeDropdownRef,
    customerNameDropdownRef,
    customerTypeDropdownRef,
    filterDropdownRef,
    getSearchFilterOptions,
    isAccountDropdownOpen,
    isAdjustmentTypeDropdownOpen,
    isCustomerNameDropdownOpen,
    isCustomerTypeDropdownOpen,
    isFilterDropdownOpen,
    isItemNameDropdownOpen,
    isPaymentMethodDropdownOpen,
    isPurchaseAccountDropdownOpen,
    isProjectNameDropdownOpen,
    isSalesAccountDropdownOpen,
    isSalespersonDropdownOpen,
    isSearchModalOpen,
    isSearchTypeDropdownOpen,
    isStatusDropdownOpen,
    isTaxExemptionsDropdownOpen,
    isTransactionTypeDropdownOpen,
    itemNameDropdownRef,
    paymentMethodDropdownRef,
    projectNameDropdownRef,
    purchaseAccountDropdownRef,
    resetSearchModalData,
    salesAccountDropdownRef,
    salespersonDropdownRef,
    searchModalData,
    searchModalFilter,
    searchType,
    searchTypeDropdownRef,
    searchTypeOptions,
    setIsAccountDropdownOpen,
    setIsAdjustmentTypeDropdownOpen,
    setIsCustomerNameDropdownOpen,
    setIsCustomerTypeDropdownOpen,
    setIsFilterDropdownOpen,
    setIsItemNameDropdownOpen,
    setIsPaymentMethodDropdownOpen,
    setIsPurchaseAccountDropdownOpen,
    setIsProjectNameDropdownOpen,
    setIsSalesAccountDropdownOpen,
    setIsSalespersonDropdownOpen,
    setIsSearchModalOpen,
    setIsSearchTypeDropdownOpen,
    setIsStatusDropdownOpen,
    setIsTaxExemptionsDropdownOpen,
    setIsTransactionTypeDropdownOpen,
    setSearchModalData,
    setSearchModalFilter,
    setSearchType,
    statusDropdownRef,
    taxExemptionsDropdownRef,
    transactionTypeDropdownRef,
  } = controller;

  return (
    <>      {/* Search Modal */}
      {
        isSearchModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsSearchModalOpen(false);
                // Reset search data when closing
                resetSearchModalData();
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-lg w-full max-w-[800px] mx-4">
              {/* Header */}
              <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {/* Search Type Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Search</label>
                    <div className="relative" ref={searchTypeDropdownRef}>
                      <div
                        className={`flex items-center justify-between w-[140px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSearchTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen);
                        }}
                      >
                        <span>{searchType}</span>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isSearchTypeDropdownOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[300px] overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {searchTypeOptions.map((option) => (
                            <div
                              key={option}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${searchType === option
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchType(option);
                                setIsSearchTypeDropdownOpen(false);
                                const options = getSearchFilterOptions(option);
                                setSearchModalFilter((prev) => options.includes(prev) ? prev : options[0]);
                                // Reset search form data when changing search type
                                resetSearchModalData();
                              }}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Filter</label>
                    <div className="relative" ref={filterDropdownRef}>
                      <div
                        className={`flex items-center justify-between w-[160px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isFilterDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                        onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      >
                        <span>{searchModalFilter}</span>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isFilterDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                          {getSearchFilterOptions(searchType).map((view) => (
                            <div
                              key={view}
                              className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                              onClick={() => {
                                setSearchModalFilter(view);
                                setIsFilterDropdownOpen(false);
                              }}
                            >
                              {view}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    // Reset search data when closing
                    resetSearchModalData();
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Criteria Body */}
              <div className="p-6">
                {searchType === "Customers" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                        <input
                          type="text"
                          value={searchModalData.displayName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, displayName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                        <input
                          type="text"
                          value={searchModalData.companyName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                        <input
                          type="text"
                          value={searchModalData.lastName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <input
                          type="text"
                          value={searchModalData.address}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Customer Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Type</label>
                        <div className="relative" ref={customerTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerTypeDropdownOpen(!isCustomerTypeDropdownOpen)}
                          >
                            <span className={searchModalData.customerType ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerType || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["Business", "Individual"].map((type) => (
                                <div
                                  key={type}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, customerType: type }));
                                    setIsCustomerTypeDropdownOpen(false);
                                  }}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                        <input
                          type="text"
                          value={searchModalData.firstName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                          type="email"
                          value={searchModalData.email}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                        <input
                          type="tel"
                          value={searchModalData.phone}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Items" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <input
                          type="text"
                          value={searchModalData.itemName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <input
                          type="text"
                          value={searchModalData.description}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Purchase Rate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Rate</label>
                        <input
                          type="text"
                          value={searchModalData.purchaseRate}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, purchaseRate: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Sales Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sales Account</label>
                        <div className="relative" ref={salesAccountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalesAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalesAccountDropdownOpen(!isSalesAccountDropdownOpen)}
                          >
                            <span className={searchModalData.salesAccount ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salesAccount || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalesAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalesAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* SKU */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                        <input
                          type="text"
                          value={searchModalData.sku}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, sku: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Rate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate</label>
                        <input
                          type="text"
                          value={searchModalData.rate}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, rate: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Purchase Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Account</label>
                        <div className="relative" ref={purchaseAccountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isPurchaseAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsPurchaseAccountDropdownOpen(!isPurchaseAccountDropdownOpen)}
                          >
                            <span className={searchModalData.purchaseAccount ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.purchaseAccount || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPurchaseAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isPurchaseAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Inventory Adjustments" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <input
                          type="text"
                          value={searchModalData.itemName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Reason */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                        <input
                          type="text"
                          value={searchModalData.reason}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescription}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescription: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Adjustment Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Adjustment Type</label>
                        <div className="relative" ref={adjustmentTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAdjustmentTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAdjustmentTypeDropdownOpen(!isAdjustmentTypeDropdownOpen)}
                          >
                            <span>{searchModalData.adjustmentType || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAdjustmentTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAdjustmentTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Quantity", "Value"].map((type) => (
                                <div
                                  key={type}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, adjustmentType: type }));
                                    setIsAdjustmentTypeDropdownOpen(false);
                                  }}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Banking" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transaction Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction Type</label>
                        <div className="relative" ref={transactionTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTransactionTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTransactionTypeDropdownOpen(!isTransactionTypeDropdownOpen)}
                          >
                            <span className={searchModalData.transactionType ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.transactionType || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTransactionTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTransactionTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Quotes" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Quote# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Quote#</label>
                        <input
                          type="text"
                          value={searchModalData.quoteNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescriptionQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerName || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                        <div className="relative" ref={salespersonDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalespersonDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                          >
                            <span className={searchModalData.salesperson ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salesperson || "Select a salesperson"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalespersonDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalespersonDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Billing and Shipping"
                              checked={searchModalData.addressType === "Billing and Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Billing"
                              checked={searchModalData.addressType === "Billing"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Shipping"
                              checked={searchModalData.addressType === "Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-blue-600 text-sm hover:underline">+ Address Line</button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumberQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumberQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameDropdownOpen(!isItemNameDropdownOpen)}
                          >
                            <span className={searchModalData.itemNameQuote ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.itemNameQuote || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromQuote}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToQuote}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                        <div className="relative" ref={projectNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsProjectNameDropdownOpen(!isProjectNameDropdownOpen)}
                          >
                            <span className={searchModalData.projectName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.projectName || "Select a project"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isProjectNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsDropdownOpen(!isTaxExemptionsDropdownOpen)}
                          >
                            <span className={searchModalData.taxExemptions ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.taxExemptions || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Invoices" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Invoice# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice#</label>
                        <input
                          type="text"
                          value={searchModalData.invoiceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span className={searchModalData.status ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.status || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescriptionInvoice}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionInvoice: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromInvoice}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToInvoice}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                        <div className="relative" ref={projectNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsProjectNameDropdownOpen(!isProjectNameDropdownOpen)}
                          >
                            <span className={searchModalData.projectNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.projectNameInvoice || "Select a project"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isProjectNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsDropdownOpen(!isTaxExemptionsDropdownOpen)}
                          >
                            <span className={searchModalData.taxExemptionsInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.taxExemptionsInvoice || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Order Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Number</label>
                        <input
                          type="text"
                          value={searchModalData.orderNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, orderNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Created Between */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Created Between</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.createdBetweenFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.createdBetweenTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameDropdownOpen(!isItemNameDropdownOpen)}
                          >
                            <span className={searchModalData.itemNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.itemNameInvoice || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                        <div className="relative" ref={accountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                          >
                            <span className={searchModalData.account ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.account || "Select an account"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerNameInvoice || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                        <div className="relative" ref={salespersonDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalespersonDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                          >
                            <span className={searchModalData.salespersonInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salespersonInvoice || "Select a salesperson"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalespersonDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalespersonDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Billing and Shipping"
                              checked={searchModalData.addressTypeInvoice === "Billing and Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Billing"
                              checked={searchModalData.addressTypeInvoice === "Billing"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Shipping"
                              checked={searchModalData.addressTypeInvoice === "Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-blue-600 text-sm hover:underline">+ Address Line</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Payments Received" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerName || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumberPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumberPayment: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                        <div className="relative" ref={paymentMethodDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isPaymentMethodDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsPaymentMethodDropdownOpen(!isPaymentMethodDropdownOpen)}
                          >
                            <span className={searchModalData.paymentMethod ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.paymentMethod || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPaymentMethodDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isPaymentMethodDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Payment # */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment #</label>
                        <input
                          type="text"
                          value={searchModalData.paymentNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, paymentNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFromPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFromPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeToPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeToPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span className={searchModalData.statusPayment ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.statusPayment || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, statusPayment: status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notesPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notesPayment: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Expenses Form */}
                {searchType === "Expenses" && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Expense#</label>
                        <input
                          type="text"
                          value={searchModalData.expenseNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, expenseNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.vendorName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.vendorName || "Select vendor"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                        <div className="relative" ref={accountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                          >
                            <span className={searchModalData.account ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.account || "Select an account"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Recurring Invoices, Credit Notes, Vendors, Recurring Expenses, Purchase Orders, Bills, Payments Made, Recurring Bills, Vendor Credits, Projects, Timesheet, Journals, Chart of Accounts, Documents, Task - Using similar structure */}
                {["Recurring Invoices", "Credit Notes", "Vendors", "Recurring Expenses", "Purchase Orders", "Bills", "Payments Made", "Recurring Bills", "Vendor Credits", "Projects", "Timesheet", "Journals", "Chart of Accounts", "Documents", "Task"].includes(searchType) && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{searchType === "Vendors" ? "Vendor Name" : searchType === "Projects" ? "Project Name" : searchType === "Chart of Accounts" ? "Account Name" : searchType === "Documents" ? "Document Name" : searchType === "Task" ? "Task Name" : `${searchType} Number`}</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                      {searchType !== "Vendors" && searchType !== "Chart of Accounts" && searchType !== "Documents" && searchType !== "Task" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{searchType.includes("Payment") ? "Customer Name" : searchType.includes("Bill") || searchType.includes("Expense") || searchType === "Purchase Orders" ? "Vendor Name" : "Customer Name"}</label>
                          <div className="relative" ref={customerNameDropdownRef}>
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                              onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                            >
                              <span className={searchModalData.customerName ? "text-gray-700" : "text-gray-400"}>
                                {searchModalData.customerName || `Select ${searchType.includes("Payment") ? "customer" : searchType.includes("Bill") || searchType.includes("Expense") || searchType === "Purchase Orders" ? "vendor" : "customer"}`}
                              </span>
                              <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {isCustomerNameDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                                <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {searchType !== "Vendors" && searchType !== "Chart of Accounts" && searchType !== "Documents" && searchType !== "Task" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                          <div className="relative" ref={accountDropdownRef}>
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                            >
                              <span className={searchModalData.account ? "text-gray-700" : "text-gray-400"}>
                                {searchModalData.account || "Select an account"}
                              </span>
                              <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {isAccountDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                                <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-center gap-3 py-4 px-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  className="py-2.5 px-6 bg-red-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700"
                  onClick={() => {
                    // TODO: Implement search functionality
                    setIsSearchModalOpen(false);
                  }}
                >
                  Search
                </button>
                <button
                  className="py-2.5 px-6 bg-gray-200 text-gray-700 border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-300"
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    // Reset search data when canceling
                    resetSearchModalData();
                  }}
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

