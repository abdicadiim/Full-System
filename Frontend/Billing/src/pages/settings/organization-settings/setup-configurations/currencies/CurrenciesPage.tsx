import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, MoreVertical, Download, Upload, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import NewCurrencyModal from "./NewCurrencyModal";
import EditCurrencyModal from "./EditCurrencyModal";
import { toast } from "react-toastify";

const CURRENCIES_STORAGE_KEY = "taban_currencies";
const EXCHANGE_RATE_FEEDS_STORAGE_KEY = "taban_exchange_rate_feeds_enabled";

type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
  decimalPlaces?: string;
  format?: string;
  latestRate?: number | null;
  asOfDate?: string | null;
  exchangeRates?: Array<{ _id?: string; date?: string; rate?: string | number }>;
  _raw?: any;
};

const makeId = () => `curr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const toStorageShape = (currency: Currency) => ({
  ...currency,
  isBaseCurrency: currency.isBase,
  isBase: currency.isBase,
});

const toCurrency = (raw: any): Currency => {
  const exchangeRates = Array.isArray(raw?.exchangeRates) ? raw.exchangeRates : [];
  const latestRateRow = [...exchangeRates].sort(
    (a: any, b: any) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
  )[0];
  const latestRateValue = Number(latestRateRow?.rate);

  return {
    id: String(raw?.id || raw?._id || makeId()),
    code: String(raw?.code || "").trim(),
    name: String(raw?.name || "").trim(),
    symbol: String(raw?.symbol || "").trim(),
    isBase: Boolean(raw?.isBase || raw?.isBaseCurrency),
    isActive: raw?.isActive !== false,
    decimalPlaces: raw?.decimalPlaces ? String(raw.decimalPlaces) : "2",
    format: raw?.format ? String(raw.format) : "1,234,567.89",
    latestRate: Number.isFinite(latestRateValue)
      ? latestRateValue
      : Number.isFinite(Number(raw?.latestRate))
        ? Number(raw?.latestRate)
        : null,
    asOfDate: latestRateRow?.date || raw?.asOfDate || null,
    exchangeRates,
    _raw: raw,
  };
};

const getDefaultCurrency = (): Currency => ({
  id: makeId(),
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  isBase: true,
  isActive: true,
  decimalPlaces: "2",
  format: "1,234,567.89",
  latestRate: null,
  asOfDate: null,
  exchangeRates: [],
  _raw: {},
});

export default function CurrenciesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRateFeedsEnabled, setExchangeRateFeedsEnabled] = useState(false);
  const [showNewCurrencyModal, setShowNewCurrencyModal] = useState(false);
  const [showEditCurrencyModal, setShowEditCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  const [threeDotsPosition, setThreeDotsPosition] = useState({ top: 0, left: 0, width: 220 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteCurrency, setPendingDeleteCurrency] = useState<Currency | null>(null);
  const [showChangeBaseModal, setShowChangeBaseModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModule, setExportModule] = useState("Exchange Rates");
  const [exportTemplate, setExportTemplate] = useState("");
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [exportFormat, setExportFormat] = useState("CSV");
  const [exportPassword, setExportPassword] = useState("");
  const [showExportPassword, setShowExportPassword] = useState(false);

  const threeDotsRef = useRef<HTMLDivElement>(null);
  const threeDotsMenuRef = useRef<HTMLDivElement>(null);

  const showNotification = (message: string) => {
    toast.success(message);
  };

  const persistCurrencies = useCallback((nextCurrencies: Currency[]) => {
    setCurrencies(nextCurrencies);
    localStorage.setItem(
      CURRENCIES_STORAGE_KEY,
      JSON.stringify(nextCurrencies.map((currency) => toStorageShape(currency)))
    );
  }, []);

  const loadCurrencies = useCallback(() => {
    try {
      const stored = localStorage.getItem(CURRENCIES_STORAGE_KEY);
      if (!stored) {
        const fallback = [getDefaultCurrency()];
        persistCurrencies(fallback);
        return;
      }

      const parsed = JSON.parse(stored);
      const normalized: Currency[] = Array.isArray(parsed) ? parsed.map(toCurrency) : [];

      if (normalized.length === 0) {
        const fallback = [getDefaultCurrency()];
        persistCurrencies(fallback);
        return;
      }

      const hasBase = normalized.some((currency) => currency.isBase);
      const withSingleBase = hasBase
        ? normalized.map((currency, index) => ({ ...currency, isBase: currency.isBase && index === normalized.findIndex((c) => c.isBase) }))
        : normalized.map((currency, index) => ({ ...currency, isBase: index === 0 }));

      persistCurrencies(withSingleBase);
    } catch (error) {
      console.error("Error loading currencies:", error);
      const fallback = [getDefaultCurrency()];
      persistCurrencies(fallback);
    } finally {
      setLoading(false);
    }
  }, [persistCurrencies]);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies, location.key]);

  useEffect(() => {
    const enabled = localStorage.getItem(EXCHANGE_RATE_FEEDS_STORAGE_KEY) === "true";
    setExchangeRateFeedsEnabled(enabled);
  }, []);

  useEffect(() => {
    if (showExportModal) {
      setExportPassword("");
      setShowExportPassword(false);
    }
  }, [showExportModal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        threeDotsRef.current &&
        !threeDotsRef.current.contains(target) &&
        threeDotsMenuRef.current &&
        !threeDotsMenuRef.current.contains(target)
      ) {
        setShowThreeDotsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveNewCurrency = (newCurrency: {
    code: string;
    symbol: string;
    name: string;
    decimalPlaces: string;
    format: string;
    isBaseCurrency: boolean;
  }) => {
    const code = newCurrency.code.trim().toUpperCase();
    if (!code || !newCurrency.name.trim() || !newCurrency.symbol.trim()) {
      window.alert("Please fill in all required fields.");
      return;
    }

    if (currencies.some((currency) => currency.code.toUpperCase() === code)) {
      window.alert("Currency code already exists.");
      return;
    }

    let next = [...currencies];
    if (newCurrency.isBaseCurrency) {
      next = next.map((currency) => ({ ...currency, isBase: false }));
    }

    const created: Currency = {
      id: makeId(),
      code,
      name: newCurrency.name.trim(),
      symbol: newCurrency.symbol.trim(),
      isBase: Boolean(newCurrency.isBaseCurrency),
      isActive: true,
      decimalPlaces: newCurrency.decimalPlaces || "2",
      format: newCurrency.format || "1,234,567.89",
      latestRate: null,
      asOfDate: null,
      exchangeRates: [],
      _raw: newCurrency,
    };

    persistCurrencies([...next, created]);
    setShowNewCurrencyModal(false);
    showNotification("Currency created successfully");
  };

  const handleEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    setShowEditCurrencyModal(true);
  };

  const handleSaveEditCurrency = (updatedData: {
    code: string;
    symbol: string;
    name: string;
    decimalPlaces: string;
    format: string;
    isBaseCurrency: boolean;
  }) => {
    if (!editingCurrency) return;

    const code = updatedData.code.trim().toUpperCase();
    if (!code || !updatedData.name.trim() || !updatedData.symbol.trim()) {
      window.alert("Please fill in all required fields.");
      return;
    }

    const duplicate = currencies.some(
      (currency) => currency.id !== editingCurrency.id && currency.code.toUpperCase() === code
    );
    if (duplicate) {
      window.alert("Currency code already exists.");
      return;
    }

    let next = currencies.map((currency) => {
      if (currency.id !== editingCurrency.id) return currency;
      return {
        ...currency,
        code,
        name: updatedData.name.trim(),
        symbol: updatedData.symbol.trim(),
        decimalPlaces: updatedData.decimalPlaces || "2",
        format: updatedData.format || "1,234,567.89",
        isBase: Boolean(updatedData.isBaseCurrency),
      };
    });

    if (updatedData.isBaseCurrency) {
      next = next.map((currency) =>
        currency.id === editingCurrency.id ? currency : { ...currency, isBase: false }
      );
    }

    persistCurrencies(next);
    setShowEditCurrencyModal(false);
    setEditingCurrency(null);
    showNotification("Currency updated successfully");
  };

  const handleDeleteCurrency = (id: string) => {
    const target = currencies.find((currency) => currency.id === id);
    if (!target) return;
    if (target.isBase) {
      window.alert("Base currency cannot be deleted.");
      return;
    }
    setPendingDeleteCurrency(target);
    setShowDeleteModal(true);
  };

  const confirmDeleteCurrency = () => {
    if (!pendingDeleteCurrency) return;
    const next = currencies.filter((currency) => currency.id !== pendingDeleteCurrency.id);
    persistCurrencies(next);
    setShowDeleteModal(false);
    setPendingDeleteCurrency(null);
    showNotification("Currency deleted successfully");
  };

  const handleMarkAsBase = (id: string) => {
    const next = currencies.map((currency) => ({
      ...currency,
      isBase: currency.id === id,
    }));
    persistCurrencies(next);
    showNotification("Base currency updated successfully");
  };

  const handleToggleExchangeRateFeeds = () => {
    const next = !exchangeRateFeedsEnabled;
    setExchangeRateFeedsEnabled(next);
    localStorage.setItem(EXCHANGE_RATE_FEEDS_STORAGE_KEY, String(next));
    showNotification(next ? "Exchange rate feeds enabled" : "Exchange rate feeds disabled");
  };

  const handleImportExchangeRates = () => {
    setShowThreeDotsMenu(false);
    navigate("/settings/currencies/import");
  };

  const handleExportExchangeRates = () => {
    setShowThreeDotsMenu(false);
    setShowExportModal(true);
  };

  const handleThreeDotsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 104;
    const margin = 8;

    let left = rect.right - menuWidth;
    if (left < margin) left = margin;
    if (left + menuWidth > window.innerWidth - margin) {
      left = window.innerWidth - menuWidth - margin;
    }

    let top = rect.bottom + 8;
    if (top + menuHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - menuHeight - 8);
    }

    setThreeDotsPosition({ top, left, width: menuWidth });
    setShowThreeDotsMenu((prev) => !prev);
  };

  const baseCode = currencies.find((currency) => currency.isBase)?.code || "BASE";
  const columnCount = exchangeRateFeedsEnabled ? 3 : 5;

  return (
    <div className="p-6">
      {showExportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[10000] pt-12"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Export Exchange Rates</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded transition hover:bg-gray-100"
              >
                <X size={18} className="text-red-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 text-sm text-gray-700">
              <div className="flex items-start gap-3 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <span className="mt-0.5 text-blue-500">i</span>
                <span>You can export your data from Zoho Billing in CSV, XLS or XLSX format.</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-red-600 mb-2">Module*</label>
                <select
                  value={exportModule}
                  onChange={(e) => setExportModule(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Exchange Rates</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Template
                </label>
                <select
                  value={exportTemplate}
                  onChange={(e) => setExportTemplate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an Export Template</option>
                  <option>Default Template</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-red-600 mb-2">
                  Decimal Format*
                </label>
                <select
                  value={decimalFormat}
                  onChange={(e) => setDecimalFormat(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>1234567.89</option>
                  <option>1,234,567.89</option>
                  <option>1.234.567,89</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-red-600 mb-2">
                  Export File Format*
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="export-format"
                      value="CSV"
                      checked={exportFormat === "CSV"}
                      onChange={() => setExportFormat("CSV")}
                    />
                    CSV (Comma Separated Value)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="export-format"
                      value="XLS"
                      checked={exportFormat === "XLS"}
                      onChange={() => setExportFormat("XLS")}
                    />
                    XLS (Microsoft Excel 1997-2004 Compatible)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="export-format"
                      value="XLSX"
                      checked={exportFormat === "XLSX"}
                      onChange={() => setExportFormat("XLSX")}
                    />
                    XLSX (Microsoft Excel)
                  </label>
                </div>
              </div>

              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Protection Password
                </label>
                <div className="relative">
                  <input
                    type={showExportPassword ? "text" : "password"}
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowExportPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs"
                  >
                    {showExportPassword ? "🙈" : "👁"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Your password must be at least 12 characters and include one uppercase letter, lowercase
                  letter, number, and special character.
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Note: You can export only the first 25,000 rows. If you have more rows, please initiate a
                backup for the data in your Zoho Billing organization, and download it.
              </p>
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  showNotification("Export started");
                }}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Export
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showChangeBaseModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[10000] pt-16"
          onClick={() => setShowChangeBaseModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Change Base Currency</h3>
              <button
                onClick={() => setShowChangeBaseModal(false)}
                className="p-1 rounded transition hover:bg-gray-100"
              >
                <X size={18} className="text-red-500" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-gray-700 space-y-4">
              <p>
                Changing the base currency is possible only if there are no transactions recorded in that
                currency. The following transactions are recorded:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Quotes</li>
                <li>Invoice</li>
                <li>Subscriptions</li>
                <li>Subscriptions</li>
                <li>Credit Note</li>
                <li>Customer Payment</li>
                <li>Projects</li>
                <li>Chart Of Accounts</li>
              </ul>
              <p>Please delete these transactions, to change the base currency.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowChangeBaseModal(false)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[10000] pt-16"
          onClick={() => {
            setShowDeleteModal(false);
            setPendingDeleteCurrency(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-start gap-3">
                <div className="text-orange-500 text-lg leading-none">⚠️</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Delete this currency?</div>
                  <div className="text-xs text-gray-500 mt-1">
                    This action cannot be undone. Are you sure you want to delete
                    {pendingDeleteCurrency ? ` ${pendingDeleteCurrency.code}` : ""}?
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-4">
              <button
                onClick={confirmDeleteCurrency}
                className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPendingDeleteCurrency(null);
                }}
                className="px-3 py-2 rounded-md bg-gray-100 border border-gray-300 text-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Currencies</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCurrencyModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            New Currency
          </button>

          <button
            onClick={handleToggleExchangeRateFeeds}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            {exchangeRateFeedsEnabled ? "Disable Exchange Rate Feeds" : "Enable Exchange Rate Feeds"}
          </button>

          <div className="relative" ref={threeDotsRef}>
            <button
              onClick={handleThreeDotsClick}
              className="rounded-lg p-2 transition hover:bg-gray-100"
            >
              <MoreVertical size={20} className="text-gray-600" />
            </button>

            {showThreeDotsMenu &&
              createPortal(
                <div
                  ref={threeDotsMenuRef}
                  className="fixed min-w-[220px] rounded-lg border-2 border-gray-200 bg-white py-1 shadow-xl"
                  style={{
                    top: threeDotsPosition.top,
                    left: threeDotsPosition.left,
                    width: threeDotsPosition.width,
                    zIndex: 10000,
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    onClick={handleImportExchangeRates}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50"
                  >
                    <Download size={16} className="text-gray-500" />
                    Import Exchange Rates
                  </button>
                  <button
                    onClick={handleExportExchangeRates}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Upload size={16} className="text-gray-500" />
                    Export Exchange Rates
                  </button>
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">NAME</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">SYMBOL</th>
              {!exchangeRateFeedsEnabled && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                    EXCHANGE RATE (IN {baseCode})
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">AS OF DATE</th>
                </>
              )}
              <th className="px-6 py-3" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="px-6 py-12 text-center text-gray-500">
                  Loading currencies...
                </td>
              </tr>
            ) : currencies.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-6 py-12 text-center text-gray-500">
                  No currencies found. Click "New Currency" to create one.
                </td>
              </tr>
            ) : (
              currencies.map((currency) => (
                <tr key={currency.id} className="group hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {currency.code} - {currency.name}
                      </span>
                        {currency.isBase ? (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Base Currency
                          </span>
                        ) : null}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">{currency.symbol}</td>

                  {!exchangeRateFeedsEnabled && (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {currency.latestRate !== null && currency.latestRate !== undefined
                          ? currency.latestRate
                          : ""}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {currency.asOfDate
                          ? new Date(currency.asOfDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : ""}
                      </td>
                    </>
                  )}

                  <td className="px-6 py-4">
                    <div className="flex justify-end opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="flex items-center gap-1 rounded-lg border border-gray-100 bg-white p-1 shadow-sm">
                        <button
                          onClick={() => handleEditCurrency(currency)}
                          className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        {currency.isBase ? (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => setShowChangeBaseModal(true)}
                              className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                              change base currency
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleMarkAsBase(currency.id)}
                              className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                              Mark as Base
                            </button>
                          </>
                        )}

                        {!exchangeRateFeedsEnabled && !currency.isBase && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => navigate(`/settings/currencies/${currency.id}/exchange-rates`)}
                              className="rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              view exchange rates
                            </button>
                          </>
                        )}

                        {!currency.isBase && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDeleteCurrency(currency.id)}
                              className="rounded p-1 text-red-400 transition hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNewCurrencyModal && (
        <NewCurrencyModal
          onClose={() => setShowNewCurrencyModal(false)}
          onSave={handleSaveNewCurrency}
        />
      )}

      {showEditCurrencyModal && (
        <EditCurrencyModal
          currency={{
            ...editingCurrency,
            isBaseCurrency: Boolean(editingCurrency?.isBase),
          }}
          onClose={() => {
            setShowEditCurrencyModal(false);
            setEditingCurrency(null);
          }}
          onSave={handleSaveEditCurrency}
          onAddExchangeRate={() => {
            if (editingCurrency) {
              navigate(`/settings/currencies/${editingCurrency.id}/exchange-rates`);
            }
          }}
        />
      )}
    </div>
  );
}
