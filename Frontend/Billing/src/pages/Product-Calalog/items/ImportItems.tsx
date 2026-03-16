import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info, Loader2 } from "lucide-react";
import { getAllDocuments } from "../../../utils/documentStorage";
import { itemsAPI, accountantAPI } from "../../../services/api";
import { toast } from "react-toastify";

const ITEMS_KEY = "inv_items_v1";

interface Item {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  unit?: string;
  sellingPrice?: number;
  costPrice?: number;
  salesAccount?: string;
  purchaseAccount?: string;
  inventoryAccount?: string;
  active?: boolean;
  sellable?: boolean;
  purchasable?: boolean;
  trackInventory?: boolean;
  transactions?: any[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  history?: any[];
  [key: string]: any;
}

interface Document {
  id: string;
  name: string;
  folder: string;
  module: string;
  associatedTo?: string;
  [key: string]: any;
}

// Helper functions for localStorage
const getLS = (k: string) => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(k);
  }
  return null;
};

const setLS = (k: string, v: string) => {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(k, v);
  }
};

const uid = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export default function ImportItems() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const [isFileSourceDropdownOpen, setIsFileSourceDropdownOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState("allDocuments");
  const [documentSearch, setDocumentSearch] = useState("");
  // const [documentSearch, setDocumentSearch] = useState("");]/
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");
  const [currentStep, setCurrentStep] = useState("configure"); // "configure", "mapFields", "preview"
  const [fieldMappings, setFieldMappings] = useState<{ [key: string]: string }>({});
  const [previewData, setPreviewData] = useState({
    readyToImport: 0,
    skippedRecords: 0,
    unmappedFields: 0
  });
  const [previewDetails, setPreviewDetails] = useState<{
    ready: any[];
    skipped: { row: any; reason: string }[];
    unmapped: string[];
  }>({ ready: [], skipped: [], unmapped: [] });
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [saveSelections, setSaveSelections] = useState(false);
  const [isDecimalFormatModalOpen, setIsDecimalFormatModalOpen] = useState(false);
  const [selectFormatAtFieldLevel, setSelectFormatAtFieldLevel] = useState(false);
  const [importedFileHeaders, setImportedFileHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const encodingDropdownRef = useRef<HTMLDivElement>(null);
  const fileSourceDropdownRef = useRef<HTMLDivElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Load accounts for mapping names to IDs
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await accountantAPI.getAccounts({ limit: 1000 });
        setDbAccounts(Array.isArray(response?.data || response) ? (response.data || response) : []);
      } catch (e) {
        console.error("Failed to fetch accounts", e);
      }
    };
    fetchAccounts();
  }, []);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (encodingDropdownRef.current && !(encodingDropdownRef.current as HTMLElement).contains(target)) {
        setIsEncodingDropdownOpen(false);
      }
      if (fileSourceDropdownRef.current && !(fileSourceDropdownRef.current as HTMLElement).contains(target)) {
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
      const fileExtension = "." + (file.name.split(".").pop() || "").toLowerCase();
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
      // Parse file when selected
      parseFile(file);
    }
  };

  const parseFile = async (file: File) => {
    try {
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const { headers, rows } = parseCSV(fileContent as string);
      setImportedFileHeaders(headers);
      setCsvRows(rows);

      // Auto-map fields
      autoMapFields(headers);
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Failed to parse file. Please check the file format.");
    }
  };

  const autoMapFields = (headers: string[]) => {
    const mappings: { [key: string]: string } = {};
    const fieldVariations: { [key: string]: string[] } = {
      "Item Name": ["name", "item name", "product name", "item"],
      "SKU": ["sku", "product code", "item code", "code"],
      "Description": ["description", "desc", "details"],
      "Unit": ["unit", "unit of measure", "uom"],
      "Selling Price": ["selling price", "sales rate", "rate", "price", "sale price", "selling"],
      "Purchase Price": ["purchase price", "purchase rate", "cost", "cost price", "purchase"],
      "Sales Account": ["sales account", "income account", "revenue account"],
      "Purchase Account": ["purchase account", "expense account", "cost account"],
      "Inventory Account": ["inventory account", "stock account"],
      "Status": ["status", "active", "state"]
    };

    Object.keys(fieldVariations).forEach(field => {
      for (const header of headers) {
        const lowerHeader = header.toLowerCase();

        // Prevent "Selling Price" from matching "Purchase Price" or "Cost"
        if (field === "Selling Price" && (lowerHeader.includes("purchase") || lowerHeader.includes("cost") || lowerHeader.includes("expense"))) {
          continue;
        }

        // Prevent "Purchase Price" from matching "Selling Price" or "Sales"
        if (field === "Purchase Price" && (lowerHeader.includes("selling") || lowerHeader.includes("sales") || lowerHeader.includes("revenue") || lowerHeader.includes("income"))) {
          continue;
        }

        // Prevent Price/Cost fields from matching Description fields (e.g. "Purchase Description" should not match "Purchase Price")
        if ((field === "Selling Price" || field === "Purchase Price") && lowerHeader.includes("description")) {
          continue;
        }

        if (fieldVariations[field as keyof typeof fieldVariations].some(variation => lowerHeader.includes(variation))) {
          mappings[field] = header;
          break;
        }
      }
    });

    setFieldMappings(mappings);
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
    setDocuments(getAllDocuments());
  };

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

  // Filter documents based on category and search
  const getFilteredDocuments = () => {
    let filtered = documents;

    if (selectedDocumentCategory === "files") {
      filtered = filtered.filter(doc => doc.folder === "Files" || doc.module === "Documents");
    } else if (selectedDocumentCategory === "bankStatements") {
      filtered = filtered.filter(doc => doc.folder === "Bank Statements" || doc.name.toLowerCase().includes("bank") || doc.name.toLowerCase().includes("statement"));
    }

    if (documentSearch) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
        (doc.associatedTo && doc.associatedTo.toLowerCase().includes(documentSearch.toLowerCase()))
      );
    }

    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      (dropAreaRef.current as HTMLElement).classList.add("drag-over");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      (dropAreaRef.current as HTMLElement).classList.remove("drag-over");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropAreaRef.current) {
      (dropAreaRef.current as HTMLElement).classList.remove("drag-over");
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + (file.name.split(".").pop() || "").toLowerCase();
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
      parseFile(file);
    }
  };

  const handleClose = () => {
    navigate("/products/items");
  };

  const handleCancel = () => {
    navigate("/products/items");
  };

  const handleNext = () => {
    if (!selectedFile) {
      alert("Please select a file to continue.");
      return;
    }
    if (currentStep === "configure") {
      setCurrentStep("mapFields");
    } else if (currentStep === "mapFields") {
      // Calculate preview data
      calculatePreviewData();
      setCurrentStep("preview");
    }
  };

  const calculatePreviewData = async () => {
    try {
      const existingItemsResponse = await itemsAPI.getAll();
      const existingItems = existingItemsResponse.data || [];

      const ready: any[] = [];
      const skipped: { row: any; reason: string }[] = [];

      csvRows.forEach(row => {
        const nameValue = getValue(row, "Item Name");
        if (!nameValue) {
          skipped.push({ row, reason: "Missing Item Name" });
          return;
        }

        // Check for duplicates
        const skuValue = getValue(row, "SKU") || "";
        const existingItem = existingItems.find((item: any) =>
          (item.name && item.name.toLowerCase() === nameValue.toLowerCase()) ||
          (item.sku && skuValue && item.sku.toLowerCase() === skuValue.toLowerCase())
        );

        if (existingItem && duplicateHandling === "skip") {
          skipped.push({ row, reason: "Duplicate Item (Skipped)" });
          return;
        }

        ready.push(row);
      });

      const unmapped = Object.keys(fieldMappings).filter(key => !fieldMappings[key]);

      setPreviewData({
        readyToImport: ready.length,
        skippedRecords: skipped.length,
        unmappedFields: unmapped.length
      });

      setPreviewDetails({
        ready,
        skipped,
        unmapped
      });

    } catch (e) {
      console.error("Failed to fetch server items for preview", e);
      // Fallback to simple counting if server check fails
      setPreviewData({
        readyToImport: csvRows.length,
        skippedRecords: 0,
        unmappedFields: 0
      });
      setPreviewDetails({
        ready: csvRows,
        skipped: [],
        unmapped: []
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep === "mapFields") {
      setCurrentStep("configure");
    } else if (currentStep === "preview") {
      setCurrentStep("mapFields");
    }
  };

  const parseCSV = (csvText: string) => {
    // Check if it's an HTML table (common for our "Excel" exports)
    if (csvText.trim().toLowerCase().startsWith("<!doctype html") || csvText.trim().toLowerCase().startsWith("<html")) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(csvText, "text/html");
      const table = doc.querySelector("table");
      if (table) {
        const rows = Array.from(table.querySelectorAll("tr"));
        if (rows.length === 0) return { headers: [], rows: [] };

        const headers = Array.from(rows[0].querySelectorAll("th, td")).map(cell => cell.textContent?.trim() || "");
        const dataRows = [];
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll("td"));
          if (cells.length > 0) {
            const rowData: any = {};
            headers.forEach((header, index) => {
              if (header) {
                rowData[header] = cells[index]?.textContent?.trim() || "";
              }
            });
            dataRows.push(rowData);
          }
        }
        return { headers: headers.filter(h => h), rows: dataRows };
      }
    }

    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseCSVLine = (line: string) => {
      const result = [];
      let current = '';
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
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerValues = parseCSVLine(lines[0]);
    const headers = headerValues.map(h => h.replace(/^"|"$/g, '').trim());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.some(v => v)) {
        const row: any = {};
        headers.forEach((header, index) => {
          const value = (values[index] || '').replace(/^"|"$/g, '').trim();
          row[header] = value;
        });
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const mapFieldValue = (row: any, mappedField: string) => {
    if (!mappedField) return '';
    if (row[mappedField] !== undefined && row[mappedField] !== null && row[mappedField] !== '') {
      return String(row[mappedField]).trim();
    }
    const lowerMapped = mappedField.toLowerCase();
    for (const key in row) {
      if (key.toLowerCase() === lowerMapped) {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  const getValue = (row: any, fieldName: string) => {
    const mappedField = fieldMappings[fieldName];
    if (mappedField) {
      return mapFieldValue(row, mappedField);
    }

    const lowerField = fieldName.toLowerCase();
    for (const header of importedFileHeaders) {
      if (header.toLowerCase() === lowerField) {
        const value = String(row[header] || '').trim();
        if (value) return value;
      }
    }

    return '';
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }

    setIsImporting(true);
    const loadingToast = toast.loading(`Importing ${csvRows.length} items...`);

    let importedCount = 0;
    let skippedCount = 0;

    try {
      // 1. Get all existing items from server to check for duplicates
      const existingItemsResponse = await itemsAPI.getAll();
      const serverItems = existingItemsResponse.data || [];

      // 2. Loop through each row and save to server
      for (const row of csvRows) {
        try {
          const nameValue = getValue(row, "Item Name") || getValue(row, "name");
          if (!nameValue) {
            skippedCount++;
            continue;
          }

          // Resolve accounts from names to IDs
          const resolveAccount = (fieldName: string, defaultName: string) => {
            const accName = getValue(row, fieldName) || defaultName;
            const found = dbAccounts.find(a =>
              a.accountName?.toLowerCase() === accName.toLowerCase() ||
              a.name?.toLowerCase() === accName.toLowerCase()
            );
            return found ? (found._id || found.id) : accName;
          };

          const salesAcc = resolveAccount("Sales Account", "Sales");
          const purchaseAcc = resolveAccount("Purchase Account", "Cost of Goods Sold");
          const inventoryAcc = resolveAccount("Inventory Account", "Inventory");

          // Check if item exists on server by name or SKU
          const skuValue = getValue(row, "SKU") || "";
          const existingServerItem = serverItems.find((si: any) =>
            (si.name && si.name.toLowerCase() === nameValue.toLowerCase()) ||
            (si.sku && si.sku === skuValue && si.sku !== "")
          );

          const trackInventory = getValue(row, "Track Inventory") ? getValue(row, "Track Inventory")?.toLowerCase() !== "false" : true;
          const productType = getValue(row, "Product Type") || (trackInventory ? "Goods" : "Service");
          const finalType = productType.toLowerCase() === "service" ? "Service" : "Goods";

          const parseNum = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            // Remove currency symbols, commas, and percentage signs
            const cleaned = String(val).replace(/[^\d.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          };

          const itemData: any = {
            name: nameValue,
            sku: skuValue,
            type: finalType,
            description: getValue(row, "Description") || "",
            salesDescription: getValue(row, "Description") || "",
            purchaseDescription: getValue(row, "Purchase Description") || "",
            unit: getValue(row, "Unit") || "pcs",
            sellingPrice: parseNum(getValue(row, "Selling Price") || getValue(row, "Rate") || getValue(row, "Sales Rate") || getValue(row, "Price")),
            costPrice: parseNum(getValue(row, "Purchase Price") || getValue(row, "Cost") || getValue(row, "Purchase Rate") || getValue(row, "Cost Price")),
            salesAccount: salesAcc,
            purchaseAccount: purchaseAcc,
            inventoryAccount: inventoryAcc,
            active: getValue(row, "Status")?.toLowerCase() !== "inactive",
            sellable: getValue(row, "Sellable") ? getValue(row, "Sellable")?.toLowerCase() !== "false" : true,
            purchasable: getValue(row, "Purchasable") ? getValue(row, "Purchasable")?.toLowerCase() !== "false" : true,
            trackInventory: trackInventory,
            reorderPoint: parseNum(getValue(row, "Reorder Point")),
            openingStock: parseNum(getValue(row, "Opening Stock")),
            openingStockValue: parseNum(getValue(row, "Opening Stock Value")),
          };

          if (existingServerItem) {
            if (duplicateHandling === "skip") {
              skippedCount++;
              continue;
            } else if (duplicateHandling === "overwrite") {
              await itemsAPI.update(existingServerItem._id || existingServerItem.id, itemData);
              importedCount++;
            }
          } else {
            await itemsAPI.create(itemData);
            importedCount++;
          }
        } catch (error: any) {
          console.error("Error importing item row:", error);
          skippedCount++;
          const errorMsg = error.response?.data?.message || error.message || "Unknown error";
          toast.error(`Row failed: ${errorMsg}`, { autoClose: 3000 });
        }
      }

      toast.dismiss(loadingToast);

      if (importedCount > 0) {
        toast.success(`Successfully imported ${importedCount} item(s)`);
      } else if (skippedCount > 0) {
        toast.error("No items were imported. All records were skipped or failed.");
      }

      if (skippedCount > 0 && importedCount > 0) {
        toast(`${skippedCount} record(s) skipped`, { icon: 'ℹ️' });
      }

      // 3. Clear localStorage cache to force refresh if needed (though ItemsPage uses API)
      // localStorage.removeItem(ITEMS_KEY);

      // 4. Final navigation
      navigate("/products/items");

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Bulk import failed:", error);
      toast.error("Failed to complete import process");
    } finally {
      setIsImporting(false);
    }
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
              {currentStep === "configure" ? "Items - Select File" : currentStep === "mapFields" ? "Map Fields" : "Preview"}
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
              <div className={`w-10 h-10 ${currentStep === "configure" ? "bg-blue-600 text-white" : "bg-[#125562] text-white"} rounded-full flex items-center justify-center font-bold text-sm shadow-md`}>
                {currentStep === "configure" ? "1" : <Check size={16} />}
              </div>
              <div className={`text-sm font-semibold mt-2 ${currentStep === "configure" ? "text-blue-600" : "text-gray-600"}`}>Configure</div>
            </div>
            <div className={`w-24 h-1 mx-4 ${currentStep !== "configure" ? "bg-blue-600" : "bg-gray-300"}`}></div>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 ${currentStep === "mapFields" ? "bg-blue-600 text-white" : currentStep === "preview" ? "bg-[#125562] text-white" : "bg-gray-200 text-gray-600"} rounded-full flex items-center justify-center font-bold text-sm ${currentStep === "mapFields" ? "shadow-md" : ""}`}>
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
                  className="px-6 py-3 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 mx-auto cursor-pointer transition-all"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
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
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer transition-all"
                      style={{ color: "#156372" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#156372";
                      }}
                      onClick={handleAttachFromDesktop}
                    >
                      Attach From Desktop
                    </div>
                    <div
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer transition-all"
                      style={{ color: "#156372" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#156372";
                      }}
                      onClick={handleAttachFromCloud}
                    >
                      Attach From Cloud
                    </div>
                    <div
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer transition-all"
                      style={{ color: "#156372" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#156372";
                      }}
                      onClick={handleAttachFromDocuments}
                    >
                      Attach From Documents
                    </div>
                  </div>
                )}
              </div>
              {selectedFile && (
                <p className="mt-4 text-sm font-medium text-[#125562]">
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
                  onClick={(e) => {
                    e.preventDefault();
                    const headers = [
                      "Item Name",
                      "Description",
                      "SKU",
                      "Rate",
                      "Tax1 Name",
                      "Tax1 Percentage",
                      "Tax1 Type",
                      "Product Type",
                      "Status",
                      "CF.custom_field"
                    ];

                    const data = [
                      [
                        "HP USB 2.0 Docking Station",
                        "4 USB 2.0, 1 DVI External Monitor Port, 1 RJ-45",
                        "UDB02",
                        "GBP 600.00",
                        "Standard Rate",
                        "20",
                        "ItemAmount",
                        "goods",
                        "Active",
                        "1000"
                      ],
                      [
                        "Standard Plan",
                        "This is a 12 months plan, 150GB space, 1500GB transfer, 1000 email accounts, 25 MYSQL databases, unlimited email forwards.",
                        "STANDARD12",
                        "GBP 7.00",
                        "Standard Rate",
                        "20",
                        "ItemAmount",
                        "service",
                        "Active",
                        "6000"
                      ],
                      [
                        "Deluxe Plan",
                        "This is a 12 months plan, 300GB space, 3000GB transfer, 2000 email accounts, 50 MYSQL databases, unlimited email forwards.",
                        "DELUX12",
                        "GBP 14.00",
                        "Standard Rate",
                        "20",
                        "ItemAmount",
                        "service",
                        "Active",
                        "200"
                      ],
                      [
                        "Premium Plan",
                        "This is a 12 month plan, 500GB space, 5000 GB transfer, 70 MYSQL databases, unlimited email forwards.",
                        "PREMIUM12",
                        "GBP 17.00",
                        "Standard Rate",
                        "20",
                        "ItemAmount",
                        "service",
                        "Active",
                        "100"
                      ]
                    ];

                    const csvContent = [
                      headers.join(","),
                      ...data.map(row => row.map(field => `"${field}"`).join(","))
                    ].join("\n");

                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const link = document.createElement("a");
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", "item_sample_import.csv");
                    link.style.visibility = "hidden";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none cursor-pointer p-0 inline"
                >
                  sample csv file
                </button>
                {" "}or{" "}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const headers = [
                      "Item Name",
                      "Description",
                      "SKU",
                      "Rate",
                      "Tax1 Name",
                      "Tax1 Percentage",
                      "Tax1 Type",
                      "Product Type",
                      "Status",
                      "CF.custom_field"
                    ];

                    const data = [
                      [
                        "HP USB 2.0 Docking Station",
                        "4 USB 2.0, 1 DVI External Monitor Port, 1 RJ-45",
                        "UDB02",
                        "GBP 600.00",
                        "Standard Rate",
                        "20",
                        "ItemAmount",
                        "goods",
                        "Active",
                        "1000"
                      ],
                      [
                        "Standard Plan",
                        "This is a 12 months plan, 150GB space, 1500GB transfer, 1000 email accounts, 25 MYSQL databases, unlimited email forwards.",
                        "STANDARD12",
                        "GBP 7.00",
                        "Standard Rate",
                        "20",
                        "ItemAmount",
                        "service",
                        "Active",
                        "6000"
                      ],
                      [
                        "Deluxe Plan",
                        "This is a 12 months plan, 300GB space, 3000GB transfer, 2000 email accounts, 50 MYSQL databases, unlimited email forwards.",
                        "DELUX12",
                        "GBP 14.00",
                        "Standard Rate",
                        "20",
                        "ItemAmount",
                        "service",
                        "Active",
                        "200"
                      ],
                      [
                        "Premium Plan",
                        "This is a 12 month plan, 500GB space, 5000 GB transfer, 70 MYSQL databases, unlimited email forwards.",
                        "PREMIUM12",
                        "GBP 17.00",
                        "Standard Rate",
                        "20",
                        "ItemAmount",
                        "service",
                        "Active",
                        "100"
                      ]
                    ];

                    // Create Excel-compatible HTML table
                    let xlsContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
                    xlsContent += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Items</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
                    xlsContent += '<body><table>';

                    // Add headers
                    xlsContent += '<tr>';
                    headers.forEach(header => {
                      xlsContent += `<th>${header}</th>`;
                    });
                    xlsContent += '</tr>';

                    // Add data rows
                    data.forEach(row => {
                      xlsContent += '<tr>';
                      row.forEach(cell => {
                        xlsContent += `<td>${cell}</td>`;
                      });
                      xlsContent += '</tr>';
                    });

                    xlsContent += '</table></body></html>';

                    const blob = new Blob([xlsContent], { type: "application/vnd.ms-excel" });
                    const link = document.createElement("a");
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", "item_sample_import.xls");
                    link.style.visibility = "hidden";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none cursor-pointer p-0 inline"
                >
                  sample xls file
                </button>
                {" "}and compare it to your import file to ensure you have the file perfect for the import.
              </p>
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
                      Retains the items in Zoho Books and does not import the duplicates in the import file.
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
                    <div className="text-sm font-medium text-gray-900">Overwrite items</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Imports the duplicates in the import file and overwrites the existing items in Zoho Books.
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
                    <div className="text-sm font-medium text-gray-900">Add duplicates as new items</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Imports the duplicates in the import file and adds them as new items in Zoho Books.
                    </div>
                  </div>
                </label>
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
                  <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">sample xls file</a>
                  {" "}to get detailed information about the data fields used while importing.
                </li>
                <li>
                  If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
                </li>
                <li>
                  You can configure your import settings and save them for future too!
                </li>
              </ul>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                className="px-8 py-3 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer transition-all"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
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

            {/* Item Details Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-sm font-semibold text-gray-700">ZOHO BOOKS FIELD</div>
                <div className="text-sm font-semibold text-gray-700">IMPORTED FILE HEADERS</div>
              </div>
              <div className="space-y-4">
                {[
                  { field: "Item Name", required: true },
                  { field: "SKU", required: false },
                  { field: "Product Type", required: false },
                  { field: "Description", required: false },
                  { field: "Purchase Description", required: false },
                  { field: "Unit", required: false },
                  { field: "Selling Price", required: false },
                  { field: "Purchase Price", required: false },
                  { field: "Sales Account", required: false },
                  { field: "Purchase Account", required: false },
                  { field: "Inventory Account", required: false },
                  { field: "Reorder Point", required: false },
                  { field: "Opening Stock", required: false },
                  { field: "Opening Stock Value", required: false },
                  { field: "Track Inventory", required: false },
                  { field: "Status", required: false },
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

            {/* Save Option */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveSelections}
                  onChange={(e) => setSaveSelections(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Save these selections for use during future imports.</span>
              </label>
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
                  className="px-8 py-3 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer transition-all"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
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
                All Items in your file are ready to be imported
              </p>
            </div>

            {/* Preview Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              {/* Ready to Import */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-[#125562]" />
                  <span className="text-sm font-medium text-gray-700">
                    Items that are ready to be imported - {previewData.readyToImport}
                  </span>
                </div>
                <button
                  onClick={() => setShowReadyDetails(!showReadyDetails)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details
                  <ChevronDown size={16} className={showReadyDetails ? "rotate-180" : ""} />
                </button>
              </div>

              {/* Skipped Records */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <HelpCircle size={20} className="text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">
                    No. of Records skipped - {previewData.skippedRecords}
                  </span>
                </div>
                <button
                  onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details
                  <ChevronDown size={16} className={showSkippedDetails ? "rotate-180" : ""} />
                </button>
              </div>

              {/* Unmapped Fields */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <HelpCircle size={20} className="text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Unmapped Fields - {previewData.unmappedFields}
                  </span>
                </div>
                <button
                  onClick={() => setShowUnmappedDetails(!showUnmappedDetails)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details
                  <ChevronDown size={16} className={showUnmappedDetails ? "rotate-180" : ""} />
                </button>
              </div>
            </div>

            {/* Ready Items Details */}
            {showReadyDetails && previewDetails.ready.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 overflow-hidden">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Ready to Import Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewDetails.ready.slice(0, 100).map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-sm text-gray-900">{getValue(row, "Item Name")}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{getValue(row, "SKU")}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{getValue(row, "Product Type") || "Goods"}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{getValue(row, "Selling Price")}</td>
                        </tr>
                      ))}
                      {previewDetails.ready.length > 100 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-sm text-gray-500 italic">
                            ...and {previewDetails.ready.length - 100} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Skipped Records Details */}
            {showSkippedDetails && previewDetails.skipped.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6 mb-6 overflow-hidden">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Skipped Records Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-orange-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name (from file)</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewDetails.skipped.slice(0, 100).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-sm font-medium text-red-600">{item.reason}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{getValue(item.row, "Item Name") || <span className="text-gray-400 italic">(Missing)</span>}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{getValue(item.row, "SKU")}</td>
                        </tr>
                      ))}
                      {previewDetails.skipped.length > 100 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-sm text-gray-500 italic">
                            ...and {previewDetails.skipped.length - 100} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Unmapped Fields Details */}
            {showUnmappedDetails && previewDetails.unmapped.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6 mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Unmapped Fields</h3>
                <p className="text-sm text-gray-600 mb-2">The following Zoho Books fields have not been mapped to any column in your file:</p>
                <ul className="list-disc list-inside bg-yellow-50 p-4 rounded-md">
                  {previewDetails.unmapped.map((field) => (
                    <li key={field} className="text-sm text-gray-700">{field}</li>
                  ))}
                </ul>
              </div>
            )}

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
                  className="px-8 py-3 text-white rounded-lg text-sm font-semibold shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => !isImporting && (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => !isImporting && (e.currentTarget.style.opacity = "1")}
                  onClick={handleImport}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Importing...
                    </>
                  ) : (
                    "Import"
                  )}
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
                  <div className="flex flex-col items-center max-w-lg">
                    {selectedCloudProvider === "gdrive" ? (
                      <>
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
                          className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                          onClick={() => window.open("https://accounts.google.com/v3/signin/", "_blank")}
                        >
                          Authenticate Google
                        </button>
                      </>
                    ) : selectedCloudProvider === "dropbox" ? (
                      <>
                        <div className="mb-8">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <Box size={64} className="text-blue-500" />
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                          <p>By clicking on this button you agree to the provider's terms of use and privacy policy.</p>
                        </div>
                        <button
                          className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                          onClick={() => window.open("https://www.dropbox.com/oauth2/authorize", "_blank")}
                        >
                          Authenticate Dropbox
                        </button>
                      </>
                    ) : selectedCloudProvider === "box" ? (
                      <>
                        <div className="mb-8">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <Square size={64} className="text-blue-600" />
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                          <p>By clicking on this button you agree to the provider's terms of use and privacy policy.</p>
                        </div>
                        <button
                          className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                          onClick={() => window.open("https://account.box.com/api/oauth2/authorize", "_blank")}
                        >
                          Authenticate Box
                        </button>
                      </>
                    ) : selectedCloudProvider === "onedrive" ? (
                      <>
                        <div className="mb-8">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <Cloud size={64} className="text-blue-500" />
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                          <p>By clicking on this button you agree to the provider's terms of use and privacy policy.</p>
                        </div>
                        <button
                          className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                          onClick={() => window.open("https://login.microsoftonline.com/common/oauth2/v2.0/authorize", "_blank")}
                        >
                          Authenticate OneDrive
                        </button>
                      </>
                    ) : selectedCloudProvider === "evernote" ? (
                      <>
                        <div className="mb-8">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <FileText size={64} className="text-[#125562]" />
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                          <p>By clicking on this button you agree to the provider's terms of use and privacy policy.</p>
                        </div>
                        <button
                          className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                          onClick={() => window.open("https://www.evernote.com/Login.action", "_blank")}
                        >
                          Authenticate Evernote
                        </button>
                      </>
                    ) : selectedCloudProvider === "zoho" ? (
                      <>
                        <p className="text-sm text-gray-600 text-center mb-6">
                          Zoho WorkDrive is an online file sync, storage and content collaboration platform.
                        </p>
                        <button
                          className="px-6 py-2.5 bg-[#125562] text-white rounded-md text-sm font-semibold hover:bg-[#125562]/90 transition-colors shadow-sm"
                          onClick={() => {
                            window.open(
                              "https://workdrive.zoho.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=ZohoBooks",
                              "_blank"
                            );
                          }}
                        >
                          Set up your team
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600 text-center mb-6">
                        Select a cloud storage provider to get started.
                      </p>
                    )}
                  </div>
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
                    // TODO: Handle file attachment from cloud
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
                            {doc.size || "N/A"} • {doc.type?.toUpperCase() || "FILE"}
                            {doc.associatedTo && (
                              <div className="text-xs text-gray-500 mt-1">Associated: {doc.associatedTo}</div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {doc.uploadedBy || "Me"}
                            {doc.uploadedOn && (
                              <div className="text-xs text-gray-500 mt-1">{doc.uploadedOn}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                      <p className="text-sm text-gray-600 mb-4">
                        {documentSearch ? "No documents found matching your search." : "No documents available."}
                      </p>
                      {!documentSearch && (
                        <button
                          onClick={() => {
                            setIsDocumentsModalOpen(false);
                            navigate("/documents");
                          }}
                          className="text-blue-600 hover:text-blue-700 underline text-sm font-medium"
                        >
                          Go to Documents
                        </button>
                      )}
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
                      // Get selected document objects
                      const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id));
                      // Handle file attachment - convert document to file if needed
                      if (selectedDocs.length > 0) {
                        // For now, just show a message
                        alert(`Selected ${selectedDocs.length} document(s). File attachment from documents will be implemented.`);
                        setIsDocumentsModalOpen(false);
                        setSelectedDocuments([]);
                      }
                    } else {
                      alert("Please select at least one document to attach.");
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
      </div>
    </div >
  );
}

