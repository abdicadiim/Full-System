import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, Info, ChevronLeft, Cloud, FileText, Folder, HardDrive, LayoutGrid, Building2, Box, Square } from "lucide-react";
import { recurringInvoicesAPI, customersAPI } from "../../../../services/api";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { parseImportFile } from "../../utils/importFileParser";

export default function ImportRecurringInvoices() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [characterEncoding, setCharacterEncoding] = useState<string>("UTF-8 (Unicode)");
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const [isFileSourceDropdownOpen, setIsFileSourceDropdownOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState("allDocuments");
  const [isDecimalFormatModalOpen, setIsDecimalFormatModalOpen] = useState(false);
  const [selectFormatAtFieldLevel, setSelectFormatAtFieldLevel] = useState(false);
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [currentStep, setCurrentStep] = useState("configure"); // "configure", "mapFields", "preview"
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<{ readyToImport: number; skippedRecords: number; unmappedFields: number }>({
    readyToImport: 0,
    skippedRecords: 0,
    unmappedFields: 0
  });
  const [importedFileHeaders, setImportedFileHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const encodingDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileSourceDropdownRef = useRef<HTMLDivElement | null>(null);
  const dropAreaRef = useRef<HTMLDivElement | null>(null);

  const getResponseArray = (response: any) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.customers)) return response.customers;
    return [];
  };

  const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
  const normalizeKey = (value: any) => normalizeText(value).replace(/[^a-z0-9]/g, "");

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (encodingDropdownRef.current && target && !encodingDropdownRef.current.contains(target)) {
        setIsEncodingDropdownOpen(false);
      }
      if (fileSourceDropdownRef.current && target && !fileSourceDropdownRef.current.contains(target)) {
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

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name?.toLowerCase().includes(documentSearch.toLowerCase());
    const matchesCategory = selectedDocumentCategory === "allDocuments" ||
      (selectedDocumentCategory === "files" && doc.category === "files") ||
      (selectedDocumentCategory === "bankStatements" && doc.category === "bankStatements");
    return matchesSearch && matchesCategory;
  });

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + (String(file.name).split(".").pop()?.toLowerCase() || "");
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.add("drag-over");
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove("drag-over");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      dropAreaRef.current.classList.remove("drag-over");
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type and size
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + String(file.name).split(".").pop()?.toLowerCase();
      const maxSize = 25 * 1024 * 1024; // 25MB

      if (validTypes.includes(fileExtension) && file.size <= maxSize) {
        setSelectedFile(file);
      } else {
        alert("Please select a valid file (CSV, TSV, or XLS) that is less than 25 MB.");
      }
    }
  };

  const parseCSV = (csvText: string) => {
    const normalizedText = String(csvText || "").replace(/^\uFEFF/, "").replace(/\r/g, "");
    const lines = normalizedText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    const delimiter = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : ',';

    // Improved CSV parsing that handles quoted values with commas
    const parseCSVLine = (line: string) => {
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
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          const value = (values[index] || '').replace(/^"|"$/g, '').trim();
          row[header] = value;
        });
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const handleNext = async () => {
    if (!selectedFile) {
      alert("Please select a file to continue.");
      return;
    }

    if (currentStep === "configure") {
      try {
        // Read and parse file
        const { headers, rows } = await parseImportFile(selectedFile as File);

        if (rows.length === 0) {
          alert("No data found in the file");
          return;
        }

        setImportedFileHeaders(headers);
        setCsvRows(rows);

        // Auto-map fields based on header names
        const autoMappings: Record<string, string> = {};
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase();
          // Try to match common field names
          if (lowerHeader.includes("profile") || lowerHeader.includes("profile name")) {
            autoMappings["Profile Name"] = header;
          } else if (lowerHeader.includes("customer") && lowerHeader.includes("id")) {
            autoMappings["Customer ID"] = header;
          } else if (lowerHeader.includes("customer") && !lowerHeader.includes("id")) {
            autoMappings["Customer Name"] = header;
          } else if (lowerHeader.includes("order") || lowerHeader.includes("order number")) {
            autoMappings["Order Number"] = header;
          } else if (lowerHeader.includes("repeat") || lowerHeader.includes("frequency")) {
            autoMappings["Repeat Every"] = header;
          } else if (lowerHeader.includes("start") || lowerHeader.includes("start date")) {
            autoMappings["Start Date"] = header;
          } else if (lowerHeader.includes("end") || lowerHeader.includes("end date")) {
            autoMappings["End Date"] = header;
          } else if (lowerHeader.includes("payment") && lowerHeader.includes("term")) {
            autoMappings["Payment Terms"] = header;
          } else if (lowerHeader.includes("currency")) {
            autoMappings["Currency"] = header;
          } else if (lowerHeader.includes("total") || lowerHeader.includes("amount")) {
            autoMappings["Total"] = header;
          }
        });

        setFieldMappings(autoMappings);
        setCurrentStep("mapFields");
      } catch (error: any) {
        console.error("Error reading file:", error);
        alert("Failed to read file. Please check the file format and try again.");
      }
    } else if (currentStep === "mapFields") {
      // Calculate preview data
      const readyCount = csvRows.length;
      const unmappedCount = Object.keys(fieldMappings).filter(key => !fieldMappings[key]).length;

      setPreviewData({
        readyToImport: readyCount,
        skippedRecords: 0,
        unmappedFields: unmappedCount
      });

      setCurrentStep("preview");
    }
  };

  const handlePrevious = () => {
    if (currentStep === "mapFields") {
      setCurrentStep("configure");
    } else if (currentStep === "preview") {
      setCurrentStep("mapFields");
    }
  };

  const handleCancel = () => {
    navigate("/sales/recurring-invoices");
  };

  const mapFieldValue = (row: Record<string, any>, mappedField: string) => {
    if (!mappedField) return '';
    // Try exact match first
    if (row[mappedField] !== undefined && row[mappedField] !== null && row[mappedField] !== '') {
      return String(row[mappedField]).trim();
    }
    // Try case-insensitive match
    const lowerMapped = mappedField.toLowerCase();
    for (const key in row) {
      if (key.toLowerCase() === lowerMapped) {
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
      const rowsToImport = csvRows.length
        ? csvRows
        : (await parseImportFile(selectedFile as File)).rows || [];
      if (!rowsToImport.length) {
        alert("No rows found in the selected file.");
        return;
      }

      const customersResponse = await customersAPI.getAll({ limit: 1000 });
      const customers = getResponseArray(customersResponse);

      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      const parseNumber = (value: any, fallback = 0): number => {
        const normalized = String(value ?? "")
          .replace(/,/g, "")
          .replace(/[^\d.-]/g, "")
          .trim();
        if (!normalized) return fallback;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const parseDateValue = (rawValue: any, fallbackDate: Date): string => {
        const raw = String(rawValue || "").trim();
        if (!raw) return new Date(fallbackDate).toISOString();

        const direct = new Date(raw);
        if (!Number.isNaN(direct.getTime())) {
          return direct.toISOString();
        }

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

      const normalizeFrequency = (rawFrequency: any): 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' => {
        const value = normalizeText(rawFrequency);
        if (!value) return "weekly";
        if (value.includes("bi") && value.includes("week")) return "biweekly";
        if (value.includes("day")) return "daily";
        if (value.includes("week")) return "weekly";
        if (value.includes("quarter")) return "quarterly";
        if (value.includes("year") || value.includes("annual")) return "yearly";
        if (value.includes("month")) return "monthly";
        return "weekly";
      };

      const normalizeStatus = (rawStatus: any): 'active' | 'paused' | 'stopped' | 'expired' => {
        const value = normalizeText(rawStatus);
        if (value === "paused" || value === "stopped" || value === "expired") return value;
        return "active";
      };

      const findCustomerId = (customerIdentifier: string, customerName: string): string => {
        const normalizedIdentifier = normalizeText(customerIdentifier);
        const normalizedIdentifierKey = normalizeKey(customerIdentifier);
        const normalizedName = normalizeText(customerName);
        const normalizedNameKey = normalizeKey(customerName);
        if (!normalizedIdentifier && !normalizedName) return "";

        const match = customers.find((customer: any) => {
          const candidateValues = [
            customer?.id,
            customer?._id,
            customer?.customerNumber,
            customer?.name,
            customer?.displayName,
            customer?.companyName,
            customer?.email
          ].filter(Boolean);

          return candidateValues.some((candidate) => {
            const text = normalizeText(candidate);
            const key = normalizeKey(candidate);

            // Exact match first
            if (normalizedIdentifier && (text === normalizedIdentifier || key === normalizedIdentifierKey)) {
              return true;
            }
            if (normalizedName && (text === normalizedName || key === normalizedNameKey)) {
              return true;
            }

            // Then relaxed contains check
            if (normalizedIdentifier && (text.includes(normalizedIdentifier) || normalizedIdentifier.includes(text))) {
              return true;
            }
            if (normalizedIdentifierKey && (key.includes(normalizedIdentifierKey) || normalizedIdentifierKey.includes(key))) {
              return true;
            }
            if (normalizedName && (text.includes(normalizedName) || normalizedName.includes(text))) {
              return true;
            }
            if (normalizedNameKey && (key.includes(normalizedNameKey) || normalizedNameKey.includes(key))) {
              return true;
            }

            return false;
          });
        });
        return String(match?.id || match?._id || "").trim();
      };

      for (let rowIndex = 0; rowIndex < rowsToImport.length; rowIndex++) {
        const row = rowsToImport[rowIndex] as Record<string, string>;
        try {
          // Helper function to get value from row using field mapping or direct header match
          const getValue = (fieldName: string) => {
            // First try the field mapping
            const mappedField = fieldMappings[fieldName];
            if (mappedField) {
              const value = mapFieldValue(row, mappedField);
              if (value) return value;
            }

            // Try direct header match (case-insensitive)
            const lowerField = fieldName.toLowerCase();
            for (const header of importedFileHeaders) {
              if (header.toLowerCase() === lowerField) {
                const value = String(row[header] || '').trim();
                if (value) return value;
              }
            }

            // Common aliases fallback
            const aliases: Record<string, string[]> = {
              "Customer Name": ["Customer", "CustomerName", "Customer Name"],
              "Customer ID": ["CustomerId", "Customer_Id", "Customer ID", "Customer Identifier"],
              "Profile Name": ["Profile", "ProfileName"],
              "Repeat Every": ["Frequency", "Repeat", "RepeatEvery"],
              "Start Date": ["Start", "StartDate"],
              "End Date": ["End", "EndDate"],
              "Order Number": ["Order #", "OrderNumber"],
            };
            const searchTerms = [fieldName, ...(aliases[fieldName] || [])].map((item) => normalizeText(item));
            const rowKeys = Object.keys(row || {});
            for (const rowKey of rowKeys) {
              const normalizedRowKey = normalizeText(rowKey);
              if (searchTerms.includes(normalizedRowKey)) {
                const value = String(row[rowKey] || "").trim();
                if (value) return value;
              }
            }

            return '';
          };

          // Get required fields
          const profileName = getValue("Profile Name");
          const customerName = getValue("Customer Name");
          const customerIdentifier = getValue("Customer ID");

          // Skip if required fields are missing
          if (!profileName && !customerName && !customerIdentifier) {
            skippedCount++;
            continue;
          }

          // Find customer by name
          const customerId = findCustomerId(customerIdentifier || customerName, customerName);
          if (!customerId) {
            skippedCount++;
            errors.push(`Row ${rowIndex + 1}: Customer "${customerIdentifier || customerName || "-"}" not found`);
            continue;
          }

          const parsedStartDate = parseDateValue(getValue("Start Date"), new Date());
          const endDateValue = getValue("End Date");
          const parsedEndDate = endDateValue ? parseDateValue(endDateValue, new Date(parsedStartDate)) : undefined;
          const frequency = normalizeFrequency(getValue("Repeat Every") || getValue("Frequency"));

          const quantity = Math.max(parseNumber(getValue("Quantity"), 1), 1);
          const rate = parseNumber(getValue("Rate"), 0);
          const totalValue = getValue("Total") || getValue("Amount");
          const lineTotal = parseNumber(totalValue, quantity * rate);
          const taxRate = parseNumber(getValue("Tax"), 0);
          const taxAmount = taxRate > 0 ? (lineTotal * taxRate) / 100 : 0;
          const subtotal = lineTotal;
          const total = subtotal + taxAmount;
          const description = getValue("Item Description") || getValue("Description") || getValue("Item Name") || "Imported Item";

          const items = [{
            name: description,
            description: description,
            quantity: quantity,
            unitPrice: rate,
            taxRate: taxRate,
            taxAmount: taxAmount,
            total: lineTotal
          }];

          const recurringInvoiceData = {
            profileName: profileName || `Recurring Invoice ${importedCount + 1}`,
            customer: customerId,
            customerId: customerId,
            orderNumber: getValue("Order Number") || "",
            frequency: frequency,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            paymentTerms: getValue("Payment Terms") || "Due on Receipt",
            accountsReceivable: getValue("Accounts Receivable") || "Accounts Receivable",
            salesperson: getValue("Salesperson") || "",
            items: items,
            subtotal: subtotal,
            subTotal: subtotal,
            tax: taxAmount,
            discount: parseNumber(getValue("Discount"), 0),
            shippingCharges: 0,
            adjustment: 0,
            total: total,
            balanceDue: total,
            balance: total,
            amount: total,
            currency: (getValue("Currency") || "USD").toUpperCase(),
            notes: getValue("Customer Notes") || getValue("Notes") || "",
            terms: getValue("Terms and Conditions") || "",
            attachedFiles: [],
            status: normalizeStatus(getValue("Status")),
            createdAt: new Date().toISOString()
          };

          const created = await recurringInvoicesAPI.create(recurringInvoiceData);
          const isCreated = created?.success || created?.code === 0 || !!created?.data;
          if (!isCreated) {
            throw new Error(created?.message || "Failed to create recurring invoice");
          }

          importedCount++;
        } catch (error: any) {
          console.error("Error importing recurring invoice:", error);
          skippedCount++;
          errors.push(`Row ${rowIndex + 1}: ${error.message || String(error)}`);
        }
      }

      // Trigger event to refresh recurring invoices list
      window.dispatchEvent(new Event("recurringInvoicesUpdated"));
      window.dispatchEvent(new Event("storage"));

      // Show success message
      if (importedCount > 0) {
        alert(
          `Successfully imported ${importedCount} recurring invoice(s)${
            skippedCount > 0 ? `\n${skippedCount} record(s) skipped` : ""
          }${errors.length > 0 ? `\n\nErrors:\n${errors.slice(0, 8).join("\n")}${errors.length > 8 ? "\n..." : ""}` : ""}`
        );
      } else {
        alert(`Failed to import recurring invoices.${errors.length > 0 ? `\n${errors.join('\n')}` : ''}`);
        return;
      }

      // Navigate to recurring invoices list
      navigate("/sales/recurring-invoices");
    } catch (error) {
      console.error("Error importing file:", error);
      alert("Failed to import file. Please check the file format and try again.");
    }
  };

  const downloadSampleFile = (type: "csv" | "xls") => {
    const headers = [
      "Profile Name",
      "Customer Name",
      "Order Number",
      "Repeat Every",
      "Start Date",
      "End Date",
      "Payment Terms",
      "Currency",
      "Total",
      "Item Description",
      "Quantity",
      "Rate",
      "Notes"
    ];

    const sampleRow = [
      "Monthly Support Plan",
      "Sample Customer",
      "SO-1001",
      "Month",
      "2026-02-15",
      "2026-12-31",
      "Due on Receipt",
      "USD",
      "1000",
      "Support Retainer",
      "1",
      "1000",
      "Imported recurring invoice sample"
    ];

    const isCsv = type === "csv";
    const delimiter = isCsv ? "," : "\t";
    const extension = isCsv ? "csv" : "xls";
    const mimeType = isCsv
      ? "text/csv;charset=utf-8;"
      : "application/vnd.ms-excel;charset=utf-8;";

    const content = [headers, sampleRow]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(delimiter))
      .join("\n");

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recurring-invoices-import-sample.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredEncodingOptions = encodingOptions.filter(option =>
    option.toLowerCase().includes(encodingSearch.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentStep === "configure" ? "Recurring Invoices - Select File" : currentStep === "mapFields" ? "Map Fields" : "Preview"}
            </h1>
            <button className="p-2 hover:bg-gray-100 rounded-lg text-red-500 hover:text-red-600 transition-colors" onClick={handleCancel}>
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.xls,.xlsx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>

            {/* Sample File Links */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
              <p className="text-sm text-gray-700">
                Download a{" "}
                <button
                  type="button"
                  onClick={() => downloadSampleFile("csv")}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                >
                  sample csv file
                </button>
                {" "}or{" "}
                <button
                  type="button"
                  onClick={() => downloadSampleFile("xls")}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                >
                  sample xls file
                </button>
                {" "}and compare it to your import file to ensure you have the file perfect for the import.
              </p>
              <div
                className="mt-3 flex items-center gap-2 text-sm text-blue-600 cursor-pointer hover:text-blue-700 group transition-colors"
                onClick={() => setIsDecimalFormatModalOpen(true)}
              >
                <span className="font-semibold underline">Default Data Formats</span>
                <HelpCircle size={14} className="group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* Character Encoding */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-gray-700">Character Encoding</span>
                <HelpCircle size={16} className="text-gray-400 cursor-help" />
              </div>
              <div
                className="relative"
                ref={encodingDropdownRef}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-blue-500 transition-colors"
                  onClick={() => setIsEncodingDropdownOpen(!isEncodingDropdownOpen)}
                >
                  <span className="text-sm font-medium">{characterEncoding}</span>
                  {isEncodingDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>
                {isEncodingDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                      <Search size={16} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search encoding..."
                        value={encodingSearch}
                        onChange={(e) => setEncodingSearch(e.target.value)}
                        className="flex-1 text-sm bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredEncodingOptions.map((option) => (
                        <div
                          key={option}
                          className={`p-3 cursor-pointer hover:bg-blue-50 flex items-center justify-between transition-colors ${option === characterEncoding ? "bg-blue-50 border-l-4 border-blue-600" : ""
                            }`}
                          onClick={() => {
                            setCharacterEncoding(option);
                            setIsEncodingDropdownOpen(false);
                            setEncodingSearch("");
                          }}
                        >
                          <span className="text-sm font-medium text-gray-900">{option}</span>
                          {option === characterEncoding && (
                            <Check size={16} className="text-blue-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Page Tips */}
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={20} className="text-yellow-600" />
                <h3 className="text-base font-semibold text-gray-900">Page Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>
                  You can download the{" "}
                  <button
                    type="button"
                    onClick={() => downloadSampleFile("xls")}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                  >
                    sample xls file
                  </button>
                  {" "}to get detailed information about the data fields used while importing.
                </li>
                <li>
                  If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
                </li>
              </ul>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                className="px-8 py-3 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
                onClick={handleNext}
              >
                Next &gt;
              </button>
              <button
                className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {currentStep === "mapFields" && (
          <>
            {/* Selected File Info */}
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                Your Selected File: <span className="font-semibold">{selectedFile?.name || "file.csv"}</span>
              </p>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                The best match to each field on the selected file have been auto-selected.
              </p>
            </div>

            {/* Recurring Invoice Fields Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recurring Invoice Details</h2>
              <div className="space-y-4">
                {[
                  { field: "Profile Name", required: true },
                  { field: "Customer Name", required: true },
                  { field: "Customer ID", required: false },
                  { field: "Order Number", required: false },
                  { field: "Repeat Every", required: false },
                  { field: "Start Date", required: false },
                  { field: "End Date", required: false },
                  { field: "Payment Terms", required: false },
                  { field: "Currency", required: false },
                  { field: "Total", required: false },
                  { field: "Amount", required: false },
                  { field: "Item Description", required: false },
                  { field: "Description", required: false },
                  { field: "Quantity", required: false },
                  { field: "Rate", required: false },
                  { field: "Tax", required: false },
                  { field: "Salesperson", required: false },
                  { field: "Accounts Receivable", required: false },
                  { field: "Customer Notes", required: false },
                  { field: "Notes", required: false },
                  { field: "Terms and Conditions", required: false },
                ].map((item) => (
                  <div key={item.field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">
                      {item.field}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <div className="relative">
                      <select
                        value={fieldMappings[item.field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [item.field]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={handlePrevious}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <div className="flex items-center gap-3">
                <button
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  onClick={handleNext}
                >
                  Next &gt;
                </button>
                <button
                  className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {currentStep === "preview" && (
          <>
            {/* Information Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">
                All Recurring Invoices in your file are ready to be imported
              </p>
            </div>

            {/* Preview Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              {/* Ready to Import */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Recurring Invoices that are ready to be imported - {previewData.readyToImport}
                  </span>
                </div>
              </div>

              {/* Skipped Records */}
              {previewData.skippedRecords > 0 && (
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <HelpCircle size={20} className="text-orange-500" />
                    <span className="text-sm font-medium text-gray-700">
                      No. of Records skipped - {previewData.skippedRecords}
                    </span>
                  </div>
                </div>
              )}

              {/* Unmapped Fields */}
              {previewData.unmappedFields > 0 && (
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <HelpCircle size={20} className="text-orange-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Unmapped Fields - {previewData.unmappedFields}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={handlePrevious}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <div className="flex items-center gap-3">
                <button
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  onClick={handleImport}
                >
                  Import
                </button>
                <button
                  className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
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
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                {selectedCloudProvider === "gdrive" ? (
                  <div className="flex flex-col items-center max-w-lg">
                    <div className="mb-8">
                      <div className="relative w-32 h-32">
                        <svg viewBox="0 0 256 256" className="w-full h-full">
                          <path d="M128 32L32 128l96 96V32z" fill="#0F9D58" />
                          <path d="M128 32l96 96-96 96V32z" fill="#4285F4" />
                          <path d="M32 128l96 96V128L32 32v96z" fill="#F4B400" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                      <p>By clicking on this button you agree to the provider's terms of use and privacy policy.</p>
                    </div>
                    <button
                      className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                      onClick={() => window.open("https://accounts.google.com/v3/signin/", "_blank")}
                    >
                      Authenticate Google
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                      {selectedCloudProvider === "zoho"
                        ? "Zoho WorkDrive is an online file sync, storage and content collaboration platform."
                        : "Select a cloud storage provider to get started."}
                    </p>
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
                onClick={() => setIsCloudPickerOpen(false)}
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
              <div className="flex items-center gap-4">
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

            <div className="flex flex-1 overflow-hidden">
              <div className="w-[200px] bg-gray-50 border-r border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">INBOXES</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedDocumentCategory("allDocuments")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedDocumentCategory === "allDocuments" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"}`}
                  >
                    <FileText size={18} />
                    All Documents
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                  <div>FILE NAME</div>
                  <div>DETAILS</div>
                  <div>UPLOADED BY</div>
                </div>

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
                      className={`grid grid-cols-3 gap-4 px-6 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedDocuments.includes(doc.id) ? "bg-blue-50" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedDocuments.includes(doc.id)} onChange={() => { }} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                        <span className="text-sm text-gray-900 font-medium">{doc.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">{doc.size}</div>
                      <div className="text-sm text-gray-600">{doc.uploadedBy || "Me"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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
                    const selectedDoc = documents.find(d => d.id === selectedDocuments[0]);
                    if (selectedDoc) {
                      const mockFile = new File([""], selectedDoc.name, { type: "text/csv" });
                      setSelectedFile(mockFile);
                      setIsDocumentsModalOpen(false);
                      setSelectedDocuments([]);
                    }
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Default Data Formats</h2>
              <button onClick={() => setIsDecimalFormatModalOpen(false)} className="text-red-500 hover:text-red-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-sm font-semibold text-gray-700">
                    <th className="text-left py-3 px-4">DATA TYPE</th>
                    <th className="text-left py-3 px-4">SELECT FORMAT AT FIELD LEVEL</th>
                    <th className="text-left py-3 px-4">DEFAULT FORMAT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 text-sm text-gray-700">
                    <td className="py-4 px-4">Decimal Format</td>
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectFormatAtFieldLevel}
                        onChange={(e) => setSelectFormatAtFieldLevel(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={decimalFormat}
                        onChange={(e) => setDecimalFormat(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsDecimalFormatModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsDecimalFormatModalOpen(false)}
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
