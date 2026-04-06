import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info, Loader2 } from "lucide-react";
import { getAllDocuments, addDocument } from "../../../../utils/documentStorage";
import { saveCustomer } from "../../customersDbModel";
import { parseImportFile } from "../../utils/importFileParser";
import { toast } from "react-toastify";

export function useImportCustomersController() {

  const navigate = useNavigate();
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
  const [isLoading, setIsLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState({});
  const [previewData, setPreviewData] = useState({
    readyToImport: 1,
    skippedRecords: 0,
    unmappedFields: 22
  });
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [saveSelections, setSaveSelections] = useState(false);
  const [isDecimalFormatModalOpen, setIsDecimalFormatModalOpen] = useState(false);
  const [selectFormatAtFieldLevel, setSelectFormatAtFieldLevel] = useState(false);
  const [importedFileHeaders, setImportedFileHeaders] = useState([
    "Billing Country",
    "Company Name",
    "Currency",
    "Customer Type",
    "Email",
    "Mobile",
    "Name",
    "Payment Terms",
    "Receivables",
    "Shipping Country",
    "Status",
    "Website",
    "Work Phone"
  ]);
  const fileInputRef = useRef(null);
  const encodingDropdownRef = useRef(null);
  const fileSourceDropdownRef = useRef(null);
  const dropAreaRef = useRef(null);

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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      const maxSize = 25 * 1024 * 1024; // 25MB

      if (!validTypes.includes(fileExtension)) {
        toast.error("Please select a valid file format (CSV, TSV, or XLS).");
        event.target.value = "";
        setSelectedFile(null);
        return;
      }

      if (file.size > maxSize) {
        toast.error("File size must be less than 25 MB.");
        event.target.value = "";
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);

      // Auto-upload to documents for persistence
      const uploadFile = async () => {
        try {
          await addDocument(file, {
            module: "Customers",
            category: "Import Source",
            note: "File selected for customer import"
          });
        } catch (err) {}
      };
      uploadFile();
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
        toast.error("Please select a valid file format (CSV, TSV, or XLS).");
        setSelectedFile(null);
        return;
      }

      if (file.size > maxSize) {
        toast.error("File size must be less than 25 MB.");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleClose = () => {
    navigate("/sales/customers");
  };

  const handleCancel = () => {
    navigate("/sales/customers");
  };

  const handleNext = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to continue.");
      return;
    }

    if (currentStep === "configure") {
      try {
        // Read headers from file
        const { headers } = await parseImportFile(selectedFile as File);
        if (headers && headers.length > 0) {
          setImportedFileHeaders(headers);

          // Auto-map fields based on variations
          const variations: Record<string, string[]> = {
            "Display Name": ["display name", "name", "customer name", "full name"],
            "Company Name": ["company name", "company", "organization", "business name"],
            "Salutation": ["salutation", "title", "greeting"],
            "First Name": ["first name", "firstname", "given name"],
            "Last Name": ["last name", "lastname", "surname", "family name"],
            "Email": ["email", "email id", "email address", "e-mail"],
            "Work Phone": ["work phone", "phone", "telephone", "workphone", "office phone"],
            "Mobile": ["mobile", "mobile phone", "cell phone", "cellphone", "mobile no"],
            "Currency": ["currency", "curr", "currency code"],
            "Website": ["website", "web", "url", "website url"],
            "Notes": ["notes", "remarks", "comments"],
            "Payment Terms": ["payment terms", "terms"],
            "Customer Type": ["customer type", "type", "business type"],
            "Billing Attention": ["billing attention", "bill attention"],
            "Billing Address": ["billing address", "billing street", "billing street 1", "bill address"],
            "Billing Street2": ["billing street 2", "billing street2", "bill street 2"],
            "Billing City": ["billing city", "bill city"],
            "Billing State": ["billing state", "bill state", "billing province"],
            "Billing Zip Code": ["billing zip code", "billing zip", "bill zip code", "bill zip", "billing postal code"],
            "Billing Country": ["billing country", "bill country"],
            "Billing Fax": ["billing fax", "bill fax"],
            "Shipping Attention": ["shipping attention", "ship attention"],
            "Shipping Address": ["shipping address", "shipping street", "shipping street 1", "ship address"],
            "Shipping Street2": ["shipping street 2", "shipping street2", "ship street 2"],
            "Shipping City": ["shipping city", "ship city"],
            "Shipping State": ["shipping state", "ship state", "shipping province"],
            "Shipping Zip Code": ["shipping zip code", "shipping zip", "ship zip code", "ship zip", "shipping postal code"],
            "Shipping Country": ["shipping country", "ship country"],
            "Shipping Fax": ["shipping fax", "ship fax"],
            "Track Inventory": ["track inventory", "inventory tracking"],
          };

          const newMappings = { ...fieldMappings };
          Object.keys(variations).forEach(zohoField => {
            if (!newMappings[zohoField]) {
              const matches = variations[zohoField];
              const foundHeader = headers.find(h =>
                matches.some(m => h.toLowerCase() === m.toLowerCase())
              );
              if (foundHeader) {
                newMappings[zohoField] = foundHeader;
              }
            }
          });
          setFieldMappings(newMappings);
        }
      } catch (error) {}
      setCurrentStep("mapFields");
    } else if (currentStep === "mapFields") {
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

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

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
        } else if (char === ',' && !inQuotes) {
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
    for (const key in row) {
      if (key.toLowerCase() === lowerMapped) {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }

    try {
      setIsLoading(true); // Assuming there's a loading state, if not added below

      // 1. Store the uploaded file in the database (Documents module)
      try {
        await addDocument(selectedFile, {
          module: "Customers",
          category: "Import",
          folder: "Files",
          note: `Import source file for customers on ${new Date().toLocaleString()}`
        });
      } catch (docError) {}

      // 2. Parse selected import file
      const { headers, rows } = await parseImportFile(selectedFile as File);

      if (rows.length === 0) {
        toast.error("No data found in the file");
        setIsLoading(false);
        return;
      }

      // 4. Import each row as a customer
      let importedCount = 0;
      let skippedCount = 0;
      const errors = [];

      for (const row of rows) {
        try {
          // Map fields according to fieldMappings or use default variations
          const variations: Record<string, string[]> = {
            "Display Name": ["name", "display name", "customer name", "full name"],
            "Company Name": ["company name", "company", "organization", "business name"],
            "Salutation": ["salutation", "title", "greeting"],
            "First Name": ["first name", "firstname", "given name"],
            "Last Name": ["last name", "lastname", "surname", "family name"],
            "Email": ["email", "email address", "email id", "e-mail"],
            "Work Phone": ["work phone", "phone", "telephone", "workphone", "office phone"],
            "Mobile": ["mobile", "mobile phone", "cell phone", "cellphone", "mobile no"],
            "Currency": ["currency", "curr", "currency code"],
            "Website": ["website", "web", "url", "website url"],
            "Notes": ["notes", "remarks", "comments"],
            "Payment Terms": ["payment terms", "terms"],
            "Customer Type": ["customer type", "type", "business type"],
            "Receivables": ["receivables", "balance", "amount due", "outstanding", "opening balance"],
            "Opening Balance": ["opening balance", "receivables", "balance", "amount due", "outstanding"],
            "Status": ["status", "state", "account status"]
          };

          const getVal = (field: string) => {
            const mapped = fieldMappings[field];
            if (mapped) return mapFieldValue(row, mapped);

            if (row[field]) return String(row[field]).trim();

            const vars = variations[field] || [];
            for (const v of vars) {
              const found = headers.find(h => h.toLowerCase() === v.toLowerCase());
              if (found && row[found]) return String(row[found]).trim();
            }
            return "";
          };

          const customerData = {
            salutation: getVal("Salutation"),
            firstName: getVal("First Name"),
            lastName: getVal("Last Name"),
            displayName: getVal("Display Name") || `${getVal("First Name")} ${getVal("Last Name")}`.trim() || getVal("Company Name"),
            name: getVal("Display Name") || `${getVal("First Name")} ${getVal("Last Name")}`.trim() || getVal("Company Name") || "Imported Customer",
            companyName: getVal("Company Name"),
            email: getVal("Email"),
            workPhone: getVal("Work Phone"),
            mobile: getVal("Mobile"),
            website: getVal("Website"),
            customerType: getVal("Customer Type")?.toLowerCase() === "business" ? "business" : "individual",
            currency: getVal("Currency") || "AMD",
            paymentTerms: getVal("Payment Terms"),
            notes: getVal("Notes"),
            receivables: parseFloat(getVal("Opening Balance") || "0"),
            openingBalance: getVal("Opening Balance") || "0",
            status: (getVal("Status")?.toLowerCase() === "inactive") ? "inactive" : "active",
            billingAddress: {
              attention: getVal("Billing Attention"),
              street1: getVal("Billing Address"),
              city: getVal("Billing City"),
              state: getVal("Billing State"),
              zipCode: getVal("Billing Zip Code"),
              country: getVal("Billing Country"),
            },
            shippingAddress: {
              attention: getVal("Shipping Attention"),
              street1: getVal("Shipping Address"),
              city: getVal("Shipping City"),
              state: getVal("Shipping State"),
              zipCode: getVal("Shipping Zip Code"),
              country: getVal("Shipping Country"),
            }
          };

          await saveCustomer(customerData);
          importedCount++;
        } catch (error) {
          skippedCount++;
          errors.push(`Row ${importedCount + skippedCount}: ${error.message}`);
        }
      }

      window.dispatchEvent(new CustomEvent("customersUpdated"));
      window.dispatchEvent(new Event("storage"));

      setIsLoading(false);

      if (importedCount > 0) {
        toast.success(`Successfully imported ${importedCount} customer(s).${skippedCount > 0 ? ` ${skippedCount} record(s) failed or were skipped.` : ''}`);
        navigate("/sales/customers");
      } else {
        toast.error(`Failed to import any customers. Please check the file format. Errors: ${errors.slice(0, 3).join(" | ")}${errors.length > 3 ? " ..." : ""}`);
      }
    } catch (error) {
      setIsLoading(false);
      toast.error("Failed to process the requested import. Please try again.");
    }
  };

  const filteredEncodingOptions = encodingOptions.filter(option =>
    option.toLowerCase().includes(encodingSearch.toLowerCase())
  );

  const downloadSampleFile = (type: 'csv' | 'xls') => {
    const headers = [
      "Display Name", "Company Name", "Salutation", "First Name", "Last Name",
      "Email ID", "Phone", "Mobile", "Payment Terms", "Currency", "Notes",
      "Website", "Billing Attention", "Billing Address", "Billing Street2",
      "Billing City", "Billing State", "Billing Zip Code", "Billing Country",
      "Billing Fax", "Shipping Attention", "Shipping Address", "Shipping Street2",
      "Shipping City", "Shipping State", "Shipping Zip Code", "Shipping Country",
      "Shipping Fax", "Track Inventory", "Customer Type", "Opening Balance"
    ];

    const sampleData = [
      headers,
      [
        "Fikret Ethas", "Fikret Inc.", "Mr.", "Ethas", "Fikret",
        "ethas@example.org", "0123456789", "9876543210", "Net 30", "USD", "Sample notes",
        "www.fikret.org", "Fikret Ethas", "12 Austin Terrace", "Suite 100",
        "Toronto", "Ontario", "M5R 1X8", "Canada", "011-222-3333",
        "Fikret Ethas", "12 Austin Terrace", "Suite 100",
        "Toronto", "Ontario", "M5R 1X8", "Canada", "011-222-3333", "No", "business", "500.00"
      ]
    ];

    let content = "";
    let mimeType = "";

    if (type === 'csv') {
      content = sampleData.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      mimeType = "text/csv;charset=utf-8;";
    } else {
      // For XLS, we generate a Tab-Separated Values file which Excel handles well
      content = sampleData.map(row => row.join("\t")).join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customer_import_sample.${type}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    navigate,
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
    isLoading,
    setIsLoading,
    fieldMappings,
    setFieldMappings,
    previewData,
    setPreviewData,
    showReadyDetails,
    setShowReadyDetails,
    showSkippedDetails,
    setShowSkippedDetails,
    showUnmappedDetails,
    setShowUnmappedDetails,
    decimalFormat,
    setDecimalFormat,
    saveSelections,
    setSaveSelections,
    isDecimalFormatModalOpen,
    setIsDecimalFormatModalOpen,
    selectFormatAtFieldLevel,
    setSelectFormatAtFieldLevel,
    importedFileHeaders,
    setImportedFileHeaders,
    fileInputRef,
    encodingDropdownRef,
    fileSourceDropdownRef,
    dropAreaRef,
    encodingOptions,
    filteredEncodingOptions,
    filteredDocuments,
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
    handleImport,
    downloadSampleFile,
  };
}
