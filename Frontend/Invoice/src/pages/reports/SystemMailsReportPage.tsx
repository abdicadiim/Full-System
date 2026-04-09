import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Columns3,
  Filter,
  Folder,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import ReportCustomizeColumnsModal from "./ReportCustomizeColumnsModal";
import { REPORTS_BY_CATEGORY } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";

type SystemMailRow = {
  id: string;
  date: string;
  subject: string;
  mailType: string;
  recipient: string;
  status: string;
  channel: string;
};

type MailColumn = "Date" | "Subject" | "Mail Type";
type FilterFieldKey = "date" | "subject" | "mail-type";
type FilterComparatorKey =
  | "is-equal-to"
  | "is-in"
  | "is-not-in"
  | "contains"
  | "starts-with"
  | "ends-with"
  | "is-empty"
  | "is-not-empty";

type FilterRow = {
  id: string;
  field: FilterFieldKey | "";
  comparator: FilterComparatorKey | "";
  value: string;
};

const SYSTEM_MAIL_ROWS: SystemMailRow[] = [
  {
    id: "mail-1",
    date: "2026-04-06",
    subject: "New auto-generated invoice for the recurring profile: rfsf",
    mailType: "Draft Notification",
    recipient: "finance@fdfv.com",
    status: "Sent",
    channel: "Email",
  },
  {
    id: "mail-2",
    date: "2026-03-29",
    subject: "New Quote (QT-000005) submitted",
    mailType: "Approval Notification",
    recipient: "sales@fdfv.com",
    status: "Sent",
    channel: "Email",
  },
  {
    id: "mail-3",
    date: "2026-03-26",
    subject: "fdfv has invited you to join their portal",
    mailType: "Invites",
    recipient: "new-user@fdfv.com",
    status: "Sent",
    channel: "Email",
  },
  {
    id: "mail-4",
    date: "2026-03-24",
    subject: "Payment of SOS22.00 is outstanding for INV-000003",
    mailType: "Payment Reminder",
    recipient: "accounts@fdfv.com",
    status: "Sent",
    channel: "Email",
  },
  {
    id: "mail-5",
    date: "2026-03-24",
    subject: "Payment of SOS22.00 is outstanding for INV-000002",
    mailType: "Payment Reminder",
    recipient: "accounts@fdfv.com",
    status: "Sent",
    channel: "Email",
  },
];

const SYSTEM_MAIL_COLUMN_GROUPS = [
  {
    label: "Mail Columns",
    items: ["Date", "Subject", "Mail Type"],
  },
];

const SYSTEM_MAIL_FIELDS: Array<{ key: FilterFieldKey; label: string }> = [
  { key: "mail-type", label: "Mail Type" },
];

const SYSTEM_MAIL_VALUE_OPTIONS = [
  "All System Emails",
  "Draft Notification",
  "Online Payment",
  "Purchase Order Notification",
  "Vendor Statement",
  "Customer Statement",
  "Payment Acknowledgment",
  "Payment Reminder",
  "Invoice Notification",
  "Sales Order Notification",
  "Subscription",
  "Approval Notification",
  "Failures",
];

const FILTER_COMPARATOR_OPTIONS: Array<{
  key: FilterComparatorKey;
  label: string;
}> = [
  { key: "is-equal-to", label: "is equal to" },
  { key: "is-in", label: "is in" },
  { key: "is-not-in", label: "is not in" },
  { key: "contains", label: "contains" },
  { key: "starts-with", label: "starts with" },
  { key: "ends-with", label: "ends with" },
  { key: "is-empty", label: "is empty" },
  { key: "is-not-empty", label: "is not empty" },
];

