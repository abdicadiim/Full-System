import React, { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, Info, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const PLANS_STORAGE_KEY = "inv_plans_v1";
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".xls"];

type Step = 1 | 2 | 3;
type FieldDef = { key: string; label: string; required?: boolean; aliases: string[] };
type MappedRecord = Record<string, string>;

const SAMPLE_HEADERS = [
  "Product Name",
  "Plan Name",
  "Plan Code",
  "Description",
  "Status",
  "Status Formatted",
  "Pricing Scheme",
  "Bill Every",
  "Billing Interval Formatted",
  "Billing Cycle",
  "Trial Days",
  "Setup Fee",
  "Setup Fee Account",
  "Price",
  "Account",
  "Tax Name",
  "Tax Percentage",
];

const SAMPLE_ROWS = [
  [
    "Cloud Box",
    "BASIC",
    "bas042",
    "Mailbox Storage-5GB/User& Docs Storage-5GB/User",
    "Active",
    "",
    "unit",
    "1 Weeks",
    "4",
    "0",
    "0",
    "1",
    "General Income",
    "49",
    "Sales",
    "",
    "",
  ],
  [
    "Cloud Box",
    "STANDARD",
    "std013",
    "Mailbox Storage-10GB/User& Docs Storage-5GB/User",
    "Active",
    "",
    "unit",
    "1 Weeks",
    "4",
    "0",
    "0",
    "1",
    "Sales",
    "99",
    "General Income",
    "",
    "",
  ],
  [
    "Cloud Box",
    "PROFESSIONAL",
    "pro080",
    "Mailbox Storage-100GB/User& Docs Storage-50GB/User",
    "Active",
    "",
    "flat",
    "1 Weeks",
    "Infinite",
    "0",
    "0",
    "5",
    "Sales",
    "150",
    "Sales",
    "Service Tax",
    "12.5",
  ],
  [
    "Cloud Box",
    "ENTERPRISE",
    "etp099",
    "Mailbox Storage-25GB/User& Docs Storage-250GB/User",
    "Active",
    "",
    "unit",
    "1 Years",
    "Infinite",
    "5",
    "5",
    "10",
    "General Income",
    "800",
    "Sales",
    "Service Tax",
    "12.5",
  ],
  [
    "Cloud Box",
    "ULTIMATE",
    "ult007",
    "Mailbox Storage-100GB/User& Docs Storage-500GB/User",
    "Active",
    "",
    "flat",
    "1 Months",
    "Infinite",
    "20",
    "20",
    "30",
    "General Income",
    "499",
    "Sales",
    "Grouped Tax",
    "25",
  ],
];

const IMPORT_FIELDS: FieldDef[] = [
  { key: "planCode", label: "Plan Code", required: true, aliases: ["plan code", "code"] },
  { key: "productName", label: "Product Name", required: true, aliases: ["product name", "product"] },
  { key: "planName", label: "Plan Name", required: true, aliases: ["plan name", "name", "plan"] },
  { key: "description", label: "Description", aliases: ["description", "desc"] },
  { key: "status", label: "Status", aliases: ["status"] },
  { key: "statusFormatted", label: "Status Formatted", aliases: ["status formatted"] },
  { key: "showInWidget", label: "Show in Widget", aliases: ["show in widget", "widget"] },
  { key: "showInPortal", label: "Show in Portal", aliases: ["show in portal", "portal"] },
  { key: "storeDescription", label: "Store Description", aliases: ["store description"] },
  { key: "storeMarkupDescription", label: "Store Markup Description", aliases: ["store markup description"] },
  { key: "billEvery", label: "Bill Every", required: true, aliases: ["bill every", "billing frequency", "every"] },
  { key: "billingInterval", label: "Billing Interval", aliases: ["billing interval", "interval"] },
  { key: "billingIntervalFormatted", label: "Billing Interval Formatted", aliases: ["billing interval formatted"] },
  { key: "billingCycle", label: "Billing Cycle", aliases: ["billing cycle", "billing cycles", "cycles"] },
  { key: "trialDays", label: "Trial Days", aliases: ["trial days", "free trial"] },
  { key: "productType", label: "Product Type", aliases: ["product type", "type"] },
  { key: "account", label: "Account", aliases: ["account", "sales account"] },
  { key: "setupFeeAccount", label: "Setup Fee Account", aliases: ["setup fee account"] },
  { key: "taxName", label: "Tax Name", aliases: ["tax name", "tax"] },
  { key: "taxType", label: "Tax Type", aliases: ["tax type"] },
  { key: "taxPercentage", label: "Tax Percentage", aliases: ["tax percentage", "tax %"] },
  { key: "setupFee", label: "Setup Fee", aliases: ["setup fee"] },
  { key: "pricingScheme", label: "Pricing Scheme", aliases: ["pricing scheme", "for pricing scheme", "pricing model"] },
  { key: "price", label: "Price", required: true, aliases: ["price", "setup fee price", "rate"] },
];

