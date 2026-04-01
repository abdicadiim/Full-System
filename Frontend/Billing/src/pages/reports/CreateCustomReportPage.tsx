import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Lock, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { REPORTS } from "./reportsCatalog";

const STEPS = [
  { id: 1, label: "General" },
  { id: 2, label: "Show / Hide Columns" },
  { id: 3, label: "Report Layout" },
  { id: 4, label: "Report Preferences" },
];

const entities = ["Invoice, Credit Note", "Invoice", "Credit Note"];

const DATE_RANGE_OPTIONS = [
  "Today",
  "This Week",
  "This Month",
  "This Quarter",
  "This Year",
  "Yesterday",
  "Previous Week",
  "Previous Month",
  "Previous Quarter",
  "Previous Year",
  "Custom",
];

const COMPARE_WITH_OPTIONS = ["Previous Year(s)", "Previous Period(s)"];
const COMPARE_COUNT_OPTIONS = Array.from({ length: 7 }, (_, index) => String(index + 1));
const TABLE_DENSITY_OPTIONS = ["Classic", "Compact", "Super Compact"];
const FONT_FAMILY_OPTIONS = [
  {
    name: "Open Sans",
    description: "Supports English, German, Spanish, French, Italian, Dutch, Polish, Portuguese, Swedish, Catalan, Czech, Maltese, Russian and Slovenian language characters.",
  },
  {
    name: "Sacramento",
    description: "Support for Digital Signature style.",
  },
  { name: "Helvetica", description: "Supports all English characters." },
  { name: "Noto Sans", description: "Supports all European languages." },
  {
    name: "DejaVu Sans",
    description: "Supports Latin, Greek, Hebrew, Georgian, Armenian and Cyrillic scripts.",
  },
  { name: "DejaVu LGC Sans", description: "Supports Latin, Greek and Cyrillic scripts." },
  { name: "IPAPGothic", description: "Supports Japanese characters." },
  { name: "AR PL New Sung", description: "Supports Chinese characters." },
  { name: "Baekmuk Gulim", description: "Supports Korean characters." },
  { name: "Ubuntu", description: "Supports English and European languages. This font can also render Indian Rupees Symbol." },
  { name: "Roboto", description: "Supports Latin, Greek and Cyrillic and Vietnamese scripts" },
  { name: "Maitree", description: "Supports Thai characters." },
  { name: "Dynamic Font", description: "Supports Arabic, Hebrew and other RTL Languages." },
  { name: "Hind", description: "Supports Hindi and Marathi characters." },
  { name: "Hind Madurai", description: "Supports Tamil characters." },
  { name: "Hind Vadodara", description: "Supports Gujarati characters." },
  { name: "Kinnari", description: "Supports Thai characters." },
  { name: "Noto Sans Sinhala", description: "Supports Sinhala characters." },
];
const GROUP_BY_OPTIONS_BY_CATEGORY: Record<string, string[]> = {
  sales: ["Customer", "Item", "Plan", "Addon", "Coupon", "Sales Person", "Date"],
  receivables: ["Customer", "Invoice", "Quote", "Due Date", "Status"],
  "acquisition-insights": ["Trial", "Customer", "Date", "Stage"],
  subscriptions: ["Customer", "Plan", "Status", "Date"],
  retention: ["Customer", "Cohort", "Renewal", "Date"],
  churn: ["Customer", "Subscription", "Retry Count", "Date"],
  "payments-received": ["Customer"],
  "purchases-expenses": ["Customer", "Project", "Expense Type", "Date"],
  "projects-timesheets": ["Project", "Customer", "Employee", "Date"],
  activity: ["User", "Activity Type", "Date"],
};
const FILTER_FIELD_OPTIONS = ["Select a field", "Reports", "Locations"];
const FILTER_COMPARATOR_OPTIONS = ["Select a comparator", "Is", "Is not", "Contains", "Does not contain"];

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (value: number) => String(value).padStart(2, "0");

const formatLocalDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseLocalDate = (value: string) => {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const getMonthCells = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: { date: Date; isCurrentMonth: boolean; label: number }[] = [];

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    cells.push({ date: new Date(year, month - 1, day), isCurrentMonth: false, label: day });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), isCurrentMonth: true, label: day });
  }

  while (cells.length < 42) {
    const day = cells.length - daysInMonth - firstDay + 1;
    cells.push({ date: new Date(year, month + 1, day), isCurrentMonth: false, label: day });
  }

  return {
    year,
    month,
    monthLabel: monthDate.toLocaleString("default", { month: "short" }),
    cells,
  };
};

const getFilterValueMode = (field: string, comparator: string): "text" | "search" | "number" | "date" => {
  const lowerField = field.toLowerCase();
  const lowerComparator = comparator.toLowerCase();

  if (lowerField.includes("date") || lowerField.includes("due") || lowerField.includes("expiry") || lowerComparator.includes("date")) {
    return "date";
  }

  if (
    lowerField.includes("amount") ||
    lowerField.includes("qty") ||
    lowerField.includes("quantity") ||
    lowerField.includes("count") ||
    lowerField.includes("balance") ||
    lowerField.includes("rate") ||
    lowerField.includes("hours") ||
    lowerComparator.includes("greater") ||
    lowerComparator.includes("less") ||
    lowerComparator.includes("equals")
  ) {
    return "number";
  }

  if (lowerComparator.includes("contain") || lowerComparator.includes("search") || lowerComparator.includes("in")) {
    return "search";
  }

  return "text";
};

type ColumnGroup = { label: string; items: string[] };
type ColumnSetup = { availableGroups: ColumnGroup[]; selectedColumns: string[] };
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
  selectedColumns: string[];
  dateRange: string;
  compareWith: string;
  compareCount: string;
  compareLatestToOldest: boolean;
  groupBy: string;
  selectedEntities: string;
  tableDensity: string;
  tableDesign: string;
  autoResizeTable: boolean;
  paperSize: string;
  orientation: string;
  fontFamily: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  showOrganizationName: boolean;
  showGeneratedDate: boolean;
  showGeneratedTime: boolean;
  showPageNumber: boolean;
  showGeneratedBy: boolean;
  customStartDate: string;
  customEndDate: string;
  filterRows: Array<{ id: number; field: string; comparator: string; value: string }>;
};

const CUSTOM_REPORTS_KEY = "reports_center_custom_reports_v1";

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

const DEFAULT_COLUMN_SETUP: ColumnSetup = {
  availableGroups: [
    { label: "Reports", items: ["Name", "Date", "Status", "Amount"] },
    { label: "Locations", items: ["Location", "Warehouse", "Country", "City"] },
  ],
  selectedColumns: ["Name", "Date", "Status", "Amount"],
};

