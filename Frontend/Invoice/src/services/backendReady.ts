const HEALTH_URL = "http://127.0.0.1:5000/api/health";
const CHECK_INTERVAL_MS = 250;
const CHECK_TIMEOUT_MS = 10000;

let backendReadyPromise: Promise<boolean> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForBackendReady = async () => {
  if (backendReadyPromise) return backendReadyPromise;

  backendReadyPromise = (async () => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < CHECK_TIMEOUT_MS) {
      try {
        const res = await fetch(HEALTH_URL, { cache: "no-store" });
        if (res.ok) return true;
      } catch {
        // Keep polling until the API is actually ready.
      }

      await sleep(CHECK_INTERVAL_MS);
    }

    return false;
  })();

  return backendReadyPromise;
};
