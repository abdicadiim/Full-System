import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, MoreVertical, Download, Upload, Check, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import NewCurrencyModal from "./NewCurrencyModal";
import EditCurrencyModal from "./EditCurrencyModal";

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
  const [notification, setNotification] = useState<string | null>(null);

  const threeDotsRef = useRef<HTMLDivElement>(null);
  const threeDotsMenuRef = useRef<HTMLDivElement>(null);

  const showNotification = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 2500);
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

    if (!window.confirm("Are you sure you want to delete this currency?")) return;

    const next = currencies.filter((currency) => currency.id !== id);
    persistCurrencies(next);
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
    navigate("/settings/currencies/export");
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
      {notification && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: 8,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 10001,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Check size={16} style={{ color: "#fff" }} />
          </div>
          <span style={{ fontSize: 14, color: "#065f46", fontWeight: 500 }}>{notification}</span>
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
                      ) : (
                        <button
                          onClick={() => handleMarkAsBase(currency.id)}
                          className="text-xs font-medium text-blue-600 opacity-0 transition-opacity duration-200 hover:underline group-hover:opacity-100"
                        >
                          change base currency
                        </button>
                      )}
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

                        {!currency.isBase && (
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

                        {!exchangeRateFeedsEnabled && (
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
