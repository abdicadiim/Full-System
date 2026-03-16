import React, { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, HelpCircle, Info, Upload, X, PencilLine } from "lucide-react";
import { toast } from "react-toastify";
import { useOrganizationBranding } from "../../../hooks/useOrganizationBranding";
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  MAX_IMPORT_FILE_SIZE,
  buildImportCsv,
  buildImportExcelTable,
  getFileExtension,
  normalizeImportText,
  parseImportTableText,
} from "./importUtils";

export type ImportStep = 1 | 2 | 3;
export type ImportMappedRecord = Record<string, string>;
export type ImportFieldDef = { key: string; label: string; required?: boolean; aliases: string[] };

interface ThreePhaseImportWizardProps {
  entityLabel: string;
  entityPluralLabel: string;
  sampleHeaders: string[];
  sampleRows: string[][];
  fields: ImportFieldDef[];
  sampleFileName: string;
  onCancel: () => void;
  onImport: (rows: ImportMappedRecord[]) => void;
}

const autoMapFields = (headers: string[], fields: ImportFieldDef[]) => {
  const map: Record<string, string> = {};
  fields.forEach((field) => {
    const exact = headers.find((header) => field.aliases.some((alias) => normalizeImportText(alias) === normalizeImportText(header)));
    if (exact) {
      map[field.key] = exact;
      return;
    }
    const includes = headers.find((header) => field.aliases.some((alias) => normalizeImportText(header).includes(normalizeImportText(alias))));
    if (includes) map[field.key] = includes;
  });
  return map;
};

function StepBadge({ step, current, label }: { step: ImportStep; current: ImportStep; label: string }) {
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
      <span className={active ? "font-semibold" : "font-medium"}>{label}</span>
    </div>
  );
}

