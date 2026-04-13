import { useEffect, useRef, useState, startTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "../lib/auth/UserContext";
import { primeStartupResources, STARTUP_RESOURCE_IDS, syncStartupResources } from "../lib/startup/startupHydration";

type StartupHydrationState = {
  hydrating: boolean;
  hasCachedData: boolean;
  stage: "idle" | "primed" | "validating" | "syncing" | "done" | "error";
  error: string | null;
};

export function useStartupHydration() {
  const queryClient = useQueryClient();
  const { user, loading, hasChecked } = useUser();
  const ranForUserRef = useRef("");
  const [state, setState] = useState<StartupHydrationState>({
    hydrating: false,
    hasCachedData: false,
    stage: "idle",
    error: null,
  });

  useEffect(() => {
    if (loading || !hasChecked || !user?.id) return;

    const cachePrimed = primeStartupResources(queryClient);
    startTransition(() => {
      setState({
        hydrating: true,
        hasCachedData: cachePrimed,
        stage: "primed",
        error: null,
      });
    });

    const runKey = `${user.id}:${Date.now()}`;
    ranForUserRef.current = runKey;

    void (async () => {
      try {
        startTransition(() => {
          setState((current) => ({
            ...current,
            hydrating: true,
            stage: "validating",
            error: null,
          }));
        });

        await syncStartupResources({
          queryClient,
          resourceIds: STARTUP_RESOURCE_IDS.filter((resourceId) => resourceId !== "items.list"),
        });

        if (ranForUserRef.current !== runKey) return;

        startTransition(() => {
          setState((current) => ({
            ...current,
            hydrating: false,
            stage: "done",
            error: null,
          }));
        });
      } catch (error) {
        if (ranForUserRef.current !== runKey) return;

        startTransition(() => {
          setState((current) => ({
            ...current,
            hydrating: false,
            stage: "error",
            error: error instanceof Error ? error.message : "Startup sync failed.",
          }));
        });
      }
    })();
  }, [hasChecked, loading, queryClient, user?.id]);

  return state;
}

export default useStartupHydration;
