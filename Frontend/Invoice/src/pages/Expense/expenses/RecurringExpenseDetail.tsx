import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { expensesAPI, recurringExpensesAPI, taxesAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const normalizeAttachments = (raw: any[] = []) =>
  Array.isArray(raw)
    ? raw
      .map((file: any, index: number) => ({
        id: String(file?.id || file?._id || `att-${Date.now()}-${index}`),
        name: String(file?.name || `Attachment ${index + 1}`),
        size: Number(file?.size || 0),
        type: String(file?.type || ""),
        url: String(file?.url || file?.fileUrl || file?.base64 || "").trim(),
        uploadedAt: file?.uploadedAt || file?.createdAt || new Date().toISOString(),
      }))
      .filter((file) => file.url)
    : [];

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const formatSize = (bytes: number) => {
  if (!bytes || !Number.isFinite(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extractTaxRateFromLabel = (label: string) => {
  const text = String(label || "");
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return 0;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0;
};

const getTaxId = (tax: any) => String(tax?._id || tax?.id || tax?.tax_id || tax?.taxId || "").trim();
const getTaxRate = (tax: any) => {
  const direct = Number(tax?.taxPercentage ?? tax?.rate ?? tax?.percentage ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return extractTaxRateFromLabel(String(tax?.name || tax?.taxName || tax?.tax_name || ""));
};

export default function RecurringExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [expense, setExpense] = useState<any>(null);
  const [generatedExpenses, setGeneratedExpenses] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"Overview" | "All Expenses">("Overview");
  const [loading, setLoading] = useState(true);
  const [loadingGenerated, setLoadingGenerated] = useState(false);
  const [profilesFilter, setProfilesFilter] = useState<"All Profiles" | "Active" | "Stopped">("All Profiles");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sidebarCreateMenuOpen, setSidebarCreateMenuOpen] = useState(false);
  const [sidebarMoreMenuOpen, setSidebarMoreMenuOpen] = useState(false);
  const [savingAttachments, setSavingAttachments] = useState(false);
  const [showAssociatedTags, setShowAssociatedTags] = useState(false);
  const [taxRatesById, setTaxRatesById] = useState<Record<string, number>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const sidebarCreateMenuRef = useRef<HTMLDivElement>(null);
  const sidebarMoreMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getIdCandidates = (record?: any) =>
    Array.from(new Set([record?._id, record?.id, record?.recurringExpenseId, id].map((value) => String(value || "").trim()).filter(Boolean)));

  const formatDate = (value: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatDateTime = (value: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const nextExpenseDate = (startDate: string, repeatEvery: string) => {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return "-";
    const map: Record<string, number> = { Week: 7, "2 Weeks": 14, Month: 30, "2 Months": 60, "3 Months": 90, "6 Months": 180, Year: 365, "2 Years": 730, "3 Years": 1095 };
    start.setDate(start.getDate() + (map[repeatEvery] || 7));
    return formatDate(start.toISOString());
  };

  const fetchProfiles = async () => {
    try {
      const response = await recurringExpensesAPI.getAll({ limit: 1000 });
      const rows = response?.recurring_expenses || [];
      setProfiles(
        rows.map((row: any) => ({
          id: row?._id || row?.recurring_expense_id,
          profileName: row?.profile_name || "",
          expenseAccount: row?.account_name || "",
          amount: row?.amount || 0,
          repeatEvery: row?.repeat_every || "Week",
          status: String(row?.status || "active").toUpperCase(),
          nextExpenseDate: nextExpenseDate(row?.start_date || "", row?.repeat_every || "Week"),
        }))
      );
    } catch (error) {
      console.error("Failed to fetch recurring profile list:", error);
      setProfiles([]);
    }
  };

  const fetchTaxes = async () => {
    try {
      const primary = await taxesAPI.getForTransactions().catch(() => null);
      const fallback = await taxesAPI.getAll({ status: "active" }).catch(() => null);
      const rows = [
        ...(Array.isArray(primary?.data) ? primary.data : []),
        ...(Array.isArray(primary?.taxes) ? primary.taxes : []),
        ...(Array.isArray(fallback?.data) ? fallback.data : []),
      ];
      const next: Record<string, number> = {};
      rows.forEach((tax: any) => {
        const id = getTaxId(tax);
        if (!id) return;
        next[id] = getTaxRate(tax);
      });
      setTaxRatesById(next);
    } catch (error) {
      console.error("Failed to fetch taxes for recurring detail amount calculation:", error);
      setTaxRatesById({});
    }
  };

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      let resolved: any = null;
      for (const candidate of getIdCandidates()) {
        try {
          const response = await recurringExpensesAPI.getById(candidate);
          const row = response?.recurring_expense;
          if (row) {
            resolved = {
              id: row?._id || row?.recurring_expense_id,
              _id: row?._id,
              recurringExpenseId: row?.recurring_expense_id,
              profileName: row?.profile_name || "",
              expenseAccount: row?.account_name || "",
              vendor: row?.vendor_name || "",
              customerName: row?.customer_name || "",
              repeatEvery: row?.repeat_every || "Week",
              startDate: row?.start_date || "",
              endDate: row?.end_date || "",
              neverExpire: Boolean(row?.never_expire),
              amount: row?.amount || 0,
              account_id: row?.account_id || row?.account?._id || row?.account?.id || "",
              paid_through_account_id:
                row?.paid_through_account_id
                || row?.paid_through_account?._id
                || row?.paid_through_account?.id
                || "",
              status: String(row?.status || "active").toUpperCase(),
              paidThrough: row?.paid_through_account_name || "",
              notes: row?.notes || row?.description || "",
              location: row?.location || row?.location_name || "Head Office",
              projectName: row?.project_name || row?.projectName || "",
              project_id: row?.project_id || row?.project?._id || row?.project?.id || "",
              taxName: row?.tax_name || row?.taxName || "",
              taxId: row?.tax_id || row?.tax?._id || row?.tax?.id || "",
              taxRate: Number(row?.tax_percentage ?? row?.taxPercentage ?? row?.rate ?? 0),
              isInclusiveTax: Boolean(row?.is_inclusive_tax),
              reportingTags: Array.isArray(row?.reporting_tags) ? row.reporting_tags : [],
              createdAt: row?.createdAt || row?.created_at || new Date().toISOString(),
              createdBy: row?.created_by_name || row?.createdBy || "System",
              currencyCode: row?.currency_code || row?.currency || "",
              vendor_id: row?.vendor_id || row?.vendor?._id || row?.vendor?.id || "",
              customer_id: row?.customer_id || row?.customer?._id || row?.customer?.id || "",
              attachments: normalizeAttachments(row?.attachments || []),
            };
            break;
          }
        } catch {
          // Try next candidate ID.
        }
      }
      setExpense(resolved);
      setAttachments(normalizeAttachments(resolved?.attachments || []));
    } catch (error) {
      console.error("Failed to fetch recurring expense detail:", error);
      setExpense(null);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenerated = async () => {
    setLoadingGenerated(true);
    try {
      let rows: any[] = [];
      for (const candidate of getIdCandidates(expense)) {
        const response = await expensesAPI.getAll({ recurring_expense_id: candidate });
        const data = response?.expenses || [];
        if (Array.isArray(data) && data.length > 0) {
          rows = data;
          break;
        }
      }
      setGeneratedExpenses(rows);
    } finally {
      setLoadingGenerated(false);
    }
  };

  useEffect(() => {
    void fetchProfiles();
    void fetchDetail();
    void fetchTaxes();
  }, [id, baseCurrencyCode]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) setMoreMenuOpen(false);
      if (sidebarCreateMenuRef.current && !sidebarCreateMenuRef.current.contains(event.target as Node)) setSidebarCreateMenuOpen(false);
      if (sidebarMoreMenuRef.current && !sidebarMoreMenuRef.current.contains(event.target as Node)) setSidebarMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const exportPdf = () => {
    if (!expense) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const currency = baseCurrencySymbol || baseCurrencyCode || "USD";
    pdf.setFontSize(16);
    pdf.text("Recurring Expense", 14, 16);
    pdf.setFontSize(10);
    pdf.text(`Profile: ${expense.profileName || "-"}`, 14, 28);
    pdf.text(`Amount: ${currency}${Number(expense.amount || 0).toFixed(2)}`, 14, 34);
    pdf.text(`Frequency: ${expense.repeatEvery || "-"}`, 14, 40);
    pdf.text(`Start Date: ${formatDate(expense.startDate)}`, 14, 46);
    pdf.text(`Status: ${expense.status || "-"}`, 14, 52);
    pdf.text(`Expense Account: ${expense.expenseAccount || "-"}`, 14, 58);
    pdf.text(`Paid Through: ${expense.paidThrough || "-"}`, 14, 64);
    pdf.text(`Vendor: ${expense.vendor || "-"}`, 14, 70);
    pdf.text(`Customer: ${expense.customerName || "-"}`, 14, 76);
    pdf.text(`Attachments: ${attachments.length}`, 14, 82);
    pdf.save(`${String(expense.profileName || "recurring-expense").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
  };

  const persistAttachments = async (nextAttachments: any[]) => {
    const payload = normalizeAttachments(nextAttachments);
    let updated = false;
    let lastError: any = null;

    for (const candidate of getIdCandidates(expense)) {
      try {
        const response = await recurringExpensesAPI.update(candidate, { attachments: payload });
        if (response?.code === 0 || response?.success || response?.recurring_expense || response?.data) {
          updated = true;
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (!updated) {
      throw lastError || new Error("Failed to save attachments.");
    }
    setAttachments(payload);
    setExpense((prev: any) => (prev ? { ...prev, attachments: payload } : prev));
    window.dispatchEvent(new Event("recurringExpensesUpdated"));
  };

  const onUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const valid = files.filter((file) => file.size <= MAX_FILE_SIZE);
    if (valid.length !== files.length) alert("Some files exceed the 10MB limit and were skipped.");
    if (!valid.length) return;

    const previous = attachments;
    setSavingAttachments(true);
    try {
      const uploaded = await Promise.all(
        valid.map(async (file, index) => ({
          id: `att-${Date.now()}-${index}`,
          name: file.name,
          size: file.size,
          type: file.type || "",
          url: await toDataUrl(file),
          uploadedAt: new Date().toISOString(),
        }))
      );
      await persistAttachments([...attachments, ...uploaded]);
    } catch (error: any) {
      setAttachments(previous);
      alert(error?.message || "Failed to upload file.");
    } finally {
      setSavingAttachments(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    const previous = attachments;
    const next = attachments.filter((file: any) => file.id !== attachmentId);
    setAttachments(next);
    setSavingAttachments(true);
    try {
      await persistAttachments(next);
    } catch (error: any) {
      setAttachments(previous);
      alert(error?.message || "Failed to delete attachment.");
    } finally {
      setSavingAttachments(false);
    }
  };

  const deleteProfile = async () => {
    if (!expense) return;
    if (!window.confirm("Are you sure you want to delete this recurring expense?")) return;

    let deleted = false;
    let lastError: any = null;
    for (const candidate of getIdCandidates(expense)) {
      try {
        const response = await recurringExpensesAPI.delete(candidate);
        if (response?.code === 0 || response?.success || response === null || typeof response === "object") {
          deleted = true;
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }
    if (!deleted) {
      alert(lastError?.message || "Failed to delete recurring expense.");
      return;
    }
    window.dispatchEvent(new Event("recurringExpensesUpdated"));
    navigate("/expenses/recurring-expenses");
  };

  const updateRecurringStatus = async (nextStatus: "active" | "stopped") => {
    if (!expense) return;
    let updated = false;
    let lastError: any = null;
    for (const candidate of getIdCandidates(expense)) {
      try {
        const response = await recurringExpensesAPI.updateStatus(candidate, nextStatus);
        if (response?.code === 0 || response?.success || response?.recurring_expense || response?.data) {
          updated = true;
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }
    if (!updated) {
      alert(lastError?.message || "Failed to update recurring expense status.");
      return;
    }
    setMoreMenuOpen(false);
    await fetchDetail();
    await fetchProfiles();
    window.dispatchEvent(new Event("recurringExpensesUpdated"));
  };

  const createExpenseNow = () => {
    if (!expense) return;
    const now = new Date();
    const clonedData = {
      location: expense.location || "Head Office",
      date: now.toLocaleDateString("en-GB"),
      raw_date: now.toISOString(),
      expenseAccount: expense.expenseAccount || "",
      amount: Number(expense.amount || 0),
      currency: String(expense.currencyCode || baseCurrencyCode || "USD").toUpperCase(),
      is_inclusive_tax: Boolean(expense.isInclusiveTax),
      paidThrough: expense.paidThrough || "",
      tax: String(expense.taxId || ""),
      tax_id: String(expense.taxId || ""),
      vendor: expense.vendor || "",
      vendor_id: expense.vendor_id || "",
      reference: "",
      notes: expense.notes || "",
      customerName: expense.customerName || "",
      customer_id: expense.customer_id || "",
      projectName: expense.projectName || "",
      project_id: expense.project_id || "",
      is_billable: Boolean(expense.customer_id),
      markupBy: 1,
      markupType: "%",
      reportingTags: Array.isArray(expense.reportingTags) ? expense.reportingTags : [],
    };
    setMoreMenuOpen(false);
    navigate("/expenses/new", { state: { clonedData, receiptFiles: attachments } });
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!expense) return <div style={{ padding: 24 }}>Recurring expense not found.</div>;

  const amountCode = String(expense.currencyCode || baseCurrencyCode || "USD").toUpperCase();
  const baseAmount = Number(expense.amount || 0);
  const resolvedTaxRate =
    Number(expense.taxRate || 0) > 0
      ? Number(expense.taxRate || 0)
      : (taxRatesById[String(expense.taxId || "").trim()] || extractTaxRateFromLabel(String(expense.taxName || "")) || 0);
  const combinedAmount = expense.isInclusiveTax ? baseAmount : baseAmount * (1 + resolvedTaxRate / 100);
  const amountValue = (Number.isFinite(combinedAmount) ? combinedAmount : baseAmount).toFixed(2);
  const taxLabel = expense.taxName
    ? `${amountCode}${(baseAmount * (resolvedTaxRate / 100)).toFixed(2)} (${expense.taxName}${resolvedTaxRate ? ` - ${resolvedTaxRate}%` : ""}) (${expense.isInclusiveTax ? "Inclusive" : "Exclusive"})`
    : "-";

  const profilesFilterOptions: Array<"All Profiles" | "Active" | "Stopped"> = ["All Profiles", "Active", "Stopped"];
  const filteredProfiles = profiles.filter((row) => {
    const status = String(row?.status || "").toUpperCase();
    if (profilesFilter === "Active") return status !== "STOPPED";
    if (profilesFilter === "Stopped") return status === "STOPPED";
    return true;
  });

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 xl:grid-cols-[280px_1fr] 2xl:grid-cols-[300px_1fr]">
      <aside className="border-r border-gray-200 bg-white">
        <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
          <div ref={dropdownRef} className="relative flex-1">
            <div
              className="inline-flex items-center gap-1 text-[18px] font-semibold text-gray-900 cursor-pointer select-none"
              onClick={() => {
                setDropdownOpen((prev) => !prev);
                setSidebarCreateMenuOpen(false);
                setSidebarMoreMenuOpen(false);
              }}
            >
              <span>{profilesFilter}</span>
              {dropdownOpen ? <ChevronUp size={16} className="text-[#156372]" /> : <ChevronDown size={16} className="text-[#156372]" />}
            </div>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[190px] overflow-hidden">
                {profilesFilterOptions.map((option) => (
                  <button
                    key={option}
                    className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 ${profilesFilter === option ? "bg-[#156372]/10 text-[#156372]" : "text-gray-700"}`}
                    onClick={() => {
                      setProfilesFilter(option);
                      setDropdownOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-2">
            <div ref={sidebarCreateMenuRef} className="relative">
              <div className="inline-flex items-center overflow-hidden rounded-md border border-[#15803d] shadow-sm">
                <button
                  className="px-3 py-2 text-white bg-[#16a34a] hover:bg-[#15803d] cursor-pointer"
                  onClick={() => navigate("/expenses/recurring-expenses/new")}
                >
                  <Plus size={16} />
                </button>
                <button
                  className="px-2.5 py-2 text-white bg-[#16a34a] border-l border-[#15803d] hover:bg-[#15803d] cursor-pointer"
                  onClick={() => {
                    setSidebarCreateMenuOpen((prev) => !prev);
                    setDropdownOpen(false);
                    setSidebarMoreMenuOpen(false);
                  }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {sidebarCreateMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[190px] overflow-hidden">
                  <button
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setSidebarCreateMenuOpen(false);
                      navigate("/expenses/recurring-expenses/new");
                    }}
                  >
                    New Profile
                  </button>
                  <button
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setSidebarCreateMenuOpen(false);
                      navigate("/expenses/recurring-expenses/import");
                    }}
                  >
                    Import Profiles
                  </button>
                </div>
              )}
            </div>

            <div ref={sidebarMoreMenuRef} className="relative">
              <button
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer border border-gray-200"
                onClick={() => {
                  setSidebarMoreMenuOpen((prev) => !prev);
                  setDropdownOpen(false);
                  setSidebarCreateMenuOpen(false);
                }}
              >
                <MoreHorizontal size={16} />
              </button>
              {sidebarMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[190px] overflow-hidden">
                  <button
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setSidebarMoreMenuOpen(false);
                      exportPdf();
                    }}
                  >
                    Export Profile PDF
                  </button>
                  <button
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setSidebarMoreMenuOpen(false);
                      navigate("/expenses/recurring-expenses");
                    }}
                  >
                    Go to Recurring Expenses
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-56px)]">
          {filteredProfiles.map((row) => {
            const active = row.id === expense.id;
            const statusColor = row.status === "ACTIVE" ? "text-[#18a34a]" : "text-[#f97316]";
            return (
              <button
                key={row.id}
                onClick={() => navigate(`/expenses/recurring-expenses/${row.id}`)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-200 ${active ? "bg-[#f6f8fc]" : "bg-white hover:bg-gray-50"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[16px] font-medium text-gray-900">{row.profileName || "Profile"}</div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold text-gray-900">{amountCode}{Number(row.amount || 0).toFixed(2)}</div>
                    <div className="text-[11px] text-gray-600">{row.repeatEvery || "Week"}</div>
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-[#375f94]">{row.expenseAccount || "-"}</div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className={`font-medium ${statusColor}`}>{row.status || "ACTIVE"}</span>
                  <span className="text-gray-600">Next expense date {row.nextExpenseDate || "-"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="min-w-0 flex flex-col bg-white">
        <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] leading-none font-semibold text-gray-900">{expense.profileName || "-"}</h1>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${expense.status === "ACTIVE" ? "bg-[#1e9f4d] text-white" : "bg-gray-200 text-gray-700"}`}>
              {expense.status || "ACTIVE"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/expenses/recurring-expenses/new", { state: { editExpense: expense, isEdit: true } })}
              className="h-7 w-9 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center"
            >
              <Pencil size={13} />
            </button>
            <div ref={moreMenuRef} className="relative">
              <button onClick={() => setMoreMenuOpen((prev) => !prev)} className="h-7 px-2.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 text-xs flex items-center gap-1">
                More <ChevronDown size={14} />
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 top-9 z-20 min-w-[160px] border border-gray-200 rounded-md bg-white shadow-lg overflow-hidden">
                  {(() => {
                    const isStopped = String(expense.status || "").toUpperCase() === "STOPPED";
                    return (
                      <button
                        onClick={() => void updateRecurringStatus(isStopped ? "active" : "stopped")}
                        className="w-full px-3 py-2 text-left text-sm text-[#1f4fbf] hover:bg-blue-50"
                      >
                        {isStopped ? "Resume" : "Stop"}
                      </button>
                    );
                  })()}
                  {String(expense.status || "").toUpperCase() !== "STOPPED" && (
                    <button
                      onClick={() => void createExpenseNow()}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Create Expense
                    </button>
                  )}
                  <button
                    onClick={() => void deleteProfile()}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => navigate("/expenses/recurring-expenses")} className="h-7 w-7 text-gray-500 hover:text-gray-800">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200 px-4 flex items-center gap-4">
          {(["Overview", "All Expenses"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "All Expenses") void fetchGenerated();
              }}
              className={`h-9 px-2 text-xs font-medium border-b-2 ${activeTab === tab ? "border-[#3b82f6] text-[#1f2937]" : "border-transparent text-gray-600"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "Overview" && (
            <div className="px-4 py-4 max-w-[880px]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[#e9f8f1] text-[#25b771] flex items-center justify-center">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <div className="text-[14px] leading-none font-semibold text-gray-900">{amountCode}{amountValue}</div>
                    <div className="text-xs text-gray-500">Expense Amount</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[#fff6e9] text-[#f59e0b] flex items-center justify-center">
                    <Repeat size={16} />
                  </div>
                  <div>
                    <div className="text-[14px] leading-none font-semibold text-gray-900">{expense.repeatEvery || "Week"}</div>
                    <div className="text-xs text-gray-500">Repeats</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[#ecf0fe] text-[#466cf9] flex items-center justify-center">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="text-[14px] leading-none font-semibold text-gray-900">{nextExpenseDate(expense.startDate, expense.repeatEvery)}</div>
                    <div className="text-xs text-gray-500">Next Expense Date</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-4 border-b border-gray-200 pb-3">
                <div>
                  <div className="text-xs text-gray-500">Expense Account</div>
                  <div className="text-[14px] leading-tight font-medium text-gray-900 mt-1">{expense.expenseAccount || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Paid Through</div>
                  <div className="text-[14px] leading-tight font-medium text-gray-900 mt-1">{expense.paidThrough || "-"}</div>
                </div>
                <div className="border-l-2 border-[#f59e0b] pl-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Start On</span>
                    <span className="font-semibold text-gray-900">{formatDate(expense.startDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1.5">
                    <span className="text-gray-500">Ends On</span>
                    <span className="font-semibold text-gray-900">{expense.neverExpire ? "Goes on forever" : formatDate(expense.endDate)}</span>
                  </div>
                </div>
              </div>

              <section className="mt-4">
                <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Other Details</h3>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="grid grid-cols-[180px_1fr]">
                    <span className="text-gray-500">Location</span>
                    <span className="text-gray-900">{expense.location || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[180px_1fr]">
                    <span className="text-gray-500">Customer</span>
                    <span className="text-[#2f66d0]">{expense.customerName || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[180px_1fr]">
                    <span className="text-gray-500">Project Name</span>
                    <span className="text-[#2f66d0]">{expense.projectName || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[180px_1fr]">
                    <span className="text-gray-500">Tax Amount</span>
                    <span className="text-gray-900">{taxLabel}</span>
                  </div>
                  <div className="grid grid-cols-[180px_1fr]">
                    <span className="text-gray-500">Notes</span>
                    <span className="text-gray-900">{expense.notes || "-"}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowAssociatedTags((prev) => !prev)}
                  className="mt-4 w-full flex items-center gap-2 text-left border-t border-b border-gray-200 py-2.5 text-[14px] leading-none text-gray-900"
                >
                  <ChevronDown size={16} className={`transition-transform ${showAssociatedTags ? "rotate-180" : ""}`} />
                  Associated Tags
                </button>
                {showAssociatedTags && (
                  <div className="pt-3 flex flex-wrap gap-2">
                    {Array.isArray(expense.reportingTags) && expense.reportingTags.length > 0 ? (
                      expense.reportingTags
                        .filter((tag: any) => String(tag?.value || "").trim())
                        .map((tag: any, idx: number) => (
                          <span key={`${tag?.tagId || idx}`} className="px-2.5 py-1 rounded border border-gray-300 bg-gray-50 text-sm text-gray-700">
                            {tag?.name || "Tag"}: {tag?.value}
                          </span>
                        ))
                    ) : (
                      <span className="text-sm text-gray-500">No associated tags.</span>
                    )}
                  </div>
                )}
              </section>

              <section className="mt-6 bg-[#f8f9fb] border-t border-gray-200 px-3 py-4">
                <h3 className="text-base font-semibold text-gray-900 uppercase">History</h3>
                <div className="mt-3 flex items-start gap-3">
                  <div className="text-xs text-gray-500 min-w-[160px]">{formatDateTime(expense.createdAt)}</div>
                  <div className="h-6 w-6 rounded-full border border-[#f4c35a] bg-[#fff9e6] flex items-center justify-center text-[#cc9a2e]">✎</div>
                  <div>
                    <div className="text-xs text-gray-900">Recurring expense created for {amountCode}{amountValue}</div>
                    <div className="text-xs text-gray-500">by {expense.createdBy || "System"}</div>
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Attachments</h3>
                  <button onClick={() => fileInputRef.current?.click()} disabled={savingAttachments} className="h-8 px-3 border border-gray-300 rounded bg-white hover:bg-gray-50 text-sm flex items-center gap-1">
                    <Upload size={14} /> {savingAttachments ? "Saving..." : "Upload"}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onUploadFiles} />
                <div className="border border-gray-200 rounded-md">
                  {attachments.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No attachments uploaded.</div>
                  ) : (
                    attachments.map((file: any, index: number) => (
                      <div key={file.id} className={`px-3 py-2 flex items-center justify-between gap-3 ${index < attachments.length - 1 ? "border-b border-gray-100" : ""}`}>
                        <button type="button" onClick={() => window.open(file.url, "_blank", "noopener,noreferrer")} className="text-sm text-[#156372] hover:underline text-left">
                          {file.name}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                          <button onClick={() => void removeAttachment(file.id)} disabled={savingAttachments} className="text-gray-500 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === "All Expenses" && (
            <div className="px-6 py-5">
              {loadingGenerated ? (
                <div className="text-sm text-gray-500">Loading expenses...</div>
              ) : generatedExpenses.length === 0 ? (
                <div className="text-sm text-gray-500">No generated expenses yet.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="text-left p-2 text-xs font-semibold text-gray-600 uppercase">Reference</th>
                      <th className="text-left p-2 text-xs font-semibold text-gray-600 uppercase">Account</th>
                      <th className="text-right p-2 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedExpenses.map((row: any, index: number) => (
                      <tr key={row.expense_id || row._id || index} onClick={() => navigate(`/expenses/${row.expense_id || row._id}`)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                        <td className="p-2 text-sm text-gray-700">{formatDate(row.date)}</td>
                        <td className="p-2 text-sm text-[#156372]">{row.reference_number || "-"}</td>
                        <td className="p-2 text-sm text-gray-700">{row.account_name || "-"}</td>
                        <td className="p-2 text-sm text-gray-900 text-right">{(baseCurrencyCode || row.currency_code || "USD")}{Number(row.total || row.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
