import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, Info, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft } from "lucide-react";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { saveCreditNote, getCreditNotes, getCustomers, updateCreditNote, getItemsFromAPI } from "../../salesModel";
import { parseImportFile } from "../../../utils/importFileParser";
import { creditNotesAPI } from "../../../../services/api";

export default function ImportCreditNotes() {
  const navigate = useNavigate();
  const location = useLocation();
  const importType = location.pathname.includes("import-applied")
    ? "applied"
    : location.pathname.includes("import-refunds")
      ? "refunds"
      : "credit-notes";

  const [selectedFile, setSelectedFile] = useState(null);
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const [isFileSourceDropdownOpen, setIsFileSourceDropdownOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState("allDocuments");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");
  const [currentStep, setCurrentStep] = useState("configure"); // "configure", "mapFields", "preview"
  const [fieldMappings, setFieldMappings] = useState({});
  const [previewData, setPreviewData] = useState({
    readyToImport: 0,
    skippedRecords: 0,
    unmappedFields: 0
  });
  const [importedFileHeaders, setImportedFileHeaders] = useState([
    "Credit Note#",
    "Credit Note Date",
    "Customer Name",
    "Reference",
    "Salesperson",
    "Item Name",
    "Quantity",
    "Rate",
    "Amount",
    "Description",
    "Currency"
  ]);
  const [autoGenerateNumbers, setAutoGenerateNumbers] = useState(false);
  const fileInputRef = useRef(null);
  const encodingDropdownRef = useRef(null);
  const fileSourceDropdownRef = useRef(null);
  const dropAreaRef = useRef(null);

  const getTitle = () => {
    if (importType === "applied") return "Import Applied Credit Notes";
    if (importType === "refunds") return "Import Refunds";
    return "Import Credit Notes";
  };

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target)) {
        setIsEncodingDropdownOpen(false);
      }
      if (fileSourceDropdownRef.current && !fileSourceDropdownRef.current.contains(event.target)) {
        setIsFileSourceDropdownOpen(false);
      }
    };

    if (isEncodingDropdownOpen || isFileSourceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen, isFileSourceDropdownOpen]);

  // Listen for document updates
  useEffect(() => {
    const handleDocumentAdded = () => {
      setDocuments(getAllDocuments());
    };
    const handleDocumentDeleted = () => {
      setDocuments(getAllDocuments());
    };
    const handleDocumentUpdated = () => {
      setDocuments(getAllDocuments());
    };

    window.addEventListener('documentAdded', handleDocumentAdded);
    window.addEventListener('documentDeleted', handleDocumentDeleted);
    window.addEventListener('documentUpdated', handleDocumentUpdated);

    return () => {
      window.removeEventListener('documentAdded', handleDocumentAdded);
      window.removeEventListener('documentDeleted', handleDocumentDeleted);
      window.removeEventListener('documentUpdated', handleDocumentUpdated);
    };
  }, []);

  const [isDecimalFormatModalOpen, setIsDecimalFormatModalOpen] = useState(false);
  const [selectFormatAtFieldLevel, setSelectFormatAtFieldLevel] = useState(false);
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");

  const encodingOptions = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
    "Shift_JIS (Japanese)",
    "Windows-1252",
    "ASCII"
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name?.toLowerCase().includes(documentSearch.toLowerCase());
    const matchesCategory = selectedDocumentCategory === "allDocuments" ||
      (selectedDocumentCategory === "files" && doc.category === "files") ||
      (selectedDocumentCategory === "bankStatements" && doc.category === "bankStatements");
    return matchesSearch && matchesCategory;
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      const maxSize = 25 * 1024 * 1024; // 25MB

      if (!validTypes.includes(fileExtension)) {
        alert("Please select a valid file format (CSV, TSV, or XLS).");
        event.target.value = "";
        setSelectedFile(null);
        return;
      }

      if (file.size > maxSize) {
        alert("File size must be less than 25 MB.");
        event.target.value = "";
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachFromDesktop = () => {
    setIsFileSourceDropdownOpen(false);
    fileInputRef.current?.click();
  };

  const handleAttachFromCloud = () => {
    setIsFileSourceDropdownOpen(false);
    setIsCloudPickerOpen(true);
  };

  const handleAttachFromDocuments = () => {
    setIsFileSourceDropdownOpen(false);
    setIsDocumentsModalOpen(true);
    // Load documents when modal opens
    setDocuments(getAllDocuments());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.add("drag-over");
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove("drag-over");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove("drag-over");
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Validate file type
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      const maxSize = 25 * 1024 * 1024; // 25MB

      if (!validTypes.includes(fileExtension)) {
        alert("Please select a valid file format (CSV, TSV, or XLS).");
        setSelectedFile(null);
        return;
      }

      if (file.size > maxSize) {
        alert("File size must be less than 25 MB.");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleClose = () => {
    navigate("/sales/credit-notes");
  };

  const normalizeHeaderValue = (value) =>
    String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const headerAliases = {
    "Credit Note#": ["credit note", "credit note number", "credit note #", "cn #", "cn number", "number"],
    "Credit Note Date": ["date", "credit date", "cn date"],
    "Customer Name": ["customer", "client", "client name", "company", "display name", "customer id"],
    "Reference": ["reference number", "ref", "transaction reference"],
    "Salesperson": ["sales person", "owner"],
    "Item Name": ["item", "product", "service", "item description", "description"],
    "Quantity": ["qty"],
    "Rate": ["unit price", "price"],
    "Amount": ["line total", "total", "value", "line amount"],
    "Description": ["details", "notes", "memo"],
    "Currency": ["currency code"]
  };

  const resolveMappedHeader = (fieldName, headersList = importedFileHeaders) => {
    const availableHeaders = (headersList || [])
      .map((header) => String(header || "").trim())
      .filter(Boolean);

    if (!availableHeaders.length) return "";

    if (Object.prototype.hasOwnProperty.call(fieldMappings, fieldName)) {
      const explicitMapping = String(fieldMappings[fieldName] || "").trim();
      if (!explicitMapping) return "";
      const explicitNormalized = normalizeHeaderValue(explicitMapping);
      const explicitMatch = availableHeaders.find(
        (header) => normalizeHeaderValue(header) === explicitNormalized
      );
      if (explicitMatch) return explicitMatch;
    }

    const aliases = [fieldName, ...(headerAliases[fieldName] || [])]
      .map((alias) => String(alias || "").trim())
      .filter(Boolean);

    for (const alias of aliases) {
      const aliasNormalized = normalizeHeaderValue(alias);
      const exactAliasMatch = availableHeaders.find(
        (header) => normalizeHeaderValue(header) === aliasNormalized
      );
      if (exactAliasMatch) return exactAliasMatch;
    }

    for (const alias of aliases) {
      const aliasNormalized = normalizeHeaderValue(alias);
      const partialAliasMatch = availableHeaders.find((header) => {
        const headerNormalized = normalizeHeaderValue(header);
        return (
          headerNormalized.includes(aliasNormalized) ||
          aliasNormalized.includes(headerNormalized)
        );
      });
      if (partialAliasMatch) return partialAliasMatch;
    }

    return "";
  };

  const handleNext = async () => {
    if (currentStep === "configure") {
      if (!selectedFile) {
        alert("Please select a file to continue.");
        return;
      }
      // Parse import file to get headers
      try {
        const { headers } = await parseImportFile(selectedFile);
        setImportedFileHeaders(headers);
        setCurrentStep("mapFields");
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please try again.");
      }
    } else if (currentStep === "mapFields") {
      // Calculate preview data before moving to preview step
      if (selectedFile) {
        try {
          const { headers, rows } = await parseImportFile(selectedFile);

          // Calculate unmapped fields count
          const requiredFields = autoGenerateNumbers
            ? ["Customer Name", "Credit Note Date"]
            : ["Credit Note#", "Customer Name", "Credit Note Date"];
          let unmappedCount = 0;
          requiredFields.forEach(field => {
            if (!resolveMappedHeader(field, headers)) {
              unmappedCount++;
            }
          });

          setPreviewData({
            readyToImport: rows.length,
            skippedRecords: 0,
            unmappedFields: unmappedCount
          });
          setCurrentStep("preview");
        } catch (error) {
          console.error("Error reading file:", error);
          alert("Error reading file. Please try again.");
        }
      } else {
        setCurrentStep("preview");
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep === "mapFields") {
      setCurrentStep("configure");
    } else if (currentStep === "preview") {
      setCurrentStep("mapFields");
    }
  };

  const filteredEncodingOptions = encodingOptions.filter(option =>
    option.toLowerCase().includes(encodingSearch.toLowerCase())
  );

  const downloadSampleFile = (type) => {
    const headers = [
      "Credit Note#",
      "Credit Note Date",
      "Customer Name",
      "Reference",
      "Salesperson",
      "Item Name",
      "Quantity",
      "Rate",
      "Amount",
      "Description",
      "Currency"
    ];

    const sampleRow = [
      "CN-000001",
      "2026-02-10",
      "Abduladim Abduladim",
      "RET-REF-1001",
      "Mahir",
      "camera",
      "1",
      "200.00",
      "200.00",
      "Imported credit note sample",
      "AMD"
    ];

    const extension = type === "csv" ? "csv" : "xls";
    const mimeType = type === "csv"
      ? "text/csv;charset=utf-8;"
      : "application/vnd.ms-excel;charset=utf-8;";

    const content = [headers, sampleRow]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `credit-notes-import-sample.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText) => {
    const normalizedText = String(csvText || "").replace(/^\uFEFF/, "").replace(/\r/g, "");
    const lines = normalizedText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    const delimiter = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : ',';

    // Improved CSV parsing that handles quoted values with commas
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      // Add last field
      result.push(current.trim());
      return result;
    };

    // Parse headers
    const headerValues = parseCSVLine(lines[0]);
    const headers = headerValues.map(h => h.replace(/^"|"$/g, '').trim());

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.some(v => v)) { // Only add non-empty rows
        const row = {};
        headers.forEach((header, index) => {
          const value = (values[index] || '').replace(/^"|"$/g, '').trim();
          row[header] = value;
        });
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const mapFieldValue = (row, mappedField) => {
    if (!mappedField) return '';
    // Try exact match first
    if (row[mappedField] !== undefined && row[mappedField] !== null && row[mappedField] !== '') {
      return String(row[mappedField]).trim();
    }
    // Try case-insensitive match
    const lowerMapped = mappedField.toLowerCase();
    const normalizedMapped = normalizeHeaderValue(mappedField);
    for (const key in row) {
      if (key.toLowerCase() === lowerMapped || normalizeHeaderValue(key) === normalizedMapped) {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert("No file selected");
      return;
    }

    try {
      const { headers, rows } = await parseImportFile(selectedFile);

      if (rows.length === 0) {
        alert("No data found in the file");
        return;
      }

      // Import each row as a credit note
      let importedCount = 0;
      let skippedCount = 0;
      const errors = [];
      const customers = await getCustomers();
      const existingNotes = await getCreditNotes();
      const items = await getItemsFromAPI();
      const existingNoteMap = new Map(
        existingNotes
          .filter((note) => note?.creditNoteNumber)
          .map((note) => [String(note.creditNoteNumber).trim().toLowerCase(), note])
      );

      const normalizeLookupValue = (value) =>
        String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      const parseNumber = (value, fallback = 0) => {
        const normalized = String(value ?? "")
          .replace(/,/g, "")
          .replace(/[^\d.-]/g, "")
          .trim();
        if (!normalized) return fallback;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const parseDateValue = (rawValue, fallbackDate = new Date()) => {
        const raw = String(rawValue || "").trim();
        if (!raw) return new Date(fallbackDate).toISOString();

        const direct = new Date(raw);
        if (!Number.isNaN(direct.getTime())) return direct.toISOString();

        const yyyyMmDd = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (yyyyMmDd) {
          const parsed = new Date(Number(yyyyMmDd[1]), Number(yyyyMmDd[2]) - 1, Number(yyyyMmDd[3]));
          if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
        }

        const ddMmYyyy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (ddMmYyyy) {
          const dayFirst = new Date(Number(ddMmYyyy[3]), Number(ddMmYyyy[2]) - 1, Number(ddMmYyyy[1]));
          if (!Number.isNaN(dayFirst.getTime())) return dayFirst.toISOString();
          const monthFirst = new Date(Number(ddMmYyyy[3]), Number(ddMmYyyy[1]) - 1, Number(ddMmYyyy[2]));
          if (!Number.isNaN(monthFirst.getTime())) return monthFirst.toISOString();
        }

        return new Date(fallbackDate).toISOString();
      };

      const findCustomerId = (customerValue) => {
        const rawNeedle = String(customerValue || "").trim().toLowerCase();
        const normalizedNeedle = normalizeLookupValue(customerValue);
        if (!rawNeedle) return "";

        const getCandidates = (customer) => ([
          customer?.id,
          customer?._id,
          customer?.name,
          customer?.displayName,
          customer?.companyName,
          customer?.email
        ].map((value) => String(value || "").trim()).filter(Boolean));

        const exactRawMatch = customers.find((customer) =>
          getCandidates(customer).some((candidate) => candidate.toLowerCase() === rawNeedle)
        );
        if (exactRawMatch) return String(exactRawMatch.id || exactRawMatch._id || "").trim();

        const exactNormalizedMatch = customers.find((customer) =>
          getCandidates(customer).some((candidate) => normalizeLookupValue(candidate) === normalizedNeedle)
        );
        if (exactNormalizedMatch) return String(exactNormalizedMatch.id || exactNormalizedMatch._id || "").trim();

        const partialMatch = customers.find((customer) =>
          getCandidates(customer).some((candidate) => {
            const normalizedCandidate = normalizeLookupValue(candidate);
            return (
              normalizedCandidate.includes(normalizedNeedle) ||
              normalizedNeedle.includes(normalizedCandidate)
            );
          })
        );
        return String(partialMatch?.id || partialMatch?._id || "").trim();
      };

      const findItem = (itemValue, fallbackValue = "", rowData = {}) => {
        const lookupValues = [itemValue, fallbackValue]
          .map((value) => String(value || "").trim())
          .filter(Boolean);

        const rowDerivedValues = Object.entries(rowData || {})
          .filter(([key, value]) => {
            const normalizedKey = normalizeHeaderValue(key);
            const looksLikeItemColumn =
              normalizedKey.includes("item") ||
              normalizedKey.includes("product") ||
              normalizedKey.includes("service") ||
              normalizedKey.includes("sku") ||
              normalizedKey.includes("description");
            return looksLikeItemColumn && String(value || "").trim().length > 0;
          })
          .map(([, value]) => String(value || "").trim());

        const allValues = [...lookupValues, ...rowDerivedValues];
        if (!allValues.length) return null;

        const exactNeedles = allValues.map((value) => value.toLowerCase());
        const normalizedNeedles = allValues.map((value) => normalizeLookupValue(value)).filter(Boolean);

        const getCandidates = (item) => [
          item?.id,
          item?._id,
          item?.name,
          item?.itemName,
          item?.sku,
          item?.itemCode,
          item?.barcode,
          item?.description,
          item?.salesDescription
        ].map((value) => String(value || "").trim()).filter(Boolean);

        const exactRawMatch = items.find((item) =>
          getCandidates(item).some((candidate) => exactNeedles.includes(candidate.toLowerCase()))
        );
        if (exactRawMatch) return exactRawMatch;

        const exactNormalizedMatch = items.find((item) =>
          getCandidates(item).some((candidate) => normalizedNeedles.includes(normalizeLookupValue(candidate)))
        );
        if (exactNormalizedMatch) return exactNormalizedMatch;

        const partialMatch = items.find((item) =>
          getCandidates(item).some((candidate) => {
            const normalizedCandidate = normalizeLookupValue(candidate);
            return normalizedNeedles.some((needle) =>
              normalizedCandidate.includes(needle) || needle.includes(normalizedCandidate)
            );
          })
        );
        return partialMatch || null;
      };

      let generatedSequence = existingNotes.reduce((max, note) => {
        const rawNumber = String(note?.creditNoteNumber || "");
        const match = rawNumber.match(/(\d+)(?!.*\d)/);
        const parsed = match ? parseInt(match[1], 10) : 0;
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0);

      const getGeneratedCreditNoteNumber = async () => {
        try {
          const response = await creditNotesAPI.getNextNumber();
          const generated =
            String(response?.data?.creditNoteNumber || response?.nextNumber || response?.data?.nextNumber || "").trim();
          if (generated && !existingNoteMap.has(generated.toLowerCase())) {
            return generated;
          }
        } catch (error) {
          console.warn("Failed to fetch next credit note number for import:", error);
        }

        let attempts = 0;
        while (attempts < 100000) {
          generatedSequence += 1;
          attempts += 1;
          const candidate = `CN-${String(generatedSequence).padStart(6, "0")}`;
          if (!existingNoteMap.has(candidate.toLowerCase())) return candidate;
        }
        return `CN-IMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      };

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        try {
          // Helper function to get value from row using field mapping or direct header match
          const getValue = (fieldName) => {
            const mappedField = resolveMappedHeader(fieldName, headers);
            if (mappedField) {
              const value = mapFieldValue(row, mappedField);
              if (value) return value;
            }
            return '';
          };

          // Get required fields
          const creditNoteNumber = getValue("Credit Note#");
          const customerName = getValue("Customer Name");
          const creditNoteDate = getValue("Credit Note Date");

          if (!customerName) {
            skippedCount++;
            errors.push(`Row ${rowIndex + 1}: Missing customer name`);
            continue;
          }

          const customerId = findCustomerId(customerName);
          if (!customerId) {
            skippedCount++;
            errors.push(`Row ${rowIndex + 1}: Customer "${customerName}" not found`);
            continue;
          }

          const parsedDate = parseDateValue(creditNoteDate, new Date());
          const resolvedCreditNoteNumber = (autoGenerateNumbers || !creditNoteNumber)
            ? await getGeneratedCreditNoteNumber()
            : String(creditNoteNumber).trim();

          if (!resolvedCreditNoteNumber) {
            skippedCount++;
            errors.push(`Row ${rowIndex + 1}: Missing credit note number`);
            continue;
          }

          let finalCreditNoteNumber = resolvedCreditNoteNumber;
          let creditNoteNumberKey = finalCreditNoteNumber.toLowerCase();
          let existingNote = existingNoteMap.get(creditNoteNumberKey);

          if (duplicateHandling === "skip" && existingNote && !autoGenerateNumbers) {
            skippedCount++;
            errors.push(`Row ${rowIndex + 1}: Duplicate credit note number "${resolvedCreditNoteNumber}"`);
            continue;
          }

          if (duplicateHandling === "add" && existingNote && !autoGenerateNumbers) {
            finalCreditNoteNumber = await getGeneratedCreditNoteNumber();
            creditNoteNumberKey = finalCreditNoteNumber.toLowerCase();
            existingNote = existingNoteMap.get(creditNoteNumberKey);
          }

          const itemName = getValue("Item Name");
          const quantity = getValue("Quantity");
          const rate = getValue("Rate");
          const amount = getValue("Amount");
          const description = getValue("Description");
          const matchedItem = findItem(itemName, description, row);
          const parsedQuantity = Math.max(parseNumber(quantity, 1), 1);
          let parsedRate = parseNumber(
            rate,
            parseNumber(matchedItem?.sellingPrice || matchedItem?.rate || matchedItem?.unitPrice, 0)
          );
          const parsedAmount = parseNumber(amount, 0);
          if (parsedRate <= 0 && parsedAmount > 0) {
            parsedRate = parsedAmount / parsedQuantity;
          }
          const lineTotal = parsedAmount > 0 ? parsedAmount : Math.max(0, parsedQuantity * parsedRate);

          if (lineTotal <= 0) {
            skippedCount++;
            errors.push(`Row ${rowIndex + 1}: Invalid amount/rate for item`);
            continue;
          }

          const itemsPayload = [{
            item: String(matchedItem?.id || matchedItem?._id || "").trim() || undefined,
            name: String(itemName || matchedItem?.name || "Imported Item").trim(),
            description: String(description || itemName || matchedItem?.name || "").trim(),
            quantity: parsedQuantity,
            unitPrice: parsedRate,
            taxRate: 0,
            taxAmount: 0,
            total: lineTotal
          }];

          const noteData = {
            creditNoteNumber: finalCreditNoteNumber,
            customer: customerId,
            customerId: customerId,
            customerName: customerName || "",
            date: parsedDate,
            referenceNumber: getValue("Reference") || "",
            salesperson: getValue("Salesperson") || "",
            status: "open",
            currency: (getValue("Currency") || "USD").toUpperCase(),
            items: itemsPayload,
            subtotal: lineTotal,
            subTotal: lineTotal,
            tax: 0,
            total: lineTotal,
            balance: lineTotal,
            notes: description || ""
          };

          if (duplicateHandling === "overwrite" && existingNote && !autoGenerateNumbers) {
            await updateCreditNote(existingNote.id, { ...existingNote, ...noteData, id: existingNote.id });
            importedCount++;
            continue;
          }

          const savedNote = await saveCreditNote(noteData);
          existingNoteMap.set(creditNoteNumberKey, savedNote || { ...noteData, id: noteData.creditNoteNumber });
          importedCount++;
        } catch (error) {
          console.error("Error importing credit note:", error);
          skippedCount++;
          errors.push(`Row ${rowIndex + 1}: ${error?.message || String(error)}`);
        }
      }

      if (importedCount > 0) {
        alert(`Successfully imported ${importedCount} credit note(s).${skippedCount > 0 ? ` ${skippedCount} record(s) skipped.` : ''}`);
        navigate("/sales/credit-notes");
      } else {
        alert(`No credit notes were imported.${errors.length > 0 ? ` ${errors.slice(0, 3).join(" ")}` : ""}`);
      }
    } catch (error) {
      console.error("Error importing credit notes:", error);
      alert("Error importing credit notes. Please check the file format and try again.");
    }
  };

  const handleCancel = () => {
    navigate("/sales/credit-notes");
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentStep === "configure" ? `${getTitle()} - Select File` : currentStep === "mapFields" ? "Map Fields" : "Preview"}
            </h1>
            <button className="p-2 hover:bg-gray-100 rounded-lg text-red-500 hover:text-red-600 transition-colors" onClick={handleClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 ${currentStep === "configure" ? "bg-blue-600 text-white" : "bg-green-500 text-white"} rounded-full flex items-center justify-center font-bold text-sm shadow-md`}>
                {currentStep === "configure" ? "1" : <Check size={16} />}
              </div>
              <div className={`text-sm font-semibold mt-2 ${currentStep === "configure" ? "text-blue-600" : "text-gray-600"}`}>Configure</div>
            </div>
            <div className={`w-24 h-1 mx-4 ${currentStep !== "configure" ? "bg-blue-600" : "bg-gray-300"}`}></div>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 ${currentStep === "mapFields" ? "bg-blue-600 text-white" : currentStep === "preview" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"} rounded-full flex items-center justify-center font-bold text-sm ${currentStep === "mapFields" ? "shadow-md" : ""}`}>
                {currentStep === "preview" ? <Check size={16} /> : "2"}
              </div>
              <div className={`text-sm font-semibold mt-2 ${currentStep === "mapFields" ? "text-blue-600" : "text-gray-600"}`}>Map Fields</div>
            </div>
            <div className={`w-24 h-1 mx-4 ${currentStep === "preview" ? "bg-blue-600" : "bg-gray-300"}`}></div>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 ${currentStep === "preview" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"} rounded-full flex items-center justify-center font-bold text-sm ${currentStep === "preview" ? "shadow-md" : ""}`}>3</div>
              <div className={`text-sm font-semibold mt-2 ${currentStep === "preview" ? "text-blue-600" : "text-gray-600"}`}>Preview</div>
            </div>
          </div>
        </div>

        {currentStep === "configure" && (
          <>
            {/* File Upload Area */}
            <div
              className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center mb-6 hover:border-blue-500 transition-colors"
              ref={dropAreaRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Download size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-4">Drag and drop file to import</p>
              <div className="relative inline-block" ref={fileSourceDropdownRef}>
                <button
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 mx-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFileSourceDropdownOpen(!isFileSourceDropdownOpen);
                  }}
                >
                  Choose File
                  <ChevronDown size={16} />
                </button>
                {isFileSourceDropdownOpen && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                      onClick={handleAttachFromDesktop}
                    >
                      Attach From Desktop
                    </div>
                    <div
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                      onClick={handleAttachFromCloud}
                    >
                      Attach From Cloud
                    </div>
                    <div
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                      onClick={handleAttachFromDocuments}
                    >
                      Attach From Documents
                    </div>
                  </div>
                )}
              </div>
              {selectedFile && (
                <p className="mt-4 text-sm font-medium text-green-600">
                  Selected: {selectedFile.name}
                </p>
              )}
              <p className="mt-4 text-xs text-gray-500">
                Maximum File Size: 25 MB • File Format: CSV or TSV or XLS
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Download{" "}
                <button
                  type="button"
                  onClick={() => downloadSampleFile("csv")}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                >
                  sample csv file
                </button>{" "}
                or{" "}
                <button
                  type="button"
                  onClick={() => downloadSampleFile("xls")}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                >
                  sample xls file
                </button>{" "}
                and compare it with your import file.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.xls,.xlsx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>

            {/* Duplicate Handling Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <label className="text-sm font-semibold text-gray-700">Duplicate Handling:</label>
                <span className="text-red-500">*</span>
                <HelpCircle size={16} className="text-gray-400 cursor-help" />
              </div>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="skip"
                    checked={duplicateHandling === "skip"}
                    onChange={(e) => setDuplicateHandling(e.target.value)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Skip Duplicates</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Retains the credit notes in Taban Books and does not import the duplicates in the import file.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="overwrite"
                    checked={duplicateHandling === "overwrite"}
                    onChange={(e) => setDuplicateHandling(e.target.value)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Overwrite credit notes</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Imports the duplicates in the import file and overwrites the existing credit notes in Taban Books.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="add"
                    checked={duplicateHandling === "add"}
                    onChange={(e) => setDuplicateHandling(e.target.value)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Add duplicates as new credit notes</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Imports the duplicates in the import file and adds them as new credit notes in Taban Books.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Auto-Generate Credit Note Numbers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="auto-generate"
                  checked={autoGenerateNumbers}
                  onChange={(e) => setAutoGenerateNumbers(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="auto-generate" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Auto-Generate Credit Note Numbers
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Credit note numbers will be generated automatically according to your settings. Any numbers in the import file will be ignored.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === "mapFields" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Map Fields</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b border-gray-200 font-semibold text-sm text-gray-600">
                <div className="col-span-4">Taban Books Fields</div>
                <div className="col-span-4">Import File Headers</div>
                <div className="col-span-4">Sample Value</div>
              </div>

              {["Credit Note#", "Credit Note Date", "Customer Name", "Reference", "Salesperson", "Item Name", "Quantity", "Rate", "Amount", "Description", "Currency"].map((field) => {
                const selectedHeader = String(fieldMappings[field] || resolveMappedHeader(field) || "");
                const isRequiredField = field === "Customer Name" || field === "Credit Note Date" || (!autoGenerateNumbers && field === "Credit Note#");
                return (
                <div key={field} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 text-sm font-medium text-gray-700">
                    {field} <span className="text-red-500">{isRequiredField && "*"}</span>
                  </div>
                  <div className="col-span-4">
                    <div className="relative">
                      <select
                        className="w-full pl-3 pr-10 py-2 text-sm border-2 border-gray-200 rounded-lg appearance-none focus:outline-none focus:border-blue-500"
                        value={selectedHeader}
                        onChange={(e) => setFieldMappings({
                          ...fieldMappings,
                          [field]: e.target.value
                        })}
                      >
                        <option value="">Select Field</option>
                        {importedFileHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="col-span-4 text-sm text-gray-500">
                    {selectedHeader ? "mapped value" : "-"}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === "preview" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Import Preview</h2>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{previewData.readyToImport}</div>
                <div className="text-sm font-medium text-green-800">Credit Notes Ready</div>
              </div>
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">{previewData.skippedRecords}</div>
                <div className="text-sm font-medium text-red-800">Records Skipped</div>
              </div>
              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-1">{previewData.unmappedFields}</div>
                <div className="text-sm font-medium text-yellow-800">Unmapped Fields</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Ready to Import?</p>
                <p>Click the "Import" button below to verify and import your credit notes data. Make sure all required fields are mapped correctly.</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-200 p-6 flex items-center justify-between sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <button
            className="px-6 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={currentStep === "configure" ? handleCancel : handlePrevious}
          >
            {currentStep === "configure" ? "Cancel" : "Previous"}
          </button>
          <button
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${currentStep === "configure" && !selectedFile
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
              }`}
            onClick={currentStep === "preview" ? handleImport : handleNext}
            disabled={currentStep === "configure" && !selectedFile}
          >
            {currentStep === "preview" ? "Import" : "Next"}
          </button>
        </div>
      </div>

      {/* Cloud Picker Modal */}
      {isCloudPickerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsCloudPickerOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-700">Cloud Picker</h2>
              <button
                onClick={() => setIsCloudPickerOpen(false)}
                className="text-red-500 hover:text-red-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Cloud Services Sidebar */}
              <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                <div className="p-2">
                  {[
                    { id: "zoho", name: "Zoho WorkDrive", icon: LayoutGrid },
                    { id: "gdrive", name: "Google Drive", icon: HardDrive },
                    { id: "dropbox", name: "Dropbox", icon: Box },
                    { id: "box", name: "Box", icon: Square },
                    { id: "onedrive", name: "OneDrive", icon: Cloud },
                    { id: "evernote", name: "Evernote", icon: FileText },
                  ].map((provider) => {
                    const IconComponent = provider.icon;
                    const isSelected = selectedCloudProvider === provider.id;
                    return (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedCloudProvider(provider.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isSelected
                          ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                          }`}
                      >
                        <IconComponent
                          size={24}
                          className={isSelected ? "text-blue-600" : "text-gray-500"}
                        />
                        <span>{provider.name}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Scroll indicator */}
                <div className="mt-auto p-2 flex justify-center">
                  <div className="flex flex-col gap-1">
                    <ChevronUpIcon size={16} className="text-gray-300" />
                    <ChevronDown size={16} className="text-gray-300" />
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                {selectedCloudProvider === "gdrive" ? (
                  /* Google Drive Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* Google Drive Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32">
                        {/* Google Drive Triangle Logo */}
                        <svg viewBox="0 0 256 256" className="w-full h-full">
                          {/* Green triangle */}
                          <path
                            d="M128 32L32 128l96 96V32z"
                            fill="#0F9D58"
                          />
                          {/* Blue triangle */}
                          <path
                            d="M128 32l96 96-96 96V32z"
                            fill="#4285F4"
                          />
                          {/* Yellow triangle */}
                          <path
                            d="M32 128l96 96V128L32 32v96z"
                            fill="#F4B400"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho. The use and transfer of information received from Google APIs to Zoho will adhere to{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          Google API Services User Data Policy
                        </a>
                        , including the{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          Limited Use Requirements
                        </a>
                        .
                      </p>
                    </div>

                    {/* Authenticate Google Button */}
                    <button
                      className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://accounts.google.com/v3/signin/accountchooser?access_type=offline&approval_prompt=force&client_id=932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Fauth%2Fgoogle&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&state=3a3b0106a0c2d908b369a75ad93185c0aa431c64497733bda2d375130c4da610d88104c252c552adc1dee9d6167ad6bb8d2258113b9dce48b47ca4a970314a1fa7b51df3a7716016ac37be9e7d4d9f21077f946b82dc039ae2f08b7be79117042545529cf82d67d58ef6426621f5b5f885af900571347968d419f6d1a5abe3e7e1a3a4d04a433a6b3c5173f68c0c5bea&dsh=S557386361%3A1766903862725658&o2v=1&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAP8z-36EGAbjuuLEd2uWDyjQgraM1HNpjnJVe4mUhXhPOQkoJHNKZG6WoCFPPrb5EDYGeFuyF3TI7jUSvDUIwBbk0PGoZLgn4Jt5TdOWWzFyQf6jLfEXhnKHaHRvCzRofERa0CbAnwAUviCEIRh6OE8GWAy3xDGHH6VltpKe7vSGjJfzwkDnAckJm1v9fghFiv7u6_xqfZlF8iB26QlWNE86HHYqzyIP3N9LKEh0NWNZAdiV__IdSu_RqOJPYoHDRNRRsyctIbVsj3CDhUyCADZvROzoeQI9VvIqJSiWLTxE7royBXKDDS96rJYovyIQ79hC_n_aNjoPVUD9jfp5cnJkn_rkGpzetwAYJTRSKhP8gM5YlFdK2Pfp2uT6ZHzVAOYmlyeCX4dc1IsyRtinTLx5WyAUPR_QcLPQzuQcRPvtjL23ZvKxoexvKp3t4zX_HTFKMrduT4G6ojAd7C-kurnZ1Wx6g%26flowName%3DGeneralOAuthFlow%26as%3DS557386361%253A1766903862725658%26client_id%3D932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fgadgets.zoho.com",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate Google
                    </button>
                  </div>
                ) : selectedCloudProvider === "dropbox" ? (
                  /* Dropbox Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* Dropbox Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        {/* Dropbox Box Logo - Geometric box made of smaller boxes */}
                        <svg viewBox="0 0 128 128" className="w-full h-full">
                          <defs>
                            <linearGradient id="dropboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0061FF" />
                              <stop offset="100%" stopColor="#0052CC" />
                            </linearGradient>
                          </defs>
                          {/* Dropbox geometric box icon - composed of smaller boxes */}
                          <g fill="url(#dropboxGradient)">
                            {/* Top-left box */}
                            <rect x="8" y="8" width="48" height="48" rx="4" />
                            {/* Top-right box */}
                            <rect x="72" y="8" width="48" height="48" rx="4" />
                            {/* Bottom-left box */}
                            <rect x="8" y="72" width="48" height="48" rx="4" />
                            {/* Bottom-right box */}
                            <rect x="72" y="72" width="48" height="48" rx="4" />
                          </g>
                        </svg>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho.
                      </p>
                    </div>

                    {/* Authenticate Dropbox Button */}
                    <button
                      className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=ovpkm9147d63ifh&redirect_uri=https://gadgets.zoho.com/dropbox/auth/v2/saveToken&state=190d910cedbc107e58195259f79a434d05c66c88e1e6eaa0bc585c6a0fddb159871ede64adb4d5da61c107ca7cbb7bae891c80e9c69cf125faaaf622ab58f37c5b1d42b42c7f3add07d92465295564a6c5bd98228654cce8ff68da24941db6f0aab9a60398ac49e41b3ec211acfd5bcc&force_reapprove=true&token_access_type=offline",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate Dropbox
                    </button>
                  </div>
                ) : selectedCloudProvider === "box" ? (
                  /* Box Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* Box Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        {/* Box Logo - Blue "b" inside a square with cloud background */}
                        <div className="relative">
                          {/* White cloud shape background */}
                          <div className="absolute inset-0 bg-gray-100 rounded-full transform scale-110"></div>
                          {/* Blue square with rounded corners */}
                          <div className="relative w-24 h-24 bg-[#0061D5] rounded-lg flex items-center justify-center">
                            {/* White lowercase "b" */}
                            <span className="text-white text-4xl font-bold">b</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho.
                      </p>
                    </div>

                    {/* Authenticate Box Button */}
                    <button
                      className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://account.box.com/api/oauth2/authorize?response_type=code&client_id=f95f6ysfm8vg1q3g84m0xyyblwnj3tr5&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Fauth%2Fbox&state=37e352acfadd37786b1d388fb0f382baa59c9246f4dda329361910db55643700578352e4636bde8a0743bd3060e51af0ee338a34b2080bbd53a337f46b0995e28facbeff76d7efaf8db4493a0ef77be45364e38816d94499fba739987744dd1f6f5c08f84c0a11b00e075d91d7ea5c6d",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate Box
                    </button>
                  </div>
                ) : selectedCloudProvider === "onedrive" ? (
                  /* OneDrive Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* OneDrive Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        {/* OneDrive Logo - Blue cloud icon */}
                        <div className="relative">
                          <Cloud size={128} className="text-[#0078D4]" fill="#0078D4" strokeWidth={0} />
                        </div>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho.
                      </p>
                    </div>

                    {/* Authenticate OneDrive Button */}
                    <button
                      className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=0ecabec7-1fac-433f-a968-9985926b51c3&state=e0b1053c9465a9cb98fea7eea99d3074930c6c5607a21200967caf2db861cf9df77442c92e8565087c2a339614e18415cbeb95d59c63605cee4415353b2c44da13c6b9f34bca1fcd3abdd630595133a5232ddb876567bedbe620001a59c9989df94c3823476d0eef4363b351e8886c5563f56bc9d39db9f3db7c37cd1ad827c5.%5E.US&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Ftpa%2Foffice365&response_type=code&prompt=select_account&scope=Files.Read%20User.Read%20offline_access&sso_reload=true",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate OneDrive
                    </button>
                  </div>
                ) : selectedCloudProvider === "evernote" ? (
                  /* Evernote Authentication Content */
                  <div className="flex flex-col items-center max-w-lg">
                    {/* Evernote Logo */}
                    <div className="mb-8">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        {/* Evernote Logo - Green square with elephant head */}
                        <div className="relative w-32 h-32 bg-[#00A82D] rounded-lg flex items-center justify-center shadow-lg">
                          {/* Elephant head silhouette - simplified */}
                          <svg viewBox="0 0 100 100" className="w-20 h-20">
                            {/* Elephant head - main shape */}
                            <path
                              d="M 50 15 Q 25 15 15 35 Q 10 45 10 60 Q 10 75 20 85 Q 15 80 15 70 Q 15 60 25 55 Q 20 50 20 40 Q 20 30 30 30 Q 35 25 40 30 Q 45 25 50 30 Q 55 25 60 30 Q 65 25 70 30 Q 75 30 75 40 Q 75 50 70 55 Q 80 60 80 70 Q 80 80 75 85 Q 85 75 85 60 Q 85 45 80 35 Q 70 15 50 15 Z"
                              fill="#2D2926"
                            />
                            {/* Elephant ear */}
                            <ellipse cx="20" cy="50" rx="8" ry="15" fill="#2D2926" />
                            {/* Elephant trunk */}
                            <path
                              d="M 40 40 Q 35 45 35 50 Q 35 55 40 60"
                              stroke="#2D2926"
                              strokeWidth="2.5"
                              fill="none"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Terms and Conditions Text */}
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>
                        By clicking on this button you agree to the provider's{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          terms of use
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-blue-600 underline hover:text-blue-700"
                          onClick={(e) => e.preventDefault()}
                        >
                          privacy policy
                        </a>{" "}
                        and understand that the rights to use this product do not come from Zoho.
                      </p>
                    </div>

                    {/* Authenticate Evernote Button */}
                    <button
                      className="px-8 py-3 bg-[#00A82D] text-white rounded-md text-sm font-semibold hover:bg-[#008A24] transition-colors shadow-sm"
                      onClick={() => {
                        window.open(
                          "https://accounts.evernote.com/login",
                          "_blank"
                        );
                      }}
                    >
                      Authenticate Evernote
                    </button>
                  </div>
                ) : (
                  /* Default Content for other providers */
                  <div className="flex flex-col items-center justify-center">
                    {/* Illustration Area - Using a placeholder illustration */}
                    <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                      <div className="relative w-full h-full">
                        {/* Stylized illustration with people and documents */}
                        <div className="absolute inset-0 flex items-end justify-center">
                          {/* Person on document with laptop */}
                          <div className="relative">
                            <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2"></div>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                              <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                                <Users size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                              <div className="w-8 h-6 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                          {/* Person pushing document */}
                          <div className="relative ml-8">
                            <div className="w-20 h-28 bg-purple-300 rounded-lg mb-2"></div>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                              <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center">
                                <Users size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                              <div className="text-2xl font-bold text-purple-600">A</div>
                            </div>
                          </div>
                          {/* Person with list */}
                          <div className="relative ml-8">
                            <div className="w-20 h-28 bg-pink-300 rounded-lg mb-2"></div>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                              <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
                                <Users size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                              <div className="space-y-1">
                                <div className="w-12 h-1 bg-pink-600 rounded"></div>
                                <div className="w-10 h-1 bg-pink-600 rounded"></div>
                                <div className="w-8 h-1 bg-pink-600 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Decorative shapes */}
                        <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="absolute top-12 right-12 w-4 h-4 bg-blue-400 transform rotate-45"></div>
                        <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                        <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                      </div>
                    </div>

                    {/* Description Text */}
                    <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                      {selectedCloudProvider === "zoho"
                        ? "Zoho WorkDrive is an online file sync, storage and content collaboration platform."
                        : "Select a cloud storage provider to get started."}
                    </p>

                    {/* Set up your team button */}
                    {selectedCloudProvider === "zoho" && (
                      <button
                        className="px-6 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://workdrive.zoho.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=ZohoBooks",
                            "_blank"
                          );
                        }}
                      >
                        Set up your team
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsCloudPickerOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsCloudPickerOpen(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Attach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {isDocumentsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsDocumentsModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Files"
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setIsDocumentsModalOpen(false)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar - INBOXES */}
              <div className="w-[200px] bg-gray-50 border-r border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">INBOXES</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedDocumentCategory("files")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedDocumentCategory === "files"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Folder size={18} className={selectedDocumentCategory === "files" ? "text-blue-600" : "text-gray-500"} />
                    Files
                  </button>
                  <button
                    onClick={() => setSelectedDocumentCategory("bankStatements")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedDocumentCategory === "bankStatements"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Building2 size={18} className={selectedDocumentCategory === "bankStatements" ? "text-blue-600" : "text-gray-500"} />
                    Bank Statements
                  </button>
                  <button
                    onClick={() => setSelectedDocumentCategory("allDocuments")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedDocumentCategory === "allDocuments"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <FileText size={18} className={selectedDocumentCategory === "allDocuments" ? "text-blue-600" : "text-gray-500"} />
                    All Documents
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-700">FILE NAME</div>
                  <div className="text-sm font-semibold text-gray-700">DETAILS</div>
                  <div className="text-sm font-semibold text-gray-700">UPLOADED BY</div>
                </div>

                {/* Documents List */}
                {filteredDocuments.length > 0 ? (
                  <div className="flex-1 overflow-y-auto">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          if (selectedDocuments.includes(doc.id)) {
                            setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                          } else {
                            setSelectedDocuments([...selectedDocuments, doc.id]);
                          }
                        }}
                        className={`grid grid-cols-3 gap-4 px-6 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedDocuments.includes(doc.id) ? "bg-blue-50" : ""
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() => { }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-gray-400" />
                            <span className="text-sm text-gray-900 font-medium">{doc.name}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {doc.size} • {doc.type?.toUpperCase() || "FILE"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {doc.uploadedBy || "Me"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-sm text-gray-600 mb-4">
                      {documentSearch ? "No documents found matching your search." : "No documents available."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsDocumentsModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDocuments.length > 0) {
                    const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id));
                    if (selectedDocs.length > 0) {
                      // Simulate file selection from document
                      const doc = selectedDocs[0];
                      const mockFile = new File([""], doc.name, { type: "text/csv" });
                      setSelectedFile(mockFile);
                      setIsDocumentsModalOpen(false);
                      setSelectedDocuments([]);
                    }
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedDocuments.length === 0}
              >
                Attach {selectedDocuments.length > 0 && `(${selectedDocuments.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Default Data Formats Modal */}
      {isDecimalFormatModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsDecimalFormatModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[700px] max-w-[90vw] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Default Data Formats</h2>
              <button
                onClick={() => setIsDecimalFormatModalOpen(false)}
                className="text-red-500 hover:text-red-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">DATA TYPE</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">SELECT FORMAT AT FIELD LEVEL</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">DEFAULT FORMAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-sm text-gray-700">Decimal Format</td>
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectFormatAtFieldLevel}
                          onChange={(e) => setSelectFormatAtFieldLevel(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={decimalFormat}
                            onChange={(e) => setDecimalFormat(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            placeholder="1234567.89"
                          />
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsDecimalFormatModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsDecimalFormatModalOpen(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

