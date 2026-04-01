import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  CalendarClock,
  Folder,
  House,
  MoreVertical,
  Search,
  Share2,
  Star,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "react-toastify";
import { getCategoryById, REPORTS, REPORT_CATEGORIES } from "./reportsCatalog";
import { useButtonStyles } from "../../hooks/useThemeColors";

type QuickView = "home" | "favorites" | "shared" | "my" | "scheduled";
type ReportPickerItem = { id: string; label: string };
type ReportPickerGroup = { label: string; items: ReportPickerItem[] };

const FAVORITES_KEY = "reports_center_favorites_v1";
const LAST_VISITED_KEY = "reports_center_last_visited_v1";
const CUSTOM_REPORTS_KEY = "reports_center_custom_reports_v1";

type SavedCustomReport = {
  id: string;
  categoryId: string;
  sourceReportId: string;
  sourceReportName: string;
  name: string;
  exportName: string;
  description: string;
  shareWith: string;
  createdAt: string;
};

type ReportRow = (typeof REPORTS)[number] & {
  createdBy?: string;
  lastVisited?: string;
  isCustom?: boolean;
  sourceReportId?: string;
  sourceReportName?: string;
};

const QUICK_VIEWS: { id: QuickView; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "shared", label: "Shared Reports", icon: Share2 },
  { id: "my", label: "My Reports", icon: UserRound },
  { id: "scheduled", label: "Scheduled Reports", icon: CalendarClock },
];

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const saveJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const formatLastVisited = (iso?: string) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toCategoryLabel = (categoryId: string) => {
  const category = getCategoryById(categoryId);
  if (!category) return "-";
  return category.name.replace(" Reports", "").replace(" and ", " & ");
};

const cleanLabel = (label: string) => label.replace(" Reports", "").replace(" and ", " & ");

const CUSTOM_REPORT_PICKER_GROUPS: ReportPickerGroup[] = [
  {
    label: "Sales",
    items: [
      { id: "sales-by-customer", label: "Sales by Customer" },
      { id: "sales-by-item", label: "Sales by Item" },
      { id: "sales-by-plan", label: "Sales by Plan" },
      { id: "sales-by-addon", label: "Sales by Addon" },
      { id: "sales-by-coupon", label: "Sales by Coupons" },
      { id: "sales-by-sales-person", label: "Sales by Sales Person" },
      { id: "sales-summary", label: "Sales Summary" },
    ],
  },
  {
    label: "Receivables",
    items: [
      { id: "ar-aging-summary", label: "AR Aging Summary" },
      { id: "ar-aging-details", label: "AR Aging Details" },
      { id: "invoice-details", label: "Invoice Details" },
      { id: "retainer-invoice-details", label: "Retainer Invoice Details" },
      { id: "quote-details", label: "Quote Details" },
      { id: "customer-balance-summary", label: "Customer Balance Summary" },
      { id: "receivable-details", label: "Receivable Details" },
      { id: "progress-invoice-summary", label: "Progress Invoice Summary" },
    ],
  },
  {
    label: "Acquisition Insights",
    items: [
      { id: "active-trials", label: "Active Trials" },
      { id: "inactive-trials", label: "Inactive Trials" },
    ],
  },
  {
    label: "Subscriptions",
    items: [{ id: "subscription-details", label: "Subscription Details" }],
  },
  {
    label: "Retention",
    items: [{ id: "renewal-failures", label: "Renewal Failures" }],
  },
  {
    label: "Churn",
    items: [
      { id: "under-risk", label: "Under Risk" },
      { id: "non-renewing-profiles", label: "Non Renewing Profiles" },
      { id: "churned-after-retries", label: "Churned After Retries" },
      { id: "churned-subscriptions", label: "Churned Subscriptions" },
      { id: "subscription-expiry", label: "Subscription Expiry" },
    ],
  },
  {
    label: "Payments Received",
    items: [
      { id: "payments-received", label: "Payments Received" },
      { id: "time-to-get-paid", label: "Time to Get Paid" },
      { id: "credit-note-details", label: "Credit Note Details" },
      { id: "refund-history", label: "Refund History" },
      { id: "card-expiry", label: "Card Expiry" },
    ],
  },
  {
    label: "Purchases and Expenses",
    items: [
      { id: "expense-details", label: "Expense Details" },
      { id: "expenses-by-customer", label: "Expenses by Customer" },
      { id: "expenses-by-project", label: "Expenses by Project" },
      { id: "billable-expense-details", label: "Billable Expense Details" },
    ],
  },
  {
    label: "Projects and Timesheet",
    items: [
      { id: "project-summary", label: "Project Summary" },
      { id: "projects-revenue-summary", label: "Projects Revenue Summary" },
    ],
  },
  {
    label: "Activity",
    items: [
      { id: "system-mails", label: "System Mails" },
      { id: "activity-logs-audit-trail", label: "Activity Logs" },
      { id: "exception-report", label: "Exception Report" },
      { id: "portal-activities", label: "Portal Activities" },
    ],
  },
];

