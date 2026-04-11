import { dashboardAPI } from "../services/api";
import { type DashboardSummary } from "../pages/dashboard/summary";
import { useSyncEngine } from "./useSyncEngine";

const CACHE_KEY = "billing_dashboard_summary_v1";

export function useDashboardSummarySync() {
  return useSyncEngine<DashboardSummary>({
    key: CACHE_KEY,
    fetchRemote: async ({ ifModifiedSince, versionId }) => {
      const headers: Record<string, string> = {};
      if (ifModifiedSince) headers["If-Modified-Since"] = ifModifiedSince;
      if (versionId) headers["X-Client-Version-Id"] = versionId;

      const response = await dashboardAPI.getSummary({ headers });
      if (response?.status === 304 || response?.notModified) {
        return { status: 304 };
      }

      if (response?.success && response.data) {
        return {
          status: 200,
          data: response.data as DashboardSummary,
          version_id: String((response.data as DashboardSummary).version_id || ""),
          last_updated: String((response.data as DashboardSummary).last_updated || ""),
        };
      }

      throw new Error(response?.message || "Failed to load dashboard data.");
    },
  });
}
