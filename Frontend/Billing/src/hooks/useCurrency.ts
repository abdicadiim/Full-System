import { useCallback, useEffect, useMemo, useState } from "react";
import { currenciesAPI } from "../services/api";

type BaseCurrency = {
  id: string;
  code: string;
  symbol: string;
  name: string;
};

const DEFAULT_CURRENCY: BaseCurrency = {
  id: "cur-usd",
  code: "USD",
  symbol: "USD",
  name: "US Dollar",
};

const normalizeCurrency = (raw: any): BaseCurrency => {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_CURRENCY;
  }

  const id = String(raw.id || raw._id || raw.currencyId || DEFAULT_CURRENCY.id);
  const code = String(raw.code || raw.currencyCode || DEFAULT_CURRENCY.code).toUpperCase();
  const symbol = String(raw.symbol || raw.currencySymbol || code || DEFAULT_CURRENCY.symbol);
  const name = String(raw.name || raw.currencyName || DEFAULT_CURRENCY.name);

  return { id, code, symbol, name };
};

export const useCurrency = () => {
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>(DEFAULT_CURRENCY);

  useEffect(() => {
    let isMounted = true;

    const loadBaseCurrency = async () => {
      // Prefer DB-backed base currency first (source of truth).
      try {
        const res = await currenciesAPI.getBaseCurrency();
        const base = (res as any)?.data;
        if (base && isMounted) {
          setBaseCurrency(normalizeCurrency(base));
          return;
        }
      } catch {
        // ignore
      }

      try {
        const stored = localStorage.getItem("taban_currencies");
        if (stored) {
          const currencies = JSON.parse(stored);
          const base = currencies.find((c: any) => Boolean(c?.isBase || c?.isBaseCurrency));
          if (base && isMounted) {
            setBaseCurrency(normalizeCurrency(base));
            return;
          }
        }
      } catch {
        // ignore and fall back to API
      }

      if (isMounted) {
        setBaseCurrency(DEFAULT_CURRENCY);
      }
    };

    const onCurrencyChanged = () => {
      void loadBaseCurrency();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) void loadBaseCurrency();
    };

    void loadBaseCurrency();
    window.addEventListener("taban:currency-changed", onCurrencyChanged as EventListener);
    window.addEventListener("focus", onCurrencyChanged);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      isMounted = false;
      window.removeEventListener("taban:currency-changed", onCurrencyChanged as EventListener);
      window.removeEventListener("focus", onCurrencyChanged);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const formatMoney = useCallback(
    (amount: number | string, fallbackSymbol?: string) => {
      const numeric = Number(amount);
      const safeNumber = Number.isFinite(numeric) ? numeric : 0;
      const symbol = fallbackSymbol || baseCurrency.symbol || baseCurrency.code || "USD";
      return `${symbol}${safeNumber.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [baseCurrency.code, baseCurrency.symbol]
  );

  return useMemo(
    () => ({
      baseCurrency,
      symbol: baseCurrency.symbol,
      code: baseCurrency.code,
      baseCurrencyCode: baseCurrency.code,
      formatMoney,
    }),
    [baseCurrency, formatMoney]
  );
};

export default useCurrency;
