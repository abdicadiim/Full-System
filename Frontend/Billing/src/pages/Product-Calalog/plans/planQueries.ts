import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { plansAPI } from "../../../services/api";

const PLAN_LIST_STALE_TIME_MS = 30 * 1000;
const PLAN_DETAIL_STALE_TIME_MS = 30 * 1000;

const normalizePlanId = (value: any) => String(value ?? "").trim();

const normalizePlan = (row: any, fallbackId?: string) => {
  if (!row || typeof row !== "object") return null;

  const id = normalizePlanId(row?.id || row?._id || row?.planId || row?.plan_id || fallbackId);
  if (!id) return null;

  const billingFrequency = row?.billingFrequency || row?.billing_frequency || "";
  const frequencyValue = row?.billingFrequencyValue || row?.billingFrequencyValue || "1";
  const frequencyPeriod = row?.billingFrequencyPeriod || row?.billingFrequencyPeriod || "Month(s)";

  const normalized = {
    ...row,
    id,
    _id: row?._id || row?.id || id,
    plan: String(row?.plan || row?.planName || row?.name || "").trim(),
    planName: String(row?.planName || row?.plan || row?.name || "").trim(),
    planCode: String(row?.planCode || row?.code || "").trim(),
    product: String(row?.product || "").trim(),
    description: String(row?.planDescription || row?.description || "").trim(),
    status: String(row?.status || "Active").trim(),
    pricingModel: String(row?.pricingModel || row?.pricingScheme || "Unit").trim(),
    billingFrequency: String(billingFrequency || `${frequencyValue} ${frequencyPeriod}`).trim(),
    billingFrequencyValue: String(frequencyValue).trim(),
    billingFrequencyPeriod: String(frequencyPeriod).trim(),
    price: Number(row?.price || row?.amount || row?.planPrice || 0),
    createdOn: String(row?.createdAt || row?.createdOn || row?.created_time || "").trim(),
    internalName: String(row?.internalName || row?.internal_name || "").trim(),
    planFamily: String(row?.planFamily || row?.plan_family || "").trim(),
    trialDays: Number(row?.trialDays || row?.trial_days || 0),
    unitName: String(row?.unitName || row?.unit_name || row?.unit || "").trim(),
    active:
      typeof row?.active === "boolean"
        ? row?.active
        : String(row?.status || "Active").trim().toLowerCase() === "active",
  } as const;

  return normalized;
};

const planMatchesId = (plan: any, planId: string) => {
  const normalizedPlanId = normalizePlanId(planId);
  if (!normalizedPlanId) return false;

  return [plan?._id, plan?.id, plan?.planId, plan?.plan_id]
    .map((value) => normalizePlanId(value))
    .filter(Boolean)
    .includes(normalizedPlanId);
};

const upsertPlanInList = (existing: any[] | undefined, plan: any) => {
  const normalizedPlan = normalizePlan(plan);
  if (!normalizedPlan) return Array.isArray(existing) ? existing : [];

  if (!Array.isArray(existing) || existing.length === 0) {
    return [normalizedPlan];
  }

  const idx = existing.findIndex((row: any) => planMatchesId(row, normalizedPlan.id));
  if (idx >= 0) {
    const copy = [...existing];
    copy[idx] = { ...copy[idx], ...normalizedPlan };
    return copy;
  }

  return [normalizedPlan, ...existing];
};

const removePlanFromList = (existing: any[] | undefined, planId: string) => {
  if (!Array.isArray(existing) || existing.length === 0) return existing || [];
  const normalizedPlanId = normalizePlanId(planId);
  if (!normalizedPlanId) return existing;

  return existing.filter((row: any) => !planMatchesId(row, normalizedPlanId));
};

const readPlanFromList = (queryClient: QueryClient, planId: string) => {
  const normalizedPlanId = normalizePlanId(planId);
  if (!normalizedPlanId) return null;

  const cached = queryClient.getQueriesData<any[]>({
    queryKey: planQueryKeys.lists(),
  });

  for (const [, rows] of cached) {
    if (!Array.isArray(rows)) continue;
    const match = rows.find((row: any) => planMatchesId(row, normalizedPlanId));
    if (match) return normalizePlan(match, normalizedPlanId);
  }

  return null;
};

