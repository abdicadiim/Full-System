import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Check,
  Info,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wallet,
  Receipt,
  Gem,
  FileText,
  Building2,
  Shield,
  PieChart,
  TrendingUp,
  Lightbulb,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { chartOfAccountsAPI, openingBalancesAPI, currenciesAPI } from "../../../../../services/api";
import { toast } from "react-hot-toast";
import CreateAccountModal from "./CreateAccountModal";

export default function OpeningBalancesPage() {
  const navigate = useNavigate();
  const formatDate = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [migrationDate, setMigrationDate] = useState(formatDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [createAccountType, setCreateAccountType] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, { debit: number; credit: number }>>({});
  const datePickerRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLDivElement>(null);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setMigrationDate(formatDate(date));
    setShowDatePicker(false);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

  // Click away handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node) &&
        dateInputRef.current && !dateInputRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const [baseCurrency, setBaseCurrency] = useState<{ code: string; symbol: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsRes, openingBalancesRes, baseCurrencyRes] = await Promise.all([
        chartOfAccountsAPI.getAccounts(),
        openingBalancesAPI.get(),
        currenciesAPI.getBaseCurrency()
      ]);

      if (accountsRes.success) {
        setAccounts(accountsRes.data);
      }

      if (baseCurrencyRes.success) {
        setBaseCurrency(baseCurrencyRes.data);
      }

      if (openingBalancesRes.success && openingBalancesRes.data) {
        const ob = openingBalancesRes.data;
        const balMap: Record<string, { debit: number; credit: number }> = {};
        ob.accounts.forEach((acc: any) => {
          balMap[acc.account._id || acc.account] = {
            debit: acc.debit || 0,
            credit: acc.credit || 0
          };
        });
        setBalances(balMap);
        if (ob.migrationDate) {
          const date = new Date(ob.migrationDate);
          setSelectedDate(date);
          setMigrationDate(formatDate(date));
        }
      }
    } catch (error) {
      console.error("Error fetching opening balances:", error);
      toast.error("Failed to load opening balances");
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceChange = (accountId: string, field: 'debit' | 'credit', value: string) => {
    const numValue = parseFloat(value) || 0;
    setBalances(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId] || { debit: 0, credit: 0 },
        [field]: numValue
      }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const accountsPayload = Object.entries(balances)
        .filter(([_, bal]) => bal.debit > 0 || bal.credit > 0)
        .map(([accountId, bal]) => ({
          account: accountId,
          debit: bal.debit,
          credit: bal.credit
        }));

      const res = await openingBalancesAPI.save({
        migrationDate: selectedDate.toISOString(),
        accounts: accountsPayload
      });

      if (res.success) {
        toast.success("Opening balances saved successfully");
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving opening balances:", error);
      toast.error("Failed to save opening balances");
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (accountId: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const handleImportClick = (accountId: string) => {
    if (accountId === "receivable") {
      navigate("/settings/opening-balances/import-receivable");
    } else if (accountId === "payable") {
      navigate("/settings/opening-balances/import-payable");
    }
  };

  const handleNewAccount = (accountType: string) => {
    setCreateAccountType(accountType);
    setShowCreateAccountModal(true);
  };

  const getAccountsByType = (type: string) => {
    const typeMapping: Record<string, string[]> = {
      receivable: ["accounts_receivable"],
      payable: ["accounts_payable"],
      asset: ["asset", "other_asset", "other_current_asset", "fixed_asset", "stock", "intangible_asset", "non_current_asset", "deferred_tax_asset"],
      expense: ["expense", "cost_of_goods_sold", "other_expense"],
      bank: ["bank", "cash", "credit_card"],
      liability: ["liability", "other_current_liability", "non_current_liability", "other_liability", "overseas_tax_payable", "output_tax", "deferred_tax_liability"],
      equity: ["equity"],
      income: ["income", "other_income"],
    };

    const types = typeMapping[type] || [];
    return accounts.filter(acc => types.includes(acc.accountType));
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;
    Object.values(balances).forEach(bal => {
      totalDebit += bal.debit || 0;
      totalCredit += bal.credit || 0;
    });

    const adjustment = Math.abs(totalDebit - totalCredit);
    const adjustmentType = totalDebit > totalCredit ? 'credit' : 'debit';

    return {
      totalDebit,
      totalCredit,
      adjustment,
      adjustmentType,
      grandTotal: Math.max(totalDebit, totalCredit)
    };
  };

  const totals = calculateTotals();

  const accountTypes = [
    { id: "receivable", name: "Accounts Receivable", icon: Wallet, color: "green", hasImport: true, expandable: true },
    { id: "payable", name: "Accounts Payable", icon: Receipt, color: "orange", hasImport: true, expandable: true },
    { id: "asset", name: "Asset", icon: Gem, color: "pink", expandable: true },
    { id: "expense", name: "Expense", icon: FileText, color: "red", expandable: true },
    { id: "bank", name: "Bank", icon: Building2, color: "gray", expandable: true },
    { id: "liability", name: "Liability", icon: Shield, color: "purple", expandable: true },
    { id: "equity", name: "Equity", icon: PieChart, color: "teal", expandable: true },
    { id: "income", name: "Income", icon: TrendingUp, color: "red", expandable: true },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      green: "text-green-600",
      orange: "text-orange-600",
      pink: "text-pink-600",
      red: "text-red-600",
      gray: "text-gray-600",
      purple: "text-purple-600",
      teal: "text-teal-600",
    };
    return colors[color] || "text-gray-600";
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  const remainingCells = 42 - days.length;
  for (let day = 1; day <= remainingCells; day++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="p-6 max-w-6xl">
      {!isEditing ? (
        // View Mode
        <>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Opening Balances</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-1.5 text-blue-500 bg-white border border-blue-400 hover:bg-blue-50 rounded text-sm font-medium transition-all"
              >
                <Edit size={14} />
                Edit
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="mb-8 text-sm text-gray-600">
                Migration Date: <span className="text-gray-900 font-medium ml-1">{migrationDate}</span>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-4 mb-6 uppercase">
                <div className="text-xs font-semibold text-gray-400 tracking-wider w-1/3">ACCOUNTS</div>
                <div className="text-xs font-semibold text-gray-400 tracking-wider w-1/3 text-right">DEBIT ({baseCurrency?.code || "USD"})</div>
                <div className="text-xs font-semibold text-gray-400 tracking-wider w-1/3 text-right">CREDIT ({baseCurrency?.code || "USD"})</div>
              </div>

              <div className="space-y-8">
                {accountTypes.map(type => {
                  const typeAccounts = getAccountsByType(type.id);
                  const activeAccounts = typeAccounts.filter(acc => {
                    const bal = balances[acc._id];
                    return bal && (bal.debit > 0 || bal.credit > 0);
                  });

                  // Check for adjustment to display under Liability
                  const showAdjustment = type.id === 'liability' && totals.adjustment > 0;

                  // Always render the section, even if empty, to match design
                  // if (activeAccounts.length === 0 && !showAdjustment) return null;

                  return (
                    <div key={type.id}>
                      <div className="flex items-center gap-2 mb-4">
                        <type.icon size={18} className={getColorClasses(type.color)} />
                        <h3 className="font-semibold text-gray-900 text-base">{type.name}</h3>
                      </div>
                      <div className="space-y-4 border-b border-gray-100 pb-6 last:border-0">
                        {activeAccounts.length > 0 ? (
                          activeAccounts.map(acc => {
                            const bal = balances[acc._id] || { debit: 0, credit: 0 };
                            return (
                              <div key={acc._id} className="flex justify-between items-center px-2">
                                <div className="w-1/3 text-sm font-medium text-blue-500">{acc.accountName}</div>
                                <div className="w-1/3 text-right text-sm text-gray-900">{bal.debit > 0 ? bal.debit.toFixed(2) : "0"}</div>
                                <div className="w-1/3 text-right text-sm text-gray-900">{bal.credit > 0 ? bal.credit.toFixed(2) : "0"}</div>
                              </div>
                            );
                          })
                        ) : (
                          !showAdjustment && (
                            <div className="px-2 text-sm text-gray-400 italic">No opening balances</div>
                          )
                        )}

                        {/* Render Opening Balance Adjustment Row */}
                        {showAdjustment && (
                          <div className="flex justify-between items-center px-2">
                            <div className="w-1/3 text-sm font-medium text-gray-900">Opening Balance Adjustments</div>
                            <div className="w-1/3 text-right text-sm text-gray-900">
                              {totals.adjustmentType === 'debit' ? totals.adjustment.toFixed(2) : "0"}
                            </div>
                            <div className="w-1/3 text-right text-sm text-gray-900">
                              {totals.adjustmentType === 'credit' ? totals.adjustment.toFixed(2) : "0"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State if no data */}
                {Object.values(balances).every(b => b.debit === 0 && b.credit === 0) && (
                  <div className="text-center py-10 text-gray-500">
                    <p>No opening balances recorded.</p>
                    <button onClick={() => setIsEditing(true)} className="text-blue-600 font-medium hover:underline mt-2">Add opening balances</button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="flex justify-between py-6 mt-2 bg-slate-50/50 -mx-8 px-8">
                <div className="w-1/3 text-right font-bold text-gray-900 text-sm">TOTAL :</div>
                <div className="w-1/3 text-right font-bold text-gray-900 text-base">{totals.grandTotal.toFixed(2)}</div>
                <div className="w-1/3 text-right font-bold text-gray-900 text-base">{totals.grandTotal.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Edit Mode
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Opening Balances</h1>
            <div className="flex items-center gap-3">
              <button
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded shadow-sm transition-colors"
                onClick={() => { }} // Placeholder for general import
              >
                Import Opening Balances
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium transition-colors">
                <Lightbulb size={16} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-bold text-gray-500">PAGE TIPS</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Checklist Section */}
            <div className="p-6 border-b border-gray-100">
              <div className="bg-blue-50/50 border border-blue-100 rounded-md p-4">
                <button className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-3 hover:underline">
                  Checklist before you enter your opening balances in Taban Books <ChevronDown size={14} />
                </button>
                <div className="space-y-4 pl-1">
                  <div className="flex items-start gap-3 group">
                    <div className="mt-0.5 min-w-[16px]">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    </div>
                    <span className="text-sm text-gray-700">
                      Generate the <button onClick={() => navigate('/reports')} className="text-blue-600 hover:underline font-medium">Trial Balance report</button> in your previous accounting software.
                    </span>
                  </div>

                  <div className="flex items-start gap-3 group">
                    <div className="mt-0.5 min-w-[16px]">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    </div>
                    <span className="text-sm text-gray-700">
                      Add all your <button onClick={() => navigate('/banking')} className="text-blue-600 hover:underline font-medium">bank and credit card accounts</button> in the Banking module.
                    </span>
                  </div>

                  <div className="flex items-start gap-3 group">
                    <div className="mt-0.5 min-w-[16px]">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    </div>
                    <span className="text-sm text-gray-700">
                      Import all your <button onClick={() => navigate('/items')} className="text-blue-600 hover:underline font-medium">items</button> along with their opening stocks.
                    </span>
                  </div>

                  <div className="flex items-start gap-3 group">
                    <div className="mt-0.5 min-w-[16px]">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    </div>
                    <span className="text-sm text-gray-700">
                      Import all your <button onClick={() => navigate('/customers')} className="text-blue-600 hover:underline font-medium">contacts</button> along with their opening balances.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Migration Date Section */}
            <div className="px-6 py-6 border-b border-gray-100 flex items-start gap-4">
              <div className="flex items-center gap-2 min-w-[150px] pt-2">
                <Calendar size={18} className="text-red-500" />
                <span className="text-sm font-medium text-red-500">Migration Date*</span>
              </div>

              <div className="relative" ref={dateInputRef}>
                <div
                  className="flex items-center justify-between border border-gray-300 rounded px-3 py-2 w-[200px] cursor-pointer hover:border-blue-400 bg-white"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                >
                  <span className="text-sm text-gray-700">{migrationDate}</span>
                </div>

                {showDatePicker && createPortal(
                  <div ref={datePickerRef} className="fixed bg-white rounded-lg shadow-xl border p-4 z-[10000]"
                    style={{ top: `${dateInputRef.current?.getBoundingClientRect().bottom + 8}px`, left: `${dateInputRef.current?.getBoundingClientRect().left}px`, minWidth: '300px' }}>
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={handlePrevMonth}><ChevronRight size={16} className="rotate-180" /></button>
                      <h3 className="text-sm font-semibold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                      <button onClick={handleNextMonth}><ChevronRight size={16} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-xs text-center py-2">{d}</div>)}
                      {days.map((date, i) => date ? (
                        <button key={i} onClick={() => handleDateSelect(date)} className={`h-8 text-sm rounded ${isSameDay(date, selectedDate) ? 'bg-red-600 text-white' : 'hover:bg-gray-100'}`}>
                          {date.getDate()}
                        </button>
                      ) : <div key={i} />)}
                    </div>
                  </div>, document.body
                )}
              </div>

              <div className="bg-[#1e293b] text-white text-xs p-3 rounded leading-relaxed max-w-lg flex-1">
                The date on which you generated the Trial Balance report in your previous accounting software while migrating to Taban Books.
              </div>
            </div>

            <div className="p-6 bg-gray-50/30">
              <div className="space-y-4">
                {accountTypes.map(account => (
                  <div
                    key={account.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3 shadow-sm"
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleAccount(account.id)}
                    >
                      <div className="flex items-center gap-3">
                        <account.icon size={18} className={getColorClasses(account.color)} />
                        <span className="text-sm font-semibold text-gray-800">{account.name}</span>
                        <Info size={14} className="text-gray-300 hover:text-gray-500" />
                      </div>
                      <div className="flex items-center gap-4">
                        {account.hasImport && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImportClick(account.id);
                            }}
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors"
                          >
                            <Download size={14} /> Import
                          </button>
                        )}
                        {expandedAccounts[account.id] ? <ChevronDown size={18} className="text-blue-500" /> : <ChevronRight size={18} className="text-gray-400" />}
                      </div>
                    </div>
                    {expandedAccounts[account.id] && (
                      <div className="px-4 pb-4">
                        {getAccountsByType(account.id).length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-sm bg-gray-50/50 rounded">
                            No accounts found.
                          </div>
                        ) : (
                          <div>
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-[#f6f7fb] border-b border-[#e6e9f2]">
                                <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
                                  <th className="px-4 py-3 w-[40%]">ACCOUNTS</th>
                                  <th className="px-4 py-3 text-center w-[20%]">
                                    AVAILABLE BALANCE <Info size={12} className="inline ml-1 mb-0.5" />
                                  </th>
                                  <th className="px-4 py-3 text-right w-[20%]">DEBIT ({baseCurrency?.code || "USD"})</th>
                                  <th className="px-4 py-3 text-right w-[20%]">CREDIT ({baseCurrency?.code || "USD"})</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50/0">
                                {getAccountsByType(account.id).map(acc => (
                                  <tr key={acc._id} className="">
                                    <td className="py-3 text-sm text-gray-900 font-medium pl-2">{acc.accountName}</td>
                                    <td className="py-3 text-sm text-gray-900 text-center font-medium">-</td>
                                    <td className="py-3 pl-4">
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="w-full text-right border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow text-gray-700 placeholder-gray-300 h-9"

                                        value={balances[acc._id]?.debit || ""}
                                        onChange={e => handleBalanceChange(acc._id, 'debit', e.target.value)}
                                      />
                                    </td>
                                    <td className="py-3 pl-4">
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="w-full text-right border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow text-gray-700 placeholder-gray-300 h-9"

                                        value={balances[acc._id]?.credit || ""}
                                        onChange={e => handleBalanceChange(acc._id, 'credit', e.target.value)}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="py-3 mt-1">
                              <button
                                onClick={() => handleNewAccount(account.name)}
                                className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1 font-medium pl-2 hover:underline"
                              >
                                <Plus size={14} /> New Account
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Totals */}
            <div className="bg-[#fff9f3] border-t border-orange-100 p-8 mt-4 rounded-b-lg">
              <div className="flex justify-between items-center mb-4">
                <div className="w-1/3"></div>
                <div className="w-1/3 text-right pr-6 text-sm font-medium text-gray-600">Total</div>
                <div className="w-[15%] text-right text-sm font-medium text-gray-900 px-4">{totals.totalDebit.toFixed(2)}</div>
                <div className="w-[15%] text-right text-sm font-medium text-gray-900 px-4">{totals.totalCredit.toFixed(2)}</div>
              </div>

              <div className="flex justify-between items-center mb-6 pt-4 border-t border-orange-100/50">
                <div className="w-1/3 text-right pr-6">
                  <div className="text-sm text-red-600 font-bold flex items-center justify-end gap-2 text-right">
                    <Info size={14} className="text-red-400" />
                    Opening Balance Adjustments
                  </div>
                  <div className="text-xs text-gray-500 mt-1 max-w-[250px] ml-auto">
                    This automatically generated adjustment ensures your total debits match your total credits.
                  </div>
                </div>
                {totals.adjustmentType === 'debit' ? (
                  <>
                    <div className="w-1/3"></div>
                    <div className="w-[15%] text-right text-sm font-medium text-red-500 px-4">{totals.adjustment.toFixed(2)}</div>
                    <div className="w-[15%]"></div>
                  </>
                ) : (
                  <>
                    <div className="w-1/3"></div>
                    <div className="w-[15%]"></div>
                    <div className="w-[15%] text-right text-sm font-medium text-red-500 px-4">{totals.adjustment.toFixed(2)}</div>
                  </>
                )}
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-orange-200/60">
                <div className="w-1/3 text-right pr-6">
                  <div className="text-sm font-bold text-gray-500 uppercase">TOTAL AMOUNT</div>
                  <div className="text-xs text-gray-400 font-medium mt-1">Includes Opening Balance Adjustment account</div>
                </div>
                <div className="w-1/3"></div>
                <div className="w-[15%] text-right text-base font-bold text-gray-800 px-4">{totals.grandTotal.toFixed(2)}</div>
                <div className="w-[15%] text-right text-base font-bold text-gray-800 px-4">{totals.grandTotal.toFixed(2)}</div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors shadow-sm">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

      {showCreateAccountModal && (
        <CreateAccountModal accountType={createAccountType} onClose={() => setShowCreateAccountModal(false)} onSave={() => { setShowCreateAccountModal(false); fetchData(); }} />
      )}
    </div>
  );
}


