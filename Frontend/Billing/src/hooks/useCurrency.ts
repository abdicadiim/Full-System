import { useCallback, useEffect, useMemo, useState } from "react";
import { readSyncEnvelope } from "../lib/sync/syncStorage";
import { BASE_CURRENCY_CACHE_KEY, syncStartupResources } from "../lib/startup/startupHydration";

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

const readCachedBaseCurrency = () =>
  normalizeCurrency(readSyncEnvelope<any>(BASE_CURRENCY_CACHE_KEY)?.payload);

export const useCurrency = () => {
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>(() => readCachedBaseCurrency());

  useEffect(() => {
    let isMounted = true;

    const applyCachedBaseCurrency = () => {
      if (!isMounted) return;
      const cached = readCachedBaseCurrency();
      if (cached.code || cached.symbol || cached.name || cached.id) {
        setBaseCurrency(cached);
      }
    };

    const loadBaseCurrency = async () => {
      applyCachedBaseCurrency();

      try {
        await syncStartupResources({ resourceIds: ["currencies.base"] });
      } catch {
        // ignore
      }

      applyCachedBaseCurrency();
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