export const planQueryKeys = {
  all: () => ["plans"] as const,
  lists: () => ["plans", "list"] as const,
  list: () => ["plans", "list", { limit: 1000 }] as const,
  detail: (planId: string) => ["plans", "detail", normalizePlanId(planId)] as const,
};

export const fetchPlansList = async () => {
  const response = await plansAPI.getAll({ limit: 1000 });
  if (response?.success === false) throw new Error(response?.message || "Failed to load plans");
  const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  return rows.map((row: any) => normalizePlan(row)).filter(Boolean) as any[];
};

export const fetchPlanDetail = async (planId: string) => {
  const normalizedPlanId = normalizePlanId(planId);
  if (!normalizedPlanId) throw new Error("Plan ID is required");

  const response = await plansAPI.getById(normalizedPlanId);
  if (response?.success === false) throw new Error(response?.message || "Failed to load plan");
  const plan = normalizePlan(response?.data ?? response, normalizedPlanId);
  if (!plan) throw new Error("Plan not found");
  return plan;
};

export const syncPlanIntoPlanQueries = (queryClient: QueryClient, plan: any) => {
  const normalizedPlan = normalizePlan(plan);
  if (!normalizedPlan) return null;

  queryClient.setQueryData(planQueryKeys.detail(normalizedPlan.id), normalizedPlan);

  const cached = queryClient.getQueriesData<any[]>({ queryKey: planQueryKeys.lists() });
  if (cached.length === 0) {
    queryClient.setQueryData(planQueryKeys.list(), [normalizedPlan]);
    return normalizedPlan;
  }

  cached.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, upsertPlanInList(rows, normalizedPlan));
  });

  return normalizedPlan;
};

export const removePlanFromPlanQueries = (queryClient: QueryClient, planId: string) => {
  const normalizedPlanId = normalizePlanId(planId);
  if (!normalizedPlanId) return;
  queryClient.removeQueries({ queryKey: planQueryKeys.detail(normalizedPlanId) });
  const cached = queryClient.getQueriesData<any[]>({ queryKey: planQueryKeys.lists() });
  cached.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, removePlanFromList(rows, normalizedPlanId));
  });
};

export const invalidatePlanQueries = async (queryClient: QueryClient, planId?: string) => {
  const tasks: Promise<unknown>[] = [queryClient.invalidateQueries({ queryKey: planQueryKeys.lists() })];
  const normalizedPlanId = normalizePlanId(planId || "");
  if (normalizedPlanId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: planQueryKeys.detail(normalizedPlanId) }));
  }
  await Promise.all(tasks);
};

export const usePlansListQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: planQueryKeys.list(),
    queryFn: fetchPlansList,
    enabled: options?.enabled ?? true,
    staleTime: PLAN_LIST_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  });

export const usePlanDetailQuery = (
  planId: string | undefined,
  options?: { enabled?: boolean; initialPlan?: any }
) => {
  const queryClient = useQueryClient();
  const normalizedPlanId = normalizePlanId(planId);
  const cached = normalizedPlanId ? readPlanFromList(queryClient, normalizedPlanId) : null;
  const initialData =
    normalizePlan(options?.initialPlan, normalizedPlanId) || cached || undefined;

  const query = useQuery({
    queryKey: planQueryKeys.detail(normalizedPlanId),
    queryFn: () => fetchPlanDetail(normalizedPlanId),
    enabled: Boolean(normalizedPlanId) && (options?.enabled ?? true),
    staleTime: PLAN_DETAIL_STALE_TIME_MS,
    initialData,
  });

  useEffect(() => {
    if (query.data) {
      syncPlanIntoPlanQueries(queryClient, query.data);
    }
  }, [query.data, queryClient]);

  return query;
};

export const useSavePlanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["plans", "save"],
    mutationFn: async ({ planId, data }: { planId?: string; data: any }) => {
      const response = planId ? await plansAPI.update(planId, data) : await plansAPI.create(data);
      if (response?.success === false) throw new Error(response?.message || "Failed to save plan");
      const normalizedPlan = normalizePlan(response?.data || data, response?.data?._id || response?.data?.id || planId);
      if (!normalizedPlan) throw new Error("Failed to normalize plan");
      return normalizedPlan;
    },
    onSuccess: async (savedPlan) => {
      syncPlanIntoPlanQueries(queryClient, savedPlan);
      await invalidatePlanQueries(queryClient, savedPlan.id);
    },
  });
};
