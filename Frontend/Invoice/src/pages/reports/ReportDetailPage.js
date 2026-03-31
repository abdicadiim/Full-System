"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReportDetailPage;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_toastify_1 = require("react-toastify");
var lucide_react_1 = require("lucide-react");
var ReportDetailHeader_1 = require("./ReportDetailHeader");
var reportsCatalog_1 = require("./reportsCatalog");
var formatDate = function (value) { return value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };
var MORE_FILTER_FIELD_OPTIONS = [
    { key: "customer-name", label: "Customer Name" },
    { key: "currency", label: "Currency" },
    { key: "location", label: "Location" },
];
var MORE_FILTER_FIELD_GROUPS = [
    {
        label: "Reports",
        options: [
            { key: "customer-name", label: "Customer Name" },
            { key: "currency", label: "Currency" },
        ],
    },
    {
        label: "Locations",
        options: [{ key: "location", label: "Location" }],
    },
];
var MORE_FILTER_COMPARATOR_OPTIONS = [
    { key: "is-in", label: "is in" },
    { key: "is-not-in", label: "is not in" },
    { key: "starts-with", label: "starts with" },
    { key: "ends-with", label: "ends with" },
    { key: "contains", label: "contains" },
    { key: "does-not-contain", label: "doesn't contain" },
];
var MORE_FILTER_VALUE_OPTIONS = {
    "customer-name": [
        { key: "select-customer", label: "Select Customer" },
        { key: "ss", label: "ss" },
    ],
    currency: [
        { key: "select-currency", label: "Select Currency" },
        { key: "SOS", label: "SOS" },
        { key: "USD", label: "USD" },
    ],
    location: [
        { key: "select-location", label: "Select Location" },
        { key: "mogadishu", label: "Mogadishu" },
        { key: "hargeisa", label: "Hargeisa" },
    ],
};
var getMoreFilterFieldLabel = function (field) { var _a, _b; return (_b = (_a = MORE_FILTER_FIELD_OPTIONS.find(function (option) { return option.key === field; })) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : "Select a field"; };
var getMoreFilterComparatorLabel = function (comparator) { var _a, _b; return (_b = (_a = MORE_FILTER_COMPARATOR_OPTIONS.find(function (option) { return option.key === comparator; })) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : "Select a comparator"; };
var getMoreFilterValuePlaceholder = function (field) {
    var _a, _b, _c;
    if (!field)
        return "Select a value";
    return (_c = (_b = (_a = MORE_FILTER_VALUE_OPTIONS[field]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.label) !== null && _c !== void 0 ? _c : "Select a value";
};
var getMoreFilterValueLabel = function (field, value) {
    var _a, _b;
    if (!field)
        return "Select a value";
    return (_b = (_a = MORE_FILTER_VALUE_OPTIONS[field].find(function (option) { return option.key === value; })) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : getMoreFilterValuePlaceholder(field);
};
var DATE_RANGE_OPTIONS = [
    { key: "today", label: "Today" },
    { key: "this-week", label: "This Week" },
    { key: "this-month", label: "This Month" },
    { key: "this-quarter", label: "This Quarter" },
    { key: "this-year", label: "This Year" },
    { key: "yesterday", label: "Yesterday" },
    { key: "previous-week", label: "Previous Week" },
    { key: "previous-month", label: "Previous Month" },
    { key: "previous-quarter", label: "Previous Quarter" },
    { key: "previous-year", label: "Previous Year" },
    { key: "custom", label: "Custom" },
];
var ENTITY_OPTIONS = [
    { key: "invoice", label: "Invoice" },
    { key: "credit-note", label: "Credit Note" },
    { key: "sales-receipt", label: "Sales Receipt" },
];
var getStartOfDay = function (date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
var getEndOfDay = function (date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
var getStartOfWeek = function (date) {
    var start = getStartOfDay(date);
    var day = start.getDay();
    start.setDate(start.getDate() - day);
    return start;
};
var getEndOfWeek = function (date) {
    var end = getStartOfWeek(date);
    end.setDate(end.getDate() + 6);
    return end;
};
var getQuarterBounds = function (year, quarterIndex) {
    var startMonth = quarterIndex * 3;
    return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, startMonth + 3, 0),
    };
};
var getDateRangeValue = function (key, referenceDate) {
    if (referenceDate === void 0) { referenceDate = new Date(); }
    var today = getStartOfDay(referenceDate);
    switch (key) {
        case "today":
            return { start: today, end: getEndOfDay(referenceDate) };
        case "this-week":
            return { start: getStartOfWeek(referenceDate), end: getEndOfWeek(referenceDate) };
        case "this-month":
            return { start: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1), end: new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0) };
        case "this-quarter": {
            var quarterIndex = Math.floor(referenceDate.getMonth() / 3);
            return getQuarterBounds(referenceDate.getFullYear(), quarterIndex);
        }
        case "this-year":
            return { start: new Date(referenceDate.getFullYear(), 0, 1), end: new Date(referenceDate.getFullYear(), 11, 31) };
        case "yesterday": {
            var yesterday = getStartOfDay(referenceDate);
            yesterday.setDate(yesterday.getDate() - 1);
            return { start: yesterday, end: yesterday };
        }
        case "previous-week": {
            var currentWeekStart = getStartOfWeek(referenceDate);
            var previousWeekStart = new Date(currentWeekStart);
            previousWeekStart.setDate(previousWeekStart.getDate() - 7);
            var previousWeekEnd = new Date(previousWeekStart);
            previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);
            return { start: previousWeekStart, end: previousWeekEnd };
        }
        case "previous-month": {
            var previousMonthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
            var previousMonthStart = new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth(), 1);
            return { start: previousMonthStart, end: previousMonthEnd };
        }
        case "previous-quarter": {
            var currentQuarterIndex = Math.floor(referenceDate.getMonth() / 3);
            var previousQuarterIndex = (currentQuarterIndex + 3) % 4;
            var previousQuarterYear = currentQuarterIndex === 0 ? referenceDate.getFullYear() - 1 : referenceDate.getFullYear();
            return getQuarterBounds(previousQuarterYear, previousQuarterIndex);
        }
        case "previous-year":
            return { start: new Date(referenceDate.getFullYear() - 1, 0, 1), end: new Date(referenceDate.getFullYear() - 1, 11, 31) };
        case "custom":
            return { start: today, end: today };
        default:
            return { start: today, end: today };
    }
};
var SALES_BY_CUSTOMER_ROWS = [
    { name: "ss", invoiceCount: 2, sales: 44, salesWithTax: 44 },
];
var formatCurrency = function (value, currency) {
    if (currency === void 0) { currency = "SOS"; }
    return "".concat(currency).concat(value.toFixed(2));
};
var REPORTS_DRAWER_SECTIONS = [
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
function ReportsDrawer(_a) {
    var open = _a.open, currentCategoryId = _a.currentCategoryId, currentReportId = _a.currentReportId, triggerRef = _a.triggerRef, onClose = _a.onClose;
    var drawerRef = (0, react_1.useRef)(null);
    var _b = (0, react_1.useState)(""), search = _b[0], setSearch = _b[1];
    var _c = (0, react_1.useState)([currentCategoryId]), expandedSections = _c[0], setExpandedSections = _c[1];
    (0, react_1.useEffect)(function () {
        setExpandedSections(function (prev) { return (prev.includes(currentCategoryId) ? prev : [currentCategoryId]); });
    }, [currentCategoryId]);
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var handlePointerDown = function (event) {
            var _a, _b;
            var target = event.target;
            if (!((_a = drawerRef.current) === null || _a === void 0 ? void 0 : _a.contains(target)) && !((_b = triggerRef.current) === null || _b === void 0 ? void 0 : _b.contains(target))) {
                onClose();
            }
        };
        var handleKeyDown = function (event) {
            if (event.key === "Escape")
                onClose();
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return function () {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose, open, triggerRef]);
    var sections = (0, react_1.useMemo)(function () {
        var query = search.trim().toLowerCase();
        return REPORTS_DRAWER_SECTIONS.map(function (section) {
            var available = reportsCatalog_1.REPORTS_BY_CATEGORY[section.id] || [];
            var reports = section.reportIds
                .map(function (reportId) { return available.find(function (report) { return report.id === reportId; }); })
                .filter(Boolean);
            var filteredReports = query
                ? reports.filter(function (report) { return report.name.toLowerCase().includes(query) || section.label.toLowerCase().includes(query); })
                : reports;
            return __assign(__assign({}, section), { reports: filteredReports });
        }).filter(function (section) { return section.reports.length > 0; });
    }, [search]);
    if (!open)
        return null;
    var isSearching = search.trim().length > 0;
    return (<div ref={drawerRef} className="absolute left-0 top-0 z-30 h-full w-[260px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <div className="text-[18px] font-semibold text-[#0f172a]">Reports</div>
          <button type="button" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]" aria-label="Close reports drawer">
            <lucide_react_1.X size={16}/>
          </button>
        </div>

        <div className="border-b border-[#eef2f7] px-3 py-3">
          <div className="relative">
            <input value={search} onChange={function (event) { return setSearch(event.target.value); }} placeholder="Search reports" className="h-9 w-full rounded-lg border border-[#d8dfea] bg-white pl-3 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#7da0ff]"/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">All Reports</div>

          {sections.length > 0 ? (<div className="space-y-1">
              {sections.map(function (section) {
                var expanded = isSearching || expandedSections.includes(section.id);
                return (<div key={section.id}>
                    <button type="button" onClick={function () {
                        if (isSearching)
                            return;
                        setExpandedSections(function (prev) {
                            return prev.includes(section.id) ? prev.filter(function (id) { return id !== section.id; }) : __spreadArray(__spreadArray([], prev, true), [section.id], false);
                        });
                    }} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-[#111827] hover:bg-[#f8fafc]">
                      <span className="flex min-w-0 items-center gap-2">
                        <lucide_react_1.Folder size={14} className="text-[#9aa3b2]"/>
                        <span className="truncate">{section.label}</span>
                      </span>
                      {expanded ? (<lucide_react_1.ChevronDown size={12} className="text-[#9aa3b2]"/>) : (<lucide_react_1.ChevronRight size={12} className="text-[#9aa3b2]"/>)}
                    </button>

                    {expanded ? (<div className="ml-5 mt-1 space-y-0.5">
                        {section.reports.map(function (report) {
                            var isActive = report.id === currentReportId;
                            return (<react_router_dom_1.Link key={report.id} to={"/reports/".concat(report.categoryId, "/").concat(report.id)} onClick={onClose} className={"block rounded px-2 py-1.5 text-sm hover:bg-[#eef4ff] ".concat(isActive ? "bg-[#eef4ff] font-medium text-[#111827]" : "text-[#2563eb]")}>
                              {report.name}
                            </react_router_dom_1.Link>);
                        })}
                      </div>) : null}
                  </div>);
            })}
            </div>) : (<div className="px-2 py-4 text-sm text-[#64748b]">No reports found.</div>)}
        </div>
      </div>
    </div>);
}
function SalesByCustomerReportView(_a) {
    var _b, _c;
    var categoryName = _a.categoryName, reportName = _a.reportName, menuButtonRef = _a.menuButtonRef, onMenuClick = _a.onMenuClick, onRunReport = _a.onRunReport;
    var dateRangeRef = (0, react_1.useRef)(null);
    var entityRef = (0, react_1.useRef)(null);
    var moreFiltersRef = (0, react_1.useRef)(null);
    var _d = (0, react_1.useState)("this-week"), dateRangeKey = _d[0], setDateRangeKey = _d[1];
    var _e = (0, react_1.useState)(false), isDateRangeOpen = _e[0], setIsDateRangeOpen = _e[1];
    var _f = (0, react_1.useState)([]), entityKeys = _f[0], setEntityKeys = _f[1];
    var _g = (0, react_1.useState)(false), isEntityOpen = _g[0], setIsEntityOpen = _g[1];
    var _h = (0, react_1.useState)(""), entitySearch = _h[0], setEntitySearch = _h[1];
    var _j = (0, react_1.useState)(false), isMoreFiltersOpen = _j[0], setIsMoreFiltersOpen = _j[1];
    var _k = (0, react_1.useState)(null), moreFilterDropdown = _k[0], setMoreFilterDropdown = _k[1];
    var _l = (0, react_1.useState)([
        { id: "more-filter-1", field: "", comparator: "", value: "" },
    ]), moreFilterRows = _l[0], setMoreFilterRows = _l[1];
    var selectedDateRange = getDateRangeValue(dateRangeKey);
    var dateRangeLabel = (_c = (_b = DATE_RANGE_OPTIONS.find(function (option) { return option.key === dateRangeKey; })) === null || _b === void 0 ? void 0 : _b.label) !== null && _c !== void 0 ? _c : "Today";
    var selectedEntityLabels = ENTITY_OPTIONS.filter(function (option) { return entityKeys.includes(option.key); }).map(function (option) { return option.label; });
    var entityLabel = selectedEntityLabels.length > 0 ? selectedEntityLabels.join(", ") : "None";
    var totalInvoiceCount = SALES_BY_CUSTOMER_ROWS.reduce(function (sum, row) { return sum + row.invoiceCount; }, 0);
    var totalSales = SALES_BY_CUSTOMER_ROWS.reduce(function (sum, row) { return sum + row.sales; }, 0);
    var totalSalesWithTax = SALES_BY_CUSTOMER_ROWS.reduce(function (sum, row) { return sum + row.salesWithTax; }, 0);
    (0, react_1.useEffect)(function () {
        if (!isDateRangeOpen)
            return;
        var handlePointerDown = function (event) {
            var _a;
            var target = event.target;
            if (!((_a = dateRangeRef.current) === null || _a === void 0 ? void 0 : _a.contains(target))) {
                setIsDateRangeOpen(false);
            }
        };
        var handleKeyDown = function (event) {
            if (event.key === "Escape") {
                setIsDateRangeOpen(false);
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return function () {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isDateRangeOpen]);
    (0, react_1.useEffect)(function () {
        if (!isEntityOpen)
            return;
        var handlePointerDown = function (event) {
            var _a;
            var target = event.target;
            if (!((_a = entityRef.current) === null || _a === void 0 ? void 0 : _a.contains(target))) {
                setIsEntityOpen(false);
            }
        };
        var handleKeyDown = function (event) {
            if (event.key === "Escape") {
                setIsEntityOpen(false);
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return function () {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isEntityOpen]);
    (0, react_1.useEffect)(function () {
        if (!isMoreFiltersOpen)
            return;
        var handlePointerDown = function (event) {
            var _a;
            var target = event.target;
            if (!((_a = moreFiltersRef.current) === null || _a === void 0 ? void 0 : _a.contains(target))) {
                closeMoreFilterDropdown();
                setIsMoreFiltersOpen(false);
            }
        };
        var handleKeyDown = function (event) {
            if (event.key === "Escape") {
                closeMoreFilterDropdown();
                setIsMoreFiltersOpen(false);
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return function () {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isMoreFiltersOpen]);
    var filteredEntityOptions = (0, react_1.useMemo)(function () {
        var query = entitySearch.trim().toLowerCase();
        return ENTITY_OPTIONS.filter(function (option) { return option.label.toLowerCase().includes(query); });
    }, [entitySearch]);
    var hasMoreFilters = moreFilterRows.some(function (row) { return row.field || row.comparator || row.value.trim(); });
    var getFilteredFieldGroups = function (query) {
        var normalizedQuery = query.trim().toLowerCase();
        return MORE_FILTER_FIELD_GROUPS.map(function (group) {
            var options = group.options.filter(function (option) { return option.label.toLowerCase().includes(normalizedQuery); });
            return __assign(__assign({}, group), { options: options });
        }).filter(function (group) { return group.options.length > 0; });
    };
    var getFilteredComparatorOptions = function (query) {
        var normalizedQuery = query.trim().toLowerCase();
        return MORE_FILTER_COMPARATOR_OPTIONS.filter(function (option) { return option.label.toLowerCase().includes(normalizedQuery); });
    };
    var openMoreFilterDropdown = function (rowId, kind) {
        setMoreFilterDropdown({ rowId: rowId, kind: kind, search: "" });
    };
    var closeMoreFilterDropdown = function () { return setMoreFilterDropdown(null); };
    return (<div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e7eb] pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <button ref={menuButtonRef} type="button" onClick={onMenuClick} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]" aria-label="Toggle reports menu">
            <lucide_react_1.Menu size={15}/>
          </button>
          <div>
            <p className="text-sm font-medium text-[#2563eb]">{categoryName}</p>
            <h1 className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]">
              <span>{reportName}</span>
              <span className="text-sm font-normal text-[#475569]">
                - From {formatDate(selectedDateRange.start)} To {formatDate(selectedDateRange.end)}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <lucide_react_1.SlidersHorizontal size={15}/>
          </button>
          <button type="button" className="inline-flex h-9 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]">
            Export <lucide_react_1.ChevronDown size={14}/>
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <lucide_react_1.RefreshCw size={15}/>
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]">
            <lucide_react_1.X size={15}/>
          </button>
        </div>
      </div>

      <div ref={moreFiltersRef} className="relative flex flex-wrap items-center gap-2 border-b border-[#e6e9f0] pb-3 text-sm">
        <span className="text-[#334155]">Filters :</span>
        <div ref={dateRangeRef} className="relative">
          <button type="button" onClick={function () { return setIsDateRangeOpen(function (prev) { return !prev; }); }} className={"inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ".concat(isDateRangeOpen ? "border-[#7aa7ff] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]")} aria-haspopup="menu" aria-expanded={isDateRangeOpen}>
            <lucide_react_1.CalendarDays size={14} className="text-[#64748b]"/>
            Date Range : <span className="font-medium">{dateRangeLabel}</span> <lucide_react_1.ChevronDown size={14}/>
          </button>

          {isDateRangeOpen ? (<div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[165px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              <div className="max-h-[280px] overflow-y-auto py-1">
                {DATE_RANGE_OPTIONS.map(function (option) {
                var isSelected = option.key === dateRangeKey;
                return (<button key={option.key} type="button" onClick={function () {
                        setDateRangeKey(option.key);
                        setIsDateRangeOpen(false);
                    }} className={"flex w-full items-center justify-between px-4 py-2 text-left text-sm ".concat(isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]")}>
                      <span>{option.label}</span>
                      {isSelected ? <lucide_react_1.Check size={14} className="text-[#0f172a]"/> : null}
                    </button>);
            })}
              </div>
            </div>) : null}
        </div>
        <div ref={entityRef} className="relative inline-flex">
          <button type="button" onClick={function () { return setIsEntityOpen(function (prev) { return !prev; }); }} className={"relative inline-flex h-8 w-[184px] items-center overflow-hidden rounded border px-3 pr-12 text-sm text-[#334155] hover:bg-white ".concat(isEntityOpen ? "border-[#7aa7ff] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]")} aria-haspopup="menu" aria-expanded={isEntityOpen}>
            <span className="shrink-0 whitespace-nowrap">Entities :</span>
            <span className="min-w-0 flex-1 truncate text-left font-medium whitespace-nowrap">{entityLabel}</span>
            <lucide_react_1.ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#334155]"/>
          </button>

          {entityKeys.length > 0 ? (<button type="button" onClick={function (event) {
                event.stopPropagation();
                setEntityKeys([]);
            }} className="absolute right-6 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]" aria-label="Clear selected entities">
              <lucide_react_1.X size={12}/>
            </button>) : null}

          {isEntityOpen ? (<div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              <div className="border-b border-[#eef2f7] p-2">
                <div className="relative">
                  <input value={entitySearch} onChange={function (event) { return setEntitySearch(event.target.value); }} placeholder="Search" className="h-9 w-full rounded-md border border-[#7aa7ff] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"/>
                  <lucide_react_1.Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"/>
                </div>
              </div>

              <div className="max-h-[220px] overflow-y-auto py-1">
                {filteredEntityOptions.length > 0 ? (filteredEntityOptions.map(function (option) {
                var isSelected = entityKeys.includes(option.key);
                return (<button key={option.key} type="button" onClick={function () {
                        setEntityKeys(function (prev) {
                            return prev.includes(option.key) ? prev.filter(function (key) { return key !== option.key; }) : __spreadArray(__spreadArray([], prev, true), [option.key], false);
                        });
                    }} className={"flex w-full items-center gap-2 px-4 py-2 text-left text-sm ".concat(isSelected ? "bg-[#f1f5f9] font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]")}>
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#c7d0de] bg-white">
                          {isSelected ? <lucide_react_1.Check size={12} className="text-[#0f172a]"/> : null}
                        </span>
                        <span>{option.label}</span>
                      </button>);
            })) : (<div className="px-4 py-3 text-sm text-[#64748b]">No results.</div>)}
              </div>
            </div>) : null}
        </div>
        <button type="button" onClick={function () {
            setIsMoreFiltersOpen(function (prev) { return !prev; });
            closeMoreFilterDropdown();
        }} className={"inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-[#f8fafc] ".concat(isMoreFiltersOpen || hasMoreFilters ? "border-[#7aa7ff] bg-white" : "border-[#cfd6e4] bg-white")}>
          <lucide_react_1.Plus size={14} className="text-[#2563eb]"/> More Filters
        </button>

        {isMoreFiltersOpen ? (<div className="absolute left-0 top-[calc(100%+10px)] z-40 w-[720px] rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
            <div className="px-4 py-4">
              <div className="space-y-3">
                {moreFilterRows.map(function (row, index) {
                var activeDropdown = (moreFilterDropdown === null || moreFilterDropdown === void 0 ? void 0 : moreFilterDropdown.rowId) === row.id ? moreFilterDropdown : null;
                var fieldMenuOpen = (activeDropdown === null || activeDropdown === void 0 ? void 0 : activeDropdown.kind) === "field";
                var comparatorMenuOpen = (activeDropdown === null || activeDropdown === void 0 ? void 0 : activeDropdown.kind) === "comparator";
                var valueMenuOpen = (activeDropdown === null || activeDropdown === void 0 ? void 0 : activeDropdown.kind) === "value";
                var fieldMenuSearch = fieldMenuOpen ? activeDropdown.search : "";
                var comparatorMenuSearch = comparatorMenuOpen ? activeDropdown.search : "";
                var filteredFieldGroups = getFilteredFieldGroups(fieldMenuSearch);
                var filteredComparatorOptions = getFilteredComparatorOptions(comparatorMenuSearch);
                var valueOptions = row.field ? MORE_FILTER_VALUE_OPTIONS[row.field] : [];
                var fieldLabel = getMoreFilterFieldLabel(row.field);
                var comparatorLabel = getMoreFilterComparatorLabel(row.comparator);
                var valueLabel = row.value ? getMoreFilterValueLabel(row.field, row.value) : getMoreFilterValuePlaceholder(row.field);
                return (<div key={row.id} className="grid grid-cols-[42px_1fr_1fr_1.4fr_auto_auto] items-start gap-3">
                      <div className="flex h-10 items-center justify-center rounded border border-[#d7dce7] bg-[#f8fafc] text-sm text-[#475569]">
                        {index + 1}
                      </div>

                      <div className="relative">
                        <button type="button" onClick={function () { return openMoreFilterDropdown(row.id, "field"); }} className={"relative flex h-10 w-full items-center overflow-hidden rounded border px-3 pr-10 text-sm text-[#334155] outline-none ".concat(fieldMenuOpen ? "border-[#7aa7ff] bg-white" : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]")} aria-haspopup="menu" aria-expanded={fieldMenuOpen}>
                          <span className={"min-w-0 flex-1 truncate text-left ".concat(row.field ? "font-medium" : "text-[#94a3b8]")}>
                            {fieldLabel}
                          </span>
                          <lucide_react_1.ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]"/>
                        </button>

                        {row.field ? (<button type="button" onClick={function (event) {
                            event.stopPropagation();
                            setMoreFilterRows(function (prev) {
                                return prev.map(function (item) { return (item.id === row.id ? __assign(__assign({}, item), { field: "", comparator: "", value: "" }) : item); });
                            });
                            closeMoreFilterDropdown();
                        }} className="absolute right-7 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]" aria-label="Clear field">
                            <lucide_react_1.X size={12}/>
                          </button>) : null}

                        {fieldMenuOpen ? (<div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[240px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                            <div className="border-b border-[#eef2f7] p-2">
                              <div className="relative">
                                <input value={fieldMenuSearch} onChange={function (event) {
                            return setMoreFilterDropdown(function (prev) { return (prev ? __assign(__assign({}, prev), { search: event.target.value }) : prev); });
                        }} placeholder="Search" className="h-9 w-full rounded-md border border-[#7aa7ff] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"/>
                                <lucide_react_1.Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"/>
                              </div>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredFieldGroups.length > 0 ? (filteredFieldGroups.map(function (group) { return (<div key={group.label}>
                                    <div className="px-3 py-2 text-sm font-semibold text-[#475569]">
                                      {group.label}
                                    </div>
                                    <div className="pb-1">
                                      {group.options.map(function (option) {
                                var isSelected = row.field === option.key;
                                return (<button key={option.key} type="button" onClick={function () {
                                        setMoreFilterRows(function (prev) {
                                            return prev.map(function (item) {
                                                return item.id === row.id
                                                    ? __assign(__assign({}, item), { field: option.key, comparator: "", value: "" }) : item;
                                            });
                                        });
                                        closeMoreFilterDropdown();
                                    }} className={"flex w-full items-center justify-between px-3 py-2 text-left text-sm ".concat(isSelected ? "bg-[#2f80ed] font-medium text-white" : "text-[#334155] hover:bg-[#f8fafc]")}>
                                            <span>{option.label}</span>
                                            {isSelected ? <lucide_react_1.Check size={14} className="text-white"/> : null}
                                          </button>);
                            })}
                                    </div>
                                  </div>); })) : (<div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">No results found</div>)}
                            </div>
                          </div>) : null}
                      </div>

                      <div className="relative">
                        <button type="button" onClick={function () {
                        if (!row.field)
                            return;
                        openMoreFilterDropdown(row.id, "comparator");
                    }} disabled={!row.field} className={"relative flex h-10 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm text-[#334155] outline-none ".concat(row.field
                        ? comparatorMenuOpen
                            ? "border-[#7aa7ff] bg-white"
                            : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]"
                        : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]")} aria-haspopup="menu" aria-expanded={comparatorMenuOpen}>
                          <span className={"min-w-0 flex-1 truncate text-left ".concat(row.field && row.comparator ? "font-medium" : "text-[#94a3b8]")}>
                            {comparatorLabel}
                          </span>
                          <lucide_react_1.ChevronDown size={14} className={"pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ".concat(row.field ? "text-[#64748b]" : "text-[#cbd5e1]")}/>
                        </button>

                        {comparatorMenuOpen ? (<div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                            <div className="border-b border-[#eef2f7] p-2">
                              <div className="relative">
                                <input value={comparatorMenuSearch} onChange={function (event) {
                            return setMoreFilterDropdown(function (prev) { return (prev ? __assign(__assign({}, prev), { search: event.target.value }) : prev); });
                        }} placeholder="Search" className="h-9 w-full rounded-md border border-[#7aa7ff] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"/>
                                <lucide_react_1.Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"/>
                              </div>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredComparatorOptions.length > 0 ? (filteredComparatorOptions.map(function (option) {
                            var isSelected = row.comparator === option.key;
                            return (<button key={option.key} type="button" onClick={function () {
                                    setMoreFilterRows(function (prev) {
                                        return prev.map(function (item) { return (item.id === row.id ? __assign(__assign({}, item), { comparator: option.key }) : item); });
                                    });
                                    closeMoreFilterDropdown();
                                }} className={"flex w-full items-center justify-between px-3 py-2 text-left text-sm ".concat(isSelected ? "bg-[#2f80ed] font-medium text-white" : "text-[#334155] hover:bg-[#f8fafc]")}>
                                      <span>{option.label}</span>
                                      {isSelected ? <lucide_react_1.Check size={14} className="text-white"/> : null}
                                    </button>);
                        })) : (<div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">No results found</div>)}
                            </div>
                          </div>) : null}
                      </div>

                      <div className="relative">
                        <button type="button" onClick={function () {
                        if (!row.field)
                            return;
                        openMoreFilterDropdown(row.id, "value");
                    }} disabled={!row.field} className={"relative flex h-10 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm outline-none ".concat(row.field
                        ? valueMenuOpen
                            ? "border-[#7aa7ff] bg-white text-[#334155]"
                            : "border-[#cfd6e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                        : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]")} aria-haspopup="menu" aria-expanded={valueMenuOpen}>
                          <span className={"min-w-0 flex-1 truncate text-left ".concat(row.value ? "font-medium" : "text-[#94a3b8]")}>
                            {valueLabel}
                          </span>
                          <lucide_react_1.ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]"/>
                        </button>

                        {valueMenuOpen && row.field ? (<div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {valueOptions.length > 0 ? (valueOptions.map(function (option) {
                            var isSelected = row.value === option.key;
                            return (<button key={option.key} type="button" onClick={function () {
                                    setMoreFilterRows(function (prev) {
                                        return prev.map(function (item) {
                                            return item.id === row.id
                                                ? __assign(__assign({}, item), { value: option.key.startsWith("select-") ? "" : option.key }) : item;
                                        });
                                    });
                                    closeMoreFilterDropdown();
                                }} className={"flex w-full items-center justify-between px-3 py-2 text-left text-sm ".concat(isSelected ? "bg-[#2f80ed] font-medium text-white" : "text-[#334155] hover:bg-[#f8fafc]")}>
                                      <span>{option.label}</span>
                                      {isSelected ? <lucide_react_1.Check size={14} className="text-white"/> : null}
                                    </button>);
                        })) : (<div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">No results found</div>)}
                            </div>
                          </div>) : null}
                      </div>

                      <button type="button" onClick={function () {
                        var newRowId = "more-filter-".concat(Date.now(), "-").concat(Math.random().toString(16).slice(2));
                        setMoreFilterRows(function (prev) { return __spreadArray(__spreadArray([], prev, true), [
                            { id: newRowId, field: "", comparator: "", value: "" },
                        ], false); });
                        openMoreFilterDropdown(newRowId, "field");
                    }} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#cfd6e4] text-[#334155] hover:bg-[#f8fafc]" aria-label="Add filter row">
                        <lucide_react_1.Plus size={14}/>
                      </button>

                      <button type="button" onClick={function () {
                        setMoreFilterRows(function (prev) { return (prev.length > 1 ? prev.filter(function (item) { return item.id !== row.id; }) : prev); });
                        if ((moreFilterDropdown === null || moreFilterDropdown === void 0 ? void 0 : moreFilterDropdown.rowId) === row.id) {
                            closeMoreFilterDropdown();
                        }
                    }} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#cfd6e4] text-[#334155] hover:bg-[#fef2f2]" aria-label="Remove filter row">
                        <lucide_react_1.X size={14} className="text-[#ef4444]"/>
                      </button>
                    </div>);
            })}
              </div>

              <div className="mt-3">
                <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-[#2563eb] hover:underline">
                  <lucide_react_1.Plus size={14}/> Add More
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[#eef2f7] px-4 py-3">
              <button type="button" onClick={function () {
                closeMoreFilterDropdown();
                setIsMoreFiltersOpen(false);
                onRunReport();
            }} className="inline-flex h-9 items-center rounded bg-[#7aa7ff] px-4 text-sm font-semibold text-white hover:bg-[#6498ff]">
                Run Report
              </button>
              <button type="button" onClick={function () {
                setMoreFilterRows([{ id: "more-filter-1", field: "", comparator: "", value: "" }]);
                closeMoreFilterDropdown();
                setIsMoreFiltersOpen(false);
            }} className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155] hover:bg-[#f8fafc]">
                Cancel
              </button>
            </div>
          </div>) : null}
        <button type="button" onClick={onRunReport} className="inline-flex h-8 items-center gap-1 rounded bg-[#7aa7ff] px-4 text-sm font-semibold text-white hover:bg-[#6498ff]">
          <lucide_react_1.CalendarDays size={14}/> Run Report
        </button>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white">
        <div className="flex flex-wrap items-center justify-end gap-4 border-b border-[#eef2f7] px-4 py-3 text-sm text-[#475569]">
          <button type="button" className="inline-flex items-center gap-1 hover:text-[#0f172a]">
            Compare With : <span className="font-semibold text-[#0f172a]">None</span> <lucide_react_1.ChevronDown size={14}/>
          </button>
          <button type="button" className="inline-flex items-center gap-1 hover:text-[#0f172a]">
            <lucide_react_1.Columns3 size={14}/>
            Customize Report Columns
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dbeafe] px-1 text-[11px] font-semibold text-[#2563eb]">
              4
            </span>
          </button>
        </div>

        <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
          <h2 className="mt-2 text-[22px] font-semibold text-[#111827]">{reportName}</h2>
          <p className="mt-1 text-sm text-[#475569]">
            From {formatDate(selectedDateRange.start)} To {formatDate(selectedDateRange.end)}
          </p>
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
              {SALES_BY_CUSTOMER_ROWS.map(function (row) { return (<tr key={row.name} className="border-b border-[#eef2f7]">
                  <td className="px-4 py-3 text-sm font-medium text-[#2563eb]">{row.name}</td>
                  <td className="px-4 py-3 text-center text-sm text-[#2563eb]">{row.invoiceCount}</td>
                  <td className="px-4 py-3 text-center text-sm text-[#2563eb]">{formatCurrency(row.sales)}</td>
                  <td className="px-4 py-3 text-center text-sm text-[#2563eb]">{formatCurrency(row.salesWithTax)}</td>
                </tr>); })}
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
    </div>);
}
function ReportDetailPage() {
    var _a, _b, _c;
    var _d = (0, react_router_dom_1.useParams)(), categoryId = _d.categoryId, reportId = _d.reportId;
    var category = (0, reportsCatalog_1.getCategoryById)(categoryId || "");
    var report = (0, reportsCatalog_1.getReportById)(categoryId || "", reportId || "");
    var _e = (0, react_1.useState)(false), isReportsDrawerOpen = _e[0], setIsReportsDrawerOpen = _e[1];
    var reportsMenuButtonRef = (0, react_1.useRef)(null);
    var dateLabel = (0, react_1.useMemo)(function () {
        var now = new Date();
        var from = new Date(now.getFullYear(), now.getMonth(), 1);
        var to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return "From ".concat(formatDate(from), " To ").concat(formatDate(to));
    }, []);
    var _f = (0, react_1.useState)(function () {
        if (!(report === null || report === void 0 ? void 0 : report.calculator))
            return {};
        return report.calculator.fields.reduce(function (acc, field) {
            acc[field.key] = field.defaultValue;
            return acc;
        }, {});
    }), calculatorInputs = _f[0], setCalculatorInputs = _f[1];
    if (!categoryId || !reportId || !category || !report) {
        return <react_router_dom_1.Navigate to="/reports" replace/>;
    }
    var calculatorResult = report.calculator ? report.calculator.calculate(calculatorInputs) : null;
    var calculatorPrecision = (_b = (_a = report.calculator) === null || _a === void 0 ? void 0 : _a.precision) !== null && _b !== void 0 ? _b : 2;
    if (report.id === "sales-by-customer") {
        return (<div className="relative min-h-[calc(100vh-64px)] pt-3">
        <ReportsDrawer open={isReportsDrawerOpen} currentCategoryId={category.id} currentReportId={report.id} triggerRef={reportsMenuButtonRef} onClose={function () { return setIsReportsDrawerOpen(false); }}/>
        <div className={"pr-3 transition-[padding-left] duration-200 ".concat(isReportsDrawerOpen ? "lg:pl-[260px]" : "")}>
          <SalesByCustomerReportView categoryName={category.name} reportName={report.name} menuButtonRef={reportsMenuButtonRef} onMenuClick={function () { return setIsReportsDrawerOpen(function (prev) { return !prev; }); }} onRunReport={function () { return react_toastify_1.toast.success("Report refreshed: ".concat(report.name)); }}/>
        </div>
      </div>);
    }
    return (<div className="space-y-4">
      <ReportDetailHeader_1.default categoryName={category.name} reportName={report.name} dateLabel={dateLabel} onRunReport={function () { return react_toastify_1.toast.success("Report refreshed: ".concat(report.name)); }}/>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-[#d7dce7] bg-white p-4 xl:col-span-2">
          <h2 className="text-base font-semibold text-[#0f172a]">Report Overview</h2>
          <p className="mt-2 text-sm text-[#475569]">{report.summary}</p>

          <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">How It Helps</h3>
          <p className="mt-1 text-sm text-[#475569]">{report.howItHelps}</p>

          {report.formula ? (<>
              <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">Logic / Formula</h3>
              <p className="mt-1 rounded border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#1e293b]">{report.formula}</p>
            </>) : null}

          {((_c = report.logicNotes) === null || _c === void 0 ? void 0 : _c.length) ? (<>
              <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">Logic Notes</h3>
              <ul className="mt-1 space-y-1 text-sm text-[#475569]">
                {report.logicNotes.map(function (note) { return (<li key={note}>- {note}</li>); })}
              </ul>
            </>) : null}
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

      {report.calculator ? (<section className="rounded-lg border border-[#d7dce7] bg-white p-4">
          <h2 className="text-base font-semibold text-[#0f172a]">Logic Check</h2>
          <p className="mt-1 text-sm text-[#64748b]">Use this calculator to validate the reporting formula with your own values.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {report.calculator.fields.map(function (field) {
                var _a;
                return (<label key={field.key} className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#64748b]">{field.label}</span>
                <input type="number" value={(_a = calculatorInputs[field.key]) !== null && _a !== void 0 ? _a : 0} onChange={function (event) {
                        var value = Number(event.target.value);
                        setCalculatorInputs(function (prev) {
                            var _a;
                            return (__assign(__assign({}, prev), (_a = {}, _a[field.key] = Number.isFinite(value) ? value : 0, _a)));
                        });
                    }} className="h-9 w-full rounded border border-[#cfd6e4] px-3 text-sm text-[#0f172a] outline-none focus:border-[#2563eb]"/>
              </label>);
            })}
          </div>
          <div className="mt-4 rounded border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#1d4ed8]">{report.calculator.resultLabel}</p>
            <p className="text-2xl font-semibold text-[#1e40af]">{(calculatorResult || 0).toFixed(calculatorPrecision)}</p>
            {report.calculator.helpText ? <p className="mt-1 text-xs text-[#1e3a8a]">{report.calculator.helpText}</p> : null}
          </div>
        </section>) : null}

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
              {reportsCatalog_1.REPORT_FUNCTION_LABELS.map(function (item) {
            var supported = Boolean(report.functionSupport[item.key]);
            return (<tr key={item.key} className="border-b border-[#eef2f7]">
                    <td className="px-3 py-2 text-sm text-[#334155]">{item.label}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className={supported ? "rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]" : "rounded bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#475569]"}>
                        {supported ? "Supported" : "Not Supported"}
                      </span>
                    </td>
                  </tr>);
        })}
            </tbody>
          </table>
        </div>
      </section>
    </div>);
}
