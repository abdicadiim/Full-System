import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronRight, Upload, Lightbulb, Info, Check, AlertTriangle } from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../services/auth";
import { parseImportFile } from "../../../../utils/importFileParser";

type ImportField = {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
};

type PreviewRow = {
  rowNumber: number;
  status: "ready" | "skipped";
  reason?: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate?: number;
  asOfDate?: string;
  isBaseCurrency?: boolean;
  isActive?: boolean;
};

const IMPORT_FIELDS: ImportField[] = [
  {
    key: "code",
    label: "Currency Code",
    required: true,
    aliases: ["Code", "Currency", "CurrencyCode", "Currency Code"],
  },
  {
    key: "name",
    label: "Currency Name",
    required: true,
    aliases: ["Name", "Currency Name", "CurrencyName"],
  },
  {
    key: "symbol",
    label: "Symbol",
    required: true,
    aliases: ["Sign", "Currency Symbol", "CurrencySymbol"],
  },
  {
    key: "exchangeRate",
    label: "Exchange Rate",
    required: false,
    aliases: ["Rate", "Exchange Rate", "Rate (Base)", "ExchangeRate"],
  },
  {
    key: "asOfDate",
    label: "As Of Date",
    required: false,
    aliases: ["Date", "As Of", "AsOfDate", "Rate Date"],
  },
  {
    key: "isBaseCurrency",
    label: "Is Base Currency",
    required: false,
    aliases: ["Base", "Base Currency", "IsBaseCurrency"],
  },
  {
    key: "isActive",
    label: "Is Active",
    required: false,
    aliases: ["Active", "Status", "IsActive"],
  },
];

const normalizeKey = (value: any) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const parseBoolean = (value: any): boolean | undefined => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (["true", "yes", "1", "y"].includes(normalized)) return true;
  if (["false", "no", "0", "n"].includes(normalized)) return false;
  return undefined;
};

