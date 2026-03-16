import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Columns3,
  Download,
  FileDown,
  FileText,
  GripVertical,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { deleteInvoice, getInvoicesPaginated, Invoice } from "../salesModel";
import { useOrganizationBranding } from "../../../hooks/useOrganizationBranding";

type RetainerRow = {
  id: string;
  location: string;
  invoiceNumber: string;
  reference: string;
  customerName: string;
  date: string;
  issuedDate: string;
  status: string;
  drawStatus: string;
  projectEstimate: string;
  project: string;
  quote: string;
  wsq: string;
  isEmailed: boolean;
  amount: number;
  balance: number;
  createdAtTs: number;
  statusKey: string;
  drawStatusKey: string;
  sourceInvoice: Invoice;
};

type SortOption = { key: string; label: string };
type RetainerColumnKey =
  | "date"
  | "location"
  | "retainer"
  | "reference"
  | "customer"
  | "status"
  | "drawStatus"
  | "amount"
  | "balance"
  | "issuedDate"
  | "projectEstimate"
  | "project"
  | "quote"
  | "wsq";
type RetainerColumnConfig = {
  key: RetainerColumnKey;
  label: string;
  defaultSelected: boolean;
};

const FAVORITE_VIEWS_STORAGE_KEY = "taban_retainer_favorite_views_v1";
const RETAINER_COLUMNS_STORAGE_KEY = "taban_retainer_columns_v1";
const RETAINER_SELECTED_VIEW_STORAGE_KEY = "taban_retainer_selected_view_v1";
const RETAINER_SORT_STORAGE_KEY = "taban_retainer_sort_v1";
const VIEW_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "partially_drawn", label: "Partially Drawn" },
  { key: "drawn", label: "Drawn" },
  { key: "void", label: "Void" },
  { key: "customer_viewed", label: "Customer Viewed" },
  { key: "payment_initiated", label: "Payment Initiated" },
  { key: "partially_paid", label: "Partially Paid" },
  { key: "awaiting_payment", label: "Awaiting Payment" },
  { key: "ready_to_draw", label: "Ready To Draw" },
];

const STATUS_ALIAS: Record<string, string[]> = {
  all: [],
  draft: ["draft"],
  pending_approval: ["pending_approval", "pending approval"],
  approved: ["approved"],
  sent: ["sent"],
  paid: ["paid"],
  partially_drawn: ["partially_drawn", "partially drawn"],
  drawn: ["drawn"],
  void: ["void"],
  customer_viewed: ["customer_viewed", "customer viewed"],
  payment_initiated: ["payment_initiated", "payment initiated"],
  partially_paid: ["partially_paid", "partially paid"],
  awaiting_payment: ["awaiting_payment", "awaiting payment", "unpaid"],
  ready_to_draw: ["ready_to_draw", "ready to draw"],
};

const SORT_OPTIONS: SortOption[] = [
  { key: "created_desc", label: "Created Time (Newest)" },
  { key: "created_asc", label: "Created Time (Oldest)" },
  { key: "retainer_asc", label: "Retainer # (A-Z)" },
  { key: "retainer_desc", label: "Retainer # (Z-A)" },
  { key: "customer_asc", label: "Customer Name (A-Z)" },
  { key: "customer_desc", label: "Customer Name (Z-A)" },
  { key: "amount_desc", label: "Amount (High-Low)" },
  { key: "amount_asc", label: "Amount (Low-High)" },
  { key: "balance_desc", label: "Balance (High-Low)" },
  { key: "balance_asc", label: "Balance (Low-High)" },
];

const DEFAULT_COLUMN_WIDTHS = {
  select: 68,
  date: 140,
  location: 150,
  retainer: 190,
  reference: 140,
  customer: 220,
  status: 130,
  drawStatus: 190,
  amount: 140,
  balance: 140,
  issuedDate: 140,
  projectEstimate: 150,
  project: 150,
  quote: 120,
  wsq: 120,
};

const RETAINER_COLUMNS: RetainerColumnConfig[] = [
  { key: "date", label: "Date", defaultSelected: true },
  { key: "location", label: "Location", defaultSelected: true },
  { key: "retainer", label: "Retainer Invoice Number", defaultSelected: true },
  { key: "reference", label: "Reference#", defaultSelected: true },
  { key: "customer", label: "Customer Name", defaultSelected: true },
  { key: "status", label: "Status", defaultSelected: true },
  { key: "drawStatus", label: "Retainer Draw Status", defaultSelected: true },
  { key: "amount", label: "Total", defaultSelected: true },
  { key: "balance", label: "Balance", defaultSelected: true },
  { key: "issuedDate", label: "Issued Date", defaultSelected: true },
  { key: "projectEstimate", label: "Project/Estimate", defaultSelected: false },
  { key: "project", label: "Project", defaultSelected: false },
  { key: "quote", label: "Quote", defaultSelected: false },
  { key: "wsq", label: "wsq", defaultSelected: false },
];

const TABLE_COLUMNS: RetainerColumnKey[] = [
  "date",
  "location",
  "retainer",
  "reference",
  "customer",
  "status",
  "drawStatus",
  "amount",
  "balance",
  "issuedDate",
  "projectEstimate",
  "project",
  "quote",
  "wsq",
];

