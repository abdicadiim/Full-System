type CacheEntry<T> = {
  ts: number;
  value?: T;
  promise?: Promise<T>;
};

const CUSTOMER_CACHE_TTL_MS = 2 * 60 * 1000;
const customerCache = new Map<string, CacheEntry<any>>();

export const cachedCustomerFetch = async <T,>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = CUSTOMER_CACHE_TTL_MS
): Promise<T> => {
  const now = Date.now();
  const entry = customerCache.get(key) as CacheEntry<T> | undefined;

  if (entry?.value !== undefined && now - entry.ts < ttlMs) {
    return entry.value;
  }

  if (entry?.promise) {
    return entry.promise;
  }

  const promise = fetcher()
    .then((value) => {
      customerCache.set(key, { ts: Date.now(), value });
      return value;
    })
    .catch((error) => {
      customerCache.delete(key);
      throw error;
    });

  customerCache.set(key, { ts: entry?.ts ?? now, value: entry?.value, promise });
  return promise;
};

export const clearCustomerFetchCache = () => {
  customerCache.clear();
};
