import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CalendarDays,
  ChevronDown,
  Columns3,
  Menu,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { getCategoryById, getReportById } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import {
  customersAPI,
  paymentsReceivedAPI,
  taxesAPI,
} from "../../services/api";

type DateRangePreset =
  | "Today"
  | "This Week"
  | "This Month"
  | "This Quarter"
  | "This Year"
  | "Yesterday"
  | "Previous Week"
  | "Previous Month"
  | "Previous Quarter"
  | "Previous Year"
  | "All Time";

type TdsRow = {
  id: string;
  name: string;
  rate: number | null;
  total: number;
  afterDeduction: number;
  deducted: number;
};

const COLUMN_LABELS = [
  "TDS Name",
  "TDS Percentage",
  "Total",
  "Total After TDS Deduction",
  "Tax Deducted at Source",
];

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const money = (value: number, currency: string) =>
  `${currency}${Math.abs(Number.isFinite(value) ? value : 0).toFixed(2)}`;

const number = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const text = (value: unknown) => String(value ?? "").trim();

const getBounds = (preset: DateRangePreset) => {
  const now = new Date();
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const endOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  switch (preset) {
    case "Today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "Yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case "This Week": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "Previous Week": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "This Month":
      return { start: monthStart, end: monthEnd };
    case "Previous Month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "This Quarter": {
      const quarter = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarter, 1),
        end: new Date(now.getFullYear(), quarter + 3, 0, 23, 59, 59, 999),
      };
    }
    case "Previous Quarter": {
      const quarter = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarter - 3, 1),
        end: new Date(now.getFullYear(), quarter, 0, 23, 59, 59, 999),
      };
    }
    case "This Year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case "Previous Year":
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    case "All Time":
      return { start: new Date(1970, 0, 1), end: endOfDay(now) };
    default:
      return { start: monthStart, end: monthEnd };
  }
};

const extractArray = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const getCustomerName = (customer: any, fallback = "") => {
  const candidates = [
    customer?.displayName,
    customer?.name,
    customer?.companyName,
    fallback,
  ];
  return candidates.map((candidate) => text(candidate)).find(Boolean) || "Unassigned";
};

const resolveTdsTax = (customer: any, taxes: any[]) => {
  const candidateIds = [customer?.tdsTaxId, customer?.tds_tax_id]
    .map((value) => text(value))
    .filter(Boolean);

  const tdsTaxes = taxes.filter((tax) =>
    /tds|withholding/i.test(text(tax?.name || tax?.taxName || tax?.displayName)),
  );

  for (const candidate of candidateIds) {
    const match = tdsTaxes.find((tax) => {
      const id = text(tax?._id || tax?.id);
      const name = text(tax?.name || tax?.taxName || tax?.displayName);
      return id === candidate || name === candidate;
    });
    if (match) return match;
  }

  return tdsTaxes[0] || null;
};

const buildRows = (
  payments: any[],
  customers: any[],
  taxes: any[],
  range: { start: Date; end: Date },
) => {
  const customerById = new Map<string, any>();
  const customerByName = new Map<string, any>();

  for (const customer of customers) {
    const id = text(customer?._id || customer?.id);
    const name = getCustomerName(customer);
    if (id) customerById.set(id.toLowerCase(), customer);
    if (name) customerByName.set(name.toLowerCase(), customer);
  }

  const rows = new Map<string, TdsRow>();

  for (const payment of payments) {
    const date = toDate(payment?.paymentDate || payment?.date || payment?.createdAt);
    if (!date || date < range.start || date > range.end) continue;
    if (String(payment?.taxDeducted || "").toLowerCase() !== "yes") continue;

    const amount = number(payment?.amountReceived ?? payment?.amount ?? 0, 0);
    if (amount <= 0) continue;

    const customerId = text(payment?.customerId || payment?.customer?._id || payment?.customer?.id);
    const customerName = getCustomerName(
      customerById.get(customerId.toLowerCase()) ||
        customerByName.get(text(payment?.customerName).toLowerCase()) ||
        payment?.customer,
      text(payment?.customerName),
    );
    const customer =
      customerById.get(customerId.toLowerCase()) ||
      customerByName.get(customerName.toLowerCase()) ||
      payment?.customer ||
      null;

    const tax = resolveTdsTax(customer, taxes);
    const rate = tax ? number(tax?.rate ?? tax?.taxPercentage ?? 0, 0) : 0;
    const deducted =
      rate > 0
        ? (amount * rate) / 100
        : number(
            payment?.taxDeductedAmount ||
              payment?.tdsAmount ||
              payment?.withholdingAmount ||
              0,
            0,
          );
    const afterDeduction = Math.max(amount - deducted, 0);
    const name = text(tax?.name || tax?.taxName || "TDS") || "TDS";
    const key = text(tax?._id || tax?.id || name).toLowerCase();

    if (!rows.has(key)) {
      rows.set(key, {
        id: key,
        name,
        rate: tax ? rate : null,
        total: 0,
        afterDeduction: 0,
        deducted: 0,
      });
    }

    const current = rows.get(key)!;
    current.total += amount;
    current.afterDeduction += afterDeduction;
    current.deducted += deducted;
    if (current.rate === null && tax && rate > 0) {
      current.rate = rate;
    }
  }

  return [...rows.values()].sort(
    (left, right) => right.deducted - left.deducted || left.name.localeCompare(right.name),
  );
};