const mapInvoiceToRetainer = (invoice: Invoice): RetainerRow => {
  const normalizeKey = (value: any) =>
    String(value || "")
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .trim();

  const formatDate = (value: any) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = parsed.toLocaleString(undefined, { month: "short" });
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const created = invoice.invoiceDate || invoice.date || invoice.createdAt || "";
  const parsed = created ? new Date(created) : null;
  const formattedDate = formatDate(created);
  const issuedDate = formatDate(
    (invoice as any).issuedDate || (invoice as any).issueDate || invoice.invoiceDate || invoice.date || invoice.createdAt
  );

  const amount = Number(invoice.total || invoice.amount || 0) || 0;
  const amountPaid = Number((invoice as any).amountPaid ?? (invoice as any).paidAmount ?? 0) || 0;
  const rawBalance = Number(invoice.balance ?? invoice.balanceDue);
  const balance = Number.isFinite(rawBalance) ? rawBalance : Math.max(0, amount - amountPaid);
  const rawStatus = normalizeKey(invoice.status || "draft");
  const rawDrawStatus = normalizeKey((invoice as any).retainerDrawStatus || (invoice as any).drawStatus || "");
  const effectiveStatus = (() => {
    if (rawStatus === "void") return "void";
    if (["pending_approval", "approved", "drawn", "partially_drawn"].includes(rawStatus)) return rawStatus;
    if (amountPaid > 0 && balance <= 0) return "paid";
    if (amountPaid > 0 && balance > 0) return "partially_paid";
    if (rawStatus === "sent") return "sent";
    return "draft";
  })();
  const effectiveDrawStatus = (() => {
    if (rawDrawStatus) return rawDrawStatus;
    if (effectiveStatus === "paid") return "ready_to_draw";
    if (effectiveStatus === "partially_paid") return "awaiting_payment";
    return "awaiting_payment";
  })();
  const comments = Array.isArray((invoice as any).comments) ? (invoice as any).comments : [];
  const hasEmailedComment = comments.some((comment: any) =>
    String(comment?.text || "")
      .toLowerCase()
      .includes("emailed to")
  );
  const isEmailed = Boolean(
    (invoice as any).emailSent ||
    (invoice as any).emailSentAt ||
    (invoice as any).lastEmailSentAt ||
    (invoice as any).emailedAt ||
    hasEmailedComment
  );
  const balanceCandidate =
    invoice.balance !== undefined
      ? Number(invoice.balance)
      : invoice.balanceDue !== undefined
        ? Number(invoice.balanceDue)
        : amount;

  return {
    id: String(invoice.id || invoice._id || `ret-${Date.now()}`),
    location: String((invoice as any).location || (invoice as any).selectedLocation || "Head Office"),
    invoiceNumber: String(invoice.invoiceNumber || "-"),
    reference: String((invoice as any).reference || (invoice as any).orderNumber || "-"),
    customerName: invoice.customerName || "Unknown Customer",
    date: formattedDate,
    issuedDate,
    status: effectiveStatus,
    drawStatus: effectiveDrawStatus.replace(/_/g, " ").toUpperCase(),
    projectEstimate: String((invoice as any).projectEstimate || (invoice as any).estimate || "-"),
    project: String((invoice as any).projectName || (invoice as any).project || "-"),
    quote: String((invoice as any).quoteNumber || (invoice as any).quote || "-"),
    wsq: String((invoice as any).wsq || (invoice as any).reportingTagWsq || "-"),
    isEmailed,
    amount,
    balance: Number.isFinite(balanceCandidate) ? balanceCandidate : balance,
    createdAtTs: parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0,
    statusKey: effectiveStatus,
    drawStatusKey: effectiveDrawStatus,
    sourceInvoice: invoice,
  };
};

const TableRowSkeleton = () => (
  <>
    {[...Array(7)].map((_, i) => (
      <tr key={i} className="animate-pulse border-b border-gray-50">
        <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-40 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-100 rounded ml-auto" /></td>
        <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-100 rounded ml-auto" /></td>
        <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3 w-12"><div className="h-4 w-4 bg-gray-100 rounded mx-auto" /></td>
      </tr>
    ))}
  </>
);

