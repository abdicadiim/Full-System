import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info, Loader2 } from "lucide-react";
import { getAllDocuments, addDocument } from "../../../../utils/documentStorage";
import { saveCustomer } from "../../salesModel";
import { parseImportFile } from "../../utils/importFileParser";
import { toast } from "react-toastify";

export default function ImportCustomers() {
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

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentStep === "configure" ? "Customers - Select File" : currentStep === "mapFields" ? "Map Fields" : "Preview"}
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
                  onClick={() => downloadSampleFile('csv')}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                >
                  sample csv file
                </button>
                {" "}or{" "}
                <button
                  onClick={() => downloadSampleFile('xls')}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
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
                      Retains the customers in Zoho Books and does not import the duplicates in the import file.
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
                    <div className="text-sm font-medium text-gray-900">Overwrite customers</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Imports the duplicates in the import file and overwrites the existing customers in Zoho Books.
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
                    <div className="text-sm font-medium text-gray-900">Add duplicates as new customers</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Imports the duplicates in the import file and adds them as new customers in Zoho Books.
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
                  <button
                    onClick={() => downloadSampleFile('xls')}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                  >
                    sample xls file
                  </button>
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

            {/* Default Data Formats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Default Data Formats</h2>
                <button
                  onClick={() => setIsDecimalFormatModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Edit size={16} />
                  Edit
                </button>
              </div>
              <div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Decimal Format:</span> {decimalFormat}
                </div>
              </div>
            </div>

            {/* Contact Details Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
              <div className="space-y-4">
                {/* Field Mapping Row Component */}
                {[
                  { field: "Salutation", required: false },
                  { field: "First Name", required: false },
                  { field: "Last Name", required: false },
                  { field: "Display Name", required: true },
                  { field: "Company Name", required: false },
                  { field: "Email", required: false },
                  { field: "Work Phone", required: false },
                  { field: "Mobile", required: false },
                  { field: "Website", required: false },
                  { field: "Currency", required: false },
                  { field: "Customer Type", required: false },
                  { field: "Payment Terms", required: false },
                  { field: "Notes", required: false },
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

            {/* Billing Address Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h2>
              <div className="space-y-4">
                {[
                  "Billing Attention",
                  "Billing Address",
                  "Billing Street2",
                  "Billing City",
                  "Billing State",
                  "Billing Zip Code",
                  "Billing Country",
                  "Billing Phone",
                  "Billing Fax",
                ].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {field}
                      {field === "Billing Phone" && <HelpCircle size={14} className="text-gray-400" />}
                    </div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
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

            {/* Shipping Address Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="space-y-4">
                {[
                  "Shipping Attention",
                  "Shipping Address",
                  "Shipping Street2",
                  "Shipping City",
                  "Shipping State",
                  "Shipping Zip Code",
                  "Shipping Country",
                  "Shipping Phone",
                  "Shipping Fax",
                ].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {field}
                      {field === "Shipping Phone" && <HelpCircle size={14} className="text-gray-400" />}
                    </div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
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

            {/* Additional Fields Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Fields</h2>
              <div className="space-y-4">
                {[
                  "Owner Name",
                  "Opening Balance",
                  "Opening Balance Exchange Rate",
                  "Accounts Receivable",
                  "Status",
                ].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {field}
                      {(field === "Accounts Receivable" || field === "Opening Balance Exchange Rate") && (
                        <HelpCircle size={14} className="text-gray-400" />
                      )}
                    </div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
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

            {/* General Fields Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">General Fields</h2>
              <div className="space-y-4">
                {["SIRET", "Company ID"].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">{field}</div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
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

            {/* Item Details Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-sm font-semibold text-gray-700">ZOHO BOOKS FIELD</div>
                <div className="text-sm font-semibold text-gray-700">IMPORTED FILE HEADERS</div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="text-sm font-medium text-gray-700">Price List</div>
                  <div className="relative">
                    <select
                      value={fieldMappings["Price List"] || ""}
                      onChange={(e) => setFieldMappings({ ...fieldMappings, "Price List": e.target.value })}
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
              </div>
            </div>

            {/* Tax Details Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-sm font-semibold text-gray-700">ZOHO BOOKS FIELD</div>
                <div className="text-sm font-semibold text-gray-700">IMPORTED FILE HEADERS</div>
              </div>
              <div className="space-y-4">
                {["Tax Name", "Tax Percentage", "Tax Type"].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">{field}</div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
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
                All Customers in your file are ready to be imported
              </p>
            </div>

            {/* Preview Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              {/* Ready to Import */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Customers that are ready to be imported - {previewData.readyToImport}
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
                  className={`px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  onClick={handleImport}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
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
                          {doc.size} • {doc.type?.toUpperCase() || "FILE"}
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
                      {documentSearch ? "No documents found matching your search." : "Autoscan is disabled. Please enable it from the Inbox module."}
                    </p>
                    {!documentSearch && (
                      <button
                        onClick={() => {
                          setIsDocumentsModalOpen(false);
                          navigate("/documents");
                        }}
                        className="text-blue-600 hover:text-blue-700 underline text-sm font-medium"
                      >
                        Go to Inbox
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
                    // For now, just close the modal
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                  } else {
                    toast.error("Please select at least one document to attach.");
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














