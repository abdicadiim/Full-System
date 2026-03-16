import React, { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ReportDetailHeader from "./ReportDetailHeader";
import { getCategoryById, getReportById, REPORT_FUNCTION_LABELS } from "./reportsCatalog";

const formatDate = (value: Date) => value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

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

