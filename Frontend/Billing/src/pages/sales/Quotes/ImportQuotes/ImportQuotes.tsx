import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info } from "lucide-react";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { saveQuote, getQuotes, getCustomers, updateQuote } from "../../salesModel";
import { reportingTagsAPI } from "../../../../services/api";

export default function ImportQuotes() {
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
  const [currentStep, setCurrentStep] = useState("configure"); // "configure", "mapFields", "preview"
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

  // Handle click outside for dropdowns
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

    // Filter by category
    if (selectedDocumentCategory === "files") {
      filtered = filtered.filter(doc => doc.folder === "Files" || doc.module === "Documents");
    } else if (selectedDocumentCategory === "bankStatements") {
      filtered = filtered.filter(doc => doc.folder === "Bank Statements" || doc.name.toLowerCase().includes("bank") || doc.name.toLowerCase().includes("statement"));
    }
    // "allDocuments" shows all documents

    // Filter by search
    if (documentSearch) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
        (doc.associatedTo && doc.associatedTo.toLowerCase().includes(documentSearch.toLowerCase()))
      );
    }

    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();

  const encodingOptions = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
    "Shift_JIS (Japanese)"
  ];
  const baseMapFieldsList = [
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
  const mapFieldsList = Array.from(
    new Set([
      ...baseMapFieldsList,
      ...entityLevelTagFields.map((tag) => tag.name),
      ...itemLevelTagFields.map((tag) => tag.name),
    ])
  );
  const mapFieldSections = [
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
  const requiredTagFieldNames = [
    ...entityLevelTagFields.filter((tag) => tag.required).map((tag) => tag.name),
    ...itemLevelTagFields.filter((tag) => tag.required).map((tag) => tag.name),
  ];
  const requiredMapFields = ["Quote Number", "Quote Date", "Customer Name"];
  const normalizeFieldKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const findBestHeaderMatch = (field: string, headers: string[]) => {
    const normalizedField = normalizeFieldKey(field);
    return (
      headers.find((header) => normalizeFieldKey(header) === normalizedField) ||
      headers.find((header) => normalizeFieldKey(header).includes(normalizedField)) ||
      headers.find((header) => normalizedField.includes(normalizeFieldKey(header))) ||
      ""
    );
  };
  const normalizeReportingTagAppliesTo = (tag: any): string[] => {
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

  const loadReportingTagsForImport = async () => {
    try {
      const response = await reportingTagsAPI.getAll();
      const rows = Array.isArray(response) ? response : (response?.data || []);
      if (!Array.isArray(rows)) {
        setEntityLevelTagFields([]);
        setItemLevelTagFields([]);
        return;
      }

      const activeRows = rows.filter((tag: any) => {
        const isInactive = String(tag?.status || "").toLowerCase() === "inactive";
        const explicitlyInactive = tag?.isActive === false;
        return !isInactive && !explicitlyInactive;
      });

      const quoteScoped = activeRows.filter((tag: any) => {
        const appliesTo = normalizeReportingTagAppliesTo(tag);
        return appliesTo.some((entry) => entry.includes("quote") || entry.includes("sales"));
      });
      const tagsToUse = quoteScoped.length > 0 ? quoteScoped : activeRows;

      const entityTags: Array<{ name: string; required: boolean }> = [];
      const itemTags: Array<{ name: string; required: boolean }> = [];

      tagsToUse.forEach((tag: any) => {
        const name = String(tag?.name || tag?.displayName || "").trim();
        if (!name) return;
        const required = Boolean(tag?.isMandatory);
        const level = String(tag?.moduleLevel?.sales || tag?.level || "transaction").toLowerCase();
        if (level.includes("line")) {
          itemTags.push({ name, required });
        } else {
          entityTags.push({ name, required });
        }
      });

      setEntityLevelTagFields(entityTags);
      setItemLevelTagFields(itemTags);
    } catch (error) {
      console.error("Error loading reporting tags for import mapping:", error);
      setEntityLevelTagFields([]);
      setItemLevelTagFields([]);
    }
  };

  useEffect(() => {
    loadReportingTagsForImport();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + (file.name.split(".").pop() || '').toLowerCase();
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
      // Validate file type
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + (file.name.split(".").pop() || '').toLowerCase();
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
        const { headers } = await parseImportFile(selectedFile as File);
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
      // Calculate preview data before moving to preview step
      if (selectedFile) {
        try {
          const { headers, rows } = await parseImportFile(selectedFile as File);

          // Calculate unmapped fields count
          const requiredFields = [...requiredMapFields, ...requiredTagFieldNames];
          let unmappedCount = 0;
          requiredFields.forEach(field => {
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

  const filteredEncodingOptions = encodingOptions.filter(option =>
    option.toLowerCase().includes(encodingSearch.toLowerCase())
  );
  const mappingDropdownOptions = Array.from(new Set([...mapFieldsList, ...importedFileHeaders]));
  const renderMappingSection = (title: string, fields: string[]) => (
    <div className="mb-8" key={title}>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-2 bg-gray-50 border-y border-gray-200">
        <div className="px-4 py-2 text-[11px] tracking-wide font-semibold text-gray-600">ZOHO BILLING FIELD</div>
        <div className="px-4 py-2 text-[11px] tracking-wide font-semibold text-gray-600">IMPORTED FILE HEADERS</div>
      </div>
      <div className="space-y-3 pt-4">
        {fields.map((field) => {
          const selectedValue = fieldMappings[field] || findBestHeaderMatch(field, importedFileHeaders) || "";
          const filteredOptions = mappingDropdownOptions.filter((option) =>
            option.toLowerCase().includes(mappingSearch.toLowerCase())
          );
          const isRequired = requiredMapFields.includes(field) || requiredTagFieldNames.includes(field);

          return (
            <div key={field} className="grid grid-cols-2 gap-6 items-start">
              <div className="text-sm font-medium text-gray-700 pt-2.5">
                {field}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </div>
              <div className="relative" data-mapping-dropdown="true">
                <button
                  type="button"
                  onClick={() => {
                    if (openMappingDropdownField === field) {
                      setOpenMappingDropdownField(null);
                      setMappingSearch("");
                    } else {
                      setOpenMappingDropdownField(field);
                      setMappingSearch("");
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:border-[#156372]"
                >
                  <span>{selectedValue || "Select"}</span>
                  <div className="flex items-center gap-2">
                    {selectedValue && (
                      <X
                        size={14}
                        className="text-red-500 hover:text-red-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          setFieldMappings((prev) => ({ ...prev, [field]: "" }));
                        }}
                      />
                    )}
                    <ChevronDown size={14} className="text-gray-500" />
                  </div>
                </button>
                {openMappingDropdownField === field && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-xl z-40 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center gap-2 border border-[#156372] rounded-md px-2 py-1.5">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          value={mappingSearch}
                          onChange={(e) => setMappingSearch(e.target.value)}
                          placeholder="Search"
                          className="w-full text-sm bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setFieldMappings((prev) => ({ ...prev, [field]: "" }));
                          setOpenMappingDropdownField(null);
                          setMappingSearch("");
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                          !selectedValue ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"
                        }`}
                      >
                        <span>Select</span>
                        {!selectedValue ? <Check size={14} /> : null}
                      </button>
                      {filteredOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setFieldMappings((prev) => ({ ...prev, [field]: option }));
                            setOpenMappingDropdownField(null);
                            setMappingSearch("");
                          }}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                            selectedValue === option ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"
                          }`}
                        >
                          <span>{option}</span>
                          {selectedValue === option ? <Check size={14} /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const sampleHeaders = [
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

  const sampleRow = [
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

  const escapeCsvValue = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const downloadBlobFile = (content: string, fileName: string, mimeType: string) => {
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

  const handleDownloadSampleCsv = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const csv = [sampleHeaders, sampleRow]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    downloadBlobFile(csv, "quotes-import-sample.csv", "text/csv;charset=utf-8;");
  };

  const handleDownloadSampleXls = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const headersHtml = sampleHeaders.map((header) => `<th>${header}</th>`).join("");
    const rowHtml = sampleRow.map((value) => `<td>${String(value)}</td>`).join("");
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

  const parseCSV = (csvText: string) => {
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

    const lines = String(csvText).split('\n').filter((line: string) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    const firstLine = lines[0] || "";
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const delimiter = tabCount > commaCount ? "\t" : ",";

    // Improved CSV parsing that handles quoted values with commas
    const parseCSVLine = (line: string) => {
      const result: string[] = [];
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
    const headers: string[] = headerValues.map(h => h.replace(/^"|"$/g, '').trim());

    // Parse rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.some(v => v)) { // Only add non-empty rows
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          const value = String(values[index] || '').replace(/^"|"$/g, '').trim();
          row[header] = value;
        });
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const parseSpreadsheetFile = async (file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
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

  const parseImportFile = async (file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
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

  const mapFieldValue = (row: Record<string, string>, mappedField: string) => {
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
      setIsImporting(true);
      const { headers, rows } = await parseImportFile(selectedFile as File);

      if (rows.length === 0) {
        alert("No data found in the file");
        return;
      }

      console.log("CSV Headers:", headers);
      console.log("Field Mappings:", fieldMappings);
      console.log("First row sample:", rows[0]);

      // Import each row as a quote
      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const customers = await getCustomers();
      const existingQuotes = await getQuotes();
      const quoteByNumber = new Map<string, any>();
      existingQuotes.forEach((q) => {
        if (q.quoteNumber) quoteByNumber.set(String(q.quoteNumber).trim().toLowerCase(), q);
      });

      for (const row of rows) {
        try {
          // Helper function to get value from row using field mapping or direct header match
          const getValue = (fieldName: string): string => {
            // First try the field mapping
            const mappedField = fieldMappings[fieldName];
            if (mappedField) {
              const value = mapFieldValue(row, mappedField);
              if (value) return value;
            }

            // Try direct header match (case-insensitive)
            const lowerField = fieldName.toLowerCase();
            for (const header of headers) {
              if (header.toLowerCase() === lowerField) {
                const value = String(row[header] || '').trim();
                if (value) return value;
              }
            }

            return '';
          };

          // Get required fields
          const quoteNumber = getValue("Quote Number");
          const customerName = getValue("Customer Name");
          const quoteDate = getValue("Quote Date");

          // Skip if required fields are missing
          if (!quoteNumber && !customerName) {
            skippedCount++;
            continue;
          }

          // Find customer by name
          let customerId: string | undefined = undefined;
          const matchingCustomer = customers.find(c =>
            c.name?.toLowerCase() === customerName?.toLowerCase() ||
            c.companyName?.toLowerCase() === customerName?.toLowerCase()
          );
          if (matchingCustomer) {
            customerId = matchingCustomer.id ?? undefined;
          }

          // Parse date
          let parsedDate = new Date().toISOString();
          if (quoteDate) {
            // Try to parse date (common formats: yyyy-MM-dd, MM/dd/yyyy, dd/MM/yyyy)
            const dateStr = quoteDate.trim();
            const datePatterns = [
              /(\d{4})-(\d{2})-(\d{2})/, // yyyy-MM-dd
              /(\d{2})\/(\d{2})\/(\d{4})/, // MM/dd/yyyy or dd/MM/yyyy
            ];

            for (const pattern of datePatterns) {
              const match = dateStr.match(pattern);
              if (match) {
                if (pattern === datePatterns[0]) {
                  // yyyy-MM-dd
                  parsedDate = new Date(`${match[1]}-${match[2]}-${match[3]}`).toISOString();
                } else {
                  // Try MM/dd/yyyy first
                  const testDate = new Date(`${match[3]}-${match[1]}-${match[2]}`);
                  if (!isNaN(testDate.getTime())) {
                    parsedDate = testDate.toISOString();
                  }
                }
                break;
              }
            }
          }

          // Get item details if available
          const itemName = getValue("Item Name");
          const quantity = getValue("Quantity");
          const rate = getValue("Item Price") || getValue("Rate");
          const amount = getValue("Amount");

          const items = [];
          if (itemName || quantity || rate || amount) {
            items.push({
              id: 1,
              name: itemName || "",
              itemName: itemName || "",
              quantity: parseFloat(String(quantity || '0')),
              rate: parseFloat(String(rate || '0')),
              amount: parseFloat(String(amount || (parseFloat(String(quantity || '0')) * parseFloat(String(rate || '0')))))
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
            quoteNumber: quoteNumber || undefined, // Let saveQuote generate if not provided
            customerName: customerName || "Unknown Customer",
            customerId: customerId,
            quoteDate: parsedDate,
            expiryDate: getValue("Expiry Date") || "",
            status: getValue("Quote Status")?.toLowerCase() || "draft",
            notes: getValue("Notes") || "",
            termsAndConditions: getValue("Terms & Conditions") || "",
            subject: getValue("Subject") || "",
            currency: getValue("Currency Code") || "AMD",
            items: items,
            subTotal: parseFloat(String(amount || (parseFloat(String(quantity || '0')) * parseFloat(String(rate || '0'))))),
            total: parseFloat(String(amount || (parseFloat(String(quantity || '0')) * parseFloat(String(rate || '0'))))),
            createdAt: new Date().toISOString()
          };

          console.log("Importing quote:", quoteData);

          // Check for duplicates based on duplicate handling setting
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
          // For "add" or no duplicate, just save as new

          // Save quote
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

      // Show success message
      alert(`Successfully imported ${importedCount} quote(s).${skippedCount > 0 ? ` ${skippedCount} record(s) skipped.` : ''}`);

      // Navigate back to quotes list
      navigate("/sales/quotes");
    } catch (error) {
      console.error("Error importing quotes:", error);
      alert("Error importing quotes. Please check the file format and try again.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {currentStep === "configure" ? "Quotes - Select File" : currentStep === "mapFields" ? "Map Fields" : "Preview"}
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
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div
                className="border border-dashed border-gray-300 rounded-xl p-10 text-center mb-5"
                ref={dropAreaRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-5 shadow-sm">
                  <Download size={24} className="text-gray-500" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-5">Drag and drop file to import</p>
                <div className="relative inline-block" ref={fileSourceDropdownRef}>
                  <button
                    className="px-6 py-2.5 bg-[#156372] text-white text-sm font-semibold rounded-md shadow-sm hover:bg-[#0f4f5b]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFileSourceDropdownOpen(!isFileSourceDropdownOpen);
                    }}
                  >
                    Choose File
                  </button>
                  {isFileSourceDropdownOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px] overflow-hidden">
                      <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white" onClick={handleAttachFromDesktop}>Attach From Desktop</button>
                      <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white" onClick={handleAttachFromCloud}>Attach From Cloud</button>
                      <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white" onClick={handleAttachFromDocuments}>Attach From Documents</button>
                    </div>
                  )}
                </div>
                {selectedFile && <p className="mt-4 text-sm font-medium text-[#156372]">Selected: {selectedFile.name}</p>}
                <p className="mt-5 text-sm text-gray-500">Maximum File Size: 25 MB • File Format: CSV or TSV or XLS</p>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.xls,.xlsx" onChange={handleFileSelect} style={{ display: "none" }} />
              </div>

              <p className="text-sm text-gray-700 mb-8">
                Download a <a href="#" onClick={handleDownloadSampleCsv} className="text-blue-600 hover:underline">sample csv file</a> or <a href="#" onClick={handleDownloadSampleXls} className="text-blue-600 hover:underline">sample xls file</a> and compare it to your import file to ensure you have the file perfect for the import.
              </p>

              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
                  <div className="flex items-center gap-1 text-gray-800 mt-2">
                    <span className="text-sm font-medium">Character Encoding</span>
                    <HelpCircle size={14} className="text-gray-400" />
                  </div>
                  <div className="relative" ref={encodingDropdownRef}>
                    <button
                      className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-md bg-white text-gray-700 hover:border-[#156372]"
                      onClick={() => setIsEncodingDropdownOpen(!isEncodingDropdownOpen)}
                    >
                      <span className="text-sm text-gray-900">{characterEncoding}</span>
                      {isEncodingDropdownOpen ? <ChevronUp size={16} className="text-[#156372]" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </button>
                    {isEncodingDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-md shadow-xl z-50 overflow-hidden">
                        <div className="p-2 border-b border-gray-200">
                          <div className="flex items-center gap-2 border border-[#156372] rounded-md px-2 py-1.5">
                            <Search size={14} className="text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={encodingSearch}
                              onChange={(e) => setEncodingSearch(e.target.value)}
                              className="flex-1 text-sm bg-transparent focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredEncodingOptions.map((option) => (
                            <button
                              key={option}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                                option === characterEncoding ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"
                              }`}
                              onClick={() => {
                                setCharacterEncoding(option);
                                setIsEncodingDropdownOpen(false);
                                setEncodingSearch("");
                              }}
                            >
                              <span>{option}</span>
                              {option === characterEncoding ? <Check size={14} /> : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label className="inline-flex items-center gap-2 text-gray-900">
                  <input
                    type="checkbox"
                    checked={autoGenerateQuoteNumbers}
                    onChange={(e) => setAutoGenerateQuoteNumbers(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Auto-Generate Quote Numbers</span>
                </label>
                <p className="mt-2 text-sm text-gray-600 max-w-[760px]">
                  Quote numbers will be generated automatically according to your settings. Any Quote numbers in the import file will be ignored.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={16} className="text-yellow-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Page Tips</h3>
                </div>
                <ul className="space-y-2 text-gray-700 list-disc pl-6">
                  <li>You can download the <a href="#" onClick={handleDownloadSampleXls} className="text-blue-600 hover:underline">sample xls file</a> to get detailed information about the data fields used while importing.</li>
                  <li>If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.</li>
                  <li>You can configure your import settings and save them for future too!</li>
                </ul>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-5">
                <button
                  className="px-7 py-2.5 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0f4f5b] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#156372]"
                  onClick={handleNext}
                  disabled={!selectedFile}
                >
                  Next ›
                </button>
                <button className="px-7 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
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

            {/* Default Data Formats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Default Data Formats</h2>
                <button
                  type="button"
                  onClick={openDataFormatsModal}
                  className="inline-flex items-center gap-1.5 text-sm text-[#156372] hover:text-[#0f4f5b]"
                >
                  <Edit size={14} />
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Date:</span> {dateFormat}
                </div>
                <div>
                  <span className="font-medium">Decimal Format:</span> {decimalFormat}
                </div>
              </div>
            </div>
            {isDataFormatsModalOpen && (
              <div className="fixed inset-0 z-[170] bg-black/40 flex items-start justify-center pt-16 px-4">
                <div className="w-full max-w-3xl bg-white rounded-md border border-gray-200 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Default Data Formats</h3>
                    <button
                      type="button"
                      onClick={() => setIsDataFormatsModalOpen(false)}
                      className="w-7 h-7 flex items-center justify-center border border-blue-300 rounded-sm text-red-500 hover:bg-gray-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="p-5">
                    <div className="border border-gray-200 rounded-sm overflow-hidden">
                      <div className="grid grid-cols-[1.1fr_1.6fr_2fr] bg-gray-50 border-b border-gray-200">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-700">DATA TYPE</div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-700">SELECT FORMAT AT FIELD LEVEL</div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-700">DEFAULT FORMAT</div>
                      </div>
                      <div className="grid grid-cols-[1.1fr_1.6fr_2fr] border-b border-gray-200">
                        <div className="px-3 py-2.5 text-sm text-gray-700">Date</div>
                        <div className="px-3 py-2.5 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isDateFormatAtFieldLevel}
                            onChange={(e) => setIsDateFormatAtFieldLevel(e.target.checked)}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                          />
                        </div>
                        <div className="px-3 py-2.5">
                          <select
                            value={tempDateFormat}
                            onChange={(e) => setTempDateFormat(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          >
                            <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                            <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                            <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-[1.1fr_1.6fr_2fr]">
                        <div className="px-3 py-2.5 text-sm text-gray-700">Decimal Format</div>
                        <div className="px-3 py-2.5 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isDecimalFormatAtFieldLevel}
                            onChange={(e) => setIsDecimalFormatAtFieldLevel(e.target.checked)}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                          />
                        </div>
                        <div className="px-3 py-2.5">
                          <select
                            value={tempDecimalFormat}
                            onChange={(e) => setTempDecimalFormat(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          >
                            <option value="1234567.89">1234567.89</option>
                            <option value="1,234,567.89">1,234,567.89</option>
                            <option value="1234567,89">1234567,89</option>
                            <option value="1.234.567,89">1.234.567,89</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDataFormats}
                      className="px-5 py-2 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0f4f5b]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDataFormatsModalOpen(false)}
                      className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              {mapFieldSections.map((section) => renderMappingSection(section.title, section.fields))}
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
                  className="px-8 py-3 bg-[#156372] text-white rounded-lg text-sm font-semibold hover:bg-[#0f4f5b] transition-colors shadow-sm"
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
                All Quotes in your file are ready to be imported
              </p>
            </div>

            {/* Preview Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              {/* Ready to Import */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Quotes that are ready to be imported - {previewData.readyToImport}
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
                  className={`px-8 py-3 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm ${isImporting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  onClick={handleImport}
                  disabled={isImporting}
                >
                  {isImporting ? "Importing..." : "Import"}
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
                          {doc.size} â€¢ {doc.type?.toUpperCase() || "FILE"}
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
                    // TODO: Handle file attachment - you can use selectedDocs here
                    console.log("Selected documents:", selectedDocs);
                    // For now, just close the modal
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                  } else {
                    alert("Please select at least one document to attach.");
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedDocuments.length === 0}
              >
                Attachments {selectedDocuments.length > 0 && `(${selectedDocuments.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



