import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  LayoutGrid,
  FileText,
  Inbox,
  Plus,
  Trash2,
  Search,
  Filter,
  Settings,
  Zap,
  Upload,
  MoreVertical,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  HelpCircle,
  Laptop,
  MessageSquare,
  Package,
  ArrowUpRight,
  X,
  Play,
  Mail,
  Copy,
  Edit2,
  ChevronDown,
  Folder,
  FileSpreadsheet,
  Menu,
  ArrowUpDown,
  Cloud,
  HardDrive,
  Box,
  Square,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { customersAPI, vendorsAPI, accountantAPI } from "../../services/api";
import { getAllDocuments, addMultipleDocuments, deleteDocument, updateDocument, refreshDocuments } from "../../utils/documentStorage";
import { usePermissions } from "../../hooks/usePermissions";

// --- Cloud Picker Modal Component ---
function CloudPickerModal({ isOpen, onClose, onAttach }) {
  const providers = [
    { id: 'zoho', name: 'Zoho WorkDrive', icon: LayoutGrid, active: true },
    { id: 'gdrive', name: 'Google Drive', icon: HardDrive },
    { id: 'dropbox', name: 'Dropbox', icon: Box },
    { id: 'box', name: 'Box', icon: Square },
    { id: 'onedrive', name: 'OneDrive', icon: Cloud },
    { id: 'evernote', name: 'Evernote', icon: FileText },
  ];

  const [selectedProvider, setSelectedProvider] = useState('zoho');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const mockFiles = [
    { id: 'c1', name: 'Tax_Report_2025.pdf', size: 1258291, modified: '2 days ago', uploader: 'issam isse' },
    { id: 'c2', name: 'Receipt_Fp_90.png', size: 2411724, modified: '1 week ago', uploader: 'issam isse' },
    { id: 'c3', name: 'Bank_Letter_Auth.pdf', size: 852172, modified: '3 hours ago', uploader: 'issam isse' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white w-[900px] h-[640px] rounded shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <h3 className="text-[17px] font-medium text-slate-500">Cloud Picker</h3>
          <button onClick={onClose} className="text-slate-400 transition-colors" onMouseEnter={(e) => e.currentTarget.style.color = "#156372"} onMouseLeave={(e) => e.currentTarget.style.color = ""}>
            <X size={24} strokeWidth={1} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Provider Sidebar */}
          <aside className="w-[140px] bg-white border-r border-slate-100 flex flex-col items-center pt-4 relative">
            <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-slate-200">
              <div className="w-full h-24 bg-slate-400 rounded-full mt-1"></div>
            </div>
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className={`w-full flex flex-col items-center gap-2 py-4 px-2 transition-all group ${selectedProvider === p.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
              >
                <div className={`w-12 h-12 rounded flex items-center justify-center transition-all ${selectedProvider === p.id ? 'text-blue-500' : 'text-slate-400'
                  }`}>
                  <p.icon size={32} strokeWidth={1.5} />
                </div>
                <span className={`text-[12px] text-center leading-tight font-medium ${selectedProvider === p.id ? 'text-slate-800' : 'text-slate-500'
                  }`}>{p.name}</span>
              </button>
            ))}
            <div className="mt-auto pb-4">
              <ChevronDown size={20} className="text-slate-300" />
            </div>
          </aside>

          {/* Main Picker Content */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-6 space-y-4 h-full flex flex-col">
              {/* Search Bar */}
              <div className="relative group">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder={`Search in ${providers.find(p => p.id === selectedProvider)?.name}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-md outline-none focus:border-blue-400 transition-all font-medium text-slate-700"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between font-medium">
                <div className="flex items-center gap-4">
                  <Menu size={20} className="text-slate-600 cursor-pointer" />
                  <Folder size={20} className="text-slate-400" />
                </div>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 px-4 py-1.5 rounded text-[14px] font-bold transition-all active:scale-95 text-white"
                    style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}>
                    <Plus size={18} strokeWidth={3} /> New
                  </button>
                  <div className="flex items-center gap-3 text-slate-500">
                    <ArrowUpDown size={18} className="cursor-pointer" />
                    <LayoutGrid size={18} className="cursor-pointer" />
                  </div>
                </div>
              </div>

              {/* File List Headers */}
              <div className="flex border-b border-slate-100 pb-3 text-[14px] font-medium text-slate-600 px-2 mt-6">
                <div className="w-1/2">Name</div>
                <div className="w-1/2 flex items-center gap-1 justify-end">Last Modified <ChevronDown size={14} className="stroke-[3]" /></div>
              </div>

              {/* File List */}
              <div className="space-y-1 pt-2 overflow-y-auto flex-1">
                {mockFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (selectedFiles.find(s => s.id === file.id)) {
                        setSelectedFiles(selectedFiles.filter(s => s.id !== file.id));
                      } else {
                        setSelectedFiles([...selectedFiles, file]);
                      }
                    }}
                    className={`flex items-center p-3 rounded-lg group cursor-pointer transition-all border ${selectedFiles.find(s => s.id === file.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-blue-50/50 border-transparent hover:border-blue-100'}`}
                  >
                    <div className="w-1/2 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedFiles.find(s => s.id === file.id) ? 'text-blue-500' : 'text-slate-400'}`}>
                        <FileText size={32} strokeWidth={1} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-medium text-slate-800">{file.name}</span>
                        <span className="text-[12px] text-slate-400">Uploaded by {file.uploader}</span>
                      </div>
                    </div>
                    <div className="w-1/2 text-right text-[14px] text-slate-600 pr-2">
                      {file.modified} by {file.uploader}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button onClick={onClose} className="text-[14px] font-medium text-slate-600 hover:text-slate-800 px-4 py-2">
            Cancel
          </button>
          <button
            disabled={selectedFiles.length === 0}
            onClick={() => {
              onAttach(selectedFiles);
              setSelectedFiles([]);
              onClose();
            }}
            className={`bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-2 rounded font-bold text-[14px] shadow-sm active:scale-95 transition-all ${selectedFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Attach {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Export Documents Modal Component ---
function ExportDocumentsModal({ isOpen, onClose, currentVisibleFiles }) {
  const [module, setModule] = useState("Documents");
  const [documentSource, setDocumentSource] = useState("");
  const [sourceType, setSourceType] = useState("all"); // "all" or "period"
  const [dataType, setDataType] = useState(""); // For Customers/Vendors: "customers"/"vendors", "contactPersons", "addresses"
  const [status, setStatus] = useState("All"); // For Invoices/Quotes: status selection
  const [exportTemplate, setExportTemplate] = useState("");
  const [isExportTemplateDropdownOpen, setIsExportTemplateDropdownOpen] = useState(false);
  const [exportTemplateSearch, setExportTemplateSearch] = useState("");
  const exportTemplateDropdownRef = useRef(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [fieldMappings, setFieldMappings] = useState([
    { id: 1, zohoField: "Journal Number Suffix", exportField: "Journal Number Suffix" },
    { id: 2, zohoField: "Journal Date", exportField: "Journal Date" },
    { id: 3, zohoField: "Notes", exportField: "Notes" }
  ]);
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [exportFormat, setExportFormat] = useState("csv"); // "csv", "xls", "xlsx"
  const [filePassword, setFilePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [includePII, setIncludePII] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [isStartDateRangePickerOpen, setIsStartDateRangePickerOpen] = useState(false);
  const [isEndDateRangePickerOpen, setIsEndDateRangePickerOpen] = useState(false);
  const [startDateCalendar, setStartDateCalendar] = useState(new Date());
  const [endDateCalendar, setEndDateCalendar] = useState(new Date());
  const [startDateRangeCalendar, setStartDateRangeCalendar] = useState(new Date());
  const [endDateRangeCalendar, setEndDateRangeCalendar] = useState(new Date());

  const startDatePickerRef = useRef(null);
  const endDatePickerRef = useRef(null);
  const startDateRangePickerRef = useRef(null);
  const endDateRangePickerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setModule("Documents");
      setDocumentSource("");
      setSourceType("all");
      setDataType("");
      setStatus("All");
      setExportTemplate("");
      setIsExportTemplateDropdownOpen(false);
      setExportTemplateSearch("");
      setDecimalFormat("1234567.89");
      setIsNewTemplateModalOpen(false);
      setTemplateName("");
      setFieldMappings([
        { id: 1, zohoField: "Journal Number Suffix", exportField: "Journal Number Suffix" },
        { id: 2, zohoField: "Journal Date", exportField: "Journal Date" },
        { id: 3, zohoField: "Notes", exportField: "Notes" }
      ]);
      setExportFormat("csv");
      setFilePassword("");
      setShowPassword(false);
      setIncludePII(false);
      setStartDate("");
      setEndDate("");
      setIsStartDatePickerOpen(false);
      setIsEndDatePickerOpen(false);
      setIsStartDateRangePickerOpen(false);
      setIsEndDateRangePickerOpen(false);
      setStartDateCalendar(new Date());
      setEndDateCalendar(new Date());
      setStartDateRangeCalendar(new Date());
      setEndDateRangeCalendar(new Date());
    }
  }, [isOpen]);

  // Format date as dd/MM/yyyy
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get days in month for calendar
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        month: "prev",
        fullDate: new Date(year, month - 1, prevMonthDays - i)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: "current",
        fullDate: new Date(year, month, i)
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        month: "next",
        fullDate: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  // Navigate month
  const navigateMonth = (direction, calendarType) => {
    const calendars = {
      start: setStartDateCalendar,
      end: setEndDateCalendar,
      startRange: setStartDateRangeCalendar,
      endRange: setEndDateRangeCalendar
    };

    const currentCalendars = {
      start: startDateCalendar,
      end: endDateCalendar,
      startRange: startDateRangeCalendar,
      endRange: endDateRangeCalendar
    };

    const setter = calendars[calendarType];
    const current = currentCalendars[calendarType];

    if (direction === "prev") {
      setter(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    } else {
      setter(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    }
  };

  // Handle date select
  const handleDateSelect = (date, dateType) => {
    const dateStr = date.toISOString().split('T')[0];
    if (dateType === "start") {
      setStartDate(dateStr);
      setIsStartDatePickerOpen(false);
    } else if (dateType === "end") {
      setEndDate(dateStr);
      setIsEndDatePickerOpen(false);
    } else if (dateType === "startRange") {
      setStartDate(dateStr);
      setIsStartDateRangePickerOpen(false);
    } else if (dateType === "endRange") {
      setEndDate(dateStr);
      setIsEndDateRangePickerOpen(false);
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (startDatePickerRef.current && !startDatePickerRef.current.contains(event.target)) {
        setIsStartDatePickerOpen(false);
      }
      if (endDatePickerRef.current && !endDatePickerRef.current.contains(event.target)) {
        setIsEndDatePickerOpen(false);
      }
      if (startDateRangePickerRef.current && !startDateRangePickerRef.current.contains(event.target)) {
        setIsStartDateRangePickerOpen(false);
      }
      if (endDateRangePickerRef.current && !endDateRangePickerRef.current.contains(event.target)) {
        setIsEndDateRangePickerOpen(false);
      }
      if (exportTemplateDropdownRef.current && !exportTemplateDropdownRef.current.contains(event.target)) {
        setIsExportTemplateDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset data type when module changes
  useEffect(() => {
    if (module === "Customers") {
      setDataType("customers");
    } else if (module === "Vendors") {
      setDataType("vendors");
    } else {
      setDataType("");
    }
  }, [module]);

  // Get the label for "All [Module]" based on selected module
  const getAllModuleLabel = () => {
    if (module === "Documents") return "All Documents";
    if (module === "Manual Journals") return "All Manual Journals";
    if (module === "Items") return "All Items";
    if (module === "Inventory Adjustments") return "All Inventory Adjustments";
    if (module === "Tasks") return "All Tasks";
    if (module === "Users") return "All Users";
    if (module === "Chart of Accounts") return "All Chart of Accounts";
    if (module === "Exchange Rates") return "All Exchange Rates";
    if (module === "Customers") return "All Customers";
    if (module === "Vendors") return "All Vendors";
    if (module === "Projects") return "All Projects";
    if (module === "Project Tasks") return "All Project Tasks";
    if (module === "Timesheet") return "All Timesheet";
    if (module === "Vendor Credits") return "All Vendor Credits";
    if (module === "Applied Vendor Credits") return "All Applied Vendor Credits";
    if (module === "Vendor Credit Refunds") return "All Vendor Credit Refunds";
    if (module === "Recurring Bills") return "All Recurring Bills";
    if (module === "Bill Payments") return "All Bill Payments";
    if (module === "Bills") return "All Bills";
    if (module === "Purchase Orders") return "All Purchase Orders";
    if (module === "Recurring Expenses") return "All Recurring Expenses";
    if (module === "Expenses") return "All Expenses";
    if (module === "Refunds") return "All Refunds";
    if (module === "Credit Notes Applied to Invoices") return "All Credit Notes Applied to Invoices";
    if (module === "Credit Notes") return "All Credit Notes";
    if (module === "Recurring Invoices") return "All Recurring Invoices";
    if (module === "Invoice Payments") return "All Invoice Payments";
    if (module === "Invoices") return "All Invoices";
    if (module === "Quotes") return "All Quotes";
    return `All ${module}`;
  };

  // Check if module should show PII checkbox
  const shouldShowPII = () => {
    return module === "Users" ||
      module === "Items" ||
      module === "Customers" ||
      module === "Vendors" ||
      module === "Projects" ||
      module === "Vendor Credits" ||
      module === "Applied Vendor Credits" ||
      module === "Vendor Credit Refunds" ||
      module === "Recurring Bills" ||
      module === "Bill Payments" ||
      module === "Bills" ||
      module === "Purchase Orders" ||
      module === "Recurring Expenses" ||
      module === "Expenses" ||
      module === "Refunds" ||
      module === "Credit Notes Applied to Invoices" ||
      module === "Credit Notes" ||
      module === "Recurring Invoices" ||
      module === "Invoice Payments" ||
      module === "Invoices" ||
      module === "Quotes";
  };

  // Check if module should show data type selection
  const shouldShowDataType = () => {
    return module === "Customers" || module === "Vendors";
  };

  // Check if module should show document source/period selection
  const shouldShowDocumentSource = () => {
    // Projects, Project Tasks, and Timesheet don't show document source/period selection
    // Invoices and Quotes show Status and Date Range instead
    return module !== "Projects" &&
      module !== "Project Tasks" &&
      module !== "Timesheet" &&
      module !== "Invoices" &&
      module !== "Quotes";
  };

  // Check if module should show status and date range (for Invoices and Quotes)
  const shouldShowStatusAndDateRange = () => {
    return module === "Invoices" || module === "Quotes";
  };

  if (!isOpen) return null;

  const handleExport = () => {
    // Filter files based on source type
    let filesToExport = [...currentVisibleFiles];

    if (sourceType === "period" && startDate && endDate) {
      filesToExport = filesToExport.filter(file => {
        const fileDate = new Date(file.uploadedOnFormatted || file.uploadedOn);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        return fileDate >= start && fileDate <= end;
      });
    }

    // Limit to 25,000 rows
    if (filesToExport.length > 25000) {
      filesToExport = filesToExport.slice(0, 25000);
    }

    const exportData = filesToExport.map(file => ({
      name: file.name,
      uploadedBy: file.uploadedBy || "Me",
      uploadedOn: file.uploadedOnFormatted || file.uploadedOn,
      folder: file.folder || "Inbox",
      type: file.type || "",
      status: file.status || ""
    }));

    let content, mimeType, extension, filename;

    if (exportFormat === "csv") {
      const csvContent = [
        ["File Name", "Uploaded By", "Uploaded On", "Folder", "Type", "Status"],
        ...exportData.map(file => [
          file.name,
          file.uploadedBy,
          file.uploadedOn,
          file.folder,
          file.type,
          file.status
        ])
      ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

      content = csvContent;
      mimeType = "text/csv;charset=utf-8;";
      extension = "csv";
      filename = "document_details.csv";
    } else {
      // For XLS/XLSX, we'll create a simple CSV-like structure
      // In a real implementation, you'd use a library like xlsx
      const csvContent = [
        ["File Name", "Uploaded By", "Uploaded On", "Folder", "Type", "Status"],
        ...exportData.map(file => [
          file.name,
          file.uploadedBy,
          file.uploadedOn,
          file.folder,
          file.type,
          file.status
        ])
      ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

      content = csvContent;
      mimeType = exportFormat === "xls" ? "application/vnd.ms-excel" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      extension = exportFormat;
      filename = `document_details.${extension}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
      <div className="bg-white w-[600px] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-[17px] font-bold text-slate-800">Export {module}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5 stroke-[2.5]" />
            <p className="text-[13px] font-medium text-blue-900">
              You can export your data from Zoho Books in CSV, XLS or XLSX format.
            </p>
          </div>

          {/* Module */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-red-500 block">
              Module*
            </label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
            >
              <option value="Sales">Sales</option>
              <option value="Quotes">Quotes</option>
              <option value="Invoices">Invoices</option>
              <option value="Invoice Payments">Invoice Payments</option>
              <option value="Recurring Invoices">Recurring Invoices</option>
              <option value="Credit Notes">Credit Notes</option>
              <option value="Credit Notes Applied to Invoices">Credit Notes Applied to Invoices</option>
              <option value="Refunds">Refunds</option>
              <option value="Purchase">Purchase</option>
              <option value="Expenses">Expenses</option>
              <option value="Recurring Expenses">Recurring Expenses</option>
              <option value="Purchase Orders">Purchase Orders</option>
              <option value="Bills">Bills</option>
              <option value="Bill Payments">Bill Payments</option>
              <option value="Recurring Bills">Recurring Bills</option>
              <option value="Vendor Credits">Vendor Credits</option>
              <option value="Applied Vendor Credits">Applied Vendor Credits</option>
              <option value="Vendor Credit Refunds">Vendor Credit Refunds</option>
              <option value="Timesheet">Timesheet</option>
              <option value="Projects">Projects</option>
              <option value="Project Tasks">Project Tasks</option>
              <option value="Others">Others</option>
              <option value="Customers">Customers</option>
              <option value="Vendors">Vendors</option>
              <option value="Tasks">Tasks</option>
              <option value="Items">Items</option>
              <option value="Inventory Adjustments">Inventory Adjustments</option>
              <option value="Exchange Rates">Exchange Rates</option>
              <option value="Users">Users</option>
              <option value="Chart of Accounts">Chart of Accounts</option>
              <option value="Manual Journals">Manual Journals</option>
              <option value="Documents">Documents</option>
            </select>
          </div>

          {/* Data Type Selection - Only for Customers and Vendors */}
          {shouldShowDataType() && (
            <div className="space-y-2">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dataType"
                    value={module === "Customers" ? "customers" : "vendors"}
                    checked={dataType === (module === "Customers" ? "customers" : "vendors")}
                    onChange={(e) => setDataType(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-[13px] font-medium text-slate-700">
                    {module === "Customers" ? "Customers" : "Vendors"}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dataType"
                    value="contactPersons"
                    checked={dataType === "contactPersons"}
                    onChange={(e) => setDataType(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-[13px] font-medium text-slate-700">
                    {module === "Customers" ? "Customer's Contact Persons" : "Vendor's Contact Persons"}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dataType"
                    value="addresses"
                    checked={dataType === "addresses"}
                    onChange={(e) => setDataType(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-[13px] font-medium text-slate-700">
                    {module === "Customers" ? "Customer's Addresses" : "Vendor's Addressess"}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Status and Date Range - Only for Invoices and Quotes */}
          {shouldShowStatusAndDateRange() && (
            <div className="space-y-4">
              {/* Select Status */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-red-500 block">
                  Select Status*
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
                >
                  <option value="All">All</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Declined">Declined</option>
                  <option value="Invoiced">Invoiced</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Paid">Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700 block">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative" ref={startDateRangePickerRef}>
                    <input
                      type="text"
                      value={formatDate(startDate)}
                      readOnly
                      onClick={() => setIsStartDateRangePickerOpen(!isStartDateRangePickerOpen)}
                      placeholder="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 cursor-pointer"
                    />
                    {isStartDateRangePickerOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-[2001] w-72">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              type="button"
                              onClick={() => navigateMonth("prev", "startRange")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 text-lg font-bold"
                            >
                              «
                            </button>
                            <span className="font-bold text-slate-900 text-sm">
                              {startDateRangeCalendar.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigateMonth("next", "startRange")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 text-lg font-bold"
                            >
                              »
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                              <div
                                key={day}
                                className={`text-xs font-bold text-center py-2 ${day === "Sun" || day === "Sat" ? "text-red-500" : "text-slate-600"}`}
                              >
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1 max-h-64 overflow-y-auto">
                            {getDaysInMonth(startDateRangeCalendar).map((day, idx) => {
                              const isSelected = startDate && day.fullDate.toISOString().split('T')[0] === startDate;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleDateSelect(day.fullDate, "startRange")}
                                  className={`text-sm py-2 rounded hover:bg-slate-100 transition-colors ${day.month !== "current"
                                    ? "text-slate-300"
                                    : isSelected
                                      ? "bg-orange-500 text-white border-2 border-orange-500 font-bold"
                                      : "text-slate-900"
                                    }`}
                                >
                                  {day.date}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-slate-400">-</span>
                  <div className="flex-1 relative" ref={endDateRangePickerRef}>
                    <input
                      type="text"
                      value={formatDate(endDate)}
                      readOnly
                      onClick={() => setIsEndDateRangePickerOpen(!isEndDateRangePickerOpen)}
                      placeholder="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 cursor-pointer"
                    />
                    {isEndDateRangePickerOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-[2001] w-72">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              type="button"
                              onClick={() => navigateMonth("prev", "endRange")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 text-lg font-bold"
                            >
                              «
                            </button>
                            <span className="font-bold text-slate-900 text-sm">
                              {endDateRangeCalendar.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigateMonth("next", "endRange")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 text-lg font-bold"
                            >
                              »
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                              <div
                                key={day}
                                className={`text-xs font-bold text-center py-2 ${day === "Sun" || day === "Sat" ? "text-red-500" : "text-slate-600"}`}
                              >
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1 max-h-64 overflow-y-auto">
                            {getDaysInMonth(endDateRangeCalendar).map((day, idx) => {
                              const isSelected = endDate && day.fullDate.toISOString().split('T')[0] === endDate;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleDateSelect(day.fullDate, "endRange")}
                                  className={`text-sm py-2 rounded hover:bg-slate-100 transition-colors ${day.month !== "current"
                                    ? "text-slate-300"
                                    : isSelected
                                      ? "bg-orange-500 text-white border-2 border-orange-500 font-bold"
                                      : "text-slate-900"
                                    }`}
                                >
                                  {day.date}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document Source - Hidden for Projects, Project Tasks, Timesheet, Invoices, and Quotes */}
          {shouldShowDocumentSource() && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sourceType"
                    value="all"
                    checked={sourceType === "all"}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-[13px] font-medium text-slate-700">{getAllModuleLabel()}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sourceType"
                    value="period"
                    checked={sourceType === "period"}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-[13px] font-medium text-slate-700">Specific Period</span>
                </label>
              </div>
              {sourceType === "period" && (
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 relative" ref={startDatePickerRef}>
                    <label className="text-[12px] font-medium text-slate-600 block mb-1">Start Date</label>
                    <input
                      type="text"
                      value={formatDate(startDate)}
                      readOnly
                      onClick={() => setIsStartDatePickerOpen(!isStartDatePickerOpen)}
                      placeholder="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 cursor-pointer"
                    />
                    {isStartDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-[2001] w-72">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              type="button"
                              onClick={() => navigateMonth("prev", "start")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 text-lg font-bold"
                            >
                              «
                            </button>
                            <span className="font-bold text-slate-900 text-sm">
                              {startDateCalendar.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigateMonth("next", "start")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 text-lg font-bold"
                            >
                              »
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                              <div
                                key={day}
                                className={`text-xs font-bold text-center py-2 ${day === "Sun" || day === "Sat" ? "text-red-500" : "text-slate-600"}`}
                              >
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1 max-h-64 overflow-y-auto">
                            {getDaysInMonth(startDateCalendar).map((day, idx) => {
                              const isSelected = startDate && day.fullDate.toISOString().split('T')[0] === startDate;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleDateSelect(day.fullDate, "start")}
                                  className={`text-sm py-2 rounded hover:bg-slate-100 transition-colors ${day.month !== "current"
                                    ? "text-slate-300"
                                    : isSelected
                                      ? "bg-orange-500 text-white border-2 border-orange-500 font-bold"
                                      : "text-slate-900"
                                    }`}
                                >
                                  {day.date}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 relative" ref={endDatePickerRef}>
                    <label className="text-[12px] font-medium text-slate-600 block mb-1">End Date</label>
                    <input
                      type="text"
                      value={formatDate(endDate)}
                      readOnly
                      onClick={() => setIsEndDatePickerOpen(!isEndDatePickerOpen)}
                      placeholder="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 cursor-pointer"
                    />
                    {isEndDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-[2001] w-72">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              type="button"
                              onClick={() => navigateMonth("prev", "end")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 text-lg font-bold"
                            >
                              «
                            </button>
                            <span className="font-bold text-slate-900 text-sm">
                              {endDateCalendar.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigateMonth("next", "end")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 text-lg font-bold"
                            >
                              »
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                              <div
                                key={day}
                                className={`text-xs font-bold text-center py-2 ${day === "Sun" || day === "Sat" ? "text-red-500" : "text-slate-600"}`}
                              >
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1 max-h-64 overflow-y-auto">
                            {getDaysInMonth(endDateCalendar).map((day, idx) => {
                              const isSelected = endDate && day.fullDate.toISOString().split('T')[0] === endDate;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleDateSelect(day.fullDate, "end")}
                                  className={`text-sm py-2 rounded hover:bg-slate-100 transition-colors ${day.month !== "current"
                                    ? "text-slate-300"
                                    : isSelected
                                      ? "bg-orange-500 text-white border-2 border-orange-500 font-bold"
                                      : "text-slate-900"
                                    }`}
                                >
                                  {day.date}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Template */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 block flex items-center gap-1">
              Export Template
              <Info size={14} className="text-slate-400 stroke-[2.5]" />
            </label>
            <div className="relative" ref={exportTemplateDropdownRef}>
              <div
                onClick={() => setIsExportTemplateDropdownOpen(!isExportTemplateDropdownOpen)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 bg-white cursor-pointer flex items-center justify-between ${isExportTemplateDropdownOpen ? "border-blue-400" : "border-slate-200"
                  }`}
              >
                <span className={exportTemplate ? "text-slate-700" : "text-slate-400"}>
                  {exportTemplate || "Select an Export Template"}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${isExportTemplateDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
              {isExportTemplateDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-[2001] overflow-hidden">
                  {/* Search Input */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={exportTemplateSearch}
                        onChange={(e) => setExportTemplateSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Search"
                        className="w-full pl-9 pr-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Results */}
                  <div className="max-h-60 overflow-y-auto">
                    {exportTemplateSearch.trim() === "" ? (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-400 font-medium">NO RESULTS FOUND</p>
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-400 font-medium">NO RESULTS FOUND</p>
                      </div>
                    )}
                  </div>

                  {/* New Template Button */}
                  <div className="p-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNewTemplateModalOpen(true);
                        setIsExportTemplateDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium"
                    >
                      <Plus size={16} className="stroke-[2.5]" />
                      New Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Decimal Format */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-red-500 block">
              Decimal Format*
            </label>
            <select
              value={decimalFormat}
              onChange={(e) => setDecimalFormat(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
            >
              <option value="1234567.89">1234567.89</option>
              <option value="1,234,567.89">1,234,567.89</option>
              <option value="1234567,89">1234567,89</option>
              <option value="1.234.567,89">1.234.567,89</option>
            </select>
          </div>

          {/* Export File Format */}
          <div className="space-y-3">
            <label className="text-[13px] font-bold text-red-500 block">
              Export File Format*
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="exportFormat"
                  value="csv"
                  checked={exportFormat === "csv"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-[13px] font-medium text-slate-700">CSV (Comma Separated Value)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="exportFormat"
                  value="xls"
                  checked={exportFormat === "xls"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-[13px] font-medium text-slate-700">XLS (Microsoft Excel 1997-2004 Compatible)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="exportFormat"
                  value="xlsx"
                  checked={exportFormat === "xlsx"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-[13px] font-medium text-slate-700">XLSX (Microsoft Excel)</span>
              </label>
            </div>
          </div>

          {/* Include PII Checkbox - Only for Users and Items */}
          {shouldShowPII() && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePII}
                  onChange={(e) => setIncludePII(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-[13px] font-medium text-slate-700">
                  Include Sensitive Personally Identifiable Information (PII) while exporting.
                </span>
              </label>
            </div>
          )}

          {/* File Protection Password */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 block">
              File Protection Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={filePassword}
                onChange={(e) => setFilePassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} className="stroke-[2]" /> : <Eye size={18} className="stroke-[2]" />}
              </button>
            </div>
            <p className="text-[12px] font-medium text-slate-500 mt-1">
              Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
            </p>
          </div>

          {/* Note */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-[12px] font-medium text-amber-900">
              <strong>Note:</strong> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{" "}
              <a href="#" className="text-blue-600 hover:underline">Backup Your Data</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 text-[14px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2 text-[14px] font-bold text-white rounded-md transition-all shadow-sm"
            style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* New Export Template Modal */}
      <NewExportTemplateModal
        isOpen={isNewTemplateModalOpen}
        onClose={() => {
          setIsNewTemplateModalOpen(false);
          setTemplateName("");
          setFieldMappings([
            { id: 1, zohoField: "Journal Number Suffix", exportField: "Journal Number Suffix" },
            { id: 2, zohoField: "Journal Date", exportField: "Journal Date" },
            { id: 3, zohoField: "Notes", exportField: "Notes" }
          ]);
        }}
        onSave={(name, mappings) => {
          // Save template and select it
          setExportTemplate(name);
          setIsNewTemplateModalOpen(false);
          // In a real app, you would save this to backend/storage
        }}
        templateName={templateName}
        setTemplateName={setTemplateName}
        fieldMappings={fieldMappings}
        setFieldMappings={setFieldMappings}
      />
    </div>
  );
}

// --- New Export Template Modal Component ---
function NewExportTemplateModal({ isOpen, onClose, onSave, templateName, setTemplateName, fieldMappings, setFieldMappings }) {
  // Common field options for Zoho Books
  const zohoFieldOptions = [
    "Journal Number Suffix",
    "Journal Date",
    "Notes",
    "Reference Number",
    "Currency",
    "Exchange Rate",
    "Amount",
    "Account Name",
    "Description",
    "Debit",
    "Credit"
  ];

  const handleAddField = () => {
    const newId = Math.max(...fieldMappings.map(f => f.id), 0) + 1;
    setFieldMappings([...fieldMappings, { id: newId, zohoField: "", exportField: "" }]);
  };

  const handleRemoveField = (id) => {
    setFieldMappings(fieldMappings.filter(f => f.id !== id));
  };

  const handleFieldChange = (id, field, value) => {
    setFieldMappings(fieldMappings.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const handleSave = () => {
    if (templateName.trim()) {
      onSave(templateName, fieldMappings);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
      <div className="bg-white w-[700px] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-[17px] font-bold text-slate-800">New Export Template</h3>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: "#156372" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#0e4a5e"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#156372"}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Template Name */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-red-500 block">
              Template Name*
            </label>
            <input
              autoFocus
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-blue-400 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700"
              placeholder="Enter template name"
            />
          </div>

          {/* Field Mapping Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200">
              <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wide">
                FIELD NAME IN ZOHO BOOKS
              </div>
              <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wide">
                FIELD NAME IN EXPORT FILE
              </div>
            </div>

            <div className="space-y-2">
              {fieldMappings.map((mapping, index) => (
                <div key={mapping.id} className="grid grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <GripVertical size={18} className="text-slate-400 cursor-move" />
                    <select
                      value={mapping.zohoField}
                      onChange={(e) => handleFieldChange(mapping.id, "zohoField", e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
                    >
                      <option value="">Select field</option>
                      {zohoFieldOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={mapping.exportField}
                      onChange={(e) => handleFieldChange(mapping.id, "exportField", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700"
                      placeholder="Enter export field name"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Field Button */}
            <button
              type="button"
              onClick={handleAddField}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium"
            >
              <Plus size={16} className="stroke-[2.5]" />
              Add a New Field
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 text-[14px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-[14px] font-bold text-white rounded-md transition-all shadow-sm"
            style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Save and Select
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Page Tips Modal Component ---
function PageTipsModal({ isOpen, onClose }) {
  const [expandedSection, setExpandedSection] = useState("zoho");

  if (!isOpen) return null;

  const sections = [
    {
      id: "zoho",
      title: "Zoho Mail",
      icon: (
        <div className="w-5 h-5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500 fill-current">
            <path d="M20,4H4C2.89,4,2,4.89,2,6v12c0,1.11,0.89,2,2,2h16c1.11,0,2-0.89,2-2V6C22,4.89,21.11,4,20,4z M20,18H4V8l8,5l8-5V18z M12,11L4,6h16L12,11z" />
          </svg>
        </div>
      ),
      steps: [
        { text: "Enable Auto-upload Bank Statements in Zoho Books and copy the generated email address." },
        { text: "Open Zoho Mail.", bold: true },
        { text: "Click the Gear icon in the top-right corner.", bold: ["Gear"] },
        { text: "Create a new incoming filter to filter the emails from your bank that has an attachment and fill in the details." },
        { text: "Choose Forward email to under the Actions section.", bold: ["Forward email to", "Actions"] },
        { text: "Paste the email address and click Save. Now, your bank statements will be forwarded to the Bank Statement Inbox in Zoho Books.", bold: ["Save"] }
      ]
    },
    {
      id: "gmail",
      title: "Gmail",
      icon: (
        <div className="w-5 h-5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-500 fill-current">
            <path d="M20,4H4C2.89,4,2,4.89,2,6v12c0,1.11,0.89,2,2,2h16c1.11,0,2-0.89,2-2V6C22,4.89,21.11,4,20,4z M20,18h-2V8l-6,3.75L6,8v10H4V6h0.7L12,11l7.3-5H20V18z" />
          </svg>
        </div>
      ),
      steps: [
        { text: "Enable Auto-upload Bank Statements in Zoho Books and copy the generated email address." },
        { text: "Open Gmail and navigate to Settings.", bold: ["Settings"] },
        { text: "Go to the Forwarding and POP/IMAP tab and click Add a forwarding address.", bold: ["Forwarding and POP/IMAP", "Add a forwarding address"] },
        { text: "Paste the generated email address in the popup and click Next.", bold: ["Next"] },
        { text: "Click Proceed in the new tab that opens. Gmail will send a verification code to the Bank Statements Inbox in Zoho Books.", bold: ["Proceed"] },
        { text: "Check the Bank Statements Inbox for the PDF file from Gmail and copy the verification code." },
        { text: "Paste the code under Forwarding and POP/IMAP in Settings in Gmail to verify the email address. As soon as the email is verified, it will be added as a forwarding address.", bold: ["Forwarding and POP/IMAP", "Settings"] },
        { text: "Next, go to Filters and Blocked Addresses tab.", bold: ["Filters and Blocked Addresses"] },
        { text: "Click Create a new filter and fill in the details.", bold: ["Create a new filter"] },
        { text: "Enter your bank's email address from which you receive the bank statements." },
        { text: "Mark the option Has attachment to filter only emails that have an attachment.", bold: ["Has attachment"] }
      ]
    },
    {
      id: "outlook",
      title: "Outlook",
      icon: (
        <div className="w-5 h-5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-600 fill-current">
            <path d="M20,4H4C2.89,4,2,4.89,2,6v12c0,1.11,0.89,2,2,2h16c1.11,0,2-0.89,2-2V6C22,4.89,21.11,4,20,4z M20,18H4V8l8,5l8-5V18z M12,11L4,6h16L12,11z" />
          </svg>
        </div>
      ),
      steps: [
        { text: "Enable Auto-upload Bank Statements in Zoho Books and copy the generated email address." },
        { text: "Open Outlook.", bold: true },
        { text: "Click the Gear icon in the top-right corner and click Settings.", bold: ["Gear", "Settings"] },
        { text: "Click View all Outlook settings.", bold: ["View all Outlook settings"] },
        { text: "Select the Rules tab under the Mail section.", bold: ["Rules", "Mail"] },
        { text: "Click + Add new rule and enter the details with proper conditions.", bold: ["+ Add new rule"] },
        { text: "Ensure to add a condition as Has attachment so that only emails that have an attachment are auto-forwarded.", bold: ["Has attachment"] },
        { text: "Select Forward to under Add an action section and paste the generated email address.", bold: ["Forward to", "Add an action"] },
        { text: "Click Save. Now, your bank statements will be forwarded to the Bank Statement Inbox in Zoho Books.", bold: ["Save"] }
      ]
    }
  ];

  const renderText = (step) => {
    if (!step.bold) return step.text;
    if (step.bold === true) return <span className="font-extrabold">{step.text}</span>;

    let parts = [step.text];
    step.bold.forEach(term => {
      const newParts = [];
      parts.forEach(part => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }
        const regex = new RegExp(`(${term})`, 'g');
        const split = part.split(regex);
        split.forEach((s, i) => {
          if (s === term) {
            newParts.push(<span key={i} className="font-extrabold text-slate-900">{s}</span>);
          } else if (s) {
            newParts.push(s);
          }
        });
      });
      parts = newParts;
    });
    return parts;
  };

  return (
    <div className="fixed inset-0 z-[600] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/5 bg-slate-900/10 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-[480px] h-full bg-white shadow-[-10px_0_50px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shadow-inner">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-amber-500 fill-amber-500/20">
                <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,17c-0.55,0-1-0.45-1-1v-4c0-0.55,0.45-1,1-1s1,0.45,1,1v4 C13,16.55,12.55,17,12,17z M12,9c-0.55,0-1-0.45-1-1s0.45-1,1-1s1,0.45,1,1S12.55,9,12,9z" className="fill-amber-500" />
                <path d="M9,21l3,2l3-2" className="stroke-amber-600 stroke-2 fill-none" />
              </svg>
            </div>
            <h2 className="text-[20px] font-extrabold text-slate-800 leading-tight">How do I auto-forward bank<br />statements from my email?</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
            <X size={20} className="text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8 space-y-4 bg-white">
          {sections.map((section) => (
            <div key={section.id} className={`border rounded-xl transition-all duration-300 ${expandedSection === section.id ? 'border-blue-500 shadow-md shadow-blue-500/5' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}>
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <span className={`text-[15px] font-bold ${expandedSection === section.id ? 'text-blue-600' : 'text-slate-700'}`}>{section.title}</span>
                </div>
                <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${expandedSection === section.id ? 'rotate-180' : ''}`} />
              </button>

              {expandedSection === section.id && (
                <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="h-[1px] bg-slate-100 mb-6" />
                  <ul className="space-y-5">
                    {section.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />
                        <p className="text-[14px] leading-relaxed text-slate-600 font-medium">
                          {renderText(step)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- New Folder Modal Component ---
function NewFolderModal({ isOpen, onClose, onCreate, initialData }) {
  const [folderName, setFolderName] = useState("");
  const [permission, setPermission] = useState("all");

  useEffect(() => {
    if (initialData) {
      setFolderName(initialData.name);
      setPermission(initialData.permission || "all");
    } else {
      setFolderName("");
      setPermission("all");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (folderName.trim()) {
      onCreate(folderName, permission);
      setFolderName("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
      <div className="bg-white w-[460px] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-bold text-slate-800">{initialData ? 'Edit Folder' : 'New Folder'}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = "#156372"}
            onMouseLeave={(e) => e.currentTarget.style.color = ""}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-red-500 block">
              Folder Name*
            </label>
            <input
              autoFocus
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[13px] font-bold text-red-500 block">
              Folder Permissions*
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="permission"
                  checked={permission === "all"}
                  onChange={() => setPermission("all")}
                  className="mt-1 w-4 h-4 accent-blue-500 border-slate-300 cursor-pointer"
                />
                <span className="text-[13px] text-slate-700 font-medium">
                  All users with permission to access documents.
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="permission"
                  checked={permission === "custom"}
                  onChange={() => setPermission("custom")}
                  className="mt-1 w-4 h-4 accent-blue-500 border-slate-300 cursor-pointer"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-slate-700 font-medium whitespace-nowrap">Custom</span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      This folder will be visible to the Admin(s) by default.
                    </span>
                  </div>
                  {permission === "custom" && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="w-full h-11 px-3 py-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between group-hover:border-blue-400 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-bold border border-slate-200">Admin</span>
                        </div>
                        <ChevronDown size={14} className="text-slate-400" />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-50 flex items-center gap-2">
          <button className="bg-[#4a90e2] hover:bg-[#357abd] text-white px-5 py-2 rounded-md text-[13px] font-bold transition-all shadow-sm active:scale-95" 
            style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }} onClick={handleSave}>
            Save
          </button>
          <button className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-slate-600 px-5 py-2 rounded-md text-[13px] font-bold transition-all active:bg-slate-300 border border-slate-100" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Document Action Overlay Component ---
function DocumentActionOverlay({ isOpen, onClose, document, actionType }) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-white flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">{actionType === "New Expense" ? "Record Expense" : actionType}</h2>
          <div className="h-6 w-[1px] bg-slate-200"></div>
          {/* Add to Header Dropdown Simulation */}
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#f15c5c] text-white text-[12px] font-bold shadow-sm opacity-90 cursor-not-allowed">
            Add to <ChevronDown size={14} className="stroke-[2.5]" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} className="stroke-[1.5]" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Document Viewer */}
        <div className="w-1/2 bg-slate-50 border-r border-slate-200 flex flex-col relative">
          <div className="flex-1 p-8 flex items-center justify-center overflow-auto">
            {document.type === 'pdf' ? (
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <div className="w-24 h-32 border-2 border-slate-200 rounded flex items-center justify-center bg-white shadow-sm">
                  <FileText size={48} className="text-slate-300" />
                </div>
                <span className="font-medium text-sm">PDF Document Preview</span>
              </div>
            ) : (
              <img
                src={document.previewUrl || '/placeholder.svg'}
                alt="Document"
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-slate-200"
                onError={(e) => {
                  // `target` is typed as EventTarget; use currentTarget which is the <img/>.
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            )}
          </div>

          {/* Viewer Controls */}
          <div className="absolute bottom-6 right-6 flex gap-2">
            <button className="w-8 h-8 rounded bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-500 transition-colors">
              <Search size={14} />
            </button>
            <button className="w-8 h-8 rounded bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-500 transition-colors">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Right: Form */}
        <div className="w-1/2 flex flex-col bg-white h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10">
            {/* Form Fields matching the screenshot - Rendered for ALL types as requested to 'display this design' */}
            <div className="space-y-8 max-w-2xl mx-auto">
              {/* Dynamic Form Rendering based on actionType */}
              {actionType === "New Bill" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-red-500">Date*</label>
                    <div className="relative">
                      <input type="text" className="w-full px-3 py-2 border border-blue-400 rounded-md outline-none text-[13px] font-medium text-slate-700 bg-white" defaultValue={document.date || "10/03/2025"} />
                      <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-red-500">Bill#*</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" defaultValue={document.ref || "BILL-001"} />
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-slate-700">Order#</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" />
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-slate-700">Due Date</label>
                    <div className="relative">
                      <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 bg-white" defaultValue="21/04/2025" />
                      <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-slate-700">Payment Terms</label>
                    <div className="relative w-full">
                      <select className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 appearance-none bg-white hover:border-slate-300 focus:border-blue-400 transition-colors">
                        <option>Due on Receipt</option>
                        <option>Net 15</option>
                        <option>Net 30</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              )}

              {(actionType === "New Expense" || !["New Bill", "New Purchase Order", "New Vendor Credits"].includes(actionType)) && (
                <div className="space-y-6">
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-red-500">Date*</label>
                    <div className="relative">
                      <input type="text" className="w-full px-3 py-2 border border-blue-400 rounded-md outline-none text-[13px] font-medium text-slate-700 bg-white" defaultValue={document.date || "10/03/2025"} />
                      <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-[180px_1fr] gap-6 items-start">
                    <label className="text-[13px] font-medium text-red-500 pt-2">Expense Account*</label>
                    <div className="space-y-1 w-full">
                      <div className="relative">
                        <select className="w-full px-3 py-2.5 border border-blue-400 rounded-md outline-none text-[13px] font-medium text-slate-600 appearance-none bg-white">
                          <option>Select an account</option>
                          <option>Advertising And Marketing</option>
                          <option>Office Supplies</option>
                          <option>Travel Expense</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none stroke-[2.5]" />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-blue-500 font-bold cursor-pointer hover:underline">
                        <LayoutGrid size={12} /> Itemize
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[180px_1fr] gap-6 items-start">
                    <label className="text-[13px] font-medium text-red-500 pt-2">Amount*</label>
                    <div className="space-y-1 w-full">
                      <div className="flex gap-2">
                        <div className="w-24 relative shrink-0">
                          <select className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-bold text-slate-600 appearance-none bg-slate-50">
                            <option>USD</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none stroke-[2.5]" />
                        </div>
                        <input type="text" className="flex-1 px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" defaultValue={document.amount?.replace(/[^0-9.]/g, '') || "5000"} />
                      </div>
                      <p className="text-[11px] text-slate-500 italic flex items-center justify-end gap-1">
                        (As on 2025-03-10) 1 USD = 129.349373 KES <Edit2 size={10} className="text-blue-500 cursor-pointer" />
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-4"></div>

                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-red-500">Paid Through*</label>
                    <div className="relative w-full">
                      <select className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 appearance-none bg-white hover:border-slate-300 focus:border-blue-400 transition-colors">
                        <option>Undeposited Funds</option>
                        <option>Petty Cash</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              )}

              {actionType === "New Purchase Order" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-red-500">Date*</label>
                    <div className="relative">
                      <input type="text" className="w-full px-3 py-2 border border-blue-400 rounded-md outline-none text-[13px] font-medium text-slate-700 bg-white" defaultValue={document.date || "10/03/2025"} />
                      <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-red-500">PO#*</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" defaultValue={document.ref || "PO-00007"} />
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-slate-700">Delivery Date</label>
                    <div className="relative">
                      <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 bg-white" placeholder="dd MMM yyyy" />
                      <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-slate-700">Shipment Preference</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" placeholder="e.g. FedEx, UPS" />
                  </div>
                </div>
              )}

              {actionType === "New Vendor Credits" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-red-500">Date*</label>
                    <div className="relative">
                      <input type="text" className="w-full px-3 py-2 border border-blue-400 rounded-md outline-none text-[13px] font-medium text-slate-700 bg-white" defaultValue={document.date || "10/03/2025"} />
                      <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-red-500">Credit Note#*</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" defaultValue={document.ref || "VC-0001"} />
                  </div>
                  <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                    <label className="text-[13px] font-medium text-slate-700">Subject</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" />
                  </div>
                </div>
              )}

              <div className="h-px bg-slate-100 my-4"></div>

              <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                <label className="text-[13px] font-medium text-slate-700">Vendor</label>
                <div className="flex gap-2 w-full">
                  <div className="relative flex-1">
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" defaultValue={document.vendor || "you"} />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>
                  </div>
                  <button className="w-9 h-9 rounded-md flex items-center justify-center text-white transition-colors shrink-0 shadow-sm"
                    style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}>
                    <Search size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                <label className="text-[13px] font-medium text-slate-700">Reference#</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors" defaultValue={document.ref || document.id || "89"} />
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-6 items-start">
                <label className="text-[13px] font-medium text-slate-700 pt-2">Description</label>
                <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-700 hover:border-slate-300 focus:border-blue-400 transition-colors resize-none" defaultValue="Max daily loss objective"></textarea>
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-6 items-center pt-2">
                <label className="text-[13px] font-medium text-slate-700">Customer Name</label>
                <div className="flex gap-2 w-full">
                  <div className="relative flex-1">
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none text-[13px] font-medium text-slate-400 appearance-none bg-white hover:border-slate-300 focus:border-blue-400 transition-colors">
                      <option>Select or add a customer</option>
                      <option>KOWNI</option>
                      <option>Customer A</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none stroke-[2.5]" />
                  </div>
                  <button className="w-9 h-9 rounded-md flex items-center justify-center text-white transition-colors shrink-0 shadow-sm"
                    style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}>
                    <Search size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-6 items-center">
                <label className="text-[13px] font-medium text-slate-700">Reporting Tags</label>
                <div className="text-[13px] font-bold text-blue-500 flex items-center gap-1 cursor-pointer hover:underline">
                  <LayoutGrid size={14} /> Associate Tags
                </div>
              </div>

              <div className="h-8"></div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.02)] z-10">
            <div className="flex gap-3">
              <button className="px-8 py-2 rounded-[4px] text-[13px] font-bold shadow-sm transition-all active:scale-95 text-white" 
                style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}>Save</button>
              <button className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-slate-600 px-6 py-2 rounded-[4px] text-[13px] font-bold border border-slate-200 transition-all hover:border-slate-300">Save and Next</button>
            </div>
            <div className="flex gap-3">
              <button className="bg-white hover:bg-slate-50 text-slate-600 px-6 py-2 rounded-[4px] text-[13px] font-bold border border-slate-200 transition-all hover:border-slate-300" onClick={onClose}>Skip for Now</button>
              <button onClick={onClose} className="bg-white hover:bg-slate-50 text-slate-600 px-6 py-2 rounded-[4px] text-[13px] font-bold border border-slate-200 transition-all hover:border-slate-300 scale-95 opacity-80 hover:opacity-100">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canCreateDocuments = hasPermission("documents", "documents", "create") || hasPermission("documents", undefined, "create");
  const canEditDocuments = hasPermission("documents", "documents", "edit") || hasPermission("documents", undefined, "edit");
  const canDeleteDocuments = hasPermission("documents", "documents", "delete") || hasPermission("documents", undefined, "delete");
  const [activeTab, setActiveTab] = useState("Files"); // "Files", "Bank Statements", "Trash", or folder ID
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutoscanDropdownOpen, setIsAutoscanDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isMoveDropdownOpen, setIsMoveDropdownOpen] = useState(false);
  const [isAddToDropdownOpen, setIsAddToDropdownOpen] = useState(false);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null); // folder object being edited
  const [openSettingsFolder, setOpenSettingsFolder] = useState(null); // id of folder with open settings
  const [selectedFileForDetail, setSelectedFileForDetail] = useState(null); // file object for detail view
  const [isDetailMoveOpen, setIsDetailMoveOpen] = useState(false);
  const [isDetailAddOpen, setIsDetailAddOpen] = useState(false);
  const [isDetailSettingsOpen, setIsDetailSettingsOpen] = useState(false);
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [rowAddToOpen, setRowAddToOpen] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [moveToastMessage, setMoveToastMessage] = useState("");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState("uploadedOn"); // "fileName", "uploadedBy", "uploadedOn", "folder"
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [actionOverlayOpen, setActionOverlayOpen] = useState(false);
  const [isPageTipsModalOpen, setIsPageTipsModalOpen] = useState(false);
  const [selectedActionDocument, setSelectedActionDocument] = useState(null);
  const [selectedActionType, setSelectedActionType] = useState(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachEntityType, setAttachEntityType] = useState(null); // 'Customer' | 'Vendor' | 'Account'
  const [attachEntitySelection, setAttachEntitySelection] = useState("");
  const [attachSelectedDocs, setAttachSelectedDocs] = useState([]);
  const [attachEntityOptions, setAttachEntityOptions] = useState([]);

  const handleAddToForm = (formType: string, fileId?: string) => {
    let file = null;
    // If fileId is provided, find that specific file
    if (fileId) {
      file = globalDocuments.find(d => d.id === fileId) || files.find(f => f.id === fileId);
    }
    // If no fileId (bulk action), use the first selected file if available
    else if (selectedFiles.length > 0) {
      const id = selectedFiles[0];
      file = globalDocuments.find(d => d.id === id) || files.find(f => f.id === id);
    }

    // Navigation for new quote/invoice
    if (formType === "New Quote") {
      navigate("/sales/quotes/new");
      setIsAddToDropdownOpen(false);
      setRowAddToOpen(null);
      setIsDetailAddOpen(false);
      return;
    }
    if (formType === "New Invoice") {
      navigate("/sales/invoices/new");
      setIsAddToDropdownOpen(false);
      setRowAddToOpen(null);
      setIsDetailAddOpen(false);
      return;
    }

    // If user clicked one of the entity attach options, open the attach modal
    if (["Customer", "Vendor", "Account"].includes(formType)) {
      setAttachEntityType(formType);
      setAttachSelectedDocs(file ? [file.name] : (selectedFiles.length > 0 ? selectedFiles.map(id => (globalDocuments.find(d => d.id === id) || files.find(f => f.id === id))?.name).filter(Boolean) : []));
      setAttachEntitySelection("");
      setShowAttachModal(true);
      // close any dropdowns that opened this
      setIsAddToDropdownOpen(false);
      setRowAddToOpen(null);
      setIsDetailAddOpen(false);
      return;
    }

    // Always open overlay, passing found file or null/empty for other form types
    setSelectedActionDocument(file || {});
    setSelectedActionType(formType);
    setActionOverlayOpen(true);
  };

  // Filtering States
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedFileType, setSelectedFileType] = useState("All");

  // Folder Search States
  const [isFolderSearchVisible, setIsFolderSearchVisible] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [searchFolderInMove, setSearchFolderInMove] = useState("");

  const [folders, setFolders] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Selection/State for files
  const [files, setFiles] = useState([]);
  const [folderFiles, setFolderFiles] = useState({}); // FolderID -> Array of files

  // Global documents from centralized storage (all modules)
  const [globalDocuments, setGlobalDocuments] = useState(() => getAllDocuments());
  const syncDocuments = async () => {
    const refreshed = await refreshDocuments({ module: "Documents" });
    setGlobalDocuments(refreshed);
  };
  const safeUpdateDocument = async (id, data) => {
    if (!canEditDocuments) return false;
    await updateDocument(id, data);
    return true;
  };
  const safeDeleteDocument = async (id) => {
    if (!canDeleteDocuments) return false;
    await deleteDocument(id);
    return true;
  };

  const autoscanRef = useRef(null);
  const statusRef = useRef(null);
  const moveRef = useRef(null);
  const addToRef = useRef(null);
  const folderSettingsRef = useRef(null);
  const uploadDropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const detailMoveRef = useRef(null);
  const detailAddRef = useRef(null);
  const detailSettingsRef = useRef(null);

  const inboxItems = [
    { id: "Inbox", label: "Inbox", icon: Inbox },
  ];

  const statusOptions = [
    "All",
    "Scan In Progress",
    "Scan Completed",
    "Scan Failed"
  ];

  const fileTypeOptions = [
    "All",
    "Images",
    "PDF",
    "Docs",
    "Sheets"
  ];

  const addToOptions = [
    { label: "New Bill", active: true },
    { label: "New Expense" },
    { label: "New Purchase Order" },
    { label: "New Vendor Credits" },
    { divider: true },
    { label: "Customer" },
    { label: "Vendor" },
    { label: "Account" },
    { divider: true },
    { label: "New Quote" },
    { label: "New Invoice" }
  ];

  const handleSaveFolder = (name, permission) => {
    if (editingFolder && !canEditDocuments) return;
    if (!editingFolder && !canCreateDocuments) return;

    if (editingFolder) {
      setFolders(folders.map(f => f.id === editingFolder.id ? { ...f, name, permission } : f));
      setEditingFolder(null);
    } else {
      const newFolder = { id: Date.now().toString(), name, permission };
      setFolders([...folders, newFolder]);
    }
  };

  const isFolderActive = folders.some(f => f.id === activeTab);
  const isTrashActive = activeTab === "Trash";

  const getActiveViewTitle = () => {
    if (activeTab === "All Documents") return "All Documents";
    if (isTrashActive) return "Trash";
    if (isFolderActive) return folders.find(f => f.id === activeTab)?.name;
    return activeTab;
  };

  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
  );

  const toggleSelectAll = () => {
    const currentFiles = activeTab === "All Documents"
      ? [...files, ...Object.values(folderFiles).flat()]
      : activeTab === "Files"
        ? files
        : (folderFiles[activeTab] || []);

    if (selectedFiles.length === currentFiles.length && currentFiles.length > 0) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(currentFiles.map(f => f.id));
    }
  };

  const toggleSelectFile = (id) => {
    if (selectedFiles.includes(id)) {
      setSelectedFiles(selectedFiles.filter(fid => fid !== id));
    } else {
      setSelectedFiles([...selectedFiles, id]);
    }
  };

  const clearSelection = () => setSelectedFiles([]);

  // --- Upload Logic ---
  const handleUploadClick = () => {
    if (!canCreateDocuments) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    if (!canCreateDocuments) {
      event.target.value = null;
      return;
    }
    const uploadedFiles = event.target.files;
    if (uploadedFiles && uploadedFiles.length > 0) {
      const currentFolder = isFolderActive ? folders.find(f => f.id === activeTab)?.name : "Inbox";
      await addMultipleDocuments(Array.from(uploadedFiles), {
        module: "Documents",
        folder: currentFolder,
        status: "Scan In Progress"
      });
      const refreshed = await refreshDocuments({ module: "Documents" });
      setGlobalDocuments(refreshed);

      // Reset input
      event.target.value = null;
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext)) {
      return (
        <div className="w-6 h-6 rounded bg-[#f5eefc] text-[#a855f7] flex items-center justify-center shadow-sm">
          <FileSpreadsheet size={14} className="stroke-[2.5]" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-lg bg-[#e8f5f1] text-[#10b981] flex items-center justify-center scale-100 group-hover:scale-105 transition-transform shadow-sm">
        <FileText size={20} className="stroke-[2.5]" />
      </div>
    );
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (autoscanRef.current && !autoscanRef.current.contains(event.target)) {
        setIsAutoscanDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (moveRef.current && !moveRef.current.contains(event.target)) {
        setIsMoveDropdownOpen(false);
      }
      if (addToRef.current && !addToRef.current.contains(event.target)) {
        setIsAddToDropdownOpen(false);
      }
      if (folderSettingsRef.current && !folderSettingsRef.current.contains(event.target)) {
        setOpenSettingsFolder(null);
      }
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target)) {
        setIsUploadDropdownOpen(false);
      }
      if (detailMoveRef.current && !detailMoveRef.current.contains(event.target)) {
        setIsDetailMoveOpen(false);
      }
      if (detailAddRef.current && !detailAddRef.current.contains(event.target)) {
        setIsDetailAddOpen(false);
      }
      if (detailSettingsRef.current && !detailSettingsRef.current.contains(event.target)) {
        setIsDetailSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for document changes from other modules
  useEffect(() => {
    const handleDocumentAdded = () => {
      void syncDocuments();
    };

    const handleDocumentDeleted = () => {
      void syncDocuments();
    };

    const handleDocumentUpdated = () => {
      void syncDocuments();
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

  useEffect(() => {
    const docs = getAllDocuments({ module: "Documents" });
    setGlobalDocuments(docs);
    const load = async () => {
      const refreshed = await refreshDocuments({ module: "Documents" });
      setGlobalDocuments(refreshed);
    };
    void load();
  }, []);

  useEffect(() => {
    const allDocs = globalDocuments || [];
    const inboxDocs = allDocs.filter((d) => {
      const folderName = d.folder || "Inbox";
      return folderName === "Inbox" || folderName === "root" || folderName === "Files";
    });
    setFiles(inboxDocs);

    const byFolder: Record<string, any[]> = {};
    folders.forEach((f) => {
      byFolder[f.id] = allDocs.filter((d) => (d.folder || "Inbox") === f.name);
    });
    byFolder["Bank Statements"] = allDocs.filter((d) => (d.folder || "Inbox") === "Bank Statements");
    setFolderFiles(byFolder);
  }, [globalDocuments, folders]);

  useEffect(() => {
    if (activeTab === "All Documents") {
      setGlobalDocuments(getAllDocuments({ module: "Documents" }));
    }
  }, [activeTab]);

  useEffect(() => {
    if (!showAttachModal || !attachEntityType) return;
    const loadEntities = async () => {
      try {
        if (attachEntityType === "Customer") {
          const resp = await customersAPI.getAll({ limit: 1000 });
          const data: any = resp?.data as any;
          const list = Array.isArray(data) ? data : (data?.customers ?? data ?? []);
          setAttachEntityOptions(list.map((c: any) => c.displayName || c.customerName || c.name).filter(Boolean));
          return;
        }
        if (attachEntityType === "Vendor") {
          const resp = await vendorsAPI.getAll({ limit: 1000 });
          const data: any = resp?.data as any;
          const list = Array.isArray(data) ? data : (data?.vendors ?? data ?? []);
          setAttachEntityOptions(list.map((v: any) => v.displayName || v.vendorName || v.name).filter(Boolean));
          return;
        }
        if (attachEntityType === "Account") {
          const resp = await accountantAPI.getAccounts({ limit: 1000 });
          const data: any = resp?.data as any;
          const list = Array.isArray(data) ? data : (data?.accounts ?? data ?? []);
          setAttachEntityOptions(list.map((a: any) => a.accountName || a.name).filter(Boolean));
          return;
        }
      } catch (error) {
        console.error("Failed to load attach entities:", error);
      }
      setAttachEntityOptions([]);
    };
    void loadEntities();
  }, [showAttachModal, attachEntityType]);

  const currentVisibleFiles = activeTab === "All Documents"
    ? globalDocuments // Show all documents from entire system
    : activeTab === "Files"
      ? files
      : (folderFiles[activeTab] || []);

  if (permissionsLoading) {
    return <div className="w-full p-8 text-center text-gray-500">Loading permissions...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#f3f4f6] overflow-hidden font-sans text-slate-900">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      <NewFolderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFolder(null);
        }}
        onCreate={handleSaveFolder}
        initialData={editingFolder}
      />

      <CloudPickerModal
        isOpen={isCloudPickerOpen}
        onClose={() => setIsCloudPickerOpen(false)}
        onAttach={async (cloudFiles) => {
          if (!canCreateDocuments) return;
          const folderName = activeTab === "Bank Statements"
            ? "Bank Statements"
            : (typeof activeTab === "string" && folders.find(fd => fd.id === activeTab))
              ? folders.find(fd => fd.id === activeTab).name
              : "Inbox";
          const pseudoFiles = cloudFiles.map((f) => new File([""], f.name, { type: "application/octet-stream" }));
          await addMultipleDocuments(pseudoFiles, {
            module: "Documents",
            folder: folderName,
            status: "Processed",
            source: "cloud-picker"
          });
          const refreshed = await refreshDocuments({ module: "Documents" });
          setGlobalDocuments(refreshed);
        }}
      />

      <ExportDocumentsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentVisibleFiles={currentVisibleFiles}
      />

      {/* Top Header Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-blue-500 hover:text-blue-700 transition-colors text-[13px] font-bold group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" />
            Back
          </button>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Documents</h1>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* 1. DOCUMENTS SIDEBAR */}
        <aside className="w-64 bg-[#f8fafc] text-slate-600 flex flex-col h-full shrink-0 z-20 border-r border-slate-200 shadow-sm">
          <div className="p-4 flex-1 overflow-auto">

          <div className="space-y-1 mb-8">
            <button
              onClick={() => {
                setActiveTab("All Documents");
                clearSelection();
              }}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all text-[13px] font-bold ${activeTab === "All Documents"
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <LayoutGrid size={18} className={`${activeTab === "All Documents" ? "text-slate-600" : "text-slate-400"} stroke-[2.5]`} />
              All Documents
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 px-3">INBOXES</h2>
            <div className="space-y-1">
              {inboxItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    clearSelection();
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all text-[13px] font-bold ${activeTab === item.id
                    ? "text-white shadow-lg"
                    : "hover:bg-slate-100 text-slate-600"
                    }`}
                  style={activeTab === item.id ? { background: "#156372", boxShadow: "0 10px 15px -3px rgba(21, 99, 114, 0.2)" } : {}}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className={activeTab === item.id ? "text-white stroke-[2.5]" : "text-slate-400 stroke-[2.5]"} />
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between px-3 mb-3">
              <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">FOLDERS</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFolderSearchVisible(!isFolderSearchVisible)}
                  className={`transition-colors ${isFolderSearchVisible ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Search size={16} className="stroke-[2.5]" />
                </button>
                <button
                  onClick={() => {
                    setEditingFolder(null);
                    setIsModalOpen(true);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={!canCreateDocuments}
                >
                  <Plus size={16} className="stroke-[2.5]" />
                </button>
              </div>
            </div>

            {isFolderSearchVisible && (
              <div className="px-1.5 mb-3 group animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Type a folder name"
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 pr-8 bg-white border border-blue-400 rounded-lg outline-none text-[13px] text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 transition-all font-bold"
                  />
                  {folderSearchQuery && (
                    <button
                      onClick={() => setFolderSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} className="stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {filteredFolders.length === 0 ? (
              <div className="px-3 py-4 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-[12px] text-slate-400 mb-1.5 font-bold">
                  {folderSearchQuery ? "No folders found." : "There are no folders."}
                </p>
                {!folderSearchQuery && (
                  canCreateDocuments && <button
                    onClick={() => {
                      setEditingFolder(null);
                      setIsModalOpen(true);
                    }}
                    className="text-[#0f94ac] hover:text-[#0dc8e8] text-[12px] font-extrabold"
                  >
                    Create New Folder
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5" ref={folderSettingsRef}>
                {filteredFolders.map((folder) => (
                  <div key={folder.id} className="relative group/folder">
                    <button
                      onClick={() => {
                        setActiveTab(folder.id);
                        clearSelection();
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all text-[13px] font-bold ${activeTab === folder.id
                        ? "bg-slate-100 text-slate-900 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                      <Folder size={18} className={`transition-colors shrink-0 stroke-[2.5] ${activeTab === folder.id ? "text-slate-400" : "text-slate-300 group-hover/folder:text-slate-400"}`} />
                      <span className="truncate flex-1 text-left">{folder.name}</span>
                    </button>

                    {(canEditDocuments || canDeleteDocuments) && <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenSettingsFolder(openSettingsFolder === folder.id ? null : folder.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover/folder:opacity-100 transition-all z-10"
                    >
                      <Settings size={14} className="stroke-[2.5]" />
                    </button>}

                    {openSettingsFolder === folder.id && (
                      <div className="absolute top-full right-0 mt-1 w-[140px] bg-white rounded-lg shadow-2xl border border-slate-100 z-[100] p-1 animate-in fade-in slide-in-from-top-1">
                        {canEditDocuments && <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder);
                            setIsModalOpen(true);
                            setOpenSettingsFolder(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold text-white shadow-md transition-all"
                          style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                        >
                          Edit
                        </button>}
                        {canDeleteDocuments && <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolders(folders.filter(f => f.id !== folder.id));
                            if (activeTab === folder.id) setActiveTab("Files");
                            setOpenSettingsFolder(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                          Delete
                        </button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => {
              setActiveTab("Trash");
              clearSelection();
            }}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-[13px] font-extrabold ${isTrashActive
              ? "bg-[#3b82f6] text-white shadow-lg shadow-blue-200"
              : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
          >
            <Trash2 size={18} className={isTrashActive ? "text-white stroke-[2.5]" : "text-slate-400 stroke-[2.5]"} />
            Trash
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden shadow-inner">
        <header className="h-[72px] px-8 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{getActiveViewTitle()}</h2>
            {activeTab === "Bank Statements" && (
              <div className="flex items-center gap-1.5 pl-4 border-l border-slate-200">
                <span className="text-[13px] font-bold text-slate-500">Forward bank statements to</span>
                <span className="text-[13px] font-extrabold text-slate-800 bg-[#f8fafc] px-2 py-0.5 rounded border border-slate-100">tabaj.otpgyru_zvgwkomy8.secure@inbox.zohoreceipts.com</span>
                <button className="text-[#3b82f6] hover:underline text-[12px] font-bold ml-1">Copy</button>
                <button className="text-[#3b82f6] hover:underline text-[12px] font-bold ml-1">Edit</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">

            {activeTab === "Bank Statements" && (
              <div className="flex items-center gap-3">
                <div className="relative" ref={uploadDropdownRef}>
                  <button
                    onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
                    className="px-5 py-2 text-[12px] font-extrabold shadow-sm rounded-md transition-all flex items-center gap-2 active:scale-95 text-white bg-[#3b82f6] hover:bg-[#2563eb]"
                    disabled={!canCreateDocuments}
                  >
                    Upload File <ChevronDown size={16} className={`transition-transform duration-200 stroke-[3] ${isUploadDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUploadDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[180px] bg-white rounded-xl shadow-2xl border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden p-1.5">
                      <button
                        onClick={() => {
                          handleUploadClick();
                          setIsUploadDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold text-white shadow-md mb-1 transition-all"
                        style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        Attach From Desktop
                      </button>
                      <button
                        onClick={() => {
                          setIsCloudPickerOpen(true);
                          setIsUploadDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        Attach From Cloud
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className={`w-10 h-10 flex items-center justify-center rounded-md border transition-all bg-white shadow-sm ${isSortDropdownOpen ? '' : 'border-slate-200'}`}
                    style={isSortDropdownOpen ? { borderColor: "#156372", backgroundColor: "rgba(21, 99, 114, 0.1)" } : {}}
                    onMouseEnter={(e) => {
                      if (!isSortDropdownOpen) {
                        e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSortDropdownOpen) {
                        e.currentTarget.style.backgroundColor = "";
                      }
                    }}
                  >
                    <MoreVertical size={18} className="stroke-[2.5]" style={isSortDropdownOpen ? { color: "#156372" } : { color: "#475569" }} />
                  </button>
                  {isSortDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[180px] bg-white rounded-lg shadow-2xl border border-slate-100 z-[100] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-3 py-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">SORT BY</span>
                      </div>
                      <button
                        onClick={() => {
                          setSortBy("fileName");
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-[13px] font-bold transition-all flex items-center justify-between ${sortBy === "fileName"
                          ? "text-white shadow-md"
                          : "text-slate-600"
                          }`}
                        style={sortBy === "fileName" ? { background: "#156372", boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.2)" } : {}}
                        onMouseEnter={(e) => {
                          if (sortBy !== "fileName") {
                            e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (sortBy !== "fileName") {
                            e.currentTarget.style.backgroundColor = "";
                          }
                        }}
                      >
                        File Name
                        {sortBy === "fileName" && <CheckCircle2 size={14} className="stroke-[2.5]" />}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy("uploadedOn");
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-[13px] font-bold transition-all flex items-center justify-between ${sortBy === "uploadedOn"
                          ? "text-white shadow-md"
                          : "text-slate-600"
                          }`}
                        style={sortBy === "uploadedOn" ? { background: "#156372", boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.2)" } : {}}
                        onMouseEnter={(e) => {
                          if (sortBy === "uploadedOn") {
                            e.currentTarget.style.backgroundColor = "#0e4a5e";
                          } else {
                            e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (sortBy === "uploadedOn") {
                            e.currentTarget.style.backgroundColor = "#156372";
                          } else {
                            e.currentTarget.style.backgroundColor = "";
                          }
                        }}
                      >
                        Uploaded On
                        {sortBy === "uploadedOn" && <ChevronDown size={14} className="stroke-[2.5]" />}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy("uploadedBy");
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-[13px] font-bold transition-all flex items-center justify-between ${sortBy === "uploadedBy"
                          ? "text-white shadow-md"
                          : "text-slate-600"
                          }`}
                        style={sortBy === "uploadedBy" ? { background: "#156372", boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.2)" } : {}}
                        onMouseEnter={(e) => {
                          if (sortBy === "uploadedBy") {
                            e.currentTarget.style.backgroundColor = "#0e4a5e";
                          } else {
                            e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (sortBy === "uploadedBy") {
                            e.currentTarget.style.backgroundColor = "#156372";
                          } else {
                            e.currentTarget.style.backgroundColor = "";
                          }
                        }}
                      >
                        Uploaded By
                        {sortBy === "uploadedBy" && <CheckCircle2 size={14} className="stroke-[2.5]" />}
                      </button>
                    </div>
                  )}
                </div>
                <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
                <button 
                  onClick={() => setIsPageTipsModalOpen(true)}
                  className="flex items-center gap-2 text-blue-600 font-bold text-[13px] hover:text-blue-700 active:scale-95 transition-all"
                >
                  <HelpCircle size={18} className="stroke-[2.5]" /> Page Tips
                </button>
              </div>
            )}

            {activeTab === "Files" && (
              <>
                <div className="relative" ref={autoscanRef}>
                  <button onClick={() => setIsAutoscanDropdownOpen(!isAutoscanDropdownOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all border ${isAutoscanDropdownOpen ? 'bg-blue-100 border-blue-200' : 'bg-[#f0f7ff] border-[#dceaff]'}`}>
                    <Zap size={14} className="text-[#3b82f6] fill-[#3b82f6] stroke-none" />
                    <span className="text-[12px] font-extrabold text-[#3b82f6]">Available Autoscans: 1</span>
                  </button>
                  {isAutoscanDropdownOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[280px] bg-white rounded-lg shadow-2xl border border-slate-100 z-[100] p-4 animate-in zoom-in-95 duration-200">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[13px] font-bold text-slate-600"><span>Purchased Monthly Auto-scans</span><span className="text-slate-900">2</span></div>
                        <div className="flex items-center justify-between text-[13px] font-bold text-slate-600"><span>Remaining Monthly Auto-scans</span><span className="text-[#10b981]">1</span></div>
                        <div className="flex items-center justify-between text-[13px] font-bold text-slate-600"><span>Carry-forwarded Auto-scans</span><span className="text-[#10b981]">0</span></div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-blue-500 text-blue-600 text-[13px] font-extrabold hover:bg-blue-50 transition-all">Purchase Add-ons <Play size={10} className="fill-blue-600 stroke-none" /></button>
                      </div>
                    </div>
                  )}
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 font-extrabold text-[12px] hover:bg-slate-50 transition-all shadow-sm">
                  <Settings size={14} className="stroke-[2.5]" /> Configure
                </button>
                <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg group cursor-pointer hover:bg-white transition-all shadow-sm">
                  <div className="w-6 h-6 bg-[#3b82f6] rounded flex items-center justify-center shadow-md shadow-blue-500/20"><Zap size={12} className="text-white fill-white stroke-none" /></div>
                  <div className="flex items-center gap-1.5"><span className="text-[12px] font-extrabold text-slate-700">Use Advanced Autoscan.</span><button className="text-[#3b82f6] font-extrabold text-[12px] hover:underline">Buy Addon</button><ArrowUpRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform stroke-[2.5]" /></div>
                </div>
              </>
            )}

            {!isTrashActive && activeTab !== "Bank Statements" && canCreateDocuments && (
              <div className="flex items-center gap-2">
                <div className="relative" ref={uploadDropdownRef}>
                  <button
                    onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
                    className={`px-5 py-2 text-[12px] font-extrabold shadow-lg rounded-md transition-all flex items-center gap-2 active:scale-95 text-white ${isFolderActive || activeTab === "All Documents" ? '' : ''}`}
                    style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    Upload File <ChevronDown size={16} className={`transition-transform duration-200 stroke-[3] ${isUploadDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUploadDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[180px] bg-white rounded-xl shadow-2xl border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden p-1.5">
                      <button
                        onClick={() => {
                          handleUploadClick();
                          setIsUploadDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold text-white shadow-md mb-1 transition-all"
                        style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        Attach From Desktop
                      </button>
                      <button
                        onClick={() => {
                          // In a real app, this would open a modal to select from other folders
                          // For now, we'll keep it consistent with the UI
                          setIsUploadDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        Attach From Documents
                      </button>
                      <button
                        onClick={() => {
                          setIsCloudPickerOpen(true);
                          setIsUploadDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        Attach From Cloud
                      </button>
                    </div>
                  )}
                </div>

                {(isFolderActive || activeTab === "All Documents" || activeTab === "Files") && (
                  <div className="relative">
                    <button
                      onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                      className="w-10 h-10 flex items-center justify-center rounded-md border border-slate-200 transition-all ml-1 bg-white shadow-sm"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "";
                      }}
                    >
                      <MoreVertical size={18} className="stroke-[2.5]" style={{ color: "#475569" }} />
                    </button>
                    {isSortDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-[180px] bg-white rounded-lg shadow-2xl border border-slate-100 z-[100] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-2">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">SORT BY</span>
                        </div>
                        <button
                          onClick={() => {
                            setSortBy("fileName");
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-[13px] font-bold transition-all flex items-center justify-between ${sortBy === "fileName" ? "text-white shadow-md" : "text-slate-600"}`}
                          style={sortBy === "fileName" ? { background: "#156372", boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.2)" } : {}}
                          onMouseEnter={(e) => {
                            if (sortBy === "fileName") {
                              e.currentTarget.style.backgroundColor = "#0e4a5e";
                            } else {
                              e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (sortBy === "fileName") {
                              e.currentTarget.style.backgroundColor = "#156372";
                            } else {
                              e.currentTarget.style.backgroundColor = "";
                            }
                          }}
                        >
                          File Name
                          {sortBy === "fileName" && <CheckCircle2 size={14} className="stroke-[2.5]" />}
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("uploadedBy");
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-[13px] font-bold transition-all flex items-center justify-between ${sortBy === "uploadedBy" ? "text-white shadow-md" : "text-slate-600"}`}
                          style={sortBy === "uploadedBy" ? { background: "#156372", boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.2)" } : {}}
                          onMouseEnter={(e) => {
                            if (sortBy === "uploadedBy") {
                              e.currentTarget.style.backgroundColor = "#0e4a5e";
                            } else {
                              e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (sortBy === "uploadedBy") {
                              e.currentTarget.style.backgroundColor = "#156372";
                            } else {
                              e.currentTarget.style.backgroundColor = "";
                            }
                          }}
                        >
                          Uploaded By
                          {sortBy === "uploadedBy" && <CheckCircle2 size={14} className="stroke-[2.5]" />}
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("uploadedOn");
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-[13px] font-bold transition-all flex items-center justify-between ${sortBy === "uploadedOn" ? "text-white shadow-md" : "text-slate-600"}`}
                          style={sortBy === "uploadedOn" ? { background: "#156372", boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.2)" } : {}}
                          onMouseEnter={(e) => {
                            if (sortBy === "uploadedOn") {
                              e.currentTarget.style.backgroundColor = "#0e4a5e";
                            } else {
                              e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (sortBy === "uploadedOn") {
                              e.currentTarget.style.backgroundColor = "#156372";
                            } else {
                              e.currentTarget.style.backgroundColor = "";
                            }
                          }}
                        >
                          Uploaded On
                          {sortBy === "uploadedOn" && <ChevronDown size={14} className="stroke-[2.5]" />}
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("folder");
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-[13px] font-bold transition-all flex items-center justify-between ${sortBy === "folder" ? "text-white shadow-md" : "text-slate-600"}`}
                          style={sortBy === "folder" ? { background: "#156372", boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.2)" } : {}}
                          onMouseEnter={(e) => {
                            if (sortBy === "folder") {
                              e.currentTarget.style.backgroundColor = "#0e4a5e";
                            } else {
                              e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (sortBy === "folder") {
                              e.currentTarget.style.backgroundColor = "#156372";
                            } else {
                              e.currentTarget.style.backgroundColor = "";
                            }
                          }}
                        >
                          Folder
                          {sortBy === "folder" && <CheckCircle2 size={14} className="stroke-[2.5]" />}
                        </button>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <button
                          onClick={() => {
                            setIsExportModalOpen(true);
                            setIsSortDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold transition-all flex items-center gap-2 text-slate-600"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "";
                          }}
                        >
                          <ArrowUpRight size={14} className="stroke-[2.5]" />
                          Export Document Details
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {activeTab === "Bank Statements" && currentVisibleFiles.length === 0 ? (
          <div className="flex-1 flex flex-col items-center pt-20 bg-white">
            <div className="w-[800px] bg-white border border-slate-100 rounded-lg p-12 text-center shadow-sm relative overflow-hidden">
              <h3 className="text-2xl font-extrabold text-slate-800 mb-12">Auto-upload your bank statements from email</h3>
              <div className="flex items-center justify-center gap-20 mb-12 relative font-bold">
                <div className="flex flex-col items-center gap-4 z-10"><div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 relative overflow-hidden group"><Mail size={40} className="relative z-10 stroke-[2.5]" /></div><span className="text-[13px] text-slate-700 max-w-[140px]">1. Set up auto-forwarding in your email</span></div>
                <div className="absolute w-40 border-t-2 border-dashed border-slate-200 top-12 left-1/2 -translate-x-1/2 -z-0"></div>
                <div className="flex flex-col items-center gap-4 z-10"><div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 relative overflow-hidden"><Package size={40} className="relative z-10 stroke-[2.5]" /></div><span className="text-[13px] text-slate-700 max-w-[140px]">2. Add Statements to Bank</span></div>
              </div>
              <div className="mx-auto max-w-[640px] bg-[#f0f4f9] rounded-2xl p-4 flex items-center justify-center gap-3 border border-slate-100 mb-6 font-bold shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-500"><Mail size={16} className="stroke-[2.5]" /></div>
                <span className="text-[15px] font-bold text-slate-800 tracking-tight leading-none">tabaj.otpgyru_zvgwkomy8.secure@inbox.zohoreceipts.com</span>
              </div>
              <div className="flex items-center justify-center gap-6 mb-12 font-extrabold"><button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-[13px]"><Copy size={16} className="stroke-[2.5]" /> Copy</button><button className="flex items-center gap-2 text-blue-500 hover:text-blue-700 transition-colors text-[13px]"><Edit2 size={16} className="stroke-[2.5]" /> Edit</button></div>
            </div>
            <div className="mt-20 flex flex-col items-center gap-6 font-extrabold"><button className="text-[#3b82f6] hover:underline text-[15px]">How do I auto-forward bank statements?</button></div>
          </div>
        ) : (
          <>
            <div className="px-8 py-3.5 bg-white border-b border-slate-50 flex items-center gap-1.5 relative z-50">
              <span className="text-[12px] font-bold text-slate-400">Filter By :</span>
              <div className="relative" ref={statusRef}>
                <button
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="flex items-center gap-1.5 text-slate-500 font-bold text-[12px] hover:text-[#0f94ac] transition-colors"
                >
                  {activeTab === "All Documents" || isFolderActive || isTrashActive ? 'File Type' : 'Status'}: <span className="text-[#0f94ac] font-extrabold">{activeTab === "All Documents" || isFolderActive || isTrashActive ? selectedFileType : selectedStatus}</span>
                  <ChevronDown size={14} className={`stroke-[2.5] transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isStatusDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-[220px] bg-white rounded-lg shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-1 px-1 py-1 duration-200">
                    {activeTab === "All Documents" || isFolderActive || isTrashActive ? (
                      fileTypeOptions.map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedFileType(type);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-md text-[13px] font-bold transition-colors ${selectedFileType === type
                            ? "bg-[#3b82f6] text-white shadow-md shadow-blue-200"
                            : "text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                          {type}
                        </button>
                      ))
                    ) : (
                      statusOptions.map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setSelectedStatus(status);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-md text-[13px] font-bold transition-colors ${selectedStatus === status
                            ? "bg-[#3b82f6] text-white shadow-md shadow-blue-200"
                            : "text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                          {status}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedFiles.length > 0 && activeTab !== "Bank Statements" && (
              <div className="px-8 py-2.5 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  {canDeleteDocuments && <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-2 rounded-md border border-slate-200 bg-white text-slate-500 transition-all shadow-sm"
                    onMouseEnter={(e) => e.currentTarget.style.color = "#156372"}
                    onMouseLeave={(e) => e.currentTarget.style.color = ""}
                  >
                    <Trash2 size={16} className="stroke-[2.5]" />
                  </button>}
                  {canEditDocuments && <div className="relative" ref={moveRef}>
                    <button
                      onClick={() => setIsMoveDropdownOpen(!isMoveDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[12px] font-extrabold hover:bg-slate-50 transition-all shadow-sm"
                    >
                      Move to <ChevronDown size={14} className={`transition-transform duration-200 stroke-[2.5] ${isMoveDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isMoveDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-[260px] bg-white rounded-lg shadow-2xl border border-slate-100 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden px-2 pt-2 pb-1">
                        <div className="mb-2">
                          <div className="relative font-bold">
                            <input
                              autoFocus
                              type="text"
                              placeholder="Type a folder name"
                              value={searchFolderInMove}
                              onChange={(e) => setSearchFolderInMove(e.target.value)}
                              className="w-full px-3 py-2 pr-8 bg-white border border-blue-400 rounded-lg outline-none text-[13px] font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                            {searchFolderInMove && (
                              <button onClick={() => setSearchFolderInMove("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} className="stroke-[2.5]" /></button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-[200px] overflow-auto px-1 py-1 font-bold">
                          <button
                            onClick={async () => {
                              // Move to Inbox logic
                              const filesToMove = currentVisibleFiles.filter(f => selectedFiles.includes(f.id));

                              // Check if any file is already in Inbox
                              const alreadyInInbox = filesToMove.some(f => f.folder === "Inbox" || activeTab === "Files");

                              if (alreadyInInbox && filesToMove.length === 1) {
                                setMoveToastMessage("This file is not moved because it is already in the Inbox");
                                setTimeout(() => setMoveToastMessage(""), 3000);
                                setIsMoveDropdownOpen(false);
                                return;
                              }

                              // Move files to Inbox
                              for (const file of filesToMove) {
                                // Update in global storage
                                await safeUpdateDocument(file.id, { folder: "Inbox" });

                                // Add to Files inbox if not already there
                                if (!files.find(f => f.id === file.id)) {
                                  setFiles([{ ...file, folder: "Inbox" }, ...files]);
                                }

                                // Remove from all folders
                                const updatedFolderFiles = {};
                                Object.keys(folderFiles).forEach(folderId => {
                                  updatedFolderFiles[folderId] = folderFiles[folderId].filter(f => f.id !== file.id);
                                });
                                setFolderFiles(updatedFolderFiles);
                              }

                              await syncDocuments();
                              setSelectedFiles([]);
                              setIsMoveDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            Inbox
                          </button>
                          <div className="bg-slate-50/50 px-3 py-1.5 my-1 rounded-md"><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">FOLDERS</span></div>
                          {folders.map(f => (
                            <button
                              key={f.id}
                              onClick={async () => {
                                // Move to specific folder logic
                                const filesToMove = currentVisibleFiles.filter(file => selectedFiles.includes(file.id));

                                // Check if any file is already in this folder
                                const alreadyInFolder = filesToMove.some(file => file.folder === f.name || activeTab === f.id);

                                if (alreadyInFolder && filesToMove.length === 1) {
                                  setMoveToastMessage(`This file is not moved because it is already in the "${f.name}" folder`);
                                  setTimeout(() => setMoveToastMessage(""), 3000);
                                  setIsMoveDropdownOpen(false);
                                  return;
                                }

                                // Move files to selected folder
                                for (const file of filesToMove) {
                                  // Update in global storage
                                  await safeUpdateDocument(file.id, { folder: f.name });

                                  // Add to destination folder
                                  const currentFolderFiles = folderFiles[f.id] || [];
                                  if (!currentFolderFiles.find(cf => cf.id === file.id)) {
                                    setFolderFiles({
                                      ...folderFiles,
                                      [f.id]: [{ ...file, folder: f.name }, ...currentFolderFiles]
                                    });
                                  }

                                  // Remove from Files inbox
                                  setFiles(files.filter(fi => fi.id !== file.id));

                                  // Remove from other folders
                                  Object.keys(folderFiles).forEach(folderId => {
                                    if (folderId !== f.id) {
                                      const updatedFiles = folderFiles[folderId].filter(fi => fi.id !== file.id);
                                      setFolderFiles(prev => ({
                                        ...prev,
                                        [folderId]: updatedFiles
                                      }));
                                    }
                                  });
                                }

                                await syncDocuments();
                                setSelectedFiles([]);
                                setIsMoveDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold text-slate-600 hover:bg-slate-50 truncate transition-colors"
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1 border-t border-slate-100 pt-1">
                          <button
                            onClick={() => {
                              if (!canCreateDocuments) return;
                              setIsMoveDropdownOpen(false);
                              setIsModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-md text-[13px] font-extrabold text-[#3b82f6] hover:bg-blue-50 transition-colors flex items-center gap-2"
                          >
                            <Plus size={16} className="stroke-[2.5]" /> New Folder
                          </button>
                        </div>
                      </div>
                    )}
                  </div>}
                  <div className="relative" ref={addToRef}>
                    <button
                      onClick={() => setIsAddToDropdownOpen(!isAddToDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#3b82f6] text-white text-[12px] font-extrabold hover:bg-[#2563eb] transition-all shadow-md group/add"
                    >
                      Add to <ChevronDown size={14} className={`transition-transform duration-200 stroke-[3] ${isAddToDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isAddToDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-[190px] bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden p-1.5">
                        {addToOptions.map((opt, idx) => (
                          opt.divider ? (
                            <div key={idx} className="h-[1px] bg-slate-100 my-1 mx-2" />
                          ) : (
                            <button
                              key={opt.label}
                              onClick={() => {
                                handleAddToForm(opt.label);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${opt.active
                                ? "bg-[#3b82f6] text-white shadow-md shadow-blue-200"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                              {opt.label}
                            </button>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={clearSelection} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={18} className="stroke-[2.5]" /></button>
              </div>
            )}

            <div className="flex-1 flex overflow-hidden bg-white">
              <div className={`flex-1 overflow-auto transition-all duration-300 ${selectedFileForDetail ? 'w-2/3 border-r border-slate-100' : 'w-full'}`}>
                <table className="w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    {activeTab === "Files" ? (
                      <tr>
                        <th className="px-8 py-4 border-b border-slate-50 text-left"><div className="flex items-center gap-4"><input type="checkbox" checked={selectedFiles.length === files.length && files.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 accent-[#3b82f6] cursor-pointer" /><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">FILE NAME</span></div></th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">DETAILS</th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">UPLOADED BY</th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">UPLOADED ON</th>
                      </tr>
                    ) : activeTab === "All Documents" ? (
                      <tr>
                        <th className="px-8 py-4 border-b border-slate-50 text-left"><div className="flex items-center gap-4"><input type="checkbox" checked={selectedFiles.length === files.length && files.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 accent-[#3b82f6] cursor-pointer" /><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">FILE NAME</span></div></th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">UPLOADED BY</th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><div className="flex items-center gap-1">UPLOADED ON <ChevronDown size={14} className="text-slate-300 stroke-[3]" /></div></th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">ASSOCIATED TO</th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">FOLDER</th>
                      </tr>
                    ) : activeTab === "Bank Statements" ? (
                      <tr>
                        <th className="px-8 py-4 border-b border-slate-50 text-left w-12"><input type="checkbox" checked={selectedFiles.length === currentVisibleFiles.length && currentVisibleFiles.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 accent-[#3b82f6] cursor-pointer" /></th>
                        <th className="px-4 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">FILE NAME</th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">DOCUMENT STATUS</th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><div className="flex items-center gap-1">UPLOADED ON <ArrowUpDown size={14} className="text-slate-300 stroke-[3]" /></div></th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">UPLOADED BY</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-8 py-4 border-b border-slate-50 text-left"><div className="flex items-center gap-4"><input type="checkbox" checked={selectedFiles.length === currentVisibleFiles.length && currentVisibleFiles.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 accent-[#3b82f6] cursor-pointer font-extrabold" /><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">FILE NAME</span></div></th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">UPLOADED BY</th>
                        <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"><div className="flex items-center gap-1">UPLOADED ON <ChevronDown size={14} className="text-slate-300 stroke-[3]" /></div></th>
                        {!isTrashActive && <th className="px-6 py-4 border-b border-slate-50 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">ASSOCIATED TO</th>}
                        <th className="px-6 py-4 border-b border-slate-50"></th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {currentVisibleFiles.length > 0 ? (
                      (() => {
                        // Sort files based on selected sort option
                        const sortedFiles = [...currentVisibleFiles].sort((a, b) => {
                          if (sortBy === "fileName") {
                            return a.name.localeCompare(b.name);
                          } else if (sortBy === "uploadedBy") {
                            return (a.uploadedBy || "Me").localeCompare(b.uploadedBy || "Me");
                          } else if (sortBy === "uploadedOn") {
                            // Sort by date (most recent first)
                            const dateA = new Date(a.uploadedOnFormatted || a.uploadedOn);
                            const dateB = new Date(b.uploadedOnFormatted || b.uploadedOn);
                            return dateB.getTime() - dateA.getTime();
                          } else if (sortBy === "folder") {
                            const folderA = a.folder || "Inbox";
                            const folderB = b.folder || "Inbox";
                            return folderA.localeCompare(folderB);
                          }
                          return 0;
                        });

                        return sortedFiles.map((file) => {
                          const isSelected = selectedFiles.includes(file.id);
                          const isSelfSelectedForDetail = selectedFileForDetail?.id === file.id;

                          if (activeTab === "Files") {
                            return (
                              <tr
                                key={file.id}
                                onClick={() => setSelectedFileForDetail(file)}
                                onMouseEnter={() => setHoveredRowId(file.id)}
                                onMouseLeave={() => {
                                  setHoveredRowId(null);
                                  setRowAddToOpen(null);
                                }}
                                className={`transition-all group duration-200 cursor-pointer ${isSelected || isSelfSelectedForDetail ? 'bg-blue-50/30' : 'hover:bg-[#f9fafb]'}`}
                              >
                                <td className="px-8 py-5 border-b border-slate-50"><div className="flex items-center gap-4"><input type="checkbox" onClick={(e) => e.stopPropagation()} onChange={() => toggleSelectFile(file.id)} checked={isSelected} className="w-4 h-4 rounded border-slate-300 accent-[#3b82f6] cursor-pointer" /><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-[#e8f5f1] text-[#10b981] flex items-center justify-center scale-100 group-hover:scale-105 transition-transform shadow-sm"><FileText size={20} className="stroke-[2.5]" /></div><div className="flex flex-col gap-1.5"><span className="text-[13px] font-bold text-slate-700 tracking-tight leading-tight">{file.name}</span><span className="inline-flex w-fit items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#e8f5f1] text-[#10b981] border border-[#d1fae5] shadow-sm uppercase">{file.status}</span></div></div></div></td>
                                <td className="px-6 py-5 border-b border-slate-50"><div className="flex flex-col gap-1"><div className="text-[14px] font-extrabold text-slate-800 tracking-tight">{file.amount}</div><div className="text-[12px] text-slate-400 font-bold">Vendor: <span className="text-slate-600 font-extrabold">{file.vendor}</span></div></div></td>
                                <td className="px-6 py-5 border-b border-slate-50"><div className="flex items-center gap-2 font-bold"><div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-extrabold text-slate-600 border border-slate-200 shadow-sm">Me</div><span className="text-[13px] text-slate-800">Me</span></div></td>
                                <td className="px-6 py-5 border-b border-slate-50"><div className="flex flex-col font-bold"><span className="text-[13px] text-slate-800 font-extrabold">{file.uploadedOn}</span><span className="text-[11px] text-slate-400">{file.uploadedTime}</span></div></td>
                                <td className="px-6 py-4 border-b border-slate-50 relative">
                                  <div className="flex items-center justify-end">
                                    {hoveredRowId === file.id && (
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setRowAddToOpen(rowAddToOpen === file.id ? null : file.id);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50 shadow-sm transition-all"
                                        >
                                          Add to <ChevronDown size={12} className="stroke-[2.5]" />
                                        </button>
                                        {rowAddToOpen === file.id && (
                                          <div className="absolute top-full right-0 mt-2 w-[190px] bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden p-1.5">
                                            {addToOptions.map((opt, idx) => (
                                              opt.divider ? (
                                                <div key={idx} className="h-[1px] bg-slate-100 my-1 mx-2" />
                                              ) : (
                                                <button
                                                  key={opt.label}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToForm(opt.label, file.id);
                                                    setRowAddToOpen(null);
                                                  }}
                                                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${opt.active
                                                    ? "bg-[#3b82f6] text-white shadow-md shadow-blue-200"
                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    }`}
                                                >
                                                  {opt.label}
                                                </button>
                                              )
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          } else if (activeTab === "All Documents") {
                            return (
                              <tr
                                key={file.id}
                                onClick={() => setSelectedFileForDetail(file)}
                                onMouseEnter={() => setHoveredRowId(file.id)}
                                onMouseLeave={() => {
                                  setHoveredRowId(null);
                                  setRowAddToOpen(null);
                                }}
                                className={`transition-all group duration-200 cursor-pointer ${isSelected || isSelfSelectedForDetail ? 'bg-blue-50/30' : 'hover:bg-[#f9fafb]'}`}
                              >
                                <td className="px-8 py-4 border-b border-slate-50">
                                  <div className="flex items-center gap-4">
                                    <input type="checkbox" onClick={(e) => e.stopPropagation()} onChange={() => toggleSelectFile(file.id)} checked={isSelected} className="w-4 h-4 rounded border-slate-300 accent-[#3b82f6] cursor-pointer" />
                                    <div className="flex items-center gap-3">
                                      {getFileIcon(file.name)}
                                      <span className="text-[13px] font-bold text-slate-700 tracking-tight">{file.name}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-b border-slate-50 text-[13px] font-bold text-slate-700">Me</td>
                                <td className="px-6 py-4 border-b border-slate-50 text-[13px] font-bold text-slate-700 tracking-tight">
                                  {file.uploadedOnFormatted}
                                </td>
                                <td className="px-6 py-4 border-b border-slate-50">
                                  <div className="text-[13px] font-bold text-slate-700">
                                    Expense: <span className="text-blue-500 hover:underline cursor-pointer">Advertising And Marketing</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-b border-slate-50 text-[13px] font-bold text-slate-700 font-bold">{file.folder || "sdfV"}</td>
                                <td className="px-6 py-4 border-b border-slate-50 relative">
                                  <div className="flex items-center justify-end">
                                    {hoveredRowId === file.id && (
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setRowAddToOpen(rowAddToOpen === file.id ? null : file.id);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50 shadow-sm transition-all"
                                        >
                                          Add to <ChevronDown size={12} className="stroke-[2.5]" />
                                        </button>
                                        {rowAddToOpen === file.id && (
                                          <div className="absolute top-full right-0 mt-2 w-[190px] bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden p-1.5">
                                            {addToOptions.map((opt, idx) => (
                                              opt.divider ? (
                                                <div key={idx} className="h-[1px] bg-slate-100 my-1 mx-2" />
                                              ) : (
                                                <button
                                                  key={opt.label}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (["New Bill", "New Expense", "New Purchase Order", "New Vendor Credits"].includes(opt.label)) {
                                                      handleAddToForm(opt.label, file.id);
                                                    }
                                                    setRowAddToOpen(null);
                                                  }}
                                                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${opt.active
                                                    ? "bg-[#3b82f6] text-white shadow-md shadow-blue-200"
                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    }`}
                                                >
                                                  {opt.label}
                                                </button>
                                              )
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          } else if (activeTab === "Bank Statements") {
                            return (
                              <tr
                                key={file.id}
                                onClick={() => setSelectedFileForDetail(file)}
                                className={`transition-all group duration-200 cursor-pointer ${isSelected || isSelfSelectedForDetail ? 'bg-blue-50/30' : 'hover:bg-[#f9fafb]'}`}
                              >
                                <td className="px-8 py-5 border-b border-slate-50"><input type="checkbox" onClick={(e) => e.stopPropagation()} onChange={() => toggleSelectFile(file.id)} checked={isSelected} className="w-4 h-4 rounded border-slate-300 accent-[#3b82f6] cursor-pointer" /></td>
                                <td className="px-4 py-5 border-b border-slate-50">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[13px] font-bold text-blue-600 hover:underline">{file.name}</span>
                                    <span className="text-[11px] text-slate-400 italic font-medium">Manually Added</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5 border-b border-slate-50">
                                  <span className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wider">YET TO ADD</span>
                                </td>
                                <td className="px-6 py-5 border-b border-slate-50">
                                  <span className="text-[13px] font-bold text-slate-700">{file.uploadedOnFormatted || file.uploadedOn}</span>
                                </td>
                                <td className="px-6 py-5 border-b border-slate-50">
                                  <span className="text-[13px] font-bold text-slate-700">{file.uploadedBy || "mahir abdullahi"}</span>
                                </td>
                              </tr>
                            );
                          } else {
                            // Folder / Trash Custom View (Matches your latest screenshot)
                            return (
                              <tr
                                key={file.id}
                                onClick={() => setSelectedFileForDetail(file)}
                                onMouseEnter={() => setHoveredRowId(file.id)}
                                onMouseLeave={() => {
                                  setHoveredRowId(null);
                                  setRowAddToOpen(null);
                                }}
                                className={`transition-all group duration-200 cursor-pointer ${isSelected || isSelfSelectedForDetail ? 'bg-blue-50/30' : 'hover:bg-[#f9fafb]'}`}
                              >
                                <td className="px-8 py-4 border-b border-slate-50">
                                  <div className="flex items-center gap-4">
                                    <input type="checkbox" onClick={(e) => e.stopPropagation()} onChange={() => toggleSelectFile(file.id)} checked={isSelected} className="w-4 h-4 rounded border-slate-300 accent-[#3b82f6] cursor-pointer" />
                                    <div className="flex items-center gap-3">
                                      {getFileIcon(file.name)}
                                      <span className="text-[13px] font-bold text-slate-700 tracking-tight">{file.name}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-b border-slate-50 text-[13px] font-bold text-slate-700">Me</td>
                                <td className="px-6 py-4 border-b border-slate-50 text-[13px] font-bold text-slate-700 tracking-tight">
                                  {file.uploadedOnFormatted}
                                </td>
                                {!isTrashActive && <td className="px-6 py-4 border-b border-slate-50 text-[13px] font-bold text-slate-400">-</td>}
                                <td className="px-6 py-4 border-b border-slate-50 relative">
                                  <div className="flex items-center justify-end">
                                    {hoveredRowId === file.id && (
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setRowAddToOpen(rowAddToOpen === file.id ? null : file.id);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50 shadow-sm transition-all"
                                        >
                                          Add to <ChevronDown size={12} className="stroke-[2.5]" />
                                        </button>
                                        {rowAddToOpen === file.id && (
                                          <div className="absolute top-full right-0 mt-2 w-[190px] bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden p-1.5">
                                            {addToOptions.map((opt, idx) => (
                                              opt.divider ? (
                                                <div key={idx} className="h-[1px] bg-slate-100 my-1 mx-2" />
                                              ) : (
                                                <button
                                                  key={opt.label}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (["New Bill", "New Expense", "New Purchase Order", "New Vendor Credits"].includes(opt.label)) {
                                                      handleAddToForm(opt.label, file.id);
                                                    }
                                                    setRowAddToOpen(null);
                                                  }}
                                                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${opt.active
                                                    ? "bg-[#3b82f6] text-white shadow-md shadow-blue-200"
                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    }`}
                                                >
                                                  {opt.label}
                                                </button>
                                              )
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        });
                      })()
                    ) : (
                      <tr><td colSpan={isTrashActive ? 3 : 5} className="py-32 text-center text-[16px] font-extrabold text-slate-300 tracking-tight bg-slate-50/10">No documents have been added</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedFileForDetail && (
                <div className="w-[440px] border-l border-slate-200 bg-white flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.02)]">
                  {/* Detail Panel Toolbar */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <div className="relative" ref={detailMoveRef}>
                        <button
                          onClick={() => setIsDetailMoveOpen(!isDetailMoveOpen)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[12px] font-extrabold hover:bg-slate-50 shadow-sm transition-all group"
                        >
                          Move to <ChevronDown size={14} className={`text-slate-400 group-hover:text-slate-600 stroke-[2.5] transition-transform duration-200 ${isDetailMoveOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isDetailMoveOpen && (
                          <div className="absolute top-full left-0 mt-2 w-[260px] bg-white rounded-lg shadow-2xl border border-slate-100 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden px-2 pt-2 pb-1">
                            <div className="mb-2">
                              <div className="relative font-bold">
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Type a folder name"
                                  className="w-full px-3 py-2 pr-8 bg-white border border-blue-400 rounded-lg outline-none text-[13px] font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} className="stroke-[2.5]" /></button>
                              </div>
                            </div>
                            <div className="max-h-[200px] overflow-auto px-1 py-1 font-bold">
                              <button className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">Inbox</button>
                              <div className="bg-slate-50/50 px-3 py-1.5 my-1 rounded-md"><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">FOLDERS</span></div>
                              {folders.map(f => (
                                <button key={f.id} className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold text-slate-600 hover:bg-slate-50 truncate transition-colors">{f.name}</button>
                              ))}
                            </div>
                            <div className="mt-1 border-t border-slate-100 pt-1">
                              <button
                                onClick={() => {
                                  if (!canCreateDocuments) return;
                                  setIsDetailMoveOpen(false);
                                  setIsModalOpen(true);
                                }}
                                className="w-full text-left px-3 py-2.5 rounded-md text-[13px] font-extrabold text-[#3b82f6] hover:bg-blue-50 transition-colors flex items-center gap-2"
                              >
                                <Plus size={16} className="stroke-[2.5]" /> New Folder
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative" ref={detailAddRef}>
                        <button
                          onClick={() => setIsDetailAddOpen(!isDetailAddOpen)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#3b82f6] text-white text-[12px] font-extrabold hover:bg-[#2563eb] shadow-md shadow-blue-100 transition-all group"
                        >
                          Add to <ChevronDown size={14} className={`text-white/80 stroke-[2.5] transition-transform duration-200 ${isDetailAddOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isDetailAddOpen && (
                          <div className="absolute top-full left-0 mt-2 w-[190px] bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden p-1.5">
                            {addToOptions.map((opt, idx) => (
                              opt.divider ? (
                                <div key={idx} className="h-[1px] bg-slate-100 my-1 mx-2" />
                              ) : (
                                <button
                                  key={opt.label}
                                  onClick={() => {
                                    if (["New Bill", "New Expense", "New Purchase Order", "New Vendor Credits"].includes(opt.label)) {
                                      handleAddToForm(opt.label, selectedFileForDetail?.id);
                                    }
                                    setIsDetailAddOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-all ${opt.active
                                    ? "bg-[#3b82f6] text-white shadow-md shadow-blue-200"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                                >
                                  {opt.label}
                                </button>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative" ref={detailSettingsRef}>
                        <button
                          onClick={() => setIsDetailSettingsOpen(!isDetailSettingsOpen)}
                          className={`p-1.5 rounded-md border border-slate-200 text-slate-400 transition-all ${isDetailSettingsOpen ? 'bg-slate-50 text-slate-600 border-slate-300' : 'hover:text-slate-600 shadow-sm'}`}
                        >
                          <Settings size={16} className="stroke-[2.5]" />
                        </button>
                        {isDetailSettingsOpen && (
                          <div className="absolute top-full left-0 mt-2 w-[140px] bg-white rounded-lg shadow-2xl border border-slate-100 z-[100] p-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <button
                              onClick={() => {
                                if (!canEditDocuments) return;
                                setIsRenamingFile(true);
                                setRenameValue(selectedFileForDetail.name);
                                setIsDetailSettingsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold text-white shadow-md transition-all"
                          style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                            >
                              Rename
                            </button>
                            {canDeleteDocuments && <button
                              onClick={async () => {
                                // Delete from global storage
                                await safeDeleteDocument(selectedFileForDetail.id);

                                // Delete from ALL local states to ensure file is removed from all views
                                // Remove from Files inbox
                                setFiles(files.filter(f => f.id !== selectedFileForDetail.id));

                                // Remove from ALL folders
                                const updatedFolderFiles = {};
                                Object.keys(folderFiles).forEach(folderId => {
                                  updatedFolderFiles[folderId] = folderFiles[folderId].filter(f => f.id !== selectedFileForDetail.id);
                                });
                                setFolderFiles(updatedFolderFiles);

                                // Refresh global documents and close detail panel
                                await syncDocuments();
                                setSelectedFileForDetail(null);
                                setIsDetailSettingsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-md text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                              Delete
                            </button>}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelectedFileForDetail(null)} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                      <X size={20} className="stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Detail Panel Content */}
                  <div className="flex-1 overflow-auto p-8 space-y-10">
                    {/* File Header */}
                    <div className="space-y-1.5">
                      {isRenamingFile ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // Save the new name
                                const updatedFile = { ...selectedFileForDetail, name: renameValue };

                                // Update in global storage
                                void safeUpdateDocument(selectedFileForDetail.id, { name: renameValue });

                                // Update local state
                                if (activeTab === "Files") {
                                  setFiles(files.map(f => f.id === selectedFileForDetail.id ? updatedFile : f));
                                } else if (isFolderActive) {
                                  const currentFolderFiles = folderFiles[activeTab] || [];
                                  setFolderFiles({
                                    ...folderFiles,
                                    [activeTab]: currentFolderFiles.map(f => f.id === selectedFileForDetail.id ? updatedFile : f)
                                  });
                                }

                                setSelectedFileForDetail(updatedFile);
                                void syncDocuments();
                                setIsRenamingFile(false);
                              } else if (e.key === 'Escape') {
                                setIsRenamingFile(false);
                              }
                            }}
                            onBlur={() => {
                              // Save on blur as well
                              const updatedFile = { ...selectedFileForDetail, name: renameValue };
                              void safeUpdateDocument(selectedFileForDetail.id, { name: renameValue });

                              if (activeTab === "Files") {
                                setFiles(files.map(f => f.id === selectedFileForDetail.id ? updatedFile : f));
                              } else if (isFolderActive) {
                                const currentFolderFiles = folderFiles[activeTab] || [];
                                setFolderFiles({
                                  ...folderFiles,
                                  [activeTab]: currentFolderFiles.map(f => f.id === selectedFileForDetail.id ? updatedFile : f)
                                });
                              }

                              setSelectedFileForDetail(updatedFile);
                              void syncDocuments();
                              setIsRenamingFile(false);
                            }}
                            autoFocus
                            className="flex-1 px-3 py-2 text-[16px] font-extrabold text-slate-800 tracking-tight border-2 border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      ) : (
                        <h3 className="text-[16px] font-extrabold text-slate-800 tracking-tight">
                          {selectedFileForDetail.name} <span className="text-slate-400 font-bold ml-1">- {selectedFileForDetail.size || '52 KB'}</span>
                        </h3>
                      )}
                    </div>

                    {/* File Preview */}
                    <div className="aspect-[4/3] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center relative group p-8 overflow-hidden">
                      {selectedFileForDetail.previewUrl || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(selectedFileForDetail.type?.toLowerCase()) ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={selectedFileForDetail.previewUrl || '/placeholder.svg'}
                            alt={selectedFileForDetail.name}
                            className="max-w-full max-h-full object-contain rounded shadow-sm transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                              // If image fails, show icon fallback
                              const img = e.currentTarget;
                              img.style.display = 'none';
                              const fallback = img.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="hidden flex-col items-center gap-4 transition-transform group-hover:scale-105 duration-300">
                            <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center shadow-lg border border-slate-200">
                              <FileText size={48} className="text-slate-400 stroke-[1.5]" />
                            </div>
                            <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">{selectedFileForDetail.name}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 transition-transform group-hover:scale-105 duration-300">
                          <div className="w-24 h-24 rounded-2xl bg-[#f5eefc] flex items-center justify-center shadow-lg shadow-purple-500/10 border border-purple-100">
                            <FileSpreadsheet size={48} className="text-[#a855f7] stroke-[1.5]" />
                          </div>
                          <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">{selectedFileForDetail.name}</span>
                        </div>
                      )}

                      <button className="absolute bottom-4 right-4 p-2 bg-white/90 backdrop-blur rounded-full shadow-lg border border-slate-100 text-slate-400 hover:text-blue-500 transition-all scale-100 shadow-md">
                        <Search size={18} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Association Details */}
                    <div className="space-y-6 pt-4">
                      <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">ASSOCIATED TO :</h4>
                      {selectedFileForDetail.associatedTo ? (
                        <div className="flex items-center justify-between group cursor-pointer py-1">
                          <span className="text-[13px] font-bold text-slate-500">Expense</span>
                          <span className="text-[13px] font-extrabold text-[#3b82f6] hover:underline whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                            {selectedFileForDetail.associatedTo}
                          </span>
                        </div>
                      ) : (
                        <div className="py-2">
                          <p className="text-[14px] font-medium text-slate-800 italic">There are no associated transactions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* 3. FAR RIGHT NAVIGATION */}
      <aside className="w-12 bg-white border-l border-slate-100 flex flex-col items-center py-4 gap-5 shrink-0 z-10 shadow-sm">
        <div className="w-8 h-8 rounded-lg bg-[#fff7ed] text-[#f97316] flex items-center justify-center shadow-md cursor-pointer hover:bg-[#ffedd5] transition-all"><HelpCircle size={18} className="stroke-[2.5]" /></div>
        <div className="w-8 h-8 flex items-center justify-center text-slate-400 cursor-pointer rounded-lg hover:bg-slate-50 transition-all"><MessageSquare size={18} className="stroke-[2.5]" /></div>
        <div className="w-8 h-8 flex items-center justify-center text-slate-400 cursor-pointer rounded-lg hover:bg-slate-50 transition-all"><Laptop size={18} className="stroke-[2.5]" /></div>
        <div className="w-8 h-8 flex items-center justify-center text-slate-400 cursor-pointer rounded-lg hover:bg-slate-50 transition-all"><Package size={18} className="stroke-[2.5]" /></div>
        <div className="w-8 h-8 flex items-center justify-center text-slate-400 cursor-pointer rounded-lg hover:bg-slate-50 transition-all"><Settings size={18} className="stroke-[2.5]" /></div>
        <div className="mt-auto"><div className="w-8 h-8 flex items-center justify-center text-slate-400 cursor-pointer rounded-lg hover:bg-slate-50 transition-all"><ChevronLeft size={18} className="rotate-180 stroke-[2.5]" /></div></div>
      </aside>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-[500px] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-slate-800">Deletion Failure Summary</h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6">
              <div className="flex items-start gap-3">
                <div className="text-slate-700 text-[14px] leading-relaxed">
                  • Documents that are associated with any transaction cannot be deleted.
                  <a href="#" className="text-blue-500 hover:underline font-medium ml-1">Learn More</a>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-start">
              <button
                onClick={async () => {
                  if (!canDeleteDocuments) return;
                  // Delete all selected files from global storage
                  await Promise.all(selectedFiles.map((fileId) => safeDeleteDocument(fileId)));

                  // Update ALL local states to ensure file is removed from all views
                  // Remove from Files inbox
                  setFiles(files.filter(f => !selectedFiles.includes(f.id)));

                  // Remove from ALL folders
                  const updatedFolderFiles = {};
                  Object.keys(folderFiles).forEach(folderId => {
                    updatedFolderFiles[folderId] = folderFiles[folderId].filter(f => !selectedFiles.includes(f.id));
                  });
                  setFolderFiles(updatedFolderFiles);

                  // Refresh global documents
                  await syncDocuments();

                  // Clear selection and close modal
                  setSelectedFiles([]);
                  setIsDeleteModalOpen(false);
                }}
                className="px-6 py-2 text-white text-[13px] font-bold rounded-md transition-all shadow-sm"
                style={{ background: "#156372" }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0e4a5e"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#156372"}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {moveToastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-2xl z-[300] animate-in slide-in-from-bottom-4 duration-300 max-w-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-amber-400 stroke-[2.5]" />
            </div>
            <p className="text-[13px] font-medium">{moveToastMessage}</p>
          </div>
        </div>
      )}

      {showAttachModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-[500] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-[500px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">Attach File(s) to {attachEntityType}</h3>
              <button
                onClick={() => setShowAttachModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X size={20} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="p-8">
              {/* Entity Selection */}
              <div className="mb-8">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">SELECT {attachEntityType?.toUpperCase()}</label>
                <div className="relative group">
                  <select
                    value={attachEntitySelection}
                    onChange={(e) => setAttachEntitySelection(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 appearance-none hover:border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all cursor-pointer shadow-sm"
                  >
                    <option value="">Choose a {attachEntityType}</option>
                    {attachEntityOptions.length > 0 ? (
                      attachEntityOptions.map((it, i) => (
                        <option key={i} value={it}>{it}</option>
                      ))
                    ) : (
                      <option value="" disabled>No {attachEntityType} found</option>
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors">
                    <ChevronDown size={18} strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              {/* Selected Docs List */}
              <div className="mb-8">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">SELECTED DOCUMENT(S)</label>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {attachSelectedDocs && attachSelectedDocs.length > 0 ? (
                    attachSelectedDocs.map((n, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                        <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                          <FileText size={16} strokeWidth={2.5} />
                        </div>
                        <span className="text-[13px] font-bold text-slate-700 truncate flex-1">{n}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[13px] text-slate-400 font-medium italic p-4 bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-100 text-center">No documents selected</div>
                  )}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setShowAttachModal(false)}
                  className="px-6 py-2.5 text-slate-500 text-[13px] font-bold hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const association = attachEntitySelection || attachEntityType;
                    const allDocs = getAllDocuments();
                    for (const name of attachSelectedDocs) {
                      const doc = allDocs.find(d => d.name === name);
                      if (doc) {
                        await safeUpdateDocument(doc.id, { associatedTo: association });
                      }
                    }
                    const refreshed = await refreshDocuments({ module: "Documents" });
                    setGlobalDocuments(refreshed);
                    setShowAttachModal(false);
                  }}
                  disabled={!attachEntitySelection}
                  className="px-8 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-extrabold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  Attach Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PageTipsModal
        isOpen={isPageTipsModalOpen}
        onClose={() => setIsPageTipsModalOpen(false)}
      />

      <DocumentActionOverlay
        isOpen={actionOverlayOpen}
        onClose={() => setActionOverlayOpen(false)}
        document={selectedActionDocument}
        actionType={selectedActionType}
      />
    </div>
  );
}
