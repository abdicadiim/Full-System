import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, HelpCircle, Download as DownloadIcon, ChevronRight, Search, Lightbulb, ChevronDown, ChevronUp, Info } from "lucide-react";
import { documentsAPI } from "../../services/api";

// Field Mapping Row Component
const FieldMappingRow = ({ field, required, fileHeaders, selectedValue, onSelect, openDropdown, onToggleDropdown }) => {
  const dropdownRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggleDropdown(false);
        setSearchTerm("");
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown, onToggleDropdown]);

  const filteredHeaders = fileHeaders.filter(header =>
    header.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      borderBottom: "1px solid #e5e7eb",
      padding: "12px 16px",
      alignItems: "center"
    }}>
      <div style={{
        fontSize: "14px",
        color: "#111827",
        fontWeight: "500"
      }}>
        {field}
        {required && <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>}
      </div>
      <div style={{ position: "relative" }} ref={dropdownRef}>
        <div
          onClick={() => onToggleDropdown(!openDropdown)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "white",
            fontSize: "14px",
            color: selectedValue ? "#111827" : "#9ca3af"
          }}
        >
          <span>{selectedValue || "Select"}</span>
          {selectedValue && (
            <X
              size={14}
              style={{ color: "#6b7280", marginRight: "8px" }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect("");
              }}
            />
          )}
          <ChevronDown
            size={16}
            style={{
              color: "#6b7280",
              transform: openDropdown ? "rotate(180deg)" : "none",
              transition: "transform 0.2s"
            }}
          />
        </div>
        {openDropdown && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            backgroundColor: "white",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10005,
            maxHeight: "200px",
            overflowY: "auto"
          }}>
            <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af"
                }} />
                <input
                  type="text"
                  placeholder="Search headers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 34px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
              </div>
            </div>
            {filteredHeaders.length > 0 ? (
              filteredHeaders.map((header) => (
                <div
                  key={header}
                  onClick={() => {
                    onSelect(header);
                    onToggleDropdown(false);
                    setSearchTerm("");
                  }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: selectedValue === header ? "white" : "#111827",
                    backgroundColor: selectedValue === header ? "#156372" : "transparent"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedValue !== header) {
                      e.target.style.backgroundColor = "#156372";
                      e.target.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedValue !== header) {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#111827";
                    }
                  }}
                >
                  {header}
                </div>
              ))
            ) : (
              <div style={{
                padding: "12px 14px",
                fontSize: "14px",
                color: "#6b7280",
                textAlign: "center"
              }}>
                No headers found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ImportProjects() {
  const navigate = useNavigate();
  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingToDb, setIsUploadingToDb] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState("");
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isDragging, setIsDragging] = useState(false);
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [saveSelections, setSaveSelections] = useState(false);
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [csvRows, setCsvRows] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [showReadyDetails, setShowReadyDetails] = useState(true);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const fileInputRef = useRef(null);
  const encodingDropdownRef = useRef(null);
  const dropdownRefs = useRef({});

  const encodings = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
    "Shift_JIS (Japanese)",
  ];

  // Close encoding dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target)) {
        setIsEncodingDropdownOpen(false);
        setEncodingSearch("");
      }
    };

    if (isEncodingDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen]);

  // Parse CSV/TSV file
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    // Detect delimiter (comma for CSV, tab for TSV)
    const delimiter = csvText.includes('\t') ? '\t' : ',';
    
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

  // Auto-map fields based on header names
  const autoMapFields = (headers) => {
    const mappings = {};
    const fieldVariations = {
      "Project Name": ["project name", "name", "project"],
      "Project Code": ["project code", "code", "project number", "project id"],
      "Description": ["description", "desc", "details", "notes"],
      "Billing Method": ["billing method", "billing type", "billing", "method"],
      "Project Cost": ["project cost", "cost", "amount", "price"],
      "Currency Code": ["currency code", "currency", "curr"],
      "Budget Type": ["budget type", "budget", "budget method"],
      "Revenue Budget": ["revenue budget", "revenue", "income budget"],
      "Cost Budget": ["cost budget", "cost", "expense budget"],
      "Project Budget Hours": ["project budget hours", "budget hours", "hours", "time budget"],
      "Project Status": ["project status", "status", "state"],
      "Billing Rate Frequency": ["billing rate frequency", "rate frequency", "frequency"],
      "Hours Per Day": ["hours per day", "hours/day", "daily hours"],
      "Project User": ["project user", "user", "assigned to", "owner"],
      "User Rate": ["user rate", "rate", "hourly rate", "billing rate"],
      "Customer Name": ["customer name", "customer", "client name", "client"]
    };

    Object.keys(fieldVariations).forEach(field => {
      for (const header of headers) {
        const lowerHeader = header.toLowerCase().trim();
        if (fieldVariations[field].some(variation => lowerHeader === variation || lowerHeader.includes(variation))) {
          mappings[field] = header;
          break;
        }
      }
    });

    setFieldMappings(mappings);
  };

  const persistFileToDatabase = async (file) => {
    setIsUploadingToDb(true);
    setUploadedDocumentId("");
    try {
      const uploadResponse = await documentsAPI.upload(file, {
        name: file.name,
        module: "Time Tracking",
        folder: "Imports",
        type: "other",
        description: "Projects import source file",
      });

      if (!uploadResponse?.success || !uploadResponse?.data) {
        throw new Error(uploadResponse?.message || "Upload failed");
      }

      setUploadedDocumentId(String(uploadResponse.data._id || uploadResponse.data.id || ""));
      return true;
    } catch (error) {
      console.error("Error storing import file in database:", error);
      alert("Failed to store the selected file in database. Please try again.");
      return false;
    } finally {
      setIsUploadingToDb(false);
    }
  };

  const prepareSelectedFile = async (file) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert("File size exceeds 20 MB limit.");
      return;
    }

    const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
      return;
    }

    const stored = await persistFileToDatabase(file);
    if (!stored) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // Parse file to extract headers
    if (fileExtension === ".csv" || fileExtension === ".tsv") {
      try {
        const fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });

        const { headers, rows } = parseCSV(fileContent);
        setFileHeaders(headers);
        setCsvRows(rows);
        autoMapFields(headers);
      } catch (error) {
        console.error("Error reading file:", error);
      }
    } else {
      // For XLS/XLSX, we'll need to handle it differently
      // For now, set default headers that might be in the file
      const defaultHeaders = [
        "Project Name", "Project Code", "Description", "Billing Method",
        "Project Cost", "Currency Code", "Budget Type", "Revenue Budget",
        "Cost Budget", "Project Budget Hours", "Project Status",
        "Billing Rate Frequency", "Hours Per Day", "Project User", "User Rate", "Customer Name"
      ];
      setFileHeaders(defaultHeaders);
      autoMapFields(defaultHeaders);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await prepareSelectedFile(file);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await prepareSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleNext = () => {
    if (currentStep === 1 && selectedFile) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate required fields
      const requiredFields = ["Project Name", "Billing Method", "Currency Code", "Customer Name"];
      const missingFields = requiredFields.filter(field => !fieldMappings[field]);
      if (missingFields.length > 0) {
        alert(`Please map the following required fields: ${missingFields.join(", ")}`);
        return;
      }
      
      // Process data for preview
      const processedData = processPreviewData();
      setPreviewData(processedData);
      setCurrentStep(3);
    }
  };

  const processPreviewData = () => {
    // Map CSV rows to project objects based on field mappings
    const projects = csvRows.map((row, index) => {
      const project = {};
      Object.keys(fieldMappings).forEach(field => {
        const header = fieldMappings[field];
        if (header && row[header]) {
          project[field] = row[header];
        }
      });
      return { ...project, _rowIndex: index };
    });

    // Determine which projects will be created vs overwritten
    const projectsToCreate = projects.length; // For now, all are new
    const projectsToOverwrite = 0; // Based on duplicate handling logic

    // Find unmapped fields
    const allFields = [
      "Project Name", "Project Code", "Description", "Billing Method",
      "Project Cost", "Currency Code", "Budget Type", "Revenue Budget",
      "Cost Budget", "Project Budget Hours", "Project Status",
      "Billing Rate Frequency", "Hours Per Day", "Project User", "User Rate", "Customer Name"
    ];
    const unmappedFields = allFields.filter(field => !fieldMappings[field] || fieldMappings[field] === "");

    return {
      totalProjects: projects.length,
      projectsToCreate,
      projectsToOverwrite,
      skippedRecords: 0,
      unmappedFields,
      projects
    };
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleCancel = () => {
    navigate("/time-tracking/projects");
  };

  const filteredEncodings = encodings.filter(encoding =>
    encoding.toLowerCase().includes(encodingSearch.toLowerCase())
  );

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f9fafb",
      padding: "24px"
    }}>
      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Header */}
        <div style={{
          padding: "24px",
          borderBottom: "1px solid #e5e7eb",
          textAlign: "center",
          position: "relative"
        }}>
          <button
            onClick={handleCancel}
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              color: "#ef4444"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            <X size={20} />
          </button>
          <h2 style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#111827",
            margin: "0 0 20px 0"
          }}>
            {currentStep === 1 ? "Projects - Select File" : currentStep === 2 ? "Map Fields" : "Preview"}
          </h2>
          
          {/* Progress Steps */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: currentStep >= 1 ? "#156372" : "#e5e7eb",
                color: currentStep >= 1 ? "white" : "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600"
              }}>
                {currentStep > 1 ? "✓" : "1"}
              </div>
              <span style={{
                fontSize: "14px",
                color: currentStep >= 1 ? "#156372" : "#9ca3af",
                fontWeight: currentStep === 1 ? "500" : "400"
              }}>
                Configure
              </span>
            </div>
            <div style={{ 
              width: "40px", 
              height: "2px", 
              backgroundColor: currentStep >= 2 ? "#156372" : "#e5e7eb" 
            }} />
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: currentStep >= 2 ? "#156372" : "#e5e7eb",
                color: currentStep >= 2 ? "white" : "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600"
              }}>
                2
              </div>
              <span style={{
                fontSize: "14px",
                color: currentStep >= 2 ? "#156372" : "#9ca3af",
                fontWeight: currentStep === 2 ? "500" : "400"
              }}>
                Map Fields
              </span>
            </div>
            <div style={{ 
              width: "40px", 
              height: "2px", 
              backgroundColor: currentStep >= 3 ? "#156372" : "#e5e7eb" 
            }} />
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: currentStep >= 3 ? "#156372" : "#e5e7eb",
                color: currentStep >= 3 ? "white" : "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600"
              }}>
                3
              </div>
              <span style={{
                fontSize: "14px",
                color: currentStep >= 3 ? "#156372" : "#9ca3af",
                fontWeight: currentStep === 3 ? "500" : "400"
              }}>
                Preview
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {currentStep === 1 && (
            <>
          {/* File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: `2px dashed ${isDragging ? "#156372" : "#d1d5db"}`,
              borderRadius: "8px",
              padding: "60px 40px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragging ? "rgba(21, 99, 114, 0.05)" : "#f9fafb",
              transition: "all 0.2s",
              marginBottom: "24px"
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.xls,.xlsx"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <DownloadIcon size={48} style={{ color: "#9ca3af", margin: "0 auto 16px", display: "block" }} />
            <p style={{
              fontSize: "16px",
              fontWeight: "500",
              color: "#111827",
              margin: "0 0 16px"
            }}>
              Drag and drop file to import.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{
                backgroundColor: "#156372",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
            >
              Choose File
              <ChevronDown size={16} />
            </button>
            <div style={{
              fontSize: "14px",
              color: "#6b7280",
              marginTop: "8px"
            }}>
              <p style={{ margin: "4px 0" }}>Maximum File Size: 20 MB</p>
              <p style={{ margin: "4px 0" }}>File Format: CSV or TSV or XLS</p>
            </div>
            {selectedFile && (
              <p style={{
                fontSize: "14px",
                color: "#059669",
                marginTop: "12px",
                fontWeight: "500"
              }}>
                Selected: {selectedFile.name}
              </p>
            )}
            {isUploadingToDb && (
              <p style={{
                fontSize: "13px",
                color: "#156372",
                marginTop: "4px"
              }}>
                Uploading file to database...
              </p>
            )}
            {!!uploadedDocumentId && !isUploadingToDb && (
              <p style={{
                fontSize: "13px",
                color: "#059669",
                marginTop: "4px"
              }}>
                File stored in database.
              </p>
            )}
          </div>

          {/* Sample File Information */}
          <div style={{
            marginBottom: "24px",
            fontSize: "14px",
            color: "#374151",
            lineHeight: "1.6"
          }}>
            Download a{" "}
            <a href="#" style={{ color: "#156372", textDecoration: "underline" }}>sample csv file</a>
            {" "}or{" "}
            <a href="#" style={{ color: "#156372", textDecoration: "underline" }}>sample xls file</a>
            {" "}and compare it to your import file to ensure you have the file perfect for the import.
          </div>

          {/* Character Encoding */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}>
              Character Encoding
              <HelpCircle size={16} color="#6b7280" style={{ cursor: "help" }} />
            </label>
            <div style={{ position: "relative" }} ref={encodingDropdownRef}>
              <div
                onClick={() => setIsEncodingDropdownOpen(!isEncodingDropdownOpen)}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "white"
                }}
              >
                <span style={{ fontSize: "14px", color: "#111827" }}>
                  {characterEncoding}
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    color: "#6b7280",
                    transform: isEncodingDropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s"
                  }}
                />
              </div>
              {isEncodingDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  maxHeight: "200px",
                  overflowY: "auto"
                }}>
                  <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ position: "relative" }}>
                      <Search size={16} style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af"
                      }} />
                      <input
                        type="text"
                        placeholder="Search encoding..."
                        value={encodingSearch}
                        onChange={(e) => setEncodingSearch(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px 8px 34px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>
                  {filteredEncodings.map((encoding) => (
                    <div
                      key={encoding}
                      onClick={() => {
                        setCharacterEncoding(encoding);
                        setIsEncodingDropdownOpen(false);
                        setEncodingSearch("");
                      }}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: characterEncoding === encoding ? "white" : "#111827",
                        backgroundColor: characterEncoding === encoding ? "#156372" : "transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (characterEncoding !== encoding) {
                          e.target.style.backgroundColor = "#156372";
                          e.target.style.color = "white";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (characterEncoding !== encoding) {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#111827";
                        }
                      }}
                    >
                      {encoding}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Duplicate Handling */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "12px"
            }}>
              Duplicate Handling: <span style={{ color: "#ef4444" }}>*</span>
              <HelpCircle size={16} color="#6b7280" style={{ cursor: "help" }} />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                cursor: "pointer",
                padding: "12px",
                borderRadius: "6px",
                border: duplicateHandling === "skip" ? "2px solid #156372" : "1px solid #e5e7eb",
                backgroundColor: duplicateHandling === "skip" ? "rgba(21, 99, 114, 0.05)" : "transparent"
              }}>
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="skip"
                  checked={duplicateHandling === "skip"}
                  onChange={(e) => setDuplicateHandling(e.target.value)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "#156372",
                    marginTop: "2px",
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#111827",
                    marginBottom: "4px"
                  }}>
                    Skip Duplicates
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    lineHeight: "1.5"
                  }}>
                    Retains the in Zoho Books and does not import the duplicates in the import file.
                  </div>
                </div>
              </label>
              <label style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                cursor: "pointer",
                padding: "12px",
                borderRadius: "6px",
                border: duplicateHandling === "overwrite" ? "2px solid #156372" : "1px solid #e5e7eb",
                backgroundColor: duplicateHandling === "overwrite" ? "rgba(21, 99, 114, 0.05)" : "transparent"
              }}>
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="overwrite"
                  checked={duplicateHandling === "overwrite"}
              onChange={(e) => setDuplicateHandling(e.target.value)}
              style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "#156372",
                    marginTop: "2px",
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#111827",
                    marginBottom: "4px"
                  }}>
                    Overwrite
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    lineHeight: "1.5"
                  }}>
                    Imports the duplicates in the import file and overwrites the existing in Zoho Books.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Page Tips */}
          <div style={{
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "16px",
            marginBottom: "24px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px"
            }}>
              <Lightbulb size={18} color="#f59e0b" />
              <h3 style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                margin: 0
              }}>
                Page Tips
              </h3>
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: "24px",
              fontSize: "14px",
              color: "#374151",
              lineHeight: "1.8"
            }}>
              <li>
                You can download the{" "}
                <a href="#" style={{ color: "#156372", textDecoration: "underline" }}>sample xls file</a>
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
          </>
          )}

          {currentStep === 2 && (
            <>
              {/* Selected File Info */}
              <div style={{
                marginBottom: "16px",
                fontSize: "14px",
                color: "#374151"
              }}>
                Your Selected File: <strong>{selectedFile?.name || "No file selected"}</strong>
              </div>

              {/* Info Banner */}
              <div style={{
                backgroundColor: "rgba(21, 99, 114, 0.1)",
                border: "1px solid #156372",
                borderRadius: "6px",
                padding: "12px 16px",
                marginBottom: "24px",
                fontSize: "14px",
                color: "#156372"
              }}>
                The best match to each field on the selected file have been auto-selected.
              </div>

              {/* Default Data Formats */}
              <div style={{
                marginBottom: "24px",
                padding: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px"
                }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#111827",
                    margin: 0
                  }}>
                    Default Data Formats
                  </h3>
                  <button
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#156372",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: "500",
                cursor: "pointer"
              }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
                  >
                    Edit
                  </button>
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#374151"
                }}>
                  Decimal Format: {decimalFormat}
                </div>
              </div>

              {/* Project Details Section */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "16px"
                }}>
                  Project Details
                </h3>
                <div style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    backgroundColor: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "12px 16px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase"
                  }}>
                    <div>ZOHO BOOKS FIELD</div>
                    <div>IMPORTED FILE HEADERS</div>
                  </div>
                  {[
                    { field: "Project Name", required: true },
                    { field: "Project Code", required: false },
                    { field: "Description", required: false },
                    { field: "Billing Method", required: true },
                    { field: "Project Cost", required: false },
                    { field: "Currency Code", required: true },
                    { field: "Budget Type", required: false },
                    { field: "Revenue Budget", required: false },
                    { field: "Cost Budget", required: false },
                    { field: "Project Budget Hours", required: false },
                    { field: "Project Status", required: false },
                    { field: "Billing Rate Frequency", required: false },
                    { field: "Hours Per Day", required: false },
                    { field: "Project User", required: false },
                    { field: "User Rate", required: false }
                  ].map(({ field, required }) => (
                    <FieldMappingRow
                      key={field}
                      field={field}
                      required={required}
                      fileHeaders={fileHeaders}
                      selectedValue={fieldMappings[field] || ""}
                      onSelect={(value) => {
                        setFieldMappings({ ...fieldMappings, [field]: value });
                      }}
                      openDropdown={openDropdowns[field] || false}
                      onToggleDropdown={(isOpen) => {
                        setOpenDropdowns({ ...openDropdowns, [field]: isOpen });
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Contact Details Section */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "16px"
                }}>
                  Contact Details
                </h3>
                <div style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    backgroundColor: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "12px 16px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase"
                  }}>
                    <div>ZOHO BOOKS FIELD</div>
                    <div>IMPORTED FILE HEADERS</div>
                  </div>
                  <FieldMappingRow
                    field="Customer Name"
                    required={true}
                    fileHeaders={fileHeaders}
                    selectedValue={fieldMappings["Customer Name"] || ""}
                    onSelect={(value) => {
                      setFieldMappings({ ...fieldMappings, "Customer Name": value });
                    }}
                    openDropdown={openDropdowns["Customer Name"] || false}
                    onToggleDropdown={(isOpen) => {
                      setOpenDropdowns({ ...openDropdowns, "Customer Name": isOpen });
                    }}
                  />
                </div>
              </div>

              {/* Save Selections Checkbox */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={saveSelections}
                    onChange={(e) => setSaveSelections(e.target.checked)}
                    style={{
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                      accentColor: "#156372"
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#374151" }}>
                    Save these selections for use during future imports.
                  </span>
                </label>
              </div>
            </>
          )}

          {currentStep === 3 && previewData && (
            <>
              {/* Info Banner */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "rgba(21, 99, 114, 0.1)",
                border: "1px solid #156372",
                borderRadius: "6px",
                padding: "12px 16px",
                marginBottom: "24px"
              }}>
                <Info size={20} color="#156372" />
                <span style={{
                  fontSize: "14px",
                  color: "#156372"
                }}>
                  All Projects in your file are ready to be imported.
                </span>
              </div>

              {/* Projects Ready to Import */}
              <div style={{
                border: showReadyDetails ? "2px solid #156372" : "1px solid #e5e7eb",
                borderRadius: "6px",
                marginBottom: "16px",
                overflow: "hidden"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  backgroundColor: showReadyDetails ? "rgba(21, 99, 114, 0.05)" : "#f9fafb",
                  cursor: "pointer"
                }}
                onClick={() => setShowReadyDetails(!showReadyDetails)}
                >
                  <div style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#111827"
                  }}>
                    Projects that are ready to be imported - {previewData.totalProjects}
                  </div>
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      backgroundColor: "#156372",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReadyDetails(!showReadyDetails);
                    }}
                  >
                    {showReadyDetails ? "Hide Details" : "View Details"}
                    {showReadyDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {showReadyDetails && (
                  <div style={{
                    padding: "16px",
                    backgroundColor: "white",
                    borderTop: "1px solid #e5e7eb"
                  }}>
                    <ul style={{
                      margin: 0,
                      paddingLeft: "24px",
                      fontSize: "14px",
                      color: "#374151",
                      lineHeight: "2"
                    }}>
                      <li>Projects to be created ({previewData.projectsToCreate})</li>
                      <li>Projects waiting to be overwritten ({previewData.projectsToOverwrite})</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Skipped Records */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                marginBottom: "16px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <AlertTriangle size={18} color="#f59e0b" />
                  <span style={{
                    fontSize: "14px",
                    color: "#374151"
                  }}>
                    No. of Records skipped - {previewData.skippedRecords}
                  </span>
                </div>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    backgroundColor: "transparent",
                    color: "#156372",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                  onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                >
                  View Details
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Unmapped Fields */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                marginBottom: "24px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <AlertTriangle size={18} color="#f59e0b" />
                  <span style={{
                    fontSize: "14px",
                    color: "#374151"
                  }}>
                    Unmapped Fields
                  </span>
                </div>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    backgroundColor: "transparent",
                    color: "#156372",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                  onClick={() => setShowUnmappedDetails(!showUnmappedDetails)}
                >
                  View Details
                  <ChevronDown size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderTop: "1px solid #e5e7eb"
        }}>
          <div style={{ display: "flex", gap: "12px" }}>
            {currentStep > 1 && (
          <button
                onClick={handleBack}
            style={{
                  padding: "10px 20px",
                  backgroundColor: "rgba(21, 99, 114, 0.1)",
                  color: "#156372",
                  border: "1px solid #156372",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#156372";
                  e.target.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                  e.target.style.color = "#156372";
                }}
              >
                <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Previous
              </button>
            )}
            {currentStep < 3 && (
              <button
                onClick={handleNext}
                disabled={(currentStep === 1 && !selectedFile) || isUploadingToDb}
                style={{
                  padding: "10px 20px",
                  backgroundColor: ((currentStep === 1 && selectedFile) || currentStep === 2) && !isUploadingToDb ? "#156372" : "#d1d5db",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: ((currentStep === 1 && selectedFile) || currentStep === 2) && !isUploadingToDb ? "pointer" : "not-allowed",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
                onMouseEnter={(e) => {
                  if (((currentStep === 1 && selectedFile) || currentStep === 2) && !isUploadingToDb) {
                    e.target.style.backgroundColor = "#0D4A52";
                  }
                }}
                onMouseLeave={(e) => {
                  if (((currentStep === 1 && selectedFile) || currentStep === 2) && !isUploadingToDb) {
                    e.target.style.backgroundColor = "#156372";
                  }
                }}
              >
                {isUploadingToDb ? "Uploading..." : "Next"} {!isUploadingToDb && <ChevronRight size={16} />}
              </button>
            )}
            {currentStep === 3 && (
              <button
                onClick={() => {
                  // Handle import action
                  alert("Import functionality will be implemented here");
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#156372",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  color: "white"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
              >
                Import
              </button>
            )}
          </div>
          <button
            onClick={handleCancel}
            style={{
              padding: "10px 20px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              color: "#156372",
              textDecoration: "underline"
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "#0D4A52";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#156372";
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

