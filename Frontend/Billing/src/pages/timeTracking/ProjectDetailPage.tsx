import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectsAPI, timeEntriesAPI, invoicesAPI, quotesAPI, creditNotesAPI, refundsAPI } from "../../services/api";
import { toast } from "react-toastify";
import { useCurrency } from "../../hooks/useCurrency";
import NewLogEntryForm from "./NewLogEntryForm";
import { ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, ArrowUpDown, X, MessageSquare, Briefcase, User, Plus, Minus, Check, Trash2, MoreVertical, Edit3 } from "lucide-react";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { code: rawCurrencyCode } = useCurrency();
  const baseCurrencyCode = rawCurrencyCode ? rawCurrencyCode.split(' ')[0].substring(0, 3).toUpperCase() : "KES";
  const [project, setProject] = useState(null);
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [salesQuotes, setSalesQuotes] = useState<any[]>([]);
  const [salesRetainerInvoices, setSalesRetainerInvoices] = useState<any[]>([]);
  const [salesCreditNotes, setSalesCreditNotes] = useState<any[]>([]);
  const [salesRefunds, setSalesRefunds] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showLogEntryForm, setShowLogEntryForm] = useState(false);
  const [showTransactionDropdown, setShowTransactionDropdown] = useState(false);
  const [hoveredTransaction, setHoveredTransaction] = useState(null);
  const transactionDropdownRef = useRef(null);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hoveredMoreOption, setHoveredMoreOption] = useState(null);
  const moreDropdownRef = useRef(null);
  const sortDataDropdownRef = useRef(null);
  const itemNameDropdownRef = useRef(null);
  const itemDescriptionDropdownRef = useRef(null);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [showInvoicePreferences, setShowInvoicePreferences] = useState(false);
  const [showProjectInvoiceInfo, setShowProjectInvoiceInfo] = useState(false);
  const [invoiceInfoData, setInvoiceInfoData] = useState({
    sortData: "Single Line For The Project",
    itemName: ["Project Name"],
    itemDescription: ["Project Description"],
    tax: "",
    includeUnbilledExpenses: false
  });
  const [itemNameDropdownOpen, setItemNameDropdownOpen] = useState(false);
  const [itemDescriptionDropdownOpen, setItemDescriptionDropdownOpen] = useState(false);
  const [taxDropdownOpen, setTaxDropdownOpen] = useState(false);
  const [sortDataDropdownOpen, setSortDataDropdownOpen] = useState(false);
  const [sortDataSearch, setSortDataSearch] = useState('');
  const [itemNameSearch, setItemNameSearch] = useState('');
  const [itemDescriptionSearch, setItemDescriptionSearch] = useState('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskBillable, setNewTaskBillable] = useState(true);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [addUserRows, setAddUserRows] = useState([{ id: 1, user: '', costPerHour: '' }]);
  const [showNewBudgetForm, setShowNewBudgetForm] = useState(false);
  const [budgetFormData, setBudgetFormData] = useState({
    name: "",
    fiscalYear: "Jul 2025 - Jun 2026",
    budgetPeriod: "Monthly",
    includeAssetLiabilityEquity: false
  });
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [hoveredEntryId, setHoveredEntryId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [expensesExpanded, setExpensesExpanded] = useState(true);
  const [billsExpanded, setBillsExpanded] = useState(false);
  const [purchaseOrdersExpanded, setPurchaseOrdersExpanded] = useState(false);
  const [vendorCreditsExpanded, setVendorCreditsExpanded] = useState(false);
  const [activePurchaseSection, setActivePurchaseSection] = useState("Expenses"); // Track which section is active
  const [invoicesExpanded, setInvoicesExpanded] = useState(true);
  const [quotesExpanded, setQuotesExpanded] = useState(false);
  const [creditNotesExpanded, setCreditNotesExpanded] = useState(false);
  const [retainerInvoicesExpanded, setRetainerInvoicesExpanded] = useState(false);
  const [refundsExpanded, setRefundsExpanded] = useState(false);
  const [activeSalesSection, setActiveSalesSection] = useState("Invoices"); // Track which section is active
  const [invoicesStatusFilter, setInvoicesStatusFilter] = useState("All");
  const [quotesStatusFilter, setQuotesStatusFilter] = useState("All");
  const [retainerInvoicesStatusFilter, setRetainerInvoicesStatusFilter] = useState("All");
  const [creditNotesStatusFilter, setCreditNotesStatusFilter] = useState("All");
  const [refundsStatusFilter, setRefundsStatusFilter] = useState("All");
  const [expensesStatusFilter, setExpensesStatusFilter] = useState("All");
  const [billsStatusFilter, setBillsStatusFilter] = useState("All");
  const [expensesSearch, setExpensesSearch] = useState("");
  const [showGoToTransactionsDropdown, setShowGoToTransactionsDropdown] = useState(false);
  const [billsSearch, setBillsSearch] = useState("");
  const [comments, setComments] = useState<Array<{
    id: string;
    text: string;
    createdAt: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>>([]);
  const goToTransactionsRef = useRef(null);
  const [commentText, setCommentText] = useState("");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [hoursView, setHoursView] = useState("Project Hours"); // "Project Hours" or "Profitability Summary"
  const [dateRange, setDateRange] = useState("This Week");
  const [showConfigureAccountsModal, setShowConfigureAccountsModal] = useState(false);
  const [configureAccountsType, setConfigureAccountsType] = useState(null); // "income" or "expense"
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [accountSearchTerm, setAccountSearchTerm] = useState("");
  const [expandedAccountCategories, setExpandedAccountCategories] = useState({});

  const resolveProjectContext = () => {
    if (!project) {
      toast.error("Project details are not ready yet.");
      return null;
    }

    const customerId =
      project.customerId ||
      project.customer?._id ||
      project.customer?.id ||
      project.customer ||
      "";
    const customerName =
      project.customerName ||
      project.customer?.displayName ||
      project.customer?.companyName ||
      project.customer?.name ||
      "";

    const payloadProject = {
      id: project.id || project.projectId || project._id,
      projectName: project.projectName || project.name || "Project",
      billingMethod: project.billingMethod,
      billingRate: project.billingRate,
      totalProjectCost: project.totalProjectCost || project.budget || project.totalCost || project.billingRate || 0,
      customerId,
      customerName,
      currency: project.currency || baseCurrencyCode,
      description: project.description || "",
    };

    return {
      customerId,
      customerName,
      payloadProject,
    };
  };

  const handleCreateInvoiceFromProject = () => {
    const context = resolveProjectContext();
    if (!context) return;
    const { customerId, customerName, payloadProject } = context;

    navigate("/sales/invoices/new", {
      state: {
        source: "timeTrackingProjects",
        customerId,
        customerName,
        projectId: payloadProject.id,
        projectName: payloadProject.projectName,
        currency: payloadProject.currency,
        projects: [payloadProject],
      },
    });

    toast.info("Invoice draft created from the project. Review before saving.");
  };

  const handleCreateQuoteFromProject = () => {
    const context = resolveProjectContext();
    if (!context) return;
    const { customerId, customerName, payloadProject } = context;
    navigate("/sales/quotes/new", {
      state: {
        source: "timeTrackingProjects",
        customerId,
        customerName,
        projectId: payloadProject.id,
        projectName: payloadProject.projectName,
        currency: payloadProject.currency,
        projects: [payloadProject],
      },
    });
  };

  const handleCreateRetainerInvoiceFromProject = () => {
    const context = resolveProjectContext();
    if (!context) return;
    const { customerId, customerName, payloadProject } = context;
    navigate("/sales/retainer-invoices/new", {
      state: {
        source: "timeTrackingProjects",
        customerId,
        customerName,
        projectId: payloadProject.id,
        projectName: payloadProject.projectName,
        currency: payloadProject.currency,
      },
    });
  };

  const handleCreateCreditNoteFromProject = () => {
    const context = resolveProjectContext();
    if (!context) return;
    const { customerId, customerName, payloadProject } = context;
    navigate("/sales/credit-notes/new", {
      state: {
        source: "timeTrackingProjects",
        customerId,
        customerName,
        projectId: payloadProject.id,
        projectName: payloadProject.projectName,
        currency: payloadProject.currency,
      },
    });
  };

  const handleCreateExpenseFromProject = (recurring = false) => {
    const context = resolveProjectContext();
    if (!context) return;
    const { customerId, customerName, payloadProject } = context;
    navigate(recurring ? "/purchases/recurring-expenses/new" : "/purchases/expenses/new", {
      state: {
        source: "timeTrackingProjects",
        customerId,
        customerName,
        projectId: payloadProject.id,
        projectName: payloadProject.projectName,
        currency: payloadProject.currency,
      },
    });
  };

  // Close dropdowns when modal closes
  useEffect(() => {
    if (!showProjectInvoiceInfo) {
      setItemNameDropdownOpen(false);
      setItemDescriptionDropdownOpen(false);
      setTaxDropdownOpen(false);
      setSortDataDropdownOpen(false);
      setSortDataSearch('');
      setItemNameSearch('');
      setItemDescriptionSearch('');
    }
  }, [showProjectInvoiceInfo]);

  const toKey = (value) => String(value ?? "").trim();
  const toNameKey = (value) => String(value ?? "").trim().toLowerCase();

  const isRetainerInvoice = (invoice) => {
    const type = toNameKey(invoice?.invoiceType || invoice?.type || invoice?.kind || "");
    const number = String(invoice?.retainerNumber || invoice?.invoiceNumber || invoice?.number || "")
      .toUpperCase()
      .trim();
    return type.includes("retainer") || number.startsWith("RET-");
  };

  const matchesProject = (record, projectKey, projectNameKey) => {
    if (!record) return false;
    const directProjectId =
      record?.projectId ||
      record?.project?._id ||
      record?.project?.id ||
      record?.project ||
      record?.project_code ||
      record?.projectCode ||
      record?.project_id ||
      "";
    if (projectKey && toKey(directProjectId) === projectKey) return true;

    const directProjectName =
      record?.projectName ||
      record?.project?.projectName ||
      record?.project?.name ||
      record?.project_name ||
      record?.projectTitle ||
      record?.name ||
      "";
    if (projectNameKey && toNameKey(directProjectName) === projectNameKey) return true;

    const projectsArray = Array.isArray(record?.projects) ? record.projects : [];
    if (projectsArray.length > 0) {
      const anyMatch = projectsArray.some((projectItem) => {
        const projectItemId = projectItem?._id || projectItem?.id || projectItem?.projectId || projectItem?.project || "";
        if (projectKey && toKey(projectItemId) === projectKey) return true;
        const projectItemName = projectItem?.projectName || projectItem?.name || "";
        return projectNameKey && toNameKey(projectItemName) === projectNameKey;
      });
      if (anyMatch) return true;
    }

    const items = Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.lineItems)
        ? record.lineItems
        : Array.isArray(record?.rows)
          ? record.rows
          : [];
    if (items.length > 0) {
      return items.some((item) => {
        const itemProjectId =
          item?.projectId ||
          item?.project?._id ||
          item?.project?.id ||
          item?.project ||
          item?.project_id ||
          "";
        if (projectKey && toKey(itemProjectId) === projectKey) return true;
        const itemProjectName = item?.projectName || item?.project?.projectName || item?.project?.name || "";
        return projectNameKey && toNameKey(itemProjectName) === projectNameKey;
      });
    }

    return false;
  };

  const uniqByKey = (rows) => {
    const map = new Map<string, any>();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const key =
        toKey(row?._id || row?.id) ||
        toKey(row?.invoiceNumber || row?.number || row?.quoteNumber || row?.creditNoteNumber || row?.refundNumber) ||
        `${toKey(row?.date || row?.createdAt)}-${Math.random().toString(36).slice(2)}`;
      if (!map.has(key)) map.set(key, row);
    });
    return Array.from(map.values());
  };

  const readFallbackArray = (value) => (Array.isArray(value) ? value : []);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;

    const loadSalesTransactions = async () => {
      const projectKey = toKey(project?.id || project?.projectId || project?._id || projectId || "");
      const projectNameKey = toNameKey(project?.projectName || project?.name || "");

      const [invoiceRes, quoteRes, creditRes, refundRes] = await Promise.all([
        invoicesAPI.getAll({ limit: 10000 }).catch(() => null),
        quotesAPI.getAll({ limit: 10000 }).catch(() => null),
        creditNotesAPI.getAll({ limit: 10000 }).catch(() => null),
        refundsAPI.getAll({ limit: 10000 }).catch(() => null),
      ]);

      const directProjectInvoices = uniqByKey([
        ...readFallbackArray(project?.salesInvoices),
        ...readFallbackArray(project?.invoices),
      ]);
      const directProjectRetainers = uniqByKey([
        ...readFallbackArray(project?.retainerInvoices),
        ...readFallbackArray(project?.retainers),
      ]);
      const directProjectQuotes = uniqByKey([
        ...readFallbackArray(project?.quotes),
        ...readFallbackArray(project?.salesQuotes),
      ]);
      const directProjectCreditNotes = uniqByKey([
        ...readFallbackArray(project?.creditNotes),
        ...readFallbackArray(project?.salesCreditNotes),
      ]);
      const directProjectRefunds = uniqByKey([
        ...readFallbackArray(project?.refunds),
        ...readFallbackArray(project?.salesRefunds),
      ]);

      const apiInvoices = uniqByKey(Array.isArray(invoiceRes?.data) ? invoiceRes.data : []);
      const apiQuotes = uniqByKey(Array.isArray(quoteRes?.data) ? quoteRes.data : []);
      const apiCreditNotes = uniqByKey(Array.isArray(creditRes?.data) ? creditRes.data : []);
      const apiRefunds = uniqByKey(Array.isArray(refundRes?.data) ? refundRes.data : []);

      const matchedInvoices = uniqByKey([
        ...directProjectInvoices,
        ...apiInvoices.filter((row) => matchesProject(row, projectKey, projectNameKey)),
      ]);
      const matchedQuotes = uniqByKey([
        ...directProjectQuotes,
        ...apiQuotes.filter((row) => matchesProject(row, projectKey, projectNameKey)),
      ]);
      const matchedCreditNotes = uniqByKey([
        ...directProjectCreditNotes,
        ...apiCreditNotes.filter((row) => matchesProject(row, projectKey, projectNameKey)),
      ]);
      const matchedRefunds = uniqByKey([
        ...directProjectRefunds,
        ...apiRefunds.filter((row) => matchesProject(row, projectKey, projectNameKey)),
      ]);

      const retainerInvoices = uniqByKey([
        ...directProjectRetainers,
        ...matchedInvoices.filter((row) => isRetainerInvoice(row)),
      ]);
      const regularInvoices = matchedInvoices.filter((row) => !isRetainerInvoice(row));

      if (cancelled) return;
      setSalesInvoices(regularInvoices);
      setSalesRetainerInvoices(retainerInvoices);
      setSalesQuotes(matchedQuotes);
      setSalesCreditNotes(matchedCreditNotes);
      setSalesRefunds(matchedRefunds);
    };

    loadSalesTransactions();

    const onStorage = (event) => {
      const key = event?.key || "";
      const watched = [
        "taban_books_invoices",
        "taban_books_quotes",
        "taban_books_credit_notes",
        "taban_books_sales_receipts",
        "taban_books_refunds",
      ];
      if (!key || watched.includes(key)) {
        loadSalesTransactions();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", loadSalesTransactions);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", loadSalesTransactions);
    };
  }, [project, projectId]);

  // Load comments for this project
  useEffect(() => {
    if (projectId) {
      const allComments = JSON.parse(localStorage.getItem('projectComments') || '{}');
      const projectComments = allComments[projectId] || [];
      setComments(projectComments);
    }
  }, [projectId]);

  // Load time entries for this project
  useEffect(() => {
    const loadTimeEntries = async () => {
      if (!project || !projectId) return;

      try {
        const response = await timeEntriesAPI.getByProject(projectId);
        const data = Array.isArray(response) ? response : (response?.data || []);

        // Transform database entries to match frontend format
        const transformedEntries = data.map(entry => ({
          id: entry._id || entry.id,
          projectId: entry.project?._id || entry.projectId,
          projectName: entry.project?.name || entry.projectName,
          userId: entry.user?._id || entry.userId,
          userName: entry.user?.name || entry.userName,
          date: entry.date ? new Date(entry.date).toLocaleDateString() : '--',
          hours: entry.hours || 0,
          minutes: entry.minutes || 0,
          timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '0h',
          description: entry.description || '',
          task: entry.task || entry.taskName || '',
          taskName: entry.task || entry.taskName || '',
          billable: entry.billable !== undefined ? entry.billable : true,
          notes: entry.description || entry.notes || '',
          billingStatus: entry.billingStatus || 'Unbilled',
        }));

        setTimeEntries(transformedEntries);
      } catch (error) {
        console.error("Error loading time entries:", error);
        toast.error("Failed to load time entries");
        setTimeEntries([]);
      }
    };

    if (project && projectId) {
      loadTimeEntries();
    }

    // Listen for time entry updates
    const handleTimeEntryUpdate = () => {
      loadTimeEntries();
    };
    window.addEventListener('timeEntryUpdated', handleTimeEntryUpdate);

    return () => {
      window.removeEventListener('timeEntryUpdated', handleTimeEntryUpdate);
    };
  }, [project, projectId]);

  // Load expenses and bills for this project
  useEffect(() => {
    const loadPurchases = () => {
      if (!project) return;

      const projectName = project.name || project.projectName || '';

      // Load expenses
      const allExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const projectExpenses = allExpenses.filter(expense =>
        expense.customerName === projectName ||
        expense.projectName === projectName ||
        expense.projectId === projectId
      );
      setExpenses(projectExpenses);

      // Load bills
      const allBills = JSON.parse(localStorage.getItem('bills') || '[]');
      const projectBills = allBills.filter(bill =>
        bill.customerName === projectName ||
        bill.projectName === projectName ||
        bill.projectId === projectId
      );
      setBills(projectBills);
    };

    if (project) {
      loadPurchases();
    }

    // Listen for updates
    const handleExpensesUpdate = () => {
      loadPurchases();
    };
    const handleBillsUpdate = () => {
      loadPurchases();
    };

    window.addEventListener('expensesUpdated', handleExpensesUpdate);
    window.addEventListener('billsUpdated', handleBillsUpdate);
    window.addEventListener('storage', handleExpensesUpdate);

    return () => {
      window.removeEventListener('expensesUpdated', handleExpensesUpdate);
      window.removeEventListener('billsUpdated', handleBillsUpdate);
      window.removeEventListener('storage', handleExpensesUpdate);
    };
  }, [project, projectId]);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await projectsAPI.getById(projectId);
        // Handle response format: { success: true, data: {...} } or direct object
        const projectData = response?.data || response;

        if (!projectData) {
          toast.error("Project not found");
          navigate('/time-tracking');
          return;
        }

        // Transform database project to match frontend format
        const transformedProject = {
          id: projectData._id || projectData.id,
          projectName: projectData.name || projectData.projectName,
          projectNumber: projectData.projectNumber || projectData.id,
          customerName: projectData.customer?.name || projectData.customerName,
          customerId: projectData.customer?._id || projectData.customerId,
          description: projectData.description || '',
          startDate: projectData.startDate || '',
          endDate: projectData.endDate || '',
          status: projectData.status || 'planning',
          budget: projectData.budget || 0,
          currency: projectData.currency || 'USD',
          billable: projectData.billable !== undefined ? projectData.billable : true,
          billingRate: projectData.billingRate || 0,
          billingMethod: projectData.billingMethod || 'hourly',
          assignedTo: projectData.assignedTo || [],
          tags: projectData.tags || [],
          tasks: projectData.tasks || [],
          users: projectData.assignedTo || [],
          isActive: projectData.status !== 'cancelled' && projectData.status !== 'completed',
          ...projectData // Keep all other fields
        };

        setProject(transformedProject);
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error("Failed to load project: " + (error.message || "Unknown error"));
        navigate('/time-tracking');
      }
    };

    loadProject();

    // Reload project when updated from other components
    const handleProjectUpdate = () => {
      loadProject();
    };

    window.addEventListener('projectUpdated', handleProjectUpdate);

    // Also check on focus (when returning from edit page)
    const handleFocus = () => {
      loadProject();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [projectId, navigate]);

  // Handle click outside transaction dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (transactionDropdownRef.current && !transactionDropdownRef.current.contains(event.target)) {
        setShowTransactionDropdown(false);
        setHoveredTransaction(null);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setShowMoreDropdown(false);
        setHoveredMoreOption(null);
      }
      if (sortDataDropdownRef.current && !sortDataDropdownRef.current.contains(event.target)) {
        setSortDataDropdownOpen(false);
        setSortDataSearch('');
      }
      if (itemNameDropdownRef.current && !itemNameDropdownRef.current.contains(event.target)) {
        setItemNameDropdownOpen(false);
        setItemNameSearch('');
      }
      if (itemDescriptionDropdownRef.current && !itemDescriptionDropdownRef.current.contains(event.target)) {
        setItemDescriptionDropdownOpen(false);
        setItemDescriptionSearch('');
      }
      if (goToTransactionsRef.current && !goToTransactionsRef.current.contains(event.target)) {
        setShowGoToTransactionsDropdown(false);
      }
    }

    if (showTransactionDropdown || showMoreDropdown || sortDataDropdownOpen || itemNameDropdownOpen || itemDescriptionDropdownOpen || showGoToTransactionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTransactionDropdown, showMoreDropdown, sortDataDropdownOpen, itemNameDropdownOpen, itemDescriptionDropdownOpen, showGoToTransactionsDropdown]);

  // Handle Esc key to clear selection
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape" && selectedEntries.length > 0) {
        setSelectedEntries([]);
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [selectedEntries.length]);

  // Helper function to parse time string to minutes
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const time = timeStr.trim();
    if (time.includes(":")) {
      const [hours, minutes] = time.split(":").map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    } else if (time.includes("h") || time.includes("m")) {
      const hoursMatch = time.match(/(\d+)h/);
      const minutesMatch = time.match(/(\d+)m/);
      return (hoursMatch ? parseInt(hoursMatch[1]) : 0) * 60 + (minutesMatch ? parseInt(minutesMatch[1]) : 0);
    } else {
      const decimal = parseFloat(time);
      if (!isNaN(decimal)) {
        return Math.floor(decimal) * 60 + (decimal % 1) * 60;
      }
    }
    return 0;
  };

  // Helper function to format minutes to HH:MM
  const formatMinutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Calculate hours from time entries
  const calculateHours = () => {
    let loggedMinutes = 0;
    let billableMinutes = 0;
    let billedMinutes = 0;
    let unbilledMinutes = 0;

    timeEntries.forEach(entry => {
      const minutes = parseTimeToMinutes(entry.timeSpent);
      loggedMinutes += minutes;

      if (entry.billable) {
        billableMinutes += minutes;
        if (entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed") {
          billedMinutes += minutes;
        } else {
          unbilledMinutes += minutes;
        }
      }
    });

    return {
      logged: formatMinutesToTime(loggedMinutes),
      billable: formatMinutesToTime(billableMinutes),
      billed: formatMinutesToTime(billedMinutes),
      unbilled: formatMinutesToTime(unbilledMinutes),
      loggedMinutes,
      billableMinutes,
      billedMinutes,
      unbilledMinutes
    };
  };

  // Calculate hours for a specific user
  const calculateUserHours = (userEmail) => {
    let loggedMinutes = 0;
    let billedMinutes = 0;
    let unbilledMinutes = 0;

    timeEntries.forEach(entry => {
      if (entry.user === userEmail || entry.userEmail === userEmail) {
        const minutes = parseTimeToMinutes(entry.timeSpent);
        loggedMinutes += minutes;

        if (entry.billable) {
          if (entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed") {
            billedMinutes += minutes;
          } else {
            unbilledMinutes += minutes;
          }
        }
      }
    });

    return {
      logged: formatMinutesToTime(loggedMinutes),
      billed: formatMinutesToTime(billedMinutes),
      unbilled: formatMinutesToTime(unbilledMinutes)
    };
  };

  // Calculate hours for a specific task
  const calculateTaskHours = (taskName) => {
    let loggedMinutes = 0;
    let billedMinutes = 0;
    let unbilledMinutes = 0;

    timeEntries.forEach(entry => {
      if (entry.taskName === taskName) {
        const minutes = parseTimeToMinutes(entry.timeSpent);
        loggedMinutes += minutes;

        if (entry.billable) {
          if (entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed") {
            billedMinutes += minutes;
          } else {
            unbilledMinutes += minutes;
          }
        }
      }
    });

    return {
      logged: formatMinutesToTime(loggedMinutes),
      billed: formatMinutesToTime(billedMinutes),
      unbilled: formatMinutesToTime(unbilledMinutes)
    };
  };

  const hoursData = calculateHours();

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed || !projectId) return;

    const newComment = {
      id: `${Date.now()}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
      bold: isBold,
      italic: isItalic,
      underline: isUnderline
    };

    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);

    const allComments = JSON.parse(localStorage.getItem('projectComments') || '{}');
    allComments[projectId] = updatedComments;
    localStorage.setItem('projectComments', JSON.stringify(allComments));

    setCommentText("");
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
  };

  if (!project) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Project not found</p>
        <button onClick={() => navigate("/time-tracking/projects")}>
          Back to Projects
        </button>
      </div>
    );
  }

  const tabs = ["Overview", "Timesheet", "Expenses", "Sales"];
  const isCompletedProject = String(project?.status || "").toLowerCase() === "completed";
  const actionBadgeCount = Number(
    project?.badgeCount ||
    project?.notificationCount ||
    project?.alertsCount ||
    project?.tasks?.length ||
    0
  );

  const statusOptions = ["All", "Draft", "Sent", "Approved", "Accepted", "Paid", "Void", "Overdue"];

  const formatSalesDate = (value) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return String(value);
    }
  };

  const currencyCode = project?.currency || baseCurrencyCode;
  const formatMoney = (value: any) =>
    `${currencyCode} ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rawBillingMethod = String(project?.billingMethod || "").toLowerCase();
  const billingMethodLabel =
    rawBillingMethod === "fixed" || rawBillingMethod === "fixed_cost" || rawBillingMethod === "fixed cost for project"
      ? "Fixed Cost for Project"
      : rawBillingMethod === "project-hours"
        ? "Hourly Rate Per Project"
        : rawBillingMethod === "task-hours"
          ? "Hourly Rate Per Task"
          : rawBillingMethod === "staff-hours"
            ? "Hourly Rate Per Staff"
            : rawBillingMethod === "hourly"
              ? "Hourly Rate"
              : (project?.billingMethod || "Hourly Rate");

  const billingRate = Number(project?.billingRate || 0);
  const totalProjectCost = Number(
    project?.totalProjectCost ??
    project?.budget ??
    project?.totalCost ??
    (rawBillingMethod === "fixed" ? billingRate : 0)
  );

  const billedFromInvoices = salesInvoices.reduce(
    (sum, invoice) => sum + Number(invoice?.amount || invoice?.total || 0),
    0
  );

  const loggedAmount =
    rawBillingMethod === "fixed"
      ? totalProjectCost
      : (hoursData.loggedMinutes / 60) * billingRate;
  const billableAmount =
    rawBillingMethod === "fixed"
      ? totalProjectCost
      : (hoursData.billableMinutes / 60) * billingRate;
  const billedAmount =
    rawBillingMethod === "fixed"
      ? billedFromInvoices
      : (hoursData.billedMinutes / 60) * billingRate;
  const unbilledAmount =
    rawBillingMethod === "fixed"
      ? Math.max(totalProjectCost - billedFromInvoices, 0)
      : (hoursData.unbilledMinutes / 60) * billingRate;
  const totalExpensesAmount = expenses.reduce(
    (sum, expense) => sum + Number(expense?.amount || expense?.total || 0),
    0
  );
  const actualCost = totalExpensesAmount;
  const actualRevenue = billedAmount;

  const filterByStatus = (items, status) => {
    if (!items || status === "All") return items;
    return items.filter((item) => {
      const raw = item?.status || item?.statusText || item?.state || "";
      return String(raw).toLowerCase() === String(status).toLowerCase();
    });
  };

  const filteredSalesInvoices = filterByStatus(salesInvoices, invoicesStatusFilter);
  const filteredSalesQuotes = filterByStatus(salesQuotes, quotesStatusFilter);
  const filteredSalesRetainerInvoices = filterByStatus(salesRetainerInvoices, retainerInvoicesStatusFilter);
  const filteredSalesCreditNotes = filterByStatus(salesCreditNotes, creditNotesStatusFilter);
  const filteredSalesRefunds = filterByStatus(salesRefunds, refundsStatusFilter);

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      await projectsAPI.delete(projectId);
      toast.success("Project deleted successfully.");
      window.dispatchEvent(new Event('projectUpdated'));
      setShowDeleteModal(false);
      navigate('/time-tracking/projects');
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  return (
    <div style={{ width: "100%", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/time-tracking/projects")}
                className="px-2.5 py-2 border border-gray-200 rounded bg-white cursor-pointer text-sm text-gray-500 flex items-center gap-2 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-base font-medium text-gray-800">
                {project.projectName || "Project"}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
                            {isCompletedProject ? (
                <>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 border border-gray-200 rounded bg-white cursor-pointer text-sm hover:bg-gray-50"
              >
                Add User
              </button>
              <button
                onClick={async () => {
                  if (!project) return;
                  try {
                    const clonedProjectData = {
                      name: (project.projectName || project.name || "Project") + " (Clone)",
                      description: project.description || "",
                      status: project.status || "planning",
                      budget: project.budget || 0,
                      currency: project.currency || "USD",
                      billable: project.billable !== undefined ? project.billable : true,
                      billingRate: project.billingRate || 0,
                      startDate: new Date(),
                      endDate: project.endDate ? new Date(project.endDate) : null,
                    };
                    await projectsAPI.create(clonedProjectData);
                    window.dispatchEvent(new Event('projectUpdated'));
                    toast.success('Project cloned successfully!');
                  } catch (error) {
                    console.error('Error cloning project:', error);
                    toast.error('Failed to clone project: ' + (error.message || 'Unknown error'));
                  }
                }}
                className="px-4 py-2 border border-gray-200 rounded bg-white cursor-pointer text-sm hover:bg-gray-50"
              >
                Clone
              </button>
              <button
                onClick={async () => {
                  try {
                    await projectsAPI.update(projectId, { status: "Active", isActive: true });
                    setProject({ ...project, status: "Active", isActive: true });
                    window.dispatchEvent(new Event('projectUpdated'));
                    toast.success('Project marked as active');
                  } catch (error) {
                    console.error('Error marking project as active:', error);
                    toast.error('Failed to mark project as active: ' + (error.message || 'Unknown error'));
                  }
                }}
                className="px-4 py-2 border-none rounded bg-[#22c55e] text-white cursor-pointer text-sm font-medium hover:bg-[#16a34a] transition-colors"
              >
                Mark as Active
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(true);
                }}
                className="px-4 py-2 border border-gray-200 rounded bg-white cursor-pointer text-sm hover:bg-gray-50"
              >
                Delete
              </button>
                </>
              ) : (
                <>

              <button
                onClick={() => navigate(`/time-tracking/projects/${projectId}/edit`)}
                className="px-4 py-2 border border-gray-200 rounded bg-white cursor-pointer text-sm hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => setShowLogEntryForm(true)}
                className="px-4 py-2 border-none rounded bg-[#156372] text-white cursor-pointer text-sm font-medium hover:bg-[#0D4A52] transition-colors"
              >
                Log Time
              </button>
              <div className="relative" ref={transactionDropdownRef}>
                <button
                  onMouseEnter={() => setShowTransactionDropdown(true)}
                  onMouseLeave={() => {
                    // Delay to allow moving to dropdown
                    setTimeout(() => {
                      if (!transactionDropdownRef.current?.matches(':hover')) {
                        setShowTransactionDropdown(false);
                      }
                    }, 100);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded bg-white cursor-pointer text-sm flex items-center gap-1 hover:bg-gray-50"
                >
                  New Transaction
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5l3 3 3-3" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Transaction Dropdown */}
                {showTransactionDropdown && (
                  <div
                    onMouseEnter={() => setShowTransactionDropdown(true)}
                    onMouseLeave={() => {
                      setShowTransactionDropdown(false);
                      setHoveredTransaction(null);
                    }}
                    className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg min-w-[220px] max-h-[500px] z-[1000] border border-gray-200 overflow-y-auto"
                  >
                    {/* SALES Section */}
                    <div className="py-2">
                      <div className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        SALES
                      </div>
                      {['Create Quote', 'Create Invoice', 'Create Retainer Invoice', 'Create Credit Note'].map((option) => (
                        <div
                          key={option}
                          onClick={() => {
                            setShowTransactionDropdown(false);
                            // Navigate to the appropriate form page
                            switch (option) {
                              case 'Create Quote':
                                handleCreateQuoteFromProject();
                                break;
                              case 'Create Invoice':
                                handleCreateInvoiceFromProject();
                                break;
                              case 'Create Retainer Invoice':
                                handleCreateRetainerInvoiceFromProject();
                                break;
                              case 'Create Credit Note':
                                handleCreateCreditNoteFromProject();
                                break;
                              default:
                                break;
                            }
                          }}
                          style={{
                            margin: '1px 8px',
                            padding: '10px 12px',
                            fontSize: '16px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            border: option === 'Create Quote' ? '2px solid #3b82f6' : '2px solid transparent',
                            backgroundColor: option === 'Create Quote' ? '#3b82f6' : 'transparent',
                            color: option === 'Create Quote' ? '#fff' : '#1f2937',
                            transition: 'all 0.2s'
                          }}
                        >
                          {option}
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{
                      height: "1px",
                      backgroundColor: "#e5e7eb",
                      margin: "4px 0"
                    }}></div>

                    {/* PURCHASES Section */}
                    <div className="py-2">
                      <div className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        PURCHASES
                      </div>
                      {['Create Expense', 'Create Recurring Expense'].map((option) => (
                        <div
                          key={option}
                          onClick={() => {
                            setShowTransactionDropdown(false);
                            // Navigate to the appropriate form page
                            switch (option) {
                              case 'Create Expense':
                                handleCreateExpenseFromProject(false);
                                break;
                              case 'Create Recurring Expense':
                                handleCreateExpenseFromProject(true);
                                break;
                              default:
                                break;
                            }
                          }}
                          className="px-4 py-2.5 text-sm text-gray-800 cursor-pointer hover:bg-[#156372] hover:text-white my-[1px] transition-colors"
                        >
                          {option}
                        </div>
                      ))}
                    </div>

                    
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAttachmentsModal(true)}
                className="w-8 h-8 border border-gray-200 rounded bg-white cursor-pointer flex items-center justify-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {actionBadgeCount}
              </button>
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className="px-4 py-2 border border-gray-200 rounded bg-white cursor-pointer text-sm flex items-center gap-1 hover:bg-gray-50"
                >
                  More
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5l3 3 3-3" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* More Dropdown Menu */}
                                {showMoreDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-md shadow-lg min-w-[200px] z-[1000] border border-gray-200 overflow-hidden">
                    {/* Invoice Preferences */}
                    <div
                      className="mx-2 mt-2 mb-1 px-4 py-2.5 text-sm text-white cursor-pointer rounded-lg border border-[#2563eb] bg-[#3b82f6]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        setShowProjectInvoiceInfo(true);
                      }}
                    >
                      Invoice Preferences
                    </div>

                    {/* Mark as Inactive */}
                    <div
                      className="px-4 py-2.5 text-sm text-gray-800 cursor-pointer hover:bg-[#156372] hover:text-white transition-colors"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        try {
                          await projectsAPI.update(projectId, { status: "Inactive", isActive: false });
                          setProject({ ...project, status: "Inactive", isActive: false });
                          window.dispatchEvent(new Event('projectUpdated'));
                          toast.success('Project marked as inactive');
                        } catch (error) {
                          console.error("Error marking project as inactive:", error);
                          toast.error("Failed to mark project as inactive: " + (error.message || "Unknown error"));
                        }
                      }}
                    >
                      Mark as Inactive
                    </div>

                    {/* Mark as Completed */}
                    <div
                      className="px-4 py-2.5 text-sm text-gray-800 cursor-pointer hover:bg-[#156372] hover:text-white transition-colors"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        try {
                          await projectsAPI.update(projectId, { status: "Completed" });
                          setProject({ ...project, status: "Completed" });
                          window.dispatchEvent(new Event('projectUpdated'));
                          toast.success('Project marked as completed');
                        } catch (error) {
                          console.error("Error marking project as completed:", error);
                          toast.error("Failed to mark project as completed: " + (error.message || "Unknown error"));
                        }
                      }}
                    >
                      Mark as Completed
                    </div>

                    {/* Clone */}
                    <div
                      className="px-4 py-2.5 text-sm text-gray-800 cursor-pointer hover:bg-[#156372] hover:text-white transition-colors"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        if (!project) return;

                        try {
                          // Create cloned project data
                          const clonedProjectData: any = {
                            name: (project.projectName || project.name || "Project") + " (Clone)",
                            description: project.description || '',
                            status: project.status || 'planning',
                            budget: project.budget || 0,
                            currency: project.currency || 'USD',
                            billable: project.billable !== undefined ? project.billable : true,
                            billingRate: project.billingRate || 0,
                            startDate: new Date(),
                            endDate: project.endDate ? new Date(project.endDate) : null,
                            tags: project.tags || [],
                            hoursBudgetType: project.hoursBudgetType || '',
                            totalBudgetHours: project.totalBudgetHours || '',
                          };

                          // Copy customer if exists
                          if (project.customer || project.customerId) {
                            clonedProjectData.customer = project.customer || project.customerId;
                          }

                          // Copy assigned users if exists
                          if (project.assignedTo && Array.isArray(project.assignedTo) && project.assignedTo.length > 0) {
                            clonedProjectData.assignedTo = project.assignedTo.map(user =>
                              typeof user === 'object' ? user._id || user.id : user
                            ).filter(id => id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
                          }

                          // Copy tasks if exists
                          if (project.tasks && Array.isArray(project.tasks) && project.tasks.length > 0) {
                            clonedProjectData.tasks = project.tasks.map(task => ({
                              taskName: task.taskName || '',
                              description: task.description || '',
                              billable: task.billable !== undefined ? task.billable : true,
                              budgetHours: task.budgetHours || '',
                            }));
                          }

                          // Copy user budget hours if exists
                          if (project.userBudgetHours && Array.isArray(project.userBudgetHours) && project.userBudgetHours.length > 0) {
                            clonedProjectData.userBudgetHours = project.userBudgetHours
                              .filter(ubh => ubh && ubh.user)
                              .map(ubh => ({
                                user: typeof ubh.user === 'object' ? (ubh.user._id || ubh.user.id) : ubh.user,
                                budgetHours: ubh.budgetHours || '',
                              }))
                              .filter(ubh => ubh.user && typeof ubh.user === 'string' && ubh.user.match(/^[0-9a-fA-F]{24}$/));
                          }

                          // Create the cloned project immediately
                          await projectsAPI.create(clonedProjectData);
                          toast.success('Project cloned successfully!');
                          window.dispatchEvent(new Event('projectUpdated'));
                        } catch (error) {
                          console.error('Error cloning project:', error);
                          toast.error('Failed to clone project: ' + (error.message || 'Unknown error'));
                        }
                      }}
                    >
                      Clone
                    </div>

                    {/* Add Project Task */}
                    <div
                      className="px-4 py-2.5 text-sm text-gray-800 cursor-pointer hover:bg-[#156372] hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        setShowAddTaskModal(true);
                      }}
                    >
                      Add Project Task
                    </div>

                    {/* Add User */}
                    <div
                      onMouseEnter={() => setHoveredMoreOption('Add User')}
                      onMouseLeave={() => setHoveredMoreOption(null)}
                      onClick={() => {
                        setShowMoreDropdown(false);
                        setShowAddUserModal(true);
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        color: hoveredMoreOption === 'Add User' ? "white" : "#1f2937",
                        cursor: "pointer",
                        backgroundColor: hoveredMoreOption === 'Add User' ? "#156372" : "transparent"
                      }}
                    >
                      Add User
                    </div>

                    {/* Delete */}
                    <div
                      className="px-4 py-2.5 text-sm text-gray-800 cursor-pointer hover:bg-[#ef4444] hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreDropdown(false);
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete
                    </div>
                  </div>
                )}
              </div>
              
                </>
              )}
              <button
                onClick={() => navigate("/time-tracking/projects")}
                className="p-2 border-none bg-transparent cursor-pointer text-xl text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            </div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", gap: "0px" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setShowCommentsPanel(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: (!showCommentsPanel && activeTab === tab) ? "2px solid #2563eb" : "2px solid transparent",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: (!showCommentsPanel && activeTab === tab) ? "600" : "400",
                    color: (!showCommentsPanel && activeTab === tab) ? "#111827" : "#6b7280"
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowCommentsPanel((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "none",
                background: "transparent",
                color: "#111827",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: showCommentsPanel ? "600" : "500",
                borderBottom: showCommentsPanel ? "2px solid #2563eb" : "2px solid transparent",
                padding: "10px 14px"
              }}
            >
              <MessageSquare size={14} />
              Comments
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        {showCommentsPanel ? (
          <div style={{ backgroundColor: "#fff", borderRadius: "6px", border: "1px solid #e5e7eb", padding: "20px" }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "10px", padding: "8px 10px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f8fafc" }}>
                <button
                  type="button"
                  onClick={() => setIsBold((prev) => !prev)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: isBold ? "#111827" : "#6b7280",
                    cursor: "pointer"
                  }}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => setIsItalic((prev) => !prev)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontStyle: "italic",
                    fontSize: "12px",
                    color: isItalic ? "#111827" : "#6b7280",
                    cursor: "pointer"
                  }}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => setIsUnderline((prev) => !prev)}
                  style={{
                    border: "none",
                    background: "transparent",
                    textDecoration: "underline",
                    fontSize: "12px",
                    color: isUnderline ? "#111827" : "#6b7280",
                    cursor: "pointer"
                  }}
                >
                  U
                </button>
              </div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "10px",
                  border: "none",
                  outline: "none",
                  resize: "vertical",
                  fontSize: "13px",
                  fontWeight: isBold ? "600" : "400",
                  fontStyle: isItalic ? "italic" : "normal",
                  textDecoration: isUnderline ? "underline" : "none",
                  color: "#111827"
                }}
              />
              <div style={{ padding: "8px 10px", borderTop: "1px solid #e5e7eb" }}>
                <button
                  type="button"
                  onClick={handleAddComment}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    backgroundColor: "#fff",
                    color: "#374151",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Add Comment
                </button>
              </div>
            </div>

            <div style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "8px" }}>
              ALL COMMENTS
            </div>
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
              {comments.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", padding: "24px 0" }}>
                  No comments yet.
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: "13px",
                      color: "#111827",
                      fontWeight: comment.bold ? "600" : "400",
                      fontStyle: comment.italic ? "italic" : "normal",
                      textDecoration: comment.underline ? "underline" : "none"
                    }}>
                      {comment.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
        <>
          {activeTab === "Overview" && (
            <>
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "stretch" }}>
              {/* Left Sidebar - Project Details */}
              <div style={{
                width: "280px",
                backgroundColor: "#f3f4f6",
                borderRadius: "6px",
                padding: "24px",
                height: "100%",
                border: "1px solid #e5e7eb",
                boxShadow: "none",
                display: "flex",
                flexDirection: "column"
              }}>
                {/* Project Header */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "4px" }}>
                    <div style={{ marginTop: "4px" }}>
                      <Briefcase size={18} style={{ color: "#4b5563" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", lineHeight: "1.2" }}>
                        {project.projectName || "Project"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Link */}
                <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "24px", display: "flex", justifyContent: "center" }}>
                    <User size={18} style={{ color: "#4b5563" }} />
                  </div>
                  <div>
                    <span style={{ color: "#2563eb", fontWeight: "500", fontSize: "14px", cursor: "pointer" }}>
                      {project.customerName || "Customer"}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: "1px", backgroundColor: "#e5e7eb", margin: "0 0 16px 0" }}></div>

                {/* Details List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Billing Method */}
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                      Billing Method
                    </div>
                    <div style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
                      {billingMethodLabel}
                    </div>
                  </div>

                  {/* Total Project Cost */}
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                      Total Project Cost
                    </div>
                    <div style={{ fontSize: "13px", color: "#111827", fontWeight: "600" }}>
                      {formatMoney(totalProjectCost)}
                    </div>
                  </div>

                  {/* Watchlist */}
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                      Add to dashboard watchlist.
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      <span style={{ color: "#374151" }}>Enabled</span>
                      <span style={{ color: "#9ca3af", margin: "0 6px" }}>-</span>
                      <span style={{ color: "#2563eb", cursor: "pointer" }}>Disable</span>
                    </div>
                  </div>

                  {/* Unbilled/Billed */}
                  <div>
                    <div style={{ fontSize: "12px", color: "#059669", marginBottom: "4px" }}>
                      ● Unbilled Amount
                    </div>
                    <div style={{ fontSize: "13px", color: "#059669", fontWeight: "600" }}>
                      {formatMoney(unbilledAmount)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#ef4444", marginBottom: "4px" }}>
                      ● Billed Amount
                    </div>
                    <div style={{ fontSize: "13px", color: "#ef4444", fontWeight: "600" }}>
                      {formatMoney(billedAmount)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                {/* Project Hours & Summary */}
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "6px",
                  padding: "24px",
                  marginBottom: "0",
                  width: "100%",
                  border: "1px solid #e5e7eb",
                  boxShadow: "none"
                }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px"
                }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setHoursView("Project Hours")}
                        style={{
                          padding: "0 4px 8px 4px",
                          border: "none",
                          borderBottom: hoursView === "Project Hours" ? "2px solid #2563eb" : "2px solid transparent",
                          backgroundColor: "transparent",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: hoursView === "Project Hours" ? "600" : "500",
                          color: hoursView === "Project Hours" ? "#111827" : "#2563eb"
                        }}
                      >
                        Project Hours
                      </button>
                    </div>
                    <div style={{ width: "1px", height: "16px", backgroundColor: "#e5e7eb" }}></div>
                    <button
                      onClick={() => setHoursView("Profitability Summary")}
                      style={{
                        padding: "0 4px 8px 4px",
                        border: "none",
                        borderBottom: hoursView === "Profitability Summary" ? "2px solid #2563eb" : "2px solid transparent",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: hoursView === "Profitability Summary" ? "600" : "500",
                        color: hoursView === "Profitability Summary" ? "#111827" : "#2563eb"
                      }}
                    >
                      Profitability Summary
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                    <span style={{ fontSize: "13px", color: "#2563eb", fontWeight: "500" }}>{dateRange}</span>
                    <ChevronDown size={14} color="#6b7280" />
                  </div>
                </div>

                {hoursView === "Profitability Summary" ? (
                  <>
                    {/* Profitability Summary - Line Chart */}
                    <div style={{
                      height: "300px",
                      position: "relative",
                      marginBottom: "24px"
                    }}>
                      <div style={{
                        height: "260px",
                        paddingLeft: "40px",
                        paddingRight: "20px",
                        borderBottom: "1px solid #e5e7eb",
                        position: "relative"
                      }}>
                        {/* Y-axis labels */}
                        <div style={{
                          position: "absolute",
                          left: "0",
                          top: "0",
                          bottom: "0",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "#9ca3af",
                          paddingBottom: "10px",
                          width: "35px"
                        }}>
                          <span>5K</span>
                          <span>4K</span>
                          <span>3K</span>
                          <span>2K</span>
                          <span>1K</span>
                          <span>0</span>
                        </div>

                        {/* Line Chart Area */}
                        <div style={{
                          height: "100%",
                          paddingTop: "10px",
                          paddingBottom: "30px",
                          position: "relative",
                          marginLeft: "40px"
                        }}>
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 600 230"
                            preserveAspectRatio="none"
                            style={{ position: "absolute", top: "10px", left: 0 }}
                          >
                            {/* Grid lines */}
                            {[0, 1, 2, 3, 4, 5].map(i => {
                              const y = (i / 5) * 230;
                              return (
                                <line
                                  key={i}
                                  x1="0"
                                  y1={y}
                                  x2="600"
                                  y2={y}
                                  stroke="#f3f4f6"
                                  strokeWidth="1"
                                />
                              );
                            })}
                            {/* Billable Hours line (light blue) - flat line at bottom (no data) */}
                            <polyline
                              points="0,230 100,230 200,230 300,230 400,230 500,230 600,230"
                              fill="none"
                              stroke="#93c5fd"
                              strokeWidth="2"
                            />
                            {/* Unbilled Hours line (yellow-orange) - flat line at bottom (no data) */}
                            <polyline
                              points="0,230 100,230 200,230 300,230 400,230 500,230 600,230"
                              fill="none"
                              stroke="#fb923c"
                              strokeWidth="2"
                            />
                          </svg>

                          {/* Date labels on X-axis */}
                          <div style={{
                            position: "absolute",
                            bottom: "-25px",
                            left: "0",
                            right: "40px",
                            display: "flex",
                            justifyContent: "space-between"
                          }}>
                            {['21 Dec', '22 Dec', '23 Dec', '24 Dec', '25 Dec', '26 Dec', '27 Dec'].map((date, i) => (
                              <span key={i} style={{ fontSize: "11px", color: "#9ca3af" }}>
                                {date}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Legend */}
                      <div style={{
                        display: "flex",
                        gap: "24px",
                        marginTop: "20px",
                        paddingLeft: "40px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "16px", height: "4px", backgroundColor: "#93c5fd", borderRadius: "2px" }}></div>
                          <span style={{ fontSize: "13px", color: "#374151" }}>Billable Hours</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "16px", height: "4px", backgroundColor: "#fb923c", borderRadius: "2px" }}></div>
                          <span style={{ fontSize: "13px", color: "#374151" }}>Unbilled Hours</span>
                        </div>
                      </div>
                    </div>

                    {/* Divider Line */}
                    <div style={{ height: "1px", backgroundColor: "#f3f4f6", margin: "0 -24px 24px -24px" }}></div>

                    {/* Actuals Summary */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "24px"
                    }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>Actual Cost</div>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>{formatMoney(actualCost)}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>Actual Revenue</div>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>{formatMoney(actualRevenue)}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Project Hours - Logged Hours Line Chart */}
                    <div style={{
                      height: "300px",
                      position: "relative",
                      marginBottom: "12px"
                    }}>
                      <div style={{
                        height: "240px",
                        paddingLeft: "40px",
                        paddingRight: "20px",
                        borderBottom: "1px solid #e5e7eb",
                        position: "relative"
                      }}>
                        <div style={{
                          position: "absolute",
                          left: "6px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "11px",
                          color: "#9ca3af"
                        }}>
                          Hours
                        </div>
                        {/* Y-axis labels */}
                        <div style={{
                          position: "absolute",
                          left: "0",
                          top: "0",
                          bottom: "0",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "#9ca3af",
                          paddingBottom: "10px",
                          width: "35px"
                        }}>
                          <span>6h</span>
                          <span>4h</span>
                          <span>2h</span>
                          <span>0</span>
                        </div>

                        {/* Line Chart Area */}
                        <div style={{
                          height: "100%",
                          paddingTop: "10px",
                          paddingBottom: "30px",
                          position: "relative",
                          marginLeft: "40px"
                        }}>
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 600 220"
                            preserveAspectRatio="none"
                            style={{ position: "absolute", top: "10px", left: 0 }}
                          >
                            {/* Grid lines */}
                            {[0, 1, 2, 3].map(i => {
                              const y = (i / 3) * 220;
                              return (
                                <line
                                  key={i}
                                  x1="0"
                                  y1={y}
                                  x2="600"
                                  y2={y}
                                  stroke="#f3f4f6"
                                  strokeWidth="1"
                                />
                              );
                            })}
                            {/* Logged Hours line (flat until data exists) */}
                            <polyline
                              points="0,220 100,220 200,220 300,220 400,220 500,220 600,220"
                              fill="none"
                              stroke="#60a5fa"
                              strokeWidth="2"
                            />
                          </svg>

                          {/* Date labels on X-axis */}
                          <div style={{
                            position: "absolute",
                            bottom: "-25px",
                            left: "0",
                            right: "40px",
                            display: "flex",
                            justifyContent: "space-between"
                          }}>
                            {["09 Mar", "10 Mar", "11 Mar", "12 Mar", "13 Mar", "14 Mar", "15 Mar"].map((date, i) => (
                              <span key={i} style={{ fontSize: "11px", color: "#9ca3af" }}>
                                {date}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Legend */}
                      <div style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "18px",
                        justifyContent: "center"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "16px", height: "4px", backgroundColor: "#60a5fa", borderRadius: "2px" }}></div>
                          <span style={{ fontSize: "13px", color: "#374151" }}>Logged Hours</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: "1px", backgroundColor: "#e5e7eb", margin: "0 -24px 16px -24px" }}></div>

                    {/* Logged Hours Summary */}
                    <div style={{
                      textAlign: "center",
                      marginTop: "8px"
                    }}>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Logged Hours</div>
                      <div style={{ fontSize: "16px", color: "#2563eb", fontWeight: "600" }}>{hoursData.logged}</div>
                      <div style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                        {formatMoney(loggedAmount)}
                      </div>
                    </div>
                  </>
                )}
              </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "24px" }}>
              {/* Users Section */}
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "6px",
                padding: "24px",
                width: "100%",
                border: "1px solid #e5e7eb",
                boxShadow: "none"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", margin: 0 }}>
                    Users
                  </h3>
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "4px",
                      backgroundColor: "transparent",
                      color: "#156372",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Plus size={14} />
                    Add User
                  </button>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "transparent", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        NAME
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        LOGGED HOURS
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        COST PER HOUR
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        ROLE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.users && project.users.length > 0 ? (
                      project.users.map((user, index) => {
                        const userHours = calculateUserHours(user.email || user.name);
                        return (
                          <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              <div>
                                <div style={{ fontWeight: "500" }}>{user.name || user.email}</div>
                                <div style={{ fontSize: "12px", color: "#666" }}>{user.email}</div>
                              </div>
                            </td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{userHours.logged}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              {formatMoney(user.costPerHour || user.rate || 0)}
                            </td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              {user.role || "Admin"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                          No users added
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Project Tasks Section */}
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "6px",
                padding: "24px",
                width: "100%",
                border: "1px solid #e5e7eb",
                boxShadow: "none"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", margin: 0 }}>
                    Project Tasks
                  </h3>
                  <button
                    onClick={() => setShowAddTaskModal(true)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "4px",
                      backgroundColor: "transparent",
                      color: "#156372",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Plus size={14} />
                    Add Task
                  </button>
                </div>

                {project.tasks && project.tasks.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "transparent", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          NAME
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          LOGGED HOURS
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          BILLED HOURS
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          UNBILLED HOURS
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          RATE ({baseCurrencyCode})
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                          TYPE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.tasks.map((task, index) => {
                        const taskHours = calculateTaskHours(task.taskName);
                        return (
                          <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{task.taskName}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{taskHours.logged}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{taskHours.billed}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{taskHours.unbilled}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              {baseCurrencyCode}{task.rate || task.hourlyRate || "0.00"}
                            </td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>
                              {task.billable ? "Billable" : "Non-Billable"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "#666", fontSize: "14px" }}>
                    No project tasks have been added.
                  </p>
                )}
              </div>
            </div>
            </>
          )}

          {/* Timesheet Tab */}
          {activeTab === "Timesheet" && (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              padding: "24px",
              border: "1px solid #e5e7eb"
            }}>
              {/* VIEW BY Filters */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px"
              }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", letterSpacing: "0.02em" }}>VIEW BY:</span>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      border: "1px solid #e2e8f0",
                      padding: "6px 28px 6px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      backgroundColor: "#fff",
                      color: "#475569",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                      paddingRight: "28px"
                    }}
                  >
                    <option value="__all_header" disabled>All</option>
                    <option value="All">All</option>
                    <option value="__billing_header" disabled>Billing Status</option>
                    <option value="Non-Billable">Non-Billable</option>
                    <option value="Billable">Billable</option>
                    <option value="Yet to Invoice">Yet to Invoice</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="__approvals_header" disabled>Approvals</option>
                    <option value="Yet to Create Approval">Yet to Create Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Yet to submit">Yet to submit</option>
                    <option value="Yet to Approve">Yet to Approve</option>
                    <option value="__customer_approvals_header" disabled>Customer Approvals</option>
                    <option value="Yet to Create Customer Approval">Yet to Create Customer Approval</option>
                    <option value="Approved by Customer">Approved by Customer</option>
                    <option value="Rejected by Customer">Rejected by Customer</option>
                    <option value="Yet to Submit to Customer">Yet to Submit to Customer</option>
                    <option value="Customer Yet to Approve">Customer Yet to Approve</option>
                  </select>
                </div>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    style={{
                      border: "1px solid #e2e8f0",
                      padding: "6px 28px 6px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      backgroundColor: "#fff",
                      color: "#475569",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                      paddingRight: "28px"
                    }}
                  >
                    <option value="__all_header" disabled>All</option>
                    <option value="All">All</option>
                    <option value="__current_header" disabled>Current</option>
                    <option value="Today">Today</option>
                    <option value="This Week">This Week</option>
                    <option value="This Month">This Month</option>
                    <option value="This Quarter">This Quarter</option>
                    <option value="This Year">This Year</option>
                    <option value="__previous_header" disabled>Previous</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="Previous Week">Previous Week</option>
                    <option value="Previous Month">Previous Month</option>
                    <option value="Previous Quarter">Previous Quarter</option>
                    <option value="Previous Year">Previous Year</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons - Show when entries are selected */}
              {selectedEntries.length > 0 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #e5e7eb"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <button
                      onClick={() => {
                        // Handle Create Invoice
                        alert(`Create Invoice for ${selectedEntries.length} timesheet(s)`);
                      }}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#f3f4f6",
                        color: "#111827",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      Create Invoice
                    </button>
                    <button
                      onClick={() => {
                        // Handle Mark as Invoiced
                        alert(`Mark ${selectedEntries.length} timesheet(s) as Invoiced`);
                      }}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#f3f4f6",
                        color: "#111827",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      Mark as Invoiced
                    </button>
                    <button
                      onClick={() => {
                        // Handle Delete
                        if (window.confirm(`Are you sure you want to delete ${selectedEntries.length} timesheet(s)?`)) {
                          setSelectedEntries([]);
                        }
                      }}
                      style={{
                        padding: "8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#f3f4f6",
                        color: "#111827",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        // Handle More Options
                        alert("More options menu");
                      }}
                      style={{
                        padding: "8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#f3f4f6",
                        color: "#111827",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#156372"
                    }}></div>
                    <span style={{
                      fontSize: "14px",
                      color: "#111827",
                      fontWeight: "500"
                    }}>
                      {selectedEntries.length} Timesheet{selectedEntries.length !== 1 ? 's' : ''} Selected
                    </span>
                  </div>
                </div>
              )}

              {/* Timesheet Table */}
              {(() => {
                // Filter entries based on status and period
                let filteredEntries = [...timeEntries];

                if (statusFilter === "Billable") {
                  filteredEntries = filteredEntries.filter(entry => entry.billable === true);
                } else if (statusFilter === "Non-Billable") {
                  filteredEntries = filteredEntries.filter(entry => entry.billable === false);
                }

                if (periodFilter !== "All") {
                  const now = new Date();
                  filteredEntries = filteredEntries.filter(entry => {
                    if (!entry.date) return false;

                    // Try to parse date - could be in different formats
                    let entryDate;
                    if (typeof entry.date === 'string') {
                      // Try parsing as "DD MMM YYYY" format (e.g., "09 Dec 2025")
                      const dateMatch = entry.date.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
                      if (dateMatch) {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthIndex = months.indexOf(dateMatch[2]);
                        if (monthIndex !== -1) {
                          entryDate = new Date(parseInt(dateMatch[3]), monthIndex, parseInt(dateMatch[1]));
                        } else {
                          entryDate = new Date(entry.date);
                        }
                      } else {
                        entryDate = new Date(entry.date);
                      }
                    } else {
                      entryDate = new Date(entry.date);
                    }

                    if (isNaN(entryDate.getTime())) return false;

                    if (periodFilter === "This Week") {
                      const weekStart = new Date(now);
                      weekStart.setDate(now.getDate() - now.getDay());
                      weekStart.setHours(0, 0, 0, 0);
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      weekEnd.setHours(23, 59, 59, 999);
                      return entryDate >= weekStart && entryDate <= weekEnd;
                    } else if (periodFilter === "This Month") {
                      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
                    } else if (periodFilter === "This Year") {
                      return entryDate.getFullYear() === now.getFullYear();
                    }
                    return true;
                  });
                }

                // Helper function to format date as DD/MM/YYYY
                const formatDateDDMMYYYY = (dateString) => {
                  if (!dateString) return "";
                  try {
                    let date;
                    if (typeof dateString === 'string') {
                      // Try parsing as "DD MMM YYYY" format (e.g., "09 Dec 2025")
                      const dateMatch = dateString.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
                      if (dateMatch) {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthIndex = months.indexOf(dateMatch[2]);
                        if (monthIndex !== -1) {
                          date = new Date(parseInt(dateMatch[3]), monthIndex, parseInt(dateMatch[1]));
                        } else {
                          date = new Date(dateString);
                        }
                      } else {
                        date = new Date(dateString);
                      }
                    } else {
                      date = new Date(dateString);
                    }
                    if (isNaN(date.getTime())) return dateString;
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                  } catch {
                    return dateString;
                  }
                };

                return (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "#f8fafc" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", width: "36px" }}>
                          <input
                            type="checkbox"
                            checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0 && filteredEntries.every(entry => selectedEntries.includes(entry.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEntries(filteredEntries.map(entry => entry.id));
                              } else {
                                setSelectedEntries([]);
                              }
                            }}
                            style={{
                              cursor: "pointer",
                              accentColor: "#2563eb"
                            }}
                          />
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                          Date
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                          Task
                          <ArrowUpDown size={11} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                          User
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                          Time
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                          Total Cost
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                          Approvals
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                          Customer Approvals
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                          Billing Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                            There are no timesheets.
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry) => {
                          // Format billing status
                          let billingStatusText = "Unbilled";
                          let billingStatusColor = "#f97316"; // orange
                          if (entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed") {
                            billingStatusText = entry.billingStatus;
                            billingStatusColor = "#10b981"; // green
                          } else if (entry.billingStatus) {
                            billingStatusText = entry.billingStatus;
                          } else if (!entry.billable) {
                            billingStatusText = "Non-Billable";
                            billingStatusColor = "#6b7280"; // grey
                          }

                          // Handle multiple task names (split by newline or comma)
                          const taskNames = entry.taskName ? entry.taskName.split(",").flatMap(t => t.split("\\n")).map(t => t.trim()).filter(t => t) : ["N/A"];
                          const isHovered = hoveredEntryId === entry.id;
                          const totalCostValue =
                            entry.totalCost ??
                            entry.totalCostAmount ??
                            entry.cost ??
                            entry.amount ??
                            "0.00";
                          const approvalsText =
                            entry.approvals ||
                            entry.approvalStatus ||
                            entry.status ||
                            "Pending Submission";
                          const customerApprovalsText =
                            entry.customerApproval ||
                            entry.customerApprovalStatus ||
                            "--";

                          return (
                            <tr
                              key={entry.id}
                              onMouseEnter={() => setHoveredEntryId(entry.id)}
                              onMouseLeave={() => setHoveredEntryId(null)}
                              style={{
                                borderBottom: "1px solid #e5e7eb",
                                backgroundColor: isHovered ? "#f9fafb" : "transparent"
                              }}
                            >
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedEntries.includes(entry.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedEntries([...selectedEntries, entry.id]);
                                    } else {
                                      setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    cursor: "pointer",
                                    accentColor: "#2563eb"
                                  }}
                                />
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {formatDateDDMMYYYY(entry.date)}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827", lineHeight: "1.5" }}>
                                {taskNames.map((task, idx) => (
                                  <div key={idx}>{task}</div>
                                ))}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {entry.user || entry.userEmail || "N/A"}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {entry.timeSpent || "00:00"}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {baseCurrencyCode}{totalCostValue}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {approvalsText}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {customerApprovalsText}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: billingStatusColor }}>
                                {billingStatusText}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}

                    {/* Expenses Tab */}
          {activeTab === "Expenses" && (() => {
            // Helper function to format date
            const formatDate = (dateString) => {
              if (!dateString) return "";
              try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                  return dateString;
                }
                return date.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
              } catch {
                return dateString;
              }
            };

            // Filter expenses
            let filteredExpenses = expenses;
            if (expensesSearch) {
              filteredExpenses = filteredExpenses.filter(expense =>
                (expense.vendor || "").toLowerCase().includes(expensesSearch.toLowerCase()) ||
                (expense.reference || "").toLowerCase().includes(expensesSearch.toLowerCase()) ||
                (expense.customerName || "").toLowerCase().includes(expensesSearch.toLowerCase())
              );
            }
            if (expensesStatusFilter !== "All") {
              filteredExpenses = filteredExpenses.filter(expense =>
                (expense.status || "").toLowerCase() === expensesStatusFilter.toLowerCase()
              );
            }

            return (
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "6px",
                padding: "20px",
                border: "1px solid #e5e7eb"
              }}>
                {/* Go to transactions */}
                <div style={{ marginBottom: "16px", position: "relative", display: "inline-block" }} ref={goToTransactionsRef}>
                  <button
                    type="button"
                    onClick={() => setShowGoToTransactionsDropdown((open) => !open)}
                    style={{
                      color: "#1f2937",
                      fontSize: "13px",
                      fontWeight: "500",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    Go to transactions
                    <ChevronDown size={12} />
                  </button>
                  {showGoToTransactionsDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "8px",
                      minWidth: "160px",
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
                      padding: "6px",
                      zIndex: 20
                    }}>
                      <button
                        type="button"
                        onClick={() => setShowGoToTransactionsDropdown(false)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          fontSize: "13px",
                          borderRadius: "6px",
                          border: "1px solid #93c5fd",
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          cursor: "pointer"
                        }}
                      >
                        Expenses
                      </button>
                    </div>
                  )}
                </div>

                {/* Expenses Section */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#111827", fontSize: "13px", fontWeight: "600" }}>
                      <ChevronDown size={14} color="#2563eb" />
                      Expenses
                    </div>
                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: "#2563eb" }}>
                        <path d="M3 5h18l-7 8v5l-4 3v-8L3 5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <select
                        value={expensesStatusFilter}
                        onChange={(e) => setExpensesStatusFilter(e.target.value)}
                        style={{
                          border: "none",
                          fontSize: "12px",
                          cursor: "pointer",
                          backgroundColor: "transparent",
                          color: "#1f2937",
                          appearance: "none",
                          padding: "0 14px 0 0",
                          lineHeight: 1.2
                        }}
                      >
                        <option value="All">Status: All</option>
                        <option value="Unbilled">Status: Unbilled</option>
                        <option value="Invoiced">Status: Invoiced</option>
                        <option value="Reimbursed">Status: Reimbursed</option>
                        <option value="Billable">Status: Billable</option>
                        <option value="Non-Billable">Status: Non-Billable</option>
                        <option value="With Receipts">Status: With Receipts</option>
                        <option value="Without Receipts">Status: Without Receipts</option>
                      </select>
                      <ChevronDown size={12} color="#6b7280" style={{ position: "absolute", right: 0, pointerEvents: "none" }} />
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>DATE</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>EXPENSE ACCOUNT</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>REFERENCE#</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>VENDOR NAME</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>PAID THROUGH</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>CUSTOMER NAME</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>AMOUNT</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: "28px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                            There are no expenses.
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((expense) => {
                          const status = (expense.status || "Unbilled").toLowerCase();
                          let statusColor = "#64748b";
                          if (status === "invoiced") statusColor = "#ef4444";
                          if (status === "non-billable") statusColor = "#16a34a";
                          if (status === "unbilled") statusColor = "#64748b";
                          return (
                            <tr
                              key={expense.id}
                              style={{ borderBottom: "1px solid #e5e7eb" }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
                            >
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {formatDate(expense.date)}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#2563eb" }}>
                                {expense.expenseAccount || "-"}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {expense.reference || "-"}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {expense.vendor || "-"}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {expense.paidThrough || "-"}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {expense.customerName || "-"}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>
                                {expense.currency || baseCurrencyCode} {parseFloat(expense.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: statusColor }}>
                                {expense.status || "Unbilled"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    color: "#64748b",
                    fontSize: "12px"
                  }}>
                    <div>
                      Total Count:{" "}
                      <span style={{ color: "#2563eb", cursor: "pointer" }}>View</span>
                    </div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "4px 8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      color: "#2563eb"
                    }}>
                      <span style={{ cursor: "pointer" }}>‹</span>
                      <span>1 - {Math.min(3, filteredExpenses.length)}</span>
                      <span style={{ cursor: "pointer" }}>›</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
                    {/* Sales Tab */}
          {activeTab === "Sales" && (
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              padding: "20px",
              border: "1px solid #e5e7eb"
            }}>
              {/* Go to transactions */}
              <div style={{ marginBottom: "16px" }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/sales");
                  }}
                  style={{
                    color: "#1f2937",
                    fontSize: "13px",
                    fontWeight: "500",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  Go to transactions
                  <ChevronDown size={12} />
                </a>
              </div>

              {/* Invoices Section */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                <div
                  onClick={() => setInvoicesExpanded((open) => !open)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#111827", fontSize: "13px", fontWeight: "600" }}>
                    {invoicesExpanded ? (
                      <ChevronDown size={14} color="#2563eb" />
                    ) : (
                      <ChevronRight size={14} color="#64748b" />
                    )}
                    Invoices
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1f2937" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 5h18l-7 8v5l-4 3v-8L3 5z" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <select
                      value={invoicesStatusFilter}
                      onChange={(e) => setInvoicesStatusFilter(e.target.value)}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: "12px",
                        color: "#1f2937",
                        cursor: "pointer",
                        appearance: "none",
                        paddingRight: "14px"
                      }}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>Status: {option}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="#6b7280" />
                  </div>
                </div>

                {invoicesExpanded && (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                            DATE <ArrowUpDown size={11} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                          </th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>INVOICE#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>REFERENCE#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>PROJECT FEE</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>BALANCE DUE</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      
                      <tbody>
                        {filteredSalesInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: "28px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                              There are no invoices.
                            </td>
                          </tr>
                        ) : (
                          filteredSalesInvoices.map((invoice) => (
                            <tr key={invoice.id || invoice._id || invoice.invoiceNumber || invoice.number} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{formatSalesDate(invoice.date || invoice.invoiceDate || invoice.createdAt)}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#2563eb" }}>{invoice.invoiceNumber || invoice.number || invoice.invoiceNo || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{invoice.reference || invoice.referenceNumber || invoice.ref || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{invoice.projectFee || invoice.fee || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{invoice.currency || baseCurrencyCode} {Number(invoice.amount || invoice.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{invoice.currency || baseCurrencyCode} {Number(invoice.balanceDue || invoice.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{invoice.status || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      color: "#64748b",
                      fontSize: "12px"
                    }}>
                      <div>
                        Total Count:{" "}
                        <span style={{ color: "#2563eb", cursor: "pointer" }}>View</span>
                      </div>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "4px 8px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        color: "#2563eb"
                      }}>
                        <span style={{ cursor: "pointer" }}>{"<"}</span>
                        <span>1 - {Math.max(1, Math.min(3, filteredSalesInvoices.length || 1))}</span>
                        <span style={{ cursor: "pointer" }}>{">"}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Quotes Section */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                <div
                  onClick={() => setQuotesExpanded((open) => !open)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#111827", fontSize: "13px", fontWeight: "600" }}>
                    {quotesExpanded ? (
                      <ChevronDown size={14} color="#2563eb" />
                    ) : (
                      <ChevronRight size={14} color="#64748b" />
                    )}
                    Quotes
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1f2937" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 5h18l-7 8v5l-4 3v-8L3 5z" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <select
                      value={quotesStatusFilter}
                      onChange={(e) => setQuotesStatusFilter(e.target.value)}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: "12px",
                        color: "#1f2937",
                        cursor: "pointer",
                        appearance: "none",
                        paddingRight: "14px"
                      }}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>Status: {option}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="#6b7280" />
                  </div>
                </div>

                {quotesExpanded && (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                            DATE <ArrowUpDown size={11} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                          </th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>QUOTE#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>REFERENCE#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesQuotes.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: "28px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                              There are no quotes.
                            </td>
                          </tr>
                        ) : (
                          filteredSalesQuotes.map((quote) => (
                            <tr key={quote.id || quote._id || quote.quoteNumber || quote.number} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{formatSalesDate(quote.date || quote.quoteDate || quote.createdAt)}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#2563eb" }}>{quote.quoteNumber || quote.number || quote.quoteNo || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{quote.reference || quote.referenceNumber || quote.ref || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{quote.currency || baseCurrencyCode} {Number(quote.amount || quote.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{quote.status || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

                            {/* Retainer Invoices Section */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                <div
                  onClick={() => setRetainerInvoicesExpanded((open) => !open)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#111827", fontSize: "13px", fontWeight: "600" }}>
                    {retainerInvoicesExpanded ? (
                      <ChevronDown size={14} color="#2563eb" />
                    ) : (
                      <ChevronRight size={14} color="#64748b" />
                    )}
                    Retainer Invoices
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1f2937" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 5h18l-7 8v5l-4 3v-8L3 5z" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <select
                      value={retainerInvoicesStatusFilter}
                      onChange={(e) => setRetainerInvoicesStatusFilter(e.target.value)}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: "12px",
                        color: "#1f2937",
                        cursor: "pointer",
                        appearance: "none",
                        paddingRight: "14px"
                      }}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>Status: {option}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="#6b7280" />
                  </div>
                </div>

                {retainerInvoicesExpanded && (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                            DATE <ArrowUpDown size={11} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                          </th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>RETAINER INVOICE NUMBER</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>REFERENCE#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>BALANCE DUE</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesRetainerInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: "28px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                              There are no retainer invoices.
                            </td>
                          </tr>
                        ) : (
                          filteredSalesRetainerInvoices.map((retainer) => (
                            <tr key={retainer.id || retainer._id || retainer.retainerNumber || retainer.number} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{formatSalesDate(retainer.date || retainer.invoiceDate || retainer.createdAt)}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#2563eb" }}>{retainer.retainerNumber || retainer.number || retainer.invoiceNumber || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{retainer.reference || retainer.referenceNumber || retainer.ref || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{retainer.currency || baseCurrencyCode} {Number(retainer.amount || retainer.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{retainer.currency || baseCurrencyCode} {Number(retainer.balanceDue || retainer.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{retainer.status || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      color: "#64748b",
                      fontSize: "12px"
                    }}>
                      <div>
                        Total Count:{" "}
                        <span style={{ color: "#2563eb", cursor: "pointer" }}>View</span>
                      </div>
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "4px 8px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        color: "#2563eb"
                      }}>
                        <span style={{ cursor: "pointer" }}>{"<"}</span>
                        <span>1 - {Math.max(1, Math.min(3, filteredSalesRetainerInvoices.length || 1))}</span>
                        <span style={{ cursor: "pointer" }}>{">"}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Credit Notes Section */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                <div
                  onClick={() => setCreditNotesExpanded((open) => !open)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#111827", fontSize: "13px", fontWeight: "600" }}>
                    {creditNotesExpanded ? (
                      <ChevronDown size={14} color="#2563eb" />
                    ) : (
                      <ChevronRight size={14} color="#64748b" />
                    )}
                    Credit Notes
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1f2937" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 5h18l-7 8v5l-4 3v-8L3 5z" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <select
                      value={creditNotesStatusFilter}
                      onChange={(e) => setCreditNotesStatusFilter(e.target.value)}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: "12px",
                        color: "#1f2937",
                        cursor: "pointer",
                        appearance: "none",
                        paddingRight: "14px"
                      }}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>Status: {option}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="#6b7280" />
                  </div>
                </div>

                {creditNotesExpanded && (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                            CREDIT DATE <ArrowUpDown size={11} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                          </th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>CREDIT NOTE#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>REFERENCE#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>PROJECT FEE</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>BALANCE</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesCreditNotes.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: "28px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                              There are no credit notes.
                            </td>
                          </tr>
                        ) : (
                          filteredSalesCreditNotes.map((note) => (
                            <tr key={note.id || note._id || note.creditNoteNumber || note.number} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{formatSalesDate(note.date || note.creditDate || note.createdAt)}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#2563eb" }}>{note.creditNoteNumber || note.number || note.noteNumber || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{note.reference || note.referenceNumber || note.ref || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{note.projectFee || note.fee || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{note.currency || baseCurrencyCode} {Number(note.balance || note.balanceDue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{note.currency || baseCurrencyCode} {Number(note.amount || note.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{note.status || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {/* Refunds Section */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                <div
                  onClick={() => setRefundsExpanded((open) => !open)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#111827", fontSize: "13px", fontWeight: "600" }}>
                    {refundsExpanded ? (
                      <ChevronDown size={14} color="#2563eb" />
                    ) : (
                      <ChevronRight size={14} color="#64748b" />
                    )}
                    Refunds
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1f2937" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 5h18l-7 8v5l-4 3v-8L3 5z" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <select
                      value={refundsStatusFilter}
                      onChange={(e) => setRefundsStatusFilter(e.target.value)}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: "12px",
                        color: "#1f2937",
                        cursor: "pointer",
                        appearance: "none",
                        paddingRight: "14px"
                      }}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>Status: {option}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="#6b7280" />
                  </div>
                </div>

                {refundsExpanded && (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                            DATE <ArrowUpDown size={11} style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }} />
                          </th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>REFUND#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>REFERENCE#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>AMOUNT</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesRefunds.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: "28px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                              There are no refunds.
                            </td>
                          </tr>
                        ) : (
                          filteredSalesRefunds.map((refund) => (
                            <tr key={refund.id || refund._id || refund.refundNumber || refund.number} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{formatSalesDate(refund.date || refund.refundDate || refund.createdAt)}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#2563eb" }}>{refund.refundNumber || refund.number || refund.refundNo || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{refund.reference || refund.referenceNumber || refund.ref || "-"}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{refund.currency || baseCurrencyCode} {Number(refund.amount || refund.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "8px 10px", fontSize: "13px", color: "#111827" }}>{refund.status || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          )}
        </>
        )}
      </div>
      {/* Add Users Modal */}
      {showAddUserModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddUserModal(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17, 24, 39, 0.55)",
            zIndex: 2185,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "700px",
              backgroundColor: "#fff",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 24px 48px rgba(15, 23, 42, 0.25)",
              border: "1px solid #e5e7eb"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ margin: 0, fontSize: "34px", fontWeight: "500", color: "#111827" }}>Add users</h2>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                style={{ width: "30px", height: "30px", borderRadius: "6px", border: "2px solid #3b82f6", backgroundColor: "#fff", color: "#ef4444", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}
              >
                x
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1.3fr 1.3fr", backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ padding: "10px", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase" }}>S.NO</div>
                  <div style={{ padding: "10px", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase", borderLeft: "1px solid #e5e7eb" }}>USER</div>
                  <div style={{ padding: "10px", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase", borderLeft: "1px solid #e5e7eb" }}>COST PER HOUR ?</div>
                </div>

                {addUserRows.map((row, idx) => (
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "60px 1.3fr 1.3fr", borderBottom: idx === addUserRows.length - 1 ? "none" : "1px solid #e5e7eb" }}>
                    <div style={{ padding: "10px", fontSize: "14px", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</div>
                    <div style={{ padding: "8px", borderLeft: "1px solid #e5e7eb" }}>
                      <select
                        value={row.user}
                        onChange={(e) => setAddUserRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, user: e.target.value } : r)))}
                        style={{ width: "100%", height: "40px", border: "none", fontSize: "14px", color: row.user ? "#111827" : "#98a2b3", backgroundColor: "transparent" }}
                      >
                        <option value="">Select user</option>
                        {(project?.users || []).map((u, i) => (
                          <option key={u?._id || u?.id || u?.email || i} value={u?.name || u?.email || ''}>{u?.name || u?.email || 'User'}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ padding: "8px", borderLeft: "1px solid #e5e7eb", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", color: "#1f2937" }}>{baseCurrencyCode}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.costPerHour}
                        onChange={(e) => setAddUserRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, costPerHour: e.target.value } : r)))}
                        placeholder="Cost Per Hour"
                        style={{ width: "100%", height: "34px", border: "none", outline: "none", fontSize: "14px", color: "#374151" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setAddUserRows((prev) => [...prev, { id: Date.now(), user: '', costPerHour: '' }])}
                style={{ marginTop: "14px", border: "none", backgroundColor: "#eef2ff", color: "#374151", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#3b82f6", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>+</span>
                Add Another user
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", padding: "14px 20px 20px", borderTop: "1px solid #e5e7eb" }}>
              <button
                type="button"
                onClick={async () => {
                  const validRows = addUserRows.filter((r) => r.user);
                  if (!validRows.length) {
                    toast.error('Please select at least one user');
                    return;
                  }
                  const existingUsers = Array.isArray(project?.users) ? project.users : [];
                  const addedUsers = validRows.map((r) => ({ name: r.user, email: r.user, rate: r.costPerHour || '' }));
                  const updatedUsers = [...existingUsers, ...addedUsers];
                  try {
                    await projectsAPI.update(projectId, { assignedTo: updatedUsers, users: updatedUsers });
                    setProject({ ...project, users: updatedUsers, assignedTo: updatedUsers });
                    window.dispatchEvent(new Event('projectUpdated'));
                    toast.success('Users added');
                    setShowAddUserModal(false);
                    setAddUserRows([{ id: 1, user: '', costPerHour: '' }]);
                  } catch (error) {
                    console.error('Error adding users:', error);
                    toast.error('Failed to add users: ' + (error.message || 'Unknown error'));
                  }
                }}
                style={{ border: "none", backgroundColor: "#22c55e", color: "white", borderRadius: "6px", padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}
              >
                Add users
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setAddUserRows([{ id: 1, user: '', costPerHour: '' }]);
                }}
                style={{ border: "1px solid #d1d5db", backgroundColor: "#f3f4f6", color: "#111827", borderRadius: "6px", padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Task Modal */}
      {showAddTaskModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddTaskModal(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17, 24, 39, 0.55)",
            zIndex: 2190,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "640px",
              backgroundColor: "#fff",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 24px 48px rgba(15, 23, 42, 0.25)",
              border: "1px solid #e5e7eb"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ margin: 0, fontSize: "31px", fontWeight: "500", color: "#111827" }}>Add Project Task</h2>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "6px",
                  border: "2px solid #3b82f6",
                  backgroundColor: "#fff",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "20px",
                  lineHeight: 1
                }}
              >
                x
              </button>
            </div>

            <div style={{ padding: "24px 20px 20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "15px", color: "#ef4444", marginBottom: "8px" }}>Task Name*</label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  style={{ width: "100%", height: "42px", border: "1px solid #d1d5db", borderRadius: "7px", padding: "0 12px", fontSize: "14px", color: "#111827", backgroundColor: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "15px", color: "#374151", marginBottom: "8px" }}>Description</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                  style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "7px", padding: "10px 12px", fontSize: "14px", color: "#111827", backgroundColor: "#fff", resize: "vertical" }}
                />
              </div>

              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "15px", color: "#374151" }}>
                <input
                  type="checkbox"
                  checked={newTaskBillable}
                  onChange={(e) => setNewTaskBillable(e.target.checked)}
                  style={{ width: "15px", height: "15px", accentColor: "#3b82f6" }}
                />
                Billable
                <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: "1px solid #94a3b8", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#64748b" }}>i</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "8px", padding: "14px 20px 20px", borderTop: "1px solid #e5e7eb" }}>
              <button
                type="button"
                onClick={async () => {
                  if (!newTaskName.trim()) {
                    toast.error('Task name is required');
                    return;
                  }
                  const newTask = {
                    taskName: newTaskName.trim(),
                    description: newTaskDescription.trim(),
                    billable: newTaskBillable,
                    budgetHours: ''
                  };
                  const updatedTasks = [...(project?.tasks || []), newTask];
                  try {
                    await projectsAPI.update(projectId, { tasks: updatedTasks });
                    setProject({ ...project, tasks: updatedTasks });
                    window.dispatchEvent(new Event('projectUpdated'));
                    toast.success('Task added');
                  } catch (error) {
                    console.error('Error adding task:', error);
                    toast.error('Failed to add task: ' + (error.message || 'Unknown error'));
                    return;
                  }
                  setNewTaskName('');
                  setNewTaskDescription('');
                  setNewTaskBillable(true);
                  setShowAddTaskModal(false);
                }}
                style={{ border: "none", backgroundColor: "#22c55e", color: "white", borderRadius: "6px", padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddTaskModal(false);
                  setNewTaskName('');
                  setNewTaskDescription('');
                  setNewTaskBillable(true);
                }}
                style={{ border: "1px solid #d1d5db", backgroundColor: "#f3f4f6", color: "#111827", borderRadius: "6px", padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Invoice Information Modal */}
      {showProjectInvoiceInfo && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowProjectInvoiceInfo(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17, 24, 39, 0.55)",
            zIndex: 2200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "640px",
              backgroundColor: "#fff",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 24px 48px rgba(15, 23, 42, 0.25)",
              border: "1px solid #e5e7eb"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ margin: 0, fontSize: "31px", fontWeight: "500", color: "#111827" }}>Project Invoice Information</h2>
              <button
                type="button"
                onClick={() => setShowProjectInvoiceInfo(false)}
                style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "22px", lineHeight: 1 }}
              >
                x
              </button>
            </div>

            <div style={{ padding: "22px 20px 18px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "15px", color: "#ef4444", marginBottom: "8px" }}>How to sort data on invoice*</label>
                <select
                  value={invoiceInfoData.sortData}
                  onChange={(e) => setInvoiceInfoData((prev) => ({ ...prev, sortData: e.target.value }))}
                  style={{ width: "100%", height: "42px", border: "1px solid #d1d5db", borderRadius: "7px", padding: "0 12px", fontSize: "13px", color: "#374151", backgroundColor: "#fff" }}
                >
                  <option value="Single Line For The Project">Single Line For The Project</option>
                  <option value="Task Wise">Task Wise</option>
                </select>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>Display the entire project information as a single line item</div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "15px", color: "#ef4444", marginBottom: "8px" }}>Show in item name*</label>
                <div style={{ height: "42px", border: "1px solid #d1d5db", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", backgroundColor: "#fff" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", color: "#374151" }}>
                    {(invoiceInfoData.itemName && invoiceInfoData.itemName[0]) || "Project Name"} x
                  </span>
                  <ChevronDown size={14} color="#6b7280" />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "15px", color: "#374151", marginBottom: "8px" }}>Show in item description</label>
                <div style={{ height: "42px", border: "1px solid #d1d5db", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", backgroundColor: "#fff" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", color: "#374151" }}>
                    {(invoiceInfoData.itemDescription && invoiceInfoData.itemDescription[0]) || "Project Description"} x
                  </span>
                  <ChevronDown size={14} color="#6b7280" />
                </div>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", fontSize: "15px", color: "#374151", marginBottom: "8px" }}>Tax</label>
                <select
                  value={invoiceInfoData.tax || ""}
                  onChange={(e) => setInvoiceInfoData((prev) => ({ ...prev, tax: e.target.value }))}
                  style={{ width: "100%", height: "42px", border: "1px solid #d1d5db", borderRadius: "7px", padding: "0 12px", fontSize: "14px", color: "#374151", backgroundColor: "#fff" }}
                >
                  <option value="">Select a Tax</option>
                  <option value="VAT 16%">VAT 16%</option>
                  <option value="GST 18%">GST 18%</option>
                </select>
                <div style={{ fontSize: "12px", color: "#667085", marginTop: "6px", lineHeight: 1.4 }}>
                  Note: If no tax is selected, the tax rate that is configured for this customer, or your organization's default tax rate will be used.
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151", marginTop: "16px" }}>
                <input
                  type="checkbox"
                  checked={!!invoiceInfoData.includeUnbilledExpenses}
                  onChange={(e) => setInvoiceInfoData((prev) => ({ ...prev, includeUnbilledExpenses: e.target.checked }))}
                  style={{ width: "15px", height: "15px" }}
                />
                Always include all unbilled expenses associated with this project
              </label>
            </div>

            <div style={{ display: "flex", gap: "8px", padding: "14px 20px 20px", borderTop: "1px solid #e5e7eb" }}>
              <button
                type="button"
                onClick={() => {
                  setShowProjectInvoiceInfo(false);
                  toast.success("Project invoice preferences saved");
                }}
                style={{ border: "none", backgroundColor: "#22c55e", color: "white", borderRadius: "6px", padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowProjectInvoiceInfo(false)}
                style={{ border: "1px solid #d1d5db", backgroundColor: "#f3f4f6", color: "#111827", borderRadius: "6px", padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Accounts Modal */}
      {showConfigureAccountsModal && (() => {
        // Account structure for Income
        const incomeAccountStructure = {
          "Income": {
            "Income": [
              "Discount",
              "General Income",
              "Interest Income",
              "Late Fee Income",
              "Other Charges",
              "Sales",
              "Shipping Charge"
            ]
          },
          "Other Income": []
        };

        // Account structure for Expense
        const expenseAccountStructure = {
          "Expense": {
            "Cost Of Goods Sold": [
              "Cost of Goods Sold"
            ],
            "Expense": [
              "Advertising And Marketing",
              "Automobile Expense",
              "Bad Debt",
              "Bank Fees and Charges",
              "Consultant Expense",
              "Credit Card Charges",
              "Depreciation Expense",
              "Fuel/Mileage Expenses",
              "IT and Internet Expenses",
              "Janitorial Expense",
              "Lodging",
              "Meals and Entertainment",
              "Office Supplies",
              "Other Expenses",
              "Parking",
              "Postage",
              "Printing and Stationery",
              "Purchase Discounts",
              "Rent Expense",
              "Repairs and Maintenance",
              "Salaries and Employee Wages",
              "Telephone Expense",
              "Travel Expense"
            ],
            "Other Expense": [
              "Exchange Gain or Loss"
            ]
          }
        };

        // Get the appropriate structure based on type
        const accountStructure = configureAccountsType === "income" ? incomeAccountStructure : expenseAccountStructure;

        // Get all account names from the structure
        const getAllAccountNames = () => {
          const accounts = [];
          Object.keys(accountStructure).forEach(category => {
            if (accountStructure[category] && typeof accountStructure[category] === 'object') {
              Object.keys(accountStructure[category]).forEach(subCategory => {
                if (Array.isArray(accountStructure[category][subCategory])) {
                  accountStructure[category][subCategory].forEach(account => {
                    accounts.push(account);
                  });
                }
              });
            }
          });
          return accounts;
        };

        const allAccountNames = getAllAccountNames();

        // Filter accounts based on search term
        const filteredAccounts = accountSearchTerm
          ? allAccountNames.filter(account =>
            account.toLowerCase().includes(accountSearchTerm.toLowerCase())
          )
          : allAccountNames;

        // Check if all accounts are selected
        const allSelected = filteredAccounts.length > 0 && filteredAccounts.every(account => selectedAccounts.includes(account));

        // Toggle category expansion
        const toggleCategory = (categoryKey) => {
          setExpandedAccountCategories(prev => ({
            ...prev,
            [categoryKey]: !prev[categoryKey]
          }));
        };

        // Toggle account selection
        const toggleAccount = (accountName) => {
          setSelectedAccounts(prev => {
            if (prev.includes(accountName)) {
              return prev.filter(acc => acc !== accountName);
            } else {
              return [...prev, accountName];
            }
          });
        };

        // Select all accounts
        const handleSelectAll = () => {
          if (allSelected) {
            setSelectedAccounts(prev => prev.filter(acc => !filteredAccounts.includes(acc)));
          } else {
            setSelectedAccounts(prev => {
              const newAccounts = [...prev];
              filteredAccounts.forEach(acc => {
                if (!newAccounts.includes(acc)) {
                  newAccounts.push(acc);
                }
              });
              return newAccounts;
            });
          }
        };

        // Handle update
        const handleUpdate = () => {
          if (configureAccountsType === "income") {
            setIncomeAccounts(selectedAccounts);
          } else if (configureAccountsType === "expense") {
            setExpenseAccounts(selectedAccounts);
          }
          setShowConfigureAccountsModal(false);
          setAccountSearchTerm("");
        };

        // Handle cancel
        const handleCancel = () => {
          setShowConfigureAccountsModal(false);
          setAccountSearchTerm("");
          // Reset to original selected accounts
          if (configureAccountsType === "income") {
            setSelectedAccounts([...incomeAccounts]);
          } else if (configureAccountsType === "expense") {
            setSelectedAccounts([...expenseAccounts]);
          }
        };

        return (
          <div
            onClick={(e) => e.target === e.currentTarget && handleCancel()}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2100,
              padding: '20px'
            }}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Configure Accounts
                </h2>
                <button
                  onClick={handleCancel}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#111827'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div style={{
                padding: '24px',
                flex: 1,
                overflowY: 'auto'
              }}>
                {/* Select Accounts Label and Select All */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#ef4444'
                  }}>
                    Select Accounts*
                  </label>
                  <button
                    onClick={handleSelectAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#156372',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Select All
                  </button>
                </div>

                {/* Search Bar */}
                <div style={{
                  position: 'relative',
                  marginBottom: '16px'
                }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    value={accountSearchTerm}
                    onChange={(e) => setAccountSearchTerm(e.target.value)}
                    placeholder="Search accounts..."
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Account Tree */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  {Object.keys(accountStructure).map((category) => {
                    const categoryKey = category;
                    const isCategoryExpanded = expandedAccountCategories[categoryKey];
                    const categoryData = accountStructure[category];

                    return (
                      <div key={category}>
                        {/* Category Header */}
                        <div
                          onClick={() => toggleCategory(categoryKey)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#fff',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          {isCategoryExpanded ? (
                            <Minus size={16} color="#156372" />
                          ) : (
                            <Plus size={16} color="#156372" />
                          )}
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#111827'
                          }}>
                            {category}
                          </span>
                        </div>

                        {/* Sub-categories and Accounts */}
                        {isCategoryExpanded && (
                          <div>
                            {typeof categoryData === 'object' && Object.keys(categoryData).map((subCategory) => {
                              const subCategoryKey = `${category}_${subCategory}`;
                              const isSubCategoryExpanded = expandedAccountCategories[subCategoryKey];
                              const accounts = Array.isArray(categoryData[subCategory]) ? categoryData[subCategory] : [];

                              return (
                                <div key={subCategory}>
                                  {/* Sub-category Header */}
                                  <div
                                    onClick={() => toggleCategory(subCategoryKey)}
                                    style={{
                                      padding: '12px 16px 12px 40px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      backgroundColor: '#fff',
                                      borderBottom: '1px solid #e5e7eb'
                                    }}
                                  >
                                    {isSubCategoryExpanded ? (
                                      <Minus size={16} color="#156372" />
                                    ) : (
                                      <Plus size={16} color="#156372" />
                                    )}
                                    <span style={{
                                      fontSize: '14px',
                                      fontWeight: '500',
                                      color: '#111827'
                                    }}>
                                      {subCategory}
                                    </span>
                                  </div>

                                  {/* Accounts - Only show if subcategory is expanded and has accounts */}
                                  {isSubCategoryExpanded && accounts.length > 0 && (
                                    <div>
                                      {accounts.map((accountName) => {
                                        const isSelected = selectedAccounts.includes(accountName);
                                        const shouldShow = !accountSearchTerm || accountName.toLowerCase().includes(accountSearchTerm.toLowerCase());

                                        if (!shouldShow) return null;

                                        return (
                                          <div
                                            key={accountName}
                                            onClick={() => toggleAccount(accountName)}
                                            style={{
                                              padding: '12px 16px 12px 72px',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              backgroundColor: isSelected ? '#f3f4f6' : '#fff',
                                              borderBottom: '1px solid #e5e7eb'
                                            }}
                                          >
                                            <span style={{
                                              fontSize: '14px',
                                              color: '#111827'
                                            }}>
                                              {accountName}
                                            </span>
                                            {isSelected && (
                                              <Check size={16} color="#111827" />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#156372',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0D4A52';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#156372';
                  }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 pt-16">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                !
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 flex-1">Delete project?</h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setShowDeleteModal(false)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              You cannot retrieve this project once it has been deleted.
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700"
                onClick={handleDeleteProject}
              >
                Delete
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showLogEntryForm && (
        <NewLogEntryForm
          onClose={() => setShowLogEntryForm(false)}
          defaultProjectName={project?.projectName || project?.name || ""}
          defaultDate={new Date()}
        />
      )}
    </div>
  );
}

