const REPORTS_DRAWER_SECTIONS = [
  {
    id: "sales",
    label: "Sales",
    reportIds: ["sales-by-customer", "sales-by-item", "sales-by-sales-person"],
  },
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
    reportIds: [
      "payments-received",
      "time-to-get-paid",
      "credit-note-details",
      "refund-history",
      "withholding-tax",
    ],
  },
  { id: "subscriptions", label: "Recurring Invoices", reportIds: ["subscription-details"] },
  {
    id: "purchases-expenses",
    label: "Purchases and Expenses",
    reportIds: [
      "expense-details",
      "expenses-by-category",
      "expenses-by-customer",
      "expenses-by-project",
      "billable-expense-details",
    ],
  },
  { id: "taxes", label: "Taxes", reportIds: ["tax-summary", "tds-receivables"] },
  {
    id: "projects-timesheets",
    label: "Projects and Timesheet",
    reportIds: [
      "timesheet-details",
      "project-summary",
      "project-details",
      "projects-revenue-summary",
    ],
  },
  {
    id: "activity",
    label: "Activity",
    reportIds: [
      "system-mails",
      "exception-report",
      "customer-reviews",
      "activity-logs-audit-trail",
      "portal-activities",
    ],
  },
] as const;

const formatDisplayDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toKey = (value: string) => value.trim().toLowerCase();

const getMailColumnValue = (row: SystemMailRow, field: FilterFieldKey) => {
  switch (field) {
    case "date":
      return formatDisplayDate(row.date);
    case "subject":
      return row.subject;
    case "mail-type":
      return row.mailType;
    default:
      return "";
  }
};

const getMailTypeLabel = (value: string) =>
  SYSTEM_MAIL_VALUE_OPTIONS.find(
    (option) => option.toLowerCase() === value.toLowerCase(),
  ) ?? "Select a value";