const CUSTOM_REPORT_LABEL_BY_ID = CUSTOM_REPORT_PICKER_GROUPS.reduce((acc, group) => {
  group.items.forEach((item) => {
    acc[item.id] = item.label;
  });
  return acc;
}, {} as Record<string, string>);

export default function ReportsCenterPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const category = categoryId ? getCategoryById(categoryId) : null;
  const [quickView, setQuickView] = useState<QuickView>("home");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [lastVisited, setLastVisited] = useState<Record<string, string>>({});
  const [customReports, setCustomReports] = useState<SavedCustomReport[]>([]);
  const [isCustomReportModalOpen, setIsCustomReportModalOpen] = useState(false);
  const [selectedCustomReportId, setSelectedCustomReportId] = useState("");
  const [isCustomReportPickerOpen, setIsCustomReportPickerOpen] = useState(false);
  const [customReportSearch, setCustomReportSearch] = useState("");
  const customReportPickerRef = useRef<HTMLDivElement>(null);
  const { getPrimaryStyle } = useButtonStyles();

  useEffect(() => {
    setFavorites(loadJson<string[]>(FAVORITES_KEY, []));
    setLastVisited(loadJson<Record<string, string>>(LAST_VISITED_KEY, {}));
    setCustomReports(loadJson<SavedCustomReport[]>(CUSTOM_REPORTS_KEY, []));
  }, []);

  useEffect(() => {
    if (!isCustomReportPickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (customReportPickerRef.current && target && !customReportPickerRef.current.contains(target)) {
        setIsCustomReportPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCustomReportPickerOpen]);

  if (categoryId && !category) {
    return <Navigate to="/reports" replace />;
  }

  const rows = useMemo<ReportRow[]>(() => {
    const savedRows: ReportRow[] = customReports.map((report) => ({
      id: report.id,
      categoryId: report.categoryId,
      name: report.name,
      summary: report.description || `Custom report based on ${report.sourceReportName}`,
      howItHelps: report.description || `Custom report based on ${report.sourceReportName}`,
      functionSupport: {},
      createdBy: "You",
      sourceReportId: report.sourceReportId,
      sourceReportName: report.sourceReportName,
      isCustom: true,
    }));

    let filtered: ReportRow[] = [
      ...savedRows,
      ...REPORTS.map((report) => ({
        ...report,
        createdBy: "System Generated",
        sourceReportId: report.id,
      })),
    ];

    if (categoryId) {
      filtered = filtered.filter((report) => report.categoryId === categoryId);
    }

    if (quickView === "favorites") {
      filtered = filtered.filter((report) => favorites.includes(report.id));
    } else if (quickView === "shared") {
      filtered = filtered.filter((_, index) => index % 2 === 0);
    } else if (quickView === "my") {
      filtered = filtered.filter((_, index) => index % 3 === 0);
    } else if (quickView === "scheduled") {
      filtered = filtered.filter((_, index) => index % 4 === 0);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((report) => {
        const categoryName = toCategoryLabel(report.categoryId);
        return report.name.toLowerCase().includes(q) || categoryName.toLowerCase().includes(q);
      });
    }

    return filtered;
  }, [categoryId, favorites, quickView, search, customReports]);

  const toggleFavorite = (reportId: string) => {
    const updated = favorites.includes(reportId) ? favorites.filter((id) => id !== reportId) : [...favorites, reportId];
    setFavorites(updated);
    saveJson(FAVORITES_KEY, updated);
  };

  const markVisited = (reportId: string) => {
    const next = { ...lastVisited, [reportId]: new Date().toISOString() };
    setLastVisited(next);
    saveJson(LAST_VISITED_KEY, next);
  };

  const handleHomeClick = () => {
    setQuickView("home");
    navigate("/reports");
  };

  const openCustomReportModal = () => {
    setIsCustomReportModalOpen(true);
    setIsCustomReportPickerOpen(false);
    setCustomReportSearch("");
  };

  const closeCustomReportModal = () => {
    setIsCustomReportModalOpen(false);
    setSelectedCustomReportId("");
    setIsCustomReportPickerOpen(false);
    setCustomReportSearch("");
  };

  const handleProceedCustomReport = () => {
    const selectedReport = REPORTS.find((report) => report.id === selectedCustomReportId);
    if (!selectedReport) {
      toast.info("Please select a report first.");
      return;
    }

    navigate(`/reports/custom/create?reportName=${encodeURIComponent(selectedReport.name)}`, {
      state: { reportName: selectedReport.name },
    });
    closeCustomReportModal();
  };

  const selectedCustomReportLabel = CUSTOM_REPORT_LABEL_BY_ID[selectedCustomReportId] || "";

  const filteredCustomReportGroups = useMemo(() => {
    const q = customReportSearch.trim().toLowerCase();
    if (!q) return CUSTOM_REPORT_PICKER_GROUPS;

    return CUSTOM_REPORT_PICKER_GROUPS.reduce<ReportPickerGroup[]>((groups, group) => {
      const groupMatches = group.label.toLowerCase().includes(q);
      const matchingItems = group.items.filter((item) => item.label.toLowerCase().includes(q));

      if (groupMatches) {
        groups.push(group);
      } else if (matchingItems.length > 0) {
        groups.push({ label: group.label, items: matchingItems });
      }

      return groups;
    }, []);
  }, [customReportSearch]);

  const selectCustomReport = (reportId: string) => {
    setSelectedCustomReportId(reportId);
    setIsCustomReportPickerOpen(false);
    setCustomReportSearch("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#d8deea] bg-[#f5f7fb] text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <header className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b border-[#e2e8f0] bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-[24px] font-medium tracking-[-0.02em] text-[#27324a] lg:text-[26px]">Reports Center</h1>

        <div className="flex flex-1 justify-center px-0 lg:px-6">
          <div className="relative w-full max-w-[260px] lg:max-w-[280px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#3b82f6]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports"
              className="h-10 w-full rounded-[12px] border border-[#e5e9f3] bg-[#f6f7fb] pl-10 pr-3 text-sm text-[#334155] outline-none transition focus:border-[#b9c7e8] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={openCustomReportModal}
            className="h-10 shrink-0 whitespace-nowrap rounded-[10px] px-4 text-sm font-semibold text-white shadow-none transition"
            style={getPrimaryStyle(false)}
          >
            Create Custom Report
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e0e6f0] bg-[#f8fafc] text-[#334155] transition hover:bg-white"
            aria-label="More actions"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div
        className="h-[34px] border-b border-[#e6ebf3] bg-[#f7f9fd]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18px 18px, rgba(148,163,184,0.18) 0 1px, transparent 1.5px), radial-gradient(circle at 92px 14px, rgba(148,163,184,0.16) 0 1px, transparent 1.5px), radial-gradient(circle at 160px 24px, rgba(148,163,184,0.14) 0 1px, transparent 1.5px), radial-gradient(circle at 240px 12px, rgba(148,163,184,0.12) 0 1px, transparent 1.5px), linear-gradient(45deg, rgba(148,163,184,0.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.08) 75%)",
          backgroundSize: "260px 34px, 260px 34px, 260px 34px, 260px 34px, 20px 20px, 20px 20px, 20px 20px, 20px 20px",
          backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      />

      <div className="grid min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#dbe2ed] bg-white">
          <div className="flex-1 overflow-auto px-2 py-2">
            <nav className="space-y-1">
              {QUICK_VIEWS.map((item) => {
                const Icon = item.icon;
                const active = quickView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.id === "home" ? handleHomeClick : () => setQuickView(item.id)}
                    className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[14px] transition ${
                      active ? "bg-[#eef3ff] text-[#1e293b]" : "text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-[#3b82f6]" : "text-[#a3afc1]"} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <p className="mt-6 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">Report Category</p>
            <nav className="mt-2 space-y-1">
              {REPORT_CATEGORIES.map((reportCategory) => {
                const isActive = categoryId === reportCategory.id;
                return (
                  <Link
                    key={reportCategory.id}
                    to={`/reports/${reportCategory.id}`}
                    className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] transition ${
                      isActive ? "bg-[#eef3ff] text-[#1e293b]" : "text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <Folder size={16} className={isActive ? "text-[#3b82f6]" : "text-[#a3afc1]"} />
                    <span>{cleanLabel(reportCategory.name)}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#dbe2ed] bg-white">
          <div className="border-b border-[#e8edf5] px-4 py-3">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#0f172a]">
              {category ? cleanLabel(category.name) : "All Reports"}
              <span className="inline-flex h-6 items-center rounded-full bg-[#eaf2ff] px-2.5 text-[13px] font-semibold text-[#3b82f6]">
                {rows.length}
              </span>
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b border-[#e8edf5] bg-[#fafbfe]">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Report Name</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Report Category</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Created By</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Last Visited</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#64748b]">
                      No reports found for this view.
                    </td>
                  </tr>
                ) : (
                  rows.map((report) => {
                    const isFavorite = favorites.includes(report.id);
                    const reportHref = `/reports/${report.categoryId}/${report.id}`;
                    return (
                      <tr key={report.id} className="border-b border-[#edf1f7] transition hover:bg-[#fcfdff]">
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => toggleFavorite(report.id)}
                            className="inline-flex h-5 w-5 items-center justify-center"
                            aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                          >
                            <Star size={14} className={isFavorite ? "fill-[#f6b63f] text-[#f6b63f]" : "text-[#cbd5e1]"} />
                          </button>
                        </td>
                        <td className="px-3 py-3 text-[14px]">
                          <Link
                            to={reportHref}
                            onClick={() => markVisited(report.id)}
                            className="text-[#2563eb] no-underline transition hover:no-underline visited:no-underline"
                          >
                            {report.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-[14px] text-[#334155]">{toCategoryLabel(report.categoryId)}</td>
                        <td className="px-3 py-3 text-[14px] text-[#334155]">{report.createdBy || "System Generated"}</td>
                        <td className="px-3 py-3 text-[14px] text-[#334155]">{formatLastVisited(lastVisited[report.id])}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isCustomReportModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-0 backdrop-blur-[1px]"
          onClick={closeCustomReportModal}
        >
          <div
            className="w-full max-w-[560px] overflow-visible rounded-[10px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e7ebf3] px-5 py-4">
              <h3 className="text-[17px] font-medium text-[#1f2937]">New Custom Report</h3>
              <button
                type="button"
                onClick={closeCustomReportModal}
                className="text-[22px] leading-none text-[#ef4444] transition hover:text-[#dc2626]"
                aria-label="Close custom report modal"
              >
                X
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-[14px] leading-6 text-[#5b667a]">
                Select the report that you want to customize and create a new custom report.
              </p>

              <div className="relative mt-3" ref={customReportPickerRef}>
                <button
                  type="button"
                  onClick={() => setIsCustomReportPickerOpen((current) => !current)}
                  className={`flex h-10 w-full items-center justify-between rounded-[6px] border bg-white px-3 text-left text-[14px] outline-none transition ${
                    isCustomReportPickerOpen ? "border-[#d7dce7] shadow-[0_0_0_1px_rgba(215,220,231,0.9)]" : "border-[#d7dce7] hover:border-[#b9c3d6]"
                  }`}
                >
                  <span className={selectedCustomReportLabel ? "text-[#475569]" : "text-[#94a3b8]"}>
                    {selectedCustomReportLabel || "Select a Report"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-[#94a3b8] transition-transform ${isCustomReportPickerOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isCustomReportPickerOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] overflow-hidden rounded-[8px] border border-[#d7dce7] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
                    <div className="border-b border-[#e6ecf6] p-2">
                      <div className="flex h-10 items-center gap-2 rounded-[6px] border border-[#d7dce7] bg-white px-3">
                        <Search size={14} className="shrink-0 text-[#94a3b8]" />
                        <input
                          value={customReportSearch}
                          onChange={(event) => setCustomReportSearch(event.target.value)}
                          placeholder="Search"
                          className="h-full w-full border-0 bg-transparent text-[14px] text-[#334155] outline-none placeholder:text-[#94a3b8]"
                        />
                      </div>
                    </div>

                    <div className="max-h-[280px] overflow-y-auto py-1">
                      {filteredCustomReportGroups.length === 0 ? (
                        <div className="px-4 py-5 text-sm text-[#64748b]">No reports found.</div>
                      ) : (
                        filteredCustomReportGroups.map((group) => (
                          <div key={group.label} className="pb-1">
                            <div className="px-3 pb-1 pt-2 text-[15px] font-semibold text-[#1f2937]">{group.label}</div>
                            <div className="space-y-0.5">
                              {group.items.map((item) => {
                                const active = selectedCustomReportId === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => selectCustomReport(item.id)}
                                    className={`flex w-full items-center rounded-[6px] px-4 py-2 text-left text-[14px] transition ${
                                      active ? "bg-[#eef2f7] text-[#1f2937]" : "text-[#365071] hover:bg-[#f3f4f6]"
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-[#edf1f7] px-5 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleProceedCustomReport}
                  className="h-9 rounded-[4px] px-4 text-[14px] font-medium text-white transition"
                  style={{ backgroundColor: "#156372" }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#0D4A52";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "#156372";
                  }}
                >
                  Proceed
                </button>
                <button
                  type="button"
                  onClick={closeCustomReportModal}
                  className="h-9 rounded-[4px] border border-[#d1d5db] bg-[#f8f8f8] px-4 text-[14px] font-medium text-[#1f2937] transition hover:bg-[#f3f4f6]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
