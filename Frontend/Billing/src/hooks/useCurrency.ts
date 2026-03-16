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

    const loadBaseCurrency = () => {
      try {
        const stored = localStorage.getItem("taban_currencies");
        if (stored) {
          const currencies = JSON.parse(stored);
          const base = currencies.find((c: any) => c.isBase);
          if (base && isMounted) {
            setBaseCurrency(normalizeCurrency(base));
            return;
          }
        }
        if (isMounted) {
          setBaseCurrency(DEFAULT_CURRENCY);
        }
      } catch (error) {
        if (isMounted) {
          setBaseCurrency(DEFAULT_CURRENCY);
        }
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
