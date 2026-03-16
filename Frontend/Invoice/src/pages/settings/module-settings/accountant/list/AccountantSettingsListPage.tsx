import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, ChevronDown, ChevronRight, HelpCircle, Plus, Edit2, Loader2 } from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../services/auth";
import toast from "react-hot-toast";
import { accountantAPI } from "../../../../../services/api";

export default function AccountantPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // General tab states
  const [makeAccountCodeMandatory, setMakeAccountCodeMandatory] = useState(false);
  const [uniqueAccountCode, setUniqueAccountCode] = useState(false);
  const [allow13thMonthAdjustments, setAllow13thMonthAdjustments] = useState(false);
  
  // Currency Exchange states
  const [currencyTrackingMethod, setCurrencyTrackingMethod] = useState("same");
  const [sameAccount, setSameAccount] = useState("Exchange Gain or Loss");
  const [gainAccount, setGainAccount] = useState("");
  const [lossAccount, setLossAccount] = useState("");
  const [exchangeAdjustmentsAccount, setExchangeAdjustmentsAccount] = useState("Exchange Gain or Loss");
  
  // Accounts list for dropdowns (filtered by type)
  const [allAccounts, setAllAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // Default Account Tracking tab states
  const [expandedAccountTypes, setExpandedAccountTypes] = useState({
    items: false,
    customers: false,
    vendors: false,
    asset: true,
    liability: false,
    equity: false,
    income: false,
    expense: false
  });
  
  // Journal Approvals tab states
  const [approvalType, setApprovalType] = useState("no-approval");
  
  // Journal Custom Fields tab states
  const [journalCustomFields, setJournalCustomFields] = useState([]);
  const journalCustomFieldsUsage = journalCustomFields.length;
  const maxCustomFields = 59;
  
  // Chart of Accounts Custom Fields tab states
  const [chartCustomFields, setChartCustomFields] = useState([]);
  const chartCustomFieldsUsage = chartCustomFields.length;

  const accountTypes = [
    { id: "items", name: "Items", icon: "📦", color: "blue" },
    { id: "customers", name: "Customers", icon: "👥", color: "green" },
    { id: "vendors", name: "Vendors", icon: "🏢", color: "purple" },
    { id: "asset", name: "Asset", icon: "💎", color: "pink" },
    { id: "liability", name: "Liability", icon: "🛡️", color: "purple" },
    { id: "equity", name: "Equity", icon: "💰", color: "blue" },
    { id: "income", name: "Income", icon: "📈", color: "green" },
    { id: "expense", name: "Expense", icon: "📉", color: "red" }
  ];

  const getAccountMappings = (typeId: string) => {
    switch (typeId) {
      case "items":
        return [
          { account: "Sales Account", mappedAccount: "Sales" },
          { account: "Purchase Account", mappedAccount: "Cost of Goods Sold" },
          { account: "Inventory Account", mappedAccount: "Inventory" },
        ];
      case "customers":
        return [
          { account: "Accounts Receivable", mappedAccount: "Accounts Receivable" },
          { account: "Prepayment Account", mappedAccount: "Customer Prepayments" },
        ];
      case "vendors":
        return [
          { account: "Accounts Payable", mappedAccount: "Accounts Payable" },
          { account: "Prepayment Account", mappedAccount: "Vendor Advances" },
        ];
      case "asset":
        return [
          { account: "Vendor Advances", mappedAccount: "Prepaid Expenses" }
        ];
      default:
        return [];
    }
  };

  const toggleAccountType = (typeId) => {
    setExpandedAccountTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  // Load settings on mount (optimized - load accounts separately)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          toast.error("Please login to access settings");
          setLoading(false);
          return;
        }

        // Load accountant settings (fast - doesn't wait for accounts)
        const settingsResponse = await fetch(`${API_BASE_URL}/settings/accountant`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData.success && settingsData.data) {
            const settings = settingsData.data;
            setMakeAccountCodeMandatory(settings.chartOfAccounts?.makeAccountCodeMandatory || false);
            setUniqueAccountCode(settings.chartOfAccounts?.uniqueAccountCode || false);
            setAllow13thMonthAdjustments(settings.journals?.allow13thMonthAdjustments || false);
            setCurrencyTrackingMethod(settings.currencyExchange?.trackingMethod || 'same');
            setSameAccount(settings.currencyExchange?.sameAccount || 'Exchange Gain or Loss');
            setGainAccount(settings.currencyExchange?.gainAccount || '');
            setLossAccount(settings.currencyExchange?.lossAccount || '');
            setExchangeAdjustmentsAccount(settings.exchangeAdjustments?.defaultAccount || 'Exchange Gain or Loss');
            setApprovalType(settings.journalApprovals?.approvalType || 'no-approval');
            setJournalCustomFields(settings.journalCustomFields || []);
            setChartCustomFields(settings.chartCustomFields || []);
          }
        }

        // Settings loaded, show page immediately
        setLoading(false);

        // Load accounts in background (only needed for dropdowns)
        loadAccounts();
      } catch (error) {
        console.error("Error loading accountant settings:", error);
        toast.error("Error loading accountant settings");
        setLoading(false);
      }
    };

    // Load accounts separately (lazy load for dropdowns) - filtered by type
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        
        // Load all active accounts
        const allAccountsResponse = await accountantAPI.getAccounts({ 
          limit: 500,
          isActive: 'true'
        });
        const allAccountsData = allAccountsResponse?.data || allAccountsResponse || [];
        const accountsArray = Array.isArray(allAccountsData) ? allAccountsData : [];
        setAllAccounts(accountsArray);
        
        // Filter expense accounts (for same account, loss account, and exchange adjustments)
        const expenseTypes = ['expense', 'cost_of_goods_sold', 'other_expense'];
        const expenseAccs = accountsArray.filter((acc: any) => 
          expenseTypes.includes(acc.accountType?.toLowerCase())
        );
        setExpenseAccounts(expenseAccs);
        
        // Filter income accounts (for gain account)
        const incomeTypes = ['income', 'other_income'];
        const incomeAccs = accountsArray.filter((acc: any) => 
          incomeTypes.includes(acc.accountType?.toLowerCase())
        );
        setIncomeAccounts(incomeAccs);
      } catch (error) {
        console.error("Error loading accounts:", error);
        // Don't show error toast for accounts, just log
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      const token = getToken();
      if (!token) {
        toast.error("Please login to save settings");
        return;
      }

      const payload = {
        chartOfAccounts: {
          makeAccountCodeMandatory,
          uniqueAccountCode,
        },
        currencyExchange: {
          trackingMethod: currencyTrackingMethod,
          sameAccount,
          gainAccount,
          lossAccount,
        },
        exchangeAdjustments: {
          defaultAccount: exchangeAdjustmentsAccount,
        },
        journals: {
          allow13thMonthAdjustments,
        },
        journalApprovals: {
          approvalType,
        },
        defaultAccountTracking: {
          items: {},
          customers: {},
          vendors: {},
          assets: {},
          liabilities: {},
          equity: {},
          income: {},
          expense: {},
        },
        journalCustomFields,
        chartCustomFields,
      };

      const response = await fetch(`${API_BASE_URL}/settings/accountant`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("Accountant settings saved successfully!");
        } else {
          toast.error(data.message || "Failed to save settings");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving accountant settings:", error);
      toast.error("Error saving accountant settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-gray-600">Loading accountant settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Accountant</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "general"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("default-account-tracking")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "default-account-tracking"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Default Account Tracking
        </button>
        <button
          onClick={() => setActiveTab("journal-approvals")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "journal-approvals"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Journal Approvals
        </button>
        <button
          onClick={() => setActiveTab("journal-validation-rules")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "journal-validation-rules"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Journal Validation Rules
        </button>
        <button
          onClick={() => setActiveTab("journal-custom-fields")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "journal-custom-fields"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Journal Custom Fields
        </button>
        <button
          onClick={() => setActiveTab("chart-custom-fields")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "chart-custom-fields"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Chart of Accounts Custom Fields
        </button>
      </div>

      {/* General Tab Content */}
      {activeTab === "general" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
          {/* Chart of Accounts Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Chart of Accounts</h3>
              <Info size={14} className="text-gray-400" />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={makeAccountCodeMandatory}
                  onChange={(e) => setMakeAccountCodeMandatory(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Make Account Code mandatory for new accounts.
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uniqueAccountCode}
                  onChange={(e) => setUniqueAccountCode(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Enter a unique Account Code for accounts created.
                </span>
              </label>
            </div>
          </div>

          {/* Default Account for Currency Exchange Gain/Loss Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Default Account for Currency Exchange Gain/Loss
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Exchange rates affect the value of your base currency during conversions. Set a default account to track these gains or losses and keep your financial records accurate.
            </p>
            <div className="space-y-4">
              <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
                currencyTrackingMethod === "same" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="radio"
                  name="currencyTracking"
                  value="same"
                  checked={currencyTrackingMethod === "same"}
                  onChange={(e) => setCurrencyTrackingMethod(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    Track gains and losses in the same expense account.
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    You can track both gains and losses in the same expense account for a consolidated view.
                  </p>
                  {currencyTrackingMethod === "same" && (
                    <div className="mt-3">
                      <div className="relative w-64">
                        <select
                          value={sameAccount}
                          onChange={(e) => setSameAccount(e.target.value)}
                          className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                          disabled={loadingAccounts}
                        >
                          <option value="">Select expense account...</option>
                          {expenseAccounts.map((account: any) => (
                            <option key={account._id || account.id} value={account.accountName || account.name}>
                              {account.accountName || account.name} {account.accountCode ? `(${account.accountCode})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      {loadingAccounts && (
                        <p className="text-xs text-gray-500 mt-1">Loading accounts...</p>
                      )}
                    </div>
                  )}
                </div>
              </label>

              <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
                currencyTrackingMethod === "separate" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="radio"
                  name="currencyTracking"
                  value="separate"
                  checked={currencyTrackingMethod === "separate"}
                  onChange={(e) => setCurrencyTrackingMethod(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    Track gains and losses in separate accounts.
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    You can track gains in an income account and losses in an expense account for better categorization.
                  </p>
                  {currencyTrackingMethod === "separate" && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Gain Account (Income)</label>
                        <div className="relative w-64">
                          <select
                            value={gainAccount}
                            onChange={(e) => setGainAccount(e.target.value)}
                            className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                            disabled={loadingAccounts}
                          >
                            <option value="">Select income account...</option>
                            {incomeAccounts.map((account: any) => (
                              <option key={account._id || account.id} value={account.accountName || account.name}>
                                {account.accountName || account.name} {account.accountCode ? `(${account.accountCode})` : ''}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {loadingAccounts && (
                          <p className="text-xs text-gray-500 mt-1">Loading accounts...</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Loss Account (Expense)</label>
                        <div className="relative w-64">
                          <select
                            value={lossAccount}
                            onChange={(e) => setLossAccount(e.target.value)}
                            className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                            disabled={loadingAccounts}
                          >
                            <option value="">Select expense account...</option>
                            {expenseAccounts.map((account: any) => (
                              <option key={account._id || account.id} value={account.accountName || account.name}>
                                {account.accountName || account.name} {account.accountCode ? `(${account.accountCode})` : ''}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {loadingAccounts && (
                          <p className="text-xs text-gray-500 mt-1">Loading accounts...</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Default Account for Exchange Adjustments Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Default Account for Exchange Adjustments in Transactions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              When transactions are created in foreign currencies, there may be decimal value variations between the debit and credit amounts while the journal entries are being posted. These variations are recorded as adjustments. Select the default account using which these adjustments must be recorded.
            </p>
            <div className="relative w-64">
              <select
                value={exchangeAdjustmentsAccount}
                onChange={(e) => setExchangeAdjustmentsAccount(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                disabled={loadingAccounts}
              >
                <option value="">Select expense account...</option>
                {expenseAccounts.map((account: any) => (
                  <option key={account._id || account.id} value={account.accountName || account.name}>
                    {account.accountName || account.name} {account.accountCode ? `(${account.accountCode})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {loadingAccounts && (
              <p className="text-xs text-gray-500 mt-1">Loading accounts...</p>
            )}
          </div>

          {/* Journals Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Journals</h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allow13thMonthAdjustments}
                onChange={(e) => setAllow13thMonthAdjustments(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow 13th Month Adjustments in manual journals
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Enable this option to create a 13th month adjustment journal entry for the selected fiscal year. Once enabled, you can make end-of-period corrections or balance adjustments to your accounts for accurate financial reporting.
                </p>
              </div>
            </label>
          </div>

          {/* Recurring Journals Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Recurring Journals</h3>
            <p className="text-sm text-gray-600">
              You can enable this from the{" "}
              <a href="/settings/general" className="text-blue-600 hover:underline">General</a>{" "}
              preferences section.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Default Account Tracking Tab Content */}
      {activeTab === "default-account-tracking" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Select Default Accounts for Each Account Type
            </h3>
            <p className="text-sm text-gray-600">
              The default accounts you select here will automatically be applied when you create new transactions.
            </p>
          </div>

          <div className="space-y-4">
            {accountTypes.map((accountType) => (
              <div key={accountType.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleAccountType(accountType.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{accountType.icon}</span>
                    <span className="text-sm font-semibold text-gray-900">{accountType.name}</span>
                  </div>
                  {expandedAccountTypes[accountType.id] ? (
                    <ChevronDown size={20} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-500" />
                  )}
                </button>
                
                {expandedAccountTypes[accountType.id] && (
                  <div className="p-4 border-t border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            ACCOUNTS
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            MAPPED ACCOUNTS
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getAccountMappings(accountType.id).map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 flex items-center gap-2">
                              {item.account}
                              <Info size={14} className="text-gray-400" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <select 
                                  className="w-full h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                  disabled={loadingAccounts}
                                >
                                  <option value={item.mappedAccount}>{item.mappedAccount}</option>
                                  {allAccounts.map((account: any) => (
                                    <option key={account._id || account.id} value={account.accountName || account.name}>
                                      {account.accountName || account.name} {account.accountCode ? `(${account.accountCode})` : ''}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={2} className="px-4 py-3">
                            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                              <Plus size={14} />
                              Add Account
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 mt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Journal Approvals Tab Content */}
      {activeTab === "journal-approvals" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-6">Approval Type</h3>
          
          <div className="space-y-4">
            <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
              approvalType === "no-approval" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="approvalType"
                value="no-approval"
                checked={approvalType === "no-approval"}
                onChange={(e) => setApprovalType(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">No Approval</span>
                <p className="text-sm text-gray-600 mt-1">
                  Create Journal and perform further actions without approval.
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
              approvalType === "simple-approval" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="approvalType"
                value="simple-approval"
                checked={approvalType === "simple-approval"}
                onChange={(e) => setApprovalType(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Simple Approval</span>
                <p className="text-sm text-gray-600 mt-1">
                  Any user with approve permission can approve the Journal.
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
              approvalType === "multi-level-approval" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="approvalType"
                value="multi-level-approval"
                checked={approvalType === "multi-level-approval"}
                onChange={(e) => setApprovalType(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Multi-Level Approval</span>
                <p className="text-sm text-gray-600 mt-1">
                  Set many levels of approval. The Journal will be approved only when all the approvers approve.
                </p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 mt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Journal Validation Rules Tab Content */}
      {activeTab === "journal-validation-rules" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-end mb-6">
            <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2">
              <Plus size={16} />
              New Validation Rule
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Validation Rules</h3>
              <p className="text-sm text-gray-600 mb-8 max-w-2xl mx-auto">
                Validation Rules helps you to validate the data entered while creating, editing, or converting transactions and to prevent users from performing specific actions.
              </p>

              {/* Validation Rule Flowchart */}
              <div className="max-w-2xl mx-auto">
                <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                  <div className="text-left mb-4">
                    <span className="text-sm font-semibold text-gray-900">Validation Rule</span>
                  </div>
                  
                  {/* Flowchart */}
                  <div className="space-y-4">
                    {/* WHEN node */}
                    <div className="flex justify-center">
                      <div className="w-20 h-20 rounded-full bg-blue-200 border-2 border-blue-400 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-900">WHEN</span>
                      </div>
                    </div>
                    
                    {/* Line down */}
                    <div className="flex justify-center">
                      <div className="w-0.5 h-8 bg-blue-300"></div>
                    </div>
                    
                    {/* Condition nodes */}
                    <div className="flex items-center justify-center gap-4">
                      <div className="border-2 border-blue-300 rounded-lg p-4 bg-white min-w-[200px] flex items-center justify-between">
                        <span className="text-sm text-gray-500">---</span>
                        <span className="text-sm text-gray-700">!=</span>
                        <Edit2 size={16} className="text-gray-400" />
                      </div>
                      
                      {/* Add Subrule button */}
                      <button className="w-8 h-8 rounded-full bg-blue-200 border-2 border-blue-400 flex items-center justify-center text-blue-600 hover:bg-blue-300 transition">
                        <Plus size={16} />
                      </button>
                      
                      <div className="border-2 border-blue-300 rounded-lg p-4 bg-white min-w-[200px] flex items-center justify-between">
                        <span className="text-sm text-gray-500">---</span>
                        <Edit2 size={16} className="text-gray-400" />
                      </div>
                    </div>
                    
                    {/* Line down */}
                    <div className="flex justify-center">
                      <div className="w-0.5 h-8 bg-blue-300"></div>
                    </div>
                    
                    {/* Add another validation button */}
                    <div className="flex justify-center">
                      <button className="w-8 h-8 rounded-full bg-blue-200 border-2 border-blue-400 flex items-center justify-center text-blue-600 hover:bg-blue-300 transition">
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-gray-500">+ Add another validation</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journal Custom Fields Tab Content */}
      {activeTab === "journal-custom-fields" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {journalCustomFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/accountant/journal/new-field")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Custom Field
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    FIELD NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DATA TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    MANDATORY
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    SHOW IN ALL PDFS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {journalCustomFields.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
                      </p>
                    </td>
                  </tr>
                ) : (
                  journalCustomFields.map((field, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{field.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory ? "Yes" : "No"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs ? "Yes" : "No"}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          field.status === "Active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {field.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart of Accounts Custom Fields Tab Content */}
      {activeTab === "chart-custom-fields" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {chartCustomFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/accountant/chart/new-field")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Custom Field
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    FIELD NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DATA TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    MANDATORY
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    SHOW IN ALL PDFS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartCustomFields.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
                      </p>
                    </td>
                  </tr>
                ) : (
                  chartCustomFields.map((field, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{field.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory ? "Yes" : "No"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs ? "Yes" : "No"}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          field.status === "Active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {field.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