const parseDate = (raw: any): string | undefined => {
  const value = String(raw || "").trim();
  if (!value) return undefined;

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(value)) {
    const [y, m, d] = value.split(/[-/]/);
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(value)) {
    const [d, m, y] = value.split(/[-/.]/);
    const fullYear = y.length === 2 ? `20${y}` : y;
    return `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
};

const toCsvCell = (value: any) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export default function ImportExchangeRates() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8");
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);

  const requiredFields = useMemo(
    () => IMPORT_FIELDS.filter((field) => field.required).map((field) => field.key),
    []
  );

  const missingRequiredMappings = useMemo(
    () => requiredFields.filter((key) => !fieldMappings[key]),
    [fieldMappings, requiredFields]
  );

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!parsedRows.length) return [];

    const getValue = (row: Record<string, any>, field: ImportField) => {
      const mappedHeader = fieldMappings[field.key];
      if (mappedHeader && row[mappedHeader] !== undefined && row[mappedHeader] !== null) {
        return String(row[mappedHeader]).trim();
      }

      const rowKeys = Object.keys(row || {});
      const aliases = [field.label, ...field.aliases];
      for (const alias of aliases) {
        const match = rowKeys.find((rowKey) => normalizeKey(rowKey) === normalizeKey(alias));
        if (match && row[match] !== undefined && row[match] !== null) {
          return String(row[match]).trim();
        }
      }

      return "";
    };

    return parsedRows.map((row, index) => {
      const rowNumber = index + 2;
      const code = getValue(row, IMPORT_FIELDS[0]).toUpperCase();
      const name = getValue(row, IMPORT_FIELDS[1]);
      const symbol = getValue(row, IMPORT_FIELDS[2]);
      const exchangeRateRaw = getValue(row, IMPORT_FIELDS[3]);
      const asOfDateRaw = getValue(row, IMPORT_FIELDS[4]);
      const isBaseRaw = getValue(row, IMPORT_FIELDS[5]);
      const isActiveRaw = getValue(row, IMPORT_FIELDS[6]);

      if (!code || !name || !symbol) {
        return {
          rowNumber,
          status: "skipped",
          reason: "Missing required currency fields",
          code,
          name,
          symbol,
        };
      }

      if (!/^[A-Z]{3,50}$/.test(code)) {
        return {
          rowNumber,
          status: "skipped",
          reason: "Currency code must be 3+ uppercase letters",
          code,
          name,
          symbol,
        };
      }

      let exchangeRate: number | undefined;
      if (exchangeRateRaw) {
        const parsedRate = Number.parseFloat(String(exchangeRateRaw).replace(/,/g, ""));
        if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
          return {
            rowNumber,
            status: "skipped",
            reason: "Invalid exchange rate",
            code,
            name,
            symbol,
          };
        }
        exchangeRate = parsedRate;
      }

      const asOfDate = parseDate(asOfDateRaw);
      if (asOfDateRaw && !asOfDate) {
        return {
          rowNumber,
          status: "skipped",
          reason: "Invalid date format",
          code,
          name,
          symbol,
        };
      }

      const isBaseCurrency = parseBoolean(isBaseRaw);
      const isActive = parseBoolean(isActiveRaw);

      return {
        rowNumber,
        status: "ready",
        code,
        name,
        symbol,
        exchangeRate,
        asOfDate,
        isBaseCurrency,
        isActive,
      };
    });
  }, [parsedRows, fieldMappings]);

  const readyRows = useMemo(() => previewRows.filter((row) => row.status === "ready"), [previewRows]);
  const skippedRows = useMemo(() => previewRows.filter((row) => row.status === "skipped"), [previewRows]);
  const isPreviewReady = missingRequiredMappings.length === 0 && readyRows.length > 0;

  const resetImportState = () => {
    setHeaders([]);
    setParsedRows([]);
    setFieldMappings({});
    setCurrentStep(1);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
    if (![".csv", ".tsv", ".xls", ".xlsx"].includes(extension)) {
      alert("Please select a CSV, TSV, XLS, or XLSX file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert("File size must be less than 25 MB.");
      return;
    }

    setSelectedFile(file);
    resetImportState();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const extension = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
    if (![".csv", ".tsv", ".xls", ".xlsx"].includes(extension)) {
      alert("Please select a CSV, TSV, XLS, or XLSX file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert("File size must be less than 25 MB.");
      return;
    }

    setSelectedFile(file);
    resetImportState();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const downloadSampleFile = () => {
    const sampleRows = [
      {
        "Currency Code": "USD",
        "Currency Name": "United States Dollar",
        Symbol: "$",
        "Exchange Rate": "1",
        "As Of Date": new Date().toISOString().slice(0, 10),
        "Is Base Currency": "TRUE",
        "Is Active": "TRUE",
      },
      {
        "Currency Code": "EUR",
        "Currency Name": "Euro",
        Symbol: "EUR",
        "Exchange Rate": "0.92",
        "As Of Date": new Date().toISOString().slice(0, 10),
        "Is Base Currency": "FALSE",
        "Is Active": "TRUE",
      },
    ];

    const headers = Object.keys(sampleRows[0]);
    const lines = [
      headers.join(","),
      ...sampleRows.map((row) => headers.map((header) => toCsvCell((row as any)[header])).join(",")),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "currency_import_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleNext = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    if (currentStep === 1) {
      try {
        const { headers: parsedHeaders, rows } = await parseImportFile(selectedFile as File);
        const safeHeaders = Array.isArray(parsedHeaders) ? parsedHeaders.filter(Boolean) : [];
        const safeRows = Array.isArray(rows) ? rows : [];

        if (safeHeaders.length === 0 || safeRows.length === 0) {
          alert("Could not read any rows from the file.");
          return;
        }

        const autoMappings: Record<string, string> = {};
        IMPORT_FIELDS.forEach((field) => {
          const candidates = [field.label, ...field.aliases];
          const match = safeHeaders.find((header) =>
            candidates.some((candidate) => normalizeKey(candidate) === normalizeKey(header))
          );
          if (match) autoMappings[field.key] = match;
        });

        setHeaders(safeHeaders);
        setParsedRows(safeRows as Record<string, any>[]);
        setFieldMappings(autoMappings);
        setCurrentStep(2);
      } catch (error: any) {
        console.error("Error parsing currency import file:", error);
        alert(error?.message || "Failed to parse file.");
      }
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((step) => step - 1);
    }
  };

  const handleImport = async () => {
    if (!isPreviewReady) {
      alert("Please fix mapping/validation errors before importing.");
      return;
    }

    setIsImporting(true);
    try {
      const stored = localStorage.getItem("taban_currencies");
      const currenciesData = stored ? JSON.parse(stored) : [];

      const existingByCode = new Map<string, any>();
      currenciesData.forEach((currency: any) => {
        existingByCode.set(String(currency.code || "").toUpperCase(), currency);
      });

      const baseCandidates = readyRows
        .filter((row) => row.isBaseCurrency === true)
        .map((row) => row.code);
      const forcedBaseCode = baseCandidates.length > 0 ? baseCandidates[0] : null;

      let successCount = 0;
      const failures: string[] = [];

      for (const row of readyRows) {
        let existingCurrency = existingByCode.get(row.code);
        const payload: any = {
          code: row.code,
          name: row.name,
          symbol: row.symbol,
          isBaseCurrency: forcedBaseCode ? row.code === forcedBaseCode : false,
        };

        if (row.isActive !== undefined) {
          payload.isActive = row.isActive;
        }

        try {
          if (!existingCurrency) {
            existingCurrency = {
              id: "curr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
              _id: "curr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
              isBase: payload.isBaseCurrency,
              exchangeRates: []
            };
          } else {
            if (payload.isBaseCurrency) {
              currenciesData.forEach((c: any) => { c.isBase = false; c.isBaseCurrency = false; });
            }
          }
          const updatedCurrency = { ...existingCurrency, ...payload, isBase: payload.isBaseCurrency };

          if (row.exchangeRate && row.exchangeRate > 0) {
            const rates = updatedCurrency.exchangeRates || [];
            rates.push({
              _id: "rate_" + Date.now() + Math.random().toString(36).substring(2, 9),
              date: row.asOfDate || new Date().toISOString().slice(0, 10),
              rate: row.exchangeRate
            });
            updatedCurrency.exchangeRates = rates;
          }

          if (existingByCode.has(row.code)) {
            const idx = currenciesData.findIndex((c: any) => String(c.code).toUpperCase() === String(row.code).toUpperCase());
            if (idx >= 0) currenciesData[idx] = updatedCurrency;
          } else {
            currenciesData.push(updatedCurrency);
            existingByCode.set(row.code, updatedCurrency);
          }

          successCount += 1;
        } catch (rowError: any) {
          failures.push(`Row ${row.rowNumber} (${row.code}): ${rowError?.message || "Import failed"}`);
        }
      }

      localStorage.setItem("taban_currencies", JSON.stringify(currenciesData));

      if (failures.length > 0) {
        alert(`Imported ${successCount} row(s). ${failures.length} row(s) failed.\n\n${failures.slice(0, 10).join("\n")}`);
      } else {
        alert(`Successfully imported ${successCount} currency row(s).`);
      }

      navigate("/settings/currencies");
    } catch (error: any) {
      console.error("Currency import failed:", error);
      alert(error?.message || "Failed to import currencies.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[10000] overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {currentStep === 1 ? "Currencies - Select File" : currentStep === 2 ? "Map Fields" : "Preview"}
          </h1>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep > 1 ? "bg-emerald-500 text-white" : "bg-[#156372] text-white"}`}>
              {currentStep > 1 ? <Check size={12} className="inline" /> : "1"} Configure
            </span>
            <ChevronRight size={16} className="text-gray-500" />
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep > 2 ? "bg-emerald-500 text-white" : currentStep === 2 ? "bg-[#156372] text-white" : "bg-gray-200 text-gray-600"}`}>
              {currentStep > 2 ? <Check size={12} className="inline" /> : "2"} Map Fields
            </span>
            <ChevronRight size={16} className="text-gray-500" />
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep === 3 ? "bg-[#3b82f6] text-white" : "bg-gray-200 text-gray-600"}`}>
              3 Preview
            </span>
          </div>
        </div>
        <button onClick={() => navigate("/settings/currencies")} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      <div className={`p-8 overflow-y-auto flex-1 ${currentStep === 1 ? "max-w-2xl" : "max-w-5xl"} mx-auto w-full`}>
        {currentStep === 1 && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-12 text-center ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
            >
              <Upload size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-4">Drag and drop file to import</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-4">Maximum File Size: 25 MB • File Format: CSV, TSV, XLS, XLSX</p>
              {selectedFile && <p className="text-sm text-emerald-700 mt-2">Selected: {selectedFile.name}</p>}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Download a{" "}
              <button onClick={downloadSampleFile} className="text-blue-600 hover:underline">
                sample file
              </button>{" "}
              and compare it to your import file.
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Character Encoding</label>
                <Info size={14} className="text-gray-400" />
              </div>
              <select
                value={characterEncoding}
                onChange={(e) => setCharacterEncoding(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTF-8">UTF-8 (Unicode)</option>
                <option value="ISO-8859-1">ISO-8859-1</option>
                <option value="Windows-1252">Windows-1252</option>
              </select>
            </div>

            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Use one row per currency. Currency Code, Currency Name, and Symbol are required.</p>
                  <p>• You can also include exchange rates and the effective date in the same file.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-700">
              Map your file columns to currency fields
            </div>
            <div className="p-4 space-y-4">
              {IMPORT_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <select
                    value={fieldMappings[field.key] || ""}
                    onChange={(e) =>
                      setFieldMappings((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {missingRequiredMappings.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5" />
                  <span>
                    Required fields missing: {missingRequiredMappings.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-700">Ready to Import</div>
                <div className="text-xl font-semibold text-blue-900">{readyRows.length}</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs text-amber-700">Skipped Rows</div>
                <div className="text-xl font-semibold text-amber-900">{skippedRows.length}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-700">Total Rows</div>
                <div className="text-xl font-semibold text-gray-900">{previewRows.length}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-700">Preview</div>
              <div className="overflow-auto max-h-[420px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">Rate</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2">{row.code}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.symbol}</td>
                        <td className="px-3 py-2">{row.exchangeRate ?? ""}</td>
                        <td className="px-3 py-2">{row.asOfDate ?? ""}</td>
                        <td className="px-3 py-2">
                          {row.status === "ready" ? (
                            <span className="text-emerald-700">Ready</span>
                          ) : (
                            <span className="text-amber-700">Skipped: {row.reason}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Previous
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/settings/currencies")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={!selectedFile}
              className="px-4 py-2 text-sm font-medium text-white bg-[#156372] rounded-lg hover:bg-[#0f4f5b] disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={isImporting || !isPreviewReady}
              className="px-4 py-2 text-sm font-medium text-white bg-[#156372] rounded-lg hover:bg-[#0f4f5b] disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isImporting ? "Importing..." : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
