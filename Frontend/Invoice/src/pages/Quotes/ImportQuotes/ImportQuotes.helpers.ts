export type QuoteImportTagField = {
  name: string;
  required: boolean;
};

export type QuoteImportMapFieldSection = {
  title: string;
  fields: string[];
};

export type QuoteImportParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

export const encodingOptions = [
  "UTF-8 (Unicode)",
  "UTF-16 (Unicode)",
  "ISO-8859-1",
  "ISO-8859-2",
  "ISO-8859-9 (Turkish)",
  "GB2312 (Simplified Chinese)",
  "Big5 (Traditional Chinese)",
  "Shift_JIS (Japanese)"
];

export const baseMapFieldsList = [
  "Adjustment",
  "Adjustment Description",
  "Currency Code",
  "Customer Name",
  "Customer Number",
  "Discount",
  "Discount Amount",
  "Discount Type",
  "Entity Discount Amount",
  "Entity Discount Percent",
  "Exchange Rate",
  "Expiry Date",
  "Is Digital Service",
  "Is Discount Before Tax",
  "Is Tracked For MOSS",
  "Item Desc",
  "Item Name",
  "Item Price",
  "Item Tax1",
  "Item Tax1 %",
  "Item Tax1 Type",
  "Line Item Type",
  "Notes",
  "Coupon Code",
  "Item Code",
  "Project ID",
  "Project Name",
  "PurchaseOrder",
  "Quantity",
  "Quote Date",
  "Quote Number",
  "Quote Status",
  "Sales person",
  "Shipping Charge",
  "Shipping Charge Tax Name",
  "Shipping Charge Tax Type",
  "Shipping Charge Tax %",
  "SKU",
  "Template Name",
  "Terms & Conditions",
  "Usage unit"
];

export const requiredMapFields = ["Quote Number", "Quote Date", "Customer Name"];

export const quoteSampleHeaders = [
  "Quote Date",
  "Quote Number",
  "Expiry Date",
  "Quote Status",
  "Customer Name",
  "Is Tracked For MOSS",
  "Project Name",
  "Project ID",
  "PurchaseOrder",
  "Template Name",
  "Currency Code",
  "Exchange Rate",
  "Item Name",
  "SKU",
  "Item Desc",
  "Quantity",
  "Item Price",
  "Notes",
  "Terms & Conditions",
  "Sales person",
  "Shipping Charge",
  "Adjustment",
  "Adjustment Description",
  "Discount Type",
  "Is Discount Before Tax",
  "Entity Discount Percent",
  "Entity Discount Amount",
  "Usage unit",
  "Discount",
  "Discount Amount",
  "Item Tax1",
  "Item Tax1 Type",
  "Item Tax1 %",
  "Is Digital Service"
];

export const quoteSampleRow = [
  "2013-07-20",
  "QT-1",
  "2013-07-25",
  "Sent",
  "Flashter Inc.",
  "",
  "",
  "",
  "",
  "Classic",
  "USD",
  "1",
  "Samsung Galaxy S10 Plus Hard Case",
  "SAMHARD10",
  "Metal Black, Matt finish",
  "1",
  "5",
  "Looking forward for your business.",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "Standard Rate",
  "ItemAmount",
  "5",
  ""
];

const validImportFileTypes = [".csv", ".tsv", ".xls", ".xlsx"];
const maxImportFileSize = 25 * 1024 * 1024;

export const validateQuoteImportFile = (file: File) => {
  const fileExtension = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (!validImportFileTypes.includes(fileExtension)) {
    return "Please select a valid file format (CSV, TSV, or XLS).";
  }
  if (file.size > maxImportFileSize) {
    return "File size must be less than 25 MB.";
  }
  return null;
};

export const normalizeFieldKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const findBestHeaderMatch = (field: string, headers: string[]) => {
  const normalizedField = normalizeFieldKey(field);
  return (
    headers.find((header) => normalizeFieldKey(header) === normalizedField) ||
    headers.find((header) => normalizeFieldKey(header).includes(normalizedField)) ||
    headers.find((header) => normalizedField.includes(normalizeFieldKey(header))) ||
    ""
  );
};

export const normalizeReportingTagAppliesTo = (tag: any): string[] => {
  const direct = Array.isArray(tag?.appliesTo) ? tag.appliesTo : [];
  const fromModulesObject = tag?.modules && typeof tag.modules === "object"
    ? Object.keys(tag.modules).filter((key) => Boolean(tag.modules[key]))
    : [];
  const fromModuleSettings = tag?.moduleSettings && typeof tag.moduleSettings === "object"
    ? Object.keys(tag.moduleSettings).filter((key) => Boolean(tag.moduleSettings[key]))
    : [];
  const fromAssociations = Array.isArray(tag?.associations) ? tag.associations : [];
  const fromModulesList = Array.isArray(tag?.modulesList) ? tag.modulesList : [];

  return [...direct, ...fromModulesObject, ...fromModuleSettings, ...fromAssociations, ...fromModulesList]
    .map((value: any) => String(value || "").toLowerCase().trim())
    .filter(Boolean);
};

export const getRequiredTagFieldNames = (
  entityLevelTagFields: QuoteImportTagField[],
  itemLevelTagFields: QuoteImportTagField[]
) => [
  ...entityLevelTagFields.filter((tag) => tag.required).map((tag) => tag.name),
  ...itemLevelTagFields.filter((tag) => tag.required).map((tag) => tag.name)
];

