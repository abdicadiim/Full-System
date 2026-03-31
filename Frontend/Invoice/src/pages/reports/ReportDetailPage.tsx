import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CalendarDays, ChevronDown, ChevronRight, Columns3, Folder, Menu, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import ReportDetailHeader from "./ReportDetailHeader";
import { getCategoryById, getReportById, REPORT_FUNCTION_LABELS, REPORTS_BY_CATEGORY } from "./reportsCatalog";

const formatDate = (value: Date) => value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

type SalesByCustomerRow = {
  name: string;
  invoiceCount: number;
  sales: number;
  salesWithTax: number;
};

const SALES_BY_CUSTOMER_ROWS: SalesByCustomerRow[] = [
  { name: "ss", invoiceCount: 2, sales: 44, salesWithTax: 44 },
];

const formatCurrency = (value: number, currency = "SOS") => `${currency}${value.toFixed(2)}`;

type ReportsDrawerSection = {
  id: string;
  label: string;
  reportIds: string[];
};

const REPORTS_DRAWER_SECTIONS: ReportsDrawerSection[] = [
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
    reportIds: ["system-mails", "activity-logs-audit-trail", "exception-report", "portal-activities", "customer-reviews"],
  },
];

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
    return REPORTS_DRAWER_SECTIONS.map((section) => {
      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const reports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;

      const filteredReports = query
        ? reports.filter((report) => report.name.toLowerCase().includes(query) || section.label.toLowerCase().includes(query))
        : reports;

      return { ...section, reports: filteredReports };
    }).filter((section) => section.reports.length > 0);
  }, [search]);

  if (!open) return null;

  const isSearching = search.trim().length > 0;

  return (
    <div ref={drawerRef} className="absolute left-0 top-0 z-30 h-full w-[260px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <div className="text-[18px] font-semibold text-[#0f172a]">Reports</div>
          <button type="button" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]" aria-label="Close reports drawer">
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-[#eef2f7] px-3 py-3">
          <div className="relative">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports"
              className="h-9 w-full rounded-lg border border-[#d8dfea] bg-white pl-3 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#7da0ff]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">All Reports</div>

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
                          prev.includes(section.id) ? prev.filter((id) => id !== section.id) : [...prev, section.id]
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
                                isActive ? "bg-[#eef4ff] font-medium text-[#111827]" : "text-[#2563eb]"
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

function SalesByCustomerReportView({
  categoryName,
  reportName,
  menuButtonRef,
  onMenuClick,
  onRunReport,
}: {
  categoryName: string;
  reportName: string;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onMenuClick: () => void;
  onRunReport: () => void;
}) {
  const todayLabel = formatDate(new Date());
  const totalInvoiceCount = SALES_BY_CUSTOMER_ROWS.reduce((sum, row) => sum + row.invoiceCount, 0);
  const totalSales = SALES_BY_CUSTOMER_ROWS.reduce((sum, row) => sum + row.sales, 0);
  const totalSalesWithTax = SALES_BY_CUSTOMER_ROWS.reduce((sum, row) => sum + row.salesWithTax, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e7eb] pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Toggle reports menu"
          >
            <Menu size={15} />
          </button>
          <div>
            <p className="text-sm font-medium text-[#2563eb]">{categoryName}</p>
            <h1 className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]">
              <span>{reportName}</span>
              <span className="text-sm font-normal text-[#475569]">- From {todayLabel} To {todayLabel}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <SlidersHorizontal size={15} />
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
          >
            Export <ChevronDown size={14} />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <RefreshCw size={15} />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#e6e9f0] pb-3 text-sm">
        <span className="text-[#334155]">Filters :</span>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155] hover:bg-white">
          <CalendarDays size={14} className="text-[#64748b]" />
          Date Range : <span className="font-medium">Today</span> <ChevronDown size={14} />
        </button>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155] hover:bg-white">
          Entities : <span className="font-medium">Invoice</span> <ChevronDown size={14} />
        </button>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]">
          <Plus size={14} className="text-[#2563eb]" /> More Filters
        </button>
        <button
          type="button"
          onClick={onRunReport}
          className="inline-flex h-8 items-center gap-1 rounded bg-[#7aa7ff] px-4 text-sm font-semibold text-white hover:bg-[#6498ff]"
        >
          <CalendarDays size={14} /> Run Report
        </button>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white">
        <div className="flex flex-wrap items-center justify-end gap-4 border-b border-[#eef2f7] px-4 py-3 text-sm text-[#475569]">
          <button type="button" className="inline-flex items-center gap-1 hover:text-[#0f172a]">
            Compare With : <span className="font-semibold text-[#0f172a]">None</span> <ChevronDown size={14} />
          </button>
          <button type="button" className="inline-flex items-center gap-1 hover:text-[#0f172a]">
            <Columns3 size={14} />
            Customize Report Columns
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dbeafe] px-1 text-[11px] font-semibold text-[#2563eb]">
              4
            </span>
          </button>
        </div>

        <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
          <h2 className="mt-2 text-[22px] font-semibold text-[#111827]">{reportName}</h2>
          <p className="mt-1 text-sm text-[#475569]">From {todayLabel} To {todayLabel}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[11px] uppercase tracking-[0.08em] text-[#64748b]">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 text-center font-semibold">Invoice Count</th>
                <th className="px-4 py-3 text-center font-semibold">Sales</th>
                <th className="px-4 py-3 text-center font-semibold">Sales With Tax</th>
              </tr>
            </thead>
            <tbody>
              {SALES_BY_CUSTOMER_ROWS.map((row) => (
                <tr key={row.name} className="border-b border-[#eef2f7]">
                  <td className="px-4 py-3 text-sm font-medium text-[#2563eb]">{row.name}</td>
                  <td className="px-4 py-3 text-center text-sm text-[#2563eb]">{row.invoiceCount}</td>
                  <td className="px-4 py-3 text-center text-sm text-[#2563eb]">{formatCurrency(row.sales)}</td>
                  <td className="px-4 py-3 text-center text-sm text-[#2563eb]">{formatCurrency(row.salesWithTax)}</td>
                </tr>
              ))}
              <tr className="border-b border-[#e5e7eb]">
                <td className="px-4 py-3 text-sm font-semibold text-[#111827]">Total</td>
                <td className="px-4 py-3 text-center text-sm text-[#111827]">{totalInvoiceCount}</td>
                <td className="px-4 py-3 text-center text-sm text-[#111827]">{formatCurrency(totalSales)}</td>
                <td className="px-4 py-3 text-center text-sm text-[#111827]">{formatCurrency(totalSalesWithTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReportDetailPage() {
  const { categoryId, reportId } = useParams();
  const category = getCategoryById(categoryId || "");
  const report = getReportById(categoryId || "", reportId || "");
  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const reportsMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  const dateLabel = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `From ${formatDate(from)} To ${formatDate(to)}`;
  }, []);

  const [calculatorInputs, setCalculatorInputs] = useState<Record<string, number>>(() => {
    if (!report?.calculator) return {};
    return report.calculator.fields.reduce((acc, field) => {
      acc[field.key] = field.defaultValue;
      return acc;
    }, {} as Record<string, number>);
  });

  if (!categoryId || !reportId || !category || !report) {
    return <Navigate to="/reports" replace />;
  }

  const calculatorResult = report.calculator ? report.calculator.calculate(calculatorInputs) : null;
  const calculatorPrecision = report.calculator?.precision ?? 2;

  if (report.id === "sales-by-customer") {
    return (
      <div className="relative min-h-[calc(100vh-64px)] pt-3">
        <ReportsDrawer
          open={isReportsDrawerOpen}
          currentCategoryId={category.id}
          currentReportId={report.id}
          triggerRef={reportsMenuButtonRef}
          onClose={() => setIsReportsDrawerOpen(false)}
        />
        <div className={`pr-3 transition-[padding-left] duration-200 ${isReportsDrawerOpen ? "lg:pl-[260px]" : ""}`}>
          <SalesByCustomerReportView
            categoryName={category.name}
            reportName={report.name}
            menuButtonRef={reportsMenuButtonRef}
            onMenuClick={() => setIsReportsDrawerOpen((prev) => !prev)}
            onRunReport={() => toast.success(`Report refreshed: ${report.name}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReportDetailHeader
        categoryName={category.name}
        reportName={report.name}
        dateLabel={dateLabel}
        onRunReport={() => toast.success(`Report refreshed: ${report.name}`)}
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-[#d7dce7] bg-white p-4 xl:col-span-2">
          <h2 className="text-base font-semibold text-[#0f172a]">Report Overview</h2>
          <p className="mt-2 text-sm text-[#475569]">{report.summary}</p>

          <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">How It Helps</h3>
          <p className="mt-1 text-sm text-[#475569]">{report.howItHelps}</p>

          {report.formula ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">Logic / Formula</h3>
              <p className="mt-1 rounded border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#1e293b]">{report.formula}</p>
            </>
          ) : null}

          {report.logicNotes?.length ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">Logic Notes</h3>
              <ul className="mt-1 space-y-1 text-sm text-[#475569]">
                {report.logicNotes.map((note) => (
                  <li key={note}>- {note}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#d7dce7] bg-white p-4">
          <h2 className="text-base font-semibold text-[#0f172a]">Source and Basis</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div>
              <p className="font-medium text-[#334155]">Category</p>
              <p className="text-[#64748b]">{category.name}</p>
            </div>
            <div>
              <p className="font-medium text-[#334155]">Accounting Basis</p>
              <p className="text-[#64748b]">{report.basis || "As configured in report settings"}</p>
            </div>
            <div>
              <p className="font-medium text-[#334155]">Source</p>
              <p className="text-[#64748b]">{report.source || "Entity-specific source based on applied filters"}</p>
            </div>
          </div>
        </div>
      </section>

      {report.calculator ? (
        <section className="rounded-lg border border-[#d7dce7] bg-white p-4">
          <h2 className="text-base font-semibold text-[#0f172a]">Logic Check</h2>
          <p className="mt-1 text-sm text-[#64748b]">Use this calculator to validate the reporting formula with your own values.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {report.calculator.fields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#64748b]">{field.label}</span>
                <input
                  type="number"
                  value={calculatorInputs[field.key] ?? 0}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCalculatorInputs((prev) => ({ ...prev, [field.key]: Number.isFinite(value) ? value : 0 }));
                  }}
                  className="h-9 w-full rounded border border-[#cfd6e4] px-3 text-sm text-[#0f172a] outline-none focus:border-[#2563eb]"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 rounded border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#1d4ed8]">{report.calculator.resultLabel}</p>
            <p className="text-2xl font-semibold text-[#1e40af]">{(calculatorResult || 0).toFixed(calculatorPrecision)}</p>
            {report.calculator.helpText ? <p className="mt-1 text-xs text-[#1e3a8a]">{report.calculator.helpText}</p> : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-[#d7dce7] bg-white p-4">
        <h2 className="text-base font-semibold text-[#0f172a]">Supported Functions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">Function</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">Support</th>
              </tr>
            </thead>
            <tbody>
              {REPORT_FUNCTION_LABELS.map((item) => {
                const supported = Boolean(report.functionSupport[item.key]);
                return (
                  <tr key={item.key} className="border-b border-[#eef2f7]">
                    <td className="px-3 py-2 text-sm text-[#334155]">{item.label}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className={supported ? "rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]" : "rounded bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#475569]"}>
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
  );
}

