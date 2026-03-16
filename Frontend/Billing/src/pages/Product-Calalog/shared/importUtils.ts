export const MAX_IMPORT_FILE_SIZE = 25 * 1024 * 1024;
export const ACCEPTED_IMPORT_EXTENSIONS = [".csv", ".tsv", ".xls"];

export const getFileExtension = (fileName: string) => `.${(fileName.split(".").pop() || "").toLowerCase()}`;
export const normalizeImportText = (value: string) => String(value || "").trim().toLowerCase();

export const parseImportNumber = (value: string) => {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const parseImportTableText = (input: string, delimiter: "," | "\t") => {
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

const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildImportExcelTable = (headers: string[], rows: string[][]) => {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
};

const escapeCsv = (value: string) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const buildImportCsv = (headers: string[], rows: string[][]) =>
  [headers, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