export default function RetainerInvoice() {
  const navigate = useNavigate();
  const { accentColor } = useOrganizationBranding();

  const [rows, setRows] = useState<RetainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState(() => localStorage.getItem(RETAINER_SELECTED_VIEW_STORAGE_KEY) || "all");
  const [viewSearchTerm, setViewSearchTerm] = useState("");
  const [favoriteViews, setFavoriteViews] = useState<Set<string>>(new Set());
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);
  const [activeSortKey, setActiveSortKey] = useState(() => localStorage.getItem(RETAINER_SORT_STORAGE_KEY) || "created_desc");
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [resizingColumn, setResizingColumn] = useState<RetainerColumnKey | null>(null);
  const [columnToolsOpen, setColumnToolsOpen] = useState(false);
  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);
  const [columnSearchTerm, setColumnSearchTerm] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<Set<RetainerColumnKey>>(
    new Set(RETAINER_COLUMNS.filter((column) => column.defaultSelected).map((column) => column.key))
  );
  const [draftSelectedColumns, setDraftSelectedColumns] = useState<Set<RetainerColumnKey>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const columnToolsRef = useRef<HTMLTableCellElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const loadRetainers = async () => {
    setLoading(true);
    try {
      const response = await getInvoicesPaginated({ limit: 1000, sort: "createdAt", order: "desc" });
      const invoices: Invoice[] = Array.isArray(response?.data) ? response.data : [];
      const mapped = invoices
        .filter((invoice) => String(invoice.invoiceNumber || "").toUpperCase().startsWith("RET-"))
        .map(mapInvoiceToRetainer);
      setRows(mapped);
    } catch (error) {
      console.error("Failed to load retainer invoices:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRetainers();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RETAINER_COLUMNS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const allowedKeys = new Set(RETAINER_COLUMNS.map((column) => column.key));
      const next = parsed
        .map((value) => String(value) as RetainerColumnKey)
        .filter((value) => allowedKeys.has(value));
      if (next.length > 0) {
        setSelectedColumns(new Set(next));
      }
    } catch (error) {
      console.error("Failed to load selected retainer columns:", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(RETAINER_COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(selectedColumns)));
  }, [selectedColumns]);

  useEffect(() => {
    localStorage.setItem(RETAINER_SELECTED_VIEW_STORAGE_KEY, selectedView);
  }, [selectedView]);

  useEffect(() => {
    localStorage.setItem(RETAINER_SORT_STORAGE_KEY, activeSortKey);
  }, [activeSortKey]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITE_VIEWS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setFavoriteViews(new Set(parsed.map((v) => String(v))));
      }
    } catch (error) {
      console.error("Failed to load retainer favorite views:", error);
    }
  }, []);

  const toggleFavoriteView = (viewKey: string) => {
    setFavoriteViews((prev) => {
      const next = new Set(prev);
      if (next.has(viewKey)) next.delete(viewKey);
      else next.add(viewKey);
      localStorage.setItem(FAVORITE_VIEWS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setViewDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
        setSortSubMenuOpen(false);
        setExportSubMenuOpen(false);
      }
      if (columnToolsRef.current && !columnToolsRef.current.contains(event.target as Node)) {
        setColumnToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredRows = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().split("-").join("_").trim();
    const filtered = rows.filter((row) => {
      const status = normalize(row.statusKey || row.status).split(" ").join("_");
      const drawStatus = normalize(row.drawStatusKey || row.drawStatus).split(" ").join("_");
      const aliases = (STATUS_ALIAS[selectedView] || []).map((s) => normalize(s).split(" ").join("_"));
      const viewMatch = selectedView === "all" ? true : aliases.includes(status) || aliases.includes(drawStatus);
      return viewMatch;
    });

    const sorted = [...filtered];
    switch (activeSortKey) {
      case "created_asc":
        sorted.sort((a, b) => a.createdAtTs - b.createdAtTs);
        break;
      case "retainer_asc":
        sorted.sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
        break;
      case "retainer_desc":
        sorted.sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
        break;
      case "customer_asc":
        sorted.sort((a, b) => a.customerName.localeCompare(b.customerName));
        break;
      case "customer_desc":
        sorted.sort((a, b) => b.customerName.localeCompare(a.customerName));
        break;
      case "amount_asc":
        sorted.sort((a, b) => a.amount - b.amount);
        break;
      case "amount_desc":
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case "balance_asc":
        sorted.sort((a, b) => a.balance - b.balance);
        break;
      case "balance_desc":
        sorted.sort((a, b) => b.balance - a.balance);
        break;
      case "created_desc":
      default:
        sorted.sort((a, b) => b.createdAtTs - a.createdAtTs);
        break;
    }
    return sorted;
  }, [rows, selectedView, activeSortKey]);

  const hasRows = filteredRows.length > 0;
  const clipTextClass = "truncate whitespace-nowrap";
  const visibleTableColumns = TABLE_COLUMNS.filter((columnKey) => selectedColumns.has(columnKey));
  const visibleTableColumnSet = new Set<RetainerColumnKey>(visibleTableColumns);
  const filteredCustomizeColumns = RETAINER_COLUMNS.filter((column) =>
    column.label.toLowerCase().includes(columnSearchTerm.toLowerCase())
  );
  const selectedColumnCount = draftSelectedColumns.size;
  const visibleRowIdSet = useMemo(() => new Set(filteredRows.map((row) => row.id)), [filteredRows]);
  const selectedVisibleRowCount = useMemo(
    () => Array.from(selectedRowIds).filter((rowId) => visibleRowIdSet.has(rowId)).length,
    [selectedRowIds, visibleRowIdSet]
  );
  const allVisibleSelected = hasRows && selectedVisibleRowCount === filteredRows.length;
  const hasVisibleSelection = selectedVisibleRowCount > 0;
  const selectedViewLabel =
    selectedView === "all"
      ? "All Retainer Invoices"
      : VIEW_OPTIONS.find((option) => option.key === selectedView)?.label || "All Retainer Invoices";

  useEffect(() => {
    if (!selectAllCheckboxRef.current) return;
    selectAllCheckboxRef.current.indeterminate = hasVisibleSelection && !allVisibleSelected;
  }, [hasVisibleSelection, allVisibleSelected]);

  useEffect(() => {
    if (selectedRowIds.size === 0) return;
    const existingIds = new Set(rows.map((row) => row.id));
    setSelectedRowIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => existingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows, selectedRowIds.size]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedRowIds(new Set());
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      filteredRows.forEach((row) => {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      });
      return next;
    });
  };

  const toggleRowSelection = (rowId: string, checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteLoading) return;
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} retainer invoice${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) {
      return;
    }
    try {
      setBulkDeleteLoading(true);
      await Promise.all(ids.map((retainerId) => deleteInvoice(retainerId)));
      setRows((prev) => prev.filter((row) => !selectedRowIds.has(row.id)));
      setSelectedRowIds(new Set());
    } catch (error) {
      console.error("Failed to delete retainer invoices:", error);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const escapeHtml = (value: any) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const toMoney = (value: any) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const buildRetainerPrintDocument = (selectedRows: RetainerRow[]) => {
    const pages = selectedRows.map((row) => {
      const invoice: any = row.sourceInvoice || {};
      const currencyPrefix = String(invoice.currency || "AMD");
      const itemsSource = Array.isArray(invoice.items) ? invoice.items : [];
      const items = itemsSource.length
        ? itemsSource.map((item: any, index: number) => {
          const amountValue =
            Number(item?.amount ?? item?.total ?? item?.unitPrice ?? item?.rate ?? 0) || 0;
          return {
            id: index + 1,
            description: String(item?.description || item?.name || row.reference || "-"),
            amount: amountValue,
          };
        })
        : [{ id: 1, description: String(row.reference || row.invoiceNumber || "-"), amount: Number(row.amount || 0) }];

      const itemSubtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const subtotal = Number(invoice.subtotal ?? invoice.subTotal ?? itemSubtotal) || itemSubtotal;
      const total = Number(invoice.total ?? invoice.amount ?? row.amount ?? subtotal) || subtotal;
      const taxFromPayload = Number(invoice.taxTotal ?? invoice.tax ?? invoice.totalTax);
      const tax = Number.isFinite(taxFromPayload) ? taxFromPayload : Math.max(total - subtotal, 0);
      const balanceDue = Number(invoice.balance ?? invoice.balanceDue ?? row.balance ?? total) || total;
      const invoiceDateText = row.date || "-";
      const organizationName = String(invoice.organizationName || "asddc");
      const organizationCountry = String(invoice.organizationCountry || "Algeria");
      const organizationEmail = String(invoice.organizationEmail || "ladiif520@gmail.com");
      const customerName = String(row.customerName || "Unknown Customer");

      const itemRowsMarkup = items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.id)}</td>
              <td>${escapeHtml(item.description)}</td>
              <td class="align-right">${escapeHtml(toMoney(item.amount))}</td>
            </tr>
          `
        )
        .join("");

      return `
        <section class="invoice-page">
          <div class="top-row">
            <div class="org-meta">
              <div class="org-name">${escapeHtml(organizationName)}</div>
              <div>${escapeHtml(organizationCountry)}</div>
              <div>${escapeHtml(organizationEmail)}</div>
            </div>
            <div class="doc-meta">
              <h1>RETAINER INVOICE</h1>
              <div class="retainer-number">Retainer# <strong>${escapeHtml(row.invoiceNumber)}</strong></div>
              <div class="balance-label">Balance Due</div>
              <div class="balance-amount">${escapeHtml(currencyPrefix)}${escapeHtml(toMoney(balanceDue))}</div>
            </div>
          </div>

          <div class="bill-row">
            <div>
              <div class="label">Bill To</div>
              <div class="value">${escapeHtml(customerName)}</div>
            </div>
            <div class="invoice-date">Retainer Date : ${escapeHtml(invoiceDateText)}</div>
          </div>

          <div class="line-table-wrap">
            <table class="line-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th class="align-right">Amount</th>
                </tr>
              </thead>
              <tbody>${itemRowsMarkup}</tbody>
            </table>
          </div>

          <div class="totals">
            <div class="totals-row"><span>Sub Total</span><span>${escapeHtml(toMoney(subtotal))}</span></div>
            <div class="totals-row"><span>Tax</span><span>${escapeHtml(toMoney(tax))}</span></div>
            <div class="totals-row total"><span>Total</span><span>${escapeHtml(currencyPrefix)}${escapeHtml(toMoney(total))}</span></div>
            <div class="totals-row due"><span>Balance Due</span><span>${escapeHtml(currencyPrefix)}${escapeHtml(toMoney(balanceDue))}</span></div>
          </div>

          <div class="payment-options">Payment Options <span class="payment-icon">[]</span></div>
        </section>
      `;
    });

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Retainer Invoices</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #334155; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-page {
              width: 100%;
              min-height: 273mm;
              padding: 0;
              border: 1px solid #d6d9e3;
              max-width: 910px;
              margin: 0 auto;
              padding: 32px 32px 40px;
            }
            .invoice-page:not(:last-child) { page-break-after: always; margin-bottom: 10mm; }
            .top-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 20px 0 32px; }
            .org-meta { padding-top: 32px; padding-left: 56px; line-height: 1.35; font-size: 13px; color: #475569; }
            .org-meta .org-name { font-size: 14px; font-weight: 600; color: #334155; }
            .doc-meta { text-align: right; color: #0f172a; }
            .doc-meta h1 { margin: 0; font-size: 20px; letter-spacing: 0.03em; font-weight: 500; line-height: 1.1; white-space: nowrap; }
            .retainer-number { margin-top: 8px; font-size: 14px; }
            .retainer-number strong { font-weight: 600; }
            .balance-label { margin-top: 16px; font-size: 14px; }
            .balance-amount { margin-top: 2px; font-size: 20px; font-weight: 600; line-height: 1.1; }
            .bill-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
            .bill-row .label { font-size: 13px; color: #475569; margin-bottom: 2px; }
            .bill-row .value { font-size: 13px; font-weight: 600; color: #2f66b3; line-height: 1.1; }
            .invoice-date { font-size: 13px; color: #334155; padding-top: 16px; }
            .line-table-wrap { border: 1px solid #d6d9e3; margin-top: 8px; }
            .line-table { width: 100%; border-collapse: collapse; font-size: 14px; }
            .line-table thead tr { background: #2f343a; color: #fff; }
            .line-table th { text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; }
            .line-table td { padding: 8px 12px; border-top: 1px solid #f3f4f6; color: #334155; vertical-align: top; }
            .line-table th:first-child, .line-table td:first-child { width: 60px; }
            .align-right { text-align: right; }
            .totals { width: 340px; margin-left: auto; margin-top: 24px; font-size: 14px; color: #1e293b; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
            .totals-row.total { font-weight: 600; }
            .totals-row.due { background: #f3f4f6; padding: 8px 8px; margin-top: 8px; font-weight: 600; }
            .payment-options { margin-top: 40px; font-size: 14px; color: #334155; display: inline-flex; align-items: center; gap: 10px; }
            .payment-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 18px; border: 1px solid #a3a3a3; font-size: 11px; color: #525252; }
            @media print {
              body { background: #fff; }
              .invoice-page { margin: 0 auto; }
            }
          </style>
        </head>
        <body>
          ${pages.join("")}
        </body>
      </html>
    `;
  };

  const downloadRetainerPdf = async () => {
    const selectedRows = filteredRows.filter((row) => selectedRowIds.has(row.id));
    if (!selectedRows.length) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "1200px";
    iframe.style.height = "1600px";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    try {
      const html = buildRetainerPrintDocument(selectedRows);
      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        iframe.srcdoc = html;
      });
      await new Promise((resolve) => window.setTimeout(resolve, 180));

      const frameDoc = iframe.contentDocument;
      const pages = Array.from(frameDoc?.querySelectorAll(".invoice-page") || []) as HTMLElement[];
      if (!pages.length) {
        cleanup();
        return;
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i];
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const imgRatio = canvas.width / canvas.height;
        const pageRatio = pageWidth / pageHeight;

        let renderWidth = pageWidth;
        let renderHeight = pageHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > pageRatio) {
          renderHeight = pageWidth / imgRatio;
          offsetY = (pageHeight - renderHeight) / 2;
        } else {
          renderWidth = pageHeight * imgRatio;
          offsetX = (pageWidth - renderWidth) / 2;
        }

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "PNG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");
      }

      const fileName =
        selectedRows.length === 1
          ? `${selectedRows[0].invoiceNumber || "retainer-invoice"}.pdf`
          : "retainer-invoices.pdf";
      pdf.save(fileName);
    } finally {
      cleanup();
    }
  };

  const getColumnLabel = (columnKey: RetainerColumnKey) => {
    const item = RETAINER_COLUMNS.find((column) => column.key === columnKey);
    return item?.label || columnKey;
  };

  const getColumnWidth = (columnKey: RetainerColumnKey) => {
    const widthMap: Record<string, number> = {
      date: columnWidths.date,
      location: columnWidths.location,
      retainer: columnWidths.retainer,
      reference: columnWidths.reference,
      customer: columnWidths.customer,
      status: columnWidths.status,
      drawStatus: columnWidths.drawStatus,
      amount: columnWidths.amount,
      balance: columnWidths.balance,
      issuedDate: columnWidths.issuedDate,
      projectEstimate: columnWidths.projectEstimate,
      project: columnWidths.project,
      quote: columnWidths.quote,
      wsq: columnWidths.wsq,
    };
    const width = widthMap[columnKey] || 140;
    return { width, minWidth: width };
  };

  const startColumnResize = (columnKey: RetainerColumnKey, event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = getColumnWidth(columnKey).width as number;
    const MIN_WIDTH = 90;
    const MAX_WIDTH = 520;

    setResizingColumn(columnKey);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
      setColumnWidths((prev) => ({ ...prev, [columnKey]: next }));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setResizingColumn(null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const downloadCsv = (filename: string, data: RetainerRow[]) => {
    const exportColumns = visibleTableColumns;
    const header = exportColumns.map((key) => getColumnLabel(key));
    const lines = data.map((row) =>
      exportColumns.map((key) => {
        switch (key) {
          case "date":
            return row.date;
          case "location":
            return row.location;
          case "retainer":
            return row.invoiceNumber;
          case "reference":
            return row.reference;
          case "customer":
            return row.customerName;
          case "status":
            return row.status.split("_").join(" ");
          case "drawStatus":
            return row.drawStatus;
          case "amount":
            return row.amount.toFixed(2);
          case "balance":
            return row.balance.toFixed(2);
          case "issuedDate":
            return row.issuedDate;
          case "projectEstimate":
            return row.projectEstimate;
          case "project":
            return row.project;
          case "quote":
            return row.quote;
          case "wsq":
            return row.wsq;
          default:
            return "";
        }
      })
    );
    const csvRows = [header, ...lines].map((line) =>
      line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 bg-white overflow-hidden">
      <div className="border-b border-gray-100 bg-white shrink-0 z-[100]">
        {hasVisibleSelection ? (
          /* Bulk Action Header */
          <div className="flex items-center justify-between px-4 h-[60px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void downloadRetainerPdf()}
                className="px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                title="Export as PDF"
              >
                <FileDown size={16} className="text-gray-500" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                disabled={bulkDeleteLoading}
                className="px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
              >
                <Trash2 size={16} className="text-gray-500" />
                <span>{bulkDeleteLoading ? "Deleting..." : "Delete"}</span>
              </button>

              <div className="mx-2 h-5 w-px bg-gray-200" />

              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <span
                  className="flex h-6 min-w-[24px] items-center justify-center rounded px-2 text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                >
                  {selectedVisibleRowCount}
                </span>
                <span className="text-sm text-gray-700">Selected</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRowIds(new Set())}
              className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
            >
              <span>Esc</span>
              <X size={18} />
            </button>
          </div>
        ) : (
          /* Normal Header */
          <div className="flex items-center justify-between px-4 h-[60px]">
            <div className="flex items-center gap-8 pl-4">
              <div className="relative" ref={viewDropdownRef}>
                <button
                  type="button"
                  onClick={() => setViewDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 py-4 cursor-pointer group border-b-2 border-slate-900 -mb-[1px] bg-transparent outline-none"
                >
                  <span className="text-[15px] font-bold text-slate-900 transition-colors">{selectedViewLabel}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 text-[#156372] ${viewDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {viewDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] py-2">
                    <div className="px-3 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                        <Search size={14} className="text-gray-400" />
                        <input
                          placeholder="Search Views"
                          className="bg-transparent border-none outline-none text-sm w-full"
                          value={viewSearchTerm}
                          onChange={(e) => setViewSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {VIEW_OPTIONS.filter((v) => v.label.toLowerCase().includes(viewSearchTerm.toLowerCase())).map((view) => (
                        <button
                          key={view.key}
                          type="button"
                          onClick={() => {
                            setSelectedView(view.key);
                            setViewDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-teal-50 transition-colors"
                        >
                          <span className={selectedView === view.key ? "font-semibold text-teal-700" : "text-slate-700"}>
                            {view.label}
                          </span>
                          <Star
                            size={14}
                            className="text-gray-300 hover:text-yellow-400 transition-colors"
                            fill={favoriteViews.has(view.key) ? "#facc15" : "none"}
                            color={favoriteViews.has(view.key) ? "#facc15" : undefined}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavoriteView(view.key);
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-2 mr-4">
              <button
                onClick={() => navigate("/sales/retainer-invoices/new")}
                className="h-9 px-4 rounded-md text-white text-sm font-medium inline-flex items-center gap-1.5 shadow-sm transition-all bg-gradient-to-r from-[#176a79] to-[#1b5e6a] hover:from-[#1b5e6a] hover:to-[#176a79]"
                type="button"
              >
                <Plus size={18} className="stroke-[3px]" />
                <span>New</span>
              </button>

              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setMoreDropdownOpen((prev) => !prev)}
                  className="h-9 w-9 rounded-md border border-gray-200 bg-white text-slate-600 inline-flex items-center justify-center shadow-sm hover:bg-slate-50"
                  type="button"
                  aria-label="More options"
                >
                  <MoreHorizontal size={16} />
                </button>
                {moreDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-100 rounded-lg shadow-xl py-2 z-[110]">
                    <div className="relative">
                      <button
                        onClick={() => {
                          setSortSubMenuOpen((prev) => !prev);
                          setExportSubMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? "text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm" : "text-slate-600 hover:bg-[#1b5e6a] hover:text-white"
                          }`}
                        style={sortSubMenuOpen ? { backgroundColor: "#1b5e6a" } : {}}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <ArrowUpDown size={15} className={sortSubMenuOpen ? "text-white" : ""} />
                          <span className="font-medium">Sort by</span>
                        </div>
                        <ChevronRight size={14} className={sortSubMenuOpen ? "text-white" : "text-slate-400"} />
                      </button>
                      {sortSubMenuOpen && (
                        <div className="absolute top-0 right-full mr-2 w-64 bg-white border border-gray-100 rounded-lg shadow-xl py-2 z-[120]">
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option.key}
                              onClick={() => {
                                setActiveSortKey(option.key);
                                setSortSubMenuOpen(false);
                                setMoreDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeSortKey === option.key
                                ? "bg-[#1b5e6a] text-white font-semibold"
                                : "text-slate-600 hover:bg-teal-50"
                                }`}
                              type="button"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        navigate("/sales/retainer-invoices/import");
                        setMoreDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <Upload size={15} />
                      <span className="font-medium">Import Retainer Invoices</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => {
                          setExportSubMenuOpen((prev) => !prev);
                          setSortSubMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${exportSubMenuOpen ? "text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm" : "text-slate-600 hover:bg-[#1b5e6a] hover:text-white"
                          }`}
                        style={exportSubMenuOpen ? { backgroundColor: "#1b5e6a" } : {}}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <Download size={15} className={exportSubMenuOpen ? "text-white" : ""} />
                          <span className="font-medium">Export</span>
                        </div>
                        <ChevronRight size={14} className={exportSubMenuOpen ? "text-white" : "text-slate-400"} />
                      </button>
                      {exportSubMenuOpen && (
                        <div className="absolute top-0 right-full mr-2 w-56 bg-white border border-gray-100 rounded-lg shadow-xl py-2 z-[120]">
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                            onClick={() => {
                              downloadCsv("retainer-invoices.csv", rows);
                              setExportSubMenuOpen(false);
                              setMoreDropdownOpen(false);
                            }}
                            type="button"
                          >
                            Export Retainer Invoices
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                            onClick={() => {
                              downloadCsv("retainer-current-view.csv", filteredRows);
                              setExportSubMenuOpen(false);
                              setMoreDropdownOpen(false);
                            }}
                            type="button"
                          >
                            Export Current View
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-gray-100 my-1 mx-2" />

                    <button
                      onClick={() => {
                        navigate("/settings");
                        setMoreDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <Settings size={15} />
                      <span className="font-medium">Preferences</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/settings");
                        setMoreDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <SlidersHorizontal size={15} />
                      <span className="font-medium">Manage Custom Fields</span>
                    </button>

                    <div className="h-px bg-gray-100 my-1 mx-2" />

                    <button
                      onClick={() => {
                        loadRetainers();
                        setMoreDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <RefreshCw size={15} />
                      <span className="font-medium">Refresh List</span>
                    </button>

                    <button
                      onClick={() => {
                        setColumnWidths(DEFAULT_COLUMN_WIDTHS);
                        setMoreDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <RotateCcw size={15} />
                      <span className="font-medium">Reset Column Width</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>


      <div className="flex-1 overflow-auto bg-white min-h-0">
        {(loading || hasRows) && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f6f7fb] sticky top-0 z-10 border-b border-[#e6e9f2]">
              <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
                <th
                  ref={columnToolsRef}
                  className="w-16 px-4 py-3 text-left sticky left-0 z-20 bg-[#f6f7fb]"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setDraftSelectedColumns(new Set(selectedColumns));
                        setColumnSearchTerm("");
                        setIsCustomizeColumnsOpen(true);
                      }}
                      title="Customize columns"
                    >
                      <SlidersHorizontal size={13} className="text-[#156372]" />
                    </button>
                    <div className="h-5 w-px bg-gray-200" />
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-0 cursor-pointer"
                    />
                  </div>
                </th>
                {TABLE_COLUMNS.map((columnKey) => {
                  if (!visibleTableColumnSet.has(columnKey)) return null;
                  const label = getColumnLabel(columnKey);
                  const widthStyle = getColumnWidth(columnKey);
                  const isAmountColumn = columnKey === "amount" || columnKey === "balance";
                  return (
                    <th
                      key={columnKey}
                      className={`group/header relative px-4 py-3 text-left text-[11px] font-semibold text-[#7b8494] uppercase tracking-wider select-none bg-[#f6f7fb] ${isAmountColumn ? "text-right" : ""}`}
                      style={widthStyle}
                    >
                      <span className="inline-block pr-3">{label}</span>
                      <div
                        onMouseDown={(event) => startColumnResize(columnKey, event)}
                        className="absolute right-0 top-0 bottom-0 w-[2px] cursor-col-resize hover:bg-teal-400/50 group-hover/header:border-r border-gray-100"
                      />
                    </th>
                  );
                })}
                <th className="w-10 px-4 py-3 text-right sticky right-0 z-20 bg-[#f6f7fb] border-l border-transparent">
                  <div className="flex items-center justify-center">
                    <Search size={14} className="text-gray-300" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#eef1f6]">
              {loading ? (
                <TableRowSkeleton />
              ) : (
                filteredRows.map((row) => {
                  const isSelected = selectedRowIds.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`group transition-all hover:bg-[#f8fafc] cursor-pointer ${isSelected ? "bg-[#156372]/5" : ""
                        }`}
                      onClick={() => navigate(`/sales/retainer-invoices/${row.id}`)}
                    >
                      <td className="px-4 py-3 sticky left-0 z-20 bg-inherit" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 shrink-0" />
                          <div className="h-5 w-px bg-transparent shrink-0" />
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => toggleRowSelection(row.id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-0 cursor-pointer"
                          />
                        </div>
                      </td>
                      {visibleTableColumnSet.has("date") && (
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-slate-600">{row.date}</span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("location") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] text-slate-700 block max-w-[130px] ${clipTextClass}`}>{row.location}</span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("retainer") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] font-medium text-[#156372] inline-flex items-center gap-1.5 max-w-[190px] ${clipTextClass}`}>
                            <span className={clipTextClass}>{row.invoiceNumber}</span>
                            {row.isEmailed && <Mail size={12} className="text-slate-500 shrink-0" />}
                          </span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("reference") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] text-slate-600 block max-w-[120px] ${clipTextClass}`}>{row.reference || "-"}</span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("customer") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] text-slate-600 block max-w-[200px] ${clipTextClass}`}>{row.customerName}</span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("status") && (
                        <td className="px-4 py-3">
                          <span className="text-[13px] uppercase tracking-wide text-[#6286a8]">
                            {row.status.split("_").join(" ").toUpperCase()}
                          </span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("drawStatus") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] uppercase tracking-wide text-slate-700 block max-w-[170px] ${clipTextClass}`}>
                            {row.drawStatus}
                          </span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("amount") && (
                        <td className="px-4 py-3 text-right">
                          <span className="text-[13px] text-slate-600">
                            {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("balance") && (
                        <td className="px-4 py-3 text-right">
                          <span className="text-[13px] text-slate-600">
                            {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("issuedDate") && (
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-slate-600">{row.issuedDate}</span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("projectEstimate") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] text-slate-600 block max-w-[140px] ${clipTextClass}`}>{row.projectEstimate || "-"}</span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("project") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] text-slate-600 block max-w-[140px] ${clipTextClass}`}>{row.project || "-"}</span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("quote") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] text-slate-600 block max-w-[110px] ${clipTextClass}`}>{row.quote || "-"}</span>
                        </td>
                      )}
                      {visibleTableColumnSet.has("wsq") && (
                        <td className="px-4 py-3">
                          <span className={`text-[13px] text-slate-600 block max-w-[110px] ${clipTextClass}`}>{row.wsq || "-"}</span>
                        </td>
                      )}
                      <td
                        className={`px-4 py-3 w-12 sticky right-0 backdrop-blur-sm border-l border-transparent transition-colors ${isSelected ? "bg-[#156372]/5" : "bg-white/95 group-hover:bg-[#f8fafc]/95"
                          }`}
                      />
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {!loading && !hasRows && (
          <div className="py-16 px-6 text-center">
            <h3 className="text-[26px] leading-tight font-medium text-slate-900">Get paid in advance.</h3>
            <p className="mt-2 text-slate-500 text-sm">
              Create a retainer to collect advance payments from your customers and apply them to multiple invoices.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => navigate("/sales/retainer-invoices/new")}
                className="cursor-pointer transition-all text-white px-5 py-2 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-medium"
                style={{ backgroundColor: accentColor }}
              >
                CREATE NEW RETAINER INVOICE
              </button>
              <button
                onClick={() => navigate("/sales/retainer-invoices/import")}
                className="text-sm text-[#1b5e6a] hover:underline"
              >
                Import Retainer Invoices
              </button>
            </div>
          </div>
        )}
      </div>

      {isCustomizeColumnsOpen && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-[2px] flex items-start justify-center pt-[10vh] overflow-y-auto px-4 py-6" onClick={() => setIsCustomizeColumnsOpen(false)}>
          <div className="w-full max-w-[500px] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={18} className="text-gray-500" />
                <h2 className="text-[15px] font-semibold text-gray-800">Customize Columns</h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[13px] text-slate-600">{selectedColumnCount} of {RETAINER_COLUMNS.length} Selected</span>
                <button
                  type="button"
                  className="w-7 h-7 flex items-center justify-center border border-blue-200 rounded shadow-sm hover:bg-gray-50 transition-colors group"
                  onClick={() => {
                    setIsCustomizeColumnsOpen(false);
                    setColumnSearchTerm("");
                  }}
                >
                  <X size={16} className="text-red-500 group-hover:text-red-600" />
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <input
                  value={columnSearchTerm}
                  onChange={(e) => setColumnSearchTerm(e.target.value)}
                  placeholder="Search"
                  className="w-full border-none outline-none text-sm"
                />
              </div>
            </div>

            <div className="px-4 py-2 max-h-[56vh] overflow-y-auto">
              <div className="space-y-2">
                {filteredCustomizeColumns.map((column) => {
                  const checked = draftSelectedColumns.has(column.key);
                  return (
                    <label
                      key={column.key}
                      className="flex items-center gap-3 rounded-md bg-[#f3f4f6] px-3 py-2 cursor-pointer"
                    >
                      <GripVertical size={14} className="text-gray-400" />
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setDraftSelectedColumns((prev) => {
                            const next = new Set(prev);
                            if (isChecked) next.add(column.key);
                            else next.delete(column.key);
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-slate-700">{column.label}</span>
                    </label>
                  );
                })}
                {filteredCustomizeColumns.length === 0 && (
                  <div className="px-3 py-6 text-sm text-slate-500 text-center">No columns found</div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedColumns(new Set(draftSelectedColumns));
                  setIsCustomizeColumnsOpen(false);
                  setColumnSearchTerm("");
                }}
                className="bg-[#22a06b] text-white px-5 py-2 rounded-md text-sm font-medium"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomizeColumnsOpen(false);
                  setColumnSearchTerm("");
                }}
                className="bg-white border border-gray-300 text-slate-700 px-5 py-2 rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
