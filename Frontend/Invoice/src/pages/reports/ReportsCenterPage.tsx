import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  CalendarClock,
  Folder,
  House,
  MoreVertical,
  Search,
  Share2,
  Star,
  UserRound,
} from "lucide-react";
import { toast } from "react-toastify";
import { getCategoryById, REPORTS, REPORT_CATEGORIES } from "./reportsCatalog";

type QuickView = "home" | "favorites" | "shared" | "my" | "scheduled";

const FAVORITES_KEY = "reports_center_favorites_v1";
const LAST_VISITED_KEY = "reports_center_last_visited_v1";

const QUICK_VIEWS: { id: QuickView; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
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

export default function ReportsCenterPage() {
  const { categoryId } = useParams();
  const category = categoryId ? getCategoryById(categoryId) : null;
  const [quickView, setQuickView] = useState<QuickView>("home");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [lastVisited, setLastVisited] = useState<Record<string, string>>({});

  useEffect(() => {
    setFavorites(loadJson<string[]>(FAVORITES_KEY, []));
    setLastVisited(loadJson<Record<string, string>>(LAST_VISITED_KEY, {}));
  }, []);

  if (categoryId && !category) {
    return <Navigate to="/reports" replace />;
  }

  const rows = useMemo(() => {
    let filtered = [...REPORTS];

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
  }, [categoryId, favorites, quickView, search]);

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

  return (
    <div className="overflow-hidden rounded-lg border border-[#d7dde8] bg-[#f7f8fb]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe4ec] bg-[#f1f3f7] px-4 py-4">
        <h1 className="text-[32px] font-medium text-[#253046]">Reports Center</h1>

        <div className="relative w-full max-w-[360px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#2563eb]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reports"
            className="h-9 w-full rounded-lg border border-[#e2e8f0] bg-[#eaedf3] pl-8 pr-3 text-sm text-[#334155] outline-none focus:border-[#94a3b8]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.info("Custom report builder will be wired next.")}
            className="h-9 rounded-md bg-[#27b26b] px-4 text-sm font-semibold text-white hover:bg-[#1f9a5c]"
          >
            Create Custom Report
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d0d7e4] bg-white text-[#334155]">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      <div className="h-[16px] border-b border-[#dfe4ec] bg-[linear-gradient(45deg,#eef2f8_25%,transparent_25%),linear-gradient(-45deg,#eef2f8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eef2f8_75%),linear-gradient(-45deg,transparent_75%,#eef2f8_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px]" />

      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-[#d7dde8] bg-white">
          <div className="max-h-[calc(100vh-240px)] overflow-auto p-2">
            <div className="space-y-1">
              {QUICK_VIEWS.map((item) => {
                const Icon = item.icon;
                const active = quickView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQuickView(item.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[18px] ${
                      active ? "bg-[#eef2ff] text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-[#3b82f6]" : "text-[#94a3b8]"} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">Report Category</p>
            <div className="mt-2 space-y-1">
              {REPORT_CATEGORIES.map((reportCategory) => {
                const isActive = categoryId === reportCategory.id;
                return (
                  <Link
                    key={reportCategory.id}
                    to={`/reports/${reportCategory.id}`}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-[18px] ${
                      isActive ? "bg-[#eef2ff] text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <Folder size={16} className={isActive ? "text-[#3b82f6]" : "text-[#94a3b8]"} />
                    <span>{reportCategory.name.replace(" Reports", "").replace(" and ", " & ")}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="rounded-lg border border-[#d7dde8] bg-white">
          <div className="border-b border-[#e2e8f0] px-4 py-3">
            <h2 className="flex items-center gap-2 text-[32px] font-medium text-[#0f172a]">
              {category ? category.name.replace(" Reports", "") : "All Reports"}
              <span className="rounded-full bg-[#e6edff] px-2 py-0.5 text-sm font-semibold text-[#2563eb]">{rows.length}</span>
            </h2>
          </div>

          <div className="max-h-[calc(100vh-260px)] overflow-auto">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">Report Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">Report Category</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">Created By</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">Last Visited</th>
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
                    return (
                      <tr key={report.id} className="border-b border-[#edf1f7] hover:bg-[#fcfdff]">
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => toggleFavorite(report.id)}
                            className="inline-flex h-5 w-5 items-center justify-center"
                            aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                          >
                            <Star size={14} className={isFavorite ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#cbd5e1]"} />
                          </button>
                        </td>
                        <td className="px-3 py-3 text-[18px]">
                          <Link
                            to={`/reports/${report.categoryId}/${report.id}`}
                            onClick={() => markVisited(report.id)}
                            className="text-[#2563eb] hover:underline"
                          >
                            {report.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-[18px] text-[#334155]">{toCategoryLabel(report.categoryId)}</td>
                        <td className="px-3 py-3 text-[18px] text-[#334155]">System Generated</td>
                        <td className="px-3 py-3 text-[18px] text-[#334155]">{formatLastVisited(lastVisited[report.id])}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