const COLUMN_SETUP_BY_REPORT: Record<string, ColumnSetup> = {
  "sales-by-customer": {
    availableGroups: [
      { label: "Reports", items: ["Customer Name", "Invoice Count", "Sales", "Sales With Tax", "Average Price"] },
      { label: "Customer", items: ["Customer Type", "Customer Email", "Sales Person"] },
      { label: "Locations", items: ["Location", "Country", "City"] },
    ],
    selectedColumns: ["Customer Name", "Invoice Count", "Sales", "Sales With Tax", "Average Price"],
  },
  "sales-by-item": {
    availableGroups: [
      { label: "Reports", items: ["Item Name", "SKU", "Quantity Sold", "Amount", "Average Price", "Sales With Tax"] },
      {
        label: "Item",
        items: [
          "Item Type",
          "Product Type",
          "Status",
          "Usage Unit",
          "Sales Description",
          "Sales Price",
          "Created By",
          "Created Time",
          "Last Modified Time",
          "Purchase Description",
          "Purchase Price",
        ],
      },
      { label: "Locations", items: ["Location", "Customer Name"] },
    ],
    selectedColumns: ["Item Name", "SKU", "Quantity Sold", "Amount", "Average Price"],
  },
  "sales-by-plan": {
    availableGroups: [
      { label: "Reports", items: ["Plan Name", "Subscriptions", "Invoices", "Sales", "Sales With Tax"] },
      { label: "Plan", items: ["Billing Cycle", "Status", "Created By", "Created Time"] },
      { label: "Locations", items: ["Location", "Customer Name"] },
    ],
    selectedColumns: ["Plan Name", "Subscriptions", "Sales", "Sales With Tax", "Invoices"],
  },
  "sales-by-addon": {
    availableGroups: [
      { label: "Reports", items: ["Addon Name", "Quantity Sold", "Customers", "Sales", "Sales With Tax", "Average Price"] },
      { label: "Addon", items: ["Status", "Created By", "Created Time"] },
      { label: "Locations", items: ["Location", "Customer Name"] },
    ],
    selectedColumns: ["Addon Name", "Quantity Sold", "Customers", "Sales", "Sales With Tax"],
  },
  "sales-by-coupon": {
    availableGroups: [
      { label: "Reports", items: ["Coupon Code", "Uses", "Discount", "Sales", "Net Sales"] },
      { label: "Coupon", items: ["Type", "Status", "Created By"] },
      { label: "Locations", items: ["Location", "Customer Name"] },
    ],
    selectedColumns: ["Coupon Code", "Uses", "Discount", "Sales", "Net Sales"],
  },
  "sales-by-sales-person": {
    availableGroups: [
      { label: "Reports", items: ["Sales Person", "Invoices", "Sales", "Sales With Tax", "Average Price"] },
      { label: "Sales Person", items: ["Email", "Status"] },
      { label: "Locations", items: ["Location"] },
    ],
    selectedColumns: ["Sales Person", "Invoices", "Sales", "Sales With Tax"],
  },
  "sales-summary": {
    availableGroups: [
      { label: "Reports", items: ["Date", "Invoices", "Credit Notes", "Sales Receipts", "Sales", "Sales With Tax"] },
      { label: "Locations", items: ["Location"] },
    ],
    selectedColumns: ["Date", "Invoices", "Credit Notes", "Sales Receipts", "Sales"],
  },
  "time-to-get-paid": {
    availableGroups: [
      { label: "Reports", items: ["Customer Name", "0 - 15 Days", "16 - 30 Days", "31 - 45 Days", "Above 45 Days"] },
    ],
    selectedColumns: ["Customer Name", "0 - 15 Days", "16 - 30 Days", "31 - 45 Days", "Above 45 Days"],
  },
};

const COLUMN_SETUP_BY_CATEGORY: Record<string, ColumnSetup> = {
  receivables: {
    availableGroups: [
      { label: "Reports", items: ["Invoice", "Credit Note", "Retainer Invoice", "Quote", "Customer", "Due Date", "Status", "Amount"] },
      { label: "Locations", items: ["Location", "Warehouse", "Country"] },
    ],
    selectedColumns: ["Invoice", "Customer", "Due Date", "Amount", "Status"],
  },
  "acquisition-insights": {
    availableGroups: [
      { label: "Reports", items: ["Trial", "Customer", "Date", "Stage", "Conversion Rate"] },
      { label: "Locations", items: ["Location", "Country"] },
    ],
    selectedColumns: ["Trial", "Customer", "Date", "Stage"],
  },
  subscriptions: {
    availableGroups: [
      { label: "Reports", items: ["Subscription", "Customer", "Plan", "Addon", "Status", "Date"] },
      { label: "Locations", items: ["Location", "Country"] },
    ],
    selectedColumns: ["Subscription", "Customer", "Plan", "Status", "Date"],
  },
  retention: {
    availableGroups: [
      { label: "Reports", items: ["Customer", "Cohort", "Renewal", "Subscription", "Date", "Status"] },
      { label: "Locations", items: ["Location", "Country"] },
    ],
    selectedColumns: ["Customer", "Cohort", "Renewal", "Date"],
  },
  churn: {
    availableGroups: [
      { label: "Reports", items: ["Customer", "Subscription", "Retry Count", "Status", "Date"] },
      { label: "Locations", items: ["Location", "Country"] },
    ],
    selectedColumns: ["Customer", "Subscription", "Retry Count", "Date"],
  },
  "payments-received": {
    availableGroups: [
      { label: "Reports", items: ["Customer Name", "0 - 15 Days", "16 - 30 Days", "31 - 45 Days", "Above 45 Days"] },
    ],
    selectedColumns: ["Customer Name", "0 - 15 Days", "16 - 30 Days", "31 - 45 Days", "Above 45 Days"],
  },
  "purchases-expenses": {
    availableGroups: [
      { label: "Reports", items: ["Purchase", "Expense", "Bill", "Vendor", "Project", "Date", "Amount"] },
      { label: "Locations", items: ["Location", "Country"] },
    ],
    selectedColumns: ["Expense", "Vendor", "Project", "Date", "Amount"],
  },
  "projects-timesheets": {
    availableGroups: [
      { label: "Reports", items: ["Project", "Timesheet", "Task", "Customer", "User", "Date", "Hours"] },
      { label: "Locations", items: ["Location", "Country"] },
    ],
    selectedColumns: ["Project", "Timesheet", "Task", "Date", "Hours"],
  },
  activity: {
    availableGroups: [
      { label: "Reports", items: ["Mail", "User Action", "Portal Activity", "Review", "Date"] },
      { label: "Locations", items: ["Location", "Country"] },
    ],
    selectedColumns: ["Mail", "User Action", "Portal Activity", "Date"],
  },
};

const getColumnSetupForReport = (reportId: string, categoryId: string): ColumnSetup => {
  if (COLUMN_SETUP_BY_REPORT[reportId]) return COLUMN_SETUP_BY_REPORT[reportId];
  if (COLUMN_SETUP_BY_CATEGORY[categoryId]) return COLUMN_SETUP_BY_CATEGORY[categoryId];
  return DEFAULT_COLUMN_SETUP;
};