const matchesFilterRow = (row: SystemMailRow, filterRow: FilterRow) => {
  if (!filterRow.field || !filterRow.comparator) return true;

  const value = getMailColumnValue(row, filterRow.field);
  const normalized = toKey(value);
  const query = toKey(filterRow.value);

  if (filterRow.field === "mail-type" && query === toKey("All System Emails")) {
    return true;
  }

  switch (filterRow.comparator) {
    case "is-empty":
      return normalized.length === 0;
    case "is-not-empty":
      return normalized.length > 0;
    case "is-equal-to":
      return normalized === query;
    case "is-in":
      return normalized === query;
    case "is-not-in":
      return normalized !== query;
    case "contains":
      return normalized.includes(query);
    case "starts-with":
      return normalized.startsWith(query);
    case "ends-with":
      return normalized.endsWith(query);
    default:
      return true;
  }
};

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
  const [expandedSections, setExpandedSections] = useState<string[]>([
    currentCategoryId,
  ]);

  useEffect(() => {
    setExpandedSections((prev) =>
      prev.includes(currentCategoryId) ? prev : [currentCategoryId],
    );
  }, [currentCategoryId]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !drawerRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
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
  }, [open, onClose, triggerRef]);

  const sections = useMemo(() => {
    return REPORTS_DRAWER_SECTIONS.map((section) => {
      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const reports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;
      return { ...section, reports };
    }).filter((section) => section.reports.length > 0);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={drawerRef}
      className="absolute left-0 top-0 z-30 h-full w-[260px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <div className="text-[18px] font-semibold text-[#0f172a]">
            Reports
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close reports drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
            All Reports
          </div>

          <div className="space-y-1">
            {sections.map((section) => {
              const expanded = expandedSections.includes(section.id);
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections((prev) =>
                        prev.includes(section.id) ? [] : [section.id],
                      )
                    }
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
        </div>
      </div>
    </div>
  );
}

export default function SystemMailsReportPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const organizationName = String(
    settings?.general?.companyDisplayName ||
      settings?.general?.schoolDisplayName ||
      "Organization",
  ).trim();

  const reportsMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportRefreshTick, setReportRefreshTick] = useState(0);
  const shouldToastRunRef = useRef(false);

  const [selectedColumns, setSelectedColumns] = useState<MailColumn[]>([
    "Date",
    "Subject",
    "Mail Type",
  ]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([
    { id: "filter-1", field: "mail-type", comparator: "is-in", value: "" },
  ]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([
    { id: "filter-1", field: "mail-type", comparator: "is-in", value: "" },
  ]);
  const [openValueDropdownRowId, setOpenValueDropdownRowId] = useState<
    string | null
  >(null);
  const [valueDropdownSearch, setValueDropdownSearch] = useState("");

  const filteredRows = useMemo(() => {
    return SYSTEM_MAIL_ROWS.filter((row) =>
      appliedFilterRows.every((filterRow) => matchesFilterRow(row, filterRow)),
    );
  }, [appliedFilterRows]);

  const visibleRows = useMemo(() => filteredRows, [filteredRows]);

  useEffect(() => {
    if (!isFilterOpen) return;

    setDraftFilterRows(
      appliedFilterRows.length > 0
        ? appliedFilterRows.map((row) => ({ ...row }))
        : [{ id: "filter-1", field: "mail-type", comparator: "is-in", value: "" }],
    );
  }, [appliedFilterRows, isFilterOpen]);

  useEffect(() => {
    if (!openValueDropdownRowId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (
        !target?.closest?.('[data-value-dropdown="system-mails"]')
      ) {
        setOpenValueDropdownRowId(null);
        setValueDropdownSearch("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenValueDropdownRowId(null);
        setValueDropdownSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openValueDropdownRowId]);

  useEffect(() => {
    if (!isReportLoading) return;

    const timer = window.setTimeout(() => {
      if (shouldToastRunRef.current) {
        toast.success("Report refreshed: System Mails");
      }
      shouldToastRunRef.current = false;
      setIsReportLoading(false);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [isReportLoading, reportRefreshTick]);

  const refreshReport = (notify = true) => {
    shouldToastRunRef.current = notify;
    setIsReportLoading(true);
    setReportRefreshTick((value) => value + 1);
  };

  const addFilterRow = () => {
    setDraftFilterRows((prev) => [
      ...prev,
      {
        id: `filter-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        field: "mail-type",
        comparator: "is-in",
        value: "",
      },
    ]);
  };

  const updateFilterRow = (
    id: string,
    patch: Partial<Omit<FilterRow, "id">>,
  ) => {
    setDraftFilterRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const removeFilterRow = (id: string) => {
    setDraftFilterRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0
        ? next
        : [{ id: "filter-1", field: "mail-type", comparator: "is-in", value: "" }];
    });
  };

  const runFilter = () => {
    setAppliedFilterRows(draftFilterRows.map((row) => ({ ...row })));
    setIsFilterOpen(false);
    setOpenValueDropdownRowId(null);
    setValueDropdownSearch("");
    refreshReport();
  };

  const cancelFilter = () => {
    setDraftFilterRows(appliedFilterRows.map((row) => ({ ...row })));
    setIsFilterOpen(false);
    setOpenValueDropdownRowId(null);
    setValueDropdownSearch("");
  };

  return (
    <div className="relative min-h-screen bg-[#f7f8fd] text-[#0f172a]">
      <ReportsDrawer
        open={isReportsDrawerOpen}
        currentCategoryId="activity"
        currentReportId="system-mails"
        triggerRef={reportsMenuButtonRef}
        onClose={() => setIsReportsDrawerOpen(false)}
      />

      <div
        className={`transition-[padding-left] duration-200 ${
          isReportsDrawerOpen ? "lg:pl-[260px]" : ""
        }`}
      >
        <div className="border-b border-[#e6eaf1] bg-white">
          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="flex items-start gap-3">
              <button
                ref={reportsMenuButtonRef}
                type="button"
                onClick={() => setIsReportsDrawerOpen((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Open Activity reports"
              >
                <Menu size={16} />
              </button>
              <div>
                <p className="text-sm font-medium text-[#4f5f79]">Activity</p>
                <h1 className="text-[24px] font-semibold leading-tight text-[#0f172a]">
                  System Mails
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen(true)}
                  className="inline-flex items-center gap-2 text-sm text-[#111827]"
                >
                  <Columns3 size={15} className="text-[#4f5f79]" />
                  Customize Report Columns
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dff1ef] px-1.5 text-[11px] font-semibold text-[#156372]">
                    {selectedColumns.length}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => refreshReport()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Refresh report"
                title="Refresh report"
              >
                <RefreshCw
                  size={15}
                  className={isReportLoading ? "animate-spin" : ""}
                />
              </button>

              <button
                type="button"
                onClick={() => navigate("/reports")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close report"
                title="Close report"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-[#e6eaf1] bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-sm text-[#156372]"
          >
            <Filter size={14} />
            Apply Filter
          </button>
        </div>

        {isFilterOpen ? (
          <div className="border-b border-[#e6eaf1] bg-white">
            <div className="px-4 py-4">
              <div className="space-y-3">
                {draftFilterRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[36px_minmax(0,220px)_minmax(0,160px)_minmax(0,320px)_auto] items-start gap-3"
                  >
                    <div className="flex h-8 items-center justify-center rounded border border-[#d4d9e4] bg-[#fafbff] text-sm text-[#475569]">
                      {index + 1}
                    </div>

                    <select
                      value={row.field}
                      onChange={(event) =>
                        {
                          const nextField =
                            event.target.value as FilterFieldKey | "";
                          updateFilterRow(row.id, {
                            field: nextField,
                            comparator: nextField ? "is-in" : "",
                            value: "",
                          });
                          if (nextField === "mail-type") {
                            setOpenValueDropdownRowId(row.id);
                            setValueDropdownSearch("");
                          } else if (!nextField) {
                            setOpenValueDropdownRowId(null);
                            setValueDropdownSearch("");
                          }
                        }
                      }
                      className="h-8 w-full rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#156372]"
                    >
                      <option value="">Select a field</option>
                      {SYSTEM_MAIL_FIELDS.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.comparator}
                      onChange={(event) =>
                        updateFilterRow(row.id, {
                          comparator: event.target.value as
                            | FilterComparatorKey
                            | "",
                        })
                      }
                      className="h-8 w-full rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#156372]"
                    >
                      <option value="">Select a comparator</option>
                      {FILTER_COMPARATOR_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <div
                      data-value-dropdown="system-mails"
                      className="relative w-full max-w-[320px]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenValueDropdownRowId((current) =>
                            current === row.id ? null : row.id,
                          );
                          setValueDropdownSearch("");
                        }}
                        className="flex h-8 w-full items-center justify-between rounded border border-[#d4d9e4] bg-white px-3 text-left text-sm text-[#334155] outline-none focus:border-[#156372]"
                      >
                        <span className="truncate">
                          {row.value
                            ? getMailTypeLabel(row.value)
                            : "Select a value"}
                        </span>
                        <ChevronDown
                          size={14}
                          className="shrink-0 text-[#94a3b8]"
                        />
                      </button>

                      {openValueDropdownRowId === row.id ? (
                        <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-full overflow-hidden rounded-md border border-[#d4d9e4] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
                          <div className="border-b border-[#eef2f7] p-2">
                            <div className="relative">
                              <Search
                                size={14}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                              />
                              <input
                                value={valueDropdownSearch}
                                onChange={(event) =>
                                  setValueDropdownSearch(event.target.value)
                                }
                                placeholder="Search"
                                className="h-8 w-full rounded border border-[#cfd6e4] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none focus:border-[#156372]"
                              />
                            </div>
                          </div>

                          <div className="max-h-[180px] overflow-y-auto py-1">
                            {SYSTEM_MAIL_VALUE_OPTIONS.filter((option) =>
                              option
                                .toLowerCase()
                                .includes(valueDropdownSearch.trim().toLowerCase()),
                            ).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  updateFilterRow(row.id, { value: option });
                                  setOpenValueDropdownRowId(null);
                                  setValueDropdownSearch("");
                                }}
                                className={`block w-full px-4 py-2 text-left text-sm ${
                                  row.value === option
                                    ? "bg-[#3b82f6] text-white"
                                    : "text-[#334155] hover:bg-[#f8fafc]"
                                }`}
                              >
                                {option}
                              </button>
                            ))}

                            {SYSTEM_MAIL_VALUE_OPTIONS.filter((option) =>
                              option
                                .toLowerCase()
                                .includes(valueDropdownSearch.trim().toLowerCase()),
                            ).length === 0 ? (
                              <div className="px-4 py-3 text-sm text-[#64748b]">
                                No results found
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-[#64748b]">
                      <button
                        type="button"
                        onClick={addFilterRow}
                        className="inline-flex items-center justify-center text-[#64748b] hover:text-[#156372]"
                        aria-label="Add filter row"
                        title="Add filter row"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFilterRow(row.id)}
                        className="inline-flex items-center justify-center text-[#64748b] hover:text-[#ef4444]"
                        aria-label="Remove filter row"
                        title="Remove filter row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addFilterRow}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#156372]"
              >
                <Plus size={14} />
                Add More
              </button>
            </div>

            <div className="flex items-center gap-3 border-t border-[#eef2f7] px-4 py-3">
              <button
                type="button"
                onClick={runFilter}
                className="inline-flex h-9 items-center rounded bg-[#156372] px-4 text-sm font-semibold text-white hover:bg-[#0f4f5b]"
              >
                Run Report
              </button>
              <button
                type="button"
                onClick={cancelFilter}
                className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="p-3">
          <div className="overflow-hidden rounded-xl border border-[#d7dce7] bg-white">
            <div className="flex justify-end border-b border-[#e6eaf1] px-4 py-3">
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="inline-flex items-center gap-2 text-sm text-[#111827]"
              >
                <Columns3 size={15} className="text-[#4f5f79]" />
                Customize Report Columns
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dff1ef] px-1.5 text-[11px] font-semibold text-[#156372]">
                  {selectedColumns.length}
                </span>
              </button>
            </div>

            <div className="border-b border-[#eef2f7] px-4 py-8 text-center">
              <div className="text-sm text-[#64748b]">{organizationName}</div>
              <h2 className="mt-2 text-[22px] font-semibold text-[#0f172a]">
                System Mails
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#e6eaf1] bg-[#fafbff]">
                    {selectedColumns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]"
                      >
                        <span className="inline-flex items-center gap-1">
                          {column}
                          {column === "Date" ? <ArrowUpDown size={12} /> : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length > 0 ? (
                    visibleRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#eef2f7] hover:bg-[#f8fafc]"
                      >
                        {selectedColumns.map((column) => {
                          const cellValue =
                            column === "Date"
                              ? formatDisplayDate(row.date)
                              : column === "Subject"
                                ? row.subject
                                : row.mailType;

                          return (
                            <td
                              key={`${row.id}-${column}`}
                              className="px-4 py-3 text-sm text-[#0f172a]"
                            >
                              {cellValue}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={selectedColumns.length}
                        className="px-4 py-12 text-center text-sm text-[#64748b]"
                      >
                        No system mails found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ReportCustomizeColumnsModal
        open={isCustomizeOpen}
        reportName="System Mails"
        availableGroups={SYSTEM_MAIL_COLUMN_GROUPS}
        selectedColumns={selectedColumns}
        onClose={() => setIsCustomizeOpen(false)}
        onSave={(nextVisibleColumns) => {
          setSelectedColumns(nextVisibleColumns as MailColumn[]);
          setIsCustomizeOpen(false);
          toast.success("Report columns updated");
        }}
      />
    </div>
  );
}