export default function TdsReceivablesReportPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const category = getCategoryById(categoryId || "");
  const report = getReportById(categoryId || "", reportId || "");
  const { settings } = useSettings();

  const [selectedRange, setSelectedRange] = useState<DateRangePreset>("This Month");
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isBasisOpen, setIsBasisOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [rows, setRows] = useState<TdsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState([...COLUMN_LABELS]);

  const dateRef = useRef<HTMLDivElement | null>(null);
  const basisRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const moreFiltersRef = useRef<HTMLDivElement | null>(null);

  const currencyCode = String(
    settings?.general?.currencyCode ||
      settings?.general?.baseCurrency ||
      settings?.general?.currency ||
      "SOS",
  ).trim() || "SOS";

  const organizationName = String(
    settings?.general?.companyDisplayName ||
      settings?.general?.schoolDisplayName ||
      "",
  ).trim();

  const bounds = useMemo(() => getBounds(selectedRange), [selectedRange]);
  const dateLabel = useMemo(
    () => `From ${formatDate(bounds.start)} To ${formatDate(bounds.end)}`,
    [bounds.end, bounds.start],
  );

  if (!categoryId || !reportId || !category || !report) {
    return <Navigate to="/reports" replace />;
  }

  if (category.id !== "taxes" || reportId !== "tds-receivables") {
    return <Navigate to="/reports" replace />;
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [paymentsRes, customersRes, taxesRes] = await Promise.all([
          paymentsReceivedAPI.getAll({
            limit: 10000,
            fromDate: bounds.start.toISOString(),
            toDate: bounds.end.toISOString(),
          }).catch(() => ({ data: [] })),
          customersAPI.getAll({ limit: 10000 }).catch(() => ({ data: [] })),
          taxesAPI.getAll({ limit: 10000 }).catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        setRows(
          buildRows(
            extractArray(paymentsRes),
            extractArray(customersRes),
            extractArray(taxesRes),
            bounds,
          ),
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load TDS receivables report:", error);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [bounds.end.getTime(), bounds.start.getTime(), category, categoryId, refreshTick, report, reportId]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dateRef.current?.contains(target)) setIsDateOpen(false);
      if (!basisRef.current?.contains(target)) setIsBasisOpen(false);
      if (!groupRef.current?.contains(target)) setIsGroupOpen(false);
      if (!exportRef.current?.contains(target)) setIsExportOpen(false);
      if (!moreFiltersRef.current?.contains(target)) setIsMoreFiltersOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDateOpen(false);
        setIsBasisOpen(false);
        setIsGroupOpen(false);
        setIsExportOpen(false);
        setIsMoreFiltersOpen(false);
        setIsCustomizeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const openReport = () => {
    setRefreshTick((value) => value + 1);
    toast.success(`Report refreshed: ${report.name}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <div className="pr-3">
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
                onClick={() => setIsCustomizeOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Customize report columns"
                title="Customize report columns"
              >
                <Columns3 size={15} />
              </button>

              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportOpen((value) => !value)}
                  className="inline-flex h-9 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
                >
                  Export <ChevronDown size={14} />
                </button>
                {isExportOpen ? (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    {["PDF", "XLSX (Microsoft Excel)", "Print"].map(
                      (label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setIsExportOpen(false);
                            toast.success(`Export ${label} started`);
                          }}
                          className="flex w-full items-center px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={openReport}
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#334155]">Filters :</span>

              <div ref={dateRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsDateOpen((value) => !value)}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155] hover:bg-white"
                >
                  <CalendarDays size={14} className="text-[#64748b]" />
                  Date Range : <span className="font-medium">{selectedRange}</span>
                  <ChevronDown size={14} />
                </button>
                {isDateOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-52 rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    {[
                      "Today",
                      "This Week",
                      "This Month",
                      "This Quarter",
                      "This Year",
                      "All Time",
                    ].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedRange(option as DateRangePreset);
                          setIsDateOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                      >
                        <span>{option}</span>
                        {selectedRange === option ? (
                          <span className="text-[#64748b]">Selected</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div ref={basisRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsBasisOpen((value) => !value)}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155] hover:bg-white"
                >
                  Report Basis : <span className="font-medium">Accrual</span>
                  <ChevronDown size={14} />
                </button>
                {isBasisOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-44 rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <button
                      type="button"
                      onClick={() => setIsBasisOpen(false)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                    >
                      <span>Accrual</span>
                      <span className="text-[#64748b]">Selected</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <div ref={moreFiltersRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsMoreFiltersOpen((value) => !value)}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                >
                  <Plus size={14} className="text-[#156372]" /> More Filters
                </button>
                {isMoreFiltersOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-72 rounded-lg border border-[#d7dce7] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <p className="text-sm font-medium text-[#0f172a]">
                      More Filters
                    </p>
                    <p className="mt-1 text-sm text-[#64748b]">
                      This report is driven by the selected date range and customer TDS setup.
                    </p>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={openReport}
                className="inline-flex h-8 items-center gap-1 rounded bg-[#74a8ff] px-4 text-sm font-semibold text-white hover:bg-[#5d96f5]"
              >
                <CalendarDays size={14} /> Run Report
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e6eaf1] px-4 py-3">
            <div ref={groupRef} className="relative">
              <button
                type="button"
                onClick={() => setIsGroupOpen((value) => !value)}
                className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                <span className="inline-flex items-center gap-2">
                  <Columns3 size={14} className="text-[#64748b]" />
                  Group By : <strong className="text-[#0f172a]">TDS</strong>
                </span>
                <ChevronDown size={14} />
              </button>
              {isGroupOpen ? (
                <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-44 rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                  <button
                    type="button"
                    onClick={() => setIsGroupOpen(false)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                  >
                    <span>TDS</span>
                    <span className="text-[#64748b]">Selected</span>
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsCustomizeOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              <Columns3 size={14} className="text-[#64748b]" />
              Customize Report Columns
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]">
                6
              </span>
            </button>
          </div>

          <div className="px-3 pb-3">
            <div className="overflow-hidden rounded-xl border border-[#d7dce7] bg-white">
              <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
                {organizationName ? (
                  <div className="mb-1 text-sm text-[#64748b]">
                    {organizationName}
                  </div>
                ) : null}
                <h2 className="text-[20px] font-semibold text-[#0f172a]">
                  {report.name}
                </h2>
                <div className="mt-1 text-sm text-[#156372]">{dateLabel}</div>
                <div className="mt-3 text-sm text-[#64748b]">Basis : Accrual</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#eef2f7] bg-[#fafbff]">
                      {selectedColumns.map((column, index) => (
                        <th
                          key={column}
                          className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569] ${
                            index === 0 ? "text-left" : "text-center"
                          }`}
                        >
                          {index === 0 ? (
                            <span className="inline-flex items-center gap-1">
                              {column}
                              <ChevronDown size={10} className="text-[#94a3b8]" />
                            </span>
                          ) : (
                            column
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          className="px-4 py-10 text-center text-sm text-[#64748b]"
                          colSpan={selectedColumns.length}
                        >
                          Loading report data...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-10 text-center text-sm text-[#64748b]"
                          colSpan={selectedColumns.length}
                        >
                          There are no transactions during the selected date range.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-[#edf1f7] hover:bg-[#fcfdff]"
                        >
                          {selectedColumns.map((column, cellIndex) => {
                            const value =
                              column === "TDS Name"
                                ? row.name
                                : column === "TDS Percentage"
                                  ? row.rate === null
                                    ? "-"
                                    : `${row.rate.toFixed(2)}%`
                                  : column === "Total"
                                    ? money(row.total, currencyCode)
                                    : column === "Total After TDS Deduction"
                                      ? money(row.afterDeduction, currencyCode)
                                      : column === "Tax Deducted at Source"
                                        ? money(row.deducted, currencyCode)
                                        : "";
                            return (
                              <td
                                key={`${row.id}-${cellIndex}`}
                                className={`px-4 py-3 text-[14px] ${
                                  cellIndex === 0
                                    ? "font-medium text-[#156372]"
                                    : "text-center text-[#334155]"
                                }`}
                              >
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCustomizeOpen ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/35 px-4 pt-10">
          <div className="w-full max-w-[720px] rounded-xl border border-[#d7dce7] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between border-b border-[#e6eaf1] px-5 py-4">
              <div className="flex items-center gap-2">
                <Columns3 size={17} className="text-[#334155]" />
                <h3 className="text-[16px] font-semibold text-[#0f172a]">
                  Customize Report Columns
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#64748b]">
                This report uses the same Sales by Customer-style customization
                flow, but the visible columns stay focused on the TDS summary.
              </p>
              <div className="mt-4 grid gap-3">
                {COLUMN_LABELS.map((column) => (
                  <button
                    key={column}
                    type="button"
                    onClick={() => {
                      setSelectedColumns((current) =>
                        current.includes(column)
                          ? current.filter((item) => item !== column)
                          : [...current, column],
                      );
                    }}
                    className="flex items-center justify-between rounded-md border border-[#e6eaf1] px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                  >
                    <span>{column}</span>
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                        selectedColumns.includes(column)
                          ? "bg-[#d9eff1] text-[#1b6f7b]"
                          : "bg-[#eef2f7] text-[#64748b]"
                      }`}
                    >
                      {selectedColumns.includes(column) ? "On" : "Off"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-[#e6eaf1] px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsCustomizeOpen(false);
                  toast.success("Report columns updated");
                }}
                className="inline-flex h-9 items-center rounded bg-[#156372] px-4 text-sm font-semibold text-white hover:bg-[#0f4f5b]"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