export default function ThreePhaseImportWizard({
  entityLabel,
  entityPluralLabel,
  sampleHeaders,
  sampleRows,
  fields,
  sampleFileName,
  onCancel,
  onImport,
}: ThreePhaseImportWizardProps) {
  const { accentColor } = useOrganizationBranding();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isReading, setIsReading] = useState(false);
  const [saveSelections, setSaveSelections] = useState(false);
  const [dateFormat, setDateFormat] = useState("yyyy-MM-dd");

  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);

  const requiredFields = fields.filter((field) => field.required);
  const hasMissingRequired = requiredFields.some((field) => !mappings[field.key]);

  const preview = useMemo(() => {
    const getMapped = (row: string[], fieldKey: string) => {
      const mappedHeader = mappings[fieldKey];
      if (!mappedHeader) return "";
      const idx = headers.indexOf(mappedHeader);
      return idx >= 0 ? String(row[idx] || "").trim() : "";
    };

    const ready: ImportMappedRecord[] = [];
    const skipped: { rowIndex: number; reason: string; data: ImportMappedRecord }[] = [];

    rows.forEach((row, idx) => {
      const data: ImportMappedRecord = {};
      fields.forEach((field) => {
        data[field.key] = getMapped(row, field.key);
      });

      const missing = requiredFields.filter((field) => !String(data[field.key] || "").trim()).map((field) => field.label);
      if (missing.length) {
        skipped.push({ rowIndex: idx + 2, reason: `Missing required fields: ${missing.join(", ")}`, data });
      } else {
        ready.push(data);
      }
    });

    const unmappedFields = fields.filter((field) => !mappings[field.key]).map((field) => field.label);
    return { ready, skipped, unmappedFields };
  }, [rows, headers, mappings, fields, requiredFields]);

  const validateFile = (file: File) => {
    const ext = getFileExtension(file.name);
    if (!ACCEPTED_IMPORT_EXTENSIONS.includes(ext)) {
      toast.error("Please use CSV, TSV or XLS file format.");
      return false;
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
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
      const parsed = parseImportTableText(text, delimiter);
      if (!parsed.length || parsed.length < 2) {
        toast.error("Could not read file headers or rows.");
        return false;
      }
      const fileHeaders = parsed[0].map((header) => header.trim());
      setHeaders(fileHeaders);
      setRows(parsed.slice(1));
      setMappings(autoMapFields(fileHeaders, fields));
      return true;
    } catch (error) {
      console.error("Failed to parse import file", error);
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
    const ext = getFileExtension(sampleFileName);
    const isCsv = ext === ".csv";
    const content = isCsv ? buildImportCsv(sampleHeaders, sampleRows) : buildImportExcelTable(sampleHeaders, sampleRows);
    const blob = new Blob([content], {
      type: isCsv ? "text/csv;charset=utf-8;" : "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sampleFileName;
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
      toast.error(`No valid ${entityLabel.toLowerCase()} rows to import.`);
      return;
    }
    onImport(preview.ready);
  };

  const stepTitle = step === 1 ? `${entityPluralLabel} - Select File` : step === 2 ? "Map Fields" : "Preview";

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#f6f7fb] p-4 md:p-6">
      <div className="rounded-lg border border-[#d8deea] bg-white">
        <div className="relative border-b border-[#e3e7f2] px-4 py-4 md:px-6">
          <h1 className="text-center text-[32px] font-medium text-[#111827]">{stepTitle}</h1>
          <button type="button" onClick={onCancel} className="absolute right-4 top-4 text-[#ef4444] hover:text-[#dc2626]">
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
                    className="inline-flex items-center gap-2 rounded px-5 py-2 text-sm font-medium text-white hover:opacity-90"
                    style={{ backgroundColor: accentColor }}
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
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="px-4 py-8 md:px-6">
            <div className="mx-auto w-full max-w-[1060px]">
              <p className="mb-4 text-sm text-[#334155]">
                Your Selected File : <span className="font-medium">{selectedFile?.name}</span>
              </p>

              <div className="mb-6 flex items-start gap-3 rounded-lg bg-[#e8effa] px-4 py-3 text-sm text-[#334155]">
                <Info size={16} className="mt-0.5 text-[#3b82f6]" />
                <span>The best match to each field on the selected file have been auto-selected.</span>
              </div>

              <div className="mb-6 rounded-lg border border-[#e7ebf4] bg-[#f8f9fd] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#111827]">Default Data Formats</h2>
                  <button type="button" className="inline-flex items-center gap-1 text-xs text-[#2563eb] hover:underline">
                    <PencilLine size={12} />
                    Edit
                  </button>
                </div>
                <div className="text-xs text-[#64748b]">Date</div>
                <button type="button" className="mt-1 text-xs text-[#0f172a] hover:text-[#2563eb]">
                  Select format at field level
                </button>
              </div>

              <h2 className="mb-3 text-lg leading-none text-[#111827]">Others</h2>

              <div className="rounded border border-[#e3e7f2]">
                <div className="grid grid-cols-[260px_1fr] border-b border-[#e3e7f2] bg-[#f7f8fc] px-4 py-2 text-xs font-semibold uppercase text-[#64748b]">
                  <span>Taban Billing Field</span>
                  <span>Imported File Headers</span>
                </div>
                <div className="bg-white">
                  {fields.map((field) => {
                    const selectedValue = mappings[field.key] || "";
                    const isDateField =
                      field.key.toLowerCase().includes("date") ||
                      field.key.toLowerCase().includes("validtill") ||
                      field.key.toLowerCase().includes("expiration");
                    return (
                      <div key={field.key} className="grid grid-cols-[260px_1fr] items-center gap-4 px-4 py-2.5">
                        <label className={`text-[16px] ${field.required ? "text-[#ef4444]" : "text-[#111827]"}`}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative max-w-[340px]">
                            <select
                              value={selectedValue}
                              onChange={(e) => setMappings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              className="h-10 w-full rounded border border-[#cfd5e3] bg-white px-3 pr-16 text-[14px] text-[#1f2937] outline-none focus:border-[#3b82f6]"
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

                          {isDateField ? (
                            <>
                              <div className="relative w-[150px]">
                                <select
                                  value={dateFormat}
                                  onChange={(e) => setDateFormat(e.target.value)}
                                  className="h-10 w-full rounded border border-[#cfd5e3] bg-white px-3 pr-8 text-sm text-[#64748b] outline-none focus:border-[#3b82f6]"
                                >
                                  <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                                  <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                                  <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                                </select>
                                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                              </div>
                              <Info size={13} className="text-[#9aa3b5]" />
                            </>
                          ) : null}
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
                All {entityPluralLabel} in your file are ready to be imported
              </div>

              <div className="divide-y divide-[#e3e7f2] border-y border-[#e3e7f2]">
                <div className="flex items-center justify-between py-3 text-[18px] text-[#334155]">
                  <div>{entityPluralLabel} that are ready to be imported - {preview.ready.length}</div>
                  <button type="button" onClick={() => setShowReadyDetails((v) => !v)} className="inline-flex items-center gap-1 text-sm text-[#6b8ef7]">
                    View Details {showReadyDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {showReadyDetails ? (
                  <div className="pb-3">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#f8fafc]">
                          {fields.slice(0, 4).map((field) => (
                            <th key={field.key} className="border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#64748b]">
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.ready.slice(0, 10).map((row, idx) => (
                          <tr key={`ready-${idx}`}>
                            {fields.slice(0, 4).map((field) => (
                              <td key={field.key} className="border border-[#e5e7eb] px-3 py-2 text-sm">
                                {row[field.key] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div className="flex items-center justify-between py-3 text-[18px] text-[#334155]">
                  <div className="inline-flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[#f59e0b]" />
                    No. of Records skipped - {preview.skipped.length}
                  </div>
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
                  <div className="inline-flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[#f59e0b]" />
                    Unmapped Fields
                  </div>
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
                className="rounded px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                {isReading ? "Reading..." : "Next"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!preview.ready.length}
                onClick={handleImport}
                className="rounded px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                Import
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[#cfd5e3] bg-white px-6 py-2 text-sm text-[#111827] hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
