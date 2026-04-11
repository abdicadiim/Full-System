import { useCallback, useEffect, useRef, useState } from "react";
import {
  createLocalVersionId,
  deepEqual,
  isJwtExpired,
  readStoredAuthToken,
  readSyncEnvelope,
  resolveEnvelopePayload,
  type SyncEnvelope,
  writeSyncEnvelope,
} from "../lib/sync/syncStorage";

type SyncRemoteResult<T> = { status: 304 } | { status: 200; data: T; version_id?: string; last_updated?: string };

export type SyncEngineResult<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  pendingSync: boolean;
  error: string | null;
  versionId: string;
  lastUpdated: string;
  refresh: () => Promise<void>;
  mutate: (updater: (prev: T | null) => T) => Promise<void>;
};

type SyncEngineConfig<T> = {
  key: string;
  fetchRemote: (args: { token: string; ifModifiedSince?: string; versionId?: string }) => Promise<SyncRemoteResult<T>>;
  tokenProvider?: () => string | null | Promise<string | null>;
  debounceMs?: number;
  enabled?: boolean;
  sensitive?: boolean;
  encrypt?: (plainText: string) => string | Promise<string>;
  decrypt?: (cipherText: string) => string | Promise<string>;
};

const lastSyncAtByKey = new Map<string, number>();
const inFlightByKey = new Set<string>();

const nowIso = () => new Date().toISOString();

