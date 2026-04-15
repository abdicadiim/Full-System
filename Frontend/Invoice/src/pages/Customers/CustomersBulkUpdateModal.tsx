import React from "react";
import { ChevronDown, Info, Search, X } from "lucide-react";
import SearchableDropdown from "../../components/ui/SearchableDropdown";

export default function CustomersBulkUpdateModal({ controller }: { controller: any }) {
  const {
    accountsReceivableDropdownRef,
    accountsReceivableOptions,
    availableReportingTags,
    bulkUpdateData,
    closeBulkUpdateDropdowns,
    currencyDropdownRef,
    currencyOptions,
    currencySearch,
    customerLanguageDropdownRef,
    customerLanguageSearch,
    filteredCurrencies,
    filteredCustomerLanguages,
    handleBulkUpdateSubmit,
    isAccountsReceivableDropdownOpen,
    isBulkUpdateModalOpen,
    isCurrencyDropdownOpen,
    isCustomerLanguageDropdownOpen,
    isTaxRateDropdownOpen,
    paymentTermsHook,
    priceLists,
    setBulkUpdateData,
    setCurrencySearch,
    setCustomerLanguageSearch,
    setIsAccountsReceivableDropdownOpen,
    setIsBulkUpdateModalOpen,
    setIsCurrencyDropdownOpen,
    setIsCustomerLanguageDropdownOpen,
    setIsTaxRateDropdownOpen,
    taxRateDropdownRef,
    taxRateOptions,
  } = controller;

  return (
    <>      {/* Bulk Update Modal */}
      {
        isBulkUpdateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[1000] overflow-y-auto pt-10 pb-10">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-[560px] mt-2 mb-2 flex flex-col overflow-visible">
              <div className="flex items-center justify-between py-4 px-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 m-0">Bulk Update - Customers</h2>
                <button
                  className="flex items-center justify-center w-7 h-7 bg-[#156372] border-2 border-white rounded text-white cursor-pointer hover:bg-[#0f4f5a] transition-colors"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-visible">
                {/* Customer Type */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Customer Type</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="business"
                        checked={bulkUpdateData.customerType === "business"}
                        onChange={(e) => setBulkUpdateData(prev => ({ ...prev, customerType: e.target.value }))}
                        className="hidden"
                      />
                      <span className={`w-[18px] h-[18px] border-2 rounded-full flex items-center justify-center transition-all ${bulkUpdateData.customerType === "business" ? "border-[#156372]" : "border-gray-300"}`}>
                        {bulkUpdateData.customerType === "business" && <span className="w-2.5 h-2.5 bg-[#156372] rounded-full"></span>}
                      </span>
                      Business
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="individual"
                        checked={bulkUpdateData.customerType === "individual"}
                        onChange={(e) => setBulkUpdateData(prev => ({ ...prev, customerType: e.target.value }))}
                        className="hidden"
                      />
                      <span className={`w-[18px] h-[18px] border-2 rounded-full flex items-center justify-center transition-all ${bulkUpdateData.customerType === "individual" ? "border-[#156372]" : "border-gray-300"}`}>
                        {bulkUpdateData.customerType === "individual" && <span className="w-2.5 h-2.5 bg-[#156372] rounded-full"></span>}
                      </span>
                      Individual
                    </label>
                  </div>
                </div>

                {/* Credit Limit */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Credit Limit</label>
                  <div className="flex-1 flex items-center">
                    <div className="h-[38px] min-w-[52px] px-3 flex items-center justify-center rounded-l-md border border-gray-300 bg-gray-50 text-sm text-gray-700">
                      {bulkUpdateData.currency || "USD"}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkUpdateData.creditLimit}
                      onChange={(e) => setBulkUpdateData(prev => ({ ...prev, creditLimit: e.target.value }))}
                      onFocus={closeBulkUpdateDropdowns}
                      placeholder="0.00"
                      className="h-[38px] w-full rounded-r-md border border-l-0 border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    />
                  </div>
                </div>

                {/* Currency */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Currency</label>
                  <div className="flex-1 relative" ref={currencyDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCurrencyDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isCurrencyDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsCurrencyDropdownOpen(nextOpen);
                        setCurrencySearch("");
                      }}
                    >
                      <span className={bulkUpdateData.currency ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.currency
                          ? (currencyOptions.find(c => c.code === bulkUpdateData.currency)?.name || bulkUpdateData.currency)
                          : "Select"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isCurrencyDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={currencySearch}
                            onChange={(e) => setCurrencySearch(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredCurrencies.map(currency => (
                            <div
                              key={currency.code}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.currency === currency.code ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, currency: currency.code }));
                                setIsCurrencyDropdownOpen(false);
                                setCurrencySearch("");
                              }}
                            >
                              {currency.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax Rate */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Tax Rate</label>
                  <div className="flex-1 relative" ref={taxRateDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxRateDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isTaxRateDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsTaxRateDropdownOpen(nextOpen);
                      }}
                    >
                      <span className={bulkUpdateData.taxRate ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.taxRate || "Select a Tax"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxRateDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isTaxRateDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="max-h-[200px] overflow-y-auto">
                          {taxRateOptions.map((option, index) => (
                            option.isHeader ? (
                              <div key={`header-${index}`} className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider sticky top-0 border-y border-gray-100 first:border-t-0">
                                {option.label}
                              </div>
                            ) : (
                              <div
                                key={option.value}
                                className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.taxRate === option.value ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                                onClick={() => {
                                  setBulkUpdateData(prev => ({ ...prev, taxRate: option.value }));
                                  setIsTaxRateDropdownOpen(false);
                                }}
                              >
                                {option.label}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Payment Terms</label>
                  <div className="flex-1 relative" ref={paymentTermsHook.dropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${paymentTermsHook.isOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        if (paymentTermsHook.isOpen) {
                          paymentTermsHook.close();
                          return;
                        }
                        closeBulkUpdateDropdowns();
                        paymentTermsHook.open();
                      }}
                    >
                      <span className={paymentTermsHook.selectedTerm ? "text-gray-700" : "text-gray-400"}>
                        {paymentTermsHook.selectedTerm || ""}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${paymentTermsHook.isOpen ? "rotate-180" : ""}`} />
                    </div>
                    {paymentTermsHook.isOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={paymentTermsHook.searchQuery}
                            onChange={(e) => paymentTermsHook.setSearchQuery(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {paymentTermsHook.filteredTerms.map(term => (
                            <div
                              key={term.value}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${paymentTermsHook.selectedTerm === term.value ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => paymentTermsHook.handleSelect(term)}
                            >
                              {term.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Language */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700 flex items-center gap-1.5">
                    Customer Language
                    <Info size={14} className="text-gray-400" />
                  </label>
                  <div className="flex-1 relative" ref={customerLanguageDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerLanguageDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isCustomerLanguageDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsCustomerLanguageDropdownOpen(nextOpen);
                        setCustomerLanguageSearch("");
                      }}
                    >
                      <span className={bulkUpdateData.customerLanguage ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.customerLanguage || ""}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerLanguageDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isCustomerLanguageDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={customerLanguageSearch}
                            onChange={(e) => setCustomerLanguageSearch(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredCustomerLanguages.map(lang => (
                            <div
                              key={lang}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.customerLanguage === lang ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, customerLanguage: lang }));
                                setIsCustomerLanguageDropdownOpen(false);
                                setCustomerLanguageSearch("");
                              }}
                            >
                              {lang}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price List */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Price List</label>
                  <div className="flex-1 max-w-md">
                    <SearchableDropdown
                      value={bulkUpdateData.priceListId}
                      options={[
                        { value: "", label: "None" },
                        ...priceLists.map((p) => ({ value: p.id, label: p.name || p.id })),
                      ]}
                      placeholder="None"
                      accentColor="#156372"
                      onOpenChange={(open) => {
                        if (open) closeBulkUpdateDropdowns();
                      }}
                      onChange={(value) => setBulkUpdateData(prev => ({ ...prev, priceListId: value }))}
                    />
                  </div>
                </div>

                {/* Accounts Receivable */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Accounts Receivable</label>
                  <div className="flex-1 relative" ref={accountsReceivableDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountsReceivableDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isAccountsReceivableDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsAccountsReceivableDropdownOpen(nextOpen);
                      }}
                    >
                      <span className={bulkUpdateData.accountsReceivable ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.accountsReceivable || "Select an account"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountsReceivableDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isAccountsReceivableDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="max-h-[200px] overflow-y-auto">
                          {accountsReceivableOptions.map(account => (
                            <div
                              key={account}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.accountsReceivable === account ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, accountsReceivable: account }));
                                setIsAccountsReceivableDropdownOpen(false);
                              }}
                            >
                              {account}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reporting Tags */}
                {availableReportingTags.map((tag: any) => {
                  const tagId = String(tag?._id || tag?.id || "");
                  if (!tagId) return null;
                  const selectedVal = bulkUpdateData.reportingTags?.[tagId] ?? "";
                  const normalizedOptions = Array.isArray(tag?.options) ? tag.options : [];
                  const options = [
                    { value: "", label: "None" },
                    ...normalizedOptions.map((opt: string) => ({ value: opt, label: opt })),
                  ];

                  return (
                    <div key={tagId} className="flex items-center mb-5 last:mb-0">
                      <label className="w-40 flex-shrink-0 text-sm text-gray-700">
                        {tag.name || "Reporting Tag"}
                      </label>
                      <div className="flex-1 max-w-md">
                        <SearchableDropdown
                          value={selectedVal}
                          options={options}
                          placeholder="None"
                          accentColor="#156372"
                          onOpenChange={(open) => {
                            if (open) closeBulkUpdateDropdowns();
                          }}
                          onChange={(value) => {
                            setBulkUpdateData((prev: any) => {
                              const existing = prev?.reportingTags || {};
                              const next = { ...existing };
                              if (!value) {
                                delete next[tagId];
                              } else {
                                next[tagId] = value;
                              }
                              return { ...prev, reportingTags: next };
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 py-4 px-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <button
                  className="py-2.5 px-5 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer transition-colors hover:bg-[#0f4f5a]"
                  onClick={handleBulkUpdateSubmit}
                >
                  Update Fields
                </button>
                <button
                  className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
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

