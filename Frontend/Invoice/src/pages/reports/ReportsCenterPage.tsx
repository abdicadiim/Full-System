import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Folder, Search, Star } from "lucide-react";
import { getCategoryById, REPORTS_BY_CATEGORY } from "./reportsCatalog";
import type { ReportDefinition } from "./types";

type ReportSection = {
  id: string;
  label: string;
  reportIds: string[];
};

type ReportSectionView = ReportSection & {
  reports: ReportDefinition[];
};

const FAVORITES_KEY = "reports_center_favorites_v1";
const LAST_VISITED_KEY = "reports_center_last_visited_v1";

const REPORT_SECTIONS: ReportSection[] = [
  { id: "sales", label: "Sales", reportIds: ["sales-by-customer", "sales-by-item", "sales-by-sales-person"] },
  {
    id: "receivables",
    label: "Receivables",
    reportIds: [
      "ar-aging-summary",
      "ar-aging-details",
      "invoice-details",
      "quote-details",
      "bad-debts",
      "bank-charges",
      "customer-balance-summary",
      "receivable-summary",
      "receivable-details",
    ],
  },
  {
    id: "payments-received",
    label: "Payments Received",
    reportIds: ["refund-history"],
  },
  { id: "subscriptions", label: "Recurring Invoices", reportIds: ["subscription-details"] },
  {
    id: "purchases-expenses",
    label: "Purchases and Expenses",
    reportIds: ["expense-details", "expenses-by-category", "expenses-by-customer", "expenses-by-project", "billable-expense-details"],
  },
  { id: "taxes", label: "Taxes", reportIds: ["tax-summary", "tds-receivables"] },
  {
    id: "projects-timesheets",
    label: "Projects and Timesheet",
    reportIds: ["timesheet-details", "project-summary", "project-details", "projects-revenue-summary"],
  },
  {
    id: "activity",
    label: "Activity",
    reportIds: ["system-mails", "exception-report", "customer-reviews", "activity-logs-audit-trail", "portal-activities"],
  },
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

export default function ReportsCenterPage() {
  const { categoryId } = useParams();
  const category = categoryId ? getCategoryById(categoryId) : null;
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [lastVisited, setLastVisited] = useState<Record<string, string>>({});
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setFavorites(loadJson<string[]>(FAVORITES_KEY, []));
    setLastVisited(loadJson<Record<string, string>>(LAST_VISITED_KEY, {}));
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchBoxRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (categoryId && !category) {
    return <Navigate to="/reports" replace />;
  }

  const sections = useMemo<ReportSectionView[]>(() => {
    return REPORT_SECTIONS.filter((section) => {
      if (categoryId && section.id !== categoryId) return false;

      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const orderedReports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;

      return orderedReports.length > 0;
    }).map((section) => {
      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const reports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;

      return { ...section, reports };
    });
  }, [categoryId]);

  const searchResults = useMemo<ReportSectionView[]>(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    return REPORT_SECTIONS.filter((section) => {
      if (categoryId && section.id !== categoryId) return false;

      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const reports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;

      const filteredReports = reports.filter((report) => report.name.toLowerCase().includes(query) || section.label.toLowerCase().includes(query));
      return filteredReports.length > 0;
    }).map((section) => {
      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const reports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;

      const filteredReports = reports.filter((report) => {
        const queryValue = search.trim().toLowerCase();
        return report.name.toLowerCase().includes(queryValue) || section.label.toLowerCase().includes(queryValue);
      });

      return { ...section, reports: filteredReports };
    });
  }, [categoryId, search]);

  const dropdownSections = search.trim() ? searchResults : sections;

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
    <div className="min-h-screen bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[1120px]">
        <div className="flex flex-col gap-4 px-2 pt-6 md:flex-row md:items-center md:justify-between">
          <h1 className="text-[28px] font-medium text-[#0f172a]">Reports Center</h1>

          <div ref={searchBoxRef} className="relative w-full md:max-w-[460px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search reports"
              className={`h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] ${
                isSearchOpen ? "border-[#7da0ff] shadow-[0_0_0_1px_rgba(125,160,255,0.18)]" : "border-[#d8dfea]"
              } focus:border-[#7da0ff]`}
            />

            {isSearchOpen ? (
              <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-full overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                {dropdownSections.length > 0 ? (
                  <div className="max-h-[320px] overflow-y-auto">
                    {dropdownSections.map((section) => (
                      <div key={section.id} className="border-b border-[#eef2f7] last:border-b-0">
                        <div className="bg-[#f8fafc] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#111827]">
                          {section.label}
                        </div>
                        <div className="py-1">
                          {section.reports.map((report) => (
                            <Link
                              key={report.id}
                              to={`/reports/${report.categoryId}/${report.id}`}
                              onClick={() => {
                                markVisited(report.id);
                                setSearch("");
                                setIsSearchOpen(false);
                              }}
                              className="block px-5 py-2 text-[13px] text-[#1d4ed8] hover:bg-[#f8fafc]"
                            >
                              {report.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-[#64748b]">No reports found.</div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 px-2 py-2 sm:px-4">
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.id}>
                <div className="flex items-center gap-2 text-[16px] font-medium text-[#111827]">
                  <Folder size={16} className="text-[#8a94a6]" />
                  <span>{section.label}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-x-12 gap-y-1 md:grid-cols-2">
                  {section.reports.map((report) => {
                    const isFavorite = favorites.includes(report.id);
                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between gap-3 border-b border-dashed border-[#dbe2ee] py-2"
                      >
                        <Link
                          to={`/reports/${report.categoryId}/${report.id}`}
                          onClick={() => markVisited(report.id)}
                          className="min-w-0 truncate text-[13px] text-[#111827] hover:underline hover:text-black"
                        >
                          {report.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(report.id)}
                          className="inline-flex h-5 w-5 flex-none items-center justify-center text-[#c3ccd9]"
                          aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                        >
                          <Star size={14} className={isFavorite ? "fill-[#f5b301] text-[#f5b301]" : "text-[#d3dbe7]"} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {sections.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#64748b]">No reports found for this view.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

