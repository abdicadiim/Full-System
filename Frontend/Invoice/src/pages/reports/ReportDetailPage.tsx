import React, { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CalendarDays, ChevronDown, Columns3, Menu, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import ReportDetailHeader from "./ReportDetailHeader";
import { getCategoryById, getReportById, REPORT_FUNCTION_LABELS } from "./reportsCatalog";

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

function SalesByCustomerReportView({
  categoryName,
  reportName,
  onRunReport,
}: {
  categoryName: string;
  reportName: string;
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
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]">
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
          <p className="text-sm text-[#94a3b8]">fdfv</p>
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
      <SalesByCustomerReportView
        categoryName={category.name}
        reportName={report.name}
        onRunReport={() => toast.success(`Report refreshed: ${report.name}`)}
      />
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

