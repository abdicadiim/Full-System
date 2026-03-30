import React, { useEffect, useMemo, useState } from "react";
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
    reportIds: ["payments-received", "time-to-get-paid", "credit-note-details", "refund-history", "withholding-tax"],
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [lastVisited, setLastVisited] = useState<Record<string, string>>({});

  useEffect(() => {
    setFavorites(loadJson<string[]>(FAVORITES_KEY, []));
    setLastVisited(loadJson<Record<string, string>>(LAST_VISITED_KEY, {}));
  }, []);

  if (categoryId && !category) {
    return <Navigate to="/reports" replace />;
  }

  const sections = useMemo<ReportSectionView[]>(() => {
    const query = search.trim().toLowerCase();
    return REPORT_SECTIONS.filter((section) => {
      if (categoryId && section.id !== categoryId) return false;

      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const orderedReports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;

      const filteredReports = query
        ? orderedReports.filter((report) => report.name.toLowerCase().includes(query) || section.label.toLowerCase().includes(query))
        : orderedReports;

      return filteredReports.length > 0;
    }).map((section) => {
      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const reports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;

      const query = search.trim().toLowerCase();
      const filteredReports = query
        ? reports.filter((report) => report.name.toLowerCase().includes(query) || section.label.toLowerCase().includes(query))
        : reports;

      return { ...section, reports: filteredReports };
    });
  }, [categoryId, search]);

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
    <div className="min-h-screen bg-[#f7f8fb] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[680px]">
        <div className="px-2 pt-6 text-center">
          <h1 className="text-[28px] font-medium text-[#0f172a]">Reports Center</h1>

          <div className="relative mx-auto mt-4 w-full max-w-[460px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports"
              className="h-10 w-full rounded-lg border border-[#d8dfea] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#9bb5ff]"
            />
          </div>
        </div>

        <div className="mt-8 rounded-[16px] border border-[#d8dfea] bg-white px-6 py-6 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:px-8">
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
                          className="min-w-0 truncate text-[13px] text-[#2b6bf3] hover:underline"
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

