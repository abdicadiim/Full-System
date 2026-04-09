import React, { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CalendarDays,
  ChevronDown,
  Columns3,
  Filter,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import { useSettings } from "../../lib/settings/SettingsContext";
import {
  getCategoryById,
  getReportById,
  REPORT_FUNCTION_LABELS,
} from "./reportsCatalog";

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function TaxReportDetailPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const category = getCategoryById(categoryId || "");
  const report = getReportById(categoryId || "", reportId || "");
  const { settings } = useSettings();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const organizationName = String(
    settings?.general?.companyDisplayName ||
      settings?.general?.schoolDisplayName ||
      "",
  ).trim();

  const dateLabel = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `From ${formatDate(start)} To ${formatDate(end)}`;
  }, []);

  if (!categoryId || !reportId || !category || !report) {
    return <Navigate to="/reports" replace />;
  }

  if (category.id !== "taxes") {
    return <Navigate to="/reports" replace />;
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <div className="pr-3">
        <div className="space-y-4">
          <div className="rounded-lg border border-[#d7dce7] bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/reports")}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                  aria-label="Open reports"
                >
                  <Menu size={15} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#4f5f79]">
                    {category.name}
                  </p>
                  <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]">
                    <span>{report.name}</span>
                    <span className="text-sm font-normal text-[#475569]">
                      - {dateLabel}
                    </span>
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportOpen((current) => !current)}
                  className="inline-flex h-9 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
                >
                  Export <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => toast.success(`Report refreshed: ${report.name}`)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                  aria-label="Refresh report"
                  title="Refresh report"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/reports")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
                  aria-label="Close report"
                  title="Close report"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="border-t border-[#e6eaf1] px-4 py-2">
              <button
                type="button"
                onClick={() => setIsFilterOpen((current) => !current)}
                className="inline-flex items-center gap-1 text-[14px] font-medium text-[#156372]"
              >
                <Filter size={14} />
                Apply Filter
              </button>
            </div>

            {isFilterOpen ? (
              <div className="border-t border-[#e6eaf1] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] text-[#334155]">
                    <CalendarDays
                      size={14}
                      className="mr-1 inline-block text-[#64748b]"
                    />
                    Date Range :
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-[14px] text-[#334155] hover:bg-white"
                  >
                    <span className="font-medium">This Month</span>
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast.success(`Report refreshed: ${report.name}`)
                    }
                    className="inline-flex h-8 items-center gap-1 rounded bg-[#156372] px-4 text-[14px] font-semibold text-white hover:bg-[#0f4f5b]"
                  >
                    Run Report
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e6eaf1] px-4 py-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsGroupByOpen((current) => !current)}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Columns3 size={14} className="text-[#64748b]" />
                    Group By :
                    <strong className="text-[#0f172a]">None</strong>
                  </span>
                  <ChevronDown size={14} />
                </button>

                {isGroupByOpen ? (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[220px] rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <button
                      type="button"
                      onClick={() => setIsGroupByOpen(false)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                    >
                      <span>None</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() =>
                  toast.info("This summary report uses a fixed column layout.")
                }
                className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                <Columns3 size={14} className="text-[#64748b]" />
                Customize Report Columns
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]">
                  5
                </span>
              </button>
            </div>

            <div className="border-t border-[#eef2f7] px-4 py-10 text-center">
              {organizationName ? (
                <div className="mb-1 text-sm text-[#64748b]">
                  {organizationName}
                </div>
              ) : null}
              <div className="text-[20px] font-semibold text-[#0f172a]">
                {report.name}
              </div>
              <div className="mt-1 text-sm text-[#2563eb]">{dateLabel}</div>
            </div>
          </div>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-lg border border-[#d7dce7] bg-white p-4 xl:col-span-2">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Report Overview
              </h2>
              <p className="mt-2 text-sm text-[#475569]">{report.summary}</p>

              <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">
                How It Helps
              </h3>
              <p className="mt-1 text-sm text-[#475569]">{report.howItHelps}</p>
            </div>

            <div className="rounded-lg border border-[#d7dce7] bg-white p-4">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Source and Basis
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <p className="font-medium text-[#334155]">Category</p>
                  <p className="text-[#64748b]">{category.name}</p>
                </div>
                <div>
                  <p className="font-medium text-[#334155]">Accounting Basis</p>
                  <p className="text-[#64748b]">
                    {report.basis || "As configured in report settings"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#334155]">Source</p>
                  <p className="text-[#64748b]">
                    {report.source ||
                      "Entity-specific source based on applied filters"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#d7dce7] bg-white p-4">
            <h2 className="text-base font-semibold text-[#0f172a]">
              Supported Functions
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Function
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Support
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {REPORT_FUNCTION_LABELS.map((item) => {
                    const supported = Boolean(report.functionSupport[item.key]);
                    return (
                      <tr key={item.key} className="border-b border-[#eef2f7]">
                        <td className="px-3 py-2 text-sm text-[#334155]">
                          {item.label}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span
                            className={
                              supported
                                ? "rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]"
                                : "rounded bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#475569]"
                            }
                          >
                            {supported ? "Supported" : "Not Supported"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {isExportOpen ? (
        <div className="absolute right-6 top-16 z-40 w-[240px] rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
          {["PDF", "XLSX (Microsoft Excel)", "CSV (Comma Separated Value)", "Print"].map(
            (label) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setIsExportOpen(false);
                  toast.success(`Export ${label} started`);
                }}
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-[#f8fafc]"
              >
                {label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