export function useSyncEngine<T>(config: SyncEngineConfig<T>): SyncEngineResult<T> {
  const {
    key,
    fetchRemote,
    tokenProvider,
    debounceMs = 350,
    enabled = true,
    sensitive = false,
    encrypt,
    decrypt,
  } = config;

  const cachedEnvelope = readSyncEnvelope<T>(key);
  const cachedPayload = cachedEnvelope && !cachedEnvelope.encrypted ? (cachedEnvelope.payload as T) : null;

  const [data, setData] = useState<T | null>(cachedPayload);
  const [loading, setLoading] = useState(() => !cachedPayload);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [pendingSync, setPendingSync] = useState(Boolean(cachedEnvelope?.pending_sync));
  const [error, setError] = useState<string | null>(null);
  const [versionId, setVersionId] = useState(cachedEnvelope?.version_id || "");
  const [lastUpdated, setLastUpdated] = useState(cachedEnvelope?.last_updated || "");

  const dataRef = useRef<T | null>(cachedPayload);
  const mountedRef = useRef(true);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const commitState = useCallback((next: Partial<SyncEngineResult<T>>) => {
    if (!mountedRef.current) return;
    if (typeof next.data !== "undefined") setData(next.data);
    if (typeof next.loading !== "undefined") setLoading(next.loading);
    if (typeof next.refreshing !== "undefined") setRefreshing(next.refreshing);
    if (typeof next.stale !== "undefined") setStale(next.stale);
    if (typeof next.pendingSync !== "undefined") setPendingSync(next.pendingSync);
    if (typeof next.error !== "undefined") setError(next.error);
    if (typeof next.versionId !== "undefined") setVersionId(next.versionId);
    if (typeof next.lastUpdated !== "undefined") setLastUpdated(next.lastUpdated);
  }, []);

  const syncNow = useCallback(
    async (force = false) => {
      if (!enabled) return;
      if (inFlightByKey.has(key)) return;

      const now = Date.now();
      const lastSyncAt = lastSyncAtByKey.get(key) || 0;
      if (!force && now - lastSyncAt < debounceMs) return;
      lastSyncAtByKey.set(key, now);
      inFlightByKey.add(key);

      const localEnvelope = readSyncEnvelope<T>(key);
      commitState({
        loading: !dataRef.current,
        refreshing: Boolean(dataRef.current),
        error: null,
      });

      try {
        const token = await Promise.resolve(tokenProvider?.() ?? readStoredAuthToken());
        if (!token || isJwtExpired(token)) {
          commitState({
            loading: false,
            refreshing: false,
            stale: Boolean(dataRef.current),
            error: dataRef.current ? "Auth token expired; using cached data." : "Missing or expired auth token.",
          });
          return;
        }

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          commitState({
            loading: false,
            refreshing: false,
            stale: true,
            error: dataRef.current ? "Offline; using cached data." : "Offline and no cached data available.",
          });
          return;
        }

        const remote = await fetchRemote({
          token,
          ifModifiedSince: localEnvelope?.last_updated,
          versionId: localEnvelope?.version_id,
        });

        if (remote.status === 304) {
          commitState({
            loading: false,
            refreshing: false,
            stale: false,
            pendingSync: Boolean(localEnvelope?.pending_sync),
            error: null,
          });
          return;
        }

        const nextVersionId = remote.version_id || localEnvelope?.version_id || createLocalVersionId();
        const nextLastUpdated = remote.last_updated || nowIso();
        const nextEnvelope: SyncEnvelope<T> = {
          version_id: nextVersionId,
          last_updated: nextLastUpdated,
          pending_sync: false,
          payload: remote.data,
        };

        const localPayload = localEnvelope
          ? localEnvelope.encrypted && decrypt
            ? await resolveEnvelopePayload(localEnvelope, decrypt)
            : (localEnvelope.payload as T)
          : null;
        const payloadChanged = !deepEqual(localPayload, remote.data);
        const versionChanged =
          localEnvelope?.version_id !== nextVersionId || localEnvelope?.last_updated !== nextLastUpdated;

        if (payloadChanged || versionChanged || localEnvelope?.pending_sync) {
          await writeSyncEnvelope(key, nextEnvelope, sensitive ? encrypt : undefined);
        }

        commitState({
          data: remote.data,
          loading: false,
          refreshing: false,
          stale: false,
          pendingSync: false,
          error: null,
          versionId: nextVersionId,
          lastUpdated: nextLastUpdated,
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Sync failed";
        commitState({
          loading: false,
          refreshing: false,
          stale: true,
          error: message,
        });
      } finally {
        inFlightByKey.delete(key);
      }
    },
    [commitState, debounceMs, decrypt, enabled, encrypt, fetchRemote, key, sensitive, tokenProvider]
  );

  const refresh = useCallback(async () => {
    await syncNow(true);
  }, [syncNow]);

  const mutate = useCallback(
    async (updater: (prev: T | null) => T) => {
      const next = updater(dataRef.current);
      const nextEnvelope: SyncEnvelope<T> = {
        version_id: createLocalVersionId(),
        last_updated: nowIso(),
        pending_sync: true,
        payload: next,
      };

      await writeSyncEnvelope(key, nextEnvelope, sensitive ? encrypt : undefined);
      commitState({
        data: next,
        pendingSync: true,
        stale: true,
        versionId: nextEnvelope.version_id,
        lastUpdated: nextEnvelope.last_updated,
        error: null,
      });

      void syncNow(true);
    },
    [commitState, encrypt, key, sensitive, syncNow]
  );

  useEffect(() => {
    mountedRef.current = true;

    const hydrateEncryptedCache = async () => {
      if (!decrypt) return;
      const envelope = readSyncEnvelope<T>(key);
      if (!envelope || !envelope.encrypted || typeof envelope.payload !== "string") return;

      try {
        const payload = await resolveEnvelopePayload(envelope, decrypt);
        commitState({
          data: payload,
          loading: false,
          pendingSync: Boolean(envelope.pending_sync),
          versionId: envelope.version_id,
          lastUpdated: envelope.last_updated,
        });
      } catch {
        // Keep showing the cached/loading state if decryption fails.
      }
    };

    void hydrateEncryptedCache();
    void syncNow(false);

    const onOnline = () => {
      void syncNow(true);
    };

    window.addEventListener("online", onOnline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", onOnline);
    };
  }, [commitState, decrypt, key, syncNow]);

  return {
    data,
    loading,
    refreshing,
    stale,
    pendingSync,
    error,
    versionId,
    lastUpdated,
    refresh,
    mutate,
  };
}
