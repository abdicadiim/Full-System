import { useCallback, useEffect, useMemo, useState } from "react";
import { currenciesAPI } from "../services/api";

type BaseCurrency = {
  id: string;
  code: string;
  symbol: string;
  name: string;
};

const EMPTY_CURRENCY: BaseCurrency = {
  id: "",
  code: "",
  symbol: "",
  name: "",
};

const CURRENCY_STORAGE_KEYS = ["taban_currencies", "taban_books_currencies"];
const CURRENCY_CHANGED_EVENT = "taban:currency-changed";

const isBaseCurrencyRecord = (currency: any) => {
  const flag = currency?.isBase ?? currency?.isBaseCurrency ?? currency?.is_base_currency ?? currency?.baseCurrency ?? currency?.base_currency;
  if (typeof flag === "string") {
    return ["true", "yes", "1", "base"].includes(flag.trim().toLowerCase());
  }
  return Boolean(flag);
};

const extractCurrencyRows = (response: any) => {
  const candidates = [
    response?.data,
    response?.data?.data,
    response?.data?.currencies,
    response?.data?.items,
    response?.currencies,
    response?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const normalizeCurrency = (raw: any): BaseCurrency => {
  if (!raw || typeof raw !== "object") {
    return EMPTY_CURRENCY;
  }

  const id = String(raw.id || raw._id || raw.currencyId || "");
  const code = String(raw.code || raw.currencyCode || "").toUpperCase();
  const symbol = String(raw.symbol || raw.currencySymbol || code || "");
  const name = String(raw.name || raw.currencyName || "");

  return { id, code, symbol, name };
};

const readStoredBaseCurrency = (): BaseCurrency | null => {
  for (const storageKey of CURRENCY_STORAGE_KEYS) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) continue;

      const parsed = JSON.parse(stored);
      const currencies = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed?.currencies)
            ? parsed.currencies
            : [];

      const base = currencies.find(isBaseCurrencyRecord);
      if (base) {
        return normalizeCurrency(base);
      }
    } catch {
      // ignore malformed cache entries and try the next key
    }
  }

  return null;
};

export const useCurrency = () => {
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>(() => readStoredBaseCurrency() || EMPTY_CURRENCY);

  useEffect(() => {
    let isMounted = true;

    const loadBaseCurrency = async () => {
      const cached = readStoredBaseCurrency();
      if (cached && isMounted) {
        setBaseCurrency(cached);
        return;
      }

      try {
        const res = await currenciesAPI.getAll({ limit: 2000 });
        const rows = extractCurrencyRows(res);
        const base = rows.find(isBaseCurrencyRecord);
        if (base && isMounted) {
          setBaseCurrency(normalizeCurrency(base));
          return;
        }
      } catch {
        // ignore
      }

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

      // If nothing is found, keep the current value to avoid flashing a static fallback.
    };

    loadBaseCurrency();

    const syncFromCache = () => {
      const cached = readStoredBaseCurrency();
      if (cached && isMounted) {
        setBaseCurrency(cached);
      }
    };

    window.addEventListener("storage", syncFromCache);
    window.addEventListener(CURRENCY_CHANGED_EVENT, syncFromCache);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncFromCache);
      window.removeEventListener(CURRENCY_CHANGED_EVENT, syncFromCache);
    };
  }, []);

  const formatMoney = useCallback(
    (amount: number | string, fallbackSymbol?: string) => {
      const numeric = Number(amount);
      const safeNumber = Number.isFinite(numeric) ? numeric : 0;
      const symbol = fallbackSymbol || baseCurrency.symbol || baseCurrency.code || "";
      const formatted = safeNumber.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return symbol ? `${symbol}${formatted}` : formatted;
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
