import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Folder, X } from "lucide-react";
import PaymentsReceivedReportView from "./PaymentsReceivedReportPage";
import { REPORTS_BY_CATEGORY, getCategoryById, getReportById } from "./reportsCatalog";

function ReportsDrawer({
  open,
  currentCategoryId,
  currentReportId,
  triggerRef,
  onClose,
}: {
  open: boolean;
  currentCategoryId: string;
  currentReportId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([currentCategoryId]);

  useEffect(() => {
    setExpandedSections((prev) => (prev.includes(currentCategoryId) ? prev : [currentCategoryId]));
  }, [currentCategoryId]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!drawerRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, triggerRef]);

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return Object.entries(REPORTS_BY_CATEGORY)
      .map(([categoryId, reports]) => {
        const category = getCategoryById(categoryId);
        if (!category) return null;

        const filteredReports = query
          ? reports.filter(
              (report) =>
                report.name.toLowerCase().includes(query) ||
                category.name.toLowerCase().includes(query),
            )
          : reports;

        return {
          id: categoryId,
          label: category.name,
          reports: filteredReports,
        };
      })
      .filter(Boolean)
      .filter((section) => section.reports.length > 0) as Array<{
      id: string;
      label: string;
      reports: Array<{ id: string; categoryId: string; name: string }>;
    }>;
  }, [search]);

  if (!open) return null;

  const isSearching = search.trim().length > 0;

  return (
    <div
      ref={drawerRef}
      className="absolute left-0 top-0 z-30 h-full w-[260px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <div className="text-[18px] font-semibold text-[#0f172a]">Reports</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close reports drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-[#eef2f7] px-3 py-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reports"
            className="h-9 w-full rounded-lg border border-[#d8dfea] bg-white px-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#7da0ff]"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
            All Reports
          </div>

          {sections.length > 0 ? (
            <div className="space-y-1">
              {sections.map((section) => {
                const expanded = isSearching || expandedSections.includes(section.id);

                return (
                  <div key={section.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSearching) return;
                        setExpandedSections((prev) =>
                          prev.includes(section.id) ? [] : [section.id],
                        );
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-[#111827] hover:bg-[#f8fafc]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Folder size={14} className="text-[#9aa3b2]" />
                        <span className="truncate">{section.label}</span>
                      </span>
                      {expanded ? (
                        <ChevronDown size={12} className="text-[#9aa3b2]" />
                      ) : (
                        <ChevronRight size={12} className="text-[#9aa3b2]" />
                      )}
                    </button>

                    {expanded ? (
                      <div className="ml-5 mt-1 space-y-0.5">
                        {section.reports.map((report) => {
                          const isActive = report.id === currentReportId;
                          return (
                            <Link
                              key={report.id}
                              to={`/reports/${report.categoryId}/${report.id}`}
                              onClick={onClose}
                              className={`block rounded px-2 py-1.5 text-sm hover:bg-[#eef4ff] ${
                                isActive
                                  ? "bg-[#eef4ff] font-medium text-[#111827]"
                                  : "text-[#111827] hover:text-black"
                              }`}
                            >
                              {report.name}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-2 py-4 text-sm text-[#64748b]">No reports found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportActivityDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!drawerRef.current?.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={drawerRef}
      className="absolute right-0 top-0 z-30 h-full w-[300px] overflow-hidden border-l border-[#e5e7eb] bg-white shadow-[-8px_0_20px_rgba(15,23,42,0.08)]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <div className="text-[18px] font-semibold text-[#0f172a]">Report Activity</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close report activity"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 items-start justify-center px-6 pt-8">
          <p className="text-sm text-[#64748b]">No comments yet.</p>
        </div>
      </div>
    </div>
  );
}

export default function RefundHistoryReportPage() {
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const category = getCategoryById("payments-received");
  const report = getReportById("payments-received", "refund-history");
  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const [isReportActivityOpen, setIsReportActivityOpen] = useState(false);

  useEffect(() => {
    setIsReportsDrawerOpen(false);
    setIsReportActivityOpen(false);
  }, [category?.id, report?.id]);

  if (!category || !report) {
    return <Navigate to="/reports" replace />;
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <ReportsDrawer
        open={isReportsDrawerOpen}
        currentCategoryId={category.id}
        currentReportId={report.id}
        triggerRef={menuButtonRef}
        onClose={() => setIsReportsDrawerOpen(false)}
      />
      <ReportActivityDrawer
        open={isReportActivityOpen}
        onClose={() => setIsReportActivityOpen(false)}
      />
      <div
        className={`pr-3 transition-[padding-left,padding-right] duration-200 ${
          isReportsDrawerOpen ? "lg:pl-[260px]" : ""
        } ${isReportActivityOpen ? "lg:pr-[300px]" : ""}`}
      >
        <PaymentsReceivedReportView
          key={report.id}
          categoryName={category.name}
          reportName={report.name}
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setIsReportsDrawerOpen((prev) => !prev)}
          onRunReport={() => {
            // The view refreshes itself after incrementing its own refresh tick.
          }}
          onActivityClick={() => setIsReportActivityOpen((prev) => !prev)}
          onClosePage={() => navigate("/reports")}
          mode="refund-history"
          subtitleMode="from-to"
        />
      </div>
    </div>
  );
}