const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildExcelTable = (headers: string[], rows: string[][]) => {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
};
const getExtension = (fileName: string) => `.${(fileName.split(".").pop() || "").toLowerCase()}`;
const normalize = (value: string) => String(value || "").trim().toLowerCase();

const parseNumber = (value: string) => {
  const cleaned = String(value || "").replace(/[^0-9.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
};

const toBillingPeriod = (value: string) => {
  const v = normalize(value);
  if (v.startsWith("day")) return "Day(s)";
  if (v.startsWith("week")) return "Week(s)";
  if (v.startsWith("year")) return "Year(s)";
  return "Month(s)";
};

const parseTextTable = (input: string, delimiter: "," | "\t") => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
};

const autoMapFields = (headers: string[]) => {
  const map: Record<string, string> = {};

  IMPORT_FIELDS.forEach((field) => {
    const exact = headers.find((header) => field.aliases.some((alias) => normalize(alias) === normalize(header)));
    if (exact) {
      map[field.key] = exact;
      return;
    }
    const includes = headers.find((header) => field.aliases.some((alias) => normalize(header).includes(normalize(alias))));
    if (includes) map[field.key] = includes;
  });

  return map;
};

function StepBadge({ step, current, label }: { step: Step; current: Step; label: string }) {
  const done = step < current;
  const active = step === current;
  return (
    <div className={`flex items-center gap-2 ${!active && !done ? "text-[#c0c7d8]" : "text-[#111827]"}`}>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
          done ? "bg-[#16a34a] text-white" : active ? "bg-[#3b82f6] text-white" : "border border-[#d7dce8]"
        }`}
      >
        {done ? <Check size={14} /> : step}
      </span>
      <span className={`${active ? "font-semibold" : "font-medium"}`}>{label}</span>
    </div>
  );
}

export default function ImportPlansPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [saveSelections, setSaveSelections] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);

  const requiredFields = IMPORT_FIELDS.filter((field) => field.required);
  const hasMissingRequired = requiredFields.some((field) => !mappings[field.key]);

  const preview = useMemo(() => {
    const getMapped = (row: string[], fieldKey: string) => {
      const mappedHeader = mappings[fieldKey];
      if (!mappedHeader) return "";
      const idx = headers.indexOf(mappedHeader);
      return idx >= 0 ? String(row[idx] || "").trim() : "";
    };

    const ready: MappedRecord[] = [];
    const skipped: { rowIndex: number; reason: string; data: MappedRecord }[] = [];

    rows.forEach((row, idx) => {
      const data: MappedRecord = {};
      IMPORT_FIELDS.forEach((field) => {
        data[field.key] = getMapped(row, field.key);
      });

      const missing = requiredFields.filter((field) => !String(data[field.key] || "").trim()).map((field) => field.label);
      if (missing.length) {
        skipped.push({ rowIndex: idx + 2, reason: `Missing required fields: ${missing.join(", ")}`, data });
      } else {
        ready.push(data);
      }
    });

    const unmappedFields = IMPORT_FIELDS.filter((field) => !mappings[field.key]).map((field) => field.label);

    return {
      ready,
      skipped,
      unmappedFields,
    };
  }, [rows, headers, mappings, requiredFields]);

  const validateFile = (file: File) => {
    const ext = getExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error("Please use CSV, TSV or XLS file format.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Maximum file size is 25 MB.");
      return false;
    }
    return true;
  };

  const parseFile = async (file: File) => {
    setIsReading(true);
    try {
      const text = await file.text();
      const firstLine = (text.split(/\r?\n/).find((line) => line.trim()) || "").trim();
      const delimiter: "," | "\t" = firstLine.includes("\t") ? "\t" : ",";
      const parsed = parseTextTable(text, delimiter);
      if (!parsed.length || parsed.length < 2) {
        toast.error("Could not read file headers or rows.");
        return false;
      }

      const fileHeaders = parsed[0].map((header) => header.trim());
      setHeaders(fileHeaders);
      setRows(parsed.slice(1));
      setMappings(autoMapFields(fileHeaders));
      return true;
    } catch (error) {
      console.error("Failed to parse file", error);
      toast.error("Failed to parse file. Please verify the format.");
      return false;
    } finally {
      setIsReading(false);
    }
  };

  const onPickFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!validateFile(file)) return;

    const ok = await parseFile(file);
    if (!ok) return;

    setSelectedFile(file);
    setStep(1);
  };

  const handleDownloadSample = () => {
    const content = buildExcelTable(SAMPLE_HEADERS, SAMPLE_ROWS);
    const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plans-import-sample.xls";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedFile) {
        toast.error("Please select a file first.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (hasMissingRequired) {
        toast.error("Please map all required fields.");
        return;
      }
      setStep(3);
    }
  };

  const handlePrevious = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleImport = () => {
    if (!preview.ready.length) {
      toast.error("No valid plan rows to import.");
      return;
    }

    try {
      const raw = localStorage.getItem(PLANS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const existing = Array.isArray(parsed) ? parsed : [];

      const prepared = preview.ready.map((row) => {
        const billEvery = row.billEvery || "1";
        const billingInterval = toBillingPeriod(row.billingInterval || "Month(s)");
        const price = parseNumber(row.price);
        return {
          id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          product: row.productName,
          planName: row.planName,
          planCode: row.planCode,
          planDescription: row.description || "",
          status: row.status || "Active",
          pricingModel: row.pricingScheme || "Unit",
          billingFrequency: `${billEvery} ${String(billingInterval).toLowerCase()}`,
          billingFrequencyValue: billEvery,
          billingFrequencyPeriod: billingInterval,
          billingCyclesCount: row.billingCycle || "",
          freeTrialDays: parseNumber(row.trialDays),
          setupFee: parseNumber(row.setupFee),
          salesTax: row.taxName || "",
          price,
          account: row.account || "",
          type: row.productType || "Service",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify([...prepared, ...existing]));
      toast.success(`${prepared.length} plan(s) imported successfully.`);
      navigate("/products/plans");
    } catch (error) {
      console.error("Failed to import plans", error);
      toast.error("Failed to import plans.");
    }
  };

  const stepTitle = step === 1 ? "Plans - Select File" : step === 2 ? "Map Fields" : "Preview";

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#f6f7fb] p-4 md:p-6">
      <div className="rounded-lg border border-[#d8deea] bg-white">
        <div className="relative border-b border-[#e3e7f2] px-4 py-4 md:px-6">
          <h1 className="text-center text-[32px] font-medium text-[#111827]">{stepTitle}</h1>
          <button type="button" onClick={() => navigate("/products/plans")} className="absolute right-4 top-4 text-[#ef4444] hover:text-[#dc2626]">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-[#e3e7f2] px-4 py-5 md:px-6">
          <div className="mx-auto flex w-full max-w-[560px] items-center justify-center gap-3 text-sm">
            <StepBadge step={1} current={step} label="Configure" />
            <div className="h-px w-8 bg-[#d1d5db]" />
            <StepBadge step={2} current={step} label="Map Fields" />
            <div className="h-px w-8 bg-[#d1d5db]" />
            <StepBadge step={3} current={step} label="Preview" />
          </div>
        </div>

        {step === 1 ? (
          <div className="px-4 py-8 md:px-6">
            <div className="mx-auto w-full max-w-[700px] space-y-6">
              <div
                className="rounded-lg border border-dashed border-[#d8deea] bg-[#fafbff] p-8 text-center"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPickFile(e.dataTransfer.files?.[0]);
                }}
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef1f8] text-[#7c869a]">
                  <Upload size={24} />
                </div>

                <p className="text-[30px] font-medium text-[#111827]">Drag and drop file to import</p>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded bg-[#22b573] px-5 py-2 text-sm font-medium text-white hover:bg-[#1ea266]"
                  >
                    Choose File
                    <ChevronDown size={14} />
                  </button>
                </div>

                <p className="mt-4 text-xs text-[#6b7280]">Maximum File Size: 25 MB • File Format: CSV or TSV or XLS</p>

                {selectedFile ? <p className="mt-3 text-sm font-medium text-[#1f2937]">Selected: {selectedFile.name}</p> : null}

                <input ref={fileInputRef} type="file" hidden accept=".csv,.tsv,.xls" onChange={(e) => onPickFile(e.target.files?.[0])} />
              </div>

              <p className="text-sm text-[#334155]">
                Download a{" "}
                <button type="button" onClick={handleDownloadSample} className="text-[#2563eb] hover:underline">
                  sample file
                </button>{" "}
                and compare it to your import file to ensure you have the file perfect for the import.
              </p>

              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[220px_1fr]">
                <label className="inline-flex items-center gap-1.5 text-sm text-[#111827]">
                  Character Encoding
                  <HelpCircle size={14} className="text-[#9aa3b5]" />
                </label>
                <div className="relative">
                  <select
                    value={characterEncoding}
                    onChange={(e) => setCharacterEncoding(e.target.value)}
                    className="h-10 w-full rounded border border-[#cfd5e3] bg-white px-3 pr-8 text-sm text-[#1f2937] outline-none focus:border-[#3b82f6]"
                  >
                    <option>UTF-8 (Unicode)</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                </div>
              </div>

              <div className="rounded-lg bg-[#f1f4fa] p-5">
                <h3 className="mb-3 text-[20px] font-medium text-[#111827]">Page Tips</h3>
                <ul className="list-disc space-y-2 pl-5 text-sm text-[#334155]">
                  <li>If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.</li>
                  <li>You can configure your import settings and save them for future too.</li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="px-4 py-8 md:px-6">
            <div className="mx-auto w-full max-w-[1060px]">
              <p className="mb-4 text-[24px] text-[#111827]">
                Your Selected File : <span className="font-medium">{selectedFile?.name}</span>
              </p>

              <div className="mb-6 flex items-start gap-3 rounded-lg bg-[#e8effa] px-4 py-3 text-sm text-[#334155]">
                <Info size={16} className="mt-0.5 text-[#3b82f6]" />
                <span>The best match to each field on the selected file have been auto-selected.</span>
              </div>

              <h2 className="mb-4 text-[20px] leading-none text-[#111827]">Others</h2>

              <div className="rounded border border-[#e3e7f2]">
                <div className="grid grid-cols-[260px_1fr] border-b border-[#e3e7f2] bg-[#f7f8fc] px-4 py-2 text-xs font-semibold uppercase text-[#64748b]">
                  <span>Taban Billing Field</span>
                  <span>Imported File Headers</span>
                </div>

                <div className="bg-white">
                  {IMPORT_FIELDS.map((field) => {
                    const selectedValue = mappings[field.key] || "";
                    return (
                      <div key={field.key} className="grid grid-cols-[260px_1fr] items-center gap-4 px-4 py-2.5">
                        <label className={`text-[16px] ${field.required ? "text-[#ef4444]" : "text-[#111827]"}`}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </label>

                        <div className="relative max-w-[340px]">
                          <select
                            value={selectedValue}
                            onChange={(e) => setMappings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            className="h-10 w-full rounded border border-[#cfd5e3] bg-white px-3 pr-16 text-[16px] text-[#1f2937] outline-none focus:border-[#3b82f6]"
                          >
                            <option value="">Select</option>
                            {headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                          {selectedValue ? (
                            <button
                              type="button"
                              onClick={() => setMappings((prev) => ({ ...prev, [field.key]: "" }))}
                              className="absolute right-10 top-1/2 -translate-y-1/2 text-[#ef4444] hover:text-[#dc2626]"
                              title="Clear"
                            >
                              <X size={14} />
                            </button>
                          ) : null}
                          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="mt-6 inline-flex items-center gap-2 text-sm text-[#111827]">
                <input
                  type="checkbox"
                  checked={saveSelections}
                  onChange={(e) => setSaveSelections(e.target.checked)}
                  className="h-4 w-4 rounded border-[#cfd5e3]"
                />
                Save these selections for use during future imports.
              </label>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="px-4 py-8 md:px-6">
            <div className="mx-auto w-full max-w-[1060px]">
              <div className="mb-6 rounded-lg bg-[#e8effa] px-4 py-3 text-sm text-[#334155]">
                All Plans in your file are ready to be imported
              </div>

              <div className="divide-y divide-[#e3e7f2] border-y border-[#e3e7f2]">
                <div className="flex items-center justify-between py-3 text-[18px] text-[#334155]">
                  <div>Plans that are ready to be imported - {preview.ready.length}</div>
                  <button type="button" onClick={() => setShowReadyDetails((v) => !v)} className="inline-flex items-center gap-1 text-sm text-[#6b8ef7]">
                    View Details {showReadyDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {showReadyDetails ? (
                  <div className="pb-3">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#f8fafc]">
                          <th className="border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#64748b]">Plan Name</th>
                          <th className="border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#64748b]">Product</th>
                          <th className="border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#64748b]">Plan Code</th>
                          <th className="border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#64748b]">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.ready.slice(0, 10).map((row, idx) => (
                          <tr key={`${row.planCode}-${idx}`}>
                            <td className="border border-[#e5e7eb] px-3 py-2 text-sm">{row.planName}</td>
                            <td className="border border-[#e5e7eb] px-3 py-2 text-sm">{row.productName}</td>
                            <td className="border border-[#e5e7eb] px-3 py-2 text-sm">{row.planCode}</td>
                            <td className="border border-[#e5e7eb] px-3 py-2 text-sm">{row.price || "0"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div className="flex items-center justify-between py-3 text-[18px] text-[#334155]">
                  <div className="inline-flex items-center gap-2"><AlertTriangle size={14} className="text-[#f59e0b]" />No. of Records skipped - {preview.skipped.length}</div>
                  <button type="button" onClick={() => setShowSkippedDetails((v) => !v)} className="inline-flex items-center gap-1 text-sm text-[#6b8ef7]">
                    View Details {showSkippedDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {showSkippedDetails ? (
                  <div className="pb-3">
                    {preview.skipped.length === 0 ? (
                      <p className="text-sm text-[#64748b]">No skipped rows.</p>
                    ) : (
                      <ul className="space-y-2 text-sm text-[#334155]">
                        {preview.skipped.map((entry) => (
                          <li key={entry.rowIndex}>Row {entry.rowIndex}: {entry.reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <div className="flex items-center justify-between py-3 text-[18px] text-[#334155]">
                  <div className="inline-flex items-center gap-2"><AlertTriangle size={14} className="text-[#f59e0b]" />Unmapped Fields</div>
                  <button type="button" onClick={() => setShowUnmappedDetails((v) => !v)} className="inline-flex items-center gap-1 text-sm text-[#6b8ef7]">
                    View Details {showUnmappedDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {showUnmappedDetails ? (
                  <div className="pb-3">
                    {preview.unmappedFields.length === 0 ? (
                      <p className="text-sm text-[#64748b]">No unmapped fields.</p>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-[#334155]">
                        {preview.unmappedFields.map((field) => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-[#e3e7f2] bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevious}
                className="rounded border border-[#cfd5e3] bg-white px-5 py-2 text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                Previous
              </button>
            ) : null}

            {step < 3 ? (
              <button
                type="button"
                disabled={isReading || (step === 1 && !selectedFile) || (step === 2 && hasMissingRequired)}
                onClick={handleNext}
                className="rounded bg-[#22b573] px-6 py-2 text-sm font-medium text-white hover:bg-[#1ea266] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReading ? "Reading..." : "Next"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!preview.ready.length}
                onClick={handleImport}
                className="rounded bg-[#22b573] px-6 py-2 text-sm font-medium text-white hover:bg-[#1ea266] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Import
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/products/plans")}
            className="rounded border border-[#cfd5e3] bg-white px-6 py-2 text-sm text-[#111827] hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

