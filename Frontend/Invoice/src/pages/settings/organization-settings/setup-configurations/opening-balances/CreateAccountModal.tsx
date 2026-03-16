import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, ChevronUp, ChevronDown, Info } from "lucide-react";
import { chartOfAccountsAPI } from "../../../../../services/api";
import { toast } from "react-hot-toast";

interface CreateAccountModalProps {
  accountType: string;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function CreateAccountModal({ accountType, onClose, onSave }: CreateAccountModalProps) {
  const [accountTypeValue, setAccountTypeValue] = useState(accountType || "");
  const [accountName, setAccountName] = useState("");
  const [isSubAccount, setIsSubAccount] = useState(false);
  const [parentAccount, setParentAccount] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [description, setDescription] = useState("");
  const [addToWatchlist, setAddToWatchlist] = useState(false);
  const [showZohoExpense, setShowZohoExpense] = useState(false);

  const [accountTypeDropdownOpen, setAccountTypeDropdownOpen] = useState(false);
  const [accountTypeSearch, setAccountTypeSearch] = useState("");
  const [parentAccountDropdownOpen, setParentAccountDropdownOpen] = useState(false);
  const [parentAccountSearch, setParentAccountSearch] = useState("");
  const accountTypeRef = useRef<HTMLButtonElement>(null);
  const accountTypeDropdownRef = useRef<HTMLDivElement>(null);
  const parentAccountRef = useRef<HTMLButtonElement>(null);
  const parentAccountDropdownRef = useRef<HTMLDivElement>(null);

  const accountTypes = [
    "Expense",
    "Asset",
    "Liability",
    "Equity",
    "Income",
    "Bank",
    "Accounts Receivable",
    "Accounts Payable"
  ];

  const filteredAccountTypes = useMemo(() => {
    if (!accountTypeSearch) return accountTypes;
    const s = accountTypeSearch.trim().toLowerCase();
    return accountTypes.filter((type) => type.toLowerCase().includes(s));
  }, [accountTypeSearch]);

  const [accountTypePosition, setAccountTypePosition] = useState({ top: 0, left: 0, width: 0 });
  const [parentAccountPosition, setParentAccountPosition] = useState({ top: 0, left: 0, width: 0 });

  // Get parent account options based on account type
  const getParentAccountOptions = () => {
    if (accountTypeValue === "Expense") {
      return [
        "Advertising And Marketing",
        "Automobile Expense",
        "Bad Debt",
        "Bank Fees and Charges",
        "Consultant Expense",
        "Credit Card Charges",
        "Depreciation Expense",
        "Fuel/Mileage Expenses",
        "IT and Internet Expenses",
        "Janitorial Expense",
        "Lodging",
        "Meals and Entertainment",
        "Office Supplies",
        "Other Expenses",
        "Parking",
        "Postage",
        "Printing and Stationery",
        "Purchase Discounts",
        "Rent Expense",
        "Repairs and Maintenance",
        "Salaries and Employee Wages",
        "Telephone Expense",
        "Travel Expense",
        "Uncategorized",
        "Cost of Goods Sold",
        "Exchange Gain or Loss"
      ];
    } else if (accountTypeValue === "Asset") {
      return [
        "Advance Tax",
        "Employee Advance",
        "Prepaid Expenses",
        "Petty Cash",
        "Undeposited Funds",
        "Furniture and Equipment",
        "Inventory Asset"
      ];
    } else if (accountTypeValue === "Bank") {
      return [];
    } else if (accountTypeValue === "Liability") {
      return [
        "Employee Reimbursements",
        "Unearned Revenue",
        "VAT Payable"
      ];
    } else if (accountTypeValue === "Equity") {
      return [
        "Drawings",
        "Opening Balance Offset",
        "Owner's Equity",
        "Retained Earnings"
      ];
    } else if (accountTypeValue === "Income") {
      return [
        "Discount",
        "General Income",
        "Interest Income",
        "Late Fee Income",
        "Other Charges",
        "Sales",
        "Shipping Charge"
      ];
    }
    return [];
  };

  const parentAccountOptions = getParentAccountOptions();
  const filteredParentAccounts = useMemo(() => {
    if (!parentAccountSearch) return parentAccountOptions;
    const s = parentAccountSearch.trim().toLowerCase();
    return parentAccountOptions.filter((account) => account.toLowerCase().includes(s));
  }, [parentAccountSearch, parentAccountOptions]);

  useEffect(() => {
    if (accountTypeDropdownOpen && accountTypeRef.current) {
      const rect = accountTypeRef.current.getBoundingClientRect();
      setAccountTypePosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [accountTypeDropdownOpen]);

  useEffect(() => {
    if (parentAccountDropdownOpen && parentAccountRef.current) {
      const rect = parentAccountRef.current.getBoundingClientRect();
      setParentAccountPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [parentAccountDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountTypeRef.current && !accountTypeRef.current.contains(event.target as Node) &&
        accountTypeDropdownRef.current && !accountTypeDropdownRef.current.contains(event.target as Node)) {
        setAccountTypeDropdownOpen(false);
        setAccountTypeSearch("");
      }
      if (parentAccountRef.current && !parentAccountRef.current.contains(event.target as Node) &&
        parentAccountDropdownRef.current && !parentAccountDropdownRef.current.contains(event.target as Node)) {
        setParentAccountDropdownOpen(false);
        setParentAccountSearch("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
    if (!accountTypeValue || !accountName) {
      alert("Please fill in all required fields");
      return;
    }
    if (isSubAccount && !parentAccount) {
      alert("Please select a parent account");
      return;
    }

    try {
      const payload = {
        accountType: accountTypeValue.toLowerCase().replace(/ /g, '_'),
        accountName,
        accountCode: accountCode || Math.random().toString(36).substring(7).toUpperCase(),
        description,
        isSubAccount,
        parentAccount: isSubAccount ? parentAccount : undefined,
        isActive: true
      };

      const res = await chartOfAccountsAPI.createAccount(payload);
      if (res.success) {
        toast.success("Account created successfully");
        onSave(res.data);
      }
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Failed to create account");
    }
  };

  const accountTypeInfo: Record<string, string> = {
    "Expense": "Reflects expenses incurred for running normal business operations, such as:\nâ€¢ Advertisements and Marketing\nâ€¢ Business Travel Expenses\nâ€¢ License Fees\nâ€¢ Utility Expenses",
    "Asset": "Resources owned by the business that have economic value, such as:\nâ€¢ Cash\nâ€¢ Inventory\nâ€¢ Equipment\nâ€¢ Property",
    "Liability": "Obligations or debts owed by the business, such as:\nâ€¢ Accounts Payable\nâ€¢ Loans\nâ€¢ Taxes Payable",
    "Equity": "Owners or stakeholders interest on the assets of the business after deducting all the liabilities",
    "Income": "Income or Revenue earned from normal business activities like sale of goods and services to customers",
    "Bank": "Bank accounts and cash accounts used for business transactions"
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-[10000] flex items-start justify-center pt-4 px-6 pb-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Account</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-red-600 mb-2">
                  Account Type*
                </label>
                <div className="relative">
                  <button
                    ref={accountTypeRef}
                    type="button"
                    onClick={() => setAccountTypeDropdownOpen(!accountTypeDropdownOpen)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className={accountTypeValue ? "text-gray-900" : "text-gray-400"}>
                      {accountTypeValue || "Select"}
                    </span>
                    {accountTypeDropdownOpen ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </button>
                  {accountTypeDropdownOpen && createPortal(
                    <div
                      ref={accountTypeDropdownRef}
                      className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                      style={{
                        top: `${accountTypePosition.top}px`,
                        left: `${accountTypePosition.left}px`,
                        width: `${accountTypePosition.width}px`,
                        zIndex: 99999,
                        maxHeight: '320px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
                        <Search size={16} className="text-gray-400" />
                        <input
                          autoFocus
                          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                          placeholder="Search"
                          value={accountTypeSearch}
                          onChange={(e) => setAccountTypeSearch(e.target.value)}
                        />
                      </div>
                      <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                        {filteredAccountTypes.map((type) => {
                          const isSelected = type === accountTypeValue;
                          return (
                            <button
                              key={type}
                              type="button"
                              className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                                ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                              `}
                              onClick={() => {
                                setAccountTypeValue(type);
                                setAccountTypeDropdownOpen(false);
                                setAccountTypeSearch("");
                              }}
                            >
                              {type}
                            </button>
                          );
                        })}
                        {filteredAccountTypes.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                        )}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-red-600 mb-2">
                  Account Name*
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter account name"
                />
              </div>

              {/* Make this a sub-account */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSubAccount}
                    onChange={(e) => setIsSubAccount(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Make this a sub-account</span>
                  <Info size={14} className="text-gray-400" />
                </label>
              </div>

              {/* Parent Account - Only show when isSubAccount is true */}
              {isSubAccount && (
                <div>
                  <label className="block text-sm font-medium text-red-600 mb-2">
                    Parent Account*
                  </label>
                  <div className="relative">
                    <button
                      ref={parentAccountRef}
                      type="button"
                      onClick={() => setParentAccountDropdownOpen(!parentAccountDropdownOpen)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <span className={parentAccount ? "text-gray-900" : "text-gray-400"}>
                        {parentAccount || "Select an account"}
                      </span>
                      {parentAccountDropdownOpen ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </button>
                    {parentAccountDropdownOpen && createPortal(
                      <div
                        ref={parentAccountDropdownRef}
                        className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                        style={{
                          top: `${parentAccountPosition.top}px`,
                          left: `${parentAccountPosition.left}px`,
                          width: `${parentAccountPosition.width}px`,
                          zIndex: 99999,
                          maxHeight: '320px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
                          <Search size={16} className="text-gray-400" />
                          <input
                            autoFocus
                            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                            placeholder="Search"
                            value={parentAccountSearch}
                            onChange={(e) => setParentAccountSearch(e.target.value)}
                          />
                        </div>
                        <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                          {accountTypeValue && (
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                              {accountTypeValue}
                            </div>
                          )}
                          {filteredParentAccounts.map((account) => {
                            const isSelected = account === parentAccount;
                            return (
                              <button
                                key={account}
                                type="button"
                                className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                                  ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                                `}
                                onClick={() => {
                                  setParentAccount(account);
                                  setParentAccountDropdownOpen(false);
                                  setParentAccountSearch("");
                                }}
                              >
                                {account}
                              </button>
                            );
                          })}
                          {filteredParentAccounts.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                          )}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              )}

              {/* Account Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Code
                </label>
                <input
                  type="text"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter account code"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Max. 500 characters"
                />
                <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
              </div>

              {/* Add to watchlist */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToWatchlist}
                    onChange={(e) => setAddToWatchlist(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Add to the watchlist on my dashboard</span>
                </label>
              </div>

              {/* Zoho Expense */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showZohoExpense}
                    onChange={(e) => setShowZohoExpense(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Zoho Expense ?</span>
                  <Info size={14} className="text-gray-400" />
                </label>
                {showZohoExpense && (
                  <label className="flex items-center gap-2 cursor-pointer mt-2 ml-6">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Show as an active account in Zoho Expense</span>
                    <Info size={14} className="text-gray-400" />
                  </label>
                )}
              </div>
            </div>

            {/* Right Column - Info */}
            {accountTypeValue && accountTypeInfo[accountTypeValue] && (
              <div className="bg-blue-600 text-white p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{accountTypeValue}</h4>
                <p className="text-sm whitespace-pre-line">{accountTypeInfo[accountTypeValue]}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