export default function CreateCustomReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const reportNameFromState = typeof location.state === "object" && location.state && "reportName" in location.state
    ? String((location.state as { reportName?: string }).reportName || "")
    : "";
  const reportName = searchParams.get("reportName") || reportNameFromState;
  const selectedReport = useMemo(() => REPORTS.find((item) => item.name === reportName), [reportName]);
  const reportSupports = selectedReport?.functionSupport || {};
  const [currentStep, setCurrentStep] = useState(1);
  const [showOrganizationName, setShowOrganizationName] = useState(true);
  const [showGeneratedDate, setShowGeneratedDate] = useState(false);
  const [showPageNumber, setShowPageNumber] = useState(false);
  const [showGeneratedBy, setShowGeneratedBy] = useState(false);
  const [showGeneratedTime, setShowGeneratedTime] = useState(false);
  const [tableDensity, setTableDensity] = useState("Classic");
  const [tableDensitySearch, setTableDensitySearch] = useState("");
  const [isTableDensityOpen, setIsTableDensityOpen] = useState(false);
  const [tableDesign, setTableDesign] = useState("Default");
  const [tableDesignSearch, setTableDesignSearch] = useState("");
  const [isTableDesignOpen, setIsTableDesignOpen] = useState(false);
  const [autoResizeTable, setAutoResizeTable] = useState(true);
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState("Portrait");
  const [fontFamily, setFontFamily] = useState("Open Sans");
  const [fontFamilySearch, setFontFamilySearch] = useState("");
  const [isFontFamilyOpen, setIsFontFamilyOpen] = useState(false);
  const [marginTop, setMarginTop] = useState("0.7");
  const [marginBottom, setMarginBottom] = useState("0.7");
  const [marginLeft, setMarginLeft] = useState("0.55");
  const [marginRight, setMarginRight] = useState("0.2");
  const [customReportName, setCustomReportName] = useState("");
  const [exportName, setExportName] = useState(reportName);
  const [reportDescription, setReportDescription] = useState("");
  const [shareWith, setShareWith] = useState("Only Me");
  const [dateRange, setDateRange] = useState("Today");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(formatLocalDate(new Date()));
  const [customEndDate, setCustomEndDate] = useState(formatLocalDate(new Date()));
  const [leftMonth, setLeftMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [rightMonth, setRightMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
  const [compareWith, setCompareWith] = useState("None");
  const [compareWithSearch, setCompareWithSearch] = useState("");
  const [isCompareWithOpen, setIsCompareWithOpen] = useState(false);
  const [compareCount, setCompareCount] = useState("1");
  const [compareCountSearch, setCompareCountSearch] = useState("");
  const [isCompareCountOpen, setIsCompareCountOpen] = useState(false);
  const [compareLatestToOldest, setCompareLatestToOldest] = useState(false);
  const [groupBy, setGroupBy] = useState("None");
  const [groupBySearch, setGroupBySearch] = useState("");
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState("Invoice, Credit Note");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [availableColumnsSearch, setAvailableColumnsSearch] = useState("");
  const [filterRows, setFilterRows] = useState<Array<{ id: number; field: string; comparator: string; value: string }>>([]);
  const dateRangeRef = useRef<HTMLDivElement>(null);
  const compareWithRef = useRef<HTMLDivElement>(null);
  const compareCountRef = useRef<HTMLDivElement>(null);
  const groupByRef = useRef<HTMLDivElement>(null);
  const entitiesRef = useRef<HTMLDivElement>(null);
  const tableDensityRef = useRef<HTMLDivElement>(null);
  const tableDesignRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const [isEntitiesOpen, setIsEntitiesOpen] = useState(false);
  const columnSetup = useMemo(
    () => getColumnSetupForReport(selectedReport?.id || "", selectedReport?.categoryId || ""),
    [selectedReport?.id, selectedReport?.categoryId],
  );
  const availableColumnGroups = useMemo(
    () =>
      columnSetup.availableGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !selectedColumns.includes(item)),
        }))
        .filter((group) => group.items.length > 0),
    [columnSetup.availableGroups, selectedColumns],
  );
  const filteredAvailableColumnGroups = useMemo(
    () =>
      availableColumnGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.toLowerCase().includes(availableColumnsSearch.trim().toLowerCase())),
        }))
        .filter((group) => group.items.length > 0),
    [availableColumnGroups, availableColumnsSearch],
  );
  const previewColumns = selectedColumns.length > 0 ? selectedColumns : columnSetup.selectedColumns;
  const tableDesignOptions = ["Default", "Bordered", "Alternative Rows", "Alternative Columns"];
  const filteredTableDesignOptions = tableDesignOptions.filter((option) =>
    option.toLowerCase().includes(tableDesignSearch.toLowerCase()),
  );
  const filteredTableDensityOptions = TABLE_DENSITY_OPTIONS.filter((option) =>
    option.toLowerCase().includes(tableDensitySearch.toLowerCase()),
  );
  const filteredFontFamilyOptions = FONT_FAMILY_OPTIONS.filter((option) => {
    const q = fontFamilySearch.trim().toLowerCase();
    if (!q) return true;
    return option.name.toLowerCase().includes(q) || option.description.toLowerCase().includes(q);
  });
  const selectedFontFamilyOption =
    FONT_FAMILY_OPTIONS.find((option) => option.name === fontFamily) || FONT_FAMILY_OPTIONS[0];
  const previewRowHeight =
    tableDensity === "Compact" ? "h-[14px]" : tableDensity === "Super Compact" ? "h-[12px]" : "h-[18px]";
  const previewFooterCount = [showGeneratedDate, showGeneratedTime, showPageNumber, showGeneratedBy].filter(Boolean).length;
  const previewPaperHeight = orientation === "Landscape" ? 300 + previewFooterCount * 10 : 325 + previewFooterCount * 10;
  const previewTimestamp = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const renderPreviewTable = () => {
    const rows = previewColumns.slice(0, 5);

    if (tableDesign === "Bordered") {
      return (
        <div className="mt-4 overflow-hidden border border-[#e5e7eb]">
          <div className="grid grid-cols-4 bg-[#ececec]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`bordered-head-${index}`} className="h-7 border-r border-[#e5e7eb] last:border-r-0" />
            ))}
          </div>
          {rows.map((column, rowIndex) => (
            <div key={column} className="grid grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`${column}-${index}`}
                  className={`border-r border-t border-[#e5e7eb] last:border-r-0 ${previewRowHeight} ${
                    rowIndex % 2 === 0 ? "bg-white" : "bg-[#fcfcfd]"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (tableDesign === "Alternative Rows") {
      return (
        <div className="mt-4">
          <div className="h-7 rounded-[2px] bg-[#ececec]" />
          <div className="mt-2 space-y-1">
            {rows.map((column, index) => (
              <div
                key={column}
                className={`border-t border-[#e5e7eb] ${previewRowHeight} ${
                  index % 2 === 0 ? "bg-[#f7f7f7]" : "bg-white"
                }`}
              />
            ))}
          </div>
        </div>
      );
    }

    if (tableDesign === "Alternative Columns") {
      return (
        <div className="mt-4 overflow-hidden border border-[#e5e7eb] bg-white">
          <div className="grid grid-cols-4 bg-[#ececec]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`alt-cols-head-${index}`} className="h-7 border-r border-[#e5e7eb] last:border-r-0" />
            ))}
          </div>
          {rows.map((column) => (
            <div key={column} className="grid grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`${column}-${index}`}
                  className={`border-r border-t border-[#e5e7eb] last:border-r-0 ${previewRowHeight} ${
                    index % 2 === 0 ? "bg-[#f7f9ff]" : "bg-white"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="mt-4">
        <div className="h-7 rounded-[2px] bg-[#ececec]" />
        <div className="mt-4 space-y-3">
          {rows.map((column, index) => (
            <div
              key={column}
              className={`border-t border-[#e5e7eb] ${previewRowHeight} ${
                tableDesign === "Striped" && index % 2 === 0 ? "bg-[#fafafa]" : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  if (!reportName) {
    return <Navigate to="/reports" replace />;
  }

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        isDateRangeOpen &&
        dateRangeRef.current &&
        target &&
        !dateRangeRef.current.contains(target)
      ) {
        setIsDateRangeOpen(false);
        setIsCustomDateRangeOpen(false);
      }

      if (
        isCompareWithOpen &&
        compareWithRef.current &&
        target &&
        !compareWithRef.current.contains(target)
      ) {
        setIsCompareWithOpen(false);
      }

      if (
        isCompareCountOpen &&
        compareCountRef.current &&
        target &&
        !compareCountRef.current.contains(target)
      ) {
        setIsCompareCountOpen(false);
      }

      if (isGroupByOpen && groupByRef.current && target && !groupByRef.current.contains(target)) {
        setIsGroupByOpen(false);
      }

      if (isEntitiesOpen && entitiesRef.current && target && !entitiesRef.current.contains(target)) {
        setIsEntitiesOpen(false);
      }

      if (isTableDesignOpen && tableDesignRef.current && target && !tableDesignRef.current.contains(target)) {
        setIsTableDesignOpen(false);
      }

      if (isTableDensityOpen && tableDensityRef.current && target && !tableDensityRef.current.contains(target)) {
        setIsTableDensityOpen(false);
      }

      if (isFontFamilyOpen && fontFamilyRef.current && target && !fontFamilyRef.current.contains(target)) {
        setIsFontFamilyOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [
    isDateRangeOpen,
    isCompareWithOpen,
    isCompareCountOpen,
    isGroupByOpen,
    isEntitiesOpen,
    isTableDesignOpen,
    isTableDensityOpen,
    isFontFamilyOpen,
  ]);

  useEffect(() => {
    if (!isDateRangeOpen) return;
    if (dateRange === "Custom") {
      setIsCustomDateRangeOpen(true);
    }
  }, [dateRange, isDateRangeOpen]);

  useEffect(() => {
    setCompareWith("None");
    setCompareWithSearch("");
    setIsCompareWithOpen(false);
    setCompareCount("1");
    setCompareCountSearch("");
    setIsCompareCountOpen(false);
    setCompareLatestToOldest(false);
    setGroupBy("None");
    setGroupBySearch("");
    setIsGroupByOpen(false);
    setSelectedEntities("Invoice, Credit Note");
    setSelectedColumns([]);
    setAvailableColumnsSearch("");
    setFilterRows([]);
    setIsEntitiesOpen(false);
    setIsDateRangeOpen(false);
    setIsCustomDateRangeOpen(false);
    setDateRange("Today");
    setCustomReportName("");
    setExportName(reportName);
    setReportDescription("");
    setShareWith("Only Me");
    setTableDensity("Classic");
    setTableDensitySearch("");
    setIsTableDensityOpen(false);
    setFontFamily("Open Sans");
    setFontFamilySearch("");
    setIsFontFamilyOpen(false);
    setTableDesign("Default");
    setTableDesignSearch("");
    setIsTableDesignOpen(false);
    setCurrentStep(1);
  }, [reportName]);

  useEffect(() => {
    setSelectedColumns(columnSetup.selectedColumns);
    setAvailableColumnsSearch("");
    setCurrentStep(1);
  }, [columnSetup.selectedColumns, reportName]);

  const groupByOptions = useMemo(() => {
    if (selectedReport?.id && GROUP_BY_OPTIONS_BY_CATEGORY[selectedReport.categoryId]) {
      return GROUP_BY_OPTIONS_BY_CATEGORY[selectedReport.categoryId];
    }
    return ["Customer", "Date", "Status"];
  }, [selectedReport?.categoryId, selectedReport?.id]);

  const supportsCompare = Boolean(reportSupports.compare);
  const supportsGroup = Boolean(reportSupports.group);
  const supportsFilter = Boolean(reportSupports.filter);

  const renderCalendarMonth = (
    monthDate: Date,
    selectedDate: string,
    onSelectDate: (value: string) => void,
    onNavigate: (delta: number) => void,
    align: "left" | "right",
  ) => {
    const month = getMonthCells(monthDate);
    return (
      <div className="w-[250px]">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#475569] transition hover:bg-[#f3f4f6]"
            onClick={() => onNavigate(-1)}
            aria-label={`Previous month ${align}`}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-medium text-[#111827]">
            {month.monthLabel} {month.year}
          </div>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#475569] transition hover:bg-[#f3f4f6]"
            onClick={() => onNavigate(1)}
            aria-label={`Next month ${align}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#2563eb]">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {month.cells.map((cell) => {
            const cellValue = formatLocalDate(cell.date);
            const active = selectedDate === cellValue;
            return (
              <button
                key={`${cellValue}-${cell.label}-${align}`}
                type="button"
                onClick={() => onSelectDate(cellValue)}
                className={`flex h-8 items-center justify-center rounded-[4px] text-sm transition ${
                  !cell.isCurrentMonth
                    ? "text-[#cbd5e1]"
                    : active
                      ? "bg-[#3b82f6] text-white"
                      : "text-[#111827] hover:bg-[#f3f4f6]"
                }`}
              >
                {cell.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleClose = () => {
    navigate("/reports");
  };

  const handleSaveCustomReport = () => {
    if (!selectedReport) {
      toast.error("Select a report before saving.");
      return;
    }

    if (!customReportName.trim()) {
      toast.error("Report Name is required.");
      return;
    }

    const nextCustomReports = loadJson<SavedCustomReport[]>(CUSTOM_REPORTS_KEY, []);
    const nextReport: SavedCustomReport = {
      id: `custom-${Date.now()}`,
      categoryId: selectedReport.categoryId,
      sourceReportId: selectedReport.id,
      sourceReportName: selectedReport.name,
      name: customReportName.trim(),
      exportName: exportName.trim() || customReportName.trim(),
      description: reportDescription.trim(),
      shareWith,
      createdAt: new Date().toISOString(),
      selectedColumns: selectedColumns.length > 0 ? selectedColumns : columnSetup.selectedColumns,
      dateRange,
      compareWith,
      compareCount,
      compareLatestToOldest,
      groupBy,
      selectedEntities,
      tableDensity,
      tableDesign,
      autoResizeTable,
      paperSize,
      orientation,
      fontFamily,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      showOrganizationName,
      showGeneratedDate,
      showGeneratedTime,
      showPageNumber,
      showGeneratedBy,
      customStartDate,
      customEndDate,
      filterRows,
    };

    saveJson(CUSTOM_REPORTS_KEY, [...nextCustomReports, nextReport]);
    toast.success("Custom report saved.");
    navigate(`/reports/${selectedReport.categoryId}`);
  };

  const addFilterRow = () => {
    setFilterRows((current) => [
      ...current,
      { id: Date.now(), field: "", comparator: "", value: "" },
    ]);
  };

  const removeFilterRow = (id: number) => {
    setFilterRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
  };

  const renderFilterValueControl = (row: { id: number; field: string; comparator: string; value: string }) => {
    const valueMode = getFilterValueMode(row.field, row.comparator);

    if (valueMode === "search") {
      return (
        <div className="relative w-full min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={row.value}
            onChange={(event) => {
              const value = event.target.value;
              setFilterRows((current) => current.map((item) => (item.id === row.id ? { ...item, value } : item)));
            }}
            placeholder="Search value"
            className="h-9 w-full rounded-[4px] border border-[#cfd7e6] bg-white pl-8 pr-3 text-sm text-[#111827] outline-none focus:border-[#156372]"
          />
        </div>
      );
    }

    if (valueMode === "date") {
      return (
        <input
          type="date"
          value={row.value}
          onChange={(event) => {
            const value = event.target.value;
            setFilterRows((current) => current.map((item) => (item.id === row.id ? { ...item, value } : item)));
          }}
          className="h-9 min-w-[220px] flex-1 rounded-[4px] border border-[#cfd7e6] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#156372]"
        />
      );
    }

    if (valueMode === "number") {
      return (
        <input
          type="number"
          value={row.value}
          onChange={(event) => {
            const value = event.target.value;
            setFilterRows((current) => current.map((item) => (item.id === row.id ? { ...item, value } : item)));
          }}
          placeholder="Enter number"
          className="h-9 min-w-[220px] flex-1 rounded-[4px] border border-[#cfd7e6] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#156372]"
        />
      );
    }

    return (
      <input
        type="text"
        value={row.value}
        onChange={(event) => {
          const value = event.target.value;
          setFilterRows((current) => current.map((item) => (item.id === row.id ? { ...item, value } : item)));
        }}
        placeholder="Enter value"
        className="h-9 min-w-[220px] flex-1 rounded-[4px] border border-[#cfd7e6] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#156372]"
      />
    );
  };

  const moveColumnToSelected = (column: string) => {
    setSelectedColumns((current) => (current.includes(column) ? current : [...current, column]));
  };

  const moveColumnToAvailable = (column: string) => {
    setSelectedColumns((current) => current.filter((item) => item !== column));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-slate-900">
      <div className="flex items-center justify-between px-4 py-5">
        <div>
          <h1 className="text-[24px] font-medium text-[#111827]">Create Custom Report</h1>
          <p className="mt-1 text-sm text-[#64748b]">{reportName}</p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#ef4444] transition hover:bg-[#fef2f2]"
          aria-label="Close create custom report page"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-4">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#dbe3ef] pb-2 text-sm">
          {STEPS.map((step, index) => {
            const active = step.id === currentStep;
            return (
              <React.Fragment key={step.id}>
                <div className={`flex items-center gap-2 whitespace-nowrap ${active ? "text-[#111827]" : "text-[#156372]"}`}>
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[12px] ${
                      active ? "border-[#d1d5db] bg-white text-[#111827]" : "border-[#d1d5db] bg-white text-[#111827]"
                    }`}
                  >
                    {step.id}
                  </span>
                  <span className={active ? "font-semibold" : ""}>{step.label}</span>
                </div>
                {index < STEPS.length - 1 ? <span className="text-[#156372]">&gt;</span> : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-6">
        <div className="max-w-[1400px]">
          <section className={currentStep === 1 ? "space-y-10" : "hidden"}>
            <div className="border-b border-[#e5e7eb] pb-8">
              <label className="mb-2 block text-sm font-medium text-[#111827]">Date Range</label>
              <div className="relative w-full max-w-[340px]" ref={dateRangeRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDateRangeOpen((current) => !current);
                    if (!isDateRangeOpen) {
                      setIsCustomDateRangeOpen(dateRange === "Custom");
                    } else {
                      setIsCustomDateRangeOpen(false);
                    }
                  }}
                  className={`flex h-9 w-full items-center justify-between rounded-[4px] border bg-white px-3 pl-9 pr-3 text-left text-sm outline-none transition ${
                    isDateRangeOpen ? "border-[#d1d5db]" : "border-[#d1d5db]"
                  }`}
                >
                  <span className="text-[#111827]">{dateRange}</span>
                  <ChevronDown
                    size={16}
                    className={`text-[#94a3b8] transition-transform ${isDateRangeOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <CalendarDays size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#111827]" />
                {isDateRangeOpen ? (
                  <div className="absolute left-0 top-[calc(100%+4px)] z-50 flex max-w-[calc(100vw-2rem)] overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                    <div className="w-[150px] border-r border-[#e5e7eb]">
                      <div className="max-h-[280px] overflow-y-auto py-1">
                        {DATE_RANGE_OPTIONS.map((option) => {
                          const active = dateRange === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setDateRange(option);
                                if (option === "Custom") {
                                  setIsCustomDateRangeOpen(true);
                                  setCustomStartDate((current) => current || formatLocalDate(new Date()));
                                  setCustomEndDate((current) => current || formatLocalDate(new Date()));
                                } else {
                                  setIsCustomDateRangeOpen(false);
                                  setIsDateRangeOpen(false);
                                }
                              }}
                              className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                                active ? "bg-[#eef2f7] text-[#111827]" : "text-[#111827] hover:bg-[#f3f4f6]"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {isCustomDateRangeOpen ? (
                      <div className="min-w-[580px] px-4 py-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex h-9 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                            <CalendarDays size={14} className="shrink-0 text-[#111827]" />
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(event) => {
                                const next = event.target.value;
                                setCustomStartDate(next);
                                if (customEndDate && next > customEndDate) {
                                  setCustomEndDate(next);
                                }
                              }}
                              className="w-full bg-transparent text-sm text-[#111827] outline-none"
                            />
                          </div>
                          <div className="flex h-9 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                            <CalendarDays size={14} className="shrink-0 text-[#111827]" />
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(event) => {
                                const next = event.target.value;
                                setCustomEndDate(next);
                                if (customStartDate && next < customStartDate) {
                                  setCustomStartDate(next);
                                }
                              }}
                              className="w-full bg-transparent text-sm text-[#111827] outline-none"
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-8">
                          {renderCalendarMonth(
                            leftMonth,
                            customStartDate,
                            (value) => {
                              setCustomStartDate(value);
                              if (customEndDate && value > customEndDate) {
                                setCustomEndDate(value);
                              }
                            },
                            (delta) => setLeftMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1)),
                            "left",
                          )}
                          {renderCalendarMonth(
                            rightMonth,
                            customEndDate,
                            (value) => {
                              setCustomEndDate(value);
                              if (customStartDate && value < customStartDate) {
                                setCustomStartDate(value);
                              }
                            },
                            (delta) => setRightMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1)),
                            "right",
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#e5e7eb] pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDateRangeOpen(false);
                              setIsCustomDateRangeOpen(false);
                            }}
                            className="rounded-[4px] border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] transition hover:bg-[#f3f4f6]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDateRange("Custom");
                              setIsDateRangeOpen(false);
                              setIsCustomDateRangeOpen(false);
                            }}
                            className="rounded-[4px] px-4 py-2 text-sm font-medium text-white transition"
                            style={{ backgroundColor: "#156372" }}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.backgroundColor = "#0D4A52";
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.backgroundColor = "#156372";
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {supportsCompare ? (
              <div className="border-b border-[#e5e7eb] pb-8">
              <label className="mb-2 block text-sm font-medium text-[#111827]">Compare With</label>
              <div className="space-y-4">
                <div className="relative w-full max-w-[340px]" ref={compareWithRef}>
                  <button
                    type="button"
                    onClick={() => setIsCompareWithOpen((current) => !current)}
                    className={`flex h-9 w-full items-center justify-between rounded-[4px] border bg-white px-3 pr-3 text-left text-sm outline-none transition ${
                      isCompareWithOpen ? "border-[#d1d5db]" : "border-[#d1d5db]"
                    }`}
                  >
                    <span className={compareWith === "None" ? "text-[#94a3b8]" : "text-[#111827]"}>
                      {compareWith}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-[#94a3b8] transition-transform ${isCompareWithOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isCompareWithOpen ? (
                    <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[160px] overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                      <div className="border-b border-[#e5e7eb] p-2">
                        <div className="flex h-8 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                          <Search size={14} className="shrink-0 text-[#94a3b8]" />
                          <input
                            type="text"
                            value={compareWithSearch}
                            onChange={(event) => setCompareWithSearch(event.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
                          />
                        </div>
                      </div>
                      <div className="max-h-[280px] overflow-y-auto py-1">
                        {COMPARE_WITH_OPTIONS.filter((option) =>
                          option.toLowerCase().includes(compareWithSearch.toLowerCase())
                        ).map((option) => {
                          const active = compareWith === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setCompareWith(option);
                                setCompareWithSearch("");
                                setIsCompareWithOpen(false);
                                if (option !== "Previous Year(s)") {
                                  setIsCompareCountOpen(false);
                                }
                              }}
                              className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                                active ? "bg-[#eef2f7] text-[#111827]" : "text-[#111827] hover:bg-[#f3f4f6]"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {compareWith === "Previous Year(s)" ? (
                  <div className="space-y-3">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-[#111827]">Number of Year(s)</label>
                        <div className="relative w-full max-w-[340px]" ref={compareCountRef}>
                          <button
                            type="button"
                            onClick={() => setIsCompareCountOpen((current) => !current)}
                            className="flex h-9 w-full items-center justify-between rounded-[4px] border border-[#d1d5db] bg-white px-3 text-left text-sm outline-none transition"
                          >
                            <span className="text-[#111827]">{compareCount}</span>
                            <ChevronDown
                              size={16}
                              className={`text-[#94a3b8] transition-transform ${isCompareCountOpen ? "rotate-180" : ""}`}
                            />
                          </button>
                          {isCompareCountOpen ? (
                            <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[340px] overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                              <div className="border-b border-[#e5e7eb] p-2">
                                <div className="flex h-8 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                                  <Search size={14} className="shrink-0 text-[#94a3b8]" />
                                  <input
                                    type="text"
                                    value={compareCountSearch}
                                    onChange={(event) => setCompareCountSearch(event.target.value)}
                                    placeholder="Search"
                                    className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
                                  />
                                </div>
                              </div>
                              <div className="max-h-[220px] overflow-y-auto py-1">
                                {COMPARE_COUNT_OPTIONS.filter((option) =>
                                  option.toLowerCase().includes(compareCountSearch.toLowerCase())
                                ).map((option) => {
                                  const active = compareCount === option;
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => {
                                        setCompareCount(option);
                                        setCompareCountSearch("");
                                        setIsCompareCountOpen(false);
                                      }}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                                        active ? "bg-[#3b82f6] text-white" : "text-[#111827] hover:bg-[#f3f4f6]"
                                      }`}
                                    >
                                      <span>{option}</span>
                                      {active ? <span>✓</span> : null}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-[#111827]">
                      <input
                        type="checkbox"
                        checked={compareLatestToOldest}
                        onChange={(event) => setCompareLatestToOldest(event.target.checked)}
                        className="h-4 w-4 rounded border-[#cbd5e1] text-[#156372] focus:ring-[#156372]"
                      />
                      <span>Arrange period/year from latest to oldest</span>
                    </label>
                  </div>
                ) : null}
              </div>
              </div>
            ) : null}

            {supportsGroup ? (
              <div className="border-b border-[#e5e7eb] pb-8">
                <label className="mb-2 block text-sm font-medium text-[#111827]">Group By</label>
                <div className="relative w-full max-w-[340px]" ref={groupByRef}>
                  <button
                    type="button"
                    onClick={() => setIsGroupByOpen((current) => !current)}
                    className={`flex h-9 w-full items-center justify-between rounded-[4px] border bg-white px-3 pr-3 text-left text-sm outline-none transition ${
                      isGroupByOpen ? "border-[#d1d5db]" : "border-[#d1d5db]"
                    }`}
                  >
                    <span className={groupBy === "None" ? "text-[#94a3b8]" : "text-[#111827]"}>{groupBy}</span>
                    <ChevronDown
                      size={16}
                      className={`text-[#94a3b8] transition-transform ${isGroupByOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isGroupByOpen ? (
                    <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[220px] overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                      <div className="border-b border-[#e5e7eb] p-2">
                        <div className="flex h-8 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                          <Search size={14} className="shrink-0 text-[#94a3b8]" />
                          <input
                            type="text"
                            value={groupBySearch}
                            onChange={(event) => setGroupBySearch(event.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
                          />
                        </div>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto py-1">
                        {groupByOptions.filter((option) =>
                          option.toLowerCase().includes(groupBySearch.toLowerCase())
                        ).map((option) => {
                          const active = groupBy === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setGroupBy(option);
                                setGroupBySearch("");
                                setIsGroupByOpen(false);
                              }}
                              className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                                active ? "bg-[#eef2f7] text-[#111827]" : "text-[#111827] hover:bg-[#f3f4f6]"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {supportsFilter ? (
              <div className="border-b border-[#e5e7eb] pb-8">
              <label className="mb-2 block text-sm font-medium text-[#111827]">Entities :</label>
              <div className="relative w-full max-w-[340px]" ref={entitiesRef}>
                <button
                  type="button"
                  onClick={() => setIsEntitiesOpen((current) => !current)}
                  className={`flex h-9 w-full items-center justify-between rounded-[4px] border bg-white px-3 pr-3 text-left text-sm outline-none transition ${
                    isEntitiesOpen ? "border-[#d1d5db]" : "border-[#d1d5db]"
                  }`}
                >
                  <span className="text-[#111827]">{selectedEntities}</span>
                  <ChevronDown
                    size={16}
                    className={`text-[#94a3b8] transition-transform ${isEntitiesOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isEntitiesOpen ? (
                  <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[230px] overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                    <div className="max-h-[260px] overflow-y-auto py-1">
                      {entities.map((entity) => {
                        const active = selectedEntities === entity;
                        return (
                          <button
                            key={entity}
                            type="button"
                            onClick={() => {
                              setSelectedEntities(entity);
                              setIsEntitiesOpen(false);
                            }}
                            className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                              active ? "bg-[#eef2f7] text-[#111827]" : "text-[#111827] hover:bg-[#f3f4f6]"
                            }`}
                          >
                            {entity}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              </div>
            ) : null}

            {supportsFilter ? (
              <div className="pb-6">
              <h2 className="text-[15px] font-semibold text-[#111827]">Advanced Filters</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Use advanced filters to filter the report based on the fields of Reports, Locations.
              </p>
              <div className="mt-5 space-y-4">
                {filterRows.map((row, index) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[#d1d5db] bg-white text-sm text-[#111827]">
                      {index + 1}
                    </div>

                    <div className="relative w-full max-w-[270px]">
                      <select
                        value={row.field}
                        onChange={(event) => {
                          const value = event.target.value;
                          setFilterRows((current) =>
                            current.map((item) =>
                              item.id === row.id ? { ...item, field: value, comparator: "", value: "" } : item,
                            ),
                          );
                        }}
                        className="h-9 w-full appearance-none rounded-[4px] border border-[#cfd7e6] bg-white px-3 pr-9 text-sm text-[#64748b] outline-none"
                      >
                        <option value="">Select a field</option>
                        {FILTER_FIELD_OPTIONS.filter((option) => option !== "Select a field").map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                      />
                    </div>

                    <div className="relative w-full max-w-[240px]">
                      <select
                        value={row.comparator}
                        onChange={(event) => {
                          const value = event.target.value;
                          setFilterRows((current) =>
                            current.map((item) =>
                              item.id === row.id ? { ...item, comparator: value, value: "" } : item,
                            ),
                          );
                        }}
                        className="h-9 w-full appearance-none rounded-[4px] border border-[#cfd7e6] bg-white px-3 pr-9 text-sm text-[#64748b] outline-none"
                      >
                        <option value="">Select a comparator</option>
                        {FILTER_COMPARATOR_OPTIONS.filter((option) => option !== "Select a comparator").map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                      />
                    </div>

                    {renderFilterValueControl(row)}

                    <button
                      type="button"
                      onClick={addFilterRow}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#64748b] transition hover:bg-[#f3f4f6]"
                      aria-label="Add more filter rows"
                    >
                      <Plus size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFilterRow(row.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#64748b] transition hover:bg-[#f3f4f6]"
                      aria-label="Remove filter row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addFilterRow}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#156372] transition hover:text-[#0D4A52]"
              >
                <Plus size={14} /> Add More
              </button>
              </div>
            ) : null}
          </section>

          {currentStep === 2 ? (
            <div className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_56px_minmax(0,320px)]">
                <div>
                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Available Columns</div>
                  <div className="overflow-hidden rounded-[8px] border border-[#d7dce7] bg-white">
                    <div className="border-b border-[#e5e7eb] p-2">
                      <div className="flex h-9 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                        <Search size={14} className="shrink-0 text-[#94a3b8]" />
                        <input
                          type="text"
                          value={availableColumnsSearch}
                          onChange={(event) => setAvailableColumnsSearch(event.target.value)}
                          placeholder="Search"
                          className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
                        />
                      </div>
                    </div>
                    <div className="max-h-[430px] overflow-y-auto p-1">
                      {filteredAvailableColumnGroups.map((group) => (
                        <div key={group.label} className="mb-2 last:mb-0">
                          <div className="px-3 py-2 text-[12px] font-medium text-[#94a3b8]">{group.label}</div>
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => moveColumnToSelected(item)}
                                className="flex w-full items-center rounded-[6px] px-3 py-2 text-left text-sm text-[#111827] transition hover:bg-[#f3f4f6]"
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      const firstAvailable = filteredAvailableColumnGroups[0]?.items[0];
                      if (firstAvailable) moveColumnToSelected(firstAvailable);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#cfd7e6] bg-white text-[#64748b] shadow-sm transition hover:bg-[#f3f4f6]"
                    aria-label="Move column"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div>
                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Selected Columns</div>
                  <div className="overflow-hidden rounded-[8px] border border-[#d7dce7] bg-white">
                    <div className="max-h-[478px] overflow-y-auto p-2">
                      {selectedColumns.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-[#94a3b8]">No columns selected.</div>
                      ) : (
                        selectedColumns.map((column) => (
                          <button
                            key={column}
                            type="button"
                            onClick={() => moveColumnToAvailable(column)}
                            className="flex w-full items-center justify-between rounded-[6px] px-3 py-2 text-left text-sm text-[#111827] transition hover:bg-[#f3f4f6]"
                          >
                            <span>{column}</span>
                            <span className="text-[#94a3b8]">×</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-8">
                <section>
                  <h3 className="text-[16px] font-semibold text-[#111827]">Choose Details to Display</h3>
                  <div className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: "Organization Name", checked: showOrganizationName, setter: setShowOrganizationName },
                      { label: "Page Number", checked: showPageNumber, setter: setShowPageNumber },
                      { label: "Generated By", checked: showGeneratedBy, setter: setShowGeneratedBy },
                      { label: "Generated Date", checked: showGeneratedDate, setter: setShowGeneratedDate },
                      { label: "Generated Time", checked: showGeneratedTime, setter: setShowGeneratedTime },
                    ].map((option) => (
                      <label key={option.label} className="inline-flex items-center gap-2 text-sm text-[#111827]">
                        <input
                          type="checkbox"
                          checked={option.checked}
                          onChange={(event) => option.setter(event.target.checked)}
                          className="h-4 w-4 rounded border-[#cbd5e1] text-[#3b82f6] focus:ring-[#3b82f6]"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <div className="border-t border-dashed border-[#d7dce7]" />

                <section>
                  <h3 className="text-[16px] font-semibold text-[#111827]">Report Layout</h3>

                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#111827]">Table Density</label>
                      <div className="relative w-full max-w-[340px]" ref={tableDensityRef}>
                        <button
                          type="button"
                          onClick={() => setIsTableDensityOpen((current) => !current)}
                          className={`flex h-10 w-full items-center justify-between rounded-[4px] border bg-white px-3 text-left text-sm outline-none transition ${
                            isTableDensityOpen ? "border-[#156372]" : "border-[#d1d5db]"
                          }`}
                        >
                          <span className="text-[#111827]">{tableDensity}</span>
                          <ChevronDown
                            size={16}
                            className={`text-[#94a3b8] transition-transform ${isTableDensityOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isTableDensityOpen ? (
                          <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                            <div className="border-b border-[#e5e7eb] p-2">
                              <div className="flex h-8 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                                <Search size={14} className="shrink-0 text-[#94a3b8]" />
                                <input
                                  type="text"
                                  value={tableDensitySearch}
                                  onChange={(event) => setTableDensitySearch(event.target.value)}
                                  placeholder="Search"
                                  className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
                                />
                              </div>
                            </div>
                            <div className="py-1">
                              {filteredTableDensityOptions.map((option) => {
                                const active = tableDensity === option;
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                      setTableDensity(option);
                                      setTableDensitySearch("");
                                      setIsTableDensityOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                                      active ? "bg-[#3b82f6] text-white" : "text-[#111827] hover:bg-[#f3f4f6]"
                                    }`}
                                  >
                                    <span>{option}</span>
                                    {active ? <span>✓</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#111827]">Table Design</label>
                      <div className="relative" ref={tableDesignRef}>
                        <button
                          type="button"
                          onClick={() => setIsTableDesignOpen((current) => !current)}
                          className={`flex h-10 w-full items-center justify-between rounded-[4px] border bg-white px-3 text-left text-sm outline-none transition ${
                            isTableDesignOpen ? "border-[#156372]" : "border-[#d1d5db]"
                          }`}
                        >
                          <span className="text-[#111827]">{tableDesign}</span>
                          <ChevronDown
                            size={16}
                            className={`text-[#94a3b8] transition-transform ${isTableDesignOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isTableDesignOpen ? (
                          <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[340px] overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                            <div className="border-b border-[#e5e7eb] p-2">
                              <div className="flex h-8 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                                <Search size={14} className="shrink-0 text-[#94a3b8]" />
                                <input
                                  type="text"
                                  value={tableDesignSearch}
                                  onChange={(event) => setTableDesignSearch(event.target.value)}
                                  placeholder="Search"
                                  className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
                                />
                              </div>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredTableDesignOptions.map((option) => {
                                const active = tableDesign === option;
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                      setTableDesign(option);
                                      setTableDesignSearch("");
                                      setIsTableDesignOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                                      active ? "bg-[#3b82f6] text-white" : "text-[#111827] hover:bg-[#f3f4f6]"
                                    }`}
                                  >
                                    <span>{option}</span>
                                    {active ? <span>✓</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <label className="mt-5 flex items-start gap-2 text-sm text-[#111827]">
                    <input
                      type="checkbox"
                      checked={autoResizeTable}
                      onChange={(event) => setAutoResizeTable(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#cbd5e1] text-[#3b82f6] focus:ring-[#3b82f6]"
                    />
                    <span>Re-size the table and its font automatically to fit the content within the table.</span>
                  </label>

                  <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="mb-2 text-sm font-medium text-[#111827]">Paper Size</div>
                      <div className="flex items-center gap-4 text-sm text-[#111827]">
                        {["A4", "Letter"].map((size) => (
                          <label key={size} className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name="paper-size"
                              checked={paperSize === size}
                              onChange={() => setPaperSize(size)}
                              className="h-4 w-4 border-[#cbd5e1] text-[#3b82f6] focus:ring-[#3b82f6]"
                            />
                            <span>{size}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-[#111827]">Orientation</div>
                      <div className="flex items-center gap-4 text-sm text-[#111827]">
                        {["Portrait", "Landscape"].map((item) => (
                          <label key={item} className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name="orientation"
                              checked={orientation === item}
                              onChange={() => setOrientation(item)}
                              className="h-4 w-4 border-[#cbd5e1] text-[#3b82f6] focus:ring-[#3b82f6]"
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#111827]">Font Family</label>
                      <div className="relative w-full max-w-[340px]" ref={fontFamilyRef}>
                        <button
                          type="button"
                          onClick={() => setIsFontFamilyOpen((current) => !current)}
                          className={`flex h-10 w-full items-center justify-between rounded-[4px] border bg-white px-3 text-left text-sm outline-none transition ${
                            isFontFamilyOpen ? "border-[#156372]" : "border-[#d1d5db]"
                          }`}
                        >
                          <span className="text-[#111827]">{fontFamily}</span>
                          <ChevronDown
                            size={16}
                            className={`text-[#94a3b8] transition-transform ${isFontFamilyOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isFontFamilyOpen ? (
                          <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[360px] overflow-hidden rounded-[8px] border border-[#d1d5db] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                            <div className="border-b border-[#e5e7eb] p-2">
                              <div className="flex h-8 items-center gap-2 rounded-[4px] border border-[#d1d5db] px-2">
                                <Search size={14} className="shrink-0 text-[#94a3b8]" />
                                <input
                                  type="text"
                                  value={fontFamilySearch}
                                  onChange={(event) => setFontFamilySearch(event.target.value)}
                                  placeholder="Search"
                                  className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
                                />
                              </div>
                            </div>
                            <div className="max-h-[260px] overflow-y-auto py-1">
                              {filteredFontFamilyOptions.map((option) => {
                                const active = fontFamily === option.name;
                                return (
                                  <button
                                    key={option.name}
                                    type="button"
                                    onClick={() => {
                                      setFontFamily(option.name);
                                      setFontFamilySearch("");
                                      setIsFontFamilyOpen(false);
                                    }}
                                    className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition ${
                                      active ? "bg-[#3b82f6] text-white" : "text-[#111827] hover:bg-[#f3f4f6]"
                                    }`}
                                  >
                                    <span className="min-w-0">
                                      <span className="block text-sm font-medium">{option.name}</span>
                                      <span className={`mt-0.5 block text-[11px] leading-4 ${active ? "text-white/90" : "text-[#64748b]"}`}>
                                        {option.description}
                                      </span>
                                    </span>
                                    {active ? <span className="pt-1 text-sm">✓</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-2 max-w-[340px] text-[11px] leading-5 text-[#64748b]">
                        {selectedFontFamilyOption.description}
                      </p>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-[#111827]">Margins</div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Top", value: marginTop, setter: setMarginTop },
                          { label: "Bottom", value: marginBottom, setter: setMarginBottom },
                          { label: "Left", value: marginLeft, setter: setMarginLeft },
                          { label: "Right", value: marginRight, setter: setMarginRight },
                        ].map((item) => (
                          <label key={item.label} className="block">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={item.value}
                              onChange={(event) => item.setter(event.target.value)}
                              className="h-10 w-full rounded-[4px] border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none"
                            />
                            <span className="mt-1 block text-[11px] text-[#64748b]">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="rounded-[12px] bg-[#f7f8fd] px-6 py-4">
                <div className="text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-[#111827]">Preview</div>
                <div
                  className={`mx-auto mt-4 overflow-hidden rounded-[2px] border border-[#d7dce7] bg-white shadow-[0_10px_18px_rgba(15,23,42,0.12)] ${
                    orientation === "Landscape" ? "w-[300px]" : "w-[235px]"
                  }`}
                  style={{
                    height: `${previewPaperHeight}px`,
                    fontFamily,
                    paddingTop: `${Number(marginTop) || 0.7}rem`,
                    paddingBottom: `${Number(marginBottom) || 0.7}rem`,
                    paddingLeft: `${Number(marginLeft) || 0.55}rem`,
                    paddingRight: `${Number(marginRight) || 0.2}rem`,
                  }}
                >
                  <div className="flex h-full w-full flex-col overflow-hidden">
                    <div className="text-center text-[13px] text-[#475569]">
                      {showOrganizationName ? "Organization Name" : reportName}
                    </div>
                    <div className="mt-3 h-7 shrink-0 rounded-[2px] bg-[#ececec]" />
                    <div className="min-h-0 flex-1 overflow-hidden">{renderPreviewTable()}</div>
                    <div className="hidden mt-auto grid grid-cols-3 gap-2 pt-2 text-[10px] leading-4 text-[#64748b]">
                      {showGeneratedDate ? "Generated Date" : ""}
                      {showGeneratedDate && showGeneratedTime ? " • " : ""}
                      {showGeneratedTime ? "Generated Time" : ""}
                    </div>
                    <div className="mt-auto grid grid-cols-3 items-end gap-2 pt-2 text-[10px] leading-4 text-[#64748b]">
                      <div className="truncate text-left">{showOrganizationName ? reportName : ""}</div>
                      <div className="truncate text-center">{showPageNumber ? "Page 1 of 1" : ""}</div>
                      <div className="truncate text-right">{showGeneratedDate || showGeneratedTime ? previewTimestamp : ""}</div>
                    </div>
                    {null}
                    {null}
                  </div>
                </div>
              </aside>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="mt-6 space-y-8">
              <section className="rounded-[8px] bg-[#f8f9fc] px-4 py-4">
                <div className="grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)] lg:items-center">
                  <label className="text-[14px] font-medium text-[#ef4444]">
                    Report Name<span className="ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={customReportName}
                    onChange={(event) => setCustomReportName(event.target.value)}
                    className="h-10 w-full max-w-[420px] rounded-[6px] border border-[#d6dcea] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#156372]"
                  />

                  <label className="text-[14px] font-medium text-[#111827]">Name in Export</label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(event) => setExportName(event.target.value)}
                    className="h-10 w-full max-w-[420px] rounded-[6px] border border-[#d6dcea] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#156372]"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[16px] font-medium text-[#111827]">Report Description</h3>
                <textarea
                  value={reportDescription}
                  onChange={(event) => setReportDescription(event.target.value)}
                  placeholder="Add a description to your report"
                  className="h-[104px] w-full max-w-[720px] rounded-[6px] border border-[#d6dcea] bg-white px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#94a3b8] focus:border-[#156372]"
                />
                <div className="max-w-[720px] rounded-[8px] bg-[#f8fafc] px-4 py-3 text-[12px] leading-5 text-[#475569]">
                  You can use report descriptions to help you identify the details of the reports for your reference.
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[16px] font-medium text-[#111827]">Configure Permissions</h3>
                <div className="max-w-[720px] rounded-[8px] border border-[#e5eaf3] bg-[#f8f9fc] px-4 py-4">
                  <div className="text-[14px] font-medium text-[#111827]">Share With</div>
                  <label className="mt-4 inline-flex items-center gap-2 rounded-[6px] border border-[#d6dcea] bg-white px-3 py-2 text-sm text-[#111827]">
                    <input
                      type="radio"
                      name="share-with"
                      checked={shareWith === "Only Me"}
                      onChange={() => setShareWith("Only Me")}
                      className="h-4 w-4 border-[#cbd5e1] text-[#156372] focus:ring-[#156372]"
                    />
                    <span>Only Me</span>
                    <Lock size={14} className="text-[#94a3b8]" />
                  </label>
                </div>
                <div className="max-w-[720px] rounded-[8px] bg-[#f8fafc] px-4 py-3 text-[12px] leading-5 text-[#475569]">
                  Admins have complete access to custom reports by default, including edit and delete permissions.
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[#e5e7eb] px-4 py-4">
        <div className="flex items-center gap-2">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#d1d5db] bg-[#f8f8f8] text-[#1f2937] transition hover:bg-[#f3f4f6]"
              aria-label="Back"
            >
              <ChevronLeft size={16} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={currentStep === 4 ? handleSaveCustomReport : () => setCurrentStep((step) => Math.min(4, step + 1))}
            className="rounded-[4px] px-4 py-2 text-sm font-medium text-white transition"
            style={{ backgroundColor: "#156372" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "#0D4A52";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "#156372";
            }}
          >
            {currentStep === 4 ? "Save Custom Report" : "Next"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-[4px] border border-[#d1d5db] bg-[#f8f8f8] px-4 py-2 text-sm font-medium text-[#1f2937] transition hover:bg-[#f3f4f6]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
