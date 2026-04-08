import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { subscriptionsAPI } from "../../../services/api";

const SUBSCRIPTIONS_STALE_TIME_MS = 30 * 1000;

const normalizeParams = (params?: { limit?: number }) => ({
    limit: Math.max(1, Number(params?.limit || 10000)),
});

export const subscriptionsQueryKeys = {
    all: () => ["subscriptions"] as const,
    lists: () => ["subscriptions", "list"] as const,
    list: (params?: { limit?: number }) =>
        ["subscriptions", "list", normalizeParams(params)] as const,
};

export const fetchSubscriptionsList = async (params?: { limit?: number }) => {
    const normalized = normalizeParams(params);
    const response = await subscriptionsAPI.getAll({ limit: normalized.limit });
    if (response?.success) {
        return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response?.message || "Failed to load subscriptions");
};

export const useSubscriptionsListQuery = (options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: subscriptionsQueryKeys.list(),
        queryFn: () => fetchSubscriptionsList(),
        enabled: options?.enabled ?? true,
        staleTime: SUBSCRIPTIONS_STALE_TIME_MS,
        placeholderData: keepPreviousData,
    });