export const buildMapFieldSections = (
  entityLevelTagFields: QuoteImportTagField[],
  itemLevelTagFields: QuoteImportTagField[]
): QuoteImportMapFieldSection[] => [
  {
    title: "Quote Details",
    fields: [
      "Quote Number",
      "Quote Date",
      "Expiry Date",
      "Quote Status",
      "Notes",
      "Terms & Conditions",
      "Project ID",
      "Project Name",
      "PurchaseOrder",
      "Template Name",
      "Sales person",
      "Currency Code",
      "Exchange Rate",
      "Adjustment",
      "Adjustment Description",
      "Discount Type",
      "Is Discount Before Tax",
      "Entity Discount Percent",
      "Entity Discount Amount",
      "Is Tracked For MOSS",
      "Is Digital Service"
    ]
  },
  {
    title: "Contact Details",
    fields: ["Customer Name", "Customer Number"]
  },
  {
    title: "Shipping Charge Details",
    fields: [
      "Shipping Charge",
      "Shipping Charge Tax Name",
      "Shipping Charge Tax Type",
      "Shipping Charge Tax %"
    ]
  },
  {
    title: "Item Details",
    fields: [
      "Item Price",
      "Usage unit",
      "Item Desc",
      "Line Item Type",
      "Item Code",
      "Item Name",
      "SKU",
      "Quantity",
      "Discount",
      "Discount Amount",
      "Coupon Code",
      "Item Tax1",
      "Item Tax1 Type",
      "Item Tax1 %",
      ...itemLevelTagFields.map((tag) => tag.name)
    ]
  },
  {
    title: "Entity Level Tags",
    fields: entityLevelTagFields.map((tag) => tag.name)
  }
].filter((section) => section.fields.length > 0);

export const escapeCsvValue = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const downloadBlobFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseCSV = (csvText: string): QuoteImportParseResult => {
  if (csvText.includes("<table") || csvText.includes("<TABLE")) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(csvText, "text/html");
      const table = doc.querySelector("table");
      if (table) {
        const rows = Array.from(table.querySelectorAll("tr"));
        if (rows.length > 0) {
          const headers = Array.from(rows[0].querySelectorAll("th,td")).map((c) => String(c.textContent || "").trim());
          const dataRows: Record<string, string>[] = [];
          rows.slice(1).forEach((rowEl) => {
            const cells = Array.from(rowEl.querySelectorAll("td"));
            if (cells.length === 0) return;
            const row: Record<string, string> = {};
            headers.forEach((header, idx) => {
              row[header] = String(cells[idx]?.textContent || "").trim();
            });
            dataRows.push(row);
          });
          return { headers, rows: dataRows };
        }
      }
    } catch (error) {
      console.error("Failed to parse HTML table import file:", error);
    }
  }

  const lines = String(csvText).split("\n").filter((line: string) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const firstLine = lines[0] || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const delimiter = tabCount > commaCount ? "\t" : ",";

  const parseCSVLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const headerValues = parseCSVLine(lines[0]);
  const headers: string[] = headerValues.map((h) => h.replace(/^"|"$/g, "").trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.some((v) => v)) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        const value = String(values[index] || "").replace(/^"|"$/g, "").trim();
        row[header] = value;
      });
      rows.push(row);
    }
  }

  return { headers, rows };
};

export const parseSpreadsheetFile = async (file: File): Promise<QuoteImportParseResult> => {
  const XLSX = await import("xlsx");
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => resolve(ev.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
  if (!Array.isArray(matrix) || matrix.length === 0) return { headers: [], rows: [] };

  const headers = (matrix[0] || []).map((h) => String(h ?? "").trim()).filter(Boolean);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const rowArray = matrix[i] || [];
    if (!Array.isArray(rowArray)) continue;
    if (rowArray.every((cell) => String(cell ?? "").trim() === "")) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = String(rowArray[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
};

export const parseImportFile = async (file: File): Promise<QuoteImportParseResult> => {
  const extension = String(file.name.split(".").pop() || "").toLowerCase();
  if (extension === "xlsx" || extension === "xls") {
    return parseSpreadsheetFile(file);
  }

  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => resolve(String(ev.target?.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });

  return parseCSV(content);
};

export const mapFieldValue = (row: Record<string, string>, mappedField: string) => {
  if (!mappedField) return "";
  if (row[mappedField] !== undefined && row[mappedField] !== null && row[mappedField] !== "") {
    return String(row[mappedField]).trim();
  }
  const lowerMapped = mappedField.toLowerCase();
  for (const key in row) {
    if (key.toLowerCase() === lowerMapped) {
      return String(row[key]).trim();
    }
  }
  return "";
};

export const getFieldValueFromRow = (
  row: Record<string, string>,
  headers: string[],
  fieldMappings: Record<string, string>,
  fieldName: string
) => {
  const mappedField = fieldMappings[fieldName];
  if (mappedField) {
    const value = mapFieldValue(row, mappedField);
    if (value) return value;
  }

  const lowerField = fieldName.toLowerCase();
  for (const header of headers) {
    if (header.toLowerCase() === lowerField) {
      const value = String(row[header] || "").trim();
      if (value) return value;
    }
  }

  return "";
};

export const parseQuoteDate = (quoteDate: string) => {
  let parsedDate = new Date().toISOString();
  if (!quoteDate) return parsedDate;

  const dateStr = quoteDate.trim();
  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})\/(\d{2})\/(\d{4})/
  ];

  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      if (pattern === datePatterns[0]) {
        parsedDate = new Date(`${match[1]}-${match[2]}-${match[3]}`).toISOString();
      } else {
        const testDate = new Date(`${match[3]}-${match[1]}-${match[2]}`);
        if (!isNaN(testDate.getTime())) {
          parsedDate = testDate.toISOString();
        }
      }
      break;
    }
  }

  return parsedDate;
};
