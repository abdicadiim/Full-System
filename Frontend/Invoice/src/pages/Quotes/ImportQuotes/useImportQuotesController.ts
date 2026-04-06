import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllDocuments } from "../../../utils/documentStorage";
import { saveQuote, getQuotes, getCustomers, updateQuote } from "../../salesModel";
import { reportingTagsAPI } from "../../../services/api";
import {
  baseMapFieldsList,
  buildMapFieldSections,
  downloadBlobFile,
  encodingOptions,
  escapeCsvValue,
  findBestHeaderMatch,
  getFieldValueFromRow,
  getRequiredTagFieldNames,
  normalizeReportingTagAppliesTo,
  parseImportFile,
  parseQuoteDate,
  requiredMapFields,
  quoteSampleHeaders,
  quoteSampleRow,
  validateQuoteImportFile
} from "./ImportQuotes.helpers";

export function useImportQuotesController() {
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");
  const [currentStep, setCurrentStep] = useState("configure");
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [dateFormat, setDateFormat] = useState("yyyy-MM-dd");
  const [isDataFormatsModalOpen, setIsDataFormatsModalOpen] = useState(false);
  const [tempDateFormat, setTempDateFormat] = useState("yyyy-MM-dd");
  const [tempDecimalFormat, setTempDecimalFormat] = useState("1234567.89");
  const [isDateFormatAtFieldLevel, setIsDateFormatAtFieldLevel] = useState(true);
  const [isDecimalFormatAtFieldLevel, setIsDecimalFormatAtFieldLevel] = useState(false);
  const [previewData, setPreviewData] = useState({
    readyToImport: 0,
    skippedRecords: 0,
    unmappedFields: 0
  });
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [autoGenerateQuoteNumbers, setAutoGenerateQuoteNumbers] = useState(false);
  const [importedFileHeaders, setImportedFileHeaders] = useState([
    "Quote Number",
    "Quote Date",
    "Expiry Date",
    "Quote Status",
    "Customer Name",
    "Notes",
    "Terms & Conditions",
    "Subject",
    "Currency Code",
    "Item Name",
    "Quantity",
    "Rate",
    "Amount"
  ]);
  const [openMappingDropdownField, setOpenMappingDropdownField] = useState<string | null>(null);
  const [mappingSearch, setMappingSearch] = useState("");
  const [entityLevelTagFields, setEntityLevelTagFields] = useState<Array<{ name: string; required: boolean }>>([]);
  const [itemLevelTagFields, setItemLevelTagFields] = useState<Array<{ name: string; required: boolean }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const encodingDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileSourceDropdownRef = useRef<HTMLDivElement | null>(null);
  const dropAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target) {
        if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(target)) {
          setIsEncodingDropdownOpen(false);
        }
        if (fileSourceDropdownRef.current && !fileSourceDropdownRef.current.contains(target)) {
          setIsFileSourceDropdownOpen(false);
        }
        if ((target as HTMLElement).closest('[data-mapping-dropdown="true"]') === null) {
          setOpenMappingDropdownField(null);
          setMappingSearch("");
        }
      }
    };

    if (isEncodingDropdownOpen || isFileSourceDropdownOpen || openMappingDropdownField) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen, isFileSourceDropdownOpen, openMappingDropdownField]);

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

    window.addEventListener("documentAdded", handleDocumentAdded);
    window.addEventListener("documentDeleted", handleDocumentDeleted);
    window.addEventListener("documentUpdated", handleDocumentUpdated);

    return () => {
      window.removeEventListener("documentAdded", handleDocumentAdded);
      window.removeEventListener("documentDeleted", handleDocumentDeleted);
      window.removeEventListener("documentUpdated", handleDocumentUpdated);
    };
  }, []);

  const getFilteredDocuments = () => {
    let filtered = documents;

    if (selectedDocumentCategory === "files") {
      filtered = filtered.filter((doc) => doc.folder === "Files" || doc.module === "Documents");
    } else if (selectedDocumentCategory === "bankStatements") {
      filtered = filtered.filter(
        (doc) =>
          doc.folder === "Bank Statements" ||
          doc.name.toLowerCase().includes("bank") ||
          doc.name.toLowerCase().includes("statement")
      );
    }

    if (documentSearch) {
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
          (doc.associatedTo && doc.associatedTo.toLowerCase().includes(documentSearch.toLowerCase()))
      );
    }

    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();
  const mapFieldsList = Array.from(
    new Set([
      ...baseMapFieldsList,
      ...entityLevelTagFields.map((tag) => tag.name),
      ...itemLevelTagFields.map((tag) => tag.name)
    ])
  );
  const mapFieldSections = buildMapFieldSections(entityLevelTagFields, itemLevelTagFields);
  const requiredTagFieldNames = getRequiredTagFieldNames(entityLevelTagFields, itemLevelTagFields);
  const filteredEncodingOptions = encodingOptions.filter((option) =>
    option.toLowerCase().includes(encodingSearch.toLowerCase())
  );
  const mappingDropdownOptions = Array.from(new Set([...mapFieldsList, ...importedFileHeaders]));

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validationMessage = validateQuoteImportFile(file);
      if (validationMessage) {
        alert(validationMessage);
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
      const validationMessage = validateQuoteImportFile(file);
      if (validationMessage) {
        alert(validationMessage);
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleClose = () => {
    navigate("/sales/quotes");
  };

  const handleCancel = () => {
    navigate("/sales/quotes");
  };

  const handleNext = async () => {
    if (currentStep === "configure") {
      if (!selectedFile) {
        alert("Please select a file to continue.");
        return;
      }

      try {
        const { headers } = await parseImportFile(selectedFile);
        if (headers.length > 0) {
          setImportedFileHeaders(headers);
          const autoMappedFields: Record<string, string> = {};
          mapFieldsList.forEach((field) => {
            const matchedHeader = findBestHeaderMatch(field, headers);
            if (matchedHeader) {
              autoMappedFields[field] = matchedHeader;
            }
          });
          setFieldMappings(autoMappedFields);
        }
      } catch (error) {
        console.error("Error reading headers from import file:", error);
      }

      setCurrentStep("mapFields");
    } else if (currentStep === "mapFields") {
      if (selectedFile) {
        try {
          const { headers, rows } = await parseImportFile(selectedFile);
          const requiredFields = [...requiredMapFields, ...requiredTagFieldNames];
          let unmappedCount = 0;
          requiredFields.forEach((field) => {
            if (!(fieldMappings[field] || findBestHeaderMatch(field, headers))) {
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

  const openDataFormatsModal = () => {
    setTempDateFormat(dateFormat);
    setTempDecimalFormat(decimalFormat);
    setIsDataFormatsModalOpen(true);
  };

  const handleSaveDataFormats = () => {
    setDateFormat(tempDateFormat);
    setDecimalFormat(tempDecimalFormat);
    setIsDataFormatsModalOpen(false);
  };

  const handleDownloadSampleCsv = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const csv = [quoteSampleHeaders, quoteSampleRow]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    downloadBlobFile(csv, "quotes-import-sample.csv", "text/csv;charset=utf-8;");
  };

  const handleDownloadSampleXls = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const headersHtml = quoteSampleHeaders.map((header) => `<th>${header}</th>`).join("");
    const rowHtml = quoteSampleRow.map((value) => `<td>${String(value)}</td>`).join("");
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <thead><tr>${headersHtml}</tr></thead>
            <tbody><tr>${rowHtml}</tr></tbody>
          </table>
        </body>
      </html>
    `;

    downloadBlobFile(html, "quotes-import-sample.xls", "application/vnd.ms-excel;charset=utf-8;");
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert("No file selected");
      return;
    }

    try {
      setIsImporting(true);
      const { headers, rows } = await parseImportFile(selectedFile);

      if (rows.length === 0) {
        alert("No data found in the file");
        return;
      }

      console.log("CSV Headers:", headers);
      console.log("Field Mappings:", fieldMappings);
      console.log("First row sample:", rows[0]);

      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const customers = await getCustomers();
      const existingQuotes = await getQuotes();
      const quoteByNumber = new Map<string, any>();

      existingQuotes.forEach((quote) => {
        if (quote.quoteNumber) {
          quoteByNumber.set(String(quote.quoteNumber).trim().toLowerCase(), quote);
        }
      });

      for (const row of rows) {
        try {
          const getValue = (fieldName: string): string =>
            getFieldValueFromRow(row, headers, fieldMappings, fieldName);

          const quoteNumber = getValue("Quote Number");
          const customerName = getValue("Customer Name");
          const quoteDate = getValue("Quote Date");

          if (!quoteNumber && !customerName) {
            skippedCount++;
            continue;
          }

          let customerId: string | undefined = undefined;
          const matchingCustomer = customers.find(
            (customer: any) =>
              customer.name?.toLowerCase() === customerName?.toLowerCase() ||
              customer.companyName?.toLowerCase() === customerName?.toLowerCase()
          );
          if (matchingCustomer) {
            customerId = matchingCustomer.id ?? undefined;
          }

          const parsedDate = parseQuoteDate(quoteDate);

          const itemName = getValue("Item Name");
          const quantity = getValue("Quantity");
          const rate = getValue("Item Price") || getValue("Rate");
          const amount = getValue("Amount");

          const calculatedAmount = parseFloat(
            String(amount || parseFloat(String(quantity || "0")) * parseFloat(String(rate || "0")))
          );
          const items = [];
          if (itemName || quantity || rate || amount) {
            items.push({
              id: 1,
              name: itemName || "",
              itemName: itemName || "",
              quantity: parseFloat(String(quantity || "0")),
              rate: parseFloat(String(rate || "0")),
              amount: calculatedAmount
            });
          } else {
            items.push({
              id: 1,
              name: "",
              itemName: "",
              quantity: 1,
              rate: 0,
              amount: 0
            });
          }

          const quoteData = {
            quoteNumber: quoteNumber || undefined,
            customerName: customerName || "Unknown Customer",
            customerId,
            quoteDate: parsedDate,
            expiryDate: getValue("Expiry Date") || "",
            status: getValue("Quote Status")?.toLowerCase() || "draft",
            notes: getValue("Notes") || "",
            termsAndConditions: getValue("Terms & Conditions") || "",
            subject: getValue("Subject") || "",
            currency: getValue("Currency Code") || "AMD",
            items,
            subTotal: calculatedAmount,
            total: calculatedAmount,
            createdAt: new Date().toISOString()
          };

          console.log("Importing quote:", quoteData);

          const quoteNumberKey = String(quoteData.quoteNumber || "").trim().toLowerCase();
          const existingQuote = quoteNumberKey ? quoteByNumber.get(quoteNumberKey) : null;

          if (duplicateHandling === "skip") {
            const isDuplicate = Boolean(existingQuote);
            if (isDuplicate) {
              skippedCount++;
              continue;
            }
          } else if (duplicateHandling === "overwrite") {
            if (existingQuote) {
              await updateQuote(existingQuote.id, quoteData as any);
              importedCount++;
              continue;
            }
          }

          const created = await saveQuote(quoteData as any);
          if (created?.quoteNumber) {
            quoteByNumber.set(String(created.quoteNumber).trim().toLowerCase(), created);
          }
          importedCount++;
        } catch (error) {
          console.error("Error importing quote:", error);
          skippedCount++;
          const msg = (error as any)?.message ? String((error as any).message) : String(error);
          errors.push(`Row ${importedCount + skippedCount}: ${msg}`);
        }
      }

      alert(`Successfully imported ${importedCount} quote(s).${skippedCount > 0 ? ` ${skippedCount} record(s) skipped.` : ""}`);
      navigate("/sales/quotes");
    } catch (error) {
      console.error("Error importing quotes:", error);
      alert("Error importing quotes. Please check the file format and try again.");
    } finally {
      setIsImporting(false);
    }
  };

  return {
    selectedFile,
    setSelectedFile,
    duplicateHandling,
    setDuplicateHandling,
    characterEncoding,
    setCharacterEncoding,
    isEncodingDropdownOpen,
    setIsEncodingDropdownOpen,
    encodingSearch,
    setEncodingSearch,
    isFileSourceDropdownOpen,
    setIsFileSourceDropdownOpen,
    isCloudPickerOpen,
    setIsCloudPickerOpen,
    isDocumentsModalOpen,
    setIsDocumentsModalOpen,
    selectedDocumentCategory,
    setSelectedDocumentCategory,
    documentSearch,
    setDocumentSearch,
    documents,
    setDocuments,
    selectedDocuments,
    setSelectedDocuments,
    selectedCloudProvider,
    setSelectedCloudProvider,
    currentStep,
    setCurrentStep,
    fieldMappings,
    setFieldMappings,
    decimalFormat,
    setDecimalFormat,
    dateFormat,
    setDateFormat,
    isDataFormatsModalOpen,
    setIsDataFormatsModalOpen,
    tempDateFormat,
    setTempDateFormat,
    tempDecimalFormat,
    setTempDecimalFormat,
    isDateFormatAtFieldLevel,
    setIsDateFormatAtFieldLevel,
    isDecimalFormatAtFieldLevel,
    setIsDecimalFormatAtFieldLevel,
    previewData,
    setPreviewData,
    showReadyDetails,
    setShowReadyDetails,
    showSkippedDetails,
    setShowSkippedDetails,
    showUnmappedDetails,
    setShowUnmappedDetails,
    isImporting,
    setIsImporting,
    autoGenerateQuoteNumbers,
    setAutoGenerateQuoteNumbers,
    importedFileHeaders,
    setImportedFileHeaders,
    openMappingDropdownField,
    setOpenMappingDropdownField,
    mappingSearch,
    setMappingSearch,
    entityLevelTagFields,
    itemLevelTagFields,
    fileInputRef,
    encodingDropdownRef,
    fileSourceDropdownRef,
    dropAreaRef,
    mapFieldsList,
    mapFieldSections,
    requiredMapFields,
    requiredTagFieldNames,
    filteredDocuments,
    filteredEncodingOptions,
    mappingDropdownOptions,
    handleFileSelect,
    handleChooseFileClick,
    handleAttachFromDesktop,
    handleAttachFromCloud,
    handleAttachFromDocuments,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleClose,
    handleCancel,
    handleNext,
    handlePrevious,
    openDataFormatsModal,
    handleSaveDataFormats,
    handleDownloadSampleCsv,
    handleDownloadSampleXls,
    handleImport,
    findBestHeaderMatch,
    getFieldValueFromRow
  };
}

export type ImportQuotesController = ReturnType<typeof useImportQuotesController>;
