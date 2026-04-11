import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SetupHeader from "../components/SetupHeader";
import SetupProgressBar from "../components/SetupProgressBar";
import { getAppDisplayName } from "../lib/appBranding";
import { orgApi, type OrganizationListItem } from "../services/orgApi";

const estimateCreatedOn = (value?: string) => {
  if (!value) return "Date unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(parsed);
};

const toTimestamp = (value?: string) => {
  const parsed = new Date(value ?? "").getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function OrganizationSelectionPage() {
  const navigate = useNavigate();
  const appName = getAppDisplayName();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [activeMenuOrg, setActiveMenuOrg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    orgApi
      .list()
      .then((result) => {
        if (!isMounted) return;
        setOrganizations(result.organizations ?? []);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Unable to load your organizations right now.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const sortedOrganizations = useMemo(
    () =>
      [...organizations].sort((a, b) => {
        const left = toTimestamp(a.account_created_date ?? a.account_created_date_formatted);
        const right = toTimestamp(b.account_created_date ?? b.account_created_date_formatted);
        return right - left;
      }),
    [organizations]
  );

  const handleChooseOrg = (org: OrganizationListItem) => {
    try {
      if (typeof window !== "undefined" && org.organization_id) {
        localStorage.setItem("selected_organization_id", org.organization_id);
      }
    } catch {
      // ignore
    }
    navigate("/optimize");
  };

  const handleCreateOrg = () => {
    navigate("/org-setup");
  };

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest("[data-org-menu-trigger]") || target.closest("[data-org-menu-panel]"))
      ) {
        return;
      }
      setActiveMenuOrg(null);
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, []);

  const openMenu = (orgId: string) => {
    setActiveMenuOrg((current) => (current === orgId ? null : orgId));
  };

  const handleMenuAction = (action: string, org: OrganizationListItem) => {
    console.log(action, org.organization_id);
    setActiveMenuOrg(null);
  };

  return (
    <div className="min-h-screen w-full bg-background-light font-display text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-7">
        <div className="mb-6">
          <SetupHeader />
        </div>

        <div className="mb-7 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-slate-600">{`Welcome back to ${appName}`}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Select Organization</h1>
            <p className="text-[11px] text-slate-500">Choose which workspace you want to continue with.</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            onClick={handleCreateOrg}
          >
            <span className="text-base leading-none">+</span>
            New Organization
          </button>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>My Organizations</span>
            <span className="inline-flex h-6 items-center justify-center rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-500">
              {organizations.length}
            </span>
          </div>
          <div className="hidden items-center gap-3 text-xs text-slate-500 md:flex">
            <span>Not seeing an organization?</span>
            <button
              type="button"
              onClick={handleCreateOrg}
              className="rounded-full border border-slate-200 px-4 py-1 text-primary hover:border-primary/80"
            >
              Create one
            </button>
          </div>
        </div>

        <SetupProgressBar value={0} />

        {loading ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm font-semibold text-slate-600">
            Loading organizations...
          </div>
        ) : (
          <>
            {error ? (
              <p className="mt-6 text-sm text-red-600">{error}</p>
            ) : null}

            {!error && sortedOrganizations.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
                <p>You do not have an organization yet.</p>
                <button
                  type="button"
                  onClick={handleCreateOrg}
                  className="mt-4 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Create My First Organization
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {sortedOrganizations.map((org) => (
                  <div
                    key={org.organization_id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/60 hover:shadow-xl"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold uppercase text-slate-500">
                          {org.name ? org.name.slice(0, 2) : "OR"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Organization created on {estimateCreatedOn(org.account_created_date_formatted ?? org.account_created_date)}
                          </p>
                          <p className="text-[11px] text-slate-500">Organization ID: {org.organization_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {org.currency_code ? <span>Currency: {org.currency_code}</span> : null}
                        {org.time_zone ? <span>| Time zone: {org.time_zone}</span> : null}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                        onClick={() => handleChooseOrg(org)}
                      >
                        Go to Organization
                      </button>
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          data-org-menu-trigger
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:border-slate-400"
                          onClick={() => openMenu(org.organization_id)}
                          aria-label="Organization actions"
                        >
                          <span className="material-symbols-outlined text-base">more_vert</span>
                        </button>
                        {activeMenuOrg === org.organization_id ? (
                          <div
                            data-org-menu-panel
                            className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.15)]"
                          >
                            <button
                              type="button"
                              className="w-full rounded-t-2xl px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleMenuAction("default", org)}
                            >
                              Mark as Default
                            </button>
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                              onClick={() => handleMenuAction("leave", org)}
                            >
                              Leave Organization
                            </button>
                            <button
                              type="button"
                              className="w-full rounded-b-2xl px-4 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                              onClick={() => handleMenuAction("delete", org)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
