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

const CURRENCY_STORAGE_KEYS = ["taban_currencies", "taban_books_currencies"];

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
    return DEFAULT_CURRENCY;
  }

  const id = String(raw.id || raw._id || raw.currencyId || DEFAULT_CURRENCY.id);
  const code = String(raw.code || raw.currencyCode || DEFAULT_CURRENCY.code).toUpperCase();
  const symbol = String(raw.symbol || raw.currencySymbol || code || DEFAULT_CURRENCY.symbol);
  const name = String(raw.name || raw.currencyName || DEFAULT_CURRENCY.name);

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
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>(() => readStoredBaseCurrency() || DEFAULT_CURRENCY);

  useEffect(() => {
    let isMounted = true;

    const loadBaseCurrency = async () => {
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

      try {
        const storedBase = readStoredBaseCurrency();
        if (storedBase && isMounted) {
          setBaseCurrency(storedBase);
          return;
        }
      } catch {
        // ignore and fall back to default
      }

      if (isMounted) {
        setBaseCurrency(DEFAULT_CURRENCY);
      }
    };

    loadBaseCurrency();
    return () => {
      isMounted = false;
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
